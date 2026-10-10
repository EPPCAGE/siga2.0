(function(globalScope){
  const normalize=value=>String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function text(value){
    if(value == null) return '';
    if(Array.isArray(value)) return value.map(text).join(' ');
    if(typeof value==='object') return Object.values(value).map(text).join(' ');
    return String(value);
  }
  function search(type,query,data){
    if(type==='todos') return ['faq','riscos','problemas'].flatMap(kind=>search(kind,query,data));
    const rows=[];
    const add=(title,detail,target,extra='')=>rows.push({title:title || 'Sem título',
      detail:Object.entries(detail).filter(([,value])=>text(value).trim()).map(([label,value])=>`${label}: ${text(value)}`).join('\n'),
      target,category:type,search:text([title,detail,extra])});
    const processes=(data.processos || []).filter(p=>!data.processId || String(p.id)===String(data.processId));
    if(type==='faq') processes.forEach(p=>{
      String(p.form?.faq || '').split(/\n(?=P\s*:)/i).forEach(block=>{
        const lines=block.trim().split('\n');
        if(!/^P\s*:/i.test(lines[0] || '')) return;
        const question=lines.shift().replace(/^P\s*:\s*/i,'');
        const answer=lines.join('\n').replace(/^R\s*:\s*/i,'');
        add(question,{'Resposta':answer,'Processo':p.nome,'Macroprocesso':p.macro},{kind:'processo',id:p.id});
      });
    });
    if(type==='riscos' || type==='problemas') processes.forEach(p=>{
      const items=type==='riscos'?p.ent?.riscos:p.ent?.prob;
      (items || []).forEach(item=>add(typeof item==='string'?item:item.desc,{
        'Processo':p.nome,'Macroprocesso':p.macro,
        ...(type==='riscos'?{'Probabilidade':item.prob,'Impacto':item.imp,'Tratamento':item.tratamento,'Ação de tratamento':item.acao_tratamento}:{'Solução':item.solucao})
      },{kind:'processo',id:p.id},item));
    });
    const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
    return rows.filter(row=>terms.every(term=>normalize(row.search).includes(term))).sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));
  }
  globalScope.BuscaGeral={search,normalize};
})(globalThis);
