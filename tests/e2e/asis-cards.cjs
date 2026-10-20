const {chromium}=require('playwright'),{readFileSync,mkdtempSync}=require('node:fs'),assert=require('node:assert/strict');
const {tmpdir}=require('node:os'),{join}=require('node:path');
(async()=>{
 const artifacts=mkdtempSync(join(tmpdir(),'siga-asis-cards-'));
 const html=readFileSync('processos.html','utf8'),browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<button onclick="abrirEsbocoCards()">Experimentar esboço por cards</button><div id="original-canvas" style="height:400px"></div>');
  await page.addStyleTag({content:html.slice(html.indexOf('<style>')+7,html.indexOf('</style>'))});
  await page.addStyleTag({path:'src/processos/asis-cards.css'});
  await page.addStyleTag(process.env.BPMN_DIAGRAM_CSS?{path:process.env.BPMN_DIAGRAM_CSS}:{url:'https://cdn.jsdelivr.net/npm/bpmn-js@17/dist/assets/diagram-js.css'});
  await page.addScriptTag(process.env.BPMN_MODELER_PATH?{path:process.env.BPMN_MODELER_PATH}:{url:'https://cdn.jsdelivr.net/npm/bpmn-js@17/dist/bpmn-modeler.production.min.js'});
  await page.addScriptTag({path:'src/shared/asis-cards.js'});await page.addScriptTag({path:'src/processos/asis-cards.js'});
  await page.addScriptTag({content:html.slice(html.indexOf('function BpmnMilestoneRenderer('),html.indexOf('function bpmnAddMilestone('))});
  await page.addScriptTag({content:html.match(/function _arquivarVersaoAnterior\([^]*?\n}/)[0]});
  await page.evaluate(async()=>{
   window.esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   let serial=0;crypto.randomUUID=()=> 'test_'+(++serial);
   const old=AsIsCards.compile([{id:'old',type:'task',nome:'Atividade original',executor:'Equipe',modo:'Manual'}]);
   window.curProc={id:1,nome:'Processo de teste',mod:{asIs:'Descrição preservada',bpmnAsIs:old.xml,etapas_proc:[{id:'legacy',nome:'Etapa antiga',desc:'Detalhamento preservado'}]}};window.processos=[curProc];window.usuarioLogado={nome:'EP'};window.role='ep';window.isEP=()=>role==='ep';
   const m=new BpmnJS(bpmnModelerOptions('#original-canvas'));await m.importXML(old.xml);
   window.bpmnModelers={asis:m};window.bpmnProcIds={asis:1};window.bpmnDirty={asis:false};window.originalXML=old.xml;
   window.fbReady=()=>true;window._fbLoadedAt=1;window.saveFails=false;window.savedProcess=null;window.fbSaveAll=async()=>{if(saveFails)return false;window.savedProcess=JSON.parse(JSON.stringify(curProc));return true;};window.toast=()=>{};window.now=()=> '20/10/2026';window.initBpmnMod=()=>{};window._refreshEtapasList=()=>{};
  });
  await page.getByRole('button',{name:'Experimentar esboço por cards'}).click();
  let dialog=page.locator('#asis-cards-dialog');await dialog.waitFor();
  async function addCard(container,type,name,owner,settings={}){
   await container.locator(`[data-action="add-${type}"]`).first().click();
   const editor=page.locator('#asis-card-editor');await editor.locator('[name="nome"]').fill(name);
   if(owner)await editor.locator('[name="executor"]').fill(owner);
   for(const [key,value] of Object.entries(settings)){const input=editor.locator(`[name="${key}"]`);if(await input.evaluate(el=>el.tagName==='SELECT'))await input.selectOption(value);else await input.fill(value);}
   await editor.getByRole('button',{name:'Salvar card',exact:true}).click();await editor.waitFor({state:'detached'});
  }
  await addCard(dialog,'task','Receber solicitação','Protocolo');
  assert.equal(await dialog.locator('.asis-cards-list input,.asis-cards-list textarea').count(),0);
  assert.equal(await page.evaluate(()=>curProc.mod.bpmnAsIs),await page.evaluate(()=>originalXML));
  assert.equal(await dialog.locator('#asis-cards-apply').isDisabled(),true);
  await addCard(dialog.locator('.asis-cards-list > .asis-cards-add'),'decision','Documentação completa?','Gestão');
  const branches=dialog.locator('.asis-branches > section');
  await addCard(branches.nth(0),'task','Aprovar pedido','Gestão');
  await addCard(branches.nth(1),'task','Solicitar correção','Protocolo');
  await dialog.locator('#asis-cards-confirm').check();await page.waitForFunction(()=>!document.getElementById('asis-cards-apply').disabled);
  assert.equal(await dialog.locator('.djs-element.djs-shape:not(.djs-label)[data-element-id^="Card_"]:not([data-element-id$="_label"])').count(),4);
  await page.screenshot({path:join(artifacts,'desktop.png'),fullPage:true});
  await page.evaluate(()=>saveFails=true);await dialog.getByRole('button',{name:'Aplicar e salvar AS IS',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('asis-cards-error').textContent.includes('gravação'));
  assert.equal(await page.evaluate(()=>curProc.mod.bpmnAsIs),await page.evaluate(()=>originalXML));assert.equal(await page.evaluate(()=>curProc.mod.asIsCards),undefined);
  await page.evaluate(()=>saveFails=false);await dialog.getByRole('button',{name:'Aplicar e salvar AS IS',exact:true}).click();await dialog.waitFor({state:'detached'});
  const snapshot=await page.evaluate(()=>window.savedProcess);
  assert.equal(snapshot.mod.asIs,'Descrição preservada');assert.equal(snapshot.mod.asIsCards.cards.length,2);assert.equal(snapshot.mod.etapas_proc.length,4);
  assert.match(snapshot.mod.bpmnAsIs,/Aprovar pedido/);assert.match(snapshot.mod.bpmnAsIsSvg,/Receber/);assert.equal(snapshot.mod.versoes_anteriores.length,1);assert.equal(snapshot.mod.versoes_anteriores[0].etapas_proc[0].desc,'Detalhamento preservado');
  assert.equal(await page.evaluate(()=>bpmnModelers.asis),null);
  const verified=await page.evaluate(async()=>{
    const viewer=new BpmnJS(bpmnModelerOptions('#original-canvas'));
    const imported=await viewer.importXML(window.savedProcess.mod.bpmnAsIs);
    const allStepsExist=window.savedProcess.mod.etapas_proc.every(step=>viewer.get('elementRegistry').get(step.bpmn_id));
    const types=viewer.get('elementRegistry').getAll().map(el=>el.type);
    const lanes=viewer.get('elementRegistry').getAll().filter(el=>el.type==='bpmn:Lane').map(el=>({nome:el.businessObject.name,refs:el.businessObject.flowNodeRef.map(node=>node.id)}));
    const xml=(await viewer.saveXML()).xml;viewer.destroy();
    return {lanes,warnings:(imported.warnings || []).map(w=>w.message),allStepsExist,types,xml};
  });
  assert.deepEqual(verified.warnings,[]);assert.equal(verified.allStepsExist,true);assert.ok(verified.types.includes('bpmn:ExclusiveGateway'));assert.match(verified.xml,/bpmndi:BPMNDiagram/);
  assert.deepEqual(verified.lanes.map(lane=>lane.nome).sort(),['Gestão','Protocolo']);assert.ok(!verified.xml.includes('Fluxo e decisões'));
  assert.ok(verified.lanes.find(lane=>lane.nome==='Gestão').refs.includes(snapshot.mod.etapas_proc.find(step=>step.tipo==='Decisao').bpmn_id));

  // Reload saved cards, then cancel without overwriting the saved process.
  await page.evaluate(()=>{curProc=JSON.parse(JSON.stringify(window.savedProcess));processos=[curProc];});
  await page.getByRole('button',{name:'Experimentar esboço por cards'}).click();dialog=page.locator('#asis-cards-dialog');await dialog.waitFor();
  assert.equal(await dialog.locator('[data-card]').count(),4);
  await page.setViewportSize({width:390,height:844});assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth));await page.screenshot({path:join(artifacts,'mobile.png'),fullPage:true});
  await dialog.getByRole('button',{name:'Fechar',exact:true}).click();await dialog.waitFor({state:'detached'});assert.equal(await page.evaluate(()=>curProc.mod.bpmnAsIs),snapshot.mod.bpmnAsIs);
  // A changed diagram cannot be silently replaced by a stale cards dialog.
  await page.setViewportSize({width:1500,height:1000});await page.getByRole('button',{name:'Experimentar esboço por cards'}).click();dialog=page.locator('#asis-cards-dialog');
  await dialog.locator('#asis-cards-confirm').check();await page.waitForFunction(()=>!document.getElementById('asis-cards-apply').disabled);
  await page.evaluate(()=>curProc.mod.bpmnAsIs+=' ');await dialog.getByRole('button',{name:'Aplicar e salvar AS IS',exact:true}).click();
  assert.match(await dialog.locator('#asis-cards-error').innerText(),/atualizado/);await dialog.getByRole('button',{name:'Fechar',exact:true}).click();await dialog.waitFor({state:'detached'});
  // New node types and independent endings, using the actual popup UI and BPMN importer.
  await page.evaluate(()=>{curProc={id:2,nome:'Finais independentes',mod:{}};processos=[curProc];});
  await page.getByRole('button',{name:'Experimentar esboço por cards'}).click();dialog=page.locator('#asis-cards-dialog');
  await dialog.locator('[data-action="edit-start"]').click();
  await page.locator('#asis-card-editor [name="nome"]').fill('Pedido recebido');
  await page.locator('#asis-card-editor [name="executor"]').fill('Equipe');
  await page.locator('#asis-card-editor').getByRole('button',{name:'Salvar card'}).click();
  await dialog.locator('[data-action="add-task"]').first().click();
  await page.locator('#asis-card-editor').getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal(await dialog.locator('[data-card]').count(),0);
  await addCard(dialog,'parallel','Executar em paralelo','Equipe',{join:'false'});
  const paths=dialog.locator('.asis-branches > section');
  await addCard(paths.nth(0),'wait','Aguardar retorno','Equipe',{duration:'PT30M'});
  await addCard(paths.nth(0),'end','Final da espera','Equipe');
  await addCard(paths.nth(1),'inclusive','Selecionar caminhos','Equipe',{join:'false'});
  const nested=dialog.locator('.asis-kind-inclusive .asis-branches > section');
  await addCard(nested.nth(0),'task','Executar alternativa','Equipe');
  await addCard(nested.nth(0),'end','Final alternativo');
  await addCard(nested.nth(1),'end','Final imediato');
  await dialog.locator('#asis-cards-confirm').check();await page.waitForFunction(()=>!document.getElementById('asis-cards-apply').disabled);
  await dialog.getByRole('button',{name:'Aplicar e salvar AS IS',exact:true}).click();await dialog.waitFor({state:'detached'});
  const expanded=await page.evaluate(async()=>{
   const viewer=new BpmnJS(bpmnModelerOptions('#original-canvas')),imported=await viewer.importXML(curProc.mod.bpmnAsIs);
   const elements=viewer.get('elementRegistry').getAll(),ends=elements.filter(el=>el.type==='bpmn:EndEvent');
   const laneNames=elements.filter(el=>el.type==='bpmn:Lane').map(el=>el.businessObject.name);
   const result={laneNames,startOwner:curProc.mod.asIsCards.start.executor,waitOwner:curProc.mod.asIsCards.cards[0].branches[0].cards[0].executor,warnings:imported.warnings.map(w=>w.message),ends:ends.length,noOutgoing:ends.every(el=>(el.businessObject.outgoing || []).length===0),xml:(await viewer.saveXML()).xml};viewer.destroy();return result;
  });
  assert.deepEqual(expanded.laneNames,['Equipe']);assert.equal(expanded.startOwner,'Equipe');assert.equal(expanded.waitOwner,'Equipe');
  assert.deepEqual(expanded.warnings,[]);assert.equal(expanded.ends,3);assert.equal(expanded.noOutgoing,true);
  for(const text of ['parallelGateway','inclusiveGateway','timerEventDefinition','PT30M','Pedido recebido'])assert.ok(expanded.xml.includes(text),text);
  // XOR paths have free labels, more than two exits, and no automatic link events.
  await page.evaluate(()=>{curProc={id:3,nome:'XOR com três saídas',mod:{}};processos=[curProc];});
  await page.getByRole('button',{name:'Experimentar esboço por cards'}).click();dialog=page.locator('#asis-cards-dialog');
  await dialog.locator('[data-action="add-decision"]').first().click();
  let editor=page.locator('#asis-card-editor');await editor.locator('[name="nome"]').fill('Encaminhar solicitação');
  await editor.locator('[name="branch-0"]').fill('Aprovar');await editor.locator('[name="branch-1"]').fill('Revisar');
  await editor.locator('[data-add-branch]').click();await editor.locator('[name="branch-2"]').fill('Arquivar');
  await editor.getByRole('button',{name:'Salvar card'}).click();
  const exits=dialog.locator('.asis-branches > section');assert.equal(await exits.count(),3);
  for(let index=0;index<3;index++)await addCard(exits.nth(index),'task','Executar '+index,'Equipe');
  await dialog.locator('[data-card]').first().locator('[data-action="edit"]').first().click();editor=page.locator('#asis-card-editor');
  await editor.locator('[name="branch-0"]').fill('Descartar alteração');await editor.getByRole('button',{name:'Cancelar',exact:true}).click();
  assert.equal(await exits.first().locator('h3').first().innerText(),'Aprovar');
  await dialog.locator('#asis-cards-confirm').check();await page.waitForFunction(()=>!document.getElementById('asis-cards-apply').disabled);
  await dialog.getByRole('button',{name:'Aplicar e salvar AS IS',exact:true}).click();await dialog.waitFor({state:'detached'});
  const multi=await page.evaluate(async()=>{
   const viewer=new BpmnJS(bpmnModelerOptions('#original-canvas'));const imported=await viewer.importXML(curProc.mod.bpmnAsIs);
   const outgoing=viewer.get('elementRegistry').get('Card_'+curProc.mod.asIsCards.cards[0].id).businessObject.outgoing.map(flow=>flow.name);
   const result={warnings:imported.warnings.map(w=>w.message),outgoing,xml:curProc.mod.bpmnAsIs,branches:curProc.mod.asIsCards.cards[0].branches};viewer.destroy();return result;
  });
  assert.deepEqual(multi.warnings,[]);assert.deepEqual(multi.outgoing,['Aprovar','Revisar','Arquivar']);assert.ok(!multi.xml.includes('linkEventDefinition'));assert.equal(multi.branches.length,3);
  await page.getByRole('button',{name:'Experimentar esboço por cards'}).click();dialog=page.locator('#asis-cards-dialog');
  assert.equal(await dialog.locator('.asis-branches > section').count(),3);assert.equal(await dialog.locator('[data-card]').count(),4);
  await dialog.locator('[data-card]').first().locator('[data-action="edit"]').first().click();editor=page.locator('#asis-card-editor');
  page.once('dialog',prompt=>{void prompt.dismiss();});await editor.locator('[data-remove-branch="2"]').click();assert.equal(await editor.locator('[data-branch-index]').count(),3);
  page.once('dialog',prompt=>{void prompt.accept();});await editor.locator('[data-remove-branch="2"]').click();assert.equal(await editor.locator('[data-branch-index]').count(),2);
  await editor.getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal(await dialog.locator('.asis-branches > section').count(),3);
  await dialog.getByRole('button',{name:'Fechar',exact:true}).click();await dialog.waitFor({state:'detached'});
  // Correction loop returns to the XOR, while its positive branch continues to a final event.
  await page.evaluate(()=>{curProc={id:4,nome:'Revisar até aprovar',mod:{}};processos=[curProc];});
  await page.getByRole('button',{name:'Experimentar esboço por cards'}).click();dialog=page.locator('#asis-cards-dialog');
  await addCard(dialog,'task','Preparar documentos','Equipe');await addCard(dialog.locator('.asis-cards-list > .asis-cards-add'),'decision','Documentação completa?');
  const loopPaths=dialog.locator('.asis-branches > section');
  await addCard(loopPaths.nth(0),'task','Aprovar documentos','Equipe');await addCard(loopPaths.nth(1),'task','Corrigir documentos','Equipe');
  await loopPaths.nth(1).locator('[data-action="add-return"]').click();editor=page.locator('#asis-card-editor');
  const targetId=await editor.locator('[name="targetId"] option').filter({hasText:'Documentação completa?'}).getAttribute('value');
  await editor.locator('[name="targetId"]').selectOption(targetId);await editor.getByRole('button',{name:'Salvar card'}).click();
  assert.equal(await loopPaths.nth(1).locator('.asis-cards-add').count(),0);
  await addCard(dialog.locator('.asis-cards-list > .asis-cards-add'),'task','Arquivar processo','Equipe');
  await dialog.locator('#asis-cards-confirm').check();await page.waitForFunction(()=>!document.getElementById('asis-cards-apply').disabled);
  await dialog.getByRole('button',{name:'Aplicar e salvar AS IS',exact:true}).click();await dialog.waitFor({state:'detached'});
  const loopResult=await page.evaluate(async()=>{
   const viewer=new BpmnJS(bpmnModelerOptions('#original-canvas')),imported=await viewer.importXML(curProc.mod.bpmnAsIs),registry=viewer.get('elementRegistry');
   const cards=curProc.mod.asIsCards.cards,gateway=cards[1],fix=gateway.branches[1].cards[0],back=gateway.branches[1].cards[1];
   const edges=registry.getAll().filter(el=>el.type==='bpmn:SequenceFlow');
   const logicalReturn=edges.some(edge=>{const bo=edge.businessObject;if(bo.sourceRef.id!=='Card_'+fix.id)return false;if(bo.targetRef.id==='Card_'+gateway.id)return true;const link=bo.targetRef.eventDefinitions?.find(def=>def.$type==='bpmn:LinkEventDefinition');return link?.target?.get('$parent')?.outgoing?.some(next=>next.targetRef.id==='Card_'+gateway.id);});
   const result={warnings:imported.warnings.map(w=>w.message),logicalReturn,targetId:back.targetId,gatewayId:gateway.id,steps:curProc.mod.etapas_proc.length,ends:registry.getAll().filter(el=>el.type==='bpmn:EndEvent').length};viewer.destroy();return result;
  });
  assert.deepEqual(loopResult.warnings,[]);assert.equal(loopResult.logicalReturn,true);assert.equal(loopResult.targetId,loopResult.gatewayId);assert.equal(loopResult.steps,5);assert.equal(loopResult.ends,1);
  // A closed loop cannot replace an existing AS IS, even when the handler is invoked directly.
  await page.evaluate(()=>{
   const task={id:'prep',type:'task',nome:'Preparar',executor:'Equipe'},back=id=>({id,type:'return',nome:'Voltar',targetId:'check'});
   const decision={id:'check',type:'decision',nome:'Conferência sem saída',branches:[{id:'a',nome:'Repetir A',cards:[back('ra')]},{id:'b',nome:'Repetir B',cards:[back('rb')]}]};
   curProc={id:5,nome:'Fluxo em validação',mod:{bpmnAsIs:originalXML,etapas_proc:[{id:'old',nome:'Original',desc:'Preservar'}],asIsCards:{version:3,cards:[task,decision]}}};processos=[curProc];
   window.beforeInvalid=JSON.stringify(curProc.mod);window.validationSaves=0;const save=fbSaveAll;fbSaveAll=async()=>{window.validationSaves++;return save();};
  });
  await page.getByRole('button',{name:'Experimentar esboço por cards'}).click();dialog=page.locator('#asis-cards-dialog');
  const validation=dialog.locator('#asis-cards-validation');assert.equal(await validation.getAttribute('data-state'),'error');
  assert.match(await validation.innerText(),/Ciclo sem saída/);assert.match(await validation.innerText(),/Conferência sem saída/);
  await dialog.locator('#asis-cards-confirm').check();assert.equal(await dialog.locator('#asis-cards-apply').isDisabled(),true);
  await dialog.getByRole('button',{name:'Verificar fluxo',exact:true}).click();
  await page.evaluate(async()=>{await document.getElementById('asis-cards-apply').onclick();});
  assert.equal(await page.evaluate(()=>validationSaves),0);assert.equal(await page.evaluate(()=>JSON.stringify(curProc.mod)),await page.evaluate(()=>beforeInvalid));
  const retryPaths=dialog.locator('.asis-branches > section');await retryPaths.nth(1).locator('[data-action="remove"]').click();
  await addCard(retryPaths.nth(1),'end','Concluir conferência','Equipe');
  await dialog.locator('#asis-cards-confirm').check();await page.waitForFunction(()=>!document.getElementById('asis-cards-apply').disabled);
  assert.equal(await validation.getAttribute('data-state'),'warning');assert.match(await validation.innerText(),/Existe saída para um final/);
  await dialog.getByRole('button',{name:'Aplicar e salvar AS IS',exact:true}).click();await dialog.waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>validationSaves),1);assert.ok(await page.evaluate(()=>curProc.mod.bpmnAsIs.includes('Concluir conferência')));
  await page.evaluate(async()=>{role='dono';await abrirEsbocoCards();});assert.equal(await page.locator('#asis-cards-dialog').count(),0);
  assert.deepEqual(errors,[]);console.log('AS IS por cards: BPMN real, gateways, retornos, validação/bloqueio de ciclos sem saída, alertas, persistência/rollback, histórico, permissões e mobile validados.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
