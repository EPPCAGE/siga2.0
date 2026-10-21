(function(scope){
  const escape=value=>String(value??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
  // Official XML namespace identifiers, not network URLs. HTTPS would define different namespaces.
  const diagramNamespaces={
    di:'http://www.omg.org/spec/DD/20100524/DI', // NOSONAR: namespace XML oficial do DI; não há requisição HTTP.
    bpmndi:'http://www.omg.org/spec/BPMN/20100524/DI', // NOSONAR: namespace XML oficial do BPMN DI; não há requisição HTTP.
    dc:'http://www.omg.org/spec/DD/20100524/DC', // NOSONAR: namespace XML oficial do DC; não há requisição HTTP.
  };
  function branchesOf(card){
    return card.branches || [{id:'yes',nome:card.type==='decision'?'Sim':'Caminho A',cards:card.yes||[]},{id:'no',nome:card.type==='decision'?'Não':'Caminho B',cards:card.no||[]}];
  }
  const ownerKey=value=>String(value || '').trim().normalize('NFC').toLocaleLowerCase('pt-BR');
  function ownersOf(cards,startInfo={}){
    const owners=new Map();
    function add(value){const name=String(value || '').trim().normalize('NFC');if(name&&!owners.has(ownerKey(name)))owners.set(ownerKey(name),name);}
    function walk(items){for(const card of items){if(card.type!=='return')add(card.executor);if(['decision','parallel','inclusive'].includes(card.type))branchesOf(card).forEach(branch=>walk(branch.cards));}}
    add(startInfo.executor);walk(cards);return [...owners.values()];
  }
  // Orthogonal visibility grid: search free corridors before considering a BPMN link.
  function routeArrow(source,target,nodes,routed,flow,lanes=[]){
    const vectors={right:[1,0],left:[-1,0],top:[0,-1],bottom:[0,1]},dock=(node,side)=>({x:node.x+node.width/2+vectors[side][0]*node.width/2,y:node.y+node.height/2+vectors[side][1]*node.height/2});
    const same=(a,b)=>a.x===b.x&&a.y===b.y;
    const used=(node,side,outputOnly=false,inputOnly=false)=>routed.some(other=>!inputOnly&&other.source===node.id&&same(other.points[0],dock(node,side))||!outputOnly&&other.target===node.id&&same(other.points.at(-1),dock(node,side)));
    const sourceLane=lanes.findIndex(lane=>lane.owner===source.owner),targetLane=lanes.findIndex(lane=>lane.owner===target.owner);
    if(sourceLane>=0&&targetLane>=0&&Math.abs(sourceLane-targetLane)>1)return null;
    let bands=[null];
    if(sourceLane>=0&&targetLane>=0){
      const low=Math.min(sourceLane,targetLane),high=Math.max(sourceLane,targetLane);bands=[[lanes[low].y,lanes[high].y+lanes[high].height]];
      if(low===high){if(low>0)bands.push([lanes[low-1].y,lanes[high].y+lanes[high].height]);if(high+1<lanes.length)bands.push([lanes[low].y,lanes[high+1].y+lanes[high+1].height]);}
    }
    for(const reuse of [false,true]){
      let best=null,bestCost=Infinity;
      for(const [exit,entry] of [['right','left'],['right','top'],['right','bottom'],['bottom','left'],['top','left'],['bottom','top'],['top','bottom'],['bottom','bottom'],['top','top'],['left','left'],['right','right'],['left','top'],['left','bottom'],['bottom','right'],['top','right'],['left','right']]){
        if(source===target&&exit===entry)continue;
        if(!reuse&&(used(source,exit,true)||used(target,entry,false,true)))continue;
        const exitOffsets=used(source,exit)?[-24,24,-48,48]:[0],entryOffsets=used(target,entry)?[-24,24,-48,48]:[0];
        for(const exitOffset of exitOffsets)for(const entryOffset of entryOffsets)for(const band of bands){
          const points=routeDock(source,target,nodes,routed,flow,exit,entry,exitOffset,entryOffset,band);if(!points)continue;
          const length=points.slice(1).reduce((sum,point,index)=>sum+Math.abs(point.x-points[index].x)+Math.abs(point.y-points[index].y),0),cost=length+(points.length-2)*35;
          if(cost<bestCost){best=points;bestCost=cost;}
          if(!exitOffset&&!entryOffset&&exit==='right'&&entry==='left'&&length<=Math.abs(points[0].x-points.at(-1).x)+Math.abs(points[0].y-points.at(-1).y)+48)return points;
        }
      }
      if(best)return best;
    }
    return null;
  }
  function routeDock(source,target,nodes,routed,flow,exit,entry,exitOffset=0,entryOffset=0,band=null){
    const vectors={right:[1,0],left:[-1,0],top:[0,-1],bottom:[0,1]};
    const dock=(node,side)=>({x:node.x+node.width/2+vectors[side][0]*node.width/2,y:node.y+node.height/2+vectors[side][1]*node.height/2});
    const actualFrom=dock(source,exit),actualTo=dock(target,entry);
    const tip=(point,side,offset)=>offset?{x:point.x+vectors[side][0]*24-vectors[side][1]*offset,y:point.y+vectors[side][1]*24+vectors[side][0]*offset}:point;
    const from=tip(actualFrom,exit,exitOffset),to=tip(actualTo,entry,entryOffset);
    if(band&&[actualFrom,actualTo,from,to].some(point=>point.y<band[0]||point.y>band[1]))return null;
    const xs=[...new Set([from.x,to.x,...nodes.flatMap(n=>[n.x-24,n.x+n.width+24])])].sort((a,b)=>a-b);
    const ys=[...new Set([from.y,to.y,...nodes.flatMap(n=>[n.y-24,n.y+n.height+24,n.y+n.height/2])])].filter(y=>!band||y>=band[0]&&y<=band[1]).sort((a,b)=>a-b);
    const segments=points=>points.slice(1).map((p,i)=>[points[i],p]);
    function blocked(a,b){
      if(nodes.some(n=>{
        if(n===source&&exitOffset&&a===actualFrom&&b===from)return false;
        if(n===target&&entryOffset&&a===to&&b===actualTo)return false;
        const corridor=side=>{
          if(side==='right')return a.y===n.y+n.height/2&&b.y===a.y&&Math.min(a.x,b.x)>=n.x+n.width;
          if(side==='left')return a.y===n.y+n.height/2&&b.y===a.y&&Math.max(a.x,b.x)<=n.x;
          if(side==='top')return a.x===n.x+n.width/2&&b.x===a.x&&Math.max(a.y,b.y)<=n.y;
          return a.x===n.x+n.width/2&&b.x===a.x&&Math.min(a.y,b.y)>=n.y+n.height;
        };
        if((n===source&&corridor(exit))||(n===target&&corridor(entry)))return false;
        const left=n.x-12,right=n.x+n.width+12,top=n.y-12,bottom=n.y+n.height+12;
        let min=0,max=1;
        for(const [origin,delta,lower,upper] of [[a.x,b.x-a.x,left,right],[a.y,b.y-a.y,top,bottom]]){
          if(!delta){if(origin<=lower||origin>=upper)return false;continue;}
          const first=(lower-origin)/delta,last=(upper-origin)/delta;min=Math.max(min,Math.min(first,last));max=Math.min(max,Math.max(first,last));if(max<=min)return false;
        }
        return max>min;
      }))return true;
      return routed.some(other=>segments(other.points).some(([c,d])=>{
        const equal=(p,q)=>p.x===q.x&&p.y===q.y,cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
        const on=(p,q,r)=>cross(p,q,r)===0&&r.x>=Math.min(p.x,q.x)&&r.x<=Math.max(p.x,q.x)&&r.y>=Math.min(p.y,q.y)&&r.y<=Math.max(p.y,q.y);
        const common=[];
        if(other.source===flow.source||other.source===flow.target)common.push(other.points[0]);
        if(other.target===flow.target||other.target===flow.source)common.push(other.points.at(-1));
        const allowed=point=>common.some(origin=>equal(origin,point))&&(equal(point,actualFrom)||equal(point,actualTo));
        if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return true;
        if(cross(a,b,c)===0&&cross(a,b,d)===0){
          const axis=a.x===b.x?'y':'x',low=Math.max(Math.min(a[axis],b[axis]),Math.min(c[axis],d[axis])),high=Math.min(Math.max(a[axis],b[axis]),Math.max(c[axis],d[axis]));
          if(high>low)return true;
        }
        return [c,d].some(point=>on(a,b,point)&&!allowed(point))||[a,b].some(point=>on(c,d,point)&&!allowed(point));
      }));
    }
    if(exitOffset&&blocked(actualFrom,from)||entryOffset&&blocked(to,actualTo))return null;
    // A* with turn cost favors short, readable routes. Keep direction in the state.
    const heap=[];
    function push(item){heap.push(item);let i=heap.length-1;while(i){const parent=(i-1)>>1;if(heap[parent].score<=item.score)break;heap[i]=heap[parent];i=parent;}heap[i]=item;}
    function pop(){const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].score<heap[child].score)child++;if(heap[child].score>=last.score)break;heap[i]=heap[child];i=child;}heap[i]=last;}return first;}
    const startX=xs.indexOf(from.x),startY=ys.indexOf(from.y),endX=xs.indexOf(to.x),endY=ys.indexOf(to.y);
    const key=(x,y,direction)=>((y*xs.length+x)*3+direction),costs=new Map(),edgeCache=new Map();
    push({x:startX,y:startY,direction:0,cost:0,score:0,parent:null});
    while(heap.length){
      const current=pop(),state=key(current.x,current.y,current.direction);
      if(costs.has(state)&&costs.get(state)<current.cost)continue;
      if(current.x===endX&&current.y===endY){
        const points=[];for(let item=current;item;item=item.parent)points.push({x:xs[item.x],y:ys[item.y]});points.reverse();if(exitOffset)points.unshift(actualFrom);if(entryOffset)points.push(actualTo);
        return points.filter((point,index)=>!index||index===points.length-1||!((points[index-1].x===point.x&&point.x===points[index+1].x)||(points[index-1].y===point.y&&point.y===points[index+1].y)));
      }
      for(const [dx,dy,direction] of [[1,0,1],[0,1,2],[0,-1,2],[-1,0,1]]){
        const x=current.x+dx,y=current.y+dy;if(x<0||y<0||x>=xs.length||y>=ys.length)continue;
        const a={x:xs[current.x],y:ys[current.y]},b={x:xs[x],y:ys[y]};
        // Leave and enter the shape through their docking sides.
        if(!current.parent&&(dx!==vectors[exit][0]||dy!==vectors[exit][1]))continue;if(x===endX&&y===endY&&(dx!==-vectors[entry][0]||dy!==-vectors[entry][1]))continue;
        const edgeKey=[current.x,current.y,x,y].join(',');if(!edgeCache.has(edgeKey))edgeCache.set(edgeKey,blocked(a,b));if(edgeCache.get(edgeKey))continue;
        const cost=current.cost+Math.abs(a.x-b.x)+Math.abs(a.y-b.y)+(current.direction&&current.direction!==direction?35:0),next=key(x,y,direction);
        if(costs.has(next)&&costs.get(next)<=cost)continue;costs.set(next,cost);
        push({x,y,direction,cost,score:cost+Math.abs(b.x-to.x)+Math.abs(b.y-to.y),parent:current});
      }
    }
    return null;
  }
  function validateGraph(nodes, flows, options = {}) {
    const errors = [], warnings = [], byId = new Map(), edgeIds = new Set();
    const issue = (list, code, message, nodeIds = []) => {
      if (!list.some(item => item.code === code && item.nodeIds.join('|') === nodeIds.join('|'))) list.push({code, message, nodeIds});
    };
    const names = ids => ids.map(id => {const node=byId.get(id);return '“' + (node?.label || (node?.ownerFrom?'Reencontro de '+byId.get(node.ownerFrom)?.label:id)) + '”';}).join(', ');
    const result = analysis => ({valid: errors.length === 0, errors, warnings, analysis});
    for (const node of nodes) {
      if (!node.id || byId.has(node.id)) issue(errors, 'NODE_ID', 'Há um elemento sem identidade ou com identidade duplicada.', [node.id]);
      byId.set(node.id, node);
    }
    const edges = [];
    for (const flow of flows) {
      if (!flow.id || edgeIds.has(flow.id)) issue(errors, 'FLOW_ID', 'Há uma ligação sem identidade ou com identidade duplicada.');
      edgeIds.add(flow.id);
      if (!byId.has(flow.source) || !byId.has(flow.target)) issue(errors, 'BROKEN_FLOW', 'Há uma seta com origem ou destino inexistente.', [flow.source, flow.target]);
      else edges.push({...flow});
    }
    // Link events are a continuation of the same execution, rather than separate starts/ends.
    for (const node of nodes.filter(item => item.linkName || item.linkTarget || item.linkSource)) {
      const pair = byId.get(node.linkTarget || node.linkSource);
      const throwing = node.type === 'intermediateThrowEvent';
      if (!pair || !node.linkName || pair.linkName !== node.linkName || (throwing ? pair.type !== 'intermediateCatchEvent' || pair.linkSource !== node.id : pair.type !== 'intermediateThrowEvent' || pair.linkTarget !== node.id)) {
        issue(errors, 'BROKEN_LINK', 'O link ' + names([node.id]) + ' não tem um par correspondente válido.', [node.id]);
      } else if (throwing) edges.push({id: 'Virtual_' + node.id, source: node.id, target: pair.id});
    }
    if (errors.length) return result({complete: false, states: 0});
    const incoming = new Map(nodes.map(node => [node.id, []])), outgoing = new Map(nodes.map(node => [node.id, []]));
    edges.forEach((edge, index) => {incoming.get(edge.target).push(index); outgoing.get(edge.source).push(index);});
    const starts = nodes.filter(node => node.type === 'startEvent'), ends = nodes.filter(node => node.type === 'endEvent');
    if (starts.length !== 1) issue(errors, 'START_COUNT', 'O processo deve ter exatamente um início.', starts.map(node => node.id));
    if (!ends.length) issue(errors, 'NO_END', 'O processo não tem encerramento. Inclua uma saída que chegue a um final.');
    for (const node of nodes) {
      const ins = incoming.get(node.id).length, outs = outgoing.get(node.id).length;
      if (node.type === 'startEvent' && ins) issue(errors, 'START_INCOMING', 'O início não pode receber setas de retorno.', [node.id]);
      if (node.type === 'endEvent' && outs) issue(errors, 'END_OUTGOING', 'O encerramento ' + names([node.id]) + ' não pode ter saída.', [node.id]);
      if (node.type !== 'startEvent' && !ins) issue(errors, 'LOOSE_INPUT', names([node.id]) + ' está sem ligação de entrada.', [node.id]);
      if (node.type !== 'endEvent' && !outs) issue(errors, 'LOOSE_OUTPUT', names([node.id]) + ' está sem ligação de saída.', [node.id]);
    }
    function reach(seeds, reverse = false, excluded = null) {
      const visited = new Set(seeds.filter(id => id !== excluded)), queue = [...visited];
      for (let index = 0; index < queue.length; index++) {
        for (const edgeIndex of (reverse ? incoming : outgoing).get(queue[index]) || []) {
          const next = edges[edgeIndex][reverse ? 'source' : 'target'];
          if (next !== excluded && !visited.has(next)) {visited.add(next); queue.push(next);}
        }
      }
      return visited;
    }
    const reachable = reach(starts.map(node => node.id)), canFinish = reach(ends.map(node => node.id), true);
    const unreachable = nodes.filter(node => !reachable.has(node.id)).map(node => node.id);
    if (unreachable.length) issue(errors, 'UNREACHABLE', 'Há etapas que não podem ser alcançadas a partir do início: ' + names(unreachable) + '.', unreachable);
    // Strongly connected components distinguish a permitted repeat from a closed loop.
    let serial = 0;
    const indices = new Map(), low = new Map(), stack = [], onStack = new Set(), closed = new Set();
    function visit(id) {
      indices.set(id, serial); low.set(id, serial++); stack.push(id); onStack.add(id);
      for (const index of outgoing.get(id)) {
        const next = edges[index].target;
        if (!indices.has(next)) {visit(next); low.set(id, Math.min(low.get(id), low.get(next)));}
        else if (onStack.has(next)) low.set(id, Math.min(low.get(id), indices.get(next)));
      }
      if (low.get(id) !== indices.get(id)) return;
      const component = []; let next;
      do {next = stack.pop(); onStack.delete(next); component.push(next);} while (next !== id);
      if (!reachable.has(id) || (component.length === 1 && !outgoing.get(id).some(index => edges[index].target === id))) return;
      if (!component.some(member => canFinish.has(member))) {
        component.forEach(member => closed.add(member));
        issue(errors, 'CLOSED_LOOP', 'Ciclo sem saída em ' + names(component) + '. Inclua um caminho que permita chegar a um encerramento.', component);
      } else {
        issue(warnings, 'LOOP_WITH_EXIT', 'Há repetição em ' + names(component) + '. Existe saída para um final; revise as condições para que ela possa ser escolhida.', component);
        const members = new Set(component);
        for (const member of component) {
          const node = byId.get(member);
          if (['parallelGateway', 'inclusiveGateway'].includes(node.type) && outgoing.get(member).length > 1 && outgoing.get(member).some(index => !members.has(edges[index].target))) {
            issue(errors, 'FORK_REENTRY', 'Um retorno reabre ' + names([member]) + ' antes de concluir seus caminhos. Isso pode acumular execuções ou travar a junção. Faça o retorno depois do reencontro ou dentro de um único caminho.', [member]);
          }
        }
      }
    }
    nodes.forEach(node => {if (!indices.has(node.id)) visit(node.id);});
    const stranded = nodes.filter(node => reachable.has(node.id) && !canFinish.has(node.id) && !closed.has(node.id)).map(node => node.id);
    if (stranded.length) issue(errors, 'NO_PATH_TO_END', 'Estas etapas não têm caminho até um encerramento: ' + names(stranded) + '.', stranded);
    if (errors.length) return result({complete: false, states: 0});
    // Explore possible token markings, including XOR choices and non-empty OR subsets.
    const maxStates = Math.max(1, options.maxStates || 3000), maxTransitions = Math.max(1, options.maxTransitions || 20000), maxTokens = Math.max(1, options.maxTokens || 48);
    let complete = true, transitions = 0;
    const limited = () => {complete = false; issue(warnings, 'ANALYSIS_LIMIT', 'A análise de execuções atingiu o limite de complexidade. A estrutura foi verificada, mas os cenários de sincronização precisam de revisão.');};
    const choices = new Map();
    for (const node of nodes) {
      const outs = outgoing.get(node.id);
      if (node.type === 'exclusiveGateway') choices.set(node.id, outs.map(index => [index]));
      else if (node.type === 'inclusiveGateway' && outs.length > 1) {
        if (outs.length <= 6) {
          const subsets = [];
          for (let mask = 1; mask < 2 ** outs.length; mask++) subsets.push(outs.filter((_, index) => mask & (1 << index)));
          choices.set(node.id, subsets);
        } else {choices.set(node.id, [...outs.map(index => [index]), outs]); limited();}
      } else choices.set(node.id, [outs]);
    }
    const joinReach = new Map();
    for (const node of nodes.filter(item => item.type === 'inclusiveGateway' && incoming.get(item.id).length > 1)) {
      joinReach.set(node.id, new Map(incoming.get(node.id).map(index => [index, reach([edges[index].source], true, node.id)])));
    }
    const initial = Array(edges.length).fill(0); outgoing.get(starts[0].id).forEach(index => initial[index]++);
    const key = state => state.join(','), queue = [initial], seen = new Set([key(initial)]);
    for (let cursor = 0; cursor < queue.length && transitions < maxTransitions; cursor++) {
      const state = queue[cursor]; if (!state.some(Boolean)) continue;
      let enabled = false;
      for (const node of nodes) {
        if (node.type === 'startEvent') continue;
        const ins = incoming.get(node.id), marked = ins.filter(index => state[index] > 0);
        if (!marked.length) continue;
        let consumptions;
        if (node.type === 'parallelGateway') {if (marked.length !== ins.length) continue; consumptions = [ins];}
        else if (node.type === 'inclusiveGateway' && ins.length > 1) {
          const waiting = ins.filter(index => !state[index]).some(missing => edges.some((edge, index) => state[index] && edge.target !== node.id && joinReach.get(node.id).get(missing).has(edge.target)));
          if (waiting) continue; consumptions = [marked];
        } else consumptions = marked.map(index => [index]);
        enabled = true;
        for (const consume of consumptions) for (const produce of choices.get(node.id)) {
          if (++transitions > maxTransitions) {limited(); break;}
          const next = [...state]; consume.forEach(index => next[index]--); produce.forEach(index => next[index]++);
          if (next.reduce((sum, count) => sum + count, 0) > maxTokens) {limited(); continue;}
          const nextKey = key(next); if (seen.has(nextKey)) continue;
          if (seen.size >= maxStates) {limited(); continue;}
          seen.add(nextKey); queue.push(next);
        }
      }
      if (!enabled) {
        const blocked = [...new Set(edges.filter((_, index) => state[index]).map(edge => edge.target))];
        complete = false;
        issue(errors, 'DEADLOCK', 'Há uma execução que fica parada em ' + names(blocked) + '. Confira se todos os caminhos esperados pela junção podem chegar até ela.', blocked);
        break;
      }
    }
    if (transitions >= maxTransitions) limited();
    return result({complete, states: seen.size});
  }
  function captureLayout(modeler){
    const elements=modeler.get('elementRegistry').getAll(),owners=new Map(),lanes=new Map(),shapes={},connections={},counts=new Map();
    const bounds=element=>({x:element.x,y:element.y,width:element.width,height:element.height});
    for(const lane of elements.filter(element=>element.type==='bpmn:Lane')){
      const owner=ownerKey(lane.businessObject.name);lanes.set(owner,bounds(lane));
      (lane.businessObject.flowNodeRef||[]).forEach(node=>owners.set(node.id,owner));
    }
    for(const element of elements.filter(item=>!item.waypoints)){
      if(!['x','y','width','height'].every(key=>Number.isFinite(element[key]))||element.width<=0||element.height<=0)continue;
      const target=element.labelTarget || element,owner=owners.get(target.id)||'',key=element.labelTarget?'label:'+target.id:element.type==='bpmn:Lane'?'lane:'+ownerKey(element.businessObject.name):'node:'+element.id;
      shapes[key]={...bounds(element),type:element.type,owner,lane:lanes.get(owner)||null,...(element.labelTarget?.waypoints?{labelFor:JSON.stringify([target.source.id,target.target.id,target.businessObject.name || ''])}:{})};
    }
    for(const edge of elements.filter(element=>element.waypoints&&element.type==='bpmn:SequenceFlow')){
      const base=JSON.stringify([edge.source.id,edge.target.id,edge.businessObject.name||'']),ordinal=counts.get(base)||0;counts.set(base,ordinal+1);
      connections[base+':'+ordinal]={points:edge.waypoints.map(point=>({x:point.x,y:point.y})),source:bounds(edge.source),target:bounds(edge.target)};
    }
    return {version:1,shapes,connections};
  }
  function mergeLayout(xml,layout){
    if(!layout?.shapes)return {xml,reroute:[]};
    const doc=new DOMParser().parseFromString(xml,'application/xml');
    if(doc.getElementsByTagName('parsererror').length)throw Error('Não foi possível recuperar o layout do desenho.');
    const all=(name)=>[...doc.getElementsByTagNameNS('*',name)],byId=new Map([...doc.querySelectorAll('[id]')].map(element=>[element.id||element.getAttribute('id'),element]));
    const bounds=element=>[...element.getElementsByTagNameNS('*','Bounds')][0];
    const read=element=>Object.fromEntries(['x','y','width','height'].map(key=>[key,Number(element.getAttribute(key))]));
    const valid=rect=>rect&&['x','y','width','height'].every(key=>Number.isFinite(rect[key]))&&rect.width>0&&rect.height>0;
    const write=(element,rect)=>Object.entries(rect).forEach(([key,value])=>element.setAttribute(key,String(value)));
    const manualShapes=layout.manualShapes?new Set(layout.manualShapes):null,manualConnections=layout.manualConnections?new Set(layout.manualConnections):null;
    const shapes=all('BPMNShape'),owners=new Map(),laneItems=[];
    const original=new Map(shapes.map(shape=>[shape.getAttribute('bpmnElement'),read(bounds(shape))]));
    for(const lane of all('lane')){
      const owner=ownerKey(lane.getAttribute('name'));for(const ref of lane.getElementsByTagNameNS('*','flowNodeRef'))owners.set(ref.textContent.trim(),owner);
      const shape=shapes.find(item=>item.getAttribute('bpmnElement')===lane.getAttribute('id'));
      if(shape)laneItems.push({owner,shape,old:original.get(lane.getAttribute('id'))});
    }
    laneItems.sort((a,b)=>a.old.y-b.old.y);
    const pool=shapes.find(shape=>byId.get(shape.getAttribute('bpmnElement'))?.localName==='participant'),poolId=pool?.getAttribute('bpmnElement'),poolOriginal=original.get(poolId),poolSaved=(!manualShapes||manualShapes.has('node:'+poolId))?layout.shapes['node:'+poolId]:null;
    const poolRect=poolOriginal?{...(valid(poolSaved)?poolSaved:poolOriginal)}:null;
    if(poolRect)for(const key of Object.keys(poolRect))if(!['x','y','width','height'].includes(key))delete poolRect[key];
    const positions=new Map();
    for(const shape of shapes){
      const id=shape.getAttribute('bpmnElement'),model=byId.get(id);if(!model||['participant','lane'].includes(model.localName))continue;
      const source=original.get(id),owner=owners.get(id)||'',lane=laneItems.find(item=>item.owner===owner),saved=layout.shapes['node:'+id],type='bpmn:'+model.localName[0].toUpperCase()+model.localName.slice(1);
      const restored=(!manualShapes||manualShapes.has('node:'+id))&&valid(saved)&&saved.type===type&&saved.owner===owner;
      const rect=restored?saved:source,base=restored&&saved.lane?saved.lane:lane?.old;
      positions.set(id,{shape,owner,rect:{x:rect.x-(base?.x||0),y:rect.y-(base?.y||0),width:rect.width,height:rect.height},relative:!!base});
    }
    let nextY=poolRect?.y||0;
    for(const lane of laneItems){
      const saved=(!manualShapes||manualShapes.has('lane:'+lane.owner))?layout.shapes['lane:'+lane.owner]:null,height=valid(saved)?saved.height:lane.old.height;
      const children=[...positions.values()].filter(item=>item.owner===lane.owner);
      lane.rect={x:poolRect?poolRect.x+(lane.old.x-poolOriginal.x):lane.old.x,y:poolRect?nextY:lane.old.y,width:lane.old.width,height:Math.max(height,...children.map(item=>item.rect.y+item.rect.height+24))};
      nextY=lane.rect.y+lane.rect.height;
    }
    for(const [id,item] of positions){
      const lane=laneItems.find(candidate=>candidate.owner===item.owner),offset=item.relative?lane?.rect:null;
      const rect={...item.rect,x:item.rect.x+(offset?.x||0),y:item.rect.y+(offset?.y||0)};write(bounds(item.shape),rect);item.absolute=rect;
      if(poolRect){poolRect.width=Math.max(poolRect.width,rect.x+rect.width-poolRect.x+24);poolRect.height=Math.max(poolRect.height,rect.y+rect.height-poolRect.y+24);}
    }
    if(poolRect){poolRect.height=Math.max(poolRect.height,nextY-poolRect.y);write(bounds(pool),poolRect);}
    for(const lane of laneItems){if(poolRect)lane.rect.width=poolRect.width-(lane.rect.x-poolRect.x);write(bounds(lane.shape),lane.rect);}
    const rectFor=id=>positions.get(id)?.absolute||original.get(id),same=(a,b)=>a&&b&&a.width===b.width&&a.height===b.height;
    const reroute=[],counts=new Map();
    for(const edge of all('BPMNEdge')){
      const id=edge.getAttribute('bpmnElement'),flow=byId.get(id);if(!flow||flow.localName!=='sequenceFlow')continue;
      const sourceId=flow.getAttribute('sourceRef'),targetId=flow.getAttribute('targetRef'),source=rectFor(sourceId),target=rectFor(targetId);
      const base=JSON.stringify([sourceId,targetId,flow.getAttribute('name')||'']),ordinal=counts.get(base)||0;counts.set(base,ordinal+1);
      const saved=(!manualConnections||manualConnections.has(base+':'+ordinal))?layout.connections?.[base+':'+ordinal]:null,points=[...edge.getElementsByTagNameNS('*','waypoint')];
      const dx=source&&saved?.source?source.x-saved.source.x:0,dy=source&&saved?.source?source.y-saved.source.y:0;
      if(saved&&same(source,saved.source)&&same(target,saved.target)&&target.x-saved.target.x===dx&&target.y-saved.target.y===dy&&saved.points?.length>=2&&saved.points.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y))){
        points.forEach(point=>point.remove());for(const point of saved.points){const waypoint=doc.createElementNS(diagramNamespaces.di,'di:waypoint');write(waypoint,{x:point.x+dx,y:point.y+dy});edge.append(waypoint);}
      }else if(JSON.stringify(source)!==JSON.stringify(original.get(sourceId))||JSON.stringify(target)!==JSON.stringify(original.get(targetId)))reroute.push(id);
    }
    // External labels have their own bounds and should follow the restored element/lane.
    for(const container of [...shapes,...all('BPMNEdge')]){
      const id=container.getAttribute('bpmnElement'),saved=layout.shapes['label:'+id];if((manualShapes&&!manualShapes.has('label:'+id))||!valid(saved))continue;
      const model=byId.get(id),owner=owners.get(id)||'',lane=laneItems.find(item=>item.owner===owner);if(saved.owner!==owner)continue;
      if(model?.localName==='sequenceFlow'&&saved.labelFor!==JSON.stringify([model.getAttribute('sourceRef'),model.getAttribute('targetRef'),model.getAttribute('name') || '']))continue;
      let dx=0,dy=0;
      if(lane&&saved.lane){dx=lane.rect.x-saved.lane.x;dy=lane.rect.y-saved.lane.y;}
      else if(model?.localName==='sequenceFlow'){
        if(reroute.includes(id))continue;
        const targetId=model.getAttribute('targetRef'),current=rectFor(targetId),previous=layout.shapes['node:'+targetId];if(current&&valid(previous)){dx=current.x-previous.x;dy=current.y-previous.y;}
      }
      let label=[...container.getElementsByTagNameNS('*','BPMNLabel')][0];if(!label){label=doc.createElementNS(diagramNamespaces.bpmndi,'bpmndi:BPMNLabel');container.append(label);}
      let rect=bounds(label);if(!rect){rect=doc.createElementNS(diagramNamespaces.dc,'dc:Bounds');label.append(rect);}
      write(rect,{x:saved.x+dx,y:saved.y+dy,width:saved.width,height:saved.height});
    }
    return {xml:new XMLSerializer().serializeToString(doc),reroute};
  }
  function routeLayout(modeler,compiled,ids){
    const registry=modeler.get('elementRegistry'),requested=new Set(ids);
    const nodes=compiled.nodes.map(node=>{const shape=registry.get(node.id);return {...node,x:shape.x,y:shape.y,width:shape.width,height:shape.height};});
    const byId=new Map(nodes.map(node=>[node.id,node]));
    const lanes=registry.getAll().filter(item=>item.type==='bpmn:Lane').map(lane=>({owner:lane.businessObject.name,y:lane.y,height:lane.height})).sort((a,b)=>a.y-b.y);
    const routed=compiled.flows.filter(flow=>!requested.has(flow.id)).map(flow=>({...flow,points:registry.get(flow.id).waypoints.map(point=>({x:point.x,y:point.y}))}));
    const flows=compiled.flows.filter(flow=>requested.has(flow.id)).sort((a,b)=>{const distance=flow=>{const s=byId.get(flow.source),t=byId.get(flow.target);return Math.abs(s.y+s.height/2-t.y-t.height/2);};return distance(a)-distance(b);});
    for(const flow of flows){
      const points=routeArrow(byId.get(flow.source),byId.get(flow.target),nodes,routed,flow,lanes);
      if(!points)throw Error('Não foi possível traçar uma nova ligação sem sobreposição neste layout. Afaste os elementos ou ajuste os caminhos e verifique o fluxo novamente.');
      modeler.get('modeling').updateWaypoints(registry.get(flow.id),points);routed.push({...flow,points});
    }
  }
  function compile(cards,name='Esboço AS IS',startInfo={}){
    const nodes=[],flows=[],steps=[],ids=new Set(),unassigned='Responsável não informado';let serial=0,count=0;
    const add=(id,type,label,column,owner='')=>{const node={id,type,label,column,owner,width:type.endsWith('Task')?150:type.endsWith('Gateway')?50:36,height:type.endsWith('Task')?80:type.endsWith('Gateway')?50:36};nodes.push(node);return node;};
    const link=(source,target,label='')=>flows.push({id:'Flow_cards_'+(++serial),source:source.id,target:target.id,label});
    function walk(list,previous,column,context=null,depth=0,available=[]){
      available=[...available];let pendingLabel=context?.entryLabel || '';
      if(!Array.isArray(list)||depth>5)throw Error('Use até cinco níveis de decisões.');
      for(const card of list){
        if(++count>60)throw Error('Este teste aceita até 60 cards.');
        if(!/^[A-Za-z0-9_-]+$/.test(card.id)||ids.has(card.id))throw Error('Identidade de card inválida ou duplicada.');ids.add(card.id);
        if(!['task','decision','parallel','inclusive','wait','end','return'].includes(card.type)||!String(card.nome||'').trim())throw Error('Informe o nome de todos os cards.');
        const mode=card.modo || 'Manual';if(!['Manual','Semi-automatica','Automatica'].includes(mode))throw Error('Modo de execução inválido.');
        const gateway=['decision','parallel','inclusive'].includes(card.type);
        if(!previous)throw Error('Não adicione cards após um encerramento ou caminhos independentes. Adicione-os dentro de cada caminho.');
        if(card.type==='return'){
          if(!available.includes(card.targetId))throw Error('O retorno deve apontar para uma etapa anterior deste caminho ou uma decisão que o contém.');
          link(previous,nodes.find(node=>node.id==='Card_'+card.targetId),pendingLabel || card.nome);previous=null;continue;
        }
        available.push(card.id);
        const type=gateway?({decision:'exclusiveGateway',parallel:'parallelGateway',inclusive:'inclusiveGateway'})[card.type]:card.type==='end'?'endEvent':card.type==='wait'?'intermediateCatchEvent':mode==='Automatica'?'serviceTask':mode==='Semi-automatica'?'userTask':'manualTask';
        const node=add('Card_'+card.id,type,card.nome.trim(),column,card.executor?.trim() || (card.type==='task'?unassigned:''));
        link(previous,node,pendingLabel);pendingLabel='';
        if(card.type==='wait'){node.duration=card.duration||'PT1H';if(!/^P(?=\d|T\d)(?:\d+D)?(?:T(?=\d)(?:\d+H)?(?:\d+M)?(?:\d+S)?)?$/.test(node.duration))throw Error('Informe uma duração ISO 8601 válida, como PT1H ou P1D.');}
        const step={id:'ep-card-'+card.id,bpmn_id:node.id,nome:node.label,tipo:gateway?'Decisao':card.type==='task'?'Atividade':'Evento',natureza:'Execucao',modo:mode,executor:card.executor?.trim() || '',desc:card.descricao || '',seq:steps.length+1,vinculo_gw:context?{gw_ep_id:context.gateway,label:context.label}:null};steps.push(step);
        if(gateway){
          const branches=branchesOf(card),branchIds=new Set();
          if(!Array.isArray(branches)||branches.length<2||branches.length>60)throw Error('Informe de 2 a 60 caminhos por gateway.');
          for(const branch of branches){if(!String(branch.nome||'').trim())throw Error('Dê um nome a cada caminho.');if(!/^[A-Za-z0-9_-]+$/.test(branch.id)||branchIds.has(branch.id))throw Error('Identidade de caminho inválida ou duplicada.');branchIds.add(branch.id);}
          const labels=branches.map(branch=>branch.nome.trim());
          const paths=branches.map((branch,index)=>{
            const first=flows.length,result=walk(branch.cards,node,column+1,{gateway:step.id,label:labels[index],entryLabel:labels[index]},depth+1,available);
            if(branch.cards.length)flows[first].label=labels[index];return result;
          });
          column=Math.max(...paths.map(path=>path.column));
          if(card.join===false){
            paths.forEach((branch,index)=>{if(branch.previous){const end=add('End_'+card.id+'_'+index,'endEvent','Fim · '+labels[index],branch.column);link(branch.previous,end,branch.entryLabel || (branch.previous===node?labels[index]:''));}});
            previous=null;
          }else{
            if(card.type!=='decision'&&paths.some(path=>!path.previous))throw Error('Para encerrar caminhos de um paralelo ou inclusivo separadamente, desative o reencontro.');
            const live=paths.filter(branch=>branch.previous);
            if(live.length===1){previous=live[0].previous;pendingLabel=live[0].entryLabel || (previous===node?labels[paths.indexOf(live[0])]:'');}
            else if(live.length>1){const join=add('Join_'+card.id,type,'',column,node.owner);join.ownerFrom=node.id;paths.forEach((branch,index)=>{if(branch.previous)link(branch.previous,join,branch.entryLabel || (branch.previous===node?labels[index]:''));});previous=join;column++;}else previous=null;
          }
        }else{previous=card.type==='end'?null:node;column++;}
      }
      return {previous,column,entryLabel:pendingLabel};
    }
    const start=add('Cards_start','startEvent',startInfo.nome||'Início',0,startInfo.executor?.trim() || '');
    const last=walk(cards,start,1);if(last.previous){const end=add('Cards_end','endEvent','Fim',last.column);link(last.previous,end,last.entryLabel);}
    let validation=validateGraph(nodes,flows);
    if(!validation.valid){const error=Error(validation.errors[0].message);error.validation=validation;throw error;}
    // Keep branch order consistent across columns instead of reusing a different row per column.
    const byId=new Map(nodes.map(node=>[node.id,node])),spans=new Map();
    // Events and gateways share the participants' lanes; there is no technical control lane.
    function followingOwner(node){
      const queue=[node.id],visited=new Set(queue);
      for(let index=0;index<queue.length;index++){
        const current=byId.get(queue[index]);if(current.owner)return current.owner;
        for(const flow of flows.filter(edge=>edge.source===current.id)){
          const next=byId.get(flow.target);if(next.column<=current.column||visited.has(next.id))continue;
          visited.add(next.id);queue.push(next.id);
        }
      }
      return '';
    }
    for(const node of [...nodes].sort((a,b)=>a.column-b.column)){
      if(node.owner)continue;
      const previous=flows.filter(flow=>flow.target===node.id).map(flow=>byId.get(flow.source)).find(parent=>parent.column<node.column&&parent.owner);
      node.owner=byId.get(node.ownerFrom)?.owner || previous?.owner || followingOwner(node) || unassigned;
    }
    const canonicalOwners=new Map(ownersOf(cards,startInfo).map(owner=>[ownerKey(owner),owner]));
    nodes.forEach(node=>{node.owner=canonicalOwners.get(ownerKey(node.owner)) || node.owner;});
    steps.forEach(step=>{const owner=byId.get(step.bpmn_id).owner;step.executor=owner===unassigned?'':owner;});
    function span(items){if(spans.has(items))return spans.get(items);const value=Math.max(1,...items.filter(card=>['decision','parallel','inclusive'].includes(card.type)).map(card=>branchesOf(card).reduce((sum,branch)=>sum+span(branch.cards),0)));spans.set(items,value);return value;}
    function position(items,base){
      const size=span(items),center=base+(size-1)/2;
      for(const card of items){
        if(card.type==='return')continue;
        byId.get('Card_'+card.id).track=center;
        if(['decision','parallel','inclusive'].includes(card.type)){
          const branches=branchesOf(card),total=branches.reduce((sum,branch)=>sum+span(branch.cards),0);let next=base+(size-total)/2;
          branches.forEach((branch,index)=>{const branchSize=span(branch.cards);position(branch.cards,next);const end=byId.get('End_'+card.id+'_'+index);if(end)end.track=next+(branchSize-1)/2;next+=branchSize;});
          const join=byId.get('Join_'+card.id);if(join)join.track=center;
        }
      }
    }
    position(cards,0);start.track=(span(cards)-1)/2;if(byId.has('Cards_end'))byId.get('Cards_end').track=start.track;
    const owners=[...new Set(nodes.map(n=>n.owner))];let y=100;
    const lanes=owners.map((owner,index)=>{const tracks=[...new Set(nodes.filter(n=>n.owner===owner).map(n=>n.track))].sort((a,b)=>a-b);const lane={id:'Cards_lane_'+index,owner,y,height:Math.max(220,tracks.length*180),tracks};y+=lane.height;return lane;});
    const width=Math.max(650,(last.column+1)*320+180),height=y-100;
    nodes.forEach(n=>{const lane=lanes.find(l=>l.owner===n.owner);n.x=150+n.column*320;n.y=lane.y+85-n.height/2+lane.tracks.indexOf(n.track)*180;});
    const originalFlows=[...flows],routed=[];
    const routeOrder=[...originalFlows].sort((a,b)=>{
      const distance=flow=>{const source=nodes.find(node=>node.id===flow.source),target=nodes.find(node=>node.id===flow.target);return Math.abs(source.y+source.height/2-target.y-target.height/2);};return distance(a)-distance(b);
    });
    for(const flow of routeOrder){
      const source=nodes.find(n=>n.id===flow.source),target=nodes.find(n=>n.id===flow.target);
      const points=routeArrow(source,target,nodes,routed,flow,lanes);
      if(points){flow.points=points;routed.push(flow);continue;}
      // No non-crossing route remains in this layout. Only now use a matching link pair.
      const label='L'+(originalFlows.indexOf(flow)+1);
      const overlaps=node=>nodes.some(other=>node.x<other.x+other.width+12&&node.x+node.width+12>other.x&&node.y<other.y+other.height+12&&node.y+node.height+12>other.y);
      const coversRoute=node=>routed.some(edge=>edge.points.slice(1).some((point,index)=>{const previous=edge.points[index];return point.x===previous.x?point.x>node.x-12&&point.x<node.x+node.width+12&&Math.max(point.y,previous.y)>node.y-12&&Math.min(point.y,previous.y)<node.y+node.height+12:point.y>node.y-12&&point.y<node.y+node.height+12&&Math.max(point.x,previous.x)>node.x-12&&Math.min(point.x,previous.x)<node.x+node.width+12;}));
      function candidates(anchor,throwing){
        const positions=[];
        for(const offset of [0,-64,64,-128,128]){
          const centerX=anchor.x+anchor.width/2-18,centerY=anchor.y+anchor.height/2-18;
          positions.push({x:throwing?anchor.x+anchor.width+24:anchor.x-60,y:centerY+offset},{x:centerX+offset,y:anchor.y+anchor.height+24},{x:centerX+offset,y:anchor.y-60},{x:throwing?anchor.x-60:anchor.x+anchor.width+24,y:centerY+offset});
        }
        const lane=lanes.find(item=>item.owner===anchor.owner);
        return positions.map(position=>({id:(throwing?'Throw_':'Catch_')+flow.id,type:throwing?'intermediateThrowEvent':'intermediateCatchEvent',label,owner:anchor.owner,column:anchor.column,width:36,height:36,...position,linkName:label})).filter(node=>node.x>=120&&node.x+36<=60+width&&node.y>=lane.y&&node.y+36<=lane.y+lane.height&&!overlaps(node)&&!coversRoute(node));
      }
      let connected=false;
      for(const throwing of candidates(source,true)){
        for(const catching of candidates(target,false)){
          if(throwing.x<catching.x+48&&throwing.x+48>catching.x&&throwing.y<catching.y+48&&throwing.y+48>catching.y)continue;
          const outgoing={source:source.id,target:throwing.id},incoming={source:catching.id,target:target.id};
          const extended=[...nodes,throwing,catching],outPoints=routeArrow(source,throwing,extended,routed,outgoing,lanes);
          if(!outPoints)continue;outgoing.points=outPoints;
          const inPoints=routeArrow(catching,target,extended,[...routed,outgoing],incoming,lanes);if(!inPoints)continue;
          throwing.linkTarget=catching.id;catching.linkSource=throwing.id;nodes.push(throwing,catching);
          flows.splice(flows.indexOf(flow),1);link(source,throwing,flow.label);flows.at(-1).points=outPoints;routed.push(flows.at(-1));link(catching,target);flows.at(-1).points=inPoints;routed.push(flows.at(-1));connected=true;break;
        }
        if(connected)break;
      }
      if(!connected)throw Error('Não foi possível conectar os caminhos sem cruzamentos. Reorganize os cards ou os responsáveis.');
    }
    if(nodes.some(node=>node.linkName)){
      const linkedValidation=validateGraph(nodes,flows);
      if(!linkedValidation.valid){const error=Error(linkedValidation.errors[0].message);error.validation=linkedValidation;throw error;}
      validation={...linkedValidation,warnings:[...validation.warnings,...linkedValidation.warnings.filter(issue=>issue.code==='ANALYSIS_LIMIT'&&!validation.warnings.some(previous=>previous.code===issue.code))]};
    }
    const xmlNodes=nodes.map(n=>`<bpmn:${n.type} id="${n.id}" name="${escape(n.label)}">${flows.filter(f=>f.target===n.id).map(f=>`<bpmn:incoming>${f.id}</bpmn:incoming>`).join('')}${flows.filter(f=>f.source===n.id).map(f=>`<bpmn:outgoing>${f.id}</bpmn:outgoing>`).join('')}${n.duration?`<bpmn:timerEventDefinition><bpmn:timeDuration>${escape(n.duration)}</bpmn:timeDuration></bpmn:timerEventDefinition>`:''}${n.linkName?`<bpmn:linkEventDefinition id="Def_${n.id}" name="${n.linkName}">${n.linkTarget?`<bpmn:target>Def_${n.linkTarget}</bpmn:target>`:`<bpmn:source>Def_${n.linkSource}</bpmn:source>`}</bpmn:linkEventDefinition>`:''}</bpmn:${n.type}>`).join('');
    const xmlFlows=flows.map(f=>`<bpmn:sequenceFlow id="${f.id}" sourceRef="${f.source}" targetRef="${f.target}"${f.label?` name="${escape(f.label)}"`:''}/>`).join('');
    const shape=(id,x,y,w,h,extra='')=>`<bpmndi:BPMNShape id="DI_${id}" bpmnElement="${id}" ${extra}><dc:Bounds x="${x}" y="${y}" width="${w}" height="${h}"/></bpmndi:BPMNShape>`;
    const di=shape('Cards_pool',60,100,width,height,'isHorizontal="true"')+lanes.map(l=>shape(l.id,90,l.y,width-30,l.height,'isHorizontal="true"')).join('')+nodes.map(n=>shape(n.id,n.x,n.y,n.width,n.height)).join('')+flows.map(f=>{const a=nodes.find(n=>n.id===f.source),b=nodes.find(n=>n.id===f.target),x1=a.x+a.width,y1=a.y+a.height/2,x2=b.x,y2=b.y+b.height/2;const points=f.points||[{x:x1,y:y1},{x:x2,y:y2}];const labelSegments=points.slice(1).map((point,index)=>({a:points[index],b:point,length:Math.abs(point.x-points[index].x)+Math.abs(point.y-points[index].y)}));const labelSegment=labelSegments.reduce((longest,segment)=>segment.length>longest.length?segment:longest);const labelX=(labelSegment.a.x+labelSegment.b.x)/2-50,labelY=(labelSegment.a.y+labelSegment.b.y)/2-24;return `<bpmndi:BPMNEdge id="DI_${f.id}" bpmnElement="${f.id}">${points.map(point=>`<di:waypoint x="${point.x}" y="${point.y}"/>`).join('')}${f.label?`<bpmndi:BPMNLabel><dc:Bounds x="${labelX}" y="${labelY}" width="100" height="20"/></bpmndi:BPMNLabel>`:''}</bpmndi:BPMNEdge>`;}).join('');
    const xml=`<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Cards_definitions" targetNamespace="https://siga.app/asis-cards"><bpmn:collaboration id="Cards_collaboration"><bpmn:participant id="Cards_pool" name="${escape(name)}" processRef="Cards_process"/></bpmn:collaboration><bpmn:process id="Cards_process" isExecutable="false"><bpmn:laneSet id="Cards_lanes">${lanes.map(l=>`<bpmn:lane id="${l.id}" name="${escape(l.owner)}">${nodes.filter(n=>n.owner===l.owner).map(n=>`<bpmn:flowNodeRef>${n.id}</bpmn:flowNodeRef>`).join('')}</bpmn:lane>`).join('')}</bpmn:laneSet>${xmlNodes}${xmlFlows}</bpmn:process><bpmndi:BPMNDiagram id="Cards_diagram"><bpmndi:BPMNPlane id="Cards_plane" bpmnElement="Cards_collaboration">${di}</bpmndi:BPMNPlane></bpmndi:BPMNDiagram></bpmn:definitions>`;
    return {xml,steps,nodes,flows,validation};
  }
  scope.AsIsCards={compile,branchesOf,validateGraph,ownersOf,ownerKey,captureLayout,mergeLayout,routeLayout};
})(globalThis);
