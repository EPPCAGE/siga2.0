(function initIndicadoresImpactados(globalScope) {
  const id = value => value == null ? '' : String(value);
  const key = node => JSON.stringify([node.macro_id, node.arq_id]);
  function nodes(architecture) {
    return (architecture || []).flatMap(m => (m.processos || []).flatMap(p => [p, ...(p.subprocessos || [])].map(item => ({
      macro_id:id(m.id), macro:m.nome, parent_id:id(p.id), arq_id:id(item.id), proc_id:id(item.proc_id), nome:item.nome
    }))));
  }
  function resolve(indicator, all, mapped) {
    let matches;
    if(id(indicator.arq_id)) {
      matches = all.filter(node => node.arq_id === id(indicator.arq_id));
      if(matches.length === 1) return matches[0];
      if(!matches.length) return null;
    } else matches = all;
    if(!id(indicator.pid)) return null;
    const direct = matches.filter(node => node.proc_id && node.proc_id === id(indicator.pid));
    if(direct.length === 1) return direct[0];
    const process = (mapped || []).find(p => id(p.id) === id(indicator.pid));
    if(!process?.arq_id) return null;
    const linked = matches.filter(node => node.arq_id === id(process.arq_id));
    if(linked.length === 1) return linked[0];
    const scoped = linked.filter(node => node.macro === process.macro);
    return scoped.length === 1 ? scoped[0] : null;
  }
  function list(project, architecture, indicators, mapped) {
    const all = nodes(architecture);
    const impacted = new Set(all.filter(node => (project.processos_impactados || []).some(link =>
      node.macro_id === id(link.macro_id) && node.parent_id === id(link.processo_id)
    )).map(key));
    return (indicators || []).flatMap(ind => {
      const node = resolve(ind, all, mapped);
      return node && impacted.has(key(node)) ? [{ind,processo:node.nome,macro:node.macro,arq_id:node.arq_id}] : [];
    }).sort((a, b) =>
      String(a.processo || '').localeCompare(String(b.processo || ''), 'pt-BR', {sensitivity:'base'}) ||
      String(a.macro || '').localeCompare(String(b.macro || ''), 'pt-BR', {sensitivity:'base'}) ||
      String(a.arq_id).localeCompare(String(b.arq_id)) ||
      period(a.ind.periodo) - period(b.ind.periodo)
    );
  }
  function number(value) {
    if(value == null || String(value).trim() === '') return null;
    let text = String(value).replace(/[\s%]/g,'');
    if(text.includes(',') && text.includes('.')) text = text.lastIndexOf(',') > text.lastIndexOf('.') ? text.replaceAll('.','').replace(',','.') : text.replaceAll(',','');
    else text = text.replace(',','.');
    const result = Number(text);
    return Number.isFinite(result) ? result : null;
  }
  function explicitMeta(ind) {
    const result = number(ind.meta);
    return result === 0 && /^(importado|gsheets)(_editado)?$/.test(ind.origem || '') && ind.meta_definida !== true ? null : result;
  }
  function period(value) {
    const text = String(value || '').trim().toLowerCase();
    const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const named = text.match(/^([a-zç]+)\/(\d{4})$/);
    if(named) return Number(named[2])*12 + months.indexOf(named[1].slice(0,3));
    const iso = text.match(/^(\d{4})-(\d{2})/);
    return iso ? Number(iso[1])*12 + Number(iso[2])-1 : 0;
  }
  function timeline(project, rows) {
    const start = period(project.dt_inicio);
    if(!start) return [];
    return rows.filter(row => {
      const month = period(row.ind.periodo);
      return month >= start && !row.ind.sem_dado && number(row.ind.resultado ?? row.ind.realizado ?? row.ind.atual) !== null;
    }).slice().sort((a,b) => String(a.processo || '').localeCompare(String(b.processo || ''), 'pt-BR') || period(a.ind.periodo)-period(b.ind.periodo));
  }
  function meta(ind, indicators) {
    const name = String(ind.codigo || ind.nome || '').trim();
    if(!name || !ind.periodo) return explicitMeta(ind);
    const series = indicators.filter(item => String(item.codigo || item.nome || '').trim() === name).slice().sort((a,b)=>period(a.periodo)-period(b.periodo));
    let result = null;
    for(const item of series) {
      const value = explicitMeta(item);
      if(value !== null) result = value;
      if(item === ind) break;
    }
    return result ?? series.map(explicitMeta).find(value=>value !== null) ?? null;
  }
  globalScope.IndicadoresImpactados = {list, number, meta, timeline};
})(globalThis);
