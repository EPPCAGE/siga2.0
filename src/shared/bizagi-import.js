(function(globalScope){
  // Identificadores oficiais de namespaces XML; não são usados em requisições HTTP.
  // Trocar o esquema por HTTPS altera a identidade do namespace e invalida o BPMN.
  const ns={
    bpmn:'http://www.omg.org/spec/BPMN/20100524/MODEL', // NOSONAR: namespace XML oficial do BPMN, sem acesso à rede.
    bpmndi:'http://www.omg.org/spec/BPMN/20100524/DI', // NOSONAR: namespace XML oficial do BPMN DI, sem acesso à rede.
    dc:'http://www.omg.org/spec/DD/20100524/DC', // NOSONAR: namespace XML oficial do DC, sem acesso à rede.
    di:'http://www.omg.org/spec/DD/20100524/DI', // NOSONAR: namespace XML oficial do DI, sem acesso à rede.
  };
  function convert(xml){
    const source=new DOMParser().parseFromString(xml,'application/xml');
    if(source.getElementsByTagName('parsererror').length) throw new Error('Diagrama Bizagi inválido.');
    const children=(node,name)=>[...node.children].filter(child=>child.localName===name);
    const all=(node,name)=>[...node.getElementsByTagNameNS('*',name)];
    const first=(node,name)=>all(node,name)[0];
    const id=value=>'Id_'+value;
    const doc=new DOMParser().parseFromString(`<bpmn:definitions xmlns:bpmn="${ns.bpmn}" xmlns:bpmndi="${ns.bpmndi}" xmlns:dc="${ns.dc}" xmlns:di="${ns.di}" targetNamespace="https://siga.app/bizagi"/>`,'application/xml');
    const definitions=doc.documentElement;
    const add=(parent,tag,attrs={},text)=>{
      const prefix=tag.includes(':')?tag.split(':')[0]:'bpmn';
      const node=doc.createElementNS(ns[prefix],tag.includes(':')?tag:'bpmn:'+tag);
      Object.entries(attrs).forEach(([key,value])=>{if(value!==null && value!==undefined && value!=='')node.setAttribute(key,String(value));});
      if(text!==undefined)node.textContent=text;
      parent.appendChild(node);return node;
    };
    const geometry=node=>{
      const infos=children(node,'NodeGraphicsInfos')[0];
      const info=infos&&children(infos,'NodeGraphicsInfo')[0],point=info&&first(info,'Coordinates');
      const number=(element,key)=>element?.hasAttribute(key)?Number(element.getAttribute(key)):Number.NaN;
      const box={x:number(point,'XCoordinate'),y:number(point,'YCoordinate'),width:number(info,'Width'),height:number(info,'Height')};
      if(!Object.values(box).every(Number.isFinite)||box.width<=0||box.height<=0)throw new Error('Elemento Bizagi sem posição ou tamanho válido.');
      return box;
    };
    const collaboration=add(definitions,'collaboration',{id:'Bizagi_Collaboration'});
    const plane=add(add(definitions,'bpmndi:BPMNDiagram',{id:'Bizagi_Diagram'}),'bpmndi:BPMNPlane',{id:'Bizagi_Plane',bpmnElement:'Bizagi_Collaboration'});
    const shape=(node,box,attrs={})=>{
      const di=add(plane,'bpmndi:BPMNShape',{id:node.id+'_di',bpmnElement:node.id,...attrs});
      add(di,'dc:Bounds',box);return di;
    };
    const elements=new Map(),processes=new Map();
    const remember=(sourceNode,node)=>{const key=sourceNode.getAttribute('Id');if(!key||elements.has(key))throw new Error('Identificador Bizagi ausente ou duplicado.');elements.set(key,node);};
    const workflows=all(source,'WorkflowProcess');
    if(!workflows.length)throw new Error('Este arquivo não contém processos para importar.');
    workflows.forEach(workflow=>{
      const process=add(definitions,'process',{id:id(workflow.getAttribute('Id')),name:workflow.getAttribute('Name'),isExecutable:false});
      processes.set(workflow.getAttribute('Id'),process);
      const transitions=children(workflow,'Transitions').flatMap(node=>children(node,'Transition'));
      const activities=children(workflow,'Activities').flatMap(node=>children(node,'Activity'));
      activities.forEach(activity=>{
        const route=children(activity,'Route')[0],event=children(activity,'Event')[0],implementation=children(activity,'Implementation')[0];
        let type,definition;
        if(route){
          type={Exclusive:'exclusiveGateway',Inclusive:'inclusiveGateway',Parallel:'parallelGateway'}[route.getAttribute('GatewayType')||'Exclusive'];
        }else if(event){
          const detail=event.children[0];
          if(!detail)throw new Error('Evento Bizagi sem tipo.');
          type={StartEvent:'startEvent',EndEvent:'endEvent'}[detail.localName];
          if(detail.localName==='IntermediateEvent')type=transitions.some(flow=>flow.getAttribute('To')===activity.getAttribute('Id'))?'intermediateThrowEvent':'intermediateCatchEvent';
          const trigger=detail.getAttribute('Trigger')||detail.getAttribute('Result')||'None';
          if(!['None','Link','Terminate'].includes(trigger))throw new Error(`Evento ${trigger} ainda não suportado na importação direta. Use o XML BPMN para este desenho.`);
          if(trigger==='Link')definition={type:'linkEventDefinition',name:first(detail,'TriggerResultLink')?.getAttribute('Name')||activity.getAttribute('Name')};
          if(trigger==='Terminate'){
            if(type!=='endEvent')throw new Error('Terminate deve ser um evento de fim no arquivo Bizagi.');
            definition={type:'terminateEventDefinition'};
          }
        }else if(implementation && children(implementation,'Task').length){
          const task=children(implementation,'Task')[0],detail=task.children[0];
          type=detail?{TaskUser:'userTask',TaskManual:'manualTask',TaskService:'serviceTask',TaskScript:'scriptTask',TaskSend:'sendTask',TaskReceive:'receiveTask',TaskBusinessRule:'businessRuleTask'}[detail.localName]:'task';
        }
        if(!type)throw new Error(`Elemento não suportado: ${activity.getAttribute('Name')||activity.getAttribute('Id')}. Use o XML BPMN para este desenho.`);
        const loop=children(activity,'Loop')[0]?.getAttribute('LoopType');
        if(loop && loop!=='None')throw new Error('Atividade com repetição ainda não suportada na importação direta. Use o XML BPMN.');
        const node=add(process,type,{id:id(activity.getAttribute('Id')),name:activity.getAttribute('Name'),gatewayDirection:route?.getAttribute('GatewayDirection')});
        remember(activity,node);
        if(definition)add(node,definition.type,{id:node.id+'_event',name:definition.name});
        shape(node,geometry(activity));
      });
      transitions.forEach(transition=>{
        const from=elements.get(transition.getAttribute('From')),to=elements.get(transition.getAttribute('To'));
        if(!from||!to)throw new Error('Conexão Bizagi com atividade ausente.');
        const flow=add(process,'sequenceFlow',{id:id(transition.getAttribute('Id')),name:transition.getAttribute('Name'),sourceRef:from.id,targetRef:to.id});
        remember(transition,flow);add(from,'outgoing',{},flow.id);add(to,'incoming',{},flow.id);
        const condition=children(transition,'Condition')[0];
        if(condition?.getAttribute('Type')==='OTHERWISE')from.setAttribute('default',flow.id);
        else if(condition?.textContent.trim())add(flow,'conditionExpression',{},condition.textContent.trim());
      });
    });
    all(source,'Pool').forEach(pool=>{
      const process=processes.get(pool.getAttribute('Process'));
      if(!process)throw new Error('Pool Bizagi sem processo correspondente.');
      const participant=add(collaboration,'participant',{id:id(pool.getAttribute('Id')),name:pool.getAttribute('Name'),processRef:process.id});
      remember(pool,participant);const box=geometry(pool);shape(participant,box,{isHorizontal:true});
      const lanes=children(pool,'Lanes').flatMap(node=>children(node,'Lane'));
      if(lanes.length){
        const set=add(process,'laneSet',{id:participant.id+'_lanes'});
        lanes.forEach(lane=>{
          const node=add(set,'lane',{id:id(lane.getAttribute('Id')),name:lane.getAttribute('Name')});remember(lane,node);
          const bounds=geometry(lane);bounds.y+=box.y;shape(node,bounds,{isHorizontal:true});
          const workflow=workflows.find(item=>item.getAttribute('Id')===pool.getAttribute('Process'));
          children(workflow,'Activities').flatMap(item=>children(item,'Activity')).forEach(activity=>{
            const a=geometry(activity),x=a.x+a.width/2,y=a.y+a.height/2;
            if(x>=bounds.x && x<=bounds.x+bounds.width && y>=bounds.y && y<bounds.y+bounds.height)add(node,'flowNodeRef',{},id(activity.getAttribute('Id')));
          });
        });
      }
    });
    all(source,'Artifact').forEach(artifact=>{
      if(artifact.getAttribute('ArtifactType')!=='Annotation')throw new Error('Artefato Bizagi não suportado. Use o XML BPMN.');
      const node=add(collaboration,'textAnnotation',{id:id(artifact.getAttribute('Id'))});remember(artifact,node);
      add(node,'text',{},artifact.getAttribute('TextAnnotation')||'');shape(node,geometry(artifact));
    });
    all(source,'Association').forEach(association=>{
      const from=elements.get(association.getAttribute('Source')),to=elements.get(association.getAttribute('Target'));
      if(!from||!to)throw new Error('Associação Bizagi com elemento ausente.');
      const node=add(collaboration,'association',{id:id(association.getAttribute('Id')),sourceRef:from.id,targetRef:to.id});remember(association,node);
    });
    [...all(source,'Transition'),...all(source,'Association')].forEach(connection=>{
      const node=elements.get(connection.getAttribute('Id')),info=first(connection,'ConnectorGraphicsInfo');
      const points=info?children(info,'Coordinates'):[];
      if(!node||points.length<2)throw new Error('Conexão Bizagi sem coordenadas válidas.');
      const edge=add(plane,'bpmndi:BPMNEdge',{id:node.id+'_di',bpmnElement:node.id});
      points.forEach(point=>{
        const x=Number(point.getAttribute('XCoordinate')),y=Number(point.getAttribute('YCoordinate'));
        if(!Number.isFinite(x)||!Number.isFinite(y))throw new Error('Coordenadas de conexão inválidas.');
        add(edge,'di:waypoint',{x,y});
      });
    });
    if(all(source,'Activity').length!==[...elements.values()].filter(node=>['task','userTask','manualTask','serviceTask','scriptTask','sendTask','receiveTask','businessRuleTask','startEvent','endEvent','intermediateCatchEvent','intermediateThrowEvent','exclusiveGateway','inclusiveGateway','parallelGateway'].includes(node.localName)).length)throw new Error('O desenho contém subprocessos ainda não suportados. Use o XML BPMN.');
    return new XMLSerializer().serializeToString(doc);
  }
  globalScope.BizagiImport={convert};
})(globalThis);
