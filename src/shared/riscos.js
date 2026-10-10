(function(scope){
  const statuses={sem_tratamento:'Sem tratamento',planejado:'Tratamento planejado',em_tratamento:'Em tratamento',aguardando_verificacao:'Tratamento implementado, aguardando verificação',tratado:'Tratado'};
  const key=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const probabilities=['Baixa','Media','Alta'],impacts=['Baixo','Medio','Alto','Critico'];
  const canonical=(value,options)=>options.find(option=>key(option)===key(value)) || '';
  function status(risk){
    if(statuses[risk.status_tratamento]) return risk.status_tratamento;
    if(risk.tratado===true) return 'tratado';
    return risk.tratamento || risk.acao_tratamento ? 'nao_confirmado' : 'sem_tratamento';
  }
  function rows(processes,architecture){
    const units=(architecture||[]).flatMap(m=>(m.processos||[]).flatMap(p=>[{...p,macro:m.nome},...(p.subprocessos||[]).map(s=>({...s,macro:m.nome}))]));
    return (processes||[]).flatMap(process=>{
      const unit=units.find(u=>String(u.id)===String(process.arq_id));
      return (process.ent?.riscos||[]).map((risk,index)=>({process,risk,index,processId:String(process.id),processName:unit?.nome || process.nome,
        area:scope.AreasArquitetura?.canonical(unit?.area || process.area) || unit?.area || process.area || 'Área não informada',
        macro:unit?.macro || process.macro || 'Macroprocesso não informado',
        prob:canonical(risk.prob || risk.probabilidade,probabilities),imp:canonical(risk.imp || risk.impacto,impacts),status:status(risk)}));
    });
  }
  function filter(rows,filters={}){
    return rows.filter(row=>['prob','imp','area','macro','processId','status'].every(field=>{
      const values=Array.isArray(filters[field])?filters[field].filter(Boolean):filters[field]?[filters[field]]:[];
      return !values.length || values.includes(row[field]);
    }) &&
      (!filters.query || key([row.risk.desc || row.risk.descricao,row.processName,row.risk.acao_tratamento].join(' ')).includes(key(filters.query))));
  }
  function summary(rows,today){
    const priority=rows.filter(row=>['Media','Alta'].includes(row.prob));
    return {total:rows.length,priority:priority.length,untreated:priority.filter(row=>row.status==='sem_tratamento').length,
      running:priority.filter(row=>row.status==='em_tratamento').length,
      overdue:priority.filter(row=>row.status!=='tratado' && row.risk.prazo_tratamento && row.risk.prazo_tratamento<today).length,
      treated:priority.filter(row=>row.status==='tratado').length,unconfirmed:rows.filter(row=>row.status==='nao_confirmado' || !row.prob || !row.imp).length};
  }
  function matrix(rows){return probabilities.slice().reverse().map(prob=>impacts.map(imp=>({prob,imp,count:rows.filter(row=>row.prob===prob&&row.imp===imp).length,score:(probabilities.indexOf(prob)+1)*(impacts.indexOf(imp)+1)})));}
  function treatment(risk,values){
    if(!statuses[values.status]) throw new Error('Selecione a situação do tratamento.');
    if(values.status!=='sem_tratamento' && (!values.type || !values.action?.trim())) throw new Error('Informe o tipo de tratamento e a ação.');
    if(values.status==='tratado' && !values.evidence?.trim()) throw new Error('Registre a evidência da verificação de eficácia para marcar como tratado.');
    if(values.type && !['Mitigado','Aceito','Transferido','Evitado'].includes(values.type)) throw new Error('Tipo de tratamento inválido.');
    return {...risk,status_tratamento:values.status,tratado:values.status==='tratado',tratamento:values.type || '',acao_tratamento:values.action?.trim() || '',
      acao_nenhuma:!values.action?.trim(),responsavel_tratamento:values.owner?.trim() || '',prazo_tratamento:values.deadline || '',evidencia_tratamento:values.evidence?.trim() || ''};
  }
  scope.Riscos={statuses,key,probabilities,impacts,status,rows,filter,summary,matrix,treatment};
})(globalThis);
