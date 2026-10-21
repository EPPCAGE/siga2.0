import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe,it,expect} from 'vitest';
const scope={};runInNewContext(readFileSync('src/shared/asis-cards.js','utf8'),scope);
const compile=scope.AsIsCards.compile;
// Resolve BPMN link pairs when checking logical graph continuity.
const logicalFlows=result=>result.flows.filter(f=>!f.source.startsWith('Catch_')).map(f=>{const throwing=result.nodes.find(n=>n.id===f.target&&n.linkTarget);return throwing?{...f,target:result.flows.find(next=>next.source===throwing.linkTarget).target}:f;});
const task=(id,executor='Equipe',modo='Manual')=>({id,type:'task',nome:'Atividade '+id,executor,modo});
describe('esboço AS IS experimental por cards',()=>{
 it('mantém sequências e marcos compactos com espaço para setas',()=>{
  for(const milestone of ['', 'Execução']){
   const result=compile(['a','b','c','d'].map(id=>({...task(id),milestone})));
   const activities=result.nodes.filter(node=>node.type.endsWith('Task'));
   for(let index=1;index<activities.length;index++){
    const gap=activities[index].x-activities[index-1].x-activities[index-1].width;
    expect(gap).toBeGreaterThanOrEqual(60);expect(gap).toBeLessThanOrEqual(100);
   }
   expect(result.nodes.filter(node=>node.linkName)).toHaveLength(0);
  }
 });
 it('gera BPMN com posições, raias e modos de execução reais',()=>{
  const result=compile([task('a','Servidor'),task('b','Sistema','Automatica'),task('c','Servidor','Semi-automatica')],'Processo');
  expect(result.xml).toContain('<bpmndi:BPMNDiagram');expect(result.xml).toContain('<bpmn:lane ');
  expect(result.xml).toContain('<bpmn:manualTask');expect(result.xml).toContain('<bpmn:serviceTask');expect(result.xml).toContain('<bpmn:userTask');
  expect(result.steps.map(s=>s.bpmn_id)).toEqual(['Card_a','Card_b','Card_c']);
  expect(logicalFlows(result).map(f=>[f.source,f.target])).toEqual([['Cards_start','Card_a'],['Card_a','Card_b'],['Card_b','Card_c'],['Card_c','Cards_end']]);
 });
 it('integra início, decisões, junções e finais às raias existentes em cards antigos',()=>{
  const cards=[task('a'),{id:'d',type:'decision',nome:'Aprovar?',yes:[task('b')],no:[task('c')]}],before=JSON.stringify(cards),result=compile(cards);
  expect([...new Set(result.nodes.map(node=>node.owner))]).toEqual(['Equipe']);
  for(const id of ['Cards_start','Card_d','Join_d','Cards_end'])expect(result.nodes.find(node=>node.id===id).owner).toBe('Equipe');
  expect(result.xml).not.toContain('Fluxo e decisões');expect(result.steps.find(step=>step.bpmn_id==='Card_d').executor).toBe('Equipe');
  expect(JSON.stringify(cards)).toBe(before);
 });
 it('respeita responsáveis explícitos dos eventos e gateways e mantém a junção na raia escolhida',()=>{
  const result=compile([task('a','Protocolo'),{id:'d',type:'decision',nome:'Aprovar?',executor:'Gestão',yes:[{id:'w',type:'wait',nome:'Aguardar',executor:'Protocolo'}],no:[task('b','Protocolo')]},{id:'e',type:'end',nome:'Encerrar',executor:'Gestão'}],'Teste',{nome:'Iniciar',executor:'Gestão'});
  const owners=Object.fromEntries(result.nodes.map(node=>[node.id,node.owner]));
  expect(owners).toMatchObject({Cards_start:'Gestão',Card_a:'Protocolo',Card_d:'Gestão',Join_d:'Gestão',Card_w:'Protocolo',Card_e:'Gestão'});
  expect([...new Set(Object.values(owners))].sort()).toEqual(['Gestão','Protocolo']);
  expect(result.steps.find(step=>step.bpmn_id==='Card_w').executor).toBe('Protocolo');
 });
 it('herda responsáveis na sequência e usa uma única raia se nenhum foi informado',()=>{
  const result=compile([task('a','Protocolo'),{id:'w',type:'wait',nome:'Aguardar'},task('b','Gestão')]);
  const owner=id=>result.nodes.find(node=>node.id===id).owner;
  expect(owner('Cards_start')).toBe('Protocolo');expect(owner('Card_w')).toBe('Protocolo');expect(owner('Cards_end')).toBe('Gestão');
  expect([...new Set(compile([]).nodes.map(node=>node.owner))]).toEqual(['Responsável não informado']);
 });
 it('lista os responsáveis do próprio processo sem repetir diferenças de caixa',()=>{
  const cards=[task('a','GESTÃO'),{id:'d',type:'decision',nome:'Escolher?',executor:'gestão',yes:[{id:'w',type:'wait',nome:'Espera',executor:'Apoio'}],no:[{id:'e',type:'end',nome:'Fim',executor:'APOIO'}]}];
  const before=JSON.stringify(cards);
  expect(scope.AsIsCards.ownersOf(cards,{executor:' Gestão '})).toEqual(['Gestão','Apoio']);
  expect(scope.AsIsCards.ownersOf([task('other','Outra equipe')])).toEqual(['Outra equipe']);
  expect(scope.AsIsCards.ownersOf([task('accent','Gestao'),task('accented','Gestão')])).toEqual(['Gestao','Gestão']);
  expect(JSON.stringify(cards)).toBe(before);
 });
 it('gera uma única raia para nomes equivalentes e normaliza o responsável das etapas',()=>{
  const cards=[task('a','GESTÃO'),{id:'d',type:'decision',nome:'Escolher?',executor:'gestão',yes:[{id:'w',type:'wait',nome:'Espera',executor:'gEsTãO'}],no:[task('b','Gestão')]}];
  const result=compile(cards,'Teste',{executor:' Gestão '});
  expect([...new Set(result.nodes.map(node=>node.owner))]).toEqual(['Gestão']);
  expect([...new Set(result.steps.map(step=>step.executor))]).toEqual(['Gestão']);
  expect((result.xml.match(/<bpmn:lane /g)||[])).toHaveLength(1);
 });
 it('cria marcos reutilizáveis e posiciona cada atividade na faixa correspondente',()=>{
  const cards=[{...task('a','Equipe'),milestone:' Planejamento '},{...task('b','Outra equipe'),milestone:'PLANEJAMENTO'},{...task('c'),milestone:'Execução'},task('livre')],before=JSON.stringify(cards);
  expect(scope.AsIsCards.milestonesOf(cards)).toEqual(['Planejamento','Execução']);
  const result=compile(cards);expect(result.milestones.map(phase=>phase.name)).toEqual(['Planejamento','Execução']);
  expect(result.xml).toContain('siga:milestone="true"');expect(result.xml).toContain('siga:milestoneName="Planejamento"');
  for(const id of ['a','b','c']){const node=result.nodes.find(item=>item.id==='Card_'+id),phase=result.milestones.find(item=>item.name===node.milestone);expect(node.x).toBeGreaterThan(phase.x);expect(node.x+node.width).toBeLessThan(phase.x+phase.width);}
  const free=result.nodes.find(item=>item.id==='Card_livre');expect(free.milestone).toBe('');expect(result.milestones.some(phase=>free.x<phase.x+phase.width&&free.x+free.width>phase.x)).toBe(false);
  expect(result.steps.find(item=>item.bpmn_id==='Card_b').milestone).toBe('Planejamento');expect(JSON.stringify(cards)).toBe(before);
 });
 it('recupera marcos de atividades aninhadas, escapa seus nomes e não cria marco para campo vazio',()=>{
  const result=compile([{id:'d',type:'decision',nome:'Escolher',yes:[{...task('a'),milestone:'Análise <A&B>'}],no:[{...task('b'),milestone:'análise <a&b>'}]}]);
  expect(result.milestones).toHaveLength(1);expect(result.xml).toContain('Análise &lt;A&amp;B&gt;');expect(result.validation.valid).toBe(true);
  expect(compile([{...task('empty'),milestone:'   '}]).milestones).toEqual([]);
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
 it('distribui saídas entre as pontas do gateway sem sobrepor trechos de setas',()=>{
  for(const count of [2,3,4,6]){
   const branches=Array.from({length:count},(_,index)=>({id:'b'+index,nome:'Caminho '+index,cards:[task('t'+index)]}));
   const result=compile([{id:'g',type:'decision',nome:'Escolher',branches}]);
   const outgoing=result.flows.filter(flow=>flow.source==='Card_g');
   expect(new Set(outgoing.map(flow=>JSON.stringify(flow.points[0]))).size).toBe(Math.min(4,count));
   const segments=result.flows.flatMap(flow=>flow.points.slice(1).map((point,index)=>[flow.points[index],point]));
   const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
   for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
    const [a,b]=segments[i],[c,d]=segments[j];
    if(cross(a,b,c)!==0||cross(a,b,d)!==0)continue;
    const axis=a.x===b.x?'y':'x',overlap=Math.min(Math.max(a[axis],b[axis]),Math.max(c[axis],d[axis]))-Math.max(Math.min(a[axis],b[axis]),Math.min(c[axis],d[axis]));
    expect(overlap).toBeLessThanOrEqual(0);
   }
  }
 });
 it('usa links acima de três raias e mantém setas entre até três',()=>{
  const result=compile([task('a','A'),task('b','B'),task('c','C'),task('d','D'),task('e','A')]);
  const jump=result.flows.find(flow=>flow.source==='Card_d');
  expect(result.nodes.find(node=>node.id===jump.target).type).toBe('intermediateThrowEvent');
  expect(logicalFlows(result)).toEqual(expect.arrayContaining([expect.objectContaining({source:'Card_d',target:'Card_e'})]));
  const owners=[...new Set(result.nodes.map(node=>node.owner))],byId=new Map(result.nodes.map(node=>[node.id,node]));
  for(const flow of result.flows)expect(Math.abs(owners.indexOf(byId.get(flow.source).owner)-owners.indexOf(byId.get(flow.target).owner))).toBeLessThanOrEqual(2);
  const adjacent=compile([task('a','A'),task('b','B')]);expect(adjacent.nodes.filter(node=>node.linkName)).toHaveLength(0);
  const three=compile([task('a','A'),task('b','B'),task('c','C'),task('d','A')]);
  expect(three.flows).toEqual(expect.arrayContaining([expect.objectContaining({source:'Card_c',target:'Card_d'})]));
  expect(three.nodes.filter(node=>node.linkName)).toHaveLength(0);
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
  expect(flows).toEqual(expect.arrayContaining([expect.objectContaining({source:'Card_fix',target:'Card_check'}),expect.objectContaining({source:'Card_approve',target:'Card_archive'})]));
  expect(result.nodes.some(node=>node.id==='Join_check')).toBe(false);
  expect(result.steps.some(step=>step.bpmn_id==='Card_retry')).toBe(false);
  expect(result.nodes.filter(node=>node.type==='endEvent')).toHaveLength(1);
 });
 it('não cria uma junção para uma única saída e preserva seu rótulo',()=>{
  for(const tail of [[],[task('next')]]){
   const result=compile([task('before'),{id:'d',type:'decision',nome:'Prosseguir?',branches:[{id:'ok',nome:'Aprovado',cards:[]},{id:'retry',nome:'Revisar',cards:[{id:'r',type:'return',nome:'Voltar',targetId:'before'}]}]},...tail]);
   expect(result.nodes.some(node=>node.id==='Join_d')).toBe(false);
   expect(logicalFlows(result)).toEqual(expect.arrayContaining([expect.objectContaining({source:'Card_d',target:tail.length?'Card_next':'Cards_end',label:'Aprovado'})]));
  }
  const result=compile([{id:'d',type:'decision',nome:'Continuar?',yes:[{id:'e',type:'end',nome:'Final alternativo'}],no:[task('b')]},task('c')]);
  expect(result.nodes.some(node=>node.id==='Join_d')).toBe(false);
  expect(logicalFlows(result)).toEqual(expect.arrayContaining([expect.objectContaining({source:'Card_b',target:'Card_c'})]));
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
