import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe,it,expect} from 'vitest';
const html=readFileSync('processos.html','utf8');
function context(initial=[]){
  const scope={kpis:initial,_kpiIdC:100,fmtPeriodo:v=>String(v??'').trim(),rInd(){},fbAutoSave(){scope.saves++;},saves:0,messages:[],toast:message=>scope.messages.push(message),XLSX:{read:rows=>({Sheets:{Sheet:rows},SheetNames:['Sheet']}),utils:{sheet_to_json:rows=>rows}}};
  runInNewContext(html.slice(html.indexOf('function parseNumBR('),html.indexOf('function _kpiPeriodoToIntervalo(')),scope);
  return scope;
}
const row=(periodo,realizado)=>({Área:'DAUD',Indicador:'I1','Enunciado ind':'Prazo','Período':periodo,Meta:100,Realizado:realizado});
const upload=(scope,rows)=>scope.importarIndicadores({files:[{arrayBuffer:async()=>rows}],value:'file'});
describe('reimportação de resultados de indicadores',()=>{
  it('substitui X por Y no mesmo período, mantém o ID e é repetível',async()=>{
    const c=context();await upload(c,[row('10/2026',10)]);const id=c.kpis[0].id;
    await upload(c,[row('10/2026',25)]);await upload(c,[row('10/2026',25)]);
    expect(c.kpis).toHaveLength(1);expect(c.kpis[0]).toMatchObject({id,realizado:25,pct_realizado:25,origem:'importado'});
    expect(c.saves).toBe(3);expect(c.messages.at(-1)).toContain('1 atualizado(s)');
  });
  it('corrige duplicatas legadas apenas do indicador/período reimportado e preserva vínculos',async()=>{
    const first={id:1,codigo:'I1',periodo:'10/2026',realizado:10,origem:'importado',pid:7,arq_id:'p',projeto_ids:['proj']};
    const otherMonth={id:3,codigo:'I1',periodo:'09/2026',realizado:30,origem:'importado'};
    const otherIndicator={id:4,codigo:'I2',periodo:'10/2026',realizado:40,origem:'importado'};
    const c=context([first,{...first,id:2,realizado:12},otherMonth,otherIndicator]);
    await upload(c,[row('10/2026',50),row('11/2026',60)]);
    expect(c.kpis).toHaveLength(4);expect(first).toMatchObject({id:1,realizado:50,pid:7,arq_id:'p',projeto_ids:['proj']});
    expect(c.kpis.find(k=>k.id===2)).toBeUndefined();expect(otherMonth.realizado).toBe(30);expect(otherIndicator.realizado).toBe(40);
  });
  it('atualiza para zero ou célula vazia sem deixar resultado antigo',async()=>{
    const c=context();await upload(c,[row('10/2026',10)]);await upload(c,[row('10/2026',0)]);
    expect(c.kpis[0]).toMatchObject({realizado:0,sem_dado:false});
    await upload(c,[row('10/2026','')]);expect(c.kpis).toHaveLength(1);expect(c.kpis[0]).toMatchObject({realizado:null,sem_dado:true,pct_realizado:null});
  });
  it('preserva edição manual e informa que a linha foi protegida',async()=>{
    const manual={id:1,codigo:'I1',periodo:'10/2026',realizado:77,origem:'importado_editado'};
    const c=context([manual]);await upload(c,[row('10/2026',25)]);
    expect(c.kpis).toEqual([manual]);expect(manual.realizado).toBe(77);expect(c.messages.at(-1)).toContain('1 preservado(s) por edição manual');
  });
});
