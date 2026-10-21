import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe,it,expect} from 'vitest';
const scope={};scope.globalThis=scope;runInNewContext(readFileSync('src/shared/mapeamento-colaborativo.js','utf8'),scope);
const domain=scope.MapeamentoColaborativo;
const architecture=[{id:'m1',nome:'Gestão',processos:[{id:'p1',nome:'Receber demanda',subprocessos:[{id:'s1',nome:'Analisar pedido'}]}]},{id:'m2',nome:'Outro',processos:[{id:'p2',nome:'Receber demanda'}]}];
describe('mapeamentos colaborativos',()=>{
 it('encontra processos e subprocessos sem diferenciar maiúsculas, no macroprocesso selecionado',()=>{
  expect(domain.matches(architecture,'m1',' RECEBER DEMANDA ').map(x=>x.id)).toEqual(['p1']);
  expect(domain.matches(architecture,'m1','ANALISAR PEDIDO').map(x=>x.id)).toEqual(['s1']);
  expect(domain.matches(architecture,'m1','Desconhecido')).toEqual([]);
 });
 it('preserva opções ambíguas para escolha explícita',()=>{
  const data=[{id:'m',processos:[{id:'a',nome:'Executar',subprocessos:[{id:'b',nome:'Executar'}]}]}];
  expect(domain.matches(data,'m','Executar').map(x=>x.id)).toEqual(['a','b']);
 });
 it('permite editar rascunho apenas ao autor, e revisão enviada apenas ao EPP',()=>{
  expect(domain.canEdit({status:'rascunho',autor_uid:'a'},'a',false)).toBe(true);
  expect(domain.canEdit({status:'rascunho',autor_uid:'a'},'b',true)).toBe(false);
  expect(domain.canEdit({status:'enviado',autor_uid:'a'},'a',false)).toBe(false);
  expect(domain.canEdit({status:'enviado',autor_uid:'a'},'b',true)).toBe(true);
  expect(domain.canEdit({status:'publicado',autor_uid:'a'},'b',true)).toBe(false);
 });
 it('permite excluir somente rascunhos do próprio autor',()=>{
  expect(domain.canDelete({status:'rascunho',autor_uid:'a'},'a')).toBe(true);
  expect(domain.canDelete({status:'rascunho',autor_uid:'a'},'b')).toBe(false);
  for(const status of ['enviado','publicado'])expect(domain.canDelete({status,autor_uid:'a'},'a')).toBe(false);
 });
 it('impede o autor de publicar e o EPP de modificar uma publicação encerrada',()=>{
  expect(()=>domain.assertTransition({status:'rascunho',autor_uid:'a'},'publicado','a',false)).toThrow();
  expect(()=>domain.assertTransition({status:'enviado',autor_uid:'a'},'publicado','a',false)).toThrow();
  expect(()=>domain.assertTransition({status:'enviado',autor_uid:'a'},'publicado','b',true)).not.toThrow();
  expect(()=>domain.assertTransition({status:'publicado',autor_uid:'a'},'publicado','b',true)).toThrow();
 });
});
