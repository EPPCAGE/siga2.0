const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const logs = [];
  page.on('console', msg => logs.push(`${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => logs.push(`pageerror: ${err.message}`));
  await page.goto('http://localhost:8000/projetos.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  const state = await page.evaluate(() => ({
    title: document.title,
    fbReady: globalThis._fbReady,
    hasLoginScreen: Boolean(document.getElementById('login-screen')),
    hasBody: document.body.innerText.trim().length > 0,
    bodyText: document.body.innerText.slice(0, 500),
  }));
  console.log(JSON.stringify({ state, logs: logs.slice(-80) }, null, 2));
  await browser.close();
})();
