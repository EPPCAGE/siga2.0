import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
const start = html.indexOf('function calcILP(etapas, bpmnXml');
const end = html.indexOf('function _testCalcIlpBpmnXml', start);
const source = html.slice(start, end);

function carregarCalcILP(calcEtapas, calcBpmn) {
  return new Function('calcILPFromEtapas', 'calcILPFromBpmn', `${source}; return calcILP;`)(
    calcEtapas,
    calcBpmn,
  );
}

describe('fonte de dados do ILP', () => {
  it('calcula pelo Esboço TO BE mesmo quando existe um XML BPMN', () => {
    const resultadoEsboco = {
      total: 4,
      nAtores: 3,
      gxorDiv: 2,
      ilp: 71,
    };
    const calcEtapas = vi.fn(() => resultadoEsboco);
    const calcBpmn = vi.fn(() => ({total: 1, nAtores: 1, gxorDiv: 0, ilp: 80}));
    const calcILP = carregarCalcILP(calcEtapas, calcBpmn);
    const etapasTobe = [
      {id: 'atividade-nova', tipo: 'Atividade', executor: 'Compras'},
      {id: 'gateway-novo', tipo: 'Decisao'},
    ];

    expect(calcILP(etapasTobe, '<definitions/>')).toBe(resultadoEsboco);
    expect(calcEtapas).toHaveBeenCalledWith(etapasTobe, undefined);
    expect(calcBpmn).not.toHaveBeenCalled();
  });

  it('usa o BPMN somente quando o Esboço ainda não tem etapas', () => {
    const resultadoBpmn = {total: 2, nAtores: 2, gxorDiv: 1, ilp: 75};
    const calcEtapas = vi.fn(() => null);
    const calcBpmn = vi.fn(() => resultadoBpmn);
    const calcILP = carregarCalcILP(calcEtapas, calcBpmn);

    expect(calcILP([], '<definitions/>')).toBe(resultadoBpmn);
    expect(calcBpmn).toHaveBeenCalledWith('<definitions/>', [], undefined);
  });
});
