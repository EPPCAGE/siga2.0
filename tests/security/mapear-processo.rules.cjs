const {readFileSync}=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require(process.env.FIREBASE_RULES_TESTING || '@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,updateDoc,writeBatch}=require(process.env.FIREBASE_TEST_SDK || 'firebase/firestore');
(async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-siga-mapear',firestore:{rules:readFileSync('firestore.rules','utf8')}});
 try{
  const author=env.authenticatedContext('author',{perfil:'dono',email:'author@example.test'}).firestore();
  const manager=env.authenticatedContext('manager',{perfil:'gestor',email:'manager@example.test'}).firestore();
  const stranger=env.authenticatedContext('stranger',{perfil:'dono',email:'stranger@example.test'}).firestore();
  const ep=env.authenticatedContext('ep',{perfil:'ep',email:'ep@example.test'}).firestore();
  const guest=env.unauthenticatedContext().firestore();
  const data={autor_uid:'author',autor_email:'author@example.test',autor_nome:'Autora',nome:'Processo',macro_id:'m1',macro_nome:'Macro',arq_id:'',tipo:'asis',objetivo:'Documentar o fluxo',status:'rascunho',revisao:1,conteudo:'{"mod":{}}',aviso_lido:false,atualizado_em:new Date().toISOString()};
  const path='mapeamentos_colaborativos/flow1';
  await assertFails(setDoc(doc(guest,path),data));
  await assertFails(setDoc(doc(stranger,path),data));
  await assertSucceeds(setDoc(doc(author,path),data));
  await assertSucceeds(setDoc(doc(manager,'mapeamentos_colaborativos/manager-flow'),{...data,autor_uid:'manager',autor_email:'manager@example.test'}));
  await assertFails(getDoc(doc(ep,path)));
  await assertSucceeds(getDoc(doc(author,path)));await assertFails(getDoc(doc(stranger,path)));
  await assertFails(updateDoc(doc(ep,path),{conteudo:'{}',revisao:2}));
  await assertFails(updateDoc(doc(author,path),{status:'publicado',revisao:2}));
  await assertFails(updateDoc(doc(author,path),{autor_uid:'stranger',revisao:2}));
  await assertSucceeds(updateDoc(doc(author,path),{status:'enviado',revisao:2}));
  await assertFails(updateDoc(doc(author,path),{conteudo:'{}',revisao:3}));
  await assertFails(updateDoc(doc(author,path),{status:'rascunho',revisao:3}));
  await assertSucceeds(updateDoc(doc(ep,path),{conteudo:'{"mod":{"revisado":true}}',revisao:3}));
  const content='{"mod":{"revisado":true}}';
  await assertFails(updateDoc(doc(ep,path),{status:'publicado',revisao:4,arq_id:'p1',publicacao_id:123,revisor_uid:'ep'}));
  const batch=writeBatch(ep);batch.set(doc(ep,'publicacoes/123'),{id:123,categoria:'Fluxos',arq_ids:['p1'],fluxo_colaborativo:{origem_id:'flow1',conteudo:content}});batch.update(doc(ep,path),{status:'publicado',revisao:4,arq_id:'p1',publicacao_id:123,revisor_uid:'ep'});await assertSucceeds(batch.commit());
  await assertSucceeds(updateDoc(doc(author,path),{aviso_lido:true}));
  await assertFails(updateDoc(doc(author,path),{aviso_lido:false}));
  await assertFails(updateDoc(doc(ep,path),{conteudo:'{}',revisao:5}));
  await assertFails(setDoc(doc(author,'publicacoes/456'),{categoria:'Fluxos'}));
  console.log('Regras de mapeamento colaborativo: autoria, envio, revisão, publicação atômica e aviso validados.');
 }finally{await env.cleanup();}
})().catch(error=>{console.error(error);process.exitCode=1;});
