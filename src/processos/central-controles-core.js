(function(scope){
 const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
 async function controlId(name){const bytes=await scope.crypto.subtle.digest('SHA-256',new TextEncoder().encode(normalize(name)));return 'MAP-'+Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('').slice(0,24);}
 const types=['Preventivo','Detectivo','Corretivo'],effects=['Não avaliada','Eficaz','Parcialmente eficaz','Ineficaz'];
 function defaults(c,origin){return{...c,origem:c.origem||origin,setor:c.setor||'',responsavel:c.responsavel||'',efetividade:c.efetividade||'Não avaliada',processos_associados:c.processos_associados||[],vinculos:[]};}
 async function build({factory,library,registry,processes,architecture}){
  const records=new Map();for(const c of factory)records.set(c.id,defaults(c,'Fábrica'));for(const c of library)records.set(c.id,defaults(c,'Cadastrado'));for(const c of registry)records.set(c.id,defaults(c,c.origem||'Cadastrado'));
  for(const p of processes)for(const [index,r] of (Array.isArray(p.ent?.riscos)?p.ent.riscos:[]).entries()){
   for(const [phase,items] of [['Existente',r.controles_existentes],['Tratamento',r.controles_tratamento]])for(const c of Array.isArray(items)?items:[]){
    const name=String(c.nome||c.descricao||'').trim();if(!name)continue;
    const match=[...records.values()].find(entry=>normalize(entry.nome)===normalize(name));
    const id=String(c.biblioteca_id||c.id||match?.id||await controlId(name));
    if(!records.has(id))records.set(id,defaults({id,nome:name.slice(0,200),descricao:String(c.descricao_catalogo||c.descricao||name).slice(0,5000),categoria:c.categoria||'Controle do mapeamento',tipo:types.includes(c.tipo)?c.tipo:'Preventivo',setor:String(c.setor||p.area||'').slice(0,200),responsavel:String(c.responsavel||r.responsavel_tratamento||'').slice(0,200),efetividade:effects.includes(c.efetividade)?c.efetividade:'Não avaliada'},'Mapeamento'));
    records.get(id).vinculos.push({processo_id:p.id,processo:p.nome,risco:r.desc||r.descricao||'',risco_indice:index,fase:phase,setor:c.setor||p.area||'',responsavel:c.responsavel||r.responsavel_tratamento||'',tipo:c.tipo||records.get(id).tipo,efetividade:c.efetividade||'Não avaliada',aplicacao:c.descricao||''});
   }
  }
  const processCatalog=scope.CentralControlesView.processCatalog(processes,architecture),ids=new Set(processCatalog.map(p=>String(p.id))),aliases=new Map(processes.filter(p=>p.arq_id!=null).map(p=>['arq:'+p.arq_id,String(p.id)]));
  for(const c of records.values())c.processos_associados=[...new Set((c.processos_associados||[]).map(id=>aliases.get(String(id))||String(id)))].filter(id=>ids.has(id));
  return{records:[...records.values()],processes:processCatalog};
 }
 function document(c,user,timestamp){
  if(!c.nome?.trim()||!c.categoria?.trim()||!c.descricao?.trim()||!types.includes(c.tipo)||!effects.includes(c.efetividade))throw Error('Preencha nome, categoria, descrição, tipo e efetividade do controle.');
  if(c.nome.length>200||c.categoria.length>200||c.descricao.length>5000||String(c.setor||'').length>200||String(c.responsavel||'').length>200)throw Error('Nome, categoria, setor e responsável: até 200 caracteres. Descrição: até 5.000.');
  const ids=[...new Set((c.processos_associados||[]).map(String))];if(ids.length>500||ids.some(id=>!id||id.length>200))throw Error('Associações a processos inválidas.');
  return{nome:c.nome.trim(),categoria:c.categoria.trim(),descricao:c.descricao.trim(),tipo:c.tipo,setor:String(c.setor||'').trim(),responsavel:String(c.responsavel||'').trim(),efetividade:c.efetividade,origem:c.origem||'Cadastrado',processos_associados:ids,autor_uid:user.uid,criado_em:c.criado_em||timestamp,atualizado_em:timestamp};
 }
 scope.CentralControlesCore={build,document,controlId};
})(globalThis);
