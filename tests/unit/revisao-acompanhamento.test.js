import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
const names = ['_addMesesRevisao', '_dtProxAcomp', '_revPeriodica_init', '_revStatus'];
const context = vm.createContext({ isCritico: id => id === 'critico', _addDias: (date, days) => {
  const d = new Date(date); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10);
} });
for (const name of names) vm.runInContext(html.match(new RegExp(`function ${name}\\([^]*?\\n\\}`))[0], context);
const processo = (datas = [], critico = false) => ({ etapa: 'acompanha', arq_id: critico ? 'critico' : 'normal',
  ent: { dt_efetiva: '2025-03-13' }, reunioes_acomp: datas.map(data => ({ data })),
  revisao_periodica: { proxima_revisao: '2026-09-09', historico: [], lembretes_enviados: { venc: true } } });

describe('prazos de revisão a partir das reuniões realizadas', () => {
  it('agenda seis meses após a entrega e após a primeira reunião', () => {
    expect(context._dtProxAcomp(processo())).toBe('2025-09-13');
    expect(context._dtProxAcomp(processo(['2025-11-19']))).toBe('2026-05-19');
  });
  it('encerra a obrigatoriedade para não críticos e remove o alerta antigo', () => {
    const p = processo(['2025-11-19', '2026-06-26']);
    expect(context._revStatus(p)).toBeNull();
    expect(p.revisao_periodica.proxima_revisao).toBe('');
    expect(p.revisao_periodica.lembretes_enviados.venc).toBe(false);
  });
  it('agenda anualmente para críticos, independentemente da ordem de inclusão', () => {
    const p = processo(['2026-06-26', '2025-11-19'], true);
    expect(context._revPeriodica_init(p).proxima_revisao).toBe('2027-06-26');
    p.reunioes_acomp.push({ data: '2027-07-02' });
    expect(context._dtProxAcomp(p)).toBe('2028-07-02');
  });
  it('recalcula após editar e excluir reuniões, inclusive a última', () => {
    const p = processo(['2025-11-19', '2026-06-26'], true);
    p.reunioes_acomp[1].data = '2026-07-10';
    expect(context._revPeriodica_init(p).proxima_revisao).toBe('2027-07-10');
    p.reunioes_acomp.pop();
    expect(context._revPeriodica_init(p).proxima_revisao).toBe('2026-05-19');
    p.reunioes_acomp.pop();
    expect(context._revPeriodica_init(p).proxima_revisao).toBe('2025-09-13');
  });
  it('limita o dia ao fim do mês, incluindo anos bissextos', () => {
    expect(context._addMesesRevisao('2025-08-31', 6)).toBe('2026-02-28');
    expect(context._addMesesRevisao('2023-08-31', 6)).toBe('2024-02-29');
  });
});
