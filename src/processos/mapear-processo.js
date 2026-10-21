(function(scope){
  const domain=MapeamentoColaborativo,collection='mapeamentos_colaborativos';
  const labels={rascunho:'Rascunho',enviado:'Aguardando revisão do EPP',publicado:'Publicado'};
  let records=[],subscription='',unsubscribe=null,active=null,pendingImport=null;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const h=value=>esc(String(value ?? ''));
  const uid=()=>fbReady()?fb().auth?.currentUser?.uid:'';
  const authorProfile=()=>['dono','gestor'].includes(usuarioLogado?.perfil)||hasPerfil('dono')||hasPerfil('gestor');
  const reviewer=()=>!['dono','gestor'].includes(usuarioLogado?.perfil)&&isEP();
  const allowed=()=>reviewer()||authorProfile();
  const ref=id=>fbDocRef(fb().db,collection,id);
  const editable=record=>domain.canEdit(record,uid(),reviewer());
  const fail=error=>toast(error.message || 'Não foi possível concluir a operação.','var(--red)');
  const run=action=>{void Promise.resolve().then(action).catch(fail);};
  const keys=type=>type==='tobe'?{xml:'bpmnToBe',cards:'toBeCards',steps:'etapas_proc_tobe'}:{xml:'bpmnAsIs',cards:'asIsCards',steps:'etapas_proc'};
  function payload(record){return JSON.parse(record.conteudo || '{"mod":{}}');}
  function modal(title){
    const dialog=document.createElement('dialog');dialog.className='mapping-dialog';
    dialog.innerHTML=`<h2>${h(title)}</h2>`;document.body.append(dialog);
    dialog.addEventListener('close',()=>dialog.remove());return dialog;
  }
  function download(content,type,name){
    const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');
    a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function subscribe(){
    const next=uid()&&allowed()?uid()+':'+reviewer():'';if(next===subscription)return;
    unsubscribe?.();subscription=next;records=[];if(!next)return;
    const api=fb(),query=reviewer()?api.query(fbColRef(api.db,collection),api.where('status','in',['enviado','publicado'])):api.query(fbColRef(api.db,collection),api.where('autor_uid','==',uid()));
    unsubscribe=api.onSnapshot(query,snapshot=>{
      if(subscription!==next)return;
      records=snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));
      updCounts();if(document.getElementById('page-fila')?.classList.contains('on'))rFila();
      if(document.getElementById('page-mapearprocesso')?.classList.contains('on'))render();
    },error=>{if(subscription===next)fail(Error('Não foi possível carregar os mapeamentos. '+error.message));});
  }
  function count(){return records.filter(record=>reviewer()?record.status==='enviado':record.status==='publicado'&&!record.aviso_lido).length;}
  function notices(){
    return records.filter(record=>reviewer()?record.status==='enviado':record.status==='publicado'&&!record.aviso_lido).map(record=>`<div class="card" style="margin-top:12px"><strong>${reviewer()?'Mapeamento aguardando revisão':'Seu fluxo foi publicado'}</strong><p>${h(record.nome)} · ${record.tipo==='asis'?'AS IS':'TO BE'}${reviewer()?' · Enviado por '+h(record.autor_nome):''}</p><button type="button" class="btn btn-p" data-mapping-open="${h(record.id)}">${reviewer()?'Revisar mapeamento':'Ver fluxo publicado'}</button>${!reviewer()?` <button type="button" class="btn" data-mapping-read="${h(record.id)}">Marcar aviso como lido</button>`:''}</div>`).join('');
  }
  function render(){
    subscribe();const page=document.getElementById('page-mapearprocesso');if(!page||active)return;
    if(!allowed()){page.innerHTML='<div class="ib iba">Seu perfil não tem acesso a esta tela.</div>';return;}
    const list=[...records].sort((a,b)=>(b.atualizado_em || '').localeCompare(a.atualizado_em || ''));
    page.innerHTML=`<div class="mapping-shell"><div class="mapping-header"><div><h1 class="ph-t">${reviewer()?'Mapeamentos enviados':'Mapear processo'}</h1><p class="ph-s">${reviewer()?'Revise os desenhos enviados e publique os fluxos na arquitetura.':'Desenhe um processo, detalhe suas atividades e encaminhe ao EPP.'}</p></div>${!reviewer()?'<button type="button" class="btn btn-p" data-mapping-new>Novo mapeamento</button>':''}</div><div class="mapping-grid">${list.map(record=>`<article class="mapping-card"><span class="badge ba">${h(labels[record.status])}</span><h3 style="margin:.8rem 0">${h(record.nome)}</h3><p class="ph-s">${h(record.macro_nome)} · ${record.tipo==='asis'?'AS IS':'TO BE'}</p>${reviewer()?`<p class="ph-s">${h(record.autor_nome)}</p>`:''}<p>${h(record.objetivo)}</p><button type="button" class="btn" data-mapping-open="${h(record.id)}">${editable(record)?'Abrir e editar':'Consultar'}</button></article>`).join('')||'<div class="mapping-empty">Nenhum mapeamento por aqui ainda.</div>'}</div></div>`;
  }
  function create(){
    if(!allowed()||reviewer())return;
    const dialog=modal('Mapear processo');dialog.id='mapping-new-dialog';
    dialog.innerHTML+=`<form><div class="mapping-form-body"><label class="fg"><span class="fl">Macroprocesso</span><select class="fi" name="macro" required><option value="">Selecione</option>${ARQUITETURA.map(m=>`<option value="${h(m.id)}">${h(m.nome)}</option>`).join('')}</select></label><label class="fg"><span class="fl">Nome do processo</span><input class="fi" name="nome" maxlength="240" required list="mapping-names"><datalist id="mapping-names"></datalist></label><p data-match class="ib ibb">Selecione o macroprocesso e informe o nome do processo.</p><label class="fg" data-disambiguate hidden><span class="fl">Processos com esse nome: escolha o vínculo</span><select class="fi" name="vinculo"></select></label><fieldset class="fg"><legend class="fl">Qual fluxo você quer desenhar?</legend><div class="mapping-types"><label class="mapping-type"><input type="radio" name="tipo" value="asis" checked><span><strong>AS IS · Como é hoje</strong><small>Registre como o processo funciona atualmente, com suas atividades, decisões e responsáveis reais.</small></span></label><label class="mapping-type"><input type="radio" name="tipo" value="tobe"><span><strong>TO BE · Como deverá ser</strong><small>Desenhe o funcionamento futuro proposto, com as melhorias e mudanças que você deseja implementar.</small></span></label></div></fieldset><label class="fg"><span class="fl">Objetivo do mapeamento</span><textarea class="fi" name="objetivo" rows="3" maxlength="3000" required placeholder="O que você quer esclarecer, documentar ou melhorar neste processo?"></textarea></label><p class="mapping-error" role="alert"></p></div><div class="btn-row"><button type="button" class="btn" data-cancel>Cancelar</button><button type="submit" class="btn btn-p">Iniciar</button></div></form>`;
    const form=dialog.querySelector('form');let matches=[];
    function match(){
      matches=domain.matches(ARQUITETURA,form.elements.macro.value,form.elements.nome.value);
      const options=domain.units(ARQUITETURA).filter(unit=>String(unit.macro_id)===form.elements.macro.value);
      dialog.querySelector('datalist').innerHTML=options.map(unit=>`<option value="${h(unit.nome)}"></option>`).join('');
      dialog.querySelector('[data-match]').textContent=matches.length===1?'Processo encontrado na arquitetura: '+matches[0].label:matches.length>1?'Há mais de um processo com esse nome. Escolha o vínculo abaixo.':'Este processo ainda não está na arquitetura. O EPP poderá vinculá-lo ou cadastrá-lo durante a revisão.';
      dialog.querySelector('[data-disambiguate]').hidden=matches.length<2;
      form.elements.vinculo.innerHTML='<option value="">Selecione</option>'+matches.map(unit=>`<option value="${h(unit.id)}">${h(unit.label)}</option>`).join('');
      form.elements.vinculo.required=matches.length>1;
    }
    form.elements.macro.onchange=match;form.elements.nome.oninput=match;
    dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
    form.onsubmit=event=>{event.preventDefault();run(async()=>{
      const button=form.querySelector('[type=submit]'),error=form.querySelector('[role=alert]');button.disabled=true;
      try{
        if(!uid()||!allowed())throw Error('Entre no sistema para iniciar o mapeamento.');
        const macro=ARQUITETURA.find(m=>String(m.id)===form.elements.macro.value),name=form.elements.nome.value.trim(),objective=form.elements.objetivo.value.trim();
        if(!macro||!name||!objective)throw Error('Informe o macroprocesso, o nome e o objetivo.');
        const chosen=matches.length===1?matches[0]:matches.find(unit=>String(unit.id)===form.elements.vinculo.value);
        if(matches.length>1&&!chosen)throw Error('Selecione o processo da arquitetura.');
        const id=crypto.randomUUID(),record={id,autor_uid:uid(),autor_email:fb().auth.currentUser.email,autor_nome:usuarioLogado.nome,nome:name,macro_id:String(macro.id),macro_nome:macro.nome,arq_id:chosen?String(chosen.id):'',tipo:form.elements.tipo.value,objetivo:objective,status:'rascunho',revisao:1,conteudo:JSON.stringify({mod:{}}),aviso_lido:false,atualizado_em:new Date().toISOString()};
        const data={...record};delete data.id;await fb().setDoc(ref(id),data);dialog.close();await open(id);
      }catch(e){error.textContent=e.message;}finally{button.disabled=false;}
    });};dialog.showModal();
  }
  async function update(state,nextStatus=state.record.status){
    const api=fb(),expected=state.record.revisao,data=clone(state.process.mod);
    domain.assertTransition(state.record,nextStatus,uid(),reviewer());
    const content=JSON.stringify({mod:data});if(new Blob([content]).size>700000)throw Error('O desenho excedeu o tamanho permitido. Reduza o conteúdo antes de salvar.');
    const result=await api.runTransaction(api.db,async tx=>{
      const doc=await tx.get(ref(state.record.id));if(!doc.exists())throw Error('Mapeamento não encontrado.');
      const current=doc.data();if(current.revisao!==expected)throw Error('Este mapeamento foi alterado em outra sessão. Feche e reabra para carregar a versão mais recente.');
      domain.assertTransition(current,nextStatus,uid(),reviewer());
      const changed={conteudo:content,status:nextStatus,revisao:expected+1,atualizado_em:new Date().toISOString()};
      tx.update(ref(state.record.id),changed);return {...state.record,...changed};
    });state.record=result;state.dirty=false;setStatus(state,'Salvo no servidor.');return true;
  }
  function setStatus(state,message){state.dialog.querySelector('[data-status]').textContent=message;}
  function markDirty(state){if(state.loading)return;state.dirty=true;setStatus(state,'Alterações pendentes. Salve antes de sair.');}
  async function capture(state){
    if(!state.modeler)return;
    if(state.builder){
      state.process.mod=await state.builder.snapshot();state.process.mod.editor_modo='simplificado';
      state.loading=true;try{await state.modeler.importXML(state.process.mod[keys(state.record.tipo).xml]);}finally{state.loading=false;}
    }else{const {xml}=await state.modeler.saveXML({format:true});state.process.mod[keys(state.record.tipo).xml]=xml;if(!state.published)state.process.mod.editor_modo='avancado';}
  }
  function drawDetails(state){
    const k=keys(state.record.tipo),steps=state.process.mod[k.steps] || [],disabled=editable(state.record)?'':'disabled';
    state.dialog.querySelector('[data-details]').innerHTML=steps.length?steps.map((step,index)=>`<details class="mapping-step"><summary>${h(step.seq || index+1)}. ${h(step.nome)} · ${h(step.tipo)}</summary><div class="g2">${[['executor','Responsável / raia'],['entradas','Entradas e pré-requisitos'],['saidas','Resultado esperado / saídas'],['docs','Documentos e sistemas utilizados']].map(([key,label])=>`<label class="fg"><span class="fl">${label}</span><input class="fi" data-step="${index}" data-field="${key}" maxlength="2000" value="${h(step[key])}" ${disabled}></label>`).join('')}</div><label class="fg"><span class="fl">Como executar esta etapa</span><textarea class="fi" data-step="${index}" data-field="desc" maxlength="10000" ${disabled} placeholder="Explique o passo a passo, as verificações e os cuidados necessários para um novo executor.">${h(step.desc)}</textarea></label></details>`).join(''):'<p class="ph-s">Após desenhar, clique em Extrair atividades para documentar como cada etapa deve ser executada. Você também pode encaminhar somente o desenho.</p>';
  }
  async function open(id){
    if(!allowed())return;if(active){toast('Feche o desenho atual antes de abrir outro.','var(--amber)');return;}
    const doc=await fb().getDoc(ref(id));if(!doc.exists())throw Error('Mapeamento não encontrado.');
    const record={id,...doc.data()};if(!reviewer()&&record.autor_uid!==uid())throw Error('Este mapeamento pertence a outro usuário.');
    await workspace(record,payload(record).mod || {});
  }
  async function workspace(record,mod,published=false){
    const page=document.getElementById('page-mapearprocesso'),dialog=document.createElement('section');dialog.id='mapping-workspace';dialog.className='mapping-workspace';
    const state={record,dialog,process:{id:'colab-'+record.id,nome:record.nome,mod:clone(mod)},modeler:null,builder:null,dirty:false,loading:true,published,mode:'simplificado',advancedChanged:false};active=state;
    const edit=!published&&editable(record);
    state.close=()=>{state.builder?.destroy();state.modeler?.destroy();dialog.remove();if(active===state)active=null;render();};
    if(typeof go==='function')go('mapearprocesso',document.getElementById('nb-mapearprocesso'));
    page.replaceChildren(dialog);
    dialog.innerHTML=`<div class="mapping-header"><div><h1 class="ph-t">${h(record.nome)}</h1><p class="ph-s">${h(record.macro_nome)} · ${record.tipo==='asis'?'AS IS · Processo atual':'TO BE · Processo futuro'} · ${h(labels[record.status])}</p><p>${h(record.objetivo)}</p></div><button type="button" class="btn" data-close>Voltar aos mapeamentos</button></div>${edit?'<div class="mapping-modes" role="group" aria-label="Modo de criação"><button type="button" class="btn" data-mode="simplificado" aria-pressed="true">Modo Simplificado</button><button type="button" class="btn" data-mode="avancado" aria-pressed="false">Modo Avançado</button></div><p class="ph-s" data-mode-help>No Modo Simplificado, adicione e organize os cards. O desenho BPMN é gerado automaticamente.</p>':'<p class="ib ibb">Fluxo disponível para consulta e exportação.</p>'}<div class="mapping-toolbar">${edit?'<button type="button" class="btn btn-p" data-save>Salvar rascunho</button><button type="button" class="btn btn-t" data-extract>Extrair atividades</button>':''}<div class="mapping-advanced-tools" data-advanced-tools ${edit?'hidden':''}>${edit?'<button type="button" class="btn" data-undo>Desfazer</button><button type="button" class="btn" data-redo>Refazer</button><button type="button" class="btn" data-phase>+ Fase (milestone)</button><button type="button" class="btn" data-import>Importar BPMN</button><input type="file" data-import-file accept=".bpmn,.xml" hidden>':''}<button type="button" class="btn" data-fit>Ajustar</button><button type="button" class="btn" data-zoom="1.2" aria-label="Ampliar desenho">+</button><button type="button" class="btn" data-zoom="0.8" aria-label="Reduzir desenho">−</button></div><div class="mapping-export-tools"><button type="button" class="btn" data-export="png">Baixar imagem PNG</button><button type="button" class="btn" data-export="xml">Baixar BPMN</button><button type="button" class="btn" data-export="xlsx">Exportar planilha</button></div></div><p class="mapping-status" data-status role="status">Carregando desenho…</p><div data-simplified></div><div class="mapping-canvas" data-canvas ${edit?'hidden':''}></div><section class="card mapping-details"><h3>Detalhamento das atividades</h3><p class="ph-s">Depois de desenhar, extraia as atividades e descreva o passo a passo para orientar um novo executor.</p><div data-details></div></section><p class="mapping-error" data-workspace-error role="alert"></p><div class="btn-row">${edit&&record.status==='rascunho'?'<button type="button" class="btn btn-p" data-submit>Encaminhar ao EPP</button>':''}${edit&&record.status==='enviado'&&reviewer()?'<button type="button" class="btn btn-p" data-publish>Vincular à arquitetura e publicar</button>':''}${reviewer()?'<button type="button" class="btn" data-recover>Aproveitar em mapeamento completo / POP</button>':''}</div>`;
    dialog.querySelector('[data-close]').onclick=()=>{
      if(state.busy){toast('Aguarde a gravação.','var(--amber)');return;}
      if(state.dirty&&!confirm('Há alterações não salvas. Deseja voltar e descartá-las?'))return;
      state.close();
    };
    dialog.querySelector('[data-details]').oninput=event=>{
      const target=event.target;if(target.dataset.step===undefined||!edit)return;
      state.process.mod[keys(record.tipo).steps][Number(target.dataset.step)][target.dataset.field]=target.value;markDirty(state);
    };
    async function act(action){
      if(state.busy||state.loading)return;state.busy=true;
      const controls=[...dialog.querySelectorAll('button,input,select,textarea')].map(element=>({element,disabled:element.disabled}));
      controls.forEach(({element})=>element.disabled=true);dialog.querySelector('[data-canvas]').style.pointerEvents='none';dialog.querySelector('[data-simplified]').style.pointerEvents='none';
      try{await action();dialog.querySelector('[data-workspace-error]').textContent='';}catch(e){dialog.querySelector('[data-workspace-error]').textContent=e.message;}
      finally{state.busy=false;controls.forEach(({element,disabled})=>element.disabled=disabled);dialog.querySelector('[data-canvas]').style.pointerEvents='';dialog.querySelector('[data-simplified]').style.pointerEvents='';}
    }
    const on=(selector,action)=>{const button=dialog.querySelector(selector);if(button)button.onclick=()=>{void act(action);};};
    async function simplified(){
      state.builder=await abrirEsbocoCards(record.tipo,{container:dialog.querySelector('[data-simplified]'),process:state.process,modeler:state.modeler,canEdit:()=>editable(state.record)&&!state.published,onChange:()=>markDirty(state)});
      if(!state.builder)throw Error('Não foi possível iniciar o Modo Simplificado.');
    }
    async function mode(next){
      if(next===state.mode)return;
      if(next==='simplificado'&&state.advancedChanged&&!confirm('Os cards não são criados a partir do desenho livre. Ao voltar ao Modo Simplificado, o fluxo será reconstruído a partir dos cards anteriores. Deseja continuar?'))return;
      await capture(state);
      if(state.builder){state.builder.destroy();state.builder=null;}
      state.mode=next;state.process.mod.editor_modo=next;
      dialog.querySelector('[data-simplified]').hidden=next!=='simplificado';dialog.querySelector('[data-canvas]').hidden=next!=='avancado';dialog.querySelector('[data-advanced-tools]').hidden=next!=='avancado';
      dialog.querySelectorAll('[data-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===next)));
      dialog.querySelector('[data-mode-help]').textContent=next==='simplificado'?'No Modo Simplificado, adicione e organize os cards. O desenho BPMN é gerado automaticamente.':'No Modo Avançado, use as ferramentas BPMN para criar e editar o desenho livremente. As alterações livres não são convertidas automaticamente em cards.';
      if(next==='simplificado'){state.loading=true;try{await simplified();}finally{state.loading=false;}}
      else{state.modeler.get('canvas').resized();state.modeler.get('canvas').zoom('fit-viewport');}
      markDirty(state);
    }
    dialog.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{void act(()=>mode(button.dataset.mode));});
    on('[data-save]',async()=>{await capture(state);await update(state);drawDetails(state);});
    on('[data-extract]',async()=>{await capture(state);const k=keys(record.tipo);state.process.mod[k.steps]=domain.extract(state.process.mod[k.xml],state.process.mod[k.steps] || []);drawDetails(state);markDirty(state);dialog.querySelector('[data-details]').scrollIntoView({behavior:'smooth'});});
    on('[data-submit]',async()=>{
      await capture(state);if(!hasActivity(state))throw Error('Inclua pelo menos uma atividade no desenho antes de encaminhar.');
      if(!confirm('Encaminhar este desenho ao EPP? Após o envio, ele ficará disponível apenas para consulta enquanto aguarda revisão. O detalhamento das atividades é recomendado, mas não é obrigatório.'))return;
      await update(state,'enviado');state.close();toast('Mapeamento encaminhado ao EPP.');
    });
    on('[data-publish]',async()=>{await capture(state);await update(state);review(state);});
    on('[data-recover]',async()=>{if(state.dirty){await capture(state);await update(state);}recover(state);});
    on('[data-fit]',()=>state.modeler.get('canvas').zoom('fit-viewport'));
    on('[data-undo]',()=>state.modeler.get('commandStack').undo());
    on('[data-redo]',()=>state.modeler.get('commandStack').redo());
    const phaseButton=dialog.querySelector('[data-phase]');if(phaseButton)phaseButton.onclick=event=>{if(!state.busy&&!state.loading)bpmnAddMilestone(null,event,state.modeler);};
    const importButton=dialog.querySelector('[data-import]'),fileInput=dialog.querySelector('[data-import-file]');
    if(importButton)importButton.onclick=()=>fileInput.click();
    if(fileInput)fileInput.onchange=()=>{void act(async()=>{
      const file=fileInput.files[0];if(!file)return;if(file.size>650000)throw Error('O arquivo BPMN deve ter no máximo 650 KB.');
      if(!confirm('Importar este arquivo no lugar do desenho atual? Os detalhamentos existentes serão preservados até você extrair as atividades novamente.'))return;
      const previous=(await state.modeler.saveXML()).xml;
      try{await state.modeler.importXML(await file.text());}catch{await state.modeler.importXML(previous);throw Error('O arquivo BPMN não pôde ser importado. O desenho anterior foi mantido.');}
      state.advancedChanged=true;state.modeler.get('canvas').zoom('fit-viewport');markDirty(state);fileInput.value='';
    });};
    dialog.querySelectorAll('[data-zoom]').forEach(button=>button.onclick=()=>{const canvas=state.modeler.get('canvas');canvas.zoom(canvas.zoom()*Number(button.dataset.zoom));});
    dialog.querySelectorAll('[data-export]').forEach(button=>button.onclick=()=>{void act(()=>exportFile(state,button.dataset.export));});
    try{
      if(typeof BpmnJS==='undefined')throw Error('O editor BPMN ainda não carregou. Volte e tente novamente.');
      state.modeler=new BpmnJS({...bpmnModelerOptions(dialog.querySelector('[data-canvas]')),keyboard:{bindTo:null}});
      if(edit&&typeof _bpmnInitActivityTextSizing==='function')_bpmnInitActivityTextSizing(state.modeler);
      if(!edit){const bus=state.modeler.get('eventBus');bus.on('commandStack.canExecute',10000,()=>false);dialog.querySelector('[data-canvas]').classList.add('mapping-readonly');}
      await state.modeler.importXML(mod[keys(record.tipo).xml] || BPMN_DEFAULT);
      const advanced=edit&&(mod.editor_modo==='avancado'||(mod[keys(record.tipo).xml]&&!mod[keys(record.tipo).cards]&&hasActivity(state)));
      if(edit&& !advanced)await simplified();
      else{
        state.mode='avancado';dialog.querySelector('[data-simplified]').hidden=true;dialog.querySelector('[data-canvas]').hidden=false;dialog.querySelector('[data-advanced-tools]').hidden=false;
        dialog.querySelectorAll('[data-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode==='avancado')));
        if(edit)dialog.querySelector('[data-mode-help]').textContent='Este fluxo foi criado no Modo Avançado. Continue editando com as ferramentas BPMN ou reconstrua-o no Modo Simplificado.';
        state.advancedChanged=edit&&!mod[keys(record.tipo).cards];state.modeler.get('canvas').resized();state.modeler.get('canvas').zoom('fit-viewport');
      }
      state.loading=false;
      state.modeler.on('commandStack.changed',()=>{if(edit&&!state.loading&&state.mode==='avancado'){state.advancedChanged=true;markDirty(state);}});
      drawDetails(state);setStatus(state,edit?'Rascunho salvo. Alterações no desenho e no detalhamento devem ser salvas.':'Somente consulta.');
      dialog.scrollIntoView({block:'start'});
    }catch(e){state.loading=false;dialog.querySelector('[data-workspace-error]').textContent=e.message;}
  }
  function hasActivity(state){return state.modeler.get('elementRegistry').getAll().some(item=>item.type.endsWith('Task')||['bpmn:SubProcess','bpmn:CallActivity'].includes(item.type));}
  async function exportFile(state,type){
    await capture(state);
    const name=(state.record.nome || 'processo').replaceAll(/[^\p{L}\p{N}_-]/gu,'_')+'_'+state.record.tipo;
    if(type==='xml'){const {xml}=await state.modeler.saveXML({format:true});download(xml,'application/xml',name+'.bpmn');return;}
    if(type==='xlsx'){
      if(!scope.XLSX)throw Error('O recurso de planilha ainda não carregou.');
      const {xml}=await state.modeler.saveXML(),steps=domain.extract(xml,state.process.mod[keys(state.record.tipo).steps] || []);
      const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.json_to_sheet(steps.map(step=>({'Ordem':step.seq,'Etapa':step.nome,'Tipo':step.tipo,'Responsável':step.executor,'Como executar':step.desc || '','Entradas':step.entradas || '','Saídas':step.saidas || '','Documentos e sistemas':step.docs || ''}))),'Atividades');XLSX.writeFile(book,name+'.xlsx');return;
    }
    const {svg}=await bpmnExportSvg(state.modeler),image=new Image();
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Não foi possível gerar a imagem.'));image.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svg)));});
    const canvas=document.createElement('canvas'),scale=Math.min(2,12000/Math.max(image.width,image.height));canvas.width=Math.max(1,image.width*scale);canvas.height=Math.max(1,image.height*scale);
    const context=canvas.getContext('2d');context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Não foi possível gerar a imagem.');download(blob,'image/png',name+'.png');
  }
  function review(state){
    if(!reviewer()||state.record.status!=='enviado')return;
    const dialog=modal('Revisar vínculo e publicar fluxo');dialog.id='mapping-review-dialog';
    const units=domain.units(ARQUITETURA);
    dialog.innerHTML+=`<p class="ph-s">Selecione um processo da arquitetura ou cadastre um processo/subprocesso. A publicação guardará uma cópia do desenho e dos detalhamentos revisados.</p><form><label class="fg"><span class="fl">Vincular a processo existente</span><select class="fi" name="existing"><option value="">Cadastrar novo processo ou subprocesso</option>${units.map(unit=>`<option value="${h(unit.id)}" ${String(unit.id)===state.record.arq_id?'selected':''}>${h(unit.macro+' › '+unit.label)}</option>`).join('')}</select></label><fieldset data-create><legend class="fl">Novo item na arquitetura</legend><label class="fg"><span class="fl">Macroprocesso</span><select class="fi" name="macro">${ARQUITETURA.map(m=>`<option value="${h(m.id)}" ${String(m.id)===state.record.macro_id?'selected':''}>${h(m.nome)}</option>`).join('')}</select></label><label class="fg"><span class="fl">Tipo</span><select class="fi" name="kind"><option value="processo">Processo</option><option value="subprocesso">Subprocesso</option></select></label><label class="fg" data-parent><span class="fl">Processo pai</span><select class="fi" name="parent"></select></label><label class="fg"><span class="fl">Nome</span><input class="fi" name="nome" maxlength="240" value="${h(state.record.nome)}"></label></fieldset><label class="fg"><span class="fl">Observações da revisão</span><textarea class="fi" name="review" maxlength="3000" placeholder="Registre os ajustes e orientações da revisão."></textarea></label><p class="mapping-error" role="alert"></p><div class="btn-row"><button type="button" class="btn" data-cancel>Cancelar</button><button type="submit" class="btn btn-p">Publicar fluxo e avisar autor</button></div></form>`;
    const form=dialog.querySelector('form');
    function sync(){const create=!form.elements.existing.value;dialog.querySelector('[data-create]').hidden=!create;dialog.querySelector('[data-parent]').hidden=form.elements.kind.value!=='subprocesso';form.elements.parent.required=create&&form.elements.kind.value==='subprocesso';form.elements.nome.required=create;}
    function parents(){form.elements.parent.innerHTML='<option value="">Selecione</option>'+(ARQUITETURA.find(m=>String(m.id)===form.elements.macro.value)?.processos || []).map(p=>`<option value="${h(p.id)}">${h(p.nome)}</option>`).join('');}
    form.elements.existing.onchange=sync;form.elements.kind.onchange=sync;form.elements.macro.onchange=parents;parents();sync();
    dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
    dialog.addEventListener('cancel',event=>{if(state.busy)event.preventDefault();});
    form.onsubmit=event=>{event.preventDefault();run(async()=>{
      if(state.busy)return;state.busy=true;form.querySelectorAll('button').forEach(button=>button.disabled=true);
      try{
        if(!reviewer()||!editable(state.record))throw Error('Apenas o EPP pode publicar um mapeamento enviado.');
        if(!hasActivity(state))throw Error('O fluxo precisa conter pelo menos uma atividade.');
        await capture(state);const k=keys(state.record.tipo);
        state.process.mod[k.steps]=domain.extract(state.process.mod[k.xml],state.process.mod[k.steps] || []);
        const content=JSON.stringify({mod:state.process.mod});if(new Blob([content]).size>700000)throw Error('O desenho excedeu o tamanho permitido.');
        const selection={existing:form.elements.existing.value,macro:form.elements.macro.value,kind:form.elements.kind.value,parent:form.elements.parent.value,nome:form.elements.nome.value.trim()},api=fb(),pubId=Date.now(),pubRef=fbDocRef(api.db,'publicacoes',pubId);
        const result=await api.runTransaction(api.db,async tx=>{
          const recordDoc=await tx.get(ref(state.record.id)),architectureDoc=await tx.get(configRepository.ref('arquitetura'));
          const current=recordDoc.data();if(!current||current.revisao!==state.record.revisao)throw Error('O mapeamento foi alterado em outra sessão. Reabra antes de publicar.');
          domain.assertTransition(current,'publicado',uid(),reviewer());
          const architecture=JSON.parse(architectureDoc.data()?.data || '[]');let unit;
          if(selection.existing){unit=domain.units(architecture).find(item=>String(item.id)===selection.existing);if(!unit)throw Error('O processo selecionado não existe mais na arquitetura.');}
          else{
            const macro=architecture.find(item=>String(item.id)===selection.macro);if(!macro||!selection.nome)throw Error('Selecione o macroprocesso e informe o nome do novo item.');
            if(domain.matches(architecture,selection.macro,selection.nome).length)throw Error('Já existe um item com esse nome neste macroprocesso. Selecione o vínculo existente.');
            const item={id:'colab_'+crypto.randomUUID(),nome:selection.nome,natureza:'',area:'',gerente:'',objetivo:state.record.objetivo,objetivo_estrategico:'',entradas:'',entregas:'',clientes:'',docs:''};
            if(selection.kind==='subprocesso'){
              const parent=macro.processos.find(p=>String(p.id)===selection.parent);if(!parent)throw Error('Selecione o processo pai.');
              parent.subprocessos=parent.subprocessos || [];parent.subprocessos.push(item);
            }else{item.subprocessos=[];item.proc_id=null;macro.processos.push(item);}
            unit=domain.units(architecture).find(candidate=>candidate.id===item.id);
          }
          const publication={id:pubId,titulo:unit.nome+' · '+(state.record.tipo==='asis'?'AS IS':'TO BE'),categoria:'Fluxos',versao:'1',desc:state.record.objetivo,url:'',data:new Date().toISOString().slice(0,10),responsavel:usuarioLogado.nome,tags:'Mapeamento colaborativo',arq_ids:[String(unit.id)],bpmn_urls:[],fluxo_colaborativo:{origem_id:state.record.id,tipo:state.record.tipo,conteudo:content,autor_nome:state.record.autor_nome,autor_email:state.record.autor_email,autor_uid:state.record.autor_uid,revisor_nome:usuarioLogado.nome,observacoes:form.elements.review.value.trim()}};
          const changed={status:'publicado',arq_id:String(unit.id),macro_id:String(unit.macro_id),macro_nome:unit.macro,conteudo:content,revisao:current.revisao+1,publicacao_id:pubId,aviso_lido:false,revisor_uid:uid(),observacoes_revisao:form.elements.review.value.trim(),atualizado_em:new Date().toISOString()};
          if(!selection.existing)tx.set(configRepository.ref('arquitetura'),{data:JSON.stringify(architecture)},{merge:true});
          tx.set(pubRef,publication);tx.update(ref(state.record.id),changed);
          return {publication,architecture,changed};
        });
        ARQUITETURA=result.architecture;_fbConfigCache.set('arquitetura',JSON.stringify(ARQUITETURA));
        if(!publicacoes.some(item=>item.id===result.publication.id))publicacoes.push(result.publication);
        state.record={...state.record,...result.changed};state.dirty=false;dialog.close();state.close();render();
        toast('Fluxo publicado em Publicações › Fluxos. O autor receberá o aviso em Minhas tarefas.');
      }catch(e){dialog.querySelector('[role=alert]').textContent=e.message;}finally{state.busy=false;form.querySelectorAll('button').forEach(button=>button.disabled=false);}
    });};dialog.showModal();
  }
  async function markRead(id){
    const record=records.find(item=>item.id===id);if(!record||record.autor_uid!==uid()||record.status!=='publicado')return;
    await fb().updateDoc(ref(id),{aviso_lido:true});
  }
  async function openPublished(id){
    if(active){toast('Feche o desenho atual antes de abrir outro.','var(--amber)');return;}
    const snapshot=await fb().getDoc(fbDocRef(fb().db,'publicacoes',id));if(!snapshot.exists())throw Error('Publicação não encontrada.');
    const publication=snapshot.data(),flow=publication.fluxo_colaborativo;if(!flow)throw Error('Esta publicação não contém um desenho colaborativo.');
    const unit=domain.units(ARQUITETURA).find(item=>String(item.id)===(publication.arq_ids || [])[0]);
    const record={id:flow.origem_id,nome:unit?.nome || publication.titulo,macro_nome:unit?.macro || '',macro_id:String(unit?.macro_id || ''),arq_id:String(unit?.id || ''),tipo:flow.tipo,objetivo:publication.desc,status:'publicado',autor_nome:flow.autor_nome,autor_email:flow.autor_email,autor_uid:flow.autor_uid};
    await workspace(record,JSON.parse(flow.conteudo).mod,true);
  }
  function recover(state){
    if(!reviewer())return;if(!state.record.arq_id){toast('Vincule o desenho à arquitetura durante a revisão antes de aproveitá-lo no mapeamento completo.','var(--amber)');return;}
    const existing=processos.filter(p=>String(p.arq_id)===state.record.arq_id&&p.status_ciclo!=='cancelado');
    const dialog=modal('Aproveitar desenho e atividades no mapeamento completo');
    dialog.innerHTML+=`<p>O fluxo ${state.record.tipo==='asis'?'AS IS':'TO BE'} e seus detalhamentos serão copiados para um mapeamento do sistema. O fluxo publicado continuará disponível.</p>${existing.length?`<label class="fg"><span class="fl">Mapeamento de destino</span><select class="fi" name="target">${existing.map(p=>`<option value="${h(p.id)}">${h(p.nome)} · ${h(p.etapa)}</option>`).join('')}</select></label><p class="ib iba">Ao continuar, o desenho e as etapas dessa versão serão substituídos. Uma cópia anterior será guardada no histórico.</p>`:'<p class="ib ibb">Vamos abrir o cadastro do mapeamento com o processo, o objetivo e o autor preenchidos. Complete os demais dados para criar e continuar até o POP.</p>'}<p class="mapping-error" role="alert"></p><div class="btn-row"><button type="button" class="btn" data-cancel>Cancelar</button><button type="button" class="btn btn-p" data-continue>Continuar</button></div>`;
    dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
    dialog.querySelector('[data-continue]').onclick=()=>run(async()=>{
      const button=dialog.querySelector('[data-continue]');button.disabled=true;
      try{
        if(!reviewer())throw Error('Ação restrita ao EPP.');
        const source={record:clone(state.record),mod:clone(state.process.mod)};
        if(existing.length){
          const target=processos.find(p=>String(p.id)===dialog.querySelector('[name=target]').value);if(!target)throw Error('Mapeamento de destino não encontrado.');
          const original=target.mod,k=keys(source.record.tipo);target.mod=clone(original || {});
          _arquivarVersaoAnterior(target,source.record.tipo,{[k.xml]:target.mod[k.xml] || null,[k.steps]:clone(target.mod[k.steps] || []),[k.cards]:clone(target.mod[k.cards] || null)});
          copyTo(target,source);
          try{if(await fbSaveAll()!==true)throw Error('Não foi possível confirmar a gravação.');}catch(e){target.mod=original;throw e;}
          for(const which of ['asis','tobe']){if(bpmnProcIds[which]===target.id){bpmnModelers[which]?.destroy();bpmnModelers[which]=null;bpmnProcIds[which]=null;bpmnDirty[which]=false;}}
          dialog.close();state.close();abrirProc(target.id);
        }else{
          dialog.close();state.close();abrirNovoProc();
          document.getElementById('novo-macro').value=source.record.macro_id;filtrarProcArq();
          const selector=document.getElementById('novo-proc-sel');
          if(![...selector.options].some(option=>option.value===source.record.arq_id)){
            const option=document.createElement('option');option.value=source.record.arq_id;option.textContent=source.record.nome;selector.append(option);
          }
          selector.value=source.record.arq_id;previewProcArq();
          document.getElementById('novo-objetivo').value=source.record.objetivo;
          document.getElementById('novo-dono-nome').value=source.record.autor_nome;
          document.getElementById('novo-dono-email').value=source.record.autor_email || '';
          pendingImport=source;
          const banner=document.createElement('p');banner.id='mapping-import-banner';banner.className='ib ibb';banner.textContent='Ao criar, o desenho '+source.record.tipo.toUpperCase()+' e as atividades deste fluxo serão copiados para o novo mapeamento.';document.getElementById('novo-preview').after(banner);
        }
      }catch(e){dialog.querySelector('[role=alert]').textContent=e.message;}finally{button.disabled=false;}
    });dialog.showModal();
  }
  function copyTo(target,source){
    const k=keys(source.record.tipo);target.mod=target.mod || {};
    target.mod[k.xml]=source.mod[k.xml] || null;target.mod[k.cards]=clone(source.mod[k.cards] || null);target.mod[k.steps]=clone(source.mod[k.steps] || []).map(step=>({...step,desc:[step.desc,step.entradas?'Entradas e pré-requisitos: '+step.entradas:'',step.saidas?'Resultado esperado / saídas: '+step.saidas:'',step.docs?'Documentos e sistemas utilizados: '+step.docs:''].filter(Boolean).join('\n\n')}));
    delete target.mod[k.xml+'Svg'];target.mod.origem_colaborativa={id:source.record.id,autor:source.record.autor_nome,tipo:source.record.tipo};
  }
  function validateImport(arqId){
    if(pendingImport&&(!reviewer()||String(arqId)!==pendingImport.record.arq_id))throw Error('O processo de destino precisa corresponder ao fluxo selecionado.');
  }
  function applyImport(target){
    if(!pendingImport)return;
    if(!reviewer()||String(target.arq_id)!==pendingImport.record.arq_id)throw Error('O processo de destino precisa corresponder ao fluxo selecionado.');
    copyTo(target,pendingImport);clearImport();
  }
  function clearImport(){pendingImport=null;document.getElementById('mapping-import-banner')?.remove();}
  document.addEventListener('click',event=>{
    const openButton=event.target.closest('[data-mapping-open]'),readButton=event.target.closest('[data-mapping-read]');
    if(openButton)run(()=>open(openButton.dataset.mappingOpen));
    if(readButton)run(()=>markRead(readButton.dataset.mappingRead));
    if(event.target.closest('[data-mapping-new]'))create();
  });
  scope.addEventListener('beforeunload',event=>{if(active?.dirty){event.preventDefault();event.returnValue='';}});
  scope.MapearProcesso={canStart:()=>authorProfile()&&!reviewer(),render,subscribe,count,notices,open,openPublished,abrirPublicado:id=>run(()=>openPublished(id)),applyImport,clearImport,validarImport:validateImport};
})(globalThis);
