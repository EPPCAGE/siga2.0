import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe,expect,it} from 'vitest';
const source=readFileSync(new URL('../../src/shared/indicadores-impactados.js',import.meta.url),'utf8');
function setup(){
  const context=vm.createContext({});vm.runInContext(source,context);
  const architecture=[{id:'a',nome:'Auditoria',processos:[{id:'pa',nome:'Auditar',proc_id:1,subprocessos:[{id:'sa',nome:'Inspecionar'}]}]},
    {id:'b',nome:'Controle',processos:[{id:'pb',nome:'Controlar',proc_id:2}]}];
  const project={processos_impactados:[{macro_id:'a',processo_id:'pa'}]};
  return{api:context.IndicadoresImpactados,architecture,project};
}
describe('Indicadores dos processos impactados',()=>{
  it('mantém resultados após o término, ignora meses anteriores e meses sem dados, preservando zero',()=>{
    const{api}=setup();
    const project={dt_inicio:'2026-05-20',dt_fim:'2026-06-01',conclusao:{dt_conclusao:'2026-06-10'}};
    const rows=[
      {ind:{periodo:'dez/2027',resultado:12}},
      {ind:{periodo:'abril/2026',resultado:4}},
      {ind:{periodo:'maio/2026',resultado:0}},
      {ind:{periodo:'junho/2026',resultado:null}},
      {ind:{periodo:'julho/2026',resultado:8,sem_dado:true}},
      {ind:{periodo:'agosto/2026',resultado:7}}
    ];
    expect(api.timeline(project,rows).map(row=>row.ind.resultado)).toEqual([0,7,12]);
    expect(api.timeline({},rows)).toEqual([]);
  });
  it('inclui o processo e seus subprocessos, com vínculos diretos e por mapeamento',()=>{
    const{api,architecture,project}=setup();
    const indicators=[{id:1,arq_id:'pa'},{id:2,pid:99},{id:3,pid:1},{id:4,arq_id:'pb'},{id:5}];
    const rows=api.list(project,architecture,indicators,[{id:99,arq_id:'sa'}]);
    expect(rows.map(r=>r.ind.id)).toEqual([1,3,2]);
    expect(rows[2].processo).toBe('Inspecionar');
  });
  it('agrupa por processo e ordena os períodos do mais antigo para o mais recente',()=>{
    const{api,architecture,project}=setup();
    project.processos_impactados.push({macro_id:'b',processo_id:'pb'});
    const indicators=[
      {id:1,arq_id:'pb',periodo:'maio/2026'},
      {id:2,arq_id:'pa',periodo:'agosto/2026'},
      {id:3,arq_id:'pb',periodo:'dez/2025'},
      {id:4,arq_id:'pa',periodo:'junho/2026'},
      {id:5,arq_id:'pa',periodo:'maio/2026'},
      {id:6,arq_id:'pb',periodo:'2026-01'},
      {id:7,arq_id:'pa',periodo:'julho/2026'}
    ];
    expect(api.list(project,architecture,indicators,[]).map(r=>r.ind.id)).toEqual([5,4,7,2,3,6,1]);
    expect(indicators.map(ind=>ind.id)).toEqual([1,2,3,4,5,6,7]);
  });
  it('respeita o vínculo explícito mesmo quando o pid aponta para outro processo',()=>{
    const{api,architecture,project}=setup();
    expect(api.list(project,architecture,[{arq_id:'pb',pid:1}],[])).toEqual([]);
    expect(api.list(project,architecture,[{arq_id:'removido',pid:1}],[])).toEqual([]);
  });
  it('não duplica indicadores e não inclui processos removidos ou de outro macroprocesso',()=>{
    const{api,architecture,project}=setup();
    project.processos_impactados.push({macro_id:'a',processo_id:'pa'},{macro_id:'b',processo_id:'pa'},{macro_id:'a',processo_id:'removido'});
    expect(api.list(project,architecture,[{arq_id:'pa'}],[])).toHaveLength(1);
    expect(api.list({processos_impactados:[]},architecture,[{arq_id:'pa'}],[])).toEqual([]);
  });
  it('recusa IDs ambíguos e usa o pid para distinguir macroprocessos quando possível',()=>{
    const{api,architecture,project}=setup();
    architecture[1].processos[0].id='pa';
    expect(api.list(project,architecture,[{arq_id:'pa'}],[])).toEqual([]);
    expect(api.list(project,architecture,[{arq_id:'pa',pid:1}],[])).toHaveLength(1);
    expect(api.list(project,architecture,[{arq_id:'pa',pid:2}],[])).toEqual([]);
  });
  it('herda metas da série e mantém zero explícito',()=>{
    const{api}=setup();
    const series=[{nome:'Prazo',periodo:'jan/2026',meta:'95,5'},{nome:'Prazo',periodo:'fev/2026',meta:0,origem:'importado'},
      {nome:'Prazo',periodo:'mar/2026',meta:0,origem:'importado',meta_definida:true}];
    expect(api.meta(series[1],series)).toBe(95.5);
    expect(api.meta(series[2],series)).toBe(0);
    expect(api.number('1.234,56')).toBe(1234.56);
    expect(api.number('')).toBeNull();
  });
});
