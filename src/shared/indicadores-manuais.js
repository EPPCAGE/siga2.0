(function(scope){
  function rows(processes,architecture){
    const units=(architecture||[]).flatMap(m=>(m.processos||[]).flatMap(p=>[{...p,macro:m.nome},...(p.subprocessos||[]).map(s=>({...s,macro:m.nome}))]));
    return (processes||[]).flatMap(process=>{
      const unit=units.find(u=>String(u.id)===String(process.arq_id));
      return (process.form?.indicadores_proc||[]).map((indicator,index)=>({process,indicator,index,processName:unit?.nome || process.nome || 'Processo sem nome',macro:unit?.macro || process.macro || '',area:unit?.area || process.area || ''}));
    });
  }
  const periodKey=value=>String(value||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');
  function result(values,previous=[] ,editingId=null){
    const periodo=String(values.periodo||'').trim().replace(/\s+/g,' '),raw=String(values.resultado??'').trim();
    if(!periodo || periodo.length>100)throw Error('Informe o período do resultado (até 100 caracteres).');
    if(!/^-?\d+(?:[.,]\d+)?$/.test(raw) || !Number.isFinite(Number(raw.replace(',','.'))))throw Error('Informe um resultado numérico válido, sem separador de milhar.');
    if(previous.some(r=>r.id!==editingId && periodKey(r.periodo)===periodKey(periodo)))throw Error('Já existe resultado para este período. Use Editar resultado para atualizá-lo.');
    return {periodo,resultado:Number(raw.replace(',','.'))};
  }
  scope.IndicadoresManuais={rows,periodKey,result};
})(globalThis);
