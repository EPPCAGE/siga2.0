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
  const dialog=document.createElement('dialog');dialog.id='asis-cards-dialog';dialog.className='asis-cards-dialog';dialog.setAttribute('aria-labelledby','asis-cards-title');
  dialog.innerHTML=`<header class="asis-cards-head"><div><h2 id="asis-cards-title">Esboço AS IS por cards <span class="badge ba">Experimental</span></h2><p class="ph-s">${esc(process.nome)} · Os cards geram a prévia automaticamente.</p></div><button type="button" class="btn" data-action="close">Fechar</button></header><p class="ib ibb">Monte as atividades e decisões à esquerda. Cada responsável gera uma raia; os caminhos Sim e Não voltam a se encontrar. Use o editor livre para ajustes avançados após aplicar.</p><div class="asis-cards-layout"><section aria-label="Cards do processo"><div class="asis-cards-list"></div></section><section class="asis-cards-preview" aria-label="Prévia BPMN"><div class="asis-cards-preview-head"><strong>Prévia BPMN</strong><div class="asis-preview-tools"><button type="button" class="btn" data-action="zoom-in" aria-label="Ampliar prévia">+</button><button type="button" class="btn" data-action="zoom-out" aria-label="Reduzir prévia">−</button><button type="button" class="btn" data-action="fit">Ajustar</button></div></div><div id="asis-cards-canvas"></div></section></div><footer><p role="alert" id="asis-cards-error"></p><p class="ph-s">A prévia não altera o desenho atual. Ao aplicar, os cards, o BPMN e as etapas são salvos juntos. Reaplicar os cards substitui os ajustes feitos no editor livre.</p><label class="asis-cards-consent"><input type="checkbox" id="asis-cards-confirm"> Aplicar este esboço no lugar do desenho e das etapas AS IS atuais, guardando uma versão anterior.</label><button type="button" class="btn btn-p" id="asis-cards-apply" disabled>Aplicar e salvar AS IS</button></footer>`;
  document.body.append(dialog);dialog.showModal();
  let viewer,saving=false,closed=false,revision=0,timer=null,queue=Promise.resolve(),built=null,previewValid=false;
  const error=dialog.querySelector('#asis-cards-error'),apply=dialog.querySelector('#asis-cards-apply'),list=dialog.querySelector('.asis-cards-list');
  try{viewer=new BpmnJS({...bpmnModelerOptions(dialog.querySelector('#asis-cards-canvas')),keyboard:{bindTo:null}});}catch(e){dialog.remove();toast('Não foi possível iniciar a prévia BPMN.','var(--red)');return;}
  function enabled(){apply.disabled=saving || !previewValid || !cards.length || !dialog.querySelector('#asis-cards-confirm').checked;}
  function preview(){
    clearTimeout(timer);const rev=++revision;previewValid=false;enabled();
    let compiled;try{compiled=AsIsCards.compile(cards,process.nome);}catch(e){error.textContent=e.message;return queue;}
    queue=queue.catch(()=>{}).then(async()=>{
      if(closed || rev!==revision)return;
      try{await viewer.importXML(compiled.xml);if(closed || rev!==revision)return;viewer.get('canvas').zoom('fit-viewport');built=compiled;previewValid=true;error.textContent='';enabled();}
      catch(e){if(rev===revision){error.textContent='Não foi possível gerar o BPMN: '+e.message;previewValid=false;enabled();}}
    });return queue;
  }
  function find(id,items=cards){for(let index=0;index<items.length;index++){const card=items[index];if(card.id===id)return {card,items,index};for(const branch of ['yes','no']){const found=find(id,card[branch] || []);if(found)return found;}}return null;}
  const field=(card,name,label,type='input')=>`<label class="fg"><span class="fl">${label}</span><${type} class="fi" data-id="${esc(card.id)}" data-field="${name}" ${type==='input'?`value="${esc(card[name] || '')}"`:''}>${type==='textarea'?esc(card[name] || ''):''}</${type}></label>`;
  function render(items=cards,path='root'){
    const content=items.map((card,index)=>`<article class="card asis-step" data-card="${esc(card.id)}"><div class="asis-step-head"><strong>${card.type==='task'?'Atividade':'Decisão'}</strong><div><button type="button" class="btn" data-action="up" data-id="${esc(card.id)}" ${index===0?'disabled':''} aria-label="Mover card para cima">↑</button><button type="button" class="btn" data-action="down" data-id="${esc(card.id)}" ${index===items.length-1?'disabled':''} aria-label="Mover card para baixo">↓</button><button type="button" class="btn btn-r" data-action="remove" data-id="${esc(card.id)}">Remover</button></div></div>${field(card,'nome',card.type==='task'?'Nome da atividade':'Pergunta da decisão')}${card.type==='task'?field(card,'executor','Responsável (raia)')+`<label class="fg"><span class="fl">Modo de execução</span><select class="fi" data-id="${esc(card.id)}" data-field="modo">${[['Manual','Manual'],['Semi-automatica','Semiautomática'],['Automatica','Automática']].map(([value,label])=>`<option value="${value}" ${card.modo===value?'selected':''}>${label}</option>`).join('')}</select></label>`:''}${field(card,'descricao','Observações','textarea')}${card.type==='decision'?`<div class="asis-branches">${['yes','no'].map(branch=>`<section><h3>${branch==='yes'?'Sim':'Não'}</h3>${render(card[branch] || [],card.id+':'+branch)}</section>`).join('')}</div><p class="ph-s">Os caminhos se reencontram antes da próxima atividade.</p>`:''}</article>`).join('');
    return content+`<div class="asis-cards-add"><button type="button" class="btn" data-action="add-task" data-path="${esc(path)}">+ Atividade</button><button type="button" class="btn" data-action="add-decision" data-path="${esc(path)}">+ Decisão</button></div>`;
  }
  function refresh(){list.innerHTML=render();preview();}
  dialog.addEventListener('input',event=>{
    if(saving)return;
    const input=event.target;if(input.id==='asis-cards-confirm'){enabled();return;}
    if(!input.dataset.field)return;const found=find(input.dataset.id);if(!found)return;
    found.card[input.dataset.field]=input.value;previewValid=false;enabled();clearTimeout(timer);timer=setTimeout(preview,250);
  });
  dialog.addEventListener('change',event=>{if(event.target.matches('select[data-field]')){const found=find(event.target.dataset.id);if(found){found.card[event.target.dataset.field]=event.target.value;preview();}}});
  dialog.addEventListener('click',event=>{
    const button=event.target.closest('button[data-action]');if(!button || saving)return;
    const action=button.dataset.action;if(action==='close'){dialog.close();return;}if(action==='fit'){viewer.get('canvas').zoom('fit-viewport');return;}if(action==='zoom-in' || action==='zoom-out'){const canvas=viewer.get('canvas');canvas.zoom(canvas.zoom()*(action==='zoom-in'?1.2:1/1.2));return;}
    if(action.startsWith('add-')){
      const path=button.dataset.path;let target=cards;
      if(path!=='root'){const [id,branch]=path.split(':');const parent=find(id);if(!parent)return;target=parent.card[branch] ||= [];}
      const decision=action==='add-decision';target.push({id:'c_'+crypto.randomUUID().replaceAll('-','_'),type:decision?'decision':'task',nome:decision?'Condição atendida?':'Nova atividade',executor:'',modo:'Manual',descricao:'',...(decision?{yes:[],no:[]}: {})});
    }else{
      const found=find(button.dataset.id);if(!found)return;
      if(action==='remove')found.items.splice(found.index,1);
      else{const next=found.index+(action==='up'?-1:1);if(next<0 || next>=found.items.length)return;[found.items[next],found.items[found.index]]=[found.items[found.index],found.items[next]];}
    }
    dialog.querySelector('#asis-cards-confirm').checked=false;refresh();
  });
  dialog.addEventListener('cancel',event=>{if(saving)event.preventDefault();});
  dialog.addEventListener('close',()=>{closed=true;clearTimeout(timer);try{viewer.destroy();}catch{}dialog.remove();});
  apply.onclick=async()=>{
    if(saving || !isEP())return;
    await preview();if(!isEP() || !previewValid || !cards.length || !dialog.querySelector('#asis-cards-confirm').checked)return;
    if(curProc!==process || processos.find(p=>String(p.id)===String(process.id))!==process || globalThis._fbConflictedProcIds?.has(process.id) || process.mod!==originalMod || (process.mod.bpmnAsIs || '')!==originalSaved){error.textContent='O processo foi atualizado. Feche o teste e recarregue os dados antes de aplicar.';return;}
    if(!fbReady() || !globalThis._fbLoadedAt){error.textContent='Conecte-se e aguarde o carregamento dos dados antes de aplicar.';return;}
    saving=true;enabled();dialog.querySelectorAll('button,input,select,textarea').forEach(input=>input.disabled=true);
    const current=bpmnProcIds.asis===process.id?bpmnModelers.asis:null;let candidateMod=null;
    try{
      const currentXml=current?(await current.saveXML({format:true})).xml:(process.mod.bpmnAsIs || '');
      if(currentXml!==initialXml)throw Error('O desenho foi alterado no editor livre. Feche o teste e reabra antes de aplicar.');
      const {svg}=await bpmnExportSvg(viewer);
      const next=clone(originalMod);candidateMod=next;process.mod=next;
      if(initialXml || next.etapas_proc?.length)_arquivarVersaoAnterior(process,'asis',{asIs:next.asIs || '',bpmnAsIs:initialXml || null,etapas_proc:clone(next.etapas_proc || []),asIsCards:clone(next.asIsCards || null)});
      next.asIs=document.getElementById('e-asis')?.value ?? next.asIs ?? '';
      next.bpmnAsIs=built.xml;next.bpmnAsIsSvg=svg;next.asIsCards={version:1,cards:clone(cards)};
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
      error.textContent=e.message;saving=false;dialog.querySelectorAll('button,input,select,textarea').forEach(input=>input.disabled=false);enabled();return;
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
