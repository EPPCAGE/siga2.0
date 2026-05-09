(function initOrgConfig(globalScope) {
  const defaultConfig = Object.freeze({
    systemName: 'SIGA 2.0',
    systemBrand: 'EP·CAGE',
    systemFullName: 'SIGA 2.0 — EP·CAGE',
    publicUrl: 'https://sigaepp.web.app/',
    organizationName: 'EPP/CAGE',
    institutionName: 'CAGE/Sefaz-RS',
    officeName: 'Escritório de Processos',
    supportTeamLabel: 'EPP',
    epProfileLabel: 'EPP',
    epTeamName: 'Equipe EP',
    epTeamEmail: 'epp.cage@sefaz.rs.gov.br',
    notificationFromName: 'EP·CAGE',
    noreplySuggestion: 'noreply.ep@sefaz.rs.gov.br',
    automaticEmailFooter: 'Este é um e-mail automático do EPP — CAGE/Sefaz-RS.',
    localEpEmail: 'ep@sefaz.rs.gov.br',
    loginEmailPlaceholder: 'usuario@sefaz.rs.gov.br',
    supportPortalUrl: 'https://atendimentocage.sefaz.rs.gov.br/',
    supportPortalLabel: 'Portal e-CAGE',
    allowedDomains: ['sefaz.rs.gov.br', 'cage.rs.gov.br'],
    domainProfiles: { 'sefaz.rs.gov.br': 'ep', 'cage.rs.gov.br': 'ep' },
    logos: {
      app: 'logo-siga.png',
      organization: 'epp-logo.png',
    },
  });

  function buildOrgConfig() {
    const incoming = globalScope.CONFIG?.ORG || {};
    return {
      ...defaultConfig,
      ...incoming,
      allowedDomains: Array.isArray(incoming.allowedDomains) ? incoming.allowedDomains : defaultConfig.allowedDomains,
      domainProfiles: { ...defaultConfig.domainProfiles, ...(incoming.domainProfiles || {}) },
      logos: { ...defaultConfig.logos, ...(incoming.logos || {}) },
    };
  }

  globalScope.ORG_CONFIG_DEFAULT = defaultConfig;
  globalScope.ORG_CONFIG = buildOrgConfig();
})(globalThis);
