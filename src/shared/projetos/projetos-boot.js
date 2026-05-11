/**
 * @fileoverview Boot sequence para módulo de projetos
 * Carrega usuário autenticado e inicializa dados
 */

(function initProjetosApp(globalScope) {
  'use strict';

  /**
   * Carrega dados do Firebase (projetos, programas, listas)
   */
  async function bootLoadData() {
    if (!globalScope._carregarUsuariosFirebase) {
      console.warn('[projetos-boot] _carregarUsuariosFirebase não disponível');
      return false;
    }

    try {
      await globalScope._carregarUsuariosFirebase(globalScope._fb);
      return true;
    } catch (e) {
      console.error('[projetos-boot] Erro ao carregar dados:', e);
      return false;
    }
  }

  /**
   * Aplica usuário logado na UI do módulo de projetos
   */
  function applyUser(user) {
    if (!user) return;
    
    globalScope.usuarioLogado = user;
    
    // Atualiza UI do usuário
    if (globalScope._popularUsuarioProjetos) {
      globalScope._popularUsuarioProjetos(user);
    }
    
    // Aplica permissões
    if (globalScope.aplicarPermissoes) {
      globalScope.aplicarPermissoes();
    }
    
    // Esconde tela de login
    const loginEl = document.getElementById('login-screen');
    if (loginEl) loginEl.style.display = 'none';
    
    // Mostra shell de projetos
    const projShell = document.getElementById('proj-shell');
    if (projShell) projShell.classList.add('on');
    
    // Carrega dados
    if (typeof globalScope.projLoad === 'function') {
      globalScope.projLoad();
    }
    
    // Renderiza página inicial
    if (typeof globalScope.projRenderCurrentPage === 'function') {
      globalScope.projRenderCurrentPage();
    } else if (typeof globalScope.projGo === 'function') {
      const btnInicio = document.getElementById('pnb-inicio');
      globalScope.projGo('inicio', btnInicio);
    }
    
    console.info('[projetos-boot] Usuário aplicado:', user.email);
  }

  /**
   * Restaura sessão do Firebase
   */
  async function bootRestoreFirebaseSession() {
    if (!globalScope.fbReady || !globalScope.fbReady()) {
      console.warn('[projetos-boot] Firebase não disponível');
      return false;
    }

    const { auth, onAuthStateChanged } = globalScope.fb();
    
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
          console.info('[projetos-boot] Nenhum usuário autenticado');
          // Redireciona para processos.html para fazer login
          globalScope.location.href = 'processos.html';
          resolve(false);
          return;
        }

        console.info('[projetos-boot] Firebase user:', firebaseUser.email);
        
        // Carrega dados do Firestore
        const loaded = await bootLoadData();
        if (!loaded) {
          console.error('[projetos-boot] Falha ao carregar dados');
          resolve(false);
          return;
        }

        // Busca usuário na lista
        let user = globalScope._findUsuarioByEmail 
          ? globalScope._findUsuarioByEmail(firebaseUser.email)
          : globalScope.USUARIOS?.find(u => u.email === firebaseUser.email);

        if (!user) {
          console.error('[projetos-boot] Usuário não encontrado:', firebaseUser.email);
          // Redireciona para processos.html
          globalScope.location.href = 'processos.html';
          resolve(false);
          return;
        }

        // Verifica se tem acesso ao módulo de projetos
        if (globalScope.hasProjetosAccess && !globalScope.hasProjetosAccess(user)) {
          console.warn('[projetos-boot] Usuário sem acesso a projetos');
          // Redireciona para processos.html
          globalScope.location.href = 'processos.html';
          resolve(false);
          return;
        }

        applyUser(user);
        resolve(true);
      });
    });
  }

  /**
   * Restaura sessão local (sem Firebase)
   */
  function bootRestoreLocalSession() {
    try {
      const savedEmail = globalScope.lsGet ? globalScope.lsGet('siga_user') : null;
      if (!savedEmail) {
        console.info('[projetos-boot] Nenhuma sessão local');
        globalScope.location.href = 'processos.html';
        return false;
      }

      const user = globalScope._findUsuarioByEmail 
        ? globalScope._findUsuarioByEmail(savedEmail)
        : globalScope.USUARIOS?.find(u => u.email === savedEmail);

      if (!user) {
        console.warn('[projetos-boot] Usuário local não encontrado');
        globalScope.location.href = 'processos.html';
        return false;
      }

      if (globalScope.hasProjetosAccess && !globalScope.hasProjetosAccess(user)) {
        console.warn('[projetos-boot] Usuário sem acesso a projetos');
        globalScope.location.href = 'processos.html';
        return false;
      }

      applyUser(user);
      return true;
    } catch (e) {
      console.error('[projetos-boot] Erro ao restaurar sessão local:', e);
      return false;
    }
  }

  /**
   * Inicializa módulo de projetos
   */
  async function bootProjetosApp() {
    console.info('[projetos-boot] Iniciando...');

    // Tenta restaurar sessão do Firebase ou local
    if (globalScope.fbReady && globalScope.fbReady()) {
      await bootRestoreFirebaseSession();
    } else {
      bootRestoreLocalSession();
    }
  }

  // Inicializa quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootProjetosApp);
  } else {
    bootProjetosApp();
  }

  console.info('[projetos-boot] Módulo carregado');

})(globalThis);
