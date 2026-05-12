(function initConcurrentEdit(globalScope){
  globalScope._fbLoadedAt    = 0;
  globalScope._fbDataReady   = false;

  // Estado compartilhado — espelhado no padrão do módulo de projetos
  const _fbState = {
    saving:        false,  // true durante fbSaveAll; snapshots são pausados
    pendingRender: false,  // true se chegou update remoto enquanto salvava
    listenersStarted: false,
    unsubscribers: []
  };
  globalScope._fbState = _fbState;

  // ── Re-render após receber dados remotos ────────────────────────────────────────────
  function _cloudRender(){
    if(_fbState.saving){ _fbState.pendingRender = true; return; }
    if(typeof globalScope.renderProcs === 'function') globalScope.renderProcs();
  }

  // ── Listeners em tempo real (mesmo padrão de projFbStartRealtime) ─────────────
  function _fbWatchExternalChanges(){
    if(!globalScope.fbReady || !globalScope.fbReady()) return;
    if(_fbState.listenersStarted) return;

    const {onSnapshot} = globalScope.fb();
    if(!onSnapshot) return;

    _fbState.listenersStarted = true;

    // Listener: processos
    _fbState.unsubscribers.push(
      onSnapshot(
        globalScope.processosRepository.colRef(),
        (snap) => {
          // Aguarda o carregamento inicial antes de aceitar updates
          if(!globalScope._fbDataReady) return;
          if(_fbState.saving){ _fbState.pendingRender = true; return; }
          globalScope.processos = [];
          snap.forEach(d => globalScope.processos.push(d.data()));
          _cloudRender();
        },
        (err) => console.warn('_fbWatchExternalChanges (processos):', err.message)
      )
    );

    // Listener: kpis
    _fbState.unsubscribers.push(
      onSnapshot(
        globalScope.kpisRepository.colRef(),
        (snap) => {
          if(!globalScope._fbDataReady) return;
          if(_fbState.saving){ _fbState.pendingRender = true; return; }
          globalScope.kpis = [];
          snap.forEach(d => globalScope.kpis.push(d.data()));
          _cloudRender();
        },
        (err) => console.warn('_fbWatchExternalChanges (kpis):', err.message)
      )
    );
  }

  // ── Funções de compatibilidade (banner mantido para erros manuais) ─────────
  function _fbShowConcurrentBanner(byEmail){
    const banner = document.getElementById('concurrent-banner');
    if(!banner) return;
    const msg = document.getElementById('concurrent-msg');
    if(msg) msg.textContent = 'Dados foram modificados por ' + (byEmail || 'outro dispositivo') + '.';
    banner.style.display = 'flex';
  }

  function _fbDismissBanner(){
    const banner = document.getElementById('concurrent-banner');
    if(banner) banner.style.display = 'none';
    globalScope._fbLoadedAt = Date.now();
  }

  async function _fbReloadData(){
    const banner = document.getElementById('concurrent-banner');
    if(banner) banner.style.display = 'none';
    clearTimeout(globalScope._fbSaveTimer);
    if(typeof globalScope.toast === 'function') globalScope.toast('Recarregando dados do servidor…', 'var(--blue)');
    try {
      if(typeof globalScope.fbLoad === 'function') await globalScope.fbLoad();
      globalScope._fbLoadedAt = Date.now();
      const pAtivo = document.querySelector('.page.on');
      if(pAtivo){
        const id = pAtivo.id.replace('page-', '');
        if(typeof globalScope.go === 'function') globalScope.go(id, document.getElementById('nb-' + id) || null);
      }
      if(typeof globalScope.toast === 'function') globalScope.toast('✓ Dados recarregados do servidor', 'var(--teal)');
    } catch(e){
      if(typeof globalScope.toast === 'function') globalScope.toast('⚠ Erro ao recarregar: ' + e.message, 'var(--red)');
    }
  }

  globalScope._fbShowConcurrentBanner = _fbShowConcurrentBanner;
  globalScope._fbDismissBanner        = _fbDismissBanner;
  globalScope._fbReloadData           = _fbReloadData;
  globalScope._fbWatchExternalChanges = _fbWatchExternalChanges;
})(globalThis);
