(function(globalScope){
  const tipos={problema:'Problema',sugestao:'Sugestão',retrabalho:'Retrabalho',mapeamento:'Solicitação de mapeamento',dificuldade:'Dificuldade'};
  let unsubscribe=null,subscriptionKey='';
  globalScope._registrosPendentes=[];
  const escape=value=>esc(String(value??''));
  const collectionRef=()=>fbColRef(fb().db,'registros_processos');
  const documentRef=id=>fbDocRef(fb().db,'registros_processos',id);
  const dataLabel=value=>value?.toDate?value.toDate().toLocaleString('pt-BR'):'Agora';
  async function registrarLeitura(id){
    const {updateDoc,auth,serverTimestamp}=fb();
    await updateDoc(documentRef(id),{lido:true,lido_em:serverTimestamp(),lido_por:auth.currentUser.uid});
    globalScope._registrosPendentes=globalScope._registrosPendentes.filter(item=>item.id!==id);
    updCounts();rFila();
  }
  function modal(title){
    const dialog=document.createElement('dialog');
    dialog.style.cssText='border:1px solid var(--bdr);border-radius:12px;padding:24px;width:640px;max-width:94vw;max-height:90vh;overflow:auto;background:var(--surf);color:var(--ink)';
    const heading=document.createElement('h3');heading.textContent=title;dialog.appendChild(heading);
    document.body.appendChild(dialog);dialog.addEventListener('close',()=>dialog.remove());
    return dialog;
  }
  function registroHtml(registro){
    return `<div style="border-bottom:1px solid var(--bdr);padding:12px 0">
      <strong>${escape(tipos[registro.tipo]||registro.tipo)}</strong>
      <div style="font-size:12px;color:var(--ink3);margin:6px 0">${escape(registro.autor_nome)} · ${escape(registro.autor_email)} · ${escape(dataLabel(registro.criado_em))}</div>
      <div style="white-space:pre-wrap;overflow-wrap:anywhere">${escape(registro.descricao)}</div>
      <div style="font-size:12px;margin-top:8px">${registro.lido?'Lido pelo EP CAGE':'Aguardando leitura do EP CAGE'}</div>
    </div>`;
  }
  globalScope.registrosAtualizarAssinatura=function(){
    const user=usuarioLogado,auth=fbReady()?fb().auth?.currentUser:null;
    const key=auth&&user?`${auth.uid}:${user.perfil}`:'';
    if(key===subscriptionKey)return;
    unsubscribe?.();unsubscribe=null;subscriptionKey=key;globalScope._registrosPendentes=[];
    if(!key||!isEP())return;
    const {query,where,onSnapshot}=fb();
    unsubscribe=onSnapshot(query(collectionRef(),where('lido','==',false)),snapshot=>{
      if(subscriptionKey!==key)return;
      globalScope._registrosPendentes=snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));
      globalScope._registrosPendentes.sort((a,b)=>(b.criado_em?.toMillis?.()||0)-(a.criado_em?.toMillis?.()||0));
      updCounts();rFila();
    },()=>toast('Não foi possível carregar os registros de processos.','var(--red)'));
  };
  globalScope.htmlRegistrosPendentes=function(){
    if(!isEP()||!globalScope._registrosPendentes.length)return '';
    return `<hr><div class="sec-lbl">Registros de servidores (${globalScope._registrosPendentes.length})</div>`+
      globalScope._registrosPendentes.map(registro=>`<div class="card" style="border-left:4px solid var(--blue);margin-top:8px">
        <strong>${escape(tipos[registro.tipo])} · ${escape(registro.processo_nome)}</strong>
        <div style="font-size:12px;margin:8px 0">${escape(registro.autor_nome)} · ${escape(dataLabel(registro.criado_em))}</div>
        <button type="button" class="btn btn-p" onclick="lerRegistroProcesso('${escape(registro.id)}')">Ler registro</button>
      </div>`).join('');
  };
  globalScope.abrirRegistroProcesso=function(arqId){
    const unidades=getMinhasUnidades();
    if(!unidades.length){toast('Nenhum processo está disponível em Meus processos.','var(--amber)');return;}
    const dialog=modal('Registrar ocorrência em um processo');
    dialog.id='registro-processo-dialog';
    const form=document.createElement('form');
    form.innerHTML=`<label class="fl" for="registro-processo-arq" style="margin-top:16px">Processo</label>
      <select class="fi" id="registro-processo-arq" required><option value="">Selecione o processo</option>${unidades.map(item=>`<option value="${escape(item.arq_id)}" ${String(item.arq_id)===String(arqId)?'selected':''}>${escape(item.macro)} · ${escape(item.nome)}</option>`).join('')}</select>
      <label class="fl" for="registro-processo-tipo" style="margin-top:16px">Tipo de registro</label>
      <select class="fi" id="registro-processo-tipo">${Object.entries(tipos).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select>
      <label class="fl" for="registro-processo-descricao" style="margin-top:16px">Descreva o que deseja informar</label>
      <textarea class="fi" id="registro-processo-descricao" rows="6" maxlength="5000" required></textarea>
      <p role="status" style="color:var(--red);margin:8px 0"></p>
      <div class="btn-row"><button type="button" class="btn" data-cancel>Cancelar</button><button type="submit" class="btn btn-p">Enviar ao EP CAGE</button></div>`;
    form.querySelector('[data-cancel]').onclick=()=>dialog.close();
    form.onsubmit=async event=>{
      event.preventDefault();
      const status=form.querySelector('[role=status]'),button=form.querySelector('[type=submit]');
      const descricao=form.querySelector('textarea').value.trim(),tipo=form.querySelector('#registro-processo-tipo').value;
      const selected=form.querySelector('#registro-processo-arq').value;
      const unidade=getMinhasUnidades().find(item=>String(item.arq_id)===selected);
      if(!unidade){status.textContent='Selecione um processo disponível em Meus processos.';return;}
      if(!descricao||!tipos[tipo]){status.textContent='Selecione o tipo e preencha a descrição.';return;}
      if(!fbReady()||!fb().auth?.currentUser){status.textContent='Entre no sistema para enviar o registro.';return;}
      button.disabled=true;status.textContent='';
      try{
        const {auth,addDoc,serverTimestamp}=fb();
        await addDoc(collectionRef(),{arq_id:selected,processo_id:unidade.proc?String(unidade.proc.id):'',processo_nome:unidade.nome,
          tipo,descricao,autor_uid:auth.currentUser.uid,autor_email:auth.currentUser.email,autor_nome:usuarioLogado.nome,
          criado_em:serverTimestamp(),lido:false});
        dialog.close();toast('Registro enviado ao EP CAGE e vinculado ao processo.');
      }catch{status.textContent='Não foi possível enviar. Seu texto foi mantido; tente novamente.';}
      finally{button.disabled=false;}
    };
    dialog.appendChild(form);dialog.showModal();
  };
  globalScope.lerRegistroProcesso=async function(id){
    if(!isEP()||!fbReady())return;
    const registro=globalScope._registrosPendentes.find(item=>item.id===id);
    if(!registro)return;
    const dialog=modal(registro.processo_nome);
    dialog.id='leitura-registro-processo-dialog';
    const content=document.createElement('div');content.innerHTML=registroHtml(registro);dialog.appendChild(content);
    const status=document.createElement('p');status.setAttribute('role','status');dialog.appendChild(status);
    const close=document.createElement('button');close.type='button';close.className='btn';close.textContent='Fechar';close.onclick=()=>dialog.close();dialog.appendChild(close);
    dialog.showModal();
    try{
      await registrarLeitura(id);
      status.textContent='Leitura registrada. O registro permanece no histórico do processo.';
    }catch{status.textContent='Não foi possível registrar a leitura. O registro continuará nas tarefas; abra-o novamente para tentar.';}
  };
  globalScope.abrirHistoricoRegistrosProcesso=async function(arqId){
    if(!fbReady()||!fb().auth?.currentUser)return;
    if(!isEP()&&!getMinhasUnidades().some(item=>String(item.arq_id)===String(arqId)))return;
    const dialog=modal('Histórico de registros do processo');dialog.id='historico-registros-processo-dialog';
    const content=document.createElement('div');content.textContent='Carregando registros...';dialog.appendChild(content);
    const close=document.createElement('button');close.type='button';close.className='btn';close.textContent='Fechar';close.onclick=()=>dialog.close();dialog.appendChild(close);dialog.showModal();
    try{
      const {query,where,getDocs,auth}=fb();
      const filters=[where('arq_id','==',String(arqId))];
      if(!isEP())filters.push(where('autor_uid','==',auth.currentUser.uid));
      const snapshot=await getDocs(query(collectionRef(),...filters));
      const registros=snapshot.docs.map(doc=>({id:doc.id,...doc.data()})).sort((a,b)=>(b.criado_em?.toMillis?.()||0)-(a.criado_em?.toMillis?.()||0));
      content.textContent=registros.length?'':'Nenhum registro encontrado.';
      registros.forEach(registro=>{
        const details=document.createElement('details');
        const summary=document.createElement('summary');summary.style.cssText='cursor:pointer;margin-top:12px';
        summary.textContent=`${tipos[registro.tipo]} · ${registro.autor_nome} · ${dataLabel(registro.criado_em)}`;
        const body=document.createElement('div');body.innerHTML=registroHtml(registro);details.append(summary,body);
        const status=document.createElement('p');status.setAttribute('role','status');details.appendChild(status);
        let reading=false;
        details.ontoggle=async()=>{
          if(!details.open||!isEP()||registro.lido||reading)return;
          reading=true;
          try{await registrarLeitura(registro.id);registro.lido=true;body.innerHTML=registroHtml(registro);status.textContent='Leitura registrada.';}
          catch{status.textContent='Não foi possível registrar a leitura. Feche e abra este registro para tentar novamente.';}
          finally{reading=false;}
        };
        content.appendChild(details);
      });
    }catch{content.textContent='Não foi possível carregar o histórico. Tente novamente.';}
  };
})(globalThis);
