// Copie este arquivo para config.local.js em desenvolvimento
// ou para config.deploy.js no ambiente publicado.
// Nao versionar chaves reais em repositorios publicos.
window.CONFIG = {
  FIREBASE_API_KEY: '',
  AI_FUNCTION_URL: '',
  TENANCY: {
    // Manter false enquanto usa a base legada nas colecoes raiz do Firestore.
    // Ao ativar, os dados passam a usar caminhos como tenants/{tenantId}/processos.
    enabled: false,
    tenantId: 'cage-rs',
    dataRoot: 'tenants',
    environment: 'dev',
  },
  ORG: {
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
    domainProfiles: {
      'sefaz.rs.gov.br': 'ep',
      'cage.rs.gov.br': 'ep',
    },
    logos: {
      app: 'logo-siga.png',
      organization: 'epp-logo.png',
    },
  },
};
