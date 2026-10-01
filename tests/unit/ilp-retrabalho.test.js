import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
const start = html.indexOf('const ILP_REWORK_KEYWORDS=');
const end = html.indexOf('function calcILPFromBpmn', start);
const source = html.slice(start, end);
const {
  _ilpGetRetrabalhosConfirmadosValidos,
  calcILPFromEtapas,
} = new Function(`${source}
  return {_ilpGetRetrabalhosConfirmadosValidos, calcILPFromEtapas};
`)();

const atividade = (id, nome, tipo = 'Atividade') => ({
  id, nome, tipo, executor: 'Ator', modo: 'Manual',
});

describe('retrabalho no Índice Lean Processual', () => {
  it('ignora IDs órfãos, etapas renomeadas, tipos inválidos e duplicidades', () => {
    const etapas = [
      atividade('valido', 'Revisar solicitação'),
      atividade('renomeado', 'Protocolar solicitação'),
      atividade('gateway', 'Ajustar solicitação', 'Decisao'),
    ];

    expect(_ilpGetRetrabalhosConfirmadosValidos(
      etapas,
      ['valido', 'excluido', 'renomeado', 'gateway', 'valido'],
    )).toEqual(['valido']);
  });

  it('usa a fórmula sem retrabalho quando não há confirmação válida', () => {
    const etapas = [atividade('atual', 'Protocolar solicitação')];

    expect(calcILPFromEtapas(etapas, []).ilp).toBe(80);
    expect(calcILPFromEtapas(etapas, ['etapa-excluida']).ilp).toBe(80);
    expect(calcILPFromEtapas(etapas, ['etapa-excluida']).qtdR).toBe(0);
    expect(calcILPFromEtapas(etapas, ['etapa-excluida']).hasR).toBe(false);
  });

  it('penaliza somente uma confirmação atual e válida', () => {
    const etapas = [atividade('revisao', 'Revisar solicitação')];
    const resultado = calcILPFromEtapas(etapas, ['revisao', 'revisao', 'orfao']);

    expect(resultado.qtdR).toBe(1);
    expect(resultado.hasR).toBe(true);
    expect(resultado.indexR).toBe(90);
    expect(resultado.ilp).toBe(78);
  });

  it('contabiliza tarefas e retrabalhos dentro dos caminhos de gateways', () => {
    const etapas = [{
      id: 'gw', nome: 'Documentação válida?', tipo: 'Decisao', subtipo_gateway: 'exclusivo',
      caminhos: [
        {label: 'Sim', acoes: [atividade('publicar', 'Publicar documento')]},
        {label: 'Não', acoes: [atividade('revisar', 'Revisar documento')]},
      ],
    }];

    const resultado = calcILPFromEtapas(etapas, ['revisar']);

    expect(resultado.total).toBe(2);
    expect(resultado.gxorDiv).toBe(1);
    expect(resultado.qtdR).toBe(1);
  });
});
