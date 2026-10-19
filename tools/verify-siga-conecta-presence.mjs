// Production smoke check: synthetic credentials, no valid license or session created.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const endpoint='https://us-central1-gesproc2.cloudfunctions.net/sigaLiteLicense';
const synthetic={licenseId:'0'.repeat(64),installationId:randomUUID(),activationToken:'0'.repeat(64),appVersion:'1.0.35'};
for(const action of ['presence','check']){
  const response=await fetch(endpoint,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({...synthetic,action,...(action==='presence'?{operation:'heartbeat',sessionId:randomUUID(),userName:'Verificação técnica',editing:false}:{})}),signal:AbortSignal.timeout(60000)});
  const body=await response.json();assert.equal(response.status,401,`${action}: HTTP inesperado`);assert.equal(body.error,'invalid-license',`${action}: resposta inesperada`);
  console.log(`${action}: HTTP 401 invalid-license — credencial sintética recusada.`);
}
const response=await fetch(endpoint,{redirect:'error',signal:AbortSignal.timeout(30000)});
assert.equal(response.status,405);console.log('GET: HTTP 405 — método não permitido.');
