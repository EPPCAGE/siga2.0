import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe,it,expect} from 'vitest';
const ctx=vm.createContext({});
vm.runInContext(readFileSync(new URL('../../src/shared/maturidade-gestao.js',import.meta.url),'utf8'),ctx);
const api=ctx.MaturidadeGestao;
const answers=levels=>Object.fromEntries(api.questions.map(q=>[q.id,levels[q.dimension]]));
describe('maturidade institucional',()=>{
  it('preserva 26 questões, seis dimensões e cinco alternativas do formulário',()=>{
    expect(api.questions).toHaveLength(26);expect(api.dimensions).toHaveLength(6);
    expect(api.dimensions.map((_,d)=>api.questions.filter(q=>q.dimension===d).length)).toEqual([5,4,4,4,5,4]);
    expect(api.questions.every(q=>q.options.length===5)).toBe(true);
  });
  it('cada dimensão tem um voto, independentemente do número de questões',()=>{
    const result=api.calculate(answers([1,4,4,4,1,5]));
    expect(result.level).toBe(4);expect(result.dimensions.map(d=>d.level)).toEqual([1,4,4,4,1,5]);
  });
  it.each([[1,1,2,2,4,5],[5,3,5,3,4,4],[4,4,4,5,5,5]])('desempata %j pelo menor nível empatado',(...levels)=>{
    const counts=levels.reduce((a,n)=>(a[n]=(a[n]||0)+1,a),{}),max=Math.max(...Object.values(counts));
    expect(api.calculate(answers(levels)).level).toBe(Math.min(...Object.keys(counts).filter(n=>counts[n]===max).map(Number)));
  });
  it('não inventa notas para respostas ausentes ou inválidas',()=>{
    const data=answers([2,2,2,2,2,2]);delete data.mg1;data.mg6=6;data.mg10='3';
    const result=api.calculate(data);expect(result.complete).toBe(false);expect(result.level).toBeNull();expect(result.answered).toBe(23);
    expect(api.calculate({}).level).toBeNull();
  });
  it('calcula média por dimensão e preserva o menor nível na fronteira',()=>{
    const data=answers([3,3,3,3,3,3]);data.mg6=2;data.mg7=2;data.mg8=3;data.mg9=3;
    const result=api.calculate(data);expect(result.dimensions[1].mean).toBe(2.5);expect(result.dimensions[1].level).toBe(2);
  });
  it('sugere a próxima prática, prioriza lacunas e orienta manutenção no nível 5',()=>{
    const data=answers([5,4,3,2,1,5]),items=api.improvements(data);
    expect(items[0].level).toBe(1);expect(items[0].practice).toBe(items[0].question.options[1]);
    expect(items.every(i=>i.target<=5)).toBe(true);expect(api.improvements(answers([5,5,5,5,5,5]))).toEqual([]);
    expect(api.levels[5].next).toMatch(/Sustentar/);
  });
});
