const {chromium}=require('playwright');
const {readFileSync}=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const html=readFileSync('processos.html','utf8'),browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const filters=['area','ciclo','periodo','intervalo','nome','ppe','macro','proc','projeto'];
  await page.setContent(html.match(/<button[^>]+id="ind-report-without-ai"[^]*?<\/button>/)[0]+filters.map(f=>'<input id="ind-'+f+'-sel">').join(''));
  await page.evaluate(()=>{
   window.esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   window.ORG_CONFIG={indicatorReportOrgLabel:'CAGE',indicatorReportFooter:'CAGE · Indicadores'};
   window.kpis=[{id:1,codigo:'A',nome:'Prazo de análise',area:'DAUD',periodo:'set/2026',realizado:90,meta:100,periodicidade:'Mensal',sem_dado:false},{id:2,codigo:'A',nome:'Prazo de análise',area:'DAUD',periodo:'out/2026',realizado:110,meta:100,periodicidade:'Mensal',sem_dado:false},{id:3,codigo:'B',nome:'Outro indicador',area:'OUTRA',periodo:'out/2026',realizado:25,meta:50},{id:4,codigo:'C',nome:'Trimestral fora do trimestre',area:'DAUD',periodo:'out/2026',realizado:999,meta:100,periodicidade:'Trimestral'}];
   window.processos=[];window.ARQUITETURA=[];window.PROJETOS_USUARIOS=[{id:1,nome:'Projeto A'}];
   window.IndicadoresImpactados={list:()=>[{ind:kpis[1]}]};
   window._kpiGetMacroProc=k=>({macro:k.area==='DAUD'?'Auditoria':'Controle',proc:k.area==='DAUD'?'Processo A':'Processo B'});
   window._periodoInIntervalo=()=>true;window.isCritico=()=>false;window.isEP=()=>true;window.messages=[];window.toast=m=>messages.push(m);
   window._lastIndAnalise='';window._lastIndLista=[];window._lastRelatorioIndHtml='';window._lastRelatorioIndFiltros='';
   window.chamarIA=()=>{throw Error('O relatório não pode chamar IA');};window.fetch=()=>{throw Error('O relatório não pode depender da rede');};
   document.getElementById('ind-area-sel').value='DAUD';document.getElementById('ind-periodo-sel').value='out/2026';
  });
  const names=['parseNumBR','_kpiPeriodoPrevisto','_kpiMetaInformada','_kpiMeta','periodoToNum','_kpiClassificacao','_kpiEtiquetasHtml'];
  await page.addScriptTag({content:names.map(n=>html.match(new RegExp('function '+n+'\\([^]*?\\n}'))[0]).join('\n')});
  await page.addScriptTag({content:html.slice(html.indexOf('function statusInfo('),html.indexOf('// ── RELATÓRIOS OFICIAIS DE INDICADORES'))});
  const [report]=await Promise.all([page.waitForEvent('popup'),page.getByRole('button',{name:'Gerar relatório PDF sem IA',exact:true}).click()]);
  await report.waitForLoadState('domcontentloaded');
  assert.equal(await report.locator('tbody tr').count(),1);
  const body=await report.locator('body').innerText();
  assert.match(body,/Taxa de atingimento por macroprocesso/i);assert.match(body,/Prazo de análise/);assert.match(body,/110/);assert.match(body,/90/);
  assert.doesNotMatch(body,/Análise dos Resultados|Outro indicador|Trimestral fora do trimestre/i);
  assert.match(body,/Área: DAUD/);assert.match(body,/Período: out\/2026/);
  const pdf=await report.pdf({format:'A4',landscape:true,printBackground:true});assert.equal(pdf.subarray(0,5).toString(),'%PDF-');await report.close();
  // Previously generated AI text and lists must never leak into the direct report.
  await page.evaluate(()=>{_lastIndAnalise='Texto antigo da IA';_lastIndLista=[kpis[0]];document.getElementById('ind-area-sel').value='OUTRA';});
  const [other]=await Promise.all([page.waitForEvent('popup'),page.getByRole('button',{name:'Gerar relatório PDF sem IA',exact:true}).click()]);await other.waitForLoadState('domcontentloaded');
  assert.match(await other.locator('body').innerText(),/Outro indicador/);assert.doesNotMatch(await other.locator('body').innerText(),/Texto antigo da IA|Prazo de análise/);await other.close();
  // Each dashboard filter must also restrict the report data.
  await page.evaluate(()=>{
   document.getElementById('ind-area-sel').value='';
   for(const [field,value] of Object.entries({nome:'Prazo de análise',macro:'Auditoria',proc:'Processo A',projeto:'1'}))document.getElementById('ind-'+field+'-sel').value=value;
  });
  assert.deepEqual(await page.evaluate(()=>_indicadoresFiltradosRelatorio().map(k=>k.id)),[2]);
  await page.evaluate(()=>{document.getElementById('ind-ppe-sel').value='Sim';gerarRelatorioIndPdf(true);});
  assert.match(await page.evaluate(()=>messages.at(-1)),/Nenhum indicador com dados/);
  assert.deepEqual(errors,[]);
  console.log('Relatório sem IA: botão direto, filtros atuais, dados anteriores, ausência de texto de IA, exclusão de trimestrais fora do período e PDF real validados sem rede.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
