import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
const start = html.indexOf('const ILP_REWORK_KEYWORDS=');
const end = html.indexOf('function calcILPFromBpmn', start);
const source = html.slice(start, end);
const {calcILPFromEtapas} = new Function(`${source}; return {calcILPFromEtapas};`)();

const tarefa = (id, modo = 'Manual', executor = 'Ator') => ({
  id, nome: id, tipo: 'Atividade', modo, executor,
});

describe('inventário do Esboço usado no ILP', () => {
  it('conta todas as tarefas dos ramos XOR, não somente o ramo mais longo', () => {
    const resultado = calcILPFromEtapas([
      tarefa('inicial'),
      {id: 'gw', nome: 'Decidir', tipo: 'Decisao', subtipo_gateway: 'exclusivo', caminhos: [
        {label: 'Sim', acoes: [tarefa('sim-1'), tarefa('sim-2')]},
        {label: 'Não', acoes: [tarefa('nao-1')]},
      ]},
      tarefa('final'),
    ]);

    expect(resultado.total).toBe(5);
    expect(resultado.nManual).toBe(5);
    expect(resultado.gxorDiv).toBe(1);
  });

  it('conta gateways aninhados e tarefas vinculadas descritas no Esboço', () => {
    const resultado = calcILPFromEtapas([
      {id: 'gw-externo', nome: 'Gateway externo', tipo: 'Decisao', caminhos: [
        {label: 'A', acoes: [{id: 'gw-interno', nome: 'Gateway interno', tipo: 'Decisao', caminhos: [
          {label: 'X', acoes: [tarefa('x')]},
          {label: 'Y', acoes: [tarefa('y')]},
        ]}]},
        {label: 'B', acoes: []},
      ]},
      {...tarefa('a'), vinculo_gw: {gw_ep_id: 'gw-externo', label: 'A'}},
      {...tarefa('b'), vinculo_gw: {gw_ep_id: 'gw-externo', label: 'B'}},
    ]);

    expect(resultado.total).toBe(4);
    expect(resultado.gxorDiv).toBe(2);
  });
});
