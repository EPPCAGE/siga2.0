const {chromium}=require('playwright'),{readFileSync}=require('node:fs'),{createHash}=require('node:crypto'),assert=require('node:assert/strict');
(async()=>{
 const html=readFileSync('processos.html','utf8'),browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<div id="painel-gestor-sub"></div><div id="painel-gestor-content"></div>');
  const tag=html.match(/<script src="(https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js@[^"]+)" integrity="([^"]+)"/);
  assert.ok(tag);assert.match(tag[1],/chart\.js@\d+\.\d+\.\d+\//);
  const projects=readFileSync('projetos.html','utf8');assert.ok(projects.includes(tag[1]+'" integrity="'+tag[2]));
  const script=process.env.CHART_TEST_PATH?readFileSync(process.env.CHART_TEST_PATH):Buffer.from(await (await fetch(tag[1])).arrayBuffer());
  assert.equal('sha384-'+createHash('sha384').update(script).digest('base64'),tag[2]);
  await page.route(tag[1],route=>route.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:script}));
  await page.evaluate(({src,integrity})=>new Promise((resolve,reject)=>{const element=document.createElement('script');element.src=src;element.integrity=integrity;element.crossOrigin='anonymous';element.onload=()=>resolve();element.onerror=()=>reject(Error('Chart.js bloqueado pelo navegador'));document.head.append(element);}),{src:tag[1],integrity:tag[2]});

  await page.evaluate(()=>{
   window.ARQUITETURA=[{nome:'Gestão de pessoas',processos:[{id:'a',nome:'Gerenciar afastamentos',proc_id:1}]}];
   window.processos=[{id:1,arq_id:'a',nome:'Gerenciar afastamentos',etapa:'auditoria'},{id:2,arq_id:'a',nome:'Gerenciar afastamentos',etapa:'riscos',ent:{dt_inicio:'2026-10-01'}}];
   window.isMapeado=()=>true;window.isCritico=()=>true;window.esc=v=>String(v??'');window.etIdx=()=>0;window.ETAPAS=[{titulo:'Identificação de riscos'},{titulo:'Fim'}];window.RELATORIOS_IND=[];
   window._epModuleAllowed=()=>false;window.buildMapChartHTML=()=>'';window.initMapChart=()=>{};window._htmlIndicadoresCriticos=()=>'';window._coberturaIndicadoresCriticos=()=>({});window.kpis=[];window.Riscos={rows:()=>[]};window.riscosCoverageHtml=()=>'';window._htmlProcessosPorMaturidade=()=>'';
   window.charts={};const NativeChart=window.Chart;NativeChart.defaults.animation=false;window.Chart=class extends NativeChart{constructor(canvas,config){super(canvas,config);charts[canvas.id]=config;}};
  });
  await page.addScriptTag({content:['_carteiraPainelGestor','rPainelGestor'].map(n=>html.match(new RegExp('function '+n+'\\([^]*?\\n}'))[0]).join('\n')});
  await page.evaluate(()=>rPainelGestor());await page.waitForFunction(()=>charts['pg-macro-chart']);
  assert.match(await page.locator('#painel-gestor-content').innerText(),/Trabalhos em andamento \(1\)/);
  assert.match(await page.locator('tbody').innerText(),/Gerenciar afastamentos/);
  assert.match(await page.locator('#pg-pie-chart').getAttribute('aria-label'),/0 mapeados, 1 em mapeamento, 0 não mapeados/);
  assert.deepEqual(await page.evaluate(()=>charts['pg-pie-chart'].data.datasets[0].data),[0,1,0]);
  assert.deepEqual(await page.evaluate(()=>charts['pg-criticos-pie-chart'].data.datasets[0].data),[0,1,0]);
  assert.deepEqual(await page.evaluate(()=>charts['pg-macro-chart'].data.datasets[1].data),[100]);
  for(const id of ['pg-pie-chart','pg-criticos-pie-chart','pg-macro-chart']){
    assert.equal(await page.locator('#'+id).evaluate(canvas=>canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.some((value,index)=>index%4===3&&value>0)),true,id+' deve conter desenho real');
  }
  await page.evaluate(()=>{window.Chart=undefined;rPainelGestor();});
  await page.waitForFunction(()=>document.querySelectorAll('#painel-gestor-content [role=status]').length===3);
  assert.match(await page.locator('#painel-gestor-content').innerText(),/Não foi possível carregar o gráfico/);
  assert.deepEqual(errors,[]);console.log('Painel do gestor: ciclo ativo de Gerenciar afastamentos aparece na tabela e nas carteiras geral/crítica e no gráfico por macroprocesso.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
