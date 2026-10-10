(function(globalScope){
  const normalize=value=>String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function text(value){
    if(value == null) return '';
    if(Array.isArray(value)) return value.map(text).join(' ');
    if(typeof value==='object') return Object.values(value).map(text).join(' ');
    return String(value);
  }
  function search(type,query,data){
    const rows=[];
    const add=(title,detail,target,extra='')=>rows.push({title:title || 'Sem título',
      detail:Object.entries(detail).filter(([,value])=>text(value).trim()).map(([label,value])=>`${label}: ${text(value)}`).join('\n'),
      target,search:text([title,detail,extra])});
    const processes=data.processos || [];
    if(type==='processos'){
      const mapped=new Set();
      (data.arquitetura || []).forEach(m=>(m.processos || []).forEach(p=>[p,...(p.subprocessos || [])].forEach(node=>{
        const proc=processes.find(item=>String(item.arq_id)===String(node.id) && (!item.macro || item.macro===m.nome));
        if(proc) mapped.add(proc.id);
        add(node.nome,{'Macroprocesso':m.nome,'Área':node.area,'Objetivo':node.objetivo},proc?{kind:'processo',id:proc.id}:{kind:'arquitetura',id:node.id},node.objetivo_estrategico);
      })));
      processes.filter(p=>!mapped.has(p.id)).forEach(p=>add(p.nome,{'Macroprocesso':p.macro,'Área':p.area,'Objetivo':p.objetivo},{kind:'processo',id:p.id}));
    }
    if(type==='riscos' || type==='problemas') processes.forEach(p=>{
      const items=type==='riscos'?p.ent?.riscos:p.ent?.prob;
      (items || []).forEach(item=>add(typeof item==='string'?item:item.desc,{
        'Processo':p.nome,'Macroprocesso':p.macro,
        ...(type==='riscos'?{'Probabilidade':item.prob,'Impacto':item.imp,'Tratamento':item.tratamento,'Ação de tratamento':item.acao_tratamento}:{'Solução':item.solucao})
      },{kind:'processo',id:p.id},item));
    });
    if(type==='indicadores') (data.kpis || []).forEach(k=>add(k.nome || k.codigo,{'Código':k.codigo,'Área':k.area,'Período':k.periodo,'Descrição':k.desc,'Análise':k.analise},{kind:'indicador',name:k.nome}));
    if(type==='projetos') (data.projetos || []).forEach(p=>add(p.nome,{'Situação':p.status,'Gerente':p.gerente,'Descrição':p.descricao},{kind:'projeto',id:p.id},[p.objetivos_estrategicos,p.macroprocessos]));
    if(type==='riscos') (data.projetos || []).forEach(p=>(p.planejamento?.riscos || []).forEach(r=>add(r.descricao,{'Projeto':p.nome,'Probabilidade':r.probabilidade || r.prob,'Impacto':r.impacto || r.imp,'Tratamento':r.tratamento,'Resposta':r.resposta},{kind:'projeto',id:p.id},r)));
    if(type==='pops'){
      processes.filter(p=>p.form?.pop).forEach(p=>add('POP — '+p.nome,{'Processo':p.nome,'Área':p.form.pop.area,'Objetivo':p.form.pop.obj,'Definições':p.form.pop.def},{kind:'processo',id:p.id},p.form.pop));
      (data.publicacoes || []).filter(p=>normalize(p.categoria)==='pops').forEach(p=>add(p.titulo,{'Descrição':p.descricao,'Palavras-chave':p.tags,'Versão':p.versao},{kind:'publicacao',url:p.url || p.link}));
    }
    const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
    return rows.filter(row=>terms.every(term=>normalize(row.search).includes(term))).sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));
  }
  globalScope.BuscaGeral={search,normalize};
})(globalThis);
