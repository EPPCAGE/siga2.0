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
  const startInfo=clone(originalMod.asIsCards?.start || {nome:'Início do processo'});
  const dialog=document.createElement('dialog');dialog.id='asis-cards-dialog';dialog.className='asis-cards-dialog';dialog.setAttribute('aria-labelledby','asis-cards-title');
  dialog.innerHTML=`<header class="asis-cards-head"><div><h2 id="asis-cards-title">Esboço AS IS por cards <span class="badge ba">Experimental</span></h2><p class="ph-s">${esc(process.nome)} · Os cards geram a prévia automaticamente.</p></div><button type="button" class="btn" data-action="close">Fechar</button></header><p class="ib ibb">Construa o processo com cards. Clique para editar; escolha se os caminhos se reencontram ou terminam separadamente. Ligações entre caminhos usam links BPMN identificados para evitar cruzamentos.</p><div class="asis-cards-layout"><section aria-label="Cards do processo"><div class="asis-cards-list"></div></section><section class="asis-cards-preview" aria-label="Prévia BPMN"><div class="asis-cards-preview-head"><strong>Prévia BPMN</strong><div class="asis-preview-tools"><button type="button" class="btn" data-action="zoom-in" aria-label="Ampliar prévia">+</button><button type="button" class="btn" data-action="zoom-out" aria-label="Reduzir prévia">−</button><button type="button" class="btn" data-action="fit">Ajustar</button></div></div><div id="asis-cards-canvas"></div></section></div><footer><p role="alert" id="asis-cards-error"></p><p class="ph-s">A prévia não altera o desenho atual. Ao aplicar, os cards, o BPMN e as etapas são salvos juntos. Reaplicar os cards substitui os ajustes feitos no editor livre.</p><label class="asis-cards-consent"><input type="checkbox" id="asis-cards-confirm"> Aplicar este esboço no lugar do desenho e das etapas AS IS atuais, guardando uma versão anterior.</label><button type="button" class="btn btn-p" id="asis-cards-apply" disabled>Aplicar e salvar AS IS</button></footer>`;
  document.body.append(dialog);dialog.showModal();
  let viewer,saving=false,closed=false,revision=0,timer=null,queue=Promise.resolve(),built=null,previewValid=false;
  const error=dialog.querySelector('#asis-cards-error'),apply=dialog.querySelector('#asis-cards-apply'),list=dialog.querySelector('.asis-cards-list');
  try{viewer=new BpmnJS({...bpmnModelerOptions(dialog.querySelector('#asis-cards-canvas')),keyboard:{bindTo:null}});}catch(e){dialog.remove();toast('Não foi possível iniciar a prévia BPMN.','var(--red)');return;}
  function enabled(){apply.disabled=saving || !previewValid || !cards.length || !dialog.querySelector('#asis-cards-confirm').checked;}
  function preview(){
    clearTimeout(timer);const rev=++revision;previewValid=false;enabled();
    let compiled;try{compiled=AsIsCards.compile(cards,process.nome,startInfo);}catch(e){error.textContent=e.message;return queue;}
    queue=queue.catch(()=>{}).then(async()=>{
      if(closed || rev!==revision)return;
      try{await viewer.importXML(compiled.xml);if(closed || rev!==revision)return;viewer.get('canvas').zoom('fit-viewport');built=compiled;previewValid=true;error.textContent='';enabled();}
      catch(e){if(rev===revision){error.textContent='Não foi possível gerar o BPMN: '+e.message;previewValid=false;enabled();}}
    });return queue;
  }
  function find(id,items=cards){for(let index=0;index<items.length;index++){const card=items[index];if(card.id===id)return {card,items,index};for(const branch of ['yes','no']){const found=find(id,card[branch] || []);if(found)return found;}}return null;}
  const types={task:['▣','Atividade'],decision:['◇','Decisão'],parallel:['＋','Paralelo'],inclusive:['○','Inclusivo'],wait:['◷','Espera'],end:['◎','Encerramento']};
  const gateway=card=>['decision','parallel','inclusive'].includes(card.type);
  const palette=path=>`<div class="asis-cards-add">${Object.entries(types).map(([type,[icon,label]])=>`<button type="button" class="btn" data-action="add-${type}" data-path="${esc(path)}">${icon} ${label}</button>`).join('')}</div>`;
  function render(items=cards,path='root'){
    return items.map((card,index)=>`<article class="asis-step asis-kind-${card.type}" data-card="${esc(card.id)}"><div class="asis-step-head"><button class="asis-card-summary" type="button" data-action="edit" data-id="${esc(card.id)}"><span class="asis-type-icon">${types[card.type]?.[0] || '▣'}</span><span><strong>${esc(card.nome)}</strong><small>${esc(types[card.type]?.[1])}${card.executor?' · '+esc(card.executor):''}${card.type==='task'?' · '+esc(card.modo):''}${card.type==='wait'?' · '+esc(card.duration || 'PT1H'):''}</small></span></button><div class="asis-card-tools"><button class="btn" type="button" data-action="up" data-id="${esc(card.id)}" ${index===0?'disabled':''} aria-label="Mover para cima">↑</button><button class="btn" type="button" data-action="down" data-id="${esc(card.id)}" ${index===items.length-1?'disabled':''} aria-label="Mover para baixo">↓</button><button class="btn" type="button" data-action="edit" data-id="${esc(card.id)}">Editar</button><button class="btn" type="button" data-action="remove" data-id="${esc(card.id)}" aria-label="Remover card">×</button></div></div>${gateway(card)?`<div class="asis-branches">${['yes','no'].map((branch,i)=>`<section><h3>${card.type==='decision'?(i?'Não':'Sim'):'Caminho '+(i?'B':'A')}</h3>${render(card[branch] || [],card.id+':'+branch)}</section>`).join('')}</div><p class="asis-join-note">${card.join===false?'⑂ Caminhos independentes · finais separados':'⑂ Os caminhos se reencontram'}</p>`:''}</article>`).join('')+((items.at(-1)?.type==='end'||(gateway(items.at(-1)||{})&&items.at(-1).join===false))?'':palette(path));
  }
  function refresh(){list.innerHTML=`<div class="asis-builder-title"><strong>Construa com cards</strong><span>Clique em um card para editar</span></div><button type="button" class="asis-start-card" data-action="edit-start"><span>◯</span><strong>${esc(startInfo.nome)}</strong><span>Editar início</span></button>`+render();void preview();}
  function changed(){dialog.querySelector('#asis-cards-confirm').checked=false;refresh();}
  function editCard(card,onSave){
    const popup=document.createElement('dialog');popup.className='asis-card-editor';popup.id='asis-card-editor';
    const isStart=card.type==='start';
    popup.innerHTML=`<form><header><span class="asis-type-icon">${isStart?'◯':types[card.type][0]}</span><div><small>Editar card</small><h3>${isStart?'Início do processo':types[card.type][1]}</h3></div></header><label class="fg"><span class="fl">Nome</span><input id="asis-card-name" name="nome" class="fi" required maxlength="240" value="${esc(card.nome)}"></label>${card.type==='task'?`<label class="fg"><span class="fl">Responsável / raia</span><input name="executor" class="fi" value="${esc(card.executor || '')}"></label><label class="fg"><span class="fl">Execução</span><select name="modo" class="fi">${['Manual','Semi-automatica','Automatica'].map(mode=>`<option ${mode===card.modo?'selected':''}>${mode}</option>`).join('')}</select></label>`:''}${card.type==='wait'?`<label class="fg"><span class="fl">Duração (ISO 8601)</span><input name="duration" class="fi" required value="${esc(card.duration || 'PT1H')}"><small>PT1H = 1 hora · PT30M = 30 minutos · P1D = 1 dia</small></label>`:''}${gateway(card)?`<label class="fg"><span class="fl">Após os caminhos</span><select name="join" class="fi"><option value="true" ${card.join!==false?'selected':''}>Reencontrar e continuar o processo</option><option value="false" ${card.join===false?'selected':''}>Manter separados, com finais independentes</option></select></label><p class="ph-s">Em caminhos independentes, adicione as próximas atividades dentro de cada caminho. Cada um poderá ter seu próprio encerramento.</p>`:''}<label class="fg"><span class="fl">Observações</span><textarea name="descricao" class="fi" rows="3">${esc(card.descricao || '')}</textarea></label><footer><button type="button" class="btn" data-cancel>Cancelar</button><button class="btn btn-p" type="submit">Salvar card</button></footer></form>`;
    document.body.append(popup);popup.showModal();popup.querySelector('input').focus();popup.querySelector('[data-cancel]').onclick=()=>popup.close();popup.addEventListener('close',()=>popup.remove());
    popup.querySelector('form').onsubmit=event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.target));data.nome=data.nome.trim();if(!data.nome)return;if('join' in data)data.join=data.join==='true';onSave(data);popup.close();changed();};
  }
  dialog.addEventListener('input',event=>{if(event.target.id==='asis-cards-confirm')enabled();});
  dialog.addEventListener('click',event=>{
    const button=event.target.closest('button[data-action]');if(!button || saving)return;
    const action=button.dataset.action;if(action==='close'){dialog.close();return;}if(action==='fit'){viewer.get('canvas').zoom('fit-viewport');return;}if(action==='zoom-in' || action==='zoom-out'){const canvas=viewer.get('canvas');canvas.zoom(canvas.zoom()*(action==='zoom-in'?1.2:1/1.2));return;}
    if(action==='edit-start'){editCard({...startInfo,type:'start'},data=>Object.assign(startInfo,data));return;}
    if(action.startsWith('add-')){
      const path=button.dataset.path;let target=cards;
      if(path!=='root'){const [id,branch]=path.split(':');const parent=find(id);if(!parent)return;target=parent.card[branch] ||= [];}
      const type=action.slice(4),card={id:'c_'+crypto.randomUUID().replaceAll('-','_'),type,nome:types[type][1],executor:'',modo:'Manual',descricao:'',...(type==='wait'?{duration:'PT1H'}:{}),...(['decision','parallel','inclusive'].includes(type)?{yes:[],no:[],join:true}:{})};
      editCard(card,data=>target.push({...card,...data}));return;
    }
    const found=find(button.dataset.id);if(!found)return;
    if(action==='edit'){editCard(found.card,data=>Object.assign(found.card,data));return;}
    if(action==='remove'){
      if(gateway(found.card)&&((found.card.yes?.length||0)+(found.card.no?.length||0))&&!globalThis.confirm('Remover este card e todos os cards dos seus caminhos?'))return;
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
    saving=true;enabled();dialog.querySelectorAll('button,input,select,textarea').forEach(input=>input.disabled=true);
    const current=bpmnProcIds.asis===process.id?bpmnModelers.asis:null;let candidateMod=null;
    try{
      const currentXml=current?(await current.saveXML({format:true})).xml:(process.mod.bpmnAsIs || '');
      if(currentXml!==initialXml)throw Error('O desenho foi alterado no editor livre. Feche o teste e reabra antes de aplicar.');
      const {svg}=await bpmnExportSvg(viewer);
      const next=clone(originalMod);candidateMod=next;process.mod=next;
      if(initialXml || next.etapas_proc?.length)_arquivarVersaoAnterior(process,'asis',{asIs:next.asIs || '',bpmnAsIs:initialXml || null,etapas_proc:clone(next.etapas_proc || []),asIsCards:clone(next.asIsCards || null)});
      next.asIs=document.getElementById('e-asis')?.value ?? next.asIs ?? '';
      next.bpmnAsIs=built.xml;next.bpmnAsIsSvg=svg;next.asIsCards={version:2,start:clone(startInfo),cards:clone(cards)};
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
