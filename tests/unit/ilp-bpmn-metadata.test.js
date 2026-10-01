import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
const start = html.indexOf('function _ilpEtapasByBpmnId');
const end = html.indexOf('// Confirmações são válidas', start);
const source = html.slice(start, end);
const {_ilpEtapasByBpmnId, _ilpGetBpmnMetadata} = new Function(`${source}
  return {_ilpEtapasByBpmnId, _ilpGetBpmnMetadata};
`)();

describe('metadados do BPMN usados no ILP', () => {
  it('usa ator e automação revisados na lista de etapas TO BE', () => {
    const nodeInfo = {
      Task_1: {executor: '', modo: 'Manual', nome: 'Nome do diagrama'},
    };
    const getMetadata = _ilpGetBpmnMetadata(nodeInfo, [
      {bpmn_id: 'Task_1', executor: 'Financeiro', modo: 'Automatica', nome: 'Emitir nota'},
    ]);

    expect(getMetadata('Task_1')).toEqual({
      executor: 'Financeiro',
      modo: 'Automatica',
      nome: 'Emitir nota',
    });
  });

  it('encontra tarefas guardadas dentro dos caminhos de gateways', () => {
    const etapas = [{
      bpmn_id: 'Gateway_1',
      caminhos: [{acoes: [{bpmn_id: 'Task_nested', executor: 'Compras'}]}],
    }];

    expect(_ilpEtapasByBpmnId(etapas).get('Task_nested')?.executor).toBe('Compras');
  });

  it('mantém metadados do XML quando a etapa não foi detalhada', () => {
    const getMetadata = _ilpGetBpmnMetadata({
      Task_2: {executor: 'Lane Operações', modo: 'Semi-automatica', nome: 'Conferir'},
    }, []);

    expect(getMetadata('Task_2')).toEqual({
      executor: 'Lane Operações',
      modo: 'Semi-automatica',
      nome: 'Conferir',
    });
  });
});
