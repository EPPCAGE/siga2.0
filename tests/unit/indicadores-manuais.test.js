import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe,it,expect} from 'vitest';
const scope={};runInNewContext(readFileSync('src/shared/indicadores-manuais.js','utf8'),scope);
const M=scope.IndicadoresManuais;
describe('indicadores propostos nos mapeamentos',()=>{
  it('agrega todos os mapeamentos e preserva vínculo e dados de indicadores com nomes iguais',()=>{
    const a={nome:'Prazo',meta:'10',unidade:'dias',periodicidade:'Mensal',formula:'Soma / total',fonte:'Sistema',incluir_pop:false};
    const b={nome:'Prazo',meta:'20'};
    const processes=[{id:1,arq_id:'sub',form:{indicadores_proc:[a]}},{id:2,nome:'Outro',form:{indicadores_proc:[b]}},{id:3}];
    const rows=M.rows(processes,[{nome:'Macro',processos:[{id:'p',nome:'Pai',subprocessos:[{id:'sub',nome:'Subprocesso',area:'Área'}]}]}]);
    expect(rows).toHaveLength(2);expect(rows[0].indicator).toBe(a);expect(rows[1].indicator).toBe(b);
    expect(rows[0]).toMatchObject({processName:'Subprocesso',macro:'Macro',area:'Área',index:0});
    expect(rows[1].process.id).toBe(2);
    expect(a).not.toHaveProperty('resultados');
  });
  it('aceita zero, negativos e decimais em português sem inventar uma meta',()=>{
    expect(M.result({periodo:' Outubro/2026 ',resultado:'0'})).toEqual({periodo:'Outubro/2026',resultado:0});
    expect(M.result({periodo:'1º trimestre/2026',resultado:'-12,5'}).resultado).toBe(-12.5);
    expect(()=>M.result({periodo:'',resultado:'10'})).toThrow(/período/);
    for(const resultado of ['', 'NaN','Infinity','1.234,56','10abc'])expect(()=>M.result({periodo:'2026',resultado})).toThrow(/numérico/);
  });
  it('impede duplicação de período sem impedir a edição do resultado existente',()=>{
    const results=[{id:'1',periodo:'Outubro / 2026',resultado:10}];
    expect(()=>M.result({periodo:' outubro  / 2026 ',resultado:20},results)).toThrow(/Já existe/);
    expect(M.result({periodo:'Outubro / 2026',resultado:20},results,'1').resultado).toBe(20);
    expect(results[0].resultado).toBe(10);
  });
});
