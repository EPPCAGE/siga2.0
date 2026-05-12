(function initModuleHubController(globalScope){
  function setDisplay(el, visible, shown=''){
    if(el) el.style.display = visible ? shown : 'none';
  }

  function setupCards(){
    const cProc = document.getElementById('hub-card-processos');
    const cProj = document.getElementById('hub-card-projetos');
    const grid = document.getElementById('module-grid');
    const temProc = hasProcessosAccess();
    const temProj = hasProjetosAccess();
    setDisplay(cProc, temProc);
    setDisplay(cProj, temProj);
    if(grid) grid.style.gridTemplateColumns = (temProc && temProj) ? '' : 'minmax(0,1fr)';
  }

  function setupAdmin(){
    const ep = isEP();
    setDisplay(document.getElementById('hub-admin-section'), ep);
    setDisplay(document.getElementById('hub-avisos-manage'), ep);
    if(ep) rAvisos();
  }

  function openModuleHub(){
    const hub = document.getElementById('module-hub');
    const shell = document.getElementById('proc-shell');
    if(hub) hub.classList.add('on');
    if(shell) shell.style.display = 'none';
    setupCards();
    renderHubAvisosCards();
    setupAdmin();
  }

  function renderHubAvisosCards(){
    const container = document.getElementById('hub-avisos-cards');
    if(!container) return;
    const userPerfis = usuarioLogado ? getPerfisUsuario(usuarioLogado) : [];
    const ativos = AVISOS.filter(aviso => {
      if(!aviso.ativo) return false;
      if(!aviso.perfis || aviso.perfis.includes('todos')) return true;
      return userPerfis.some(perfil => aviso.perfis.includes(perfil));
    });
    if(!ativos.length){
      container.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,.35);font-size:13px;padding:1rem 0">Nenhum aviso ativo no momento.</div>';
      return;
    }
    container.innerHTML = ativos.map(aviso => `
      <div class="hub-aviso-card">
        <div class="hub-aviso-ttl">${esc(aviso.titulo)}</div>
        <div class="hub-aviso-body">${esc(aviso.corpo)}</div>
      </div>`).join('');
  }

  function enterProcessModule(){
    if(!hasProcessosAccess()){
      toast('Seu perfil não tem acesso ao SIGA Processos.','var(--red)');
      return;
    }
    const hub = document.getElementById('module-hub');
    const shell = document.getElementById('proc-shell');
    if(hub) hub.classList.remove('on');
    if(shell) shell.style.display = 'grid';
    if(isEP()){
      go('fila', document.getElementById('nb-fila'));
    } else {
      go('meusprocessos', document.getElementById('nb-meusproc'));
    }
  }

  function openProjectsModule(){
    if(!hasProjetosAccess()){
      toast('Seu perfil não tem acesso ao SIGA Projetos.','var(--red)');
      return;
    }
    globalScope.location.href = 'projetos.html';
  }

  globalScope.openModuleHub = openModuleHub;
  globalScope.renderHubAvisosCards = renderHubAvisosCards;
  globalScope.enterProcessModule = enterProcessModule;
  globalScope.openProjectsModule = openProjectsModule;
})(globalThis);
