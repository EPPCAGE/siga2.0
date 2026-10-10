const {chromium}=require('playwright');
const {readFileSync}=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
  const html=readFileSync('processos.html','utf8');
  const names=['rFaq','selecionarTipoBusca','rBuscaGeral','_buscaPodeAbrir','abrirResultadoBusca'];
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.setContent(html.slice(html.lastIndexOf('<style>',html.indexOf('<div id="page-faq"')),html.indexOf('<div id="page-arq"')));
    await page.addScriptTag({path:'src/shared/busca-geral.js'});
    await page.evaluate(()=>{
      window.esc=value=>String(value || '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
      window.fbReady=()=>false;window.isEP=()=>!window.usuarioLogado || window.usuarioLogado.perfil==='ep';window.safeUrl=value=>/^https?:/.test(value)?value:'';
      window.processos=[{id:1,nome:'Auditar contratos',macro:'Auditoria',ent:{riscos:[{desc:'Atraso na emissão'}],prob:[{desc:'Falha no relatório'}]},form:{faq:'P: Como auditar?\nR: Revisar contratos.',pop:{obj:'Emitir relatório'}}}];
      window.ARQUITETURA=[];
      window.kpis=[{nome:'Prazo de emissão',codigo:'I1'}];
      window.PROJETOS_USUARIOS=[{id:2,nome:'Melhoria da auditoria',status:'concluido'}];
      window.publicacoes=[];
      window.abrirProc=id=>{window.openedProcess=id;};
      window.abrirInfoMeusProc=(arqId,processId)=>{window.openedInfo={arqId,processId};};
    });
    await page.addScriptTag({content:names.map(name=>html.match(new RegExp('function '+name+'\\([^]*?\\n}'))[0]).join('\n')});
    await page.evaluate(()=>rFaq());
    assert.equal(await page.locator('#faq-srch').isEnabled(),true);
    assert.equal(await page.locator('#busca-processo, #faq-f-macro').count(),0);
    assert.deepEqual(await page.locator('[data-busca-tipo]').allTextContents(),['Todos','Perguntas frequentes','Problemas','Riscos','POPs']);
    for(const [type,query,expected] of [['faq','auditar','Como auditar'],['riscos','emissao','Atraso na emissão'],['problemas','relatorio','Falha no relatório']]){
      await page.locator(`[data-busca-tipo="${type}"]`).click();
      assert.equal(await page.locator('#faq-srch').isEnabled(),true);
      await page.fill('#faq-srch',query);
      assert.ok((await page.locator('#faq-c').innerText()).includes(expected));
      assert.equal(await page.locator(`[data-busca-tipo="${type}"]`).getAttribute('aria-pressed'),'true');
      assert.equal(await page.locator('.knowledge-card').count(),1);
    }
    await page.locator('#faq-c button').click();
    assert.equal(await page.evaluate(()=>window.openedProcess),1);
    for(const profile of ['dono','gestor']){
      await page.evaluate(profile=>{window.usuarioLogado={perfil:profile};window.openedProcess=null;},profile);
      for(const [type,query] of [['riscos','atraso'],['problemas','falha']]){
        await page.locator(`[data-busca-tipo="${type}"]`).click();
        await page.fill('#faq-srch',query);
        assert.equal(await page.locator('#faq-c button, #faq-c a').count(),0);
        await page.evaluate(type=>abrirResultadoBusca({dataset:{searchType:type,target:JSON.stringify({kind:'processo',id:1})}}),type);
        assert.equal(await page.evaluate(()=>window.openedProcess),null);
      }
      await page.locator('[data-busca-tipo="todos"]').click();
      await page.fill('#faq-srch','auditar');
      assert.match(await page.locator('#faq-c').innerText(),/Como auditar/);
      assert.match(await page.locator('#faq-c').innerText(),/Atraso na emissão/);
      assert.match(await page.locator('#faq-c').innerText(),/Falha no relatório/);
      assert.equal(await page.locator('#faq-c button').count(),1);
      await page.locator('#faq-c button').click();
      assert.equal(await page.evaluate(()=>window.openedInfo.processId),1);
      assert.equal(await page.evaluate(()=>window.openedProcess),null);
    }
    await page.evaluate(()=>{window.usuarioLogado={perfil:'ep'};});
    await page.locator('[data-busca-tipo="riscos"]').click();
    await page.fill('#faq-srch','atraso');
    assert.equal(await page.locator('#faq-c button').count(),1);
    await page.fill('#faq-srch','inexistente');
    assert.match(await page.locator('#faq-c').innerText(),/Nenhum resultado/);
    await page.addScriptTag({content:html.match(/function abrirInfoMeusProc\([^]*?\n}/)[0]});
    await page.evaluate(()=>{
      window.getMinhasUnidades=()=>[];
      window.findArqItemById=()=>null;
      window.ETAPAS=['Entrevista'];window.etIdx=()=>0;
      window.renderProjetosDoProcesso=async()=>{};
      document.getElementById('page-faq').classList.add('on');
      // Detect accidental bubbling into a navigation handler outside the result.
      document.getElementById('page-faq').addEventListener('click',()=>{window.unexpectedNavigation=true;});
    });
    await page.locator('[data-busca-tipo="pops"]').click();
    await page.fill('#faq-srch','relatorio');
    await page.evaluate(()=>{window.unexpectedNavigation=false;});
    const originalUrl=page.url();
    await page.getByRole('button',{name:'Sobre o processo',exact:true}).click();
    assert.equal(await page.locator('#info-proc-modal').count(),1);
    assert.equal(await page.locator('#page-faq.on').count(),1);
    assert.equal(page.url(),originalUrl);
    assert.equal(await page.evaluate(()=>window.unexpectedNavigation),false);
    assert.match(await page.locator('#info-proc-modal').innerText(),/Auditar contratos/);
    await page.locator('#info-proc-modal').getByRole('button',{name:'Fechar',exact:true}).click();
    assert.equal(await page.locator('#info-proc-modal').count(),0);
    assert.equal(await page.locator('#faq-srch').inputValue(),'relatorio');
    assert.equal(await page.locator('[data-busca-tipo="pops"]').getAttribute('aria-pressed'),'true');
    assert.deepEqual(errors,[]);
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    console.log('Busca geral: palavra-chave, categorias em botões, cards, layout móvel e restrições de acesso verificados.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
