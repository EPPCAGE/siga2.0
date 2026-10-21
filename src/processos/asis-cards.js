async function abrirEsbocoCards(){
  if(!isEP() || !curProc)return;
  if(document.getElementById('asis-cards-dialog'))return;
  if(typeof BpmnJS==='undefined'){toast('Aguarde o carregamento do editor BPMN.','var(--amber)');return;}
  const process=curProc,originalMod=process.mod || {},clone=value=>JSON.parse(JSON.stringify(value));
  const active=bpmnProcIds.asis===process.id?bpmnModelers.asis:null;
  let initialXml=originalMod.bpmnAsIs || '';
  try{if(active)initialXml=(await active.saveXML({format:true})).xml;}catch{toast('Não foi possível ler o desenho atual.','var(--red)');return;}
  if(curProc!==process || !isEP() || document.getElementById('asis-cards-dialog'))return;
  const originalSaved=originalMod.bpmnAsIs || '',cards=clone(originalMod.asIsCards?.cards || []);
  function migrate(items){for(const card of items){if(['decision','parallel','inclusive'].includes(card.type)){card.branches=clone(AsIsCards.branchesOf(card));delete card.yes;delete card.no;card.branches.forEach(branch=>migrate(branch.cards));}}}
  migrate(cards);
  const startInfo=clone(originalMod.asIsCards?.start || {nome:'Início do processo'});
  const dialog=document.createElement('dialog');dialog.id='asis-cards-dialog';dialog.className='asis-cards-dialog';dialog.setAttribute('aria-labelledby','asis-cards-title');
  dialog.innerHTML=`<header class="asis-cards-head"><div><h2 id="asis-cards-title">Esboço AS IS por cards <span class="badge ba">Experimental</span></h2><p class="ph-s">${esc(process.nome)} · Os cards geram a prévia automaticamente.</p></div><button type="button" class="btn" data-action="close">Fechar</button></header><p class="ib ibb">Construa o processo com cards. Clique para editar; escolha se os caminhos se reencontram ou terminam separadamente. Nomeie os caminhos dos gateways livremente e adicione novas saídas. Links BPMN são usados apenas se o roteamento por setas não encontrar um caminho sem cruzamentos.</p><div class="asis-cards-layout"><section aria-label="Cards do processo"><div class="asis-cards-list"></div></section><section class="asis-cards-preview" aria-label="Prévia BPMN"><div class="asis-cards-preview-head"><strong>Desenho BPMN</strong><div class="asis-preview-tools"><button type="button" class="btn" data-action="validate">Verificar fluxo</button><button type="button" class="btn" data-action="zoom-in" aria-label="Ampliar prévia">+</button><button type="button" class="btn" data-action="zoom-out" aria-label="Reduzir prévia">−</button><button type="button" class="btn" data-action="fit">Ajustar</button></div></div><p id="asis-cards-layout-status" class="ph-s" role="status">Arraste os elementos e ajuste os caminhos. O layout será salvo ao aplicar.</p><div id="asis-cards-canvas"></div></section></div><footer><section id="asis-cards-validation" class="asis-validation" aria-live="polite" aria-label="Validação do fluxo" hidden></section><p role="alert" id="asis-cards-error"></p><p class="ph-s">A prévia não altera o desenho atual. Ao aplicar, os cards, o BPMN e as etapas são salvos juntos. Os ajustes de posição, tamanho, rótulos e traçados do desenho também são salvos. Altere os nomes, responsáveis e caminhos pelos cards.</p><label class="asis-cards-consent"><input type="checkbox" id="asis-cards-confirm"> Aplicar este esboço no lugar do desenho e das etapas AS IS atuais, guardando uma versão anterior.</label><button type="button" class="btn btn-p" id="asis-cards-apply" disabled>Aplicar e salvar AS IS</button></footer>`;
  document.body.append(dialog);dialog.showModal();
  let viewer,saving=false,closed=false,revision=0,timer=null,queue=Promise.resolve(),built=null,previewValid=false,rendering=false,renderedSignature=null,layout=clone(originalMod.asIsCards?.layout || null),initialLayout=cards.length?initialXml:null;
  const error=dialog.querySelector('#asis-cards-error'),apply=dialog.querySelector('#asis-cards-apply'),list=dialog.querySelector('.asis-cards-list');
  try{viewer=new BpmnJS({...bpmnModelerOptions(dialog.querySelector('#asis-cards-canvas')),keyboard:{bindTo:null}});}catch(e){dialog.remove();toast('Não foi possível iniciar a prévia BPMN.','var(--red)');return;}
  const eventBus=viewer.get('eventBus'),canvasElement=dialog.querySelector('#asis-cards-canvas');
  const setBusy=value=>{canvasElement.style.pointerEvents=value?'none':'';};
  // The cards own the process structure; the canvas edits its presentation.
  viewer.get('directEditing').activate=()=>false;
  for(const action of ['shape.create','connection.create','shape.delete','connection.delete','elements.delete','shape.replace','connection.reconnect','connection.reconnectStart','connection.reconnectEnd'])eventBus.on('commandStack.'+action+'.canExecute',2000,()=>false);
  for(const action of ['shape.move','elements.move'])eventBus.on('commandStack.'+action+'.canExecute',2000,event=>{
    const context=event.context || {},target=context.newParent || context.target,shapes=context.shapes || (context.shape?[context.shape]:[]);
    if(shapes.some(shape=>shape.businessObject?.get('siga:milestone')))return false;
    if(target&&shapes.some(shape=>!shape.labelTarget&&shape.type!=='bpmn:Participant'&&shape.parent&&target!==shape.parent))return false;
  });
  eventBus.on('commandStack.shape.resize.canExecute',2000,event=>{if(event.context?.shape?.businessObject?.get('siga:milestone'))return false;});
  function checkDiagram(compiled){
    const registry=viewer.get('elementRegistry'),expected=new Set([...compiled.nodes,...compiled.flows,...compiled.milestones].map(item=>item.id));
    const actual=registry.getAll().filter(item=>!item.labelTarget&&!['bpmn:Lane','bpmn:Participant','bpmn:Collaboration','bpmn:Process'].includes(item.type));
    if(actual.some(item=>!expected.has(item.id))||[...expected].some(id=>!registry.get(id)))throw Error('A estrutura do desenho deve ser alterada pelos cards. Há elementos diferentes do fluxo gerado.');
    const owners=new Map();registry.getAll().filter(item=>item.type==='bpmn:Lane').forEach(lane=>(lane.businessObject.flowNodeRef || []).forEach(node=>owners.set(node.id,AsIsCards.ownerKey(lane.businessObject.name))));
    for(const node of compiled.nodes){const element=registry.get(node.id),type='bpmn:'+node.type[0].toUpperCase()+node.type.slice(1);if(element.type!==type||(element.businessObject.name || '')!==node.label||owners.get(node.id)!==AsIsCards.ownerKey(node.owner))throw Error('Altere nomes, tipos e responsáveis pelos cards para manter o desenho e as etapas sincronizados.');}
    for(const phase of compiled.milestones){const element=registry.get(phase.id);if(!element.businessObject.get('siga:milestone')||element.businessObject.text!==phase.name)throw Error('Altere os marcos pelos cards.');}
    for(const node of compiled.nodes){
      const element=registry.get(node.id),name=element.businessObject.get('siga:milestoneName') || '';if(name!==(node.milestone || ''))throw Error('Altere o marco da atividade pelo card.');
      if(node.type.endsWith('Task')){
        const phase=name?registry.get(compiled.milestones.find(item=>item.name===name)?.id):null;
        if(phase&&(element.x<phase.x+8||element.x+element.width>phase.x+phase.width-8))throw Error('A atividade “'+node.label+'” deve ficar dentro do marco “'+name+'”. Mova-a para dentro ou altere o marco no card.');
        if(!name&&compiled.milestones.some(item=>{const band=registry.get(item.id);return element.x<band.x+band.width&&element.x+element.width>band.x;}))throw Error('A atividade “'+node.label+'” está sem marco. Mantenha-a fora dos marcos ou escolha um marco no card.');
      }
    }
    for(const flow of compiled.flows){const element=registry.get(flow.id).businessObject;if(element.sourceRef?.id!==flow.source||element.targetRef?.id!==flow.target||(element.name || '')!==flow.label)throw Error('Altere os caminhos do processo pelos cards.');}
  }
  function captureDraft(markChanges=false){
    const current=AsIsCards.captureLayout(viewer),manualShapes=new Set(layout?.manualShapes || []),manualConnections=new Set(layout?.manualConnections || []);
    if(markChanges&&layout){
      for(const [key,shape] of Object.entries(current.shapes)){const previous=layout.shapes[key];if(previous&&['x','y','width','height'].some(field=>previous[field]!==shape[field]))manualShapes.add(key);}
      for(const [key,edge] of Object.entries(current.connections)){const previous=layout.connections?.[key];if(previous&&JSON.stringify(previous.points)!==JSON.stringify(edge.points))manualConnections.add(key);}
    }
    layout={...current,version:2,manualShapes:[...manualShapes],manualConnections:[...manualConnections]};return layout;
  }
  eventBus.on('commandStack.changed',()=>{
    if(rendering||saving||closed||!built)return;
    captureDraft(true);dialog.querySelector('#asis-cards-confirm').checked=false;
    try{checkDiagram(built);previewValid=true;error.textContent='';}catch(e){previewValid=false;error.textContent=e.message;}
    dialog.querySelector('#asis-cards-layout-status').textContent='Ajustes visuais pendentes. Use Aplicar e salvar AS IS para gravá-los.';enabled();
  });
  function enabled(){apply.disabled=saving || !previewValid || !cards.length || !dialog.querySelector('#asis-cards-confirm').checked;}
  function showValidation(validation){
    const panel=dialog.querySelector('#asis-cards-validation');panel.hidden=!validation;if(!validation)return;
    const errors=validation.errors || [],warnings=validation.warnings || [];
    panel.dataset.state=errors.length?'error':warnings.length?'warning':'success';
    const title=errors.length?'Corrija o fluxo antes de salvar':warnings.length?'Fluxo verificado com alertas':'Verificação do fluxo: nenhum problema encontrado';
    panel.innerHTML=`<strong>${title}</strong>${errors.length?`<ul>${errors.map(issue=>`<li>${esc(issue.message)}</li>`).join('')}</ul>`:''}${warnings.length?`<ul>${warnings.map(issue=>`<li>${esc(issue.message)}</li>`).join('')}</ul>`:''}`;
  }
  function preview(){
    clearTimeout(timer);const rev=++revision;previewValid=false;enabled();showValidation(null);
    const signature=JSON.stringify([cards,startInfo]);let compiled;try{compiled=AsIsCards.compile(cards,process.nome,startInfo);}catch(e){error.textContent=e.validation?'':e.message;showValidation(e.validation);return queue;}
    queue=queue.catch(()=>{}).then(async()=>{
      if(closed || rev!==revision)return;
      try{
        let imported={warnings:[]};
        if(!built||renderedSignature!==signature){
          rendering=true;setBusy(true);
          if(built)captureDraft();
          else if(initialLayout){
            if(originalMod.asIsCards?.layout){try{await viewer.importXML(initialLayout);captureDraft(true);}catch{ /* Keep the saved layout if the older diagram cannot be read. */ }}
            initialLayout=null;if(closed||rev!==revision)return;
          }
          const merged=AsIsCards.mergeLayout(compiled.xml,layout);imported=await viewer.importXML(merged.xml);if(closed || rev!==revision)return;
          AsIsCards.routeLayout(viewer,compiled,merged.reroute);
          checkDiagram(compiled);captureDraft();renderedSignature=signature;viewer.get('canvas').zoom('fit-viewport');
        }else checkDiagram(compiled);
        const validation={...compiled.validation,warnings:[...compiled.validation.warnings,...(imported.warnings || []).map(warning=>({code:'BPMN_IMPORT_WARNING',message:'O editor sinalizou: '+warning.message,nodeIds:[]}))]};
        built=compiled;previewValid=validation.valid;error.textContent='';showValidation(validation);enabled();
      }catch(e){if(rev===revision){error.textContent='Não foi possível gerar o BPMN: '+e.message;previewValid=false;showValidation(null);enabled();}}finally{rendering=false;setBusy(saving);}

    });return queue;
  }
  function find(id,items=cards){for(let index=0;index<items.length;index++){const card=items[index];if(card.id===id)return {card,items,index};for(const branch of card.branches || []){const found=find(id,branch.cards);if(found)return found;}}return null;}
  const types={task:['▣','Atividade'],decision:['◇','Decisão'],parallel:['＋','Paralelo'],inclusive:['○','Inclusivo'],wait:['◷','Espera'],end:['◎','Encerramento'],return:['↶','Retornar à etapa']};
  const gateway=card=>['decision','parallel','inclusive'].includes(card.type);
  const palette=path=>`<div class="asis-cards-add">${Object.entries(types).map(([type,[icon,label]])=>`<button type="button" class="btn" data-action="add-${type}" data-path="${esc(path)}">${icon} ${label}</button>`).join('')}</div>`;
  function render(items=cards,path='root'){
    return items.map((card,index)=>`<article class="asis-step asis-kind-${card.type}" data-card="${esc(card.id)}"><div class="asis-step-head"><button class="asis-card-summary" type="button" data-action="edit" data-id="${esc(card.id)}"><span class="asis-type-icon">${types[card.type]?.[0] || '▣'}</span><span><strong>${esc(card.nome)}</strong><small>${esc(types[card.type]?.[1])}${card.executor?' · '+esc(card.executor):''}${card.type==='task'?' · '+esc(card.modo):''}${card.type==='task'&&card.milestone?' · Marco: '+esc(card.milestone):''}${card.type==='wait'?' · '+esc(card.duration || 'PT1H'):''}${card.type==='return'?' · '+esc(find(card.targetId)?.card.nome || 'Selecione a etapa de destino'):''}</small></span></button><div class="asis-card-tools"><button class="btn" type="button" data-action="up" data-id="${esc(card.id)}" ${index===0?'disabled':''} aria-label="Mover para cima">↑</button><button class="btn" type="button" data-action="down" data-id="${esc(card.id)}" ${index===items.length-1?'disabled':''} aria-label="Mover para baixo">↓</button><button class="btn" type="button" data-action="edit" data-id="${esc(card.id)}">Editar</button><button class="btn" type="button" data-action="remove" data-id="${esc(card.id)}" aria-label="Remover card">×</button></div></div>${gateway(card)?`<div class="asis-branches">${card.branches.map(branch=>`<section data-branch="${esc(branch.id)}"><h3>${esc(branch.nome)}</h3>${render(branch.cards,card.id+':'+branch.id)}</section>`).join('')}</div><p class="asis-join-note">${card.join===false?'⑂ Caminhos independentes · finais separados':'⑂ Os caminhos se reencontram'}</p>`:''}</article>`).join('')+((['end','return'].includes(items.at(-1)?.type)||(gateway(items.at(-1)||{})&&items.at(-1).join===false))?'':palette(path));
  }
  function refresh(){list.innerHTML=`<div class="asis-builder-title"><strong>Construa com cards</strong><span>Clique em um card para editar</span></div><button type="button" class="asis-start-card" data-action="edit-start"><span>◯</span><strong>${esc(startInfo.nome)}${startInfo.executor?` · ${esc(startInfo.executor)}`:''}</strong><span>Editar início</span></button>`+render();void preview();}
  function changed(){dialog.querySelector('#asis-cards-confirm').checked=false;refresh();}
  function targetsFor(targetItems,beforeIndex){
    function search(items,inherited=[]){
      const available=[...inherited];
      for(let index=0;index<items.length;index++){
        if(items===targetItems&&index===beforeIndex)return available;
        const card=items[index];if(!['return','end'].includes(card.type))available.push({id:card.id,nome:card.nome});
        for(const branch of card.branches || []){const result=search(branch.cards,available);if(result)return result;}
      }
      return items===targetItems?available:null;
    }
    return search(cards)||[];
  }
  function editCard(card,onSave,targets=[]){
    const popup=document.createElement('dialog');popup.className='asis-card-editor';popup.id='asis-card-editor';
    const owners=AsIsCards.ownersOf(cards,startInfo),milestones=AsIsCards.milestonesOf(cards);
    const isStart=card.type==='start',branches=gateway(card)?clone(AsIsCards.branchesOf(card)):[];
    popup.innerHTML=`<form><header><span class="asis-type-icon">${isStart?'◯':types[card.type][0]}</span><div><small>Editar card</small><h3>${isStart?'Início do processo':types[card.type][1]}</h3></div></header><label class="fg"><span class="fl">Nome</span><input id="asis-card-name" name="nome" class="fi" required maxlength="240" value="${esc(card.nome)}"></label>${card.type!=='return'?`<label class="fg"><span class="fl">Responsável / raia</span><input name="executor" class="fi" list="asis-card-owners" autocomplete="off" value="${esc(card.executor || '')}" placeholder="${card.type==='task'?'Informe o responsável':'Automático: responsável da etapa próxima'}"><datalist id="asis-card-owners">${owners.map(owner=>`<option value="${esc(owner)}"></option>`).join('')}</datalist><small>Selecione um responsável da lista ou digite um novo. Maiúsculas e minúsculas são consideradas o mesmo nome.</small></label>`:''}${card.type==='task'?`<label class="fg"><span class="fl">Marco (milestone)</span><input name="milestone" class="fi" list="asis-card-milestones" autocomplete="off" maxlength="120" value="${esc(card.milestone || '')}" placeholder="Sem marco"><datalist id="asis-card-milestones">${milestones.map(name=>`<option value="${esc(name)}"></option>`).join('')}</datalist><small>Escolha um marco existente ou digite um novo. Em branco, a atividade fica sem marco.</small></label><label class="fg"><span class="fl">Execução</span><select name="modo" class="fi">${['Manual','Semi-automatica','Automatica'].map(mode=>`<option ${mode===card.modo?'selected':''}>${mode}</option>`).join('')}</select></label>`:''}${card.type==='return'?`<label class="fg"><span class="fl">Retornar para</span><select class="fi" name="targetId" required>${targets.map(target=>`<option value="${esc(target.id)}" ${target.id===card.targetId?'selected':''}>${esc(target.nome)}</option>`).join('')}</select><small>O caminho volta à etapa escolhida. A continuidade ficará na outra saída da decisão.</small></label>`:''}${card.type==='wait'?`<label class="fg"><span class="fl">Duração (ISO 8601)</span><input name="duration" class="fi" required value="${esc(card.duration || 'PT1H')}"><small>PT1H = 1 hora · PT30M = 30 minutos · P1D = 1 dia</small></label>`:''}${gateway(card)?`<fieldset class="asis-paths-editor"><legend>Caminhos do gateway</legend><div data-branch-fields></div><button type="button" class="btn" data-add-branch>+ Adicionar caminho</button></fieldset><label class="fg"><span class="fl">Após os caminhos</span><select name="join" class="fi"><option value="true" ${card.join!==false?'selected':''}>Reencontrar e continuar o processo</option><option value="false" ${card.join===false?'selected':''}>Manter separados, com finais independentes</option></select></label><p class="ph-s">Em caminhos independentes, adicione as próximas atividades dentro de cada caminho. Cada um poderá ter seu próprio encerramento.</p>`:''}<label class="fg"><span class="fl">Observações</span><textarea name="descricao" class="fi" rows="3">${esc(card.descricao || '')}</textarea></label><footer><button type="button" class="btn" data-cancel>Cancelar</button><button class="btn btn-p" type="submit">Salvar card</button></footer></form>`;
    document.body.append(popup);popup.showModal();popup.querySelector('input').focus();popup.querySelector('[data-cancel]').onclick=()=>popup.close();popup.addEventListener('close',()=>popup.remove());
    function renderBranches(){
      const fields=popup.querySelector('[data-branch-fields]');if(!fields)return;
      popup.querySelector('[data-add-branch]').disabled=branches.length>=60;
      fields.innerHTML=branches.map((branch,index)=>`<div class="asis-path-row"><label>Caminho ${index+1}<input class="fi" name="branch-${index}" data-branch-index="${index}" required maxlength="120" value="${esc(branch.nome)}"></label><button type="button" class="btn" data-remove-branch="${index}" ${branches.length<=2?'disabled':''} aria-label="Remover caminho ${index+1}">×</button></div>`).join('');
    }
    renderBranches();
    popup.addEventListener('input',event=>{const index=event.target.dataset.branchIndex;if(index!==undefined){branches[Number(index)].nome=event.target.value;event.target.setCustomValidity('');}});
    popup.addEventListener('click',event=>{
      if(event.target.closest('[data-add-branch]')&&branches.length<60){branches.push({id:'b_'+crypto.randomUUID().replaceAll('-','_'),nome:'Caminho '+(branches.length+1),cards:[]});renderBranches();}
      const remove=event.target.closest('[data-remove-branch]');if(remove&&branches.length>2){const index=Number(remove.dataset.removeBranch);if(branches[index].cards.length&&!globalThis.confirm('Remover este caminho e todos os seus cards?'))return;branches.splice(index,1);renderBranches();}
    });
    popup.querySelector('form').onsubmit=event=>{event.preventDefault();const data=Object.fromEntries([...new FormData(event.target)].filter(([key])=>!key.startsWith('branch-')));if(gateway(card)){const empty=branches.findIndex(branch=>!branch.nome.trim());if(empty>=0){const input=popup.querySelector(`[name="branch-${empty}"]`);input.setCustomValidity('Informe o nome do caminho.');input.reportValidity();return;}data.branches=branches.map(branch=>({...branch,nome:branch.nome.trim()}));}if('milestone' in data)data.milestone=milestones.find(name=>AsIsCards.ownerKey(name)===AsIsCards.ownerKey(data.milestone)) || data.milestone.trim().normalize('NFC');if('executor' in data)data.executor=owners.find(owner=>AsIsCards.ownerKey(owner)===AsIsCards.ownerKey(data.executor)) || data.executor.trim().normalize('NFC');data.nome=data.nome.trim();if(!data.nome)return;if('join' in data)data.join=data.join==='true';onSave(data);popup.close();changed();};
  }
  dialog.addEventListener('input',event=>{if(event.target.id==='asis-cards-confirm')enabled();});
  dialog.addEventListener('click',event=>{
    const button=event.target.closest('button[data-action]');if(!button || saving)return;
    const action=button.dataset.action;if(action==='close'){dialog.close();return;}if(action==='validate'){void preview();return;}if(action==='fit'){viewer.get('canvas').zoom('fit-viewport');return;}if(action==='zoom-in' || action==='zoom-out'){const canvas=viewer.get('canvas');canvas.zoom(canvas.zoom()*(action==='zoom-in'?1.2:1/1.2));return;}
    if(action==='edit-start'){editCard({...startInfo,type:'start'},data=>Object.assign(startInfo,data));return;}
    if(action.startsWith('add-')){
      const path=button.dataset.path;let target=cards;
      if(path!=='root'){const [id,branch]=path.split(':');const parent=find(id);if(!parent)return;const selected=parent.card.branches.find(item=>item.id===branch);if(!selected)return;target=selected.cards;}
      const type=action.slice(4),card={id:'c_'+crypto.randomUUID().replaceAll('-','_'),type,nome:types[type][1],executor:'',modo:'Manual',descricao:'',...(type==='wait'?{duration:'PT1H'}:{}),...(['decision','parallel','inclusive'].includes(type)?{branches:[{id:'yes',nome:type==='decision'?'Sim':'Caminho A',cards:[]},{id:'no',nome:type==='decision'?'Não':'Caminho B',cards:[]}],join:true}:{})};
      const targets=targetsFor(target,target.length);if(type==='return'&&!targets.length){toast('Adicione uma atividade ou decisão anterior para receber o retorno.','var(--amber)');return;}
      editCard(card,data=>target.push({...card,...data}),targets);return;
    }
    const found=find(button.dataset.id);if(!found)return;
    if(action==='edit'){editCard(found.card,data=>Object.assign(found.card,data),targetsFor(found.items,found.index));return;}
    if(action==='remove'){
      if(gateway(found.card)&&found.card.branches.some(branch=>branch.cards.length)&&!globalThis.confirm('Remover este card e todos os cards dos seus caminhos?'))return;
      found.items.splice(found.index,1);
    }else{const next=found.index+(action==='up'?-1:1);if(next<0 || next>=found.items.length)return;[found.items[next],found.items[found.index]]=[found.items[found.index],found.items[next]];}
    changed();
  });
  dialog.addEventListener('cancel',event=>{if(saving)event.preventDefault();});
  dialog.addEventListener('close',()=>{closed=true;clearTimeout(timer);try{viewer.destroy();}catch{}dialog.remove();});
  apply.onclick=async()=>{
    if(saving || !isEP())return;
    await preview();if(!isEP() || !previewValid || !cards.length || !dialog.querySelector('#asis-cards-confirm').checked)return;
    if(curProc!==process || processos.find(p=>String(p.id)===String(process.id))!==process || globalThis._fbConflictedProcIds?.has(process.id) || process.mod!==originalMod || (process.mod.bpmnAsIs || '')!==originalSaved){error.textContent='O processo foi atualizado. Feche o teste e recarregue os dados antes de aplicar.';return;}
    if(!fbReady() || !globalThis._fbLoadedAt){error.textContent='Conecte-se e aguarde o carregamento dos dados antes de aplicar.';return;}
    saving=true;setBusy(true);enabled();dialog.querySelectorAll('button,input,select,textarea').forEach(input=>input.disabled=true);
    const current=bpmnProcIds.asis===process.id?bpmnModelers.asis:null;let candidateMod=null;
    try{
      const currentXml=current?(await current.saveXML({format:true})).xml:(process.mod.bpmnAsIs || '');
      if(currentXml!==initialXml)throw Error('O desenho foi alterado no editor livre. Feche o teste e reabra antes de aplicar.');
      checkDiagram(built);const {xml}=await viewer.saveXML({format:true}),savedLayout=captureDraft();
      const {svg}=await bpmnExportSvg(viewer);
      const next=clone(originalMod);candidateMod=next;process.mod=next;
      if(initialXml || next.etapas_proc?.length)_arquivarVersaoAnterior(process,'asis',{asIs:next.asIs || '',bpmnAsIs:initialXml || null,etapas_proc:clone(next.etapas_proc || []),asIsCards:clone(next.asIsCards || null)});
      next.asIs=document.getElementById('e-asis')?.value ?? next.asIs ?? '';
      next.bpmnAsIs=xml;next.bpmnAsIsSvg=svg;next.asIsCards={version:4,start:clone(startInfo),cards:clone(cards),layout:savedLayout};
      // Preserve detailed metadata for cards that were already applied before.
      next.etapas_proc=built.steps.map(step=>{
        const previous=(originalMod.etapas_proc || []).find(item=>item.bpmn_id===step.bpmn_id);
        return previous?{...previous,...step,id:previous.id,natureza:previous.natureza || step.natureza}:step;
      });
      const stepIds=new Map(built.steps.map((step,index)=>[step.id,next.etapas_proc[index].id]));
      next.etapas_proc.forEach(step=>{if(step.vinculo_gw)step.vinculo_gw={...step.vinculo_gw,gw_ep_id:stepIds.get(step.vinculo_gw.gw_ep_id) || step.vinculo_gw.gw_ep_id};});
      try{if(await fbSaveAll()!==true)throw Error('Não foi possível confirmar a gravação.');}catch(e){process.mod=originalMod;throw e;}
    }catch(e){
      if(candidateMod && process.mod===candidateMod)process.mod=originalMod;
      error.textContent=e.message;saving=false;setBusy(false);dialog.querySelectorAll('button,input,select,textarea').forEach(input=>input.disabled=false);enabled();return;
    }
    // The saved XML is authoritative; detach the old editor so re-entry loads it.
    if(current){try{current.destroy();}catch{}bpmnModelers.asis=null;bpmnProcIds.asis=null;}
    bpmnDirty.asis=false;
    dialog.close();initBpmnMod('asis',process);
    if(typeof _refreshEtapasList==='function')_refreshEtapasList();
    toast('Esboço por cards salvo no AS IS.','var(--teal)');
  };
  refresh();
}
