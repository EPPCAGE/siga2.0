const {chromium}=require('@playwright/test');
const {readFileSync}=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
  const html=readFileSync('processos.html','utf8');
  for(const file of ['src/shared/riscos-projetos.js','src/processos/riscos-projetos-module.js'])assert.ok(html.includes('src="'+file+'?'));
  const start=html.indexOf('<div id="page-riscos"');
  const pageHtml=html.slice(start,html.indexOf('<div id="page-faq"',start));
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setContent(pageHtml);
    await page.evaluate(()=>{
      window.esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
      window.isEP=()=>true;window.usuarioLogado={perfil:'ep',nome:'Teste'};
      window.rRiscos=()=>{};window.fbReady=()=>true;window.toast=()=>{};
      window.testProject={id:1,nome:'Obras',gerente:'Ana',ideacao:{riscos_canvas:'Sobrecarga\nFalta de apoio'}};
      window.testAssessment=[];
      window.projetosRepository={list:async()=>({docs:[{id:'1',data:testProject}]}),ref:()=> 'project'};
      window.configRepository={get:async()=>({exists:()=>false}),ref:()=> 'assessment'};
      window.fb=()=>({db:{},runTransaction:async(_db,fn)=>fn({get:async ref=>({exists:()=>true,data:()=>ref==='project'?testProject:{avaliacoes:testAssessment}}),set:(_ref,data)=>{testAssessment=data.avaliacoes;}})});
    });
    for(const path of ['src/shared/riscos.js','src/shared/riscos-projetos.js','src/processos/riscos-module.js','src/processos/riscos-projetos-module.js'])await page.addScriptTag({content:readFileSync(path,'utf8')});
    await page.evaluate(()=>{window.rRiscos=()=>{};});
    await page.getByRole('tab',{name:'Riscos de projetos',exact:true}).click();
    await page.getByRole('heading',{name:'Riscos dos canvas (2)'}).waitFor();
    assert.equal(await page.locator('#riscos-panel-processos').isVisible(),false);
    await page.getByRole('button',{name:'Avaliar e registrar tratamento'}).first().click();
    await page.locator('#risk-project-prob').selectOption('Baixa');
    await page.locator('#risk-project-imp').selectOption('Baixo');
    await page.locator('#risk-cause').fill('Equipe reduzida');
    await page.getByRole('button',{name:'Salvar tratamento',exact:true}).click();
    await page.waitForFunction(()=>!document.getElementById('risk-treatment-modal'));
    assert.equal(await page.evaluate(()=>testAssessment[0].causa_provavel),'Equipe reduzida');
    assert.equal(await page.evaluate(()=>testProject.ideacao.riscos_canvas),'Sobrecarga\nFalta de apoio');
    await page.getByRole('tab',{name:'Riscos de processos',exact:true}).click();
    assert.equal(await page.locator('#riscos-panel-projetos').isVisible(),false);
    await page.evaluate(()=>{window.isEP=()=>false;});
    await page.getByRole('tab',{name:'Riscos de projetos',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'Avaliar e registrar tratamento'}).count(),0);
    await page.evaluate(()=>{projetosRepository.list=async()=>{throw Error('offline');};});
    await page.getByRole('button',{name:'Atualizar riscos',exact:true}).click();
    await page.getByRole('alert').waitFor();
    assert.deepEqual(errors,[]);
    console.log('Riscos de projetos: abas, carregamento, avaliação, gravação, leitura e erro verificados.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
