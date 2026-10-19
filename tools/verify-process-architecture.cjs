const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),acorn=require('C:/SIGA-Offline/node_modules/acorn');
const html=fs.readFileSync('C:/SIGA-Offline/web/processos.html','utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const functions=new Map();
for(const script of scripts){const ast=acorn.parse(script,{ecmaVersion:'latest',sourceType:'script'});for(const n of ast.body)if(n.type==='FunctionDeclaration')functions.set(n.id.name,script.slice(n.start,n.end));}
const architecture=[{nome:'Macro',processos:[{id:'parent',nome:'Pai',subprocessos:[{id:'child',nome:'Filho',subprocessos:[{id:'leaf',nome:'Neto'}]}]}]}];
const context=vm.createContext({ARQUITETURA:architecture,processos:[]});
vm.runInContext(['_kpiArquiteturaOptions','_kpiVinculadoProcesso'].map(n=>functions.get(n)).join('\n'),context);
assert.deepEqual(Array.from(context._kpiArquiteturaOptions(),p=>p.id),['parent','child','leaf']);
context.processos.push({id:12,arq_id:'parent'});
assert.equal(context._kpiArquiteturaOptions()[0].procId,12);
assert.equal(context._kpiVinculadoProcesso({arq_id:'parent'},context.processos[0]),true);
assert.equal(context._kpiVinculadoProcesso({pid:'12'},context.processos[0]),true);
assert.equal(context._kpiVinculadoProcesso({arq_id:'child'},context.processos[0]),false);
vm.runInContext(fs.readFileSync('C:/SIGA-Offline/web/src/shared/busca-geral.js','utf8'),context);
const pubs=[{categoria:'POPs',titulo:'POP do neto',arq_ids:['leaf']}];
assert.equal(context.BuscaGeral.search('pops','',{arquitetura:architecture,processos:[],publicacoes:pubs,processId:'arq:leaf'}).length,1);
assert.equal(context.BuscaGeral.search('pops','',{arquitetura:architecture,processos:[],publicacoes:pubs,processId:'arq:parent'}).length,0);
vm.runInContext(fs.readFileSync('C:/SIGA-Offline/renderer/controls-view.js','utf8'),context);
const plans=require('C:/SIGA-Offline/renderer/action-plans-core.js');
for(const mapped of [[],[{id:12,arq_id:'parent',nome:'Pai'}]]){
 const controls=context.CentralControlesView.processCatalog(mapped,architecture),actions=plans.context(mapped,architecture,[]).processes;
 assert.deepEqual(Array.from(controls,p=>String(p.id)).sort(),actions.map(p=>String(p.id)).sort());
 assert.equal(controls.length,3);
}
console.log('OK: pais e subprocessos nos indicadores; vínculo antes/depois do mapeamento; busca de POP sem mapeamento.');
