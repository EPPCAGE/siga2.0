const {chromium}=require('playwright'),{readFileSync}=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const html=readFileSync('processos.html','utf8'),browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<div id="painel-gestor-sub"></div><div id="painel-gestor-content"></div>');
  await page.evaluate(()=>{
   window.ARQUITETURA=[{nome:'Gestão de pessoas',processos:[{id:'a',nome:'Gerenciar afastamentos',proc_id:1}]}];
   window.processos=[{id:1,arq_id:'a',nome:'Gerenciar afastamentos',etapa:'auditoria'},{id:2,arq_id:'a',nome:'Gerenciar afastamentos',etapa:'riscos',ent:{dt_inicio:'2026-10-01'}}];
   window.isMapeado=()=>true;window.isCritico=()=>true;window.esc=v=>String(v??'');window.etIdx=()=>0;window.ETAPAS=[{titulo:'Identificação de riscos'},{titulo:'Fim'}];window.RELATORIOS_IND=[];
   window._epModuleAllowed=()=>false;window.buildMapChartHTML=()=>'';window.initMapChart=()=>{};window._htmlIndicadoresCriticos=()=>'';window._coberturaIndicadoresCriticos=()=>({});window.kpis=[];window.Riscos={rows:()=>[]};window.riscosCoverageHtml=()=>'';window._htmlProcessosPorMaturidade=()=>'';
   window.charts={};window.Chart=function(canvas,config){charts[canvas.id]=config;};
  });
  await page.addScriptTag({content:['_carteiraPainelGestor','rPainelGestor'].map(n=>html.match(new RegExp('function '+n+'\\([^]*?\\n}'))[0]).join('\n')});
  await page.evaluate(()=>rPainelGestor());await page.waitForFunction(()=>charts['pg-macro-chart']);
  assert.match(await page.locator('#painel-gestor-content').innerText(),/Trabalhos em andamento \(1\)/);
  assert.match(await page.locator('tbody').innerText(),/Gerenciar afastamentos/);
  assert.match(await page.locator('#pg-pie-chart').getAttribute('aria-label'),/0 mapeados, 1 em mapeamento, 0 não mapeados/);
  assert.deepEqual(await page.evaluate(()=>charts['pg-pie-chart'].data.datasets[0].data),[0,1,0]);
  assert.deepEqual(await page.evaluate(()=>charts['pg-criticos-pie-chart'].data.datasets[0].data),[0,1,0]);
  assert.deepEqual(await page.evaluate(()=>charts['pg-macro-chart'].data.datasets[1].data),[100]);
  assert.deepEqual(errors,[]);console.log('Painel do gestor: ciclo ativo de Gerenciar afastamentos aparece na tabela e nas carteiras geral/crítica e no gráfico por macroprocesso.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
