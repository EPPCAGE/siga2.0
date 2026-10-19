const {onRequest}=require('firebase-functions/v2/https');
const {defineSecret}=require('firebase-functions/params');
const {LicenseService,hash}=require('./license-core.cjs');
const {LicensePresence}=require('./license-presence.cjs');
const signing=defineSecret('SIGA_LITE_LICENSE_SIGNING_KEY'),managers=defineSecret('SIGA_LITE_LICENSE_ADMINS');
const origins=new Set(['https://sigaepp.web.app','https://sigaepp.firebaseapp.com','https://eppcage.com.br','https://www.eppcage.com.br','https://eppcage.github.io']);
async function rateLimit(db,key,limit){const ref=db.doc('siga_lite_license_limits/'+hash(key)),now=Date.now();return db.runTransaction(async tx=>{const snap=await tx.get(ref),record=snap.data();if(!snap.exists||record.until<=now){tx.set(ref,{count:1,until:now+900000});return true;}if(record.count>=limit)return false;tx.update(ref,{count:record.count+1});return true;});}
function registrar(admin){
  const options={region:'us-central1',secrets:[signing],maxInstances:10,timeoutSeconds:30,memory:'256MiB',invoker:'public'};
  return {
    sigaLiteLicense:onRequest(options,async(req,res)=>{
      res.set('Cache-Control','no-store');
      if(req.method!=='POST')return res.status(405).json({error:'method-not-allowed'});
      if(!req.is('application/json')||Buffer.byteLength(JSON.stringify(req.body||{}))>5000)return res.status(400).json({error:'invalid-input'});
      try{
        const db=admin.firestore(),isCheck=['check','presence'].includes(req.body.action);if(!await rateLimit(db,(isCheck?'check:':'activate:')+req.ip,isCheck?5000:100))return res.status(429).json({error:'rate-limit'});
        if(req.body.action==='presence')return res.json(await new LicensePresence({db}).heartbeat(req.body));
        const result=await new LicenseService({db,privateKey:signing.value()}).client(req.body);return res.json(result);
      }catch(error){const status={'invalid-input':400,'invalid-license':401,'invalid-activation':401,'wrong-organization':403,'installation-limit':403}[error.message];if(!status)console.error('SIGA Lite: falha interna na validação de licença.');return res.status(status||503).json({error:status?error.message:'service-unavailable'});}
    }),
    sigaLiteLicenseAdmin:onRequest({...options,secrets:[signing,managers]},async(req,res)=>{
      const origin=req.headers.origin;if(origins.has(origin))res.set('Access-Control-Allow-Origin',origin);res.set('Vary','Origin');res.set('Cache-Control','no-store');res.set('Access-Control-Allow-Headers','Authorization, Content-Type');res.set('Access-Control-Allow-Methods','POST, OPTIONS');
      if(req.method==='OPTIONS')return res.status(204).send('');if(req.method!=='POST')return res.status(405).json({error:'method-not-allowed'});
      if(origin&&!origins.has(origin))return res.status(403).json({error:'forbidden'});
      try{
        const bearer=/^Bearer (.+)$/.exec(req.headers.authorization||'');if(!bearer)return res.status(401).json({error:'authentication-required'});
        let identity;try{identity=await admin.auth().verifyIdToken(bearer[1],true);}catch{return res.status(401).json({error:'authentication-required'});}
        const allowed=JSON.parse(managers.value());
        if(!Array.isArray(allowed)||!allowed.includes(identity.uid))return res.status(403).json({error:'forbidden'});
        if(!req.is('application/json')||Buffer.byteLength(JSON.stringify(req.body||{}))>5000)return res.status(400).json({error:'invalid-input'});
        const db=admin.firestore();if(!await rateLimit(db,'admin:'+identity.uid,200))return res.status(429).json({error:'rate-limit'});
        const service=new LicenseService({db,privateKey:signing.value()}),{action,...values}=req.body;let result;
        if(action==='list')result=await service.list(values.cursor);
        else if(action==='issue')result=await service.issue(values,identity.uid);
        else if(action==='update-registration')result=await service.updateRegistration(values,identity.uid);
        else if(action==='revoke')result=await service.setStatus(values.id,'revoked',identity.uid,values.reason);
        else if(action==='reactivate')result=await service.setStatus(values.id,'active',identity.uid,values.reason);
        else if(action==='installations')result=await service.installations(values.id);
        else return res.status(400).json({error:'invalid-input'});
        return res.json({result});
      }catch(error){if(['invalid-input','not-found','invalid-cnpj','single-installation-only','activated-organization-fixed'].includes(error.message))return res.status(400).json({error:error.message});return res.status(503).json({error:'service-unavailable'});}
    })
  };
}
module.exports={registrar};
