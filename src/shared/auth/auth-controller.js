/**
 * @fileoverview Controller de autenticação compartilhado
 * Módulo compartilhado entre processos.html e projetos.html
 * 
 * Gerencia login, primeiro acesso, recuperação de senha e troca de senha
 */

(function initAuthController(globalScope) {
  'use strict';

  // ══════════════════════════════════════════════════════════════
  // LOGIN
  // ══════════════════════════════════════════════════════════════

  /**
   * Realiza login com e-mail e senha
   * @async
   * @returns {Promise<void>}
   */
  globalScope.doLogin = async function doLogin() {
    const email = document.getElementById('login-email')?.value.trim().toLowerCase() || '';
    const senha = document.getElementById('login-senha')?.value || '';
    
    if (!email) {
      globalScope.mostrarErrLogin('Informe seu e-mail.');
      return;
    }
    
    if (!senha) {
      globalScope.mostrarErrLogin('Informe sua senha.');
      return;
    }

    // Valida domínio
    const dominio = email.split('@')[1] || '';
    if (!globalScope.DOMINIOS_PERMITIDOS.includes(dominio)) {
      globalScope.mostrarErrLogin('Acesso restrito a e-mails institucionais.');
      return;
    }

    // Com Firebase: tenta autenticar
    if (globalScope.fbReady && globalScope.fbReady()) {
      const btn = document.querySelector('.login-btn');
      if (btn) {
        btn.textContent = 'Entrando…';
        btn.disabled = true;
      }
      
      try {
        const { auth, signInWithEmailAndPassword } = globalScope.fb();
        await signInWithEmailAndPassword(auth, email, senha);
        // onAuthStateChanged vai carregar dados e aplicar o usuário
      } catch (e) {
        if (btn) {
          btn.textContent = 'Entrar';
          btn.disabled = false;
        }
        
        const msgs = {
          'auth/wrong-password': 'Senha incorreta.',
          'auth/user-not-found': 'Usuário não encontrado. Use "Primeiro acesso" para criar sua senha.',
          'auth/invalid-credential': 'E-mail ou senha incorretos.',
          'auth/too-many-requests': 'Muitas tentativas. Tente novamente em alguns minutos.',
        };
        globalScope.mostrarErrLogin(msgs[e.code] || ('Erro ao entrar: ' + e.message));
      }
    } else {
      // Fallback sem Firebase (modo local)
      const user = globalScope._findUsuarioByEmail(email);
      if (!user) {
        globalScope.mostrarErrLogin('Acesso não encontrado. Use "Primeiro acesso" para criar seu cadastro.');
        return;
      }
      
      if (globalScope.lsSet) {
        globalScope.lsSet('siga_user', user.email);
      }
      
      if (globalScope._aplicarUsuario) {
        globalScope._aplicarUsuario(user);
      }
    }
  };

  /**
   * Exibe mensagem de erro no formulário de login
   * @param {string} msg - Mensagem de erro
   */
  globalScope.mostrarErrLogin = function mostrarErrLogin(msg) {
    const e = document.getElementById('login-err');
    if (!e) return;
    e.style.color = '#F2A0A0';
    e.textContent = msg;
    e.style.display = 'block';
  };

  // ══════════════════════════════════════════════════════════════
  // PRIMEIRO ACESSO / RECUPERAÇÃO DE SENHA
  // ══════════════════════════════════════════════════════════════

  /**
   * Toggle visibilidade do formulário de primeiro acesso
   */
  globalScope.togglePrimeiroAcesso = function togglePrimeiroAcesso() {
    const f = document.getElementById('primeiro-acesso-form');
    if (!f) return;
    const visible = f.style.display !== 'none';
    f.style.display = visible ? 'none' : 'block';
    if (!visible) {
      document.getElementById('pa-email')?.focus();
    }
  };

  /**
   * Processa solicitação de primeiro acesso
   * @async
   */
  globalScope.processarPrimeiroAcesso = async function processarPrimeiroAcesso() {
    const btn = document.getElementById('pa-btn');
    if (btn?.disabled) return;
    
    const nome = (document.getElementById('pa-nome')?.value || '').trim();
    const email = (document.getElementById('pa-email')?.value || '').trim().toLowerCase();
    const msgEl = document.getElementById('pa-msg');
    
    const showErr = m => {
      if (!msgEl) return;
      msgEl.style.background = 'rgba(242,160,160,.15)';
      msgEl.style.color = '#F2A0A0';
      msgEl.textContent = m;
      msgEl.style.display = 'block';
    };
    
    const showOk = m => {
      if (!msgEl) return;
      msgEl.style.background = 'rgba(160,242,196,.15)';
      msgEl.style.color = '#A0F2C4';
      msgEl.textContent = m;
      msgEl.style.display = 'block';
    };

    if (!email) {
      showErr('Informe seu e-mail institucional.');
      return;
    }
    
    const dominio = email.split('@')[1] || '';
    if (!globalScope.DOMINIOS_PERMITIDOS.includes(dominio)) {
      showErr('Use um e-mail institucional válido (' + globalScope.DOMINIOS_PERMITIDOS.join(' ou ') + ').');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Enviando…';
    }
    
    try {
      const emailCadastrado = globalScope._checkEmailExists 
        ? await globalScope._checkEmailExists(email)
        : globalScope.USUARIOS.some(u => u.email === email);
        
      if (emailCadastrado) {
        await globalScope._primeiroAcessoExistente(email, showErr, showOk);
      } else {
        await globalScope._primeiroAcessoNovo(email, nome, showErr, showOk);
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Continuar →';
      }
    }
  };

  /**
   * Primeiro acesso para usuário já cadastrado (envia reset de senha)
   * @async
   * @param {string} email - E-mail do usuário
   * @param {Function} showErr - Callback para mostrar erro
   * @param {Function} showOk - Callback para mostrar sucesso
   */
  globalScope._primeiroAcessoExistente = async function _primeiroAcessoExistente(email, showErr, showOk) {
    if (!globalScope.fbReady || !globalScope.fbReady()) {
      showErr('Firebase não configurado.');
      return;
    }
    
    try {
      const { auth, sendPasswordResetEmail, initializeApp, deleteApp, getAuth, createUserWithEmailAndPassword, FIREBASE_CONFIG } = globalScope.fb();
      
      // Tenta criar conta Firebase Auth (caso EPP tenha cadastrado manualmente)
      const secApp = initializeApp(FIREBASE_CONFIG, 'sec_exist_' + Date.now());
      const secAuth = getAuth(secApp);
      let contaCriada = false;
      const senhaTemp = globalScope.gerarSenhaTemp();
      
      try {
        await createUserWithEmailAndPassword(secAuth, email, senhaTemp);
        contaCriada = true;
      } catch (createErr) {
        if (createErr.code !== 'auth/email-already-in-use') throw createErr;
      } finally {
        await deleteApp(secApp).catch(() => {});
      }

      if (contaCriada) {
        // Conta recém-criada — envia senha temporária
        const user = globalScope._findUsuarioByEmail(email);
        if (user) {
          user.trocar_senha = true;
          if (globalScope.fbSaveAll) await globalScope.fbSaveAll();
        }
        const nome = user?.nome || email;
        if (globalScope._enviarSenhaAcesso) {
          globalScope._enviarSenhaAcesso(email, nome, senhaTemp);
        }
        showOk('Acesso liberado! Enviamos uma senha temporária para ' + email + '. Use-a para entrar e defina sua senha definitiva.');
      } else {
        // Conta já existe — envia link de reset
        await sendPasswordResetEmail(auth, email);
        showOk('Link de redefinição enviado para ' + email + '. Verifique sua caixa de entrada (e a pasta de spam).');
      }
    } catch (err) {
      showErr('Erro ao enviar e-mail: ' + err.message);
    }
  };

  /**
   * Primeiro acesso para novo usuário (cria solicitação)
   * @async
   * @param {string} email - E-mail do usuário
   * @param {string} nome - Nome completo do usuário
   * @param {Function} showErr - Callback para mostrar erro
   * @param {Function} showOk - Callback para mostrar sucesso
   */
  globalScope._primeiroAcessoNovo = async function _primeiroAcessoNovo(email, nome, showErr, showOk) {
    if (!nome) {
      showErr('Informe seu nome completo.');
      return;
    }
    
    if (!globalScope.fbReady || !globalScope.fbReady()) {
      showErr('Firebase não configurado.');
      return;
    }

    const senhaTemp = globalScope.gerarSenhaTemp();

    // Cria conta no Firebase Auth
    try {
      const { initializeApp, deleteApp, getAuth, createUserWithEmailAndPassword, FIREBASE_CONFIG } = globalScope.fb();
      const secApp = initializeApp(FIREBASE_CONFIG, 'sec_' + Date.now());
      const secAuth = getAuth(secApp);
      
      try {
        await createUserWithEmailAndPassword(secAuth, email, senhaTemp);
      } catch (error_) {
        await deleteApp(secApp);
        if (error_.code === 'auth/email-already-in-use') {
          showErr('Este e-mail já possui acesso. Use suas credenciais para entrar.');
          return;
        }
        throw error_;
      }
      await deleteApp(secApp);
    } catch (e) {
      showErr('Erro ao criar acesso: ' + (e.message || e.code || e));
      return;
    }

    // Adiciona ao USUARIOS
    const palavras = nome.trim().split(/\s+/).filter(Boolean);
    const iniciais = (palavras.length >= 2 
      ? palavras[0][0] + palavras[palavras.length - 1][0] 
      : (palavras[0] || '?').slice(0, 2)
    ).toUpperCase();
    
    globalScope.USUARIOS.push({
      email,
      nome,
      perfil: 'dono',
      perfis: ['dono', 'gerente_projeto'],
      iniciais,
      macroprocessos_vinculados: [],
      processos_vinculados: [],
      trocar_senha: true
    });
    
    if (globalScope.fbSaveAll) await globalScope.fbSaveAll();

    // Envia senha temporária
    if (globalScope._enviarSenhaAcesso) {
      globalScope._enviarSenhaAcesso(email, nome, senhaTemp);
    }

    // Notifica EPPs
    if (globalScope.enviarNotif) {
      globalScope.USUARIOS.filter(u => u.perfil === 'ep' && u.email).forEach(ep =>
        globalScope.enviarNotif(
          ep.email,
          ep.nome,
          'Novo usuário registrado: ' + nome + ' (' + email + '). Acesso liberado automaticamente.',
          'Controle de Acesso',
          '',
          'Sistema'
        )
      );
    }

    showOk('Acesso criado! Enviamos uma senha temporária para ' + email + '. Verifique sua caixa de entrada e spam.');
    
    // Limpa formulário
    const nomeEl = document.getElementById('pa-nome');
    const emailEl = document.getElementById('pa-email');
    if (nomeEl) nomeEl.value = '';
    if (emailEl) emailEl.value = '';
  };

  // ══════════════════════════════════════════════════════════════
  // GERAÇÃO DE SENHA TEMPORÁRIA
  // ══════════════════════════════════════════════════════════════

  /**
   * Gera senha temporária segura (8 caracteres)
   * @returns {string} Senha gerada
   */
  globalScope.gerarSenhaTemp = function gerarSenhaTemp() {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const all = upper + lower + digits;
    
    // Pad para 32 caracteres (2^5) para evitar bias de modulo
    const _pad32 = (s) => {
      let r = s;
      while (r.length < 32) r += s;
      return r.slice(0, 32);
    };
    
    const U32 = _pad32(upper);
    const L32 = _pad32(lower);
    const D32 = _pad32(digits);
    const A32 = _pad32(all);
    
    const _rndBytes = (n) => crypto.getRandomValues(new Uint8Array(n));
    const _pickP2 = (p32, byte) => p32[byte >> 3]; // Top 5 bits
    
    const bytes = _rndBytes(16); // 8 para chars, 8 para shuffle
    let p = _pickP2(U32, bytes[0]) + _pickP2(L32, bytes[1]) + _pickP2(D32, bytes[2]);
    p += _pickP2(A32, bytes[3]);
    p += _pickP2(A32, bytes[4]);
    p += _pickP2(A32, bytes[5]);
    p += _pickP2(A32, bytes[6]);
    p += _pickP2(A32, bytes[7]);
    
    // Fisher-Yates shuffle
    const arr = p.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = bytes[8 + i] & 7; // 0-7
      if (j <= i) {
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }
    
    return arr.join('');
  };

  /**
   * Envia senha de acesso por e-mail
   * @param {string} email - E-mail destino
   * @param {string} nome - Nome do usuário
   * @param {string} senha - Senha temporária
   */
  globalScope._enviarSenhaAcesso = function _enviarSenhaAcesso(email, nome, senha) {
    const ejsConfig = globalScope.ejsConfig;
    const ORG_CONFIG = globalScope.ORG_CONFIG;
    
    if (ejsConfig?.service && ejsConfig?.template && ejsConfig?.pubkey && typeof emailjs !== 'undefined') {
      emailjs.send(ejsConfig.service, ejsConfig.template, {
        to_name: nome,
        to_email: email,
        from_name: ORG_CONFIG.notificationFromName,
        processo: 'Acesso liberado',
        acao: 'Seu acesso ao sistema ' + ORG_CONFIG.systemBrand + ' foi aprovado.\n\nSua senha temporária: ' + senha + '\n\nAcesse o sistema e altere sua senha no primeiro login.',
        prazo: 'Alterar a senha no primeiro acesso',
        link: ORG_CONFIG.publicUrl,
      }).then(() => console.info('Senha temporária enviada para', email))
        .catch(err => console.warn('EmailJS erro ao enviar senha:', err?.text || err?.message));
    } else {
      console.warn('_enviarSenhaAcesso: EmailJS não configurado — e-mail não enviado para', email);
    }
  };

  console.info('[auth-controller] Módulo carregado');

})(globalThis);
