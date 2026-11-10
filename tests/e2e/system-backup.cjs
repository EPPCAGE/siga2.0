const {chromium}=require('playwright'),{readFileSync}=require('node:fs'),{createHash}=require('node:crypto'),assert=require('node:assert/strict');
const {COLLECTIONS,allowedConfig}=require('../../functions/system-backup.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  const content=Buffer.from('Anexo de teste para recuperação'),calls=[];let fail=false;
  const config=[{id:'cadeia_valor',data:{$type:'map',value:{data:'{"nome":"Cadeia de teste"}'}}},{id:'maturidade_gestao_versao1',data:{$type:'map',value:{data:'{"concluida":true}'}}},{id:'proj_governanca',data:{$type:'map',value:{data:'{"demandas":[{"titulo":"Demanda"}]}'}}}];
  await page.route('https://siga.test/**',async route=>{
   const request=route.request();
   if(!request.url().endsWith('/backup'))return route.fulfill({contentType:'text/html',body:'<button onclick="exportarBackupJSON()">Backup de Processos</button><button onclick="projExportJSON()">Backup de Projetos</button>'});
   assert.equal(request.headers().authorization,'Bearer token-sintetico');const values=request.postDataJSON();calls.push(values);
   if(fail&&values.action==='files')return route.fulfill({status:503,json:{error:'Falha simulada ao copiar anexos.'}});
   let result;
   if(values.action==='manifest')result={collections:COLLECTIONS,bucket:'bucket-teste',excludedCollections:['sessions']};
   if(values.action==='documents')result={documents:values.path==='config'?config.filter(doc=>allowedConfig(doc.id)).map(doc=>({...doc,path:'config/'+doc.id,subcollections:[]})):values.path==='mapeamentos_colaborativos'?[{id:'privado',path:'mapeamentos_colaborativos/privado',data:{$type:'map',value:{status:'rascunho',autor_uid:'outro-autor'}},subcollections:[]}]:[],nextCursor:null};
   if(values.action==='files')result={files:[{path:'auditoria/anexo.txt',generation:'1',size:content.length,contentType:'text/plain'}],nextCursor:null};
   if(values.action==='file')result={base64:content.toString('base64'),bytes:content.length,sha256:createHash('sha256').update(content).digest('hex'),nextOffset:content.length,size:content.length};
   return route.fulfill({json:result});
  });
  await page.goto('https://siga.test/');
  await page.evaluate(()=>{window.CONFIG={SYSTEM_BACKUP_URL:'https://siga.test/backup'};window.isEP=()=>true;window.fbReady=()=>true;window.fb=()=>({auth:{currentUser:{getIdToken:async()=> 'token-sintetico'}}});window.toast=window.projToast=message=>{window.lastToast=message;};window.projEnsureEPJson=()=>true;});
  await page.addScriptTag({path:'src/shared/system-backup.js'});
  for(const [file,name] of [['processos.html','exportarBackupJSON']]){
   const source=readFileSync(file,'utf8');assert.ok(source.includes('SystemBackup.export()'));
   await page.addScriptTag({content:source.match(new RegExp('function '+name+'\\([^]*?\\n}'))[0]});
  }
  for(const label of ['Backup de Processos']){
   const next=page.waitForEvent('download');await page.getByRole('button',{name:label,exact:true}).click();const download=await next;
   assert.match(download.suggestedFilename(),/^siga-processos-completo-.*\.json$/);const backup=JSON.parse(readFileSync(await download.path(),'utf8'));
   assert.equal(backup._meta.formato,'SIGA_BACKUP_COMPLETO');assert.deepEqual(Object.keys(backup.colecoes),COLLECTIONS);
   assert.equal(backup.colecoes.mapeamentos_colaborativos[0].data.value.status,'rascunho');assert.equal(backup.colecoes.config.length,2);assert.ok(!backup.colecoes.config.some(doc=>doc.id==='proj_governanca'));for(const name of ['usuarios','projPROJETOS','projPROGRAMAS'])assert.ok(!Object.hasOwn(backup.colecoes,name));
   assert.equal(Buffer.from(backup.anexos[0].chunks[0].base64,'base64').toString(),content.toString());assert.equal(backup._meta.arquivos,1);
   assert.ok(!JSON.stringify(backup).includes('token-sintetico'));
  }
  await page.evaluate(()=>{window.projLoad=()=>{};window.PROJETOS=[{id:'projeto-separado'}];window.PROGRAMAS=[];window.PROJ_MACROS=[];window.PROJ_OBJETIVOS=[];});
  await page.addScriptTag({content:readFileSync('projetos-logic.js','utf8').match(/function projExportJSON\([^]*?\n}/)[0]});
  const projectDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Backup de Projetos',exact:true}).click();
  const projects=JSON.parse(readFileSync(await (await projectDownload).path(),'utf8'));assert.equal(projects.version,'SIGA_Projetos_v6');assert.equal(projects.projetos[0].id,'projeto-separado');assert.ok(!projects.colecoes);
  fail=true;let unexpectedDownload=false;page.on('download',()=>{unexpectedDownload=true;});
  await page.getByRole('button',{name:'Backup de Processos',exact:true}).click();await page.waitForFunction(()=>window.lastToast==='Falha simulada ao copiar anexos.');
  assert.equal(unexpectedDownload,false);assert.equal(await page.locator('dialog').count(),0);
  assert.deepEqual(errors,[]);console.log('Backup completo: Processos exporta históricos e rascunhos com anexo íntegro, excluindo usuários e Projetos; falha não gera download parcial.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
