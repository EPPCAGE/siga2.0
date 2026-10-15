import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe,it,expect} from 'vitest';
const html=readFileSync('processos.html','utf8');
const names=['_kpiPeriodoPrevisto','parseNumBR','_kpiMetaInformada','_kpiMeta','periodoToNum','_kpiRefreshPct','_kpiCalcPct','_kpiGrpWithData','createKpiChart'];
function setup(){
  const c={kpis:[],_indCharts:[],kpiBarColor:()=> 'blue',Chart:function(canvas,config){c.chart=config;}};
  runInNewContext(names.map(name=>html.match(new RegExp('function '+name+'\\([^]*?\\n}'))[0]).join('\n'),c);return c;
}
describe('indicadores trimestrais',()=>{
  it('aceita apenas janeiro, abril, julho e outubro em períodos mensais',()=>{
    const c=setup();
    for(let month=1;month<=12;month++)expect(c._kpiPeriodoPrevisto({periodicidade:'Trimestral',periodo:`${String(month).padStart(2,'0')}/2026`})).toBe([1,4,7,10].includes(month));
    for(const periodo of ['jan/2026','abril/2026','jul. de 2026','2026-10','T1/2026','2º trimestre/2026'])expect(c._kpiPeriodoPrevisto({periodicidade:'Trimestral',periodo})).toBe(true);
    for(const periodo of ['fev/2026','2026-03','agosto/2026','nov. de 2026',''])expect(c._kpiPeriodoPrevisto({periodicidade:'Trimestral',periodo})).toBe(false);
    expect(c._kpiPeriodoPrevisto({periodicidade:'Mensal',periodo:'02/2026'})).toBe(true);
  });
  it('não herda metas nem considera medições fora dos meses previstos',()=>{
    const c=setup();c.kpis=[{codigo:'I',periodicidade:'Trimestral',periodo:'jan/2026',meta:10,realizado:9},{codigo:'I',periodicidade:'Trimestral',periodo:'fev/2026',meta:999,realizado:999},{codigo:'I',periodicidade:'Trimestral',periodo:'abr/2026',meta:null,realizado:8}];
    expect(c._kpiMeta(c.kpis[1])).toBeNull();expect(c._kpiMeta(c.kpis[2])).toBe(10);
    expect(c._kpiGrpWithData(c.kpis)).toHaveLength(2);
    const canvas={id:'chart-kpi-I',parentElement:{style:{}}};
    c.createKpiChart('I',c.kpis,{querySelectorAll:()=>[canvas]},[]);
    expect(c.chart.data.labels).toEqual(['jan/2026','abr/2026']);expect(c.chart.data.datasets[0].data).toEqual([9,8]);
    expect(c.chart.data.datasets[1].data).toEqual([10,10]);
  });
  it('limpa valores numéricos ao salvar mês sem medição e preserva a análise',()=>{
    const c=setup();const target={periodicidade:'Trimestral',periodo:'fev/2026',meta:100,realizado:90,indice:80,analise:'Justificativa do período'};
    c._kpiRefreshPct(target);
    expect(target).toMatchObject({realizado:null,meta:null,indice:null,sem_dado:true,pct_realizado:null,analise:'Justificativa do período'});
  });
});
