(function(scope){
  const escape=value=>String(value??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
  function branchesOf(card){
    return card.branches || [{id:'yes',nome:card.type==='decision'?'Sim':'Caminho A',cards:card.yes||[]},{id:'no',nome:card.type==='decision'?'Não':'Caminho B',cards:card.no||[]}];
  }
  // Orthogonal visibility grid: search free corridors before considering a BPMN link.
  function routeArrow(source,target,nodes,routed,flow){
    let best=null,bestCost=Infinity;
    for(const [exit,entry] of [['right','left'],['right','top'],['right','bottom'],['bottom','left'],['top','left'],['bottom','top'],['top','bottom'],['bottom','bottom'],['top','top'],['left','left'],['right','right'],['left','top'],['left','bottom'],['bottom','right'],['top','right'],['left','right']]){
      if(source===target&&exit===entry)continue;
      const points=routeDock(source,target,nodes,routed,flow,exit,entry);if(!points)continue;
      const length=points.slice(1).reduce((sum,point,index)=>sum+Math.abs(point.x-points[index].x)+Math.abs(point.y-points[index].y),0),cost=length+(points.length-2)*35;
      if(cost<bestCost){best=points;bestCost=cost;}
      if(exit==='right'&&entry==='left'&&length<=Math.abs(points[0].x-points.at(-1).x)+Math.abs(points[0].y-points.at(-1).y)+48)return points;
    }
    return best;
  }
  function routeDock(source,target,nodes,routed,flow,exit,entry){
    const vectors={right:[1,0],left:[-1,0],top:[0,-1],bottom:[0,1]};
    const dock=(node,side)=>({x:node.x+node.width/2+vectors[side][0]*node.width/2,y:node.y+node.height/2+vectors[side][1]*node.height/2});
    const from=dock(source,exit),to=dock(target,entry);
    const xs=[...new Set([from.x,to.x,...nodes.flatMap(n=>[n.x-24,n.x+n.width+24])])].sort((a,b)=>a-b);
    const ys=[...new Set([from.y,to.y,...nodes.flatMap(n=>[n.y-24,n.y+n.height+24,n.y+n.height/2])])].sort((a,b)=>a-b);
    const segments=points=>points.slice(1).map((p,i)=>[points[i],p]);
    function blocked(a,b){
      if(nodes.some(n=>{
        const corridor=side=>{
          if(side==='right')return a.y===n.y+n.height/2&&b.y===a.y&&Math.min(a.x,b.x)>=n.x+n.width;
          if(side==='left')return a.y===n.y+n.height/2&&b.y===a.y&&Math.max(a.x,b.x)<=n.x;
          if(side==='top')return a.x===n.x+n.width/2&&b.x===a.x&&Math.max(a.y,b.y)<=n.y;
          return a.x===n.x+n.width/2&&b.x===a.x&&Math.min(a.y,b.y)>=n.y+n.height;
        };
        if((n===source&&corridor(exit))||(n===target&&corridor(entry)))return false;
        const left=n.x-12,right=n.x+n.width+12,top=n.y-12,bottom=n.y+n.height+12;
        return a.x===b.x?a.x>left&&a.x<right&&Math.max(a.y,b.y)>top&&Math.min(a.y,b.y)<bottom:a.y>top&&a.y<bottom&&Math.max(a.x,b.x)>left&&Math.min(a.x,b.x)<right;
      }))return true;
      return routed.some(other=>segments(other.points).some(([c,d])=>{
        const shared=other.source===flow.source||other.target===flow.target,samePair=other.source===flow.source&&other.target===flow.target;
        const common=[];
        if(other.source===flow.source)common.push(other.points[0]);if(other.target===flow.target)common.push(other.points.at(-1));
        const nearCommon=point=>common.some(origin=>Math.abs(origin.x-point.x)+Math.abs(origin.y-point.y)<=24);
        if(a.x===b.x&&c.x===d.x){const low=Math.max(Math.min(a.y,b.y),Math.min(c.y,d.y)),high=Math.min(Math.max(a.y,b.y),Math.max(c.y,d.y));return a.x===c.x&&low<=high&&!(shared&&!samePair)&&!(nearCommon({x:a.x,y:low})&&nearCommon({x:a.x,y:high}));}
        if(a.y===b.y&&c.y===d.y){const low=Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x)),high=Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x));return a.y===c.y&&low<=high&&!(shared&&!samePair)&&!(nearCommon({x:low,y:a.y})&&nearCommon({x:high,y:a.y}));}
        const v=a.x===b.x?[a,b]:[c,d],h=a.x===b.x?[c,d]:[a,b];
        const meets=v[0].x>=Math.min(h[0].x,h[1].x)&&v[0].x<=Math.max(h[0].x,h[1].x)&&h[0].y>=Math.min(v[0].y,v[1].y)&&h[0].y<=Math.max(v[0].y,v[1].y);
        if(!meets)return false;
        const proper=v[0].x>Math.min(h[0].x,h[1].x)&&v[0].x<Math.max(h[0].x,h[1].x)&&h[0].y>Math.min(v[0].y,v[1].y)&&h[0].y<Math.max(v[0].y,v[1].y);
        return proper||(!shared)||samePair&&!nearCommon({x:v[0].x,y:h[0].y});
      }));
    }
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
        const points=[];for(let item=current;item;item=item.parent)points.push({x:xs[item.x],y:ys[item.y]});points.reverse();
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
  function compile(cards,name='Esboço AS IS',startInfo={}){
    const nodes=[],flows=[],steps=[],ids=new Set(),control='Fluxo e decisões';let serial=0,count=0;
    const add=(id,type,label,column,owner=control)=>{const node={id,type,label,column,owner,width:type.endsWith('Task')?150:type.endsWith('Gateway')?50:36,height:type.endsWith('Task')?80:type.endsWith('Gateway')?50:36};nodes.push(node);return node;};
    const link=(source,target,label='')=>flows.push({id:'Flow_cards_'+(++serial),source:source.id,target:target.id,label});
    function walk(list,previous,column,context=null,depth=0,available=[]){
      available=[...available];
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
          link(previous,nodes.find(node=>node.id==='Card_'+card.targetId),context?.entryLabel || card.nome);previous=null;continue;
        }
        available.push(card.id);
        const type=gateway?({decision:'exclusiveGateway',parallel:'parallelGateway',inclusive:'inclusiveGateway'})[card.type]:card.type==='end'?'endEvent':card.type==='wait'?'intermediateCatchEvent':mode==='Automatica'?'serviceTask':mode==='Semi-automatica'?'userTask':'manualTask';
        const node=add('Card_'+card.id,type,card.nome.trim(),column,card.type==='task'?(card.executor?.trim() || 'Responsável não informado'):control);
        link(previous,node,context?.entryLabel || '');
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
            paths.forEach((branch,index)=>{if(branch.previous){const end=add('End_'+card.id+'_'+index,'endEvent','Fim · '+labels[index],branch.column);link(branch.previous,end,branch.previous===node?labels[index]:'');}});
            previous=null;
          }else{
            if(card.type!=='decision'&&paths.some(path=>!path.previous))throw Error('Para encerrar caminhos de um paralelo ou inclusivo separadamente, desative o reencontro.');
            const live=paths.filter(branch=>branch.previous);
            if(live.length){const join=add('Join_'+card.id,type,'',column);paths.forEach((branch,index)=>{if(branch.previous)link(branch.previous,join,branch.previous===node?labels[index]:'');});previous=join;column++;}else previous=null;
          }
        }else{previous=card.type==='end'?null:node;column++;}
        if(context)context={...context,entryLabel:''};
      }
      return {previous,column};
    }
    const start=add('Cards_start','startEvent',startInfo.nome||'Início',0);
    const last=walk(cards,start,1);if(last.previous){const end=add('Cards_end','endEvent','Fim',last.column);link(last.previous,end);}
    // Keep branch order consistent across columns instead of reusing a different row per column.
    const byId=new Map(nodes.map(node=>[node.id,node])),spans=new Map();
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
    for(const flow of originalFlows){
      const source=nodes.find(n=>n.id===flow.source),target=nodes.find(n=>n.id===flow.target);
      const points=routeArrow(source,target,nodes,routed,flow);
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
          const extended=[...nodes,throwing,catching],outPoints=routeArrow(source,throwing,extended,routed,outgoing);
          if(!outPoints)continue;outgoing.points=outPoints;
          const inPoints=routeArrow(catching,target,extended,[...routed,outgoing],incoming);if(!inPoints)continue;
          throwing.linkTarget=catching.id;catching.linkSource=throwing.id;nodes.push(throwing,catching);
          flows.splice(flows.indexOf(flow),1);link(source,throwing,flow.label);flows.at(-1).points=outPoints;routed.push(flows.at(-1));link(catching,target);flows.at(-1).points=inPoints;routed.push(flows.at(-1));connected=true;break;
        }
        if(connected)break;
      }
      if(!connected)throw Error('Não foi possível conectar os caminhos sem cruzamentos. Reorganize os cards ou os responsáveis.');
    }
    const xmlNodes=nodes.map(n=>`<bpmn:${n.type} id="${n.id}" name="${escape(n.label)}">${flows.filter(f=>f.target===n.id).map(f=>`<bpmn:incoming>${f.id}</bpmn:incoming>`).join('')}${flows.filter(f=>f.source===n.id).map(f=>`<bpmn:outgoing>${f.id}</bpmn:outgoing>`).join('')}${n.duration?`<bpmn:timerEventDefinition><bpmn:timeDuration>${escape(n.duration)}</bpmn:timeDuration></bpmn:timerEventDefinition>`:''}${n.linkName?`<bpmn:linkEventDefinition id="Def_${n.id}" name="${n.linkName}">${n.linkTarget?`<bpmn:target>Def_${n.linkTarget}</bpmn:target>`:`<bpmn:source>Def_${n.linkSource}</bpmn:source>`}</bpmn:linkEventDefinition>`:''}</bpmn:${n.type}>`).join('');
    const xmlFlows=flows.map(f=>`<bpmn:sequenceFlow id="${f.id}" sourceRef="${f.source}" targetRef="${f.target}"${f.label?` name="${escape(f.label)}"`:''}/>`).join('');
    const shape=(id,x,y,w,h,extra='')=>`<bpmndi:BPMNShape id="DI_${id}" bpmnElement="${id}" ${extra}><dc:Bounds x="${x}" y="${y}" width="${w}" height="${h}"/></bpmndi:BPMNShape>`;
    const di=shape('Cards_pool',60,100,width,height,'isHorizontal="true"')+lanes.map(l=>shape(l.id,90,l.y,width-30,l.height,'isHorizontal="true"')).join('')+nodes.map(n=>shape(n.id,n.x,n.y,n.width,n.height)).join('')+flows.map(f=>{const a=nodes.find(n=>n.id===f.source),b=nodes.find(n=>n.id===f.target),x1=a.x+a.width,y1=a.y+a.height/2,x2=b.x,y2=b.y+b.height/2;const points=f.points||[{x:x1,y:y1},{x:x2,y:y2}];const labelSegments=points.slice(1).map((point,index)=>({a:points[index],b:point,length:Math.abs(point.x-points[index].x)+Math.abs(point.y-points[index].y)}));const labelSegment=labelSegments.reduce((longest,segment)=>segment.length>longest.length?segment:longest);const labelX=(labelSegment.a.x+labelSegment.b.x)/2-50,labelY=(labelSegment.a.y+labelSegment.b.y)/2-24;return `<bpmndi:BPMNEdge id="DI_${f.id}" bpmnElement="${f.id}">${points.map(point=>`<di:waypoint x="${point.x}" y="${point.y}"/>`).join('')}${f.label?`<bpmndi:BPMNLabel><dc:Bounds x="${labelX}" y="${labelY}" width="100" height="20"/></bpmndi:BPMNLabel>`:''}</bpmndi:BPMNEdge>`;}).join('');
    const xml=`<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Cards_definitions" targetNamespace="https://siga.app/asis-cards"><bpmn:collaboration id="Cards_collaboration"><bpmn:participant id="Cards_pool" name="${escape(name)}" processRef="Cards_process"/></bpmn:collaboration><bpmn:process id="Cards_process" isExecutable="false"><bpmn:laneSet id="Cards_lanes">${lanes.map(l=>`<bpmn:lane id="${l.id}" name="${escape(l.owner)}">${nodes.filter(n=>n.owner===l.owner).map(n=>`<bpmn:flowNodeRef>${n.id}</bpmn:flowNodeRef>`).join('')}</bpmn:lane>`).join('')}</bpmn:laneSet>${xmlNodes}${xmlFlows}</bpmn:process><bpmndi:BPMNDiagram id="Cards_diagram"><bpmndi:BPMNPlane id="Cards_plane" bpmnElement="Cards_collaboration">${di}</bpmndi:BPMNPlane></bpmndi:BPMNDiagram></bpmn:definitions>`;
    return {xml,steps,nodes,flows};
  }
  scope.AsIsCards={compile,branchesOf};
})(globalThis);
