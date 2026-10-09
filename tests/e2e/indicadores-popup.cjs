const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');

(async () => {
  const html = readFileSync('processos.html', 'utf8');
  const functions = ['fecharIndicadoresProc', 'abrirIndicadoresProc', 'createKpiChart']
    .map(name => html.match(new RegExp('function ' + name + '\\([^]*?\\n}'))[0]).join('\n');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent('<div id="main" style="width:600px;height:200px"><canvas id="chart-kpi-test"></canvas></div>');
    await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js' });
    await page.evaluate(() => {
      window._indCharts = [];
      window.kpis = [{ arq_id: 'a', realizado: 80, meta: 90, periodo: 'janeiro/2026' }];
      window.getMinhasUnidades = () => [{ arq_id: 'a', nome: 'Processo' }];
      window.kpiGroupByKey = items => ({ test: items });
      window.kpiApplyMetaFallback = () => {};
      window.kpiGrupoCardHTML = () => '<div style="position:relative;height:200px"><canvas id="chart-kpi-test"></canvas></div>';
      window.esc = value => value;
      window.kpiBarColor = () => 'blue';
    });
    await page.addScriptTag({ content: functions });
    await page.evaluate(() => {
      createKpiChart('test', kpis);
      document.getElementById('main').style.display = 'none';
      abrirIndicadoresProc('a');
    });
    await page.waitForFunction(() => document.getElementById('inds-proc-modal')._kpiCharts.length === 1);
    assert.equal(await page.evaluate(() => {
      const modal = document.getElementById('inds-proc-modal');
      const chart = modal._kpiCharts[0];
      return chart.canvas === modal.querySelector('canvas') && chart.width > 0 && chart.height > 0 && _indCharts.length === 1;
    }), true);
    await page.getByRole('button', { name: 'Fechar', exact: true }).click();
    assert.equal(await page.evaluate(() => Object.keys(Chart.instances).length), 1);
    await page.evaluate(() => { abrirIndicadoresProc('a'); fecharIndicadoresProc(); });
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => Object.keys(Chart.instances).length), 1);
    await page.evaluate(() => { kpis[0].sem_dado = true; abrirIndicadoresProc('a'); });
    await page.waitForFunction(() => document.querySelector('#inds-proc-modal canvas').parentElement.style.display === 'none');
    assert.equal(await page.evaluate(() => document.getElementById('inds-proc-modal')._kpiCharts.length), 0);
    assert.deepEqual(errors, []);
    console.log('Indicadores: gráfico do pop-up, fechamento e ausência de medições verificados.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
