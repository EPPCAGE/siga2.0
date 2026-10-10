(function(globalScope){
  const normalize=value=>String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function text(value){
    if(value == null) return '';
    if(Array.isArray(value)) return value.map(text).join(' ');
    if(typeof value==='object') return Object.values(value).map(text).join(' ');
    return String(value);
  }
  function search(type,query,data){
    if(type==='riscos') return [];
    if(type==='todos') return ['faq','problemas','pops'].flatMap(kind=>search(kind,query,data));
    const rows=[];
    const add=(title,detail,target,extra='')=>rows.push({title:title || 'Sem título',
      detail:Object.entries(detail).filter(([,value])=>text(value).trim()).map(([label,value])=>`${label}: ${text(value)}`).join('\n'),
      target,category:type,search:text([title,detail,extra])});
    const units=(data.arquitetura || []).flatMap(m=>(m.processos || []).flatMap(p=>[{...p,macro:m.nome},...(p.subprocessos || []).map(s=>({...s,macro:m.nome}))]));
    const processes=(data.processos || []).map(p=>{
      const unit=units.find(item=>String(item.id)===String(p.arq_id));
      return unit?{...p,macro:unit.macro}:p;
    }).filter(p=>(!data.processId || String(p.id)===String(data.processId)) && (!data.macro || p.macro===data.macro));
    const allowedIds=new Set([...processes.map(p=>String(p.arq_id)),...(!data.processId?units.filter(item=>!data.macro || item.macro===data.macro).map(item=>String(item.id)):[])]);
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
    if(type==='pops'){
      processes.forEach(p=>{
        const pop=p.form?.pop;
        if(!pop || !text(pop).trim()) return;
        add(`POP — ${p.nome}`,{'Processo':p.nome,'Macroprocesso':p.macro,'Objetivo':pop.obj},
          {kind:'info-processo',arqId:p.arq_id,processId:p.id},pop);
      });
      (data.publicacoes || []).filter(pub=>normalize(pub.categoria)==='pops' &&
        ((!data.processId && !data.macro) || (pub.arq_ids || []).some(id=>allowedIds.has(String(id)))))
        .forEach(pub=>{
          const arqId=(pub.arq_ids || [])[0];
          const process=processes.find(p=>(pub.arq_ids || []).some(id=>String(p.arq_id)===String(id)));
          const target=arqId!=null || process
            ? {kind:'info-processo',arqId:process?.arq_id ?? arqId,processId:process?.id}
            : {kind:'publicacao',url:pub.url || pub.link};
          add(pub.titulo,{'Descrição':pub.descricao,'Versão':pub.versao,'Processo':process?.nome},target,pub.tags);
        });
    }
    const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
    return rows.filter(row=>terms.every(term=>normalize(row.search).includes(term))).sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));
  }
  globalScope.BuscaGeral={search,normalize};
})(globalThis);
