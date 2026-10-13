const crypto=require('node:crypto');
const OFFLINE_MS=7*24*60*60*1000;
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const orgKey=value=>String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');
const text=(value,max=300)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('invalid-input');return value.trim();};
function cnpj(value){
  const normalized=String(value||'').trim().toUpperCase().replace(/[./\-\s]/g,'');
  if(!/^[A-Z0-9]{12}\d{2}$/.test(normalized)||/^(\d)\1{13}$/.test(normalized))throw Error('invalid-cnpj');
  function digit(part){let weight=2,sum=0;for(let index=part.length-1;index>=0;index--){sum+=(part.charCodeAt(index)-48)*weight;weight=weight===9?2:weight+1;}const remainder=sum%11;return String(remainder<2?0:11-remainder);}
  if(digit(normalized.slice(0,12))!==normalized[12]||digit(normalized.slice(0,13))!==normalized[13])throw Error('invalid-cnpj');
  return normalized;
}
function statusOf(record){return record.status==='revoked'?'revoked':record.activationCount>0?'activated':'issued';}
function lease(record,installationId,now,privateKey){const payload={version:1,licenseId:record.id,organization:record.organization,cnpj:record.cnpj,installationId,status:record.status==='revoked'?'revoked':'active',issuedAt:now,expiresAt:now+OFFLINE_MS};const data=Buffer.from(JSON.stringify(payload)).toString('base64url');return {data,signature:crypto.sign(null,Buffer.from(data),privateKey).toString('base64url')};}
class LicenseService{
  constructor({db,privateKey,now=Date.now}){this.db=db;this.privateKey=privateKey;this.now=now;}
  async issue(values,actor){
    const organization=text(values.organization),organizationAbbreviation=String(values.organizationAbbreviation||'').trim().slice(0,100),taxId=cnpj(values.cnpj),maxInstallations=1;
    if(values.maxInstallations!==undefined&&Number(values.maxInstallations)!==1)throw Error('single-installation-only');
    const code='CAGE-'+crypto.randomBytes(16).toString('hex').toUpperCase().match(/.{4}/g).join('-'),id=hash(code),now=this.now();
    await this.db.runTransaction(async tx=>{
      tx.create(this.db.doc('siga_lite_licenses/'+id),{id,organization,organizationAbbreviation,cnpj:taxId,maxInstallations,status:'issued',activationCount:0,createdAt:now,createdBy:actor,codeHint:code.slice(-4),notes:String(values.notes||'').slice(0,2000)});
      tx.create(this.db.doc('siga_lite_license_audit/'+crypto.randomUUID()),{licenseId:id,action:'issue',actor,at:now});
    });return {id,code,organization,organizationAbbreviation,cnpj:taxId,maxInstallations,status:'issued'};
  }
  async audit(id,action,actor,details={}){await this.db.collection('siga_lite_license_audit').add({licenseId:id,action,actor,at:this.now(),...details});}
  async setStatus(id,status,actor,reason){
    if(!/^[a-f0-9]{64}$/.test(id)||!['active','revoked'].includes(status))throw Error('invalid-input');
    const ref=this.db.doc('siga_lite_licenses/'+id),note=text(reason,2000);
    await this.db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists)throw Error('not-found');const record=snap.data(),next=status==='revoked'?'revoked':statusOf({...record,status:'active'});tx.update(ref,{status:next,updatedAt:this.now(),updatedBy:actor,reason:note});tx.create(this.db.doc('siga_lite_license_audit/'+crypto.randomUUID()),{licenseId:id,action:next,actor,at:this.now(),reason:note});});
    return {id,status};
  }
  async updateRegistration(values,actor){
    if(!/^[a-f0-9]{64}$/.test(values.id||''))throw Error('invalid-input');
    const organization=text(values.organization),taxId=cnpj(values.cnpj),ref=this.db.doc('siga_lite_licenses/'+values.id);
    return this.db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists)throw Error('not-found');const record=snap.data();if(record.activationCount>0&&organization!==record.organization)throw Error('activated-organization-fixed');
      const details={organization,cnpj:taxId,organizationAbbreviation:String(values.organizationAbbreviation||'').trim().slice(0,100),notes:String(values.notes||'').slice(0,2000),updatedAt:this.now(),updatedBy:actor};
      tx.update(ref,details);tx.create(this.db.doc('siga_lite_license_audit/'+crypto.randomUUID()),{licenseId:values.id,action:'update-registration',actor,at:this.now()});return {id:values.id,...details};
    });
  }
  async list(cursor){
    let query=this.db.collection('siga_lite_licenses').orderBy('createdAt','desc').limit(200);
    if(cursor){if(!/^[a-f0-9]{64}$/.test(cursor))throw Error('invalid-input');const snapshot=await this.db.doc('siga_lite_licenses/'+cursor).get();if(!snapshot.exists)throw Error('invalid-input');query=query.startAfter(snapshot);}
    const result=await query.get();return {items:result.docs.map(doc=>({...doc.data(),status:statusOf(doc.data()),maxInstallations:1})),nextCursor:result.docs.length===200?result.docs.at(-1).id:null};
  }
  async installations(id){if(!/^[a-f0-9]{64}$/.test(id))throw Error('invalid-input');const result=await this.db.collection('siga_lite_licenses/'+id+'/installations').limit(10000).get();return result.docs.map(doc=>{const {tokenHash,...safe}=doc.data();return safe;});}
  async client(values){
    const action=values.action,id=text(values.installationId,36),secret=text(values.activationToken,64);
    if(!/^[a-f0-9-]{36}$/.test(id)||!/^[a-f0-9]{64}$/.test(secret))throw Error('invalid-input');
    if(values.appVersion!==undefined&&(typeof values.appVersion!=='string'||! /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(values.appVersion)||values.appVersion.length>50))throw Error('invalid-input');
    const version=values.appVersion?{appVersion:values.appVersion}:{};
    let licenseId=values.licenseId;
    if(action==='activate'){const code=text(values.code,44).toUpperCase();if(!/^CAGE(?:-[A-F0-9]{4}){8}$/.test(code))throw Error('invalid-input');licenseId=hash(code);}
    else if(action!=='check')throw Error('invalid-input');
    if(!/^[a-f0-9]{64}$/.test(licenseId||''))throw Error('invalid-input');
    const ref=this.db.doc('siga_lite_licenses/'+licenseId),activation=this.db.doc('siga_lite_licenses/'+licenseId+'/installations/'+id),now=this.now();
    const record=await this.db.runTransaction(async tx=>{
      const [licenseSnap,installationSnap]=await Promise.all([tx.get(ref),tx.get(activation)]);
      if(!licenseSnap.exists)throw Error('invalid-license');const record=licenseSnap.data();
      if(!['active','issued','activated','revoked'].includes(record.status))throw Error('invalid-license');
      if(!['active','issued','activated','revoked'].includes(record.status))throw Error('invalid-license');
      if(record.activationCount>1)throw Error('invalid-activation');
      if(action==='activate'&&values.organization&&orgKey(values.organization)!==orgKey(record.organization))throw Error('wrong-organization');
      if(record.installationId&&record.installationId!==id)throw Error('installation-limit');
      if(installationSnap.exists){if(installationSnap.data().tokenHash!==hash(secret))throw Error('invalid-activation');}
      else{
        if(action!=='activate')throw Error('invalid-activation');if(record.status==='revoked')return record;
        if(record.activationCount>=1)throw Error('installation-limit');
        tx.set(activation,{installationId:id,tokenHash:hash(secret),activatedAt:now,lastSeenAt:now,...version});tx.update(ref,{activationCount:1,installationId:id,status:'activated',activatedAt:now});
        tx.create(this.db.doc('siga_lite_license_audit/'+crypto.randomUUID()),{licenseId,action:'activate',actor:id,at:now});
      }
      if(installationSnap.exists){tx.update(activation,{lastSeenAt:now,...version});if(!record.installationId)tx.update(ref,{installationId:id,status:statusOf(record)});}
      return record;
    });
    return lease(record,id,now,this.privateKey);
  }
}
module.exports={LicenseService,hash,orgKey,lease,OFFLINE_MS,cnpj,statusOf};
