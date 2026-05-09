#!/usr/bin/env node

const DEFAULT_COLLECTIONS = [
  'processos',
  'kpis',
  'publicacoes',
  'plano',
  'trilhas',
  'plano_metas',
  'solicitacoes',
  'avisos',
  'relatorios_ind',
  'fluxos',
  'projPROJETOS',
  'projPROGRAMAS',
  'sessions',
];

const DEFAULT_CONFIG_DOCS = [
  'arquitetura',
  'usuarios',
  'mapeados',
  'criticos',
  'ejs',
  'last_modified',
  'projPROJ_MACROS',
  'proj_objetivos',
];

function readArg(name, fallback = ''){
  const prefix = `--${name}=`;
  const found = process.argv.find(arg => arg.startsWith(prefix));
  return found ? found.slice(prefix.length).trim() : fallback;
}

function hasFlag(name){
  return process.argv.includes(`--${name}`);
}

function splitList(value, fallback){
  if(!value) return fallback;
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

function tenantPath(tenantId, collectionName, docId){
  const base = `tenants/${tenantId}/${collectionName}`;
  return docId ? `${base}/${docId}` : base;
}

function printPlan({tenantId, collections, configDocs, execute}){
  console.log(`Tenant alvo: ${tenantId}`);
  console.log(`Modo: ${execute ? 'EXECUCAO' : 'DRY-RUN'}`);
  console.log('\nColecoes que serao copiadas:');
  collections.forEach(collectionName => {
    console.log(`- ${collectionName} -> ${tenantPath(tenantId, collectionName)}`);
  });
  console.log('\nDocumentos de config que serao copiados:');
  configDocs.forEach(docId => {
    console.log(`- config/${docId} -> ${tenantPath(tenantId, 'config', docId)}`);
  });
}

async function loadAdmin(){
  try {
    return await import('firebase-admin');
  } catch(error_) {
    throw new Error(
      'firebase-admin nao esta instalado. Para executar a migracao real, instale em um ambiente controlado: npm install --save-dev firebase-admin'
    );
  }
}

async function copyCollection(db, sourceCollection, targetCollection){
  const sourceSnap = await db.collection(sourceCollection).get();
  if(sourceSnap.empty) return 0;
  let batch = db.batch();
  let count = 0;
  let batchSize = 0;
  for(const docSnap of sourceSnap.docs){
    batch.set(db.doc(`${targetCollection}/${docSnap.id}`), docSnap.data());
    count++;
    batchSize++;
    if(batchSize >= 450){
      await batch.commit();
      batch = db.batch();
      batchSize = 0;
    }
  }
  if(batchSize > 0) await batch.commit();
  return count;
}

async function copyConfigDocs(db, configDocs, tenantId){
  let copied = 0;
  let batch = db.batch();
  let batchSize = 0;
  for(const docId of configDocs){
    const source = await db.doc(`config/${docId}`).get();
    if(!source.exists) continue;
    batch.set(db.doc(tenantPath(tenantId, 'config', docId)), source.data());
    copied++;
    batchSize++;
    if(batchSize >= 450){
      await batch.commit();
      batch = db.batch();
      batchSize = 0;
    }
  }
  if(batchSize > 0) await batch.commit();
  return copied;
}

async function executeMigration({tenantId, collections, configDocs}){
  const admin = await loadAdmin();
  if(!admin.apps.length){
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
  const db = admin.firestore();
  for(const collectionName of collections){
    const copied = await copyCollection(db, collectionName, tenantPath(tenantId, collectionName));
    console.log(`Copiados ${copied} documentos de ${collectionName}.`);
  }
  const configCopied = await copyConfigDocs(db, configDocs, tenantId);
  console.log(`Copiados ${configCopied} documentos de config.`);
}

async function main(){
  const tenantId = readArg('tenant', 'cage-rs');
  const execute = hasFlag('execute');
  const collections = splitList(readArg('collections'), DEFAULT_COLLECTIONS);
  const configDocs = splitList(readArg('config-docs'), DEFAULT_CONFIG_DOCS);

  printPlan({tenantId, collections, configDocs, execute});
  if(!execute){
    console.log('\nNenhum dado foi alterado. Use --execute apenas em homologacao/controlado.');
    return;
  }
  await executeMigration({tenantId, collections, configDocs});
}

main().catch(error_ => {
  console.error(error_.message);
  process.exitCode = 1;
});
