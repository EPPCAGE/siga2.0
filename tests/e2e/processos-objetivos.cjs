const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');

const html = readFileSync(path.resolve(__dirname, '../../processos.html'), 'utf8');
const start = html.indexOf('function abrirModalMeta(');
const end = html.indexOf('function _transferirProcArq(', start);
const editor = html.slice(start, end);
const pending = 'Aprimorar os Processos de Auditoria, com Base nas Melhores Práticas Internacionais';

(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent('<html><body></body></html>');
    await page.addScriptTag({path:path.resolve(__dirname, '../../src/shared/objetivos-estrategicos.js')});
    await page.addScriptTag({path:path.resolve(__dirname, '../../src/shared/areas-arquitetura.js')});
    await page.evaluate(() => {
      window.isEP = () => true;
      window.esc = s => String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
      window.ARQUITETURA = [{processos:[{area:'Contabilidade'},{area:'Divisão de Auditoria'}]}];
      window.processos = [];
      window.fbAutoSave = label => { window.saved = label; };
      window.toast = () => {};
      window._arqDuplicateIds = () => new Set();
    });
    await page.addScriptTag({content:editor});
    await page.evaluate(pendingValue => {
      window.item = {id:'p1',nome:'Processo de teste',objetivo_estrategico:`Qualificar Informação Contábil; Assegurar serviços de TIC para suportar os processos e a estratégia; ${pendingValue}`};
      abrirModalMeta(window.item);
    }, pending);
    assert.equal(await page.locator('#mm-obje option').count(), 17);
    assert.equal(await page.locator('#mm-obje option:checked').count(), 3);
    assert.equal(await page.locator('input#mm-area').count(), 0);
    assert.equal(await page.locator('select#mm-area option').count(), 3);
    await page.selectOption('#mm-area','Divisão de Contabilidade');
    assert.match(await page.locator('#mm-obje option:checked').allTextContents().then(a => a.join(';')), /Otimizar a contribuição da auditoria para o aprimoramento dos processos da gestão pública estadual/);
    await page.locator('button[onclick="salvarModalMeta()"]').click();
    const saved = await page.evaluate(() => ({value:item.objetivo_estrategico, saved:window.saved}));
    assert.equal(saved.saved, 'salvarMeta');
    assert.equal(await page.evaluate(() => item.area), 'Divisão de Contabilidade');
    assert.match(saved.value, /\[Processos\] Qualificar a informação contábil/);
    assert.match(saved.value, /\[Aprendizado\] Assegurar serviços de TIC/);
    assert.ok(!saved.value.includes(pending));
    assert.ok(saved.value.includes('Otimizar a contribuição da auditoria para o aprimoramento dos processos da gestão pública estadual'));
    await page.evaluate(() => abrirModalMeta(item));
    assert.equal(await page.locator('#mm-obje option:checked').count(), 3);
    await page.selectOption('#mm-obje', [{label:'[Resultados] Otimizar a utilização dos recursos públicos'}, {label:'[Articulação] Fortalecer a credibilidade e a imagem da CAGE'}]);
    await page.locator('button[onclick="salvarModalMeta()"]').click();
    assert.equal(await page.evaluate(() => item.objetivo_estrategico.split(';').length), 2);
    assert.deepEqual(errors, []);
    console.log('Processos: catálogo com 17 objetivos, substituição do objetivo antigo e seleção múltipla verificados no Chromium.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
