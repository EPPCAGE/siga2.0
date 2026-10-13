(function(scope){
 const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
 const types=['Preventivo','Detectivo','Corretivo'],effects=['Não avaliada','Eficaz','Parcialmente eficaz','Ineficaz'];
 async function controlId(name){const bytes=await scope.crypto.subtle.digest('SHA-256',new TextEncoder().encode(normalize(name)));return 'MAP-'+Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('').slice(0,24);}
 function defaults(c,origin){const copy={...c,origem:c.origem||origin,processos_associados:c.processos_associados||[],vinculos:[],aplicacoes:[]};if(c.schema_version!==2)copy._legacy={setor:c.setor||'',responsavel:c.responsavel||'',efetividade:c.efetividade||'Não avaliada'};delete copy.setor;delete copy.responsavel;delete copy.efetividade;return copy;}
 function assessment(c){return{setor:String(c.setor||'').slice(0,200),responsavel:String(c.responsavel||'').slice(0,200),efetividade:effects.includes(c.efetividade)?c.efetividade:'Não avaliada'};}
 async function build({factory,library,registry,processes,architecture,applications=[]}){
  const records=new Map();for(const c of factory)records.set(c.id,defaults(c,'Fábrica'));for(const c of library)records.set(c.id,defaults(c,'Cadastrado'));for(const c of registry)records.set(c.id,defaults(c,c.origem||'Cadastrado'));
  for(const p of processes)for(const [index,r] of (Array.isArray(p.ent?.riscos)?p.ent.riscos:[]).entries())for(const [phase,items] of [['Existente',r.controles_existentes],['Tratamento',r.controles_tratamento]])for(const c of Array.isArray(items)?items:[]){
   const name=String(c.nome||c.descricao||'').trim();if(!name)continue;const match=[...records.values()].find(entry=>normalize(entry.nome)===normalize(name));const id=String(c.biblioteca_id||c.id||match?.id||await controlId(name));
   if(!records.has(id))records.set(id,defaults({id,nome:name.slice(0,200),descricao:String(c.descricao_catalogo||c.descricao||name).slice(0,5000),categoria:c.categoria||'Controle do mapeamento',tipo:types.includes(c.tipo)?c.tipo:'Preventivo'},'Mapeamento'));
   const entry=records.get(id);entry.vinculos.push({processo_id:p.id,processo:p.nome,risco:r.desc||r.descricao||'',risco_indice:index,fase:phase,...assessment({setor:c.setor||p.area||'',responsavel:c.responsavel||r.responsavel_tratamento||'',efetividade:c.efetividade}),tipo:entry.tipo,aplicacao:c.descricao||''});
  }
  const processCatalog=scope.CentralControlesView.processCatalog(processes,architecture),ids=new Set(processCatalog.map(p=>String(p.id))),aliases=new Map(processes.filter(p=>p.arq_id!=null).map(p=>['arq:'+p.arq_id,String(p.id)])),canonical=id=>aliases.get(String(id))||String(id);
  for(const c of records.values()){
   c._savedApplications=applications.filter(a=>a.controle_id===c.id);
   const saved=c._savedApplications.filter(a=>ids.has(canonical(a.processo_id))).map(a=>({...a,processo_id:canonical(a.processo_id),persisted:true,origem:'Central'}));
   const refs=[...new Set([...c.processos_associados.map(canonical),...saved.map(a=>a.processo_id),...c.vinculos.map(v=>canonical(v.processo_id))])].filter(id=>ids.has(id));
   for(const pid of refs){const registered=saved.filter(a=>a.processo_id===pid);if(registered.length){c.aplicacoes.push(...registered);continue;}
    const links=c.vinculos.filter(v=>canonical(v.processo_id)===pid);if(links.length){const distinct=new Map();for(const v of links){const value=assessment(v),key=JSON.stringify([value.setor,value.responsavel,value.efetividade]);if(!distinct.has(key))distinct.set(key,{id:'auto:'+pid+':'+distinct.size,processo_id:pid,...value,persisted:false,origem:'Mapeamento'});}c.aplicacoes.push(...distinct.values());}
    else c.aplicacoes.push({id:'legacy:'+pid,processo_id:pid,...assessment(c._legacy||c.classificacao_anterior||{}),persisted:false,origem:(c._legacy||c.classificacao_anterior)?'Migração':'Associação'});
   }
   c.processos_associados=refs;
  }
  return{records:[...records.values()],processes:processCatalog};
 }
 function document(c,user,timestamp){
  if(!c.nome?.trim()||!c.categoria?.trim()||!c.descricao?.trim()||!types.includes(c.tipo))throw Error('Preencha nome, categoria, descrição e tipo do controle.');
  if(c.nome.length>200||c.categoria.length>200||c.descricao.length>5000)throw Error('Nome e categoria: até 200 caracteres. Descrição: até 5.000.');
  const ids=[...new Set((c.processos_associados||[]).map(String))];if(ids.length>500||ids.some(id=>!id||id.length>200))throw Error('Associações a processos inválidas.');
  const data={nome:c.nome.trim(),categoria:c.categoria.trim(),descricao:c.descricao.trim(),tipo:c.tipo,origem:c.origem||'Cadastrado',schema_version:2,processos_associados:ids,autor_uid:user.uid,criado_em:c.criado_em||timestamp,atualizado_em:timestamp};
  if(c.classificacao_anterior||c._legacy)data.classificacao_anterior=c.classificacao_anterior||assessment(c._legacy);return data;
 }
 function applicationDocument(a,control,user,timestamp){
  if(!a.processo_id||String(a.processo_id).length>200||String(a.setor||'').length>200||String(a.responsavel||'').length>200||!effects.includes(a.efetividade))throw Error('Confira processo, setor, responsável e efetividade de cada aplicação.');
  return{controle_id:control,processo_id:String(a.processo_id),setor:String(a.setor||'').trim(),responsavel:String(a.responsavel||'').trim(),efetividade:a.efetividade,autor_uid:user.uid,criado_em:a.criado_em||timestamp,atualizado_em:timestamp};
 }
 function reference(c,pid,sector){const apps=(c.aplicacoes||[]).filter(a=>String(a.processo_id)===String(pid));const matches=apps.filter(a=>normalize(a.setor)===normalize(sector));return matches.length===1?matches[0]:apps.length===1?apps[0]:null;}
 scope.CentralControlesCore={build,document,applicationDocument,reference,controlId};
})(globalThis);
