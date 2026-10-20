import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe, it, expect} from 'vitest';
const scope = {};
runInNewContext(readFileSync('src/shared/asis-cards.js', 'utf8'), scope);
const {validateGraph, compile} = scope.AsIsCards;
const node = (id, type = 'manualTask') => ({id, type, label: id});
const edges = pairs => pairs.map(([source, target], index) => ({id: 'f' + index, source, target}));
const codes = result => result.errors.map(issue => issue.code);
const task = id => ({id, type: 'task', nome: id, executor: 'Equipe'});
const back = (id, targetId) => ({id, type: 'return', nome: 'Retornar', targetId});
const branch = (nome, cards) => ({id:nome.normalize('NFD').replace(/\p{M}/gu,''), nome, cards});
function splitJoin(splitType, joinType) {
  return {nodes: [node('s', 'startEvent'), node('split', splitType), node('a'), node('b'), node('join', joinType), node('e', 'endEvent')], flows: edges([['s','split'],['split','a'],['split','b'],['a','join'],['b','join'],['join','e']])};
}
describe('validação lógica do esboço por cards', () => {
  it('detecta pontas soltas, destinos inexistentes e identidades duplicadas', () => {
    const nodes = [node('s','startEvent'), node('a'), node('e','endEvent')];
    expect(codes(validateGraph(nodes, edges([['s','e']])))).toContain('LOOSE_INPUT');
    expect(codes(validateGraph(nodes, edges([['s','a'],['s','e']])))).toContain('LOOSE_OUTPUT');
    expect(codes(validateGraph(nodes, edges([['s','missing']])))).toContain('BROKEN_FLOW');
    expect(codes(validateGraph([...nodes,node('a')], []))).toContain('NODE_ID');
    expect(codes(validateGraph(nodes, [{id:'x',source:'s',target:'a'},{id:'x',source:'a',target:'e'}]))).toContain('FLOW_ID');
  });
  it('detecta etapas e ciclos desconectados mesmo que o restante chegue ao final', () => {
    const result = validateGraph([node('s','startEvent'),node('e','endEvent'),node('a'),node('b')], edges([['s','e'],['a','b'],['b','a']]));
    expect(codes(result)).toContain('UNREACHABLE');
  });
  it('rejeita finais com saída, ausência de final e retorno ao evento de início', () => {
    expect(codes(validateGraph([node('s','startEvent'),node('e','endEvent')],edges([['s','e'],['e','s']])))).toEqual(expect.arrayContaining(['START_INCOMING','END_OUTGOING']));
    expect(codes(validateGraph([node('s','startEvent'),node('a')],edges([['s','a'],['a','a']])))).toEqual(expect.arrayContaining(['NO_END','CLOSED_LOOP','NO_PATH_TO_END']));
  });
  it('encontra um ciclo sem saída mesmo quando existe outro caminho que termina', () => {
    const result = validateGraph([node('s','startEvent'),node('d','exclusiveGateway'),node('loop'),node('e','endEvent')], edges([['s','d'],['d','loop'],['loop','loop'],['d','e']]));
    expect(result.valid).toBe(false);expect(codes(result)).toContain('CLOSED_LOOP');
    expect(result.errors.find(issue => issue.code==='CLOSED_LOOP').nodeIds).toEqual(['loop']);
  });
  it('impede a compilação de um XOR cujas saídas apenas repetem a decisão', () => {
    const cards = [{id:'d',type:'decision',nome:'Aprovar?',branches:[branch('A',[back('ra','d')]),branch('B',[back('rb','d')])]}];
    try {compile(cards);throw Error('Deveria bloquear');} catch (error) {
      expect(error.validation.valid).toBe(false);expect(codes(error.validation)).toContain('CLOSED_LOOP');
      expect(error.validation.errors.some(issue => issue.message.includes('Aprovar?'))).toBe(true);
    }
  });
  it('aceita correção até aprovação, sinalizando a revisão das condições de saída', () => {
    const result = compile([task('preparar'),{id:'d',type:'decision',nome:'Completo?',branches:[branch('Sim',[task('aprovar')]),branch('Não',[task('corrigir'),back('r','d')])]}]);
    expect(result.validation.valid).toBe(true);expect(result.validation.analysis.complete).toBe(true);
    expect(result.validation.warnings.map(issue=>issue.code)).toContain('LOOP_WITH_EXIT');
  });
  it('detecta o travamento de uma junção AND depois de uma escolha exclusiva', () => {
    const graph = splitJoin('exclusiveGateway','parallelGateway'), result=validateGraph(graph.nodes,graph.flows);
    expect(result.valid).toBe(false);expect(codes(result)).toContain('DEADLOCK');
    expect(result.errors.find(issue=>issue.code==='DEADLOCK').nodeIds).toEqual(['join']);
  });
  it('valida todos os caminhos paralelos e os subconjuntos de caminhos inclusivos', () => {
    for (const [split,join] of [['parallelGateway','parallelGateway'],['inclusiveGateway','inclusiveGateway'],['exclusiveGateway','inclusiveGateway'],['parallelGateway','inclusiveGateway']]) {
      const graph = splitJoin(split,join), result=validateGraph(graph.nodes,graph.flows);
      expect(result.errors).toEqual([]);expect(result.analysis.complete).toBe(true);
    }
    const graph=splitJoin('inclusiveGateway','parallelGateway');
    expect(codes(validateGraph(graph.nodes,graph.flows))).toContain('DEADLOCK');
  });
  it('não dispara uma junção inclusiva antes de todos os caminhos ativos chegarem', () => {
    // Premature firing would send two separate tokens into the second AND join and deadlock.
    const nodes=[node('s','startEvent'),node('p','parallelGateway'),node('a'),node('b'),node('i','inclusiveGateway'),node('x'),node('j','parallelGateway'),node('e','endEvent')];
    const result=validateGraph(nodes,edges([['s','p'],['p','a'],['p','b'],['p','x'],['a','i'],['b','i'],['i','j'],['x','j'],['j','e']]));
    expect(result.valid).toBe(true);expect(result.analysis.complete).toBe(true);
  });
  it('trata links como continuidade e detecta pares quebrados', () => {
    const nodes=[node('s','startEvent'),{...node('throw','intermediateThrowEvent'),linkName:'L1',linkTarget:'catch'},{...node('catch','intermediateCatchEvent'),linkName:'L1',linkSource:'throw'},node('e','endEvent')], flows=edges([['s','throw'],['catch','e']]);
    expect(validateGraph(nodes,flows).valid).toBe(true);
    expect(codes(validateGraph(nodes.map(n=>n.id==='catch'?{...n,linkName:'L2'}:n),flows))).toContain('BROKEN_LINK');
  });
  it('bloqueia reabrir um paralelo antes de sincronizar os caminhos', () => {
    const cards=[task('preparar'),{id:'p',type:'parallel',nome:'Executar juntos',branches:[branch('A',[{id:'d',type:'decision',nome:'Refazer?',branches:[branch('Refazer',[back('r','preparar')]),branch('Continuar',[task('a')])]}]),branch('B',[task('b')])]}];
    try {compile(cards);throw Error('Deveria bloquear');} catch(error) {expect(codes(error.validation)).toContain('FORK_REENTRY');}
  });
  it('permite um ciclo interno a um caminho paralelo e finais independentes', () => {
    const result=compile([{id:'p',type:'parallel',nome:'Executar juntos',branches:[branch('A',[task('a'),{id:'d',type:'decision',nome:'Completo?',branches:[branch('Não',[back('r','a')]),branch('Sim',[task('c')])]}]),branch('B',[task('b')])]}]);
    expect(result.validation.valid).toBe(true);expect(result.validation.analysis.complete).toBe(true);
    const separate=compile([{id:'p',type:'parallel',nome:'Separar',join:false,branches:[branch('A',[task('a')]),branch('B',[task('b')])]}]);
    expect(separate.validation.valid).toBe(true);
  });
  it('aceita repetir um bloco paralelo depois que seus caminhos se reencontram', () => {
    const result=compile([task('preparar'),{id:'p',type:'parallel',nome:'Executar',branches:[branch('A',[task('a')]),branch('B',[task('b')])]},{id:'d',type:'decision',nome:'Repetir?',branches:[branch('Repetir',[back('r','preparar')]),branch('Concluir',[{id:'e',type:'end',nome:'Fim'}])]}]);
    expect(result.validation.valid).toBe(true);expect(result.validation.analysis.complete).toBe(true);
    expect(result.validation.warnings.some(issue=>issue.code==='LOOP_WITH_EXIT')).toBe(true);
  });
  it('explicita a amostragem de um inclusivo com muitas combinações', () => {
    const tasks=Array.from({length:7},(_,index)=>node('a'+index));
    const nodes=[node('s','startEvent'),node('split','inclusiveGateway'),...tasks,node('join','inclusiveGateway'),node('e','endEvent')];
    const flows=edges([['s','split'],...tasks.map(task=>['split',task.id]),...tasks.map(task=>[task.id,'join']),['join','e']]);
    const result=validateGraph(nodes,flows);
    expect(result.valid).toBe(true);expect(result.analysis.complete).toBe(false);
    expect(result.warnings.some(issue=>issue.code==='ANALYSIS_LIMIT')).toBe(true);
    const limited=validateGraph(splitJoin('parallelGateway','parallelGateway').nodes,splitJoin('parallelGateway','parallelGateway').flows,{maxTransitions:1});
    expect(limited.analysis.complete).toBe(false);
  });
  it('informa análise parcial ao atingir o limite, sem alegar verificação completa', () => {
    const graph=splitJoin('parallelGateway','parallelGateway'), result=validateGraph(graph.nodes,graph.flows,{maxStates:2});
    expect(result.valid).toBe(true);expect(result.analysis.complete).toBe(false);expect(result.warnings.map(issue=>issue.code)).toContain('ANALYSIS_LIMIT');
  });
});
