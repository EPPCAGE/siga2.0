import '../../src/shared/process-architecture.js';
import {describe,it,expect} from 'vitest';
const {indicatorOptions,indicatorMatchesProcess}=globalThis.ProcessArchitecture;
describe('shared architecture links',()=>{
  it('keeps parents, nested children and existing mapping IDs',()=>{
    const architecture=[{nome:'Macro',processos:[{id:'parent',nome:'Pai',gerente:'Ana',subprocessos:[{id:2,nome:'Filho',proc_id:99,subprocessos:[{id:'leaf',nome:'Neto'}]}]}]}];
    const original=JSON.stringify(architecture),options=indicatorOptions(architecture,[{id:0,arq_id:'2'}]);
    expect(options.map(item=>item.id)).toEqual(['parent',2,'leaf']);
    expect(options[0]).toMatchObject({tipo:'Processo',area:'Ana',procId:null});
    expect(options[1]).toMatchObject({tipo:'Subprocesso',procId:0,macro:'Macro'});
    expect(JSON.stringify(architecture)).toBe(original);
  });
  it('retains fallback mapping and handles empty macroprocesses',()=>{
    expect(indicatorOptions([{nome:'Vazio'},{nome:'Macro',processos:[{id:'p',proc_id:7}]}],[])[0].procId).toBe(7);
    expect(indicatorOptions([],[])).toEqual([]);
  });
  it('matches IDs across number/string representations without matching missing IDs',()=>{
    expect(indicatorMatchesProcess({pid:'0'},{id:0})).toBe(true);
    expect(indicatorMatchesProcess({arq_id:'2'},{arq_id:2})).toBe(true);
    expect(indicatorMatchesProcess({arq_id:'other'},{arq_id:2})).toBe(false);
    expect(indicatorMatchesProcess({},{})).toBe(false);
    expect(indicatorMatchesProcess({pid:1},null)).toBe(false);
  });
});
