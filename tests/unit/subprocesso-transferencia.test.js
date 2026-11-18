import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const html=readFileSync(new URL('../../processos.html',import.meta.url),'utf8');
const start=html.indexOf('function _transferirSubArq(');
const code=html.slice(start,html.indexOf('\nfunction _transferirProcArq(',start));
function fixture({ep=true,duplicates=[]}={}){
  const sub={id:'s1',nome:'Sub',proc_id:42,area:'A'};
  const origem={id:'p1',subprocessos:[sub]};
  const destino={id:'p2'};
  const outro={id:'p3',subprocessos:[]};
  const linked={id:42,arq_id:'s1',macro:'M1',dados:{pop:'preservar'}};
  const c={ARQUITETURA:[{nome:'M1',processos:[origem,outro]},{nome:'M2',processos:[destino]}],processos:[linked],isEP:()=>ep,_arqDuplicateIds:()=>new Set(duplicates),toast:()=>{}};
  runInNewContext(code,c);
  return {c,sub,origem,destino,outro,linked};
}
describe('mover subprocesso entre processos',()=>{
  it('move entre macroprocessos mantendo identidade, dados e vinculo',()=>{
    const {c,sub,origem,destino,linked}=fixture();
    expect(c._transferirSubArq(sub,origem,destino)).toBe(true);
    expect(origem.subprocessos).toHaveLength(0);
    expect(destino.subprocessos[0]).toBe(sub);
    expect(sub).toEqual({id:'s1',nome:'Sub',proc_id:42,area:'A'});
    expect(linked).toEqual({id:42,arq_id:'s1',macro:'M2',dados:{pop:'preservar'}});
  });
  it('move dentro do mesmo macroprocesso e aceita origem vazia',()=>{
    const {c,sub,origem,outro,linked}=fixture();
    expect(c._transferirSubArq(sub,origem,outro)).toBe(true);
    expect(outro.subprocessos).toEqual([sub]);
    expect(linked.macro).toBe('M1');
  });
  it('salvar sem mudar o destino nao duplica o subprocesso',()=>{
    const {c,sub,origem}=fixture();
    expect(c._transferirSubArq(sub,origem,origem)).toBe(true);
    expect(origem.subprocessos).toEqual([sub]);
  });
  it.each([{ep:false},{duplicates:['s1']},{duplicates:['p1']},{duplicates:['p2']}])('rejeita falta de permissao ou IDs ambiguos: %j',options=>{
    const {c,sub,origem,destino}=fixture(options);
    expect(c._transferirSubArq(sub,origem,destino)).toBe(false);
    expect(origem.subprocessos).toEqual([sub]);
    expect(destino.subprocessos).toBeUndefined();
  });
  it('rejeita destino inexistente e subprocesso removido durante a edicao',()=>{
    const {c,sub,origem,destino}=fixture();
    expect(c._transferirSubArq(sub,origem,{})).toBe(false);
    origem.subprocessos=[];
    expect(c._transferirSubArq(sub,origem,destino)).toBe(false);
    expect(destino.subprocessos).toBeUndefined();
  });
});
