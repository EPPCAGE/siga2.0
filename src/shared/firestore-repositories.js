(function initFirestoreRepositories(globalScope){
  function requireFirebase(){
    if(!fbReady()) throw new Error('Firebase indisponível.');
    return fb();
  }

  function collectionRepository(collectionName){
    function ref(id){
      const {db} = requireFirebase();
      return fbDocRef(db, collectionName, id);
    }

    function colRef(){
      const {db} = requireFirebase();
      return fbColRef(db, collectionName);
    }

    async function list(){
      const {getDocs} = requireFirebase();
      const snap = await getDocs(colRef());
      const docs = [];
      snap.forEach(docSnap => docs.push({id: docSnap.id, ref: docSnap.ref, data: docSnap.data()}));
      return {empty: snap.empty, docs};
    }

    async function get(id){
      const {getDoc} = requireFirebase();
      return getDoc(ref(id));
    }

    async function set(id, data, options){
      const {setDoc} = requireFirebase();
      if(options) return setDoc(ref(id), data, options);
      return setDoc(ref(id), data);
    }

    async function remove(id){
      const {deleteDoc} = requireFirebase();
      return deleteDoc(ref(id));
    }

    return {collectionName, ref, colRef, list, get, set, remove};
  }

  function _configRef(key){
    const {db} = requireFirebase();
    return fbConfigDocRef(db, key);
  }

  function configRepository(){
    async function get(key, options={}){
      const api = requireFirebase();
      const getter = options.fromServer && api.getDocFromServer ? api.getDocFromServer : api.getDoc;
      return getter(_configRef(key));
    }

    async function set(key, data, options){
      const {setDoc} = requireFirebase();
      if(options) return setDoc(_configRef(key), data, options);
      return setDoc(_configRef(key), data);
    }

    async function remove(key){
      const {deleteDoc} = requireFirebase();
      return deleteDoc(_configRef(key));
    }

    return {ref: _configRef, get, set, remove};
  }

  async function batchCommit(ops, chunkSize=450){
    const {db, writeBatch} = requireFirebase();
    for(let i = 0; i < ops.length; i += chunkSize){
      const batch = writeBatch(db);
      ops.slice(i, i + chunkSize).forEach(op => {
        if(op.type === 'delete') batch.delete(op.ref);
        else if(op.options) batch.set(op.ref, op.data, op.options);
        else batch.set(op.ref, op.data);
      });
      await batch.commit();
    }
  }

  // Cache em memória do último estado gravado por coleção, usada para evitar
  // regravar documentos que não mudaram desde a última sincronização (custo de
  // writes cresce com o tamanho da coleção se regravarmos tudo a cada save).
  // Semeada uma única vez por coleção via repository.list() (1 leitura completa
  // por sessão, no pior caso) — chamadas seguintes de syncCollection reusam o
  // cache em memória, sem nova leitura.
  const _syncCaches = new Map(); // collectionName -> {ready: boolean, map: Map(id -> json)}

  function _syncCacheFor(collectionName){
    let cache = _syncCaches.get(collectionName);
    if(!cache){ cache = {ready: false, map: new Map()}; _syncCaches.set(collectionName, cache); }
    return cache;
  }

  // Permite que listeners onSnapshot atualizem o cache quando recebem mudanças
  // remotas, evitando que o próximo syncCollection local regrave (sem necessidade)
  // documentos que outro usuário já sincronizou.
  function touchSyncCache(collectionName, id, cleanedData){
    const cache = _syncCacheFor(collectionName);
    if(!cache.ready) return;
    if(cleanedData === null || cleanedData === undefined) cache.map.delete(String(id));
    else cache.map.set(String(id), JSON.stringify(cleanedData));
  }

  async function syncCollection(repository, items, cleanFn, chunkSize=400){
    const cache = _syncCacheFor(repository.collectionName);
    if(!cache.ready){
      const snap = await repository.list();
      cache.map.clear();
      snap.docs.forEach(docItem => {
        cache.map.set(String(docItem.id), JSON.stringify(cleanFn ? cleanFn(docItem.data) : docItem.data));
      });
      cache.ready = true;
    }

    const ops = [];
    const seen = new Set();
    (items || []).forEach(item => {
      const id = String(item.id);
      seen.add(id);
      const data = cleanFn ? cleanFn(item) : item;
      const json = JSON.stringify(data);
      if(cache.map.get(id) !== json){
        ops.push({type: 'set', ref: repository.ref(item.id), data});
        cache.map.set(id, json);
      }
    });
    cache.map.forEach((_json, id) => {
      if(!seen.has(id)){
        ops.push({type: 'delete', ref: repository.ref(id)});
        cache.map.delete(id);
      }
    });

    await batchCommit(ops, chunkSize);
  }

  const repositories = {
    collection: collectionRepository,
    config: configRepository(),
    batchCommit,
    syncCollection,
    touchSyncCache,
  };

  globalScope.FirestoreRepositories = repositories;
  globalScope.processosRepository = collectionRepository('processos');
  globalScope.kpisRepository = collectionRepository('kpis');
  globalScope.publicacoesRepository = collectionRepository('publicacoes');
  globalScope.planoRepository = collectionRepository('plano');
  globalScope.planoMetasRepository = collectionRepository('plano_metas');
  globalScope.relatoriosIndicadoresRepository = collectionRepository('relatorios_ind');
  globalScope.fluxosRepository = collectionRepository('fluxos');
  globalScope.sessoesRepository = collectionRepository('sessions');
  globalScope.projetosRepository = collectionRepository('projPROJETOS');
  globalScope.programasRepository = collectionRepository('projPROGRAMAS');
  globalScope.projetosUsuariosRepository = globalScope.projetosRepository;
  globalScope.configRepository = repositories.config;
})(globalThis);
