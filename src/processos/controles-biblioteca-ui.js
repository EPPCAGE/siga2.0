function riscoBibliotecaAbrir(targetId,options={}){
  const target=document.getElementById(targetId);if(!target)return;
  const dialog=document.createElement('dialog');dialog.className='risk-treatment-modal';dialog.id='control-library-dialog';
  dialog.setAttribute('aria-labelledby','control-library-title');
  dialog.innerHTML=`<h2 id="control-library-title">${esc(options.title || 'Adicionar controle existente')}</h2>
    <div class="fg"><label class="fl" for="control-library-query">Buscar na biblioteca</label><input class="fi" id="control-library-query" placeholder="Nome, código ou palavra-chave"></div>
    <div id="control-library-results"></div>
    <details class="risk-library-create"><summary>Cadastrar novo controle na biblioteca</summary>
      <form id="control-library-new">
        <div class="fg"><label class="fl" for="control-new-name">Nome do controle</label><input class="fi" id="control-new-name" name="nome" maxlength="200" required></div>
        <div class="g2">
          <div class="fg"><label class="fl" for="control-new-category">Categoria</label><input class="fi" id="control-new-category" name="categoria" maxlength="200" required list="control-library-categories"></div>
          <div class="fg"><label class="fl" for="control-new-type">Tipo</label><select class="fi" id="control-new-type" name="tipo" required><option value="">Selecione</option><option>Preventivo</option><option>Detectivo</option><option>Corretivo</option></select></div>
        </div>
        <datalist id="control-library-categories">${[...new Set(ControlesBiblioteca.all().map(c=>c.categoria))].map(v=>`<option value="${esc(v)}">`).join('')}</datalist>
        <div class="fg"><label class="fl" for="control-new-description">Descrição geral</label><textarea class="fi" id="control-new-description" name="descricao" maxlength="5000" required></textarea></div>
        <div class="btn-row"><button class="btn btn-p" type="submit">Salvar na biblioteca e selecionar</button></div>
      </form>
    </details>
    <p role="alert" id="control-library-error"></p>
    <div class="btn-row"><button type="button" class="btn" id="control-library-close">Cancelar</button></div>`;
  const riskText=options.riskText || document.getElementById(targetId==='edit-risk-controls'?'er-desc':'rd')?.value || '';
  function choose(control){
    if(!target.isConnected){dialog.close();return;}
    if(options.selectedIds?.includes(control.id)){dialog.querySelector('[role=alert]').textContent='Este controle já foi selecionado para o tratamento.';return;}
    if(options.onSelect){options.onSelect(control);dialog.close();return;}
    if(Array.from(target.querySelectorAll('[data-library-id]')).some(el=>el.dataset.libraryId===control.id)){dialog.querySelector('[role=alert]').textContent='Este controle já foi adicionado ao risco.';return;}
    target.insertAdjacentHTML('beforeend',riscoControleForm({biblioteca_id:control.id,nome:control.nome,categoria:control.categoria,descricao_catalogo:control.descricao,tipo:control.tipo}));dialog.close();
  }
  function render(){
    const query=dialog.querySelector('#control-library-query').value;
    const suggested=query?[]:ControlesBiblioteca.suggest(riskText);
    const results=dialog.querySelector('#control-library-results');results.replaceChildren();
    const heading=document.createElement('p');heading.className='risk-form-help';heading.textContent=options.onSelect?(suggested.length?'Sugestões pelo texto do risco — selecione os controles adequados ao tratamento.':'Escolha os controles que serão utilizados no tratamento.'):(suggested.length?'Sugestões pelo texto do risco — confirme se o controle já existe neste processo.':'Escolha apenas controles atualmente adotados no processo.');results.append(heading);
    const controls=query?ControlesBiblioteca.search(query):[...suggested,...ControlesBiblioteca.all().filter(c=>!suggested.some(s=>s.id===c.id))];
    const list=document.createElement('div');list.className='risk-library-list';results.append(list);
    controls.forEach(control=>{const card=document.createElement('div');card.className='card risk-library-card';card.innerHTML=`<strong>${esc(control.id)} · ${esc(control.nome)}</strong><p>${esc(control.categoria)} · ${esc(control.tipo)}</p><p>${esc(control.descricao)}</p><div class="risk-library-actions">${suggested.some(c=>c.id===control.id)?'<span class="badge bg">Sugerido</span>':'<span></span>'}<button type="button" class="btn">Selecionar controle</button></div>`;card.querySelector('button').onclick=()=>choose(control);list.append(card);});
    if(!controls.length)list.textContent='Nenhum controle encontrado. Você pode cadastrar um novo controle.';
  }
  dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
  dialog.querySelector('#control-library-close').onclick=()=>dialog.close();dialog.querySelector('#control-library-query').oninput=render;
  dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;try{const values=Object.fromEntries(new FormData(event.target));choose(await ControlesBiblioteca.create(values));}catch(error){dialog.querySelector('[role=alert]').textContent=error.message;}finally{button.disabled=false;}};
  render();ControlesBiblioteca.load(true).then(()=>{if(dialog.isConnected)render();}).catch(()=>{if(dialog.isConnected)dialog.querySelector('[role=alert]').textContent='Não foi possível carregar os controles personalizados. Os controles do catálogo inicial continuam disponíveis.';});
}
