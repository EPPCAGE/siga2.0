const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const {readFileSync} = require('node:fs');

// Testa a tela real com dados controlados, sem autenticação ou acesso à produção.
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('http://siga.test/**', route => route.fulfill({
      contentType:'text/html', body:'<html><body><div id="proj-page-detalhe" class="proj-page"><div id="fixture"></div></div><div id="proj-indicadores-content"></div></body></html>'
    }));
    await page.goto('http://siga.test/');
    await page.evaluate(() => {
      window.fbReady = () => false;
      window.isEP = () => true;
      window.usuarioLogado = {perfil:'ep'};
      window.ORG_CONFIG = {};
    });
    await page.addScriptTag({path:path.resolve(__dirname, '../../src/shared/objetivos-estrategicos.js')});
    await page.addScriptTag({path:path.resolve(__dirname, '../../src/shared/areas-arquitetura.js')});
    await page.addScriptTag({path:path.resolve(__dirname, '../../src/shared/indicadores-impactados.js')});
    await page.addScriptTag({path:path.resolve(__dirname, '../../projetos-logic.js')});
    await page.evaluate(() => {
      projSetHtml = (el, html) => { el.innerHTML = html; };
      projToast = () => {};
      PROJETOS = [projFixDefaults({id:1, nome:'Projeto de teste', divisao:'DAUD', macroprocessos:['[Finalístico] Auditoria'],objetivos_estrategicos:['Aprimorar os Processos de Auditoria, com Base nas Melhores Práticas Internacionais']})];
      _projCurrentId = '1';
      projApplyArquitetura([
        {id:'aud',nome:'Auditoria',processos:[{id:'p1',nome:'Realizar Inspeção',area:'Divisão de Auditoria'}]},
        {id:'con',nome:'Controle',processos:[{id:'p1',nome:'Controlar Despesas',area:'Contabilidade'}]}
      ]);
      localStorage.setItem(PROJ_STORAGE_KEY, JSON.stringify(PROJETOS));
      document.getElementById('fixture').innerHTML = projTabAprovacao(PROJETOS[0]);
      projPopulateVinculacoes();
    });
    assert.equal(await page.locator('#aprov-macro-sel option').count(), 3);
    assert.equal(await page.locator('#aprov-macro-novo').count(), 0);
    assert.equal(await page.locator('#aprov-divisao').inputValue(), 'Divisão de Auditoria');
    assert.equal(await page.locator('#aprov-divisao option').count(), 3);
    assert.ok((await page.locator('#aprov-divisao option').allTextContents()).includes('Divisão de Contabilidade'));
    await page.selectOption('#aprov-impacto-macro', 'aud');
    assert.equal(await page.locator('#aprov-impacto-sel option').count(), 2);
    await page.selectOption('#aprov-impacto-sel', JSON.stringify(['aud','p1']));
    await page.locator('button[onclick="projAddProcessoImpactado()"]').click();
    assert.match(await page.locator('#aprov-impacto-list').innerText(), /Auditoria → Realizar Inspeção/);
    assert.equal(await page.locator('#aprov-impacto-sel option').count(), 1);
    await page.selectOption('#aprov-impacto-macro', 'con');
    await page.selectOption('#aprov-impacto-sel', JSON.stringify(['con','p1']));
    await page.locator('button[onclick="projAddProcessoImpactado()"]').click();
    assert.equal(await page.locator('#aprov-impacto-list button').count(), 2);
    await page.evaluate(() => {
      projLoad();
      document.getElementById('fixture').innerHTML = projTabAprovacao(PROJETOS[0]);
      projPopulateVinculacoes();
    });
    assert.equal(await page.locator('#aprov-impacto-list button').count(), 2);
    await page.locator('#aprov-impacto-list button').first().click();
    assert.equal(await page.locator('#aprov-impacto-list button').count(), 1);
    assert.match(await page.locator('#aprov-impacto-list').innerText(), /Controle → Controlar Despesas/);
    await page.selectOption('#aprov-macro-sel', 'con');
    await page.locator('button[onclick="projAddMacro()"]').click();
    const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem(PROJ_STORAGE_KEY))[0]);
    assert.deepEqual(persisted.macroprocesso_ids, ['aud','con']);
    assert.equal(persisted.processos_impactados.length, 1);
    assert.equal(persisted.divisao, 'Divisão de Auditoria');
    assert.deepEqual(persisted.objetivos_estrategicos,['[Processos] Otimizar a contribuição da auditoria para o aprimoramento dos processos da gestão pública estadual']);
    await page.selectOption('#aprov-divisao','Divisão de Contabilidade');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem(PROJ_STORAGE_KEY))[0].divisao), 'Divisão de Contabilidade');
    await page.evaluate(()=>{
      projApplyArquitetura([{id:'aud',nome:'Auditoria',processos:[{id:'pa',nome:'Auditar',subprocessos:[{id:'sa',nome:'Inspecionar'}]}]},
        {id:'con',nome:'Controle',processos:[{id:'pc',nome:'Controlar'}]}]);
      PROJETOS=[projFixDefaults({id:1,nome:'Projeto A',processos_impactados:[{macro_id:'aud',processo_id:'pa'}]}),
        projFixDefaults({id:2,nome:'Projeto B',processos_impactados:[{macro_id:'con',processo_id:'pc'}]}),projFixDefaults({id:3,nome:'Projeto sem impacto'})];
      _projFbState.loaded=true;_projCurrentPage='indicadores';
      window.fbReady=()=>true;
      window.processIndicatorCallbacks={};
      window.fb=()=>({onSnapshot:(ref,cb)=>{processIndicatorCallbacks[ref]=cb;return()=>{};}});
      window.kpisRepository={colRef:()=> 'kpis',list:async()=>({docs:[{data:{arq_id:'pa',nome:'Indicador de auditoria',meta:100,realizado:75,periodo:'out/2026'}},
        {data:{pid:99,nome:'Indicador de inspeção',meta:10,realizado:4,periodo:'out/2026'}},{data:{arq_id:'pc',nome:'Indicador de controle',meta:20,realizado:12}}]})};
      window.processosRepository={colRef:()=> 'processos',list:async()=>({docs:[{data:{id:99,arq_id:'sa'}}]})};
      projRenderIndicadoresPage();
    });
    await page.selectOption('#proj-ind-filter-proj','1');
    await page.waitForFunction(()=>document.getElementById('proj-ind-processos')?.textContent.includes('Indicador de inspeção'));
    assert.equal(await page.locator('#proj-ind-processos tbody tr').count(),2);
    assert.equal(await page.locator('#proj-ind-processos input').count(),0);
    assert.ok(!(await page.locator('#proj-ind-processos').innerText()).includes('Indicador de controle'));
    await page.evaluate(()=>{
      PROJETOS[0].dt_inicio='2026-09-15';
      PROJETOS[0].dt_fim='2026-09-30';
      projRenderIndicadoresPage();
    });
    assert.equal(await page.locator('#proj-ind-timeline li').count(),2);
    assert.match(await page.locator('#proj-ind-timeline').innerText(),/out\/2026/);
    assert.match(await page.locator('#proj-ind-timeline').innerText(),/75/);
    await page.evaluate(()=>processIndicatorCallbacks.kpis({forEach:fn=>fn({data:()=>({arq_id:'pa',nome:'Indicador atualizado',meta:100,realizado:80})})}));
    assert.match(await page.locator('#proj-ind-processos').innerText(),/Indicador atualizado/);
    await page.selectOption('#proj-ind-filter-proj','3');
    assert.match(await page.locator('#proj-ind-processos').innerText(),/Vincule os processos impactados/);
    await page.evaluate(()=>processIndicatorCallbacks.kpis({forEach:fn=>{
      fn({data:()=>({arq_id:'pc',nome:'Indicador associado diretamente',projeto_ids:['3'],meta:100,realizado:40,periodo:'out/2026'})});
    }}));
    assert.match(await page.locator('#proj-ind-processos').innerText(),/Indicador associado diretamente/);
    assert.equal(await page.locator('#proj-ind-processos tbody tr').count(),1);
    assert.match(await page.locator('.proj-v9-meta-list').innerText(),/Indicador associado diretamente/);
    await page.evaluate(()=>{PROJETOS[2].dt_inicio='2026-01-01';projRenderIndicadoresPage();});
    assert.equal(await page.locator('#proj-ind-timeline li').count(),1);
    assert.deepEqual(errors, []);
    const chartOrder = await page.evaluate(()=>{
      const rows=[
        {p:{nome:'Projeto'},ind:{nome:'Prazo',periodo:'janeiro/2026'}},
        {p:{nome:'Projeto'},ind:{nome:'Acessos',periodo:'fevereiro/2026'}},
        {p:{nome:'Projeto'},ind:{nome:'Prazo',periodo:'dez/2025'}},
        {p:{nome:'Projeto'},ind:{nome:'Acessos',periodo:'janeiro/2026'}}
      ];
      const container=document.createElement('div');
      container.innerHTML=projIndicadoresMetaChart(rows);
      return [...container.querySelectorAll('.proj-v9-meta-name')].map(el=>el.textContent);
    });
    assert.match(chartOrder[0],/^Acessos.*janeiro\/2026/);
    assert.match(chartOrder[1],/^Acessos.*fevereiro\/2026/);
    assert.match(chartOrder[2],/^Prazo.*dez\/2025/);
    assert.match(chartOrder[3],/^Prazo.*janeiro\/2026/);
    const processesHtml=readFileSync(path.resolve(__dirname,'../../processos.html'),'utf8');
    const projectFunctions=['_kpiPopulateProjectSelector','_kpiReadCommonFields','_kpiSaveMultiPeriods'].map(name=>
      processesHtml.match(new RegExp('(?:async )?function '+name+'\\([^]*?\\n}'))[0]).join('\n');
    await page.setContent('<select id="nkpi-projetos" multiple></select>'+['proc','codigo','desc','period','ciclo','ppe','unidade','polaridade'].map(id=>`<input id="nkpi-${id}">`).join(''));
    await page.addScriptTag({content:projectFunctions});
    await page.evaluate(()=>{
      window.esc=value=>String(value);
      window.fbReady=()=>true;
      window.projetosRepository={list:async()=>({docs:[{data:{id:1,nome:'Projeto A'}},{data:{id:2,nome:'Projeto B'}}]})};
      window._kpiParseProcessSelection=()=>({pid:null,arq_id:null});
      window._kpiNavFlushCurrent=()=>{};
      window._kpiPromotedOrigin=value=>value;
      window._kpiApplyPeriodEdits=()=>{};
      window._kpiRefreshPct=()=>{};
    });
    await page.evaluate(()=>_kpiPopulateProjectSelector({projeto_ids:['2']}));
    assert.deepEqual(await page.locator('#nkpi-projetos').evaluate(el=>[...el.selectedOptions].map(option=>option.value)),['2']);
    await page.selectOption('#nkpi-projetos',['1','2']);
    const linkedPeriods=await page.evaluate(()=>{
      window.kpis=[{id:1,periodo:'jan/2026'},{id:2,periodo:'fev/2026'}];
      _kpiSaveMultiPeriods('Auditoria','Indicador',window.kpis);
      return window.kpis.map(k=>k.projeto_ids);
    });
    assert.deepEqual(linkedPeriods,[['1','2'],['1','2']]);
    await page.selectOption('#nkpi-projetos',[]);
    assert.deepEqual(await page.evaluate(()=>_kpiReadCommonFields('Auditoria','Indicador').projeto_ids),[]);
    await page.setContent('<select id="arq-f-projeto"></select><select id="ind-projeto-sel"></select><select id="ind-area-sel"><option value="">Todas</option><option>Outra área</option></select><div id="ind-c"></div>');
    const filterFunctions=['_populateProjetoFilters','getProjetosVinculaveis','getArqFilters','itemMatchesFilters','_itemMatchesBaseFilters','_itemMatchesMatFilter','_itemMatchesSearch','rInd'].map(name=>
      processesHtml.match(new RegExp('function '+name+'\\([^]*?\\n}'))[0]).join('\n');
    await page.addScriptTag({content:filterFunctions});
    await page.evaluate(()=>{
      window.PROJETOS_USUARIOS=[];
      window.ARQUITETURA=[{id:'a',nome:'Auditoria',processos:[{id:'pa',nome:'Auditar'}]},{id:'b',nome:'Controle',processos:[{id:'pb',nome:'Controlar'}]}];
      window.processos=[];
      window.kpis=[{nome:'Impactado',arq_id:'pa'},{nome:'Direto',arq_id:'pb',projeto_ids:['2']},{nome:'Outro'}];
      window._fbLoadProjetosUsuarios=async()=>{window.PROJETOS_USUARIOS=[{id:1,nome:'Ativo',status:'ativo'},{id:2,nome:'Concluído',status:'concluido',processos_impactados:[{macro_id:'a',processo_id:'pa'}]},{id:3,nome:'Cancelado',status:'cancelado'}];};
      window._projetoFiltersState={loaded:false,loading:false};
      window._indCharts=[];
      window.populateIndFilters=()=>{};
      window._periodoInIntervalo=()=>true;
      window.kpiGroupByKey=items=>Object.fromEntries(items.map(item=>[item.nome,[item]]));
      window.kpiApplyMetaFallback=()=>{};
      window.kpiGrupoCardHTML=(key)=>`<div>${key}</div>`;
      window.createKpiChart=()=>{};
      window.injectIaIndicadores=()=>{};
      _populateProjetoFilters();
    });
    await page.waitForFunction(()=>document.querySelectorAll('#arq-f-projeto option').length===3);
    assert.deepEqual(await page.locator('#arq-f-projeto option').allTextContents(),['Todos','Ativo (ativo)','Concluído (concluido)']);
    assert.equal(await page.locator('#ind-projeto-sel option').count(),3);
    await page.selectOption('#arq-f-projeto','2');
    assert.deepEqual(await page.evaluate(()=>{
      const f=getArqFilters();return ARQUITETURA.flatMap(m=>m.processos.filter(p=>itemMatchesFilters(p,m.nome,f)).map(p=>p.nome));
    }),['Auditar','Controlar']);
    await page.selectOption('#ind-projeto-sel','2');
    await page.evaluate(()=>rInd());
    assert.equal(await page.locator('#ind-c').innerText(),'Impactado\nDireto');
    assert.equal(await page.locator('#ind-projeto-sel').inputValue(),'2');
    await page.selectOption('#ind-area-sel','Outra área');
    await page.evaluate(()=>rInd());
    assert.ok(!(await page.locator('#ind-c').innerText()).includes('Impactado'));
    assert.deepEqual(errors, []);
    console.log('Projetos: arquitetura, filtro, vínculos e persistência verificados no Chromium.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
