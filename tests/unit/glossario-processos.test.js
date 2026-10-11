import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe,it,expect} from 'vitest';
const ctx=vm.createContext({});
for(const file of ['glossario-processos','busca-geral'])vm.runInContext(readFileSync(new URL('../../src/shared/'+file+'.js',import.meta.url),'utf8'),ctx);
describe('glossário na base de conhecimento',()=>{
  it('pesquisa termos, definições e sinônimos sem diferença de acentos',()=>{
    expect(ctx.BuscaGeral.search('glossario','baseline',{})[0].title).toBe('Linha de base');
    expect(ctx.BuscaGeral.search('glossario','causa provavel',{}).map(r=>r.title)).toContain('Causa provável');
    expect(ctx.BuscaGeral.search('glossario','preventivo',{}).map(r=>r.title)).toContain('Controle preventivo');
  });
  it('inclui o glossário em Todos e mantém o recorte por processo',()=>{
    expect(ctx.BuscaGeral.search('todos','baseline',{})[0].category).toBe('glossario');
    expect(ctx.BuscaGeral.search('todos','baseline',{processId:'1'})).toEqual([]);
    expect(ctx.BuscaGeral.search('glossario','',{processId:'1'}).length).toBeGreaterThan(50);
  });
  it('mantém riscos e problemas fora da base de conhecimento',()=>{
    expect(ctx.BuscaGeral.search('riscos','',{})).toEqual([]);expect(ctx.BuscaGeral.search('problemas','',{})).toEqual([]);
  });
});
