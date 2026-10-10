const {chromium}=require('playwright');
const {readFileSync}=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
  const html=readFileSync('processos.html','utf8');
  const names=['rFaq','rBuscaGeral','_buscaPodeAbrir','abrirResultadoBusca','_parseFaq','_rFaqHl','_faqProcKey','_rFaqItemHTML','_rFaqProcHTML','_rFaqMacroHTML','_faqPopulateMacroSelect','_faqBuildGroups','_faqFilterPairs','_faqCountLabel'];
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.setContent(html.slice(html.indexOf('<div id="page-faq"'),html.indexOf('<div id="page-arq"')));
    await page.addScriptTag({path:'src/shared/busca-geral.js'});
    await page.evaluate(()=>{
      window.esc=value=>String(value || '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
      window.fbReady=()=>false;window.isEP=()=>true;window.safeUrl=value=>/^https?:/.test(value)?value:'';
      window.processos=[{id:1,nome:'Auditar contratos',macro:'Auditoria',ent:{riscos:[{desc:'Atraso na emissão'}],prob:[{desc:'Falha no relatório'}]},form:{faq:'P: Como auditar?\nR: Revisar contratos.',pop:{obj:'Emitir relatório'}}}];
      window.ARQUITETURA=[];
      window.kpis=[{nome:'Prazo de emissão',codigo:'I1'}];
      window.PROJETOS_USUARIOS=[{id:2,nome:'Melhoria da auditoria',status:'concluido'}];
      window.publicacoes=[];
      window.abrirProc=id=>{window.openedProcess=id;};
    });
    await page.addScriptTag({content:names.map(name=>html.match(new RegExp('function '+name+'\\([^]*?\\n}'))[0]).join('\n')});
    await page.evaluate(()=>rFaq());
    assert.equal(await page.locator('#faq-srch').isDisabled(),true);
    for(const [type,query,expected] of [['faq','auditar','Como auditar'],['riscos','emissao','Atraso na emissão'],['problemas','relatorio','Falha no relatório'],['indicadores','I1','Prazo de emissão'],['processos','contratos','Auditar contratos'],['projetos','auditoria','Melhoria da auditoria'],['pops','relatorio','POP — Auditar contratos']]){
      await page.selectOption('#busca-tipo',type);
      assert.equal(await page.locator('#faq-srch').isEnabled(),true);
      await page.fill('#faq-srch',query);
      assert.ok((await page.locator('#faq-c').innerText()).includes(expected));
      assert.equal(await page.locator('#faq-f-macro').isVisible(),type==='faq');
    }
    await page.locator('#faq-c button').click();
    assert.equal(await page.evaluate(()=>window.openedProcess),1);
    for(const profile of ['dono','gestor']){
      await page.evaluate(profile=>{window.usuarioLogado={perfil:profile};window.openedProcess=null;},profile);
      for(const [type,query] of [['riscos','atraso'],['problemas','falha'],['processos','auditar'],['pops','relatorio']]){
        await page.selectOption('#busca-tipo',type);
        await page.fill('#faq-srch',query);
        assert.equal(await page.locator('#faq-c button, #faq-c a').count(),0);
        await page.evaluate(type=>abrirResultadoBusca({dataset:{searchType:type,target:JSON.stringify({kind:'processo',id:1})}}),type);
        assert.equal(await page.evaluate(()=>window.openedProcess),null);
      }
    }
    await page.evaluate(()=>{window.usuarioLogado={perfil:'ep'};});
    await page.selectOption('#busca-tipo','riscos');
    await page.fill('#faq-srch','atraso');
    assert.equal(await page.locator('#faq-c button').count(),1);
    await page.fill('#faq-srch','inexistente');
    assert.match(await page.locator('#faq-c').innerText(),/Nenhum resultado/);
    assert.deepEqual(errors,[]);
    console.log('Busca geral: sete categorias, FAQ, acentos, navegação e estados vazios verificados.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
