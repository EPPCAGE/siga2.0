const { chromium } = require('playwright');
const fs = require('node:fs');
(async () => {
  fs.mkdirSync('tests/e2e/artifacts', { recursive: true });
  const screenshotPath = 'tests/e2e/artifacts/meus-processos-align.png';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:8000/processos.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof _aplicarUsuario === 'function' && typeof go === 'function', null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const result = await page.evaluate(() => {
    _aplicarUsuario({ email: 'qa.dono@sefaz.rs.gov.br', nome: 'Usuário QA Dono', perfil: 'dono', perfis: ['dono'], iniciais: 'QD', macroprocessos_vinculados: [ARQUITETURA[1]?.id || ARQUITETURA[0].id] });
    document.querySelectorAll('[style*="position:fixed"]').forEach(el => {
      if(el.id !== 'inactivity-warning') el.remove();
    });
    go('meusprocessos', document.getElementById('nb-meusproc'));
    const cards = [...document.querySelectorAll('#meus-proc-list > .card')].slice(0, 3);
    const data = cards.map(c => ({ top: Math.round(c.getBoundingClientRect().top), marginTop: getComputedStyle(c).marginTop, text: c.innerText.split('\n')[0] }));
    return { pageActive: document.getElementById('page-meusprocessos').classList.contains('on'), display: getComputedStyle(document.getElementById('page-meusprocessos')).display, data };
  });
  console.log(JSON.stringify(result, null, 2));
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await browser.close();
})();
