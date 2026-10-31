// ═══════════════════════════════════════════════════════════════════
// MÓDULO DE PROJETOS — CAGE-RS
// scripts.js contém apenas a lógica do módulo de projetos.
// Autenticação e navegação são carregadas pelos módulos de src/shared/.
// ═══════════════════════════════════════════════════════════════════

let _projScheduleWriteContext = false;
function projApplyOrgBranding(){
  const noreplySuggestion = document.getElementById('proj-ejs-noreply-suggestion');
  if(noreplySuggestion) noreplySuggestion.textContent = ORG_CONFIG.noreplySuggestion;
  const subjectExample = document.getElementById('proj-ejs-subject-example');
  if(subjectExample) subjectExample.textContent = ORG_CONFIG.notificationFromName+' — Tarefa pendente: {{processo}}';
  const bodyExample = document.getElementById('proj-ejs-body-example');
  if(bodyExample){
    bodyExample.textContent = [
      'Olá, {{to_name}}.',
      '',
      'Você tem uma nova tarefa pendente no sistema '+ORG_CONFIG.systemBrand+':',
      '',
      'Processo: {{processo}}',
      'Ação necessária: {{acao}}',
      'Prazo: {{prazo}}',
      'Enviado por: {{from_name}}',
      '',
      'Acesse o sistema para realizar a ação:',
      '{{link}}',
      '',
      '---',
      ORG_CONFIG.automaticEmailFooter,
      'Não responda este e-mail.'
    ].join('\n');
  }
}
projApplyOrgBranding();
function projCanWriteAll(){ return isEP(); }
function projApplyPermissions(){
  const canEdit = projCanWriteAll();
  document.querySelectorAll('.ep-only').forEach(el => {
    el.style.display = canEdit ? '' : 'none';
  });
}
function projProjetosVinculadosUsuario(u = usuarioLogado){
  return Array.isArray(u?.projetos_vinculados) ? u.projetos_vinculados.map(id => String(id)) : [];
}
function projIsLinkedManager(projectId = _projCurrentId, u = usuarioLogado){
  return isGerenteProjeto() && projProjetosVinculadosUsuario(u).includes(String(projectId || ''));
}
function projCanWriteExec(){ return isEP(); }
function projCanWriteSchedule(projectId = _projCurrentId){ return isEP() || projIsLinkedManager(projectId); }

function projEnsureWriteAll(msg='Apenas EPP pode editar esta seção do módulo de projetos.'){
  if(projCanWriteAll()) return true;
  projToast(msg, '#d97706');
  return false;
}

function projEnsureWriteSchedule(msg='O perfil Projetos só pode editar o cronograma dos projetos vinculados.'){
  if(projCanWriteSchedule()) return true;
  projToast(msg, '#d97706');
  return false;
}
function projWithScheduleWrite(fn){
  if(!projEnsureWriteSchedule()) return;
  _projScheduleWriteContext = true;
  try { return fn(); }
  finally { _projScheduleWriteContext = false; }
}

function projLocalDateKey(date = new Date()){
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function projCloneScheduleTasks(tarefas){
  return JSON.parse(JSON.stringify(tarefas || []));
}

function projScheduleTasksCount(tarefas){
  return (tarefas || []).reduce((acc, t) => acc + 1 + projScheduleTasksCount(t.subtarefas || []), 0);
}

function projScheduleHasTasks(proj){
  return Array.isArray(proj?.execucao?.tarefas) && proj.execucao.tarefas.length > 0;
}

function projEnsureScheduleBackupBag(exec){
  if(!exec.cron_backups || Array.isArray(exec.cron_backups) || typeof exec.cron_backups !== 'object') exec.cron_backups = {};
  return exec.cron_backups;
}

function projPruneScheduleBackups(backups){
  const keys = Object.keys(backups || {}).sort((a, b) => a.localeCompare(b));
  while(keys.length > PROJ_SCHEDULE_BACKUP_MAX_DAYS){
    delete backups[keys.shift()];
  }
}

function projEnsureProjectDailyScheduleBackup(proj, dateKey = projLocalDateKey()){
  if(!projScheduleHasTasks(proj)) return false;
  if(!proj.execucao) proj.execucao = {};
  const backups = projEnsureScheduleBackupBag(proj.execucao);
  if(backups[dateKey]) return false;
  backups[dateKey] = {
    data: dateKey,
    criado_em: new Date().toISOString(),
    tarefas: projCloneScheduleTasks(proj.execucao.tarefas)
  };
  projPruneScheduleBackups(backups);
  return true;
}

function projPersistDailyScheduleBackups(){
  if(fbReady()){
    if(isEP()) projFbAutoSave('projetos').catch(()=>{});
    else if(_projCurrentId && projCanWriteSchedule(_projCurrentId)) projFbSaveCurrentScheduleProject().catch(e=>console.warn('projPersistDailyScheduleBackups:', e.message));
    return;
  }
  try { localStorage.setItem(PROJ_STORAGE_KEY, JSON.stringify(PROJETOS||[])); } catch(_e){}
}

function projEnsureDailyScheduleBackups(options = {}){
  const dateKey = options.dateKey || projLocalDateKey();
  let changed = false;
  (PROJETOS || []).forEach(proj => {
    if(projEnsureProjectDailyScheduleBackup(proj, dateKey)) changed = true;
  });
  if(changed && options.persist !== false) projPersistDailyScheduleBackups();
  return changed;
}

function projEnsureCurrentScheduleBackupBeforeMutation(proj){
  return projEnsureProjectDailyScheduleBackup(proj);
}

function _fsCleanArray(v, insideArray){
  const arr = v.map(item => _fsClean(item, true));
  return insideArray ? { items: arr } : arr;
}

function _fsCanCleanObject(v){
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function _fsCleanKeyAllowed(k, value){
  return !['__proto__', 'constructor', 'prototype'].includes(k) && value !== undefined;
}

function _fsCleanObject(v){
  if(!_fsCanCleanObject(v)) return null;
  const r = {};
  for(const k of Object.keys(v)){
    if(!_fsCleanKeyAllowed(k, v[k])) continue;
    Object.defineProperty(r, k, {
      value: _fsClean(v[k], false),
      enumerable: true,
      writable: true,
      configurable: true
    });
  }
  return r;
}

function _fsCleanScalar(v){
  if(typeof v === 'number') return Number.isFinite(v) ? v : null;
  if(typeof v === 'function' || typeof v === 'symbol') return null;
  return v;
}

function _fsClean(v, insideArray){
  if(v===null||v===undefined) return null;
  if(v instanceof Date) return v;
  if(Array.isArray(v)) return _fsCleanArray(v, insideArray);
  if(typeof v==='object') return _fsCleanObject(v);
  return _fsCleanScalar(v);
}

let PROJETOS = [];
let PROGRAMAS = [];
let PROJ_GOVERNANCA = { demandas: [], reunioes: [] };
let _projCurrentId = null; // ID do projeto em visualização
let _projCurrentPage = 'inicio';
let _projCurrentWorkflowTab = null;
let _projScheduleBackupLastDate = projLocalDateKey();
let _projReunioesCalendarMonth = null;
let _progCurrentId = null; // ID do programa em visualização
const PROJ_STORAGE_KEY = 'cagePROJETOS_v6';
const PROG_STORAGE_KEY = 'cagePROGRAMAS_v6';
const PROJ_GOV_STORAGE_KEY = 'cagePROJ_GOVERNANCA_v1';
const PROJ_SCHEDULE_BACKUP_MAX_DAYS = 14;
const PROJ_CRON_NAME_WIDTH_MAX_FACTOR = 2;

// ── Fases do workflow ────────────────────────────────────────────
const PROJ_FASES = [
  { id:'aprovacao',   label:'Aprovação',          short:'Aprovação'   },
  { id:'ideacao',     label:'Ideação',             short:'Ideação'     },
  { id:'planejamento',label:'Planejamento',        short:'Planejamento'},
  { id:'execucao',    label:'Execução/Monit.',     short:'Execução'    },
  { id:'conclusao',   label:'Conclusão',           short:'Conclusão'   },
];
const FASE_IDX = Object.fromEntries(PROJ_FASES.map((f,i)=>[f.id,i]));

let PROJ_MACROS = [];
let PROJ_ARQUITETURA = [];

function projArquiteturaAtual() {
  return typeof ARQUITETURA !== 'undefined' && Array.isArray(ARQUITETURA) ? ARQUITETURA : PROJ_ARQUITETURA;
}

function projMacroKey(value) {
  return projStrategyBaseName(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function projResolveMacro(value) {
  const matches = projArquiteturaAtual().filter(m => projMacroKey(m.nome) === projMacroKey(value));
  return matches.length === 1 ? matches[0] : null;
}

function projSyncArquitetura() {
  const arquitetura = projArquiteturaAtual();
  AreasArquitetura.migrate(arquitetura);
  PROJ_MACROS = arquitetura.map(m => m.nome);
  (PROJETOS || []).forEach(p => {
    ObjetivosEstrategicos.migrateProject(p, PROJ_OBJETIVOS);
    p.divisao = AreasArquitetura.resolve(p.divisao, arquitetura);
    const ids = new Set((p.macroprocesso_ids || []).map(String));
    const previousNames = p.macroprocesso_nomes || {};
    p.macroprocessos = [...new Set((p.macroprocessos || []).map(value => {
      const previousId = Object.keys(previousNames).find(id => ids.has(id) && previousNames[id] === value);
      const macro = previousId ? arquitetura.find(m => String(m.id) === previousId) : projResolveMacro(value);
      if(macro) ids.add(String(macro.id));
      return macro ? macro.nome : value;
    }))];
    p.macroprocesso_ids = [...ids];
    p.macroprocesso_nomes = {...previousNames};
    arquitetura.forEach(m => {
      if(ids.has(String(m.id))) {
        p.macroprocesso_nomes[String(m.id)] = m.nome;
        if(!p.macroprocessos.includes(m.nome)) p.macroprocessos.push(m.nome);
      }
    });
  });
}

function projApplyArquitetura(data) {
  if(!Array.isArray(data)) throw new Error('Arquitetura inválida.');
  PROJ_ARQUITETURA = data;
  projSyncArquitetura();
}

async function projLoadArquitetura() {
  const snap = await configRepository.get('arquitetura');
  projApplyArquitetura(snap.exists() && snap.data()?.data ? JSON.parse(snap.data().data) : []);
}

function projProcessosArquitetura() {
  return projArquiteturaAtual().flatMap(m => (m.processos || []).map(p => ({
    macro_id: String(m.id), processo_id: String(p.id), macro: m.nome, nome: p.nome
  })));
}
let PROJ_OBJETIVOS = [...ObjetivosEstrategicos.defaults];
const PROJ_FB = Object.freeze({
  colProjetos: 'projPROJETOS',
  colProgramas: 'projPROGRAMAS',
  cfgCol: 'config',
  cfgObjetivosId: ObjetivosEstrategicos.configId,
  cfgGovernancaId: 'proj_governanca'
});
let _projRiscoEdit = null; // {proj, idx} — risco em edição na aba Planejamento
let _projRiscosMigrados = false; // sinaliza que a carga alterou riscos e precisa ser gravada

const _projFbState = {loaded:false, loading:false, saveTimer:null, listenersStarted:false, unsubscribers:[], saving:false, pendingRender:false};

function projRepositoryFor(col){
  if(col === PROJ_FB.colProjetos) return projetosRepository;
  if(col === PROJ_FB.colProgramas) return programasRepository;
  return FirestoreRepositories.collection(col);
}

function projApplyDataSet(data){
  PROJETOS = Array.isArray(data?.projetos) ? data.projetos.map(function(p){return projFixDefaults(p);}) : [];
  PROGRAMAS = Array.isArray(data?.programas) ? data.programas.map(function(pg){return progFixDefaults(pg);}) : [];
  projSyncArquitetura();
  if(Array.isArray(data?.objetivos)) PROJ_OBJETIVOS = data.objetivos;
}

async function projFetchDefaultData(){
  try{
    const res = await fetch('projetos-default.json', {cache:'no-store'});
    if(!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data?.projetos) ? data : null;
  }catch(e){
    console.warn('projFetchDefaultData:', e.message);
    return null;
  }
}

function projLoadListas(){
  if(fbReady()) return;
  try{
    projSyncArquitetura();
    const o=localStorage.getItem('cage_objetivos_v6');if(o)PROJ_OBJETIVOS=JSON.parse(o);
  }catch(e){}
}
function projSaveListas(){
  if(!projEnsureWriteAll('Apenas EPP pode editar Macroprocessos e Objetivos Estratégicos.')) return false;
  if(!fbReady()){
    localStorage.setItem('cage_objetivos_v6',JSON.stringify(PROJ_OBJETIVOS));
  }
  void projFbAutoSave('listas').catch(() => {});
  return true;
}

async function projFbSyncCollection(col, items){
  await FirestoreRepositories.syncCollection(projRepositoryFor(col), items, _fsClean, 400);
}

async function projFbSaveCurrentScheduleProject(){
  if(!fbReady()) throw new Error('Firebase indisponível.');
  const proj = (PROJETOS||[]).find(p => String(p.id) === String(_projCurrentId));
  if(!proj) throw new Error('Projeto não encontrado.');
  const exec = proj.execucao || {};
  await projetosRepository.set(proj.id, _fsClean({
    percentual: proj.percentual || 0,
    execucao: {
      planner_link: exec.planner_link || '',
      percentual: exec.percentual || proj.percentual || 0,
      tarefas: exec.tarefas || [],
      cron_backups: exec.cron_backups || {},
      cron_mode: exec.cron_mode || 'planner',
      pct_mode: exec.pct_mode || 'manual',
      cron_wrap_names: exec.cron_wrap_names === true,
      cron_nome_col_width: exec.cron_nome_col_width || null,
      cron_nome_col_saved_width: exec.cron_nome_col_saved_width || null,
      cron_nome_col_base_width: exec.cron_nome_col_base_width || null
    }
  }), { merge: true });
}

async function projFbSaveAll(options){
  const includeConfig = !options || options.includeConfig !== false;
  if(!fbReady()) throw new Error('Firebase indisponível.');
  _projFbState.saving = true;
  try{
    await projFbSyncCollection(PROJ_FB.colProjetos, PROJETOS||[]);
    await projFbSyncCollection(PROJ_FB.colProgramas, PROGRAMAS||[]);
    if(includeConfig){
      await configRepository.set(PROJ_FB.cfgObjetivosId, {data: JSON.stringify(PROJ_OBJETIVOS||[])});
      await configRepository.set(PROJ_FB.cfgGovernancaId, {data: JSON.stringify(PROJ_GOVERNANCA)});
    }
    try{
      localStorage.setItem(PROJ_STORAGE_KEY, JSON.stringify(PROJETOS||[]));
      localStorage.setItem(PROG_STORAGE_KEY, JSON.stringify(PROGRAMAS||[]));
      localStorage.setItem('cage_objetivos_v6', JSON.stringify(PROJ_OBJETIVOS||[]));
      localStorage.setItem(PROJ_GOV_STORAGE_KEY, JSON.stringify(PROJ_GOVERNANCA));
    }catch(_e){}
  } finally {
    _projFbState.saving = false;
    if(_projFbState.pendingRender){
      _projFbState.pendingRender = false;
      projRenderCurrentPage();
    }
  }
}

function projFbAutoSave(label){
  if(!fbReady()) return Promise.resolve();
  clearTimeout(_projFbState.saveTimer);
  _projFbState.saving = true;
  return new Promise((resolve, reject)=>{
    _projFbState.saveTimer = setTimeout(()=>{
    void projFbSaveAll({includeConfig: label === 'listas' || label === 'importar' || label === 'governanca'}).then(resolve, e=>{
      console.warn('projFbAutoSave('+label+'):', e.message);
      try { projToast('Erro ao salvar na nuvem: ' + e.message, '#dc2626'); } catch(_e){}
      _projFbState.saving = false;
      reject(e);
    });
    }, 500);
  });
}

function projOpenScheduleLink(){
  if(globalThis._projScheduleLinkHandled) return false;
  const params=new URLSearchParams(window.location.search);
  const id=params.get('projeto');
  if(!id || params.get('aba')!=='execucao') return false;
  if(!document.getElementById('proj-shell')?.classList.contains('on') || (fbReady() && !_projFbState.loaded)) return false;
  globalThis._projScheduleLinkHandled=true;
  if(!PROJETOS.some(project=>String(project.id)===id)){projToast('Projeto não encontrado ou indisponível.','var(--red)');return false;}
  _projCurrentId=id;
  _projCurrentWorkflowTab='execucao';
  projAbrirDetalhe(id,true,true);
  requestAnimationFrame(()=>document.getElementById('exec-cronograma-section')?.scrollIntoView({block:'start'}));
  return true;
}

function projRenderCurrentPage(){
  if(projOpenScheduleLink()) return;
  const active = document.querySelector('.proj-nav-btn.on');
  const page = _projCurrentPage || (active ? (active.id||'').replace('pnb-','') : 'inicio');
  if(document.getElementById('proj-shell')?.classList.contains('on')){
    if(page === 'detalhe' && _projCurrentId){
      projAbrirDetalhe(_projCurrentId, _projCurrentWorkflowTab==='execucao', true);
      return;
    }
    const btn = document.getElementById('pnb-' + page) || active || document.getElementById('pnb-inicio');
    projGo(page || 'inicio', btn);
  }
}

function projCacheCloudState(){
  try{
    localStorage.setItem(PROJ_STORAGE_KEY, JSON.stringify(PROJETOS||[]));
    localStorage.setItem(PROG_STORAGE_KEY, JSON.stringify(PROGRAMAS||[]));
    localStorage.setItem('cage_objetivos_v6', JSON.stringify(PROJ_OBJETIVOS||[]));
    localStorage.setItem(PROJ_GOV_STORAGE_KEY, JSON.stringify(PROJ_GOVERNANCA));
  }catch(_e){}
}

function projCloudRender(){
  _projFbState.loaded = true;
  projSyncArquitetura();
  projEnsureDailyScheduleBackups();
  projCacheCloudState();
  if(_projFbState.saving){
    _projFbState.pendingRender = true;
    return;
  }
  projRenderCurrentPage();
}

function projFbStartRealtime(){
  if(!fbReady() || _projFbState.listenersStarted) return;
  const {onSnapshot} = fb();
  if(!onSnapshot) return;
  _projFbState.listenersStarted = true;
  _projFbState.unsubscribers = [
    onSnapshot(projetosRepository.colRef(), snap => {
      if(_projFbState.saving){ _projFbState.pendingRender = true; return; }
      PROJETOS = [];
      snap.forEach(d => {
        PROJETOS.push(projFixDefaults(d.data()));
        FirestoreRepositories.touchSyncCache(PROJ_FB.colProjetos, d.id, _fsClean(d.data()));
      });
      projCloudRender();
    }, e => console.warn('proj projetos snapshot:', e.message)),
    onSnapshot(programasRepository.colRef(), snap => {
      if(_projFbState.saving){ _projFbState.pendingRender = true; return; }
      PROGRAMAS = [];
      snap.forEach(d => {
        PROGRAMAS.push(progFixDefaults(d.data()));
        FirestoreRepositories.touchSyncCache(PROJ_FB.colProgramas, d.id, _fsClean(d.data()));
      });
      projCloudRender();
    }, e => console.warn('proj programas snapshot:', e.message)),
    onSnapshot(configRepository.ref('arquitetura'), snap => {
      try {
        projApplyArquitetura(snap.exists() && snap.data()?.data ? JSON.parse(snap.data().data) : []);
        projCloudRender();
      } catch(e) { console.warn('proj arquitetura:', e.message); }
    }, e => console.warn('proj macros snapshot:', e.message)),
    onSnapshot(configRepository.ref(PROJ_FB.cfgObjetivosId), snap => {
      if(_projFbState.saving){ _projFbState.pendingRender = true; return; }
      if(snap.exists() && typeof snap.data()?.data === 'string'){
        try{ PROJ_OBJETIVOS = JSON.parse(snap.data().data); }catch(_e){}
        projCloudRender();
      }
    }, e => console.warn('proj objetivos snapshot:', e.message)),
    onSnapshot(configRepository.ref(PROJ_FB.cfgGovernancaId), snap => {
      if(_projFbState.saving){ _projFbState.pendingRender = true; return; }
      if(snap.exists() && typeof snap.data()?.data === 'string'){
        try{ PROJ_GOVERNANCA = projGovFixData(JSON.parse(snap.data().data)); }catch(_e){}
        projCloudRender();
      }
    }, e => console.warn('proj governanca snapshot:', e.message))
  ];
}

async function projFbSeedIfEmpty(pSnap, gSnap){
  if(!pSnap.empty || !gSnap.empty) return false;
  const defaultData = await projFetchDefaultData();
  if(defaultData){
    projApplyDataSet(defaultData);
    await projFbSaveAll();
    return true;
  }
  if((PROJETOS||[]).length || (PROGRAMAS||[]).length){
    await projFbSaveAll();
    return true;
  }
  return false;
}

function projFbApplyCollectionSnaps(pSnap, gSnap){
  if(!pSnap.empty){
    PROJETOS = [];
    pSnap.docs.forEach(d=>PROJETOS.push(projFixDefaults(d.data)));
  }
  if(!gSnap.empty){
    PROGRAMAS = [];
    gSnap.docs.forEach(d=>PROGRAMAS.push(progFixDefaults(d.data)));
  }
}

async function projFbLoadConfigDoc(cfgId, currentData, applyData){
  const snap = await configRepository.get(cfgId);
  if(snap.exists() && typeof snap.data()?.data === 'string'){
    try{ applyData(JSON.parse(snap.data().data)); }catch(_e){}
    return;
  }
  await configRepository.set(cfgId, {data: JSON.stringify(currentData||[])});
}

async function projFbLoadOnce(){
  if(!fbReady() || _projFbState.loaded || _projFbState.loading) return;
  _projFbState.loading = true;
  try{
    const [pSnap, gSnap] = await Promise.all([
      projetosRepository.list(),
      programasRepository.list()
    ]);

    // Fallback/migração: se a nuvem estiver vazia, semeia pela base padrão versionada.
    const seeded = await projFbSeedIfEmpty(pSnap, gSnap);
    _projRiscosMigrados = false;
    if(!seeded) projFbApplyCollectionSnaps(pSnap, gSnap);
    if(_projRiscosMigrados && !seeded && isEP()){ _projRiscosMigrados = false; projFbAutoSave('projetos').catch(()=>{}); }
    await Promise.all([
      projLoadArquitetura(),
      projFbLoadConfigDoc(PROJ_FB.cfgObjetivosId, PROJ_OBJETIVOS, data => { PROJ_OBJETIVOS = data; }),
      projFbLoadConfigDoc(PROJ_FB.cfgGovernancaId, PROJ_GOVERNANCA, data => { PROJ_GOVERNANCA = projGovFixData(data); })
    ]);

    projFbStartRealtime();

    projCloudRender();
  } catch(e){ console.warn('projFbLoadOnce:', e.message); }
  finally { _projFbState.loading = false; }
}


// ── Persistência ─────────────────────────────────────────────────
function projLoad() {
  if(fbReady()){
    if(!_projFbState.loaded) projFbLoadOnce().catch(e=>console.warn('projLoad/fb:',e.message));
    PROJETOS = (PROJETOS||[]).map(p => projFixDefaults(p));
    projSyncArquitetura();
    PROGRAMAS = (PROGRAMAS||[]).map(pg => progFixDefaults(pg));
    if(_projFbState.loaded) projEnsureDailyScheduleBackups();
    return;
  }
  try {
    const raw = localStorage.getItem(PROJ_STORAGE_KEY);
    PROJETOS = raw ? JSON.parse(raw) : [];
  } catch(e) {
    PROJETOS = [];
  }
  // Ensure each project has proper structure
  PROJETOS = PROJETOS.map(p => projFixDefaults(p));
  projEnsureDailyScheduleBackups();
  // Load programas and lists too
  progLoad();
  projLoadListas();
  projGovLoad();
  projFbLoadOnce().catch(e=>console.warn('projLoad/fb:',e.message));
}

function projSave() {
  if(usuarioLogado && !isEP() && !_projScheduleWriteContext){
    projToast('Seu perfil tem acesso somente de visualização no SIGA Projetos.', '#d97706');
    return false;
  }
  if(usuarioLogado && !isEP() && _projScheduleWriteContext){
    if(fbReady()){
      projFbSaveCurrentScheduleProject().catch(e => {
        console.warn('projFbSaveCurrentScheduleProject:', e.message);
        try { projToast('Erro ao salvar cronograma na nuvem: ' + e.message, '#dc2626'); } catch(_e){}
      });
      return true;
    }
    try {
      localStorage.setItem(PROJ_STORAGE_KEY, JSON.stringify(PROJETOS));
      return true;
    } catch(e) {
      projToast('Erro ao salvar cronograma.', 'var(--red)');
      return false;
    }
  }
  if(fbReady()){
    projFbAutoSave('projetos').catch(()=>{});
    return true;
  }
  try {
    localStorage.setItem(PROJ_STORAGE_KEY, JSON.stringify(PROJETOS));
    void projFbAutoSave('projetos').catch(() => {});
    return true;
  } catch(e) {
    projToast('Erro ao salvar dados.', 'var(--red)');
    return false;
  }
}

// ── Persistência de Programas ───────────────────────────────────
setInterval(() => {
  const today = projLocalDateKey();
  if(today === _projScheduleBackupLastDate) return;
  _projScheduleBackupLastDate = today;
  projLoad();
  if(projEnsureDailyScheduleBackups() && _projCurrentId && _projCurrentWorkflowTab === 'execucao') {
    projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
  }
}, 60000);

function progLoad() {
  if(fbReady()){
    if(!_projFbState.loaded) projFbLoadOnce().catch(e=>console.warn('progLoad/fb:',e.message));
    PROGRAMAS = (PROGRAMAS||[]).map(pg => progFixDefaults(pg));
    return;
  }
  try {
    const raw = localStorage.getItem(PROG_STORAGE_KEY);
    PROGRAMAS = raw ? JSON.parse(raw) : [];
  } catch(e) {
    PROGRAMAS = [];
  }
  PROGRAMAS = PROGRAMAS.map(pg => progFixDefaults(pg));
}

function progSave() {
  if(usuarioLogado && !isEP()){
    projToast('Apenas EPP pode editar programas.', '#d97706');
    return false;
  }
  if(fbReady()){
    projFbAutoSave('programas').catch(()=>{});
    return true;
  }
  try {
    localStorage.setItem(PROG_STORAGE_KEY, JSON.stringify(PROGRAMAS));
    void projFbAutoSave('programas').catch(() => {});
    return true;
  } catch(e) {
    projToast('Erro ao salvar programas.', 'var(--red)');
    return false;
  }
}

function progFixDefaults(pg) {
  const now = new Date().toISOString().split('T')[0];
  return {
    id: pg.id || Date.now(),
    nome: pg.nome || 'Sem nome',
    descricao: pg.descricao || '',
    gerente: pg.gerente || '',
    patrocinador: pg.patrocinador || '',
    status: pg.status || 'ativo', // ativo | concluido | cancelado
    dt_criacao: pg.dt_criacao || now
  };
}

// Calcula percentual médio dos projetos do programa (ponderado igualmente)
function progPercentualMedio(programaId) {
  const projs = PROJETOS.filter(p => String(p.programa_id) === String(programaId));
  if(projs.length === 0) return 0;
  const soma = projs.reduce((acc, p) => acc + (p.percentual||0), 0);
  return Math.round(soma / projs.length);
}

function projFixDefaults(p) {
  const now = new Date().toISOString().split('T')[0];
  return {
    id: p.id || Date.now(),
    nome: p.nome || 'Sem nome',
    gerente: p.gerente || '',
    gerente_substituto: p.gerente_substituto || '',
    descricao: p.descricao || '',
    dt_inicio: p.dt_inicio || '',
    dt_fim: p.dt_fim || '',
    patrocinador: p.patrocinador || '',
    fonte: p.fonte || '',
    fase_atual: p.fase_atual || 'aprovacao',
    status: p.status || 'ativo', // ativo | concluido | cancelado
    percentual: p.percentual || 0,
    status_report_obs: p.status_report_obs || '',
    icone_url: p.icone_url || '',
    icone_emoji: p.icone_emoji || '📁',
    divisao: p.divisao || '',
    dt_criacao: p.dt_criacao || now,
    programa_id: p.programa_id || null,
    macroprocessos: p.macroprocessos || [],
    macroprocesso_ids: Array.isArray(p.macroprocesso_ids) ? p.macroprocesso_ids : [],
    macroprocesso_nomes: p.macroprocesso_nomes || {},
    processos_impactados: Array.isArray(p.processos_impactados) ? p.processos_impactados : [],
    objetivos_estrategicos: p.objetivos_estrategicos || [],
    ppe_ciclos: (p.ppe_ciclos && typeof p.ppe_ciclos === 'object' && !Array.isArray(p.ppe_ciclos)) ? p.ppe_ciclos : {},
    // Dados de cada fase
    aprovacao: p.aprovacao || {
      motivo_inicio: '', aprovado: false, dt_aprovacao: '', obs: ''
    },
    ideacao: p.ideacao || {
      descricao:'', objetivo_smart:'', beneficios:'',
      requisitos:'', premissas:'', restricoes:'',
      entregas_macro:'', riscos_canvas:'', equipe:'',
      partes_interessadas:'', objetivo_estrategico:'',
      custos:'', resultados_esperados:'', acoes_imediatas:''
    },
    planejamento: projPlanejamentoSincronizarCanvas(projPlanejamentoMigrar(p.planejamento), p.ideacao) || {
      eap_html: '', eap_link: '', riscos: [], planner_link: ''
    },
    execucao: p.execucao || {
      planner_link: '',
      percentual: p.percentual || 0,
      reunioes: []
    },
    conclusao: p.conclusao || {
      tipo: '', // 'sucesso' | 'cancelamento'
      dt_conclusao: '',
      link_termo_aceite: '',
      historia: '',
      links_noticias: ''
    }
  };
}

// ── Navegação interna do módulo de projetos ──────────────────────
function projGo(pageId, btnEl) {
  if(pageId==='inicio' && projOpenScheduleLink()) return;
  _projCurrentPage = pageId || 'inicio';
  // Hide all pages
  document.querySelectorAll('.proj-page').forEach(p => p.classList.remove('on'));
  // Deactivate all nav buttons
  document.querySelectorAll('.proj-nav-btn').forEach(b => b.classList.remove('on'));
  // Show target page
  const page = document.getElementById('proj-page-' + pageId);
  if(page) page.classList.add('on');
  if(btnEl) btnEl.classList.add('on');
  // Render page
  switch(pageId) {
    case 'inicio':    projRenderInicio(); break;
    case 'portfolio': projRenderPortfolio(); break;
    case 'concluidos': projRenderConcluidos(); break;
    case 'programas': progRenderPage(); break;
    case 'estrategia': projRenderEstrategiaPage(); break;
    case 'governanca': projRenderGovernancaPage(); break;
    case 'usuarios':  projRenderUsuariosPage(); break;
    case 'status-report': projRenderStatusReport(); break;
    case 'indicadores': projRenderIndicadoresPage(); break;
    case 'novo':      projRenderNovo(); break;
  }
}

// ── Sidebar toggle ────────────────────────────────────────────────
function toggleProjSidebar() {
  const aside = document.getElementById('proj-aside');
  const toggle = document.getElementById('proj-sidebar-toggle');
  aside.classList.toggle('collapsed');
  const isCollapsed = aside.classList.contains('collapsed');
  toggle.textContent = isCollapsed ? '▶' : '◀';
  toggle.style.left = isCollapsed ? '0px' : '240px';
  toggle.style.left = isCollapsed ? '0px' : '240px';
}

// ── Toast ──────────────────────────────────────────────────────────
function projToast(msg, color) {
  const el = document.createElement('div');
  el.className = 'proj-toast';
  el.textContent = msg;
  if(color) el.style.background = color;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ── Utilitários ────────────────────────────────────────────────────
function projEsc(s) {
  return String(s||'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}

// Sanitiza HTML gerado por usuário: strip de event handlers e tags perigosas.
// Não use para templates de desenvolvedor que contenham handlers (use projSetHtml).
function projSafeHtml(html) {
  const value = String(html || '');
  if(globalThis.DOMPurify && typeof globalThis.DOMPurify.sanitize === 'function') {
    return globalThis.DOMPurify.sanitize(value, {
      ADD_ATTR: ['target'],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'base'],
      FORBID_ATTR: ['srcdoc'],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
    });
  }
  return projEsc(value);
}

// Renderiza HTML de desenvolvedor (templates internos com event handlers).
// Só use com strings literais do código — nunca com input do usuário direto.
function projDeveloperHtml(html) {
  const value = String(html || '');
  if(globalThis.DOMPurify && typeof globalThis.DOMPurify.sanitize === 'function') {
    return globalThis.DOMPurify.sanitize(value, {
      ADD_ATTR: [
        'target',
        'onclick', 'onchange', 'oninput', 'onblur', 'onfocus', 'onsubmit',
        'onkeydown', 'onkeyup', 'onmousedown', 'onmouseup', 'onmouseover', 'onmouseout'
      ],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'base'],
      FORBID_ATTR: ['srcdoc'],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
    });
  }
  return projSafeHtml(value);
}

function projHtmlFragment(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = projDeveloperHtml(html);
  return tpl.content.cloneNode(true);
}

function projSetHtml(el, html) {
  if(!el) return;
  el.replaceChildren(projHtmlFragment(html));
}


function projAppendHtml(el, position, html) {
  if(!el) return;
  const fragment = projHtmlFragment(html);
  switch(position) {
    case 'beforebegin': {
      if (el.parentNode) el.parentNode.insertBefore(fragment, el);
      break;
    }
    case 'afterbegin':
      el.insertBefore(fragment, el.firstChild);
      break;
    case 'beforeend':
      el.appendChild(fragment);
      break;
    case 'afterend': {
      if (el.parentNode) el.parentNode.insertBefore(fragment, el.nextSibling);
      break;
    }
    default:
      el.appendChild(fragment);
  }
}

function projNormKey(s) {
  return String(s||'').trim().toLowerCase();
}

function projUserDisplayName(u) {
  return String(u?.nome || u?.name || u?.email || '').trim();
}

function projUserInitials(label) {
  const parts = String(label||'').trim().split(/\s+/).filter(Boolean);
  if(!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length-1][0] : '')).toUpperCase();
}

function projUsersLinkedToProject(projectId) {
  const id = String(projectId || '');
  return (USUARIOS||[]).filter(u => projProjetosVinculadosUsuario(u).includes(id))
    .slice()
    .sort((a,b) => projUserDisplayName(a).localeCompare(projUserDisplayName(b), 'pt-BR'));
}

function projFindProjectUserByResponsibleValue(projectId, value) {
  const key = projNormKey(value);
  if(!key) return null;
  return projUsersLinkedToProject(projectId).find(u => {
    const nome = projNormKey(projUserDisplayName(u));
    const email = projNormKey(u.email);
    return key === nome || key === email || key === `${nome} <${email}>`;
  }) || null;
}

function projResponsibleLabel(t) {
  const email = projNormKey(t?.responsavel_email);
  if(email) {
    const u = (USUARIOS||[]).find(x => projNormKey(x.email) === email);
    if(u) return projUserDisplayName(u);
  }
  return String(t?.responsavel || '').trim();
}

function projUserByResponsibleText(value) {
  const key = projNormKey(value);
  if(!key) return null;
  return (USUARIOS||[]).find(u => projNormKey(projUserDisplayName(u)) === key || projNormKey(u.email) === key) || null;
}

function projProjectResponsibleOptions(projectId) {
  const users = projUsersLinkedToProject(projectId);
  if(!users.length) return '';
  return `<datalist id="proj-responsaveis-options">${users.map(u => {
    const name = projUserDisplayName(u);
    return `<option value="${projEsc(name)}" label="${projEsc(u.email||'')}"></option>`;
  }).join('')}</datalist>`;
}

function projFaseLabel(id) {
  const f = PROJ_FASES.find(f=>f.id===id);
  return f ? f.label : id;
}

function projFaseBadgeClass(status, fase) {
  if(status === 'concluido') return 'lb-concluido';
  if(status === 'cancelado') return 'lb-cancelado';
  if(fase === 'execucao') return 'lb-execucao';
  if(fase === 'planejamento') return 'lb-planejamento';
  return 'lb-ideacao';
}

function projFaseText(p) {
  if(p.status === 'concluido') return 'Concluído';
  if(p.status === 'cancelado') return 'Cancelado';
  return projFaseLabel(p.fase_atual);
}

function projGetMesAtual() {
  const now = new Date();
  return { mes: now.getMonth(), ano: now.getFullYear() };
}

function projFormatDate(iso) {
  if(!iso) return '';
  const parts = iso.split('-');
  if(parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return iso;
}

// ── CONFIRMAÇÃO DUPLA ─────────────────────────────────────────────
function projParseIsoDate(iso) {
  const parts = String(iso||'').split('-').map(Number);
  if(parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
  return { ano: parts[0], mes: parts[1] - 1, dia: parts[2] };
}

function projIsoInMonth(iso, monthValue) {
  const d = projParseIsoDate(iso);
  if(!d || !monthValue) return false;
  const parts = monthValue.split('-').map(Number);
  return d.ano === parts[0] && d.mes === parts[1] - 1;
}

function projMonthValue(date) {
  const d = date || new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0');
}

function projMonthFirstDay(date) {
  return projMonthValue(date) + '-01';
}

function projMonthLabel(monthValue) {
  if(!monthValue) return '';
  const parts = monthValue.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, 1);
  const txt = d.toLocaleDateString('pt-BR', {month:'long', year:'numeric'});
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

function projIconHtml(p, cls) {
  const klass = cls || 'proj-mini-icon';
  if(p && p.icone_url) return `<span class="${klass}"><img src="${projEsc(p.icone_url)}" alt=""></span>`;
  return `<span class="${klass}">${projEsc((p && p.icone_emoji) || '📁')}</span>`;
}

function projConfirmar(msg, onConfirm) {
  const dialog = document.getElementById('modal-confirm');
  const msgEl = document.getElementById('modal-confirm-msg');
  const okBtn = document.getElementById('modal-confirm-ok');
  if(!dialog || !msgEl || !okBtn) {
    if(confirm(msg)) onConfirm();
    return;
  }
  msgEl.textContent = msg;
  dialog.style.display = 'flex';
  globalThis._projConfirmAction = onConfirm;
}

function _confirmarSim() {
  const dialog = document.getElementById('modal-confirm');
  const action = globalThis._projConfirmAction;
  globalThis._projConfirmAction = null;
  if(dialog) dialog.style.display = 'none';
  if(typeof action === 'function') action();
}

function _confirmarNao() {
  const dialog = document.getElementById('modal-confirm');
  globalThis._projConfirmAction = null;
  if(dialog) dialog.style.display = 'none';
}

// ════════════════════════════════════════════════════════════════════
// PÁGINA: INÍCIO (Dashboard)
// ════════════════════════════════════════════════════════════════════


function projAtrasoStatusProjeto(p) {
  const atrasadas = projTarefasAtrasadasProjeto(p);
  if(!atrasadas.length) return { cls:'ok', label:'Em dia' };

  const hoje = new Date();
  hoje.setHours(0,0,0,0);
  let maxDias = 0;
  atrasadas.forEach(t => {
    const d = projParseIsoDate(t.dt_fim);
    if(!d) return;
    const venc = new Date(d.ano, d.mes, d.dia);
    venc.setHours(0,0,0,0);
    const dias = Math.max(0, Math.floor((hoje - venc) / 86400000));
    if(dias > maxDias) maxDias = dias;
  });

  if(maxDias > 30) return { cls:'danger', label:'Tarefa atrasada ha mais de 30 dias' };
  return { cls:'warn', label:'Tarefa atrasada ate 30 dias' };
}

function projRenderInicio() {
  projLoad();
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', {weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const dateEl = document.getElementById('proj-dash-date');
  if(dateEl) dateEl.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  const ativos = PROJETOS.filter(p=>p.status==='ativo');
  const emExecucao = ativos.filter(p=>p.fase_atual==='execucao');
  const emIdeacaoPlan = ativos.filter(p=>p.fase_atual==='ideacao'||p.fase_atual==='planejamento'||p.fase_atual==='aprovacao');
  const concluidos = PROJETOS.filter(p=>p.status==='concluido');

  // ── MAPA DE PROGRESSO ──
  const lpContainer = document.getElementById('proj-launchpad-container');
  if(lpContainer) {
    const allProjects = PROJETOS.filter(p => p.status==='ativo');
    let laneOrder;
    try { laneOrder = JSON.parse(localStorage.getItem('proj_lane_order')||'null'); } catch(e) { laneOrder = null; }
    let ordered = [];
    if(laneOrder && Array.isArray(laneOrder)) {
      laneOrder.forEach(id => { const p = allProjects.find(x => String(x.id)===String(id)); if(p) ordered.push(p); });
      allProjects.forEach(p => { if(!ordered.find(x=>String(x.id)===String(p.id))) ordered.push(p); });
    } else {
      ordered = allProjects.slice();
    }

    const rowsHTML = ordered.map(p => projProgressMapRowHtml(p)).join('');
    projSetHtml(lpContainer, `
      <div class="proj-launchpad-wrap">
        <div class="proj-launchpad-grid-bg"></div>
        <div class="proj-launchpad-glow"></div>
        <div class="proj-launchpad-header">
          <div class="proj-launchpad-title">
            <div class="proj-launchpad-title-icon">
              <svg viewBox="0 0 16 16" fill="none" width="12" height="12"><path d="M8 1v14M1 8h14M3 3l10 10M13 3L3 13" stroke="rgba(56,180,130,.7)" stroke-width="1.2" stroke-linecap="round"/></svg>
            </div>
            Mapa de Progresso
          </div>
          <div class="proj-launchpad-hint">Clique no ícone do projeto para abrir os detalhes</div>
        </div>
        <div class="proj-launchpad-body">
          <div class="proj-pmap">
            ${rowsHTML || '<div class="proj-pmap-empty">Nenhum projeto ativo no portfólio.</div>'}
          </div>
        </div>
      </div>
    `);
  }

  // 2. Painéis executivos v9
  projRenderDashV9();

  // 3. Estatísticas
  const statsRow = document.getElementById('proj-stats-row');
  if(statsRow) projSetHtml(statsRow, `
    <div class="proj-stat s-amber">
      <div class="proj-stat-n">${emIdeacaoPlan.length}</div>
      <div class="proj-stat-l">Ideação / Planejamento</div>
      <div class="proj-stat-icon" style="background:#fff8e8">💡</div>
    </div>
    <div class="proj-stat s-teal">
      <div class="proj-stat-n">${emExecucao.length}</div>
      <div class="proj-stat-l">Em Execução</div>
      <div class="proj-stat-icon" style="background:var(--teal-l)">⚡</div>
    </div>
    <div class="proj-stat s-green">
      <div class="proj-stat-n">${concluidos.length}</div>
      <div class="proj-stat-l">Concluídos</div>
      <div class="proj-stat-icon" style="background:#e6f9f0">✅</div>
    </div>
  `);
}

// ── LINHA DO MAPA DE PROGRESSO ──
const PROJ_PMAP_MAX_ATRASADAS = 4;
function projProgressMapRowHtml(p) {
  const pid = projEsc(String(p.id));
  const pct = Math.max(0, Math.min(100, Number(p.percentual) || 0));
  const atrasoStatus = projAtrasoStatusProjeto(p);
  const atrasadas = projTarefasAtrasadasProjeto(p);
  const iconInner = p.icone_url
    ? `<img src="${projEsc(p.icone_url)}" alt="">`
    : projEsc(p.icone_emoji || '📋');

  let lateCard;
  if(atrasadas.length) {
    const itens = atrasadas.slice(0, PROJ_PMAP_MAX_ATRASADAS).map(t => {
      const nome = `${t._parentName ? `${t._parentName} / ` : ''}${t.nome || 'Tarefa'}`;
      return `
          <div class="proj-pmap-late-item">
            <span class="proj-pmap-late-name" title="${projEsc(nome)}${t.responsavel ? ' — ' + projEsc(t.responsavel) : ''}">${projEsc(nome)}</span>
            <span class="proj-pmap-late-due">${projFormatDate(t.dt_fim)}</span>
          </div>`;
    }).join('');
    const extra = atrasadas.length > PROJ_PMAP_MAX_ATRASADAS
      ? `<div class="proj-pmap-late-more">+ ${atrasadas.length - PROJ_PMAP_MAX_ATRASADAS} outra(s) tarefa(s) atrasada(s)</div>`
      : '';
    lateCard = `
        <div class="proj-pmap-late is-late is-${atrasoStatus.cls}">
          <div class="proj-pmap-late-title">Tarefas atrasadas (${atrasadas.length})</div>
          ${itens}${extra}
        </div>`;
  } else {
    lateCard = `
        <div class="proj-pmap-late is-ok">
          <span class="proj-pmap-ok-check">
            <svg viewBox="0 0 16 16" fill="none" width="15" height="15"><path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <span>Não há tarefas marcadas como atrasadas</span>
        </div>`;
  }

  return `
      <div class="proj-pmap-row">
        <button type="button" class="proj-pmap-icon" title="Abrir ${projEsc(p.nome)}" aria-label="Abrir projeto ${projEsc(p.nome)}" onclick="projAbrirDetalhe('${pid}', true)">${iconInner}</button>
        <div class="proj-pmap-info">
          <span class="proj-pmap-flag ${atrasoStatus.cls}" title="${projEsc(atrasoStatus.label)}"></span>
          <div class="proj-pmap-name" title="${projEsc(p.nome)}">${projEsc(p.nome)}</div>
          <div class="proj-pmap-mgr">${projEsc(p.gerente||'')}</div>
          <div class="proj-pmap-pct">${pct}%</div>
          <div class="proj-pmap-bar"><div class="proj-pmap-bar-fill" style="width:${pct}%"></div></div>
        </div>
        ${lateCard}
        <div class="proj-pmap-action">
          <button type="button" class="proj-btn proj-pmap-report-btn" onclick="projGerarStatusReportPPT('${pid}')">
            <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><rect x="2" y="1.5" width="12" height="13" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M5 5h6M5 8h6M5 11h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
            Gerar Status Report Executivo
          </button>
        </div>
      </div>`;
}

// ════════════════════════════════════════════════════════════════════
// STATUS REPORT EXECUTIVO — PPT editável por projeto (PptxGenJS)
// ════════════════════════════════════════════════════════════════════
async function projFetchImageDataUri(url) {
  try {
    const resp = await fetch(url);
    if(!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch(e) {
    return null;
  }
}

async function projGerarStatusReportPPT(projId) {
  if(typeof PptxGenJS === 'undefined') {
    projToast('Biblioteca de apresentações não carregada. Recarregue a página.', 'var(--red)');
    return;
  }
  projLoad();
  const p = PROJETOS.find(x => String(x.id) === String(projId));
  if(!p) return;

  projToast('Gerando Status Report Executivo...', 'var(--blue)');
  try {
    const [cageLogo, eppLogo] = await Promise.all([
      projFetchImageDataUri(PROJ_CAGE_REPORT_LOGO),
      projFetchImageDataUri('epp-logo.png')
    ]);

    // Identidade visual CAGE (cores extraídas dos logos oficiais)
    const NAVY = '004A87', TEAL = '00C4B4', TEAL_TXT = '008D82',
          GRAY = '4A5568', GRAY_SOFT = '8A97A6', TRACK = 'E9EEF5',
          GREEN = '16A34A', RED = 'B91C1C', BORDER = 'D8E2EC', FONT = 'Calibri';

    const pct = Math.max(0, Math.min(100, Number(p.percentual) || 0));
    const ciclo = projMonthLabel(projMonthValue());
    const atrasadas = projTarefasAtrasadasProjeto(p);
    const indicadores = (p.execucao?.indicadores || []).filter(ind => String(ind.nome||'').trim());

    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'SIGA — Escritório de Projetos e Processos · CAGE/RS';
    pptx.title = `Status Report Executivo — ${p.nome}`;

    // Master dos slides de conteúdo: logo CAGE, filete de destaque e rodapé
    pptx.defineSlideMaster({
      title: 'SR_CONTEUDO',
      background: { color: 'FFFFFF' },
      objects: [
        { rect: { x: 0, y: 5.55, w: 10, h: 0.075, fill: { color: TEAL } } },
        { rect: { x: 0.45, y: 0.45, w: 0.09, h: 0.46, fill: { color: TEAL } } },
        { text: { text: `${p.nome} · Status Report Executivo · ${ciclo}`, options: { x: 0.45, y: 5.24, w: 7.6, h: 0.24, fontFace: FONT, fontSize: 8, color: GRAY_SOFT, align: 'left' } } },
        ...(cageLogo ? [{ image: { x: 8.55, y: 0.16, w: 1.15, h: 0.65, data: cageLogo } }] : [])
      ]
    });

    const addTitle = (slide, txt) => slide.addText(txt, {
      x: 0.65, y: 0.42, w: 7.6, h: 0.52, fontFace: FONT, fontSize: 20, bold: true,
      color: NAVY, align: 'left', valign: 'middle'
    });
    const addBottomBars = slide => {
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 5.5, w: 6.2, h: 0.125, fill: { color: TEAL } });
      slide.addShape(pptx.ShapeType.rect, { x: 6.2, y: 5.5, w: 3.8, h: 0.125, fill: { color: NAVY } });
    };

    // ── Slide 1: Capa ──
    const capa = pptx.addSlide();
    capa.background = { color: 'FFFFFF' };
    addBottomBars(capa);
    if(cageLogo) capa.addImage({ data: cageLogo, x: 0.3, y: 0.14, w: 2.0, h: 1.125 });
    if(eppLogo) capa.addImage({ data: eppLogo, x: 8.28, y: 0.44, w: 1.32, h: 0.53 });
    capa.addText('STATUS REPORT EXECUTIVO', { x: 0.5, y: 1.72, w: 9, h: 0.35, align: 'center', fontFace: FONT, fontSize: 13, bold: true, color: TEAL_TXT, charSpacing: 4 });
    capa.addText(p.nome || 'Projeto', { x: 0.7, y: 2.1, w: 8.6, h: 1.1, align: 'center', valign: 'middle', fontFace: FONT, fontSize: 32, bold: true, color: NAVY, fit: 'shrink' });
    capa.addShape(pptx.ShapeType.rect, { x: 4.35, y: 3.35, w: 1.3, h: 0.05, fill: { color: TEAL } });
    const gerentes = p.gerente_substituto ? `${p.gerente || '—'} / ${p.gerente_substituto}` : (p.gerente || '—');
    capa.addText([
      { text: p.gerente_substituto ? 'Gerentes do Projeto: ' : 'Gerente do Projeto: ', options: { bold: true, color: NAVY } },
      { text: gerentes, options: { color: GRAY, breakLine: true } },
      { text: 'Patrocinador: ', options: { bold: true, color: NAVY } },
      { text: p.patrocinador || '—', options: { color: GRAY, breakLine: true } },
      { text: 'Ciclo: ', options: { bold: true, color: NAVY } },
      { text: ciclo, options: { color: GRAY } }
    ], { x: 0.45, y: 4.42, w: 7.2, h: 0.95, fontFace: FONT, fontSize: 12, align: 'left', valign: 'bottom', paraSpaceAfter: 6 });

    // ── Slide 2: Visão Geral do Projeto ──
    const geral = pptx.addSlide({ masterName: 'SR_CONTEUDO' });
    addTitle(geral, 'Visão Geral do Projeto');
    geral.addText(`${pct}%`, { x: 0.55, y: 1.05, w: 2.4, h: 1.0, fontFace: FONT, fontSize: 52, bold: true, color: TEAL_TXT, align: 'left', valign: 'middle' });
    geral.addText('do projeto concluído', { x: 0.62, y: 2.0, w: 2.5, h: 0.3, fontFace: FONT, fontSize: 11, color: GRAY });
    geral.addShape(pptx.ShapeType.roundRect, { x: 3.15, y: 1.42, w: 6.25, h: 0.36, rectRadius: 0.08, fill: { color: TRACK } });
    if(pct > 0) geral.addShape(pptx.ShapeType.roundRect, { x: 3.15, y: 1.42, w: Math.max(0.36, 6.25 * pct / 100), h: 0.36, rectRadius: 0.08, fill: { color: TEAL } });
    geral.addText('0%', { x: 3.15, y: 1.85, w: 0.6, h: 0.22, fontFace: FONT, fontSize: 8, color: GRAY_SOFT });
    geral.addText('100%', { x: 8.8, y: 1.85, w: 0.6, h: 0.22, fontFace: FONT, fontSize: 8, color: GRAY_SOFT, align: 'right' });

    const secHeader = (x, w, txt, color) => {
      geral.addShape(pptx.ShapeType.rect, { x, y: 2.62, w: 0.13, h: 0.13, fill: { color } });
      geral.addText(txt, { x: x + 0.2, y: 2.5, w: w - 0.2, h: 0.36, fontFace: FONT, fontSize: 13, bold: true, color: NAVY, valign: 'middle' });
    };
    const CONT_X = 0.62, CONT_W = 8.76, COL_W = 4.25, COL2_X = 5.13;
    const temAtraso = atrasadas.length > 0;

    if(indicadores.length) {
      secHeader(CONT_X, COL_W, 'Indicadores', TEAL);
      const hdrOpts = { bold: true, color: NAVY, fill: { color: 'EFF6F5' } };
      const MAX_IND = 6;
      const fmtVal = (v, unidade) => {
        const s = String(v ?? '').trim();
        if(!s) return '—';
        return unidade === '%' ? `${s}%` : (unidade ? `${s} ${unidade}` : s);
      };
      const rows = [
        [ { text: 'Indicador', options: hdrOpts }, { text: 'Meta', options: hdrOpts }, { text: 'Resultado', options: hdrOpts } ],
        ...indicadores.slice(0, MAX_IND).map(ind => {
          const unidade = String(ind.unidade || '').trim();
          return [
            { text: String(ind.nome || 'Indicador') },
            { text: fmtVal(ind.meta, unidade) },
            { text: fmtVal(ind.resultado ?? ind.atual, unidade) }
          ];
        })
      ];
      geral.addTable(rows, { x: CONT_X, y: 3.0, w: COL_W, colW: [2.15, 0.95, 1.15], fontFace: FONT, fontSize: 9.5, color: GRAY, border: { pt: 0.5, color: BORDER }, fill: { color: 'FFFFFF' }, valign: 'middle', rowH: 0.26, margin: 0.04 });
      if(indicadores.length > MAX_IND) {
        geral.addText(`+ ${indicadores.length - MAX_IND} outros indicadores`, { x: CONT_X, y: 3.0 + (MAX_IND + 1) * 0.26 + 0.06, w: COL_W, h: 0.25, fontFace: FONT, fontSize: 9, italic: true, color: GRAY_SOFT });
      }
    }

    const lateX = indicadores.length ? COL2_X : CONT_X;
    const lateW = indicadores.length ? COL_W : CONT_W;
    if(temAtraso) {
      secHeader(lateX, lateW, `Tarefas em Atraso (${atrasadas.length})`, RED);
      const MAX_LATE = 7;
      const runs = [];
      atrasadas.slice(0, MAX_LATE).forEach(t => {
        const nome = `${t._parentName ? `${t._parentName} / ` : ''}${t.nome || 'Tarefa'}`;
        runs.push({ text: nome, options: { color: GRAY, bullet: { code: '2013' } } });
        runs.push({ text: `  ·  venc. ${projFormatDate(t.dt_fim)}${t.responsavel ? ` · ${t.responsavel}` : ''}`, options: { color: RED, breakLine: true } });
      });
      if(atrasadas.length > MAX_LATE) {
        runs.push({ text: `+ ${atrasadas.length - MAX_LATE} outras tarefas atrasadas`, options: { color: GRAY_SOFT, italic: true, bullet: { code: '2013' } } });
      }
      geral.addText(runs, { x: lateX, y: 3.0, w: lateW, h: 2.05, fontFace: FONT, fontSize: 10, align: 'left', valign: 'top', paraSpaceAfter: 5 });
    } else {
      secHeader(lateX, lateW, 'Tarefas em Dia', GREEN);
      geral.addText([
        { text: '✓  ', options: { bold: true, color: GREEN, fontSize: 13 } },
        { text: 'Não há tarefas marcadas como atrasadas.', options: { color: GRAY } }
      ], { x: lateX, y: 3.0, w: lateW, h: 0.4, fontFace: FONT, fontSize: 11, valign: 'top' });
    }

    // ── Slides 3 e 4: preenchidos pelo gerente ──
    const addBlankBullets = slide => slide.addText(
      Array.from({ length: 5 }, () => ({ text: ' ', options: { bullet: { code: '2013' }, breakLine: true } })),
      { x: 0.65, y: 1.35, w: 8.7, h: 3.6, fontFace: FONT, fontSize: 14, color: GRAY, align: 'left', valign: 'top', paraSpaceAfter: 14 }
    );
    const concluidas = pptx.addSlide({ masterName: 'SR_CONTEUDO' });
    addTitle(concluidas, 'Atividades Concluídas no Último Mês');
    addBlankBullets(concluidas);

    const previstas = pptx.addSlide({ masterName: 'SR_CONTEUDO' });
    addTitle(previstas, 'Atividades Previstas para o Mês Atual');
    addBlankBullets(previstas);

    // ── Slide 5: Obrigado ──
    const fim = pptx.addSlide();
    fim.background = { color: 'FFFFFF' };
    addBottomBars(fim);
    fim.addText('Obrigado', { x: 0.5, y: 1.75, w: 9, h: 0.95, align: 'center', fontFace: FONT, fontSize: 44, bold: true, color: NAVY });
    fim.addShape(pptx.ShapeType.rect, { x: 4.35, y: 2.85, w: 1.3, h: 0.05, fill: { color: TEAL } });
    if(cageLogo) fim.addImage({ data: cageLogo, x: 3.95, y: 3.1, w: 2.1, h: 1.18 });
    fim.addText('Escritório de Projetos e Processos · CAGE/RS', { x: 0.5, y: 4.5, w: 9, h: 0.3, align: 'center', fontFace: FONT, fontSize: 11, color: GRAY_SOFT });

    const nomeArquivo = String(p.nome || 'Projeto').replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80);
    await pptx.writeFile({ fileName: `Status Report Executivo - ${nomeArquivo} - ${ciclo}.pptx` });
    projToast('Status Report Executivo gerado!', 'var(--green)');
  } catch(e) {
    projToast(`Erro ao gerar o Status Report: ${e?.message || e}`, 'var(--red)');
  }
}

function projRenderReunioesDoMes() {
  const reunEl = document.getElementById('proj-dash-reunioes');
  if(!reunEl) return;
  const { mes, ano } = projGetMesAtual();
  const todas = [];
  PROJETOS.forEach(p => {
    const reunioes = p.execucao?.reunioes || [];
    reunioes.forEach(r => {
      // Include if month matches or no date set (for current month)
      const isCurrentMonth = !r.data || (() => {
        const d = projParseIsoDate(r.data);
        return d && d.mes === mes && d.ano === ano;
      })();
      if(isCurrentMonth) {
        todas.push({ ...r, _projeto_nome: p.nome, _projeto_id: p.id, _projeto: p });
      }
    });
  });

  if(todas.length === 0) {
    projSetHtml(reunEl, '<div style="text-align:center;padding:1.2rem;color:#b0b8cc;font-size:13px">Nenhuma reunião agendada este mês</div>');
    return;
  }

  todas.sort((a,b) => (a.data || '9999-12-31').localeCompare(b.data || '9999-12-31') || String(a.nome||'').localeCompare(String(b.nome||''), 'pt-BR'));
  projSetHtml(reunEl, todas.map(r => `
    <div class="proj-reunion-item ${r.realizada ? 'proj-reunion-done' : ''}" id="reunion-item-${projEsc(r.id)}">
      <div class="proj-reunion-check ${r.realizada ? 'done' : ''}" onclick="projToggleReuniao('${projEsc(r._projeto_id)}','${projEsc(r.id)}')">
        ${r.realizada ? '<svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M2 6l3 3 5-5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
      </div>
      <div style="flex:1;min-width:0">
        <div class="proj-reunion-text">${projEsc(r.nome)}</div>
        <div class="proj-reunion-proj" style="margin-top:2px">${projIconHtml(r._projeto)} ${projEsc(r._projeto_nome)}</div>
      </div>
      ${r.data ? `<div class="proj-reunion-date">${projFormatDate(r.data)}</div>` : ''}
    </div>
  `).join(''));
}

function projToggleReuniao(projetoId, reuniaoId) {
  if(!projEnsureWriteAll('Apenas EPP pode alterar reuniões.')) return;
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === String(projetoId));
  if(!proj) return;
  const reunioes = proj.execucao?.reunioes || [];
  const r = reunioes.find(r => String(r.id) === String(reuniaoId));
  if(r) {
    r.realizada = !r.realizada;
    projSave();
    projRenderReunioesDoMes();
    projAtualizarBadgeReunioes();
  }
}

function projAtualizarBadgeReunioes() {
}

// ════════════════════════════════════════════════════════════════════
// PÁGINA: PORTFÓLIO
// ════════════════════════════════════════════════════════════════════
function projRenderProjItem(p) {
  const pid = projEsc(String(p.id));
  return `
    <div class="proj-list-item" onclick="projAbrirDetalhe('${pid}')">
      <div class="proj-list-icon">
        ${p.icone_url ? `<img src="${projEsc(p.icone_url)}" alt="ícone">` : `<span style="font-size:20px">${projEsc(p.icone_emoji || '📁')}</span>`}
      </div>
      <div>
        <div class="proj-list-name">${projEsc(p.nome)}</div>
        <div class="proj-list-meta">
          <span>👤 ${projEsc(p.gerente)||'—'}</span>
          ${p.dt_inicio ? `<span>📅 ${projFormatDate(p.dt_inicio)}</span>` : ''}
          ${p.patrocinador ? `<span>📝 ${projEsc(p.patrocinador)}</span>` : ''}
        </div>
        <div style="margin-top:5px">
          <div class="proj-prog-bar" style="width:160px;display:inline-block">
            <div class="proj-prog-fill" style="width:${p.percentual||0}%"></div>
          </div>
          <span style="font-size:11px;color:var(--ink3);margin-left:6px">${p.percentual||0}%</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        <span class="proj-list-badge ${projFaseBadgeClass(p.status,p.fase_atual)}">${projFaseText(p)}</span>
        <button type="button" class="proj-btn" style="font-size:11px;padding:3px 9px" onclick="event.stopPropagation();projTrocarIcone('${pid}')">🎨</button>
        <button type="button" class="proj-btn danger" style="font-size:11px;padding:3px 9px" onclick="event.stopPropagation();projExcluir('${pid}')">Excluir</button>
      </div>
    </div>
  `;
}

function projRenderPortfolio() {
  projLoad();
  const el = document.getElementById('proj-portfolio-content');
  if(!el) return;

  const ativos = PROJETOS.filter(p=>p.status==='ativo');
  const concluidos = PROJETOS.filter(p=>p.status==='concluido' || p.status==='cancelado');

  if(ativos.length === 0) {
    projSetHtml(el, '<div style="text-align:center;padding:3rem;color:#b0b8cc"><div style="font-size:40px;margin-bottom:12px">📋</div><div style="font-size:15px;font-weight:600;margin-bottom:6px">Nenhum projeto em andamento</div><div style="font-size:13px">Clique em "Novo Projeto" para começar.</div></div>');
  } else {
    // Show only active projects - grouped by program
    let html = '';
    progLoad();
    const programasAtivos = PROGRAMAS.filter(pg => pg.status !== 'cancelado');

    if(programasAtivos.length > 0) {
      html += '<div style="font-family:\'Syne\',sans-serif;font-size:13px;font-weight:700;color:#1a2540;margin-bottom:.8rem;display:flex;align-items:center;gap:8px"><svg viewBox="0 0 16 16" fill="none" width="15" height="15"><path d="M2 4h12M2 8h12M2 12h8" stroke="var(--blue)" stroke-width="1.5" stroke-linecap="round"/><circle cx="13" cy="12" r="1.5" stroke="var(--blue)" stroke-width="1.4"/></svg>Programas</div>';
      programasAtivos.forEach(pg => {
        const projs = ativos.filter(p => String(p.programa_id) === String(pg.id));
        if(projs.length === 0) return;
        const pct = progPercentualMedio(pg.id);
        html += `
          <div style="border:1.5px solid #d5deed;border-radius:12px;background:#f8faff;padding:1rem;margin-bottom:1.2rem">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.8rem;gap:12px;cursor:pointer" onclick="progAbrirDetalhe('${pg.id}')">
              <div style="flex:1;min-width:0">
                <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:#1a2540;display:flex;align-items:center;gap:8px">
                  📂 ${projEsc(pg.nome)}
                  <span class="proj-list-badge" style="background:var(--blue-l);color:var(--blue)">Ativo</span>
                </div>
                ${pg.descricao ? `<div style="font-size:12px;color:#6b7385;margin-top:3px">${projEsc(pg.descricao)}</div>` : ''}
                <div style="font-size:11px;color:var(--ink3);margin-top:4px">${projs.length} projeto${projs.length>1?'s':''} · ${pct}% médio</div>
              </div>
              <div class="proj-prog-bar" style="width:140px"><div class="proj-prog-fill" style="width:${pct}%"></div></div>
            </div>
            <div style="padding-left:8px">${projs.map(projRenderProjItem).join('')}</div>
          </div>`;
      });
    }

    const soltos = ativos.filter(p => !p.programa_id);
    if(soltos.length > 0) {
      html += '<div style="font-family:\'Syne\',sans-serif;font-size:13px;font-weight:700;color:#1a2540;margin:1.5rem 0 .8rem">Projetos sem programa</div>';
      html += soltos.map(projRenderProjItem).join('');
    }
    projSetHtml(el, html);
  }

  // Link to concluded projects
  if(concluidos.length > 0) {
    projAppendHtml(el, 'beforeend', `
      <div style="margin-top:2rem;padding-top:1.4rem;border-top:2px solid #eaecf3;text-align:center">
        <button type="button" class="proj-btn" style="font-size:13px;padding:8px 20px" onclick="projGo('concluidos')">
          🏆 Ver Projetos Concluídos (${concluidos.length})
        </button>
      </div>`);
  }
}

function projRenderConcluidos() {
  projLoad();
  const el = document.getElementById('proj-concluidos-content');
  if(!el) return;
  const concluidos = PROJETOS.filter(p=>p.status==='concluido');
  const cancelados = PROJETOS.filter(p=>p.status==='cancelado');
  let html = '';
  if(concluidos.length > 0) {
    html += '<div style="margin-bottom:1.6rem"><div style="font-family:\'Syne\',sans-serif;font-size:12px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.7rem;padding:.5rem 0;border-bottom:2px solid #eaecf3">Concluídos com Sucesso <span style="color:var(--teal)">(' + concluidos.length + ')</span></div>';
    html += concluidos.map(projRenderProjItem).join('');
    html += '</div>';
  }
  if(cancelados.length > 0) {
    html += '<div style="margin-bottom:1.6rem"><div style="font-family:\'Syne\',sans-serif;font-size:12px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.7rem;padding:.5rem 0;border-bottom:2px solid #eaecf3">Cancelados <span style="color:#b91c1c">(' + cancelados.length + ')</span></div>';
    html += cancelados.map(projRenderProjItem).join('');
    html += '</div>';
  }
  if(concluidos.length === 0 && cancelados.length === 0) {
    html = '<div style="text-align:center;padding:3rem;color:#b0b8cc;font-size:13px">Nenhum projeto concluído ou cancelado.</div>';
  }
  el.textContent = '';
  projAppendHtml(el, 'beforeend', html);
}

// ════════════════════════════════════════════════════════════════════
// PÁGINA: REUNIÕES
// ════════════════════════════════════════════════════════════════════
function projTaskResponsibleKey(t) {
  const email = projNormKey(t?.responsavel_email);
  if(email) return 'u:'+email;
  const user = projUserByResponsibleText(t?.responsavel);
  return user && user.email ? 'u:'+projNormKey(user.email) : 't:'+projNormKey(t?.responsavel);
}

function projAllResponsibleTasks() {
  const today = new Date().toISOString().slice(0,10);
  const rows = [];
  (PROJETOS||[]).filter(p => p.status !== 'cancelado').forEach(p => {
    projFlattenTasks(p.execucao?.tarefas || []).forEach(t => {
      const label = projResponsibleLabel(t);
      if(!label) return;
      rows.push({
        key: projTaskResponsibleKey(t),
        label,
        email: projNormKey(t.responsavel_email),
        projectId: String(p.id),
        projectName: p.nome || 'Projeto sem nome',
        project: p,
        task: t,
        overdue: !t.concluida && t.dt_fim && t.dt_fim < today
      });
    });
  });
  return rows;
}

function projUsuariosFilterOptions(rows) {
  const map = new Map();
  (USUARIOS||[]).forEach(u => {
    const label = projUserDisplayName(u);
    const email = projNormKey(u.email);
    if(label) map.set('u:'+(email || projNormKey(label)), {key:'u:'+(email || projNormKey(label)), label, detail:u.email||'Usuário cadastrado'});
  });
  rows.forEach(r => {
    if(!map.has(r.key)) map.set(r.key, {key:r.key, label:r.label, detail:r.email || 'Texto livre'});
  });
  return Array.from(map.values()).sort((a,b) => a.label.localeCompare(b.label, 'pt-BR'));
}

function projUsuariosAgg(rows) {
  const map = new Map();
  rows.forEach(r => {
    const item = map.get(r.key) || {key:r.key, label:r.label, total:0, overdue:0, done:0};
    item.total += 1;
    if(r.overdue) item.overdue += 1;
    if(r.task.concluida) item.done += 1;
    map.set(r.key, item);
  });
  return Array.from(map.values()).sort((a,b) => b.overdue - a.overdue || b.total - a.total || a.label.localeCompare(b.label, 'pt-BR'));
}

function projUsuariosBars(title, rows, field) {
  const max = Math.max(1, ...rows.map(r => r[field] || 0));
  const body = rows.length ? rows.slice(0,10).map(r => {
    const val = r[field] || 0;
    const width = Math.max(3, Math.round((val / max) * 100));
    return `<div class="proj-user-bar-row"><span title="${projEsc(r.label)}">${projEsc(r.label)}</span><div class="proj-user-bar"><div style="width:${width}%"></div></div><strong>${val}</strong></div>`;
  }).join('') : '<div style="font-size:12px;color:var(--ink3)">Nenhum dado para exibir.</div>';
  return `<div class="proj-v9-chart-card"><div class="proj-card-t">${projEsc(title)}</div><div class="proj-user-bars">${body}</div></div>`;
}

function projRenderUsuariosPage() {
  projLoad();
  const el = document.getElementById('proj-usuarios-content');
  if(!el) return;
  const allRows = projAllResponsibleTasks();
  const selectedResponsible = document.getElementById('proj-user-filter-resp')?.value || '';
  const selectedProject = document.getElementById('proj-user-filter-proj')?.value || '';
  const rows = allRows.filter(r => (!selectedResponsible || r.key === selectedResponsible) && (!selectedProject || r.projectId === selectedProject));
  const agg = projUsuariosAgg(rows);
  const filters = projUsuariosFilterOptions(allRows);
  const projectOpts = (PROJETOS||[]).filter(p => p.status !== 'cancelado').slice().sort((a,b)=>(a.nome||'').localeCompare(b.nome||'', 'pt-BR'));
  const overdue = rows.filter(r => r.overdue);
  const done = rows.filter(r => r.task.concluida);
  const table = rows.length ? `<table class="proj-v9-table"><thead><tr><th>Responsável</th><th>Projeto</th><th>Tarefa</th><th>Fim Prev.</th><th>Status</th><th>%</th></tr></thead><tbody>${rows.map(r => `<tr class="${r.overdue?'proj-user-row-overdue':''}"><td><span class="proj-user-avatar">${projEsc(projUserInitials(r.label))}</span>${projEsc(r.label)}</td><td>${projEsc(r.projectName)}</td><td>${r.task._parentName ? `<span style="color:var(--ink3)">${projEsc(r.task._parentName)} / </span>` : ''}${projEsc(r.task.nome||'Tarefa sem nome')}</td><td>${projEsc(projFormatDate(r.task.dt_fim))}</td><td>${r.overdue ? '<span class="risk-heat risk-alto">Atrasada</span>' : (r.task.concluida ? '<span class="risk-heat risk-baixo">Concluída</span>' : '<span class="risk-heat risk-medio">Em andamento</span>')}</td><td>${Number(r.task.conclusao||0)}%</td></tr>`).join('')}</tbody></table>` : '<div class="proj-v9-chart-card" style="font-size:12px;color:var(--ink3)">Nenhuma tarefa com responsável nos filtros atuais.</div>';
  projSetHtml(el, `
    <div class="proj-v9-filter-card">
      <div class="proj-card-t">Filtros</div>
      <div class="proj-v9-filter-grid">
        <div class="proj-fg" style="margin:0"><label class="proj-fl">Responsável</label><select class="proj-fi" id="proj-user-filter-resp" onchange="projRenderUsuariosPage()"><option value="">Todos</option>${filters.map(f => `<option value="${projEsc(f.key)}" ${selectedResponsible===f.key?'selected':''}>${projEsc(f.label)}${f.detail?` · ${projEsc(f.detail)}`:''}</option>`).join('')}</select></div>
        <div class="proj-fg" style="margin:0"><label class="proj-fl">Projeto</label><select class="proj-fi" id="proj-user-filter-proj" onchange="projRenderUsuariosPage()"><option value="">Todos</option>${projectOpts.map(p => `<option value="${projEsc(String(p.id))}" ${selectedProject===String(p.id)?'selected':''}>${projEsc(p.nome||'Projeto sem nome')}</option>`).join('')}</select></div>
      </div>
    </div>
    <div class="proj-user-summary">
      <div><strong>${rows.length}</strong><span>Tarefas vinculadas</span></div>
      <div><strong>${overdue.length}</strong><span>Atrasadas</span></div>
      <div><strong>${done.length}</strong><span>Concluídas</span></div>
      <div><strong>${agg.length}</strong><span>Responsáveis</span></div>
    </div>
    <div class="proj-v9-chart-grid">
      ${projUsuariosBars('Tarefas por responsável', agg, 'total')}
      ${projUsuariosBars('Atrasadas por responsável', agg.filter(r => r.overdue > 0), 'overdue')}
    </div>
    <div class="proj-v9-chart-card">
      <div class="proj-card-t">Tarefas vinculadas</div>
      ${table}
    </div>
  `);
}

function projRenderStatusReport() {
  projLoad();
  const el = document.getElementById('proj-status-report-content');
  if(!el) return;
  const ativos = PROJETOS.filter(p => p.status === 'ativo');
  if(!ativos.length) {
    projSetHtml(el, '<div style="text-align:center;padding:2rem;color:#b0b8cc;font-size:13px">Nenhum projeto em andamento encontrado.</div>');
    return;
  }
  projSetHtml(el, `
    <div class="proj-ib proj-ib-blue">Preencha a observação livre de cada projeto. Esse texto será exibido ao lado do projeto no PDF do Relatório Executivo.</div>
    <div class="proj-status-grid">
      ${ativos.map(p => `
        <div class="proj-status-card">
          <div class="proj-status-head">
            ${projIconHtml(p, 'proj-status-icon')}
            <div>
              <div class="proj-status-name">${projEsc(p.nome)}</div>
              <div class="proj-status-meta">Patrocinador: ${projEsc(p.patrocinador||'Não informado')} · Gerente: ${projEsc(p.gerente||'Não informado')}</div>
            </div>
            <div class="proj-status-pct">${p.percentual||0}%</div>
          </div>
          <div class="proj-status-bar"><div style="width:${Math.max(0,Math.min(100,p.percentual||0))}%"></div></div>
          <div class="proj-g2" style="margin-top:.7rem">
            <div style="font-size:11.5px;color:#5f6b80">
              <strong>Gerente substituto:</strong> ${projEsc(p.gerente_substituto||'Não informado')}
            </div>
            <div style="font-size:11.5px;color:#5f6b80">
              <strong>Fase atual:</strong> ${projEsc(projFaseText(p))}
            </div>
          </div>
          <div class="proj-fg" style="margin:.8rem 0 0">
            <label class="proj-fl" for="sr-obs-${projEsc(String(p.id))}">Texto livre para o Relatório Executivo</label>
            <textarea class="proj-fi proj-status-note" id="sr-obs-${projEsc(String(p.id))}" data-proj-id="${projEsc(String(p.id))}" rows="3" placeholder="Digite aqui o comentário executivo deste projeto..." onchange="projSalvarStatusReportObs('${projEsc(String(p.id))}',this.value)">${projEsc(p.status_report_obs||'')}</textarea>
          </div>
        </div>
      `).join('')}
    </div>
  `);
}

function projSalvarStatusReportObs(projId, value, silent) {
  if(!projCanWriteExec()){ if(!silent) projToast('Somente EPP pode salvar relatório executivo.','#d97706'); return; }
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === String(projId));
  if(!proj) return;
  proj.status_report_obs = value || '';
  projSave();
  if(!silent) projToast('Observação salva.');
}

function projSaveStatusReportFromForm() {
  let changed = false;
  document.querySelectorAll('.proj-status-note[data-proj-id]').forEach(txt => {
    const proj = PROJETOS.find(p => String(p.id) === String(txt.dataset.projId));
    if(proj && proj.status_report_obs !== txt.value) {
      proj.status_report_obs = txt.value;
      changed = true;
    }
  });
  if(changed) projSave();
}

function projExportStatusReportPDF() {
  projLoad();
  projSaveStatusReportFromForm();
  const blob = new Blob([projBuildStatusReportHTML()], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if(!w) { projToast('Permita pop-ups para exportar o PDF.', '#d97706'); URL.revokeObjectURL(url); return; }
}

async function projExportStatusReportImagem() {
  projLoad();
  projSaveStatusReportFromForm();
  try {
    await projDownloadStatusReportPNG();
    projToast('Imagem do Relatório Executivo gerada.', '#00a89a');
  } catch(err) {
    console.error(err);
    projToast('Nao foi possivel gerar a imagem PNG.', '#dc2626');
  }
}

function projCanvasRoundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function projCanvasTextWidth(ctx, text, maxWidth) {
  let value = String(text || '');
  while(value.length && ctx.measureText(value).width > maxWidth) value = value.slice(0, -1);
  return value.length < String(text || '').length ? `${value}...` : value;
}

function projCanvasWrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach(word => {
    const test = line ? `${line} ${word}` : word;
    if(ctx.measureText(test).width <= maxWidth) line = test;
    else {
      if(line) lines.push(line);
      line = word;
    }
  });
  if(line) lines.push(line);
  const limited = maxLines ? lines.slice(0, maxLines) : lines;
  if(maxLines && lines.length > maxLines && limited.length) {
    let last = limited[limited.length - 1];
    while(last.length && ctx.measureText(`${last}...`).width > maxWidth) last = last.slice(0, -1);
    limited[limited.length - 1] = `${last}...`;
  }
  limited.forEach((ln, i) => ctx.fillText(ln, x, y + (i * lineHeight)));
  return limited.length * lineHeight;
}

function projLoadCanvasImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function projRelatorioExecutivoRef(date) {
  const base = date || new Date();
  const ref = new Date(base.getFullYear(), base.getMonth() - 1, 1);
  return `${String(ref.getMonth() + 1).padStart(2, '0')}/${ref.getFullYear()}`;
}

async function projDownloadStatusReportPNG() {
  progLoad();
  const ativos = PROJETOS.filter(p => p.status === 'ativo');
  const concluidos = PROJETOS.filter(p => p.status === 'concluido');
  const media = ativos.length ? Math.round(ativos.reduce((a,p)=>a+(Number(p.percentual ?? p.execucao?.percentual ?? 0)),0)/ativos.length) : 0;
  const ref = projRelatorioExecutivoRef();
  const totalProjetos = ativos.length + concluidos.length;
  const concluidoPct = totalProjetos ? (concluidos.length / totalProjetos) * 100 : 0;
  const projetos = ativos.slice().sort((a,b)=>Number(b.percentual ?? b.execucao?.percentual ?? 0)-Number(a.percentual ?? a.execucao?.percentual ?? 0));
  const grupos = {};
  ativos.forEach(p => { const g = projProgramaNome(p); if(!grupos[g]) grupos[g] = []; grupos[g].push(p); });
  const detailHeight = Object.values(grupos).reduce((sum, items) => {
    return sum + 56 + items.reduce((projectSum, p) => {
      const indicatorLines = (p.execucao?.indicadores || []).length;
      const overdueLines = projTarefasAtrasadasProjeto(p).length;
      const noteLines = Math.min(5, Math.max(2, Math.ceil(String(p.status_report_obs || '').length / 92)));
      return projectSum + 154 + (indicatorLines * 18) + (Math.min(4, overdueLines) * 18) + (noteLines * 18);
    }, 0);
  }, 0);
  const w = 1200;
  const rowH = 48;
  const doneRows = Math.max(1, concluidos.length);
  const contentH = 500 + (projetos.length * rowH) + 90 + (doneRows * 30) + detailHeight + 100;
  const h = Math.min(Math.ceil(contentH * 1.35) + 2400, 30000);
  const scale = h > 15000 ? 1 : 2;
  const reportLogo = await projLoadCanvasImage(new URL(PROJ_CAGE_REPORT_LOGO, window.location.href).href).catch(() => null);
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#f6fbff';
  ctx.fillRect(0, 0, w, 170);
  ctx.fillStyle = '#005a9c';
  ctx.fillRect(0, 0, 10, 170);
  ctx.fillStyle = '#005a9c';
  ctx.font = '700 13px Arial';
  ctx.fillText('CAGE-RS \u00b7 ESCRIT\u00d3RIO DE PROJETOS E PROCESSOS', 42, 54);
  ctx.fillStyle = '#0f2746';
  ctx.font = '800 34px Arial';
  ctx.fillText('Relatório Executivo de Projetos', 42, 96);
  ctx.fillStyle = '#5f6b80';
  ctx.font = '16px Arial';
  ctx.fillText(`Emitido em ${new Date().toLocaleDateString('pt-BR')}`, 42, 124);
  ctx.fillStyle = '#005a9c';
  ctx.font = '700 14px Arial';
  ctx.fillText(`ref. ${ref}`, 42, 150);
  if(reportLogo) {
    const maxLogoW = 360;
    const maxLogoH = 92;
    const ratio = Math.min(maxLogoW / reportLogo.width, maxLogoH / reportLogo.height);
    const logoW = reportLogo.width * ratio;
    const logoH = reportLogo.height * ratio;
    ctx.drawImage(reportLogo, 1128 - logoW, 44, logoW, logoH);
  }
  ctx.fillStyle = '#00a89a';
  ctx.font = '800 18px Arial';
  ctx.fillText('Resumo Gr\u00e1fico', 42, 218);
  ctx.fillStyle = '#0f2746';
  ctx.font = '800 26px Arial';
  ctx.fillText('Vis\u00e3o imediata do portf\u00f3lio', 42, 252);
  const drawRing = (x, y, r, parts, center, labelLines) => {
    ctx.lineWidth = 18;
    ctx.strokeStyle = '#e7edf5';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    let start = -Math.PI / 2;
    parts.forEach(part => {
      const value = Math.max(0, Math.min(100, Number(part.value) || 0));
      if(value <= 0) return;
      const end = start + (Math.PI * 2 * value / 100);
      ctx.strokeStyle = part.color;
      ctx.beginPath();
      ctx.arc(x, y, r, start, end);
      ctx.stroke();
      start = end;
    });
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r - 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#005a9c';
    ctx.font = '800 27px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(center, x, y - 10);
    ctx.fillStyle = '#5f6b80';
    ctx.font = '11px Arial';
    labelLines.forEach((line, idx) => ctx.fillText(line, x, y + 14 + (idx * 13)));
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
  };
  drawRing(100, 348, 58, [
    { value: 100 - concluidoPct, color: '#005a9c' },
    { value: concluidoPct, color: '#00a89a' }
  ], String(totalProjetos), ['PROJETOS']);
  drawRing(300, 348, 58, [{ value: media, color: '#00bfb3' }], `${media}%`, ['M\u00c9DIA DE', 'CONCLUS\u00c3O']);
  ctx.fillStyle = '#005a9c';
  ctx.beginPath();
  ctx.arc(62, 440, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#00a89a';
  ctx.beginPath();
  ctx.arc(210, 440, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#334155';
  ctx.font = '13px Arial';
  ctx.fillText('Em andamento', 76, 444);
  ctx.fillText('Conclu\u00eddos', 224, 444);
  let y = 490;
  projCanvasRoundRect(ctx, 42, y, 1116, projetos.length * rowH + 64, 14);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#d9e5f5';
  ctx.stroke();
  ctx.fillStyle = '#0f2746';
  ctx.font = '800 17px Arial';
  ctx.fillText('Projetos por conclus\u00e3o', 70, y + 34);
  projetos.forEach((p, idx) => {
    const py = y + 66 + (idx * rowH);
    const pct = Math.max(0, Math.min(100, Number(p.percentual ?? p.execucao?.percentual ?? 0)));
    ctx.fillStyle = '#172033';
    ctx.font = '15px Arial';
    ctx.fillText(projCanvasTextWidth(ctx, p.nome, 420), 70, py);
    ctx.fillStyle = '#e7edf5';
    projCanvasRoundRect(ctx, 520, py - 11, 220, 12, 6);
    ctx.fill();
    ctx.fillStyle = '#005a9c';
    projCanvasRoundRect(ctx, 520, py - 11, Math.max(2, pct * 2.2), 12, 6);
    ctx.fill();
    ctx.fillStyle = '#005a9c';
    ctx.font = '800 15px Arial';
    ctx.fillText(`${pct}%`, 770, py);
    ctx.fillStyle = '#5f6b80';
    ctx.font = '12px Arial';
    ctx.fillText(projCanvasTextWidth(ctx, p.gerente || 'Gerente nao informado', 260), 840, py);
  });
  y += projetos.length * rowH + 92;
  projCanvasRoundRect(ctx, 42, y, 1116, doneRows * 32 + 58, 14);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#d9e5f5';
  ctx.stroke();
  ctx.fillStyle = '#0f2746';
  ctx.font = '800 17px Arial';
  ctx.fillText('Projetos conclu\u00eddos', 70, y + 34);
  if(concluidos.length) {
    concluidos.forEach((p, idx) => {
      const py = y + 66 + (idx * 32);
      ctx.fillStyle = '#00a89a';
      ctx.beginPath();
      ctx.arc(78, py - 5, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.font = '14px Arial';
      ctx.fillText(projCanvasTextWidth(ctx, p.nome, 990), 94, py);
    });
  } else {
    ctx.fillStyle = '#5f6b80';
    ctx.font = '14px Arial';
    ctx.fillText('Nenhum projeto concluido registrado.', 70, y + 66);
  }
  y += doneRows * 32 + 106;
  Object.entries(grupos).forEach(([programa, items]) => {
    ctx.fillStyle = '#005a9c';
    ctx.font = '800 20px Arial';
    ctx.fillText(programa, 42, y);
    ctx.fillStyle = '#00bfb3';
    ctx.fillRect(42, y + 12, 1116, 3);
    y += 34;
    items.forEach(p => {
      const pct = Math.max(0, Math.min(100, Number(p.percentual ?? p.execucao?.percentual ?? 0)));
      const indicadores = p.execucao?.indicadores || [];
      const atrasadas = projTarefasAtrasadasProjeto(p);
      const noteLines = Math.min(5, Math.max(2, Math.ceil(String(p.status_report_obs || '').length / 92)));
      const cardH = 154 + (indicadores.length * 18) + (Math.min(4, atrasadas.length) * 18) + (noteLines * 18);
      projCanvasRoundRect(ctx, 42, y, 1116, cardH, 14);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#d9e5f5';
      ctx.stroke();
      ctx.fillStyle = '#0f2746';
      ctx.font = '800 18px Arial';
      ctx.fillText(projCanvasTextWidth(ctx, p.nome, 520), 70, y + 34);
      ctx.fillStyle = '#00a89a';
      ctx.font = '800 28px Arial';
      ctx.fillText(`${pct}%`, 600, y + 36);
      ctx.fillStyle = '#e7edf5';
      projCanvasRoundRect(ctx, 70, y + 54, 560, 9, 5);
      ctx.fill();
      ctx.fillStyle = '#005a9c';
      projCanvasRoundRect(ctx, 70, y + 54, Math.max(2, pct * 5.6), 9, 5);
      ctx.fill();
      ctx.fillStyle = '#005a9c';
      ctx.font = '800 11px Arial';
      ctx.fillText('PATROCINADOR', 70, y + 88);
      ctx.fillText('GERENTE', 310, y + 88);
      ctx.fillText('GERENTE SUBSTITUTO', 550, y + 88);
      ctx.fillStyle = '#334155';
      ctx.font = '13px Arial';
      ctx.fillText(projCanvasTextWidth(ctx, p.patrocinador || 'Nao informado', 200), 70, y + 108);
      ctx.fillText(projCanvasTextWidth(ctx, p.gerente || 'Nao informado', 200), 310, y + 108);
      ctx.fillText(projCanvasTextWidth(ctx, p.gerente_substituto || 'Nao informado', 200), 550, y + 108);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(760, y + 24, 4, Math.max(82, noteLines * 18 + 20));
      ctx.fillStyle = '#005a9c';
      ctx.font = '800 11px Arial';
      ctx.fillText('SUMARIO EXECUTIVO', 778, y + 34);
      ctx.fillStyle = '#334155';
      ctx.font = '13px Arial';
      projCanvasWrapText(ctx, p.status_report_obs || 'Sem sumario executivo registrado.', 778, y + 56, 330, 18, noteLines);
      let infoY = y + 136;
      if(indicadores.length) {
        ctx.fillStyle = '#005a9c';
        ctx.font = '800 11px Arial';
        ctx.fillText('INDICADORES', 70, infoY);
        ctx.fillStyle = '#334155';
        ctx.font = '12px Arial';
        indicadores.forEach(ind => {
          infoY += 18;
          const meta = projIndicadorValor(ind,'meta');
          const atual = projIndicadorValor(ind,'resultado');
          const ating = meta ? (atual / meta) * 100 : 0;
          ctx.fillText(projCanvasTextWidth(ctx, `${ind.nome || 'Indicador'}: ${atual}/${meta} (${projPctFmt(ating)})`, 520), 70, infoY);
        });
      }
      if(atrasadas.length) {
        infoY += 22;
        ctx.fillStyle = '#b45309';
        ctx.font = '800 11px Arial';
        ctx.fillText('TAREFAS ATRASADAS', 70, infoY);
        ctx.fillStyle = '#334155';
        ctx.font = '12px Arial';
        atrasadas.slice(0,4).forEach(t => {
          infoY += 18;
          ctx.fillText(projCanvasTextWidth(ctx, `${t._parentName ? `${t._parentName} / ` : ''}${t.nome} - ${projFormatDate(t.dt_fim)}`, 640), 70, infoY);
        });
      }
      y += cardH + 18;
    });
    y += 28;
  });
  const finalH = Math.min(h, Math.ceil(y + 100));
  const out = document.createElement('canvas');
  out.width = canvas.width;
  out.height = finalH * scale;
  const outCtx = out.getContext('2d');
  outCtx.fillStyle = '#ffffff';
  outCtx.fillRect(0, 0, out.width, out.height);
  outCtx.drawImage(canvas, 0, 0);
  const a = document.createElement('a');
  a.download = `Relatorio_Executivo_Projetos_Email_${new Date().toISOString().slice(0,10)}.png`;
  a.href = out.toDataURL('image/png');
  a.click();
}

function projQuarterValue(date) {
  const d = date || new Date();
  return d.getFullYear() + '-T' + (Math.floor(d.getMonth() / 3) + 1);
}
function projQuarterLabel(value) {
  const m = String(value||'').match(/^(\d{4})-T([1-4])$/);
  return m ? (m[2] + 'º Trimestre de ' + m[1]) : 'Trimestre';
}
function projQuarterRange(value) {
  const m = String(value||'').match(/^(\d{4})-T([1-4])$/);
  const ano = m ? Number(m[1]) : new Date().getFullYear();
  const tri = m ? Number(m[2]) : Math.floor(new Date().getMonth()/3)+1;
  const startMonth = (tri - 1) * 3;
  return { start:new Date(ano,startMonth,1), end:new Date(ano,startMonth+3,0), months:[0,1,2].map(i => { const v = new Date(ano,startMonth+i,1).toISOString().slice(0,7); return {value:v,label:projMonthLabel(v)}; }) };
}
function projQuarterOptionsHtml() {
  const selected = projQuarterValue();
  let html = '';
  for(let y=2026; y<=new Date().getFullYear()+1; y++) {
    for(let q=1; q<=4; q++) {
      if(y===2026 && q<2) continue;
      const v = y + '-T' + q;
      html += `<option value="${v}" ${v===selected?'selected':''}>${projQuarterLabel(v)}</option>`;
    }
  }
  return html;
}
function projExportReunioesRealizadasPDF() {
  projLoad();
  const quarterValue = document.getElementById('greuniao-rel-tri')?.value || projQuarterValue();
  const label = projQuarterLabel(quarterValue);
  const range = projQuarterRange(quarterValue);
  const reunioes = [];
  PROJETOS.forEach(p => {
    (p.execucao?.reunioes||[]).forEach(r => {
      if(!r.data) return;
      const d = new Date(r.data + 'T00:00:00');
      if(d >= range.start && d <= range.end) reunioes.push({ ...r, _projeto:p });
    });
  });
  const mesesHtml = range.months.map(month => {
    const items = reunioes.filter(r => projIsoInMonth(r.data, month.value)).sort((a,b)=>(a.data||'').localeCompare(b.data||''));
    const rows = items.map(r => `<tr><td>${projFormatDate(r.data)}</td><td>${projEsc(r._projeto.nome)}</td><td>${projEsc(r.nome)}</td><td>${r.realizada?'Concluída':'Planejada'}</td><td>${projEsc(r.participantes||'')}</td><td>${projEsc(r.observacoes||'')}</td></tr>`).join('');
    return `<section class="month"><h2>${projEsc(month.label)}</h2>${items.length ? `<table><thead><tr><th>Data</th><th>Projeto</th><th>Reunião</th><th>Status</th><th>Participantes</th><th>Observações</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">Nenhuma reunião planejada ou concluída neste mês.</div>'}</section>`;
  }).join('');
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório Trimestral de Reuniões</title><style>:root{--blue:#005a9c;--teal:#00bfb3}@page{size:A4;margin:14mm}body{font-family:Arial,Helvetica,sans-serif;color:#1a2540}.head{border-left:8px solid var(--blue);padding:14px 18px;background:#f0f6ff;margin-bottom:16px}.k{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#00a89a;font-weight:700}h1{margin:4px 0;color:var(--blue);font-size:24px}.sub{font-size:12px;color:#5f6b80}.month{margin-top:18px;break-inside:avoid}.month h2{font-size:15px;color:var(--blue);border-bottom:2px solid var(--teal);padding-bottom:5px}table{width:100%;border-collapse:collapse;font-size:11.5px}th{background:var(--blue);color:#fff;text-align:left;padding:8px}td{border-bottom:1px solid #d9e2ef;padding:7px;vertical-align:top}tr:nth-child(even) td{background:#f8fbff}.empty{padding:12px;border:1px solid #d9e2ef;border-radius:8px;color:#5f6b80;font-size:12px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="head"><div class="k">CAGE-RS · Escritório de Projetos e Processos</div><h1>Relatório Trimestral de Reuniões</h1><div class="sub">${projEsc(label)} · ${reunioes.length} reunião(ões) planejada(s) ou concluída(s)</div></div>${mesesHtml}<script>setTimeout(function(){window.print();},350);</script></body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if(!w) { projToast('Permita pop-ups para exportar o PDF.', '#d97706'); URL.revokeObjectURL(url); return; }
}

function projAddMonths(date, months) {
  const d = date || new Date();
  return new Date(d.getFullYear(), d.getMonth() + (months||0), 1);
}

function projAutoAddReunioesTipo(tipo, monthOffset) {
  if(!projEnsureWriteAll('Apenas EPP pode criar reuniões automáticas.')) return;
  projLoad();
  const target = projAddMonths(new Date(), monthOffset || 0);
  const mn = projMonthLabel(projMonthValue(target));
  _projReunioesCalendarMonth = projMonthValue(target);
  const dataStatus = projMonthFirstDay(target);
  const isCronograma = tipo === 'cronograma';
  const baseNome = isCronograma ? 'Acompanhamento de Cronograma' : 'Reuniao de Status Patrocinador';
  const nome = baseNome + ' - ' + mn;
  let count = 0;
  let jaExiste = 0;
  PROJETOS.forEach(function(proj){
    if(proj.status === 'concluido' || proj.status === 'cancelado') return;
    if(!proj.execucao) proj.execucao = {planner_link:'',percentual:0,reunioes:[]};
    if(!proj.execucao.reunioes) proj.execucao.reunioes = [];
    let ja = proj.execucao.reunioes.some(function(r){
      return r.nome === nome || (r.auto && r.auto_tipo === tipo && r.data === dataStatus);
    });
    if(ja){ jaExiste++; return; }
    proj.execucao.reunioes.push({
      id: 'r' + Date.now() + '_' + tipo + '_' + proj.id,
      nome: nome,
      data: dataStatus,
      participantes: isCronograma ? (proj.gerente||'') : ((proj.gerente||'') + (proj.patrocinador ? ', ' + proj.patrocinador : '')),
      observacoes: isCronograma ? 'Reuniao mensal de acompanhamento do cronograma' : 'Reuniao mensal de acompanhamento com o patrocinador',
      realizada: false,
      auto: true,
      auto_tipo: tipo
    });
    count++;
  });
  projSave();
  if(count > 0) projToast(count + ' reuniao(oes) criada(s) para ' + mn + '!');
  else if(jaExiste > 0) projToast('Todas as reunioes do periodo ja existem.','#d97706');
  else projToast('Nenhum projeto ativo encontrado.','#d97706');
  projAtualizarBadgeReunioes();
  projGo('reunioes', document.getElementById('pnb-reunioes'));
}

function projAutoAddReunioesCronogramaTodos(monthOffset) {
  projAutoAddReunioesTipo('cronograma', monthOffset || 0);
}

function projColetarReunioesGlobal() {
  const todas = [];
  PROJETOS.forEach(function(p){
    (p.execucao?.reunioes || []).forEach(function(r){
      todas.push({ ...r, _projeto:p });
    });
  });
  return todas;
}

function projRenderReunioesCalendar(container) {
  const monthValue = _projReunioesCalendarMonth || document.getElementById('proj-cal-reuniao-mes')?.value || projMonthValue();
  const parts = monthValue.split('-').map(Number);
  const ano = parts[0];
  const mesIndex = (parts[1] || 1) - 1;
  const first = new Date(ano, mesIndex, 1);
  const daysInMonth = new Date(ano, mesIndex + 1, 0).getDate();
  const startOffset = first.getDay();
  const reunioes = projColetarReunioesGlobal().filter(r => r.data && projIsoInMonth(r.data, monthValue));
  const byDay = {};
  reunioes.forEach(r => {
    const day = Number.parseInt(String(r.data).slice(8,10), 10);
    if(!byDay[day]) byDay[day] = [];
    byDay[day].push(r);
  });

  const section = document.createElement('div');
  section.className = 'proj-form-section proj-meeting-calendar-section';
  section.style.marginBottom = '1rem';

  // Title — static SVG + text
  const titleDiv = document.createElement('div');
  titleDiv.className = 'proj-form-section-title';
  projSetHtml(titleDiv, '<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><rect x="1.5" y="3" width="13" height="11.5" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M5 1.5v3M11 1.5v3M1.5 6.5h13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>');
  titleDiv.appendChild(document.createTextNode(' Calendário de Reuniões'));
  section.appendChild(titleDiv);

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'proj-meeting-cal-toolbar';
  const toolInfo = document.createElement('div');
  const calTitle = document.createElement('div');
  calTitle.className = 'proj-meeting-cal-title';
  calTitle.textContent = projMonthLabel(monthValue);
  const calSub = document.createElement('div');
  calSub.className = 'proj-meeting-cal-sub';
  calSub.textContent = reunioes.length + ' reunião(ões) no mês selecionado';
  toolInfo.append(calTitle, calSub);
  const monthInput = document.createElement('input');
  monthInput.type = 'month'; monthInput.className = 'proj-fi';
  monthInput.id = 'proj-cal-reuniao-mes'; monthInput.value = monthValue;
  monthInput.style.maxWidth = '170px';
  monthInput.addEventListener('change', () => {
    _projReunioesCalendarMonth = monthInput.value || projMonthValue();
    projRenderReunioesPage();
  });
  toolbar.append(toolInfo, monthInput);
  section.appendChild(toolbar);

  // Weekday headers — static text
  const weekdaysDiv = document.createElement('div');
  weekdaysDiv.className = 'proj-meeting-cal-weekdays';
  ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].forEach(d => {
    const s = document.createElement('span'); s.textContent = d; weekdaysDiv.appendChild(s);
  });
  section.appendChild(weekdaysDiv);

  // Grid
  const grid = document.createElement('div');
  grid.className = 'proj-meeting-cal-grid';
  for(let i = 0; i < startOffset; i++){
    const empty = document.createElement('div');
    empty.className = 'proj-meeting-cal-cell empty';
    grid.appendChild(empty);
  }
  for(let day = 1; day <= daysInMonth; day++){
    const items = byDay[day] || [];
    const dateValue = monthValue + '-' + String(day).padStart(2,'0');
    const cell = document.createElement('div');
    cell.className = 'proj-meeting-cal-cell';
    cell.addEventListener('dragover', ev => projMeetingCalendarDragOver(ev));
    cell.addEventListener('drop', ev => projDropReuniaoCalendar(ev, dateValue));
    const dayEl = document.createElement('div');
    dayEl.className = 'proj-meeting-cal-day'; dayEl.textContent = day;
    cell.appendChild(dayEl);
    items.slice(0,5).forEach(r => {
      const pId = String(r._projeto.id);
      const rId = String(r.id);
      const meetItem = document.createElement('div');
      meetItem.className = 'proj-meeting-cal-item' + (r.realizada ? ' done' : '');
      meetItem.draggable = true;
      meetItem.title = r._projeto.nome + ' - ' + r.nome;
      meetItem.addEventListener('dragstart', ev => projDragReuniaoCalendar(ev, pId, rId));
      // Icon
      const iconSpan = document.createElement('span');
      iconSpan.className = 'proj-mini-icon';
      if(r._projeto.icone_url){
        const img = document.createElement('img'); img.src = r._projeto.icone_url; img.alt = '';
        iconSpan.appendChild(img);
      } else {
        iconSpan.textContent = r._projeto.icone_emoji || '📁';
      }
      const nameSpan = document.createElement('span');
      nameSpan.textContent = r.nome;
      meetItem.append(iconSpan, nameSpan);
      cell.appendChild(meetItem);
    });
    if(items.length > 5){
      const more = document.createElement('div');
      more.className = 'proj-meeting-cal-more';
      more.textContent = '+' + (items.length - 5) + ' reunião(ões)';
      cell.appendChild(more);
    }
    grid.appendChild(cell);
  }
  section.appendChild(grid);
  container.appendChild(section);
}

function projDragReuniaoCalendar(ev, projetoId, reuniaoId) {
  if(!ev?.dataTransfer) return;
  ev.dataTransfer.effectAllowed = 'move';
  ev.dataTransfer.setData('text/plain', JSON.stringify({ projetoId, reuniaoId }));
}

function projMeetingCalendarDragOver(ev) {
  ev.preventDefault();
  if(ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
}

function projDropReuniaoCalendar(ev, novaData) {
  ev.preventDefault();
  if(!projEnsureWriteAll('Apenas EPP pode alterar reuniões.')) return;
  let payload = null;
  try { payload = JSON.parse(ev.dataTransfer.getData('text/plain') || '{}'); } catch(e) { payload = null; }
  if(!payload?.projetoId || !payload?.reuniaoId || !novaData) return;
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === String(payload.projetoId));
  const reuniao = proj?.execucao?.reunioes?.find(r => String(r.id) === String(payload.reuniaoId));
  if(!reuniao) return;
  reuniao.data = novaData;
  _projReunioesCalendarMonth = novaData.slice(0, 7);
  projSave();
  projToast('Data da reunião atualizada.');
  projRenderReunioesPage();
  if(typeof projAtualizarBadgeReunioes === 'function') projAtualizarBadgeReunioes();
}

function projRenderReunioesPage() {
  projLoad();
  const el = document.getElementById('proj-reunioes-content');
  if(!el) return;

  // Static form only — no user data in this string
  projSetHtml(el, `
    <div class="proj-form-section" style="margin-bottom:1rem">
      <div class="proj-form-section-title">
        <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M3 2.5h10v11H3z" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 6h5M5.5 8.5h5M5.5 11h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        Relatório Trimestral de Reuniões
      </div>
      <div style="display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap">
        <div class="proj-fg" style="margin:0;min-width:180px">
          <label class="proj-fl" for="greuniao-rel-tri">Trimestre</label>
          <select class="proj-fi" id="greuniao-rel-tri">${projQuarterOptionsHtml()}</select>
        </div>
        <button type="button" class="proj-btn primary" onclick="projExportReunioesRealizadasPDF()">Gerar relatório PDF</button>
      </div>
    </div>
    <div class="proj-form-section" style="margin-bottom:1rem">
      <div class="proj-form-section-title" style="cursor:pointer" onclick="var f=document.getElementById('proj-reuniao-form-fields');f.style.display=f.style.display==='none'?'block':'none'">
        <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.4"/><path d="M8 5v6M5 8h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        Nova Reunião
      </div>
      <div id="proj-reuniao-form-fields" style="display:none">
      <div class="proj-g2" style="margin-bottom:.7rem">
        <div class="proj-fg" style="margin:0">
          <label class="proj-fl">Projeto<span>*</span></label>
          <select class="proj-fi" id="greuniao-proj">
            <option value="">Selecione...</option>
          </select>
        </div>
        <div class="proj-fg" style="margin:0">
          <label class="proj-fl">Nome da Reunião<span>*</span></label>
          <input type="text" class="proj-fi" id="greuniao-nome" placeholder="Nome da reunião">
        </div>
      </div>
      <div class="proj-g3" style="margin-bottom:.7rem">
        <div class="proj-fg" style="margin:0"><label class="proj-fl">Data (opcional)</label><input type="date" class="proj-fi" id="greuniao-data"></div>
        <div class="proj-fg" style="margin:0"><label class="proj-fl">Participantes (opcional)</label><input type="text" class="proj-fi" id="greuniao-part" placeholder="Participantes"></div>
        <div class="proj-fg" style="margin:0"><label class="proj-fl">Observações (opcional)</label><input type="text" class="proj-fi" id="greuniao-obs" placeholder="Observações"></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="proj-btn" style="font-size:11px;padding:5px 12px" onclick="projAutoAddReunioesStatusTodos()">📅 Criar Status Patrocinador (mês)</button>
          <button type="button" class="proj-btn" style="font-size:11px;padding:5px 12px" onclick="projAutoAddReunioesTipo('status',1)">📅 Criar Status Patrocinador (mês seguinte)</button>
          <button type="button" class="proj-btn" style="font-size:11px;padding:5px 12px" onclick="projAutoAddReunioesCronogramaTodos(0)">📅 Criar Reunião de Acompanhamento do Cronogama (mês)</button>
          <button type="button" class="proj-btn" style="font-size:11px;padding:5px 12px" onclick="projAutoAddReunioesCronogramaTodos(1)">📅 Criar Reunião de Acompanhamento do Cronogama (mês seguinte)</button>
          <button type="button" class="proj-btn" style="font-size:11px;padding:5px 12px" onclick="projDeduplicarReunioesGlobal()">🧹 Excluir Duplicadas — Todos os projetos</button>
        </div>
        <button type="button" class="proj-btn primary" onclick="projAdicionarReuniaoGlobal()">Adicionar Reunião</button>
      </div>
      </div>
    </div>
  `);

  // Calendar built entirely via DOM (user data via textContent/title/addEventListener)
  const calDiv = document.createElement('div');
  projRenderReunioesCalendar(calDiv);
  el.prepend(calDiv.firstElementChild || calDiv);

  // Populate project select options safely via DOM
  const sel = document.getElementById('greuniao-proj');
  if(sel) {
    PROJETOS.filter(p => p.status === 'ativo').forEach(p => {
      const opt = document.createElement('option');
      opt.value = String(p.id);
      opt.textContent = p.nome;
      sel.appendChild(opt);
    });
  }

  // Build meeting cards via DOM (avoids XSS in innerHTML with user data)
  const listFrag = document.createDocumentFragment();
  let hasAny = false;
  const calSvg = '<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><rect x="1" y="3" width="14" height="12" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M5 1v4M11 1v4M1 7h14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  PROJETOS.forEach(p => {
    const reunioes = p.execucao?.reunioes || [];
    if(reunioes.length === 0) return;
    const pendentes = reunioes.filter(r => !r.realizada);
    const pId = String(p.id);
    if(pendentes.length === 0 && reunioes.length > 0) {
      hasAny = true;
      const card = document.createElement('div');
      card.className = 'proj-card'; card.style.marginBottom = '1rem';
      const hd = document.createElement('div');
      hd.className = 'proj-card-t'; hd.style.cursor = 'pointer';
      projSetHtml(hd, calSvg);
      hd.addEventListener('click', () => projGoReunioesProj(pId));
      const link = document.createElement('a');
      link.href = 'javascript:void(0)';
      link.style.cssText = 'color:var(--blue);text-decoration:underline';
      link.textContent = p.nome;
      const badge = document.createElement('span');
      badge.style.cssText = 'font-size:10.5px;font-weight:400;color:#16a34a;margin-left:4px';
      badge.textContent = '✓ Todas as reuniões realizadas';
      hd.append(link, badge); card.appendChild(hd);
      listFrag.appendChild(card);
      return;
    }
    if(pendentes.length === 0) return;
    hasAny = true;
    const card = document.createElement('div');
    card.className = 'proj-card'; card.style.marginBottom = '1rem';
    const hd = document.createElement('div');
    hd.className = 'proj-card-t'; hd.style.cursor = 'pointer';
    projSetHtml(hd, calSvg);
    hd.addEventListener('click', () => projGoReunioesProj(pId));
    const link = document.createElement('a');
    link.href = 'javascript:void(0)';
    link.style.cssText = 'color:var(--blue);text-decoration:underline';
    link.textContent = p.nome;
    const cnt = document.createElement('span');
    cnt.style.cssText = 'font-size:10.5px;font-weight:400;color:#d97706;margin-left:4px';
    cnt.textContent = '(' + pendentes.length + ' pendente' + (pendentes.length > 1 ? 's' : '') + ')';
    hd.append(link, cnt); card.appendChild(hd);
    pendentes.forEach(r => {
      const rId = String(r.id);
      const item = document.createElement('div');
      item.className = 'proj-reunion-item';
      item.style.cssText = 'display:grid;grid-template-columns:auto 1fr auto auto auto;align-items:center;gap:8px;padding:.6rem 0;border-bottom:1px solid var(--bdr)';
      const chk = document.createElement('div');
      chk.className = 'proj-reunion-check';
      chk.addEventListener('click', () => projToggleReuniaoPage(pId, rId));
      const content = document.createElement('div');
      const txtEl = document.createElement('div');
      txtEl.className = 'proj-reunion-text'; txtEl.textContent = r.nome;
      content.appendChild(txtEl);
      if(r.data || r.participantes) {
        const meta = document.createElement('div');
        meta.style.cssText = 'font-size:11px;color:var(--ink3);margin-top:2px';
        if(r.data) meta.appendChild(document.createTextNode('📅 ' + projFormatDate(r.data) + (r.participantes ? ' · ' : '')));
        if(r.participantes) meta.appendChild(document.createTextNode('👥 ' + r.participantes));
        content.appendChild(meta);
      }
      if(r.observacoes) {
        const obs = document.createElement('div');
        obs.style.cssText = 'font-size:11px;color:var(--ink3)';
        obs.textContent = '📝 ' + r.observacoes;
        content.appendChild(obs);
      }
      const pendBadge = document.createElement('span');
      pendBadge.style.cssText = 'font-size:10px;padding:2px 7px;border-radius:5px;background:var(--blue-l);color:var(--blue)';
      pendBadge.textContent = 'Pendente';
      const editBtn = document.createElement('button');
      editBtn.type = 'button'; editBtn.className = 'proj-btn';
      editBtn.style.cssText = 'font-size:11px;padding:3px 8px'; editBtn.textContent = '✏️';
      editBtn.addEventListener('click', () => projEditarReuniaoModal(pId, rId));
      const delBtn = document.createElement('button');
      delBtn.type = 'button'; delBtn.className = 'proj-btn danger';
      delBtn.style.cssText = 'font-size:11px;padding:3px 8px'; delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => projExcluirReuniao(pId, rId));
      item.append(chk, content, pendBadge, editBtn, delBtn);
      card.appendChild(item);
    });
    listFrag.appendChild(card);
  });

  if(!hasAny) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:2rem;font-size:13px;color:var(--ink4)';
    empty.textContent = 'Nenhuma reunião registrada ainda. Adicione uma acima.';
    listFrag.appendChild(empty);
  }
  el.appendChild(listFrag);
}

// ── Sub-página de reuniões de um projeto específico ──
function projGoReunioesProj(projId) {
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === String(projId));
  if(!proj) return;
  const reunioes = proj.execucao?.reunioes || [];
  const pendentes = reunioes.filter(r => !r.realizada);
  const realizadas = reunioes.filter(r => r.realizada);

  const el = document.getElementById('proj-reunioes-content');
  if(!el) return;

  let html = `
    <div style="margin-bottom:1rem">
      <button type="button" class="proj-btn" style="font-size:12px;padding:5px 12px" onclick="projGo('reunioes',document.getElementById('pnb-reunioes'))">← Voltar para Reuniões</button>
    </div>
    <h3 style="font-size:16px;font-weight:700;color:#1a2233;margin-bottom:1rem">${projEsc(proj.nome)} — Reuniões</h3>
  `;

  // Pendentes
  if(pendentes.length > 0) {
    html += `<div class="proj-card" style="margin-bottom:1rem">
      <div class="proj-card-t" style="color:#d97706">
        <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.4"/><path d="M8 5v4M8 11h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        Reuniões Pendentes (${pendentes.length})
      </div>`;
    pendentes.forEach(r => {
      html += projRenderReuniaoItem(proj.id, r, false);
    });
    html += `</div>`;
  } else {
    html += `<div style="padding:1rem;color:#16a34a;font-size:13px;background:#f0fdf4;border-radius:8px;margin-bottom:1rem">✓ Nenhuma reunião pendente neste projeto.</div>`;
  }

  // Realizadas — spoiler
  if(realizadas.length > 0) {
    html += `
      <div class="proj-card" style="margin-bottom:1rem">
        <div class="proj-card-t" style="cursor:pointer;user-select:none" onclick="var c=document.getElementById('proj-reunioes-passadas-${projId}');var a=document.getElementById('proj-reunioes-arrow-${projId}');if(c.style.display==='none'){c.style.display='block';a.textContent='▼'}else{c.style.display='none';a.textContent='▶'}">
          <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span id="proj-reunioes-arrow-${projId}" style="font-size:10px;margin-right:4px">▶</span> Ver reuniões passadas (${realizadas.length})
        </div>
        <div id="proj-reunioes-passadas-${projId}" style="display:none">`;
    realizadas.forEach(r => {
      html += projRenderReuniaoItem(proj.id, r, true);
    });
    html += `</div></div>`;
  }

  projSetHtml(el, html);
}

// ── Helper: render a single reunião item ──
function projRenderReuniaoItem(projId, r, isDone) {
  const pid = projEsc(String(projId));
  return `
    <div class="proj-reunion-item ${isDone?'proj-reunion-done':''}" style="display:grid;grid-template-columns:auto 1fr auto auto auto;align-items:center;gap:8px;padding:.6rem 0;border-bottom:1px solid #eaecf3">
      <div class="proj-reunion-check ${isDone?'done':''}" onclick="projToggleReuniaoPage('${pid}','${projEsc(r.id)}')">
        ${isDone ? '<svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M2 6l3 3 5-5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
      </div>
      <div>
        <div class="proj-reunion-text">${projEsc(r.nome)}</div>
        <div style="font-size:11px;color:var(--ink3);margin-top:2px">
          ${r.data ? '📅 '+projFormatDate(r.data) + (r.participantes?' · ':'') : ''}
          ${r.participantes ? '👥 '+projEsc(r.participantes) : ''}
        </div>
        ${r.observacoes ? `<div style="font-size:11px;color:var(--ink3)">📝 ${projEsc(r.observacoes)}</div>` : ''}
      </div>
      <span style="font-size:10px;padding:2px 7px;border-radius:5px;${isDone?'background:var(--teal-l);color:var(--teal)':'background:var(--blue-l);color:var(--blue)'}">${isDone?'Realizada':'Pendente'}</span>
      <button type="button" class="proj-btn" style="font-size:11px;padding:3px 8px" onclick="projEditarReuniaoModal('${pid}','${projEsc(r.id)}')">✏️</button>
      <button type="button" class="proj-btn danger" style="font-size:11px;padding:3px 8px" onclick="projExcluirReuniao('${pid}','${projEsc(r.id)}')">✕</button>
    </div>
  `;
}

function projAdicionarReuniaoGlobal() {
  if(!projEnsureWriteAll('Apenas EPP pode criar reuniões.')) return;
  const projId = document.getElementById('greuniao-proj')?.value;
  const nome = document.getElementById('greuniao-nome')?.value.trim();
  if(!projId) { projToast('Selecione um projeto.', '#d97706'); return; }
  if(!nome)   { projToast('Informe o nome da reunião.', '#d97706'); return; }
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === String(projId));
  if(!proj) return;
  if(!proj.execucao) proj.execucao = { planner_link:'', percentual:0, reunioes:[] };
  if(!proj.execucao.reunioes) proj.execucao.reunioes = [];
  proj.execucao.reunioes.push({
    id: 'r' + Date.now(),
    nome,
    data: document.getElementById('greuniao-data')?.value || '',
    participantes: document.getElementById('greuniao-part')?.value.trim() || '',
    observacoes: document.getElementById('greuniao-obs')?.value.trim() || '',
    realizada: false
  });
  projSave();
  projToast('Reunião adicionada!');
  projAtualizarBadgeReunioes();
  projRenderReunioesPage();
}

function projEditarReuniaoModal(projetoId, reuniaoId) {
  if(!projEnsureWriteAll('Apenas EPP pode editar reuniões.')) return;
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === String(projetoId));
  if(!proj) return;
  const r = (proj.execucao?.reunioes||[]).find(r => String(r.id) === String(reuniaoId));
  if(!r) return;

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem';
  projSetHtml(modal, `
    <div style="background:#fff;border-radius:16px;padding:1.6rem;width:100%;max-width:480px;box-shadow:0 16px 48px rgba(0,0,0,.2)">
      <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:700;color:#1a2540;margin-bottom:1.2rem">Editar Reunião</div>
      <div class="proj-fg"><label class="proj-fl">Nome<span>*</span></label>
        <input type="text" class="proj-fi" id="edit-r-nome" value="${projEsc(r.nome)}"></div>
      <div class="proj-g2">
        <div class="proj-fg"><label class="proj-fl">Data</label>
          <input type="date" class="proj-fi" id="edit-r-data" value="${projEsc(r.data||'')}"></div>
        <div class="proj-fg"><label class="proj-fl">Participantes</label>
          <input type="text" class="proj-fi" id="edit-r-part" value="${projEsc(r.participantes||'')}"></div>
      </div>
      <div class="proj-fg"><label class="proj-fl">Observações</label>
        <input type="text" class="proj-fi" id="edit-r-obs" value="${projEsc(r.observacoes||'')}"></div>
      <div class="proj-btn-row">
        <button type="button" class="proj-btn" onclick="this.closest('[style*=fixed]').remove()">Cancelar</button>
        <button type="button" class="proj-btn primary" onclick="projSalvarEdicaoReuniao('${projEsc(String(projetoId))}','${projEsc(String(reuniaoId))}',this)">Salvar</button>
      </div>
    </div>
  `);
  document.body.appendChild(modal);
}

function projSalvarEdicaoReuniao(projetoId, reuniaoId, btn) {
  if(!projEnsureWriteAll('Apenas EPP pode editar reuniões.')) return;
  const nome = document.getElementById('edit-r-nome')?.value.trim();
  if(!nome) { projToast('Informe o nome.','#d97706'); return; }
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === String(projetoId));
  if(!proj) return;
  const r = (proj.execucao?.reunioes||[]).find(r => String(r.id) === String(reuniaoId));
  if(!r) return;
  r.nome = nome;
  r.data = document.getElementById('edit-r-data')?.value || '';
  r.participantes = document.getElementById('edit-r-part')?.value.trim() || '';
  r.observacoes = document.getElementById('edit-r-obs')?.value.trim() || '';
  projSave();
  projToast('Reunião atualizada!');
  projAtualizarBadgeReunioes();
  btn.closest('[style*=fixed]').remove();
  projRenderReunioesPage();
}


function projToggleReuniaoPage(projetoId, reuniaoId) {
  projToggleReuniao(projetoId, reuniaoId);
  projRenderReunioesPage();
}

function projExcluirReuniao(projetoId, reuniaoId) {
  if(!projEnsureWriteAll('Apenas EPP pode excluir reuniões.')) return;
  projConfirmar('Tem certeza que deseja excluir esta reunião?\n\nEsta ação não pode ser desfeita.', () => {
    projLoad();
    const proj = PROJETOS.find(p => String(p.id) === String(projetoId));
    if(!proj) return;
    proj.execucao.reunioes = (proj.execucao.reunioes||[]).filter(r => String(r.id) !== String(reuniaoId));
    projSave();
    projRenderReunioesPage();
    projAtualizarBadgeReunioes();
    projToast('Reunião excluída.');
  });
}

// ════════════════════════════════════════════════════════════════════
// CRIAR PROJETO
// ════════════════════════════════════════════════════════════════════
function projRenderNovo() {
  // Just reset the form fields
  ['pnovo-nome','pnovo-gerente','pnovo-desc','pnovo-inicio','pnovo-fim','pnovo-patrocinador'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = '';
  });
  const sel = document.getElementById('pnovo-fonte');
  if(sel) sel.value = '';
  // Populate program dropdown
  progLoad();
  const progSel = document.getElementById('pnovo-programa');
  if(progSel) {
    const ativos = PROGRAMAS.filter(pg => pg.status === 'ativo');
    projSetHtml(progSel, '<option value="">Sem programa</option>' +
      ativos.map(pg => `<option value="${projEsc(String(pg.id))}">${projEsc(pg.nome)}</option>`).join(''));
    progSel.value = '';
  }
}

function projCriar() {
  if(!projEnsureWriteAll()) return;
  const nome = document.getElementById('pnovo-nome')?.value.trim();
  const gerente = document.getElementById('pnovo-gerente')?.value.trim();
  if(!nome) { projToast('Informe o nome do projeto.', '#d97706'); return; }
  if(!gerente) { projToast('Informe o gerente do projeto.', '#d97706'); return; }

  projLoad();
  const programaIdRaw = document.getElementById('pnovo-programa')?.value || '';
  const novo = projFixDefaults({
    id: Date.now(),
    nome,
    gerente,
    descricao: document.getElementById('pnovo-desc')?.value.trim()||'',
    dt_inicio: document.getElementById('pnovo-inicio')?.value||'',
    dt_fim: document.getElementById('pnovo-fim')?.value||'',
    patrocinador: document.getElementById('pnovo-patrocinador')?.value.trim()||'',
    fonte: document.getElementById('pnovo-fonte')?.value||'',
    fase_atual: 'aprovacao',
    status: 'ativo',
    percentual: 0,
    programa_id: programaIdRaw ? Number(programaIdRaw) : null,
    dt_criacao: new Date().toISOString().split('T')[0]
  });
  PROJETOS.push(novo);
  projSave();
  projToast('Projeto "' + nome + '" criado com sucesso!');
  projAbrirDetalhe(novo.id);
}

// ════════════════════════════════════════════════════════════════════
// EXCLUIR PROJETO
// ════════════════════════════════════════════════════════════════════
function projExcluir(id) {
  if(!projEnsureWriteAll()) return;
  const proj = PROJETOS.find(p => String(p.id) === String(id));
  if(!proj) return;
  projConfirmar(`Excluir o projeto "${proj.nome}"?\n\nAtenção: esta ação é irreversível e apagará todos os dados do projeto.`, () => {
    projConfirmar('Confirme novamente: EXCLUIR permanentemente o projeto "' + proj.nome + '"?', () => {
      projLoad();
      PROJETOS = PROJETOS.filter(p => String(p.id) !== String(id));
      projSave();
      projToast('Projeto excluído.');
      projGo('portfolio', document.getElementById('pnb-portfolio'));
    });
  });
}

// ════════════════════════════════════════════════════════════════════
// DETALHE DO PROJETO
// ════════════════════════════════════════════════════════════════════
function projAbrirDetalhe(id, forceWorkflow, preserveWorkflowTab) {
  projLoad();
  const sameProject = String(_projCurrentId || '') === String(id);
  _projCurrentId = String(id);
  _projCurrentPage = 'detalhe';
  const proj = PROJETOS.find(p => String(p.id) === String(id));
  if(!proj) { projToast('Projeto não encontrado.', '#b91c1c'); return; }
  if(!preserveWorkflowTab || !sameProject) {
    _projCurrentWorkflowTab = proj.fase_atual || 'aprovacao';
  }

  document.querySelectorAll('.proj-page').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.proj-nav-btn').forEach(b => b.classList.remove('on'));
  document.getElementById('proj-page-detalhe').classList.add('on');

  // For concluded/cancelled projects, show memorial by default unless forced
  if(!forceWorkflow && (proj.status === 'concluido' || proj.status === 'cancelado')) {
    projRenderMemorial(proj);
  } else {
    projRenderDetalhe(proj);
  }
}

function projRenderDetalhe(p) {
  const el = document.getElementById('proj-detalhe-content');
  if(!el) return;

  const faseIdx = FASE_IDX[p.fase_atual] || 0;

  // Build workflow indicator
  const workflow = PROJ_FASES.map((f, i) => {
    let dotClass = '';
    if(i < faseIdx) dotClass = 'done';
    else if(i === faseIdx) dotClass = 'active';
    return `
      <div class="proj-wf-step ${dotClass}">
        <div class="proj-wf-dot ${dotClass}">${dotClass==='done'?'✓':i+1}</div>
        <div class="proj-wf-label ${dotClass==='active'?'active':''}">${f.short}</div>
      </div>
    `;
  }).join('');

  // Build tabs based on current phase
  const tabs = PROJ_FASES.map((f,i) => `
    <div class="proj-tab ${i===0?'on':''}" onclick="projDetalheTab('${f.id}',this)">${f.label}</div>
  `).join('');

  projSetHtml(el, `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:1.4rem;flex-wrap:wrap">
      <button type="button" class="proj-btn" style="font-size:12px;padding:5px 11px" onclick="projGo('portfolio',document.getElementById('pnb-portfolio'))">← Portfólio</button>
      <div style="font-size:28px;cursor:pointer;padding:2px 6px;border-radius:8px;border:1px dashed transparent;transition:all .2s" title="Alterar ícone" onclick="projShowEmojiPicker(${JSON.stringify(String(p.id))})" onmouseover="this.style.borderColor='#1A5DC8';this.style.background='#ebf1fc'" onmouseout="this.style.borderColor='transparent';this.style.background='none'">${p.icone_url ? '<img src="'+projEsc(p.icone_url)+'" style="width:32px;height:32px;object-fit:cover;border-radius:6px">' : projEsc(p.icone_emoji || '📁')}</div>
      <div style="flex:1">
        <div style="font-family:'Syne',sans-serif;font-size:19px;font-weight:700;color:#1a2540">${projEsc(p.nome)}</div>
        <div style="font-size:12px;color:var(--ink3);margin-top:2px">Gerente: ${projEsc(p.gerente)} ${p.patrocinador ? '· Patrocinador: '+projEsc(p.patrocinador) : ''}</div>
      </div>
      <span class="proj-list-badge ${projFaseBadgeClass(p.status,p.fase_atual)}" style="font-size:12px;padding:4px 12px">${projFaseText(p)}</span>
      ${p.status==='ativo' ? '<span id="proj-fase-buttons" data-pid="' + projEsc(String(p.id)) + '"></span>' : ''}
    </div>

    <!-- Workflow -->
    <div class="proj-card" style="margin-bottom:1.2rem">
      <div class="proj-workflow">${workflow}</div>
    </div>

    <!-- Tabs das fases -->
    <div class="proj-tabs" id="proj-detalhe-tabs">${tabs}</div>
    <div id="proj-detalhe-tab-content"></div>
  `);

  // Populate fase buttons (avoid nested template literals)
  let faseBtn = document.getElementById('proj-fase-buttons');
  if(faseBtn) {
    const pid = faseBtn.dataset.pid;
    let fIdx = FASE_IDX[p.fase_atual] || 0;
    faseBtn.replaceChildren();
    if(fIdx > 0){ const b=document.createElement('button'); b.type='button'; b.className='proj-btn'; b.style.cssText='font-size:12px;padding:5px 11px;margin-right:6px'; b.textContent='← Regredir Fase'; b.onclick=()=>projRegredirFase(pid); faseBtn.appendChild(b);}
    if(fIdx < PROJ_FASES.length - 1){ const b=document.createElement('button'); b.type='button'; b.className='proj-btn'; b.style.cssText='font-size:12px;padding:5px 11px'; b.textContent='Avançar Fase →'; b.onclick=()=>projAvancarFase(pid); faseBtn.appendChild(b);}
  }
  // Render first tab
  let faseToOpen = _projCurrentWorkflowTab || p.fase_atual || 'aprovacao';
  let tabIdx = {aprovacao:0, ideacao:1, planejamento:2, execucao:3, conclusao:4};
  let tIdx = tabIdx[faseToOpen] || 0;
  let tabEls = el.querySelectorAll('#proj-detalhe-tabs .proj-tab');
  projDetalheTab(faseToOpen, tabEls[tIdx] || tabEls[0]);
}

function projDetalheTab(faseId, tabEl) {
  _projCurrentWorkflowTab = faseId;
  document.querySelectorAll('#proj-detalhe-tabs .proj-tab').forEach(t => t.classList.remove('on'));
  if(tabEl) tabEl.classList.add('on');
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  const content = document.getElementById('proj-detalhe-tab-content');
  if(!content) return;

  switch(faseId) {
    case 'aprovacao':    projSetHtml(content, projTabAprovacao(proj)); setTimeout(projPopulateVinculacoes,50); break;
    case 'ideacao':      projSetHtml(content, projTabIdeacao(proj)); projScheduleCanvasLayout(); break;
    case 'planejamento': projSetHtml(content, projTabPlanejamento(proj)); break;
    case 'execucao':     projSetHtml(content, projTabExecucao(proj)); setTimeout(() => { projInitCronNameColumn(); projInitCronTaskNameTextareas(); }, 0); break;
    case 'conclusao':    projSetHtml(content, projTabConclusao(proj)); break;
  }
  projApplyProjectReadonly(faseId);
}

let _projCanvasLayoutBound = false;
let _projCanvasLayoutTimer = null;

function projScheduleCanvasLayout() {
  if(!_projCanvasLayoutBound) {
    _projCanvasLayoutBound = true;
    window.addEventListener('resize', () => {
      clearTimeout(_projCanvasLayoutTimer);
      _projCanvasLayoutTimer = setTimeout(projAdjustCanvasFirstRow, 120);
    });
  }
  requestAnimationFrame(projAdjustCanvasFirstRow);
}

function projAdjustCanvasFirstRow() {
  const grid = document.querySelector('#canvas-manual-mode .proj-canvas-grid');
  if(!grid || getComputedStyle(grid).display === 'none') return;
  const firstCells = [...grid.querySelectorAll('.proj-canvas-col')]
    .map(col => col.querySelector('.proj-canvas-cell'))
    .filter(Boolean);
  if(!firstCells.length) return;
  firstCells.forEach(cell => { cell.style.minHeight = ''; });
  const targetHeight = Math.max(112, ...firstCells.map(cell => cell.scrollHeight + 2));
  firstCells.forEach(cell => { cell.style.minHeight = `${Math.ceil(targetHeight)}px`; });
}

function projApplyProjectReadonly(faseId){
  if(isEP()) return;
  const content = document.getElementById('proj-detalhe-tab-content');
  if(!content) return;
  const controls = content.querySelectorAll('input, textarea, select, button');
  controls.forEach(el => {
    if(el.tagName === 'A') return;
    el.disabled = true;
    el.dataset.projReadonly = '1';
  });
  if(faseId === 'execucao' && projCanWriteSchedule()){
    const cron = content.querySelector('#exec-cronograma-section');
    if(cron){
      cron.querySelectorAll('input, textarea, select, button').forEach(el => {
        if(el.dataset.derivedDisabled) return;
        el.disabled = false;
        delete el.dataset.projReadonly;
      });
    }
  }
  if(!content.querySelector('.proj-readonly-banner')){
    const msg = projIsLinkedManager()
      ? 'Visualização geral. Este projeto está vinculado ao seu perfil Projetos; você pode editar apenas o cronograma.'
      : 'Seu perfil tem acesso apenas de visualização no SIGA Projetos.';
    projAppendHtml(content, 'afterbegin', `<div class="proj-readonly-banner">${projEsc(msg)}</div>`);
  }
}

// ── ABA: APROVAÇÃO ───────────────────────────────────────────────
function projTabAprovacao(p) {
  const a = p.aprovacao || {};
  return `
    <div class="proj-form-section">
      <div class="proj-form-section-title">
        <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        Dados Oficiais do Projeto
      </div>
      <div class="proj-ib proj-ib-teal">
        É nesta fase que se oficializam os dados do projeto. Atualize aqui o nome, gerente, patrocinador e demais informações formais.
      </div>
      <div class="proj-g2">
        <div class="proj-fg">
          <label class="proj-fl">Nome do Projeto<span>*</span></label>
          <input type="text" class="proj-fi" id="aprov-nome" value="${projEsc(p.nome||'')}" onchange="projSalvarAprovacao()">
        </div>
        <div class="proj-fg">
          <label class="proj-fl">Gerente do Projeto</label>
          <input type="text" class="proj-fi" id="aprov-gerente" value="${projEsc(p.gerente||'')}" onchange="projSalvarAprovacao()">
        </div>
        <div class="proj-fg">
          <label class="proj-fl">Gerente Substituto</label>
          <input type="text" class="proj-fi" id="aprov-gerente-sub" value="${projEsc(p.gerente_substituto||'')}" onchange="projSalvarAprovacao()">
        </div>
        <div class="proj-fg">
          <label class="proj-fl" for="aprov-divisao">Área / divisão (opcional)</label>
          <select class="proj-fi" id="aprov-divisao" onchange="projSalvarAprovacao()">
            ${AreasArquitetura.options(p.divisao, projArquiteturaAtual(), projEsc)}
          </select>
        </div>
      </div>
      <div class="proj-g3">
        <div class="proj-fg">
          <label class="proj-fl">Patrocinador</label>
          <input type="text" class="proj-fi" id="aprov-patrocinador" value="${projEsc(p.patrocinador||'')}" onchange="projSalvarAprovacao()">
        </div>
        <div class="proj-fg">
          <label class="proj-fl">Data de Início Prevista</label>
          <input type="date" class="proj-fi" id="aprov-inicio" value="${projEsc(p.dt_inicio||'')}" autocomplete="off" onkeydown="if(event.key==='Enter'){event.preventDefault();}" onchange="projSalvarAprovacao()">
        </div>
        <div class="proj-fg">
          <label class="proj-fl">Data de Fim Prevista</label>
          <input type="date" class="proj-fi" id="aprov-fim" value="${projEsc(p.dt_fim||'')}" autocomplete="off" onkeydown="if(event.key==='Enter'){event.preventDefault();}" onchange="projSalvarAprovacao()">
        </div>
      </div>
      <div class="proj-g2">
        <div class="proj-fg">
          <label class="proj-fl">Fonte do Projeto</label>
          <select class="proj-fi" id="aprov-fonte" onchange="projSalvarAprovacao()">
            <option value="">Selecione...</option>
            <option value="Gestão" ${p.fonte==='Gestão'?'selected':''}>Gestão</option>
            <option value="Proposição da Equipe" ${p.fonte==='Proposição da Equipe'?'selected':''}>Proposição da Equipe</option>
          </select>
        </div>
        <div class="proj-fg">
          <label class="proj-fl">Programa <span style="opacity:.5;font-size:10px;font-weight:400">(opcional)</span></label>
          <select class="proj-fi" id="aprov-programa" onchange="projSalvarAprovacao()">
            <option value="">Sem programa</option>
            ${(PROGRAMAS||[]).filter(pg=>pg.status!=='cancelado').map(pg=>`<option value="${projEsc(String(pg.id))}" ${String(p.programa_id)===String(pg.id)?'selected':''}>${projEsc(pg.nome)}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    <div class="proj-form-section">
      <div class="proj-form-section-title">🔗 Vinculações Estratégicas</div>
      <div class="proj-fg">
        <label class="proj-fl">Macroprocessos da Cadeia de Valor</label>
        <div id="aprov-macro-list" style="margin-bottom:6px"></div>
        <div style="display:flex;gap:6px">
          <select class="proj-fi" id="aprov-macro-sel" style="flex:1"><option value="">Selecione...</option></select>
          <button type="button" class="proj-btn primary" style="font-size:11px;padding:4px 10px;white-space:nowrap" onclick="projAddMacro()">+ Adicionar</button>
        </div>
        <div style="margin-top:6px;font-size:12px">Cadastro compartilhado com a arquitetura de Processos.</div>
      </div>
      <div class="proj-fg">
        <label class="proj-fl" for="aprov-impacto-macro">Processos impactados pelo projeto</label>
        <div id="aprov-impacto-list" style="margin-bottom:6px"></div>
        <select class="proj-fi" id="aprov-impacto-macro" onchange="projPopulateProcessosImpactados()" aria-label="Filtrar processos por macroprocesso"></select>
        <div style="display:flex;gap:6px;margin-top:6px">
          <select class="proj-fi" id="aprov-impacto-sel" style="flex:1" aria-label="Processo impactado"></select>
          <button type="button" class="proj-btn primary" onclick="projAddProcessoImpactado()">+ Adicionar</button>
        </div>
      </div>
      <div class="proj-fg">
        <label class="proj-fl">Objetivos Estratégicos</label>
        <div id="aprov-obj-list" style="margin-bottom:6px"></div>
        <div style="display:flex;gap:6px">
          <select class="proj-fi" id="aprov-obj-sel" style="flex:1"><option value="">Selecione...</option></select>
          <button type="button" class="proj-btn primary" style="font-size:11px;padding:4px 10px;white-space:nowrap" onclick="projAddObj()">+ Adicionar</button>
        </div>
        <div style="margin-top:6px;display:flex;gap:6px">
          <input type="text" class="proj-fi" id="aprov-obj-novo" placeholder="Ou digite um novo..." style="flex:1;font-size:12px">
          <button type="button" class="proj-btn" style="font-size:11px;padding:4px 10px;white-space:nowrap" onclick="projAddObjNovo()">+ Novo</button>
        </div>
      </div>
    </div>

    <div class="proj-form-section">
      <div class="proj-form-section-title">
        <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.4"/><path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Aprovação pelo CGP
      </div>
      <div class="proj-ib proj-ib-blue">
        A aprovação formal é feita fora do sistema pelo Comitê Gestor de Projetos (CGP). Aqui registra-se apenas a referência a essa deliberação.
      </div>
      <div class="proj-g2">
        <div class="proj-fg">
          <label class="proj-fl">Status de Aprovação</label>
          <select class="proj-fi" id="aprov-ok" onchange="projSalvarAprovacao()">
            <option value="false" ${!a.aprovado?'selected':''}>Aguardando aprovação</option>
            <option value="true" ${a.aprovado?'selected':''}>Aprovado pelo CGP</option>
          </select>
        </div>

      </div>
      <div class="proj-fg">
        <label class="proj-fl">Motivo de Início / Justificativa</label>
        <textarea class="proj-fi" id="aprov-motivo" rows="3" placeholder="Descreva os motivos que levaram à proposição e abertura deste projeto..." onchange="projSalvarAprovacao()">${projEsc(a.motivo_inicio||'')}</textarea>
      </div>
      <div class="proj-fg">
        <label class="proj-fl">Observações</label>
        <textarea class="proj-fi" id="aprov-obs" rows="2" placeholder="Observações sobre a aprovação..." onchange="projSalvarAprovacao()">${projEsc(a.obs||'')}</textarea>
      </div>
      <div class="proj-btn-row">
        <button type="button" class="proj-btn teal" onclick="projSalvarAprovacao()">💾 Salvar</button>
      </div>
    </div>
  `;
}


function projSalvarAprovacao() {
  if(!projEnsureWriteAll()) return;
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  const areaSelecionada = document.getElementById('aprov-divisao')?.value || '';
  if(!AreasArquitetura.valid(areaSelecionada,proj.divisao,projArquiteturaAtual())){
    projToast('Selecione uma área da arquitetura.', '#d97706');return;
  }
  // Save project metadata (editable from this tab)
  const newNome = document.getElementById('aprov-nome')?.value.trim();
  if(newNome) proj.nome = newNome;
  proj.gerente = document.getElementById('aprov-gerente')?.value.trim() || proj.gerente;
  proj.gerente_substituto = document.getElementById('aprov-gerente-sub')?.value.trim() || '';
  proj.patrocinador = document.getElementById('aprov-patrocinador')?.value.trim() || proj.patrocinador;
  proj.dt_inicio = document.getElementById('aprov-inicio')?.value || proj.dt_inicio;
  proj.dt_fim = document.getElementById('aprov-fim')?.value || proj.dt_fim;
  proj.fonte = document.getElementById('aprov-fonte')?.value || proj.fonte;
  proj.divisao = AreasArquitetura.resolve(areaSelecionada, projArquiteturaAtual());
  const progIdRaw = document.getElementById('aprov-programa')?.value;
  if(progIdRaw !== undefined) {
    proj.programa_id = progIdRaw ? Number(progIdRaw) : null;
  }
  proj.aprovacao = {
    motivo_inicio: document.getElementById('aprov-motivo')?.value || '',
    aprovado: document.getElementById('aprov-ok')?.value === 'true',
    deliberacao: document.getElementById('aprov-deliberacao')?.value || '',
    dt_aprovacao: document.getElementById('aprov-deliberacao')?.value || '', // backward compat
    obs: document.getElementById('aprov-obs')?.value || ''
  };
  projSave();
  // Refresh the page header to show updated name
  projAbrirDetalhe(_projCurrentId, true);
  projToast('Dados salvos!');
}

function projAddMacro(){
  if(!projEnsureWriteAll()) return;
  const id = document.getElementById('aprov-macro-sel')?.value;
  projLoad();
  const p = PROJETOS.find(x => String(x.id) === _projCurrentId);
  const macro = projArquiteturaAtual().find(m => String(m.id) === id);
  if(!p || !macro) { projToast('Selecione um macroprocesso da arquitetura.', '#d97706'); return; }
  if(p.macroprocesso_ids.includes(id)) { projToast('Já vinculado.', '#d97706'); return; }
  p.macroprocesso_ids.push(id);
  p.macroprocessos.push(macro.nome);
  p.macroprocesso_nomes[id] = macro.nome;
  projSave();
  projPopulateVinculacoes();
}
function projRemoverMacro(i){
  if(!projEnsureWriteAll()) return;
  projLoad();
  const p = PROJETOS.find(x => String(x.id) === _projCurrentId);
  if(!p) return;
  const macro = projResolveMacro(p.macroprocessos[i]);
  const macroId = macro ? String(macro.id) : Object.keys(p.macroprocesso_nomes).find(id => p.macroprocesso_nomes[id] === p.macroprocessos[i]);
  if(macroId) {
    p.macroprocesso_ids = p.macroprocesso_ids.filter(id => String(id) !== macroId);
    delete p.macroprocesso_nomes[macroId];
  }
  p.macroprocessos.splice(i, 1);
  projSave();
  projPopulateVinculacoes();
}

function projPopulateProcessosImpactados() {
  const p = PROJETOS.find(x => String(x.id) === _projCurrentId);
  if(!p) return;
  const processos = projProcessosArquitetura();
  const list = document.getElementById('aprov-impacto-list');
  if(list) projSetHtml(list, p.processos_impactados.map((link, i) => {
    const current = processos.find(x => x.macro_id === link.macro_id && x.processo_id === link.processo_id);
    const label = current ? `${current.macro} → ${current.nome}` : `${link.macro || link.macro_id} → ${link.nome || link.processo_id} (indisponível na arquitetura)`;
    return `<div style="display:flex;gap:6px;margin-bottom:4px"><span style="flex:1">${projEsc(label)}</span><button type="button" class="proj-btn" onclick="projRemoverProcessoImpactado(${i})" aria-label="Remover processo impactado">×</button></div>`;
  }).join(''));
  const sel = document.getElementById('aprov-impacto-sel');
  const macroId = document.getElementById('aprov-impacto-macro')?.value;
  const available = processos.filter(x => (!macroId || x.macro_id === macroId) && !p.processos_impactados.some(link => link.macro_id === x.macro_id && link.processo_id === x.processo_id));
  if(sel) projSetHtml(sel, `<option value="">${available.length ? 'Selecione um processo...' : 'Nenhum processo disponível'}</option>` + available.map(x => `<option value="${projEsc(JSON.stringify([x.macro_id, x.processo_id]))}">${projEsc(`${x.macro} → ${x.nome}`)}</option>`).join(''));
}

function projAddProcessoImpactado() {
  if(!projEnsureWriteAll()) return;
  const value = document.getElementById('aprov-impacto-sel')?.value;
  if(!value) { projToast('Selecione um processo.', '#d97706'); return; }
  const [macroId, processoId] = JSON.parse(value);
  projLoad();
  const p = PROJETOS.find(x => String(x.id) === _projCurrentId);
  const item = projProcessosArquitetura().find(x => x.macro_id === macroId && x.processo_id === processoId);
  if(!p || !item) { projToast('Processo indisponível na arquitetura.', '#d97706'); return; }
  if(p.processos_impactados.some(x => x.macro_id === macroId && x.processo_id === processoId)) return;
  p.processos_impactados.push(item);
  projSave();
  projPopulateProcessosImpactados();
}

function projRemoverProcessoImpactado(index) {
  if(!projEnsureWriteAll()) return;
  projLoad();
  const p = PROJETOS.find(x => String(x.id) === _projCurrentId);
  if(!p) return;
  p.processos_impactados.splice(index, 1);
  projSave();
  projPopulateProcessosImpactados();
}
function projAddObj(){if(!projEnsureWriteAll())return;let s=document.getElementById('aprov-obj-sel');if(!s||!s.value){projToast('Selecione um objetivo.','#d97706');return;}projLoad();let p=PROJETOS.find(function(x){return String(x.id)===_projCurrentId;});if(!p)return;if(!p.objetivos_estrategicos)p.objetivos_estrategicos=[];if(p.objetivos_estrategicos.indexOf(s.value)>=0){projToast('Já vinculado.','#d97706');return;}p.objetivos_estrategicos.push(s.value);projSave();projPopulateVinculacoes();}
function projRemoverObj(i){if(!projEnsureWriteAll())return;projLoad();let p=PROJETOS.find(function(x){return String(x.id)===_projCurrentId;});if(!p||!p.objetivos_estrategicos)return;p.objetivos_estrategicos.splice(i,1);projSave();projPopulateVinculacoes();}

// ── ABA: IDEAÇÃO (Canvas) ────────────────────────────────────────
function projTabIdeacao(p) {
  const ide = p.ideacao || {};
  const canvasMode = ide.canvas_mode || 'manual';
  return `
    <!-- Link para Canvas externo -->
    <div class="proj-form-section" style="margin-bottom:1rem">
      <div class="proj-form-section-title">
        <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M6 3H3v10h10v-3M10 3h3v3M7 9l6-6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Link para Canvas (externo)
      </div>
      <div class="proj-fg">
        <label class="proj-fl">Link para o Canvas do projeto (PDF, PPT, etc.)</label>
        <input type="url" class="proj-fi" id="canvas-link" value="${projEsc(ide.canvas_link||'')}" placeholder="https://..." onchange="projSalvarIdeacao()">
        ${ide.canvas_link ? `<div style="margin-top:5px"><a href="${projEsc(ide.canvas_link)}" target="_blank" class="proj-btn" style="font-size:11.5px;padding:4px 10px;text-decoration:none;display:inline-block">🔗 Abrir Canvas externo</a></div>` : ''}
      </div>
    </div>

    <!-- Slider: Canvas Manual / HTML Importado -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:1rem;padding:.6rem 1rem;background:#f8f9fb;border-radius:10px;border:1px solid #e5e8ef">
      <span style="font-size:12px;font-weight:600;color:${canvasMode==='manual'?'var(--blue)':'var(--ink3)'}">Canvas Manual</span>
      <label style="position:relative;width:44px;height:24px;cursor:pointer">
        <input type="checkbox" id="canvas-mode-toggle" ${canvasMode==='html'?'checked':''} onchange="projToggleCanvasMode()" style="opacity:0;width:0;height:0">
        <span style="position:absolute;inset:0;background:${canvasMode==='html'?'var(--blue)':'#ccc'};border-radius:24px;transition:.3s"></span>
        <span style="position:absolute;top:2px;left:${canvasMode==='html'?'22px':'2px'};width:20px;height:20px;background:#fff;border-radius:50%;transition:.3s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></span>
      </label>
      <span style="font-size:12px;font-weight:600;color:${canvasMode==='html'?'var(--blue)':'var(--ink3)'}">HTML Importado</span>
    </div>

    <!-- Canvas HTML mode -->
    <div id="canvas-html-mode" style="display:${canvasMode==='html'?'block':'none'}">
      <div class="proj-form-section">
        <div class="proj-form-section-title">Canvas HTML Importado</div>
        <div class="proj-ib proj-ib-teal">Cole aqui o código HTML do Canvas de Ideação. O sistema renderizará abaixo.</div>
        <div class="proj-fg">
          <label class="proj-fl">Código HTML do Canvas</label>
          <textarea class="proj-fi" id="canvas-html-code" rows="5" placeholder="Cole o HTML aqui..." onchange="projSalvarIdeacao()">${projEsc(ide.canvas_html||'')}</textarea>
        </div>
        ${ide.canvas_html ? `
          <div class="proj-eap-embed">
            <div style="padding:.6rem .8rem;background:var(--teal-l);border-bottom:1px solid #e5e8ef;font-size:11px;font-weight:600;color:var(--teal)">Pré-visualização do Canvas</div>
            <iframe sandbox="allow-scripts" srcdoc="${(ide.canvas_html||'').replaceAll('&','&amp;').replaceAll('"','&quot;')}" style="width:100%;min-height:200px;border:none;display:block"></iframe>
          </div>
        ` : ''}
      </div>
      <div class="proj-btn-row" style="margin-top:1rem">
        <button type="button" class="proj-btn teal" onclick="projSalvarIdeacao()">💾 Salvar</button>
      </div>
    </div>

    <!-- Canvas Manual mode -->
    <div id="canvas-manual-mode" style="display:${canvasMode==='manual'?'block':'none'}">
    <div class="proj-canvas-wrap">
      <div class="proj-canvas-header">
        <div class="proj-canvas-title">Canvas Ideação de Projetos</div>
        <div style="font-size:12px;color:rgba(255,255,255,.6)">Nome do Projeto: ${projEsc(p.nome)}</div>
      </div>
      <div class="proj-canvas-grid">
        <!-- Col 1: Por que fazer? -->
        <div class="proj-canvas-col">
          <div class="proj-canvas-col-header" style="background:var(--teal-l);color:var(--teal)">Por que fazer?</div>
          ${projCanvasCell(1,'DESCRIÇÃO','O que é o projeto?','canvas-descricao',ide.descricao||'')}
          ${projCanvasCell(2,'OBJETIVO SMART','Específico, mensurável, alcançável, realista e temporal','canvas-objetivo_smart',ide.objetivo_smart||'')}
          ${projCanvasCell(3,'BENEFÍCIOS','O que o projeto vai gerar?','canvas-beneficios',ide.beneficios||'')}
        </div>
        <!-- Col 2: O que deve ter? -->
        <div class="proj-canvas-col">
          <div class="proj-canvas-col-header" style="background:var(--blue-l);color:var(--blue)">O que deve ter?</div>
          ${projCanvasCell(4,'REQUISITOS','O que é imprescindível?','canvas-requisitos',ide.requisitos||'')}
          ${projCanvasCell(5,'PREMISSAS','Quais as suposições do que deve acontecer?','canvas-premissas',ide.premissas||'')}
          ${projCanvasCell(6,'RESTRIÇÕES','Quais as limitações do projeto?','canvas-restricoes',ide.restricoes||'')}
        </div>
        <!-- Col 3: Como será feito? -->
        <div class="proj-canvas-col">
          <div class="proj-canvas-col-header" style="background:#fff8e8;color:#b45309">Como será feito?</div>
          ${projCanvasCell(7,'ENTREGAS MACRO','O que será entregue pelo projeto?','canvas-entregas_macro',ide.entregas_macro||'')}
          ${projCanvasCell(8,'RISCOS','O que tem mais probabilidade de acontecer?','canvas-riscos_canvas',ide.riscos_canvas||'')}
          ${projCanvasCell(9,'EQUIPE','Quem participa do projeto?','canvas-equipe',ide.equipe||'')}
          ${projCanvasCell(10,'PARTES INTERESSADAS','Quem são os interessados ou podem ter impacto no projeto?','canvas-partes_interessadas',ide.partes_interessadas||'')}
        </div>
        <!-- Col 4: Quais resultados trará? -->
        <div class="proj-canvas-col">
          <div class="proj-canvas-col-header" style="background:#f3e8ff;color:#6b21a8">Quais resultados trará?</div>
          ${projCanvasObjetivoCell(p)}
          ${projCanvasCell(12,'CUSTOS','Qual a estimativa de custo? Há recurso disponível?','canvas-custos',ide.custos||'')}
          ${projCanvasCell(13,'RESULTADOS ESPERADOS','Quais resultados/indicadores serão gerados?','canvas-resultados_esperados',ide.resultados_esperados||'')}
          ${projCanvasCell(14,'AÇÕES IMEDIATAS','O que já pode ser implantado?','canvas-acoes_imediatas',ide.acoes_imediatas||'')}
        </div>
      </div>
    </div>
    <div class="proj-btn-row" style="margin-top:1rem">
      <button type="button" class="proj-btn teal" onclick="projSalvarIdeacao()">💾 Salvar Canvas</button>
    </div>
    </div>
  `;
}

function projToggleCanvasMode() {
  const toggle = document.getElementById('canvas-mode-toggle');
  const newMode = toggle && toggle.checked ? 'html' : 'manual';
  // Save mode preference
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(proj) {
    if(!proj.ideacao) proj.ideacao = {};
    proj.ideacao.canvas_mode = newMode;
    projSave();
  }
  // Re-render tab
  projDetalheTab('ideacao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(2)'));
}

function projCanvasCell(num, label, sub, fieldId, value) {
  return `
    <div class="proj-canvas-cell">
      <div class="proj-canvas-cell-num">${num}</div>
      <div class="proj-canvas-cell-label">${label}</div>
      <div class="proj-canvas-cell-sub">${sub}</div>
      <textarea id="${fieldId}" rows="4" placeholder="..." onchange="projSalvarIdeacao()">${projEsc(value)}</textarea>
    </div>
  `;
}

function projCanvasObjetivosSelecionados(p) {
  projNormalizeStrategyLists();
  const values = projMultiValues(p?.objetivos_estrategicos, p?.ideacao?.objetivo_estrategico)
    .map(v => projCanonicalStrategyValue(v, PROJ_OBJETIVOS))
    .filter(Boolean);
  return [...new Set(values)];
}

function projCanvasObjetivoCell(p) {
  const selected = projCanvasObjetivosSelecionados(p);
  const options = [...new Set([...(PROJ_OBJETIVOS || []), ...selected])]
    .filter(Boolean)
    .filter(o => !selected.includes(o))
    .map(o => `<option value="${projEsc(o)}">${projEsc(o)}</option>`)
    .join('');
  const selectedHtml = selected.length
    ? selected.map((o,i)=>`<div class="proj-canvas-oe-chip"><span>${projEsc(o)}</span><button type="button" onclick="projCanvasRemoverObj(${i})" aria-label="Remover objetivo estratégico">×</button></div>`).join('')
    : '<div class="proj-canvas-oe-empty">Nenhum OE vinculado.</div>';
  return `
    <div class="proj-canvas-cell proj-canvas-cell-oe">
      <div class="proj-canvas-cell-num">11</div>
      <div class="proj-canvas-cell-label">OBJETIVO ESTRATÉGICO</div>
      <div class="proj-canvas-cell-sub">Vincule o projeto a um ou mais objetivos estratégicos</div>
      <div id="canvas-objetivo_estrategico-list" class="proj-canvas-oe-list">${selectedHtml}</div>
      <div class="proj-canvas-oe-add">
        <select id="canvas-objetivo_estrategico-sel" class="proj-fi">
          <option value="">Selecione...</option>${options}
        </select>
        <button type="button" class="proj-btn primary" onclick="projCanvasAddObj()">+ Adicionar</button>
      </div>
    </div>
  `;
}

function projSyncIdeacaoObjetivos(proj) {
  if(!proj) return;
  if(!proj.ideacao) proj.ideacao = {};
  proj.objetivos_estrategicos = [...new Set((proj.objetivos_estrategicos || [])
    .map(v => projCanonicalStrategyValue(v, PROJ_OBJETIVOS))
    .filter(Boolean))];
  proj.ideacao.objetivo_estrategico = proj.objetivos_estrategicos.join('\n');
}

function projRerenderIdeacaoTab() {
  projDetalheTab('ideacao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(2)'));
}

function projCanvasAddObj() {
  if(!projEnsureWriteAll()) return;
  const s = document.getElementById('canvas-objetivo_estrategico-sel');
  if(!s || !s.value) { projToast('Selecione um objetivo.', '#d97706'); return; }
  projLoad();
  const p = PROJETOS.find(x => String(x.id) === _projCurrentId);
  if(!p) return;
  if(!p.objetivos_estrategicos) p.objetivos_estrategicos = [];
  const value = projCanonicalStrategyValue(s.value, PROJ_OBJETIVOS);
  if(p.objetivos_estrategicos.map(v => projCanonicalStrategyValue(v, PROJ_OBJETIVOS)).includes(value)) {
    projToast('Já vinculado.', '#d97706');
    return;
  }
  p.objetivos_estrategicos.push(value);
  projSyncIdeacaoObjetivos(p);
  projSave();
  projRerenderIdeacaoTab();
}

function projCanvasRemoverObj(i) {
  if(!projEnsureWriteAll()) return;
  projLoad();
  const p = PROJETOS.find(x => String(x.id) === _projCurrentId);
  if(!p || !p.objetivos_estrategicos) return;
  p.objetivos_estrategicos.splice(i, 1);
  projSyncIdeacaoObjetivos(p);
  projSave();
  projRerenderIdeacaoTab();
}

function projSalvarIdeacao() {
  if(!projEnsureWriteAll()) return;
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  const fields = ['descricao','objetivo_smart','beneficios','requisitos','premissas','restricoes',
    'entregas_macro','riscos_canvas','equipe','partes_interessadas',
    'custos','resultados_esperados','acoes_imediatas'];
  if(!proj.ideacao) proj.ideacao = {};
  fields.forEach(f => {
    const el = document.getElementById('canvas-'+f);
    if(el) proj.ideacao[f] = el.value;
  });
  if(document.getElementById('canvas-objetivo_estrategico-list')) projSyncIdeacaoObjetivos(proj);
  // Save HTML canvas and link
  const htmlCodeEl = document.getElementById('canvas-html-code');
  if(htmlCodeEl) proj.ideacao.canvas_html = htmlCodeEl.value;
  const linkEl = document.getElementById('canvas-link');
  if(linkEl) proj.ideacao.canvas_link = linkEl.value;
  const modeToggle = document.getElementById('canvas-mode-toggle');
  if(modeToggle) proj.ideacao.canvas_mode = modeToggle.checked ? 'html' : 'manual';
  projSave();
  projToast('Canvas salvo!');
}

// ── ABA: PLANEJAMENTO ────────────────────────────────────────────
function projTabPlanejamento(p) {
  const plan = p.planejamento || {};
  const riscos = plan.riscos || [];
  const editIdx = (_projRiscoEdit && _projRiscoEdit.proj === String(p.id) && riscos[_projRiscoEdit.idx]) ? _projRiscoEdit.idx : -1;
  const edit = editIdx >= 0 ? riscos[editIdx] : null;

  const eapMode = plan.eap_mode || 'html'; // 'html' or 'link'
  const eapSubMode = plan.eap_sub_mode || 'texto'; // 'upload' or 'texto'

  return `
    <div class="proj-form-section">
      <div class="proj-form-section-title">
        <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><rect x="1" y="2" width="14" height="14" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M1 6h14M5 2v4M11 2v4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        EAP — Estrutura Analítica do Projeto
      </div>

      <!-- Slider: EAP Nova em HTML / Link para EAP antiga -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:1rem;padding:.6rem 1rem;background:#f8f9fb;border-radius:10px;border:1px solid #e5e8ef">
        <span style="font-size:12px;font-weight:600;color:${eapMode==='html'?'var(--blue)':'var(--ink3)'}">EAP Nova em HTML</span>
        <label style="position:relative;width:44px;height:24px;cursor:pointer">
          <input type="checkbox" id="eap-mode-toggle" ${eapMode==='link'?'checked':''} onchange="projToggleEapMode()" style="opacity:0;width:0;height:0">
          <span style="position:absolute;inset:0;background:${eapMode==='link'?'var(--blue)':'#ccc'};border-radius:24px;transition:.3s"></span>
          <span style="position:absolute;top:2px;left:${eapMode==='link'?'22px':'2px'};width:20px;height:20px;background:#fff;border-radius:50%;transition:.3s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></span>
        </label>
        <span style="font-size:12px;font-weight:600;color:${eapMode==='link'?'var(--blue)':'var(--ink3)'}">Link para EAP antiga</span>
      </div>

      <!-- EAP Link mode -->
      <div id="eap-link-mode" style="display:${eapMode==='link'?'block':'none'}">
        <div class="proj-fg">
          <label class="proj-fl">Link para a EAP (PDF, PPT, etc.)</label>
          <input type="url" class="proj-fi" id="plan-eap-link" value="${projEsc(plan.eap_link||'')}" placeholder="https://..." onchange="projSalvarPlanejamento()">
          ${plan.eap_link ? `<div style="margin-top:5px"><a href="${projEsc(plan.eap_link)}" target="_blank" class="proj-btn" style="font-size:11.5px;padding:4px 10px;text-decoration:none;display:inline-block">🔗 Abrir EAP externa</a></div>` : ''}
        </div>
      </div>

      <!-- EAP HTML mode -->
      <div id="eap-html-mode" style="display:${eapMode==='html'?'block':'none'}">
        <!-- Sub-slider: Upload / Texto -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:1rem;padding:.5rem .8rem;background:#f0f4ff;border-radius:8px;border:1px solid #e5e8ef">
          <span style="font-size:11px;font-weight:600;color:${eapSubMode==='upload'?'var(--blue)':'var(--ink3)'}">Upload</span>
          <label style="position:relative;width:36px;height:20px;cursor:pointer">
            <input type="checkbox" id="eap-sub-toggle" ${eapSubMode==='texto'?'checked':''} onchange="projToggleEapSub()" style="opacity:0;width:0;height:0">
            <span style="position:absolute;inset:0;background:${eapSubMode==='texto'?'var(--blue)':'#ccc'};border-radius:20px;transition:.3s"></span>
            <span style="position:absolute;top:2px;left:${eapSubMode==='texto'?'18px':'2px'};width:16px;height:16px;background:#fff;border-radius:50%;transition:.3s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></span>
          </label>
          <span style="font-size:11px;font-weight:600;color:${eapSubMode==='texto'?'var(--blue)':'var(--ink3)'}">Texto</span>
        </div>

        <!-- Upload sub-mode -->
        <div id="eap-upload-mode" style="display:${eapSubMode==='upload'?'block':'none'}">
          <div class="proj-fg">
            <label class="proj-fl">Upload de arquivo HTML da EAP</label>
            <input type="file" accept=".html,.htm" class="proj-fi" id="plan-eap-upload" onchange="projUploadEapHtml()" style="padding:6px">
          </div>
        </div>

        <!-- Texto sub-mode -->
        <div id="eap-texto-mode" style="display:${eapSubMode==='texto'?'block':'none'}">
          <div class="proj-fg">
            <div id="plan-eap-textarea-wrap" style="display:none">
              <label class="proj-fl">Código HTML da EAP</label>
              <textarea class="proj-fi" id="plan-eap-html" rows="5" placeholder="Cole o código HTML da EAP aqui..." onchange="projSalvarPlanejamento()">${projEsc(plan.eap_html||'')}</textarea>
              <button type="button" class="proj-btn" style="font-size:11px;padding:4px 10px;margin-top:4px" onclick="document.getElementById('plan-eap-textarea-wrap').style.display='none'">Fechar editor</button>
            </div>
            <div id="plan-eap-textarea-btn" style="display:block">
              <button type="button" class="proj-btn" style="font-size:12px;padding:6px 14px" onclick="document.getElementById('plan-eap-textarea-wrap').style.display='block';document.getElementById('plan-eap-textarea-btn').style.display='none'">
                ${plan.eap_html ? '✏️ Editar código HTML da EAP' : '📝 Colar código HTML da EAP'}
              </button>
            </div>
          </div>
        </div>

        <!-- Preview da EAP -->
        ${plan.eap_html ? `
          <div class="proj-eap-embed" style="margin-top:.8rem">
            <div style="padding:.6rem .8rem;background:#f0f4ff;border-bottom:1px solid #e5e8ef;font-size:11px;font-weight:600;color:var(--blue)">Pré-visualização da EAP</div>
            <div style="padding:1rem;overflow-x:auto">${plan.eap_html}</div>
          </div>
        ` : ''}
      </div>
    </div>

    <div class="proj-form-section">
      <div class="proj-form-section-title">
        <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M8 2l.8 2.5H14l-4.2 3.1 1.6 4.9L8 10.5l-3.4 2 1.6-4.9L2 5.5h5.2z" stroke="currentColor" stroke-width="1.3"/></svg>
        Matriz de Riscos
      </div>
      <div class="proj-ib proj-ib-amber">
        Registre os riscos do projeto. O mapa de calor será gerado automaticamente com base na probabilidade e impacto.
      </div>

      <!-- Adicionar / editar risco -->
      ${edit ? '<div style="font-size:11.5px;font-weight:700;color:#b45309;margin-bottom:.4rem">✎ Editando o risco #'+(editIdx+1)+'</div>' : ''}
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:8px;align-items:end;margin-bottom:.8rem">
        <div class="proj-fg" style="margin:0"><label class="proj-fl">Risco</label><input type="text" class="proj-fi" id="risco-desc" placeholder="Descrição do risco" value="${edit ? projEsc(edit.descricao) : ''}"></div>
        <div class="proj-fg" style="margin:0"><label class="proj-fl">Probabilidade</label>
          <select class="proj-fi" id="risco-prob">${projRiscoOpcoes(PROJ_RISCO_PROB, edit ? edit.probabilidade : 'Media')}</select></div>
        <div class="proj-fg" style="margin:0"><label class="proj-fl">Impacto</label>
          <select class="proj-fi" id="risco-impacto">${projRiscoOpcoes(PROJ_RISCO_IMPACTO, edit ? edit.impacto : 'Medio')}</select></div>
        <div class="proj-fg" style="margin:0"><label class="proj-fl">Urgência</label>
          <select class="proj-fi" id="risco-urgencia">
            ${['baixa','media','alta'].map(u => '<option value="'+u+'"'+(u===(edit ? edit.urgencia : 'media')?' selected':'')+'>'+({baixa:'Baixa',media:'Média',alta:'Alta'})[u]+'</option>').join('')}
          </select></div>
        <div style="display:flex;gap:6px;align-self:flex-end">
          <button type="button" class="proj-btn primary" style="margin-bottom:0;padding:8px 14px" onclick="projAdicionarRisco()">${edit ? '💾 Salvar risco' : '+ Adicionar'}</button>
          ${edit ? '<button type="button" class="proj-btn" style="margin-bottom:0;padding:8px 14px" onclick="projCancelarEdicaoRisco()">Cancelar</button>' : ''}
        </div>
      </div>

      <!-- Tabela de riscos -->
      ${riscos.length > 0 ? `
        <table class="proj-risk-table" style="margin-bottom:1rem">
          <thead><tr>
            <th>#</th><th>Risco</th><th>Probabilidade</th><th>Impacto</th><th>Urgência</th><th>Criticidade</th><th>Ações</th>
          </tr></thead>
          <tbody>
            ${riscos.map((r,i) => {
              const nivel = projRiscoNivel(r.probabilidade, r.impacto);
              return `<tr>
                <td>${i+1}</td>
                <td>${projEsc(r.descricao)}</td>
                <td><select class="proj-fi" style="padding:3px 6px;font-size:12px" aria-label="Probabilidade" onchange="projAtualizarRisco(${i},'probabilidade',this.value)">${projRiscoOpcoes(PROJ_RISCO_PROB, r.probabilidade)}</select></td>
                <td><select class="proj-fi" style="padding:3px 6px;font-size:12px" aria-label="Impacto" onchange="projAtualizarRisco(${i},'impacto',this.value)">${projRiscoOpcoes(PROJ_RISCO_IMPACTO, r.impacto)}</select></td>
                <td style="text-align:center">${projEsc(r.urgencia||'—')}</td>
                <td><span class="risk-heat ${nivel.cls}">${nivel.label}</span></td>
                <td style="white-space:nowrap"><button type="button" class="proj-btn" style="font-size:11px;padding:2px 7px" title="Editar risco" aria-label="Editar risco" onclick="projEditarRisco(${i})">✎</button> <button type="button" class="proj-btn danger" style="font-size:11px;padding:2px 7px" title="Excluir risco" aria-label="Excluir risco" onclick="projExcluirRisco(${i})">✕</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <!-- Mapa de calor -->
        <div style="margin-top:1rem">
          <div style="font-size:11.5px;font-weight:700;color:#1a2540;margin-bottom:.5rem">Mapa de Calor dos Riscos</div>
          ${projGerarMapaCalor(riscos)}
        </div>
      ` : '<div style="text-align:center;padding:1rem;color:#b0b8cc;font-size:13px">Nenhum risco registrado ainda.</div>'}

      <div class="proj-btn-row">
        <button type="button" class="proj-btn teal" onclick="projSalvarPlanejamento()">💾 Salvar Planejamento</button>
      </div>
    </div>
  `;
}

// ── Matriz de riscos: mesma escala do módulo de processos (src/shared/riscos.js) ──
// Probabilidade: Baixa | Media | Alta — Impacto: Baixo | Medio | Alto | Critico
const PROJ_RISCO_PROB = [['Baixa','Baixa'],['Media','Média'],['Alta','Alta']];
const PROJ_RISCO_IMPACTO = [['Baixo','Baixo'],['Medio','Médio'],['Alto','Alto'],['Critico','Crítico']];

function projRiscoOpcoes(lista, atual) {
  return lista.map(function(o){ return '<option value="'+o[0]+'"'+(o[0]===atual?' selected':'')+'>'+o[1]+'</option>'; }).join('');
}

function projRiscoNivel(prob, imp) {
  const p = PROJ_RISCO_PROB.findIndex(function(o){return o[0]===prob;}) + 1;
  const i = PROJ_RISCO_IMPACTO.findIndex(function(o){return o[0]===imp;}) + 1;
  if(!p || !i) return {cls:'', heat:'', label:'—'};
  const score = p * i;
  if(score <= 2) return {cls:'risk-baixo', heat:'heat-1', label:'Baixo'};
  if(score <= 4) return {cls:'risk-medio', heat:'heat-3', label:'Moderado'};
  if(score <= 8) return {cls:'risk-alto', heat:'heat-4', label:'Alto'};
  return {cls:'risk-critico', heat:'heat-5', label:'Crítico'};
}

// Converte riscos salvos na escala antiga (números 1–5) para a escala atual.
function projRiscoMigrar(r) {
  if(!r || typeof r !== 'object') return r;
  const legado = typeof r.probabilidade === 'number' || typeof r.impacto === 'number' ||
    (typeof r.probabilidade === 'string' && /^\d+$/.test(r.probabilidade)) ||
    (typeof r.impacto === 'string' && /^\d+$/.test(r.impacto));
  if(!legado) return r;
  const p = Number(r.probabilidade), i = Number(r.impacto);
  return Object.assign({}, r, {
    probabilidade: p >= 4 ? 'Alta' : p === 3 ? 'Media' : 'Baixa',
    impacto: i >= 5 ? 'Critico' : i === 4 ? 'Alto' : i === 3 ? 'Medio' : 'Baixo'
  });
}

function projPlanejamentoMigrar(plan) {
  if(!plan || !Array.isArray(plan.riscos)) return plan;
  const novos = plan.riscos.map(projRiscoMigrar);
  if(!novos.some(function(r, i){ return r !== plan.riscos[i]; })) return plan;
  _projRiscosMigrados = true;
  return Object.assign({}, plan, {riscos: novos});
}

function projGerarMapaCalor(riscos) {
  let cells = {};
  riscos.forEach(function(r) {
    let key = r.probabilidade + '-' + r.impacto;
    if(!cells[key]) cells[key] = [];
    cells[key].push(r.descricao);
  });
  let html = '<div class="heat-map-grid" style="grid-template-columns:60px repeat(4,1fr)">';
  html += '<div class="heat-cell heat-label"></div>';
  PROJ_RISCO_IMPACTO.forEach(function(o){ html += '<div class="heat-cell heat-label" style="font-size:9px;background:none">Impacto '+o[1]+'</div>'; });
  PROJ_RISCO_PROB.slice().reverse().forEach(function(pr) {
    html += '<div class="heat-cell heat-label" style="font-size:9px;background:none;height:auto">Prob. '+pr[1]+'</div>';
    PROJ_RISCO_IMPACTO.forEach(function(im) {
      let titles = cells[pr[0]+'-'+im[0]] || [];
      let cc = titles.map(function(t){return '<div style="font-size:8px;line-height:1.2;margin:1px 0">'+projEsc(t)+'</div>';}).join('');
      html += '<div class="heat-cell '+projRiscoNivel(pr[0],im[0]).heat+'" style="height:auto;min-height:36px;padding:3px;align-items:flex-start;flex-direction:column" title="Prob. '+pr[1]+' x Imp. '+im[1]+'">'+cc+'</div>';
    });
  });
  html += '</div>';
  return html;
}

// Riscos informados no campo "Riscos" do Canvas (Ideação), separados por ";" ou quebra de linha.
function projRiscosCanvasLista(p) {
  const txt = String(p?.ideacao?.riscos_canvas || '');
  return txt.split(/;|\r?\n/)
    .map(function(t){
      const text=t.trim().replace(/^(?:[-•*–]|\d+[.)])\s*/, '');
      let end=text.length;
      while(end>0 && (text[end-1]==='.' || text[end-1].trim()===''))end--;
      return text.slice(0,end);
    })
    .filter(Boolean);
}

function projRiscoChave(t) {
  return String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
}

// Análise automática (heurística por palavras-chave) de probabilidade e impacto de um risco.
function projRiscoAnalisar(texto) {
  const t = projRiscoChave(texto);
  const tem = function(re){ return re.test(t); };
  let impacto = 'Medio';
  if(tem(/vazamento|fraude|seguranca da informacao|paralisa|inviabiliz|perda de dados|sancao|descumpriment|judicial|legal\b|legislac/)) impacto = 'Critico';
  else if(tem(/dependencia|externa|terceiro|fornecedor|integracao|atraso|prazo|qualidade|imagem|reputac|orcamento|custo|contrat|licitac|indisponibilidade|falha|retrabalho/)) impacto = 'Alto';
  else if(tem(/resistencia|treinamento|capacitacao|comunicacao|documentacao|engajamento/)) impacto = 'Baixo';
  let probabilidade = 'Media';
  if(tem(/dependencia|atraso|escassez|falta de|insuficien|excess|sobrecarga|rotatividade|demora|alta demanda/)) probabilidade = 'Alta';
  else if(tem(/vazamento|fraude|desastre|incendio|judicial|paralisa/)) probabilidade = 'Baixa';
  const nivel = projRiscoNivel(probabilidade, impacto).label;
  return { probabilidade: probabilidade, impacto: impacto, urgencia: nivel === 'Crítico' || nivel === 'Alto' ? 'alta' : nivel === 'Moderado' ? 'media' : 'baixa' };
}

function projRiscoTokens(t) {
  const stop = ['para','com','dos','das','que','por','uma','nos','nas','sobre','entre'];
  return projRiscoChave(t).split(/[^a-z0-9]+/).filter(function(w){ return w.length > 3 && !stop.includes(w); }).map(function(w){ return w.replace(/s$/, ''); });
}

function projRiscoMesmo(a, b) {
  const ta = projRiscoTokens(a), tb = projRiscoTokens(b);
  if(!ta.length || !tb.length) return projRiscoChave(a) === projRiscoChave(b);
  const [menor, maior] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return menor.length >= 2 ? menor.every(function(w){ return maior.includes(w); }) : projRiscoChave(a) === projRiscoChave(b);
}

// Transporta, sem ação do usuário, os riscos do Canvas (Ideação) para a matriz do Planejamento.
// Idempotente: só reprocessa quando o texto do Canvas muda; riscos já cadastrados (mesmo nome) são preservados.
function projPlanejamentoSincronizarCanvas(plan, ideacao) {
  const canvas = String(ideacao?.riscos_canvas || '').trim();
  if(!canvas || (plan && plan.riscos_canvas_sync === canvas)) return plan;
  const base = plan || { eap_html:'', eap_link:'', riscos:[], planner_link:'' };
  const riscos = Array.isArray(base.riscos) ? base.riscos.slice() : [];
  let id = Date.now();
  projRiscosCanvasLista({ ideacao: { riscos_canvas: canvas } }).forEach(function(desc) {
    if(riscos.some(function(r){ return projRiscoMesmo(r.descricao, desc); })) return;
    riscos.push(Object.assign({ id: id++, descricao: desc, origem: 'canvas' }, projRiscoAnalisar(desc)));
  });
  _projRiscosMigrados = true;
  return Object.assign({}, base, { riscos: riscos, riscos_canvas_sync: canvas });
}

function projAtualizarRisco(idx, campo, valor) {
  if(campo !== 'probabilidade' && campo !== 'impacto') return;
  const lista = campo === 'probabilidade' ? PROJ_RISCO_PROB : PROJ_RISCO_IMPACTO;
  if(!lista.some(o => o[0] === valor)) return;
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  const risco = proj?.planejamento?.riscos?.[idx];
  if(!risco) return;
  risco[campo] = valor;
  projSave();
  projDetalheTab('planejamento', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(3)'));
}

function projEditarRisco(idx) {
  _projRiscoEdit = { proj: String(_projCurrentId), idx: idx };
  projDetalheTab('planejamento', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(3)'));
  document.getElementById('risco-desc')?.focus();
}

function projCancelarEdicaoRisco() {
  _projRiscoEdit = null;
  projDetalheTab('planejamento', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(3)'));
}

function projAdicionarRisco() {
  const desc = document.getElementById('risco-desc')?.value.trim();
  if(!desc) { projToast('Informe a descrição do risco.', '#d97706'); return; }
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  if(!proj.planejamento) proj.planejamento = { eap_html:'', riscos:[], planner_link:'' };
  if(!proj.planejamento.riscos) proj.planejamento.riscos = [];
  const prob = document.getElementById('risco-prob')?.value;
  const imp = document.getElementById('risco-impacto')?.value;
  const dados = {
    descricao: desc,
    probabilidade: PROJ_RISCO_PROB.some(o => o[0] === prob) ? prob : 'Media',
    impacto: PROJ_RISCO_IMPACTO.some(o => o[0] === imp) ? imp : 'Medio',
    urgencia: document.getElementById('risco-urgencia')?.value||'media'
  };
  const existente = (_projRiscoEdit && _projRiscoEdit.proj === String(proj.id)) ? proj.planejamento.riscos[_projRiscoEdit.idx] : null;
  if(existente) Object.assign(existente, dados);
  else proj.planejamento.riscos.push(Object.assign({ id: Date.now() }, dados));
  _projRiscoEdit = null;
  projSave();
  projToast(existente ? 'Risco atualizado!' : 'Risco adicionado!');
  projDetalheTab('planejamento', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(3)'));
}

function projExcluirRisco(idx) {
  projConfirmar('Excluir este risco?', () => {
    projLoad();
    const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
    if(!proj) return;
    proj.planejamento.riscos.splice(idx, 1);
    _projRiscoEdit = null;
    projSave();
    projToast('Risco excluído.');
    projDetalheTab('planejamento', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(3)'));
  });
}

function projSalvarPlanejamento() {
  if(!projEnsureWriteAll()) return;
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  if(!proj.planejamento) proj.planejamento = { eap_html:'', riscos:[], planner_link:'', eap_link:'', eap_mode:'html', eap_sub_mode:'texto' };
  proj.planejamento.eap_html = document.getElementById('plan-eap-html')?.value || proj.planejamento.eap_html || '';
  proj.planejamento.eap_link = document.getElementById('plan-eap-link')?.value || proj.planejamento.eap_link || '';
  projSave();
  projToast('Planejamento salvo!');
  projDetalheTab('planejamento', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(3)'));
}

// ── EAP mode toggles ──
function projToggleEapMode() {
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  if(!proj.planejamento) proj.planejamento = { eap_html:'', riscos:[], planner_link:'', eap_link:'', eap_mode:'html', eap_sub_mode:'texto' };
  const toggle = document.getElementById('eap-mode-toggle');
  proj.planejamento.eap_mode = toggle && toggle.checked ? 'link' : 'html';
  projSave();
  projDetalheTab('planejamento', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(3)'));
}

function projToggleEapSub() {
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  if(!proj.planejamento) proj.planejamento = { eap_html:'', riscos:[], planner_link:'', eap_link:'', eap_mode:'html', eap_sub_mode:'texto' };
  const toggle = document.getElementById('eap-sub-toggle');
  proj.planejamento.eap_sub_mode = toggle && toggle.checked ? 'texto' : 'upload';
  projSave();
  projDetalheTab('planejamento', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(3)'));
}

function projUploadEapHtml() {
  const fileInput = document.getElementById('plan-eap-upload');
  if(!fileInput || !fileInput.files || !fileInput.files[0]) return;
  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    projLoad();
    const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
    if(!proj) return;
    if(!proj.planejamento) proj.planejamento = { eap_html:'', riscos:[], planner_link:'', eap_link:'', eap_mode:'html', eap_sub_mode:'upload' };
    proj.planejamento.eap_html = e.target.result;
    projSave();
    projToast('HTML da EAP carregado!');
    projDetalheTab('planejamento', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(3)'));
  };
  reader.readAsText(file);
}

// ── ABA: EXECUÇÃO E MONITORAMENTO ────────────────────────────────
function projKanbanTasks(tarefas, prefix='', parentName='') {
  return (tarefas || []).flatMap((task,index)=>{
    const path=prefix ? `${prefix}.${index}` : String(index);
    if(task.subtarefas?.length) return projKanbanTasks(task.subtarefas,path,[parentName,task.nome].filter(Boolean).join(' / '));
    const pct=Math.max(0,Math.min(100,Number(task.conclusao)||0));
    return [{task,path,parentName,pct,status:task.concluida || pct===100 ? 'concluidas' : pct>0 ? 'andamento' : 'pendentes'}];
  });
}

function projRenderKanban(p) {
  const tasks=projKanbanTasks(p.execucao?.tarefas);
  const canWrite=projCanWriteSchedule(String(p.id));
  const today=new Date().toISOString().slice(0,10);
  return `<div class="proj-kanban">${[['pendentes','Pendentes'],['andamento','Em andamento'],['concluidas','Concluídas']].map(([status,label])=>{
    const items=tasks.filter(item=>item.status===status);
    return `<section class="proj-kanban-column ${status}" aria-label="${label}"><h3>${label}<span>${items.length}</span></h3>${items.length ? items.map(({task,path,parentName,pct})=>{
      const overdue=status!=='concluidas' && task.dt_fim && task.dt_fim<today;
      return `<article class="proj-kanban-card"><div class="proj-kanban-name">${projEsc(task.nome || 'Nova tarefa')}</div>${parentName?`<div class="proj-kanban-context">${projEsc(parentName)}</div>`:''}<div class="proj-kanban-meta">Responsável: ${projEsc(task.responsavel || 'Não informado')}</div><div class="proj-kanban-meta">Início: ${projFormatDate(task.dt_inicio) || '—'}</div><div class="proj-kanban-meta ${overdue?'overdue':''}">Prazo: ${projFormatDate(task.dt_fim) || '—'}${overdue?' · Atrasada':''}</div><div class="proj-kanban-progress"><span>${status==='concluidas'?100:pct}% concluído</span>${task.marco?'<span>Marco</span>':''}${task.ppe?'<span>PPE</span>':''}</div><div class="proj-kanban-bar"><span style="width:${status==='concluidas'?100:pct}%"></span></div>${task.dt_entrega?`<div class="proj-kanban-meta">Entrega: ${projFormatDate(task.dt_entrega)}</div>`:''}<div class="proj-kanban-actions">${canWrite && status!=='concluidas'?`<button type="button" class="proj-kanban-icon complete" aria-label="Marcar como concluída" title="Marcar como concluída" onclick="projToggleTarefa('${path}',true)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></button>`:''}<button type="button" class="proj-kanban-icon" aria-label="Detalhes e comentários" title="Detalhes e comentários" onclick="projOpenTaskNotes('${path}',true)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 1-8 8H5l-4 3 2-6a8 8 0 1 1 17-5Z"/></svg>${task.anotacoes?.length?`<span class="proj-kanban-comment-count">${task.anotacoes.length}</span>`:''}</button></div></article>`;
    }).join(''):'<p class="proj-kanban-empty">Nenhuma atividade nesta coluna.</p>'}</section>`;
  }).join('')}</div>`;
}

function projSetScheduleView(view) {
  if(!['lista','kanban'].includes(view)) return;
  globalThis._projScheduleViews ||= {};
  globalThis._projScheduleViews[String(_projCurrentId)]=view;
  document.getElementById('exec-schedule-list').hidden=view!=='lista';
  document.getElementById('exec-schedule-kanban').hidden=view!=='kanban';
  document.querySelectorAll('[data-schedule-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.scheduleView===view)));
}

function projTabExecucao(p) {
  const exec = p.execucao || {};
  const reunioes = exec.reunioes || [];
  const cronMode = exec.cron_mode || 'planner'; // 'planner' or 'siga'
  const pctMode = exec.pct_mode || 'manual'; // 'manual' or 'derivado'
  const cronWrapNames = exec.cron_wrap_names === true;
  const cronNameWidth = Number.parseInt(exec.cron_nome_col_width, 10) || 0;
  const cronNameBaseWidth = Number.parseInt(exec.cron_nome_col_base_width, 10) || 0;
  const tarefas = exec.tarefas || [];
  const scheduleView=globalThis._projScheduleViews?.[String(p.id)] || 'lista';
  const canScheduleIO = projCanWriteSchedule(String(p.id));
  const todayBackup = projScheduleBackupForDate(p);
  projSyncDerivedTaskDates(tarefas);
  const derivedPct = projCalcDerivedPct(tarefas);
  const displayPct = pctMode === 'derivado' ? derivedPct : (p.percentual||0);

  // Compute task stats for dashboard
  const today = new Date().toISOString().slice(0,10);
  const flatTasks = projFlattenTasks(tarefas);
  const leafTasks = flatTasks.filter(t => !(t._children && t._children.length > 0));
  const concluidas = leafTasks.filter(t => t.concluida);
  const atrasadas = leafTasks.filter(t => !t.concluida && t.dt_fim && t.dt_fim < today);
  const futuras = leafTasks.filter(t => !t.concluida && (!t.dt_fim || t.dt_fim >= today));

  return `
    <div class="proj-form-section">
      <div class="proj-form-section-title">
        <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M3 3h10a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" stroke-width="1.4"/><path d="M5 7h6M5 9.5h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        Execução e Monitoramento
      </div>

      <!-- % Conclusão -->
      <div class="proj-fg">
        <label class="proj-fl">% de Conclusão do Projeto</label>
        <div style="display:flex;align-items:center;gap:10px">
          ${pctMode === 'manual' ? `
            <input type="range" id="exec-percentual" min="0" max="100" step="1" value="${displayPct}" style="flex:1;accent-color:var(--blue)" oninput="document.getElementById('exec-pct-val').textContent=this.value+'%'" onchange="projSalvarExecucao()">
          ` : `
            <div style="flex:1;height:8px;background:#e5e8ef;border-radius:4px;overflow:hidden"><div style="height:100%;width:${derivedPct}%;background:var(--blue);border-radius:4px;transition:width .3s"></div></div>
            <input type="hidden" id="exec-percentual" value="${derivedPct}">
          `}
          <span id="exec-pct-val" style="font-size:16px;font-weight:700;color:var(--blue);min-width:46px">${displayPct}%</span>
        </div>
      </div>

      <!-- Item 7: Slider manual / derivado -->
      <div style="display:flex;align-items:center;gap:12px;margin:.8rem 0;padding:.5rem .8rem;background:#f0f4ff;border-radius:8px;border:1px solid #e5e8ef">
        <span style="font-size:11px;font-weight:600;color:${pctMode==='manual'?'var(--blue)':'var(--ink3)'}">Manual</span>
        <label style="position:relative;width:36px;height:20px;cursor:pointer">
          <input type="checkbox" id="exec-pct-mode-toggle" ${pctMode==='derivado'?'checked':''} onchange="projTogglePctMode()" style="opacity:0;width:0;height:0">
          <span style="position:absolute;inset:0;background:${pctMode==='derivado'?'var(--blue)':'#ccc'};border-radius:20px;transition:.3s"></span>
          <span style="position:absolute;top:2px;left:${pctMode==='derivado'?'18px':'2px'};width:16px;height:16px;background:#fff;border-radius:50%;transition:.3s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></span>
        </label>
        <span style="font-size:11px;font-weight:600;color:${pctMode==='derivado'?'var(--blue)':'var(--ink3)'}">Derivado do Planner SIGA</span>
      </div>

      <div class="proj-btn-row" style="margin-bottom:0">
        <button type="button" class="proj-btn teal" onclick="projSalvarExecucao()">💾 Salvar</button>
      </div>
    </div>

    <!-- Cronograma -->
    <div class="proj-form-section" id="exec-cronograma-section">
      <div class="proj-form-section-title">
        <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><rect x="1" y="3" width="14" height="12" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M5 1v4M11 1v4M1 7h14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        Cronograma / Planner
      </div>

      <!-- Slider: Planner antigo / SIGA -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:1rem;padding:.6rem 1rem;background:#f8f9fb;border-radius:10px;border:1px solid #e5e8ef">
        <span style="font-size:12px;font-weight:600;color:${cronMode==='planner'?'var(--blue)':'var(--ink3)'}">Cronograma antigo no Planner</span>
        <label style="position:relative;width:44px;height:24px;cursor:pointer">
          <input type="checkbox" id="exec-cron-toggle" ${cronMode==='siga'?'checked':''} onchange="projToggleCronMode()" style="opacity:0;width:0;height:0">
          <span style="position:absolute;inset:0;background:${cronMode==='siga'?'var(--blue)':'#ccc'};border-radius:24px;transition:.3s"></span>
          <span style="position:absolute;top:2px;left:${cronMode==='siga'?'22px':'2px'};width:20px;height:20px;background:#fff;border-radius:50%;transition:.3s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></span>
        </label>
        <span style="font-size:12px;font-weight:600;color:${cronMode==='siga'?'var(--blue)':'var(--ink3)'}">Cronograma pelo SIGA</span>
      </div>

      <!-- Planner antigo -->
      <div id="exec-cron-planner" style="display:${cronMode==='planner'?'block':'none'}">
        <div class="proj-fg">
          <label class="proj-fl">Link Microsoft Planner do Projeto</label>
          <input type="url" class="proj-fi" id="exec-planner" value="${projEsc(exec.planner_link||'')}" placeholder="https://tasks.office.com/..." onchange="projSalvarExecucao()">
          ${exec.planner_link ? `<div style="margin-top:5px"><a href="${projEsc(exec.planner_link)}" target="_blank" class="proj-btn" style="font-size:11.5px;padding:4px 10px;text-decoration:none;display:inline-block">🔗 Abrir Planner</a></div>` : ''}
        </div>
      </div>

      <!-- SIGA Cronograma -->
      <div id="exec-cron-siga" style="display:${cronMode==='siga'?'block':'none'}">
        <!-- Dashboard -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:1rem">
          <div style="background:var(--blue-l);padding:.8rem;border-radius:8px;text-align:center">
            <div style="font-size:22px;font-weight:700;color:var(--blue)">${displayPct}%</div>
            <div style="font-size:10px;color:#5a6782">Conclusão</div>
          </div>
          <div style="background:#fef3cd;padding:.8rem;border-radius:8px;text-align:center">
            <div style="font-size:22px;font-weight:700;color:#d97706">${atrasadas.length}</div>
            <div style="font-size:10px;color:#92400e">Atrasadas</div>
          </div>
          <div style="background:#d1fae5;padding:.8rem;border-radius:8px;text-align:center">
            <div style="font-size:22px;font-weight:700;color:#059669">${concluidas.length}</div>
            <div style="font-size:10px;color:#065f46">Concluídas</div>
          </div>
          <div style="background:#f3f4f6;padding:.8rem;border-radius:8px;text-align:center">
            <div style="font-size:22px;font-weight:700;color:#6b7280">${futuras.length}</div>
            <div style="font-size:10px;color:#6b7280">Futuras</div>
          </div>
        </div>
        ${atrasadas.length > 0 ? `
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:.6rem .8rem;margin-bottom:1rem">
            <div style="font-size:11px;font-weight:700;color:#dc2626;margin-bottom:4px">⚠ Tarefas Atrasadas:</div>
            ${atrasadas.map(t => `<div style="font-size:11px;color:#991b1b">• ${t._parentName ? `<strong>${projEsc(t._parentName)}</strong> / ` : ''}${projEsc(t.nome)} (prev: ${projFormatDate(t.dt_fim)})</div>`).join('')}
          </div>
        ` : ''}
        <!-- Tabela de tarefas -->
        <div class="proj-schedule-views" role="group" aria-label="Visualização das atividades">
          <button type="button" class="proj-btn" data-schedule-view="lista" aria-pressed="${scheduleView==='lista'}" onclick="projSetScheduleView('lista')">Cronograma</button>
          <button type="button" class="proj-btn" data-schedule-view="kanban" aria-pressed="${scheduleView==='kanban'}" onclick="projSetScheduleView('kanban')">Kanban</button>
        </div>
        <div id="exec-schedule-kanban" ${scheduleView==='kanban'?'':'hidden'}>${projRenderKanban(p)}</div>
        <div id="exec-schedule-list" ${scheduleView==='lista'?'':'hidden'}>
        ${projProjectResponsibleOptions(p.id)}
        <div class="proj-cron-name-mode-toggle">
          <span class="${cronWrapNames?'':'active'}">Redimensionar Nome</span>
          <label class="proj-switch" title="Quebrar linhas e ajustar altura das tarefas">
            <input type="checkbox" id="proj-cron-wrap-toggle" ${cronWrapNames?'checked':''} ${canScheduleIO?'':'disabled'} onchange="projToggleCronWrapNames()">
            <span></span>
          </label>
          <span class="${cronWrapNames?'active':''}">Quebrar Linhas</span>
        </div>
        <div class="proj-cron-scroll-top" id="proj-cron-scroll-top" style="display:${cronNameWidth && !cronWrapNames ? 'block' : 'none'}" onscroll="projSyncCronScroll(this,'top')"><div id="proj-cron-scroll-top-inner"></div></div>
        <div class="proj-cron-table-wrap ${cronWrapNames?'wrap-names':''}" id="proj-cron-table-wrap" onscroll="projSyncCronScroll(this,'main')">
          <table class="proj-cron-table" id="proj-cron-table" data-base-name-width="${cronNameBaseWidth || ''}" style="${cronNameWidth && !cronWrapNames ? `--proj-cron-name-width:${cronNameWidth}px` : ''}">
            <colgroup>
              <col class="proj-cron-col-drag"><col class="proj-cron-col-num"><col class="proj-cron-col-check"><col class="proj-cron-col-name"><col class="proj-cron-col-ppe"><col class="proj-cron-col-marco"><col class="proj-cron-col-date"><col class="proj-cron-col-date"><col class="proj-cron-col-date"><col class="proj-cron-col-resp"><col class="proj-cron-col-pct"><col class="proj-cron-col-note"><col class="proj-cron-col-sub"><col class="proj-cron-col-del"><col class="proj-cron-col-order">
            </colgroup>
            <thead>
              <tr style="background:#f0f4ff">
                <th style="padding:6px 4px;text-align:center;border-bottom:2px solid #d0d5e3;width:28px"></th>
                <th style="padding:6px 8px;text-align:left;border-bottom:2px solid #d0d5e3;width:70px">Nº</th>
                <th style="padding:6px 4px;text-align:center;border-bottom:2px solid #d0d5e3;width:34px">✓</th>
                <th class="proj-cron-name-th" style="padding:6px 8px;text-align:left;border-bottom:2px solid #d0d5e3">Nome${canScheduleIO ? '<span class="proj-cron-name-resizer" title="Redimensionar coluna Nome" onmousedown="projStartCronNameResize(event)"></span>' : ''}</th>
                <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #d0d5e3;width:68px">PPE</th>
                <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #d0d5e3;width:78px">Marco</th>
                <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #d0d5e3;width:100px">Início</th>
                <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #d0d5e3;width:100px">Fim Prev.</th>
                <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #d0d5e3;width:100px">Entrega</th>
                <th style="padding:6px 8px;text-align:left;border-bottom:2px solid #d0d5e3;width:120px">Responsável</th>
                <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #d0d5e3;width:70px">%</th>
                <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #d0d5e3;width:42px">Anot.</th>
                <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #d0d5e3;width:40px">Sub</th>
                <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #d0d5e3;width:30px"></th>
                <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #d0d5e3;width:56px">Ordem</th>
              </tr>
            </thead>
            <tbody id="exec-tarefas-body">
              ${projRenderTarefasRows(tarefas, 0)}
            </tbody>
          </table>
        </div>
        <div style="margin-top:.6rem;display:flex;gap:8px">
          <button type="button" class="proj-btn primary" style="font-size:11px;padding:5px 12px" onclick="projAddTarefa(null)">+ Tarefa</button>
          ${canScheduleIO ? `
          <button type="button" class="proj-btn" style="font-size:11px;padding:5px 12px" onclick="projExportCronogramaXLSX()">Exportar .xlsx</button>
          <button type="button" class="proj-btn" style="font-size:11px;padding:5px 12px" onclick="projImportCronogramaXLSX()">Importar .xlsx</button>
          <button type="button" class="proj-btn danger" style="font-size:11px;padding:5px 12px" ${todayBackup?'':'disabled title="Nenhum backup do início do dia disponível"'} onclick="projRestaurarCronogramaInicioDia()">Voltar para o início do dia</button>
          ` : ''}
        </div>
        <div style="font-size:10.5px;color:var(--ink3);margin-top:5px">${todayBackup ? `Backup do início do dia salvo em ${projFormatDate(todayBackup.data)}.` : 'O backup do início do dia será criado automaticamente quando houver atividades no cronograma.'}</div>
        </div>
      </div>
    </div>

    <div class="proj-form-section">
      <div class="proj-form-section-title">
        <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><rect x="2" y="8" width="3" height="6" rx="1" fill="currentColor" opacity=".45"/><rect x="6.5" y="5" width="3" height="9" rx="1" fill="currentColor"/><rect x="11" y="2" width="3" height="12" rx="1" fill="currentColor" opacity=".75"/></svg>
        Indicadores
      </div>
      ${projRenderIndicadoresExecucao(p)}
    </div>

    <div class="proj-form-section">
      <div class="proj-form-section-title">
        <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><rect x="1" y="3" width="14" height="12" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M5 1v4M11 1v4M1 7h14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        Reuniões do Projeto
      </div>

      <!-- Adicionar reunião -->
      <div style="background:#f8f9fb;border:1px solid #e5e8ef;border-radius:10px;padding:.9rem;margin-bottom:1rem">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.7rem;flex-wrap:wrap;gap:6px">
          <span style="font-size:11.5px;font-weight:600;color:#3a4560">➕ Adicionar Reunião</span>
          <div style="display:flex;gap:6px">
            <button type="button" class="proj-btn" style="font-size:10.5px;padding:3px 8px" onclick="projAutoAddReunioesMes()">📅 Status Patrocinador (mês atual)</button>
            <button type="button" class="proj-btn" style="font-size:10.5px;padding:3px 8px" onclick="projDeduplicarReunioes()">🧹 Remover duplicadas</button>
          </div>
        </div>
        <div class="proj-g2" style="margin-bottom:.6rem">
          <div class="proj-fg" style="margin:0"><label class="proj-fl">Nome da Reunião<span>*</span></label>
            <input type="text" class="proj-fi" id="reuniao-nome" placeholder="Nome da reunião"></div>
          <div class="proj-fg" style="margin:0"><label class="proj-fl">Data (opcional)</label>
            <input type="date" class="proj-fi" id="reuniao-data"></div>
        </div>
        <div class="proj-g2" style="margin-bottom:.6rem">
          <div class="proj-fg" style="margin:0"><label class="proj-fl">Participantes (opcional)</label>
            <input type="text" class="proj-fi" id="reuniao-participantes" placeholder="Nomes dos participantes"></div>
          <div class="proj-fg" style="margin:0"><label class="proj-fl">Observações (opcional)</label>
            <input type="text" class="proj-fi" id="reuniao-obs" placeholder="Observações ou pauta"></div>
        </div>
        <div style="text-align:right">
          <button type="button" class="proj-btn primary" onclick="projAdicionarReuniao()">Adicionar Reunião</button>
        </div>
      </div>

      <!-- Lista de reuniões -->
      ${reunioes.length > 0 ? `
        <div>
          ${reunioes.map(r => `
            <div class="proj-reunion-item ${r.realizada?'proj-reunion-done':''}" style="display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:10px">
              <div class="proj-reunion-check ${r.realizada?'done':''}" onclick="projToggleReuniaoExec('${r.id}')">
                ${r.realizada ? '<svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M2 6l3 3 5-5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
              </div>
              <div>
                <div class="proj-reunion-text">${projEsc(r.nome)}</div>
                <div style="font-size:11px;color:var(--ink3);margin-top:2px">
                  ${r.data ? projFormatDate(r.data) + ' · ' : ''}
                  ${r.participantes ? '👥 '+projEsc(r.participantes) : ''}
                </div>
                ${r.observacoes ? `<div style="font-size:11px;color:var(--ink3)">📝 ${projEsc(r.observacoes)}</div>` : ''}
              </div>
              <span style="font-size:10px;padding:2px 7px;border-radius:5px;${r.realizada?'background:var(--teal-l);color:var(--teal)':'background:var(--blue-l);color:var(--blue)'}">${r.realizada?'Realizada':'Pendente'}</span>
              <button type="button" class="proj-btn danger" style="font-size:11px;padding:3px 8px" onclick="projExcluirReuniaoExec('${projEsc(r.id)}')">✕</button>
            </div>
          `).join('')}
        </div>
      ` : '<div style="text-align:center;padding:1rem;color:#b0b8cc;font-size:13px">Nenhuma reunião registrada.</div>'}
    </div>
  `;
}

// ── Planner SIGA: helpers ──
function projSyncDerivedTaskDates(tarefas) {
  (tarefas||[]).forEach(t => {
    const subs = t.subtarefas || [];
    if(subs.length) {
      projSyncDerivedTaskDates(subs);
      const starts = subs.map(s => s.dt_inicio).filter(Boolean).sort(projTextCompare);
      const ends = subs.map(s => s.dt_fim).filter(Boolean).sort(projTextCompare);
      t.dt_inicio = starts[0] || '';
      t.dt_fim = ends.length ? ends[ends.length - 1] : '';
    }
  });
  return tarefas || [];
}

function projFlattenTasks(tarefas, depth, parentName, parentPath) {
  let result = [];
  (tarefas||[]).forEach((t, i) => {
    const path = parentPath !== undefined && parentPath !== null && parentPath !== '' ? parentPath+'.'+i : ''+i;
    const copy = Object.assign({}, t, {_depth: depth||0, _children: t.subtarefas||[], _parentName: parentName || '', _path: path});
    result.push(copy);
    if(t.subtarefas && t.subtarefas.length > 0) {
      result = result.concat(projFlattenTasks(t.subtarefas, (depth||0)+1, t.nome || 'Tarefa superior', path));
    }
  });
  return result;
}

function projCalcTaskPct(t) {
  if(t.subtarefas && t.subtarefas.length > 0) {
    const sum = t.subtarefas.reduce((a,s) => a + projCalcTaskPct(s), 0);
    return Math.round(sum / t.subtarefas.length);
  }
  return t.conclusao || 0;
}

function projIsTaskDone(t) {
  const subs = t?.subtarefas || [];
  if(subs.length > 0) return subs.every(projIsTaskDone);
  return !!t?.concluida;
}

function projCalcDerivedPct(tarefas) {
  if(!tarefas || tarefas.length === 0) return 0;
  const sum = tarefas.reduce((a,t) => a + projCalcTaskPct(t), 0);
  return Math.round(sum / tarefas.length);
}

function projRenderTarefasRows(tarefas, depth, parentIdx) {
  if(!tarefas) return '';
  let html = '';
  const canWriteSchedule = projCanWriteSchedule();
  const currentProj = (PROJETOS||[]).find(p => String(p.id) === String(_projCurrentId));
  const wrapNames = currentProj?.execucao?.cron_wrap_names === true;
  tarefas.forEach((t, i) => {
    const path = parentIdx !== undefined && parentIdx !== null ? parentIdx+'.'+i : ''+i;
    const hasSubs = t.subtarefas && t.subtarefas.length > 0;
    const pct = hasSubs ? projCalcTaskPct(t) : (t.conclusao||0);
    const indent = depth * 20;
    const bold = hasSubs ? 'font-weight:700' : '';
    const done = projIsTaskDone(t);
    const strike = done ? 'text-decoration:line-through;color:#9ca3af' : '';
    const today = new Date().toISOString().slice(0,10);
    const overdue = !done && t.dt_fim && t.dt_fim < today;
    let rowBg = '';
    if(overdue) rowBg = 'background:#fef2f2';
    else if(done) rowBg = 'background:#f0fdf4';
    const hasNotes = Array.isArray(t.anotacoes) && t.anotacoes.length > 0;
    const canDrag = canWriteSchedule && !hasSubs && parentIdx !== undefined && parentIdx !== null;
    const canMoveUp = i > 0;
    const canMoveDown = i < tarefas.length - 1;
    html += `<tr style="${rowBg}">
      <td style="padding:5px 4px;text-align:center;border-bottom:1px solid #eaecf3">
        ${canDrag ? `<button type="button" class="proj-task-drag-handle" draggable="true" title="Arrastar para reordenar no mesmo bloco" ondragstart="projTaskDragStart(event,'${path}')" ondragover="projTaskDragOver(event,'${path}')" ondrop="projTaskDrop(event,'${path}')" ondragend="projTaskDragEnd(event)">⋮⋮</button>` : ''}
      </td>
      <td style="padding:5px 8px;border-bottom:1px solid #eaecf3;${strike};font-family:'DM Mono',monospace;font-size:11px;white-space:nowrap">${path.split('.').map(n=>Number.parseInt(n,10)+1).join('.')}.</td>
      <td style="padding:5px 4px;text-align:center;border-bottom:1px solid #eaecf3">
        ${!hasSubs ? `<button type="button" class="proj-task-eye-toggle${t.concluida?' done':''}" aria-pressed="${t.concluida?'true':'false'}" aria-label="${t.concluida?'Marcar como pendente':'Marcar como concluída'}" onclick="projToggleTarefa('${path}')">
          <svg viewBox="0 0 40 40">
            <path class="proj-task-eye-outline" d="M4 20C8 12 14 8 20 8s12 4 16 12c-4 8-10 12-16 12S8 28 4 20Z"/>
            <circle class="proj-task-eye-pupil" cx="20" cy="20" r="7"/>
            <circle class="proj-task-eye-highlight" cx="23" cy="17" r="2.1"/>
          </svg>
        </button>` : ''}
      </td>
      <td style="padding:5px 8px;border-bottom:1px solid #eaecf3;padding-left:${8+indent}px;${bold};${strike}">
        ${wrapNames ? `<textarea class="proj-task-name-input proj-task-name-textarea" rows="1" placeholder="Nova tarefa" aria-label="Nome da tarefa" oninput="projAutoResizeCronTaskName(this)" onchange="projUpdateTarefa('${path}','nome',this.value.trim()||'Nova tarefa')">${projEsc(t.nome||'Nova tarefa')}</textarea>` : `<input type="text" class="proj-task-name-input" value="${projEsc(t.nome||'Nova tarefa')}" placeholder="Nova tarefa" aria-label="Nome da tarefa" onchange="projUpdateTarefa('${path}','nome',this.value.trim()||'Nova tarefa')" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">`}
      </td>
      <td style="padding:5px 8px;text-align:center;border-bottom:1px solid #eaecf3">
        <button type="button" class="proj-task-flag ppe ${t.ppe?'on':''}" onclick="projToggleTarefaFlag('${path}','ppe')">PPE</button>
      </td>
      <td style="padding:5px 8px;text-align:center;border-bottom:1px solid #eaecf3">
        <button type="button" class="proj-task-flag marco ${t.marco?'on':''}" onclick="projToggleTarefaFlag('${path}','marco')">Marco</button>
      </td>
      <td style="padding:5px 8px;text-align:center;border-bottom:1px solid #eaecf3;${strike}"><input type="date" value="${t.dt_inicio||''}" ${hasSubs?'disabled data-derived-disabled="1" title="Data derivada das subtarefas"':''} onchange="projUpdateTarefa('${path}','dt_inicio',this.value)" style="font-size:11px;border:1px solid #ddd;border-radius:4px;padding:2px 4px;width:100%;${hasSubs?'background:#f3f4f6;color:#64748b':''}"></td>
      <td style="padding:5px 8px;text-align:center;border-bottom:1px solid #eaecf3;${strike}${overdue?';color:#dc2626;font-weight:600':''}"><input type="date" value="${t.dt_fim||''}" ${hasSubs?'disabled data-derived-disabled="1" title="Data derivada das subtarefas"':''} onchange="projUpdateTarefa('${path}','dt_fim',this.value)" style="font-size:11px;border:1px solid ${overdue?'#fca5a5':'#ddd'};border-radius:4px;padding:2px 4px;width:100%;${hasSubs?'background:#f3f4f6;color:#64748b':''}"></td>
      <td style="padding:5px 8px;text-align:center;border-bottom:1px solid #eaecf3;font-size:11px">${projFormatDate(t.dt_entrega) || '—'}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #eaecf3;${strike}"><input type="text" list="proj-responsaveis-options" value="${projEsc(t.responsavel||'')}" onchange="projUpdateTarefaResponsavel('${path}',this.value)" style="font-size:11px;border:1px solid #ddd;border-radius:4px;padding:2px 4px;width:100%" placeholder="Usuário ou área"></td>
      <td style="padding:5px 8px;text-align:center;border-bottom:1px solid #eaecf3;${strike}">
        ${hasSubs ? `<span style="font-size:11px;font-weight:600;color:var(--blue)">${pct}%</span>` :
          `<input type="number" min="0" max="100" value="${pct}" onchange="projUpdateTarefa('${path}','conclusao',Number.parseInt(this.value,10)||0)" style="font-size:11px;border:1px solid #ddd;border-radius:4px;padding:2px 4px;width:50px;text-align:center">`}
      </td>
      <td style="padding:5px 4px;text-align:center;border-bottom:1px solid #eaecf3">
        <button type="button" class="proj-task-note-btn ${hasNotes?'on':''}" title="Anotações" onclick="projOpenTaskNotes('${path}')">✎</button>
      </td>
      <td style="padding:5px 4px;text-align:center;border-bottom:1px solid #eaecf3">
        <button type="button" title="Adicionar subtarefa" style="background:none;border:none;cursor:pointer;font-size:13px;padding:0" onclick="projAddTarefa('${path}')">＋</button>
      </td>
      <td style="padding:5px 4px;text-align:center;border-bottom:1px solid #eaecf3">
        <button type="button" title="Excluir" style="background:none;border:none;cursor:pointer;font-size:13px;color:#dc2626;padding:0" onclick="projRemoveTarefa('${path}')">✕</button>
      </td>
      <td style="padding:5px 4px;text-align:center;border-bottom:1px solid #eaecf3">
        ${canWriteSchedule && hasSubs ? `<div class="proj-task-order-controls">
          <button type="button" title="Mover para cima" ${canMoveUp?'':'disabled'} onclick="projMoveTaskByButton('${path}',-1)">↑</button>
          <button type="button" title="Mover para baixo" ${canMoveDown?'':'disabled'} onclick="projMoveTaskByButton('${path}',1)">↓</button>
        </div>` : ''}
      </td>
    </tr>`;
    if(hasSubs) {
      html += projRenderTarefasRows(t.subtarefas, depth+1, path);
    }
  });
  return html;
}

// ── Planner SIGA: CRUD ──
function projScheduleBackupForDate(proj, dateKey = projLocalDateKey()){
  const backups = proj?.execucao?.cron_backups;
  if(!backups || typeof backups !== 'object' || Array.isArray(backups)) return null;
  return backups[dateKey] || null;
}

function projGetTarefaByPath(tarefas, path) {
  const parts = path.split('.').map(Number);
  let list = tarefas;
  for(let i=0;i<parts.length-1;i++){
    if(!list[parts[i]]) return null;
    list = list[parts[i]].subtarefas || [];
  }
  return {list, index: parts[parts.length-1]};
}

let _projTaskDragPath = '';

function projTaskParentPath(path) {
  const text = String(path || '');
  const idx = text.lastIndexOf('.');
  return idx === -1 ? '' : text.slice(0, idx);
}

function projTaskIndexFromPath(path) {
  const idx = Number.parseInt(String(path || '').split('.').pop(), 10);
  return Number.isFinite(idx) ? idx : -1;
}

function projRefreshScheduleAfterMutation(proj) {
  projSyncDerivedTaskDates(proj.execucao.tarefas);
  if(proj.execucao.pct_mode === 'derivado') {
    proj.percentual = projCalcDerivedPct(proj.execucao.tarefas);
    proj.execucao.percentual = proj.percentual;
  }
  projSave();
  projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
}

function projMoveTaskToIndex(path, targetIndex) {
  return projWithScheduleWrite(() => {
    projLoad();
    const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
    if(!proj || !proj.execucao || !proj.execucao.tarefas) return;
    const ref = projGetTarefaByPath(proj.execucao.tarefas, path);
    if(!ref || !ref.list || !ref.list[ref.index]) return;
    const boundedTarget = Math.max(0, Math.min(targetIndex, ref.list.length - 1));
    if(ref.index === boundedTarget) return;
    projEnsureCurrentScheduleBackupBeforeMutation(proj);
    const [task] = ref.list.splice(ref.index, 1);
    ref.list.splice(boundedTarget, 0, task);
    projRefreshScheduleAfterMutation(proj);
  });
}

function projMoveTaskByButton(path, direction) {
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(!proj || !proj.execucao || !proj.execucao.tarefas) return;
  const ref = projGetTarefaByPath(proj.execucao.tarefas, path);
  const task = ref && ref.list ? ref.list[ref.index] : null;
  if(!task || !(task.subtarefas || []).length) return;
  projMoveTaskToIndex(path, ref.index + direction);
}

function projTaskDragStart(event, path) {
  _projTaskDragPath = String(path || '');
  if(event?.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', _projTaskDragPath);
  }
}

function projTaskDragOver(event, path) {
  const fromPath = _projTaskDragPath || event?.dataTransfer?.getData('text/plain') || '';
  if(fromPath && projTaskParentPath(fromPath) === projTaskParentPath(path)) {
    event.preventDefault();
    if(event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }
}

function projTaskDrop(event, targetPath) {
  event.preventDefault();
  const fromPath = _projTaskDragPath || event?.dataTransfer?.getData('text/plain') || '';
  _projTaskDragPath = '';
  if(!fromPath || fromPath === targetPath) return;
  if(projTaskParentPath(fromPath) !== projTaskParentPath(targetPath)) {
    projToast('Reordene tarefas apenas dentro do mesmo bloco.', '#d97706');
    return;
  }
  const fromIndex = projTaskIndexFromPath(fromPath);
  const targetIndex = projTaskIndexFromPath(targetPath);
  if(fromIndex < 0 || targetIndex < 0) return;
  projMoveTaskToIndex(fromPath, targetIndex);
}

function projTaskDragEnd() {
  _projTaskDragPath = '';
}

function projFormatBrasiliaDateTime(value) {
  if(!value) return '';
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

function projCloseTaskNotes() {
  const el = document.getElementById('proj-task-notes-modal');
  if(el) el.remove();
}

function projCurrentUserForNote() {
  const user = typeof usuarioLogado !== 'undefined' ? usuarioLogado : null;
  return {
    name: projUserDisplayName(user) || String(user?.email || 'Usuário'),
    email: String(user?.email || '').trim().toLowerCase()
  };
}

function projCanDeleteTaskNote(note) {
  const currentUser = projCurrentUserForNote();
  const noteEmail = String(note?.autor_email || '').trim().toLowerCase();
  if(noteEmail && currentUser.email) return noteEmail === currentUser.email;
  const currentName = projNormKey(currentUser.name);
  const noteName = projNormKey(note?.autor_nome);
  return Boolean(noteName && currentName && currentName !== 'usuário' && noteName === currentName);
}

function projOpenTaskNotes(path,showDetails=false) {
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  const ref = proj && proj.execucao ? projGetTarefaByPath(proj.execucao.tarefas || [], path) : null;
  const task = ref && ref.list ? ref.list[ref.index] : null;
  if(!task) return;
  projCloseTaskNotes();
  const notes = Array.isArray(task.anotacoes) ? task.anotacoes : [];
  const canWriteSchedule = projCanWriteSchedule(proj.id);
  const modal = document.createElement('div');
  modal.id = 'proj-task-notes-modal';
  modal.className = 'proj-task-notes-backdrop';
  projSetHtml(modal, `
    <div class="proj-task-notes-card" role="dialog" aria-modal="true" aria-labelledby="proj-task-notes-title">
      <div class="proj-task-notes-head">
        <div>
          <div id="proj-task-notes-title" class="proj-task-notes-title">${showDetails?'Detalhes da atividade':'Anotações'}</div>
          <div class="proj-task-notes-subtitle">${projEsc(task.nome || 'Tarefa')}</div>
        </div>
        <button type="button" class="proj-task-notes-close" onclick="projCloseTaskNotes()" aria-label="Fechar">×</button>
      </div>
      ${showDetails ? `<div class="proj-kanban-task-details">
        <div><strong>Situação:</strong> ${task.concluida || Number(task.conclusao)>=100?'Concluída':Number(task.conclusao)>0?'Em andamento':'Pendente'}</div>
        <div><strong>Responsável:</strong> ${projEsc(task.responsavel || 'Não informado')}</div>
        <div><strong>Início:</strong> ${projFormatDate(task.dt_inicio) || '—'}</div>
        <div><strong>Fim previsto:</strong> ${projFormatDate(task.dt_fim) || '—'}</div>
        <div><strong>Entrega:</strong> ${projFormatDate(task.dt_entrega) || '—'}</div>
        <div><strong>Conclusão:</strong> ${task.concluida?100:Math.max(0,Math.min(100,Number(task.conclusao)||0))}%</div>
        <div><strong>Marco:</strong> ${task.marco?'Sim':'Não'} · <strong>PPE:</strong> ${task.ppe?'Sim':'Não'}</div>
      </div><h3 style="font-size:13px;margin:12px 0">Anotações</h3>` : ''}
      <div class="proj-task-notes-list">
        ${notes.length ? notes.map(n => `
          <article class="proj-task-note-item">
            <div class="proj-task-note-head">
              <div class="proj-task-note-meta">${projEsc(n.autor_nome || 'Usuário')} · ${projEsc(projFormatBrasiliaDateTime(n.criado_em))} BRT</div>
              ${canWriteSchedule && projCanDeleteTaskNote(n) ? `<button type="button" class="proj-task-note-delete" title="Excluir anotação" onclick="projDeleteTaskNote('${path}','${projEsc(n.id || '')}')">Excluir</button>` : ''}
            </div>
            <div class="proj-task-note-text">${projEsc(n.texto || '')}</div>
          </article>
        `).join('') : '<div class="proj-task-notes-empty">Nenhuma anotação publicada.</div>'}
      </div>
      ${canWriteSchedule ? `<textarea id="proj-task-note-text" class="proj-fi proj-task-note-textarea" placeholder="Escreva uma anotação sobre esta tarefa"></textarea>` : '<div class="proj-task-notes-empty">Você pode visualizar as anotações, mas não editar o cronograma deste projeto.</div>'}
      <div class="proj-task-notes-actions">
        <button type="button" class="proj-btn" onclick="projCloseTaskNotes()">Cancelar</button>
        ${canWriteSchedule ? `<button type="button" class="proj-btn primary" onclick="projPublishTaskNote('${path}')">Publicar</button>` : ''}
      </div>
    </div>
  `);
  modal.addEventListener('click', ev => {
    if(ev.target === modal) projCloseTaskNotes();
  });
  document.body.appendChild(modal);
  const input = document.getElementById('proj-task-note-text');
  if(input) input.focus();
}

function projPublishTaskNote(path) {
  const input = document.getElementById('proj-task-note-text');
  const text = String(input?.value || '').trim();
  if(!text) {
    projToast('Escreva uma anotação antes de publicar.', '#d97706');
    return;
  }
  return projWithScheduleWrite(() => {
    projLoad();
    const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
    if(!proj || !proj.execucao || !proj.execucao.tarefas) return;
    const ref = projGetTarefaByPath(proj.execucao.tarefas, path);
    const task = ref && ref.list ? ref.list[ref.index] : null;
    if(!task) return;
    projEnsureCurrentScheduleBackupBeforeMutation(proj);
    const currentUser = projCurrentUserForNote();
    if(!Array.isArray(task.anotacoes)) task.anotacoes = [];
    task.anotacoes.push({
      id: `note-${Date.now()}`,
      texto: text,
      autor_nome: currentUser.name,
      autor_email: currentUser.email,
      criado_em: new Date().toISOString()
    });
    projSave();
    projCloseTaskNotes();
    projToast('Anotação publicada.', 'var(--teal)');
    projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
  });
}

function projDeleteTaskNote(path, noteId) {
  return projWithScheduleWrite(() => {
    projLoad();
    const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
    if(!proj || !proj.execucao || !proj.execucao.tarefas) return;
    const ref = projGetTarefaByPath(proj.execucao.tarefas, path);
    const task = ref && ref.list ? ref.list[ref.index] : null;
    if(!task || !Array.isArray(task.anotacoes)) return;
    const index = task.anotacoes.findIndex(n => String(n.id || '') === String(noteId || ''));
    const note = index >= 0 ? task.anotacoes[index] : null;
    if(!note || !projCanDeleteTaskNote(note)) {
      projToast('Você só pode excluir suas próprias anotações.', '#d97706');
      return;
    }
    projEnsureCurrentScheduleBackupBeforeMutation(proj);
    task.anotacoes.splice(index, 1);
    projSave();
    projToast('Anotação excluída.', 'var(--teal)');
    projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
    projOpenTaskNotes(path);
  });
}

function projAddTarefa(parentPath) {
  return projWithScheduleWrite(() => {
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  if(!proj.execucao) proj.execucao = {planner_link:'',percentual:0,reunioes:[],tarefas:[]};
  if(!proj.execucao.tarefas) proj.execucao.tarefas = [];
  projEnsureCurrentScheduleBackupBeforeMutation(proj);
  const nova = {id:'t'+Date.now(), nome:'Nova tarefa', ppe:false, marco:false, dt_inicio:'', dt_fim:'', responsavel:'', conclusao:0, concluida:false, subtarefas:[]};
  if(parentPath === null || parentPath === undefined) {
    proj.execucao.tarefas.push(nova);
  } else {
    const ref = projGetTarefaByPath(proj.execucao.tarefas, parentPath);
    if(ref && ref.list[ref.index]) {
      if(!ref.list[ref.index].subtarefas) ref.list[ref.index].subtarefas = [];
      ref.list[ref.index].subtarefas.push(nova);
    }
  }
  projSyncDerivedTaskDates(proj.execucao.tarefas);
  projSave();
  projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
  });
}

function projRemoveTarefa(path) {
  if(!projEnsureWriteSchedule()) return;
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(!proj || !proj.execucao || !proj.execucao.tarefas) return;
  projEnsureCurrentScheduleBackupBeforeMutation(proj);
  const ref = projGetTarefaByPath(proj.execucao.tarefas, path);
  const task = ref && ref.list ? ref.list[ref.index] : null;
  const subCount = task ? projScheduleTasksCount(task.subtarefas || []) : 0;
  if(task && subCount > 0) {
    projConfirmar(`Excluir a tarefa "${task.nome || 'Tarefa'}" e ${subCount} subtarefa(s)?\n\nEsta tarefa calcula automaticamente início, fim e percentual a partir das subtarefas. A exclusão removerá tudo que está abaixo dela.`, () => projRemoveTarefaConfirmada(path));
    return;
  }
  return projRemoveTarefaConfirmada(path);
}

function projRemoveTarefaConfirmada(path) {
  return projWithScheduleWrite(() => {
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(!proj || !proj.execucao || !proj.execucao.tarefas) return;
  projEnsureCurrentScheduleBackupBeforeMutation(proj);
  const ref = projGetTarefaByPath(proj.execucao.tarefas, path);
  if(ref) ref.list.splice(ref.index, 1);
  projSyncDerivedTaskDates(proj.execucao.tarefas);
  projSave();
  projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
  });
}

function projRestaurarCronogramaInicioDia() {
  if(!projEnsureWriteSchedule()) return;
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  const backup = projScheduleBackupForDate(proj);
  if(!proj || !backup) {
    projToast('Nenhum backup do início do dia disponível para este projeto.', '#d97706');
    return;
  }
  const total = projScheduleTasksCount(backup.tarefas || []);
  projConfirmar(`Voltar o cronograma de "${proj.nome || 'Projeto'}" para o início do dia?\n\nIsso substituirá as tarefas atuais pelas ${total} tarefa(s) salvas no backup de ${projFormatDate(backup.data)}.`, () => {
    projWithScheduleWrite(() => {
      projLoad();
      const p = PROJETOS.find(x => String(x.id) === _projCurrentId);
      const b = projScheduleBackupForDate(p);
      if(!p || !b) {
        projToast('Backup do início do dia não encontrado.', '#dc2626');
        return;
      }
      if(!p.execucao) p.execucao = {planner_link:'',percentual:0,reunioes:[],tarefas:[]};
      p.execucao.tarefas = projCloneScheduleTasks(b.tarefas || []);
      projSyncDerivedTaskDates(p.execucao.tarefas);
      if(p.execucao.pct_mode === 'derivado') {
        p.percentual = projCalcDerivedPct(p.execucao.tarefas);
        p.execucao.percentual = p.percentual;
      }
      projSave();
      projToast('Cronograma restaurado para o início do dia.', 'var(--teal)');
      projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
    });
  });
}

function projUpdateTarefa(path, field, value) {
  return projWithScheduleWrite(() => {
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(!proj || !proj.execucao || !proj.execucao.tarefas) return;
  projEnsureCurrentScheduleBackupBeforeMutation(proj);
  const ref = projGetTarefaByPath(proj.execucao.tarefas, path);
  if(ref && ref.list[ref.index]) {
    ref.list[ref.index][field] = value;
    if(field === 'conclusao'){
      ref.list[ref.index].concluida = value >= 100;
      ref.list[ref.index].dt_entrega = value >= 100 ? (ref.list[ref.index].dt_entrega || projTaskCompletionDate()) : '';
    }
  }
  projSyncDerivedTaskDates(proj.execucao.tarefas);
  // Update derived pct
  if(proj.execucao.pct_mode === 'derivado') {
    proj.percentual = projCalcDerivedPct(proj.execucao.tarefas);
    proj.execucao.percentual = proj.percentual;
  }
  projSave();
  projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
  });
}

function projUpdateTarefaResponsavel(path, rawValue) {
  return projWithScheduleWrite(() => {
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(!proj || !proj.execucao || !proj.execucao.tarefas) return;
  projEnsureCurrentScheduleBackupBeforeMutation(proj);
  const ref = projGetTarefaByPath(proj.execucao.tarefas, path);
  if(ref && ref.list[ref.index]) {
    const value = String(rawValue||'').trim();
    const user = projFindProjectUserByResponsibleValue(proj.id, value);
    ref.list[ref.index].responsavel = user ? projUserDisplayName(user) : value;
    if(user && user.email) ref.list[ref.index].responsavel_email = String(user.email).trim().toLowerCase();
    else delete ref.list[ref.index].responsavel_email;
  }
  projSyncDerivedTaskDates(proj.execucao.tarefas);
  projSave();
  projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
  });
}

function projToggleTarefaFlag(path, field) {
  return projWithScheduleWrite(() => {
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(!proj || !proj.execucao || !proj.execucao.tarefas) return;
  projEnsureCurrentScheduleBackupBeforeMutation(proj);
  const ref = projGetTarefaByPath(proj.execucao.tarefas, path);
  if(ref && ref.list[ref.index]) {
    ref.list[ref.index][field] = !ref.list[ref.index][field];
  }
  projSyncDerivedTaskDates(proj.execucao.tarefas);
  projSave();
  projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
  });
}

function projTaskCompletionDate(){
  return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}

function projToggleTarefa(path,completeOnly=false) {
  return projWithScheduleWrite(() => {
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(!proj || !proj.execucao || !proj.execucao.tarefas) return;
  projEnsureCurrentScheduleBackupBeforeMutation(proj);
  const ref = projGetTarefaByPath(proj.execucao.tarefas, path);
  if(ref && ref.list[ref.index]) {
    if(completeOnly && projIsTaskDone(ref.list[ref.index])) return;
    ref.list[ref.index].concluida = completeOnly || !ref.list[ref.index].concluida;
    ref.list[ref.index].conclusao = ref.list[ref.index].concluida ? 100 : 0;
    ref.list[ref.index].dt_entrega = ref.list[ref.index].concluida ? projTaskCompletionDate() : '';
  }
  projSyncDerivedTaskDates(proj.execucao.tarefas);
  if(proj.execucao.pct_mode === 'derivado') {
    proj.percentual = projCalcDerivedPct(proj.execucao.tarefas);
    proj.execucao.percentual = proj.percentual;
  }
  projSave();
  projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
  });
}

function projCronSetTopScrollbarVisible(visible) {
  const top = document.getElementById('proj-cron-scroll-top');
  if(top) top.style.display = visible ? 'block' : 'none';
}


function projAutoResizeCronTaskName(el) {
  if(!el) return;
  el.style.height = 'auto';
  el.style.height = Math.max(32, el.scrollHeight + 2) + 'px';
}

function projInitCronTaskNameTextareas() {
  document.querySelectorAll('.proj-task-name-textarea').forEach(projAutoResizeCronTaskName);
}

function projInitCronNameColumn() {
  const table = document.getElementById('proj-cron-table');
  const wrap = document.getElementById('proj-cron-table-wrap');
  const top = document.getElementById('proj-cron-scroll-top');
  const topInner = document.getElementById('proj-cron-scroll-top-inner');
  if(!table || !wrap) return;
  const explicit = Number.parseInt(table.style.getPropertyValue('--proj-cron-name-width'), 10) || 0;
  if(!explicit && !table.classList.contains('wrap-names')) {
    const cell = table.querySelector('.proj-cron-name-th');
    const currentWidth = Math.round(cell?.getBoundingClientRect().width || 0);
    if(currentWidth > 0) {
      table.style.setProperty('--proj-cron-name-width', currentWidth + 'px');
      if(!table.dataset.baseNameWidth) table.dataset.baseNameWidth = String(currentWidth);
    }
  }
  if(topInner) topInner.style.width = table.scrollWidth + 'px';
  const nameWidth = Number.parseInt(table.style.getPropertyValue('--proj-cron-name-width'), 10) || 0;
  const baseWidth = Number.parseInt(table.dataset.baseNameWidth, 10) || nameWidth;
  projCronSetTopScrollbarVisible(!wrap.classList.contains('wrap-names') && nameWidth > baseWidth && table.scrollWidth > wrap.clientWidth);
}

function projSyncCronScroll(source, mode) {
  const wrap = document.getElementById('proj-cron-table-wrap');
  const top = document.getElementById('proj-cron-scroll-top');
  if(!wrap || !top) return;
  if(mode === 'top' && wrap.scrollLeft !== source.scrollLeft) wrap.scrollLeft = source.scrollLeft;
  if(mode === 'main' && top.scrollLeft !== source.scrollLeft) top.scrollLeft = source.scrollLeft;
}

function projPersistCronNamePreferences(values) {
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  if(!proj.execucao) proj.execucao = {planner_link:'',percentual:0,reunioes:[],tarefas:[]};
  Object.assign(proj.execucao, values || {});
  projWithScheduleWrite(() => projSave());
}

function projStartCronNameResize(event) {
  event.preventDefault();
  const table = document.getElementById('proj-cron-table');
  const wrap = document.getElementById('proj-cron-table-wrap');
  if(!table || !wrap || wrap.classList.contains('wrap-names')) return;
  const startX = event.clientX;
  const startWidth = Number.parseInt(table.style.getPropertyValue('--proj-cron-name-width'), 10)
    || Math.round(table.querySelector('.proj-cron-name-th')?.getBoundingClientRect().width || 0);
  const baseWidth = Number.parseInt(table.dataset.baseNameWidth, 10) || startWidth;
  const minWidth = baseWidth;
  const maxWidth = Math.round(baseWidth * PROJ_CRON_NAME_WIDTH_MAX_FACTOR);
  const move = ev => {
    const nextWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + ev.clientX - startX));
    table.style.setProperty('--proj-cron-name-width', Math.round(nextWidth) + 'px');
    projInitCronNameColumn();
  };
  const up = () => {
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
    const finalWidth = Number.parseInt(table.style.getPropertyValue('--proj-cron-name-width'), 10) || startWidth;
    projPersistCronNamePreferences({cron_nome_col_width: finalWidth, cron_nome_col_saved_width: finalWidth, cron_nome_col_base_width: baseWidth});
  };
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
}

function projToggleCronWrapNames() {
  return projWithScheduleWrite(() => {
    projLoad();
    const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
    if(!proj) return;
    if(!proj.execucao) proj.execucao = {planner_link:'',percentual:0,reunioes:[],tarefas:[]};
    const enabled = !!document.getElementById('proj-cron-wrap-toggle')?.checked;
    proj.execucao.cron_wrap_names = enabled;
    if(enabled) {
      if(proj.execucao.cron_nome_col_width) proj.execucao.cron_nome_col_saved_width = proj.execucao.cron_nome_col_width;
      delete proj.execucao.cron_nome_col_width;
    } else if(proj.execucao.cron_nome_col_saved_width) {
      proj.execucao.cron_nome_col_width = proj.execucao.cron_nome_col_saved_width;
    }
    projSave();
    projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
  });
}

// ── Toggle cron mode / pct mode ──
function projToggleCronMode() {
  return projWithScheduleWrite(() => {
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  if(!proj.execucao) proj.execucao = {planner_link:'',percentual:0,reunioes:[],tarefas:[]};
  const toggle = document.getElementById('exec-cron-toggle');
  proj.execucao.cron_mode = toggle && toggle.checked ? 'siga' : 'planner';
  projSave();
  projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
  });
}

function projTogglePctMode() {
  return projWithScheduleWrite(() => {
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  if(!proj.execucao) proj.execucao = {planner_link:'',percentual:0,reunioes:[],tarefas:[]};
  const toggle = document.getElementById('exec-pct-mode-toggle');
  proj.execucao.pct_mode = toggle && toggle.checked ? 'derivado' : 'manual';
  if(proj.execucao.pct_mode === 'derivado') {
    proj.percentual = projCalcDerivedPct(proj.execucao.tarefas||[]);
    proj.execucao.percentual = proj.percentual;
  }
  projSave();
  projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
  });
}

function projSalvarExecucao() {
  const canFullExec = projCanWriteExec();
  const canSchedule = projCanWriteSchedule();
  if(!canFullExec && !canSchedule){
    projEnsureWriteSchedule();
    return;
  }
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  if(!proj.execucao) proj.execucao = { planner_link:'', percentual:0, reunioes:[], tarefas:[], cron_mode:'planner', pct_mode:'manual' };
  proj.execucao.planner_link = document.getElementById('exec-planner')?.value || proj.execucao.planner_link || '';
  if(canFullExec && proj.execucao.pct_mode !== 'derivado') {
    proj.percentual = Number.parseInt(document.getElementById('exec-percentual')?.value, 10)||0;
  } else if(proj.execucao.pct_mode === 'derivado') {
    proj.percentual = projCalcDerivedPct(proj.execucao.tarefas||[]);
  }
  proj.execucao.percentual = proj.percentual;
  if(canFullExec) projSave();
  else projWithScheduleWrite(() => projSave());
  projToast('Execução salva!');
}

function projAdicionarReuniao() {
  if(!projEnsureWriteAll('Apenas EPP pode criar reuniões.')) return;
  const nome = document.getElementById('reuniao-nome')?.value.trim();
  if(!nome) { projToast('Informe o nome da reunião.', '#d97706'); return; }
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  if(!proj.execucao) proj.execucao = { planner_link:'', percentual:0, reunioes:[] };
  if(!proj.execucao.reunioes) proj.execucao.reunioes = [];
  proj.execucao.reunioes.push({
    id: 'r' + Date.now(),
    nome,
    data: document.getElementById('reuniao-data')?.value||'',
    participantes: document.getElementById('reuniao-participantes')?.value.trim()||'',
    observacoes: document.getElementById('reuniao-obs')?.value.trim()||'',
    realizada: false
  });
  projSave();
  projToast('Reunião adicionada!');
  projAtualizarBadgeReunioes();
  // Re-render tab
  projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
}

function projToggleReuniaoExec(reuniaoId) {
  if(!projEnsureWriteAll('Apenas EPP pode alterar reuniões.')) return;
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  const r = (proj.execucao?.reunioes||[]).find(r => String(r.id) === String(reuniaoId));
  if(r) {
    r.realizada = !r.realizada;
    projSave();
    projAtualizarBadgeReunioes();
    projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
  }
}

function projExcluirReuniaoExec(reuniaoId) {
  if(!projEnsureWriteAll('Apenas EPP pode excluir reuniões.')) return;
  projConfirmar('Excluir esta reunião?', () => {
    projLoad();
    const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
    if(!proj) return;
    proj.execucao.reunioes = (proj.execucao.reunioes||[]).filter(r => String(r.id) !== String(reuniaoId));
    projSave();
    projToast('Reunião excluída.');
    projAtualizarBadgeReunioes();
    projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
  });
}

function projAutoAddReunioesMes(){if(!projEnsureWriteAll('Apenas EPP pode criar reuniões automáticas.'))return;projLoad();let proj=PROJETOS.find(function(p){return String(p.id)===_projCurrentId;});if(!proj)return;if(!proj.execucao)proj.execucao={planner_link:'',percentual:0,reunioes:[]};if(!proj.execucao.reunioes)proj.execucao.reunioes=[];let now=new Date();let dataStatus=projMonthFirstDay(now);let mn=projMonthLabel(projMonthValue(now));let nome='Reunião de Status Patrocinador - '+mn;let ja=proj.execucao.reunioes.some(function(r){return r.nome===nome||(r.auto&&r.data===dataStatus);});if(ja){projToast('Reunião deste mês já existe.','#d97706');return;}proj.execucao.reunioes.push({id:'r'+Date.now(),nome:nome,data:dataStatus,participantes:'',observacoes:'Reunião mensal de acompanhamento com o patrocinador',realizada:false,auto:true});projSave();projToast('Reunião de Status adicionada!');projAtualizarBadgeReunioes();projDetalheTab('execucao',document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));}
function projDeduplicarReunioes(){if(!projEnsureWriteAll('Apenas EPP pode alterar reuniões.'))return;projLoad();let proj=PROJETOS.find(function(p){return String(p.id)===_projCurrentId;});if(!proj||!proj.execucao||!proj.execucao.reunioes)return;let seen={};let orig=proj.execucao.reunioes.length;proj.execucao.reunioes=proj.execucao.reunioes.filter(function(r){let k=r.nome+'|'+(r.data||'');if(seen[k])return false;seen[k]=true;return true;});let rem=orig-proj.execucao.reunioes.length;projSave();if(rem>0){projToast(rem+' duplicada(s) removida(s).');projDetalheTab('execucao',document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));}else{projToast('Nenhuma duplicata encontrada.');}}

// ── ABA: CONCLUSÃO ───────────────────────────────────────────────
let _tipoConclusaoSelecionado = '';
function projSelecionarTipoConclusao(tipo) {
  _tipoConclusaoSelecionado = tipo;
  document.querySelectorAll('.proj-conclusao-card').forEach(c => {
    c.classList.remove('selected-success','selected-cancel');
  });
  const cards = document.querySelectorAll('.proj-conclusao-card');
  if(tipo === 'sucesso' && cards[0]) cards[0].classList.add('selected-success');
  if(tipo === 'cancelamento' && cards[1]) cards[1].classList.add('selected-cancel');
}

function projSalvarConclusao() {
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  if(!proj.conclusao) proj.conclusao = {};
  proj.conclusao.tipo = _tipoConclusaoSelecionado || proj.conclusao.tipo || '';
  proj.conclusao.dt_conclusao = document.getElementById('conc-data')?.value||'';
  proj.conclusao.link_termo_aceite = document.getElementById('conc-termo')?.value||'';
  proj.conclusao.historia = document.getElementById('conc-historia')?.value||'';
  proj.conclusao.links_noticias = document.getElementById('conc-links')?.value||'';
  const imagensUrlsEl = document.getElementById('conc-imagens-urls');
  if(imagensUrlsEl) proj.conclusao.imagens = projConclusaoUrlsToImagens(imagensUrlsEl.value);
  proj.conclusao.licoes_data = document.getElementById('conc-lic-data')?.value||'';
  proj.conclusao.licoes_participantes = document.getElementById('conc-lic-part')?.value||'';
  proj.conclusao.licoes_certo = document.getElementById('conc-lic-certo')?.value||'';
  proj.conclusao.licoes_melhorar = document.getElementById('conc-lic-melhorar')?.value||'';
  proj.conclusao.licoes_ideias = document.getElementById('conc-lic-ideias')?.value||'';
  projSave();
  projToast('Conclusão salva!');
}

function projFinalizarProjeto() {
  const tipo = _tipoConclusaoSelecionado;
  if(!tipo) { projToast('Selecione o tipo de conclusão.', '#d97706'); return; }
  const msg = tipo === 'sucesso'
    ? 'Encerrar o projeto como CONCLUÍDO COM SUCESSO?\n\nEsta ação mudará o status do projeto para Concluído.'
    : 'Encerrar o projeto como CANCELADO?\n\nEsta ação mudará o status do projeto para Cancelado.';
  projConfirmar(msg, () => {
    projSalvarConclusao();
    projLoad();
    const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
    if(!proj) return;
    proj.status = tipo === 'sucesso' ? 'concluido' : 'cancelado';
    proj.fase_atual = 'conclusao';
    projSave();
    projToast('Projeto encerrado!', 'var(--teal)');
    projAbrirDetalhe(_projCurrentId, false);
  });
}

function projConclusaoImagemSrc(img){
  if(typeof img === 'string') return img.trim();
  return String(img?.url || img?.data || '').trim();
}

function projConclusaoImagemDisplaySrc(imgOrUrl){
  return typeof imgOrUrl === 'string' ? imgOrUrl.trim() : projConclusaoImagemSrc(imgOrUrl);
}

function projConclusaoImagemSharePointDownloadSrc(src){
  const raw = String(src || '').trim();
  if(!raw) return '';
  try {
    const url = new URL(raw);
    if(!/\.sharepoint\.com$/i.test(url.hostname)) return '';

    const sharedPath = /^\/:[a-z]:\/r(\/.+)$/i.exec(url.pathname);
    const serverRelativePath = sharedPath ? sharedPath[1] : url.pathname;
    const downloadUrl = new URL('/_layouts/15/download.aspx', url.origin);
    downloadUrl.searchParams.set('SourceUrl', decodeURIComponent(serverRelativePath));
    return downloadUrl.href;
  } catch(e) {
    if(!(e instanceof TypeError)) throw e;
    return '';
  }
}

function projConclusaoImagemHref(img){
  return projConclusaoImagemSrc(img) || projConclusaoImagemDisplaySrc(img);
}

function projConclusaoImagemNome(url, index){
  try {
    const u = new URL(url);
    const last = decodeURIComponent((u.pathname.split('/').filter(Boolean).pop() || '').trim());
    return last || `Imagem ${index + 1}`;
  } catch(e) {
    if(!(e instanceof TypeError)) throw e;
    return `Imagem ${index + 1}`;
  }
}
function projConclusaoImagensToUrls(conc){
  const seen = new Set();
  return (conc?.imagens || [])
    .map(projConclusaoImagemSrc)
    .filter(Boolean)
    .filter(url => {
      const key = url.toLowerCase();
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
function projConclusaoUrlsToImagens(text){
  const seen = new Set();
  return String(text || '')
    .split(/\n+/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(url => {
      const key = url.toLowerCase();
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((url, index) => ({nome: projConclusaoImagemNome(url, index), url, data: url, externo: true}));
}
function projConclusaoImagemPreviewItemHtml(url, index){
  const src = projConclusaoImagemDisplaySrc(url);
  const alt = projConclusaoImagemNome(url, index);
  return `<div><img src="${projEsc(src)}" data-proj-image-href="${projEsc(url)}" data-proj-image-alt="${projEsc(alt)}" alt="${projEsc(alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer"><button type="button" class="proj-btn danger" style="font-size:10px;padding:2px 6px;margin-top:3px;width:100%" onclick="projRemoveConclusaoImagem(${index})">Remover</button></div>`;
}

function projMemorialImagemLinkHtml(img, active, carousel){
  const src = projConclusaoImagemDisplaySrc(img);
  const href = projConclusaoImagemHref(img);
  const alt = img?.nome || 'Imagem do memorial';
  const classAttr = carousel ? ` class="${active ? 'proj-v12-carousel-slide on' : 'proj-v12-carousel-slide'}"` : '';
  return `<a href="${projEsc(href)}" target="_blank" rel="noopener"${classAttr}><img src="${projEsc(src)}" data-proj-image-href="${projEsc(href)}" data-proj-image-alt="${projEsc(alt)}" alt="${projEsc(alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer"></a>`;
}

// ── AVANÇAR FASE ──────────────────────────────────────────────────
function projImagemMemorialProxySrc(src){
  const value = String(src || '').trim();
  if(!value || value.startsWith('data:') || value.startsWith('blob:')) return '';
  return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(value);
}

function projImagemMemorialFallbackNode(href, alt){
  const box = document.createElement('div');
  box.className = 'proj-image-load-fallback';
  const title = document.createElement('strong');
  title.textContent = alt || 'Imagem do memorial';
  const text = document.createElement('span');
  text.textContent = 'A imagem nao pode ser carregada embutida pelo provedor.';
  const link = document.createElement('a');
  link.href = href || '#';
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = 'Abrir imagem';
  box.append(title, text, link);
  return box;
}

function projHandleMemorialImageError(event){
  const img = event.target;
  if(!(img instanceof HTMLImageElement)) return;
  if(!img.closest('.proj-v9-attach-grid, .proj-v12-single-image, .proj-v12-carousel')) return;
  const originalSrc = img.dataset.projImageHref || img.currentSrc || img.src;
  const fallbackSources = [
    originalSrc && !img.dataset.projDownloadTried ? projConclusaoImagemSharePointDownloadSrc(originalSrc) : '',
    originalSrc && !img.dataset.projProxyTried ? projImagemMemorialProxySrc(originalSrc) : ''
  ].filter(Boolean);
  const nextSrc = fallbackSources.find(src => src !== img.src && src !== img.currentSrc);
  if(nextSrc) {
    if(nextSrc.includes('/_layouts/15/download.aspx')) img.dataset.projDownloadTried = '1';
    else img.dataset.projProxyTried = '1';
    img.src = nextSrc;
    return;
  }
  if(img.dataset.projFallbackDone) return;
  img.dataset.projFallbackDone = '1';
  const href = img.dataset.projImageHref || (img.closest('a')?.href) || img.src;
  img.replaceWith(projImagemMemorialFallbackNode(href, img.dataset.projImageAlt || img.alt));
}

function projRetryBrokenMemorialImages(root = document){
  root.querySelectorAll('.proj-v9-attach-grid img, .proj-v12-single-image img, .proj-v12-carousel img').forEach(img => {
    if(img.complete && img.naturalWidth === 0) {
      projHandleMemorialImageError({ target: img });
    }
  });
}

function projScheduleMemorialImageCheck(root){
  window.setTimeout(() => projRetryBrokenMemorialImages(root || document), 250);
  window.setTimeout(() => projRetryBrokenMemorialImages(root || document), 1200);
}

document.addEventListener('error', projHandleMemorialImageError, true);
document.addEventListener('DOMContentLoaded', () => projScheduleMemorialImageCheck(document));
function projAvancarFase(id) {
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === String(id));
  if(!proj) return;
  const idx = FASE_IDX[proj.fase_atual] || 0;
  if(idx >= PROJ_FASES.length - 1) {
    projToast('Este projeto já está na fase final.', '#d97706');
    return;
  }
  const proximaFase = PROJ_FASES[idx + 1];
  projConfirmar(`Avançar para a fase "${proximaFase.label}"?\n\nVocê poderá continuar preenchendo as fases anteriores.`, () => {
    // Add monthly status meeting if advancing to execucao
    if(proximaFase.id === 'execucao') {
      if(!proj.execucao) proj.execucao = { planner_link:'', percentual:0, reunioes:[] };
      if(!proj.execucao.reunioes) proj.execucao.reunioes = [];
      // Add meeting for current month
      proj.execucao.reunioes.push({
        id: 'r' + Date.now(),
        nome: `Reunião de Status Patrocinador do Projeto ${proj.nome}`,
        data: '',
        participantes: '',
        observacoes: '',
        realizada: false,
        auto: true
      });
    }
    proj.fase_atual = proximaFase.id;
    projSave();
    projToast(`Projeto avançado para "${proximaFase.label}"!`);
    projAbrirDetalhe(id);
  });
}

function projRegredirFase(id) {
  projLoad();
  let proj = PROJETOS.find(function(p){return String(p.id)===String(id);});
  if(!proj) return;
  let idx = FASE_IDX[proj.fase_atual] || 0;
  if(idx <= 0) { projToast('Já está na primeira fase.','#d97706'); return; }
  let faseAnterior = PROJ_FASES[idx - 1];
  projConfirmar('Regredir para a fase "' + faseAnterior.label + '"?', function() {
    proj.fase_atual = faseAnterior.id;
    projSave();
    projToast('Fase regredida para "' + faseAnterior.label + '".');
    projAbrirDetalhe(id, true);
  });
}

// ── ÍCONE DO PROJETO ──────────────────────────────────────────────
function projUploadIcone(id, inputEl) {
  const file = inputEl.files?.[0];
  if(!file) return;
  if(file.size > 2*1024*1024) { projToast('Imagem muito grande (máx. 2 MB).', '#d97706'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    projLoad();
    const proj = PROJETOS.find(p => String(p.id) === String(id));
    if(!proj) return;
    proj.icone_url = e.target.result;
    projSave();
    projToast('Ícone atualizado!');
    projAbrirDetalhe(id);
  };
  reader.readAsDataURL(file);
}

// ════════════════════════════════════════════════════════════════════
// MÓDULO DE PROGRAMAS
// ════════════════════════════════════════════════════════════════════

function progRenderPage() {
  projLoad(); // carrega projetos + programas
  const el = document.getElementById('proj-programas-content');
  if(!el) return;

  if(PROGRAMAS.length === 0) {
    projSetHtml(el, `
      <div style="text-align:center;padding:3rem;color:#b0b8cc">
        <div style="font-size:40px;margin-bottom:12px">📂</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:6px">Nenhum programa cadastrado</div>
        <div style="font-size:13px;margin-bottom:1rem">Programas agrupam projetos relacionados sob uma mesma estratégia.</div>
        <button type="button" class="proj-btn primary" onclick="progAbrirModalNovo()">+ Criar primeiro programa</button>
      </div>`);
    return;
  }

  const ativos     = PROGRAMAS.filter(pg => pg.status === 'ativo');
  const concluidos = PROGRAMAS.filter(pg => pg.status === 'concluido');
  const cancelados = PROGRAMAS.filter(pg => pg.status === 'cancelado');

  const renderProg = (pg) => {
    const projs = PROJETOS.filter(p => String(p.programa_id) === String(pg.id));
    const pct = progPercentualMedio(pg.id);
    const statusBadge = pg.status === 'concluido'
      ? '<span class="proj-list-badge" style="background:var(--teal-l);color:var(--teal)">🏆 Concluído</span>'
      : pg.status === 'cancelado'
        ? '<span class="proj-list-badge" style="background:#fde8e8;color:#7f1d1d">✕ Cancelado</span>'
        : '<span class="proj-list-badge" style="background:var(--blue-l);color:var(--blue)">Ativo</span>';

    return `
      <div style="border:1.5px solid #e5e8ef;border-radius:12px;background:#fff;padding:1.1rem;margin-bottom:.9rem">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
          <div style="flex:1;min-width:0;cursor:pointer" onclick="progAbrirDetalhe('${pg.id}')">
            <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:#1a2540;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              📂 ${projEsc(pg.nome)}
              ${statusBadge}
            </div>
            ${pg.descricao ? `<div style="font-size:12px;color:#6b7385;margin-top:4px">${projEsc(pg.descricao)}</div>` : ''}
            <div style="font-size:11px;color:var(--ink3);margin-top:5px;display:flex;gap:12px;flex-wrap:wrap">
              <span>📁 ${projs.length} projeto${projs.length !== 1 ? 's' : ''}</span>
              ${pg.gerente ? `<span>👤 ${projEsc(pg.gerente)}</span>` : ''}
              ${pg.patrocinador ? `<span>📝 ${projEsc(pg.patrocinador)}</span>` : ''}
            </div>
            <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
              <div class="proj-prog-bar" style="width:180px"><div class="proj-prog-fill" style="width:${pct}%"></div></div>
              <span style="font-size:11px;color:var(--ink3)">${pct}% médio</span>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <button type="button" class="proj-btn" style="font-size:11px;padding:4px 10px" onclick="event.stopPropagation();progAbrirModalEditar('${pg.id}')">✏️ Editar</button>
            <button type="button" class="proj-btn danger" style="font-size:11px;padding:4px 10px" onclick="event.stopPropagation();progExcluir('${pg.id}')">Excluir</button>
          </div>
        </div>
      </div>
    `;
  };

  const renderGrp = (label, list) => list.length === 0 ? '' : `
    <div style="margin-bottom:1.4rem">
      <div style="font-family:'Syne',sans-serif;font-size:12px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.7rem;padding:.5rem 0;border-bottom:2px solid #eaecf3">${label} <span style="color:var(--blue)">(${list.length})</span></div>
      ${list.map(renderProg).join('')}
    </div>
  `;

  projSetHtml(el, renderGrp('Programas Ativos', ativos) + renderGrp('Programas Concluídos', concluidos) + renderGrp('Programas Cancelados', cancelados));
}

function progAbrirModalNovo() {
  _progModal({ id: null, nome: '', descricao: '', gerente: '', patrocinador: '', status: 'ativo' }, 'Novo Programa');
}

function progAbrirModalEditar(id) {
  progLoad();
  const pg = PROGRAMAS.find(p => String(p.id) === String(id));
  if(!pg) return;
  _progModal(pg, 'Editar Programa');
}

function _progModal(pg, titulo) {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;overflow-y:auto';
  projSetHtml(modal, `
    <div style="background:#fff;border-radius:16px;padding:1.6rem;width:100%;max-width:540px;box-shadow:0 16px 48px rgba(0,0,0,.2)">
      <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:#1a2540;margin-bottom:1.2rem">${titulo}</div>
      <div class="proj-fg">
        <label class="proj-fl">Nome do Programa<span>*</span></label>
        <input type="text" class="proj-fi" id="prog-m-nome" value="${projEsc(pg.nome||'')}" placeholder="Ex: Gestão de Riscos no Controle">
      </div>
      <div class="proj-fg">
        <label class="proj-fl">Descrição</label>
        <textarea class="proj-fi" id="prog-m-desc" placeholder="Objetivo geral do programa..." rows="2">${projEsc(pg.descricao||'')}</textarea>
      </div>
      <div class="proj-g2">
        <div class="proj-fg">
          <label class="proj-fl">Gerente do Programa</label>
          <input type="text" class="proj-fi" id="prog-m-gerente" value="${projEsc(pg.gerente||'')}">
        </div>
        <div class="proj-fg">
          <label class="proj-fl">Patrocinador</label>
          <input type="text" class="proj-fi" id="prog-m-patrocinador" value="${projEsc(pg.patrocinador||'')}">
        </div>
      </div>
      <div class="proj-fg">
        <label class="proj-fl">Status</label>
        <select class="proj-fi" id="prog-m-status">
          <option value="ativo"${pg.status==='ativo'?' selected':''}>Ativo</option>
          <option value="concluido"${pg.status==='concluido'?' selected':''}>Concluído</option>
          <option value="cancelado"${pg.status==='cancelado'?' selected':''}>Cancelado</option>
        </select>
      </div>
      <div class="proj-btn-row">
        <button type="button" class="proj-btn" onclick="this.closest('[style*=fixed]').remove()">Cancelar</button>
        <button type="button" class="proj-btn primary" onclick="progSalvarModal('${pg.id||''}',this)">Salvar</button>
      </div>
    </div>
  `);
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('prog-m-nome')?.focus(), 50);
}

function progSalvarModal(idRaw, btn) {
  if(!projEnsureWriteAll('Apenas EPP pode gerenciar programas.')) return;
  const nome = document.getElementById('prog-m-nome')?.value.trim();
  if(!nome) { projToast('Informe o nome do programa.', '#d97706'); return; }
  progLoad();

  if(idRaw && idRaw !== 'null' && idRaw !== '') {
    // Edit
    const pg = PROGRAMAS.find(p => String(p.id) === String(idRaw));
    if(!pg) return;
    pg.nome = nome;
    pg.descricao = document.getElementById('prog-m-desc')?.value.trim()||'';
    pg.gerente = document.getElementById('prog-m-gerente')?.value.trim()||'';
    pg.patrocinador = document.getElementById('prog-m-patrocinador')?.value.trim()||'';
    pg.status = document.getElementById('prog-m-status')?.value||'ativo';
    progSave();
    projToast('Programa atualizado!');
  } else {
    // Create
    const novo = progFixDefaults({
      id: Date.now(),
      nome,
      descricao: document.getElementById('prog-m-desc')?.value.trim()||'',
      gerente: document.getElementById('prog-m-gerente')?.value.trim()||'',
      patrocinador: document.getElementById('prog-m-patrocinador')?.value.trim()||'',
      status: document.getElementById('prog-m-status')?.value||'ativo'
    });
    PROGRAMAS.push(novo);
    progSave();
    projToast('Programa "' + nome + '" criado!');
  }

  btn.closest('[style*=fixed]').remove();
  progRenderPage();
}

function progExcluir(id) {
  if(!projEnsureWriteAll('Apenas EPP pode excluir programas.')) return;
  progLoad();
  const pg = PROGRAMAS.find(p => String(p.id) === String(id));
  if(!pg) return;
  const projsVinc = PROJETOS.filter(p => String(p.programa_id) === String(id));
  const msg = projsVinc.length > 0
    ? `Excluir o programa "${pg.nome}"?\n\nAtenção: ${projsVinc.length} projeto(s) deste programa ficarão sem programa vinculado (os projetos NÃO serão excluídos).`
    : `Excluir o programa "${pg.nome}"?`;
  projConfirmar(msg, () => {
    // Desvincular projetos
    projLoad();
    PROJETOS.forEach(p => {
      if(String(p.programa_id) === String(id)) p.programa_id = null;
    });
    projSave();
    // Remover programa
    PROGRAMAS = PROGRAMAS.filter(p => String(p.id) !== String(id));
    progSave();
    projToast('Programa excluído.');
    progRenderPage();
  });
}

function progAbrirDetalhe(id) {
  progLoad();
  const pg = PROGRAMAS.find(p => String(p.id) === String(id));
  if(!pg) return;
  const projs = PROJETOS.filter(p => String(p.programa_id) === String(id));
  const pct = progPercentualMedio(id);

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;overflow-y:auto';
  projSetHtml(modal, `
    <div style="background:#fff;border-radius:16px;padding:1.8rem;width:100%;max-width:720px;box-shadow:0 16px 48px rgba(0,0,0,.2);max-height:90vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem;gap:12px">
        <div style="flex:1;min-width:0">
          <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:#1a2540;margin-bottom:4px">📂 ${projEsc(pg.nome)}</div>
          ${pg.descricao ? `<div style="font-size:13px;color:#6b7385;line-height:1.5">${projEsc(pg.descricao)}</div>` : ''}
        </div>
        <button type="button" class="proj-btn" onclick="this.closest('[style*=fixed]').remove()">✕</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:1.2rem;padding:.9rem;background:#f8faff;border-radius:10px;border:1px solid #e5e8ef">
        <div>
          <div style="font-size:10.5px;color:var(--ink3);text-transform:uppercase;letter-spacing:.06em;font-weight:600">Gerente</div>
          <div style="font-size:13px;color:#1a2540;margin-top:2px">${projEsc(pg.gerente)||'—'}</div>
        </div>
        <div>
          <div style="font-size:10.5px;color:var(--ink3);text-transform:uppercase;letter-spacing:.06em;font-weight:600">Patrocinador</div>
          <div style="font-size:13px;color:#1a2540;margin-top:2px">${projEsc(pg.patrocinador)||'—'}</div>
        </div>
        <div>
          <div style="font-size:10.5px;color:var(--ink3);text-transform:uppercase;letter-spacing:.06em;font-weight:600">Status</div>
          <div style="font-size:13px;color:#1a2540;margin-top:2px">${pg.status==='concluido'?'🏆 Concluído':pg.status==='cancelado'?'✕ Cancelado':'✓ Ativo'}</div>
        </div>
        <div>
          <div style="font-size:10.5px;color:var(--ink3);text-transform:uppercase;letter-spacing:.06em;font-weight:600">Progresso médio</div>
          <div style="margin-top:4px;display:flex;align-items:center;gap:8px">
            <div class="proj-prog-bar" style="flex:1"><div class="proj-prog-fill" style="width:${pct}%"></div></div>
            <span style="font-size:12px;color:var(--blue);font-weight:600">${pct}%</span>
          </div>
        </div>
      </div>

      <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:#1a2540;margin-bottom:.7rem">Projetos deste programa <span style="color:var(--blue)">(${projs.length})</span></div>

      ${projs.length === 0 ? `
        <div style="text-align:center;padding:1.5rem;color:#b0b8cc;background:#f8faff;border-radius:10px;border:1px dashed #d5deed">
          <div style="font-size:13px">Nenhum projeto vinculado ainda.</div>
          <div style="font-size:11px;margin-top:4px">Ao criar um novo projeto, selecione este programa no campo "Programa".</div>
        </div>
      ` : projs.map(p => `
        <div class="proj-list-item" onclick="(function(){document.querySelectorAll('[style*=\\'z-index:99999\\']').forEach(m=>m.remove());projAbrirDetalhe('${p.id}');})()">
          <div class="proj-list-icon">
            ${p.icone_url ? `<img src="${projEsc(p.icone_url)}" alt="ícone">` : `<span style="font-size:20px">${p.icone_emoji || '📁'}</span>`}
          </div>
          <div>
            <div class="proj-list-name">${projEsc(p.nome)}</div>
            <div class="proj-list-meta">
              <span>👤 ${projEsc(p.gerente)||'—'}</span>
              ${p.patrocinador ? `<span>📝 ${projEsc(p.patrocinador)}</span>` : ''}
            </div>
            <div style="margin-top:5px">
              <div class="proj-prog-bar" style="width:160px;display:inline-block">
                <div class="proj-prog-fill" style="width:${p.percentual||0}%"></div>
              </div>
              <span style="font-size:11px;color:var(--ink3);margin-left:6px">${p.percentual||0}%</span>
            </div>
          </div>
          <span class="proj-list-badge ${projFaseBadgeClass(p.status,p.fase_atual)}">${projFaseText(p)}</span>
        </div>
      `).join('')}

      <div class="proj-btn-row" style="margin-top:1.2rem">
        <button type="button" class="proj-btn" onclick="this.closest('[style*=fixed]').remove();progAbrirModalEditar('${pg.id}')">✏️ Editar Programa</button>
        <button type="button" class="proj-btn primary" onclick="this.closest('[style*=fixed]').remove()">Fechar</button>
      </div>
    </div>
  `);
  document.body.appendChild(modal);
}

// ════════════════════════════════════════════════════════════════════
// CARREGAR DADOS INICIAIS (PORTFÓLIO CAGE DO STATUS REPORT MAR/26)
// ════════════════════════════════════════════════════════════════════


// ── Criar Reunioes de Status Patrocinador para todos os projetos ativos ──
function projAutoAddReunioesStatusTodos(){
  projAutoAddReunioesTipo('status', 0);
}

// ── Excluir reuniões duplicadas em TODOS os projetos ──
function projDeduplicarReunioesGlobal(){
  if(!projEnsureWriteAll('Apenas EPP pode alterar reuniões.')) return;
  projLoad();
  let totalRem = 0;
  PROJETOS.forEach(function(proj){
    if(!proj.execucao || !proj.execucao.reunioes) return;
    let seen = {};
    let orig = proj.execucao.reunioes.length;
    proj.execucao.reunioes = proj.execucao.reunioes.filter(function(r){
      let k = r.nome + '|' + (r.data||'');
      if(seen[k]) return false;
      seen[k] = true;
      return true;
    });
    totalRem += orig - proj.execucao.reunioes.length;
  });
  projSave();
  if(totalRem > 0){
    projToast(totalRem + ' reunião(ões) duplicada(s) removida(s).');
  } else {
    projToast('Nenhuma duplicata encontrada.','#d97706');
  }
  projAtualizarBadgeReunioes();
  projGo('reunioes', document.getElementById('pnb-reunioes'));
}


// ── Exportar / Importar JSON ──────────────────────────────────
function projEnsureEPJson(msg='Apenas o perfil EPP pode exportar ou importar o JSON do sistema.'){
  if(isEP()) return true;
  projToast(msg, '#d97706');
  return false;
}

function projExportJSON(){
  if(!projEnsureEPJson()) return;
  projLoad();
  let data = {
    projetos: PROJETOS,
    programas: PROGRAMAS,
    macros: PROJ_MACROS,
    objetivos: PROJ_OBJETIVOS,
    exportDate: new Date().toISOString(),
    version: 'SIGA_Projetos_v6'
  };
  let blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url;
  a.download = 'SIGA_Projetos_backup_' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  projToast('Backup exportado!');
}

function projImportJSON(){
  if(!projEnsureEPJson()) return;
  let inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json';
  inp.onchange = function(e){
    let file = e.target.files[0];
    if(!file) return;
    let reader = new FileReader();
    reader.onload = function(ev){
      try {
        let data = JSON.parse(ev.target.result);
        if(data._meta?.formato==='SIGA_BACKUP_COMPLETO'){
          projToast('Este é um backup completo de todos os módulos. A importação desta tela aceita apenas arquivos antigos de Projetos; a restauração completa exige procedimento administrativo.','#d97706');
          return;
        }
        if(!data.projetos || !Array.isArray(data.projetos)){
          projToast('Arquivo JSON invalido.','#d97706');
          return;
        }
        projConfirmar('Importar dados? Isso substituira TODOS os projetos e programas atuais.', function(){
          const prevProjetos = PROJETOS;
          const prevProgramas = PROGRAMAS;
          const prevObjetivos = PROJ_OBJETIVOS;

          projApplyDataSet(data);

          _projFbState.loaded = true;
          clearTimeout(_projFbState.saveTimer);

          const gravarCacheLocal = function(){
            localStorage.setItem(PROJ_STORAGE_KEY, JSON.stringify(PROJETOS));
            localStorage.setItem(PROG_STORAGE_KEY, JSON.stringify(PROGRAMAS));
            localStorage.setItem('cage_objetivos_v6', JSON.stringify(PROJ_OBJETIVOS||[]));
          };

          if(!fbReady()){
            try { gravarCacheLocal(); } catch(_e){}
            projToast('Importado localmente. Firebase indisponível — dados não sincronizados na nuvem.', '#d97706');
            projGo('inicio', document.getElementById('pnb-inicio'));
            return;
          }

          projToast('Enviando para a nuvem…');
          projFbSaveAll().then(function(){
            try { gravarCacheLocal(); } catch(_e){}
            projToast('Dados importados e sincronizados na nuvem!');
            projGo('inicio', document.getElementById('pnb-inicio'));
          }).catch(function(err){
            PROJETOS = prevProjetos;
            PROGRAMAS = prevProgramas;
            projSyncArquitetura();
            PROJ_OBJETIVOS = prevObjetivos;
            _projFbState.loaded = false;
            console.warn('projImportJSON/fb:', err && err.message);
            projToast('Erro ao enviar para a nuvem: ' + (err && err.message ? err.message : err), '#dc2626');
          });
        });
      } catch(err){
        projToast('Erro ao ler arquivo: ' + err.message, '#d97706');
      }
    };
    reader.readAsText(file);
  };
  inp.click();
}

function projProcessImport(inputEl){
  if(!projEnsureEPJson()){ if(inputEl) inputEl.value=''; return; }
  if(!inputEl || !inputEl.files || !inputEl.files[0]) return;
  let file = inputEl.files[0];
  let reader = new FileReader();
  reader.onload = function(ev){
    try {
      let data = JSON.parse(ev.target.result);
      if(!data.projetos || !Array.isArray(data.projetos)){
        projToast('Arquivo JSON invalido.','#d97706');
        return;
      }
      projConfirmar('Importar dados? Isso substituira TODOS os projetos e programas atuais.', function(){
        const prevProjetos = PROJETOS;
        const prevProgramas = PROGRAMAS;
        const prevObjetivos = PROJ_OBJETIVOS;

        projApplyDataSet(data);

        _projFbState.loaded = true;
        clearTimeout(_projFbState.saveTimer);

        const gravarCacheLocal = function(){
          localStorage.setItem(PROJ_STORAGE_KEY, JSON.stringify(PROJETOS));
          localStorage.setItem(PROG_STORAGE_KEY, JSON.stringify(PROGRAMAS));
          localStorage.setItem('cage_objetivos_v6', JSON.stringify(PROJ_OBJETIVOS||[]));
        };

        if(!fbReady()){
          try { gravarCacheLocal(); } catch(_e){}
          projToast('Importado localmente. Firebase indisponível — dados não sincronizados na nuvem.', '#d97706');
          projGo('inicio', document.getElementById('pnb-inicio'));
          return;
        }

        projToast('Enviando para a nuvem…');
        projFbSaveAll({includeConfig:true}).then(function(){
          try { gravarCacheLocal(); } catch(_e){}
          projToast('Dados importados com sucesso!');
          projGo('inicio', document.getElementById('pnb-inicio'));
        }).catch(function(err){
          PROJETOS = prevProjetos;
          PROGRAMAS = prevProgramas;
          projSyncArquitetura();
          PROJ_OBJETIVOS = prevObjetivos;
          projToast('Falha ao importar na nuvem: ' + err.message, '#dc2626');
        });
      });
    } catch(e){
      projToast('Erro ao ler arquivo JSON.','#dc2626');
    } finally {
      inputEl.value = '';
    }
  };
  reader.readAsText(file);
}


// ── Alterar Emoji do Projeto (Picker) ──────────────────────────
let _projWorkEmojis = [
  '\u{1F4C1}','\u{1F4C2}','\u{1F4CA}','\u{1F4C8}','\u{1F4C9}','\u{1F4CB}','\u{1F4CC}','\u{1F4CE}','\u{1F4DD}','\u{1F4C4}','\u{1F4C3}','\u{1F4D1}','\u{1F4D0}','\u{1F4CF}',
  '\u{1F5C2}','\u{1F5C3}','\u{1F5C4}','\u{1F5D3}','\u{1F5D2}','\u{1F4C5}','\u{1F4C6}',
  '\u{1F4BC}','\u{1F3E2}','\u{1F3D7}','\u{1F3ED}','\u{1F3DB}','\u{1F3E6}','\u{1F3E5}','\u{1F3EB}','\u{1F3EA}',
  '\u{2699}','\u{1F527}','\u{1F528}','\u{1F6E0}','\u{1F529}','\u{1F517}','\u{1F511}','\u{1F510}','\u{1F512}','\u{1F513}',
  '\u{1F4A1}','\u{1F50D}','\u{1F50E}','\u{1F52C}','\u{1F52D}','\u{1F9EA}','\u{1F9EE}','\u{1F9F0}',
  '\u{1F4BB}','\u{1F5A5}','\u{1F5A8}','\u{2328}','\u{1F5B1}','\u{1F4BE}','\u{1F4BF}','\u{1F4C0}',
  '\u{1F310}','\u{1F30D}','\u{1F4E1}','\u{1F4F6}','\u{1F4F1}','\u{1F4F2}','\u{260E}','\u{1F4DE}','\u{1F4E0}',
  '\u{2709}','\u{1F4E7}','\u{1F4E8}','\u{1F4E9}','\u{1F4E4}','\u{1F4E5}','\u{1F4E6}','\u{1F4EB}','\u{1F4EC}',
  '\u{1F3C6}','\u{1F3C5}','\u{1F3AF}','\u{1F393}','\u{1F680}','\u{1F6E1}','\u{2B50}','\u{1F31F}','\u{1F48E}',
  '\u{2705}','\u{2611}','\u{274C}','\u{2753}','\u{2757}','\u{26A0}','\u{1F534}','\u{1F7E2}','\u{1F7E1}','\u{1F535}',
  '\u{1F916}','\u{1F9E0}','\u{1F91D}','\u{1F465}','\u{1F464}','\u{1F64B}','\u{1F4AC}','\u{1F5E3}',
  '\u{1F4E3}','\u{1F4E2}','\u{1F514}',
  '\u{23F1}','\u{23F0}','\u{23F3}','\u{1F550}',
  '\u{1F3A8}','\u{1F5BC}','\u{270F}','\u{1F58A}','\u{1F58B}','\u{2712}','\u{1F4D6}','\u{1F4DA}',
  '\u{1F4B0}','\u{1F4B5}','\u{1F4B3}','\u{1F9FE}','\u{1F4D2}','\u{1F4D5}','\u{1F4D7}','\u{1F4D8}','\u{1F4D9}',
  '\u{1F3E0}','\u{1F3E1}','\u{1F5FA}','\u{1F9ED}','\u{1F697}','\u{1F68C}','\u{2708}','\u{1F6A2}',
  '\u{1F331}','\u{1F333}','\u{267B}','\u{1F4A7}','\u{1F525}','\u{26A1}','\u{2600}','\u{1F308}'
];


function projShowEmojiPicker(projId) {
  let overlay = document.createElement('div');
  overlay.id = 'proj-emoji-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';

  let box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:14px;padding:1.5rem;max-width:440px;width:95%;max-height:70vh;overflow-y:auto;box-shadow:0 16px 48px rgba(0,0,0,.3)';

  let header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem';
  let title = document.createElement('div');
  title.style.cssText = 'font-weight:700;font-size:15px;color:#1a2540';
  title.textContent = 'Selecionar Icone do Projeto';
  let closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '\u2715';
  closeBtn.style.cssText = 'background:none;border:none;font-size:20px;cursor:pointer;color:#70709a';
  closeBtn.onclick = function(){ overlay.remove(); };
  header.appendChild(title);
  header.appendChild(closeBtn);
  box.appendChild(header);

  let grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(40px,1fr));gap:4px';
  _projWorkEmojis.forEach(function(em){
    let btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = em;
    btn.style.cssText = 'font-size:22px;padding:6px;background:none;border:1px solid #e4e2d8;border-radius:8px;cursor:pointer;transition:all .15s';
    btn.onmouseover = function(){ this.style.background='#ebf1fc'; this.style.borderColor='#1A5DC8'; };
    btn.onmouseout = function(){ this.style.background='none'; this.style.borderColor='#e4e2d8'; };
    btn.onclick = function(){
      projLoad();
      let proj = PROJETOS.find(function(p){return String(p.id)===String(projId);});
      if(proj){ proj.icone_emoji = em; proj.icone_url = ''; projSave(); projToast('Icone atualizado!'); projAbrirDetalhe(projId, true); }
      overlay.remove();
    };
    grid.appendChild(btn);
  });
  box.appendChild(grid);

  let uploadDiv = document.createElement('div');
  uploadDiv.style.cssText = 'margin-top:1rem;padding-top:1rem;border-top:1px solid #e4e2d8;text-align:center';
  let uploadLabel = document.createElement('label');
  uploadLabel.className = 'proj-btn';
  uploadLabel.style.cssText = 'cursor:pointer;font-size:12px;padding:6px 14px';
  uploadLabel.textContent = '\u{1F4F7} Enviar imagem personalizada';
  let uploadInput = document.createElement('input');
  uploadInput.type = 'file';
  uploadInput.accept = 'image/*';
  uploadInput.style.display = 'none';
  uploadInput.onchange = function(){ projUploadIcone(projId, this); overlay.remove(); };
  uploadLabel.appendChild(uploadInput);
  uploadDiv.appendChild(uploadLabel);
  box.appendChild(uploadDiv);

  overlay.appendChild(box);
  overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}


// ── V9: helpers executivos ───────────────────────────────────────
function projProgramaNome(p) { if(p && p.programa_id){ const pg=(PROGRAMAS||[]).find(x=>String(x.id)===String(p.programa_id)); if(pg)return pg.nome; } return 'Sem programa'; }
function projGetDashFiltro(){return {patrocinador:document.getElementById('proj-f-patrocinador')?.value||'',objetivo:document.getElementById('proj-f-objetivo')?.value||'',macro:document.getElementById('proj-f-macro')?.value||'',divisao:document.getElementById('proj-f-divisao')?.value||''};}

function projTarefasAtrasadasProjeto(p){const today=new Date().toISOString().slice(0,10);projSyncDerivedTaskDates(p.execucao?.tarefas||[]);return projFlattenTasks(p.execucao?.tarefas||[]).filter(t=>!(t._children&&t._children.length)&&!t.concluida&&t.dt_fim&&t.dt_fim<today);}
function projRenderIndicadoresExecucao(p){const inds=p.execucao?.indicadores||[];return `<div style="display:flex;flex-direction:column;gap:8px">${inds.length?inds.map((i,idx)=>`<div class="proj-v9-ind-grid"><input class="proj-fi" value="${projEsc(i.nome||'')}" onchange="projUpdateIndicador(${idx},'nome',this.value)" placeholder="Indicador"><input class="proj-fi" type="number" value="${projEsc(String(i.meta||''))}" onchange="projUpdateIndicador(${idx},'meta',this.value)" placeholder="Meta"><input class="proj-fi" type="number" value="${projEsc(String(i.atual||''))}" onchange="projUpdateIndicador(${idx},'atual',this.value)" placeholder="Atual"><select class="proj-fi" onchange="projUpdateIndicador(${idx},'status',this.value)"><option ${i.status==='Em acompanhamento'?'selected':''}>Em acompanhamento</option><option ${i.status==='Atingido'?'selected':''}>Atingido</option><option ${i.status==='Atenção'?'selected':''}>Atenção</option></select><button type="button" class="proj-btn danger" onclick="projRemoveIndicador(${idx})">×</button></div>`).join(''):'<div style="font-size:12px;color:var(--ink3)">Nenhum indicador registrado para este projeto.</div>'}<div><button type="button" class="proj-btn primary" style="font-size:11px;padding:5px 12px" onclick="projAddIndicador()">+ Indicador</button></div></div>`;}
function projRemoveIndicador(idx){projLoad();const proj=PROJETOS.find(p=>String(p.id)===_projCurrentId);if(!proj?.execucao?.indicadores)return;proj.execucao.indicadores.splice(idx,1);projSave();projDetalheTab('execucao',document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));}
const PROJ_CRON_XLSX_HEADERS = ['Numero','Nome','PPE','Marco','Inicio','Fim','Responsavel','Conclusao','Concluida'];
function projFlattenTasksForExport(tasks,prefix){let rows=[];projSyncDerivedTaskDates(tasks||[]);(tasks||[]).forEach((t,i)=>{const num=prefix?prefix+'.'+(i+1):String(i+1);rows.push({Numero:num,Nome:t.nome||'',PPE:t.ppe?'Sim':'Não',Marco:t.marco?'Sim':'Não',Inicio:t.dt_inicio||'',Fim:t.dt_fim||'',Responsavel:t.responsavel||'',Conclusao:t.conclusao||0,Concluida:t.concluida?'Sim':'Não'});rows=rows.concat(projFlattenTasksForExport(t.subtarefas||[],num));});return rows;}
function projExportCronogramaXLSX(){if(!projEnsureWriteSchedule('Apenas o perfil EPP ou o gerente vinculado ao projeto pode exportar o cronograma.')) return;projLoad();const proj=PROJETOS.find(p=>String(p.id)===_projCurrentId);if(!proj)return;projSyncDerivedTaskDates(proj.execucao?.tarefas||[]);const rows=projFlattenTasksForExport(proj.execucao?.tarefas||[]);if(!rows.length){projToast('Não há tarefas para exportar.','#d97706');return;}if(typeof XLSX==='undefined'){projToast('Biblioteca XLSX indisponível.','#d97706');return;}const ws=XLSX.utils.json_to_sheet(rows,{header:PROJ_CRON_XLSX_HEADERS});ws['!cols']=[{wch:10},{wch:42},{wch:8},{wch:8},{wch:12},{wch:12},{wch:24},{wch:10},{wch:10}];const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Cronograma SIGA');XLSX.writeFile(wb,'Cronograma_SIGA_'+(proj.nome||'projeto').replace(/[^\w]+/g,'_').slice(0,40)+'.xlsx');}
function projCronXlsxBool(v){const s=String(v||'').trim().toLowerCase();if(['sim','s','true','1'].includes(s))return true;if(['não','nao','n','false','0',''].includes(s))return false;throw new Error('Campo Sim/Não inválido.');}
function projCronXlsxDate(v){const s=String(v||'').trim();if(!s)return '';if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw new Error('Datas devem estar no formato AAAA-MM-DD exportado pelo SIGA.');return s;}
function projImportCronogramaXLSX(inputEl){
  if(!projEnsureWriteSchedule('Apenas o perfil EPP ou o gerente vinculado ao projeto pode importar o cronograma.')) return;
  if(!inputEl){
    const inp=document.createElement('input');
    inp.type='file';inp.accept='.xlsx';inp.style.display='none';
    inp.onchange=function(){projImportCronogramaXLSX(inp);setTimeout(()=>inp.remove(),0);};
    document.body.appendChild(inp);inp.click();return;
  }
  const file=inputEl.files&&inputEl.files[0]; if(!file)return;
  if(typeof XLSX==='undefined'){projToast('Biblioteca XLSX indisponível.','#d97706');inputEl.value='';return;}
  const reader=new FileReader();
  reader.onload=function(ev){
    try{
      const wb=XLSX.read(ev.target.result,{type:'array'});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const matrix=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});
      const headers=(matrix[0]||[]).map(h=>String(h).trim());
      if(headers.length!==PROJ_CRON_XLSX_HEADERS.length || PROJ_CRON_XLSX_HEADERS.some((h,i)=>headers[i]!==h)) throw new Error('Arquivo incompatível. Use o mesmo .xlsx exportado pelo SIGA.');
      const rows=XLSX.utils.sheet_to_json(ws,{defval:'',raw:false}).filter(r=>String(r.Numero||r.Nome||'').trim());
      const tarefas=[];
      rows.forEach((r,idx)=>{
        const numero=String(r.Numero||'').trim().replace(/\.$/,'');
        if(!/^(\d+)(\.\d+)*$/.test(numero)) throw new Error('Numeração inválida na linha '+(idx+2)+'.');
        const parts=numero.split('.').map(n=>Number(n)-1);
        if(parts.some(n=>!Number.isInteger(n)||n<0)) throw new Error('Numeração inválida na linha '+(idx+2)+'.');
        let list=tarefas;
        for(let i=0;i<parts.length-1;i++){
          const parent=list[parts[i]];
          if(!parent) throw new Error('Subtarefa sem tarefa superior na linha '+(idx+2)+'.');
          if(!parent.subtarefas) parent.subtarefas=[];
          list=parent.subtarefas;
        }
        const pos=parts[parts.length-1];
        if(pos!==list.length) throw new Error('Numeração fora de ordem na linha '+(idx+2)+'.');
        const conclusao=Math.max(0,Math.min(100,Number(String(r.Conclusao||'0').replace(',','.'))||0));
        list.push({id:'t'+Date.now()+'_'+idx,nome:String(r.Nome||'Nova tarefa').trim()||'Nova tarefa',ppe:projCronXlsxBool(r.PPE),marco:projCronXlsxBool(r.Marco),dt_inicio:projCronXlsxDate(r.Inicio),dt_fim:projCronXlsxDate(r.Fim),responsavel:String(r.Responsavel||'').trim(),conclusao,concluida:projCronXlsxBool(r.Concluida),subtarefas:[]});
      });
      projConfirmar('Importar cronograma? Isso substituirá as tarefas atuais deste projeto.', function(){
        projWithScheduleWrite(() => {
        projLoad();
        const proj=PROJETOS.find(p=>String(p.id)===_projCurrentId); if(!proj)return;
        if(!proj.execucao)proj.execucao={planner_link:'',percentual:0,reunioes:[],tarefas:[]};
        projEnsureCurrentScheduleBackupBeforeMutation(proj);
        proj.execucao.tarefas=projSyncDerivedTaskDates(tarefas);
        if(proj.execucao.pct_mode==='derivado'){proj.percentual=projCalcDerivedPct(proj.execucao.tarefas);proj.execucao.percentual=proj.percentual;}
        projSave();
        projToast('Cronograma importado com sucesso!');
        projDetalheTab('execucao',document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
        });
      });
    }catch(e){projToast('Erro ao importar .xlsx: '+e.message,'#dc2626');}
    finally{inputEl.value='';}
  };
  reader.readAsArrayBuffer(file);
}
function projRemoveConclusaoImagem(idx){projLoad();const proj=PROJETOS.find(p=>String(p.id)===_projCurrentId);if(!proj?.conclusao?.imagens)return;proj.conclusao.imagens.splice(idx,1);projSave();projDetalheTab('conclusao',document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(5)'));}
// ── Init ao carregar ──────────────────────────────────────────────
// ── Ajustes v9.1: indicadores, memorial e report executivo ───────
const PROJ_CAGE_REPORT_LOGO = 'cage-logo-report.png';

function projGroupCountWithProjects(list, fn) {
  const map = {};
  (list||[]).forEach(p => {
    const values = Array.isArray(fn(p)) ? fn(p) : [fn(p)];
    const clean = values.map(v => String(v||'').trim()).filter(Boolean);
    (clean.length ? clean : ['Não informado']).forEach(key => {
      if(!map[key]) map[key] = { label:key, count:0, projects:[], projectObjs:[] };
      if(!map[key].projectObjs.some(x => String(x.id) === String(p.id))) {
        map[key].count++;
        map[key].projects.push(p.nome||'Projeto sem nome');
        map[key].projectObjs.push(p);
      }
    });
  });
  return Object.values(map).sort((a,b) => b.count-a.count || a.label.localeCompare(b.label));
}

function projMultiValues(...sources) {
  const out = [];
  const add = v => {
    if(Array.isArray(v)) v.forEach(add);
    else String(v||'').split(/[;\n|]+/).map(s => s.trim()).filter(Boolean).forEach(s => {
      if(!out.includes(s)) out.push(s);
    });
  };
  sources.forEach(add);
  return out;
}

function projTextCompare(a, b) {
  return String(a || '').localeCompare(String(b || ''));
}

function projOptionsFromProjetos(projects, getter) {
  const vals = [];
  (projects||[]).forEach(p => {
    const got = getter(p);
    (Array.isArray(got) ? got : [got]).forEach(v => {
      const clean = String(v||'').trim();
      if(clean && !vals.includes(clean)) vals.push(clean);
    });
  });
  return vals.sort(projTextCompare);
}

function projFiltrarProjetosV9(projects) {
  const f = projGetDashFiltro();
  return projects.filter(p => {
    const d = projDimensoesProjeto(p);
    return (!f.patrocinador || d.patrocinador === f.patrocinador)
      && (!f.objetivo || d.objetivos.includes(f.objetivo))
      && (!f.macro || d.macros.includes(f.macro))
      && (!f.divisao || d.divisao === f.divisao);
  });
}

function projUnlinkedValues(allValues, projects, getter) {
  const linked = new Set();
  (projects||[]).forEach(p => {
    const got = getter(p);
    (Array.isArray(got) ? got : [got]).forEach(v => {
      const clean = String(v||'').trim();
      if(clean) linked.add(clean);
    });
  });
  return (allValues||[]).map(v => String(v||'').trim()).filter(v => v && !linked.has(v)).sort(projTextCompare);
}

function projToggleDashUnlinked(key) {
  window._projDashOpenUnlinked = window._projDashOpenUnlinked || {};
  window._projDashOpenUnlinked[key] = !window._projDashOpenUnlinked[key];
  projRenderDashV9();
}

function projPctFmt(valor) {
  const n = Number(valor||0);
  return n.toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 }) + '%';
}

function projIndicadorResumo(ind) {
  const meta = projIndicadorValor(ind,'meta');
  const atual = projIndicadorValor(ind,'resultado');
  const pct = meta ? (atual / meta) * 100 : 0;
  return `${atual}/${meta} (${projPctFmt(pct)})`;
}

function projDashKey(title) {
  return String(title||'grafico').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase();
}

function projToggleDashGroup(chartKey, idx) {
  window._projDashOpenGroups = window._projDashOpenGroups || {};
  const key = chartKey + ':' + idx;
  window._projDashOpenGroups[key] = !window._projDashOpenGroups[key];
  projRenderDashV9();
}

function projDashProjectList(projects) {
  return (projects||[]).map(p => `<a href="#" class="proj-v10-chart-project" onclick="event.preventDefault();event.stopPropagation();projAbrirDetalhe('${projEsc(String(p.id))}', true)">${projIconHtml(p)}<span>${projEsc(p.nome||'Projeto sem nome')}</span></a>`).join('');
}

function projChartBars(title, items, opts) {
  const chartKey = projDashKey(title);
  const max = Math.max(1, ...(items||[]).map(i => i.count||0));
  window._projDashOpenGroups = window._projDashOpenGroups || {};
  window._projDashOpenUnlinked = window._projDashOpenUnlinked || {};
  const unlinked = opts?.unlinkedItems || [];
  const unlinkedKey = opts?.unlinkedKey || chartKey;
  const unlinkedHtml = opts?.unlinkedLabel ? `<button type="button" class="proj-v10-unlinked-btn" onclick="event.stopPropagation();projToggleDashUnlinked('${projEsc(unlinkedKey)}')">${projEsc(opts.unlinkedLabel)} (${unlinked.length})</button>${window._projDashOpenUnlinked[unlinkedKey] ? `<div class="proj-v10-unlinked-list">${unlinked.length ? unlinked.map(v => `<div>${projEsc(v)}</div>`).join('') : '<div>Nenhum item sem projeto vinculado.</div>'}</div>` : ''}` : '';
  return `<div class="proj-v9-chart-card"><div class="proj-card-t">${projEsc(title)}</div><div class="proj-v9-bars">${
    (items||[]).length ? items.map((i,idx) => {
      const tip = (i.projects&&i.projects.length) ? i.projects.join(' | ') : (i.title||i.label);
      const open = !!window._projDashOpenGroups[chartKey + ':' + idx];
      const width = typeof i.widthPct === 'number' ? Math.max(2, Math.min(100, i.widthPct)) : Math.max(6, Math.round((i.count||0)/max*100));
      const value = i.displayValue || i.count || 0;
      return `<div class="proj-v9-bar-row" title="${projEsc(tip)}" onclick="projToggleDashGroup('${chartKey}',${idx})"><span title="${projEsc(tip)}">${projEsc(i.label)}</span><div class="proj-v9-bar"><div style="width:${width}%"></div></div><strong>${projEsc(value)}</strong>${open ? `<div class="proj-v10-chart-projects">${projDashProjectList(i.projectObjs||[]) || '<span style="font-size:10.5px;color:var(--ink3)">Sem projetos vinculados.</span>'}</div>` : ''}</div>`;
    }).join('') : '<div style="font-size:12px;color:var(--ink3)">Sem dados.</div>'
  }${unlinkedHtml}</div></div>`;
}

function projIndicadoresLista(projetos) {
  const rows = [];
  (projetos||[]).forEach(p => (p.execucao?.indicadores||[]).forEach((ind,idx) => rows.push({ p, ind, idx })));
  return rows;
}

function projIndicadorValor(ind, campo) {
  return Number(ind[campo] ?? (campo === 'resultado' ? ind.atual : 0) ?? 0);
}


function projIndicadoresDashItems(rows) {
  const map = {};
  (rows||[]).forEach(({p, ind}) => {
    const label = String(ind.nome||'Indicador sem nome').trim() || 'Indicador sem nome';
    if(!map[label]) map[label] = { label, count:0, pctSum:0, displayParts:[], projects:[], projectObjs:[] };
    const meta = projIndicadorValor(ind,'meta');
    const atual = projIndicadorValor(ind,'resultado');
    const pct = meta ? (atual / meta) * 100 : 0;
    map[label].count++;
    map[label].pctSum += pct;
    map[label].displayParts.push(`${p.nome}: ${atual}/${meta} (${projPctFmt(pct)})`);
    map[label].projects.push(`${p.nome}: ${atual}/${meta} (${projPctFmt(pct)})`);
    map[label].projectObjs.push(p);
  });
  return Object.values(map).map(item => {
    const avg = item.count ? item.pctSum / item.count : 0;
    return {
      label:item.label,
      count:Math.round(avg),
      widthPct:Math.max(0, Math.min(100, avg)),
      displayValue:item.count === 1 ? item.displayParts[0].replace(/^.*?:\s*/, '') : `Média ${projPctFmt(avg)}`,
      projects:item.projects,
      projectObjs:item.projectObjs
    };
  }).sort((a,b) => b.count-a.count || a.label.localeCompare(b.label));
}

function projIndicadoresMetaChart(rows) {
  rows = IndicadoresImpactados.sortChart(rows);
  return `<div class="proj-v9-chart-card"><div class="proj-card-t">Resultado vs. Meta</div><div class="proj-v9-meta-list">${
    (rows||[]).length ? rows.map(r => {
      const meta = projIndicadorValor(r.ind,'meta');
      const atual = projIndicadorValor(r.ind,'resultado');
      const pctReal = meta ? (atual / meta) * 100 : 0;
      const pct = Math.max(0, Math.min(100, pctReal));
      const pctLabel = meta ? Math.round(pctReal) : 0;
      const format = value => Number(value).toLocaleString('pt-BR', {maximumFractionDigits:2});
      const context = [r.processo, r.ind.periodo, r.p.nome].filter(Boolean).join(' · ');
      return `<div class="proj-v9-meta-row" title="${projEsc(r.p.nome)}: ${atual} / ${meta}"><div class="proj-v9-meta-name">${projEsc(r.ind.nome||'Indicador')}<div class="proj-v9-meta-context">${projEsc(context)}</div></div><div class="proj-v9-meta-wrap"><div class="proj-v9-meta-values"><span class="proj-v9-meta-current">Resultado: <strong>${projEsc(format(atual))}</strong></span><span class="proj-v9-meta-target">Meta: <strong>${projEsc(format(meta))}</strong></span><span class="proj-v9-meta-pct">${meta ? `${projEsc(format(pctReal))}% da meta` : 'Sem meta'}</span></div><div class="proj-v9-meta-track"><div class="proj-v9-meta-fill" style="width:${pct}%"></div></div></div></div>`;
    }).join('') : '<div style="font-size:12px;color:var(--ink3)">Nenhum indicador encontrado para os filtros atuais.</div>'
  }</div></div>`;
}

function projRenderDashV9() {
  if(typeof projLoadListas === 'function') projLoadListas();
  const all = (PROJETOS||[]).filter(p => p.status === 'ativo');
  const cur = projGetDashFiltro();
  const opts = {
    patrocinador: projOptionsFromProjetos(all, p => projDimensoesProjeto(p).patrocinador),
    objetivo: projOptionsFromProjetos(all, p => projDimensoesProjeto(p).objetivos),
    macro: projOptionsFromProjetos(all, p => projDimensoesProjeto(p).macros),
    divisao: projOptionsFromProjetos(all, p => projDimensoesProjeto(p).divisao)
  };
  const sel = (id,label,arr,val) => `<div class="proj-fg" style="margin:0"><label class="proj-fl">${label}</label><select class="proj-fi" id="${id}" onchange="projRenderDashV9()"><option value="">Todos</option>${arr.map(v=>`<option value="${projEsc(v)}" ${v===val?'selected':''}>${projEsc(v)}</option>`).join('')}</select></div>`;
  const filtrados = projFiltrarProjetosV9(all);
  const filtrosEl = document.getElementById('proj-dash-filtros');
  if(filtrosEl) projSetHtml(filtrosEl, `<div class="proj-v9-filter-card"><div class="proj-card-t">Filtros</div><div class="proj-v9-filter-grid">${sel('proj-f-patrocinador','Patrocinador',opts.patrocinador,cur.patrocinador)}${sel('proj-f-objetivo','Objetivo Estratégico',opts.objetivo,cur.objetivo)}${sel('proj-f-macro','Macroprocesso',opts.macro,cur.macro)}${sel('proj-f-divisao','Divisão',opts.divisao,cur.divisao)}</div></div>`);


  const graficosEl = document.getElementById('proj-dash-graficos');
  if(graficosEl) {
    const inds = projIndicadoresLista(filtrados);
    const macrosSemProjeto = projUnlinkedValues(PROJ_MACROS, all, p => projDimensoesProjeto(p).macros);
    const objetivosSemProjeto = projUnlinkedValues(PROJ_OBJETIVOS, all, p => projDimensoesProjeto(p).objetivos);
    const indResumo = inds.slice(0,8).map(({p,ind}) => `<div class="proj-v9-mini-ind"><div><strong>${projEsc(ind.nome||'Indicador')}</strong><div style="font-size:11px;color:var(--ink3)">${projEsc(p.nome)}</div></div><div>${projEsc(projIndicadorResumo(ind))}</div></div>`).join('');
    projSetHtml(graficosEl, `<div class="proj-v9-chart-card"><div class="proj-card-t">Resumo de Indicadores</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px"><div><strong>${filtrados.length}</strong><span> Projetos</span></div><div><strong>${Math.round(filtrados.reduce((a,p)=>a+(p.percentual||0),0)/(filtrados.length||1))}%</strong><span> Média</span></div><div><strong>${inds.length}</strong><span> Indicadores</span></div><div><strong>${filtrados.filter(p=>projTarefasAtrasadasProjeto(p).length).length}</strong><span> Com atraso</span></div></div>${indResumo ? `<div class="proj-v9-mini-list">${indResumo}</div>` : '<div style="font-size:12px;color:var(--ink3);margin-top:.7rem">Nenhum indicador cadastrado nos filtros atuais.</div>'}</div><div class="proj-v9-chart-grid">${projChartBars('Projetos por Macroprocesso', projGroupCountWithProjects(filtrados, p => projDimensoesProjeto(p).macros), {unlinkedLabel:'Ver Macroprocessos sem Projeto vinculado', unlinkedItems:macrosSemProjeto, unlinkedKey:'macroprocessos-sem-projeto'})}${projChartBars('Projetos por Objetivo Estratégico', projGroupCountWithProjects(filtrados, p => projDimensoesProjeto(p).objetivos), {unlinkedLabel:'Ver Objetivos Estratégicos sem Projeto vinculado', unlinkedItems:objetivosSemProjeto, unlinkedKey:'objetivos-sem-projeto'})}${projChartBars('Projetos por Patrocinador', projGroupCountWithProjects(filtrados, p => projDimensoesProjeto(p).patrocinador))}${projChartBars('Projetos por Indicadores', projIndicadoresDashItems(inds))}</div>`);
  }
}

const _projIndicadoresProcessos = {kpis:[],processos:[],loaded:false,loading:false,error:'',unsubscribers:[]};

async function projLoadIndicadoresProcessos() {
  if(_projIndicadoresProcessos.loaded || _projIndicadoresProcessos.loading) return;
  _projIndicadoresProcessos.loading = true;
  _projIndicadoresProcessos.error = '';
  try {
    if(fbReady()) {
      const [indicators, mapped] = await Promise.all([kpisRepository.list(),processosRepository.list()]);
      _projIndicadoresProcessos.kpis = indicators.docs.map(doc => doc.data);
      _projIndicadoresProcessos.processos = mapped.docs.map(doc => doc.data);
      const {onSnapshot} = fb();
      if(onSnapshot && !_projIndicadoresProcessos.unsubscribers.length) {
        [[kpisRepository,'kpis'],[processosRepository,'processos']].forEach(([repository,field]) => {
          _projIndicadoresProcessos.unsubscribers.push(onSnapshot(repository.colRef(), snap => {
            const data=[];
            snap.forEach(doc=>data.push(doc.data()));
            _projIndicadoresProcessos[field]=data;
            if(_projCurrentPage === 'indicadores') projRenderIndicadoresPage();
          }, error => { _projIndicadoresProcessos.error=error.message; if(_projCurrentPage === 'indicadores') projRenderIndicadoresPage(); }));
        });
      }
    } else {
      _projIndicadoresProcessos.kpis = typeof kpis !== 'undefined' ? kpis : [];
      _projIndicadoresProcessos.processos = typeof processos !== 'undefined' ? processos : [];
    }
    _projIndicadoresProcessos.loaded=true;
  } catch(error) { _projIndicadoresProcessos.error=error.message; }
  finally { _projIndicadoresProcessos.loading=false; }
  if(_projCurrentPage === 'indicadores') projRenderIndicadoresPage();
}

function projRetryIndicadoresProcessos() {
  _projIndicadoresProcessos.loaded=false;
  _projIndicadoresProcessos.error='';
  void projLoadIndicadoresProcessos();
}

function projIndicadoresProcessosLista(project) {
  const linked = _projIndicadoresProcessos.kpis.filter(ind=>(ind.projeto_ids || []).some(id=>String(id)===String(project.id)));
  return IndicadoresImpactados.list(project,projArquiteturaAtual(),linked,_projIndicadoresProcessos.processos).map(row=>({
    ...row,p:project,ind:{...row.ind,meta:IndicadoresImpactados.meta(row.ind,_projIndicadoresProcessos.kpis),resultado:row.ind.sem_dado ? null : IndicadoresImpactados.number(row.ind.realizado ?? row.ind.resultado ?? row.ind.atual)}
  }));
}

function projIndicadoresProcessosHtml(project, rows) {
  if(!project) return '';
  let content;
  if(_projIndicadoresProcessos.loading) content='<p>Carregando indicadores vinculados ao projeto…</p>';
  else if(_projIndicadoresProcessos.error) content='<p>Não foi possível carregar os indicadores dos processos.</p><button type="button" class="proj-btn" onclick="projRetryIndicadoresProcessos()">Tentar novamente</button>';
  else if(!rows.length) content='<p>Nenhum indicador vinculado diretamente ao projeto para os filtros atuais. Associe indicadores ao projeto no menu Indicadores do módulo de Processos.</p>';
  else content=`<table class="proj-v9-table"><thead><tr><th>Processo</th><th>Indicador</th><th>Período</th><th>Meta</th><th>Resultado</th><th>Unidade</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${projEsc(r.processo)}<div style="font-size:11px;color:var(--ink3)">${projEsc(r.macro)}</div></td><td>${projEsc(r.ind.nome||'Indicador')}</td><td>${projEsc(r.ind.periodo||'—')}</td><td>${projEsc(r.ind.meta ?? '—')}</td><td>${projEsc(r.ind.resultado ?? '—')}</td><td>${projEsc(r.ind.unidade||'')}</td></tr>`).join('')}</tbody></table>`;
  return `<div class="proj-v9-chart-card" id="proj-ind-processos" style="grid-column:1 / -1"><div class="proj-card-t">Indicadores vinculados ao projeto</div><p style="font-size:12px;color:var(--ink3)">Indicadores associados diretamente ao projeto no módulo de Processos.</p>${content}</div>`;
}

function projIndicadoresTimelineLine(points, unit) {
  const data=points.map(ind=>({month:IndicadoresImpactados.period(ind.periodo),label:ind.periodo,value:IndicadoresImpactados.number(ind.resultado ?? ind.realizado ?? ind.atual)}));
  const first=data[0].month,last=data[data.length-1].month;
  const width=Math.max(720,(last-first)*80+110),height=280;
  const min=Math.min(0,...data.map(point=>point.value)),max=Math.max(0,...data.map(point=>point.value));
  const range=max-min || 1;
  const x=point=>last===first?width/2:70+(point.month-first)/(last-first)*(width-110);
  const y=value=>220-(value-min)/range*180;
  const format=value=>Number(value).toLocaleString('pt-BR',{maximumFractionDigits:2});
  const grid=Array.from({length:5},(_,i)=>{
    const value=min+range*i/4,pos=y(value);
    return `<line x1="70" y1="${pos}" x2="${width-40}" y2="${pos}" stroke="#dbe3ef"/><text x="60" y="${pos+4}" text-anchor="end" font-size="12" fill="#475569">${projEsc(format(value))}</text>`;
  }).join('');
  const labels=new Map(data.map(point=>[point.month,point]));
  return `<div class="proj-ind-timeline-scroll"><svg class="proj-ind-timeline-chart" viewBox="0 0 ${width} ${height}" style="min-width:${width}px" role="img" aria-label="${projEsc('Evolução mensal dos resultados'+(unit?' em '+unit:''))}"><text x="70" y="20" font-size="12" fill="#475569">${projEsc(unit || 'Resultado')}</text>${grid}<polyline fill="none" stroke="#175cd3" stroke-width="3" points="${data.map(point=>`${x(point)},${y(point.value)}`).join(' ')}"/>${data.map(point=>`<g><title>${projEsc(point.label+': '+format(point.value)+' '+(unit || ''))}</title><circle cx="${x(point)}" cy="${y(point.value)}" r="5" fill="#175cd3"/><text x="${x(point)}" y="${y(point.value)-12}" text-anchor="middle" font-size="12" font-weight="700" fill="#12345b">${projEsc(format(point.value))}</text></g>`).join('')}${[...labels.values()].map(point=>`<text x="${x(point)}" y="245" text-anchor="middle" font-size="12" fill="#475569">${projEsc(point.label)}</text>`).join('')}<text x="${width/2}" y="273" text-anchor="middle" font-size="12" fill="#475569">Mês / ano</text></svg></div>`;
}

function projIndicadoresTimelineHtml(project, rows) {
  const start = IndicadoresImpactados.scheduleStart(project);
  const heading = '<div class="proj-card-t">Resultados na linha do tempo</div>';
  let content;
  if(!project) content='<p>Selecione um projeto para visualizar a evolução dos indicadores.</p>';
  else if(!start) content='<p>Informe a data de início de uma atividade no cronograma/planner da etapa Execução/Monitoramento para visualizar a linha do tempo.</p>';
  else if(_projIndicadoresProcessos.loading) content='<p>Carregando resultados…</p>';
  else if(_projIndicadoresProcessos.error) content='<p>Não foi possível carregar os resultados. Tente novamente na seção de indicadores dos processos.</p>';
  else {
    const groups = new Map();
    IndicadoresImpactados.timeline(project,rows).forEach(row => {
      const key = JSON.stringify([row.macro,row.arq_id,row.ind.codigo || row.ind.nome,row.ind.unidade]);
      if(!groups.has(key)) groups.set(key,{row,points:[]});
      groups.get(key).points.push(row.ind);
    });
    content = `<p>A partir de ${projEsc(projFormatDate(start))}, início da primeira atividade do cronograma, inclusive após o término do projeto. Apenas meses com resultados registrados.</p>`;
    content += groups.size ? [...groups.values()].map(({row,points}) => `<div class="proj-ind-timeline-series"><strong>${projEsc(row.ind.nome || 'Indicador')}</strong><div class="proj-v9-meta-context">${projEsc(row.processo || project.nome)}${row.macro ? ` · ${projEsc(row.macro)}` : ''}</div>${projIndicadoresTimelineLine(points,row.ind.unidade)}</div>`).join('') : '<p>Nenhum resultado registrado no período do projeto para os filtros atuais.</p>';
  }
  return `<div class="proj-v9-chart-card" id="proj-ind-timeline" style="grid-column:1 / -1">${heading}${content}</div>`;
}

function projRenderIndicadoresPage() {
  projLoad();
  const el = document.getElementById('proj-indicadores-content');
  if(!el) return;
  const projetos = (PROJETOS||[]).filter(p => p.status === 'ativo');
  const fProj = document.getElementById('proj-ind-filter-proj')?.value || '';
  const fArea = document.getElementById('proj-ind-filter-area')?.value || '';
  const selectedProject=projetos.find(p=>String(p.id)===fProj);
  if(selectedProject && !_projIndicadoresProcessos.loaded && !_projIndicadoresProcessos.loading && !_projIndicadoresProcessos.error) void projLoadIndicadoresProcessos();
  let processRows=selectedProject ? projIndicadoresProcessosLista(selectedProject) : [];
  if(fArea) processRows=processRows.filter(row=>row.macro===fArea);
  let rows = projIndicadoresLista(projetos);
  if(fProj) rows = [];
  if(fArea) rows = rows.filter(r => projDimensoesProjeto(r.p).macros.includes(fArea));
  const projetosOpts = projetos.map(p => `<option value="${projEsc(String(p.id))}" ${String(p.id)===fProj?'selected':''}>${projEsc(p.nome)}</option>`).join('');
  const impactedMacros=projProcessosArquitetura().filter(node=>projetos.some(p=>(p.processos_impactados||[]).some(link=>String(link.macro_id)===node.macro_id && String(link.processo_id)===node.processo_id))).map(node=>node.macro);
  const macroOpts = [...new Set([...projOptionsFromProjetos(projetos, p => projDimensoesProjeto(p).macros),...impactedMacros])].sort(projTextCompare).map(v => `<option value="${projEsc(v)}" ${v===fArea?'selected':''}>${projEsc(v)}</option>`).join('');
  const chart = projIndicadoresMetaChart([...rows,...processRows.filter(row=>row.ind.meta!==null && row.ind.resultado!==null)]);
  const timeline = projIndicadoresTimelineHtml(selectedProject,[...processRows,...rows]);
  const table = rows.length ? `<table class="proj-v9-table"><thead><tr><th>Projeto</th><th>Indicador</th><th>Meta</th><th>Resultado</th><th>Unidade</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td>${projEsc(r.p.nome)}</td><td><input class="proj-fi" value="${projEsc(r.ind.nome||'')}" onchange="projUpdateIndicadorGlobal('${projEsc(String(r.p.id))}',${r.idx},'nome',this.value)"></td><td><input class="proj-fi" type="number" step="0.01" value="${projEsc(r.ind.meta||'')}" onchange="projUpdateIndicadorGlobal('${projEsc(String(r.p.id))}',${r.idx},'meta',this.value)"></td><td><input class="proj-fi" type="number" step="0.01" value="${projEsc(r.ind.resultado ?? r.ind.atual ?? '')}" onchange="projUpdateIndicadorGlobal('${projEsc(String(r.p.id))}',${r.idx},'resultado',this.value)"></td><td><input class="proj-fi" value="${projEsc(r.ind.unidade||'')}" onchange="projUpdateIndicadorGlobal('${projEsc(String(r.p.id))}',${r.idx},'unidade',this.value)"></td><td><button type="button" class="proj-btn danger" style="font-size:11px;padding:4px 8px" onclick="projRemoveIndicadorGlobal('${projEsc(String(r.p.id))}',${r.idx})">Remover</button></td></tr>`).join('')}</tbody></table>` : '<div class="proj-v9-chart-card" style="font-size:12px;color:var(--ink3)">Nenhum indicador encontrado para os filtros atuais.</div>';
  projSetHtml(el, `<div class="proj-v9-filter-card"><div class="proj-card-t">Filtros e edição</div><div class="proj-v9-filter-grid"><div class="proj-fg" style="margin:0"><label class="proj-fl">Projeto</label><select class="proj-fi" id="proj-ind-filter-proj" onchange="projRenderIndicadoresPage()"><option value="">Todos</option>${projetosOpts}</select></div><div class="proj-fg" style="margin:0"><label class="proj-fl">Macroprocesso</label><select class="proj-fi" id="proj-ind-filter-area" onchange="projRenderIndicadoresPage()"><option value="">Todos</option>${macroOpts}</select></div><div class="proj-fg" style="margin:0"><label class="proj-fl">Adicionar em projeto</label><select class="proj-fi" id="proj-ind-add-proj"><option value="">Selecione</option>${projetosOpts}</select></div><div style="display:flex;align-items:end"><button type="button" class="proj-btn primary" onclick="projAddIndicadorProjetoGlobal()">+ Indicador</button></div></div></div><div class="proj-v9-bi-grid"><div>${chart}</div><div class="proj-v9-chart-card"><div class="proj-card-t">Indicadores cadastrados</div>${table}</div>${timeline}${projIndicadoresProcessosHtml(selectedProject,processRows)}</div>`);
}

function projUpdateIndicadorGlobal(projId, idx, field, value) {
  projLoad();
  const p = PROJETOS.find(x => String(x.id) === String(projId));
  if(!p) return;
  if(!p.execucao) p.execucao = {};
  if(!p.execucao.indicadores) p.execucao.indicadores = [];
  if(!p.execucao.indicadores[idx]) return;
  p.execucao.indicadores[idx][field] = value;
  if(field === 'resultado') p.execucao.indicadores[idx].atual = value;
  projSave();
  projRenderIndicadoresPage();
}

function projAddIndicador() {
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  if(!proj.execucao) proj.execucao = { planner_link:'', percentual:0, reunioes:[], tarefas:[] };
  if(!proj.execucao.indicadores) proj.execucao.indicadores = [];
  proj.execucao.indicadores.push({ nome:'Novo indicador', meta:'', resultado:'', atual:'', unidade:'%', status:'Em acompanhamento' });
  projSave();
  projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
}

function projUpdateIndicador(idx, field, value) {
  projLoad();
  const proj = PROJETOS.find(p => String(p.id) === _projCurrentId);
  if(!proj?.execucao?.indicadores?.[idx]) return;
  const ind = proj.execucao.indicadores[idx];
  ind[field] = value;
  if(field === 'atual') ind.resultado = value;
  if(field === 'resultado') ind.atual = value;
  projSave();
}

function projAddIndicadorProjetoGlobal() {
  const projId = document.getElementById('proj-ind-add-proj')?.value;
  if(!projId) { projToast('Selecione um projeto para adicionar indicador.', '#d97706'); return; }
  projLoad();
  const p = PROJETOS.find(x => String(x.id) === String(projId));
  if(!p) return;
  if(!p.execucao) p.execucao = {};
  if(!p.execucao.indicadores) p.execucao.indicadores = [];
  p.execucao.indicadores.push({ nome:'Novo indicador', meta:100, resultado:0, atual:0, unidade:'%' });
  projSave();
  projRenderIndicadoresPage();
}

function projRemoveIndicadorGlobal(projId, idx) {
  projLoad();
  const p = PROJETOS.find(x => String(x.id) === String(projId));
  if(!p?.execucao?.indicadores) return;
  p.execucao.indicadores.splice(idx,1);
  projSave();
  projRenderIndicadoresPage();
}

function projConclusaoImagemEditorHtml(conc) {
  const urls = projConclusaoImagensToUrls(conc);
  const urlsText = urls.join('\n');
  const preview = urls.length
    ? `<div class="proj-v9-attach-grid">${urls.map(projConclusaoImagemPreviewItemHtml).join('')}</div>`
    : '<div style="font-size:11px;color:var(--ink3);margin-top:4px">Nenhuma URL de imagem informada.</div>';
  return `<div class="proj-form-section" style="background:#fff;margin-top:1rem"><div class="proj-form-section-title">URLs de Imagens do Memorial</div><div class="proj-fg"><label class="proj-fl">URL da imagem <span style="font-size:10px;color:var(--ink3)">(uma por linha)</span></label><textarea class="proj-fi" id="conc-imagens-urls" rows="3" placeholder="https://.../imagem.jpg">${projEsc(urlsText)}</textarea>${preview}</div></div>`;
}

function projTabConclusao(p) {
  const conc = p.conclusao || {};
  const selectedSuccess = conc.tipo === 'sucesso';
  const selectedCancel = conc.tipo === 'cancelamento';
  return `<div class="proj-form-section"><div class="proj-form-section-title">Fase 5: Conclusão</div><div class="proj-ib proj-ib-blue">Registre o encerramento oficial, o Memorial do Projeto, as notícias e os aprendizados.</div><div class="proj-fg"><label class="proj-fl">Tipo de Conclusão<span>*</span></label><div class="proj-conclusao-tipo"><div class="proj-conclusao-card ${selectedSuccess?'selected-success':''}" onclick="projSelecionarTipoConclusao('sucesso')"><div class="proj-conclusao-icon">OK</div><div class="proj-conclusao-label">Conclusão com Sucesso</div><div class="proj-conclusao-desc">Projeto entregue conforme planejado</div></div><div class="proj-conclusao-card ${selectedCancel?'selected-cancel':''}" onclick="projSelecionarTipoConclusao('cancelamento')"><div class="proj-conclusao-icon">X</div><div class="proj-conclusao-label">Cancelamento</div><div class="proj-conclusao-desc">Projeto encerrado sem conclusão das entregas</div></div></div></div><div class="proj-g2"><div class="proj-fg"><label class="proj-fl">Data de Conclusão/Cancelamento</label><input type="date" class="proj-fi" id="conc-data" value="${projEsc(conc.dt_conclusao||'')}"></div><div class="proj-fg"><label class="proj-fl">Link para o Termo de Aceite</label><input type="url" class="proj-fi" id="conc-termo" value="${projEsc(conc.link_termo_aceite||'')}" placeholder="https://..."></div></div><div class="proj-fg"><label class="proj-fl">História do Projeto</label><textarea class="proj-fi" id="conc-historia" rows="5" placeholder="Conte a história e trajetória do projeto, principais marcos, aprendizados...">${projEsc(conc.historia||'')}</textarea></div><div class="proj-fg"><label class="proj-fl">Links de Notícias / Resultados <span style="font-size:10px;color:var(--ink3)">(um por linha)</span></label><textarea class="proj-fi" id="conc-links" rows="3" placeholder="https://noticia1.gov.br&#10;https://noticia2.gov.br">${projEsc(conc.links_noticias||'')}</textarea></div>${projConclusaoImagemEditorHtml(conc)}<div class="proj-form-section" style="background:#f8fbff;margin-top:1rem"><div class="proj-form-section-title">Reunião de Lições Aprendidas</div><div class="proj-g2"><div class="proj-fg"><label class="proj-fl">Data da reunião</label><input type="date" class="proj-fi" id="conc-lic-data" value="${projEsc(conc.licoes_data||'')}"></div><div class="proj-fg"><label class="proj-fl">Participantes</label><input type="text" class="proj-fi" id="conc-lic-part" value="${projEsc(conc.licoes_participantes||'')}" placeholder="Nomes dos participantes"></div></div><div class="proj-g3"><div class="proj-fg"><label class="proj-fl">O que deu certo?</label><textarea class="proj-fi" id="conc-lic-certo" rows="4">${projEsc(conc.licoes_certo||'')}</textarea></div><div class="proj-fg"><label class="proj-fl">O que pode melhorar?</label><textarea class="proj-fi" id="conc-lic-melhorar" rows="4">${projEsc(conc.licoes_melhorar||'')}</textarea></div><div class="proj-fg"><label class="proj-fl">Sugestões / ideias</label><textarea class="proj-fi" id="conc-lic-ideias" rows="4">${projEsc(conc.licoes_ideias||'')}</textarea></div></div></div><div class="proj-btn-row"><button type="button" class="proj-btn teal" onclick="projSalvarConclusao()">Salvar</button>${p.status !== 'concluido' && p.status !== 'cancelado' ? `<button type="button" class="proj-btn primary" onclick="projFinalizarProjeto()">Encerrar Projeto</button>` : `<div style="font-size:12.5px;color:var(--teal);font-weight:600;align-self:center">Projeto encerrado</div>`}</div></div>`;
}


// ── V10: Estratégia como fonte oficial ───────────────────────────


function projBuildStatusReportHTML(){
  progLoad();
  const ativos = PROJETOS.filter(p => p.status === 'ativo');
  const concluidos = PROJETOS.filter(p => p.status === 'concluido');
  const data = new Date().toLocaleDateString('pt-BR');
  const ref = projRelatorioExecutivoRef();
  const media = ativos.length ? Math.round(ativos.reduce((a,p)=>a+(Number(p.percentual ?? p.execucao?.percentual ?? 0)),0)/ativos.length) : 0;
  const reportLogo = new URL(PROJ_CAGE_REPORT_LOGO, window.location.href).href;
  const eppLogo = new URL('epp-logo.png', window.location.href).href;
  const grupos = {};
  ativos.forEach(p => { const g = projProgramaNome(p); if(!grupos[g]) grupos[g] = []; grupos[g].push(p); });
  const projectBars = ativos.slice().sort((a,b)=>Number(b.percentual ?? b.execucao?.percentual ?? 0)-Number(a.percentual ?? a.execucao?.percentual ?? 0)).map(p => { const pct=Math.max(0,Math.min(100,Number(p.percentual ?? p.execucao?.percentual ?? 0))); return `<div class="sr-mini-row"><span>${projEsc(p.nome)}</span><div><i style="width:${pct}%"></i></div><strong>${pct}%</strong><em>${projEsc(p.gerente||'Gerente n\u00e3o informado')}</em></div>`; }).join('');
  const completedList = concluidos.length ? `<ul class="sr-completed-list">${concluidos.map(p => `<li><strong>${projEsc(p.nome)}</strong></li>`).join('')}</ul>` : '<p>Nenhum projeto conclu\u00eddo registrado.</p>';
  const totalProjetos = ativos.length + concluidos.length;
  const concluidoPct = totalProjetos ? Math.round((concluidos.length / totalProjetos) * 100) : 0;
  const execHtml = `<section class="sr-exec"><div class="sr-exec-head"><div><span>Resumo Gr\u00e1fico</span><h2>Vis\u00e3o imediata do portf\u00f3lio</h2></div></div><div class="sr-ring-row"><div class="sr-ring-card"><div class="sr-ring sr-ring-projects" style="--done:${concluidoPct};--active:${100-concluidoPct}"><strong>${totalProjetos}</strong><small>Projetos</small></div><div class="sr-ring-legend"><span><i class="blue"></i>${ativos.length} em andamento</span><span><i class="green"></i>${concluidos.length} conclu\u00eddos</span></div></div><div class="sr-ring-card"><div class="sr-ring sr-ring-average" style="--pct:${media}"><strong>${media}%</strong><small>M\u00e9dia de<br>conclus\u00e3o</small></div></div><div class="sr-ring-logo"><img src="${eppLogo}" alt="Escrit\u00f3rio de Projetos e Processos"></div></div><div class="sr-exec-grid"><div class="sr-exec-panel sr-exec-panel-wide"><h3>Projetos por conclus\u00e3o</h3>${projectBars || '<p>Nenhum projeto em andamento.</p>'}</div><div class="sr-exec-panel"><h3>Projetos conclu\u00eddos</h3>${completedList}</div></div></section>`;
  const projectIndicators = p => {
    const inds = p.execucao?.indicadores || [];
    if(!inds.length) return '';
    return `<div class="sr-project-indicators"><span>Indicadores</span>${inds.map(ind => {
      const meta = projIndicadorValor(ind,'meta');
      const atual = projIndicadorValor(ind,'resultado');
      const pct = meta ? (atual / meta) * 100 : 0;
      return `<div><strong>${projEsc(ind.nome||'Indicador')}</strong><em>${projEsc(atual)} / ${projEsc(meta)} · ${projPctFmt(pct)}</em></div>`;
    }).join('')}</div>`;
  };
  const projectOverdue = p => {
    const tarefas = projTarefasAtrasadasProjeto(p);
    if(!tarefas.length) return '';
    return `<div class="sr-project-overdue"><span>Tarefas atrasadas</span>${tarefas.slice(0,6).map(t => `<div><strong>${t._parentName ? `${projEsc(t._parentName)} / ` : ''}${projEsc(t.nome)}</strong><em>${projFormatDate(t.dt_fim)}</em></div>`).join('')}${tarefas.length>6?`<small>+${tarefas.length-6} tarefa(s) atrasada(s)</small>`:''}</div>`;
  };
  const groupsHtml = Object.entries(grupos).map(([prog,items]) => `<section class="sr-program-block"><h2 class="sr-program">${projEsc(prog)}</h2>${items.map(p => { const pct = Math.max(0,Math.min(100,Number(p.percentual ?? p.execucao?.percentual ?? 0))); const obs = projEsc(p.status_report_obs||'Sem sumário executivo registrado.').replaceAll('\n','<br>'); return `<section class="sr-card"><div class="sr-card-main"><div class="sr-title-row"><div><h3>${projEsc(p.nome)}</h3><div class="sr-sub">Projeto em andamento · ${projEsc(projFaseText(p))}</div></div><div class="sr-pct">${pct}%</div></div><div class="sr-progress"><div style="width:${pct}%"></div></div><div class="sr-info"><div><span>Patrocinador</span>${projEsc(p.patrocinador||'Não informado')}</div><div><span>Gerente</span>${projEsc(p.gerente||'Não informado')}</div><div><span>Gerente substituto</span>${projEsc(p.gerente_substituto||'Não informado')}</div><div><span>% de conclusão</span>${pct}%</div></div>${projectIndicators(p)}${projectOverdue(p)}</div><aside class="sr-note"><span>Sumário Executivo</span><p>${obs}</p></aside></section>`; }).join('')}</section>`).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório Executivo de Projetos</title><style>:root{--blue:#005a9c;--teal:#00bfb3;--ink:#172033;--muted:#5f6b80}@page{size:A4;margin:13mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:var(--ink);margin:0;background:#fff}.sr-page{background:#fff}.sr-cover{display:flex;align-items:center;justify-content:space-between;gap:22px;padding:18px 20px;margin-bottom:18px;border:1px solid #d8e6f5;border-left:8px solid var(--blue);background:linear-gradient(90deg,#f5fbff,#fff)}.sr-logo{width:185px;max-height:72px;object-fit:contain}.sr-kicker{font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--blue)}.sr-cover h1{margin:4px 0;font-size:27px;color:#0f2746}.sr-meta{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.sr-date{font-size:12px;color:var(--muted)}.sr-ref{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--blue);border:1px solid #cfe0f4;background:#f8fbff;border-radius:999px;padding:3px 9px}.sr-summary{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px}.sr-chip{border:1px solid #d9e5f5;border-radius:8px;padding:9px 12px;font-size:12px;background:#f8fbff}.sr-chip strong{font-size:20px;color:var(--blue);display:block}.sr-intro{border:1px solid #d9e5f5;border-radius:10px;background:#f8fbff;padding:12px 14px;margin-bottom:16px;font-size:12px;line-height:1.5;color:#334155}.sr-exec{border:1px solid #d9e5f5;border-radius:14px;padding:16px;margin:0 0 18px;background:linear-gradient(135deg,#f8fbff,#fff)}.sr-exec-head{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:12px}.sr-exec-head span{font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:var(--teal);font-weight:800}.sr-exec-head h2{font-size:18px;margin:3px 0 0;color:#0f2746}.sr-ring-row{display:flex;align-items:center;gap:18px;margin:0 0 14px}.sr-ring-card{display:flex;align-items:center;gap:10px}.sr-ring{width:112px;height:112px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;position:relative;flex:none}.sr-ring-average{background:conic-gradient(var(--teal) calc(var(--pct)*1%),#e7edf5 0)}.sr-ring-projects{background:conic-gradient(#00a89a calc(var(--done)*1%),#005a9c 0)}.sr-ring:before{content:'';position:absolute;inset:12px;border-radius:50%;background:#fff}.sr-ring strong,.sr-ring small{position:relative;z-index:1;line-height:1;text-align:center}.sr-ring strong{font-size:24px;color:var(--blue)}.sr-ring small{display:block;font-size:8.5px;color:var(--muted);text-transform:uppercase}.sr-ring-legend{font-size:10px;color:#334155;display:grid;gap:4px}.sr-ring-legend i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px}.sr-ring-legend .blue{background:#005a9c}.sr-ring-legend .green{background:#00a89a}.sr-ring-logo{margin-left:auto;min-width:180px;display:flex;align-items:center;justify-content:flex-end}.sr-ring-logo img{max-width:220px;max-height:86px;object-fit:contain}.sr-exec-grid{display:grid;grid-template-columns:1fr;gap:14px}.sr-exec-panel{border:1px solid #edf2f7;border-radius:10px;background:#fff;padding:12px}.sr-exec-panel h3{font-size:12px;margin:0 0 10px;color:#0f2746;text-transform:uppercase;letter-spacing:.06em}.sr-mini-row{display:grid;grid-template-columns:minmax(240px,1.25fr) 1.1fr 42px minmax(120px,.75fr);gap:8px;align-items:center;font-size:10.5px;margin:7px 0}.sr-completed-list{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 14px}.sr-completed-list li{border-bottom:1px solid #edf2f7;padding:6px 0;font-size:10.5px}.sr-completed-list strong{display:block;color:#0f2746}.sr-mini-row span{color:#334155;white-space:normal;overflow:visible;text-overflow:clip}.sr-mini-row div{height:8px;border-radius:99px;background:#e7edf5;overflow:hidden}.sr-mini-row i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--blue),var(--teal))}.sr-mini-row strong{font-size:10.5px;color:var(--blue);text-align:right}.sr-mini-row em{font-style:normal;color:#5f6b80;font-size:9.8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sr-top-list{margin:12px 0 0;padding:0;list-style:none;border-top:1px solid #edf2f7}.sr-top-list li{display:flex;justify-content:space-between;gap:8px;font-size:10.5px;padding:6px 0;border-bottom:1px solid #edf2f7}.sr-top-list span{color:#0b8f84;font-weight:800}.sr-program-block{margin-top:34px}.sr-program{font-size:16px;color:var(--blue);border-bottom:2px solid var(--teal);padding-bottom:5px;margin:0 0 12px}.sr-card{display:grid;grid-template-columns:.95fr 1.25fr;gap:16px;border:1px solid #d9e2ef;border-radius:10px;padding:14px;margin-bottom:12px;break-inside:avoid;background:#fff}.sr-title-row{display:flex;align-items:flex-start;gap:10px}.sr-title-row>div:first-child{flex:1}h3{font-size:15px;margin:0;color:#0f2746}.sr-sub{font-size:10.5px;color:#6b7588;margin-top:2px}.sr-pct{font-size:26px;font-weight:800;color:var(--teal)}.sr-progress{height:8px;border-radius:99px;background:#e7edf5;overflow:hidden;margin:12px 0}.sr-progress div{height:100%;min-width:2px;background:linear-gradient(90deg,var(--blue),var(--teal))}.sr-info{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sr-info div{font-size:12px;border-top:1px solid #edf2f7;padding-top:6px}.sr-info span,.sr-note span,.sr-project-indicators>span,.sr-project-overdue>span{display:block;font-size:9px;color:var(--blue);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}.sr-project-indicators,.sr-project-overdue{margin-top:10px;border-top:1px solid #edf2f7;padding-top:7px}.sr-project-indicators div,.sr-project-overdue div{display:flex;justify-content:space-between;gap:8px;font-size:11px;padding:3px 0}.sr-project-indicators em{font-style:normal;color:#0b8f84;font-weight:700}.sr-project-overdue{background:#fffaf2;border:1px solid #fde2b5;border-radius:8px;padding:7px 8px}.sr-project-overdue em{font-style:normal;color:#b45309;font-weight:700;white-space:nowrap}.sr-project-overdue small{display:block;color:#b45309;font-size:10px;margin-top:3px}.sr-note{border-left:3px solid #f59e0b;padding-left:12px}.sr-note p{font-size:12px;line-height:1.45;margin:0;color:#334155}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="sr-page"><header class="sr-cover"><div><div class="sr-kicker">CAGE-RS · Escritório de Projetos e Processos</div><h1>Relatório Executivo de Projetos</h1><div class="sr-meta"><span class="sr-date">Emitido em ${data}</span><span class="sr-ref">ref. ${ref}</span></div></div><img class="sr-logo" src="${reportLogo}" alt="CAGE"></header><section class="sr-intro">Este relatório foi gerado a partir dos dados do Sistema Integrado de Gestão Estratégica (SIGA), módulo de Projetos.</section>${execHtml}${groupsHtml||'<div>Nenhum projeto em andamento encontrado.</div>'}</div><script>setTimeout(function(){window.print();},450);<\/script></body></html>`;
}

function projStrategyBaseName(v) {
  return String(v||'').replace(/^\s*\[[^\]]+\]\s*/,'').trim();
}

function projNormalizeStrategyList(list) {
  const byBase = {};
  (list||[]).map(v => String(v||'').trim()).filter(Boolean).forEach(v => {
    const base = projStrategyBaseName(v).toLowerCase();
    if(!byBase[base]) byBase[base] = v;
    else if(/^\s*\[[^\]]+\]/.test(v) && !/^\s*\[[^\]]+\]/.test(byBase[base])) byBase[base] = v;
  });
  return Object.values(byBase).sort(projTextCompare);
}

function projNormalizeStrategyLists() {
  if(typeof projLoadListas === 'function') projLoadListas();
  const oldO = JSON.stringify(PROJ_OBJETIVOS||[]);
  projSyncArquitetura();
  PROJ_OBJETIVOS = projNormalizeStrategyList(ObjetivosEstrategicos.normalizeCatalog(PROJ_OBJETIVOS));
  if(isEP() && oldO !== JSON.stringify(PROJ_OBJETIVOS)) projSaveListas();
}

function projCanonicalStrategyValue(v, list) {
  if(list === PROJ_OBJETIVOS) return ObjetivosEstrategicos.canonical(v, list);
  const clean = String(v||'').trim();
  if(!clean) return '';
  if((list||[]).includes(clean)) return clean;
  const base = projStrategyBaseName(clean).toLowerCase();
  return (list||[]).find(x => projStrategyBaseName(x).toLowerCase() === base) || clean;
}

function projDimensoesProjeto(p) {
  projNormalizeStrategyLists();
  const objetivos = projMultiValues(p.objetivos_estrategicos, p.ideacao?.objetivo_estrategico)
    .map(v => projCanonicalStrategyValue(v, PROJ_OBJETIVOS)).filter(Boolean);
  const macros = projMultiValues(p.macroprocessos, p.macroprocesso)
    .map(v => projCanonicalStrategyValue(v, PROJ_MACROS)).filter(Boolean);
  return {
    patrocinador:p.patrocinador||'',
    objetivo:objetivos[0]||'',
    objetivos:[...new Set(objetivos)],
    macro:macros[0]||'',
    macros:[...new Set(macros)],
    divisao:p.divisao||''
  };
}

function projProjetosRelacionados(kind, value) {
  projLoad();
  return (PROJETOS||[]).filter(p => {
    const d = projDimensoesProjeto(p);
    return kind === 'macro' ? d.macros.includes(value) : d.objetivos.includes(value);
  });
}


function projStrategyParts(value) {
  const raw = String(value||'').trim();
  const m = raw.match(/^\[([^\]]+)\](.*)/);
  let group = m ? m[1] : 'Outros';
  let name = (m ? m[2].trim() : raw) || raw;
  if(group.toLowerCase() === 'finalístico') group = 'Finalísticos';
  return { group, name };
}

function projStrategyGroupMeta(kind, group) {
  const key = String(group||'Outros').toLowerCase();
  const objetivo = {
    resultados: {label:'Resultados para a Sociedade', order:1},
    'articulação': {label:'Articulação e Relacionamento', order:2},
    articulacao: {label:'Articulação e Relacionamento', order:2},
    processos: {label:'Processos Internos', order:3},
    aprendizado: {label:'Aprendizado e Crescimento', order:4}
  };
  const macro = {
    'gestão': {label:'Gestão', order:1},
    gestao: {label:'Gestão', order:1},
    'finalístico': {label:'Finalísticos', order:2},
    'finalísticos': {label:'Finalísticos', order:2},
    finalistico: {label:'Finalísticos', order:2},
    finalisticos: {label:'Finalísticos', order:2},
    apoio: {label:'Apoio', order:3}
  };
  const meta = (kind === 'macro' ? macro : objetivo)[key];
  return meta || {label:group || 'Outros', order:99};
}

function projStrategyProjectLinks(kind, value) {
  const ps = projProjetosRelacionados(kind, value);
  return ps.length ? ps.map(p => `<a href="#" class="proj-strategy-project" onclick="event.preventDefault();projAbrirDetalhe('${projEsc(String(p.id))}', true)">${projIconHtml(p)}<span>${projEsc(p.nome||'Projeto sem nome')}</span></a>`).join('') : '<div class="proj-strategy-empty">-</div>';
}

function projStrategyGroupIcon(kind, group) {
  const key = String(group||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const icons = {
    resultados:'<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="14" r="5"/><path d="M14 34c1.7-6 5.1-9 10-9s8.3 3 10 9"/><path d="M11 22c-3.2 1.8-5.2 5-6 9M37 22c3.2 1.8 5.2 5 6 9"/><circle cx="10" cy="18" r="3.8"/><circle cx="38" cy="18" r="3.8"/></svg>',
    articulacao:'<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="13" cy="24" r="6"/><circle cx="35" cy="14" r="6"/><circle cx="35" cy="34" r="6"/><path d="M18.4 21.6l11.2-5.1M18.4 26.4l11.2 5.1"/></svg>',
    processos:'<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="18" cy="19" r="6"/><circle cx="31" cy="31" r="6"/><path d="M18 9v4M18 25v4M8 19h4M24 19h4M27 24l-3-3M31 21v4M31 37v4M21 31h4M37 31h4"/></svg>',
    aprendizado:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 32c8-1 14-5.5 18-16"/><path d="M27 16h9v9"/><path d="M13 36h22"/><path d="M13 36V24M24 36V18M35 36V12"/></svg>',
    gestao:'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="14" width="28" height="22" rx="4"/><path d="M18 14v-4h12v4M17 24h14M17 30h8"/></svg>',
    finalistico:'<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="15"/><circle cx="24" cy="24" r="8"/><circle cx="24" cy="24" r="2"/><path d="M35 13l4-4M39 9v8M39 9h-8"/></svg>',
    finalisticos:'<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="15"/><circle cx="24" cy="24" r="8"/><circle cx="24" cy="24" r="2"/><path d="M35 13l4-4M39 9v8M39 9h-8"/></svg>',
    apoio:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 28v-9a10 10 0 0120 0v9"/><path d="M11 28h8v8h-8zM29 28h8v8h-8z"/><path d="M19 36h10"/></svg>'
  };
  return icons[key] || '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 8l14 8v16l-14 8-14-8V16z"/><path d="M24 8v16l14 8M24 24L10 16"/></svg>';
}

function projStrategyVisual(kind, values, title, className) {
  const groups = {};
  (values||[]).forEach(v => {
    const parts = projStrategyParts(v);
    if(!groups[parts.group]) groups[parts.group] = [];
    groups[parts.group].push({ value:v, name:parts.name });
  });
  const groupsHtml = Object.entries(groups).sort(([a],[b]) => projStrategyGroupMeta(kind,a).order - projStrategyGroupMeta(kind,b).order).map(([group,items]) => {
    const meta = projStrategyGroupMeta(kind, group);
    return `<section class="proj-strategy-band"><div class="proj-strategy-side"><div class="proj-strategy-side-icon">${projStrategyGroupIcon(kind, group)}</div><div class="proj-strategy-band-title">${projEsc(meta.label)}</div></div><div class="proj-strategy-band-main"><div class="proj-strategy-band-head">${projEsc(meta.label)}</div><div class="proj-strategy-items">${items.map(item => `<article class="proj-strategy-node"><h4>${projEsc(item.name)}</h4><div class="proj-strategy-projects">${projStrategyProjectLinks(kind,item.value)}</div></article>`).join('')}</div></div></section>`;
  }).join('');
  return `<div class="proj-strategy-visual ${className||''}"><div class="proj-strategy-title">${projEsc(title)}</div>${groupsHtml || '<div style="font-size:12px;color:var(--ink3)">Nenhum item cadastrado.</div>'}</div>`;
}

function projToggleStrategyEditor(kind) {
  const panel = document.getElementById(`proj-strategy-editor-${kind}`);
  if(!panel) return;
  panel.classList.toggle('open');
}


function projRenderEstrategiaPage() {
  projLoad();
  projNormalizeStrategyLists();
  const el = document.getElementById('proj-estrategia-content');
  if(!el) return;
  const editors = isEP() ? `<div class="proj-v10-strategy-grid"><div class="proj-v9-chart-card"><div class="proj-card-t">Macroprocessos</div><p>Os macroprocessos são cadastrados na arquitetura do módulo de Processos.</p><a class="proj-btn" href="processos.html">Abrir Processos</a></div><div class="proj-v9-chart-card"><div class="proj-strategy-editor-head"><div class="proj-card-t">Editar Objetivos Estratégicos</div><button type="button" class="proj-btn" onclick="projToggleStrategyEditor('objetivo')">Abrir edição</button></div><div id="proj-strategy-editor-objetivo" class="proj-strategy-editor-body"><textarea id="estrat-objetivos" class="proj-fi proj-v10-strategy-text">${projEsc((PROJ_OBJETIVOS||[]).join('\n'))}</textarea><div class="proj-btn-row"><button type="button" class="proj-btn primary" onclick="projSalvarEstrategia('objetivo')">Salvar Objetivos Estratégicos</button></div></div></div></div>` : '';
  projSetHtml(el, `${projStrategyVisual('objetivo', PROJ_OBJETIVOS||[], 'Mapa Estratégico', 'objetivos')}${projStrategyVisual('macro', PROJ_MACROS||[], 'Cadeia de Valor', 'macros')}${editors}`);
}

function projSalvarEstrategia(kind) {
  if(kind === 'macro') { projToast('Edite os macroprocessos na arquitetura de Processos.', '#d97706'); return; }
  if(!projEnsureWriteAll('Apenas EPP pode editar Macroprocessos e Objetivos Estratégicos.')) return;
  const lines = (document.getElementById('estrat-objetivos')?.value||'').split(/\n+/).map(s => s.trim()).filter(Boolean);
  PROJ_OBJETIVOS = projNormalizeStrategyList(lines);
  projSaveListas();
  projToast('Estratégia atualizada.');
  projRenderEstrategiaPage();
}

function projPopulateVinculacoes() {
  projNormalizeStrategyLists();
  projLoad();
  let proj = PROJETOS.find(function(p){return String(p.id)===_projCurrentId;});
  if(!proj) return;
  let ml = document.getElementById('aprov-macro-list');
  if(ml) projSetHtml(ml, (proj.macroprocessos||[]).map(function(m,i){let v=projCanonicalStrategyValue(m,PROJ_MACROS);return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;padding:4px 8px;background:#f0f4ff;border-radius:6px;font-size:12px;color:#1a2540"><span style="flex:1">'+projEsc(v)+'</span><button type="button" style="background:none;border:none;cursor:pointer;color:#b91c1c;font-size:14px;padding:0 4px" onclick="projRemoverMacro('+i+')">✕</button></div>';}).join(''));
  let ms = document.getElementById('aprov-macro-sel');
  if(ms) projSetHtml(ms, '<option value="">Selecione...</option>' + projArquiteturaAtual().map(function(m){return '<option value="'+projEsc(String(m.id))+'">'+projEsc(m.nome)+'</option>';}).join(''));
  let ol = document.getElementById('aprov-obj-list');
  if(ol) projSetHtml(ol, (proj.objetivos_estrategicos||[]).map(function(o,i){let v=projCanonicalStrategyValue(o,PROJ_OBJETIVOS);return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;padding:4px 8px;background:var(--teal-l);border-radius:6px;font-size:12px;color:#1a2540"><span style="flex:1">'+projEsc(v)+'</span><button type="button" style="background:none;border:none;cursor:pointer;color:#b91c1c;font-size:14px;padding:0 4px" onclick="projRemoverObj('+i+')">✕</button></div>';}).join(''));
  let os = document.getElementById('aprov-obj-sel');
  if(os) projSetHtml(os, '<option value="">Selecione...</option>' + PROJ_OBJETIVOS.map(function(o){return '<option value="'+projEsc(o)+'">'+projEsc(o)+'</option>';}).join(''));
  const filter = document.getElementById('aprov-impacto-macro');
  if(filter) {
    const selected = filter.value;
    projSetHtml(filter, '<option value="">Todos os macroprocessos</option>' + projArquiteturaAtual().map(m => '<option value="' + projEsc(String(m.id)) + '">' + projEsc(m.nome) + '</option>').join(''));
    filter.value = selected;
  }
  projPopulateProcessosImpactados();

}


function projAddObjNovo(){if(!projEnsureWriteAll('Apenas EPP pode editar Macroprocessos e Objetivos Estratégicos.'))return;let inp=document.getElementById('aprov-obj-novo');if(!inp||!inp.value.trim()){projToast('Digite o objetivo.','#d97706');return;}let v=inp.value.trim();PROJ_OBJETIVOS=projNormalizeStrategyList([].concat(PROJ_OBJETIVOS||[],[v]));projSaveListas();v=projCanonicalStrategyValue(v,PROJ_OBJETIVOS);projLoad();let p=PROJETOS.find(function(x){return String(x.id)===_projCurrentId;});if(!p)return;if(!p.objetivos_estrategicos)p.objetivos_estrategicos=[];if(!p.objetivos_estrategicos.includes(v))p.objetivos_estrategicos.push(v);projSave();inp.value='';projPopulateVinculacoes();}

function projNewsTitleFromUrl(url, i) {
  try {
    const u = new URL(url);
    const slug = decodeURIComponent((u.pathname.split('/').filter(Boolean).pop() || '').replace(/\.[a-z0-9]+$/i, ''));
    const title = slug.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
    if(title) return title.charAt(0).toUpperCase() + title.slice(1);
    return `Notícia ${i + 1} - ${u.hostname.replace(/^www\./, '')}`;
  } catch(e) {
    return `Notícia ${i + 1}`;
  }
}

function projNewsHost(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch(e) { return url; }
}

function projMemorialNewsEmbeds(conc) {
  const links = String(conc.links_noticias||'').split(/\n+/).map(s => s.trim()).filter(Boolean);
  if(!links.length) return '';
  return `<div class="proj-form-section" style="margin-top:1rem"><div class="proj-form-section-title">Notícias e Resultados</div><div class="proj-v12-news-list">${links.map((url,i) => `<div class="proj-v12-news-card"><div class="proj-v12-news-copy"><div class="proj-v12-news-title">${projEsc(projNewsTitleFromUrl(url, i))}</div><div class="proj-v12-news-url">${projEsc(projNewsHost(url))}</div></div><a class="proj-btn primary" href="${projEsc(url)}" target="_blank" rel="noopener">Abrir em nova guia</a></div>`).join('')}</div></div>`;
}

function projMemorialImagesHtml(conc) {
  const imagens = conc.imagens || [];
  if(!imagens.length) return '<div style="font-size:12px;color:var(--ink3)">Nenhuma imagem anexada ao Memorial.</div>';
  if(imagens.length === 1) {
    const img = imagens[0];
    return `<div class="proj-v12-single-image">${projMemorialImagemLinkHtml(img, false)}</div>`;
  }
  return `<div class="proj-v12-carousel" id="proj-memorial-carousel" data-index="0"><button type="button" class="proj-v12-carousel-btn prev" onclick="projMemorialCarouselStep(-1)" aria-label="Imagem anterior">‹</button><div class="proj-v12-carousel-stage">${imagens.map((img, i) => projMemorialImagemLinkHtml(img, i === 0, true)).join('')}</div><button type="button" class="proj-v12-carousel-btn next" onclick="projMemorialCarouselStep(1)" aria-label="Próxima imagem">›</button><div class="proj-v12-carousel-counter">1 / ${imagens.length}</div></div>`;
}

function projMemorialCarouselStep(delta) {
  const carousel = document.getElementById('proj-memorial-carousel');
  if(!carousel) return;
  const slides = Array.from(carousel.querySelectorAll('.proj-v12-carousel-slide'));
  if(!slides.length) return;
  let idx = Number(carousel.dataset.index || 0);
  idx = (idx + delta + slides.length) % slides.length;
  carousel.dataset.index = String(idx);
  slides.forEach((slide, i) => slide.classList.toggle('on', i === idx));
  const counter = carousel.querySelector('.proj-v12-carousel-counter');
  if(counter) counter.textContent = `${idx + 1} / ${slides.length}`;
}

function projRenderMemorial(p) {
  const conc = p.conclusao || {};
  const content = document.getElementById('proj-detalhe-content');
  if(!content) return;
  const licoes = [conc.licoes_data, conc.licoes_participantes, conc.licoes_certo, conc.licoes_melhorar, conc.licoes_ideias].some(Boolean);
  const imgs = projMemorialImagesHtml(conc);
  projSetHtml(content, `<div class="proj-ph"><div><div class="proj-ph-t">Memorial do Projeto</div><div class="proj-ph-s">${projEsc(p.nome||'Projeto')}</div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="proj-btn primary" style="font-size:12px;padding:5px 11px" onclick="projAbrirDetalhe('${projEsc(String(p.id))}', true)">Ver Workflow</button><button type="button" class="proj-btn" style="font-size:12px;padding:5px 11px" onclick="projGo('portfolio',document.getElementById('pnb-portfolio'))">Voltar ao Portfólio</button></div></div><div class="proj-form-section"><div class="proj-form-section-title">Informações Gerais</div><div class="proj-g3"><div><div class="proj-fl">Projeto</div><strong>${projEsc(p.nome||'')}</strong></div><div><div class="proj-fl">Patrocinador</div><strong>${projEsc(p.patrocinador||'Não informado')}</strong></div><div><div class="proj-fl">Gerente</div><strong>${projEsc(p.gerente||'Não informado')}</strong></div></div></div><div class="proj-form-section"><div class="proj-form-section-title">História do Projeto</div><div style="font-size:13px;color:#334155;line-height:1.7;white-space:pre-wrap">${projEsc(conc.historia||'História ainda não registrada.')}</div></div>${projMemorialNewsEmbeds(conc)}<div class="proj-form-section" style="margin-top:1rem"><div class="proj-form-section-title">Imagens do Memorial</div>${imgs}</div>${licoes ? `<div class="proj-form-section" style="margin-top:1rem"><div class="proj-form-section-title">Lições Aprendidas</div><div class="proj-g2"><div><div class="proj-fl">Data da reunião</div><strong>${projFormatDate(conc.licoes_data)||'Não informada'}</strong></div><div><div class="proj-fl">Participantes</div><strong>${projEsc(conc.licoes_participantes||'Não informado')}</strong></div></div><div class="proj-g3" style="margin-top:1rem"><div><div class="proj-fl">O que deu certo?</div><div style="white-space:pre-wrap">${projEsc(conc.licoes_certo||'')}</div></div><div><div class="proj-fl">O que pode melhorar?</div><div style="white-space:pre-wrap">${projEsc(conc.licoes_melhorar||'')}</div></div><div><div class="proj-fl">Sugestões / ideias</div><div style="white-space:pre-wrap">${projEsc(conc.licoes_ideias||'')}</div></div></div></div>` : ''}`);
}

// ── Governança do portfólio (CGP) ───────────────────────────────
let _projGovIdSequence = 0;
function projGovFixData(data) {
  return {
    demandas: Array.isArray(data?.demandas) ? data.demandas : [],
    reunioes: Array.isArray(data?.reunioes) ? data.reunioes : []
  };
}

function projGovLoad() {
  if(fbReady()) return;
  try {
    PROJ_GOVERNANCA = projGovFixData(JSON.parse(localStorage.getItem(PROJ_GOV_STORAGE_KEY) || '{}'));
  } catch(_e) {
    PROJ_GOVERNANCA = projGovFixData({});
  }
}

function projGovSave() {
  if(!projEnsureWriteAll('Apenas EPP pode alterar os registros de governança.')) return false;
  try { localStorage.setItem(PROJ_GOV_STORAGE_KEY, JSON.stringify(PROJ_GOVERNANCA)); } catch(_e) {}
  projFbAutoSave('governanca').catch(()=>{});
  return true;
}

function projGovNewId(prefix) {
  _projGovIdSequence += 1;
  return prefix + '-' + Date.now().toString(36) + '-' + _projGovIdSequence.toString(36);
}

function projGovValue(id) {
  return document.getElementById(id)?.value.trim() || '';
}

function projGovStatusLabel(status) {
  const labels = { recebida:'Recebida', em_analise:'Em análise', pautada:'Pautada', deliberada:'Deliberada' };
  return labels[status] || status;
}

function projGovDecisionLabel(decision) {
  const labels = { incluir:'Inclusão aprovada', replanejar:'Replanejamento', suspender:'Suspensão', encerrar:'Encerramento', diligencia:'Diligência', rejeitar:'Não inclusão' };
  return labels[decision] || decision;
}

function projGovDemandOptions(selectedId) {
  const available = PROJ_GOVERNANCA.demandas.filter(d => d.status !== 'deliberada' || String(d.id) === String(selectedId));
  const options = available.map(d => '<option value="' + projEsc(d.id) + '">' + projEsc(d.titulo) + '</option>').join('');
  return '<option value="">Deliberação geral do portfólio</option>' + options;
}

function projRenderGovernancaPage() {
  projGovLoad();
  const el = document.getElementById('proj-governanca-content');
  if(!el) return;
  const demandas = PROJ_GOVERNANCA.demandas;
  const reunioes = PROJ_GOVERNANCA.reunioes;
  const pendentes = demandas.filter(d => d.status !== 'deliberada').length;
  const deliberacoes = reunioes.reduce((total, r) => total + (r.deliberacoes || []).length, 0);
  const html = [
    '<div class="proj-gov-stats">',
    '<div class="proj-stat s-amber"><div class="proj-stat-n">', pendentes, '</div><div class="proj-stat-l">Demandas pendentes</div></div>',
    '<div class="proj-stat s-blue"><div class="proj-stat-n">', reunioes.length, '</div><div class="proj-stat-l">Reuniões do CGP</div></div>',
    '<div class="proj-stat s-green"><div class="proj-stat-n">', deliberacoes, '</div><div class="proj-stat-l">Deliberações registradas</div></div>',
    '</div>',
    '<div class="proj-gov-tabs" role="tablist">',
    '<button type="button" class="proj-btn primary" onclick="projGovShowPanel(\'demandas\',this)">Demandas de projetos</button>',
    '<button type="button" class="proj-btn" onclick="projGovShowPanel(\'reunioes\',this)">Reuniões e atas</button>',
    '</div>',
    '<div id="proj-gov-panel-demandas"></div><div id="proj-gov-panel-reunioes" hidden></div>'
  ].join('');
  projSetHtml(el, html);
  projGovRenderDemandas();
  projGovRenderReunioes();
}

function projGovShowPanel(panel, button) {
  const demands = document.getElementById('proj-gov-panel-demandas');
  const meetings = document.getElementById('proj-gov-panel-reunioes');
  if(!demands || !meetings) return;
  demands.hidden = panel !== 'demandas';
  meetings.hidden = panel !== 'reunioes';
  button?.parentElement?.querySelectorAll('button').forEach(btn => btn.classList.toggle('primary', btn === button));
}

function projGovRenderDemandas() {
  const el = document.getElementById('proj-gov-panel-demandas');
  if(!el) return;
  const rows = PROJ_GOVERNANCA.demandas.slice().sort((a,b) => (b.recebida_em || '').localeCompare(a.recebida_em || '')).map(d => [
    '<tr><td><strong>', projEsc(d.titulo), '</strong><div class="proj-gov-muted">', projEsc(d.descricao), '</div></td>',
    '<td>', projEsc(d.solicitante), '</td><td>', projFormatDate(d.recebida_em), '</td>',
    '<td><span class="proj-gov-badge ', projEsc(d.status), '">', projEsc(projGovStatusLabel(d.status)), '</span></td>',
    '<td><button type="button" class="proj-btn danger ep-only" onclick="projGovDeleteDemand(\'', projEsc(d.id), '\')">Excluir</button></td></tr>'
  ].join('')).join('');
  const empty = '<tr><td colspan="5" class="proj-gov-empty">Nenhuma demanda recebida.</td></tr>';
  projSetHtml(el, [
    '<div class="proj-form-section ep-only"><div class="proj-form-section-title">Registrar demanda recebida pelo EPP</div>',
    '<div class="proj-g3"><div class="proj-fg"><label class="proj-fl" for="gov-dem-titulo">Projeto ou programa proposto<span>*</span></label><input class="proj-fi" id="gov-dem-titulo"></div>',
    '<div class="proj-fg"><label class="proj-fl" for="gov-dem-solicitante">Solicitante<span>*</span></label><input class="proj-fi" id="gov-dem-solicitante"></div>',
    '<div class="proj-fg"><label class="proj-fl" for="gov-dem-data">Data de recebimento<span>*</span></label><input type="date" class="proj-fi" id="gov-dem-data" value="', projLocalDateKey(), '"></div></div>',
    '<div class="proj-fg"><label class="proj-fl" for="gov-dem-descricao">Descrição da demanda<span>*</span></label><textarea class="proj-fi" id="gov-dem-descricao" rows="3"></textarea></div>',
    '<button type="button" class="proj-btn primary" onclick="projGovAddDemand()">Registrar demanda</button></div>',
    '<div class="proj-card"><div class="proj-card-t">Demandas para inclusão no portfólio estratégico</div><div class="proj-gov-table-wrap"><table class="proj-gov-table"><thead><tr><th>Demanda</th><th>Solicitante</th><th>Recebida em</th><th>Situação</th><th></th></tr></thead><tbody>', rows || empty, '</tbody></table></div></div>'
  ].join(''));
  projApplyPermissions();
}

function projGovAddDemand() {
  if(!projEnsureWriteAll()) return;
  const titulo = projGovValue('gov-dem-titulo');
  const solicitante = projGovValue('gov-dem-solicitante');
  const recebida = projGovValue('gov-dem-data');
  const descricao = projGovValue('gov-dem-descricao');
  if(!titulo || !solicitante || !recebida || !descricao) { projToast('Preencha os campos obrigatórios.', '#d97706'); return; }
  PROJ_GOVERNANCA.demandas.push({ id:projGovNewId('dem'), titulo, solicitante, recebida_em:recebida, descricao, status:'recebida' });
  projGovSave();
  projRenderGovernancaPage();
  projToast('Demanda registrada.');
}

function projGovDeleteDemand(id) {
  if(!projEnsureWriteAll()) return;
  const linked = PROJ_GOVERNANCA.reunioes.some(r => (r.deliberacoes || []).some(d => String(d.demanda_id) === String(id)));
  if(linked) { projToast('A demanda já possui deliberação vinculada.', '#d97706'); return; }
  projConfirmar('Excluir esta demanda?', () => { PROJ_GOVERNANCA.demandas = PROJ_GOVERNANCA.demandas.filter(d => String(d.id) !== String(id)); projGovSave(); projRenderGovernancaPage(); });
}

function projGovRenderReunioes() {
  const el = document.getElementById('proj-gov-panel-reunioes');
  if(!el) return;
  const cards = PROJ_GOVERNANCA.reunioes.slice().sort((a,b) => (b.data || '').localeCompare(a.data || '')).map(projGovMeetingCard).join('');
  projSetHtml(el, [
    '<div class="proj-form-section ep-only"><div class="proj-form-section-title">Registrar reunião trimestral do CGP</div>',
    '<div class="proj-g3"><div class="proj-fg"><label class="proj-fl" for="gov-reu-data">Data<span>*</span></label><input type="date" class="proj-fi" id="gov-reu-data"></div>',
    '<div class="proj-fg"><label class="proj-fl" for="gov-reu-trimestre">Trimestre<span>*</span></label><select class="proj-fi" id="gov-reu-trimestre">', projQuarterOptionsHtml(), '</select></div>',
    '<div class="proj-fg"><label class="proj-fl" for="gov-reu-local">Local ou link</label><input class="proj-fi" id="gov-reu-local"></div></div>',
    '<div class="proj-fg"><label class="proj-fl" for="gov-reu-participantes">Participantes<span>*</span></label><textarea class="proj-fi" id="gov-reu-participantes" rows="2" placeholder="Um nome por linha ou separados por vírgula"></textarea></div>',
    '<div class="proj-fg"><label class="proj-fl" for="gov-reu-pauta">Pauta e informações apresentadas</label><textarea class="proj-fi" id="gov-reu-pauta" rows="3" placeholder="Andamento do portfólio, dados e informações de interesse do Comitê"></textarea></div>',
    '<button type="button" class="proj-btn primary" onclick="projGovAddMeeting()">Criar reunião</button></div>',
    cards || '<div class="proj-gov-empty">Nenhuma reunião trimestral registrada.</div>'
  ].join(''));
  projApplyPermissions();
}

function projGovMeetingCard(meeting) {
  const decisions = (meeting.deliberacoes || []).map(d => {
    const demand = PROJ_GOVERNANCA.demandas.find(item => String(item.id) === String(d.demanda_id));
    const subject = demand ? demand.titulo : (d.assunto || 'Portfólio estratégico');
    return '<li><strong>' + projEsc(subject) + ' — ' + projEsc(projGovDecisionLabel(d.decisao)) + '</strong><div>' + projEsc(d.fundamentacao) + '</div><div class="proj-gov-muted">Encaminhamento: ' + projEsc(d.encaminhamento || 'Não informado') + '</div></li>';
  }).join('');
  const id = projEsc(meeting.id);
  return [
    '<article class="proj-card proj-gov-meeting"><div class="proj-gov-meeting-head"><div><div class="proj-card-t">Reunião do CGP — ', projEsc(meeting.trimestre), '</div><div class="proj-gov-muted">', projFormatDate(meeting.data), ' · ', projEsc(meeting.local || 'Local não informado'), '</div></div>',
    '<button type="button" class="proj-btn" onclick="projGovGenerateMinutes(\'', id, '\')">Gerar ata</button></div>',
    '<div class="proj-g2"><div><span class="proj-fl">Participantes</span><div class="proj-gov-pre">', projEsc(meeting.participantes), '</div></div><div><span class="proj-fl">Pauta e informações</span><div class="proj-gov-pre">', projEsc(meeting.pauta || 'Não informada'), '</div></div></div>',
    '<div class="proj-form-section-title">Deliberações</div><ol class="proj-gov-decisions">', decisions || '<li>Nenhuma deliberação registrada.</li>', '</ol>',
    '<div class="proj-gov-decision-form ep-only"><div class="proj-g3"><select class="proj-fi" id="gov-del-dem-', id, '">', projGovDemandOptions(), '</select>',
    '<input class="proj-fi" id="gov-del-assunto-', id, '" placeholder="Assunto geral, se não houver demanda">',
    '<select class="proj-fi" id="gov-del-tipo-', id, '"><option value="incluir">Inclusão aprovada</option><option value="diligencia">Diligência</option><option value="rejeitar">Não inclusão</option><option value="replanejar">Replanejamento</option><option value="suspender">Suspensão</option><option value="encerrar">Encerramento</option></select></div>',
    '<div class="proj-g2"><textarea class="proj-fi" id="gov-del-fund-', id, '" rows="2" placeholder="Fundamentação da deliberação"></textarea><textarea class="proj-fi" id="gov-del-enc-', id, '" rows="2" placeholder="Encaminhamento, responsável e prazo"></textarea></div>',
    '<button type="button" class="proj-btn primary" onclick="projGovAddDecision(\'', id, '\')">Registrar deliberação</button></div></article>'
  ].join('');
}

function projGovAddMeeting() {
  if(!projEnsureWriteAll()) return;
  const data = projGovValue('gov-reu-data');
  const participantes = projGovValue('gov-reu-participantes');
  if(!data || !participantes) { projToast('Informe data e participantes.', '#d97706'); return; }
  PROJ_GOVERNANCA.reunioes.push({ id:projGovNewId('reu'), data, trimestre:projGovValue('gov-reu-trimestre'), local:projGovValue('gov-reu-local'), participantes, pauta:projGovValue('gov-reu-pauta'), deliberacoes:[] });
  projGovSave(); projRenderGovernancaPage(); projGovShowPanel('reunioes', document.querySelector('.proj-gov-tabs button:nth-child(2)')); projToast('Reunião registrada.');
}

function projGovAddDecision(meetingId) {
  if(!projEnsureWriteAll()) return;
  const meeting = PROJ_GOVERNANCA.reunioes.find(r => String(r.id) === String(meetingId));
  if(!meeting) return;
  const demandId = projGovValue('gov-del-dem-' + meetingId);
  const assunto = projGovValue('gov-del-assunto-' + meetingId);
  const fundamentacao = projGovValue('gov-del-fund-' + meetingId);
  if(!demandId && !assunto) { projToast('Selecione uma demanda ou informe o assunto.', '#d97706'); return; }
  if(!fundamentacao) { projToast('Informe a fundamentação da deliberação.', '#d97706'); return; }
  meeting.deliberacoes = meeting.deliberacoes || [];
  meeting.deliberacoes.push({ id:projGovNewId('del'), demanda_id:demandId, assunto, decisao:projGovValue('gov-del-tipo-' + meetingId), fundamentacao, encaminhamento:projGovValue('gov-del-enc-' + meetingId) });
  const demand = PROJ_GOVERNANCA.demandas.find(d => String(d.id) === String(demandId));
  if(demand) { demand.status = 'deliberada'; demand.reuniao_id = meeting.id; }
  projGovSave(); projRenderGovernancaPage(); projGovShowPanel('reunioes', document.querySelector('.proj-gov-tabs button:nth-child(2)')); projToast('Deliberação vinculada à reunião.');
}

function projGovMinutesHtml(meeting) {
  const decisionRows = (meeting.deliberacoes || []).map((d, index) => {
    const demand = PROJ_GOVERNANCA.demandas.find(item => String(item.id) === String(d.demanda_id));
    const subject = demand ? demand.titulo : d.assunto;
    return '<h3>' + (index + 1) + '. ' + projEsc(subject || 'Portfólio estratégico') + '</h3><p><b>Deliberação:</b> ' + projEsc(projGovDecisionLabel(d.decisao)) + '</p><p><b>Fundamentação:</b> ' + projEsc(d.fundamentacao) + '</p><p><b>Encaminhamento:</b> ' + projEsc(d.encaminhamento || 'Não informado') + '</p>';
  }).join('');
  return ['<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Ata do CGP</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#1a2540;line-height:1.55}h1{text-align:center;color:#005a9c}h2{border-bottom:2px solid #00a89a;padding-bottom:6px}p{white-space:pre-wrap}</style></head><body>',
    '<h1>ATA DA REUNIÃO DO COMITÊ DE GESTÃO DE PROJETOS</h1><p><b>Trimestre:</b> ', projEsc(meeting.trimestre), '<br><b>Data:</b> ', projFormatDate(meeting.data), '<br><b>Local:</b> ', projEsc(meeting.local || 'Não informado'), '</p>',
    '<h2>Participantes</h2><p>', projEsc(meeting.participantes), '</p><h2>Pauta e informações apresentadas</h2><p>', projEsc(meeting.pauta || 'Não informada'), '</p><h2>Deliberações</h2>', decisionRows || '<p>Nenhuma deliberação registrada.</p>',
    '<h2>Encerramento</h2><p>Nada mais havendo a tratar, a reunião foi encerrada, sendo lavrada a presente ata pelo Escritório de Projetos.</p><br><br><p>________________________________________<br>Secretaria do CGP</p></body></html>'
  ].join('');
}

function projGovGenerateMinutes(meetingId) {
  const meeting = PROJ_GOVERNANCA.reunioes.find(r => String(r.id) === String(meetingId));
  if(!meeting) return;
  const blob = new Blob([projGovMinutesHtml(meeting)], {type:'application/msword;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ata-cgp-' + (meeting.data || meeting.id) + '.doc';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  projToast('Ata gerada com sucesso.');
}
