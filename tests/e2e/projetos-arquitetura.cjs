const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

// Testa a tela real com dados controlados, sem autenticação ou acesso à produção.
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('http://siga.test/**', route => route.fulfill({
      contentType:'text/html', body:'<html><body><div id="proj-page-detalhe" class="proj-page"><div id="fixture"></div></div></body></html>'
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
    assert.deepEqual(errors, []);
    console.log('Projetos: arquitetura, filtro, vínculos e persistência verificados no Chromium.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
