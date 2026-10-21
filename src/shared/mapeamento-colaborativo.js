(function(scope){
  const key=value=>String(value || '').trim().normalize('NFC').toLocaleLowerCase('pt-BR');
  const units=architecture=>architecture.flatMap(macro=>(macro.processos || []).flatMap(process=>[
    {id:process.id,nome:process.nome,macro_id:macro.id,macro:macro.nome,pai_id:'',label:process.nome},
    ...(process.subprocessos || []).map(sub=>({id:sub.id,nome:sub.nome,macro_id:macro.id,macro:macro.nome,pai_id:process.id,label:process.nome+' › '+sub.nome}))
  ]));
  const matches=(architecture,macroId,name)=>units(architecture).filter(unit=>String(unit.macro_id)===String(macroId)&&key(unit.nome)===key(name));
  function canEdit(record,uid,ep){return record.status==='rascunho'?record.autor_uid===uid:record.status==='enviado'&&ep;}
  const canDelete=(record,uid)=>record.status==='rascunho'&&record.autor_uid===uid;
  function assertTransition(record,next,uid,ep){
    if(!canEdit(record,uid,ep))throw Error('Este mapeamento não está disponível para edição.');
    const allowed=record.status==='rascunho'?['rascunho','enviado']:['enviado','publicado'];
    if(!allowed.includes(next))throw Error('Transição de status inválida.');
  }
  const cloneSteps=steps=>JSON.parse(JSON.stringify(steps));
  function extract(xml,previous=[]){
    const doc=new DOMParser().parseFromString(xml,'application/xml');
    if(doc.getElementsByTagName('parsererror').length)throw Error('O desenho BPMN não é válido.');
    const laneMap=_bpmnBuildLaneMap(doc),tasks=new Set(['task','usertask','servicetask','sendtask','receivetask','manualtask','scripttask','businessruletask','callactivity']);
    const nodes=_bpmnBuildNodeInfo(doc,new Set(['exclusivegateway','inclusivegateway','parallelgateway','complexgateway','eventbasedgateway']),tasks,laneMap);
    const steps=_bpmnExpandSubprocesses(_bpmnBuildFlatGwAware(_bpmnBuildOutgoing(doc),nodes,_bpmnBuildFlowLabels(doc)),doc,new Set(['exclusivegateway','inclusivegateway','parallelgateway','complexgateway','eventbasedgateway']),tasks,laneMap);
    const currentIds=new Set(steps.map(step=>step.bpmn_id)),current=new Map(steps.map(step=>[step.bpmn_id,step]));
    return _bpmnMergeExtractedEtapas(cloneSteps(previous).filter(step=>currentIds.has(step.bpmn_id)),steps).etapas.map(step=>({...step,nome:current.get(step.bpmn_id).nome,tipo:current.get(step.bpmn_id).tipo}));
  }
  scope.MapeamentoColaborativo={key,units,matches,canEdit,canDelete,assertTransition,extract};
})(globalThis);
