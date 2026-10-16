let riscosAba='processos';
let riscosProjetosDados=[];
let riscosProjetosAvaliacoes={};
let riscosProjetosCarregando=false;
let riscosProjetosErro='';
let riscosProjetosCarregado=false;
function riscosAbasTeclado(event){
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();
  const aba=event.key==='Home'?'processos':event.key==='End'?'projetos':riscosAba==='processos'?'projetos':'processos';
  riscosSelecionarAba(aba);document.getElementById('riscos-tab-'+aba).focus();
}
function riscosSelecionarAba(aba){
  riscosAba=aba==='projetos'?'projetos':'processos';
  for(const value of ['processos','projetos']){
    document.getElementById('riscos-tab-'+value).classList.toggle('on',value===riscosAba);
    document.getElementById('riscos-tab-'+value).setAttribute('aria-selected',String(value===riscosAba));
    document.getElementById('riscos-tab-'+value).tabIndex=value===riscosAba?0:-1;
    document.getElementById('riscos-panel-'+value).hidden=value!==riscosAba;
  }
  if(riscosAba==='projetos'){
    if(!riscosProjetosCarregado)void riscosProjetosCarregar();else rRiscosProjetos();
  }else rRiscos();
}
async function riscosProjetosCarregar(){
  if(riscosProjetosCarregando)return;
  riscosProjetosCarregando=true;riscosProjetosErro='';rRiscosProjetos();
  try{
    if(!fbReady())throw Error('Servidor indisponível.');
    const snap=await projetosRepository.list();
    const projects=snap.docs.map(doc=>({...doc.data,id:doc.data.id ?? doc.id}));
    const assessments={};
    await Promise.all(projects.filter(p=>RiscosProjetos.itens(p.ideacao?.riscos_canvas).length).map(async p=>{
      const doc=await configRepository.get('riscosProjetoCanvas_'+p.id,{fromServer:true});
      assessments[String(p.id)]=doc.exists()?doc.data().avaliacoes || []:[];
    }));
    riscosProjetosDados=projects;riscosProjetosAvaliacoes=assessments;riscosProjetosCarregado=true;
  }catch(e){riscosProjetosErro='Não foi possível carregar os riscos dos projetos. Tente atualizar novamente.';}
  finally{riscosProjetosCarregando=false;rRiscosProjetos();}
}
function riscosProjetosFilters(){
  return Object.fromEntries(['processId','prob','imp','status','query'].map(field=>[field,document.getElementById('riscos-projeto-'+field)?.value || '']));
}
function rRiscosProjetos(){
  const target=document.getElementById('riscos-projetos-content');if(!target)return;
  if(riscosProjetosCarregando){target.innerHTML='<p role="status">Carregando riscos dos projetos…</p>';return;}
  if(riscosProjetosErro){target.innerHTML='<p role="alert">'+esc(riscosProjetosErro)+'</p>';return;}
  const all=RiscosProjetos.rows(riscosProjetosDados,riscosProjetosAvaliacoes),filters=riscosProjetosFilters();
  const select=document.getElementById('riscos-projeto-processId');
  const projects=[...new Map(all.map(row=>[row.processId,row.processName]))];
  select.innerHTML='<option value="">Todos os projetos</option>'+projects.map(([id,nome])=>`<option value="${esc(id)}" ${filters.processId===id?'selected':''}>${esc(nome)}</option>`).join('');
  if(!projects.some(([id])=>id===filters.processId))filters.processId='';
  const rows=Riscos.filter(all,filters),summary=Riscos.summary(rows,riscosToday());
  target.innerHTML=`<div class="risk-stats">${[['Riscos no filtro',summary.total],['Nível alto/crítico',summary.priority],['Alto/crítico sem tratamento',summary.untreated],['Dados a classificar',summary.unconfirmed]].map(([label,n])=>`<div class="card"><strong>${n}</strong><span>${label}</span></div>`).join('')}</div>${riscosCoverageHtml(rows)}${riscosMatrixHtml(rows,'Matriz de riscos de projetos')}
    <h2 class="risk-list-title">Riscos dos canvas (${rows.length})</h2>${rows.map((row,index)=>`<article class="card risk-item"><h3>${esc(row.risk.desc)}</h3><p>Projeto: ${esc(row.processName)}<br>Gerente: ${esc(row.area)}</p><div class="risk-tags"><span class="badge bgr">Probabilidade: ${riscosLabel(row.prob) || 'Não informada'}</span><span class="badge bgr">Impacto: ${riscosLabel(row.imp) || 'Não informado'}</span><span class="badge bgr">Nível: ${riscosLabel(Riscos.level(row.prob,row.imp)) || 'Não classificado'}</span><span class="badge ba">${riscosLabel(row.status)}</span></div>${riscosCauseHtml(row.risk)}${riscosTreatmentCatalogHtml(row.risk)}<p>Responsável: ${esc(row.risk.responsavel_tratamento || 'Não informado')} · Prazo: ${esc(row.risk.prazo_tratamento || 'Não informado')}</p><p class="risk-text"><strong>Tratamento:</strong> ${esc(row.risk.tratamento || 'Não informado')}<br>${esc(row.risk.acao_tratamento || '')}</p><p class="risk-text"><strong>Evidência:</strong> ${esc(row.risk.evidencia_tratamento || 'Não informada')}</p>${riscosCanEdit()?`<button type="button" class="btn btn-p" data-risk-index="${index}">Avaliar e registrar tratamento</button>`:''}</article>`).join('') || '<div class="ib ibb">Nenhum risco encontrado nos canvas para os filtros selecionados.</div>'}`;
  target.querySelectorAll('[data-risk-index]').forEach(button=>button.onclick=()=>riscosProjetoEdit(rows[Number(button.dataset.riskIndex)]));
}
function riscosProjetoEdit(row){
  if(!riscosCanEdit())return;
  document.getElementById('risk-treatment-modal')?.remove();
  const dialog=document.createElement('dialog');dialog.id='risk-treatment-modal';dialog.className='risk-treatment-modal';
  dialog.innerHTML=riscosTreatmentForm(row.risk);
  const fields=document.createElement('div');fields.className='g2';
  fields.innerHTML=[['prob','Probabilidade',Riscos.probabilities],['imp','Impacto',Riscos.impacts]].map(([key,label,options])=>`<div class="fg"><label class="fl" for="risk-project-${key}">${label}</label><select class="fi" id="risk-project-${key}" required><option value="">Selecione</option>${options.map(value=>`<option value="${value}" ${row[key]===value?'selected':''}>${riscosLabel(value)}</option>`).join('')}</select></div>`).join('');
  dialog.querySelector('#risk-cause').closest('.fg').before(fields);
  const refreshSeverity=()=>{
    const level=Riscos.level(fields.querySelector('#risk-project-prob').value,fields.querySelector('#risk-project-imp').value);
    dialog.querySelector('form>p strong').textContent=Riscos.levels[level] || 'Não classificado';
    const type=dialog.querySelector('#risk-type'),accepted=[...type.options].find(o=>o.value==='Aceitar');
    if(['low','moderate'].includes(level)){if(!accepted)type.add(new Option('Aceitar','Aceitar'));}
    else if(accepted)accepted.remove();
    riscosTreatmentVisibility();
  };
  fields.querySelectorAll('select').forEach(select=>select.onchange=refreshSeverity);
  dialog._riskDescription=row.risk.desc;
  dialog.querySelector('#risk-treatment-controls')._controls=(row.risk.controles_tratamento || []).map(c=>({...c}));
  dialog.addEventListener('close',()=>dialog.remove());
  dialog.querySelector('form').onsubmit=async event=>{
    event.preventDefault();if(!riscosCanEdit())return;
    const error=dialog.querySelector('#risk-save-error'),button=dialog.querySelector('[type="submit"]');
    let values;
    try{
      const risk={...row.risk,prob:fields.querySelector('#risk-project-prob').value,imp:fields.querySelector('#risk-project-imp').value};
      const value=id=>dialog.querySelector('#risk-'+id).value;
      values=Riscos.treatment(risk,{status:value('status'),type:value('type'),action:value('action'),owner:value('owner'),deadline:value('deadline'),evidence:value('evidence'),controlSource:value('control-source'),reference:value('control-reference')});
      Object.assign(values,{chave:row.chave,causa_provavel:value('cause').trim(),controles_tratamento:values.tratamento==='Aceitar'?[]:dialog.querySelector('#risk-treatment-controls')._controls.map(c=>({...c})),tratamento_atualizado_em:new Date().toISOString(),tratamento_atualizado_por:usuarioLogado?.email || usuarioLogado?.nome || ''});
      button.disabled=true;
      await riscosProjetoSalvar(row,values);
      dialog.close();rRiscosProjetos();toast('Avaliação do risco de projeto salva.','var(--teal)');
    }catch(e){error.textContent=e.message || 'Não foi possível salvar. Tente novamente.';button.disabled=false;}
  };
  document.body.appendChild(dialog);riscosRenderTreatmentControls();dialog.showModal();
}
async function riscosProjetoSalvar(row,values){
  if(!riscosCanEdit() || !fbReady() || globalThis.navigator?.onLine===false)throw Error('Reconecte-se com um perfil autorizado para salvar.');
  const {db,runTransaction}=fb();
  const ref=configRepository.ref('riscosProjetoCanvas_'+row.processId);
  const expected=(riscosProjetosAvaliacoes[row.processId] || []).find(r=>r.chave===row.chave) || null;
  const saved=await runTransaction(db,async transaction=>{
    const project=await transaction.get(projetosRepository.ref(row.processId));
    const config=await transaction.get(ref);
    if(!project.exists() || !RiscosProjetos.itens(project.data().ideacao?.riscos_canvas).includes(row.chave))throw Error('O risco foi alterado no canvas. Atualize a lista antes de salvar.');
    const assessments=config.exists()?config.data().avaliacoes || []:[];
    if(JSON.stringify(assessments.find(r=>r.chave===row.chave) || null)!==JSON.stringify(expected))throw Error('A avaliação foi atualizada por outra pessoa. Atualize a lista antes de salvar.');
    const next=[...assessments.filter(r=>r.chave!==row.chave),values];
    transaction.set(ref,{avaliacoes:next},{merge:true});return next;
  });
  riscosProjetosAvaliacoes[row.processId]=saved;
}
