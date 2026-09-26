const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');

const html = readFileSync('processos.html', 'utf8');
function source(start, end) {
  const i = html.indexOf(start);
  return html.slice(i, html.indexOf(end, i));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const modal = source('<dialog id="modal-confirm"', '<!-- LOGIN -->');
      await page.setContent(`${modal}
        <button id="ia-ind-pub-btn" onclick="publicarRelatorioOficial()">Publicar como oficial</button>
        <button id="nav-pub" onclick="rPub(); this.dataset.clicked='true'">Publicações</button>
        <div id="pub-sub"></div><div id="pub-relatorios-ind-panel"></div><div id="pub-list"></div>`);
      await page.addScriptTag({ content: `
        var RELATORIOS_IND = [], publicacoes = [], _pubFiltro = 'Relatórios';
        var _lastRelatorioIndHtml = '<html>Relatório de teste</html>', _lastRelatorioIndFiltros = 'Agosto de 2026';
        var usuarioLogado = {nome:'EPP'}, writes = 0, messages = [];
        function isEP(){return true} function fbReady(){return true}
        function esc(v){return String(v || '')} function _fsClean(v){return v}
        function toast(message){messages.push(message)}
        var relatoriosIndicadoresRepository = {set: () => {writes++; return new Promise((resolve, reject) => {globalThis.finishSave=resolve; globalThis.failSave=reject})}};
        ${source('let _confirmarFn = null;', 'function pbBadge(')}
        ${source('function rPub(){', 'function _pubPopularSelectProcs(')}
        ${source('function _relNomeClick(', '// ── INJECT IA BUTTONS')}
      ` });
      await page.click('#ia-ind-pub-btn');
      assert.equal(await page.locator('#modal-confirm').isVisible(), false);
      assert.equal(await page.locator('#ia-ind-pub-btn').isDisabled(), true);
      assert.equal(await page.locator('#ia-ind-pub-btn').textContent(), 'Publicando…');
      await page.click('#nav-pub');
      assert.equal(await page.locator('#nav-pub').getAttribute('data-clicked'), 'true');
      assert.equal(await page.evaluate(() => RELATORIOS_IND.length), 0);
      await page.evaluate(async () => { await publicarRelatorioOficial(); finishSave(); });
      await page.waitForFunction(() => !document.getElementById('ia-ind-pub-btn').disabled);
      assert.equal(await page.evaluate(() => writes), 1);
      assert.match(await page.locator('#pub-relatorios-ind-panel').textContent(), /Agosto de 2026/);
      await page.click('#ia-ind-pub-btn');
      await page.evaluate(() => failSave(new Error('Falha simulada')));
      await page.waitForFunction(() => !document.getElementById('ia-ind-pub-btn').disabled);
      assert.equal(await page.evaluate(() => RELATORIOS_IND.length), 1);
      assert.match(await page.evaluate(() => messages.at(-1)), /Não foi possível publicar/);
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('Publicação validada em desktop e celular: interface responsiva, persistência confirmada e erro recuperável.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
