(()=>{
  const types=['Preventivo','Detectivo','Corretivo'],effects=['Não avaliada','Eficaz','Parcialmente eficaz','Ineficaz'];
  let records=[],processRecords=[],filters={text:'',process:'',risk:''};
  const options=(values,current)=>values.map(v=>'<option '+(v===current?'selected':'')+'>'+esc(v)+'</option>').join('');
  let rendering=null,refreshTimer=null,subscriptions=[],attached=false;
  const editable=()=>!!fbReady()&&!!fb().auth.currentUser&&isEP();
  const repo=()=>FirestoreRepositories.collection('central_controles');
  const time=value=>value?String(value.seconds)+':'+String(value.nanoseconds):'';
  async function seed(missing,user){
    for(let start=0;start<missing.length;start+=100){const group=missing.slice(start,start+100),{db,runTransaction,serverTimestamp}=fb();
      await runTransaction(db,async tx=>{if(fb().auth.currentUser?.uid!==user.uid||!editable())throw Error('A sessão foi alterada. Reabra a central.');const snapshots=await Promise.all(group.map(c=>tx.get(repo().ref(c.id))));snapshots.forEach((snap,i)=>{if(!snap.exists())tx.set(repo().ref(group[i].id),CentralControlesCore.document(group[i],user,serverTimestamp()));});});
    }
  }
  function watch(){if(subscriptions.length)return;const {onSnapshot}=fb();for(const name of ['central_controles','controles_biblioteca','processos','config'])subscriptions.push(onSnapshot(FirestoreRepositories.collection(name).colRef(),()=>{clearTimeout(refreshTimer);if(document.getElementById('page-controles')?.classList.contains('on'))refreshTimer=setTimeout(()=>{void render();},400);},()=>{}));}
  async function render(){
    if(rendering)return rendering;const host=document.getElementById('controls-content');if(!host||!fbReady()||!fb().auth.currentUser)return;
    const user=fb().auth.currentUser;host.innerHTML='<div class="ib ibsl" role="status">Carregando controles…</div>';
    rendering=(async()=>{try{
      const [registry,library,processesSnapshot,architectureSnapshot]=await Promise.all([repo().list(),FirestoreRepositories.collection('controles_biblioteca').list(),FirestoreRepositories.collection('processos').list(),FirestoreRepositories.collection('config').get('arquitetura')]);
      if(fb().auth.currentUser?.uid!==user.uid)return;
      const processes=processesSnapshot.docs.map(d=>({...d.data,id:d.data.id??d.id}));let architecture=[];try{architecture=JSON.parse(architectureSnapshot.data()?.data||'[]');}catch{}
      const values={factory:globalThis.CONTROLES_CATALOGO||[],registry:registry.docs.map(d=>({...d.data,id:d.id})),library:library.docs.map(d=>({...d.data,id:d.id})),processes,architecture};
      let model=await CentralControlesCore.build(values);
      if(editable()){const stored=new Set(values.registry.map(c=>c.id)),missing=model.records.filter(c=>!stored.has(c.id));if(missing.length){await seed(missing,user);const updated=await repo().list();model=await CentralControlesCore.build({...values,registry:updated.docs.map(d=>({...d.data,id:d.id}))});}}
      if(fb().auth.currentUser?.uid!==user.uid)return;records=model.records;processRecords=model.processes;draw();watch();
    }catch(e){host.innerHTML='<div class="ib ibr" role="alert">'+esc('Não foi possível carregar a central. '+e.message)+'</div>';}finally{rendering=null;}})();return rendering;
  }
  function draw(){
    const host=document.getElementById('controls-content');
    if(filters.process&&!processRecords.some(p=>String(p.id)===filters.process))filters.process='';
    if(!CentralControlesView.risks(processRecords,filters.process).some(r=>r.key===filters.risk))filters.risk='';
    host.innerHTML=CentralControlesView.page(records,processRecords,filters);
    host.querySelector('#controls-search').oninput=e=>{filters.text=e.target.value;list();};
    host.querySelector('#controls-process-filter').onchange=e=>{filters.process=e.target.value;filters.risk='';host.querySelector('#controls-risk-filter').innerHTML=CentralControlesView.riskOptions(processRecords,filters);list();};
    host.querySelector('#controls-risk-filter').onchange=e=>{filters.risk=e.target.value;list();};
    host.querySelector('#controls-clear').onclick=()=>{filters={text:'',process:'',risk:''};draw();};
    host.querySelector('#controls-new').hidden=!editable();host.querySelector('#controls-new').onclick=()=>{if(editable())edit();};list();
  }
  function list(){
    const q=ControlesBiblioteca.key(filters.text),rows=records.filter(c=>{
      const ids=CentralControlesView.processIds(c),links=c.vinculos||[];
      if(filters.process&&!ids.includes(filters.process))return false;
      if(filters.risk&&!links.some(v=>CentralControlesView.riskKey(v.processo_id,v.risco_indice)===filters.risk))return false;
      const names=processRecords.filter(p=>ids.includes(String(p.id))).map(p=>p.nome);
      return ControlesBiblioteca.key([c.nome,c.categoria,c.setor,c.responsavel,c.tipo,c.efetividade,c.origem,...names,...links.flatMap(v=>[v.processo,v.risco,v.setor,v.responsavel])].join(' ')).includes(q);
    }).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    const host=document.getElementById('controls-list');host.innerHTML=CentralControlesView.list(rows,records.length,processRecords);
    host.querySelectorAll('[data-control-edit]').forEach(b=>b.onclick=()=>edit(records.find(c=>c.id===b.dataset.controlEdit)));
  }
  function edit(c={}){
    document.getElementById('controls-dialog')?.remove();const modal=document.createElement('div');modal.className='offline-overlay';modal.id='controls-dialog';
    const fields=[['nome','Nome do controle'],['categoria','Categoria'],['descricao','Descrição'],['setor','Setor'],['responsavel','Responsável']];
    modal.innerHTML=CentralControlesView.dialog(c,processRecords,types,effects);
    document.body.append(modal);if(!editable()){modal.querySelectorAll('input,textarea,select').forEach(field=>field.disabled=true);modal.querySelector('[type=submit]').hidden=true;}modal.querySelector('#control-close').onclick=()=>modal.remove();modal.querySelector('form').onsubmit=async e=>{
      e.preventDefault();if(!editable())return;const button=modal.querySelector('[type=submit]');button.disabled=true;
      try{
        const data={...c,id:c.id||'USR-'+crypto.randomUUID(),origem:c.origem||'Cadastrado'};fields.forEach(([key])=>data[key]=modal.querySelector('#control-'+key).value.trim());data.processos_associados=Array.from(modal.querySelectorAll('#control-processes input:checked'),input=>input.value);data.tipo=modal.querySelector('#control-type').value;data.efetividade=modal.querySelector('#control-effect').value;
        if(!data.nome||!data.categoria||!data.descricao)throw Error('Preencha nome, categoria e descrição.');
        if(records.some(other=>other.id!==data.id&&ControlesBiblioteca.key(other.nome)===ControlesBiblioteca.key(data.nome)))throw Error('Já existe um controle com esse nome.');
        const user=fb().auth.currentUser,{db,runTransaction,serverTimestamp}=fb();await runTransaction(db,async tx=>{const ref=repo().ref(data.id),snapshot=await tx.get(ref);if(fb().auth.currentUser?.uid!==user.uid||!editable())throw Error('A sessão foi alterada. Reabra a central.');if(snapshot.exists()&&time(snapshot.data().atualizado_em)!==time(c.atualizado_em))throw Error('Outro usuário alterou este controle. Feche e reabra os detalhes antes de salvar.');tx.set(ref,CentralControlesCore.document({...data,criado_em:snapshot.exists()?snapshot.data().criado_em:undefined},user,serverTimestamp()));});await ControlesBiblioteca.load(true);modal.remove();await render();toast('Controle salvo.');
      }catch(error){modal.querySelector('#control-error').textContent=error.message;}finally{button.disabled=false;}
    };
  }
  const previousForm=globalThis.riscoControleForm;globalThis.riscoControleForm=function(c={}){
    const base=records.find(x=>x.id===c.biblioteca_id)||ControlesBiblioteca.all().find(x=>x.id===c.biblioteca_id);
    const values={...c};if(base){values.responsavel??=base.responsavel;values.efetividade??=base.efetividade;values.tipo= c.tipo||base.tipo;values.setor??=base.setor;}
    let html=previousForm(values);html=html.replace('data-control="efetividade">','data-control="efetividade"><option value="Não avaliada" '+(!values.efetividade||values.efetividade==='Não avaliada'?'selected':'')+'>Não avaliada</option>');
    return html.replace('</textarea>','</textarea><label class="fl">Setor</label><input class="fi" data-control="setor" value="'+esc(values.setor||curProc?.area||'')+'">');
  };
  function attach(){if(attached||!fbReady()||!fb().onAuthStateChanged)return;attached=true;clearInterval(timer);fb().onAuthStateChanged(fb().auth,()=>{clearTimeout(refreshTimer);subscriptions.forEach(stop=>stop());subscriptions=[];records=[];processRecords=[];document.getElementById('controls-dialog')?.remove();});}
  const timer=setInterval(attach,1000);attach();globalThis.CentralControles={open:render,render};
})();
