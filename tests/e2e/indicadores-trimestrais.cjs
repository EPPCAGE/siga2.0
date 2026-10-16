const {chromium}=require('playwright');
const {readFileSync}=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const html=readFileSync('processos.html','utf8'),browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const start=html.indexOf('<div id="novo-kpi-modal"');await page.setContent(html.slice(start,html.indexOf('<div id="page-painelgestor"',start)));
  await page.addStyleTag({content:html.slice(html.indexOf('<style>')+7,html.indexOf('</style>'))});
  await page.evaluate(()=>{
    window.kpis=Array.from({length:12},(_,i)=>({id:i+1,codigo:'T1',nome:'Indicador trimestral',area:'DAUD',periodo:String(i+1).padStart(2,'0')+'/2026',periodicidade:'Mensal',meta:100,realizado:50,indice:50,analise:'Análise '+(i+1)}));
    window.isEP=()=>true;window.esc=v=>String(v??'');window.ARQUITETURA=[];window.processos=[];
    window.AreasArquitetura={options:()=>'<option>DAUD</option>'};window._kpiPopulateProcessSelector=()=>{};window._kpiPopulateProjectSelector=async()=>{};
    window._kpiParseProcessSelection=()=>({pid:null,arq_id:null});window.rInd=()=>{};window.toast=()=>{};window.fbAutoSave=()=>{window.saved=JSON.parse(JSON.stringify(kpis));};
  });
  const names=['_kpiPeriodoPrevisto','_kpiAtualizarPeriodicidade','parseNumBR','_kpiMetaInformada','_kpiMeta','periodoToNum','_kpiGetSamePeriods','_kpiUpdateNavDisplay','_kpiFormSetFields','_kpiNavUpdateSelector','_kpiNavFlushCurrent','_kpiEditingPeriods','_kpiNavLoadCurrent','_kpiNavGoto','_kpiNavStep','calcPctReal','editKpi','_kpiCalcPct','_kpiPromotedOrigin','_kpiReadPeriodFields','_kpiReadCommonFields','_kpiReadSinglePayload','_kpiApplyPeriodEdits','_kpiRefreshPct','_kpiSaveMultiPeriods','_kpiSaveSingleEdit','_kpiCreateNew','salvarNovoKpi'];
  await page.addScriptTag({content:names.map(n=>html.match(new RegExp('function '+n+'\\([^]*?\\n}'))[0]).join('\n')});
  await page.evaluate(()=>editKpi(1));await page.selectOption('#nkpi-period','Trimestral');await page.selectOption('#kpi-nav-sel','1');
  assert.equal(await page.locator('#nkpi-real').isVisible(),false);assert.equal(await page.locator('#nkpi-meta').isVisible(),false);assert.equal(await page.locator('#nkpi-analise').isVisible(),true);
  for(let month=1;month<=12;month++){
    await page.selectOption('#kpi-nav-sel',String(month-1));
    const expected=[3,6,9,12].includes(month);
    assert.equal(await page.locator('#nkpi-real').isVisible(),expected,'Realizado '+month);
    assert.equal(await page.locator('#nkpi-meta').isVisible(),expected,'Meta '+month);
    assert.equal(await page.locator('#nkpi-indice').isVisible(),expected,'Índice '+month);
    assert.equal(await page.locator('#nkpi-analise').isVisible(),true);
  }
  await page.selectOption('#kpi-nav-sel','1');await page.fill('#nkpi-analise','Acompanhamento sem medição em fevereiro');
  await page.getByRole('button',{name:'Salvar',exact:true}).click();
  const saved=await page.evaluate(()=>saved);
  for(let i=0;i<12;i++){
    assert.equal(saved[i].periodicidade,'Trimestral');
    if(![2,5,8,11].includes(i)){assert.equal(saved[i].realizado,null);assert.equal(saved[i].meta,null);assert.equal(saved[i].sem_dado,true);}
    else{assert.equal(saved[i].realizado,50);assert.equal(saved[i].meta,100);}
  }
  assert.equal(saved[1].analise,'Acompanhamento sem medição em fevereiro');
  await page.evaluate(()=>editKpi(2));await page.selectOption('#kpi-nav-sel','1');assert.equal(await page.locator('#nkpi-real').isVisible(),false);
  await page.selectOption('#nkpi-period','Mensal');assert.equal(await page.locator('#nkpi-real').isVisible(),true);assert.equal(await page.locator('#nkpi-meta').isVisible(),true);
  await page.setViewportSize({width:390,height:844});assert.ok(await page.locator('#nkpi-analise').isVisible());assert.deepEqual(errors,[]);
  console.log('Trimestrais: campos numéricos apenas em mar/jun/set/dez, análise mensal preservada, navegação, gravação e retorno à periodicidade mensal validados.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
