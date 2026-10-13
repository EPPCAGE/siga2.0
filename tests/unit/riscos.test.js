import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe,it,expect} from 'vitest';
const context=vm.createContext({});vm.runInContext(readFileSync('src/shared/riscos.js','utf8'),context);
const R=context.Riscos;
const architecture=[{nome:'Auditoria',processos:[{id:'p',nome:'Auditar',area:'DAUD'}]}];
const processes=[{id:1,arq_id:'p',nome:'Antigo',area:'Antiga',ent:{riscos:[{desc:'A',prob:'Média',imp:'Crítico'},{desc:'B',prob:'Alta',imp:'Alto',status_tratamento:'em_tratamento',prazo_tratamento:'2026-01-01'},{desc:'C',prob:'Baixa',imp:'Baixo',tratamento:'Mitigado',acao_tratamento:'Texto antigo'}]}}];
describe('Riscos consolidados',()=>{
  it('divide altos/críticos em com e sem tratamento, incluindo planejados e sem confirmação',()=>{
    const risks=[{prob:'Media',imp:'Alto'},...['planejado','em_tratamento','implementado','nao_confirmado'].map(status_tratamento=>({prob:'Alta',imp:'Critico',status_tratamento})),{prob:'Alta',imp:'Baixo',status_tratamento:'implementado'}];
    const rows=R.rows([{id:1,ent:{riscos:risks}}],[]);
    expect(R.coverage(rows)).toEqual({total:5,withTreatment:3,withoutTreatment:2});
    expect(R.coverage([])).toEqual({total:0,withTreatment:0,withoutTreatment:0});
    expect(R.coverage(R.filter(rows,{status:['implementado']}))).toEqual({total:1,withTreatment:1,withoutTreatment:0});
  });
  it('filtra pela criticidade do processo sem confundir com nível do risco',()=>{
    const critical=R.rows(processes,architecture,id=>id==='p');
    expect(R.filter(critical,{critical:['sim']})).toHaveLength(3);
    expect(R.filter(critical,{critical:['nao']})).toHaveLength(0);
    expect(R.filter(critical,{critical:['sim'],prob:['Baixa']})).toHaveLength(1);
  });
  it('filtra o nível de risco com os mesmos limites da matriz',()=>{
    expect(R.level('Baixa','Baixo')).toBe('low');expect(R.level('Media','Medio')).toBe('moderate');expect(R.level('Media','Critico')).toBe('high');expect(R.level('Alta','Critico')).toBe('critical');expect(R.level('','Alto')).toBe('');
    const rows=R.rows(processes,architecture);expect(R.filter(rows,{level:['high']})).toHaveLength(1);expect(R.filter(rows,{level:['low','critical']})).toHaveLength(2);
  });
  it('usa área e macroprocesso da arquitetura e normaliza classificações',()=>{
    const rows=R.rows(processes,architecture);expect(rows[0].processName).toBe('Auditar');expect(rows[0].area).toBe('DAUD');expect(rows[0].macro).toBe('Auditoria');expect(rows[0].prob).toBe('Media');expect(rows[0].imp).toBe('Critico');
  });
  it('não considera textos antigos como tratamento concluído',()=>expect(R.rows(processes,architecture)[2].status).toBe('nao_confirmado'));
  it('aceita várias opções no mesmo filtro e combina os filtros',()=>{
    const rows=R.rows(processes,architecture);
    expect(R.filter(rows,{prob:['Media','Alta'],imp:['Alto','Critico'],area:['DAUD']})).toHaveLength(2);
    expect(R.filter(rows,{prob:[],status:[]})).toHaveLength(3);
    expect(R.filter(rows,{prob:['Baixa'],imp:['Critico']})).toHaveLength(0);
  });
  it('combina filtros e conta riscos de nível alto/crítico com prazo vencido',()=>{
    const rows=R.rows(processes,architecture);expect(R.filter(rows,{area:'DAUD',prob:'Alta',status:'em_tratamento'})).toHaveLength(1);
    const summary=R.summary(rows,'2026-10-10');expect(summary.priority).toBe(2);expect(summary.untreated).toBe(1);expect(summary.running).toBe(1);expect(summary.overdue).toBe(1);
    expect(R.matrix(rows)[0][2].count).toBe(1);
  });
  it('exclui níveis baixos/moderados dos cards de prioridade mesmo com probabilidade média ou alta',()=>{
    const risks=[
      {prob:'Media',imp:'Baixo'},
      {prob:'Alta',imp:'Baixo',status_tratamento:'em_tratamento',prazo_tratamento:'2020-01-01'},
      {prob:'Media',imp:'Medio',status_tratamento:'implementado'},
      {prob:'Media',imp:'Alto'},
      {prob:'Alta',imp:'Critico',status_tratamento:'em_tratamento',prazo_tratamento:'2020-01-01'},
      {prob:'Media',imp:'Critico',status_tratamento:'planejado',prazo_tratamento:'2020-01-01'},
      {prob:'Alta',imp:'Alto',status_tratamento:'implementado',prazo_tratamento:'2020-01-01'},
    ];
    const rows=R.rows([{id:1,ent:{riscos:risks}}],[]);
    expect(R.summary(rows,'2026-10-10')).toMatchObject({total:7,priority:4,untreated:1,running:1,overdue:2,treated:1});
    expect(R.summary(R.filter(rows,{level:['moderate','low']}),'2026-10-10')).toMatchObject({total:3,priority:0,untreated:0,running:0,overdue:0,treated:0});
  });
  it('exige ação e evidência para tratado e mantém os campos usados no mapeamento',()=>{
    expect(()=>R.treatment({}, {status:'implementado',type:'Mitigar',action:'Controle',owner:'Maria',controlSource:'existente'})).toThrow(/evidência/);
    const result=R.treatment({desc:'Risco'}, {status:'implementado',type:'Mitigar',action:'Controle',owner:'Maria',controlSource:'existente',evidence:'Eficácia verificada'});
    expect(result.tratado).toBe(true);expect(result.acao_tratamento).toBe('Controle');expect(result.desc).toBe('Risco');
    expect(R.treatment(result,{status:'sem_tratamento'}).tratado).toBe(false);
  });
  it('permite aceitar baixos/moderados e impede aceitação para altos/críticos',()=>{
    const values={status:'planejado',type:'Aceitar',action:'Custo do controle supera benefício'};
    expect(R.treatment({prob:'Baixa',imp:'Baixo'},values).controle_origem).toBe('aceitacao');
    expect(R.treatment({prob:'Media',imp:'Medio'},values).controle_descricao).toBe('');
    expect(()=>R.treatment({prob:'Alta',imp:'Critico'},values)).toThrow(/apenas/);
    expect(()=>R.treatment({prob:'Media',imp:'Alto'},values)).toThrow(/apenas/);
  });
  it('exige responsável, descrição, referência e prazo para controle proposto',()=>{
    const risk={prob:'Alta',imp:'Critico'};
    const values={status:'planejado',type:'Compartilhar',action:'Controle',controlSource:'projeto',reference:'Projeto 1',deadline:'2026-12-31',owner:'Maria'};
    expect(R.treatment(risk,values).controle_referencia).toBe('Projeto 1');
    expect(()=>R.treatment(risk,{...values,owner:''})).toThrow(/responsável/);
    expect(()=>R.treatment(risk,{...values,deadline:''})).toThrow(/prazo/);
    expect(()=>R.treatment(risk,{...values,reference:''})).toThrow(/projeto ou plano/);
    expect(()=>R.treatment(risk,{...values,action:''})).toThrow(/controle/);
  });
});

