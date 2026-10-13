const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {LicenseService,cnpj}=require('../../functions/license-core.cjs'),{MemoryDb}=require('./license-memory-db.cjs'),{verifyLease}=require('./license-protocol.cjs');
function fixture(){const keys=crypto.generateKeyPairSync('ed25519'),db=new MemoryDb();return {...keys,db,service:new LicenseService({db,privateKey:keys.privateKey})};}
const registration={organization:'Secretaria de Homologação',organizationAbbreviation:'SH',cnpj:'11.222.333/0001-81'};
const installation=()=>({installationId:crypto.randomUUID(),activationToken:crypto.randomBytes(32).toString('hex')});
test('cadastro exige CNPJ válido e admite formatos numérico e alfanumérico',async()=>{
  assert.equal(cnpj(registration.cnpj),'11222333000181');assert.equal(cnpj('12.ABC.345/01DE-35'),'12ABC34501DE35');
  for(const invalid of ['', '00000000000000','11222333000182','12ABC34501DE00','abc'])assert.throws(()=>cnpj(invalid),/invalid-cnpj/);
  const {service}=fixture();await assert.rejects(service.issue({organization:registration.organization},'gestor'),/invalid-cnpj/);
  await assert.rejects(service.issue({...registration,maxInstallations:2},'gestor'),/single-installation-only/);
  const issued=await service.issue(registration,'gestor'),record=(await service.list()).items[0];assert.equal(record.status,'issued');assert.equal(record.cnpj,'11222333000181');assert.equal(record.organizationAbbreviation,'SH');assert.equal(issued.maxInstallations,1);
});
test('primeira ativação consome o código, registra Ativada e reativar não libera outra instalação',async()=>{
  const {service,publicKey,db}=fixture(),issued=await service.issue(registration,'gestor'),a=installation(),b=installation();
  const results=await Promise.allSettled([a,b].map(item=>service.client({...item,action:'activate',code:issued.code})));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const winner=results[0].status==='fulfilled'?a:b,other=winner===a?b:a,record=(await service.list()).items[0];assert.equal(record.status,'activated');assert.equal(record.installationId,winner.installationId);assert.ok(record.activatedAt);assert.equal(record.activationCount,1);
  assert.equal(verifyLease(await service.client({...winner,action:'check',licenseId:issued.id}),publicKey,winner.installationId).status,'active');
  await service.setStatus(issued.id,'revoked','gestor','Teste');assert.equal((await service.list()).items[0].status,'revoked');await service.setStatus(issued.id,'active','gestor','Retomar uso');
  assert.equal((await service.list()).items[0].status,'activated');await assert.rejects(service.client({...other,action:'activate',code:issued.code}),/installation-limit/);
  await service.client({...winner,action:'activate',code:issued.code});assert.equal((await service.list()).items[0].activationCount,1);
  assert.equal([...db.rows.values()].filter(r=>r.action==='activate').length,1);
});
test('cadastro pode ser corrigido, mas nome do órgão fica fixo depois da ativação',async()=>{
  const {service}=fixture(),issued=await service.issue(registration,'gestor');
  await service.updateRegistration({...registration,id:issued.id,organization:'Secretaria corrigida'},'gestor');assert.equal((await service.list()).items[0].organization,'Secretaria corrigida');
  const a=installation();await service.client({...a,action:'activate',code:issued.code});
  await assert.rejects(service.updateRegistration({...registration,id:issued.id},'gestor'),/activated-organization-fixed/);
  await service.updateRegistration({...registration,id:issued.id,organization:'Secretaria corrigida',organizationAbbreviation:'SC',notes:'Cadastro conferido'},'gestor');
  const record=(await service.list()).items[0];assert.equal(record.organizationAbbreviation,'SC');assert.equal(record.notes,'Cadastro conferido');assert.equal(record.status,'activated');
});
