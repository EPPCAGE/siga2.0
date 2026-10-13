(()=>{
  const types=['Preventivo','Detectivo','Corretivo'],effects=['Não avaliada','Eficaz','Parcialmente eficaz','Ineficaz'];
  let records=[],processRecords=[],filters={text:'',process:'',risk:''};
  const options=(values,current)=>values.map(v=>'<option '+(v===current?'selected':'')+'>'+esc(v)+'</option>').join('');
  let rendering=null,refreshTimer=null,subscriptions=[],attached=false;
  const editable=()=>!!fbReady()&&!!fb().auth.currentUser&&isEP();
  const repo=()=>FirestoreRepositories.collection('central_controles');
  const applicationsRepo=()=>FirestoreRepositories.collection('controles_aplicacoes');
  const time=value=>value?String(value.seconds)+':'+String(value.nanoseconds):'';
  async function seed(missing,user){
    for(const control of missing){const {db,runTransaction,serverTimestamp}=fb();await runTransaction(db,async tx=>{
      if(fb().auth.currentUser?.uid!==user.uid||!editable())throw Error('A sessão foi alterada. Reabra a central.');const ref=repo().ref(control.id),snapshot=await tx.get(ref);if(snapshot.exists()&&snapshot.data().schema_version===2)return;
      tx.set(ref,CentralControlesCore.document({...control,criado_em:snapshot.exists()?snapshot.data().criado_em:undefined},user,serverTimestamp()));
      for(const a of control.aplicacoes.filter(a=>a.origem==='Migração').slice(0,100))tx.set(applicationsRepo().ref(crypto.randomUUID()),CentralControlesCore.applicationDocument(a,control.id,user,serverTimestamp()));
    });}
  }
  function watch(){if(subscriptions.length)return;const {onSnapshot}=fb();for(const name of ['central_controles','controles_aplicacoes','controles_biblioteca','processos','config'])subscriptions.push(onSnapshot(FirestoreRepositories.collection(name).colRef(),()=>{clearTimeout(refreshTimer);if(document.getElementById('page-controles')?.classList.contains('on'))refreshTimer=setTimeout(()=>{void render();},400);},()=>{}));}
  async function render(){
    if(rendering)return rendering;const host=document.getElementById('controls-content');if(!host||!fbReady()||!fb().auth.currentUser)return;
    const user=fb().auth.currentUser;host.innerHTML='<div class="ib ibsl" role="status">Carregando controles…</div>';
    rendering=(async()=>{try{
      const [registry,library,processesSnapshot,architectureSnapshot,applicationSnapshot]=await Promise.all([repo().list(),FirestoreRepositories.collection('controles_biblioteca').list(),FirestoreRepositories.collection('processos').list(),FirestoreRepositories.collection('config').get('arquitetura'),applicationsRepo().list()]);
      if(fb().auth.currentUser?.uid!==user.uid)return;
      const processes=processesSnapshot.docs.map(d=>({...d.data,id:d.data.id??d.id}));let architecture=[];try{architecture=JSON.parse(architectureSnapshot.data()?.data||'[]');}catch{}
      const values={factory:globalThis.CONTROLES_CATALOGO||[],registry:registry.docs.map(d=>({...d.data,id:d.id})),library:library.docs.map(d=>({...d.data,id:d.id})),processes,architecture,applications:applicationSnapshot.docs.map(d=>({...d.data,id:d.id}))};
      let model=await CentralControlesCore.build(values);
      if(editable()){const stored=new Set(values.registry.map(c=>c.id)),missing=model.records.filter(c=>!stored.has(c.id)||c.schema_version!==2);if(missing.length){await seed(missing,user);const [updated,updatedApps]=await Promise.all([repo().list(),applicationsRepo().list()]);model=await CentralControlesCore.build({...values,registry:updated.docs.map(d=>({...d.data,id:d.id})),applications:updatedApps.docs.map(d=>({...d.data,id:d.id}))});}}
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
      return ControlesBiblioteca.key([c.nome,c.categoria,c.tipo,c.origem,...(c.aplicacoes||[]).flatMap(a=>[a.setor,a.responsavel,a.efetividade]),...names,...links.flatMap(v=>[v.processo,v.risco,v.setor,v.responsavel])].join(' ')).includes(q);
    }).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    const host=document.getElementById('controls-list');host.innerHTML=CentralControlesView.list(rows,records.length,processRecords,filters);
    host.querySelectorAll('[data-control-edit]').forEach(b=>b.onclick=()=>edit(records.find(c=>c.id===b.dataset.controlEdit)));
  }
  function edit(c={}){
    document.getElementById('controls-dialog')?.remove();const modal=document.createElement('div');modal.className='offline-overlay';modal.id='controls-dialog';
    const fields=[['nome','Nome do controle'],['categoria','Categoria'],['descricao','Descrição']];
    modal.innerHTML=CentralControlesView.dialog(c,processRecords,types,effects);
    document.body.append(modal);
    modal.querySelectorAll('.control-process-group').forEach(group=>{const checkbox=group.querySelector('input[type=checkbox]'),area=group.querySelector('.control-process-assessment');checkbox.onchange=()=>{area.hidden=!checkbox.checked;};group.querySelector('[data-add-application]').onclick=()=>{if(editable())group.querySelector('.control-application-rows').insertAdjacentHTML('beforeend',CentralControlesView.applicationRow({efetividade:'Não avaliada'},effects));};});
    modal.addEventListener('click',event=>{const remove=event.target.closest('[data-remove-application]');if(remove&&editable()){const rows=remove.closest('.control-application-rows');if(rows.children.length>1)remove.closest('.control-application').remove();}});
    if(!editable()){modal.querySelectorAll('[data-add-application],[data-remove-application]').forEach(button=>button.hidden=true);}if(!editable()){modal.querySelectorAll('input,textarea,select').forEach(field=>field.disabled=true);modal.querySelector('[type=submit]').hidden=true;}modal.querySelector('#control-close').onclick=()=>modal.remove();modal.querySelector('form').onsubmit=async e=>{
      e.preventDefault();if(!editable())return;const button=modal.querySelector('[type=submit]');button.disabled=true;
      try{
        const data={...c,id:c.id||'USR-'+crypto.randomUUID(),origem:c.origem||'Cadastrado'};fields.forEach(([key])=>data[key]=modal.querySelector('#control-'+key).value.trim());const applications=[];for(const group of modal.querySelectorAll('.control-process-group'))if(group.querySelector('input[type=checkbox]').checked)for(const row of group.querySelectorAll('.control-application')){const a={id:row.dataset.applicationId,processo_id:group.dataset.processId};row.querySelectorAll('[data-application-field]').forEach(field=>a[field.dataset.applicationField]=field.value.trim());applications.push(a);}data.processos_associados=[...new Set(applications.map(a=>a.processo_id))];data.tipo=modal.querySelector('#control-type').value;
        if(applications.length>100)throw Error('Salve no máximo 100 aplicações por controle.');applications.forEach(a=>CentralControlesCore.applicationDocument(a,data.id,fb().auth.currentUser,{}));
        if(!data.nome||!data.categoria||!data.descricao)throw Error('Preencha nome, categoria e descrição.');
        if(records.some(other=>other.id!==data.id&&ControlesBiblioteca.key(other.nome)===ControlesBiblioteca.key(data.nome)))throw Error('Já existe um controle com esse nome.');
        const user=fb().auth.currentUser,{db,runTransaction,serverTimestamp}=fb();const previous=c._savedApplications||[];
        await runTransaction(db,async tx=>{
          const ref=repo().ref(data.id),snapshots=await Promise.all([tx.get(ref),...previous.map(a=>tx.get(applicationsRepo().ref(a.id)))]),snapshot=snapshots[0];
          if(fb().auth.currentUser?.uid!==user.uid||!editable())throw Error('A sessão foi alterada. Reabra a central.');
          if(snapshot.exists()&&time(snapshot.data().atualizado_em)!==time(c.atualizado_em))throw Error('Outro usuário alterou este controle. Feche e reabra os detalhes antes de salvar.');
          previous.forEach((a,i)=>{if(!snapshots[i+1].exists()||time(snapshots[i+1].data().atualizado_em)!==time(a.atualizado_em))throw Error('Outra pessoa alterou uma aplicação. Reabra os detalhes.');});
          tx.set(ref,CentralControlesCore.document({...data,criado_em:snapshot.exists()?snapshot.data().criado_em:undefined},user,serverTimestamp()));
          for(const a of applications){const old=previous.find(item=>item.id===a.id);tx.set(applicationsRepo().ref(a.id),CentralControlesCore.applicationDocument({...a,criado_em:old?.criado_em},data.id,user,serverTimestamp()));}
          const retained=new Set(applications.map(a=>a.id));for(const a of previous)if(!retained.has(a.id))tx.delete(applicationsRepo().ref(a.id));
        });await ControlesBiblioteca.load(true);modal.remove();await render();toast('Controle salvo.');
      }catch(error){modal.querySelector('#control-error').textContent=error.message;}finally{button.disabled=false;}
    };
  }
  const previousForm=globalThis.riscoControleForm;globalThis.riscoControleForm=function(c={}){
    const base=records.find(x=>x.id===c.biblioteca_id)||ControlesBiblioteca.all().find(x=>x.id===c.biblioteca_id);
    const values={...c};if(base){const local={...base,aplicacoes:(base.aplicacoes||[]).map(a=>({...a,processo_id:String(a.processo_id)==='arq:'+curProc?.arq_id?String(curProc.id):String(a.processo_id)}))},reference=CentralControlesCore.reference(local,curProc?.id,c.setor||curProc?.area);if(reference){values.responsavel??=reference.responsavel;values.efetividade??=reference.efetividade;values.setor??=reference.setor;}values.tipo=base.tipo;}
    let html=previousForm(values);html=html.replace('data-control="efetividade">','data-control="efetividade"><option value="Não avaliada" '+(!values.efetividade||values.efetividade==='Não avaliada'?'selected':'')+'>Não avaliada</option>');
    return html.replace('</textarea>','</textarea><label class="fl">Setor</label><input class="fi" data-control="setor" value="'+esc(values.setor||curProc?.area||'')+'">');
  };
  function attach(){if(attached||!fbReady()||!fb().onAuthStateChanged)return;attached=true;clearInterval(timer);fb().onAuthStateChanged(fb().auth,()=>{clearTimeout(refreshTimer);subscriptions.forEach(stop=>stop());subscriptions=[];records=[];processRecords=[];document.getElementById('controls-dialog')?.remove();});}
  const timer=setInterval(attach,1000);attach();globalThis.CentralControles={open:render,render};
})();
