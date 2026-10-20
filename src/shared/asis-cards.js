(function(scope){
  const escape=value=>String(value??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
  function compile(cards,name='Esboço AS IS'){
    const nodes=[],flows=[],steps=[],ids=new Set(),control='Fluxo e decisões';let serial=0,count=0;
    const add=(id,type,label,column,owner=control)=>{const node={id,type,label,column,owner,width:type.endsWith('Task')?150:type.endsWith('Gateway')?50:36,height:type.endsWith('Task')?80:type.endsWith('Gateway')?50:36};nodes.push(node);return node;};
    const link=(source,target,label='')=>flows.push({id:'Flow_cards_'+(++serial),source:source.id,target:target.id,label});
    function walk(list,previous,column,context=null,depth=0){
      if(!Array.isArray(list)||depth>5)throw Error('Use até cinco níveis de decisões.');
      for(const card of list){
        if(++count>60)throw Error('Este teste aceita até 60 cards.');
        if(!/^[A-Za-z0-9_-]+$/.test(card.id)||ids.has(card.id))throw Error('Identidade de card inválida ou duplicada.');ids.add(card.id);
        if(!['task','decision'].includes(card.type)||!String(card.nome||'').trim())throw Error('Informe o nome de todos os cards.');
        const mode=card.modo || 'Manual';if(!['Manual','Semi-automatica','Automatica'].includes(mode))throw Error('Modo de execução inválido.');
        const type=card.type==='decision'?'exclusiveGateway':mode==='Automatica'?'serviceTask':mode==='Semi-automatica'?'userTask':'manualTask';
        const node=add('Card_'+card.id,type,card.nome.trim(),column,card.type==='task'?(card.executor?.trim() || 'Responsável não informado'):control);
        link(previous,node,context?.entryLabel || '');
        const step={id:'ep-card-'+card.id,bpmn_id:node.id,nome:node.label,tipo:card.type==='decision'?'Decisao':'Atividade',natureza:'Execucao',modo:mode,executor:card.executor?.trim() || '',desc:card.descricao || '',seq:steps.length+1,vinculo_gw:context?{gw_ep_id:context.gateway,label:context.label}:null};steps.push(step);
        if(card.type==='decision'){
          const yesStart=flows.length;
          const yes=walk(card.yes||[],node,column+1,{gateway:step.id,label:'Sim',entryLabel:'Sim'},depth+1);
          if((card.yes||[]).length)flows[yesStart].label='Sim';
          const noStart=flows.length;
          const no=walk(card.no||[],node,column+1,{gateway:step.id,label:'Não',entryLabel:'Não'},depth+1);
          if((card.no||[]).length)flows[noStart].label='Não';
          const join=add('Join_'+card.id,'exclusiveGateway','',Math.max(yes.column,no.column));
          link(yes.previous,join,(card.yes||[]).length?'':'Sim');link(no.previous,join,(card.no||[]).length?'':'Não');
          previous=join;column=join.column+1;
        }else{previous=node;column++;}
        if(context)context={...context,entryLabel:''};
      }
      return {previous,column};
    }
    const start=add('Cards_start','startEvent','Início',0);
    const last=walk(cards,start,1),end=add('Cards_end','endEvent','Fim',last.column);link(last.previous,end);
    const owners=[...new Set(nodes.map(n=>n.owner))],slots=new Map(),maxSlots=new Map();
    nodes.forEach(n=>{const key=n.owner+'|'+n.column;n.slot=slots.get(key)||0;slots.set(key,n.slot+1);maxSlots.set(n.owner,Math.max(maxSlots.get(n.owner)||1,n.slot+1));});
    let y=100;const lanes=owners.map((owner,index)=>{const lane={id:'Cards_lane_'+index,owner,y,height:Math.max(160,(maxSlots.get(owner)||1)*150)};y+=lane.height;return lane;});
    const width=Math.max(650,(last.column+1)*220+120),height=y-100;
    nodes.forEach(n=>{const lane=lanes.find(l=>l.owner===n.owner);n.x=150+n.column*220;n.y=lane.y+45+n.slot*150;});
    const xmlNodes=nodes.map(n=>`<bpmn:${n.type} id="${n.id}" name="${escape(n.label)}">${flows.filter(f=>f.target===n.id).map(f=>`<bpmn:incoming>${f.id}</bpmn:incoming>`).join('')}${flows.filter(f=>f.source===n.id).map(f=>`<bpmn:outgoing>${f.id}</bpmn:outgoing>`).join('')}</bpmn:${n.type}>`).join('');
    const xmlFlows=flows.map(f=>`<bpmn:sequenceFlow id="${f.id}" sourceRef="${f.source}" targetRef="${f.target}"${f.label?` name="${escape(f.label)}"`:''}/>`).join('');
    const shape=(id,x,y,w,h,extra='')=>`<bpmndi:BPMNShape id="DI_${id}" bpmnElement="${id}" ${extra}><dc:Bounds x="${x}" y="${y}" width="${w}" height="${h}"/></bpmndi:BPMNShape>`;
    const di=shape('Cards_pool',60,100,width,height,'isHorizontal="true"')+lanes.map(l=>shape(l.id,90,l.y,width-30,l.height,'isHorizontal="true"')).join('')+nodes.map(n=>shape(n.id,n.x,n.y,n.width,n.height)).join('')+flows.map(f=>{const a=nodes.find(n=>n.id===f.source),b=nodes.find(n=>n.id===f.target),x1=a.x+a.width,y1=a.y+a.height/2,x2=b.x,y2=b.y+b.height/2,middle=(x1+x2)/2;return `<bpmndi:BPMNEdge id="DI_${f.id}" bpmnElement="${f.id}"><di:waypoint x="${x1}" y="${y1}"/><di:waypoint x="${middle}" y="${y1}"/><di:waypoint x="${middle}" y="${y2}"/><di:waypoint x="${x2}" y="${y2}"/>${f.label?`<bpmndi:BPMNLabel><dc:Bounds x="${x2-55}" y="${y2-24}" width="45" height="20"/></bpmndi:BPMNLabel>`:''}</bpmndi:BPMNEdge>`;}).join('');
    const xml=`<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Cards_definitions" targetNamespace="https://siga.app/asis-cards"><bpmn:collaboration id="Cards_collaboration"><bpmn:participant id="Cards_pool" name="${escape(name)}" processRef="Cards_process"/></bpmn:collaboration><bpmn:process id="Cards_process" isExecutable="false"><bpmn:laneSet id="Cards_lanes">${lanes.map(l=>`<bpmn:lane id="${l.id}" name="${escape(l.owner)}">${nodes.filter(n=>n.owner===l.owner).map(n=>`<bpmn:flowNodeRef>${n.id}</bpmn:flowNodeRef>`).join('')}</bpmn:lane>`).join('')}</bpmn:laneSet>${xmlNodes}${xmlFlows}</bpmn:process><bpmndi:BPMNDiagram id="Cards_diagram"><bpmndi:BPMNPlane id="Cards_plane" bpmnElement="Cards_collaboration">${di}</bpmndi:BPMNPlane></bpmndi:BPMNDiagram></bpmn:definitions>`;
    return {xml,steps,nodes,flows};
  }
  scope.AsIsCards={compile};
})(globalThis);
