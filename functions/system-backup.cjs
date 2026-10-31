const {createHash}=require('node:crypto');
const COLLECTIONS=Object.freeze(['config','processos','publicacoes','kpis','plano','plano_metas','arquitetura','notifs','registros_processos','mapeamentos_colaborativos','central_controles','controles_aplicacoes','controles_biblioteca','relatorios_ind','fluxos','ideias']);
const CHUNK_SIZE=1024*1024;
function allowedConfig(id){
  // Objetivos estratégicos são compartilhados com a arquitetura de Processos.
  return !/^(usuarios?(?:$|[_-])|users?(?:$|[_-])|riscosProjetoCanvas_)/i.test(id) && (!/^proj[_-]/i.test(id)||id==='proj_objetivos');
}
function allowedFile(path){return typeof path==='string'&&path.length>0&&!path.split('/').some(part=>part==='..')&&!/^(?:projetos|projects|usuarios|users|avatars)(?:\/|$)/i.test(path);}
function allowedCollection(path){
  const parts=String(path||'').split('/');
  return parts.length%2===1&&parts.every(part=>part&&part!=='.'&&part!=='..')&&(COLLECTIONS.includes(parts[0])||/^wf_[a-z_]+$/.test(parts[0]))&&(parts[0]!=='config'||parts.length===1||allowedConfig(parts[1]));
}
function encode(value,types){
  if(value===null||typeof value==='string'||typeof value==='boolean')return value;
  if(typeof value==='number')return Number.isFinite(value)?value:{$type:'number',value:String(value)};
  if(value instanceof types.Timestamp)return {$type:'timestamp',seconds:String(value.seconds),nanoseconds:value.nanoseconds};
  if(value instanceof types.GeoPoint)return {$type:'geopoint',latitude:value.latitude,longitude:value.longitude};
  if(value instanceof types.DocumentReference)return {$type:'reference',path:value.path};
  if(value instanceof Date)return {$type:'date',value:value.toISOString()};
  if(Buffer.isBuffer(value)||value instanceof Uint8Array)return {$type:'bytes',base64:Buffer.from(value).toString('base64')};
  if(Array.isArray(value))return {$type:'array',value:value.map(item=>encode(item,types))};
  if(value&&typeof value==='object')return {$type:'map',value:Object.fromEntries(Object.entries(value).map(([key,item])=>[key,encode(item,types)]))};
  throw Error('Tipo de dado não suportado no backup.');
}
function service({db,bucket,types}){
  return async values=>{
    if(values.action==='manifest'){
      const roots=await db.listCollections(),names=roots.map(item=>item.id);
      return {collections:[...new Set([...COLLECTIONS,...names.filter(name=>/^wf_[a-z_]+$/.test(name))])],excludedCollections:names.filter(name=>!COLLECTIONS.includes(name)&&!/^wf_[a-z_]+$/.test(name)),bucket:bucket.name};
    }
    if(values.action==='documents'){
      if(!allowedCollection(values.path)||values.cursor!=null&&(typeof values.cursor!=='string'||values.cursor.includes('/')))throw Error('invalid-input');
      let query=db.collection(values.path).orderBy(types.FieldPath.documentId()).limit(10);
      if(values.cursor)query=query.startAfter(values.cursor);
      const snapshot=await query.get(),documents=[];
      for(const doc of snapshot.docs){
        if(values.path==='config'&&!allowedConfig(doc.id))continue;
        const children=await doc.ref.listCollections();
        documents.push({id:doc.id,path:doc.ref.path,data:encode(doc.data(),types),subcollections:children.map(item=>item.path).filter(allowedCollection)});
      }
      return {documents,nextCursor:snapshot.docs.length===10?snapshot.docs.at(-1).id:null};
    }
    if(values.action==='files'){
      if(values.cursor!=null&&(typeof values.cursor!=='string'||values.cursor.length>4096))throw Error('invalid-input');
      const [files,next]=await bucket.getFiles({autoPaginate:false,maxResults:100,pageToken:values.cursor||undefined});
      return {files:files.filter(file=>allowedFile(file.name)).map(file=>({path:file.name,generation:String(file.metadata.generation),size:Number(file.metadata.size),contentType:file.metadata.contentType||'application/octet-stream',metadata:Object.fromEntries(['cacheControl','contentDisposition','contentEncoding','contentLanguage','metadata'].filter(key=>file.metadata[key]!==undefined).map(key=>[key,file.metadata[key]]))})),nextCursor:next?.pageToken||null};
    }
    if(values.action==='file'){
      if(!allowedFile(values.path)||values.path.length>1024||!/^\d+$/.test(String(values.generation))||!Number.isSafeInteger(values.offset)||values.offset<0)throw Error('invalid-input');
      // Bind every chunk to the same generation: concurrent replacement cannot mix file versions.
      const file=bucket.file(values.path,{generation:String(values.generation)}),[metadata]=await file.getMetadata(),size=Number(metadata.size);
      if(values.offset>size)throw Error('invalid-input');
      const [data]=size===values.offset?[Buffer.alloc(0)]:await file.download({start:values.offset,end:Math.min(size-1,values.offset+CHUNK_SIZE-1)});
      return {base64:data.toString('base64'),bytes:data.length,sha256:createHash('sha256').update(data).digest('hex'),nextOffset:values.offset+data.length,size};
    }
    throw Error('invalid-input');
  };
}
function handler({auth,read,setCorsHeaders,allowedOrigins}){
  return async(req,res)=>{
    setCorsHeaders(req,res);res.set('Cache-Control','no-store');
    if(req.headers.origin&&!allowedOrigins.has(req.headers.origin))return res.status(403).json({error:'Origem não autorizada.'});
    if(req.method==='OPTIONS')return res.status(204).send('');
    if(req.method!=='POST')return res.status(405).json({error:'Use POST.'});
    const token=/^Bearer (.+)$/.exec(req.headers.authorization||'')?.[1];
    if(!token)return res.status(401).json({error:'Entre no sistema para exportar o backup.'});
    let user;try{user=await auth.verifyIdToken(token,true);}catch{return res.status(401).json({error:'Sessão inválida ou expirada.'});}
    if(user.perfil!=='ep')return res.status(403).json({error:'Backup completo restrito ao EPP.'});
    try{return res.json(await read(req.body||{}));}
    catch(error){console.error('Falha no backup completo:',error.code||error.message);return res.status(error.message==='invalid-input'?400:503).json({error:error.message==='invalid-input'?'Solicitação de backup inválida.':'Não foi possível copiar todos os dados. Nenhum backup completo foi gerado; tente novamente.'});}
  };
}
module.exports={COLLECTIONS,CHUNK_SIZE,allowedCollection,allowedConfig,allowedFile,encode,service,handler};
