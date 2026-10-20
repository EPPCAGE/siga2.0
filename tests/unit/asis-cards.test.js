import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe,it,expect} from 'vitest';
const scope={};runInNewContext(readFileSync('src/shared/asis-cards.js','utf8'),scope);
const compile=scope.AsIsCards.compile;
// Resolve BPMN link pairs when checking logical graph continuity.
const logicalFlows=result=>result.flows.filter(f=>!f.source.startsWith('Catch_')).map(f=>{const throwing=result.nodes.find(n=>n.id===f.target&&n.linkTarget);return throwing?{...f,target:result.flows.find(next=>next.source===throwing.linkTarget).target}:f;});
const task=(id,executor='Equipe',modo='Manual')=>({id,type:'task',nome:'Atividade '+id,executor,modo});
describe('esboço AS IS experimental por cards',()=>{
 it('gera BPMN com posições, raias e modos de execução reais',()=>{
  const result=compile([task('a','Servidor'),task('b','Sistema','Automatica'),task('c','Servidor','Semi-automatica')],'Processo');
  expect(result.xml).toContain('<bpmndi:BPMNDiagram');expect(result.xml).toContain('<bpmn:lane ');
  expect(result.xml).toContain('<bpmn:manualTask');expect(result.xml).toContain('<bpmn:serviceTask');expect(result.xml).toContain('<bpmn:userTask');
  expect(result.steps.map(s=>s.bpmn_id)).toEqual(['Card_a','Card_b','Card_c']);
  expect(logicalFlows(result).map(f=>[f.source,f.target])).toEqual([['Cards_start','Card_a'],['Card_a','Card_b'],['Card_b','Card_c'],['Card_c','Cards_end']]);
 });
 it('liga os dois caminhos de uma decisão antes de seguir o fluxo principal',()=>{
  const result=compile([{id:'d',type:'decision',nome:'Aprovar?',yes:[task('a')],no:[task('b')]},task('c')]);
  expect(logicalFlows(result)).toEqual(expect.arrayContaining([expect.objectContaining({source:'Card_d',target:'Card_a',label:'Sim'}),expect.objectContaining({source:'Card_d',target:'Card_b',label:'Não'}),expect.objectContaining({source:'Card_a',target:'Join_d'}),expect.objectContaining({source:'Card_b',target:'Join_d'}),expect.objectContaining({source:'Join_d',target:'Card_c'})]));
  expect(result.steps[1].vinculo_gw).toEqual({gw_ep_id:'ep-card-d',label:'Sim'});
  const a=result.nodes.find(n=>n.id==='Card_a'),b=result.nodes.find(n=>n.id==='Card_b');expect(a.y).not.toBe(b.y);
 });
 it('nomeia três ou mais saídas XOR e conecta o gateway com setas, sem links',()=>{
  for(const empty of [false,true]){
   const branches=['Aprovar','Devolver para ajustes','Arquivar','Encaminhar'].map((nome,index)=>({id:'b'+index,nome,cards:empty?[]:[task('branch'+index)]}));
   const result=compile([{id:'xor',type:'decision',nome:'Qual encaminhamento?',branches},task('next')]);
   expect(result.nodes.filter(n=>n.linkName)).toHaveLength(0);
   expect(result.flows.filter(f=>f.source==='Card_xor').map(f=>f.label)).toEqual(branches.map(b=>b.nome));
   expect(result.flows.filter(f=>f.target==='Join_xor')).toHaveLength(4);
   if(!empty)expect(result.steps.filter(step=>step.vinculo_gw).map(step=>step.vinculo_gw.label)).toEqual(branches.map(b=>b.nome));
  }
 });
 it('preserva ramos antigos e nomes livres em ramificações aninhadas com finais separados',()=>{
  const legacy={id:'old',type:'decision',nome:'Antiga',yes:[task('a')],no:[task('b')]},before=JSON.stringify(legacy);
  const result=compile([{id:'multi',type:'decision',nome:'Tipo?',join:false,branches:[{id:'p',nome:'Preferencial',cards:[legacy]},{id:'n',nome:'Normal',cards:[task('c')]},{id:'u',nome:'Urgente & especial',cards:[]}]}]);
  expect(JSON.stringify(legacy)).toBe(before);expect(result.nodes.filter(n=>n.type==='endEvent')).toHaveLength(3);
  expect(result.xml).toContain('Urgente &amp; especial');expect(result.nodes.some(n=>n.id==='Join_multi')).toBe(false);
 });
 it('repete a correção até o XOR ser positivo e só então continua o processo',()=>{
  const cards=[task('prepare'),{id:'check',type:'decision',nome:'Documentação completa?',branches:[{id:'ok',nome:'Completa',cards:[task('approve')]},{id:'fix',nome:'Precisa corrigir',cards:[task('fix'),{id:'retry',type:'return',nome:'Reavaliar',targetId:'check'}]}]},task('archive')];
  const result=compile(cards),flows=logicalFlows(result);
  expect(flows).toEqual(expect.arrayContaining([expect.objectContaining({source:'Card_fix',target:'Card_check'}),expect.objectContaining({source:'Card_approve',target:'Join_check'}),expect.objectContaining({source:'Join_check',target:'Card_archive'})]));
  expect(flows.some(flow=>flow.source==='Card_fix'&&flow.target==='Join_check')).toBe(false);
  expect(result.steps.some(step=>step.bpmn_id==='Card_retry')).toBe(false);
  expect(result.nodes.filter(node=>node.type==='endEvent')).toHaveLength(1);
 });
 it('permite retorno direto à decisão ou à preparação anterior e rejeita saltos para outro caminho',()=>{
  for(const targetId of ['check','prepare']){
   const result=compile([task('prepare'),{id:'check',type:'decision',nome:'Aprovar?',branches:[{id:'ok',nome:'Aprovado',cards:[]},{id:'redo',nome:'Refazer',cards:[{id:'retry',type:'return',nome:'Voltar',targetId}]}]}]);
   expect(logicalFlows(result)).toEqual(expect.arrayContaining([expect.objectContaining({source:'Card_check',target:'Card_'+targetId,label:'Refazer'})]));
  }
  expect(()=>compile([{id:'d',type:'decision',nome:'Escolher',yes:[task('a')],no:[{id:'r',type:'return',nome:'Voltar',targetId:'a'}]}])).toThrow(/etapa anterior/);
 });
 it('valida rótulos, quantidade e identidade dos caminhos',()=>{
  const compileBranches=branches=>compile([{id:'d',type:'decision',nome:'Escolher',branches}]);
  expect(()=>compileBranches([{id:'a',nome:'A',cards:[]}])).toThrow(/2 a 60/);
  expect(()=>compileBranches([{id:'a',nome:' ',cards:[]},{id:'b',nome:'B',cards:[]}])).toThrow(/nome/);
  expect(()=>compileBranches([{id:'a',nome:'A',cards:[]},{id:'a',nome:'B',cards:[]}])).toThrow(/duplicada/);
 });
 it('preserva IDs ao reordenar e não altera os cards de entrada',()=>{
  const cards=[task('a'),task('b')],before=JSON.stringify(cards);
  const first=compile(cards),second=compile([...cards].reverse());
  expect(first.steps[0].id).toBe(second.steps[1].id);expect(JSON.stringify(cards)).toBe(before);
 });
 it('aceita caminhos vazios e protege os textos no XML',()=>{
  const result=compile([{id:'d',type:'decision',nome:'<script>&"?',yes:[],no:[]}]);
  expect(result.xml).toContain('&lt;script&gt;&amp;&quot;?');expect(result.xml).not.toContain('<script>');
  expect(result.flows.filter(f=>f.source==='Card_d').map(f=>f.label)).toEqual(['Sim','Não']);
 });
 it('gera paralelo, inclusivo, espera temporizada e finais independentes',()=>{
  for(const type of ['decision','parallel','inclusive']){
   const result=compile([{id:'split',type,nome:'Separar',join:false,yes:[{id:'w',type:'wait',nome:'Aguardar',duration:'P1D'},{id:'e',type:'end',nome:'Final A'}],no:[task('b')]}],'Teste',{nome:'Solicitação recebida'});
   expect(result.xml).toContain('Solicitação recebida');expect(result.xml).toContain('<bpmn:timeDuration>P1D</bpmn:timeDuration>');
   expect(result.nodes.filter(n=>n.type==='endEvent')).toHaveLength(2);
   expect(result.nodes.some(n=>n.id==='Join_split')).toBe(false);
   expect(result.flows.filter(f=>result.nodes.find(n=>n.id===f.source)?.type==='endEvent')).toHaveLength(0);
   expect(result.nodes.filter(n=>n.linkTarget).every(n=>result.nodes.some(target=>target.id===n.linkTarget&&target.linkSource===n.id))).toBe(true);
  }
 });
 it('impede atividades inalcançáveis e esperas inválidas',()=>{
  expect(()=>compile([{id:'end',type:'end',nome:'Fim'},task('a')])).toThrow(/após/);
  expect(()=>compile([{id:'w',type:'wait',nome:'Espera',duration:'ontem'}])).toThrow(/duração/);
 });
 it('não cruza segmentos nem atravessa elementos em ramificações aninhadas',()=>{
  const decision=(id,yes,no)=>({id,type:'decision',nome:'Decidir',yes,no});
  const result=compile([task('first'),decision('d',[task('a'),decision('nested',[task('b')],[task('c','Outro')])],[task('x','Outro')]),task('last')]);
  const byId=new Map(result.nodes.map(n=>[n.id,n]));
  const segments=result.flows.flatMap(f=>{const a=byId.get(f.source),b=byId.get(f.target),points=f.points||[{x:a.x+a.width,y:a.y+a.height/2},{x:b.x,y:b.y+b.height/2}];return points.slice(1).map((point,index)=>({f,a:points[index],b:point}));});
  const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
   const s=segments[i],t=segments[j];
   const intersects=cross(s.a,s.b,t.a)*cross(s.a,s.b,t.b)<0&&cross(t.a,t.b,s.a)*cross(t.a,t.b,s.b)<0;
   expect(intersects,`${s.f.id} cruza ${t.f.id}`).toBe(false);
  }
  for(const s of segments)for(const n of result.nodes){
   if(n.id===s.f.source||n.id===s.f.target)continue;
   // Sample all routed segments to detect lines passing through unrelated BPMN elements.
   for(let t=0;t<=1;t+=0.025){const x=s.a.x+(s.b.x-s.a.x)*t,y=s.a.y+(s.b.y-s.a.y)*t;expect(x>n.x&&x<n.x+n.width&&y>n.y&&y<n.y+n.height,`${s.f.id} atravessa ${n.id}`).toBe(false);}
  }
 });
 it('rejeita nomes vazios, tipos não suportados e identidades duplicadas',()=>{
  expect(()=>compile([{...task('a'),nome:''}])).toThrow(/nome/);
  expect(()=>compile([{...task('a'),type:'unknown'}])).toThrow();
  expect(()=>compile([task('a'),task('a')])).toThrow(/duplicada/);
 });
});
