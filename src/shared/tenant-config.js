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

  function tenantBasePath(config){
    const cfg = config || globalScope.TENANT_CONFIG || defaultConfig;
    return cfg.dataRoot+'/'+cfg.tenantId;
  }

  function tenantScopedCollectionPath(collectionName, config){
    return tenantBasePath(config)+'/'+String(collectionName);
  }

  function tenantScopedDocPath(collectionName, docId, config){
    return tenantScopedCollectionPath(collectionName, config)+'/'+String(docId);
  }

  function legacyDocPath(collectionName, docId){
    return collectionName+'/'+String(docId);
  }

  function tenantCollectionPath(collectionName){
    const cfg = globalScope.TENANT_CONFIG || defaultConfig;
    if(!cfg.enabled) return collectionName;
    return tenantScopedCollectionPath(collectionName, cfg);
  }

  function tenantDocPath(collectionName, docId){
    return tenantCollectionPath(collectionName)+'/'+String(docId);
  }

  function tenantPathPreview(collectionName, docId){
    const cfg = globalScope.TENANT_CONFIG || defaultConfig;
    return {
      enabled: cfg.enabled === true,
      tenantId: cfg.tenantId,
      legacy: docId == null ? collectionName : legacyDocPath(collectionName, docId),
      tenant: docId == null ? tenantScopedCollectionPath(collectionName, cfg) : tenantScopedDocPath(collectionName, docId, cfg),
      active: docId == null ? tenantCollectionPath(collectionName) : tenantDocPath(collectionName, docId),
    };
  }

  globalScope.TENANT_CONFIG_DEFAULT = defaultConfig;
  globalScope.TENANT_CONFIG = buildTenantConfig();
  globalScope.tenantBasePath = tenantBasePath;
  globalScope.tenantScopedCollectionPath = tenantScopedCollectionPath;
  globalScope.tenantScopedDocPath = tenantScopedDocPath;
  globalScope.tenantCollectionPath = tenantCollectionPath;
  globalScope.tenantDocPath = tenantDocPath;
  globalScope.tenantPathPreview = tenantPathPreview;
  globalScope.isTenantModeEnabled = function isTenantModeEnabled(){
    return globalScope.TENANT_CONFIG.enabled === true;
  };
})(globalThis);
