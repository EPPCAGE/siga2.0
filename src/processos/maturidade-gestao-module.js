let _mg=null;
function maturidadeGestaoCanEdit(){return isEP() && !['dono','gestor'].includes(usuarioLogado?.perfil);}
async function rMaturidadeGestao(){
  const root=document.getElementById('maturidade-gestao-content');if(!root)return;
  const identity=(usuarioLogado?.email || '')+'|'+(globalThis.TENANT_CONFIG?.tenantId || 'default');
  if(_mg?.identity===identity){if(_mg.ready)maturidadeGestaoRender();return;}
  const state={identity,answers:{},notes:{},title:'Avaliação institucional',cycle:String(new Date().getFullYear()),history:[],dimension:0,editing:maturidadeGestaoCanEdit(),expected:null,ready:false};
  _mg=state;root.innerHTML='<div class="ib ibb">Carregando avaliação...</div>';
  try{
    if(fbReady()){
      const snapshot=await configRepository.get('maturidade_gestao');
      state.expected=snapshot.exists()?snapshot.data().data || null:null;
      if(state.expected){Object.assign(state,JSON.parse(state.expected));state.editing=state.status!=='concluida' && maturidadeGestaoCanEdit();}
    }
    if(_mg!==state)return;state.ready=true;maturidadeGestaoRender();
  }catch(e){root.innerHTML='<div class="ib iba">Não foi possível carregar a avaliação. '+esc(e.message)+'</div><button type="button" class="btn" onclick="maturidadeGestaoReload()">Tentar novamente</button>';}
}
function maturidadeGestaoReload(){_mg=null;rMaturidadeGestao();}
function maturidadeGestaoResultHtml(answers){
  const result=MaturidadeGestao.calculate(answers),level=MaturidadeGestao.levels[result.level];
  return `<section class="card mg-result"><div class="card-t">Diagnóstico da gestão de processos</div>${level?`<div class="mg-grade">${result.level}<span>de 5 · ${esc(level.name)}</span></div><p>${esc(level.meaning)}</p><h3>${result.level===5?'Como sustentar e evoluir':'Para alcançar o nível '+(result.level+1)}</h3><p>${esc(level.next)}</p>`:`<p>Respostas: <strong>${result.answered} de ${result.total}</strong>. A nota geral será apresentada quando todas as dimensões estiverem completas.</p>`}<div class="mg-dim-results">${result.dimensions.map(d=>`<div><strong>${esc(d.name)}</strong><span>${d.level?'Nível '+d.level+' · '+esc(MaturidadeGestao.levels[d.level].name):d.answered+'/'+d.total+' respondidas'}${d.mean!==null?' · Média '+d.mean.toLocaleString('pt-BR',{maximumFractionDigits:2}):''}</span><progress max="5" value="${d.level || 0}" aria-label="Maturidade em ${esc(d.name)}"></progress></div>`).join('')}</div><details class="mg-method"><summary>Como a nota é calculada</summary><p>Cada alternativa vale de 1 a 5, na ordem do formulário. Calculamos a média das respostas de cada dimensão e a convertemos em nível: até 1,5 = 1; até 2,5 = 2; até 3,5 = 3; até 4,5 = 4; acima de 4,5 = 5. A nota geral é a moda dos seis níveis das dimensões. Em empate, prevalece o menor nível empatado. Cada dimensão tem o mesmo peso. Respostas ausentes não recebem nota.</p></details>${result.complete?`<details class="mg-method"><summary>Oportunidades de evolução por pergunta</summary><p>Orientações derivadas da alternativa imediatamente superior à resposta selecionada. As notas mais baixas aparecem primeiro.</p>${MaturidadeGestao.improvements(answers).map(item=>`<article class="mg-improvement"><strong>${item.question.number}. ${esc(item.question.title)}</strong><p>Nível ${item.level} → ${item.target}: ${esc(item.practice)}</p></article>`).join('') || '<p>Todas as respostas estão no nível 5. Reavalie evidências e sustente as práticas ao longo dos próximos ciclos.</p>'}</details>`:''}</section>`;
}
function maturidadeGestaoRender(){
  const root=document.getElementById('maturidade-gestao-content'),state=_mg;if(!state?.ready || state.saving)return;
  const canEdit=maturidadeGestaoCanEdit(),editing=canEdit && state.editing;
  root.innerHTML=`<div class="mg-toolbar">${canEdit && !editing?'<button type="button" class="btn btn-p" onclick="maturidadeGestaoNew()">Nova avaliação institucional</button>':''}${state.history.length?`<div class="fg"><label class="fl" for="mg-history">Histórico de avaliações</label><select class="fi" id="mg-history" ${editing?'disabled':''} onchange="maturidadeGestaoHistory(this.value)"><option value="">Avaliação atual</option>${state.history.slice().reverse().map(item=>`<option value="${esc(item.id)}">${esc(item.cycle)} · ${esc(item.title)} · Nível ${item.level} · ${esc(new Date(item.date).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}))}</option>`).join('')}</select></div>`:''}</div><p id="mg-error" role="alert" class="mg-error"></p><div id="mg-view">${state.date?`<p class="mg-meta">${state.status==='concluida'?'Avaliação concluída':'Rascunho salvo'} por ${esc(state.author || '')} · ${esc(new Date(state.date).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}))}</p>`:''}${editing?`<form id="mg-form"><div class="card"><div class="card-t">Identificação da avaliação</div><div class="g2"><div class="fg"><label class="fl" for="mg-title">Nome da avaliação</label><input class="fi" id="mg-title" value="${esc(state.title)}" required></div><div class="fg"><label class="fl" for="mg-cycle">Ciclo / período de referência</label><input class="fi" id="mg-cycle" value="${esc(state.cycle)}" required></div></div><p>Avaliação institucional registrada pelo EP. Escolha a alternativa que melhor representa a prática da organização, com base em evidências.</p></div><div class="mg-steps" aria-label="Dimensões da avaliação">${MaturidadeGestao.dimensions.map((name,i)=>`<button type="button" class="btn ${state.dimension===i?'btn-p':''}" aria-current="${state.dimension===i?'step':'false'}" onclick="maturidadeGestaoStep(${i})">${i+1}. ${esc(name)}</button>`).join('')}</div><section class="card"><div class="card-t">${state.dimension+1} de 6 · ${esc(MaturidadeGestao.dimensions[state.dimension])}</div>${MaturidadeGestao.questions.filter(q=>q.dimension===state.dimension).map(q=>`<fieldset class="mg-question"><legend>${q.number}. ${esc(q.title)}</legend>${q.options.map((option,index)=>`<label class="mg-option"><input type="radio" name="${q.id}" value="${index+1}" ${state.answers[q.id]===index+1?'checked':''}><span>${esc(option)}</span></label>`).join('')}</fieldset>`).join('')}<div class="fg"><label class="fl" for="mg-evidence">Evidências / observações desta dimensão</label><textarea class="fi" id="mg-evidence" rows="3" placeholder="Registre documentos, práticas e dados que sustentam as respostas.">${esc(state.notes[state.dimension] || '')}</textarea></div><div class="btn-row"><button type="button" class="btn" onclick="maturidadeGestaoStep(${state.dimension-1})" ${state.dimension===0?'disabled':''}>Anterior</button><button type="button" class="btn" onclick="maturidadeGestaoStep(${state.dimension+1})" ${state.dimension===5?'disabled':''}>Próxima dimensão</button></div></section><div class="btn-row mg-save"><button type="button" class="btn" onclick="maturidadeGestaoSave(false)">Salvar rascunho</button><button type="submit" class="btn btn-p">Concluir avaliação</button></div></form>`:''}<div id="mg-result">${maturidadeGestaoResultHtml(state.answers)}</div></div>`;
  if(canEdit && state.expected && state.date){
    const remove=document.createElement('button');remove.type='button';remove.className='btn';remove.id='mg-delete';
    remove.textContent=state.status==='rascunho'?'Excluir rascunho':'Excluir avaliação';remove.onclick=maturidadeGestaoConfirmDelete;
    root.querySelector('.mg-toolbar').appendChild(remove);
  }
  if(editing){
    const form=root.querySelector('form');form.onsubmit=e=>{e.preventDefault();maturidadeGestaoSave(true);};
    form.addEventListener('input',()=>{maturidadeGestaoRead();document.getElementById('mg-result').innerHTML=maturidadeGestaoResultHtml(state.answers);});
  }
  const charts=document.createElement('section');charts.className='mg-history-charts';charts.id='mg-history-charts';root.appendChild(charts);
  maturidadeGestaoCharts(state,charts);
}
async function maturidadeGestaoCharts(state,container){
  if(!state.history.length){container.innerHTML='<div class="card"><div class="card-t">Evolução por dimensão</div><p>Conclua uma avaliação para iniciar o histórico dos gráficos.</p></div>';return;}
  container.innerHTML='<p role="status">Carregando evolução por dimensão...</p>';
  try{
    // Reuse immutable historical records when the questionnaire is re-rendered.
    if(!state.chartRecords)state.chartRecords=Promise.all(state.history.map(async entry=>{
      const snapshot=await configRepository.get('maturidade_gestao_'+entry.id);
      if(!snapshot.exists())throw Error('Uma avaliação do histórico não foi encontrada.');
      const record=JSON.parse(snapshot.data().data);
      return {...record,id:entry.id,result:MaturidadeGestao.calculate(record.answers)};
    }));
    const records=(await state.chartRecords).filter(r=>r.status==='concluida' && r.result.complete).sort((a,b)=>new Date(a.date)-new Date(b.date) || a.id.localeCompare(b.id));
    if(_mg!==state || !container.isConnected)return;
    container.innerHTML='<h3>Evolução por dimensão</h3><p>Comparação das avaliações concluídas, da mais antiga à mais recente. A linha mostra a média das respostas (1 a 5); os detalhes apresentam também o nível de maturidade. Rascunhos não entram na comparação.</p><div class="mg-charts-grid">'+MaturidadeGestao.dimensions.map((name,index)=>{
      const points=records.map((record,i)=>({record,dimension:record.result.dimensions[index],x:55+(records.length===1?170:i*340/(records.length-1))}));
      const y=value=>225-(value-1)*45;
      const number=value=>value.toLocaleString('pt-BR',{maximumFractionDigits:2});
      const title='mg-chart-title-'+index;
      return `<article class="card mg-dimension-chart"><h4 id="${title}">${esc(name)}</h4><svg viewBox="0 0 450 280" role="img" aria-labelledby="${title}" aria-describedby="mg-chart-desc-${index}"><desc id="mg-chart-desc-${index}">${esc(points.map(p=>p.record.cycle+': média '+number(p.dimension.mean)+', nível '+p.dimension.level).join('; '))}</desc>${[1,2,3,4,5].map(level=>`<line x1="55" x2="395" y1="${y(level)}" y2="${y(level)}" class="mg-chart-grid"/><text x="35" y="${y(level)+4}" text-anchor="end">${level}</text>`).join('')}<polyline points="${points.map(p=>p.x+','+y(p.dimension.mean)).join(' ')}" class="mg-chart-line"/>${points.map((p,i)=>`<circle cx="${p.x}" cy="${y(p.dimension.mean)}" r="5" class="mg-chart-point"><title>${esc(p.record.title)} · ${esc(p.record.cycle)} · Média ${number(p.dimension.mean)} · Nível ${p.dimension.level}</title></circle><text x="${p.x}" y="${y(p.dimension.mean)-12}" text-anchor="middle">${number(p.dimension.mean)}</text>${i===0 || i===points.length-1?`<text x="${p.x}" y="252" text-anchor="middle">${esc(new Date(p.record.date).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}))}</text>`:''}`).join('')}</svg><details><summary>Ver avaliações e valores</summary><div class="mg-chart-table"><table><thead><tr><th scope="col">Avaliação / ciclo</th><th scope="col">Data</th><th scope="col">Média</th><th scope="col">Nível</th></tr></thead><tbody>${points.map(p=>`<tr><td>${esc(p.record.title)} · ${esc(p.record.cycle)}</td><td>${esc(new Date(p.record.date).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}))}</td><td>${number(p.dimension.mean)}</td><td>${p.dimension.level}</td></tr>`).join('')}</tbody></table></div></details></article>`;
    }).join('')+'</div>';
  }catch(e){if(_mg===state && container.isConnected){state.chartRecords=null;container.innerHTML='<div class="ib iba">Não foi possível carregar os gráficos. '+esc(e.message)+'</div>';}}
}
function maturidadeGestaoRead(){
  if(!document.getElementById('mg-form'))return;
  _mg.title=document.getElementById('mg-title').value.trim();_mg.cycle=document.getElementById('mg-cycle').value.trim();
  document.querySelectorAll('#mg-form input[type=radio]:checked').forEach(input=>_mg.answers[input.name]=Number(input.value));
  _mg.notes[_mg.dimension]=document.getElementById('mg-evidence').value.trim();
}
function maturidadeGestaoStep(index){if(index<0 || index>=6 || !maturidadeGestaoCanEdit())return;maturidadeGestaoRead();_mg.dimension=index;maturidadeGestaoRender();document.querySelector('.mg-steps')?.scrollIntoView({block:'start'});}
function maturidadeGestaoNew(){if(!maturidadeGestaoCanEdit())return;Object.assign(_mg,{answers:{},notes:{},dimension:0,editing:true,status:'rascunho',date:null,author:null,cycle:String(new Date().getFullYear())});maturidadeGestaoRender();}
async function maturidadeGestaoSave(finalize){
  if(!maturidadeGestaoCanEdit() || _mg.saving)return;maturidadeGestaoRead();
  const state=_mg,error=document.getElementById('mg-error');error.textContent='';
  try{
    const result=MaturidadeGestao.calculate(state.answers);
    if(!state.title || !state.cycle)throw Error('Informe o nome da avaliação e o período de referência.');
    if(finalize && !result.complete)throw Error('Responda todas as 26 perguntas para concluir a avaliação. Faltam '+(result.total-result.answered)+'.');
    if(!fbReady() || !globalThis._fbLoadedAt)throw Error('Conecte-se para salvar a avaliação institucional.');
    state.saving=true;document.querySelectorAll('#mg-form input,#mg-form textarea,#mg-form button').forEach(b=>b.disabled=true);
    const date=new Date().toISOString(),id='mg-'+crypto.randomUUID(),author=usuarioLogado?.email || usuarioLogado?.nome || '';
    const record={schema:1,id,title:state.title,cycle:state.cycle,answers:{...state.answers},notes:{...state.notes},date,author,status:finalize?'concluida':'rascunho',level:result.level};
    const history=finalize?[...state.history,{id,title:record.title,cycle:record.cycle,date,author,level:record.level}]:state.history;
    const data=JSON.stringify({...record,history}),api=fb();
    await api.runTransaction(api.db,async transaction=>{
      if(_mg!==state || !maturidadeGestaoCanEdit() || (usuarioLogado?.email || usuarioLogado?.nome || '')!==author)throw Error('A sessão foi alterada. Reabra a avaliação antes de salvar.');
      const ref=configRepository.ref('maturidade_gestao'),snapshot=await transaction.get(ref);
      if((snapshot.exists()?snapshot.data().data || null:null)!==state.expected)throw Error('Outra pessoa atualizou a avaliação. Recarregue antes de salvar.');
      transaction.set(ref,{data});
      if(finalize)transaction.set(configRepository.ref('maturidade_gestao_'+id),{data:JSON.stringify(record)});
      transaction.set(configRepository.ref('last_modified'),{ts:Date.now(),by:author});
    });
    if(_mg!==state)return;Object.assign(state,record,{history,expected:data,editing:!finalize,saving:false,chartRecords:null});
    maturidadeGestaoRender();toast(finalize?'Avaliação concluída. Nota de maturidade: '+result.level:'Rascunho salvo.','var(--teal)');
  }catch(e){if(_mg===state){state.saving=false;maturidadeGestaoRender();document.getElementById('mg-error').textContent=e.message;}}
  finally{state.saving=false;}
}
async function maturidadeGestaoHistory(id){
  const view=document.getElementById('mg-view'),token=Symbol();view._historyToken=token;
  const remove=document.getElementById('mg-delete');if(remove)remove.textContent=id?'Excluir avaliação':_mg.status==='rascunho'?'Excluir rascunho':'Excluir avaliação';
  if(!id){maturidadeGestaoRender();return;}
  try{
    const snapshot=await configRepository.get('maturidade_gestao_'+id);if(!snapshot.exists())throw Error('Avaliação não encontrada.');
    const record=JSON.parse(snapshot.data().data);if(view._historyToken!==token)return;
    view.innerHTML=`<div class="ib ibb">Consulta histórica · ${esc(record.title)} · ${esc(record.cycle)} · ${esc(record.author)}</div>${maturidadeGestaoResultHtml(record.answers)}<section class="card"><div class="card-t">Respostas e evidências registradas</div>${MaturidadeGestao.dimensions.map((name,i)=>`<h3>${esc(name)}</h3>${MaturidadeGestao.questions.filter(q=>q.dimension===i).map(q=>`<p class="mg-historical-answer"><strong>${q.number}. ${esc(q.title)}</strong><br>${esc(q.options[record.answers[q.id]-1] || 'Não respondida')}</p>`).join('')}<p class="mg-historical-answer"><strong>Evidências:</strong> ${esc(record.notes?.[i] || 'Não informadas')}</p>`).join('')}</section>`;
  }catch(e){document.getElementById('mg-error').textContent=e.message;}
}
function maturidadeGestaoConfirmDelete(){
  if(!maturidadeGestaoCanEdit() || _mg?.saving || !_mg?.expected)return;
  const selected=document.getElementById('mg-history')?.value || '';
  const entry=_mg.history.find(item=>item.id===selected);
  confirmar('Excluir '+(entry?'a avaliação "'+entry.title+'"':_mg.status==='rascunho'?'este rascunho':'esta avaliação')+'? O resultado e seu registro no histórico serão apagados.',()=>maturidadeGestaoDelete(selected));
}
async function maturidadeGestaoDelete(selected=''){
  if(!maturidadeGestaoCanEdit() || _mg?.saving || !_mg?.expected)return;
  const state=_mg,author=usuarioLogado?.email || usuarioLogado?.nome || '';
  try{
    if(!fbReady() || !globalThis._fbLoadedAt)throw Error('Conecte-se para excluir a avaliação.');
    state.saving=true;document.querySelectorAll('#maturidade-gestao-content button,#maturidade-gestao-content select').forEach(el=>el.disabled=true);
    const current=JSON.parse(state.expected),history=current.history || [];
    const currentId=current.status==='concluida'?(current.id || history.findLast(item=>item.date===current.date)?.id):null;
    const target=selected || currentId;
    if(selected && !history.some(item=>item.id===selected))throw Error('Avaliação não encontrada no histórico.');
    const remaining=history.filter(item=>item.id!==target),replaceCurrent=!selected || currentId===selected;
    const restoreId=replaceCurrent?remaining.at(-1)?.id:null;
    let replacement;
    const api=fb();
    await api.runTransaction(api.db,async transaction=>{
      if(_mg!==state || !maturidadeGestaoCanEdit() || (usuarioLogado?.email || usuarioLogado?.nome || '')!==author)throw Error('A sessão foi alterada. Reabra a avaliação.');
      const ref=configRepository.ref('maturidade_gestao'),snapshot=await transaction.get(ref);
      if((snapshot.exists()?snapshot.data().data || null:null)!==state.expected)throw Error('Outra pessoa atualizou a avaliação. Recarregue antes de excluir.');
      let restored=null;
      if(restoreId){const doc=await transaction.get(configRepository.ref('maturidade_gestao_'+restoreId));if(!doc.exists())throw Error('Não foi possível recuperar a avaliação anterior.');restored=JSON.parse(doc.data().data);}
      replacement=replaceCurrent?restored?{...restored,id:restoreId,history:remaining}:null:{...current,history:remaining};
      if(target)transaction.delete(configRepository.ref('maturidade_gestao_'+target));
      if(replacement)transaction.set(ref,{data:JSON.stringify(replacement)});else transaction.delete(ref);
      transaction.set(configRepository.ref('last_modified'),{ts:Date.now(),by:author});
    });
    if(_mg!==state)return;_mg=null;await rMaturidadeGestao();toast('Avaliação excluída.','var(--teal)');
  }catch(e){if(_mg===state){state.saving=false;maturidadeGestaoRender();document.getElementById('mg-error').textContent=e.message;}}
  finally{state.saving=false;}
}
