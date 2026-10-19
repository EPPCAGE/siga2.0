const {chromium}=require('@playwright/test');
const {readFileSync}=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    for(const file of ['processos.html']){
      const html=readFileSync(path.resolve(__dirname,'../..',file),'utf8'),start=html.indexOf('function _arqFilteredItems('),end=html.indexOf('function limparFiltrosArq(',start);
      assert.ok(start>=0 && end>start);
      const ids=['arq-f-projeto','arq-f-macro','arq-f-area','arq-f-nat','arq-f-obje','arq-f-map','arq-f-crit','arq-f-dono','arq-f-mat'];
      const selects=ids.map(id=>html.match(new RegExp('<select\\b[^>]*id="'+id+'"[^>]*>[\\s\\S]*?<\\/select>'))?.[0]);assert.ok(selects.every(Boolean));
      const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.setContent(selects.join('')+'<input id="arq-srch"><p id="results"></p>');
      await page.evaluate(()=>{
        globalThis.ARQUITETURA=[{id:'m1',nome:'Auditoria',processos:[{id:'parent',nome:'Agrupador',gerente:'Dono sem resultados',subprocessos:[{id:'a',nome:'Auditar',area:'Auditoria',gerente:'Ana'}]},{id:'b',nome:'Pagar',area:'Financeiro',gerente:'Bia'}]},{id:'m2',nome:'Gestão',processos:[{id:'c',nome:'Gerir',area:'Gestão',gerente:'Carlos'}]}];
        globalThis.processos=[];globalThis.PROJETOS_USUARIOS=[{id:'project'}];globalThis.kpis=[];
        globalThis.AreasArquitetura={migrate:()=>{}};globalThis.ObjetivosEstrategicos={migrateArchitecture:()=>{}};globalThis._populateProjetoFilters=()=>{};
        globalThis.IndicadoresImpactados={architectureMatches:(_p,_a,_k,_proc,id)=>id==='b'};
        globalThis.isMapeado=id=>id==='a';globalThis.isCritico=()=>false;
        globalThis.esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
        globalThis.rArq=()=>{rArqPopulateFilters();document.querySelector('#results').textContent=JSON.stringify(_arqFilteredItems(getArqFilters()).map(result=>result.item.id));};
      });
      await page.addScriptTag({content:html.slice(start,end)});await page.evaluate(()=>rArq());
      const owners=()=>page.locator('#arq-f-dono option').evaluateAll(options=>options.map(option=>option.value));
      assert.deepEqual(await owners(),['','Ana','Bia','Carlos']);
      for(const owner of ['Ana','Bia','Carlos']){await page.locator('#arq-f-dono').selectOption(owner);assert.ok(JSON.parse(await page.locator('#results').textContent()).length>0);assert.deepEqual(await owners(),['','Ana','Bia','Carlos']);}
      await page.locator('#arq-f-area').selectOption('Auditoria');assert.deepEqual(await owners(),['','Ana']);assert.equal(await page.locator('#arq-f-dono').inputValue(),'');
      await page.locator('#arq-f-dono').selectOption('Ana');await page.locator('#arq-f-area').selectOption('');
      await page.locator('#arq-f-macro').selectOption('Gestão');assert.deepEqual(await owners(),['','Carlos']);assert.equal(await page.locator('#arq-f-dono').inputValue(),'');
      await page.locator('#arq-f-macro').selectOption('');await page.locator('#arq-f-map').selectOption('sim');assert.deepEqual(await owners(),['','Ana']);
      await page.locator('#arq-f-map').selectOption('');
      await page.evaluate(()=>document.querySelector('#arq-f-projeto').add(new Option('Projeto','project')));await page.locator('#arq-f-projeto').selectOption('project');assert.deepEqual(await owners(),['','Bia']);await page.locator('#arq-f-projeto').selectOption('');
      await page.locator('#arq-srch').fill('Pagar');await page.evaluate(()=>rArq());assert.deepEqual(await owners(),['','Bia']);
      await page.locator('#arq-f-dono').selectOption('Bia');await page.evaluate(()=>{ARQUITETURA[0].processos.splice(1,1);rArq();});assert.deepEqual(await owners(),['']);assert.equal(await page.locator('#arq-f-dono').inputValue(),'');
      await page.locator('#arq-srch').fill('');await page.evaluate(()=>{ARQUITETURA=[];rArq();});assert.deepEqual(await owners(),['']);
      assert.deepEqual(errors,[]);await page.close();console.log(file+': DONO sem resultados removido; seleção válida preservada; área, macro, busca, mapeamento e exclusão verificados.');
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
