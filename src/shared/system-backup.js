(function(scope){
  let running=false;
  const excluded=['Gestão de Projetos: projetos, programas, governança, configurações específicas e anexos próprios.','Gestão de usuários: cadastro, perfis, contas, senhas e tokens.','Sessões de login, limites de requisição, segredos do servidor e dados de licenciamento retirado.','Conteúdo de documentos hospedados fora do Storage do SIGA; seus links são preservados.','Código-fonte, infraestrutura e configurações do projeto Firebase.'];
  function endpoint(){
    if(scope.CONFIG?.SYSTEM_BACKUP_URL)return scope.CONFIG.SYSTEM_BACKUP_URL;
    const project=scope.fb().app?.options?.projectId;
    if(!project)throw Error('Configure SYSTEM_BACKUP_URL para exportar o backup completo.');
    return 'https://us-central1-'+project+'.cloudfunctions.net/systemBackup';
  }
  function externalLinks(value,result=new Set()){
    if(typeof value==='string'){
      if(/^https?:\/\//i.test(value)&&!/^https:\/\/(firebasestorage\.googleapis\.com|storage\.googleapis\.com)\//i.test(value))result.add(value);
      if(/^[\[{]/.test(value.trim())){try{externalLinks(JSON.parse(value),result);}catch{/* Campo de texto comum. */}}
    }else if(value&&typeof value==='object')Object.values(value).forEach(item=>externalLinks(item,result));
    return result;
  }
  async function collect({request,progress,signal}){
    const started=new Date().toISOString(),manifest=await request({action:'manifest'}),collections={},files=[];
    const queue=[...manifest.collections],seen=new Set();
    for(let index=0;index<queue.length;index++){
      const path=queue[index];if(seen.has(path))continue;seen.add(path);collections[path]=[];
      let cursor=null;
      do{
        signal?.throwIfAborted();progress('Copiando '+path+' ('+collections[path].length+' registros)…');
        const page=await request({action:'documents',path,cursor});
        collections[path].push(...page.documents);
        page.documents.forEach(doc=>queue.push(...doc.subcollections));cursor=page.nextCursor;
      }while(cursor);
    }
    let cursor=null;
    do{signal?.throwIfAborted();progress('Consultando arquivos anexados…');const page=await request({action:'files',cursor});files.push(...page.files);cursor=page.nextCursor;}while(cursor);
    for(let index=0;index<files.length;index++){
      const file=files[index];file.chunks=[];let offset=0;
      do{
        signal?.throwIfAborted();progress('Copiando anexo '+(index+1)+' de '+files.length+': '+file.path);
        const chunk=await request({action:'file',path:file.path,generation:file.generation,offset});
        if(chunk.size!==file.size||chunk.nextOffset!==offset+chunk.bytes||chunk.nextOffset>file.size||(chunk.bytes===0&&offset<file.size))throw Error('O anexo mudou ou sua cópia foi interrompida. Gere um novo backup.');
        const bytes=Uint8Array.from(atob(chunk.base64),character=>character.charCodeAt(0));
        const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');
        if(bytes.length!==chunk.bytes||hash!==chunk.sha256)throw Error('Falha na integridade do anexo: '+file.path);
        file.chunks.push({offset,bytes:chunk.bytes,base64:chunk.base64,sha256:hash});offset=chunk.nextOffset;
      }while(offset<file.size);
    }
    return {_meta:{formato:'SIGA_BACKUP_COMPLETO',versao:2,iniciado_em:started,concluido_em:new Date().toISOString(),origem:manifest.bucket,escopo:'Módulos de Processos, configurações, históricos e anexos; excluídos Gestão de usuários e Gestão de Projetos.',consistencia:'Leituras sequenciais do servidor; não é um snapshot transacional entre coleções. Recomenda-se exportar sem edição simultânea.',documentos:Object.values(collections).reduce((sum,docs)=>sum+docs.length,0),arquivos:files.length,exclusoes:excluded,colecoes_fora_do_escopo:manifest.excludedCollections,encoding:'Mapas e arrays usam envelopes $type/value; timestamp, referência, bytes, geopoint e números especiais preservam seus tipos. Anexos em chunks base64 com SHA-256.'},colecoes:collections,anexos:files,referencias_externas:[...externalLinks(collections)]};
  }
  async function exportBackup(){
    if(running)return;
    if(!scope.isEP?.())throw Error('Backup completo restrito ao EPP.');
    if(!scope.fbReady?.()||!scope.fb().auth?.currentUser)throw Error('Entre no sistema para exportar o backup completo.');
    if(scope.TENANT_CONFIG?.enabled)throw Error('O backup completo precisa ser configurado para o tenant antes de exportar esta instalação.');
    running=true;const controller=new AbortController(),dialog=document.createElement('dialog');
    dialog.className='system-backup-dialog';dialog.style.cssText='width:min(520px,92vw);padding:24px;border:1px solid var(--bdr,#ddd);border-radius:12px;background:var(--surf,#fff);color:var(--ink,#172b4d)';
    dialog.innerHTML='<h2 style="margin-top:0">Backup de Processos</h2><p>Exportando os módulos de Processos e seus anexos. Gestão de usuários e Gestão de Projetos ficam de fora. Evite editar dados durante a cópia.</p><p>A importação de Projetos aceita apenas o formato antigo. A restauração deste backup completo exige um procedimento administrativo.</p><p role="status">Preparando…</p><button type="button" class="btn">Cancelar</button>';
    const status=dialog.querySelector('[role=status]');dialog.querySelector('button').onclick=()=>controller.abort();dialog.addEventListener('cancel',event=>{event.preventDefault();controller.abort();});document.body.append(dialog);dialog.showModal();
    try{
      const url=endpoint();
      const request=async values=>{
        const token=await scope.fb().auth.currentUser.getIdToken();
        const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(values),signal:controller.signal,cache:'no-store'});
        let result;try{result=await response.json();}catch{throw Error('O serviço de backup completo não está disponível. Entre em contato com o EPP.');}if(!response.ok)throw Error(result.error||'Não foi possível concluir o backup.');return result;
      };
      const backup=await collect({request,progress:message=>{status.textContent=message;},signal:controller.signal});
      controller.signal.throwIfAborted();
      const blob=new Blob([JSON.stringify(backup)],{type:'application/json'}),objectUrl=URL.createObjectURL(blob),anchor=document.createElement('a');
      anchor.href=objectUrl;anchor.download='siga-processos-completo-'+new Date().toISOString().replaceAll(':','-')+'.json';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),60000);
      (scope.toast||scope.projToast||alert)('Backup de Processos exportado: '+backup._meta.documentos+' registros e '+backup._meta.arquivos+' arquivos.');
    }catch(error){if(error.name!=='AbortError')throw error;}
    finally{running=false;dialog.close();dialog.remove();}
  }
  scope.SystemBackup={collect,export:exportBackup};
})(globalThis);
