import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
function source(start, end) {
  const i = html.indexOf(start);
  return html.slice(i, html.indexOf(end, i));
}
const kpi = { codigo: 'IND-123', nome: 'Atendimentos', area: 'A', periodo: 'ago/2026', meta: null, realizado: 20, unidade: 'unidades' };
function context() {
  return runInNewContext([
    source('function parseNumBR(', 'async function importarIndicadores('),
    source('function statusInfo(', 'function _resumoIndicadoresRelatorioPdf('),
    '({ anterior: _resultadoAnteriorIndicadorRelatorio, rows: _rowsIndicadoresRelatorioPdf })',
  ].join('\n'), { kpis: [], esc: v => String(v), _kpiGetMacroProc: () => ({ macro: 'Macro' }) });
}
const cell = row => [...row.matchAll(/<td[^>]*>(.*?)<\/td>/g)][5][1];

describe('resultado do período anterior no relatório', () => {
  it.each([
    ['ago/2026', 'jul/2026', 'Mensal'], ['jan/2026', 'dez/2025', 'Mensal'],
    ['08/2026', '2026-07', 'Mensal'],
    ['T1/2026', 'T4/2025', 'Trimestral'], ['2º trimestre/2026', 'T1/2026', 'Trimestral'],
    ['S1/2026', '2º semestre/2025', 'Semestral'], ['S2/2026', 'S1/2026', 'Semestral'],
    ['B1/2026', 'B6/2025', 'Bimestral'], ['Q1/2026', 'Q3/2025', 'Quadrimestral'],
    ['2026', '2025', 'Anual'], ['abr/2026', 'jan/2026', 'Trimestral'],
  ])('compara %s com %s (%s), inclusive na virada do ano', (periodo, anterior, periodicidade) => {
    const current = { ...kpi, periodo, periodicidade };
    expect(context().anterior(current, [{ ...current, periodo: anterior, realizado: 7 }, current])).toEqual({ valor: 7, periodo: anterior });
  });

  it('não busca o último disponível quando falta o período imediatamente anterior', () => {
    const c = context();
    const history = [{ ...kpi, periodo: 'jun/2026', realizado: 4 }, kpi, { ...kpi, periodo: 'set/2026', realizado: 9 }];
    expect(c.anterior(kpi, history)).toBeNull();
    expect(cell(c.rows([kpi], history))).toBe('—');
  });

  it('soma os três meses do trimestre anterior, mesmo para cada linha mensal filtrada', () => {
    const c = context();
    const history = ['abr/2026', 'mai/2026', 'jun/2026'].map((periodo, i) => ({ ...kpi, periodo, realizado: (i + 1) * 10 }));
    history.push({ ...kpi, periodo: 'mar/2026', realizado: 999 }, kpi);
    const filtros = { intervalo: 'T3/2026' };
    for (const periodo of ['jul/2026', 'ago/2026', 'set/2026']) {
      expect(c.anterior({ ...kpi, periodo }, history, filtros)).toEqual({ valor: 60, periodo: 'T2/2026' });
    }
    expect(cell(c.rows([kpi], history, filtros))).toContain('60 unidades');
    expect(cell(c.rows([kpi], history, filtros))).toContain('T2/2026');
  });

  it('soma o semestre e o ano anteriores, inclusive com mudança de ano', () => {
    const c = context();
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const history = meses.map(m => ({ ...kpi, periodo: `${m}/2025`, realizado: 2 }));
    expect(c.anterior(kpi, history, { intervalo: 'S1/2026' })).toEqual({ valor: 12, periodo: 'S2/2025' });
    expect(c.anterior(kpi, history, { period: '2026' })).toEqual({ valor: 24, periodo: '2025' });
  });

  it('prioriza o mês selecionado sobre o filtro de intervalo', () => {
    expect(context().anterior(kpi, [{ ...kpi, periodo: 'jul/2026', realizado: 3 }], { period: 'ago/2026', intervalo: 'T3/2026' })).toEqual({ valor: 3, periodo: 'jul/2026' });
  });

  it('não apresenta um total parcial nem soma períodos duplicados', () => {
    const c = context();
    const history = ['abr/2026', 'mai/2026', 'jun/2026'].map(periodo => ({ ...kpi, periodo, realizado: 2 }));
    const filtros = { intervalo: 'T3/2026' };
    expect(c.anterior(kpi, history.slice(1), filtros)).toBeNull();
    expect(c.anterior(kpi, [...history, { ...history[0] }], filtros)?.valor).toBe(6);
    expect(c.anterior(kpi, [...history, { ...history[0], sem_dado: true }], filtros)).toBeNull();
  });

  it.each([null, undefined, '', 'Sem dado', Infinity])('mostra traço para resultado inválido: %s', realizado => {
    const c = context();
    expect(cell(c.rows([kpi], [{ ...kpi, periodo: 'jul/2026', realizado }]))).toBe('—');
  });

  it.each(['importado', 'gsheets', 'importado_editado', 'gsheets_editado'])('distingue zero válido de zero legado sem confirmação: %s', origem => {
    const c = context();
    const anterior = { ...kpi, periodo: 'jul/2026', realizado: 0, origem };
    expect(cell(c.rows([kpi], [anterior]))).toBe('—');
    expect(cell(c.rows([kpi], [{ ...anterior, sem_dado: false }]))).toContain('0 unidades');
    expect(cell(c.rows([kpi], [{ ...anterior, sem_dado: true }]))).toBe('—');
  });

  it('não mistura indicadores, áreas, unidades ou periodicidades', () => {
    const c = context();
    for (const fields of [{ codigo: 'OUTRO' }, { area: 'B' }, { unidade: 'dias' }, { periodicidade: 'Trimestral' }]) {
      expect(c.anterior(kpi, [{ ...kpi, periodo: 'jul/2026', ...fields }])).toBeNull();
    }
    expect(c.anterior({ ...kpi, periodo: 'inválido' }, [kpi])).toBeNull();
  });

  it('mostra comparação com e sem meta, preservando desempenho e removendo códigos', () => {
    const c = context();
    const history = [{ ...kpi, periodo: 'jul/2026', realizado: '1,25' }];
    for (const meta of [null, 30]) {
      const row = c.rows([{ ...kpi, meta }], history);
      expect(cell(row)).toContain('1,25 unidades');
      expect(row).toContain(meta === null ? 'Sem meta' : '67%');
      expect(row).not.toContain('IND-123');
      expect(row.match(/<td[ >]/g)).toHaveLength(9);
    }
  });
});
