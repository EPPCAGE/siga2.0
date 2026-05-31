const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const logs = [];
  page.on('console', msg => logs.push(`${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => logs.push(`pageerror: ${err.message}`));

  await page.goto('http://localhost:8000/processos?dev_nologin=1', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForTimeout(5000);

  const state = await page.evaluate(() => {
    const loginEl = document.getElementById('login-screen');
    const shell = document.getElementById('proc-shell');
    const hub = document.getElementById('module-hub');
    return {
      title: document.title,
      loginDisplay: loginEl ? getComputedStyle(loginEl).display : null,
      shellDisplay: shell ? getComputedStyle(shell).display : null,
      hubOn: hub ? hub.classList.contains('on') : false,
      usuario: {
        nome: globalThis.usuarioLogado?.nome || null,
        email: globalThis.usuarioLogado?.email || null,
        perfil: globalThis.usuarioLogado?.perfil || null,
      },
    };
  });

  console.log(JSON.stringify({ state, logs: logs.slice(-60) }, null, 2));
  await browser.close();
})();
