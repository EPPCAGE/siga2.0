import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe,it,expect} from 'vitest';
const context=vm.createContext({});vm.runInContext(readFileSync('src/shared/riscos.js','utf8'),context);
const R=context.Riscos;
const architecture=[{nome:'Auditoria',processos:[{id:'p',nome:'Auditar',area:'DAUD'}]}];
const processes=[{id:1,arq_id:'p',nome:'Antigo',area:'Antiga',ent:{riscos:[{desc:'A',prob:'Média',imp:'Crítico'},{desc:'B',prob:'Alta',imp:'Alto',status_tratamento:'em_tratamento',prazo_tratamento:'2026-01-01'},{desc:'C',prob:'Baixa',imp:'Baixo',tratamento:'Mitigado',acao_tratamento:'Texto antigo'}]}}];
describe('Riscos consolidados',()=>{
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
