(function(scope){
  const key=value=>String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const stop=new Set(['para','pela','pelo','pelos','pelas','como','com','dos','das','uma','que','por','nos','nas','risco','processo']);
  const tokens=value=>[...new Set(key(value).split(' ').filter(word=>word.length>2 && !stop.has(word)).map(word=>word.length>5?word.replace(/(coes|cao|mente|s)$/,''):word))];
  const themes=[[/praz|atras|venc|demora|temp/,['PRA','TEC-04']], [/dados|inconsisten|duplic|registr|informac/,['QUA','TEC-01','TEC-03']], [/fraud|indevid|conflit|irregular|norm|legal/,['CON','GOV-02','TEC-02']], [/falh|interrup|perda|indispon|continui/,['TEC-05','PRA-04','MON-05']], [/pessoa|servidor|competenc|conhec|capacit/,['PES']], [/aprova|responsab|autoriz|decis/,['GOV']], [/erro|proced|execuc|padron/,['PRO','MON-02']]];
  let central=[],custom=[],loaded=false,pending;
  function all(){return [...new Map([...(scope.CONTROLES_CATALOGO || []),...custom,...central].map(c=>[c.id,c])).values()].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR') || a.id.localeCompare(b.id));}
  function search(query){if(/^[a-z]+-\d+$/i.test(query.trim()))return all().filter(control=>key(control.id)===key(query));const words=key(query).split(' ').filter(Boolean);return all().filter(control=>words.every(word=>key([control.id,control.nome,control.categoria,control.tipo,control.descricao].join(' ')).includes(word)));}
  function suggest(text,limit=6){
    const words=tokens(text),normalized=key(text);
    if(!words.length)return [];
    return all().map(control=>{const content=tokens(control.nome+' '+control.descricao),score=words.filter(word=>content.includes(word)).length*2+themes.filter(([pattern,ids])=>pattern.test(normalized) && ids.some(id=>control.id===id || control.id.startsWith(id+'-'))).length*3;return {control,score};}).filter(item=>item.score>0).sort((a,b)=>b.score-a.score || a.control.nome.localeCompare(b.control.nome,'pt-BR')).slice(0,limit).map(item=>item.control);
  }
  async function load(force=false){
    if(!scope.fbReady?.())return all();
    if(pending)return pending;
    if(loaded && !force)return all();
    pending=(async()=>{const snapshot=await scope.FirestoreRepositories.collection('controles_biblioteca').list();custom=snapshot.docs.map(doc=>({...doc.data,id:doc.id}));const registry=await scope.FirestoreRepositories.collection('central_controles').list();const assessments=await scope.FirestoreRepositories.collection('controles_aplicacoes').list();central=registry.docs.map(doc=>{const c={...doc.data,id:doc.id,aplicacoes:assessments.docs.filter(a=>a.data.controle_id===doc.id).map(a=>({...a.data,id:a.id}))};delete c.setor;delete c.responsavel;delete c.efetividade;return c;});loaded=true;return all();})();
    try{return await pending;}finally{pending=null;}
  }
  async function create(values){
    const control=Object.fromEntries(['nome','categoria','tipo','descricao'].map(field=>[field,String(values[field] || '').trim()]));
    if(!control.nome || !control.categoria || !control.descricao || !['Preventivo','Detectivo','Corretivo'].includes(control.tipo))throw Error('Preencha nome, categoria, tipo e descrição do controle.');
    if(control.nome.length>200 || control.categoria.length>200 || control.descricao.length>5000)throw Error('Nome e categoria devem ter até 200 caracteres; descrição, até 5.000.');
    if(!scope.fbReady?.())throw Error('Conecte-se para cadastrar um controle na biblioteca compartilhada.');
    await load(true);
    const existing=all().find(item=>key(item.nome)===key(control.nome));
    if(existing)return existing;
    const id='USR-'+scope.crypto.randomUUID();
    await scope.FirestoreRepositories.collection('controles_biblioteca').set(id,{...control,criado_em:scope.fb().serverTimestamp(),autor_uid:scope.fb().auth.currentUser.uid});
    const result={...control,id};custom.push(result);return result;
  }
  scope.ControlesBiblioteca={all,search,suggest,load,create,key};
})(globalThis);
