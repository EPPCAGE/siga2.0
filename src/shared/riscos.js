(function(scope){
  const statuses={sem_tratamento:'Sem tratamento',planejado:'Tratamento planejado',em_tratamento:'Em tratamento',implementado:'Tratamento implementado'};
  const key=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const probabilities=['Baixa','Media','Alta'],impacts=['Baixo','Medio','Alto','Critico'];
  const canonical=(value,options)=>options.find(option=>key(option)===key(value)) || '';
  const levels={low:'Baixo',moderate:'Moderado',high:'Alto',critical:'Crítico'};
  function level(prob,imp){
    const p=probabilities.indexOf(prob)+1,i=impacts.indexOf(imp)+1;
    if(!p || !i)return '';
    const score=p*i;return score<=2?'low':score<=4?'moderate':score<=8?'high':'critical';
  }
  function status(risk){
    if(statuses[risk.status_tratamento]) return risk.status_tratamento;
    if(['tratado','aguardando_verificacao'].includes(risk.status_tratamento) || risk.tratado===true) return 'implementado';
    return risk.tratamento || risk.acao_tratamento ? 'nao_confirmado' : 'sem_tratamento';
  }
  function rows(processes,architecture,isCritical=()=>false){
    const units=(architecture||[]).flatMap(m=>(m.processos||[]).flatMap(p=>[{...p,macro:m.nome},...(p.subprocessos||[]).map(s=>({...s,macro:m.nome}))]));
    return (processes||[]).flatMap(process=>{
      const unit=units.find(u=>String(u.id)===String(process.arq_id));
      return (process.ent?.riscos||[]).map((risk,index)=>({process,risk,index,processId:String(process.id),processName:unit?.nome || process.nome,
        area:scope.AreasArquitetura?.canonical(unit?.area || process.area) || unit?.area || process.area || 'Área não informada',
        macro:unit?.macro || process.macro || 'Macroprocesso não informado',critical:isCritical(process.arq_id)?'sim':'nao',
        prob:canonical(risk.prob || risk.probabilidade,probabilities),imp:canonical(risk.imp || risk.impacto,impacts),status:status(risk)}));
    });
  }
  function filter(rows,filters={}){
    return rows.filter(row=>['prob','imp','area','macro','processId','status','level','critical'].every(field=>{
      const values=Array.isArray(filters[field])?filters[field].filter(Boolean):filters[field]?[filters[field]]:[];
      return !values.length || values.includes(field==='level'?level(row.prob,row.imp):row[field]);
    }) &&
      (!filters.query || key([row.risk.desc || row.risk.descricao,row.processName,row.risk.acao_tratamento].join(' ')).includes(key(filters.query))));
  }
  function summary(rows,today){
    const priority=rows.filter(row=>['high','critical'].includes(level(row.prob,row.imp)));
    return {total:rows.length,priority:priority.length,untreated:priority.filter(row=>row.status==='sem_tratamento').length,
      running:priority.filter(row=>row.status==='em_tratamento').length,
      overdue:priority.filter(row=>row.status!=='implementado' && row.risk.prazo_tratamento && row.risk.prazo_tratamento<today).length,
      treated:priority.filter(row=>row.status==='implementado').length,unconfirmed:rows.filter(row=>row.status==='nao_confirmado' || !row.prob || !row.imp).length};
  }
  function matrix(rows){return probabilities.slice().reverse().map(prob=>impacts.map(imp=>({prob,imp,count:rows.filter(row=>row.prob===prob&&row.imp===imp).length,score:(probabilities.indexOf(prob)+1)*(impacts.indexOf(imp)+1)})));}
  function treatment(risk,values){
    if(!statuses[values.status]) throw new Error('Selecione a situação do tratamento.');
    const type=({Mitigado:'Mitigar',Aceito:'Aceitar',Transferido:'Compartilhar',Evitado:'Evitar'})[values.type] || values.type || '';
    const severity=level(canonical(risk.prob || risk.probabilidade,probabilities),canonical(risk.imp || risk.impacto,impacts));
    if(type==='Aceitar' && !['low','moderate'].includes(severity))throw new Error('Aceitar sem controles é permitido apenas para riscos baixos ou moderados.');
    if(type && !['Mitigar','Aceitar','Compartilhar','Evitar'].includes(type))throw new Error('Tipo de tratamento inválido.');
    if(['high','critical'].includes(severity) && !values.owner?.trim())throw new Error('Informe o responsável pelo risco alto ou crítico.');
    if(values.status!=='sem_tratamento'){
      if(!type)throw new Error('Informe o tratamento.');
      if(type==='Aceitar'){
        if(!values.action?.trim())throw new Error('Justifique a aceitação do risco.');
      }else{
        if(!values.owner?.trim())throw new Error('Informe o responsável pelo tratamento.');
        if(!['existente','projeto','plano_acao'].includes(values.controlSource))throw new Error('Informe se o controle já existe ou será implementado por projeto ou plano de ação.');
        if(!values.action?.trim())throw new Error('Descreva o controle.');
        if(values.controlSource!=='existente'){
          if(!values.reference?.trim())throw new Error('Informe o projeto ou plano de ação responsável pela implementação.');
          if(!/^\d{4}-\d{2}-\d{2}$/.test(values.deadline || ''))throw new Error('Informe o prazo para implementação do controle proposto.');
        }
      }
    }
    if(values.status==='implementado' && !values.evidence?.trim())throw new Error('Informe a evidência do tratamento implementado.');
    return {...risk,status_tratamento:values.status,tratado:values.status==='implementado',tratamento:type,acao_tratamento:values.action?.trim() || '',
      controle_origem:type==='Aceitar'?'aceitacao':values.controlSource || '',controle_descricao:type==='Aceitar'?'':values.action?.trim() || '',controle_referencia:type==='Aceitar'?'':values.reference?.trim() || '',
      acao_nenhuma:type==='Aceitar' || !values.action?.trim(),responsavel_tratamento:values.owner?.trim() || '',prazo_tratamento:type==='Aceitar'?'':values.deadline || '',evidencia_tratamento:values.evidence?.trim() || ''};
  }
  scope.Riscos={statuses,key,probabilities,impacts,levels,level,status,rows,filter,summary,matrix,treatment};
})(globalThis);
