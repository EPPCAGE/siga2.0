import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
function source(start, end) {
  const i = html.indexOf(start);
  return html.slice(i, html.indexOf(end, i));
}
const report = { id: 123, filtros: 'Agosto de 2026', data: '25/09/2026', publicadoPor: 'EPP', html: '<html>Relatório salvo</html>' };
function context({ reports = [report], filter = 'Relatórios', ep = true, publications = [] } = {}) {
  const nodes = Object.fromEntries(['pub-list', 'pub-sub', 'pub-relatorios-ind-panel', 'ia-ind-pub-btn'].map(id => [id, { innerHTML: '', textContent: '', disabled: false }]));
  nodes['ia-ind-pub-btn'].textContent = '★ Publicar como oficial';
  let confirm;
  const repository = { set: vi.fn(async () => {}), remove: vi.fn(async () => {}) };
  const ctx = {
    document: { getElementById: id => nodes[id] || null },
    RELATORIOS_IND: [...reports], publicacoes: publications, _pubFiltro: filter,
    isEP: () => ep, esc: value => String(value ?? ''), safeUrl: () => '', _pubProcsHtml: () => '',
    fbReady: () => true, relatoriosIndicadoresRepository: repository, _fsClean: value => value,
    confirmar: (_message, callback) => { confirm = callback; }, toast: vi.fn(),
    console: { error: vi.fn() },
    _lastRelatorioIndHtml: '<html>Novo relatório</html>', _lastRelatorioIndFiltros: 'Setembro de 2026', usuarioLogado: { nome: 'EPP' },
  };
  const api = runInNewContext([
    source('function rPub(){', 'function _pubPopularSelectProcs('),
    source('function _relNomeClick(', '// ── INJECT IA BUTTONS'),
    '({rPub, publicarRelatorioOficial, excluirRelatorioOficial})',
  ].join('\n'), ctx);
  return { api, nodes, ctx, repository, confirm: () => confirm() };
}

describe('relatórios oficiais de indicadores em Publicações', () => {
  it.each(['', 'Relatórios'])('exibe relatórios já salvos no filtro %s, sem mensagem de lista vazia', filter => {
    const c = context({ filter });
    c.api.rPub();
    expect(c.nodes['pub-relatorios-ind-panel'].innerHTML).toContain('Agosto de 2026');
    expect(c.nodes['pub-relatorios-ind-panel'].innerHTML).toContain('verRelatorioOficial(123)');
    expect(c.nodes['pub-list'].innerHTML).toBe('');
    expect(c.nodes['pub-sub'].textContent).toBe('1 documento publicado');
  });

  it('oculta os oficiais em outras categorias e os restaura ao voltar para Relatórios', () => {
    const c = context();
    c.api.rPub();
    c.ctx._pubFiltro = 'Manual';
    c.api.rPub();
    expect(c.nodes['pub-relatorios-ind-panel'].innerHTML).toBe('');
    c.ctx._pubFiltro = 'Relatórios';
    c.api.rPub();
    expect(c.nodes['pub-relatorios-ind-panel'].innerHTML).toContain('Agosto de 2026');
  });

  it('mantém relatórios de outras publicações junto aos oficiais e conta ambos', () => {
    const c = context({ publications: [{ id: 99, categoria: 'Relatórios', titulo: 'Relatório de gestão' }] });
    c.api.rPub();
    expect(c.nodes['pub-list'].innerHTML).toContain('Relatório de gestão');
    expect(c.nodes['pub-relatorios-ind-panel'].innerHTML).toContain('Agosto de 2026');
    expect(c.nodes['pub-sub'].textContent).toBe('2 documentos publicados');
  });

  it('permite consulta para leitores, sem ações de renomear ou excluir', () => {
    const c = context({ ep: false });
    c.api.rPub();
    const cards = c.nodes['pub-relatorios-ind-panel'].innerHTML;
    expect(cards).toContain('verRelatorioOficial(123)');
    expect(cards).not.toContain('onclick="_relNomeClick');
    expect(cards).not.toContain('excluirRelatorioOficial');
  });

  it('publica na coleção existente e atualiza a listagem em Publicações', async () => {
    const c = context({ reports: [] });
    await c.api.publicarRelatorioOficial();
    expect(c.repository.set).toHaveBeenCalledOnce();
    expect(c.repository.set.mock.calls[0][1].html).toBe('<html>Novo relatório</html>');
    expect(c.nodes['pub-relatorios-ind-panel'].innerHTML).toContain('Setembro de 2026');
    expect(c.ctx.toast).toHaveBeenCalledWith('Relatório oficial salvo em Publicações → Relatórios.', 'var(--green)');
  });

  it('indica progresso, evita publicação duplicada e só lista depois da confirmação do servidor', async () => {
    const c = context({ reports: [] });
    let complete;
    c.repository.set.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    const pending = c.api.publicarRelatorioOficial();
    expect(c.nodes['ia-ind-pub-btn'].disabled).toBe(true);
    expect(c.nodes['ia-ind-pub-btn'].textContent).toBe('Publicando…');
    expect(c.ctx.RELATORIOS_IND).toHaveLength(0);
    await c.api.publicarRelatorioOficial();
    expect(c.repository.set).toHaveBeenCalledOnce();
    complete();
    await pending;
    expect(c.ctx.RELATORIOS_IND).toHaveLength(1);
    expect(c.nodes['ia-ind-pub-btn'].disabled).toBe(false);
    expect(c.nodes['ia-ind-pub-btn'].textContent).toBe('★ Publicar como oficial');
  });

  it('trata falha de gravação e libera o botão para tentar novamente', async () => {
    const c = context({ reports: [] });
    c.repository.set.mockRejectedValueOnce(new Error('permission-denied'));
    await c.api.publicarRelatorioOficial();
    expect(c.ctx.RELATORIOS_IND).toHaveLength(0);
    expect(c.ctx.toast).toHaveBeenCalledWith(expect.stringContaining('Não foi possível publicar'), 'var(--red)');
    expect(c.nodes['ia-ind-pub-btn'].disabled).toBe(false);
    await c.api.publicarRelatorioOficial();
    expect(c.ctx.RELATORIOS_IND).toHaveLength(1);
  });

  it.each(['servidor', 'offline'])('não simula publicação sem conexão: %s', failure => {
    const c = context({ reports: [] });
    if(failure === 'servidor') c.ctx.fbReady = () => false;
    else c.ctx.navigator = { onLine: false };
    return c.api.publicarRelatorioOficial().then(() => {
      expect(c.repository.set).not.toHaveBeenCalled();
      expect(c.ctx.RELATORIOS_IND).toHaveLength(0);
      expect(c.ctx.toast).toHaveBeenCalledWith(expect.stringContaining('Sem conexão'), 'var(--amber)');
    });
  });

  it('atualiza a listagem e o total quando o último relatório oficial é excluído', async () => {
    const c = context();
    c.api.rPub();
    await c.api.excluirRelatorioOficial(123);
    await c.confirm();
    expect(c.repository.remove).toHaveBeenCalledWith(123);
    expect(c.nodes['pub-relatorios-ind-panel'].innerHTML).toBe('');
    expect(c.nodes['pub-list'].innerHTML).toContain('Nenhuma publicação encontrada');
    expect(c.nodes['pub-sub'].textContent).toBe('0 documentos publicados');
  });

  it('não injeta a listagem na página de Indicadores', () => {
    expect(html).not.toContain('ind-relatorios-panel');
    const publications = source('<div id="page-publicacoes"', '<div id="pub-modal"');
    expect(publications).toContain('id="pub-relatorios-ind-panel"');
  });
});
