const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {MemoryDb}=require('./license-memory-db.cjs');
test('serviço administrativo exige token validado e UID autorizado; usuário EP comum não pode gerir licenças',async()=>{
  const {privateKey}=crypto.generateKeyPairSync('ed25519'),db=new MemoryDb(),source=fs.readFileSync(path.join(__dirname,'../../functions/licencas-lite.js'),'utf8'),module={exports:{}};
  const requireMock=name=>name==='firebase-functions/v2/https'?{onRequest:(options,handler)=>({options,handler})}:name==='firebase-functions/params'?{defineSecret:name=>({value:()=>name==='SIGA_LITE_LICENSE_ADMINS'?'["cage-gestor"]':privateKey.export({format:'pem',type:'pkcs8'})})}:require('../../functions/license-core.cjs');
  vm.runInNewContext(source,{require:requireMock,module,exports:module.exports,console,Buffer,Date,Set,JSON});
  const endpoints=module.exports.registrar({firestore:()=>db,auth:()=>({verifyIdToken:async(token,revocation)=>{assert.equal(revocation,true);if(token==='expired')throw Error('expired');return {uid:token,perfil:'ep'};}})});
  async function call({token,origin='https://sigaepp.web.app',action='list',...body}={}){const response={statusCode:200,set(){return this;},status(n){this.statusCode=n;return this;},json(value){this.body=value;return this;},send(){return this;}};await endpoints.sigaLiteLicenseAdmin.handler({method:'POST',headers:{origin,authorization:token?'Bearer '+token:undefined},body:{action,...body},is:()=>true},response);return response;}
  assert.equal((await call()).statusCode,401);assert.equal((await call({token:'ordinary-ep'})).statusCode,403);assert.equal((await call({token:'cage-gestor',origin:'https://outro.example'})).statusCode,403);assert.notEqual((await call({token:'expired'})).statusCode,200);assert.equal(db.rows.size,0);
  const issued=await call({token:'cage-gestor',action:'issue',cnpj:'11222333000181',organization:'Órgão autorizado',maxInstallations:1});assert.equal(issued.statusCode,200);assert.match(issued.body.result.code,/^CAGE-/);
  const id=issued.body.result.id;assert.equal((await call({token:'ordinary-ep',action:'revoke',id,reason:'Não autorizado'})).statusCode,403);
  assert.equal((await call({token:'cage-gestor',action:'revoke',id,reason:'Encerramento formal'})).statusCode,200);assert.equal((await call({token:'cage-gestor'})).body.result.items[0].status,'revoked');
  assert.equal(endpoints.sigaLiteLicenseAdmin.options.secrets.length,2);assert.equal(endpoints.sigaLiteLicense.options.secrets.length,1);
});
test('administração pode consultar licenças além da primeira página sem duplicar nem perder registros',async()=>{
  const {LicenseService}=require('../../functions/license-core.cjs'),db=new MemoryDb(),service=new LicenseService({db,privateKey:crypto.generateKeyPairSync('ed25519').privateKey});
  for(let index=0;index<205;index++){const id=crypto.createHash('sha256').update(String(index)).digest('hex');db.rows.set('siga_lite_licenses/'+id,{id,organization:'Órgão '+index,createdAt:index,status:'active'});}
  const first=await service.list();assert.equal(first.items.length,200);assert.ok(first.nextCursor);const second=await service.list(first.nextCursor);assert.equal(second.items.length,5);assert.equal(second.nextCursor,null);assert.equal(new Set([...first.items,...second.items].map(item=>item.id)).size,205);await assert.rejects(service.list('cursor inválido'),/invalid-input/);
});
