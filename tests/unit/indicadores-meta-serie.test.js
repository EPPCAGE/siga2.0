import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
const names = ['parseNumBR', '_kpiMetaInformada', '_kpiMeta', 'periodoToNum', '_kpiGetSamePeriods', 'editKpi', '_kpiNavFlushCurrent', '_kpiEditingPeriods', '_kpiNavLoadCurrent'];
const code = names.map(name => html.match(new RegExp('function ' + name + '\\([^]*?\\n}'))[0]).join('\n');
function setup(metas = [null, 80, '', 90, null]) {
  const elements = {};
  const rows = metas.map((meta, index) => ({ id: index + 1, codigo: 'I1', periodo: `${String(index + 1).padStart(2, '0')}/2026`, meta, realizado: 70 }));
  const c = { kpis: rows, document: { getElementById: id => elements[id] ||= { value: '', style: {} } },
    _kpiUpdateNavDisplay() {}, _kpiNavUpdateSelector() {}, calcPctReal() {},
    _kpiFormSetFields(k) { c.formRecord = k; } };
  runInNewContext(code, c);
  return { c, rows, elements };
}
describe('edição e metas da série de indicadores', () => {
  it('abre o mês mais recente mesmo quando o botão referencia o primeiro', () => {
    const { c, elements } = setup();
    c.editKpi(1);
    expect(c._kpiPeriodoIdx).toBe(4);
    expect(c.formRecord.id).toBe(5);
    expect(elements['nkpi-edit-idx'].value).toBe(5);
    expect(elements['nkpi-periodo'].value).toBe('05/2026');
    expect(elements['nkpi-meta'].value).toBe(90);
  });
  it('herda a primeira meta e só muda a partir de outra meta preenchida', () => {
    const { c, rows } = setup();
    expect(rows.map(k => c._kpiMeta(k))).toEqual([80, 80, 80, 90, 90]);
    expect(rows.map(k => k.meta)).toEqual([null, 80, '', 90, null]);
  });
  it('mantém séries sem meta e separa indicadores distintos', () => {
    const { c, rows } = setup([null, '', ' ']);
    c.kpis.push({ codigo: 'Outro', periodo: '01/2026', meta: 99 });
    expect(rows.slice(0, 3).map(k => c._kpiMeta(k))).toEqual([null, null, null]);
  });
  it('aceita zero explícito como uma nova meta', () => {
    const { c, rows } = setup([80, null, 0, null]);
    expect(rows.map(k => c._kpiMeta(k))).toEqual([80, 80, 0, 0]);
  });
  it('ordena meses entre anos, sem depender da ordem dos registros', () => {
    const { c, rows } = setup([null, 100, 80]);
    rows[0].periodo = '2027-02'; rows[1].periodo = 'jan/2027'; rows[2].periodo = 'dez/2026';
    c.editKpi(3);
    expect(c.formRecord.id).toBe(1);
    expect(rows.map(k => c._kpiMeta(k))).toEqual([100, 100, 80]);
  });
  it('navegar não grava a meta herdada como uma mudança explícita', () => {
    const { c } = setup();
    c.editKpi(1);
    c._kpiNavFlushCurrent();
    expect(c._kpiPeriodEdits[5].meta).toBeNull();
  });
  it('usa alterações ainda não salvas ao navegar para os meses seguintes', () => {
    const { c, elements } = setup();
    c.editKpi(1);
    c._kpiPeriodoIdx = 3;
    c._kpiNavLoadCurrent();
    elements['nkpi-meta'].value = '95';
    c._kpiNavFlushCurrent();
    c._kpiPeriodoIdx = 4;
    c._kpiNavLoadCurrent();
    expect(elements['nkpi-meta'].value).toBe(95);
    c._kpiNavFlushCurrent();
    expect(c._kpiPeriodEdits[5].meta).toBeNull();
  });
});
