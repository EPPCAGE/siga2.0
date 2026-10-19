const {hash,cnpj}=require('./license-core.cjs');
const TTL_MS=180000;
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
class LicensePresence{
  constructor({db,now=Date.now}){this.db=db;this.now=now;}
  async heartbeat(values){
    const {licenseId,installationId,activationToken,sessionId}=values;
    if(!/^[a-f0-9]{64}$/.test(licenseId||'')||!uuid(installationId)||!uuid(sessionId)||!/^[a-f0-9]{64}$/.test(activationToken||'')||typeof values.userName!=='string'||!values.userName.trim()||values.userName.length>100||!['heartbeat','leave'].includes(values.operation)||typeof values.editing!=='boolean')throw Error('invalid-input');
    const licenseRef=this.db.doc('siga_lite_licenses/'+licenseId),activationRef=this.db.doc('siga_lite_licenses/'+licenseId+'/installations/'+installationId),now=this.now();
    return this.db.runTransaction(async tx=>{
      const [licenseSnap,activationSnap]=await Promise.all([tx.get(licenseRef),tx.get(activationRef)]);
      if(!licenseSnap.exists)throw Error('invalid-license');
      const license=licenseSnap.data();
      if(!['active','activated'].includes(license.status)||license.installationId!==installationId||!activationSnap.exists||activationSnap.data().tokenHash!==hash(activationToken))throw Error('invalid-activation');
      // Only the server derives the organization; a caller cannot select another CNPJ.
      const ref=this.db.doc('siga_conecta_presence/'+hash(cnpj(license.cnpj))),snapshot=await tx.get(ref);
      const sessions=Object.fromEntries(Object.entries(snapshot.data()?.sessions||{}).filter(([,s])=>s.lastSeenAt>now-TTL_MS));
      const id=hash(licenseId+':'+installationId+':'+sessionId);
      if(values.operation==='leave')delete sessions[id];
      else{
        if(!sessions[id]&&Object.keys(sessions).length>=100)throw Error('presence-capacity');
        sessions[id]={startedAt:sessions[id]?.startedAt??now,lastSeenAt:now,userName:values.userName.trim(),editing:values.editing};
      }
      tx.set(ref,{sessions,updatedAt:now,expiresAt:new Date(now+TTL_MS)});
      const peers=Object.entries(sessions).filter(([key])=>key!==id).map(([id,s])=>({id,...s})).sort((a,b)=>a.startedAt-b.startedAt);
      return {version:1,checkedAt:now,startedAt:sessions[id]?.startedAt??now,ttlMs:TTL_MS,peers};
    });
  }
}
module.exports={LicensePresence,TTL_MS};
