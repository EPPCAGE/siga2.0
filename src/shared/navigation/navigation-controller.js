/**
 * @fileoverview Navegação compartilhada entre módulos
 * Gerencia navegação entre módulos de Processos e Projetos
 */

(function initNavigation(globalScope) {
  'use strict';

  // ══════════════════════════════════════════════════════════════
  // NAVEGAÇÃO ENTRE MÓDULOS
  // ══════════════════════════════════════════════════════════════

  /**
   * Abre o hub central de seleção de módulos
   */
  globalScope.mostrarHub = function mostrarHub() {
    globalScope.location.href = 'processos.html';
  };

  /**
   * Abre módulo de Processos (verificando permissão)
   */
  globalScope.abrirModuloProcessos = function abrirModuloProcessos() {
    if (!globalScope.hasProcessosAccess || !globalScope.hasProcessosAccess()) {
      const toast = globalScope._sharedToast || globalScope.toast || console.warn;
      toast('Seu perfil não tem acesso ao módulo de processos.', '#dc2626');
      return;
    }
    globalScope.location.href = 'processos.html';
  };

  /**
   * Abre módulo de Projetos (verificando permissão)
   */
  globalScope.abrirModuloProjetos = function abrirModuloProjetos() {
    if (!globalScope.hasProjetosAccess || !globalScope.hasProjetosAccess()) {
      const toast = globalScope._sharedToast || globalScope.toast || globalScope.projToast || console.warn;
      toast('Seu perfil não tem acesso ao módulo de projetos.', '#dc2626');
      return;
    }
    
    // Esconde hub e login
    const hubEl = document.getElementById('module-hub');
    const loginEl = document.getElementById('login-screen');
    const procShell = document.querySelector('.shell');
    const projShell = document.getElementById('proj-shell');
    
    if (hubEl) hubEl.style.display = 'none';
    if (loginEl) loginEl.style.display = 'none';
    if (procShell) procShell.style.display = 'none';
    if (projShell) projShell.classList.add('on');
    
    // Popula dados do usuário
    if (globalScope._popularUsuarioProjetos && globalScope.usuarioLogado) {
      globalScope._popularUsuarioProjetos(globalScope.usuarioLogado);
    }
    
    // Aplica permissões
    if (globalScope.aplicarPermissoes) {
      globalScope.aplicarPermissoes();
    }
    
    // Esconde barra mobile
    const mobBar = document.getElementById('mob-top-bar');
    const mobBackdrop = document.getElementById('mob-backdrop');
    if (mobBar) mobBar.style.display = 'none';
    if (mobBackdrop) mobBackdrop.style.display = 'none';
    
    // Carrega página inicial do módulo
    if (typeof globalScope.projLoad === 'function') {
      globalScope.projLoad();
    }
    
    if (typeof globalScope.projRenderCurrentPage === 'function') {
      globalScope.projRenderCurrentPage();
    } else if (typeof globalScope.projGo === 'function') {
      globalScope.projGo('inicio', document.getElementById('pnb-inicio'));
    }
  };

  /**
   * Volta ao hub central
   */
  globalScope.voltarAoHub = function voltarAoHub() {
    globalScope.location.href = 'processos.html';
  };

  // ══════════════════════════════════════════════════════════════
  // TOAST COMPARTILHADO
  // ══════════════════════════════════════════════════════════════

  /**
   * Mostra toast (tenta usar função específica do módulo ou fallback)
   * @param {string} msg - Mensagem
   * @param {string} color - Cor da mensagem
   */
  globalScope._sharedToast = function _sharedToast(msg, color) {
    if (typeof globalScope.projToast === 'function') {
      globalScope.projToast(msg, color);
      return;
    }
    if (typeof globalScope.toast === 'function') {
      globalScope.toast(msg, color);
      return;
    }
    console.info(msg);
  };

  // ══════════════════════════════════════════════════════════════
  // POPULAR DADOS DO USUÁRIO (PROJETOS)
  // ══════════════════════════════════════════════════════════════

  /**
   * Popula dados do usuário na UI do módulo de projetos
   * @param {Object} user - Usuário logado
   */
  globalScope._popularUsuarioProjetos = function _popularUsuarioProjetos(user) {
    const avEl = document.getElementById('proj-av');
    const nameEl = document.getElementById('proj-nome');
    const roleEl = document.getElementById('proj-perfil');
    
    if (avEl) avEl.textContent = user?.iniciais || '?';
    if (nameEl) nameEl.textContent = user?.nome || '-';
    if (roleEl && globalScope._roleText) {
      roleEl.textContent = globalScope._roleText(user);
    }
  };

  /**
   * Encaminha usuário para módulo apropriado (local/fallback)
   * @param {Object} user - Usuário logado
   * @param {boolean} toastOnEnter - Mostrar toast de boas-vindas
   */
  globalScope._encaminharModuloLocal = function _encaminharModuloLocal(user, toastOnEnter) {
    globalScope.usuarioLogado = user;
    globalScope._popularUsuarioProjetos(user);
    
    const temProj = globalScope.hasProjetosAccess && globalScope.hasProjetosAccess(user);
    const temProc = globalScope.hasProcessosAccess && globalScope.hasProcessosAccess(user);
    
    if (temProj) {
      globalScope.abrirModuloProjetos();
      if (toastOnEnter) {
        globalScope._sharedToast('Bem-vindo(a), ' + (user.nome || user.email) + '!', 'var(--teal)');
      }
      return;
    }
    
    if (temProc && !temProj) {
      globalScope.location.href = 'processos.html';
    }
  };

  /**
   * Mostra módulo de projetos (usado por processos.html após login)
   * @param {Object} user - Usuário logado
   */
  globalScope._mostrarProjetos = function _mostrarProjetos(user) {
    globalScope.usuarioLogado = user;
    globalScope.abrirModuloProjetos();
  };

  console.info('[navigation] Módulo carregado');

})(globalThis);
