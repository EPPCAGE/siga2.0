const {onSchedule}=require('firebase-functions/v2/scheduler');
const {createHash}=require('node:crypto');

function hoje(data=new Date()){
  return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(data);
}
function pendente(risco,data){
  const prazo=risco?.prazo_tratamento;
  return /^\d{4}-\d{2}-\d{2}$/.test(prazo || '') && prazo<data && risco.status_tratamento!=='tratado' && !(risco.tratado===true && !risco.status_tratamento);
}
function destinatarios(raw){
  const users=typeof raw==='string'?JSON.parse(raw):raw;
  return [...new Map((Array.isArray(users)?users:[]).filter(user=>user && user.ativo!==false && user.email &&
    (user.perfil==='ep' || (user.perfis || []).includes('ep'))).map(user=>[String(user.email).trim().toLowerCase(),user])).values()];
}
function alertaId(path,risk,index,email){
  const identity=risk.id || `${index}:${risk.desc || risk.descricao || ''}`;
  return 'risco-prazo-'+createHash('sha256').update(JSON.stringify([path,identity,risk.prazo_tratamento,email.trim().toLowerCase()])).digest('hex');
}
async function alertarProcesso(db,ref,users,data=hoje()){
  await db.runTransaction(async tx=>{
    const snap=await tx.get(ref);if(!snap.exists)return;
    const process=snap.data(),pending=[];
    for(const [index,risk] of (process.ent?.riscos || []).entries()){
      if(!pendente(risk,data))continue;
      for(const user of users){
        const email=user.email.trim().toLowerCase(),id=alertaId(ref.path,risk,index,email);
        const notifRef=db.collection('notifs').doc(id);
        const notification=await tx.get(notifRef);
        if(notification.exists)continue;
        const expires=new Date(`${data}T12:00:00Z`);expires.setUTCDate(expires.getUTCDate()+30);
        pending.push({ref:notifRef,values:{para_email:email,para:user.nome || 'EP CAGE',
          acao:`O prazo de tratamento do risco “${risk.desc || risk.descricao || 'Risco sem descrição'}” encerrou em ${risk.prazo_tratamento.split('-').reverse().join('/')}. Verifique se o tratamento foi implementado e sua eficácia no módulo Riscos.`,
          proc_nome:process.nome || '',prazo:risk.prazo_tratamento,de:'Gestão de Riscos',data:data.split('-').reverse().join('/'),lida:false,
          tipo:'risco_prazo',processo_id:process.id ?? snap.id,risco_id:risk.id || '',risco_index:index,expires_at:expires.toISOString()}});
      }
    }
    for(const notification of pending)tx.create(notification.ref,notification.values);
  });
}
function registrar(admin){
  const db=admin.firestore();
  return {alertarPrazosTratamentoRiscos:onSchedule({schedule:'0 8 * * *',timeZone:'America/Sao_Paulo'},async()=>{
    const scopes=[{processes:db.collection('processos'),config:db.doc('config/usuarios')}];
    for(const tenant of await db.collection('tenants').listDocuments())scopes.push({processes:tenant.collection('processos'),config:tenant.collection('config').doc('usuarios')});
    const data=hoje();
    for(const scope of scopes){
      const config=await scope.config.get();if(!config.exists)continue;
      const users=destinatarios(config.data().data);if(!users.length)continue;
      let cursor;
      while(true){
        let query=scope.processes.orderBy(admin.firestore.FieldPath.documentId()).limit(100);if(cursor)query=query.startAfter(cursor);
        const page=await query.get();
        for(const process of page.docs)await alertarProcesso(db,process.ref,users,data);
        if(page.size<100)break;cursor=page.docs[page.docs.length-1];
      }
    }
  })};
}
module.exports={hoje,pendente,destinatarios,alertaId,alertarProcesso,registrar};