describe('cadastro manual de riscos da arquitetura',()=>{
  it('permite cadastrar riscos altos sem resposta ou controle e valida os campos obrigatórios',()=>{
    expect(R.manual({desc:' Prazo legal ',prob:'Alta',imp:'Critico'})).toMatchObject({desc:'Prazo legal',prob:'Alta',imp:'Critico',controles_existentes:[],status_tratamento:'sem_tratamento'});
    expect(()=>R.manual({desc:'',prob:'Alta',imp:'Critico'})).toThrow(/Descreva/);
    expect(()=>R.manual({desc:'A',prob:'',imp:'Critico'})).toThrow(/probabilidade/);
    expect(()=>R.manual({desc:'A',prob:'Alta',imp:'Critico',resposta_proposta:{tipo:'Aceitar',descricao:'Aceitar',responsavel:'Maria'}})).toThrow(/baixos ou moderados/);
    expect(()=>R.manual({desc:'A',prob:'Baixa',imp:'Baixo',resposta_proposta:{tipo:'Mitigar'}})).toThrow(/Complete/);
    expect(()=>R.manual({desc:'A',prob:'Baixa',imp:'Baixo',controles_existentes:[{descricao:'Aplicação'}]})).toThrow(/controle/);
  });
  it('usa o vínculo de mapeamento da arquitetura quando há mais de um registro do processo',()=>{
    const arq=[{nome:'Macro',processos:[{id:'p',nome:'Processo',proc_id:2}]}];
    const ps=[{id:1,arq_id:'p'},{id:2,arq_id:'p'}];
    expect(R.target(ps,arq,'p').process).toBe(ps[1]);
    expect(R.target(ps,arq,'inexistente')).toBeNull();
  });
  it('mostra riscos sem mapeamento e os transfere ao iniciar o processo sem duplicá-los',()=>{
    const risk={id:'r1',...R.manual({desc:'Risco manual',prob:'Media',imp:'Alto',resposta_proposta:{tipo:'Mitigar',descricao:'Conferir',responsavel:'Maria'},controles_existentes:[{biblioteca_id:'PRO-02',nome:'Checklist',descricao:'Conferir o expediente',tipo:'Preventivo',responsavel:'João',efetividade:'Eficaz'}]})};
    const arq=[{nome:'Macro',processos:[{id:'p',nome:'Processo',subprocessos:[{id:'s',nome:'Subprocesso',riscos:[risk]}]}]}];
    const before=R.rows([],arq);
    expect(before).toHaveLength(1);expect(before[0]).toMatchObject({processId:'arq:s',processName:'Subprocesso',macro:'Macro'});
    expect(R.resolve([],arq,'arq:s').ent.riscos[0]).toBe(risk);
    const process={id:1,arq_id:'s',ent:{riscos:[]}};
    R.adopt(process,arq);R.adopt(process,arq);
    expect(process.ent.riscos).toEqual([risk]);expect(arq[0].processos[0].subprocessos[0].riscos).toEqual([]);
    expect(R.rows([process],arq)).toHaveLength(1);
    expect(process.ent.riscos[0].resposta_proposta.descricao).toBe('Conferir');
    expect(process.ent.riscos[0].controles_existentes[0].biblioteca_id).toBe('PRO-02');
  });
});
