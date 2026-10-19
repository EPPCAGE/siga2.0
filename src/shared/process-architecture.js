(function(scope){
  'use strict';
  function indicatorMatchesProcess(indicator,process){
    return Boolean(process) && ((indicator.pid!=null && process.id!=null && String(indicator.pid)===String(process.id)) ||
      (indicator.arq_id!=null && process.arq_id!=null && String(indicator.arq_id)===String(process.arq_id)));
  }
  function indicatorOptions(architecture,processes){
    const options=[];
    for(const macro of architecture){
      function add(item,type){
        const mapped=processes.find(process=>process.arq_id!=null && String(process.arq_id)===String(item.id));
        options.push({id:item.id,procId:mapped?.id ?? item.proc_id ?? null,macro:macro.nome,nome:item.nome,area:item.area || item.gerente || '',tipo:type});
        for(const child of item.subprocessos || [])add(child,'Subprocesso');
      }
      for(const process of macro.processos || [])add(process,'Processo');
    }
    return options;
  }
  scope.ProcessArchitecture={indicatorMatchesProcess,indicatorOptions};
})(globalThis);
