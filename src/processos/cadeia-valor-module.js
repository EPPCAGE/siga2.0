let _cadeiaState=null;
function cadeiaCanEdit(){return isEP() && !['dono','gestor'].includes(usuarioLogado?.perfil);}
function cadeiaDefaults(){
  if(!/cage/i.test(ORG_CONFIG?.institutionName || ''))return {nome:'Cadeia de valor'};
  return {nome:'Cadeia de valor da CAGE',missao:'Aprimorar a governança e a transparência para viabilizar as políticas públicas do Estado',visao:'Ser reconhecida pela excelência na promoção da transparência e da integridade e pela colaboração para a implementação de políticas públicas efetivas',valores:['Integridade','Transparência','Inovação','Colaboração','Excelência','Imparcialidade','Valorização das pessoas'],entregas:['Contribuição para a viabilização de políticas públicas','Aprimoramento e credibilidade da gestão','Fortalecimento da estrutura de controle do Estado','Integridade pública e privada','Transparência','Qualidade da informação contábil']};
}
function cadeiaDiagramHtml(chain){
  const icon=type=>({gestao:'<path d="M7 30h30M10 30V20h7v10M21 30V12h7v18M32 30V5h7v25"/>',finalistico:'<circle cx="24" cy="24" r="18"/><circle cx="24" cy="24" r="10"/><path d="M24 24 41 7M32 7h9v9"/>',apoio:'<path d="M5 30h8l9 6h12l9-10M12 30V20h8l8 6h8M18 12h15M25 5v14"/>'})[type];
  return `<div class="chain-preview-scroll"><article class="chain-diagram"><header class="chain-diagram-header"><img src="${esc(/cage/i.test(ORG_CONFIG?.institutionName || '')?'cage-logo.png':ORG_CONFIG?.logos?.organization || 'logo-siga.png')}" alt="${esc(ORG_CONFIG?.institutionName || 'Organização')}"><h2>${esc(chain.nome || 'Cadeia de valor')}</h2><div class="chain-diagram-version">${esc(ORG_CONFIG?.institutionName || '')}${chain.versao?`<br>Versão ${chain.versao}`:''}</div></header><div class="chain-diagram-content"><div class="chain-diagram-main"><div class="chain-guides"><section><h3 class="chain-section-title">Norteadores</h3><div class="chain-guides-body"><div><h4>Missão</h4><p>${esc(chain.missao || 'Defina a missão')}</p></div><div><h4>Visão</h4><p>${esc(chain.visao || 'Defina a visão')}</p></div></div></section><section><h3 class="chain-section-title">Valores</h3><ul class="chain-values">${chain.valores.map(value=>`<li>${esc(value)}</li>`).join('') || '<li>Defina os valores</li>'}</ul></section></div>${Object.entries(CadeiaValor.categories).map(([type,label])=>{const macros=chain.macros.filter(m=>m.categoria===type);return `<section class="chain-lane ${type}"><div class="chain-lane-label"><svg class="chain-lane-icon" viewBox="0 0 48 48" fill="none" stroke="white" stroke-width="2" aria-hidden="true">${icon(type)}</svg><span>${label}</span></div><div class="chain-lane-items" style="--chain-cols:${type==='finalistico' && macros.length>4?3:Math.min(2,Math.max(1,macros.length))}">${macros.map(m=>`<div class="chain-lane-item">${esc(m.nome)}</div>`).join('') || '<div class="chain-lane-item chain-lane-empty">Nenhum macroprocesso nesta categoria</div>'}</div></section>`;}).join('')}</div><aside class="chain-deliveries"><h3 class="chain-section-title">Entregas de valor</h3><ul>${chain.entregas.map(value=>`<li>${esc(value)}</li>`).join('') || '<li>Defina as entregas de valor</li>'}</ul></aside></div></article></div>`;
}
async function rCadeiaValor(){
  const root=document.getElementById('cadeia-content');if(!root)return;
  const identity=(usuarioLogado?.email || '')+'|'+(globalThis.TENANT_CONFIG?.tenantId || 'default');
  if(_cadeiaState?.identity===identity){
    if(!_cadeiaState.editing && _cadeiaState.baseArchitecture!==JSON.stringify(ARQUITETURA)){_cadeiaState=null;return rCadeiaValor();}
    cadeiaRender();return;
  }
  const state={identity,details:cadeiaDefaults(),history:[],expectedDetails:null,expectedArchitecture:null,baseArchitecture:JSON.stringify(ARQUITETURA),editing:false,ready:false};
  _cadeiaState=state;root.innerHTML='<div class="ib ibb">Carregando cadeia de valor...</div>';
  try{
    if(fbReady()){
      const [chainDoc,architectureDoc]=await Promise.all([configRepository.get('cadeia_valor'),configRepository.get('arquitetura')]);
      state.expectedDetails=chainDoc.exists()?chainDoc.data().data || null:null;
      state.expectedArchitecture=architectureDoc.exists()?architectureDoc.data().data || null:null;
      if(state.expectedDetails){state.details=JSON.parse(state.expectedDetails);state.history=state.details.historico || [];}
    }
    if(_cadeiaState!==state)return;
    state.chain=CadeiaValor.initial(ARQUITETURA,state.details);state.ready=true;cadeiaRender();
  }catch(error){root.innerHTML=`<div class="ib iba">Não foi possível carregar a cadeia de valor. ${esc(error.message)}</div><button type="button" class="btn" onclick="cadeiaReload()">Tentar novamente</button>`;}
}
function cadeiaReload(){_cadeiaState=null;return rCadeiaValor();}
function cadeiaHasChanges(){
  const state=_cadeiaState;if(!state?.ready)return false;
  const snapshot=chain=>JSON.stringify({nome:chain.nome,missao:chain.missao,visao:chain.visao,valores:chain.valores,entregas:chain.entregas,macros:chain.macros,desdobramentos:ARQUITETURA.flatMap(m=>(m.processos || []).map(p=>[String(p.id),String(chain.desdobramentos?.[String(p.id)] ?? m.id)]))});
  return snapshot(state.chain)!==snapshot(CadeiaValor.initial(ARQUITETURA,state.details));
}
function cadeiaPreviewHtml(){
  const draft=cadeiaHasChanges();
  return (draft?'<div class="chain-draft" role="status"><strong>Rascunho — alterações não salvas.</strong> Salve a cadeia para atualizar a versão compartilhada.'+(!_cadeiaState.editing?'<div class="chain-draft-actions"><button type="button" class="btn" onclick="cadeiaSetEditing(true)">Continuar edição e salvar</button><button type="button" class="btn" onclick="cadeiaDiscard()">Descartar alterações</button></div>':'')+'</div>':'')+cadeiaDiagramHtml(_cadeiaState.chain);
}
function cadeiaRender(){
  const state=_cadeiaState,root=document.getElementById('cadeia-content');if(!state?.ready || !root)return;
  const canEdit=cadeiaCanEdit(),chain=state.chain;
  root.innerHTML=`<div class="chain-tabs"><button type="button" class="btn ${state.editing?'':'on'}" onclick="cadeiaSetEditing(false)">Visualizar cadeia</button>${canEdit?'<button type="button" class="btn '+(state.editing?'on':'')+'" onclick="cadeiaSetEditing(true)">Construir cadeia</button>':''}<button type="button" class="btn" onclick="cadeiaPrint()">Imprimir / salvar PDF</button><button type="button" class="btn" onclick="go('arq',document.getElementById('nb-arq'))">Desdobrar na arquitetura</button></div>${state.history.length?`<div class="fg chain-history"><label class="fl" for="cadeia-history">Versões da cadeia</label><select class="fi" id="cadeia-history" onchange="cadeiaHistory(this.value)"><option value="">Cadeia atual</option>${state.history.slice().reverse().map(v=>`<option value="${esc(v.id)}">Versão ${v.versao} · ${esc(v.nome)} · ${esc(new Date(v.data).toLocaleDateString('pt-BR'))}</option>`).join('')}</select></div>`:''}<p class="chain-error" id="cadeia-error" role="alert"></p>${state.editing && canEdit?`<form class="chain-editor" id="cadeia-form"><div class="card"><div class="card-t">1. Identidade e norteadores</div><div class="fg"><label class="fl" for="cv-nome">Nome da cadeia</label><input class="fi" id="cv-nome" value="${esc(chain.nome)}" required></div><div class="g2"><div class="fg"><label class="fl" for="cv-missao">Missão</label><textarea class="fi" id="cv-missao" rows="4" required>${esc(chain.missao)}</textarea></div><div class="fg"><label class="fl" for="cv-visao">Visão</label><textarea class="fi" id="cv-visao" rows="4" required>${esc(chain.visao)}</textarea></div></div></div><div class="card"><div class="card-t">2. Valores e entregas de valor</div><p>Informe um item por linha. A ordem informada será usada no desenho.</p><div class="g2"><div class="fg"><label class="fl" for="cv-valores">Valores</label><textarea class="fi" id="cv-valores" rows="7" required>${esc(chain.valores.join('\n'))}</textarea></div><div class="fg"><label class="fl" for="cv-entregas">Entregas de valor</label><textarea class="fi" id="cv-entregas" rows="7" required>${esc(chain.entregas.join('\n'))}</textarea></div></div></div><div class="card"><div class="card-t">3. Macroprocessos</div><p>Os macroprocessos existentes mantêm seus processos, subprocessos e vínculos. Novos macroprocessos serão criados na arquitetura para desdobramento.</p><div id="cv-macros"></div><button type="button" class="btn" onclick="cadeiaAddMacro()">+ Adicionar macroprocesso</button></div><div class="btn-row"><button type="button" class="btn" onclick="cadeiaDiscard()">Descartar alterações</button><button type="submit" class="btn btn-p" id="cv-save">Salvar cadeia e arquitetura</button></div></form><div class="card-t" style="margin-top:24px">Prévia automática</div>`:''}<div id="cadeia-preview">${cadeiaDiagramHtml(chain)}</div>`;
  if(state.editing && canEdit){
    const section=document.createElement('div');section.className='card';section.id='cv-desdobramentos';
    root.querySelector('.btn-row').before(section);
    cadeiaRenderMacros();cadeiaRenderAssignments();
    root.querySelector('form').onsubmit=cadeiaSave;
    root.querySelector('form').addEventListener('input',cadeiaPreview);
    root.querySelector('form').addEventListener('change',cadeiaPreview);
    root.querySelector('#cadeia-history')?.setAttribute('disabled','');
  }
  const unclassified=chain.macros.filter(m=>!m.categoria);
  document.getElementById('cadeia-preview').innerHTML=cadeiaPreviewHtml();
  if(unclassified.length)document.getElementById('cadeia-error').textContent='Classifique os macroprocessos ainda sem categoria: '+unclassified.map(m=>m.nome).join('; ')+'.';
}
function cadeiaSetEditing(editing){
  if(editing && !cadeiaCanEdit())return;
  if(_cadeiaState.editing && document.getElementById('cadeia-form'))cadeiaRead();
  _cadeiaState.editing=editing;cadeiaRender();
}
function cadeiaRead(){
  const state=_cadeiaState;if(!state?.editing)return state?.chain;
  const previousMacros=new Map(state.chain.macros.map(m=>[m.id,m]));
  const lines=id=>document.getElementById(id).value.split('\n').map(s=>s.trim()).filter(Boolean);
  state.chain={...state.chain,nome:document.getElementById('cv-nome').value.trim(),missao:document.getElementById('cv-missao').value.trim(),visao:document.getElementById('cv-visao').value.trim(),valores:lines('cv-valores'),entregas:lines('cv-entregas'),macros:Array.from(document.querySelectorAll('.chain-macro-row')).map(row=>({id:row.dataset.id,nome:row.querySelector('[data-macro-name]').value.trim(),categoria:row.querySelector('[data-macro-category]').value}))};
  state.chain.desdobramentos=Object.fromEntries(Array.from(document.querySelectorAll('[data-process-id]')).map(select=>[select.dataset.processId,select.value]));
  state.chain.macros.forEach(m=>{
    const previous=previousMacros.get(m.id);
    m.entregas_valor=CadeiaValor.deliveriesFor({...m,...(previous?{entregas_valor:previous.entregas_valor}:{})},state.chain.entregas);
  });
  return state.chain;
}
function cadeiaPreview(){
  const chain=cadeiaRead();document.getElementById('cadeia-preview').innerHTML=cadeiaPreviewHtml();
  document.querySelectorAll('[data-process-id] option').forEach(option=>{
    const macro=chain.macros.find(m=>m.id===option.value);if(macro)option.textContent=macro.nome || 'Novo macroprocesso';
  });
}
function cadeiaRenderAssignments(){
  const section=document.getElementById('cv-desdobramentos');if(!section)return;
  const chain=_cadeiaState.chain,assignments=chain.desdobramentos || {};
  section.innerHTML='<div class="card-t">4. Reorganizar os processos existentes</div><p>Escolha o macroprocesso de destino. Os subprocessos e vínculos acompanham o processo.</p>'+ARQUITETURA.flatMap(m=>(m.processos || []).map(p=>{
    const destination=String(assignments[String(p.id)] ?? m.id),valid=chain.macros.some(dest=>String(dest.id)===destination);
    return `<div class="chain-assignment"><label class="fl" for="cv-dest-${esc(p.id)}">${esc(p.nome)}</label><select class="fi" id="cv-dest-${esc(p.id)}" data-process-id="${esc(p.id)}" required><option value="" ${valid?'':'selected'} disabled>Selecione um macroprocesso de destino</option>${chain.macros.map(dest=>`<option value="${esc(dest.id)}" ${destination===String(dest.id)?'selected':''}>${esc(dest.nome || 'Novo macroprocesso')}</option>`).join('')}</select></div>`;
  })).join('');
  section.querySelectorAll('select').forEach(select=>select.addEventListener('change',()=>{
    _cadeiaState.chain.desdobramentos={..._cadeiaState.chain.desdobramentos,[select.dataset.processId]:select.value};
  }));
}
function cadeiaRenderMacros(){
  document.getElementById('cv-macros').innerHTML=_cadeiaState.chain.macros.map((m,index)=>{const count=ARQUITETURA.find(a=>String(a.id)===m.id)?.processos?.length || 0;return `<div class="chain-macro-row" data-id="${esc(m.id)}"><div class="fg"><label class="fl" for="cv-macro-${index}">Macroprocesso</label><input class="fi" id="cv-macro-${index}" data-macro-name value="${esc(m.nome)}" required><span class="chain-macro-count">${count} processos existentes</span></div><div class="fg"><label class="fl" for="cv-category-${index}">Categoria</label><select class="fi" id="cv-category-${index}" data-macro-category required><option value="">Selecione</option>${Object.entries(CadeiaValor.categories).map(([v,label])=>`<option value="${v}" ${m.categoria===v?'selected':''}>${label}</option>`).join('')}</select></div><div class="chain-macro-actions"><button type="button" class="btn" aria-label="Mover macroprocesso para cima" onclick="cadeiaMoveMacro(${index},-1)" ${index===0?'disabled':''}>↑</button><button type="button" class="btn" aria-label="Mover macroprocesso para baixo" onclick="cadeiaMoveMacro(${index},1)" ${index===_cadeiaState.chain.macros.length-1?'disabled':''}>↓</button><button type="button" class="btn" aria-label="Remover macroprocesso" onclick="cadeiaRemoveMacro(${index})" ${count?'disabled title="Preserve ou reorganize os processos deste macroprocesso na arquitetura"':''}>×</button></div></div>`;}).join('');
}
function cadeiaAddMacro(){if(!cadeiaCanEdit())return;cadeiaRead();_cadeiaState.chain.macros.push({id:'m-'+crypto.randomUUID(),nome:'',categoria:''});cadeiaRenderMacros();cadeiaRenderAssignments();cadeiaPreview();}
function cadeiaMoveMacro(index,offset){if(!cadeiaCanEdit())return;cadeiaRead();const rows=_cadeiaState.chain.macros,other=index+offset;if(other<0 || other>=rows.length)return;[rows[index],rows[other]]=[rows[other],rows[index]];cadeiaRenderMacros();cadeiaPreview();}
function cadeiaRemoveMacro(index){
  if(!cadeiaCanEdit())return;cadeiaRead();const chain=_cadeiaState.chain,m=chain.macros[index];
  if(!m || ARQUITETURA.find(a=>String(a.id)===m.id)?.processos?.length)return;
  chain.macros.splice(index,1);
  Object.keys(chain.desdobramentos || {}).forEach(id=>{if(chain.desdobramentos[id]===m.id)chain.desdobramentos[id]='';});
  cadeiaRenderMacros();cadeiaRenderAssignments();cadeiaPreview();
}
function cadeiaDiscard(){_cadeiaState.chain=CadeiaValor.initial(ARQUITETURA,_cadeiaState.details);_cadeiaState.editing=false;cadeiaRender();}
async function cadeiaSave(event){
  event.preventDefault();if(!cadeiaCanEdit())return;
  const state=_cadeiaState,error=document.getElementById('cadeia-error'),button=document.getElementById('cv-save');error.textContent='';
  try{
    const chain=cadeiaRead();CadeiaValor.validate(chain);
    if(JSON.stringify(ARQUITETURA)!==state.baseArchitecture)throw Error('A arquitetura foi alterada durante a edição. Recarregue a cadeia antes de salvar.');
    const merged=CadeiaValor.merge(ARQUITETURA,chain),renamed=CadeiaValor.renamedProcesses(processos,merged);
    if(!fbReady() || !globalThis._fbLoadedAt)throw Error('Conecte-se para salvar a cadeia e a arquitetura compartilhadas.');
    button.disabled=true;
    const id='cv-'+crypto.randomUUID(),date=new Date().toISOString(),version=(state.details.versao || 0)+1;
    const details={nome:chain.nome,missao:chain.missao,visao:chain.visao,valores:chain.valores,entregas:chain.entregas,versao:version,atualizado_em:date,atualizado_por:usuarioLogado?.email || '',historico:[...state.history,{id,versao:version,nome:chain.nome,data:date}]};
    const api=fb(),config=FirestoreRepositories.config;
    await api.runTransaction(api.db,async transaction=>{
      const [chainDoc,archDoc]=await Promise.all([transaction.get(config.ref('cadeia_valor')),transaction.get(config.ref('arquitetura'))]);
      if((chainDoc.exists()?chainDoc.data().data || null:null)!==state.expectedDetails || (archDoc.exists()?archDoc.data().data || null:null)!==state.expectedArchitecture)throw Error('Outra pessoa atualizou a cadeia ou a arquitetura. Recarregue antes de salvar.');
      const processDocs=await Promise.all(renamed.map(item=>transaction.get(processosRepository.ref(item.process.id))));
      transaction.set(config.ref('cadeia_valor'),{data:JSON.stringify(details)});
      transaction.set(config.ref('arquitetura'),{data:JSON.stringify(merged)});
      transaction.set(config.ref('cadeia_valor_'+id),{data:JSON.stringify({cadeia:{...details,macros:chain.macros},arquitetura:merged})});
      transaction.set(config.ref('last_modified'),{ts:Date.now(),by:usuarioLogado?.email || ''});
      renamed.forEach((item,index)=>{if(processDocs[index].exists())transaction.update(processosRepository.ref(item.process.id),{macro:item.macro});});
    });
    ARQUITETURA=merged;renamed.forEach(item=>{
      item.process.macro=item.macro;
      const current=processos.find(p=>p.id===item.process.id);if(current)current.macro=item.macro;
    });_fbConfigCache.set('arquitetura',JSON.stringify(merged));
    state.details=details;state.history=details.historico;state.expectedDetails=JSON.stringify(details);state.expectedArchitecture=JSON.stringify(merged);state.baseArchitecture=JSON.stringify(merged);state.chain=CadeiaValor.initial(merged,details);state.editing=false;
    rArqPopulateFilters();cadeiaRender();toast('Cadeia de valor e arquitetura salvas.','var(--teal)');
  }catch(e){error.textContent=e.message;button.disabled=false;}
}
async function cadeiaHistory(id){
  const target=document.getElementById('cadeia-preview'),error=document.getElementById('cadeia-error');error.textContent='';
  const token=Symbol();target._historyToken=token;
  if(!id){target.innerHTML=cadeiaPreviewHtml();return;}
  try{const doc=await configRepository.get('cadeia_valor_'+id);if(!doc.exists())throw Error('Versão não encontrada.');const data=JSON.parse(doc.data().data);if(target._historyToken===token){target.innerHTML='<div class="ib ibb">Versão histórica para consulta. A arquitetura atual permanece ativa.</div>'+cadeiaDiagramHtml(data.cadeia);}}
  catch(e){error.textContent=e.message;}
}
function cadeiaPrint(){
  const target=document.getElementById('cadeia-preview');if(!target)return;
  const win=window.open('','_blank');if(!win){toast('Permita a abertura da janela para imprimir.','var(--amber)');return;}
  win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><base href="${esc(location.href)}"><title>Cadeia de valor</title><link rel="stylesheet" href="fonts/fonts.css"><link rel="stylesheet" href="src/processos/cadeia-valor.css"><style>:root{--f:'DM Sans',system-ui,sans-serif}body{margin:0;padding:10mm}@page{size:A3 landscape;margin:10mm}</style></head><body>${target.innerHTML}</body></html>`);win.document.close();win.onload=async()=>{await win.document.fonts.ready;await Promise.all(Array.from(win.document.images).map(img=>img.decode().catch(()=>{})));win.print();};
}
