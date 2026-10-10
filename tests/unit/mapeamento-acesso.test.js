import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe,it,expect} from 'vitest';
const html=readFileSync(new URL('../../processos.html',import.meta.url),'utf8');
const names=['getTarefasUsr','_mappingAccessRestricted','_mappingTaskAllowed','_blockMappingAccess','abrirTarefaProcesso','abrirProc','go','stab'];
const source=names.map(name=>html.match(new RegExp('function '+name+'\\([^]*?\\n}'))[0]).join('\n');
function setup(perfil){
  const elements={};
  const node=id=>elements[id] ||= {classList:{add(){},remove(){},contains(){return false;}},innerHTML:''};
  const c={usuarioLogado:{perfil,nome:'Pessoa',email:'p@example.org'},curProc:null,etapasIdC:1,
    processos:[{id:1,etapa:'questionario',dono:'Pessoa',pat:'Pessoa',atribuicoes:{questionario:{para:perfil}}},{id:2,etapa:'riscos',dono:'Outro',pat:'Outro'}],
    ETAPAS:[{id:'questionario',resp:'dono'},{id:'riscos',resp:'ep'}],
    usuarioTemAcessoArqId:()=>false,document:{getElementById:node,querySelectorAll:()=>[]},
    _getPageRenderer:page=>()=>{c.lastPage=page;},rDetalhe:()=>{c.opened=c.curProc?.id;},
    rAcao:()=>{c.taskRendered=true;},rHist(){},isEP:()=>false};
  vm.createContext(c);vm.runInContext(source,c);return c;
}
describe('acesso ao mapeamento',()=>{
  it.each(['dono','gestor'])('bloqueia menus e aberturas diretas para %s, mas libera a tarefa atribuída',perfil=>{
    const c=setup(perfil);
    c.abrirProc(1);
    expect(c.opened).toBeUndefined();expect(c.lastPage).toBe('meusprocessos');
    c.go('processos');expect(c.lastPage).toBe('meusprocessos');
    c.go('novo');expect(c.lastPage).toBe('meusprocessos');
    c.abrirTarefaProcesso(1);expect(c.opened).toBe(1);expect(c._mappingTaskAllowed()).toBe(true);
    c.stab('form',{classList:{add(){}}});expect(c.taskRendered).toBeUndefined();
    c.stab('acao',{classList:{add(){}}});expect(c.taskRendered).toBe(true);
    c.opened=null;c.abrirProc(2,true);expect(c.opened).toBeNull();expect(c.curProc).toBeNull();
  });
  it('revoga a exceção quando a atribuição deixa de existir',()=>{
    const c=setup('dono');c.abrirTarefaProcesso(1);
    c.processos[0].atribuicoes.questionario={para:'gestor'};
    expect(c._mappingTaskAllowed()).toBe(false);
    expect(c._blockMappingAccess(true)).toBe(true);expect(c.curProc).toBeNull();
  });
  it('preserva a abertura normal para o EP',()=>{
    const c=setup('ep');c.abrirProc(2);expect(c.opened).toBe(2);
  });
});
