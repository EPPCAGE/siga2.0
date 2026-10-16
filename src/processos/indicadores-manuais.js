let indicadoresAba='sisplan';
function selecionarAbaIndicadores(tab){
  if(!['sisplan','manuais'].includes(tab))return;
  indicadoresAba=tab;rInd();
}
function atualizarAbasIndicadores(){
  const manual=indicadoresAba==='manuais';
  for(const tab of ['sisplan','manuais']){
    const button=document.getElementById('ind-tab-'+tab),panel=document.getElementById('ind-panel-'+tab);
    if(button){button.setAttribute('aria-selected',String(indicadoresAba===tab));button.classList.toggle('on',indicadoresAba===tab);}
    if(panel)panel.hidden=indicadoresAba!==tab;
  }
  const actions=document.getElementById('ind-actions-ep');if(actions)actions.style.display=!manual&&isEP()?'flex':'none';
  const subtitle=document.getElementById('ind-sub');if(subtitle)subtitle.textContent=manual?'Indicadores propostos nos mapeamentos de processos':'Monitoramento de KPIs';
  if(manual){
    if(typeof _indCharts!=='undefined'){_indCharts.forEach(chart=>{try{chart.destroy();}catch{}});_indCharts=[];}
    document.getElementById('ia-ind-panel')?.remove();
  }
  return manual;
}
function rIndicadoresManuais(){
  const container=document.getElementById('ind-manual-list');if(!container)return;
  const processSelect=document.getElementById('ind-manual-process'),query=IndicadoresManuais.periodKey(document.getElementById('ind-manual-search')?.value);
  const selected=processSelect.value,all=IndicadoresManuais.rows(processos,ARQUITETURA);
  const processes=[...new Map(all.map(row=>[String(row.process.id),row.processName])).entries()];
  processSelect.replaceChildren(new Option('Todos os processos',''),...processes.map(([id,name])=>new Option(name,id)));
  processSelect.value=selected;
  const rows=all.filter(row=>(!processSelect.value || String(row.process.id)===processSelect.value) && (!query || IndicadoresManuais.periodKey([row.indicator.nome,row.processName,row.macro,row.area].join(' ')).includes(query)));
  document.getElementById('ind-manual-count').textContent=rows.length+' indicador(es) dos mapeamentos';
  container.innerHTML=rows.map(({process,indicator:ind,index,processName,macro,area})=>`<article class="card manual-indicator"><div class="ph"><div><h2 class="card-t">${esc(ind.nome || 'Indicador sem nome')}</h2><p class="ph-s">Processo: ${esc(processName)} · ${esc(area || 'Área não informada')}</p><p class="ph-s">Macroprocesso: ${esc(macro || 'Não informado')} · Mapeamento #${esc(process.id)}</p></div>${isEP()?`<button type="button" class="btn btn-p" data-process="${esc(process.id)}" data-indicator="${index}" onclick="abrirResultadoIndicadorManual(this.dataset.process,Number(this.dataset.indicator))">+ Registrar resultado</button>`:''}</div><dl class="manual-indicator-data">${[['Meta',ind.meta],['Unidade',ind.unidade],['Periodicidade',ind.periodicidade],['Fórmula',ind.formula],['Fonte dos dados',ind.fonte]].map(([name,value])=>`<div><dt>${name}</dt><dd>${esc(value===undefined || value===null || value===''?'Não informada':value)}</dd></div>`).join('')}</dl>${ind.resultados?.length?`<div class="manual-indicator-scroll"><table><caption>Resultados registrados</caption><thead><tr><th scope="col">Período</th><th scope="col">Resultado</th>${isEP()?'<th scope="col">Ações</th>':''}</tr></thead><tbody>${ind.resultados.map((result,resultIndex)=>`<tr><td>${esc(result.periodo)}</td><td>${esc(Number(result.resultado).toLocaleString('pt-BR'))} ${esc(ind.unidade || '')}</td>${isEP()?`<td><button type="button" class="btn" data-process="${esc(process.id)}" data-indicator="${index}" data-result="${resultIndex}" onclick="abrirResultadoIndicadorManual(this.dataset.process,Number(this.dataset.indicator),Number(this.dataset.result))">Editar resultado</button></td>`:''}</tr>`).join('')}</tbody></table></div>`:'<p class="ph-s">Nenhum resultado registrado.</p>'}</article>`).join('') || '<div class="ib ibb">Nenhum indicador proposto nos mapeamentos para este filtro.</div>';
}
function abrirResultadoIndicadorManual(processId,index,resultIndex=null){
  if(!isEP())return;
  const process=processos.find(p=>String(p.id)===String(processId)),indicator=process?.form?.indicadores_proc?.[index];if(!indicator)return;
  const previous=resultIndex===null?null:indicator.resultados?.[resultIndex];if(resultIndex!==null&&!previous)return;
  document.getElementById('ind-manual-result-dialog')?.remove();
  const dialog=document.createElement('dialog');dialog.id='ind-manual-result-dialog';dialog.className='manual-indicator-dialog';dialog.setAttribute('aria-labelledby','ind-manual-result-title');
  dialog.innerHTML=`<form><h2 id="ind-manual-result-title">${previous?'Editar':'Registrar'} resultado</h2><p class="ph-s">${esc(indicator.nome)} · ${esc(process.nome)}</p><div class="fg"><label class="fl" for="ind-manual-period">Período</label><input class="fi" id="ind-manual-period" required maxlength="100" placeholder="Ex.: 2026-10 ou 1º trimestre/2026" value="${esc(previous?.periodo || '')}"></div><div class="fg"><label class="fl" for="ind-manual-value">Resultado ${indicator.unidade?'('+esc(indicator.unidade)+')':''}</label><input class="fi" id="ind-manual-value" required inputmode="decimal" placeholder="Ex.: 12,5" value="${esc(previous?.resultado??'')}"></div><p role="alert"></p><div class="btn-row"><button type="button" class="btn" id="ind-manual-cancel">Cancelar</button><button type="submit" class="btn btn-p">Salvar resultado</button></div></form>`;
  let saving=false;
  dialog.querySelector('#ind-manual-cancel').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());dialog.addEventListener('cancel',event=>{if(saving)event.preventDefault();});
  dialog.querySelector('form').onsubmit=async event=>{
    event.preventDefault();if(saving||!isEP())return;
    const error=dialog.querySelector('[role="alert"]');error.textContent='';
    if(!fbReady() || !globalThis._fbLoadedAt){error.textContent='Aguarde a conexão e o carregamento dos dados para salvar.';return;}
    if(processos.find(p=>String(p.id)===String(processId))!==process || process.form?.indicadores_proc?.[index]!==indicator || (previous && indicator.resultados?.[resultIndex]!==previous) || globalThis._fbConflictedProcIds?.has(process.id) || (curProc && String(curProc.id)===String(processId) && curProc!==process)){
      error.textContent='O mapeamento foi atualizado. Reabra o formulário com os dados atuais.';return;
    }
    let value;
    try{value=IndicadoresManuais.result({periodo:dialog.querySelector('#ind-manual-period').value,resultado:dialog.querySelector('#ind-manual-value').value},indicator.resultados || [],previous?.id || null);}catch(e){error.textContent=e.message;return;}
    const oldResults=indicator.resultados;
    const record={...value,id:previous?.id || crypto.randomUUID(),atualizado_em:new Date().toISOString(),atualizado_por:usuarioLogado?.email || usuarioLogado?.nome || ''};
    const next=[...(oldResults || [])];if(previous)next[resultIndex]=record;else next.push(record);
    saving=true;dialog.querySelectorAll('button').forEach(button=>button.disabled=true);indicator.resultados=next;
    try{
      if(await fbSaveAll()!==true)throw Error('Falha ao salvar');
    }catch(e){
      if(oldResults===undefined)delete indicator.resultados;else indicator.resultados=oldResults;
      error.textContent='Não foi possível salvar o resultado. Tente novamente.';saving=false;dialog.querySelectorAll('button').forEach(button=>button.disabled=false);return;
    }
    dialog.close();rIndicadoresManuais();toast('Resultado salvo.','var(--teal)');
  };
  document.body.appendChild(dialog);dialog.showModal();
}
