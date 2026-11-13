import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
function extract(name) {
  const start = html.indexOf(`function ${name}(`);
  return html.slice(start, html.indexOf('\nfunction ', start + 1));
}
const context = {
  esc: value => String(value),
  _kpiMeta: k => k.meta ?? null,
  _calcKpiPct: k => k.meta == null ? null : 125,
  _kpiEtiquetasHtml: () => '',
  _macroprocessoIndicador: () => 'Macro',
};
runInNewContext(['parseNumBR', 'statusInfo', '_formatarNumeroRelatorioIndicador', '_rowIndicadorRelatorioPdf']
  .map(extract).join('\n'), context);

describe('formato brasileiro no relatorio de indicadores', () => {
  it.each([
    [123456.78, '123.456,78'], [1234, '1.234,00'], [0, '0,00'],
    [-1234.5, '-1.234,50'], ['1234.56', '1.234,56'],
    ['1234,56', '1.234,56'], ['1.234,56', '1.234,56'],
    ['1,234.56', '1.234,56'], [null, '\u2014'], ['', '\u2014'],
    [undefined, '\u2014'], [NaN, '\u2014'], [Infinity, '\u2014'],
  ])('formata %s como %s', (input, expected) => {
    expect(context._formatarNumeroRelatorioIndicador(input)).toBe(expected);
  });

  it.each([false, true])('padroniza a linha inteira, media trimestral=%s', trimestral => {
    const k = {nome:'Indicador', meta:1000, realizado:1234.5, unidade:'h', periodo:'jan/2026', _relatorio_media_trimestral:trimestral};
    const row = context._rowIndicadorRelatorioPdf(k, {valor:9876.54, periodo:'dez/2025'});
    expect(row).toContain('1.000,00 h');
    expect(row).toContain('1.234,50 h');
    expect(row).toContain('9.876,54 h');
    expect(row).toContain('125,00%');
    expect(k.realizado).toBe(1234.5);
  });

  it('preserva meta ausente e resultado zero', () => {
    const row = context._rowIndicadorRelatorioPdf({nome:'Sem meta', realizado:0});
    expect(row).toContain('0,00');
    expect(row).toContain('Sem meta');
    expect(row).not.toContain('NaN');
  });
});
