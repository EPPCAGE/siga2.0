'use strict';
const assert=require('node:assert/strict');

async function verify(){
  // Fixed, repository-owned modules only; no extracted source or VM execution.
  await Promise.all([
    import('../src/shared/process-architecture.js'),
    import('../src/shared/busca-geral.js'),
    import('../src/processos/central-controles-view.js')
  ]);
  const {indicatorOptions,indicatorMatchesProcess}=globalThis.ProcessArchitecture;
  const architecture=[{nome:'Macro',processos:[{id:'parent',nome:'Pai',subprocessos:[{id:'child',nome:'Filho',subprocessos:[{id:'leaf',nome:'Neto'}]}]}]}];
  const mapped=[{id:12,arq_id:'parent',nome:'Pai'}];
  assert.deepEqual(indicatorOptions(architecture,[]).map(process=>process.id),['parent','child','leaf']);
  assert.equal(indicatorOptions(architecture,mapped)[0].procId,12);
  assert.equal(indicatorMatchesProcess({arq_id:'parent'},mapped[0]),true);
  assert.equal(indicatorMatchesProcess({pid:'12'},mapped[0]),true);
  assert.equal(indicatorMatchesProcess({arq_id:'child'},mapped[0]),false);
  const publications=[{categoria:'POPs',titulo:'POP do neto',arq_ids:['leaf']}];
  const data={arquitetura:architecture,processos:[],publicacoes:publications};
  assert.equal(globalThis.BuscaGeral.search('pops','',{...data,processId:'arq:leaf'}).length,1);
  assert.equal(globalThis.BuscaGeral.search('pops','',{...data,processId:'arq:parent'}).length,0);
  const alphabetically=(a,b)=>a.localeCompare(b,'pt-BR');
  for(const processes of [[],mapped]){
    const controls=globalThis.CentralControlesView.processCatalog(processes,architecture);
    const expected=processes.length?['12','arq:child','arq:leaf']:['arq:parent','arq:child','arq:leaf'];
    assert.deepEqual(controls.map(process=>String(process.id)).sort(alphabetically),expected.sort(alphabetically));
  }
  console.log('OK: indicadores, controles e busca incluem processos e subprocessos antes e depois do mapeamento.');
}
verify().catch(error=>{console.error(error);process.exitCode=1;});
