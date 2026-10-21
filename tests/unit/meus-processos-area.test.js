import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe,it,expect} from 'vitest';
const html=readFileSync('processos.html','utf8');
const functions=['getUnidadesMapeaveis','getMinhasUnidades'].map(name=>html.match(new RegExp('function '+name+'\\([^]*?\\n}'))[0]).join('\n');
function setup(){
 const context={processos:[],usuarioTemAcessoArqId:()=>false,ARQUITETURA:[
  {id:'m1',nome:'Primeiro macro',processos:[{id:'a',nome:'Auditar',area:'Divisão de Auditoria'},{id:'b',nome:'Contabilizar',area:'Divisão de Contabilidade'}]},
  {id:'m2',nome:'Outro macro',processos:[{id:'p',nome:'Processo pai',area:'DAUD',subprocessos:[{id:'s1',nome:'Herdar área'},{id:'s2',nome:'Outra área',area:'DCON'}]}]}
 ]};vm.createContext(context);vm.runInContext(readFileSync('src/shared/areas-arquitetura.js','utf8'),context);vm.runInContext(functions,context);return context;
}
describe('Meus Processos por área do cadastro',()=>{
 it('mostra ao dono processos da área em qualquer macroprocesso, ignorando vínculos antigos',()=>{
  const c=setup();expect(c.getMinhasUnidades({perfil:'dono',area:' DAUD ',macroprocessos_vinculados:['m1'],processos_vinculados:['b']}).map(item=>item.arq_id)).toEqual(['a','s1']);
 });
 it('usa a área própria do subprocesso e herda a área do pai quando vazia',()=>{
  const c=setup();expect(c.getMinhasUnidades({perfil:'dono',area:'divisao de contabilidade'}).map(item=>item.arq_id)).toEqual(['b','s2']);
 });
 it('não lista processos sem uma área cadastrada para o dono',()=>{
  const c=setup();for(const area of ['',undefined,'  '])expect(c.getMinhasUnidades({perfil:'dono',area})).toEqual([]);
 });
 it.each(['gestor','ep'])('preserva a lista completa para %s, inclusive sem área cadastrada',perfil=>{
  const c=setup();expect(c.getMinhasUnidades({perfil,area:''}).map(item=>item.arq_id)).toEqual(['a','b','s1','s2']);
 });
});
