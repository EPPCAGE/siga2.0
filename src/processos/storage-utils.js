(function initStorageUtils(globalScope){
  function lsGet(key, fallback=''){
    try {
      return globalScope.localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function lsSet(key, value){
    try {
      globalScope.localStorage.setItem(key, String(value));
    } catch {
      console.warn('localStorage indisponível');
    }
  }

  function lsRemove(key){
    try {
      globalScope.localStorage.removeItem(key);
    } catch {}
  }

  function jsonArrayFromStorage(key, fallback='[]'){
    const raw = lsGet(key, fallback);
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('JSON inválido em localStorage para '+key+':', error.message);
      return [];
    }
  }

  globalScope.lsGet = lsGet;
  globalScope.lsSet = lsSet;
  globalScope.lsRemove = lsRemove;
  globalScope.jsonArrayFromStorage = jsonArrayFromStorage;
})(globalThis);
