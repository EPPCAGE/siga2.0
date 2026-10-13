const crypto=require('node:crypto');
const OFFLINE_MS=7*24*60*60*1000, POLL_MS=5*60*1000;
function normalizeCode(value){const code=String(value||'').trim().toUpperCase();if(!/^CAGE(?:-[A-F0-9]{4}){8}$/.test(code))throw Error('Informe o código de licença distribuído pela CAGE.');return code;}
function orgKey(value){return String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');}
function signLease(payload,privateKey){const data=Buffer.from(JSON.stringify(payload)).toString('base64url');return {data,signature:crypto.sign(null,Buffer.from(data),privateKey).toString('base64url')};}
function verifyLease(envelope,publicKey,installationId,now=Date.now()){
  if(!envelope||typeof envelope.data!=='string'||envelope.data.length>10000||typeof envelope.signature!=='string'||!crypto.verify(null,Buffer.from(envelope.data),publicKey,Buffer.from(envelope.signature,'base64url')))throw Error('Não foi possível confirmar a assinatura da licença.');
  const lease=JSON.parse(Buffer.from(envelope.data,'base64url').toString());
  if(lease.version!==1||lease.installationId!==installationId||!['active','revoked'].includes(lease.status)||typeof lease.licenseId!=='string'||typeof lease.organization!=='string'||!Number.isSafeInteger(lease.issuedAt)||!Number.isSafeInteger(lease.expiresAt)||lease.issuedAt>now+60000||lease.expiresAt<=lease.issuedAt||lease.expiresAt-lease.issuedAt>OFFLINE_MS)throw Error('Resposta de licença inválida.');
  return lease;
}
module.exports={OFFLINE_MS,POLL_MS,normalizeCode,orgKey,signLease,verifyLease};
