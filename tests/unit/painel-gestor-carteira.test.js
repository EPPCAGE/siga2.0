import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe,it,expect} from 'vitest';
const html=readFileSync('processos.html','utf8');
const code=html.match(/function _carteiraPainelGestor\([^]*?\n}/)[0];
function portfolio(processos,items=[{id:'a',nome:'Gerenciar afastamentos'}],mapped=[]){
 return runInNewContext(code+';_carteiraPainelGestor();',{processos,ARQUITETURA:[{nome:'Gestão de pessoas',processos:items}],isMapeado:id=>mapped.includes(id)});
}
describe('carteira de mapeamentos do painel do gestor',()=>{
 it('conta mapeamento ativo mesmo se a arquitetura estiver marcada como mapeada',()=>{
  const p={id:1,arq_id:'a',nome:'Gerenciar afastamentos',etapa:'riscos'};
  const c=portfolio([p],undefined,['a']);
  expect(c.emAnd).toHaveLength(1);expect(c.emAnd[0].proc).toBe(p);expect(c.mapeados).toHaveLength(0);expect(c.naoMapeadas).toHaveLength(0);
 });
 it('seleciona ciclo ativo em vez do primeiro registro concluído',()=>{
  const active={id:2,arq_id:'a',etapa:'esboco_asis'};
  const c=portfolio([{id:1,arq_id:'a',etapa:'auditoria'},active],[{id:'a',nome:'Gerenciar afastamentos',proc_id:1}]);
  expect(c.emAnd[0].proc).toBe(active);expect(c.mapeados).toHaveLength(0);
 });
 it('mantém mapeamento do processo pai quando ele passa a ter subprocessos',()=>{
  const c=portfolio([{id:1,arq_id:'a',etapa:'abertura'}],[{id:'a',nome:'Gerenciar afastamentos',subprocessos:[{id:'s',nome:'Subprocesso'}]}]);
  expect(c.todas).toHaveLength(2);expect(c.emAnd).toHaveLength(1);expect(c.naoMapeadas).toHaveLength(1);
 });
 it('reconhece IDs numéricos e textuais equivalentes sem vincular processos por nome',()=>{
  expect(portfolio([{id:1,arq_id:'7',etapa:'pop'}],[{id:7,nome:'Gerenciar afastamentos'}]).emAnd).toHaveLength(1);
  expect(portfolio([{id:1,arq_id:'outro',nome:'Gerenciar afastamentos',etapa:'pop'}]).emAnd).toHaveLength(0);
 });
 it('preserva concluídos, marcações manuais sem ciclo ativo e unidades não mapeadas',()=>{
  const c=portfolio([{id:1,arq_id:'a',etapa:'acompanha'}],[{id:'a'},{id:'b'},{id:'c'}],['b']);
  expect(c.mapeados).toHaveLength(2);expect(c.emAnd).toHaveLength(0);expect(c.naoMapeadas).toHaveLength(1);
  expect(c.todas.length).toBe(c.mapeados.length+c.emAnd.length+c.naoMapeadas.length);
 });
});
