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
    const perfil = globalScope.usuarioLogado?.perfil;
    const showContact = perfil === 'dono' || perfil === 'gestor';
    setDisplay(document.getElementById('hub-contact-banner'), showContact, 'block');
  }

  function openModuleHub(){
    const hub = document.getElementById('module-hub');
    const shell = document.getElementById('proc-shell');
    if(hub) hub.classList.add('on');
    if(shell) shell.style.display = 'none';
    setupCards();
    setupAdmin();
  }

  function enterProcessModule(){
    if(!hasProcessosAccess()){
      toast('Seu perfil não tem acesso ao SIGA Processos.','var(--red)');
      return;
    }
    lsSet('siga_module', 'processos');
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
    lsSet('siga_module', 'projetos');
    globalScope.location.href = 'projetos.html';
  }

  globalScope.openModuleHub = openModuleHub;
  globalScope.enterProcessModule = enterProcessModule;
  globalScope.openProjectsModule = openProjectsModule;
})(globalThis);
