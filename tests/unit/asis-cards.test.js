import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe,it,expect} from 'vitest';
const scope={};runInNewContext(readFileSync('src/shared/asis-cards.js','utf8'),scope);
const compile=scope.AsIsCards.compile;
const task=(id,executor='Equipe',modo='Manual')=>({id,type:'task',nome:'Atividade '+id,executor,modo});
describe('esboço AS IS experimental por cards',()=>{
 it('gera BPMN com posições, raias e modos de execução reais',()=>{
  const result=compile([task('a','Servidor'),task('b','Sistema','Automatica'),task('c','Servidor','Semi-automatica')],'Processo');
  expect(result.xml).toContain('<bpmndi:BPMNDiagram');expect(result.xml).toContain('<bpmn:lane ');
  expect(result.xml).toContain('<bpmn:manualTask');expect(result.xml).toContain('<bpmn:serviceTask');expect(result.xml).toContain('<bpmn:userTask');
  expect(result.steps.map(s=>s.bpmn_id)).toEqual(['Card_a','Card_b','Card_c']);
  expect(result.flows.map(f=>[f.source,f.target])).toEqual([['Cards_start','Card_a'],['Card_a','Card_b'],['Card_b','Card_c'],['Card_c','Cards_end']]);
 });
 it('liga os dois caminhos de uma decisão antes de seguir o fluxo principal',()=>{
  const result=compile([{id:'d',type:'decision',nome:'Aprovar?',yes:[task('a')],no:[task('b')]},task('c')]);
  expect(result.flows).toEqual(expect.arrayContaining([expect.objectContaining({source:'Card_d',target:'Card_a',label:'Sim'}),expect.objectContaining({source:'Card_d',target:'Card_b',label:'Não'}),expect.objectContaining({source:'Card_a',target:'Join_d'}),expect.objectContaining({source:'Card_b',target:'Join_d'}),expect.objectContaining({source:'Join_d',target:'Card_c'})]));
  expect(result.steps[1].vinculo_gw).toEqual({gw_ep_id:'ep-card-d',label:'Sim'});
  const a=result.nodes.find(n=>n.id==='Card_a'),b=result.nodes.find(n=>n.id==='Card_b');expect(a.y).not.toBe(b.y);
 });
 it('preserva IDs ao reordenar e não altera os cards de entrada',()=>{
  const cards=[task('a'),task('b')],before=JSON.stringify(cards);
  const first=compile(cards),second=compile([...cards].reverse());
  expect(first.steps[0].id).toBe(second.steps[1].id);expect(JSON.stringify(cards)).toBe(before);
 });
 it('aceita caminhos vazios e protege os textos no XML',()=>{
  const result=compile([{id:'d',type:'decision',nome:'<script>&"?',yes:[],no:[]}]);
  expect(result.xml).toContain('&lt;script&gt;&amp;&quot;?');expect(result.xml).not.toContain('<script>');
  expect(result.flows.filter(f=>f.source==='Card_d').map(f=>f.label)).toEqual(['Sim','Não']);
 });
 it('rejeita nomes vazios, tipos não suportados e identidades duplicadas',()=>{
  expect(()=>compile([{...task('a'),nome:''}])).toThrow(/nome/);
  expect(()=>compile([{...task('a'),type:'parallel'}])).toThrow();
  expect(()=>compile([task('a'),task('a')])).toThrow(/duplicada/);
 });
});
