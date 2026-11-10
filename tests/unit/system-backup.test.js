import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {webcrypto,createHash} from 'node:crypto';
import {describe,it,expect,vi} from 'vitest';
const require=createRequire(import.meta.url),core=require('../../functions/system-backup.cjs');
class Timestamp{constructor(seconds,nanoseconds){Object.assign(this,{seconds,nanoseconds});}}
class GeoPoint{constructor(latitude,longitude){Object.assign(this,{latitude,longitude});}}
class DocumentReference{constructor(path){this.path=path;}}
const types={Timestamp,GeoPoint,DocumentReference,FieldPath:{documentId:()=> '__name__'}};
const client=()=>{const context={crypto:webcrypto,atob:value=>Buffer.from(value,'base64').toString('binary'),Uint8Array,Date,Error};runInNewContext(readFileSync('src/shared/system-backup.js','utf8'),context);return context.SystemBackup;};
function response(){return {code:200,set(){return this;},status(code){this.code=code;return this;},json(data){this.body=data;return this;},send(){return this;}};}
describe('backup de todos os módulos',()=>{
 it('preserva tipos Firestore, mapas com nomes reservados, arrays e valores especiais',()=>{
  const data=core.encode({date:new Timestamp(10,123),point:new GeoPoint(1,2),ref:new DocumentReference('processos/a'),bytes:Buffer.from('anexo'),list:[0,false,null],special:NaN,collision:{$type:'timestamp',seconds:'texto'}},types);
  expect(data.$type).toBe('map');expect(data.value.date).toEqual({$type:'timestamp',seconds:'10',nanoseconds:123});
  expect(data.value.ref.path).toBe('processos/a');expect(data.value.bytes.base64).toBe('YW5leG8=');expect(data.value.list.value).toEqual([0,false,null]);
  expect(data.value.collision.$type).toBe('map');expect(data.value.special).toEqual({$type:'number',value:'NaN'});
 });
 it('inclui configurações e todos os módulos, sem sessões, limites ou licenças',async()=>{
  const read=core.service({db:{listCollections:async()=>['config','mapeamentos_colaborativos','sessions','rate_limits','siga_lite_licenses','wf_grupos','usuarios','projPROJETOS','projPROGRAMAS'].map(id=>({id}))},bucket:{name:'bucket'},types});
  const data=await read({action:'manifest'});
  for(const name of ['config','registros_processos','mapeamentos_colaborativos','central_controles','controles_aplicacoes','controles_biblioteca','relatorios_ind','wf_grupos'])expect(data.collections).toContain(name);
  expect(data.excludedCollections).toEqual(['sessions','rate_limits','siga_lite_licenses','usuarios','projPROJETOS','projPROGRAMAS']);
 });
 it('pagina documentos, preserva IDs e inclui rascunhos privados e subcoleções',async()=>{
  const calls=[],doc={id:'rascunho',ref:{path:'mapeamentos_colaborativos/rascunho',listCollections:async()=>[{path:'mapeamentos_colaborativos/rascunho/historico'}]},data:()=>({status:'rascunho',autor_uid:'outro'})};
  const query={orderBy(value){calls.push(value);return this;},limit(value){calls.push(value);return this;},startAfter(value){calls.push(value);return this;},get:async()=>({docs:[doc]})};
  const read=core.service({db:{collection:path=>{calls.push(path);return query;}},types});
  const page=await read({action:'documents',path:'mapeamentos_colaborativos',cursor:'anterior'});
  expect(calls).toEqual(['mapeamentos_colaborativos','__name__',10,'anterior']);expect(page.documents[0].data.value.status).toBe('rascunho');expect(page.documents[0].subcollections).toEqual(['mapeamentos_colaborativos/rascunho/historico']);
  await expect(read({action:'documents',path:'sessions'})).rejects.toThrow('invalid-input');
  await expect(read({action:'documents',path:'config/../sessions'})).rejects.toThrow('invalid-input');
 });
 it('exclui cadastros e configurações de Projetos sem perder objetivos compartilhados ou a paginação',async()=>{
  const excluded=['usuarios','usuarios_backup','proj_governanca','proj_macros','riscosProjetoCanvas_123'];
  for(const id of excluded){expect(core.allowedConfig(id)).toBe(false);expect(core.allowedCollection('config/'+id+'/historico')).toBe(false);}
  expect(core.allowedConfig('proj_objetivos')).toBe(true);expect(core.allowedConfig('maturidade_gestao_1')).toBe(true);
  const docs=Array.from({length:10},(_,i)=>({id:'proj_versao_'+i}));
  const query={orderBy(){return this;},limit(){return this;},get:async()=>({docs})};
  const read=core.service({db:{collection:()=>query},types});
  const page=await read({action:'documents',path:'config'});
  expect(page.documents).toEqual([]);expect(page.nextCursor).toBe('proj_versao_9');
  for(const path of ['usuarios','projPROJETOS','projPROGRAMAS','config/usuarios/historico','config/proj_governanca/historico'])await expect(read({action:'documents',path})).rejects.toThrow('invalid-input');
 });
 it('exclui anexos de usuários/projetos tanto da listagem quanto da leitura direta',async()=>{
  const file=name=>({name,metadata:{generation:'1',size:'7',contentType:'text/plain'}}),bucket={getFiles:async()=>[[file('projetos/1/anexo'),file('usuarios/avatar'),file('auditoria/evidencia')],{pageToken:'pagina2'}],file:vi.fn()};
  const read=core.service({bucket,types});const page=await read({action:'files'});
  expect(page.files.map(item=>item.path)).toEqual(['auditoria/evidencia']);expect(page.nextCursor).toBe('pagina2');
  for(const path of ['projetos/1/anexo','usuarios/avatar'])await expect(read({action:'file',path,generation:'1',offset:0})).rejects.toThrow('invalid-input');
  expect(bucket.file).not.toHaveBeenCalled();
 });
 it('copia anexos por geração e faixa limitada, com checksum',async()=>{
  const content=Buffer.alloc(core.CHUNK_SIZE+7,42),options=[];
  const read=core.service({bucket:{file(path,version){options.push([path,version]);return {getMetadata:async()=>[{size:String(content.length)}],download:async range=>[content.subarray(range.start,range.end+1)]};}},types});
  const a=await read({action:'file',path:'auditoria/doc.pdf',generation:'123',offset:0}),b=await read({action:'file',path:'auditoria/doc.pdf',generation:'123',offset:a.nextOffset});
  expect(a.bytes).toBe(core.CHUNK_SIZE);expect(b.bytes).toBe(7);expect(b.nextOffset).toBe(content.length);expect(a.sha256).toBe(createHash('sha256').update(content.subarray(0,core.CHUNK_SIZE)).digest('hex'));
  expect(options[0][1]).toEqual({generation:'123'});
 });
 it('nega acesso sem autenticação, com perfil dono e com origem inválida antes da leitura',async()=>{
  const read=vi.fn(),auth={verifyIdToken:vi.fn(async()=>({perfil:'dono'}))},handle=core.handler({auth,read,setCorsHeaders(){},allowedOrigins:new Set(['https://siga.test'])});
  for(const [headers,status] of [[{},401],[{authorization:'Bearer token'},403],[{origin:'https://intruso.test',authorization:'Bearer token'},403]]){const res=response();await handle({method:'POST',headers,body:{action:'manifest'}},res);expect(res.code).toBe(status);}
  expect(read).not.toHaveBeenCalled();expect(auth.verifyIdToken).toHaveBeenCalledWith('token',true);
 });
 it('permite EPP e não apresenta falha de leitura como backup completo',async()=>{
  const handle=core.handler({auth:{verifyIdToken:async()=>({perfil:'ep'})},read:async()=>{throw Error('storage-unavailable');},setCorsHeaders(){},allowedOrigins:new Set()});
  const res=response(),log=vi.spyOn(console,'error').mockImplementation(()=>{});try{await handle({method:'POST',headers:{authorization:'Bearer valid'},body:{action:'files'}},res);expect(res.code).toBe(503);expect(res.body.error).toContain('Nenhum backup completo');}finally{log.mockRestore();}
 });
 it('reúne páginas, históricos e anexos; registra escopo e referências externas',async()=>{
  const calls=[],content=Buffer.from('arquivo completo'),sha256=createHash('sha256').update(content).digest('hex');
  const request=async values=>{
   calls.push(values);
   if(values.action==='manifest')return {collections:['config','mapeamentos_colaborativos'],bucket:'bucket',excludedCollections:[]};
   if(values.action==='documents')return {documents:values.path==='config'?[{id:'cadeia_valor',data:{url:'https://docs.example/externo'},subcollections:['config/cadeia_valor/historico']}]:[],nextCursor:values.path==='config'&&!values.cursor?'pagina2':null};
   if(values.action==='files')return {files:[{path:'auditoria/doc',generation:'1',size:content.length}],nextCursor:null};
   return {base64:content.toString('base64'),bytes:content.length,sha256,size:content.length,nextOffset:content.length};
  };
  const backup=await client().collect({request,progress(){}});
  expect(backup._meta.formato).toBe('SIGA_BACKUP_COMPLETO');expect(backup.colecoes['config/cadeia_valor/historico']).toEqual([]);expect(backup.anexos[0].chunks[0].sha256).toBe(sha256);
  expect(backup.referencias_externas).toContain('https://docs.example/externo');expect(calls.some(call=>call.cursor==='pagina2')).toBe(true);
 });
 it('interrompe o backup em erro de coleção, arquivo corrompido ou cancelamento',async()=>{
  const api=client();await expect(api.collect({request:async()=>{throw Error('permission-denied');},progress(){}})).rejects.toThrow('permission-denied');
  const request=async({action})=>action==='manifest'?{collections:[],bucket:'b',excludedCollections:[]}:action==='files'?{files:[{path:'a',size:1,generation:'1'}],nextCursor:null}:{base64:'eA==',bytes:1,nextOffset:1,size:1,sha256:'errado'};
  await expect(api.collect({request,progress(){}})).rejects.toThrow('integridade');
  await expect(api.collect({request:async()=>({collections:['config']}),progress(){},signal:{throwIfAborted(){throw Error('cancelado');}}})).rejects.toThrow('cancelado');
 });
});
