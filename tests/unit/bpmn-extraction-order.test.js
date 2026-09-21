import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../processos.html', import.meta.url), 'utf8');
const source = html.slice(html.indexOf('function _bpmnNodeToEtapa('), html.indexOf('function _bpmnGetSubprocessChildren('));
const extract = new Function('outgoing', 'nodes', 'labels', `
  let etapasIdC=1;
  const inferNatureza=()=> 'Execucao';
  ${source}
  return _bpmnBuildFlatGwAware(outgoing,nodes,labels);
`);
const merge = new Function(`${html.slice(html.indexOf('function _bpmnMergeExtractedEtapas('), html.indexOf('function extrairBpmn('))}; return _bpmnMergeExtractedEtapas;`)();

function run(outgoing, gateways = ['fork', 'join'], labels = {}) {
  const ids = [...new Set([...Object.keys(outgoing), ...Object.values(outgoing).flat()])];
  const nodes = Object.fromEntries(ids.map(id => [id, {
    nome: id,
    tipo: id === 'start' || id === 'end' ? 'Evento' : gateways.includes(id) ? 'Decisao' : 'Atividade',
    subtipo: id === 'start' ? 'Início' : id === 'end' ? 'Fim' : null,
  }]));
  return extract(outgoing, nodes, labels);
}

describe('ordem textual da extração BPMN compartilhada por AS IS e TO BE', () => {
  it('reordena etapas já extraídas sem perder edições ou etapas manuais', () => {
    const a={id:'old-a',bpmn_id:'a',nome:'Nome editado',desc:'Detalhamento preservado'};
    const b={id:'old-b',bpmn_id:'b',nome:'b'};
    const manual={id:'manual',nome:'Etapa manual'};
    const result=merge([b,manual,a],[{id:'new-a',bpmn_id:'a',nome:'a'},{id:'new-b',bpmn_id:'b',nome:'b'}]);
    expect(result.novas).toBe(0);
    expect(result.etapas).toEqual([a,b,manual]);
    expect(result.etapas[0]).toBe(a);
    expect(a.desc).toBe('Detalhamento preservado');
    expect(result.etapas.map(e=>e.seq)).toEqual([1,2,3]);
  });

  it('vincula novas atividades ao gateway existente e mantém atividades homônimas', () => {
    const gw={id:'old-gw',bpmn_id:'fork',nome:'Decisão'};
    const result=merge([gw],[{id:'new-gw',bpmn_id:'fork',nome:'Decisão'},
      {id:'a',bpmn_id:'a',nome:'Validar',vinculo_gw:{gw_ep_id:'new-gw',label:'A'}},
      {id:'b',bpmn_id:'b',nome:'Validar',vinculo_gw:{gw_ep_id:'new-gw',label:'B'}}]);
    expect(result.novas).toBe(2);
    expect(result.etapas.slice(1).map(e=>e.vinculo_gw.gw_ep_id)).toEqual(['old-gw','old-gw']);
  });

  it('lista cada ramo completo e só depois a continuação comum', () => {
    const result = run({start:['fork'], fork:['a1','b1'], a1:['a2'], a2:['a3'], a3:['join'], b1:['b2'], b2:['join'], join:['after'], after:['end']}, undefined, {'fork→a1':'Financeiro','fork→b1':'Jurídico'});
    expect(result.map(e=>e.nome)).toEqual(['start','fork','a1','a2','a3','b1','b2','after','end']);
    expect(result.filter(e=>e.nome.startsWith('a') && e.nome !== 'after').map(e=>e.vinculo_gw.label)).toEqual(['Financeiro','Financeiro','Financeiro']);
    expect(result.find(e=>e.nome==='b2').vinculo_gw.label).toBe('Jurídico');
    expect(result.find(e=>e.nome==='after').vinculo_gw).toBeNull();
  });

  it('aguarda o ramo longo mesmo quando o primeiro termina antes', () => {
    expect(run({start:['fork'], fork:['a','b1'], a:['join'], b1:['b2'], b2:['b3'], b3:['join'], join:['end']}).map(e=>e.nome))
      .toEqual(['start','fork','a','b1','b2','b3','end']);
  });

  it('termina ramificações aninhadas antes de passar ao ramo externo seguinte', () => {
    const result = run({start:['fork'], fork:['inner','b'], inner:['x1','y1'], x1:['x2'], x2:['innerJoin'], y1:['innerJoin'], innerJoin:['a'], a:['join'], b:['join'], join:['end']}, ['fork','inner','innerJoin','join']);
    expect(result.map(e=>e.nome)).toEqual(['start','fork','inner','x1','x2','y1','a','b','end']);
  });

  it('não bloqueia nem duplica atividades em ciclos de retrabalho', () => {
    expect(run({start:['fork'], fork:['a','b'], a:['review'], review:['a','join'], b:['join'], join:['end']}, ['fork','review','join']).map(e=>e.nome))
      .toEqual(['start','fork','a','review','b','end']);
  });

  it('preserva fluxos lineares, términos separados e atividades desconectadas', () => {
    expect(run({start:['a'], a:['end']}).map(e=>e.nome)).toEqual(['start','a','end']);
    expect(run({start:['fork'], fork:['a','b'], a:['endA'], b:['endB'], isolated:[]}).map(e=>e.nome))
      .toEqual(['start','fork','a','endA','b','endB','isolated']);
  });

  it('trata convergência direta em atividade e fluxos sem evento de início', () => {
    expect(run({fork:['a','b'], a:['shared'], b:['shared'], shared:['end']}).map(e=>e.nome))
      .toEqual(['fork','a','b','shared','end']);
  });
});
