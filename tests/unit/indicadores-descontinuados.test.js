import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe,it,expect} from 'vitest';

const html=readFileSync(new URL('../../processos.html',import.meta.url),'utf8');
const names=['parseNumBR','_kpiDiscontinuedKey','_kpiDiscontinuedRegistry','_kpiIsDiscontinued','_kpiLoadDiscontinued','deletarKpi','_gsheetsRowToKpi'];
const source=names.map(name=>html.match(new RegExp('(?:async )?function '+name+'\\([^]*?\\n}'))[0]).join('\n');
function setup(cloud={}){
  const storage={};
  const c={kpis:[{id:1,codigo:'I1',nome:'Prazo',periodo:'jan/2026'},{id:2,codigo:'I1',nome:'Prazo',periodo:'fev/2026'},{id:3,codigo:'I2',nome:'Outro'}],
    _kpiIdC:4,fmtPeriodo:value=>value,fbReady:()=>true,lsGet:key=>storage[key],lsSet:(key,value)=>{storage[key]=value;},
    document:{getElementById:()=>({style:{}})},rInd(){},toast(){},_fbSyncCache:{kpis:new Map()},
    configRepository:{ref:key=>key,get:async()=>({exists:()=>true,data:()=>({indicadores:cloud})})},
    kpisRepository:{ref:id=>'kpis/'+id},
    FirestoreRepositories:{batchCommit:async ops=>{c.ops=ops;Object.assign(cloud,ops[0].data.indicadores);}}
  };
  c.confirmar=(_,fn)=>{c.pending=fn();};
  vm.createContext(c);vm.runInContext(source,c);return c;
}
describe('indicadores descontinuados',()=>{
  it('registra na nuvem e remove todos os períodos, bloqueando novas sincronizações em outra sessão',async()=>{
    const cloud={},c=setup(cloud);
    c.deletarKpi(1);await c.pending;
    expect(c.kpis.map(k=>k.id)).toEqual([3]);
    expect(c.ops.filter(op=>op.type==='delete').map(op=>op.ref)).toEqual(['kpis/1','kpis/2']);
    const fresh=setup(cloud);await fresh._kpiLoadDiscontinued();
    const cols={cCodigo:'Código',cEnunc:'Nome',cPeriodo:'Mês'};
    expect(fresh._gsheetsRowToKpi({'Código':' I1 ','Nome':'Novo nome','Mês':'dez/2027'},cols,{},new Set())).toBeNull();
    expect(fresh._gsheetsRowToKpi({'Código':'I2','Nome':'Outro','Mês':'dez/2027'},cols,{},new Set())).not.toBeNull();
  });
  it('mantém os indicadores se a gravação na nuvem falhar',async()=>{
    const c=setup();c.FirestoreRepositories.batchCommit=async()=>{throw new Error('Falha');};
    c.deletarKpi(1);await c.pending;
    expect(c.kpis).toHaveLength(3);
    expect(c._kpiIsDiscontinued(c.kpis[0])).toBe(false);
  });
  it('identifica indicadores sem código pelo nome normalizado, independentemente do mês',()=>{
    const c=setup();c._kpiDiscontinuedRegistry()[c._kpiDiscontinuedKey({nome:'Satisfação dos usuários'})]={};
    expect(c._kpiIsDiscontinued({nome:' SATISFACAO  DOS USUARIOS ',periodo:'dez/2027'})).toBe(true);
    expect(c._kpiIsDiscontinued({nome:'Outro'})).toBe(false);
  });
});
