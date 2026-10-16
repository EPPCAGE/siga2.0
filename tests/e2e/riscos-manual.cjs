const {chromium}=require('playwright');
const {readFileSync}=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
  const html=readFileSync('processos.html','utf8');
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const start=html.indexOf('<div id="page-riscos"');
    await page.setContent(html.slice(start,html.indexOf('<div id="page-faq"',start))+'<div id="risco-list"></div><div id="risco-matrix"></div>');
    await page.addStyleTag({content:html.slice(html.indexOf('<style>')+7,html.indexOf('</style>'))});
    await page.addStyleTag({path:'src/processos/riscos-formularios.css'});
    await page.addScriptTag({path:'src/shared/riscos.js'});
    await page.addScriptTag({path:'src/shared/controles-catalogo.js'});
    await page.addScriptTag({path:'src/shared/controles-biblioteca.js'});
    await page.addScriptTag({path:'src/processos/controles-biblioteca-ui.js'});
    await page.evaluate(()=>{
      document.getElementById('page-riscos').classList.add('on');
      window.esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      let serial=0;window.crypto.randomUUID=()=> 'manual-test-'+(++serial);
      window.usuarioLogado={perfil:'ep',email:'ep@example.org'};window.isEP=()=>usuarioLogado.perfil==='ep';window.isCritico=()=>false;
      window.ARQUITETURA=[{id:'m',nome:'Macro',processos:[{id:'mapped',nome:'Processo em mapeamento',area:'DAUD',proc_id:1},{id:'pending',nome:'Processo sem mapeamento',area:'DAUD',subprocessos:[{id:'sub',nome:'Subprocesso',area:'DAUD'}]}]}];
      window.processos=[{id:1,arq_id:'mapped',nome:'Processo em mapeamento',ent:{riscos:[]}}];window.curProc=processos[0];
      window._arqSaveEnabled=true;window._fbLoadedAt=1;window.fbReady=()=>true;window.saved=null;window.saveFails=false;window.saves=0;
      window.fbSaveAll=async()=>{saves++;if(saveFails)return false;saved=JSON.parse(JSON.stringify({processos,ARQUITETURA}));return true;};
      window.fbAutoSave=()=>{saved=JSON.parse(JSON.stringify({processos,ARQUITETURA}));};
      window.FirestoreRepositories={collection:()=>({list:async()=>({docs:[]})})};
      window.toast=()=>{};window.pbBadge=value=>value;window.ibBadge=value=>value;window.rRiscoMatriz=()=>'';
      window.abrirInfoMeusProc=(arqId,pid)=>{window.openedInfo={arqId,pid};};
    });
    await page.addScriptTag({content:['riscoResposta','riscoControles','riscoControlesHtml','riscoControleForm','riscoControlesEditor','riscoLerControles','riscoMapeamentoDetalhes','rRiscoList','atualizarRiscoUI','criarProcesso'].map(name=>html.match(new RegExp('function '+name+'\\([^]*?\\n}'))[0]).join('\n')});
    await page.addScriptTag({path:'src/processos/riscos-module.js'});
    await page.evaluate(()=>rRiscos());
    await page.getByRole('button',{name:'+ Novo risco',exact:true}).click();
    const modal=page.locator('#risk-create-modal');
    await page.selectOption('#risk-create-process','mapped');await page.fill('#risk-create-description','Prazo legal manual');await page.selectOption('#risk-create-prob','Alta');await page.selectOption('#risk-create-impact','Critico');
    await modal.getByRole('button',{name:'Cadastrar risco',exact:true}).click();
    await modal.waitFor({state:'detached'});
    assert.equal(await page.evaluate(()=>saved.processos[0].ent.riscos[0].desc),'Prazo legal manual');
    assert.match(await page.locator('#risco-list').innerText(),/Prazo legal manual/);
    assert.match(await page.locator('.risk-item').innerText(),/Prazo legal manual/);
    assert.equal(await page.evaluate(()=>processos[0].ent.riscos[0].controles_existentes.length),0);
    // Response and controls remain optional; incomplete optional fields fail clearly.
    await page.getByRole('button',{name:'+ Novo risco',exact:true}).click();
    await page.selectOption('#risk-create-process','pending');await page.fill('#risk-create-description','Conferência incompleta');await page.selectOption('#risk-create-prob','Media');await page.selectOption('#risk-create-impact','Alto');
    await modal.locator('summary').filter({hasText:'Resposta proposta'}).click();
    await page.selectOption('#risk-create-response-type','Mitigar');
    await modal.getByRole('button',{name:'Cadastrar risco',exact:true}).click();
    assert.match(await page.locator('#risk-create-error').innerText(),/Complete/);
    await page.fill('#risk-create-response-action','Revisar a documentação');await page.fill('#risk-create-response-owner','Maria');
    await modal.locator('summary').filter({hasText:'Controles existentes'}).click();
    await modal.getByRole('button',{name:'+ Adicionar controle existente',exact:true}).click();
    await page.fill('#control-library-query','PRO-02');await page.getByRole('button',{name:'Selecionar controle',exact:true}).click();
    const control=modal.locator('.risk-existing-control');await control.locator('[data-control="descricao"]').fill('Checklist antes da aprovação');await control.locator('[data-control="responsavel"]').fill('João');await control.locator('[data-control="efetividade"]').selectOption('Eficaz');
    await page.evaluate(()=>saveFails=true);
    await modal.getByRole('button',{name:'Cadastrar risco',exact:true}).click();
    assert.match(await page.locator('#risk-create-error').innerText(),/Não foi possível salvar/);
    assert.equal(await page.evaluate(()=>ARQUITETURA[0].processos[1].riscos),undefined);
    await page.evaluate(()=>saveFails=false);
    await modal.getByRole('button',{name:'Cadastrar risco',exact:true}).click();await modal.waitFor({state:'detached'});
    assert.equal(await page.evaluate(()=>saved.ARQUITETURA[0].processos[1].riscos.length),1);
    assert.equal(await page.evaluate(()=>processos.length),1,'Cadastrar risco não deve iniciar um mapeamento artificial.');
    assert.equal(await page.locator('.risk-item').count(),2);
    await page.locator('.risk-item').filter({hasText:'Conferência incompleta'}).getByRole('button',{name:'Sobre o processo'}).click();
    assert.deepEqual(await page.evaluate(()=>openedInfo),{arqId:'pending',pid:null});
    // Reload the persisted snapshot, then use the actual mapping creation path.
    await page.evaluate(()=>{
      window.processos=JSON.parse(JSON.stringify(saved.processos));window.ARQUITETURA=JSON.parse(JSON.stringify(saved.ARQUITETURA));window.curProc=processos[0];
      const values={'novo-macro':'m','novo-proc-sel':'pending','novo-resp-ep':'EP','novo-gestor':'Gestor','novo-prio':'Normal','novo-produto':'AS IS','novo-objetivo':'Objetivo','novo-dono-nome':'Dono','novo-dono-email':'dono@example.org'};
      for(const [id,value] of Object.entries(values)){const input=document.createElement('input');input.id=id;input.value=value;document.body.append(input);}
      window.nextProcId=2;window.findArqItem=(mid,sid)=>ARQUITETURA.find(m=>m.id===mid).processos.find(p=>p.id===sid);
      window.now=()=>new Date().toISOString();window.syncDonoProcessoUsuario=()=>{};window.updCounts=()=>{};window.renderAdmin=()=>{};window.USUARIOS=[];window._abrirModalNotifInformativa=()=>{};window.getDonoEmail=p=>p.dono_email;
      window.abrirProc=id=>{window.curProc=processos.find(p=>p.id===id);atualizarRiscoUI();};
      criarProcesso();rRiscos();
    });
    assert.match(await page.locator('#risco-list').innerText(),/Conferência incompleta/);
    assert.match(await page.locator('#risco-list').innerText(),/Revisar a documentação/);
    assert.match(await page.locator('#risco-list').innerText(),/Checklist antes da aprovação/);
    assert.equal(await page.evaluate(()=>processos[1].ent.riscos.length),1);
    assert.equal(await page.evaluate(()=>ARQUITETURA[0].processos[1].riscos.length),0);
    assert.equal(await page.locator('.risk-item').count(),2,'O risco não deve aparecer duplicado após iniciar o mapeamento.');
    // Failed writes to mapped processes must not leave an extra risk locally.
    await page.getByRole('button',{name:'+ Novo risco',exact:true}).click();
    await page.selectOption('#risk-create-process','pending');await page.fill('#risk-create-description','Falha de gravação');await page.selectOption('#risk-create-prob','Baixa');await page.selectOption('#risk-create-impact','Baixo');
    await page.evaluate(()=>saveFails=true);await modal.getByRole('button',{name:'Cadastrar risco',exact:true}).click();
    assert.match(await page.locator('#risk-create-error').innerText(),/Não foi possível salvar/);
    assert.equal(await page.evaluate(()=>processos[1].ent.riscos.length),1);
    await modal.getByRole('button',{name:'Cancelar',exact:true}).click();await modal.waitFor({state:'detached'});await page.evaluate(()=>saveFails=false);
    // Edit permissions and mobile layout.
    await page.evaluate(()=>{usuarioLogado.perfil='dono';rRiscos();riscosCreate();});
    assert.equal(await page.locator('#risk-create-modal').count(),0);assert.equal(await page.locator('#riscos-new').isVisible(),false);
    await page.evaluate(()=>{usuarioLogado.perfil='ep';rRiscos();riscosCreate();});
    await page.setViewportSize({width:390,height:844});
    assert.ok(await modal.evaluate(el=>el.scrollWidth<=el.clientWidth));
    await modal.getByRole('button',{name:'Cancelar',exact:true}).click();
    assert.deepEqual(errors,[]);
    console.log('Risco manual: cadastro em mapeamento existente e arquitetura, resposta/controle opcionais, rollback, início real do mapeamento, ausência de duplicação, permissões e mobile validados.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
