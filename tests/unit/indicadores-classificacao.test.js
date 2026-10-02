import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
function source(start, end) {
  const i = html.indexOf(start);
  return html.slice(i, html.indexOf(end, i));
}
const helpers = source('function _kpiClassificacao(', 'function _kpiGetMacroProc(');
function context(extra = {}) {
  return runInNewContext(`${helpers}\n({ classify: _kpiClassificacao, badges: _kpiEtiquetasHtml })`, {
    processos: [{ id: 7, arq_id: 'critico' }], isCritico: id => id === 'critico', ...extra,
  });
}

describe('classificação dos indicadores', () => {
  it('resolve vínculos diretos e pelo processo mapeado', () => {
    const c = context();
    expect(c.classify({ arq_id: 'critico' }).processo_critico).toBe(true);
    expect(c.classify({ pid: '7' }).processo_critico).toBe(true);
    expect(c.classify({ arq_id: 'normal', pid: 7 }).processo_critico).toBe(false);
    expect(c.classify({ pid: 99 }).processo_critico).toBe(false);
    expect(c.classify({}).processo_critico).toBe(false);
  });
  it('exibe ambas as etiquetas e acompanha mudanças de criticidade', () => {
    const critical = new Set(['critico']);
    const c = context({ isCritico: id => critical.has(id) });
    const k = { pid: 7, ppe: true };
    expect(c.badges(k)).toContain('>PPE</span>');
    expect(c.badges(k)).toContain('color:#b91c1c">Crítico</span>');
    critical.clear();
    expect(c.badges(k)).not.toContain('>Crítico</span>');
    expect(c.classify({ ppe: 'Sim' }).ppe).toBe(true);
    expect(c.badges({ ppe: 'Não' })).toBe('');
  });
  it('envia as classificações reais no pedido de análise à IA', async () => {
    let payload;
    const start = html.indexOf('async function iaAnalisarIndicadores(');
    const end = html.indexOf('\n}', start) + 2;
    const analyze = runInNewContext(`${helpers}\n${html.slice(start, end)}\niaAnalisarIndicadores`, {
      processos: [{ id: 7, arq_id: 'critico' }], isCritico: id => id === 'critico',
      kpis: [{ nome: 'Prazo', pid: 7, ppe: 'Sim', realizado: 8, meta: 10, periodo: 'set/2026' }],
      document: { getElementById: () => null }, _periodoInIntervalo: () => true,
      _kpiMeta: k => k.meta,
      chamarIA: async (mode, data) => { payload = JSON.parse(data); return null; },
    });
    await analyze();
    expect(payload.indicadores[0]).toMatchObject({ processo_critico: true, ppe: true, meta: 10, realizado: 8 });
  });
  it('inclui as etiquetas nos cartões e no relatório', () => {
    expect(source('function kpiGrupoCardHTML(', 'function createKpiChart(')).toContain('_kpiEtiquetasHtml(items[0])');
    expect(source('function _rowIndicadorRelatorioPdf(', 'function _rowsIndicadoresRelatorioPdf(')).toContain('_kpiEtiquetasHtml(k)');
  });
});
