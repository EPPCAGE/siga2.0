(function initProcessOrgBranding(globalScope){
  function applyOrgBranding(){
    const loginEmail = document.getElementById('login-email');
    const firstAccessEmail = document.getElementById('pa-email');
    if(loginEmail) loginEmail.placeholder = ORG_CONFIG.loginEmailPlaceholder;
    if(firstAccessEmail) firstAccessEmail.placeholder = ORG_CONFIG.loginEmailPlaceholder;

    const supportEmail = document.getElementById('org-support-email-link');
    if(supportEmail){
      supportEmail.href = 'mailto:'+ORG_CONFIG.epTeamEmail;
      supportEmail.title = ORG_CONFIG.epTeamEmail;
    }
    const supportPortal = document.getElementById('org-support-portal-link');
    if(supportPortal){
      supportPortal.href = ORG_CONFIG.supportPortalUrl;
      supportPortal.textContent = ORG_CONFIG.supportPortalLabel;
    }

    const appLogo = document.getElementById('hub-logo-app');
    const orgLogo = document.getElementById('hub-logo-org');
    const hubTitle = document.getElementById('hub-org-title');
    if(appLogo) appLogo.src = ORG_CONFIG.logos.app;
    if(orgLogo){
      orgLogo.src = ORG_CONFIG.logos.organization;
      orgLogo.alt = ORG_CONFIG.organizationName;
    }
    if(hubTitle) hubTitle.textContent = ORG_CONFIG.organizationName;

    const noreplySuggestion = document.getElementById('ejs-noreply-suggestion');
    if(noreplySuggestion) noreplySuggestion.textContent = ORG_CONFIG.noreplySuggestion;
    const subjectExample = document.getElementById('ejs-subject-example');
    if(subjectExample) subjectExample.textContent = ORG_CONFIG.notificationFromName+' — Tarefa pendente: {{processo}}';
    const bodyExample = document.getElementById('ejs-body-example');
    if(bodyExample){
      bodyExample.textContent = [
        'Olá, {{to_name}}.',
        '',
        'Você tem uma nova tarefa pendente no sistema '+ORG_CONFIG.systemBrand+':',
        '',
        'Processo: {{processo}}',
        'Ação necessária: {{acao}}',
        'Prazo: {{prazo}}',
        'Enviado por: {{from_name}}',
        '',
        'Acesse o sistema para realizar a ação:',
        '{{link}}',
        '',
        '---',
        ORG_CONFIG.automaticEmailFooter,
        'Não responda este e-mail.'
      ].join('\n');
    }
  }

  globalScope.applyOrgBranding = applyOrgBranding;
})(globalThis);
