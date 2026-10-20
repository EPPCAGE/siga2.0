const {chromium}=require('playwright'),{readFileSync,mkdtempSync}=require('node:fs'),assert=require('node:assert/strict');
const {tmpdir}=require('node:os'),{join}=require('node:path');
(async()=>{
 const artifacts=mkdtempSync(join(tmpdir(),'siga-asis-cards-'));
 const html=readFileSync('processos.html','utf8'),browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<button onclick="abrirEsbocoCards()">Experimentar esboço por cards</button><div id="original-canvas" style="height:400px"></div>');
  await page.addStyleTag({content:html.slice(html.indexOf('<style>')+7,html.indexOf('</style>'))});
  await page.addStyleTag({path:'src/processos/asis-cards.css'});
  await page.addStyleTag(process.env.BPMN_DIAGRAM_CSS?{path:process.env.BPMN_DIAGRAM_CSS}:{url:'https://cdn.jsdelivr.net/npm/bpmn-js@17/dist/assets/diagram-js.css'});
  await page.addScriptTag(process.env.BPMN_MODELER_PATH?{path:process.env.BPMN_MODELER_PATH}:{url:'https://cdn.jsdelivr.net/npm/bpmn-js@17/dist/bpmn-modeler.production.min.js'});
  await page.addScriptTag({path:'src/shared/asis-cards.js'});await page.addScriptTag({path:'src/processos/asis-cards.js'});
  await page.addScriptTag({content:html.slice(html.indexOf('function BpmnMilestoneRenderer('),html.indexOf('function bpmnAddMilestone('))});
  await page.addScriptTag({content:html.match(/function _arquivarVersaoAnterior\([^]*?\n}/)[0]});
  await page.evaluate(async()=>{
   window.esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   let serial=0;crypto.randomUUID=()=> 'test_'+(++serial);
   const old=AsIsCards.compile([{id:'old',type:'task',nome:'Atividade original',executor:'Equipe',modo:'Manual'}]);
   window.curProc={id:1,nome:'Processo de teste',mod:{asIs:'Descrição preservada',bpmnAsIs:old.xml,etapas_proc:[{id:'legacy',nome:'Etapa antiga',desc:'Detalhamento preservado'}]}};window.processos=[curProc];window.usuarioLogado={nome:'EP'};window.role='ep';window.isEP=()=>role==='ep';
   const m=new BpmnJS(bpmnModelerOptions('#original-canvas'));await m.importXML(old.xml);
   window.bpmnModelers={asis:m};window.bpmnProcIds={asis:1};window.bpmnDirty={asis:false};window.originalXML=old.xml;
   window.fbReady=()=>true;window._fbLoadedAt=1;window.saveFails=false;window.savedProcess=null;window.fbSaveAll=async()=>{if(saveFails)return false;window.savedProcess=JSON.parse(JSON.stringify(curProc));return true;};window.toast=()=>{};window.now=()=> '20/10/2026';window.initBpmnMod=()=>{};window._refreshEtapasList=()=>{};
  });
  await page.getByRole('button',{name:'Experimentar esboço por cards'}).click();
  let dialog=page.locator('#asis-cards-dialog');await dialog.waitFor();
  async function addCard(container,type,name,owner,settings={}){
   await container.locator(`[data-action="add-${type}"]`).first().click();
   const editor=page.locator('#asis-card-editor');await editor.locator('[name="nome"]').fill(name);
   if(owner)await editor.locator('[name="executor"]').fill(owner);
   for(const [key,value] of Object.entries(settings)){const input=editor.locator(`[name="${key}"]`);if(await input.evaluate(el=>el.tagName==='SELECT'))await input.selectOption(value);else await input.fill(value);}
   await editor.getByRole('button',{name:'Salvar card',exact:true}).click();await editor.waitFor({state:'detached'});
  }
  await addCard(dialog,'task','Receber solicitação','Protocolo');
  assert.equal(await dialog.locator('.asis-cards-list input,.asis-cards-list textarea').count(),0);
  assert.equal(await page.evaluate(()=>curProc.mod.bpmnAsIs),await page.evaluate(()=>originalXML));
  assert.equal(await dialog.locator('#asis-cards-apply').isDisabled(),true);
  await addCard(dialog.locator('.asis-cards-list > .asis-cards-add'),'decision','Documentação completa?');
  const branches=dialog.locator('.asis-branches > section');
  await addCard(branches.nth(0),'task','Aprovar pedido','Gestão');
  await addCard(branches.nth(1),'task','Solicitar correção','Protocolo');
  await dialog.locator('#asis-cards-confirm').check();await page.waitForFunction(()=>!document.getElementById('asis-cards-apply').disabled);
  assert.equal(await dialog.locator('.djs-element.djs-shape:not(.djs-label)[data-element-id^="Card_"]:not([data-element-id$="_label"])').count(),4);
  await page.screenshot({path:join(artifacts,'desktop.png'),fullPage:true});
  await page.evaluate(()=>saveFails=true);await dialog.getByRole('button',{name:'Aplicar e salvar AS IS',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('asis-cards-error').textContent.includes('gravação'));
  assert.equal(await page.evaluate(()=>curProc.mod.bpmnAsIs),await page.evaluate(()=>originalXML));assert.equal(await page.evaluate(()=>curProc.mod.asIsCards),undefined);
  await page.evaluate(()=>saveFails=false);await dialog.getByRole('button',{name:'Aplicar e salvar AS IS',exact:true}).click();await dialog.waitFor({state:'detached'});
  const snapshot=await page.evaluate(()=>window.savedProcess);
  assert.equal(snapshot.mod.asIs,'Descrição preservada');assert.equal(snapshot.mod.asIsCards.cards.length,2);assert.equal(snapshot.mod.etapas_proc.length,4);
  assert.match(snapshot.mod.bpmnAsIs,/Aprovar pedido/);assert.match(snapshot.mod.bpmnAsIsSvg,/Receber/);assert.equal(snapshot.mod.versoes_anteriores.length,1);assert.equal(snapshot.mod.versoes_anteriores[0].etapas_proc[0].desc,'Detalhamento preservado');
  assert.equal(await page.evaluate(()=>bpmnModelers.asis),null);
  const verified=await page.evaluate(async()=>{
    const viewer=new BpmnJS(bpmnModelerOptions('#original-canvas'));
    const imported=await viewer.importXML(window.savedProcess.mod.bpmnAsIs);
    const allStepsExist=window.savedProcess.mod.etapas_proc.every(step=>viewer.get('elementRegistry').get(step.bpmn_id));
    const types=viewer.get('elementRegistry').getAll().map(el=>el.type);
    const xml=(await viewer.saveXML()).xml;viewer.destroy();
    return {warnings:(imported.warnings || []).map(w=>w.message),allStepsExist,types,xml};
  });
  assert.deepEqual(verified.warnings,[]);assert.equal(verified.allStepsExist,true);assert.ok(verified.types.includes('bpmn:ExclusiveGateway'));assert.match(verified.xml,/bpmndi:BPMNDiagram/);

  // Reload saved cards, then cancel without overwriting the saved process.
  await page.evaluate(()=>{curProc=JSON.parse(JSON.stringify(window.savedProcess));processos=[curProc];});
  await page.getByRole('button',{name:'Experimentar esboço por cards'}).click();dialog=page.locator('#asis-cards-dialog');await dialog.waitFor();
  assert.equal(await dialog.locator('[data-card]').count(),4);
  await page.setViewportSize({width:390,height:844});assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth));await page.screenshot({path:join(artifacts,'mobile.png'),fullPage:true});
  await dialog.getByRole('button',{name:'Fechar',exact:true}).click();await dialog.waitFor({state:'detached'});assert.equal(await page.evaluate(()=>curProc.mod.bpmnAsIs),snapshot.mod.bpmnAsIs);
  // A changed diagram cannot be silently replaced by a stale cards dialog.
  await page.setViewportSize({width:1500,height:1000});await page.getByRole('button',{name:'Experimentar esboço por cards'}).click();dialog=page.locator('#asis-cards-dialog');
  await dialog.locator('#asis-cards-confirm').check();await page.waitForFunction(()=>!document.getElementById('asis-cards-apply').disabled);
  await page.evaluate(()=>curProc.mod.bpmnAsIs+=' ');await dialog.getByRole('button',{name:'Aplicar e salvar AS IS',exact:true}).click();
  assert.match(await dialog.locator('#asis-cards-error').innerText(),/atualizado/);await dialog.getByRole('button',{name:'Fechar',exact:true}).click();await dialog.waitFor({state:'detached'});
  // New node types and independent endings, using the actual popup UI and BPMN importer.
  await page.evaluate(()=>{curProc={id:2,nome:'Finais independentes',mod:{}};processos=[curProc];});
  await page.getByRole('button',{name:'Experimentar esboço por cards'}).click();dialog=page.locator('#asis-cards-dialog');
  await dialog.locator('[data-action="edit-start"]').click();
  await page.locator('#asis-card-editor [name="nome"]').fill('Pedido recebido');
  await page.locator('#asis-card-editor').getByRole('button',{name:'Salvar card'}).click();
  await dialog.locator('[data-action="add-task"]').first().click();
  await page.locator('#asis-card-editor').getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal(await dialog.locator('[data-card]').count(),0);
  await addCard(dialog,'parallel','Executar em paralelo',null,{join:'false'});
  const paths=dialog.locator('.asis-branches > section');
  await addCard(paths.nth(0),'wait','Aguardar retorno',null,{duration:'PT30M'});
  await addCard(paths.nth(0),'end','Final da espera');
  await addCard(paths.nth(1),'inclusive','Selecionar caminhos',null,{join:'false'});
  const nested=dialog.locator('.asis-kind-inclusive .asis-branches > section');
  await addCard(nested.nth(0),'task','Executar alternativa','Equipe');
  await addCard(nested.nth(0),'end','Final alternativo');
  await addCard(nested.nth(1),'end','Final imediato');
  await dialog.locator('#asis-cards-confirm').check();await page.waitForFunction(()=>!document.getElementById('asis-cards-apply').disabled);
  await dialog.getByRole('button',{name:'Aplicar e salvar AS IS',exact:true}).click();await dialog.waitFor({state:'detached'});
  const expanded=await page.evaluate(async()=>{
   const viewer=new BpmnJS(bpmnModelerOptions('#original-canvas')),imported=await viewer.importXML(curProc.mod.bpmnAsIs);
   const elements=viewer.get('elementRegistry').getAll(),ends=elements.filter(el=>el.type==='bpmn:EndEvent');
   const result={warnings:imported.warnings.map(w=>w.message),ends:ends.length,noOutgoing:ends.every(el=>(el.businessObject.outgoing || []).length===0),xml:(await viewer.saveXML()).xml};viewer.destroy();return result;
  });
  assert.deepEqual(expanded.warnings,[]);assert.equal(expanded.ends,3);assert.equal(expanded.noOutgoing,true);
  for(const text of ['parallelGateway','inclusiveGateway','timerEventDefinition','linkEventDefinition','PT30M','Pedido recebido'])assert.ok(expanded.xml.includes(text),text);
  await page.evaluate(async()=>{role='dono';await abrirEsbocoCards();});assert.equal(await page.locator('#asis-cards-dialog').count(),0);
  assert.deepEqual(errors,[]);console.log('AS IS por cards: BPMN real com raias/decisões, prévia, confirmação, histórico, gravação/rollback, recarga, cancelamento, conflitos, permissões e mobile validados.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
