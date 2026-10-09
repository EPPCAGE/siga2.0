const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="tasks"></div>');
    await page.evaluate(() => {
      window.testRecords = new Map(); window.failSave = false; window.failRead = false;
      window.usuarioLogado = { perfil: 'dono', nome: 'Servidor', email: 'servidor@example.com' };
      window.mockAuth = { currentUser: { uid: 'servidor', email: 'servidor@example.com' } };
      window.isEP = () => usuarioLogado.perfil === 'ep';
      window.esc = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
      window.getMinhasUnidades = () => [{ arq_id: 'arq-sem-mapeamento', nome: 'Processo sem mapeamento', macro: 'Macro A' },
        { arq_id: 'arq-mapeado', nome: 'Processo mapeado', macro: 'Macro B', proc: { id: 7 } }];
      window.fbReady = () => true;
      window.fbColRef = (db, name) => name;
      window.fbDocRef = (db, name, id) => id;
      window.toast = text => { window.lastToast = text; };
      window.updCounts = () => {};
      window.rFila = () => { document.getElementById('tasks').innerHTML = htmlRegistrosPendentes(); };
      window.publish = () => window.listener?.({ docs: [...testRecords].filter(([, data]) => !data.lido).map(([id, data]) => ({ id, data: () => data })) });
      window.fb = () => ({
        db: {}, auth: mockAuth, query: (...args) => args, where: (...args) => args,
        serverTimestamp: () => ({ toDate: () => new Date('2026-10-09T12:00:00Z'), toMillis: () => 1 }),
        addDoc: async (ref, data) => { if (failSave) throw new Error('save failed'); const id = 'r' + (testRecords.size + 1); testRecords.set(id, data); publish(); return { id }; },
        updateDoc: async (id, patch) => { if (failRead) throw new Error('read failed'); testRecords.set(id, { ...testRecords.get(id), ...patch }); publish(); },
        onSnapshot: (ref, callback) => { window.listener = callback; publish(); return () => { window.listener = null; }; },
        getDocs: async filters => ({ docs: [...testRecords].filter(([, data]) => filters.slice(1).every(([key, , value]) => data[key] === value)).map(([id, data]) => ({ id, data: () => data })) }),
      });
    });
    await page.addScriptTag({ content: readFileSync('src/processos/registros-processo.js', 'utf8') });
    await page.evaluate(() => abrirRegistroProcesso());
    const form = page.locator('#registro-processo-dialog');
    assert.equal(await form.locator('#registro-processo-tipo option').count(), 5);
    await form.locator('#registro-processo-arq').selectOption('arq-sem-mapeamento');
    await form.locator('#registro-processo-tipo').selectOption('mapeamento');
    await form.locator('textarea').fill('Precisamos mapear este processo. <img src=x onerror=alert(1)>');
    await page.evaluate(() => { window.failSave = true; });
    await form.getByRole('button', { name: 'Enviar ao EP CAGE' }).click();
    await form.getByRole('status').getByText('Não foi possível enviar.', { exact: false }).waitFor();
    assert.ok((await form.locator('textarea').inputValue()).includes('Precisamos mapear'));
    await page.evaluate(() => { window.failSave = false; });
    await form.getByRole('button', { name: 'Enviar ao EP CAGE' }).click();
    await form.waitFor({ state: 'detached' });
    const record = await page.evaluate(() => ({ ...testRecords.get('r1'), criado_em: undefined }));
    assert.equal(record.arq_id, 'arq-sem-mapeamento');
    assert.equal(record.processo_id, '');
    assert.equal(record.autor_uid, 'servidor');
    assert.equal(record.lido, false);
    await page.evaluate(() => {
      registrosAtualizarAssinatura();
      window.usuarioLogado = { perfil: 'ep', nome: 'EP CAGE' }; mockAuth.currentUser = { uid: 'ep', email: 'ep@example.com' };
      registrosAtualizarAssinatura();
    });
    await page.getByRole('button', { name: 'Ler registro' }).waitFor();
    await page.evaluate(() => { window.failRead = true; });
    await page.getByRole('button', { name: 'Ler registro' }).click();
    const reading = page.locator('#leitura-registro-processo-dialog');
    await reading.getByRole('status').getByText('Não foi possível registrar a leitura.', { exact: false }).waitFor();
    assert.equal(await reading.locator('img').count(), 0);
    assert.equal(await page.evaluate(() => _registrosPendentes.length), 1);
    await reading.getByRole('button', { name: 'Fechar' }).click();
    await page.evaluate(() => { window.failRead = false; });
    await page.getByRole('button', { name: 'Ler registro' }).click();
    await page.locator('#leitura-registro-processo-dialog').getByRole('status').getByText('Leitura registrada.', { exact: false }).waitFor();
    assert.equal(await page.evaluate(() => _registrosPendentes.length), 0);
    assert.equal(await page.locator('#tasks').getByRole('button', { name: 'Ler registro' }).count(), 0);
    assert.equal(await page.evaluate(() => testRecords.get('r1').lido_por), 'ep');
    await page.locator('#leitura-registro-processo-dialog').getByRole('button', { name: 'Fechar' }).click();
    await page.evaluate(() => abrirHistoricoRegistrosProcesso('arq-sem-mapeamento'));
    await page.locator('#historico-registros-processo-dialog summary').click();
    await page.locator('#historico-registros-processo-dialog').getByText('Lido pelo EP CAGE').waitFor();
    assert.ok(await page.locator('#historico-registros-processo-dialog').textContent().then(text => text.includes('Precisamos mapear')));
    await page.locator('#historico-registros-processo-dialog').getByRole('button', { name: 'Fechar' }).click();
    await page.evaluate(() => {
      window.usuarioLogado = { perfil: 'dono', nome: 'Servidor', email: 'servidor@example.com' };
      mockAuth.currentUser = { uid: 'servidor', email: 'servidor@example.com' };
      registrosAtualizarAssinatura();abrirRegistroProcesso();
    });
    await form.locator('#registro-processo-arq').selectOption('arq-mapeado');
    await form.locator('#registro-processo-tipo').selectOption('retrabalho');
    await form.locator('textarea').fill('O servidor precisa repetir a conferência dos documentos.');
    await form.getByRole('button', { name: 'Enviar ao EP CAGE' }).click();
    await form.waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => testRecords.get('r2').processo_id), '7');
    await page.evaluate(() => {
      window.usuarioLogado = { perfil: 'ep', nome: 'EP CAGE' };mockAuth.currentUser = { uid: 'ep', email: 'ep@example.com' };
      registrosAtualizarAssinatura();abrirHistoricoRegistrosProcesso('arq-mapeado');
    });
    await page.locator('#historico-registros-processo-dialog summary').click();
    await page.locator('#historico-registros-processo-dialog').getByRole('status').getByText('Leitura registrada.').waitFor();
    assert.equal(await page.evaluate(() => _registrosPendentes.length), 0);
    assert.equal(await page.evaluate(() => testRecords.get('r2').lido), true);
    console.log('Registros: seleção geral, cinco tipos, processo não mapeado, falhas preservam texto e tarefas, primeira leitura remove da fila e mantém histórico.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
