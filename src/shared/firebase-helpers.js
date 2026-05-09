(function initFirebaseHelpers(globalScope){
  function fbReady(){
    return globalScope._fbReady === true;
  }

  function fb(){
    return globalScope._fb;
  }

  function fbColRef(db, collectionName){
    const {collection} = fb();
    return collection(db, tenantCollectionPath(collectionName));
  }

  function fbDocRef(db, collectionName, id){
    const {doc} = fb();
    return doc(db, tenantCollectionPath(collectionName), String(id));
  }

  function fbConfigDocRef(db, key){
    const {doc} = fb();
    return doc(db, tenantDocPath('config', key));
  }

  globalScope.fbReady = fbReady;
  globalScope.fb = fb;
  globalScope.fbColRef = fbColRef;
  globalScope.fbDocRef = fbDocRef;
  globalScope.fbConfigDocRef = fbConfigDocRef;
})(globalThis);
