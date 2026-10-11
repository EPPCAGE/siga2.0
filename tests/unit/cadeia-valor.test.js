import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe,it,expect} from 'vitest';
const ctx=vm.createContext({});
vm.runInContext(readFileSync(new URL('../../src/shared/cadeia-valor.js',import.meta.url),'utf8'),ctx);
const api=ctx.CadeiaValor;
const architecture=()=>[{id:'m1',nome:'Auditoria',extra:'preservar',processos:[{id:'p1',nome:'Auditar',area:'DAUD',critico:true,subprocessos:[{id:'s1',nome:'Emitir relatório',pop:'doc'}]}]},{id:'m2',nome:'Gestão de TIC',processos:[]}];
const chain=arq=>api.initial(arq,{nome:'CAGE',missao:'Missão',visao:'Visão',valores:['Integridade'],entregas:['Transparência']});
describe('cadeia de valor integrada à arquitetura',()=>{
  it('faz as seis correspondências autorizadas usando os nomes completos',()=>{
    const pairs=[
      ['Orientação e Suporte à Tomada de Decisão','Aprimoramento e credibilidade da gestão'],
      ['Contabilidade','Qualidade da informação contábil'],
      ['Transparência e Estímulo ao Controle Social','Transparência'],
      ['Controle','Fortalecimento da estrutura de controle do Estado'],
      ['Auditoria','Contribuição para a viabilização de políticas públicas'],
      ['Promoção da Integridade e Prevenção à Corrupção','Integridade pública e privada']
    ];
    const macros=pairs.map(([nome],i)=>({id:'m'+i,nome,processos:[]}));
    api.migrateDeliveryLinks(macros);
    expect(macros.map(m=>m.entregas_valor[0])).toEqual(pairs.map(([,value])=>value));
    const initialized=api.initial(macros,{entregas:pairs.map(([,value])=>value)});
    expect(initialized.macros.map(m=>m.entregas_valor[0])).toEqual(pairs.map(([,value])=>value));
  });
  it('mantém o vínculo pelo identificador ao renomear e salvar o macroprocesso',()=>{
    const arq=architecture();api.migrateDeliveryLinks(arq);
    const value=chain(arq);value.entregas.push('Contribuição para a viabilização de políticas públicas');
    value.macros[0].entregas_valor=[...arq[0].entregas_valor];value.macros[0].nome='Novo nome aprovado';
    expect(api.merge(arq,value)[0].entregas_valor).toEqual(arq[0].entregas_valor);
  });
  it('não associa gestão, apoio ou macroprocessos desconhecidos e preserva vínculos explícitos',()=>{
    const macros=[{nome:'Gestão de TIC'},{nome:'Gestão estratégica'},{nome:'Novo macroprocesso'},{nome:'Auditoria',entregas_valor:['Entrega personalizada']}];
    api.migrateDeliveryLinks(macros);api.migrateDeliveryLinks(macros);
    expect(macros.map(m=>m.entregas_valor)).toEqual([[],[],[],['Entrega personalizada']]);
  });
  it('preserva identificadores, campos e subprocessos ao renomear e reordenar',()=>{
    const arq=architecture(),value=chain(arq);value.macros.reverse();value.macros[1].nome='Auditoria pública';
    const merged=api.merge(arq,value);
    expect(merged[1].id).toBe('m1');expect(merged[1].extra).toBe('preservar');
    expect(merged[1].processos[0]).toBe(arq[0].processos[0]);
    expect(arq[0].nome).toBe('Auditoria');
  });
  it('cria novos macroprocessos sem excluir os existentes',()=>{
    const arq=architecture(),value=chain(arq);value.macros.push({id:'m3',nome:'Pessoas',categoria:'apoio'});
    expect(api.merge(arq,value)[2].processos).toEqual([]);
  });
  it('reorganiza um processo com todos seus vínculos em um novo macroprocesso',()=>{
    const arq=architecture(),value=chain(arq);value.macros.push({id:'m3',nome:'Auditoria especializada',categoria:'finalistico'});
    value.desdobramentos={p1:'m3'};const merged=api.merge(arq,value);
    expect(merged[0].processos).toEqual([]);expect(merged[2].processos[0]).toBe(arq[0].processos[0]);
    const mapped=[{id:1,arq_id:'p1',macro:'Auditoria'},{id:2,arq_id:'s1',macro:'Auditoria'},{id:3,arq_id:'antigo',macro:'Histórico'}];
    expect(api.renamedProcesses(mapped,merged).map(r=>r.process.id)).toEqual([1,2]);
    expect(mapped[0].macro).toBe('Auditoria');
  });
  it('impede perder processos removendo um macroprocesso ou destino inválido',()=>{
    const arq=architecture(),value=chain(arq);value.macros.shift();
    expect(()=>api.merge(arq,value)).toThrow(/Escolha um macroprocesso válido/);
    const other=chain(arq);other.desdobramentos={p1:'inexistente'};
    expect(()=>api.merge(arq,other)).toThrow(/Escolha um macroprocesso válido/);
  });
  it('impede nomes duplicados, inclusive com diferenças de acento ou caixa',()=>{
    const value=chain(architecture());value.macros[1].nome='AUDITORÍA';
    expect(()=>api.validate(value)).toThrow(/únicos/);
  });
  it('classifica os macroprocessos conhecidos e exige classificação dos novos',()=>{
    expect(api.category({nome:'Gestão estratégica'})).toBe('gestao');
    expect(api.category({nome:'Transparência e estímulo ao controle social'})).toBe('finalistico');
    expect(api.category({nome:'Gestão de dados e informações'})).toBe('apoio');
    expect(api.category({nome:'Novo macroprocesso'})).toBe('');
    expect(()=>api.validate(chain([{id:'m',nome:'Novo macroprocesso'}]))).toThrow(/categoria/);
  });
});
