(function initTenantConfig(globalScope){
  const defaultConfig = Object.freeze({
    enabled: false,
    tenantId: 'default',
    dataRoot: 'tenants',
    environment: 'dev',
  });

  function normalizeSegment(value, fallback){
    return String(value || fallback)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+/, '').replace(/-+$/, '') || fallback;
  }

  function buildTenantConfig(){
    const incoming = globalScope.CONFIG?.TENANCY || {};
    const tenantId = normalizeSegment(incoming.tenantId, defaultConfig.tenantId);
    const dataRoot = normalizeSegment(incoming.dataRoot, defaultConfig.dataRoot);
    const environment = normalizeSegment(incoming.environment, defaultConfig.environment);
    return {
      ...defaultConfig,
      ...incoming,
      enabled: incoming.enabled === true,
      tenantId,
      dataRoot,
      environment,
    };
  }

  function tenantCollectionPath(collectionName){
    const cfg = globalScope.TENANT_CONFIG || defaultConfig;
    if(!cfg.enabled) return collectionName;
    return cfg.dataRoot+'/'+cfg.tenantId+'/'+collectionName;
  }

  function tenantDocPath(collectionName, docId){
    return tenantCollectionPath(collectionName)+'/'+String(docId);
  }

  globalScope.TENANT_CONFIG_DEFAULT = defaultConfig;
  globalScope.TENANT_CONFIG = buildTenantConfig();
  globalScope.tenantCollectionPath = tenantCollectionPath;
  globalScope.tenantDocPath = tenantDocPath;
  globalScope.isTenantModeEnabled = function isTenantModeEnabled(){
    return globalScope.TENANT_CONFIG.enabled === true;
  };
})(globalThis);
