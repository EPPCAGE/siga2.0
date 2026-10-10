import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe,it,expect} from 'vitest';
const context=vm.createContext({});vm.runInContext(readFileSync('src/shared/riscos.js','utf8'),context);
const R=context.Riscos;
const architecture=[{nome:'Auditoria',processos:[{id:'p',nome:'Auditar',area:'DAUD'}]}];
const processes=[{id:1,arq_id:'p',nome:'Antigo',area:'Antiga',ent:{riscos:[{desc:'A',prob:'Média',imp:'Crítico'},{desc:'B',prob:'Alta',imp:'Alto',status_tratamento:'em_tratamento',prazo_tratamento:'2026-01-01'},{desc:'C',prob:'Baixa',imp:'Baixo',tratamento:'Mitigado',acao_tratamento:'Texto antigo'}]}}];
describe('Riscos consolidados',()=>{
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
  it('combina filtros e conta os riscos de média/alta com prazo vencido',()=>{
    const rows=R.rows(processes,architecture);expect(R.filter(rows,{area:'DAUD',prob:'Alta',status:'em_tratamento'})).toHaveLength(1);
    const summary=R.summary(rows,'2026-10-10');expect(summary.priority).toBe(2);expect(summary.untreated).toBe(1);expect(summary.running).toBe(1);expect(summary.overdue).toBe(1);
    expect(R.matrix(rows)[0][2].count).toBe(1);
  });
  it('exige ação e evidência para tratado e mantém os campos usados no mapeamento',()=>{
    expect(()=>R.treatment({}, {status:'tratado',type:'Mitigado',action:'Controle'})).toThrow(/evidência/);
    const result=R.treatment({desc:'Risco'}, {status:'tratado',type:'Mitigado',action:'Controle',evidence:'Eficácia verificada',deadline:'2026-10-10'});
    expect(result.tratado).toBe(true);expect(result.acao_tratamento).toBe('Controle');expect(result.desc).toBe('Risco');
    expect(R.treatment(result,{status:'sem_tratamento'}).tratado).toBe(false);
  });
});
