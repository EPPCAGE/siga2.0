import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
function load(context, name) {
  vm.runInContext(source.match(new RegExp('function ' + name + '\\([^]*?\\n\\}'))[0], context);
}

describe('cores do relatorio executivo', () => {
  it.each([
    [0, '#dc2626'], [25, '#dc2626'], [25.1, '#d97706'],
    [26, '#d97706'], [50, '#d97706'], [50.1, '#166534'],
    [60, '#166534'], [75, '#166534'], [75.1, '#4ade80'],
    [78, '#4ade80'], [100, '#4ade80'],
  ])('aplica a faixa de %s%%', (pct, cor) => {
    const context = vm.createContext({});
    load(context, 'statusReportCorPct');
    expect(context.statusReportCorPct(pct)).toBe(cor);
  });

  it('mantem barras trimestrais azuis e escala percentual nos demais graficos', () => {
    let output;
    const plano = Array.from({ length: 100 }, (_, i) => ({
      ano: 2026, trimestre: 'T4', status: i < 78 ? 'concluida' : 'em_execucao',
      entrega_status: i < 60 ? 'em_dia' : 'com_atraso',
      prazo: '2026-12-31',
    }));
    plano.push({ ano: 2026, trimestre: 'T4', status: 'concluida', entrega_status: 'sem_prazo' });
    const context = vm.createContext({
      Date, Set, Blob,
      isEP: () => true, planoAno: () => 2026, plano,
      planoStatusEfetivo: a => a.status,
      getMetricasArq: () => ({ nUnid: 100, nMap: 65 }),
      ARQUITETURA: [{ nome: 'Macro', processos: [{ id: 1 }, { id: 2 }] }],
      isMapeado: () => true, processos: [],
      PAT_METAS: [{ ano: 2026, titulo: 'Meta', meta: 100 }],
      _metaRealizado: () => 60,
      ORG_CONFIG: {},
      window: { open: () => ({ document: {
        write: html => { output = html; }, close: () => {}, getElementById: () => null,
      } }) },
      URL: { createObjectURL: () => 'blob:test' },
      _registrarRelatorioPatEmitido: () => {},
    });
    for (const name of ['statusReportCorPct', 'statusReportTrimAtual', 'statusReportDateIso', 'statusReportDateBr', 'statusReportRecente', 'gerarStatusReportPDF']) load(context, name);
    context.gerarStatusReportPDF();
    const donuts = [...output.matchAll(/--pct:(\d+);--color:(#[a-f0-9]+)/g)];
    expect(donuts).toHaveLength(3);
    expect(output).toContain('60 em dia de 78 concluídas com prazo no ano de 2026 (ano inteiro)');
    expect(output).toContain('Pontualidade das entregas — ano inteiro de 2026');
    for (const [, pct, cor] of donuts) expect(cor).toBe(context.statusReportCorPct(Number(pct)));
    const bars = [...output.matchAll(/width:(\d+)%;background:(#[a-f0-9]+)/g)];
    expect(bars).toHaveLength(5);
    for (const [, , cor] of bars.slice(0, 4)) expect(cor).toBe('#2563eb');
    for (const [, pct, cor] of bars.slice(4)) expect(cor).toBe(context.statusReportCorPct(Number(pct)));
    expect(output).toContain('background:#166534;height:7px');
  });
});
