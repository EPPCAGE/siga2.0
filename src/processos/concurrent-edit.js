(function initConcurrentEdit(globalScope){
  globalScope._fbLoadedAt        = 0;
  globalScope._fbDataReady       = false;
  globalScope._fbExternalWatcher = null;

  function _fbShowConcurrentBanner(byEmail){
    const banner = document.getElementById('concurrent-banner');
    if(!banner) return;
    const msg = document.getElementById('concurrent-msg');
    if(msg) msg.textContent = 'Dados foram modificados por ' + (byEmail || 'outro dispositivo') + '. Suas alterações não salvas podem sobrescrever as delas.';
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

  function _fbWatchExternalChanges(){
    if(!globalScope.fbReady || !globalScope.fbReady()) return;
    if(globalScope._fbExternalWatcher) return;
    const {onSnapshot} = globalScope.fb();
    globalScope._fbExternalWatcher = onSnapshot(
      globalScope.configRepository.ref('last_modified'),
      (snap) => {
        if(!snap.exists()) return;
        const d = snap.data();
        const ts = d?.ts || 0;
        const by = d?.by || '';
        if(ts > (globalScope._fbLoadedAt || 0) && by && by !== (globalScope.usuarioLogado?.email || '')){
          _fbShowConcurrentBanner(by);
        }
      },
      (err) => { console.warn('_fbWatchExternalChanges:', err.message); }
    );
  }

  globalScope._fbShowConcurrentBanner = _fbShowConcurrentBanner;
  globalScope._fbDismissBanner        = _fbDismissBanner;
  globalScope._fbReloadData           = _fbReloadData;
  globalScope._fbWatchExternalChanges = _fbWatchExternalChanges;
})(globalThis);
