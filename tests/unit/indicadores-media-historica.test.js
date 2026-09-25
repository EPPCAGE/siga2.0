import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
function source(start, end) {
  const i = html.indexOf(start);
  return html.slice(i, html.indexOf(end, i));
}
const kpi = { codigo: 'IND-123', nome: 'Atendimentos', area: 'A', periodo: 'ago/2026', meta: null, realizado: 20, unidade: 'dias' };
const historico = [
  { ...kpi, periodo: 'jun/2026', realizado: 0 },
  { ...kpi, periodo: 'jul/2026', realizado: 10 },
  kpi,
];
function context() {
  return runInNewContext([
    source('function parseNumBR(', 'async function importarIndicadores('),
    source('function periodoToNum(', 'function kpiGroupByKey('),
    source('function statusInfo(', 'function _resumoIndicadoresRelatorioPdf('),
    '({ media: _mediaHistoricaIndicadorRelatorio, rows: _rowsIndicadoresRelatorioPdf })',
  ].join('\n'), { kpis: historico, esc: v => String(v), _kpiGetMacroProc: () => ({ macro: 'Macro' }) });
}

describe('média histórica no relatório de indicadores', () => {
  it('usa o histórico completo até o período da linha, mesmo com relatório filtrado', () => {
    const c = context();
    expect(c.media(kpi, [...historico, { ...kpi, periodo: 'set/2026', realizado: 1000 }])).toBe(10);
    const row = c.rows([kpi]);
    expect(row).toContain('>10 dias</td>');
    expect(row).toContain('Sem meta');
    expect(row).not.toContain('IND-123');
    expect(row).toContain('Atendimentos');
    expect(row.match(/<td[ >]/g)).toHaveLength(9);
  });

  it('ignora dados ausentes, inválidos e indicadores com identidade ou unidade diferentes', () => {
    const invalid = [
      { sem_dado: true, realizado: 999 }, { realizado: '' }, { realizado: null },
      { realizado: 'sem dado' }, { realizado: Infinity }, { codigo: 'OUTRO', realizado: 999 },
      { area: 'B', realizado: 999 }, { unidade: 'horas', realizado: 999 },
      { periodicidade: 'Anual', realizado: 999 },
    ].map(fields => ({ ...kpi, periodo: 'mai/2026', ...fields }));
    expect(context().media(kpi, [...historico, ...invalid])).toBe(10);
  });

  it('não duplica períodos e exige pelo menos dois períodos medidos', () => {
    const c = context();
    expect(c.media(kpi, [kpi, { ...kpi }])).toBeNull();
    expect(c.media(kpi, [...historico, { ...historico[0] }])).toBe(10);
    expect(c.media(kpi, [])).toBeNull();
    expect(c.media({ ...kpi, periodo: '' }, historico)).toBeNull();
  });

  it('mostra média zero e formata decimais em português', () => {
    const c = context();
    const zeros = historico.map(k => ({ ...k, realizado: 0 }));
    expect(c.rows([kpi], zeros)).toContain('>0 dias</td>');
    const values = [ { ...historico[0], realizado: '1,25' }, { ...kpi, realizado: 2 } ];
    expect(c.rows([kpi], values)).toContain('>1,63 dias</td>');
  });

  it.each(['importado', 'gsheets', 'importado_editado', 'gsheets_editado'])('mostra traço para zeros antigos sem confirmação de medição: %s', origem => {
    const c = context();
    const zeros = historico.map(k => ({ ...k, origem, realizado: 0 }));
    const mediaCell = rows => [...rows.matchAll(/<td[^>]*>(.*?)<\/td>/g)][5][1];
    expect(c.media(zeros[2], zeros)).toBeNull();
    expect(mediaCell(c.rows([zeros[2]], zeros))).toBe('—');
    // Um único resultado válido também não forma histórico suficiente.
    expect(mediaCell(c.rows([kpi], [...zeros.slice(0, 2), kpi]))).toBe('—');
    const confirmados = zeros.map(k => ({ ...k, sem_dado: false }));
    expect(c.media(confirmados[2], confirmados)).toBe(0);
    expect(mediaCell(c.rows([confirmados[2]], confirmados))).toBe('0 dias');
  });

  it('mostra traço na célula da média para histórico vazio ou sem dados', () => {
    const c = context();
    for (const history of [[], [kpi], historico.map(k => ({ ...k, realizado: 0, sem_dado: true }))]) {
      const cells = [...c.rows([kpi], history).matchAll(/<td[^>]*>(.*?)<\/td>/g)];
      expect(cells[5][1]).toBe('—');
    }
  });

  it('não usa média como meta nem mostra média para indicador com meta explícita', () => {
    const c = context();
    expect(c.media({ ...kpi, meta: 30 }, historico)).toBeNull();
    expect(c.media({ ...kpi, meta: 0, meta_definida: true }, historico)).toBeNull();
    const row = c.rows([{ ...kpi, meta: 30 }], historico);
    expect(row).toContain('>30 dias</td>');
    expect(row).not.toContain('>10 dias</td>');
    expect(row).toContain('67%');
  });

  it('usa o nome completo do EPP CAGE no cabeçalho padrão', () => {
    const orgSource = readFileSync(new URL('../../src/shared/org-config.js', import.meta.url), 'utf8');
    const org = runInNewContext(`${orgSource}\nORG_CONFIG`);
    expect(org.indicatorReportOrgLabel).toBe('EPP CAGE - ESCRITÓRIO DE PROJETOS E PROCESSOS');
  });
});
