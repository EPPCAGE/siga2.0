(function(scope){
  const escape=value=>String(value??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
  function compile(cards,name='Esboço AS IS',startInfo={}){
    const nodes=[],flows=[],steps=[],ids=new Set(),control='Fluxo e decisões';let serial=0,count=0;
    const add=(id,type,label,column,owner=control)=>{const node={id,type,label,column,owner,width:type.endsWith('Task')?150:type.endsWith('Gateway')?50:36,height:type.endsWith('Task')?80:type.endsWith('Gateway')?50:36};nodes.push(node);return node;};
    const link=(source,target,label='')=>flows.push({id:'Flow_cards_'+(++serial),source:source.id,target:target.id,label});
    function walk(list,previous,column,context=null,depth=0){
      if(!Array.isArray(list)||depth>5)throw Error('Use até cinco níveis de decisões.');
      for(const card of list){
        if(++count>60)throw Error('Este teste aceita até 60 cards.');
        if(!/^[A-Za-z0-9_-]+$/.test(card.id)||ids.has(card.id))throw Error('Identidade de card inválida ou duplicada.');ids.add(card.id);
        if(!['task','decision','parallel','inclusive','wait','end'].includes(card.type)||!String(card.nome||'').trim())throw Error('Informe o nome de todos os cards.');
        const mode=card.modo || 'Manual';if(!['Manual','Semi-automatica','Automatica'].includes(mode))throw Error('Modo de execução inválido.');
        const gateway=['decision','parallel','inclusive'].includes(card.type);
        if(!previous)throw Error('Não adicione cards após um encerramento ou caminhos independentes. Adicione-os dentro de cada caminho.');
        const type=gateway?({decision:'exclusiveGateway',parallel:'parallelGateway',inclusive:'inclusiveGateway'})[card.type]:card.type==='end'?'endEvent':card.type==='wait'?'intermediateCatchEvent':mode==='Automatica'?'serviceTask':mode==='Semi-automatica'?'userTask':'manualTask';
        const node=add('Card_'+card.id,type,card.nome.trim(),column,card.type==='task'?(card.executor?.trim() || 'Responsável não informado'):control);
        link(previous,node,context?.entryLabel || '');
        if(card.type==='wait'){node.duration=card.duration||'PT1H';if(!/^P(?=\d|T\d)(?:\d+D)?(?:T(?=\d)(?:\d+H)?(?:\d+M)?(?:\d+S)?)?$/.test(node.duration))throw Error('Informe uma duração ISO 8601 válida, como PT1H ou P1D.');}
        const step={id:'ep-card-'+card.id,bpmn_id:node.id,nome:node.label,tipo:gateway?'Decisao':card.type==='task'?'Atividade':'Evento',natureza:'Execucao',modo:mode,executor:card.executor?.trim() || '',desc:card.descricao || '',seq:steps.length+1,vinculo_gw:context?{gw_ep_id:context.gateway,label:context.label}:null};steps.push(step);
        if(gateway){
          const labels=card.type==='decision'?['Sim','Não']:['Caminho A','Caminho B'];
          const yesStart=flows.length;
          const yes=walk(card.yes||[],node,column+1,{gateway:step.id,label:labels[0],entryLabel:labels[0]},depth+1);
          if((card.yes||[]).length)flows[yesStart].label=labels[0];
          const noStart=flows.length;
          const no=walk(card.no||[],node,column+1,{gateway:step.id,label:labels[1],entryLabel:labels[1]},depth+1);
          if((card.no||[]).length)flows[noStart].label=labels[1];
          column=Math.max(yes.column,no.column);
          if(card.join===false){
            [yes,no].forEach((branch,index)=>{if(branch.previous){const end=add('End_'+card.id+'_'+index,'endEvent','Fim · '+labels[index],branch.column);link(branch.previous,end,branch.previous===node?labels[index]:'');}});
            previous=null;
          }else{
            if(card.type!=='decision'&&(!yes.previous||!no.previous))throw Error('Para encerrar caminhos de um paralelo ou inclusivo separadamente, desative o reencontro.');
            const live=[yes,no].filter(branch=>branch.previous);
            if(live.length){const join=add('Join_'+card.id,type,'',column);[yes,no].forEach((branch,index)=>{if(branch.previous)link(branch.previous,join,branch.previous===node?labels[index]:'');});previous=join;column++;}else previous=null;
          }
        }else{previous=card.type==='end'?null:node;column++;}
        if(context)context={...context,entryLabel:''};
      }
      return {previous,column};
    }
    const start=add('Cards_start','startEvent',startInfo.nome||'Início',0);
    const last=walk(cards,start,1);if(last.previous){const end=add('Cards_end','endEvent','Fim',last.column);link(last.previous,end);}
    const owners=[...new Set(nodes.map(n=>n.owner))],slots=new Map(),maxSlots=new Map();
    nodes.forEach(n=>{const key=n.owner+'|'+n.column;n.slot=slots.get(key)||0;slots.set(key,n.slot+1);maxSlots.set(n.owner,Math.max(maxSlots.get(n.owner)||1,n.slot+1));});
    let y=100;const lanes=owners.map((owner,index)=>{const lane={id:'Cards_lane_'+index,owner,y,height:Math.max(160,(maxSlots.get(owner)||1)*220)};y+=lane.height;return lane;});
    const width=Math.max(650,(last.column+1)*320+180),height=y-100;
    nodes.forEach(n=>{const lane=lanes.find(l=>l.owner===n.owner);n.x=150+n.column*320;n.y=lane.y+85-n.height/2+n.slot*220;});
    const originalFlows=[...flows],routed=[];
    const segments=points=>points.slice(1).map((point,index)=>[points[index],point]);
    const intersects=([a,b],[c,d])=>{
      const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
      if(cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0)return true;
      // Include overlapping or touching orthogonal routes; each accepted route has its own endpoints.
      return Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x))<=Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x)) && Math.max(Math.min(a.y,b.y),Math.min(c.y,d.y))<=Math.min(Math.max(a.y,b.y),Math.max(c.y,d.y)) && (cross(a,b,c)===0||cross(a,b,d)===0||cross(c,d,a)===0||cross(c,d,b)===0);
    };
    for(const flow of originalFlows){
      const source=nodes.find(n=>n.id===flow.source),target=nodes.find(n=>n.id===flow.target);
      if(target.column===source.column+1 && originalFlows.filter(f=>f.source===source.id).length===1 && originalFlows.filter(f=>f.target===target.id).length===1){
        const from={x:source.x+source.width,y:source.y+source.height/2},to={x:target.x,y:target.y+target.height/2},middle=source.x+235;
        const points=from.y===to.y?[from,to]:[from,{x:middle,y:from.y},{x:middle,y:to.y},to];
        if(!routed.some(other=>segments(points).some(segment=>segments(other).some(previous=>intersects(segment,previous))))){flow.points=points;routed.push(points);continue;}
      }
      const outgoing=originalFlows.filter(f=>f.source===source.id),incoming=originalFlows.filter(f=>f.target===target.id);
      const offset=(collection)=>collection.length>1?(collection.indexOf(flow)===0?-48:48):0;
      const label='L'+(originalFlows.indexOf(flow)+1);
      const makeLink=(id,type,anchor,x,dy)=>{const node={id,type,label,owner:anchor.owner,column:anchor.column,width:36,height:36,x,y:anchor.y+anchor.height/2-18+dy,linkName:label};nodes.push(node);return node;};
      const throwing=makeLink('Throw_'+flow.id,'intermediateThrowEvent',source,source.x+source.width+24,offset(outgoing));
      const catching=makeLink('Catch_'+flow.id,'intermediateCatchEvent',target,target.x-60,offset(incoming));
      throwing.linkTarget=catching.id;catching.linkSource=throwing.id;
      flows.splice(flows.indexOf(flow),1);
      link(source,throwing,flow.label);link(catching,target);
    }
    const xmlNodes=nodes.map(n=>`<bpmn:${n.type} id="${n.id}" name="${escape(n.label)}">${flows.filter(f=>f.target===n.id).map(f=>`<bpmn:incoming>${f.id}</bpmn:incoming>`).join('')}${flows.filter(f=>f.source===n.id).map(f=>`<bpmn:outgoing>${f.id}</bpmn:outgoing>`).join('')}${n.duration?`<bpmn:timerEventDefinition><bpmn:timeDuration>${escape(n.duration)}</bpmn:timeDuration></bpmn:timerEventDefinition>`:''}${n.linkName?`<bpmn:linkEventDefinition id="Def_${n.id}" name="${n.linkName}">${n.linkTarget?`<bpmn:target>Def_${n.linkTarget}</bpmn:target>`:`<bpmn:source>Def_${n.linkSource}</bpmn:source>`}</bpmn:linkEventDefinition>`:''}</bpmn:${n.type}>`).join('');
    const xmlFlows=flows.map(f=>`<bpmn:sequenceFlow id="${f.id}" sourceRef="${f.source}" targetRef="${f.target}"${f.label?` name="${escape(f.label)}"`:''}/>`).join('');
    const shape=(id,x,y,w,h,extra='')=>`<bpmndi:BPMNShape id="DI_${id}" bpmnElement="${id}" ${extra}><dc:Bounds x="${x}" y="${y}" width="${w}" height="${h}"/></bpmndi:BPMNShape>`;
    const di=shape('Cards_pool',60,100,width,height,'isHorizontal="true"')+lanes.map(l=>shape(l.id,90,l.y,width-30,l.height,'isHorizontal="true"')).join('')+nodes.map(n=>shape(n.id,n.x,n.y,n.width,n.height)).join('')+flows.map(f=>{const a=nodes.find(n=>n.id===f.source),b=nodes.find(n=>n.id===f.target),x1=a.x+a.width,y1=a.y+a.height/2,x2=b.x,y2=b.y+b.height/2;const points=f.points||[{x:x1,y:y1},{x:x2,y:y2}];return `<bpmndi:BPMNEdge id="DI_${f.id}" bpmnElement="${f.id}">${points.map(point=>`<di:waypoint x="${point.x}" y="${point.y}"/>`).join('')}${f.label?`<bpmndi:BPMNLabel><dc:Bounds x="${x2-55}" y="${y2-24}" width="45" height="20"/></bpmndi:BPMNLabel>`:''}</bpmndi:BPMNEdge>`;}).join('');
    const xml=`<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Cards_definitions" targetNamespace="https://siga.app/asis-cards"><bpmn:collaboration id="Cards_collaboration"><bpmn:participant id="Cards_pool" name="${escape(name)}" processRef="Cards_process"/></bpmn:collaboration><bpmn:process id="Cards_process" isExecutable="false"><bpmn:laneSet id="Cards_lanes">${lanes.map(l=>`<bpmn:lane id="${l.id}" name="${escape(l.owner)}">${nodes.filter(n=>n.owner===l.owner).map(n=>`<bpmn:flowNodeRef>${n.id}</bpmn:flowNodeRef>`).join('')}</bpmn:lane>`).join('')}</bpmn:laneSet>${xmlNodes}${xmlFlows}</bpmn:process><bpmndi:BPMNDiagram id="Cards_diagram"><bpmndi:BPMNPlane id="Cards_plane" bpmnElement="Cards_collaboration">${di}</bpmndi:BPMNPlane></bpmndi:BPMNDiagram></bpmn:definitions>`;
    return {xml,steps,nodes,flows};
  }
  scope.AsIsCards={compile};
})(globalThis);
