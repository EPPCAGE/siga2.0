import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
function source(start, end) {
  const i = html.indexOf(start);
  return html.slice(i, html.indexOf(end, i));
}
const parsing = source('function parseNumBR(', 'async function importarIndicadores(');
const report = source('function statusInfo(', 'function _rowsIndicadoresRelatorioPdf(');
function context() {
  return runInNewContext(`${parsing}\n${report}\n${source('async function importarIndicadores(', 'function _kpiPeriodoToIntervalo(')}\n${source('function _gsheetsRowToKpi(', 'function _gsheetsImportRows(')}\n({parseNumBR, _kpiMeta, _calcKpiPct, _rowIndicadorRelatorioPdf, _buildKpiMacroprocessoCards, _gsheetsRowToKpi, importarIndicadores, kpis});`, {
    kpis: [], _kpiIdC: 1, fmtPeriodo: v => v, esc: v => v,
    rInd() {}, fbAutoSave() {}, toast() {}, _kpiGetMacroProc: () => ({ macro: 'M' }),
    XLSX: { read: rows => ({ Sheets: { Sheet: rows }, SheetNames: ['Sheet'] }), utils: { sheet_to_json: rows => rows } },
  });
}

describe('indicadores sem meta', () => {
  it.each(['', ' ', 'Sem dado', '—', null, undefined])('não transforma resultado ausente em histórico zero: %s', async value => {
    const c = context();
    const row = { Área: 'A', Indicador: 'I1', Meta: 10, Realizado: value };
    const synced = c._gsheetsRowToKpi(row, { cCodigo: 'Indicador', cMeta: 'Meta', cReal: 'Realizado' }, {}, new Set());
    await c.importarIndicadores({ files: [{ arrayBuffer: async () => [row] }], value: 'file' });
    for (const k of [synced, c.kpis[0]]) {
      expect(k.realizado).toBeNull();
      expect(k.sem_dado).toBe(true);
      expect(k.pct_realizado).toBeNull();
    }
  });

  it.each([0, '0', '0,00'])('preserva resultado zero explicitamente informado: %s', async value => {
    const c = context();
    const row = { Área: 'A', Indicador: 'I1', Meta: 10, Realizado: value };
    const synced = c._gsheetsRowToKpi(row, { cCodigo: 'Indicador', cMeta: 'Meta', cReal: 'Realizado' }, {}, new Set());
    await c.importarIndicadores({ files: [{ arrayBuffer: async () => [row] }], value: 'file' });
    for (const k of [synced, c.kpis[0]]) {
      expect(k.realizado).toBe(0);
      expect(k.sem_dado).toBe(false);
    }
  });

  it.each(['', ' ', 'Sem meta', '—', null, undefined])('preserva ausência de meta na importação: %s', async value => {
    const c = context();
    const row = { Indicador: 'I1', Meta: value, Realizado: 0 };
    const synced = c._gsheetsRowToKpi(row, { cCodigo: 'Indicador', cMeta: 'Meta', cReal: 'Realizado' }, {}, new Set());
    await c.importarIndicadores({ files: [{ arrayBuffer: async () => [row] }], value: 'file' });
    for (const k of [synced, c.kpis[0]]) {
      expect(k.meta).toBeNull();
      expect(k.pct_realizado).toBeNull();
      expect(c._calcKpiPct(k)).toBeNull();
      expect(c._rowIndicadorRelatorioPdf(k)).toContain('Sem meta');
      expect(c._rowIndicadorRelatorioPdf(k)).not.toContain('Meta atingida');
    }
  });

  it('não herda meta quando a coluna existe e está vazia', () => {
    const c = context();
    const cfg = { I1: { meta: 50 } };
    const row = { Indicador: 'I1', Meta: '' };
    expect(c._gsheetsRowToKpi(row, { cCodigo: 'Indicador', cMeta: 'Meta' }, cfg, new Set()).meta).toBeNull();
    expect(c._gsheetsRowToKpi(row, { cCodigo: 'Indicador' }, cfg, new Set()).meta).toBe(50);
    expect(c._gsheetsRowToKpi(row, { cCodigo: 'Indicador' }, {}, new Set()).meta).toBeNull();
  });

  it.each(['importado', 'gsheets', 'importado_editado', 'gsheets_editado'])('não considera zero legado como meta atingida: %s', origem => {
    const c = context();
    const k = { origem, meta: 0, realizado: 0, nome: 'I1', area: 'A' };
    expect(c._calcKpiPct(k)).toBeNull();
    expect(c._rowIndicadorRelatorioPdf(k)).toContain('Sem meta');
    expect(c._buildKpiMacroprocessoCards([k, { ...k, meta: 10, realizado: 10 }])).toContain('1 de 1 atingiram a meta');
  });

  it.each([0, '0', '0,00', '95,09', '1.234,56'])('preserva metas numéricas explícitas: %s', value => {
    const c = context();
    const k = c._gsheetsRowToKpi({ Indicador: 'I1', Meta: value, Realizado: 0 }, { cCodigo: 'Indicador', cMeta: 'Meta', cReal: 'Realizado' }, {}, new Set());
    expect(k.meta).toBe(c.parseNumBR(value));
    expect(k.meta_definida).toBe(true);
    expect(c._calcKpiPct(k)).toBe(k.meta === 0 ? 100 : 0);
  });
});
