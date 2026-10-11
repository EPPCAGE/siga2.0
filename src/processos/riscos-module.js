function riscosCanEdit(){return isEP() && !['dono','gestor'].includes(usuarioLogado?.perfil);}
function riscosControlLabel(value){return ({existente:'Já implementado',projeto:'Implementação por projeto',plano_acao:'Implementação por plano de ação',aceitacao:'Aceitação sem controles'})[value] || value || '';}
function riscosToday(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function riscosLabel(value){return ({sim:'Sim',nao:'Não',Media:'Média',Medio:'Médio',Critico:'Crítico',nao_confirmado:'Situação não confirmada'})[value] || Riscos.levels[value] || Riscos.statuses[value] || value;}
function riscosFilters(){return Object.fromEntries(['prob','imp','area','macro','processId','status','level','critical','query'].map(field=>{
  const element=document.getElementById('riscos-'+field);
  return [field,field==='query'?element?.value || '':Array.from(element?.selectedOptions || []).map(option=>option.value).filter(Boolean)];
}));}
function riscosMultiFilter(select){
  select.multiple=true;
  select.hidden=true;
  const parent=select.parentElement;
  let dropdown=parent.querySelector('.risk-multi');
  const open=dropdown?.open || false;
  if(!dropdown){dropdown=document.createElement('details');dropdown.className='risk-multi';parent.appendChild(dropdown);}
  const options=Array.from(select.options).filter(option=>option.value);
  const selected=options.filter(option=>option.selected);
  dropdown.innerHTML=`<summary>${esc(selected.length===1?selected[0].textContent:selected.length?selected.length+' selecionados':'Todos')}</summary><div class="risk-multi-options"><button type="button" class="btn risk-multi-clear">Limpar seleção</button>${options.map(option=>`<label><input type="checkbox" value="${esc(option.value)}" ${option.selected?'checked':''}>${esc(option.textContent)}</label>`).join('')}</div>`;
  dropdown.open=open;
  const summary=dropdown.querySelector('summary');
  summary.id=select.id+'-summary';
  summary.setAttribute('aria-labelledby',select.id.replace('riscos-','riscos-label-')+' '+summary.id);
  dropdown.querySelector('.risk-multi-clear').onclick=()=>{for(const option of select.options)option.selected=false;rRiscos();};
  dropdown.querySelectorAll('input').forEach(input=>{input.onchange=()=>{
    const option=Array.from(select.options).find(option=>option.value===input.value);if(option)option.selected=input.checked;
    for(const empty of select.options)if(!empty.value)empty.selected=false;
    rRiscos();
  };});
}
function riscosMatrixHtml(rows,title){
  const cells=Riscos.matrix(rows);
  const excluded=rows.filter(row=>!row.prob || !row.imp).length;
  return `<div class="risk-matrix"><h3>${esc(title)}</h3><div class="risk-matrix-scroll"><table><caption>Probabilidade × impacto · ${rows.length} riscos${excluded?' · '+excluded+' sem classificação completa':''}</caption><thead><tr><th scope="col">Probabilidade</th>${Riscos.impacts.map(imp=>`<th scope="col">${riscosLabel(imp)}</th>`).join('')}</tr></thead><tbody>${cells.map(line=>`<tr><th scope="row">${riscosLabel(line[0].prob)}</th>${line.map(cell=>`<td class="risk-zone-${Riscos.level(cell.prob,cell.imp)}" title="${riscosLabel(cell.prob)} / ${riscosLabel(cell.imp)}: ${cell.count} riscos">${cell.count}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="risk-legend" aria-label="Legenda dos níveis de risco" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">${Object.entries(Riscos.levels).map(([level,label])=>`<span class="risk-zone-${level}" style="padding:5px 12px;border-radius:6px;font-size:12px;font-weight:600">${label}</span>`).join('')}</div><p>Impacto → · As cores representam a classificação inerente; os números mostram a quantidade de riscos.</p></div>`;
}
function riscosCoverageHtml(rows,context='Riscos nos filtros selecionados'){
  const coverage=Riscos.coverage(rows),pct=coverage.total?coverage.withTreatment/coverage.total*100:0;
  const format=value=>Number(value.toFixed(1)).toLocaleString('pt-BR')+'%';
  return `<section class="card risk-coverage"><div class="card-t">Tratamento dos riscos altos/críticos</div><p class="risk-form-help">${esc(context)}</p><div class="risk-coverage-body"><svg class="risk-donut" viewBox="0 0 180 180" role="img" aria-label="${coverage.total} riscos altos ou críticos: ${coverage.withTreatment} com tratamento e ${coverage.withoutTreatment} sem tratamento"><circle cx="90" cy="90" r="65" fill="none" stroke="${coverage.total?'#dc2626':'var(--bdr)'}" stroke-width="24"/>${coverage.withTreatment?`<circle cx="90" cy="90" r="65" fill="none" stroke="#0d9488" stroke-width="24" pathLength="100" stroke-dasharray="${pct} ${100-pct}" transform="rotate(-90 90 90)"/>`:''}<text x="90" y="88" text-anchor="middle" class="risk-donut-total">${coverage.total}</text><text x="90" y="110" text-anchor="middle" class="risk-donut-caption">Alto/crítico</text></svg><div class="risk-coverage-legend"><div><span class="risk-coverage-dot" style="background:#0d9488"></span>Com tratamento <strong data-coverage="with">${coverage.withTreatment}</strong><span>${format(pct)}</span></div><div><span class="risk-coverage-dot" style="background:#dc2626"></span>Sem tratamento <strong data-coverage="without">${coverage.withoutTreatment}</strong><span>${format(coverage.total?100-pct:0)}</span></div>${coverage.total?'':'<p class="risk-form-help">Nenhum risco alto ou crítico neste recorte.</p>'}</div></div><p class="risk-form-help">Com tratamento: planejado, em tratamento ou implementado. Registros sem situação confirmada são contabilizados sem tratamento.</p></section>`;
}
function rRiscos(){
  const container=document.getElementById('riscos-content');if(!container)return;
  const all=Riscos.rows(processos,ARQUITETURA,isCritico),filters=riscosFilters();
  for(const field of ['area','macro','processId']){
    const select=document.getElementById('riscos-'+field);if(!select)continue;
    const values=[...new Map(all.map(row=>[row[field],field==='processId'?row.processName:row[field]])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'));
    select.multiple=true;
    select.innerHTML=values.map(([value,label])=>`<option value="${esc(value)}" ${filters[field].includes(value)?'selected':''}>${esc(label)}</option>`).join('');
  }
  for(const field of ['prob','imp','area','macro','processId','status','level','critical'])riscosMultiFilter(document.getElementById('riscos-'+field));
  const rows=Riscos.filter(all,filters),summary=Riscos.summary(rows,riscosToday());
  const stats=[['Riscos no filtro',summary.total],['Nível alto/crítico',summary.priority],['Alto/crítico sem tratamento',summary.untreated],['Alto/crítico em execução',summary.running],['Alto/crítico implementados',summary.treated]];
  container.innerHTML=`<div class="risk-stats">${stats.map(([label,count])=>`<div class="card"><strong>${count}</strong><span>${label}</span></div>`).join('')}</div>
    ${riscosCoverageHtml(rows)}
    ${riscosMatrixHtml(rows,'Matriz consolidada')}
    <h2 class="risk-list-title">Riscos e tratamentos (${rows.length})</h2><div class="risk-list">${rows.map(row=>`<article class="card risk-item"><h3>${esc(row.risk.desc || row.risk.descricao || 'Risco sem descrição')}</h3><p>Processo: ${esc(row.processName)}<br>Área: ${esc(row.area)} · Macroprocesso: ${esc(row.macro)}</p><div class="risk-tags"><span class="badge bgr">Probabilidade: ${riscosLabel(row.prob) || 'Não informada'}</span><span class="badge bgr">Impacto: ${riscosLabel(row.imp) || 'Não informado'}</span><span class="badge ${row.status==='implementado'?'bg':'ba'}">${riscosLabel(row.status)}</span></div>${riscoControlesHtml(row.risk)}${riscosTreatmentCatalogHtml(row.risk)}${row.risk.tratamento?`<p><strong>Tratamento:</strong> ${esc(row.risk.tratamento)}</p>`:''}${row.risk.acao_tratamento?`<p class="risk-text">${esc(row.risk.acao_tratamento)}</p>`:''}<p>Responsável: ${esc(row.risk.responsavel_tratamento || 'Não informado')} · Prazo: ${esc(row.risk.prazo_tratamento || 'Não informado')}${row.status!=='implementado' && row.risk.prazo_tratamento && row.risk.prazo_tratamento<riscosToday()?' · Vencido':''}</p>${row.risk.controle_origem?`<p><strong>Controle:</strong> ${esc(riscosControlLabel(row.risk.controle_origem))}${row.risk.controle_referencia?` · ${esc(row.risk.controle_referencia)}`:''}</p>`:''}${row.risk.evidencia_tratamento?`<p class="risk-text"><strong>Verificação:</strong> ${esc(row.risk.evidencia_tratamento)}</p>`:''}<div class="btn-row"><button type="button" class="btn" data-pid="${esc(row.processId)}" onclick="riscosOpenProcess(this.dataset.pid)">Sobre o processo</button>${riscosCanEdit()?`<button type="button" class="btn btn-p" data-pid="${esc(row.processId)}" data-index="${row.index}" onclick="riscosEdit(this.dataset.pid,Number(this.dataset.index))">Registrar tratamento</button>`:''}</div></article>`).join('') || '<div class="ib ibb">Nenhum risco encontrado para os filtros.</div>'}</div>`;
}
function riscosOpenProcess(id){const process=processos.find(p=>String(p.id)===String(id));if(process)abrirInfoMeusProc(process.arq_id,process.id);}
function riscosReportHtml(rows,filters,issuedAt=new Date(),cageLogo=''){
  const date=value=>value && /^\d{4}-\d{2}-\d{2}$/.test(value)?value.split('-').reverse().join('/'):value || 'Não informado';
  const summary=Riscos.summary(rows,riscosToday());
  const filterLabels={prob:'Probabilidade',imp:'Impacto',processId:'Processo',area:'Área',macro:'Macroprocesso',level:'Nível de risco',critical:'Processo crítico',status:'Situação',query:'Palavra-chave'};
  const filterText=Object.entries(filterLabels).map(([field,label])=>{
    const values=filters[field];
    const names=field==='query'?values || 'Todas':(values || []).map(value=>field==='processId'?processos.find(p=>String(p.id)===value)?.nome || value:riscosLabel(value)).join(', ') || 'Todos';
    return `<div><strong>${label}:</strong> ${esc(names)}</div>`;
  }).join('');
  const issued=issuedAt.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de riscos — ${riscosToday()}</title><style>
    ${globalThis.RelatorioExecutivoCss || ''}
    body{line-height:1.55}.cover-title{font-size:28pt}.meta{font-size:8.5pt;color:#607089}.filters{margin:12px 0}.filters h3{font-size:10pt;color:#2B485F;margin-bottom:8px}.filters>div{margin-bottom:4px}.kpis{grid-template-columns:repeat(4,1fr)}.risk-report-item{border:1px solid var(--pdf-card-border);border-left:5px solid #00C5B4;border-radius:12px;padding:16px;margin:14px 0;break-inside:avoid;background:var(--pdf-card-bg)}.risk-report-item h3{font-size:12pt;color:#17324a;margin-bottom:12px;line-height:1.4}.risk-report-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;font-size:9pt}.risk-report-item p{margin-top:10px;font-size:9pt}.text{white-space:pre-wrap;overflow-wrap:anywhere}.risk-matrix{break-inside:avoid}.risk-matrix table{border-collapse:separate;border-spacing:5px}.risk-matrix td{text-align:center;font-size:20pt;padding:16px;font-weight:700;border:0;border-radius:8px}.risk-matrix th{border-radius:5px}.risk-matrix caption{font-size:9pt;text-align:left;margin:8px 0}.risk-matrix p{font-size:8pt;color:#607089}.risk-zone-low{background:#d1fae5;color:#065f46}.risk-zone-moderate{background:#fef3c7;color:#92400e}.risk-zone-high{background:#ffedd5;color:#9a3412}.risk-zone-critical{background:#fee2e2;color:#991b1b}.report-toolbar{padding:10px 16px;background:#1E3A5F;color:#fff;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;font-size:10pt}.report-toolbar button{padding:8px 14px;border:0;border-radius:5px;cursor:pointer}.report-status{display:inline-block;margin-bottom:10px;padding:4px 10px;border-radius:99px;background:#fff;border:1px solid var(--pdf-card-border);font-size:8.5pt;font-weight:700;color:#2B485F}
  </style></head><body><div class="no-print report-toolbar"><span>Relatório Executivo · Riscos</span><button onclick="window.print()">Imprimir / Salvar PDF</button></div><header class="cover"><div style="display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:16px;position:relative;z-index:1"><div class="cover-eyebrow">CAGE · Gestão de riscos</div>${cageLogo?`<img src="${esc(cageLogo)}" alt="CAGE" style="height:64px;max-width:150px;object-fit:contain">`:''}</div><h1 class="cover-title">Relatório Executivo</h1><div class="cover-sub">Riscos dos processos e acompanhamento dos tratamentos</div><div class="cover-meta"><span>Emitido em ${esc(issued)} · Brasília</span><span>${rows.length} riscos no recorte selecionado</span></div></header>
    <h2 class="sec">1. Panorama dos riscos</h2><div class="executive-hero"><div class="hero-title">Exposição e tratamento</div><p class="hero-note">Os destaques de tratamento e atraso consideram riscos de probabilidade média ou alta.</p></div>
    <div class="kpis">${[['Riscos filtrados',summary.total],['Nível alto/crítico',summary.priority],['Alto/crítico sem tratamento',summary.untreated],['Alto/crítico em execução',summary.running],['Alto/crítico com prazo vencido',summary.overdue],['Alto/crítico implementados',summary.treated],['Dados a confirmar',summary.unconfirmed]].map(([label,count])=>`<div class="kpi"><div class="kpi-val">${count}</div><div class="kpi-lbl">${label}</div></div>`).join('')}</div>
    <h2 class="sec">2. Recorte da avaliação</h2><div class="card filters"><h3>Filtros aplicados</h3>${filterText}</div>
    <h2 class="sec">3. Matriz de riscos</h2><div class="chart-card">${riscosMatrixHtml(rows,'Probabilidade × impacto')}<p class="meta">Classificação inerente, independentemente da situação de tratamento.</p></div>
    <h2 class="sec">4. Riscos e tratamentos (${rows.length})</h2>${rows.map((row,index)=>{
      const risk=row.risk,overdue=row.status!=='implementado' && risk.prazo_tratamento && risk.prazo_tratamento<riscosToday();
      return `<article class="risk-report-item"><h3>${index+1}. ${esc(risk.desc || risk.descricao || 'Risco sem descrição')}</h3><div class="risk-report-fields"><div><strong>Processo:</strong> ${esc(row.processName)}</div><div><strong>Área:</strong> ${esc(row.area)}</div><div><strong>Macroprocesso:</strong> ${esc(row.macro)}</div><div><strong>Probabilidade:</strong> ${riscosLabel(row.prob) || 'Não informada'}</div><div><strong>Impacto:</strong> ${riscosLabel(row.imp) || 'Não informado'}</div><div><strong>Situação:</strong> ${riscosLabel(row.status)}</div><div><strong>Tipo de tratamento:</strong> ${esc(risk.tratamento || 'Não informado')}</div><div><strong>Controle:</strong> ${esc(riscosControlLabel(risk.controle_origem) || 'Não informado')}</div><div><strong>Projeto / plano de ação:</strong> ${esc(risk.controle_referencia || 'Não informado')}</div><div><strong>Responsável:</strong> ${esc(risk.responsavel_tratamento || 'Não informado')}</div><div><strong>Prazo:</strong> ${esc(date(risk.prazo_tratamento))}${overdue?' · Vencido':''}</div></div>${riscoControlesHtml(risk)}${riscosTreatmentCatalogHtml(risk)}<p class="text"><strong>Ação de tratamento:</strong> ${esc(risk.acao_tratamento || (risk.acao_nenhuma?'Nenhuma ação realizada':'Não informada'))}</p><p class="text"><strong>Evidência e verificação de eficácia:</strong> ${esc(risk.evidencia_tratamento || 'Não informada')}</p>${risk.tratamento_atualizado_em?`<p class="meta">Última atualização: ${esc(new Date(risk.tratamento_atualizado_em).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}))} · ${esc(risk.tratamento_atualizado_por || 'Não informado')}</p>`:''}</article>`;
    }).join('') || '<p>Nenhum risco encontrado para os filtros aplicados.</p>'}<footer class="footer"><span>CAGE · Gestão de riscos dos processos</span><span>${rows.length} riscos · ${esc(issued)}</span></footer></body></html>`;
}
async function riscosExportPdf(){
  const filters=riscosFilters(),rows=Riscos.filter(Riscos.rows(processos,ARQUITETURA,isCritico),filters);
  const reportWindow=window.open('','_blank');
  if(!reportWindow){toast('Permita abrir a janela do relatório no navegador.','var(--amber)');return;}
  reportWindow.opener=null;
  const cageLogo=await _fetchCageLogoBase64();
  if(reportWindow.closed)return;
  reportWindow.document.open();reportWindow.document.write(riscosReportHtml(rows,filters,new Date(),cageLogo || ''));reportWindow.document.close();
  await Promise.all(Array.from(reportWindow.document.images).map(img=>img.decode().catch(()=>{})));
  reportWindow.focus();setTimeout(()=>{if(!reportWindow.closed)reportWindow.print();},300);
}
function riscosTreatmentForm(risk){
  if(risk.resposta_proposta){risk={...risk,tratamento:risk.tratamento || risk.resposta_proposta.tipo,acao_tratamento:risk.acao_tratamento || risk.resposta_proposta.descricao,responsavel_tratamento:risk.responsavel_tratamento || risk.resposta_proposta.responsavel};}
  const severity=Riscos.level(Riscos.probabilities.find(value=>Riscos.key(value)===Riscos.key(risk.prob || risk.probabilidade)),Riscos.impacts.find(value=>Riscos.key(value)===Riscos.key(risk.imp || risk.impacto)));
  const type=({Mitigado:'Mitigar',Aceito:'Aceitar',Transferido:'Compartilhar',Evitado:'Evitar'})[risk.tratamento] || risk.tratamento;
  const types=['Evitar','Compartilhar','Mitigar',...(['low','moderate'].includes(severity)?['Aceitar']:[])];
  const field=(id,label,value)=>`<div class="fg"><label class="fl" for="${id}">${label}</label><input class="fi" id="${id}" value="${esc(value || '')}"></div>`;
  return `<form><h2>Tratamento do risco</h2><p class="risk-text">${esc(risk.desc || risk.descricao)}</p><p>Nível: <strong>${esc(Riscos.levels[severity] || 'Não classificado')}</strong></p>
    <div class="fg"><label class="fl" for="risk-status">Situação</label><select class="fi" id="risk-status" required onchange="riscosTreatmentVisibility()"><option value="">Selecione</option>${Object.entries(Riscos.statuses).map(([value,label])=>`<option value="${value}" ${Riscos.status(risk)===value?'selected':''}>${label}</option>`).join('')}</select></div>
    ${field('risk-owner','Responsável pelo tratamento',risk.responsavel_tratamento)}
    <div class="fg"><label class="fl" for="risk-type">Tratamento</label><select class="fi" id="risk-type" onchange="riscosTreatmentVisibility()"><option value="">Selecione</option>${types.map(value=>`<option ${type===value?'selected':''}>${value}</option>`).join('')}</select></div>
    <div class="fg" id="risk-control-fields"><label class="fl" for="risk-control-source">Controle</label><select class="fi" id="risk-control-source" onchange="riscosTreatmentVisibility()"><option value="">Selecione</option>${[['existente','Já implementado'],['projeto','Proposto — implementar por projeto'],['plano_acao','Proposto — implementar por plano de ação']].map(([value,label])=>`<option value="${value}" ${risk.controle_origem===value?'selected':''}>${label}</option>`).join('')}</select></div>
    <div class="fg" id="risk-treatment-catalog"><span class="fl">Controles da biblioteca</span><div id="risk-treatment-controls"></div><button type="button" class="btn" onclick="riscosSelectTreatmentControl()">+ Selecionar controle da biblioteca</button><p class="risk-form-help" style="margin-top:8px">Selecione os controles e descreva abaixo sua aplicação neste tratamento.</p></div>
    <div class="fg"><label class="fl" id="risk-action-label" for="risk-action">Descrição do controle</label><textarea class="fi" id="risk-action" rows="3">${esc(risk.controle_descricao || risk.acao_tratamento || '')}</textarea></div>
    <div id="risk-proposed-fields">${field('risk-control-reference','Projeto ou plano de ação que implementará o controle',risk.controle_referencia)}<div class="fg"><label class="fl" for="risk-deadline">Prazo para implementação</label><input class="fi" type="date" id="risk-deadline" value="${esc(risk.prazo_tratamento || '')}"></div></div>
    <div class="fg" id="risk-evidence-fields"><label class="fl" for="risk-evidence">Evidência do tratamento implementado</label><textarea class="fi" id="risk-evidence" rows="3">${esc(risk.evidencia_tratamento || '')}</textarea></div>
    <p id="risk-save-error" role="alert"></p><div class="btn-row"><button type="button" class="btn" onclick="document.getElementById('risk-treatment-modal').close()">Cancelar</button><button type="submit" class="btn btn-p">Salvar tratamento</button></div></form>`;
}
function riscosTreatmentVisibility(){
  const accepted=document.getElementById('risk-type').value==='Aceitar';
  document.getElementById('risk-control-fields').hidden=accepted;
  document.getElementById('risk-treatment-catalog').hidden=accepted;
  document.getElementById('risk-action-label').textContent=accepted?'Justificativa da aceitação sem controles':document.getElementById('risk-treatment-controls')._controls?.length?'Aplicação dos controles neste tratamento':'Descrição do controle';
  document.getElementById('risk-proposed-fields').hidden=accepted || document.getElementById('risk-control-source').value==='existente' || !document.getElementById('risk-control-source').value;
  document.getElementById('risk-evidence-fields').hidden=document.getElementById('risk-status').value!=='implementado';
}
function riscosTreatmentCatalogHtml(risk){
  return (risk.controles_tratamento || []).map(c=>`<p class="risk-text"><strong>Controle do tratamento:</strong> ${esc(c.id)} · ${esc(c.nome)}<br>${esc(c.tipo)} · ${esc(c.categoria)}</p>`).join('');
}
function riscosRenderTreatmentControls(){
  const target=document.getElementById('risk-treatment-controls');if(!target)return;
  target.innerHTML=(target._controls || []).map((c,index)=>`<div class="card risk-library-card"><strong>${esc(c.id)} · ${esc(c.nome)}</strong><p>${esc(c.categoria)} · ${esc(c.tipo)}</p><p>${esc(c.descricao)}</p><div class="risk-control-footer"><button type="button" class="btn" data-control-index="${index}">Remover controle</button></div></div>`).join('');
  target.querySelectorAll('button').forEach(button=>{button.onclick=()=>{target._controls.splice(Number(button.dataset.controlIndex),1);riscosRenderTreatmentControls();};});
  riscosTreatmentVisibility();
}
function riscosSelectTreatmentControl(){
  const target=document.getElementById('risk-treatment-controls');if(!target)return;
  riscoBibliotecaAbrir(target.id,{title:'Selecionar controle para o tratamento',riskText:document.getElementById('risk-treatment-modal')._riskDescription,selectedIds:target._controls.map(c=>c.id),onSelect:control=>{target._controls.push({id:control.id,nome:control.nome,categoria:control.categoria,tipo:control.tipo,descricao:control.descricao});riscosRenderTreatmentControls();}});
}
function riscosEdit(id,index){
  if(!riscosCanEdit())return;
  const process=processos.find(p=>String(p.id)===String(id)),risk=process?.ent?.riscos?.[index];if(!risk)return;
  document.getElementById('risk-treatment-modal')?.remove();
  const dialog=document.createElement('dialog');dialog.id='risk-treatment-modal';dialog.className='risk-treatment-modal';
  dialog.innerHTML=riscosTreatmentForm(risk);
  dialog._riskDescription=risk.desc || risk.descricao || '';
  dialog.querySelector('#risk-treatment-controls')._controls=(risk.controles_tratamento || []).map(c=>({...c}));
  dialog.addEventListener('close',()=>dialog.remove());
  dialog.querySelector('form').onsubmit=async event=>{
    event.preventDefault();if(!riscosCanEdit())return;
    const error=document.getElementById('risk-save-error'),button=dialog.querySelector('[type="submit"]');
    if(processos.find(p=>String(p.id)===String(id))?.ent?.riscos?.[index]!==risk){error.textContent='O risco foi atualizado. Feche e abra novamente antes de salvar.';return;}
    if(globalThis._fbConflictedProcIds?.has(process.id) || (curProc && String(curProc.id)===String(id) && curProc!==process)){error.textContent='Há uma atualização pendente neste processo. Recarregue os dados antes de registrar o tratamento.';return;}
    let values;
    try{values=Riscos.treatment(risk,{status:document.getElementById('risk-status').value,type:document.getElementById('risk-type').value,action:document.getElementById('risk-action').value,owner:document.getElementById('risk-owner').value,deadline:document.getElementById('risk-deadline').value,evidence:document.getElementById('risk-evidence').value,controlSource:document.getElementById('risk-control-source').value,reference:document.getElementById('risk-control-reference').value});}catch(e){error.textContent=e.message;return;}
    values.controles_tratamento=values.tratamento==='Aceitar'?[]:dialog.querySelector('#risk-treatment-controls')._controls.map(c=>({...c}));
    const before={...risk};button.disabled=true;Object.assign(risk,values,{id:risk.id || crypto.randomUUID(),tratamento_atualizado_em:new Date().toISOString(),tratamento_atualizado_por:usuarioLogado?.email || usuarioLogado?.nome || ''});
    try{
      if(fbReady() && globalThis._fbLoadedAt){if(await fbSaveAll()===false)throw new Error('Falha ao salvar');}else fbAutoSave('tratamentoRisco');
      dialog.close();rRiscos();if(curProc===process)atualizarRiscoUI();toast('Tratamento registrado.','var(--teal)');
    }catch(e){for(const field of Object.keys(risk))delete risk[field];Object.assign(risk,before);error.textContent='Não foi possível salvar. Tente novamente.';button.disabled=false;}
  };
  document.body.appendChild(dialog);riscosRenderTreatmentControls();riscosTreatmentVisibility();dialog.showModal();
}
