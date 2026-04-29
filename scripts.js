// ═══════════════════════════════════════════
// DADOS CENTRAIS
// ═══════════════════════════════════════════
const PERFIL_LABELS = {ep:'EPP',dono:'Executor de Processo',gestor:'Gestor / Adjunto',gerente_projeto:'Gerente de Projeto'};
const PERFIL_COR = {ep:'#1A5DC8',dono:'#0A7060',gestor:'#A85C00',gerente_projeto:'#7c3aed'};
// Enums frozen — usar em vez de strings literais em código novo
const PERFIL = Object.freeze({EP:'ep', DONO:'dono', GESTOR:'gestor', GERENTE_PROJETO:'gerente_projeto'});
const STATUS_ENTREGA = Object.freeze({EM_DIA:'em_dia', COM_ATRASO:'com_atraso', SEM_PRAZO:'sem_prazo'});
const STATUS_PLANO = Object.freeze({PENDENTE:'pendente', EM_ANDAMENTO:'em_andamento', CONCLUIDO:'concluido', CANCELADO:'cancelado', PAUSADO:'pausado'});

// ── localStorage seguro (try/catch para modo incógnito / bloqueio corporativo) ─
const lsGet = (k, d='') => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, String(v)); } catch { console.warn('localStorage indisponível'); } };
const lsRemove = (k) => { try { localStorage.removeItem(k); } catch {} };

let USUARIOS = [
  {email:'ep@sefaz.rs.gov.br',nome:'Equipe EP',perfil:'ep',iniciais:'EP'},
];
let dominios = [{dominio:'sefaz.rs.gov.br',perfil:'ep'},{dominio:'cage.rs.gov.br',perfil:'ep'}];

const APONTAMENTOS_PADRAO = [
  {a:"Ausência de padronização das etapas do processo",c:"Inexistência de procedimento operacional formalizado ou atualização insuficiente da documentação",r:"Elaborar e institucionalizar um procedimento padrão, com definição clara das etapas, responsáveis e critérios de execução"},
  {a:"Falta de definição clara de papéis e responsabilidades",c:"Distribuição informal de tarefas e ausência de matriz de responsabilidades",r:"Definir papéis e responsabilidades de forma formal, preferencialmente com uso de matriz RACI ou instrumento equivalente"},
  {a:"Execução excessivamente dependente de conhecimento tácito",c:"Baixo nível de documentação e centralização do conhecimento em poucos servidores",r:"Documentar regras, fluxos e orientações operacionais, reduzindo a dependência de pessoas específicas"},
  {a:"Retrabalho frequente ao longo do fluxo",c:"Falhas na qualidade das entradas, ausência de conferência inicial ou critérios mal definidos",r:"Implantar pontos de validação na entrada e revisar critérios de qualidade para reduzir devoluções e correções"},
  {a:"Excesso de etapas de aprovação",c:"Cultura de controle excessivo e falta de revisão crítica do fluxo decisório",r:"Reavaliar os níveis de aprovação, eliminando instâncias redundantes e mantendo apenas as estritamente necessárias"},
  {a:"Baixa rastreabilidade das atividades executadas",c:"Controles manuais, registros incompletos ou ausência de sistema de acompanhamento",r:"Implantar mecanismo de registro padronizado das etapas, decisões e responsáveis, preferencialmente em sistema"},
  {a:"Inexistência de indicadores de desempenho do processo",c:"Foco predominantemente operacional e ausência de rotina de monitoramento",r:"Definir indicadores de prazo, volume, qualidade e produtividade, com metas e periodicidade de acompanhamento"},
  {a:"Prazos de execução não monitorados",c:"Ausência de metas temporais, SLAs ou ferramenta de controle de tempo",r:"Estabelecer prazos de referência para cada etapa e monitorar desvios periodicamente"},
  {a:"Gargalo concentrado em um único executor ou unidade",c:"Distribuição inadequada da carga de trabalho ou concentração de competências críticas",r:"Redistribuir atividades, promover capacitação cruzada e definir substitutos para funções críticas"},
  {a:"Baixo nível de automação em tarefas repetitivas",c:"Processo historicamente manual e ausência de avaliação de oportunidades de automação",r:"Mapear tarefas repetitivas e avaliar automação por meio de sistemas, workflows, macros ou RPA"},
  {a:"Falhas de comunicação entre áreas envolvidas",c:"Canais informais, ausência de regras de interação e desalinhamento entre unidades",r:"Definir fluxos de comunicação, pontos de contato e regras claras de encaminhamento e retorno"},
  {a:"Entradas recebidas com baixa qualidade ou incompletas",c:"Falta de orientações ao demandante e ausência de critérios mínimos de recebimento",r:"Padronizar requisitos de entrada com checklists, formulários e orientações objetivas ao usuário"},
  {a:"Ausência de segregação adequada de funções",c:"Acúmulo de atividades incompatíveis por um mesmo executor",r:"Revisar a distribuição das atividades para assegurar segregação entre execução, conferência e aprovação"},
  {a:"Controles realizados de forma apenas reativa",c:"Atuação voltada à correção de falhas já ocorridas, sem gestão preventiva de riscos",r:"Implantar controles preventivos e matriz de riscos com definição de tratamentos e responsáveis"},
  {a:"Inconsistência na aplicação de normas e critérios",c:"Interpretações divergentes entre executores e ausência de orientação consolidada",r:"Consolidar critérios normativos em manuais, FAQs ou orientações internas de uso comum"},
  {a:"Ausência de gestão formal de riscos do processo",c:"Processo não submetido a avaliação estruturada de riscos e impactos",r:"Mapear riscos operacionais, classificar criticidade e definir planos de tratamento e monitoramento"},
  {a:"Capacitação insuficiente dos executores do processo",c:"Treinamento eventual, inexistência de trilha formativa ou alta rotatividade",r:"Estruturar capacitação periódica, materiais de apoio e ações de reciclagem para os responsáveis"},
  {a:"Baixa integração entre sistemas utilizados no processo",c:"Ferramentas isoladas, duplicidade de lançamentos e ausência de interoperabilidade",r:"Avaliar integração sistêmica entre ferramentas para eliminar registros duplicados e reduzir erros"},
  {a:"Ausência de rotina de monitoramento e melhoria contínua",c:"Falta de governança do processo e inexistência de revisões periódicas",r:"Instituir rotina de acompanhamento do processo com reuniões periódicas, análise de indicadores e plano de ação"},
  {a:"Processo desalinhado aos objetivos estratégicos da organização",c:"Desenho do processo focado apenas na execução operacional, sem conexão explícita com resultados institucionais",r:"Revisar o processo com base nos objetivos estratégicos, resultados esperados e valor entregue ao usuário final"},
];

let ARQUITETURA = [
  {id:'m1',nome:'Comunicação institucional',processos:[
    {id:'ap1',nome:'Comunicação externa',natureza:'Suporte',gerente:'Amilcar da Rosa',area:'Assessoria de Comunicação',objetivo:'',objetivo_estrategico:'Fortalecimento da imagem institucional',entradas:'',entregas:'',clientes:'',docs:'',
      subprocessos:[
        {id:'s1',nome:'Produzir informativos textuais (Fala CAGE)',natureza:'Suporte',gerente:'Amilcar da Rosa',area:'Assessoria de Comunicação',objetivo:'Redigir notas, releases e drops institucionais',objetivo_estrategico:'Fortalecimento da imagem institucional',entradas:'Pauta e informações da área',entregas:'Texto publicado',clientes:'Servidores e sociedade',docs:'Manual de Redação Secom',proc_id:null},
        {id:'s2',nome:'Produzir materiais gráficos (cards, banners)',natureza:'Suporte',gerente:'Amilcar da Rosa',area:'Assessoria de Comunicação',objetivo:'Elaborar peças gráficas institucionais',objetivo_estrategico:'Fortalecimento da imagem institucional',entradas:'Demanda de publicação',entregas:'Material gráfico publicado',clientes:'Servidores e sociedade',docs:'Manual de Identidade Visual Sefaz',proc_id:1},
        {id:'s3',nome:'Publicar e distribuir conteúdo',natureza:'Suporte',gerente:'Amilcar da Rosa',area:'Assessoria de Comunicação',objetivo:'Distribuir conteúdo pelos canais da CAGE',objetivo_estrategico:'Fortalecimento da imagem institucional',entradas:'Material aprovado',entregas:'Conteúdo publicado nos canais',clientes:'Servidores e sociedade',docs:'',proc_id:null},
      ]},
  ]},
  {id:'m2',nome:'Gestão de TI',processos:[
    {id:'ap2',nome:'Gestão contratual de TI',natureza:'Gestão',gerente:'Carlos Mendes',area:'DTIC',objetivo:'',objetivo_estrategico:'Eficiência administrativa',entradas:'',entregas:'',clientes:'',docs:'',
      subprocessos:[
        {id:'s4',nome:'Abertura e instrução de contratos de TI',natureza:'Gestão',gerente:'Carlos Mendes',area:'DTIC',objetivo:'Formalizar contratos de TI desde a abertura',objetivo_estrategico:'Eficiência administrativa',entradas:'Necessidade de contratação',entregas:'Contrato firmado',clientes:'CAGE',docs:'Lei 14.133/2021',proc_id:null},
        {id:'s5',nome:'Monitoramento de vigência e alertas',natureza:'Controle',gerente:'Carlos Mendes',area:'DTIC',objetivo:'Acompanhar prazos e emitir alertas de vencimento',objetivo_estrategico:'Eficiência administrativa',entradas:'Contrato vigente',entregas:'Alertas e relatórios de vigência',clientes:'CAGE',docs:'',proc_id:2},
        {id:'s6',nome:'Renovação e encerramento de contratos',natureza:'Gestão',gerente:'Carlos Mendes',area:'DTIC',objetivo:'Processar renovações e encerramentos',objetivo_estrategico:'Eficiência administrativa',entradas:'Contrato próximo ao vencimento',entregas:'Contrato renovado ou encerrado',clientes:'CAGE',docs:'',proc_id:null},
      ]},
  ]},
  {id:'m3',nome:'Controle interno',processos:[
    {id:'ap3',nome:'Auditoria interna',natureza:'Controle',gerente:'Fernanda Lima',area:'Auditoria Interna',objetivo:'',objetivo_estrategico:'Integridade e conformidade',entradas:'',entregas:'',clientes:'',docs:'',
      subprocessos:[
        {id:'s7',nome:'Seleção de entidades a auditar',natureza:'Controle',gerente:'Fernanda Lima',area:'Auditoria Interna',objetivo:'Definir escopo e entidades do ciclo de auditoria',objetivo_estrategico:'Integridade e conformidade',entradas:'Plano de auditoria anual',entregas:'Lista de entidades selecionadas',clientes:'Contadora Geral',docs:'NBC TA 315',proc_id:null},
        {id:'s8',nome:'Executar auditoria de conformidade',natureza:'Controle',gerente:'Fernanda Lima',area:'Auditoria Interna',objetivo:'Verificar conformidade contábil e fiscal',objetivo_estrategico:'Integridade e conformidade',entradas:'Escopo definido',entregas:'Relatório de auditoria',clientes:'Contadora Geral',docs:'NBC TA 315',proc_id:3},
        {id:'s9',nome:'Emissão de relatório e acompanhamento',natureza:'Controle',gerente:'Fernanda Lima',area:'Auditoria Interna',objetivo:'Emitir relatório final e monitorar recomendações',objetivo_estrategico:'Integridade e conformidade',entradas:'Achados de auditoria',entregas:'Relatório publicado e plano de ação',clientes:'Contadora Geral',docs:'',proc_id:null},
      ]},
  ]},
];
let arqIdC = 200;

// PIPELINE
const ETAPAS = [
  // Entendimento
  {id:'abertura',lb:'Abertura',fase:'Entendimento',cor:'pip-e',resp:'ep'},
  {id:'reuniao',lb:'Reunião entend.',fase:'Entendimento',cor:'pip-e',resp:'ep'},
  {id:'questionario',lb:'Quest. maturidade',fase:'Entendimento',cor:'pip-e',resp:'dono'},
  // Modelagem AS IS
  {id:'esboco_asis',lb:'Esboço AS IS',fase:'Modelagem',cor:'pip-m',resp:'ep'},
  {id:'det_valid_asis',lb:'Detalhamento e validação AS IS',fase:'Modelagem',cor:'pip-m',resp:'dono'},
  {id:'riscos',lb:'Identificação de riscos',fase:'Modelagem',cor:'pip-m',resp:'ep'},
  {id:'analise',lb:'Análise inteligente',fase:'Modelagem',cor:'pip-m',resp:'ep'},
  {id:'melhorias',lb:'Melhorias do processo',fase:'Modelagem',cor:'pip-m',resp:'ep'},
  // Modelagem TO BE (apenas se produto incluir TO BE)
  {id:'esboco_tobe',lb:'Esboço TO BE',fase:'Modelagem',cor:'pip-m',resp:'ep',tobe:true},
  {id:'det_valid_tobe',lb:'Detalhamento e validação TO BE',fase:'Modelagem',cor:'pip-m',resp:'dono',tobe:true},
  // Formalização
  {id:'desenho_final',lb:'Desenho final',fase:'Formalizacao',cor:'pip-f',resp:'ep'},
  {id:'pop',lb:'Construção POP',fase:'Formalizacao',cor:'pip-f',resp:'ep'},
  {id:'complement',lb:'Complement. dono',fase:'Formalizacao',cor:'pip-f',resp:'dono'},
  {id:'apresentacao',lb:'Aprov. gestor',fase:'Formalizacao',cor:'pip-f',resp:'gestor'},
  {id:'publicacao',lb:'Publicação',fase:'Formalizacao',cor:'pip-f',resp:'ep'},
  // Operação
  {id:'acompanha',lb:'Acompanhamento',fase:'Operacao',cor:'pip-o',resp:'ep'},
  // Auditoria
  {id:'auditoria',lb:'Auditoria do processo',fase:'Auditoria',cor:'pip-a',resp:'ep'},
];
// Retorna pipeline efetivo — exclui etapas TO BE se produto for somente AS IS
function getEtapas(p){
  const comToBe=p&&(p.produto==='TO BE'||p.produto==='AS IS + TO BE');
  return ETAPAS.filter(e=>!e.tobe||comToBe);
}
const FASES = ['Entendimento','Modelagem','Formalizacao','Operacao','Auditoria'];
const FASE_COR = {Entendimento:'bt',Modelagem:'bp',Formalizacao:'ba',Operacao:'bb',Auditoria:'br'};
const EBADGE = {abertura:'bt',reuniao:'bt',questionario:'bt',esboco_asis:'bp',det_valid_asis:'bp',riscos:'bp',analise:'bp',melhorias:'bp',esboco_tobe:'bp',det_valid_tobe:'bp',desenho_final:'ba',pop:'ba',complement:'ba',apresentacao:'ba',publicacao:'ba',acompanha:'bb',auditoria:'br'};

function etIdx(id,p){return getEtapas(p||curProc).findIndex(e=>e.id===id);}
function etFase(id){return ETAPAS.find(e=>e.id===id)?.fase||'';}
function etLb(id){return ETAPAS.find(e=>e.id===id)?.lb||id;}
function nextEt(id,p){const et=getEtapas(p||curProc);const i=et.findIndex(e=>e.id===id);return i>=0&&i<et.length-1?et[i+1].id:null;}
function fBadge(etId){const f=etFase(etId);return '<span class="badge '+(FASE_COR[f]||'bgr')+'">'+f+'</span>';}
function eBadge(etId){return '<span class="badge '+(EBADGE[etId]||'bgr')+'">'+etLb(etId)+'</span>';}
function _pBadgeCls(p){if(p==='Critica'){return 'br';}if(p==='Alta'){return 'ba';}return 'bgr';}
function pBadge(p){return '<span class="badge '+_pBadgeCls(p)+'">'+p+'</span>';}

// QUESTIONÁRIO DE MATURIDADE — 15 perguntas, 6 dimensões
const QUESTOES = [
  {id:'q1',dim:'Alinhamento estratégico',txt:'O processo está formalmente associado a objetivos estratégicos da organização.'},
  {id:'q2',dim:'Alinhamento estratégico',txt:'Indicadores de desempenho demonstram a contribuição do processo para resultados institucionais.'},
  {id:'q3',dim:'Estrutura e padronização',txt:'O processo possui documentação atualizada (POP, fluxo, manual).'},
  {id:'q4',dim:'Estrutura e padronização',txt:'As atividades seguem um padrão definido e comunicado a todos os executores.'},
  {id:'q5',dim:'Estrutura e padronização',txt:'Templates e formulários padronizados são utilizados nas principais atividades.'},
  {id:'q6',dim:'Papéis e responsabilidades',txt:'Cada atividade tem um responsável claramente designado.'},
  {id:'q7',dim:'Papéis e responsabilidades',txt:'O executor do processo está identificado e exerce seu papel ativamente.'},
  {id:'q8',dim:'Execução e controle',txt:'O processo é executado conforme documentado, sem desvios.'},
  {id:'q9',dim:'Execução e controle',txt:'Pontos de controle (gates) são aplicados ao longo do processo.'},
  {id:'q10',dim:'Execução e controle',txt:'Problemas e não-conformidades são registrados e tratados sistematicamente.'},
  {id:'q11',dim:'Automação e tecnologia',txt:'O processo utiliza sistema de informação ou ferramenta digital de suporte.'},
  {id:'q12',dim:'Automação e tecnologia',txt:'O processo possui integrações automatizadas com outros sistemas ou processos.'},
  {id:'q13',dim:'Monitoramento e melhoria',txt:'Os indicadores de desempenho do processo são monitorados regularmente.'},
  {id:'q14',dim:'Monitoramento e melhoria',txt:'Existe um ciclo formal de análise e melhoria contínua do processo.'},
  {id:'q15',dim:'Monitoramento e melhoria',txt:'As melhorias identificadas são priorizadas e implementadas sistematicamente.'},
];
const LIKERT = ['Nunca','Raramente','Às vezes','Frequentemente','Sempre'];

// ── SECURITY HELPERS ─────────────────────────
// HTML-escape user-supplied content before inserting into innerHTML
function esc(s){
  return String(s ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}
// Allow only http/https URLs; return empty string for anything else (blocks javascript: etc.)
function safeUrl(url){
  if(!url) return '';
  try {
    const parsed = new URL(url);
    if(parsed.protocol === 'https:' || parsed.protocol === 'http:') return url;
  } catch(_e){ console.warn('safeUrl: invalid URL', _e); }
  return '';
}

let processos = [];
let nextProcId = 1;

let kpis = [];
let _lastIndAnalise = '';
let _lastIndLista   = [];

let TRILHAS = [];
let _trilhaIdC = 1;

let publicacoes = [];
let _pubIdC = 1;

let plano = [];
let _planoIdC = 1;

let solicitacoes = [];

let notifs = [];
let ejsConfig = {service:'',template:'',pubkey:''};
let AVISOS = [];

let usuarioLogado = null;
let curProc = null;
let filtFaseAtual = '';
let epRetroEtapa = null; // etapa sendo revisada retroativamente pelo EP
let mapeadosManual = new Set(JSON.parse(lsGet('mapeadosManual','[]')));
let criticosManual = new Set(JSON.parse(lsGet('criticosManual','[]')));
let fluxosCache = {};
let bpmnModelers = {};
let bpmnDirty = {};

// Namespace de estado — espelha os globais para acesso organizado
// Uso: APP.curProc, APP.kpis, etc. O código existente continua usando as variáveis diretamente (sem quebra)
const APP = {
  get processos()     { return processos; },    set processos(v)     { processos = v; },
  get curProc()       { return curProc; },       set curProc(v)       { curProc = v; },
  get kpis()          { return kpis; },          set kpis(v)          { kpis = v; },
  get plano()         { return plano; },         set plano(v)         { plano = v; },
  get notifs()        { return notifs; },        set notifs(v)        { notifs = v; },
  get usuarioLogado() { return usuarioLogado; }, set usuarioLogado(v) { usuarioLogado = v; },
  get solicitacoes()  { return solicitacoes; },  set solicitacoes(v)  { solicitacoes = v; },
  get ARQUITETURA()   { return ARQUITETURA; },   set ARQUITETURA(v)   { ARQUITETURA = v; },
  get USUARIOS()      { return USUARIOS; },      set USUARIOS(v)      { USUARIOS = v; },
  get publicacoes()   { return publicacoes; },   set publicacoes(v)   { publicacoes = v; },
  get AVISOS()        { return AVISOS; },        set AVISOS(v)        { AVISOS = v; },
  get ejsConfig()     { return ejsConfig; },     set ejsConfig(v)     { ejsConfig = v; },
  get filtFaseAtual() { return filtFaseAtual; }, set filtFaseAtual(v) { filtFaseAtual = v; },
};

const BPMN_DEFAULT = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:omgdc="http://www.omg.org/spec/DD/20100524/DC" xmlns:omgdi="http://www.omg.org/spec/DD/20100524/DI" targetNamespace="http://ep.cage">
  <process id="proc1" isExecutable="true">
    <startEvent id="start" name="Início"/>
    <endEvent id="end" name="Fim"/>
    <sequenceFlow id="f1" sourceRef="start" targetRef="end"/>
  </process>
  <bpmndi:BPMNDiagram id="d1"><bpmndi:BPMNPlane bpmnElement="proc1">
    <bpmndi:BPMNShape bpmnElement="start"><omgdc:Bounds x="160" y="200" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape bpmnElement="end"><omgdc:Bounds x="500" y="200" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge bpmnElement="f1"><omgdi:waypoint x="196" y="218"/><omgdi:waypoint x="500" y="218"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</definitions>`;

// ═══════════════════════════════════════════
// LOGIN / SESSÃO
// ═══════════════════════════════════════════
// Helpers para buscar e-mail real de dono/EP a partir de USUARIOS
function getDonoEmail(proc){
  const u=USUARIOS.find(u=>u.nome===proc.dono||u.email===proc.dono);
  return u?.email||proc.dono_email||'';
}
function getEPEmail(proc){
  const u=USUARIOS.find(u=>u.nome===proc.resp_ep||u.email===proc.resp_ep);
  return u?.email||'';
}

function _aplicarUsuario(user){
  usuarioLogado=user;
  document.getElementById('login-err').style.display='none';
  document.getElementById('login-screen').style.display='none';
  document.getElementById('aside-av').textContent=user.iniciais;
  const mobAv=document.getElementById('mob-user-av');if(mobAv)mobAv.textContent=user.iniciais;
  document.getElementById('aside-name').textContent=user.nome;
  const roleTxt = getPerfisUsuario(user).map(p=>PERFIL_LABELS[p]||p).join(' · ') || (PERFIL_LABELS[user.perfil]||user.perfil);
  document.getElementById('aside-role').textContent=roleTxt;
  _aplicarToggleEP(user);
  updCounts();
  aplicarPermissoes();
  go('fila',document.getElementById('nb-fila'));
  if(user.trocar_senha) setTimeout(abrirModalTrocarSenha, 600);
}
function _aplicarToggleEP(user){
  const wrap=document.getElementById('ep-toggle-wrap');
  if(!wrap) return;
  const perfilOriginal=user._perfil_original||user.perfil;
  if(perfilOriginal!=='ep'){ wrap.style.display='none'; return; }
  wrap.style.display='block';
  const simulando=user.perfil==='dono';
  const track=document.getElementById('ep-toggle-track');
  const thumb=document.getElementById('ep-toggle-thumb');
  const row=wrap.querySelector('div[onclick]');
  if(simulando){
    track.style.background='var(--teal)';
    thumb.style.left='15px';
    if(row) row.style.opacity='.9';
  } else {
    track.style.background='var(--bdr2)';
    thumb.style.left='2px';
    if(row) row.style.opacity='.55';
  }
}
function togglePerfilEP(){
  if(!usuarioLogado) return;
  const perfilOriginal=usuarioLogado._perfil_original||usuarioLogado.perfil;
  if(perfilOriginal!=='ep') return;
  const simulando=usuarioLogado.perfil==='dono';
  if(simulando){
    usuarioLogado.perfil='ep';
    delete usuarioLogado._perfil_original;
  } else {
    usuarioLogado._perfil_original='ep';
    usuarioLogado.perfil='dono';
  }
  document.getElementById('aside-role').textContent=PERFIL_LABELS[usuarioLogado.perfil]||usuarioLogado.perfil;
  _aplicarToggleEP(usuarioLogado);
  aplicarPermissoes();
  updCounts();
  // Re-renderiza a view atual
  const pAtivo=document.querySelector('.page.on');
  if(pAtivo){
    const id=pAtivo.id.replaceAll('page-','');
    const nb=document.getElementById('nb-'+id);
    go(id,nb||null);
  }
  const msg=usuarioLogado.perfil==='dono'?'Simulando perfil Executor de Processo':'Voltou ao perfil EP';
  toast(msg, usuarioLogado.perfil==='dono'?'var(--amber)':'var(--teal)');
}
const DOMINIOS_PERMITIDOS = ['sefaz.rs.gov.br','cage.rs.gov.br'];

async function doLogin(){
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const senha = document.getElementById('login-senha').value;
  if(!email){mostrarErrLogin('Informe seu e-mail.');return;}
  if(!senha){mostrarErrLogin('Informe sua senha.');return;}

  // Valida domínio
  const dominio = email.split('@')[1]||'';
  if(!DOMINIOS_PERMITIDOS.includes(dominio)){
    mostrarErrLogin('Acesso restrito a e-mails institucionais.');return;
  }

  // Valida se está na lista de usuários autorizados
  const user = USUARIOS.find(u=>u.email===email);
  if(!user){mostrarErrLogin('Acesso não autorizado. Solicite cadastro ao EPP.');return;}

  // Autentica via Firebase Auth
  if(fbReady()){
    const btn = document.querySelector('.login-btn');
    btn.textContent = 'Entrando…'; btn.disabled = true;
    try {
      const {auth, signInWithEmailAndPassword} = fb();
      await signInWithEmailAndPassword(auth, email, senha);
      // onAuthStateChanged vai aplicar o usuário
    } catch(e){
      btn.textContent = 'Entrar'; btn.disabled = false;
      const msgs = {
        'auth/wrong-password':'Senha incorreta.',
        'auth/user-not-found':'Usuário não encontrado. Use "Primeiro acesso" para criar sua senha.',
        'auth/invalid-credential':'E-mail ou senha incorretos.',
        'auth/too-many-requests':'Muitas tentativas. Tente novamente em alguns minutos.',
      };
      mostrarErrLogin(msgs[e.code]||'Erro ao entrar: '+e.message);
    }
  } else {
    // Fallback sem Firebase (modo local)
    lsSet('siga_user', user.email);
    _aplicarUsuario(user);
  }
}

function togglePrimeiroAcesso(){
  const f = document.getElementById('primeiro-acesso-form');
  if(!f) return;
  const visible = f.style.display !== 'none';
  f.style.display = visible ? 'none' : 'block';
  if(!visible) document.getElementById('pa-email')?.focus();
}

async function _primeiroAcessoExistente(email, showErr, showOk){
  if(!fbReady()){ showErr('Firebase não configurado.'); return; }
  try {
    const {auth, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail} = fb();
    try {
      const tmpPass = gerarSenhaTemp() + gerarSenhaTemp(); // longo o suficiente, nunca usado
      await createUserWithEmailAndPassword(auth, email, tmpPass);
      await signOut(auth); // limpa sessão da conta recém-criada
    } catch(createErr){
      if(createErr.code !== 'auth/email-already-in-use') throw createErr;
      // conta já existe → segue normalmente para o reset
    }
    await sendPasswordResetEmail(auth, email);
    showOk('Link de redefinição enviado para '+email+'. Verifique sua caixa de entrada (e a pasta de spam).');
  } catch(err){ showErr('Erro ao enviar e-mail: '+err.message); }
}

async function _primeiroAcessoNovo(email, nome, showErr, showOk){
  if(!nome){ showErr('Informe seu nome completo para solicitar o primeiro acesso.'); return; }
  const jaSolicitou = solicitacoes.find(s=>s.email===email && s.status==='pendente');
  if(jaSolicitou){ showOk('Já existe uma solicitação pendente para este e-mail. Aguarde a aprovação do EPP.'); return; }
  if(!fbReady()){ showErr('Firebase não configurado.'); return; }
  try {
    const {db, doc, setDoc} = fb();
    const sol = {email, nome, status:'pendente', solicitado_em: now()};
    await setDoc(doc(db,'solicitacoes',email), sol);
    solicitacoes.push(sol);
    _aplicarPermissoesAdminBadge();
    showOk('Solicitação enviada! O EPP receberá uma notificação e entrará em contato.');
    if(document.getElementById('pa-nome')) document.getElementById('pa-nome').value='';
    if(document.getElementById('pa-email')) document.getElementById('pa-email').value='';
  } catch(e){ showErr('Erro ao enviar solicitação: '+e.message); }
}

async function processarPrimeiroAcesso(){
  const nome  = (document.getElementById('pa-nome')?.value||'').trim();
  const email = (document.getElementById('pa-email')?.value||'').trim().toLowerCase();
  const msgEl = document.getElementById('pa-msg');
  const showErr = m => { if(msgEl){ msgEl.style.background='rgba(242,160,160,.15)'; msgEl.style.color='#F2A0A0'; msgEl.textContent=m; msgEl.style.display='block'; } };
  const showOk  = m => { if(msgEl){ msgEl.style.background='rgba(160,242,196,.15)'; msgEl.style.color='#A0F2C4'; msgEl.textContent=m; msgEl.style.display='block'; } };

  if(!email){ showErr('Informe seu e-mail institucional.'); return; }
  const dominio = email.split('@')[1]||'';
  if(!DOMINIOS_PERMITIDOS.includes(dominio)){ showErr('Use um e-mail institucional válido ('+DOMINIOS_PERMITIDOS.join(' ou ')+').'); return; }

  if(USUARIOS.some(u=>u.email===email)){
    await _primeiroAcessoExistente(email, showErr, showOk);
  } else {
    await _primeiroAcessoNovo(email, nome, showErr, showOk);
  }
}

// Mantido como alias para compatibilidade com referências antigas
// doEsqueciSenha removida (dead code — nunca chamada; uso direto: togglePrimeiroAcesso())

function mostrarErrLogin(msg){
  const e=document.getElementById('login-err');
  e.style.color='#F2A0A0';
  e.textContent=msg;
  e.style.display='block';
}

function gerarSenhaTemp(){
  const upper  = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower  = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const all    = upper + lower + digits;
  // Garante ao menos 1 maiúscula, 1 minúscula e 1 dígito + 5 extras
  let p = upper[Math.floor(Math.random()*upper.length)]
        + lower[Math.floor(Math.random()*lower.length)]
        + digits[Math.floor(Math.random()*digits.length)];
  for(let i=0;i<5;i++) p += all[Math.floor(Math.random()*all.length)];
  return p.split('').sort(()=>Math.random()-.5).join('');
}

function _enviarSenhaAcesso(email, nome, senha){
  if(ejsConfig.service && ejsConfig.template && ejsConfig.pubkey && typeof emailjs !== 'undefined'){
    emailjs.send(ejsConfig.service, ejsConfig.template, {
      to_name:  nome,
      to_email: email,
      from_name: 'EP·CAGE',
      processo: 'EP·CAGE — Acesso liberado',
      acao: 'Seu acesso ao sistema EP·CAGE foi aprovado.\n\nSua senha temporária: ' + senha + '\n\nAcesse o sistema e altere sua senha no primeiro login.',
      prazo: 'Alterar a senha no primeiro acesso',
      link: 'https://sigaepp.web.app/',
    }).then(()=>console.info('Senha temporária enviada para', email))
      .catch(err=>console.warn('EmailJS erro ao enviar senha:', err?.text||err?.message));
  } else {
    console.warn('_enviarSenhaAcesso: EmailJS não configurado — e-mail não enviado para', email);
  }
}

function abrirModalTrocarSenha(){
  const m = document.getElementById('trocar-senha-modal');
  if(m){ m.style.display='flex'; document.getElementById('ts-nova')?.focus(); }
}

async function salvarNovaSenha(){
  const nova  = (document.getElementById('ts-nova')?.value)||'';
  const conf  = (document.getElementById('ts-conf')?.value)||'';
  const msgEl = document.getElementById('ts-msg');
  const showErr = m => { if(msgEl){ msgEl.style.color='#F2A0A0'; msgEl.textContent=m; msgEl.style.display='block'; } };
  if(nova.length < 6){ showErr('A senha deve ter pelo menos 6 caracteres.'); return; }
  if(nova !== conf){ showErr('As senhas não coincidem.'); return; }
  if(!fbReady()){ showErr('Firebase não disponível.'); return; }
  const {auth, updatePassword} = fb();
  const firebaseUser = auth.currentUser;
  if(!firebaseUser){ showErr('Sessão inválida. Faça login novamente.'); return; }
  try {
    await updatePassword(firebaseUser, nova);
    // Remove flag trocar_senha
    if(usuarioLogado) usuarioLogado.trocar_senha = false;
    fbSaveAll();
    const m = document.getElementById('trocar-senha-modal');
    if(m) m.style.display='none';
    toast('Senha definida com sucesso! Bem-vindo(a) ao EP·CAGE.', 'var(--green)');
  } catch(e){
    const msgs = {
      'auth/requires-recent-login':'Sessão expirada. Faça logout e login novamente.',
      'auth/weak-password':'Senha muito fraca. Use pelo menos 6 caracteres.',
    };
    showErr(msgs[e.code] || 'Erro ao alterar senha: '+e.message);
  }
}

async function doLogout(){
  if(fbReady()){
    const {auth, signOut} = fb();
    await signOut(auth).catch(()=>{});
  }
  usuarioLogado=null;
  lsRemove('siga_user');
  const epToggle=document.getElementById('ep-toggle-wrap');if(epToggle)epToggle.style.display='none';
  // MODO LOCAL: ao deslogar, volta pro Hub em vez de mostrar tela de login
  document.querySelector('.shell').style.display='none';
  document.getElementById('module-hub').style.display='flex';
  if(typeof _hubVisible !== 'undefined') _hubVisible = true;
}

// ═══════════════════════════════════════════
// NAVEGAÇÃO
// ═══════════════════════════════════════════
function go(page,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('on'));
  document.getElementById('page-'+page).classList.add('on');
  if(btn)btn.classList.add('on');
  ({fila:rFila,dashboard:rDash,processos:renderProcs,arq:rArq,faq:rFaq,indicadores:()=>{rInd();},notificacoes:()=>{rNotif();},auditoria:rAuditoria,publicacoes:()=>{rPub();},admin:renderAdmin,plano:rPlano,avisos:rAvisos,trilhas:rTrilhas}[page]||function(){})();
  // Mobile: close drawer, update title
  if(globalThis.innerWidth<=720){mobClose();}
  const ttl={fila:'Minhas tarefas',dashboard:'Painel geral',processos:'Processos',arq:'Arquitetura',faq:'Base de FAQs',indicadores:'Indicadores',plano:'PAT',notificacoes:'Notificações',auditoria:'Auditoria',publicacoes:'Metodologias',admin:'Usuários',avisos:'Avisos',detalhe:'Processo',trilhas:'Trilhas de capacitação'};
  const el=document.getElementById('mob-page-title');if(el)el.textContent=ttl[page]||'SIGA 2.0';
}
function mobToggleDrawer(){
  const aside=document.querySelector('.aside');
  const backdrop=document.getElementById('mob-backdrop');
  const closeBtn=document.getElementById('mob-aside-close');
  const isOpen=aside.classList.contains('mob-open');
  aside.classList.toggle('mob-open',!isOpen);
  if(backdrop)backdrop.classList.toggle('on',!isOpen);
  if(closeBtn)closeBtn.style.display=isOpen?'none':'block';
}
function mobClose(){
  const aside=document.querySelector('.aside');
  const backdrop=document.getElementById('mob-backdrop');
  const closeBtn=document.getElementById('mob-aside-close');
  aside.classList.remove('mob-open');
  if(backdrop)backdrop.classList.remove('on');
  if(closeBtn)closeBtn.style.display='none';
}
function stab(id,el){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  document.querySelectorAll('.tab-p').forEach(p=>p.classList.remove('on'));
  el.classList.add('on');
  document.getElementById('tab-'+id).classList.add('on');
  ({acao:()=>rAcao(curProc),ent:()=>rEnt(curProc),mod:()=>rMod(curProc),form:()=>rForm(curProc),mon:()=>rMon(curProc),reun:()=>rReun(curProc),hist:()=>rHist(curProc)}[id]||function(){})();
}

// ═══════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════
function now(){const d=new Date();return d.getDate().toString().padStart(2,'0')+'/'+(d.getMonth()+1).toString().padStart(2,'0')+'/'+d.getFullYear();}
function push(p,step,role,acao){p.hist.push({step,role,acao,data:now()});}
function toast(msg,cor,ms){
  const t=document.createElement('div');
  t.className='toast';
  t.style.background=cor||'var(--green)';
  t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),ms||2800);
}

// ── Modal de confirmação (async, substitui confirm() nativo) ──────────────────
let _confirmarFn = null;
function confirmar(msg, fn, btnLabel, danger) {
  btnLabel = btnLabel || 'Confirmar';
  danger   = danger !== false;
  const modal = document.getElementById('modal-confirm');
  document.getElementById('modal-confirm-msg').textContent = msg;
  const ok = document.getElementById('modal-confirm-ok');
  ok.textContent = btnLabel;
  ok.className = 'btn ' + (danger ? 'btn-a' : 'btn-p');
  _confirmarFn = fn;
  modal.style.display = 'flex';
}
function _confirmarSim() {
  document.getElementById('modal-confirm').style.display = 'none';
  if(_confirmarFn) _confirmarFn();
  _confirmarFn = null;
}
function _confirmarNao() {
  document.getElementById('modal-confirm').style.display = 'none';
  _confirmarFn = null;
}
function pbBadge(p){return '<span class="badge '+({Baixa:'bg',Media:'ba',Alta:'br'}[p]||'bgr')+'">'+p+'</span>';}
function ibBadge(v){return '<span class="badge '+({Baixo:'bg',Medio:'ba',Alto:'br',Critico:'br'}[v]||'bgr')+'"'+(v==='Critico'?' style="background:var(--red);color:#fff"':'')+'>'+v+'</span>';}
function mBadge(s){return '<span class="badge '+({Identificada:'bsl','Em analise':'bp','Em execucao':'bb',Concluida:'bg'}[s]||'bgr')+'">'+s+'</span>';}
function updCounts(){
  document.getElementById('nb-total').textContent=processos.length;
  document.getElementById('nb-pend').textContent=processos.filter(p=>['det_valid_asis','det_valid_tobe','complement','apresentacao'].includes(p.etapa)).length;
  document.getElementById('nb-fila-cnt').textContent=getTarefasUsr().length;
  const mobFilaCnt=document.getElementById('mob-fila-cnt');if(mobFilaCnt){const c=getTarefasUsr().length;mobFilaCnt.textContent=c;mobFilaCnt.style.display=c>0?'inline-flex':'none';}
  document.getElementById('nb-notif-cnt').textContent=notifs.filter(n=>!n.lida).length;
  const audCnt=processos.filter(p=>p.etapa==='auditoria'||(p.auditoria?.concluida===true)).length;
  const audEl=document.getElementById('nb-aud-cnt');
  if(audEl) audEl.textContent=audCnt;
}

// ═══════════════════════════════════════════
// NOTIFICAÇÕES / EMAIL
// ═══════════════════════════════════════════
function salvarEmailJS(){
  ejsConfig.service = document.getElementById('ejs-service').value.trim();
  ejsConfig.template = document.getElementById('ejs-template').value.trim();
  ejsConfig.pubkey = document.getElementById('ejs-pubkey').value.trim();
  lsSet('epcage_ejs', JSON.stringify(ejsConfig));
  const status = document.getElementById('emailjs-status');
  if(ejsConfig.service && ejsConfig.template && ejsConfig.pubkey){
    if(typeof emailjs === 'undefined'){
      status.textContent = '⚠ Biblioteca EmailJS não carregada. Verifique a conexão com a internet.';
      status.className = 'ib iba';
    } else {
      emailjs.init({publicKey: ejsConfig.pubkey});
      status.textContent = '✓ EmailJS configurado — envio real de e-mails ativado.';
      status.className = 'ib ibg';
    }
  } else {
    status.textContent = 'Preencha os três campos para ativar o envio real.';
    status.className = 'ib ibb';
  }
  fbSaveEjs();
  toast('Configuração salva');
}

function testarEmailJS(){
  const res = document.getElementById('ejs-test-result');
  if(!ejsConfig.service || !ejsConfig.template || !ejsConfig.pubkey){
    res.textContent = 'Configure e salve as credenciais primeiro.';
    res.style.color = 'var(--red)';
    return;
  }
  if(typeof emailjs === 'undefined'){
    res.textContent = 'Biblioteca EmailJS não disponível.';
    res.style.color = 'var(--red)';
    return;
  }
  res.textContent = 'Enviando...';
  res.style.color = 'var(--ink3)';
  const destEmail = usuarioLogado?.email || '';
  const destNome = usuarioLogado?.nome || 'Usuário';
  emailjs.send(ejsConfig.service, ejsConfig.template, {
    to_name: destNome,
    to_email: destEmail,
    from_name: 'EP·CAGE — Teste',
    processo: 'Processo de teste',
    acao: 'Este é um e-mail de teste do sistema EP·CAGE.',
    prazo: 'N/A',
    link: 'https://sigaepp.web.app/',
  }).then(()=>{
    res.textContent = '✓ E-mail de teste enviado para ' + destEmail;
    res.style.color = 'var(--green)';
  }).catch(err=>{
    res.textContent = '✗ Erro: ' + (err.text || err.message || JSON.stringify(err));
    res.style.color = 'var(--red)';
  });
}
function enviarNotif(para_email,para_nome,acao,proc_nome,prazo,de_nome){
  if(!para_email){
    console.warn('enviarNotif: e-mail do destinatário vazio — notificação não enviada.');
    toast('⚠ E-mail do destinatário não encontrado — notificação não enviada.','var(--amber)');
    return;
  }
  const item={id:Date.now(),para:para_nome,para_email,acao,proc_nome,prazo,de:de_nome,data:now(),lida:false};
  notifs.unshift(item);
  updCounts();
  rNotif();
  // EmailJS
  if(ejsConfig.service&&ejsConfig.template&&ejsConfig.pubkey&&typeof emailjs!=='undefined'){
    emailjs.send(ejsConfig.service,ejsConfig.template,{
      to_name:para_nome,to_email:para_email,
      from_name:de_nome||'EP·CAGE',
      processo:proc_nome,acao,prazo:prazo||'Não definido',
      link:'https://eppcage.github.io/gesproc2.0/',
    }).then(()=>{
      console.info('EmailJS: e-mail enviado para',para_email);
    }).catch(err=>{
      const msg = err?.text || err?.message || JSON.stringify(err);
      console.warn('EmailJS erro ao enviar:',msg);
      toast('⚠ Falha ao enviar e-mail: '+msg,'var(--red)');
    });
  } else {
    const motivo = ejsConfig.pubkey ? 'Biblioteca não carregada' : 'EmailJS não configurado';
    console.warn('enviarNotif: e-mail não enviado —',motivo,'— para_email:',para_email);
  }
}
function _rNotifPreencherEmailJS(){
  const sf = document.getElementById('ejs-service');
  const tf = document.getElementById('ejs-template');
  const pf = document.getElementById('ejs-pubkey');
  const st = document.getElementById('emailjs-status');
  if(sf) sf.value = ejsConfig.service  || '';
  if(tf) tf.value = ejsConfig.template || '';
  if(pf) pf.value = ejsConfig.pubkey   || '';
  if(st && ejsConfig.service && ejsConfig.template && ejsConfig.pubkey){
    st.textContent = '✓ EmailJS configurado — envio real de e-mails ativado.';
    st.className = 'ib ibg';
  }
}
function _rNotifItemHTML(n){
  return `<div class="notif-item">
      <div class="notif-dot" style="${n.lida?'background:var(--bdr2)':''}"></div>
      <div style="flex:1">
        <div style="font-weight:500">${esc(n.acao)}</div>
        <div style="color:var(--ink3)">Para: ${esc(n.para)} · Processo: ${esc(n.proc_nome)} · Prazo: ${esc(n.prazo||'—')} · ${esc(n.data)}</div>
        ${n.lida?'':'<button type="button" class="btn" style="font-size:10px;padding:2px 7px;margin-top:3px" onclick="marcarLida('+n.id+')">Marcar como lida</button>'}
      </div>
    </div>`;
}
function rNotif(){
  const cfgCard = document.getElementById('ejs-config-card');
  if(cfgCard) cfgCard.style.display = isEP() ? 'block' : 'none';
  if(isEP()){_rNotifPreencherEmailJS();}
  const el=document.getElementById('notif-log');
  if(!el){return;}
  el.innerHTML=notifs.length
    ? notifs.map(_rNotifItemHTML).join('')
    : '<div style="font-size:12px;color:var(--ink3)">Nenhuma notificação.</div>';
  if(isEP()){setTimeout(injectAiConfigField, 100);}
}
function marcarLida(id){const n=notifs.find(x=>x.id===id);if(n){n.lida=true;}updCounts();rNotif();}
function limparNotifs(){notifs=notifs.filter(n=>!n.lida);updCounts();rNotif();}

// ═══════════════════════════════════════════
// FILA DE TAREFAS
// ═══════════════════════════════════════════
function getTarefasUsr(){
  if(!usuarioLogado)return[];
  const p=usuarioLogado.perfil;
  return processos.filter(proc=>{
    const et=proc.etapa,etObj=ETAPAS.find(e=>e.id===et);
    if(!etObj)return false;
    if(p==='ep')return etObj.resp==='ep';
    if(p==='dono'){
      const isDonoProc=proc.dono===usuarioLogado.nome;
      const isVinc=(usuarioLogado.processos_vinculados||[]).includes(proc.arq_id);
      return etObj.resp==='dono'&&(isDonoProc||isVinc);
    }
    if(p==='gestor')return etObj.resp==='gestor';
    return false;
  });
}
let filtAudMode='andamento';
function filtAuditoria(modo,el){
  filtAudMode=modo;
  document.querySelectorAll('#aud-chip-and,#aud-chip-conc,#aud-chip-all').forEach(c=>c.classList.remove('on'));
  el.classList.add('on');
  rAuditoria();
}
function abrirModalNovaAuditoria(){
  document.getElementById('modal-nova-auditoria').style.display='block';
  document.getElementById('aud-srch').value='';
  rListaAptosAuditoria();
}
function fecharModalNovaAuditoria(){
  document.getElementById('modal-nova-auditoria').style.display='none';
}
function rListaAptosAuditoria(){
  const el=document.getElementById('aud-aptos-list');
  if(!el)return;
  const srch=(document.getElementById('aud-srch')?.value||'').toLowerCase().trim();
  // Processos aptos = mapeados na arquitetura E não em auditoria ativa
  const aptos=processos.filter(p=>{
    if(p.etapa==='auditoria') return false; // já em auditoria ativa
    const mapped=p.arq_id?isMapeado(p.arq_id):['publicacao','acompanha'].includes(p.etapa);
    if(!mapped) return false;
    if(srch){
      const hay=[p.nome,p.area,p.macro,p.dono].join(' ').toLowerCase();
      if(!hay.includes(srch)) return false;
    }
    return true;
  });
  if(!aptos.length){
    const msg=document.createElement('div');
    msg.className='ib ibg';
    msg.textContent='Nenhum processo mapeado encontrado'+(srch?' para "'+srch+'"':'')+'. Marque processos como mapeados na arquitetura para habilitá-los.';
    el.replaceChildren(msg);
    return;
  }
  el.innerHTML=aptos.map(p=>`
    <div class="prc" style="margin-bottom:8px;cursor:pointer" onclick="iniciarNovaAuditoria(${p.id})">
      <div style="flex:1">
        <div class="prc-t">${esc(p.nome)}</div>
        <div class="prc-m"><strong>${esc(p.macro||'—')}</strong> · ${esc(p.area||'—')} · Dono: ${esc(p.dono||'—')}</div>
        <div style="font-size:11px;color:var(--ink3);margin-top:2px">
          <span class="badge bg" style="font-size:9px">Mapeado</span>
          &nbsp;Etapa atual: <strong>${esc(etLb(p.etapa))}</strong>
          ${p.auditoria?.data?`&nbsp;· Última auditoria: ${esc(p.auditoria.data)}`:''}
        </div>
      </div>
      <button type="button" class="btn btn-p" style="font-size:11px;padding:4px 12px" onclick="event.stopPropagation();iniciarNovaAuditoria(${p.id})">Iniciar auditoria →</button>
    </div>`).join('');
}
function iniciarNovaAuditoria(procId){
  const p=processos.find(x=>x.id===procId);
  if(!p) return;
  confirmar('Iniciar auditoria de "'+p.nome+'"?\nO processo será movido para a etapa Auditoria.', () => {
    p.auditoria=null; // limpa auditoria anterior
    p.etapa='auditoria';
    push(p,'auditoria','EP','Nova auditoria iniciada');
    fbAutoSave('novaAuditoria');
    fecharModalNovaAuditoria();
    rAuditoria();
    updCounts();
    toast('Auditoria iniciada para "'+p.nome+'"','var(--teal)');
    // Notificar dono sobre início de auditoria
    const donoEmailAud=getDonoEmail(p);
    if(donoEmailAud && p.dono) enviarNotif(donoEmailAud, p.dono, 'Auditoria iniciada para "'+p.nome+'" — aguarda sua participação para responder questões e ciência do relatório.', p.nome, '', usuarioLogado?.nome||'EP');
    // Abre o processo direto na aba auditoria
    setTimeout(()=>abrirProc(procId),300);
  });
}
function rAuditoria(){
  const el=document.getElementById('aud-list');
  if(!el)return;
  const lista=processos.filter(p=>{
    if(filtAudMode==='andamento') return p.etapa==='auditoria';
    if(filtAudMode==='concluida') return p.auditoria?.concluida===true;
    return p.etapa==='auditoria'||p.auditoria?.concluida===true;
  });
  document.getElementById('aud-sub').textContent=lista.length+' processo'+(lista.length===1?'':'s');
  if(!lista.length){el.innerHTML='<div class="ib ibg">Nenhum processo encontrado para este filtro.</div>';return;}
  el.innerHTML=lista.map(p=>{
    const aud=p.auditoria||{};
    const concluida=aud.concluida===true;
    const audConf=aud.conformidade?' · '+esc(aud.conformidade):'';
    const audRow=aud.data?`<div style="font-size:11px;color:var(--ink3);margin-top:3px">Auditoria: ${esc(aud.data)}${audConf}</div>`:'';
    const audConclusaoRow=aud.conclusao?`<div style="font-size:11px;color:var(--ink3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:400px">${esc(aud.conclusao)}</div>`:'';
    return `<div class="prc ${p.prio==='Critica'?'urg':''}" onclick="abrirProc(${p.id})" style="margin-bottom:8px">
      <div style="flex:1">
        <div class="prc-t">${esc(p.nome)}</div>
        <div class="prc-m"><strong>${esc(p.macro)}</strong> · ${esc(p.area)} · Dono: ${esc(p.dono)}</div>
        ${audRow}
        ${audConclusaoRow}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span class="badge ${concluida?'bg':'ba'}">${concluida?'Concluída':'Em andamento'}</span>
        ${pBadge(p.prio)}
      </div>
    </div>`;
  }).join('');
}
function rFila(){
  if(!usuarioLogado)return;
  rCarrosselAvisos();
  const tarefas=getTarefasUsr();
  document.getElementById('fila-sub').textContent=usuarioLogado.nome+' — '+(tarefas.length?tarefas.length+' tarefa(s) pendente(s)':'nenhuma tarefa pendente');
  const ACT={abertura:'Abrir processo e vincular à arquitetura',questionario:'Responder questionário de maturidade',reuniao:'Conduzir reunião de entendimento',analise:'Elaborar análise inteligente do AS IS',esboco_asis:'Elaborar esboço AS IS com BPMN',det_valid_asis:'Detalhar etapas e validar AS IS',riscos:'Identificar e avaliar riscos do processo',melhorias:'Revisar melhorias e mitigações identificadas',esboco_tobe:'Elaborar esboço TO BE com BPMN',det_valid_tobe:'Detalhar etapas e validar TO BE',desenho_final:'Finalizar desenho do processo',pop:'Construir POP no padrão CAGE',complement:'Complementar POP (FAQ, formulários)',apresentacao:'Apresentar ao gestor',publicacao:'Publicar no repositório oficial',acompanha:'Verificar conformidade na implementação',auditoria:'Conduzir auditoria do processo'};
  const el=document.getElementById('fila-content');
  if(!tarefas.length){el.innerHTML='<div style="text-align:center;padding:3rem"><div style="font-size:36px;margin-bottom:10px">✓</div><div style="font-size:15px;font-weight:600;color:var(--ink)">Você está em dia!</div><div style="font-size:12px;color:var(--ink3);margin-top:4px">Nenhuma tarefa pendente no momento.</div></div>';return;}
  const crit=tarefas.filter(t=>t.prio==='Critica');
  const norm=tarefas.filter(t=>t.prio!=='Critica');
  let html='';
  if(crit.length)html+='<div class="sec-lbl" style="margin-bottom:.5rem">Prioridade crítica</div>'+crit.map(t=>taskCard(t,ACT)).join('');
  if(norm.length)html+=(crit.length?'<hr>':'')+'<div class="sec-lbl" style="margin-bottom:.5rem">Demais tarefas</div>'+norm.map(t=>taskCard(t,ACT)).join('');
  el.innerHTML=html;
  rMeusProc();
}
function rMeusProc(){
  const panel = document.getElementById('meus-proc-panel');
  const listEl = document.getElementById('meus-proc-list');
  const cntEl = document.getElementById('meus-proc-cnt');
  if(!panel||!listEl||!usuarioLogado) return;

  // Only show for donos (EP sees everything in main views)
  if(usuarioLogado.perfil==='ep'){ panel.style.display='none'; return; }

  const minhas = getMinhasUnidades();
  if(!minhas.length){ panel.style.display='none'; return; }

  panel.style.display='block';
  cntEl.textContent = minhas.length + ' processo' + (minhas.length===1?'':'s');

  const ML_ = ['','Inicial','Repetível','Definido','Gerenciado','Otimizado'];
  listEl.innerHTML = minhas.map(u=>{
    const proc = u.proc;
    const mapeado = !!proc;
    const mat = proc?.ent?.mat||0;
    const cardClick = mapeado ? 'abrirProc('+proc.id+')' : "go('arq',document.getElementById('nb-arq'))";
    const cardTitle = mapeado ? 'Abrir mapeamento' : 'Ver na arquitetura';
    const borderColor = mapeado ? 'var(--teal-b)' : 'var(--bdr)';
    const borderL = mapeado ? 'var(--teal)' : 'var(--bdr2)';
    const matText = mat ? 'Maturidade '+mat+'/5 — '+ML_[mat] : 'Maturidade não avaliada';
    const ei = mapeado ? etIdx(proc.etapa) : -1;
    const progressBar = mapeado ? ETAPAS.map((_,i)=>{
      let bg;
      if(i<ei){bg='var(--teal)';}
      else if(i===ei){bg='var(--blue)';}
      else{bg='var(--bg3)';}
      return `<span style="flex:1;height:3px;border-radius:2px;background:${bg}"></span>`;
    }).join('') : '';
    return `<div style="background:var(--surf);border:1px solid ${borderColor};border-left:3px solid ${borderL};border-radius:var(--r);padding:.8rem 1rem;cursor:pointer;transition:all .13s" onclick="${cardClick}" title="${cardTitle}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:4px">
        <div style="font-size:12.5px;font-weight:600;color:var(--ink);line-height:1.3">${u.nome}</div>
        ${mapeado
          ? `<span class="badge ${EBADGE[proc.etapa]||'bgr'}" style="font-size:10px;flex-shrink:0">${etLb(proc.etapa)}</span>`
          : `<span class="badge bgr" style="font-size:10px;flex-shrink:0">Não mapeado</span>`}
      </div>
      <div style="font-size:11px;color:var(--ink3);margin-bottom:6px">${u.macro}</div>
      ${mapeado ? `
        <div style="display:flex;gap:2px;margin-bottom:4px">${progressBar}</div>
        <div style="font-size:11px;color:var(--ink3)">${matText}</div>
      ` : `<div style="font-size:11px;color:var(--ink4)">Clique para ver na arquitetura</div>`}
    </div>`;
  }).join('');
}
function taskCard(p,ACT){
  return `<div class="prc ${p.prio==='Critica'?'urg':''}" onclick="abrirProc(${p.id})" style="margin-bottom:8px">
    <div><div class="prc-t">${esc(p.nome)}</div>
    <div style="font-size:12px;color:var(--ink3);margin-top:3px">${esc(ACT[p.etapa]||p.etapa)}</div>
    <div class="prc-m" style="margin-top:4px"><strong>${esc(p.macro)}</strong> · ${esc(p.area)}</div></div>
    <div class="prc-r">${eBadge(p.etapa)}${pBadge(p.prio)}</div>
  </div>`;
}

// ═══════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════

// ─── PERMISSÕES ───────────────────────────────────────────
function getPerfisUsuario(u=usuarioLogado){
  if(!u) return [];
  if(Array.isArray(u.perfis) && u.perfis.length) return [...new Set(u.perfis.map(p=>String(p||'').trim()).filter(Boolean))];
  return u.perfil ? [u.perfil] : [];
}
function hasPerfil(perfil, u=usuarioLogado){ return getPerfisUsuario(u).includes(perfil); }
function isEP(){ return hasPerfil('ep'); }
function isDono(){ return hasPerfil('dono'); }
function isGerenteProjeto(){ return hasPerfil('gerente_projeto'); }
function hasProcessosAccess(u){ const ps=getPerfisUsuario(u||usuarioLogado); return ps.some(p=>['ep','dono','gestor'].includes(p)); }
function hasProjetosAccess(u){ const ps=getPerfisUsuario(u||usuarioLogado); return ps.some(p=>['ep','gerente_projeto'].includes(p)); }
function projCanWriteAll(){ return isEP(); }
function projCanWriteExec(){ return isEP() || isGerenteProjeto(); }
function projCanViewOnly(){ return isDono() && !isEP() && !isGerenteProjeto(); }
function projEnsureWriteAll(msg='Apenas EPP pode editar esta seção do módulo de projetos.'){
  if(projCanWriteAll()) return true;
  projToast(msg, '#d97706');
  return false;
}
function projEnsureWriteExec(msg='Apenas EPP e Gerente de Projeto podem executar esta ação.'){
  if(projCanWriteExec()) return true;
  projToast(msg, '#d97706');
  return false;
}


function _aplicarPermissoesNavBtns(){
  const btnNovo = document.getElementById('btn-novo-proc');
  if(btnNovo) btnNovo.innerHTML = isEP()
    ? '<button type="button" class="btn btn-p" onclick="abrirNovoProc()">+ Novo processo</button>'
    : '';
  const btnNovoDash = document.getElementById('btn-novo-proc-dash');
  if(btnNovoDash) btnNovoDash.innerHTML = isEP()
    ? '<button type="button" class="btn btn-p" onclick="abrirNovoProc()">+ Novo processo</button>'
    : '';
  const btnArq = document.getElementById('btn-arq-actions');
  if(btnArq) btnArq.innerHTML = isEP()
    ? `<div style="display:flex;gap:8px">
        <label class="btn" style="cursor:pointer">↑ Importar Excel
          <input type="file" id="xlsx-input" accept=".xlsx,.xls,.csv" style="display:none" onchange="importarArqExcel(this)">
        </label>
        <button type="button" class="btn" style="font-size:11px" onclick="deduplicarArquitetura()" title="Remove processos e subprocessos com nome duplicado">🧹 Limpar duplicatas</button>
        <button type="button" class="btn btn-p" onclick="novoMacro()">+ Macroprocesso</button>
       </div>`
    : '';
}
function _aplicarPermissoesAdminBadge(){
  const nbAdmin = document.getElementById('nb-admin');
  if(!nbAdmin) return;
  nbAdmin.style.display = isEP() ? '' : 'none';
  const pendCount = solicitacoes.filter(s=>s.status==='pendente').length;
  let badgeEl = nbAdmin.querySelector('.sol-badge');
  if(pendCount>0 && isEP()){
    if(!badgeEl){
      badgeEl = document.createElement('span');
      badgeEl.className = 'nav-cnt hot sol-badge';
      nbAdmin.appendChild(badgeEl);
    }
    badgeEl.textContent = pendCount;
    badgeEl.style.display = '';
  } else if(badgeEl){
    badgeEl.style.display = 'none';
  }
}
function aplicarPermissoes(){
  _aplicarPermissoesNavBtns();
  _aplicarPermissoesAdminBadge();
  const nbAud = document.getElementById('nb-aud');
  if(nbAud) nbAud.style.display = isEP() ? '' : 'none';
  const nbDash = document.getElementById('nb-dash');
  if(nbDash) nbDash.style.display = usuarioLogado?.perfil === 'dono' ? 'none' : '';
  document.querySelectorAll('.ep-only').forEach(el=>{ el.style.display=isEP()?'':'none'; });
}

function rDash(){
  aplicarPermissoes();
  document.getElementById('dash-dt').textContent=new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  updCounts();
  const mx=getMetricasArq();
  const pct=mx.nUnid>0?Math.round(mx.nMap/mx.nUnid*100):0;
  document.getElementById('dash-stats').innerHTML=
    `<div class="stat cb" style="grid-column:span 2;cursor:pointer" onclick="go('arq',document.getElementById('nb-arq'))" title="Ver arquitetura">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div><div class="stat-n">${pct}%</div><div class="stat-l">Processos mapeados</div></div>
        <div style="flex:1;min-width:120px">
          <div style="background:var(--bg3);border-radius:99px;height:8px;overflow:hidden">
            <div style="background:var(--teal);height:100%;width:${pct}%;border-radius:99px;transition:width .4s"></div>
          </div>
          <div style="font-size:11px;color:var(--ink3);margin-top:4px">${mx.nMap} de ${mx.nUnid} unidades mapeáveis</div>
        </div>
      </div>
    </div>`+
    '<div class="stat ca"><div class="stat-n">'+mx.nMacros+'</div><div class="stat-l">Macroprocessos</div></div>'+
    '<div class="stat cb"><div class="stat-n">'+mx.nProc+'</div><div class="stat-l">Processos</div></div>'+
    '<div class="stat cg"><div class="stat-n">'+mx.nSub+'</div><div class="stat-l">Subprocessos</div></div>'+
    '<div class="stat cr"><div class="stat-n">'+processos.filter(p=>p.prio==='Critica').length+'</div><div class="stat-l">Prioridade crítica</div></div>';
  // Pipeline
  const cnt={};ETAPAS.forEach(e=>{cnt[e.id]=processos.filter(p=>p.etapa===e.id).length;});
  document.getElementById('dash-pipe').innerHTML=buildPipelineHTML(cnt);
  const pend=processos.filter(p=>['det_valid_asis','det_valid_tobe','complement','apresentacao'].includes(p.etapa));
  document.getElementById('dash-pend').innerHTML=buildPendentesHTML(pend);
}
function filtEtapaGo(etId){filtFaseAtual='';document.querySelectorAll('#fase-chips .chip').forEach((c,i)=>c.classList.toggle('on',i===0));go('processos',document.getElementById('nb-proc'));}

function buildPipelineHTML(cnt){
  const faseMap={Entendimento:'pip-e',Modelagem:'pip-m',Formalizacao:'pip-f',Operacao:'pip-o',Auditoria:'pip-a'};
  const faseTitle={Entendimento:'Entendimento',Modelagem:'Modelagem',Formalizacao:'Formalização',Operacao:'Operação',Auditoria:'Auditoria'};
  return FASES.map(f=>`
    <div class="pip-phase"><div class="pip-phase-hd ${faseMap[f]}">${faseTitle[f]}</div>
    <div class="pip-steps">${ETAPAS.filter(e=>e.fase===f).map(e=>`
      <div class="pip-step ${faseMap[f]} ${cnt[e.id]>0?'has':''}" onclick="filtEtapaGo('${e.id}')">
        <div class="pip-dot"></div>${e.lb}${cnt[e.id]>0?' <strong style="margin-left:auto">'+cnt[e.id]+'</strong>':''}
      </div>`).join('')}
    </div></div>`).join('');
}
function buildPendentesHTML(pend){
  if(!pend.length) return '<div class="ib ibg">Nenhuma aprovação pendente.</div>';
  return pend.map(p=>`<div class="prc" onclick="abrirProc(${p.id})" style="margin-bottom:7px"><div><div class="prc-t">${esc(p.nome)}</div><div class="prc-m">${esc(p.dono)}</div></div><div>${eBadge(p.etapa)}</div></div>`).join('');
}
// ═══════════════════════════════════════════
// LISTA DE PROCESSOS
// ═══════════════════════════════════════════
function filtFase(fase,el){filtFaseAtual=fase;document.querySelectorAll('#fase-chips .chip').forEach(c=>c.classList.remove('on'));el.classList.add('on');renderProcs();}
function renderProcs(){
  aplicarPermissoes();
  const srch=(document.getElementById('srch-p')?.value||'').toLowerCase();
  const isDono=usuarioLogado?.perfil==='dono';
  const lista=processos.filter(p=>{
    if(isDono){
      const isDonoProc=(p.dono===usuarioLogado.nome);
      const isInteressado=(p.interessados||[]).includes(usuarioLogado.email);
      // Também exibe se o processo está vinculado ao usuário via arq_id (menu Usuários)
      const isVinculado=(usuarioLogado.processos_vinculados||[]).includes(p.arq_id);
      if(!isDonoProc&&!isInteressado&&!isVinculado)return false;
    }
    return(!filtFaseAtual||etFase(p.etapa)===filtFaseAtual)&&(!srch||p.nome.toLowerCase().includes(srch)||p.macro.toLowerCase().includes(srch));
  });
  const el=document.getElementById('proc-list'),em=document.getElementById('proc-empty');
  if(!lista.length){el.innerHTML='';em.style.display='block';return;}
  em.style.display='none';
  el.innerHTML=lista.map(p=>`<div class="prc ${p.prio==='Critica'?'urg':''}" onclick="abrirProc(${p.id})">
    <div><div class="prc-t">${esc(p.nome)}</div>
    <div class="prc-m"><strong>${esc(p.macro)}</strong> · ${esc(p.area)} · Dono: <strong>${esc(p.dono)}</strong> · EP: <strong>${esc(p.resp_ep)}</strong></div></div>
    <div class="prc-r">${fBadge(p.etapa)}${eBadge(p.etapa)}${pBadge(p.prio)}${isEP()?`<button type="button" class="btn" style="font-size:11px;padding:3px 9px;color:var(--red);border-color:var(--red-b);margin-left:4px" onclick="event.stopPropagation();excluirMapeamento(${p.id})">× Excluir</button>`:''}</div>
  </div>`).join('');
}
function excluirMapeamento(id){
  if(!isEP()){toast('Ação restrita ao EP.','var(--amber)');return;}
  const p=processos.find(x=>x.id===id);
  if(!p)return;
  confirmar('Excluir o mapeamento "'+p.nome+'" permanentemente?\nEsta ação não pode ser desfeita.', () => {
    processos=processos.filter(x=>x.id!==id);
    renderProcs();
    updCounts();
    // Apaga o documento do Firestore imediatamente (não basta só salvar os restantes)
    if(fbReady()){
      const {db,doc,deleteDoc}=fb();
      deleteDoc(doc(db,'processos',String(id))).catch(e=>console.warn('deleteDoc error:',e.message));
    }
    fbAutoSave('excluirMapeamento');
    toast('Mapeamento "'+p.nome+'" excluído.','var(--red)');
  });
}
function abrirProc(id){
  curProc=processos.find(p=>p.id===id);
  // Keep etapasIdC ahead of any existing etapa IDs in this process
  const nums=(curProc?.mod?.etapas_proc||[]).map(e=>Number.parseInt(String(e.id||'').replaceAll('ep',''))||0);
  if(nums.length) etapasIdC=Math.max(etapasIdC,...nums)+1;
  rDetalhe();
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('on'));
  document.getElementById('page-detalhe').classList.add('on');
  document.getElementById('nb-proc').classList.add('on');
}
function rDetalhe(){
  const p=curProc;
  document.getElementById('det-titulo').textContent=p.nome;
  document.getElementById('det-badge').innerHTML=fBadge(p.etapa)+' '+eBadge(p.etapa);
  document.getElementById('det-prio').innerHTML=pBadge(p.prio)
    +(isEP()?` <button type="button" class="btn" style="font-size:11px;padding:2px 8px;margin-left:6px" title="Editar dono, interessados e produto" onclick="abrirEditarMetadados()">✎ Editar</button>`:'');
  epRetroEtapa = null;
  const _etapasEfetivas=getEtapas(p);
  const idx=_etapasEfetivas.findIndex(e=>e.id===p.etapa);
  const epUser=isEP();
  document.getElementById('det-prog').innerHTML=_etapasEfetivas.map((e,i)=>{
    const past=i<idx,cur=i===idx;
    let stageCls;
    if(past) stageCls='dn';
    else if(cur) stageCls='da';
    else stageCls='';
    const clickable=epUser;
    let tip;
    if(cur) tip=`Editar etapa atual: ${e.lb}`;
    else tip=`Editar: ${e.lb}`;
    const clickAttrs=clickable?`onclick="navegarRetro('${e.id}')" style="cursor:pointer" title="${tip}"`:'';
    return `<div class="prog-s ${stageCls}" ${clickAttrs}>
      <div class="prog-d ${stageCls}">${past?'✓':(i+1)}</div>
      <div class="prog-l ${cur?'da':''}">${e.lb}</div>
    </div>`;
  }).join('');
  if(usuarioLogado?.perfil==='dono'){
    const etObj=_etapasEfetivas.find(e=>e.id===p.etapa);
    const minhaTarefa=etObj?.resp==='dono'&&p.dono===usuarioLogado.nome;
    document.getElementById('det-tabs').innerHTML=
      `<div class="tab on" role="tab" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" onclick="stab('acao',this)">${minhaTarefa?'Minha tarefa':'Sobre o processo'}</div>`+
      `<div class="tab" role="tab" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" onclick="stab('hist',this)">Histórico</div>`;
    ['ent','mod','form','mon'].forEach(id=>{
      const el=document.getElementById('tab-'+id);
      if(el){el.innerHTML='';el.classList.remove('on');}
    });
    document.getElementById('tab-acao').classList.add('on');
    document.getElementById('tab-hist').classList.remove('on');
    rAcao(p);
    setTimeout(injectIaAssistente, 100);
    return;
  }
  document.querySelectorAll('.tab').forEach((t,i)=>t.classList.toggle('on',i===0));
  document.querySelectorAll('.tab-p').forEach((p,i)=>p.classList.toggle('on',i===0));
  rAcao(p);
  setTimeout(injectIaAssistente, 100);
}

function abrirEditarMetadados(){
  const p=curProc;if(!p||!isEP())return;
  const ov=document.createElement('div');
  ov.id='modal-metadados';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem';
  ov.innerHTML=`<div style="background:var(--surf);border-radius:14px;padding:1.8rem;max-width:480px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.25)">
    <div style="font-size:15px;font-weight:700;color:var(--ink);margin-bottom:1.2rem">✎ Editar dados do processo</div>
    <div class="fg"><label class="fl">Dono do processo</label>
      <input class="fi" id="em-dono" value="${esc(p.dono||'')}" placeholder="Nome do dono"></div>
    <div class="fg"><label class="fl">E-mail do dono</label>
      <input class="fi" id="em-dono-email" type="email" value="${esc(p.dono_email||'')}" placeholder="email@sefaz.rs.gov.br"></div>
    <div class="fg"><label class="fl">Produto do mapeamento</label>
      <select class="fi" id="em-produto">
        <option ${p.produto==='AS IS'?'selected':''}>AS IS</option>
        <option ${p.produto==='TO BE'?'selected':''}>TO BE</option>
        <option ${p.produto==='AS IS + TO BE'?'selected':''}>AS IS + TO BE</option>
      </select></div>
    <div class="fg"><label class="fl">Interessados <small style="font-weight:400;color:var(--ink3)">(um e-mail por linha)</small></label>
      <textarea class="fi" id="em-inter" style="min-height:80px" placeholder="email1@sefaz.rs.gov.br&#10;email2@sefaz.rs.gov.br">${(p.interessados||[]).join('\n')}</textarea></div>
    <div class="btn-row" style="margin-top:1rem">
      <button type="button" class="btn" onclick="document.getElementById('modal-metadados').remove()">Cancelar</button>
      <button type="button" class="btn btn-p" onclick="salvarMetadados()">Salvar alterações</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
}
function salvarMetadados(){
  const p=curProc;if(!p)return;
  p.dono=document.getElementById('em-dono')?.value.trim()||p.dono;
  p.dono_email=document.getElementById('em-dono-email')?.value.trim()||p.dono_email;
  p.produto=document.getElementById('em-produto')?.value||p.produto;
  const inter=(document.getElementById('em-inter')?.value||'').split('\n').map(s=>s.trim()).filter(Boolean);
  p.interessados=inter;
  document.getElementById('modal-metadados')?.remove();
  fbAutoSave('editarMetadados');
  rDetalhe();
  toast('Dados atualizados!','var(--teal)');
}

// ═══════════════════════════════════════════
// NOVO PROCESSO (vinculado à arquitetura)
// ═══════════════════════════════════════════
function abrirNovoProc(){
  // Populate macroprocesso select
  const sel=document.getElementById('novo-macro');
  sel.innerHTML='<option value="">Selecione...</option>'+ARQUITETURA.map(m=>`<option value="${esc(m.id)}">${esc(m.nome)}</option>`).join('');
  // Populate EP users
  const epSel=document.getElementById('novo-resp-ep');
  epSel.innerHTML=USUARIOS.filter(u=>u.perfil==='ep').map(u=>`<option value="${esc(u.nome)}">${esc(u.nome)}</option>`).join('');
  document.getElementById('novo-proc-sel').innerHTML='<option value="">Selecione o macroprocesso primeiro...</option>';
  document.getElementById('novo-preview').style.display='none';
  go('novo',document.getElementById('nb-proc'));
}
function filtrarProcArq(){
  const mid=document.getElementById('novo-macro').value;
  const sel=document.getElementById('novo-proc-sel');
  if(!mid){sel.innerHTML='<option value="">Selecione o macroprocesso primeiro...</option>';return;}
  const m=ARQUITETURA.find(x=>x.id===mid);
  if(!m){return;}
  // Build flat list of mappable units:
  // - if process has subprocessos → list each subprocesso (process itself is just a grouper)
  // - if process has NO subprocessos → list the process itself
  const jaAbertos=new Set(processos.map(p=>p.arq_id));
  const opcoes=[];
  m.processos.forEach(p=>{
    if(p.subprocessos&&p.subprocessos.length>0){
      // subprocessos are the mappable units
      p.subprocessos.forEach(s=>{
        if(!jaAbertos.has(s.id)){
          opcoes.push({id:s.id,label:p.nome+' › '+s.nome,parentId:p.id,isSub:true});
        }
      });
    } else if(!jaAbertos.has(p.id)) {
      // process itself is mappable
      opcoes.push({id:p.id,label:p.nome,parentId:null,isSub:false});
    }
  });
  if(!opcoes.length){
    sel.innerHTML='<option value="">Todos os processos/subprocessos já foram mapeados</option>';
    return;
  }
  sel.innerHTML='<option value="">Selecione...</option>'+opcoes.map(o=>`<option value="${esc(o.id)}">${esc(o.label)}</option>`).join('');
  document.getElementById('novo-preview').style.display='none';
}
function previewProcArq(){
  const mid=document.getElementById('novo-macro').value;
  const sid=document.getElementById('novo-proc-sel').value;
  const prev=document.getElementById('novo-preview');
  if(!mid||!sid){prev.style.display='none';return;}
  const item=findArqItem(mid,sid);
  if(!item){prev.style.display='none';return;}
  prev.style.display='block';
  prev.innerHTML=`<strong>Área:</strong> ${esc(item.area)||'—'}<br>
    <strong>Objetivo:</strong> ${esc(item.objetivo)||'—'}<br>
    <strong>Entradas:</strong> ${esc(item.entradas)||'—'} &nbsp;·&nbsp; <strong>Entregas:</strong> ${esc(item.entregas)||'—'}<br>
    <strong>Clientes:</strong> ${esc(item.clientes)||'—'}`;
}

// Helper: find a process or subprocesso by id within a macro
function findArqItem(mid, itemId){
  const m=ARQUITETURA.find(x=>x.id===mid);
  if(!m)return null;
  for(const p of m.processos){
    if(p.id===itemId)return p; // process with no subs
    const s=p.subprocessos?.find(s=>s.id===itemId);
    if(s)return s;
  }
  return null;
}
function findArqItemById(itemId){
  for(const m of ARQUITETURA){
    for(const p of m.processos){
      if(p.id===itemId) return p;
      const s=(p.subprocessos||[]).find(s=>s.id===itemId);
      if(s) return s;
    }
  }
  return null;
}
function sincronizarSIPOCArquitetura(proc){
  if(!proc.arq_id) return;
  const item = findArqItemById(proc.arq_id);
  if(!item) return;
  if(proc.ent.entradas)      item.entradas      = proc.ent.entradas;
  if(proc.ent.saidas)        item.entregas      = proc.ent.saidas;
  if(proc.ent.clientes)      item.clientes      = proc.ent.clientes;
  if(proc.ent.fornecedores)  item.fornecedores  = proc.ent.fornecedores;
  if(proc.ent.atores)        item.atores        = proc.ent.atores;
}
function autoFillDonoEmail(){
  const nome=document.getElementById('novo-dono-nome').value;
  const emailEl=document.getElementById('novo-dono-email');
  if(emailEl.value) return; // não sobrescreve se já preenchido
  const u=USUARIOS.find(x=>x.nome===nome);
  if(u) emailEl.value=u.email;
}
function sugerirDono(){
  const nomeEl=document.getElementById('novo-dono-nome');
  const emailEl=document.getElementById('novo-dono-email');
  const q=nomeEl.value.toLowerCase();
  const dl=document.getElementById('novo-dono-sugest');
  dl.innerHTML='';
  if(q.length<2) return;
  USUARIOS.filter(u=>u.nome.toLowerCase().includes(q)||u.email.toLowerCase().includes(q)).slice(0,8).forEach(u=>{
    const opt=document.createElement('option');
    opt.value=u.nome;
    dl.appendChild(opt);
  });
  // Auto-fill email when value exactly matches a known user
  const match=USUARIOS.find(u=>u.nome.toLowerCase()===q);
  if(match && !emailEl.value) emailEl.value=match.email;
}
function criarProcesso(){
  if(!isEP()){toast('Apenas o EPP pode abrir novos mapeamentos.','var(--amber)');return;}
  const mid=document.getElementById('novo-macro').value;
  const sid=document.getElementById('novo-proc-sel').value;
  const resp_ep=document.getElementById('novo-resp-ep').value;
  const prio=document.getElementById('novo-prio').value;
  const produto=document.getElementById('novo-produto').value;
  const objetivo=document.getElementById('novo-objetivo').value.trim();
  const donoNome=document.getElementById('novo-dono-nome').value.trim();
  const donoEmail=document.getElementById('novo-dono-email').value.trim();
  if(!mid||!sid||!produto){toast('Selecione macroprocesso, processo/subprocesso e produto da demanda.','var(--amber)');return;}
  if(!donoNome||!donoEmail){toast('Informe o nome e o e-mail do dono do processo.','var(--amber)');return;}
  const m=ARQUITETURA.find(x=>x.id===mid);
  const ap=findArqItem(mid,sid);
  if(!ap){toast('Processo não encontrado na arquitetura.','var(--amber)');return;}
  // Mark the item as linked
  ap.proc_id=nextProcId;
  const p={
    id:nextProcId++,arq_id:sid,nome:ap.nome,macro:m.nome,area:ap.area,dono:donoNome,dono_email:donoEmail,
    interessados:(document.getElementById('novo-interessados')?.value||'').split('\n').map(s=>s.trim()).filter(Boolean),
    pat:USUARIOS.find(u=>u.perfil==='gestor')?.nome||'',
    resp_ep,prio,produto,objetivo:objetivo||ap.objetivo,
    ent:{dt_inicio:new Date().toISOString().slice(0,10),dt_prev:'',dt_efetiva:'',equipe:resp_ep+', '+donoNome,t_total:'',t_sem_fila:'',
      prob:[],mat:0,quest_resp:{},vol:{exec:'',tempo:'',custo:'',sazon:''},riscos:[],
      analise:{gargalos:[],retrabalhos:[],gaps:[],oportunidades:[],complexidade:'',t_ciclo_medio:'',t_espera_medio:'',qtd_decisoes:0,qtd_atividades:0}},
    mod:{asIs:'',toBe:'',bpmnAsIs:null,bpmnToBe:null,obs:'',etapas_proc:[]},
    form:{pop_ok:false,pop:null,apresent:'',bpmnXml:null},
    etapa:'abertura',
    hist:[{step:'abertura',role:'EP',acao:'Processo aberto e vinculado à arquitetura',data:now()}],
  };
  processos.push(p);
  updCounts();
  toast('Processo criado com sucesso!');
  // Pede confirmação antes de notificar o dono
  setTimeout(()=>{
    if(!donoEmail||!donoNome) return;
    const ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9998;display:flex;align-items:center;justify-content:center';
    const card=document.createElement('div');
    card.style.cssText='background:var(--surf);border-radius:14px;padding:2rem 1.8rem;max-width:420px;width:92%;box-shadow:0 12px 40px rgba(0,0,0,.25)';
    const ttl=document.createElement('div');
    ttl.style.cssText='font-size:15px;font-weight:700;color:var(--ink);margin-bottom:.7rem';
    ttl.textContent='Notificar Dono do Processo?';
    const msg=document.createElement('div');
    msg.style.cssText='font-size:13px;color:var(--ink3);margin-bottom:1.2rem';
    msg.appendChild(document.createTextNode('Deseja enviar notificação e e-mail para '));
    const strong=document.createElement('strong'); strong.textContent=p.dono||''; msg.appendChild(strong);
    msg.appendChild(document.createTextNode(' informando que o mapeamento de '));
    const em=document.createElement('em'); em.textContent=p.nome||''; msg.appendChild(em);
    msg.appendChild(document.createTextNode(' foi iniciado?'));
    const row=document.createElement('div'); row.className='btn-row';
    const bNo=document.createElement('button'); bNo.type='button'; bNo.className='btn'; bNo.textContent='Não agora';
    bNo.addEventListener('click',()=>ov.remove());
    const bYes=document.createElement('button'); bYes.type='button'; bYes.className='btn btn-p'; bYes.textContent='Sim, notificar →';
    bYes.addEventListener('click',()=>{
      enviarNotif(donoEmail,p.dono,'Mapeamento iniciado — aguarda questionário de maturidade',p.nome,'','EP·CAGE');
      toast('Notificação enviada para '+(p.dono||''),'var(--teal)');
      ov.remove();
    });
    row.append(bNo,bYes); card.append(ttl,msg,row); ov.appendChild(card);
    document.body.appendChild(ov);
  }, 400);
  fbAutoSave('criarProcesso');
  abrirProc(p.id);
}

// ═══════════════════════════════════════════
// AVANÇAR ETAPA COM NOTIFICAÇÃO
// ═══════════════════════════════════════════
function av(etAtu, role, acao, _prazoEl, notifDest){
  push(curProc, etAtu, role, acao);
  const nx = nextEt(etAtu);
  if(nx){
    curProc.etapa = nx;
    push(curProc, nx, 'Sistema', 'Etapa iniciada');
  }
  rDetalhe();updCounts();
  fbAutoSave('av');
  // Notificar dono apenas quando a próxima etapa é dele (tarefa)
  if(isEP() && curProc?.dono){
    const etObj = getEtapas(curProc).find(e=>e.id===nx);
    if(etObj?.resp==='dono'){
      setTimeout(()=>perguntarNotifDono(nx),200);
    }
  }
}
// Solicita prazo ao EP antes de passar tarefa ao dono
function perguntarNotifDono(etapaProxId){
  const p=curProc;
  if(!p||!p.dono) return;
  const d=new Date(); d.setDate(d.getDate()+7);
  const defaultPrazo=d.toISOString().split('T')[0];
  const hoje=new Date().toISOString().split('T')[0];
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9998;display:flex;align-items:center;justify-content:center';
  ov.innerHTML=`<div style="background:var(--surf);border-radius:14px;padding:2rem 1.8rem;max-width:440px;width:92%;box-shadow:0 12px 40px rgba(0,0,0,.25)">
    <div style="font-size:15px;font-weight:700;color:var(--ink);margin-bottom:.5rem">📋 Tarefa encaminhada ao dono</div>
    <div style="font-size:13px;color:var(--ink3);margin-bottom:1rem">A etapa <em><strong>${etLb(etapaProxId)}</strong></em> aguarda ação de <strong>${esc(p.dono)}</strong>. Defina o prazo para que o dono conclua esta tarefa.</div>
    <div class="fg" style="margin-bottom:1.2rem">
      <label class="fl">Prazo para conclusão <span style="color:var(--red)">*</span></label>
      <input class="fi" type="date" id="prazo-dono-inp" value="${defaultPrazo}" min="${hoje}">
    </div>
    <div class="btn-row">
      <button type="button" class="btn" onclick="salvarPrazoDono('${etapaProxId||''}',false)">Salvar sem notificar</button>
      <button type="button" class="btn btn-p" onclick="salvarPrazoDono('${etapaProxId||''}',true)">Salvar e notificar dono →</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  globalThis._prazoDonoOv=ov;
}
function salvarPrazoDono(etapaProxId, notificar){
  const prazo=document.getElementById('prazo-dono-inp')?.value;
  if(!prazo){toast('Informe o prazo antes de continuar.','var(--red)');return;}
  if(curProc) curProc.prazo_dono=prazo;
  if(globalThis._prazoDonoOv){globalThis._prazoDonoOv.remove();globalThis._prazoDonoOv=null;}
  fbAutoSave('prazo_dono');
  if(notificar) confirmarNotifDono(etapaProxId);
  else toast('Prazo registrado para '+etLb(etapaProxId),'var(--teal)');
}
function confirmarNotifDono(etapaProxId){
  const p=curProc;
  if(!p||!p.dono) return;
  const email=getDonoEmail(p);
  if(!email){toast('E-mail do dono não encontrado no cadastro.','var(--amber)');return;}
  const pz=p.prazo_dono?p.prazo_dono.split('-').reverse().join('/'):'';
  const acao='Nova tarefa: '+etLb(etapaProxId)+' — prazo: '+(pz||'a definir');
  enviarNotif(email, p.dono, acao, p.nome, '', usuarioLogado?.nome||'EP');
  toast('Notificação enviada para '+p.dono,'var(--teal)');
}
function reprovar(voltaEt, role, acao){
  const obs = document.getElementById('aobs')?.value||'';
  push(curProc, curProc.etapa, role, acao+(obs?' — '+obs:''));
  curProc.etapa = voltaEt;
  push(curProc, voltaEt, 'Sistema', 'Retornado para ajustes');
  rDetalhe();
}
function popupConclusaoDono(msg){
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:9999;display:flex;align-items:center;justify-content:center';
  ov.innerHTML=`<div style="background:var(--surf);border-radius:14px;padding:2.5rem 2rem;max-width:380px;width:90%;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.25)">
    <div style="font-size:52px;margin-bottom:.8rem">✅</div>
    <div style="font-size:18px;font-weight:700;color:var(--ink);margin-bottom:.5rem">Tarefa concluída!</div>
    <div style="font-size:13px;color:var(--ink3);line-height:1.6;margin-bottom:1.5rem">${msg}</div>
    <button type="button" class="btn btn-p" onclick="this.closest('[style*=fixed]').remove()">Ok, entendido</button>
  </div>`;
  document.body.appendChild(ov);
  setTimeout(()=>{if(ov.parentNode)ov.remove();},10000);
}
function avDono(etAtu,role,acao,prazoEl){
  registrarRespondidoPor(etAtu);
  // Limpa devolução pendente ao dono quando ele resubmete
  if(curProc?.ent?.devolucao_pendente?.etapa===etAtu) delete curProc.ent.devolucao_pendente;
  // Sinaliza ao EP que há uma entrega do dono aguardando revisão antes de prosseguir
  if(!curProc.ent) curProc.ent={};
  curProc.ent.revisao_ep_pendente={etapa_dono:etAtu,dt:now()};
  av(etAtu,role,acao,prazoEl);
  setTimeout(()=>popupConclusaoDono('Obrigado! Sua validação foi registrada e o EP foi notificado para continuar o processo.'),200);
}

// ── Bloqueio de múltiplas respostas (first-response-wins) ──
function registrarRespondidoPor(etapa){
  const p=curProc; if(!p||!usuarioLogado) return;
  if(!p.ent.respondido_por_etapa) p.ent.respondido_por_etapa={};
  if(!p.ent.respondido_por_etapa[etapa]){
    p.ent.respondido_por_etapa[etapa]={nome:usuarioLogado.nome,email:usuarioLogado.email||'',dt:now()};
    fbAutoSave('respondidoPor');
  }
}
function jaFoiRespondido(etapa){
  const jr=curProc?.ent?.respondido_por_etapa?.[etapa];
  if(!jr) return false;
  if(jr.nome===usuarioLogado?.nome) return false;
  return jr; // retorna o objeto {nome, email, dt}
}
function reprovarDono(voltaEt,role,acao){
  reprovar(voltaEt,role,acao);
  setTimeout(()=>popupConclusaoDono('Ajuste solicitado com sucesso! O EP foi notificado e revisará o material antes de encaminhar novamente.'),200);
}

// ── Salva os dados do formulário do dono sem avançar etapa (usado pelo EP ao editar) ──
function _salvarDadosDono(){
  const p=curProc;
  const etDono=p?.ent?.revisao_ep_pendente?.etapa_dono;
  if(!etDono||!p) return;
  if(!p.ent) p.ent={};
  if(etDono==='questionario'){
    const resp=p.ent.quest_resp||{};
    const vals=Object.values(resp);
    if(vals.length>0){
      const media=(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1);
      p.ent.mat=_calcNivelMaturidade(Number.parseFloat(media));
    }
    p.ent.quest_nota=document.getElementById('quest-nota')?.value??p.ent.quest_nota??'';
  } else if(etDono==='complement'){
    if(!p.form) p.form={};
    p.form.faq=document.getElementById('afaq')?.value??p.form.faq??'';
    p.form.excecoes=document.getElementById('a-excecoes')?.value??p.form.excecoes??'';
    p.form.contatos=document.getElementById('a-contatos')?.value??p.form.contatos??'';
    p.form.forms=document.getElementById('aforms')?.value??p.form.forms??'';
    const obs=document.getElementById('aobs')?.value||'';
    if(obs) p.form.obs_complement=obs;
  }
  // det_valid_asis / det_valid_tobe: etapas_proc já salvas por handlers inline; apenas flush
}
function salvarEdicaoEPDono(){
  const p=curProc;
  const etDono=p?.ent?.revisao_ep_pendente?.etapa_dono;
  if(!etDono) return;
  _salvarDadosDono();
  push(p, etDono, 'EP', 'EP editou a resposta do dono nesta etapa');
  fbAutoSave('epEditouDono');
  toast('Edições salvas com sucesso.','var(--blue)');
  rDetalhe();
}

// ── Revisão da entrega do dono (tela intermediária para o EP) ──
function _rAcaoRevisaoDono(el, p){
  const etDono=p.ent.revisao_ep_pendente.etapa_dono;
  const acDono=ACOES[etDono];
  if(!acDono){el.innerHTML='<div class="ib ibsl">Dados da etapa não encontrados.</div>';return;}
  const formHtml=acDono.form?acDono.form(p):'';
  el.innerHTML=`
    <div style="background:var(--blue-l);border:1.5px solid var(--blue-b);border-radius:var(--r);padding:.8rem 1rem;margin-bottom:1rem;display:flex;gap:.7rem;align-items:flex-start">
      <span style="font-size:1.4rem">✏️</span>
      <div>
        <div style="font-weight:700;font-size:13px;color:var(--blue);margin-bottom:3px">Revisar entrega do dono — ${esc(acDono.titulo)}</div>
        <div style="font-size:12.5px;color:var(--ink2)"><strong>${esc(p.dono||'Dono')}</strong> concluiu esta etapa. Revise, edite se necessário e decida como prosseguir.</div>
      </div>
    </div>
    <style>.ep-dono-form-wrap .btn-row{display:none!important}</style>
    <div class="ep-dono-form-wrap">
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.7rem;flex-wrap:wrap;gap:8px">
          <div><div class="card-t" style="margin-bottom:2px">${esc(acDono.titulo)}</div>
          <div style="font-size:12px;color:var(--ink3)">${esc(acDono.sub||'')}</div></div>
          <span class="badge bsl">${esc(acDono.role||'Dono')}</span>
        </div>
        ${formHtml}
      </div>
    </div>
    <div style="margin-top:1rem;padding:.7rem 1rem;background:var(--bg2);border:1px dashed var(--bdr);border-radius:var(--r);display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
      <span style="font-size:12px;color:var(--ink3)">Edições feitas acima serão mantidas no processo.</span>
      <button type="button" class="btn" style="font-size:12px;padding:5px 14px;color:var(--blue);border-color:var(--blue-b);background:var(--blue-l)" onclick="salvarEdicaoEPDono()">💾 Salvar edições do EP</button>
    </div>
    <div style="display:flex;gap:.6rem;margin-top:.6rem;flex-wrap:wrap">
      <button type="button" class="btn btn-p" style="flex:1;min-width:160px;padding:.65rem;font-size:13px" onclick="prosseguirFluxo()">✓ Prosseguir com o fluxo</button>
      <button type="button" class="btn" style="flex:1;min-width:160px;padding:.65rem;font-size:13px;color:#92400e;border-color:#f59e0b;background:#fef3c7" onclick="devolverAoDono()">↩ Devolver para ajustes</button>
    </div>`;
  _rAcaoInitBpmn(p, true);
}
function prosseguirFluxo(){
  const p=curProc;
  if(!p?.ent?.revisao_ep_pendente) return;
  _salvarDadosDono(); // salva silenciosamente quaisquer edições pendentes
  delete p.ent.revisao_ep_pendente;
  fbAutoSave('prosseguirFluxo');
  rDetalhe();
  updCounts();
}

// ── Devolver tarefa ao dono (EP → dono) ──
function getDevolverEtapa(p){
  const etapas=getEtapas(p);
  const idx=etapas.findIndex(e=>e.id===p.etapa);
  if(idx<=0)return null;
  for(let i=idx-1;i>=0;i--){
    if(etapas[i].resp==='dono') return etapas[i].id;
  }
  return null;
}
function devolverAoDono(){
  const p=curProc;
  const etRet=getDevolverEtapa(p);
  if(!etRet){toast('Nenhuma etapa anterior do dono encontrada.','var(--amber)');return;}
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9998;display:flex;align-items:center;justify-content:center';
  ov.id='devolver-ov';
  ov.innerHTML=`<div style="background:var(--surf);border-radius:14px;padding:2rem 1.8rem;max-width:480px;width:92%;box-shadow:0 12px 40px rgba(0,0,0,.25)">
    <div style="font-size:15px;font-weight:700;color:var(--ink);margin-bottom:.4rem">↩ Devolver ao dono</div>
    <div style="font-size:13px;color:var(--ink3);margin-bottom:1rem">A tarefa voltará para <strong>${etLb(etRet)}</strong>. O preenchimento anterior será mantido — o dono só precisará ajustar o que você indicar.</div>
    <div class="fg" style="margin-bottom:.9rem">
      <label class="fl">O que você quer que o dono faça?</label>
      <div style="display:flex;gap:8px;margin-top:4px">
        <label style="flex:1;display:flex;align-items:center;gap:6px;padding:.5rem .7rem;border:1.5px solid var(--bdr);border-radius:var(--r);cursor:pointer;font-size:13px">
          <input type="radio" name="devolver-tipo" value="complementar" checked> Complementar
        </label>
        <label style="flex:1;display:flex;align-items:center;gap:6px;padding:.5rem .7rem;border:1.5px solid var(--bdr);border-radius:var(--r);cursor:pointer;font-size:13px">
          <input type="radio" name="devolver-tipo" value="refazer"> Nova elaboração
        </label>
      </div>
    </div>
    <div class="fg" style="margin-bottom:1.2rem">
      <label class="fl">Instrução para o dono <span style="color:var(--red)">*</span></label>
      <textarea class="fi" id="devolver-motivo" rows="3" placeholder="Descreva o que precisa ser complementado ou corrigido..."></textarea>
    </div>
    <div class="btn-row">
      <button type="button" class="btn" onclick="document.getElementById('devolver-ov').remove()">Cancelar</button>
      <button type="button" class="btn" style="background:#fef3c7;color:#92400e;border-color:#f59e0b" onclick="confirmarDevolucao('${etRet}')">Confirmar →</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
}
function confirmarDevolucao(etRet){
  const motivo=document.getElementById('devolver-motivo')?.value?.trim();
  if(!motivo){toast('Informe a instrução para o dono.','var(--red)');return;}
  const tipo=document.querySelector('input[name="devolver-tipo"]:checked')?.value||'complementar';
  const p=curProc;
  const tipoLabel=tipo==='refazer'?'Nova elaboração':'Complementação';
  push(p, p.etapa, 'EP', tipoLabel+' solicitado — '+motivo);
  // Limpa apenas o registro de "respondido" da etapa de retorno para que o dono possa reenviar
  if(p.ent?.respondido_por_etapa?.[etRet]) delete p.ent.respondido_por_etapa[etRet];
  // Limpa revisão pendente (EP decidiu devolver em vez de prosseguir)
  if(p.ent?.revisao_ep_pendente) delete p.ent.revisao_ep_pendente;
  // Armazena instrução para exibir ao dono quando abrir a tarefa
  if(!p.ent)p.ent={};
  p.ent.devolucao_pendente={etapa:etRet,tipo,motivo,por:usuarioLogado?.nome||'EP',dt:now()};
  p.etapa=etRet;
  push(p, etRet, 'Sistema', 'Aguardando '+tipoLabel.toLowerCase()+' pelo dono');
  document.getElementById('devolver-ov')?.remove();
  rDetalhe();updCounts();
  fbAutoSave('devolverAoDono');
  const email=getDonoEmail(p);
  if(email){
    enviarNotif(email, p.dono, tipoLabel+' solicitado em "'+etLb(etRet)+'": '+motivo, p.nome, '', usuarioLogado?.nome||'EP');
    toast(tipoLabel+' solicitado. Dono notificado.','var(--teal)');
  } else {
    toast(tipoLabel+' solicitado ao dono.','var(--teal)');
  }
}

// ─── FEEDBACK DO DONO (etapa melhorias) ───────────────────────────────────────────
function dfbRow(tipo,texto,emoji){
  const idx=globalThis._dfbItems.length;
  globalThis._dfbItems.push({tipo,texto});
  const fb=globalThis._dfb[tipo]?.[texto];
  const confirmed=fb==='confirmado',discarded=fb==='descartado';
  return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bdr)" id="dfb-row-${idx}">
    <span id="dfb-txt-${idx}" style="flex:1;font-size:12.5px;color:var(--ink)${discarded?';text-decoration:line-through;opacity:.5':''}">${emoji} ${esc(texto)}</span>
    <button type="button" id="dfb-c-${idx}" onclick="dfbToggle(${idx},'confirmado')" style="border:1.5px solid ${confirmed?'var(--green)':'var(--bdr)'};background:${confirmed?'var(--green-l)':'transparent'};color:${confirmed?'var(--green)':'var(--ink4)'};border-radius:6px;padding:2px 10px;font-size:12px;font-weight:700;cursor:pointer">✓</button>
    <button type="button" id="dfb-d-${idx}" onclick="dfbToggle(${idx},'descartado')" style="border:1.5px solid ${discarded?'var(--red)':'var(--bdr)'};background:${discarded?'var(--red-l)':'transparent'};color:${discarded?'var(--red)':'var(--ink4)'};border-radius:6px;padding:2px 10px;font-size:12px;font-weight:700;cursor:pointer">✗</button>
  </div>`;
}
function _dfbStyleBtn(btn, active, colorOn, bgOn){
  if(!btn) return;
  btn.style.borderColor = active ? colorOn : 'var(--bdr)';
  btn.style.background  = active ? bgOn    : 'transparent';
  btn.style.color       = active ? colorOn : 'var(--ink4)';
}
function dfbToggle(idx,val){
  const {tipo,texto}=globalThis._dfbItems[idx];
  if(!globalThis._dfb[tipo])globalThis._dfb[tipo]={};
  globalThis._dfb[tipo][texto]=globalThis._dfb[tipo][texto]===val?null:val;
  const fb=globalThis._dfb[tipo][texto];
  const confirmed=fb==='confirmado',discarded=fb==='descartado';
  _dfbStyleBtn(document.getElementById('dfb-c-'+idx), confirmed, 'var(--green)', 'var(--green-l)');
  _dfbStyleBtn(document.getElementById('dfb-d-'+idx), discarded, 'var(--red)',   'var(--red-l)');
  const txt=document.getElementById('dfb-txt-'+idx);
  if(txt){txt.style.textDecoration=discarded?'line-through':'none';txt.style.opacity=discarded?'.45':'1';}
}
function aprovarDetValidAsis(){
  const p=curProc;
  const jr=jaFoiRespondido(p.etapa);
  if(jr){toast('⚠ Tarefa já respondida por '+jr.nome+'. Não é possível enviar novamente.');return;}
  if(!p.ent.analise)p.ent.analise={};
  const dt=document.getElementById('va-dt')?.value||'';
  const part=document.getElementById('va-part')?.value||'';
  const ata=document.getElementById('va-ata')?.value||'';
  if(dt||part||ata){p.ent.analise.reuniao_valid_asis={data:dt,participantes:part,ata};}
  avDono('det_valid_asis','Dono do processo','Detalhamento e validação AS IS concluídos pelo dono',null);
}
function reprovarDetValidAsis(){
  const p=curProc;
  if(!p.ent.analise)p.ent.analise={};
  const dt=document.getElementById('va-dt')?.value||'';
  const part=document.getElementById('va-part')?.value||'';
  const ata=document.getElementById('va-ata')?.value||'';
  const obs=document.getElementById('aobs')?.value||'';
  if(dt||part||ata){p.ent.analise.reuniao_valid_asis={data:dt,participantes:part,ata};}
  reprovarDono('esboco_asis','Dono','Dono solicitou ajustes no AS IS'+(obs?' — '+obs:''));
}
function salvarMelhorias(){
  const p=curProc;
  if(!p.ent.analise)p.ent.analise={};
  const fb={};
  (globalThis._dfbItems||[]).forEach(({tipo,texto})=>{
    const val=globalThis._dfb?.[tipo]?.[texto];
    if(val){if(!fb[tipo]){fb[tipo]={};} fb[tipo][texto]=val;}
  });
  p.ent.analise.feedback_dono=fb;
  av('melhorias','EP','Melhorias e mitigações revisadas pelo EP');
}
function aprovarDetValidTobe(){
  const p=curProc;
  const jr=jaFoiRespondido(p.etapa);
  if(jr){toast('⚠ Tarefa já respondida por '+jr.nome+'. Não é possível enviar novamente.');return;}
  if(!p.mod)p.mod={};
  const dt=document.getElementById('vtb-dt')?.value||'';
  const part=document.getElementById('vtb-part')?.value||'';
  const ata=document.getElementById('vtb-ata')?.value||'';
  p.mod.reuniao_valid_tobe={data:dt,participantes:part,ata};
  avDono('det_valid_tobe','Dono do processo','Detalhamento e validação TO BE concluídos pelo dono',null);
}
function reprovarDetValidTobe(){
  const p=curProc;
  if(!p.mod)p.mod={};
  const dt=document.getElementById('vtb-dt')?.value||'';
  const part=document.getElementById('vtb-part')?.value||'';
  const ata=document.getElementById('vtb-ata')?.value||'';
  const obs=document.getElementById('vtb-obs')?.value||'';
  p.mod.reuniao_valid_tobe={data:dt,participantes:part,ata};
  reprovarDono('esboco_tobe','Dono','Dono solicitou ajustes no TO BE'+(obs?' — '+obs:''));
}
function renderFeedbackEP(analise){
  const fb=analise.feedback_dono||{};
  const override=analise.ep_override||[];
  const labels={gargalos:['⚠','analise-gar','Gargalos'],retrabalhos:['↩','analise-ret','Retrabalhos'],gaps:['○','analise-gap','Pontos cegos'],oportunidades:['✦','analise-oport','Oportunidades']};
  let html='',total=0;
  Object.entries(labels).forEach(([tipo,[emoji,cls,nome]])=>{
    const items=fb[tipo];
    if(!items||!Object.keys(items).length)return;
    html+=`<div class="analise-item" style="margin-bottom:.6rem"><div class="analise-cat ${cls}">${nome}</div>`;
    Object.entries(items).forEach(([texto,status])=>{
      total++;
      const isDesc=status==='descartado',mantido=override.includes(texto);
      html+=`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--bdr)">
        <span style="flex:1;font-size:12.5px;${isDesc&&!mantido?'text-decoration:line-through;opacity:.5':''}">${emoji} ${esc(texto)}</span>
        ${status==='confirmado'?`<span style="font-size:10px;font-weight:600;padding:1px 8px;border-radius:99px;background:var(--green-l);color:var(--green)">✓ Confirmado</span>`:''}
        ${isDesc&&!mantido?`<span style="font-size:10px;font-weight:600;padding:1px 8px;border-radius:99px;background:var(--red-l);color:var(--red)">✗ Descartado</span><button type="button" class="btn" style="font-size:10px;padding:1px 8px" data-txt="${esc(texto)}" onclick="epManterItem(this)">Manter</button>`:''}
        ${mantido?`<span style="font-size:10px;font-weight:600;padding:1px 8px;border-radius:99px;background:var(--blue-l);color:var(--blue)">↩ EPP manteve</span>`:''}
      </div>`;
    });
    html+='</div>';
  });
  return total?html:'<div class="ib iba">Nenhum item avaliado pelo dono.</div>';
}
function _dfbBlock(cls,label,arr,key,emoji){
  if(!arr.length)return'';
  return '<div class="analise-item" style="margin-bottom:.6rem"><div class="analise-cat '+cls+'">'+label+' ('+arr.length+')</div>'+arr.map(x=>dfbRow(key,x,emoji)).join('')+'</div>';
}
function _acaoBadgeCls(s){if(s==='Concluída'){return'bg';}if(s==='Em andamento'){return'ba';}return'bt';}
function epManterItem(el){
  const p=curProc,texto=el.dataset.txt;
  if(!p.ent.analise.ep_override)p.ent.analise.ep_override=[];
  if(!p.ent.analise.ep_override.includes(texto))p.ent.analise.ep_override.push(texto);
  fbAutoSave('ep_override');
  rEnt(p);
  toast('Item mantido pelo EPP','var(--blue)');
}

// ═══════════════════════════════════════════
// ABA: AÇÃO ATUAL (formulários por etapa)
// ═══════════════════════════════════════════

function _renderAnexosAchado(anexos, i){
  if(!anexos.length) return '';
  const items=anexos.map((x,j)=>
    '<span style="display:inline-flex;align-items:center;gap:4px;background:var(--bg2);border:1px solid var(--bdr);border-radius:6px;padding:2px 8px;font-size:11px">'+
    `<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer" style="color:var(--teal);text-decoration:none">📎 ${esc(x.nome||'Anexo')}</a>`+
    `<button type="button" onclick="removerAnexoAchado(${i},${j})" style="background:none;border:none;cursor:pointer;color:var(--ink4);font-size:11px;padding:0 2px" title="Remover" aria-label="Remover anexo">✕</button>`+
    '</span>'
  ).join('');
  return '<div style="margin-top:.5rem;display:flex;flex-wrap:wrap;gap:4px">'+items+'</div>';
}

function _iaSection(lbl,items,style){
  if(!items?.length)return'';
  const liHtml=items.map(i=>'<li>'+esc(i)+'</li>').join('');
  return '<div class="ai-result-lbl" style="margin-top:.8rem'+(style?';'+style:'')+'">'+ lbl+'</div><ul>'+liHtml+'</ul>';
}
const ACOES = {
  abertura:{titulo:'Abrir processo',sub:'Confirmar dados iniciais e vincular equipe.',role:'EP',rk:'ep',
    form:p=>{const dtPrev=p.ent.dt_prev||_addDias(p.ent.dt_inicio,90);return`<div class="ib ibt">Confirme os dados importados da arquitetura e defina a equipe do trabalho.</div>
    <div class="g3">
      <div class="fg"><label class="fl">Data de início</label><input class="fi" id="a-ini" type="date" value="${p.ent.dt_inicio||''}" oninput="calcPrevAbr()"></div>
      <div class="fg"><label class="fl">Previsão de entrega <small style="font-weight:400;color:var(--ink3)">(90 dias após início)</small></label><input class="fi" id="a-prev" type="date" value="${dtPrev}" readonly style="background:var(--bg2);color:var(--ink3)"></div>
      <div class="fg"><label class="fl">Produto da demanda</label><input class="fi" value="${esc(p.produto)}" readonly></div>
    </div>
    <div class="fg"><label class="fl">Equipe de trabalho</label><input class="fi" id="a-equipe" value="${esc(p.ent.equipe||'')}" placeholder="Nomes dos membros envolvidos"></div>
    <div class="fg"><label class="fl">Objetivo do trabalho</label><textarea class="fi" id="a-obj" style="min-height:60px">${esc(p.objetivo||'')}</textarea></div>
    <div class="btn-row"><button type="button" class="btn btn-t" onclick="salvarAbertura()">Confirmar e agendar reunião de entendimento →</button></div>`}},

  questionario:{titulo:'Questionário de maturidade',sub:'Responder as 15 afirmações sobre o estado atual do processo.',role:'Dono do processo',rk:'dono',
    form:p=>{
      const resp = p.ent.quest_resp||{};
      const hist = p.ent.quest_hist||[];
      const histHtml = hist.length ? `
        <div class="card-t" style="margin-top:1.2rem">Histórico de aplicações</div>
        <div style="margin-top:.4rem;display:flex;flex-direction:column;gap:6px">
          ${hist.slice().reverse().map(h=>`
            <div style="display:flex;gap:10px;align-items:flex-start;padding:8px 10px;background:var(--bg2);border-radius:6px;border:1px solid var(--bdr);font-size:12px">
              <div style="min-width:90px;color:var(--ink3)">${h.dt}</div>
              <div style="font-weight:700;color:var(--blue)">Nível ${h.nivel}/5</div>
              <div style="color:var(--ink3)">Média ${h.media} · ${h.respondidas}/15</div>
              ${h.nota?`<div style="color:var(--ink2);flex:1;border-left:1px solid var(--bdr);padding-left:8px">${esc(h.nota)}</div>`:''}
            </div>`).join('')}
        </div>` : '';
      return `<div class="ib ibp">Para cada afirmação, selecione com que frequência ela é verdadeira no processo. Escala: 1 (Nunca) a 5 (Sempre).</div>
      <div id="quest-list">
        ${QUESTOES.map(q=>`
          <div class="quest-item">
            <div class="quest-dim">${q.dim}</div>
            <div class="quest-txt">${q.id.toUpperCase().replaceAll('Q','')}. ${q.txt}</div>
            <div class="likert">
              ${LIKERT.map((l,i)=>`<button type="button" class="lk-btn ${resp[q.id]===i+1?'on':''}" onclick="setLikert('${q.id}',${i+1},this)">${i+1}. ${l}</button>`).join('')}
            </div>
          </div>`).join('')}
      </div>
      <div class="fg" style="margin-top:.8rem"><label class="fl">Observações / nota desta aplicação <small style="font-weight:400;color:var(--ink3)">(opcional)</small></label><textarea class="fi" id="quest-nota" style="min-height:54px" placeholder="Contexto, dificuldades, observações do executore...">${esc(p.ent.quest_nota||'')}</textarea></div>
      <div class="btn-row"><button type="button" class="btn btn-p" onclick="salvarQuestionario()">Enviar respostas →</button></div>
      ${histHtml}`;
    }},

  reuniao:{titulo:'Reunião de entendimento',sub:'Levantar SIPOC, volumetria e dores do processo.',role:'EP',rk:'ep',
    form:p=>{
    const ai=findArqItemById(p.arq_id)||{};
    const fg=(e,a)=>e||a||'';
    const hint=(e,a)=>!e&&a?'<span style="font-size:10px;font-weight:600;color:var(--teal);margin-left:5px;vertical-align:middle">↙ arquitetura</span>':'';
    const anyFromArq=(!p.ent.fornecedores&&!!ai.fornecedores)||(!p.ent.clientes&&!!ai.clientes)||(!p.ent.entradas&&!!ai.entradas)||(!p.ent.saidas&&!!ai.entregas)||(!p.ent.atores&&!!ai.atores);
    return `<div class="ib ibt">Registre as informações levantadas na reunião com o dono do processo e equipe.</div>
    <div class="card-t">SIPOC</div>
    ${anyFromArq?'<div class="ib ibp" style="font-size:11.5px;margin:.4rem 0">Campos marcados com <strong style="color:var(--teal)">↙ arquitetura</strong> foram pré-preenchidos com dados da arquitetura de processos. Confirme ou ajuste — ao salvar, as alterações são sincronizadas de volta.</div>':''}
    <div class="g2" style="margin-top:.5rem">
      <div class="fg"><label class="fl">Fornecedores${hint(p.ent.fornecedores,ai.fornecedores)}</label><input class="fi" id="r-fornec" value="${esc(fg(p.ent.fornecedores,ai.fornecedores))}" placeholder="Quem fornece entradas ao processo?"></div>
      <div class="fg"><label class="fl">Clientes${hint(p.ent.clientes,ai.clientes)}</label><input class="fi" id="r-clientes" value="${esc(fg(p.ent.clientes,ai.clientes))}" placeholder="Quem recebe as saídas do processo?"></div>
    </div>
    <div class="fg"><label class="fl">Entradas${hint(p.ent.entradas,ai.entradas)}</label><textarea class="fi" id="r-entradas" style="min-height:54px" placeholder="Documentos, dados, materiais que chegam ao processo...">${esc(fg(p.ent.entradas,ai.entradas))}</textarea></div>
    <div class="fg"><label class="fl">Atividades principais <small style="font-weight:400;color:var(--ink3)">(uma por linha)</small></label><textarea class="fi" id="r-atividades" style="min-height:80px" placeholder="1. Receber demanda&#10;2. Analisar documentação&#10;...">${esc(p.ent.atividades_principais||'')}</textarea></div>
    <div class="fg"><label class="fl">Saídas${hint(p.ent.saidas,ai.entregas)}</label><textarea class="fi" id="r-saidas" style="min-height:54px" placeholder="Produtos, documentos, resultados gerados...">${esc(fg(p.ent.saidas,ai.entregas))}</textarea></div>
    <div class="fg"><label class="fl">Atores${hint(p.ent.atores,ai.atores)}</label><input class="fi" id="r-atores" value="${esc(fg(p.ent.atores,ai.atores))}" placeholder="Unidades e pessoas que participam do processo"></div>
    <hr>
    <div class="card-t">Volumetria e tempos</div>
    <div class="g3" style="margin-top:.5rem">
      <div class="fg"><label class="fl">Volume de execuções</label><input class="fi" id="r-exec" value="${esc(p.ent.vol?.exec||'')}" placeholder="Ex: ~40/mês"></div>
      <div class="fg"><label class="fl">Tempo médio de ciclo (horas)</label><input class="fi" id="r-tciclo" type="number" min="0" step="0.5" value="${p.ent.t_ciclo||''}" oninput="calcGaveta()" placeholder="Ex: 4"></div>
      <div class="fg"><label class="fl">Tempo real / lead time (horas)</label><input class="fi" id="r-treal" type="number" min="0" step="0.5" value="${p.ent.t_real||''}" oninput="calcGaveta()" placeholder="Ex: 24"></div>
    </div>
    <div class="fg"><label class="fl">Tempo de gaveta <small style="font-weight:400;color:var(--ink3)">(calculado: tempo real − tempo médio de ciclo)</small></label>
      <input class="fi" id="r-tgaveta" readonly style="background:var(--bg2);color:var(--ink3)" value="${p.ent.t_gaveta!=null&&p.ent.t_gaveta!==''?p.ent.t_gaveta+' horas':''}">
    </div>
    <hr>
    <div class="card-t">Problemas e dores</div>
    <div class="fg" style="margin-top:.5rem"><label class="fl">Problemas/dores identificados <small style="font-weight:400;color:var(--ink3)">(um por linha)</small></label><textarea class="fi" id="a-prob" style="min-height:80px" placeholder="Descreva os problemas identificados...">${esc((p.ent.prob||[]).join('\n'))}</textarea></div>
    <div class="btn-row"><button type="button" class="btn btn-t" onclick="salvarReuniao()">Registrar reunião e avançar →</button></div>`;}},

  riscos:{titulo:'Identificação de riscos',sub:'Mapear e avaliar riscos operacionais do processo.',role:'EP',rk:'ep',
    form:p=>`<div class="ib ibt">Identifique os riscos do processo. Utilize a IA para gerar sugestões ou adicione manualmente.</div>
    <div style="margin-bottom:.8rem;display:flex;gap:8px;align-items:center">
      <button type="button" class="btn" style="font-size:12px" onclick="iaGerarRiscos()">✦ Gerar riscos com IA</button>
      <span id="risco-ia-status" style="font-size:11px;color:var(--ink3)"></span>
    </div>
    <div id="risco-list" style="margin-bottom:.5rem">${rRiscoList(p.ent.riscos)}</div>
    <div id="risco-matrix">${rRiscoMatriz(p.ent.riscos)}</div>
    <div class="g3">
      <input class="fi" id="rd" placeholder="Descrição do risco">
      <select class="fi" id="rp"><option value="">Probabilidade</option><option>Baixa</option><option>Media</option><option>Alta</option></select>
      <select class="fi" id="ri"><option value="">Impacto</option><option>Baixo</option><option>Medio</option><option>Alto</option><option>Critico</option></select>
    </div>
    <button type="button" class="btn" style="margin-top:6px;font-size:12px" onclick="addRisco()">+ Adicionar risco</button>
    <div class="btn-row"><button type="button" class="btn btn-t" onclick="salvarRiscos()">Registrar riscos e avançar →</button></div>`},

  analise:{titulo:'Análise do fluxo AS IS',sub:'Análise inteligente gerada por IA com base no BPMN e etapas mapeadas.',role:'EP',rk:'ep',
    form:p=>{
      const a=p.ent.analise||{};
      const bpmnOk=!!(p.mod?.bpmnAsIs||p.mod?.asIs);
      let iaHtml;
      if(a.ia_resultado){
        const resumoHtml = a.ia_resultado.resumo?'<div class="ai-result-lbl">Resumo</div><p>'+esc(a.ia_resultado.resumo)+'</p>':'';
        const complexHtml = a.ia_resultado.complexidade?'<div class="ai-result-lbl" style="margin-top:.8rem">Complexidade</div><p>'+esc(a.ia_resultado.complexidade)+'</p>':'';
        iaHtml = '<div class="ai-result">'
          +resumoHtml
          +_iaSection('Gargalos',a.ia_resultado.gargalos)
          +_iaSection('Retrabalhos',a.ia_resultado.retrabalhos)
          +_iaSection('Gaps de controle',a.ia_resultado.gaps)
          +_iaSection('Oportunidades',a.ia_resultado.oportunidades)
          +complexHtml
          +_iaSection('💡 Soluções para problemas levantados',a.ia_resultado.solucoes_problemas,'color:var(--teal)')
          +'</div>';
      } else {
        iaHtml = '<div style="font-size:12px;color:var(--ink3)">Nenhuma análise gerada ainda.</div>';
      }
      return `<div class="ib ibp">A análise inteligente é gerada automaticamente pela IA com base no BPMN, etapas mapeadas e dados do processo.</div>
        ${bpmnOk?'':'<div class="ib ibr">⚠ Mapeamento BPMN ainda não realizado. A análise será limitada.</div>'}
        <div style="font-weight:600;font-size:13px;margin-bottom:.5rem">✦ Análise gerada por IA</div>
        <div id="ia-analise-result">${iaHtml}</div>
        <div class="btn-row" style="margin-top:.8rem">
          ${a.ia_resultado
            ? `<button type="button" class="btn btn-t" onclick="confirmarRegenerarAnalise()" title="Sobrescreve a análise atual com uma nova geração">🔄 Regenerar análise com IA</button>`
            : `<button type="button" class="btn btn-t" onclick="gerarAnaliseIA()">✦ Gerar análise com IA</button>`}
          <button type="button" class="btn btn-p" onclick="salvarAnalise()">Concluir análise →</button>
        </div>`;
    }},

  esboco_asis:{titulo:'Esboço AS IS',sub:'Descrever e desenhar o fluxo atual do processo.',role:'EP',rk:'ep',
    form:p=>`<div class="ib ibp">Descreva o processo atual e desenhe no editor BPMN abaixo. Após salvar o BPMN, extraia as etapas — elas serão detalhadas pelo dono na próxima etapa.</div>
    <div class="fg"><label class="fl">Descrição AS IS</label>
      ${!p.mod.asIs && p.ent.atividades_principais ? `<div class="ib" style="margin-bottom:.4rem;font-size:12px">Pré-preenchido com as atividades da reunião de entendimento.</div>` : ''}
      <textarea class="fi" id="e-asis" style="min-height:120px" placeholder="Como o processo funciona hoje...">${p.mod.asIs || p.ent.atividades_principais || ''}</textarea></div>
    ${bpmnEditorHTML('asis', p.mod.bpmnAsIs)}
    <div style="margin:.8rem 0 .4rem;font-weight:600;font-size:13px">Etapas extraídas do BPMN</div>
    <div style="font-size:12px;color:var(--ink3);margin-bottom:.6rem">Extraia as etapas para que o dono possa detalhá-las na próxima etapa.</div>
    <div style="display:flex;gap:8px;margin-bottom:.8rem;flex-wrap:wrap">
      <button type="button" class="btn btn-p" onclick="extrairBpmn()">⚡ Extrair etapas do BPMN</button>
      <button type="button" class="btn" onclick="addEtapaProc()">+ Adicionar manualmente</button>
    </div>
    <div id="etapas-proc-list">${renderEtapasProc(p.mod.etapas_proc||[])}</div>
    <div class="btn-row"><button type="button" class="btn btn-p" onclick="salvarEsboco()">Encaminhar para detalhamento →</button></div>`},

  det_valid_asis:{titulo:'Detalhamento e Validação AS IS',sub:'O dono detalha as etapas do fluxo e valida o desenho AS IS elaborado pelo EP.',role:'Dono do processo',rk:'dono',
    form:p=>{
      return `<div class="ib ibt" style="margin-bottom:1.2rem">
        <div style="font-weight:600;margin-bottom:.4rem">Suas responsabilidades nesta etapa:</div>
        <ul style="font-size:13px;line-height:1.8;margin:.2rem 0 0 1.2rem;padding:0">
          <li>Para cada etapa listada, clicar em <strong>✎ Detalhar</strong> e preencher natureza, modo de execução, executor e descrição</li>
          <li>Revisar o fluxo AS IS desenhado pelo EP e aprovar ou solicitar ajustes</li>
        </ul>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.4rem">
        <div class="card-t">Detalhamento das etapas</div>
        <button type="button" class="btn" style="font-size:11px;padding:3px 10px" onclick="exportarEtapasAsIsXlsx()" title="Exportar todas as etapas para planilha Excel">⬇ Exportar Excel</button>
      </div>
      <div style="font-size:12px;color:var(--ink3);margin-bottom:.8rem">Expanda cada etapa (✎ Detalhar) e preencha natureza, modo de execução, executor e descrição.</div>
      <div id="etapas-proc-list">${renderEtapasProc(p.mod.etapas_proc||[])}</div>

      <hr style="margin:.8rem 0">
      <div class="card-t" style="margin-bottom:.6rem">Fluxo AS IS</div>
      ${p.mod.asIs?`<div class="card" style="margin-bottom:.8rem"><div class="card-t">Descrição do processo</div><div style="font-size:13px;color:var(--ink2);white-space:pre-wrap;line-height:1.7">${esc(p.mod.asIs)}</div></div>`:''}
      ${bpmnEditorHTML('asis',p.mod.bpmnAsIs)}

      <hr style="margin:.8rem 0">
      <div class="fg"><label class="fl">Comentários / ajustes solicitados ao EP</label>
        <textarea class="fi" id="aobs" style="min-height:70px" placeholder="Descreva ajustes necessários ou deixe em branco se aprovado..."></textarea>
      </div>
      <div class="btn-row">
        <button type="button" class="btn btn-a" onclick="reprovarDetValidAsis()">Solicitar ajustes no AS IS</button>
        <button type="button" class="btn btn-g" onclick="aprovarDetValidAsis()">Aprovar AS IS ✓</button>
      </div>`;
    }},

  esboco_tobe:{titulo:'Esboço TO BE',sub:'Descrever e desenhar o fluxo futuro proposto.',role:'EP',rk:'ep',
    form:p=>`<div class="ib ibp">Descreva o processo futuro e desenhe o fluxo TO BE no editor BPMN.</div>
    <div class="fg"><label class="fl">Descrição TO BE</label>
      <textarea class="fi" id="e-tobe" style="min-height:120px" placeholder="Como o processo deve funcionar após as melhorias...">${p.mod.toBe||''}</textarea></div>
    ${bpmnEditorHTML('tobe', p.mod.bpmnToBe)}
    <div class="btn-row"><button type="button" class="btn btn-p" onclick="salvarEsbocaTobe()">Encaminhar para detalhamento e validação TO BE →</button></div>`},

  det_valid_tobe:{titulo:'Detalhamento e Validação TO BE',sub:'O dono detalha as etapas do fluxo futuro e valida o desenho TO BE elaborado pelo EP.',role:'Dono do processo',rk:'dono',tobe:true,
    form:p=>{
      return `<div class="ib ibt" style="margin-bottom:1.2rem">
        <div style="font-weight:600;margin-bottom:.4rem">Suas responsabilidades nesta etapa:</div>
        <ul style="font-size:13px;line-height:1.8;margin:.2rem 0 0 1.2rem;padding:0">
          <li>Para cada etapa listada, clicar em <strong>✎ Detalhar</strong> e preencher os detalhes do fluxo futuro</li>
          <li>Revisar o fluxo TO BE desenhado pelo EP e aprovar ou solicitar ajustes</li>
        </ul>
      </div>

      <div class="card-t" style="margin-bottom:.4rem">Detalhamento das etapas TO BE</div>
      <div style="font-size:12px;color:var(--ink3);margin-bottom:.8rem">Expanda cada etapa (✎ Detalhar) e preencha os detalhes do fluxo futuro.</div>
      <div id="etapas-proc-list">${renderEtapasProc(p.mod.etapas_proc||[])}</div>

      <hr style="margin:.8rem 0">
      <div class="card-t" style="margin-bottom:.6rem">Fluxo TO BE proposto</div>
      ${p.mod?.toBe?`<div class="card" style="margin-bottom:.8rem"><div class="card-t">Descrição TO BE</div><div style="font-size:13px;color:var(--ink2);white-space:pre-wrap;line-height:1.7">${esc(p.mod.toBe)}</div></div>`:''}
      ${bpmnEditorHTML('tobe',p.mod?.bpmnToBe)}

      <hr style="margin:.8rem 0">
      <div class="fg"><label class="fl">Comentários / ajustes solicitados ao EP</label>
        <textarea class="fi" id="vtb-obs" style="min-height:70px" placeholder="Descreva ajustes necessários ou deixe em branco se aprovado..."></textarea>
      </div>
      <div class="btn-row">
        <button type="button" class="btn btn-a" onclick="reprovarDetValidTobe()">Solicitar ajustes no TO BE</button>
        <button type="button" class="btn btn-g" onclick="aprovarDetValidTobe()">Aprovar TO BE ✓</button>
      </div>`;
    }},

  melhorias:{titulo:'Melhorias do Processo',sub:'Revise os achados da análise inteligente e defina quais melhorias e mitigações serão implementadas.',role:'EP',rk:'ep',
    form:p=>{
      const a=p.ent.analise||{};
      const ia=a.ia_resultado||{};
      const gargalos=[...new Set([...(a.gargalos||[]),...(ia.gargalos||[])])];
      const retrabalhos=[...new Set([...(a.retrabalhos||[]),...(ia.retrabalhos||[])])];
      const gaps=[...new Set([...(a.gaps||[]),...(ia.gaps||[])])];
      const oportunidades=[...new Set([...(a.oportunidades||[]),...(ia.oportunidades||[])])];
      const solucoes=ia.solucoes_problemas||a.solucoes_problemas||[];
      const temAnalise=!!(ia.resumo||gargalos.length||retrabalhos.length||gaps.length||oportunidades.length||solucoes.length);
      globalThis._dfb={};globalThis._dfbItems=[];
      const savedFb=a.feedback_dono||{};
      Object.keys(savedFb).forEach(t=>{globalThis._dfb[t]={...savedFb[t]};});
      const resumoHtml=ia.resumo?'<div class="card" style="margin-bottom:.8rem"><div class="card-t">Resumo da análise</div><div style="font-size:13px;color:var(--ink2);line-height:1.7">'+esc(ia.resumo)+'</div></div>':'';
      const analiseHtml=temAnalise
        ?(resumoHtml
          +_dfbBlock('analise-gar','Gargalos',gargalos,'gargalos','⚠')
          +_dfbBlock('analise-ret','Retrabalhos',retrabalhos,'retrabalhos','↩')
          +_dfbBlock('analise-gap','Pontos cegos',gaps,'gaps','○')
          +_dfbBlock('analise-oport','Oportunidades',oportunidades,'oportunidades','✦')
          +'<div class="analise-item" style="margin-bottom:.6rem"><div class="analise-cat" style="background:var(--teal-l);color:var(--teal)">Soluções propostas ('+solucoes.length+')</div>'+solucoes.map(s=>dfbRow('solucoes_problemas',s,'💡')).join('')+'</div>')
        :'<div class="ib iba">Análise inteligente ainda não gerada. Execute a etapa de Análise inteligente antes.</div>';
      return `<div class="ib ibp" style="margin-bottom:1.2rem">Com base na análise inteligente e nos riscos identificados, confirme (✓) os itens que serão trabalhados como melhorias ou descarte (✗) os que não se aplicam.</div>
      ${analiseHtml}
      <div class="btn-row"><button type="button" class="btn btn-p" onclick="salvarMelhorias()">Concluir revisão de melhorias →</button></div>`;
    }},

    desenho_final:{titulo:'Desenho final do processo',sub:'Consolide e finalize o fluxo validado pelo dono.',role:'EP',rk:'ep',
    form:p=>{
      const fb=p.ent?.analise?.feedback_dono||{};
      const override=p.ent?.analise?.ep_override||[];
      const descartados=Object.entries(fb).flatMap(([,items])=>Object.entries(items).filter(([,v])=>v==='descartado').map(([txt])=>txt)).filter(d=>!override.includes(d));
      const descartadosBadges=descartados.map(d=>`<span style="font-size:11px;background:var(--red-l);color:var(--red);border-radius:4px;padding:1px 6px;margin:2px">${esc(d)}</span>`).join('');
      const descartadosBanner=descartados.length
        ?`<div class="ib" style="background:#fef3c7;border-color:#d97706;margin-bottom:.8rem"><strong>Itens descartados pelo dono (${descartados.length}):</strong> ${descartadosBadges}<div style="font-size:11px;color:var(--ink3);margin-top:4px">Considere estes pontos ao finalizar o desenho.</div></div>`
        :'<div class="ib ibg" style="margin-bottom:.8rem">Nenhum item descartado pelo dono. O fluxo validado está pronto para ajustes finais.</div>';
      return `
      ${descartadosBanner}
      <div style="font-size:12px;font-weight:600;color:var(--ink2);margin-bottom:.5rem">AS IS — Fluxo validado pelo dono</div>
      ${bpmnEditorHTML('asis',p.mod?.bpmnAsIs)}
      <div style="margin-top:.8rem">
        <button type="button" class="btn" style="width:100%;text-align:left;font-size:12px;justify-content:flex-start" onclick="toggleEl('df-tobe-wrap','df-tobe-chv');if(document.getElementById('df-tobe-wrap').style.display!=='none')setTimeout(()=>initBpmnMod('tobe',curProc),80)"><span id="df-tobe-chv">▶</span> TO BE — Processo futuro (expandir para editar)</button>
        <div id="df-tobe-wrap" style="display:none;margin-top:.5rem">${bpmnEditorHTML('tobe',p.mod?.bpmnToBe)}</div>
      </div>
      <div class="fg" style="margin-top:.8rem"><label class="fl">Observações sobre ajustes finais</label><textarea class="fi" id="a-obs" style="min-height:60px" placeholder="Descreva as alterações feitas em relação ao esboço validado...">${esc(p.form?.obs_final||'')}</textarea></div>
      <div class="btn-row" style="flex-wrap:wrap;gap:6px;margin-top:.8rem">
        <button type="button" class="btn" onclick="bpmnExportPNG('asis')">↓ PNG do fluxo AS IS</button>
        <button type="button" class="btn btn-t" onclick="vincularDesenhoFinalArq()">📎 Vincular imagem à arquitetura</button>
        <button type="button" class="btn btn-p" onclick="salvarDesenhoFinal()">Encaminhar para construção POP →</button>
      </div>`;
    }},

  pop:{titulo:'Construção do POP',sub:'Redigir o Procedimento Operacional Padrão no modelo CAGE.',role:'EP',rk:'ep',
    form:p=>`<div class="ib iba">Preencha as seções do POP conforme padrão CAGE.</div>
    <div class="tabs" style="margin-bottom:.8rem">
      <div class="tab on" role="tab" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" onclick="sstab('pp1',this)">Identificação</div>
      <div class="tab" role="tab" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" onclick="sstab('pp2',this)">Objetivo</div>
      <div class="tab" role="tab" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" onclick="sstab('pp3',this)">Atividades</div>
    </div>
    <div id="pp1" class="tab-p on">
      <div class="g3">
        <div class="fg"><label class="fl">Área</label><input class="fi" id="pp-area" value="${esc(p.area||'')}"></div>
        <div class="fg"><label class="fl">Gerente do processo</label><input class="fi" id="pp-ger" value="${esc(p.dono||'')}"></div>
        <div class="fg"><label class="fl">Macroprocesso</label><input class="fi" id="pp-mac" value="${esc(p.macro||'')}"></div>
      </div>
    </div>
    <div id="pp2" class="tab-p" style="display:none">
      <div class="fg"><label class="fl">Objetivo</label><textarea class="fi" id="pp-obj" style="min-height:80px">${esc(p.form?.pop?.obj||p.objetivo||'')}</textarea></div>
      <div class="fg"><label class="fl">Definições e siglas</label><textarea class="fi" id="pp-def" style="min-height:60px" placeholder="Termo: Definição, uma por linha">${esc(p.form?.pop?.def||'')}</textarea></div>
      <div class="fg"><label class="fl">Entradas do processo <span style="font-size:10px;color:var(--teal);font-weight:400">← SIPOC</span></label><textarea class="fi" id="pp-ent" style="min-height:54px" placeholder="O que inicia o processo?">${esc(p.form?.pop?.ent||p.ent?.entradas||'')}</textarea></div>
      <div class="fg"><label class="fl">Saídas do processo <span style="font-size:10px;color:var(--teal);font-weight:400">← SIPOC</span></label><textarea class="fi" id="pp-sai" style="min-height:54px" placeholder="O que é produzido ao final?">${esc(p.form?.pop?.sai||p.ent?.saidas||'')}</textarea></div>
      <div class="fg"><label class="fl">Documentos correlatos</label><textarea class="fi" id="pp-docs" style="min-height:50px" placeholder="Normas, regulamentos, formulários relacionados...">${esc(p.form?.pop?.docs||'')}</textarea></div>
    </div>
    <div id="pp3" class="tab-p" style="display:none">
      <div style="font-size:12px;color:var(--ink3);margin-bottom:.8rem">Atividades puxadas do detalhamento feito pelo dono (etapa de validação AS IS). Revise tipo, descrição, responsável e etapa seguinte.</div>
      ${popAtivCards(p)}
    </div>
    <div class="btn-row">
      <button type="button" class="btn" onclick="visPopPreview()" style="margin-right:auto">👁 Pré-visualizar</button>
      <button type="button" class="btn btn-a" onclick="salvarPOP()">Salvar e avançar →</button>
    </div>`},

  complement:{titulo:'Complementação pelo Dono',sub:'O dono do processo complementa o POP com informações operacionais.',role:'Dono do processo',rk:'dono',
    form:p=>`<div class="ib iba">Revise o POP elaborado e adicione informações que só você, como responsável pelo processo, pode fornecer.</div>
    <div style="font-weight:600;font-size:13px;margin-bottom:.6rem">Informações operacionais</div>
    <div class="fg">
      <label class="fl">Perguntas frequentes (FAQ)</label>
      <div class="ib" style="font-size:12px;color:var(--ink3);margin-bottom:.5rem;background:var(--bg2);border-radius:6px;padding:.5rem .7rem">
        ✦ Use o botão abaixo para gerar sugestões de perguntas e respostas com IA. <strong>O executor do processo deve validar as perguntas e respostas geradas</strong>, editar o conteúdo conforme necessário e adicionar novas perguntas relevantes à realidade do processo.
      </div>
      <button type="button" class="btn btn-t" id="btn-gerar-faq" onclick="gerarFAQIA()" style="margin-bottom:.5rem">✦ Gerar FAQ com IA</button>
      <span id="faq-ia-status" style="font-size:11px;color:var(--ink3);margin-left:.5rem"></span>
      <textarea class="fi" id="afaq" style="min-height:120px" placeholder="P: Pergunta frequente&#10;R: Resposta&#10;&#10;P: Outra pergunta&#10;R: Resposta">${p.form?.faq||''}</textarea>
    </div>
    <div class="fg"><label class="fl">Exceções / casos especiais</label><textarea class="fi" id="a-excecoes" style="min-height:70px" placeholder="Situações fora do fluxo padrão que devem ser documentadas...">${p.form?.excecoes||''}</textarea></div>
    <div class="fg"><label class="fl">Contatos-chave do processo</label><textarea class="fi" id="a-contatos" style="min-height:60px" placeholder="Nome — Função — E-mail ou ramal">${p.form?.contatos||''}</textarea></div>
    <div class="fg"><label class="fl">Formulários / sistemas utilizados</label><input class="fi" id="aforms" placeholder="Nome do formulário ou sistema — link se houver" value="${p.form?.forms||''}"></div>
    <div class="fg"><label class="fl">Observações ou correções ao POP</label><textarea class="fi" id="aobs" style="min-height:60px" placeholder="Aponte qualquer ajuste necessário no documento..."></textarea></div>
    <div class="btn-row"><button type="button" class="btn btn-g" onclick="salvarComplementacaoDono()">Enviar complementação →</button></div>`},

  apresentacao:{titulo:'Aprovação pelo Gestor / Adjunto',sub:'Aprovação de alta gestão antes da publicação.',role:'Gestor / Adjunto',rk:'gestor',
    form:p=>`<div class="ib iba">Aprovação final antes da publicação oficial. Compartilhe o conteúdo do mapeamento com o gestor responsável.</div>
    <div class="g2">
      <div class="fg"><label class="fl">Data da reunião de apresentação</label><input class="fi" id="adt" type="date" value="${p.form?.reuniao_apresentacao?.data||''}"></div>
      <div class="fg"><label class="fl">Participantes</label><input class="fi" id="apart" placeholder="Nomes dos presentes" value="${p.form?.reuniao_apresentacao?.participantes||''}"></div>
    </div>
    <div class="fg"><label class="fl">Ata / encaminhamentos</label><textarea class="fi" id="apr-ata" style="min-height:70px" placeholder="Registre os encaminhamentos da reunião...">${p.form?.reuniao_apresentacao?.ata||''}</textarea></div>
    <div class="fg"><label class="fl">Decisão / observações do gestor</label><textarea class="fi" id="aobs" style="min-height:60px" placeholder="Decisão do gestor..."></textarea></div>
    <div class="btn-row">
      <button type="button" class="btn btn-a" onclick="reprovar('complement','Gestor','Gestor solicitou revisão')">Solicitar revisão</button>
      <button type="button" class="btn btn-g" onclick="salvarApresentacao()">Autorizar publicação ✓</button>
    </div>`},

  publicacao:{titulo:'Publicar o processo',sub:'Publicar POP no repositório oficial.',role:'EP',rk:'ep',
    form:p=>`<div class="ib ibg">Após publicação o processo entra em fase de operação e monitoramento.</div>
    <div style="background:var(--bg2);border-radius:8px;padding:1rem;margin-bottom:1rem;border:1px solid var(--bdr)">
      <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:.4rem">📊 Gerar POP em PowerPoint</div>
      <div style="font-size:12px;color:var(--ink3);margin-bottom:.8rem">Gera uma apresentação executiva .pptx com IA, contendo SIPOC, fluxos AS IS e TO BE, riscos, soluções, FAQ e indicadores. O logo SIGA aparece em todos os slides.</div>
      <button type="button" class="btn btn-p" id="btn-gerar-pop-ppt" onclick="gerarPOPPPT()">✨ Gerar POP em PPT com IA</button>
      <span id="pop-ppt-status" style="font-size:11px;color:var(--ink3);margin-left:.8rem"></span>
    </div>
    <div class="g3">
      <div class="fg"><label class="fl">Link no repositório</label><input class="fi" id="a-link" placeholder="https://..." value="${p.form?.link_pub||''}"></div>
      <div class="fg"><label class="fl">Data de vigência</label><input class="fi" type="date" id="a-vig" value="${p.form?.vig||''}"></div>
      <div class="fg"><label class="fl">Entrega efetiva</label><input class="fi" type="date" id="pub-efet" value="${p.ent?.dt_efetiva||''}"></div>
    </div>
    <div class="btn-row">
      <button type="button" class="btn" onclick="salvarDadosPublicacao()">💾 Salvar dados</button>
      <button type="button" class="btn btn-g" onclick="publicarProcesso()">Publicar →</button>
    </div>`},

  acompanha:{titulo:'Acompanhamento da implementação',sub:'Registre todas as reuniões de acompanhamento da implementação.',role:'EP',rk:'ep',
    form:p=>{
      const reunioes=p.reunioes_acomp||[];
      const listaHtml=reunioes.length?reunioes.map((r,i)=>{
        let confBadge;
        if(r.conformidade==='Conforme'){confBadge='bg';}
        else if(r.conformidade==='Parcialmente conforme'){confBadge='ba';}
        else{confBadge='br';}
        return `
        <div class="card" style="margin-bottom:.5rem;padding:.8rem">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:.3rem">
                <strong>${r.data}</strong>
                <span class="badge ${confBadge}">${r.conformidade}</span>
              </div>
              <div style="font-size:12px;color:var(--ink3)">${esc(r.pauta||'—')}</div>
              ${r.participantes?`<div style="font-size:12px;color:var(--ink3);margin-top:.2rem">👥 ${esc(r.participantes)}</div>`:''}
              ${r.desvios?`<div style="font-size:12px;color:var(--red);margin-top:.2rem">⚠ Desvios: ${esc(r.desvios)}</div>`:''}
              ${r.acoes?`<div style="font-size:12px;color:var(--teal);margin-top:.2rem">→ Ações: ${esc(r.acoes)}</div>`:''}
              ${r.proxima?`<div style="font-size:11px;color:var(--ink4);margin-top:.2rem">Próxima: ${r.proxima}</div>`:''}
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0">
              <button type="button" class="btn" style="font-size:11px;padding:2px 7px" onclick="editarReuniaoAcomp(${i})">✎ Editar</button>
              <button type="button" class="btn" style="font-size:11px;padding:2px 7px;color:var(--red);border-color:var(--red)" onclick="excluirReuniaoAcomp(${i})" aria-label="Remover reunião">✕</button>
            </div>
          </div>
        </div>`;
      }).join(''):'<div style="font-size:12px;color:var(--ink3)">Nenhuma reunião registrada ainda.</div>';
      return `<div class="ib ibb">Registre todas as reuniões de acompanhamento da implementação.</div>
        <div style="margin-bottom:1rem">${listaHtml}</div>
        <div style="font-weight:600;font-size:13px;margin-bottom:.8rem;padding-top:.8rem;border-top:1px solid var(--bdr)">Nova reunião de acompanhamento</div>
        <div class="g2">
          <div class="fg"><label class="fl">Data da reunião</label><input class="fi" id="ac-data" type="date"></div>
          <div class="fg"><label class="fl">Conformidade</label>
            <select class="fi" id="ac-conf"><option>Conforme</option><option>Parcialmente conforme</option><option>Não conforme</option></select>
          </div>
        </div>
        <div class="fg"><label class="fl">Pauta / objetivo da reunião</label><textarea class="fi" id="ac-pauta" style="min-height:60px" placeholder="Descreva a pauta..."></textarea></div>
        <div class="fg"><label class="fl">Desvios identificados</label><textarea class="fi" id="ac-desv" style="min-height:60px" placeholder="Descreva os desvios..."></textarea></div>
        <div class="fg"><label class="fl">Ações corretivas</label><textarea class="fi" id="ac-acoes" style="min-height:60px" placeholder="Ações definidas..."></textarea></div>
        <div class="fg"><label class="fl">Participantes</label><input class="fi" id="ac-partic" placeholder="Nomes dos participantes"></div>
        <div class="fg"><label class="fl">Próxima reunião prevista</label><input class="fi" id="ac-proxima" type="date"></div>
        <div class="btn-row">
          <button type="button" class="btn" onclick="registrarReuniaoAcomp()">＋ Registrar reunião</button>
          <button type="button" class="btn btn-p" onclick="av('acompanha','EP','Acompanhamento concluído')">Concluir acompanhamento →</button>
        </div>
        <div id="ac-edit-panel" style="display:none;margin-top:1rem;padding:1rem;background:var(--bg2);border-radius:var(--r);border:1px solid var(--bdr)">
          <div style="font-weight:600;font-size:13px;margin-bottom:.8rem">✎ Editando reunião</div>
          <div class="g2">
            <div class="fg"><label class="fl">Data da reunião</label><input class="fi" id="ac-edit-data" type="date"></div>
            <div class="fg"><label class="fl">Conformidade</label>
              <select class="fi" id="ac-edit-conf"><option>Conforme</option><option>Parcialmente conforme</option><option>Não conforme</option></select>
            </div>
          </div>
          <div class="fg"><label class="fl">Pauta / objetivo da reunião</label><textarea class="fi" id="ac-edit-pauta" style="min-height:60px"></textarea></div>
          <div class="fg"><label class="fl">Desvios identificados</label><textarea class="fi" id="ac-edit-desv" style="min-height:60px"></textarea></div>
          <div class="fg"><label class="fl">Ações corretivas</label><textarea class="fi" id="ac-edit-acoes" style="min-height:60px"></textarea></div>
          <div class="fg"><label class="fl">Participantes</label><input class="fi" id="ac-edit-partic"></div>
          <div class="fg"><label class="fl">Próxima reunião prevista</label><input class="fi" id="ac-edit-proxima" type="date"></div>
          <div class="btn-row">
            <button type="button" class="btn" onclick="cancelarEditReuniaoAcomp()">Cancelar</button>
            <button type="button" class="btn btn-p" onclick="salvarEditReuniaoAcomp()">✓ Salvar alterações</button>
          </div>
        </div>`;
    }},

  auditoria:{titulo:'Auditoria do processo',sub:'Verificação sistemática da conformidade, desempenho e melhorias.',role:'EP',rk:'ep',
    form:p=>{
      const aud=p.auditoria||{};
      const questoes=aud.questoes||[];
      const achados=aud.achados_list||[];
      const acoes=aud.acoes_list||[];
      const trilha=aud.trilha||[];
      const trilhaHtml=trilha.length?trilha.map((t,i)=>`
        <div class="card" style="margin-bottom:.5rem;padding:.7rem .9rem;font-size:13px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:.4rem">
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
              <span class="badge bt" style="font-size:10px">${esc(t.tipo||'')}</span>
              ${t.data?`<span style="font-size:11px;color:var(--ink3)">${esc(t.data)}</span>`:''}
              ${t.responsavel?`<span style="font-size:11px;color:var(--ink2)">· ${esc(t.responsavel)}</span>`:''}
            </div>
            <button type="button" class="btn" style="font-size:11px;padding:2px 7px;color:var(--red);border-color:var(--red);flex-shrink:0" onclick="excluirProcedimentoAuditoria(${i})" aria-label="Remover procedimento">✕</button>
          </div>
          ${t.descricao?`<div style="margin-bottom:.3rem"><strong>O que foi feito:</strong> ${esc(t.descricao)}</div>`:''}
          ${t.objetivo?`<div style="font-size:12px;color:var(--ink3);margin-bottom:.2rem"><strong>Objetivo:</strong> ${esc(t.objetivo)}</div>`:''}
          ${t.evidencias?`<div style="font-size:12px;color:var(--teal);margin-bottom:.2rem">📎 <strong>Evidências:</strong> ${esc(t.evidencias)}</div>`:''}
          ${t.conclusoes?`<div style="font-size:12px;color:var(--ink2)">→ <strong>Conclusões parciais:</strong> ${esc(t.conclusoes)}</div>`:''}
        </div>`).join(''):'';
      const questoesHtml=questoes.length?questoes.map((q,i)=>`
        <div class="card" style="margin-bottom:.4rem;padding:.6rem .8rem;font-size:13px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <div><strong>Q${i+1}:</strong> ${q.questao}
            ${q.criterio?`<div style="font-size:11px;color:var(--ink3);margin-top:2px">Critério: ${q.criterio}</div>`:''}
            ${q.resposta?`<div style="color:var(--teal);margin-top:.2rem">✓ ${q.resposta}</div>`:'<div style="color:var(--amber);margin-top:.2rem">Aguardando resposta</div>'}</div>
            <div style="display:flex;gap:4px;flex-shrink:0">
              <button type="button" class="btn" style="font-size:11px;padding:2px 7px" onclick="editarQuestaoAuditoria(${i})">Editar</button>
              <button type="button" class="btn" style="font-size:11px;padding:2px 7px;color:var(--red);border-color:var(--red)" onclick="excluirQuestaoAuditoria(${i})" aria-label="Remover questão">✕</button>
            </div>
          </div>
        </div>`).join(''):'';
      const achadosHtml=achados.length?achados.map((a,i)=>{
        let badgeClsAchado;
        if(a.tipo==='Não conformidade'){badgeClsAchado='br';}
        else if(a.tipo==='Observação'){badgeClsAchado='ba';}
        else{badgeClsAchado='bt';}
        return `
        <div class="card" style="margin-bottom:.4rem;padding:.6rem .8rem;font-size:13px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <strong>NC${i+1}: ${esc(a.titulo)}</strong>
            <span class="badge ${badgeClsAchado}" style="flex-shrink:0">${a.tipo}</span>
          </div>
          <div style="color:var(--ink3);margin-top:.2rem">${esc(a.descricao||'')}</div>
          ${a.evidencia?`<div style="font-size:11px;color:var(--ink4);margin-top:.2rem">Evidência: ${esc(a.evidencia)}</div>`:''}
          ${_renderAnexosAchado(a.anexos||[], i)}
          <div id="aud-anexo-form-${i}" style="margin-top:.5rem;display:none;gap:6px;flex-wrap:wrap;align-items:center">
            <input class="fi" id="aud-link-nome-${i}" placeholder="Nome do documento" style="width:140px;font-size:11px;padding:3px 6px">
            <input class="fi" id="aud-link-url-${i}" placeholder="https://..." style="flex:1;min-width:160px;font-size:11px;padding:3px 6px">
            <button type="button" class="btn" style="font-size:11px;padding:2px 8px" onclick="adicionarLinkAchado(${i})">+ Link</button>
            <label class="btn" style="font-size:11px;padding:2px 8px;cursor:pointer">↑ Arquivo<input type="file" style="display:none" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg" onchange="uploadArquivoAchado(${i},this)"></label>
          </div>
          <button type="button" class="btn" style="font-size:11px;padding:2px 8px;margin-top:.4rem;color:var(--teal);border-color:var(--teal)" onclick="toggleAnexoForm(${i})">📎 Anexar</button>
        </div>`;
      }).join(''):'';
      const acoesHtml=acoes.length?acoes.map((a,i)=>`
        <div class="card" style="margin-bottom:.4rem;padding:.6rem .8rem;font-size:13px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>${a.acao}</strong>
            <span style="font-size:11px;color:var(--ink3)">${a.responsavel} · ${a.prazo}</span>
          </div>
          <span class="badge ${_acaoBadgeCls(a.status)}">${a.status}</span>
        </div>`).join(''):'';
      return `<div class="tabs" style="margin-bottom:1rem">
        <div class="tab on" role="tab" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" onclick="sstab('aud1',this)">Planejamento</div>
        <div class="tab" role="tab" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" onclick="sstab('aud2',this)">Questões</div>
        <div class="tab" role="tab" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" onclick="sstab('aud3',this)">Ações</div>
        <div class="tab" role="tab" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" onclick="sstab('aud4',this)">Achados</div>
        <div class="tab" role="tab" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" onclick="sstab('aud5',this)">Plano de Ação</div>
        <div class="tab" role="tab" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" onclick="sstab('aud6',this)">Relatório</div>
      </div>
      <div id="aud1" class="tab-p">
        <div class="g2">
          <div class="fg"><label class="fl">Data de início</label><input class="fi" id="aud-ini" type="date" value="${aud.data_inicio||''}"></div>
          <div class="fg"><label class="fl">Data prevista de conclusão</label><input class="fi" id="aud-fim" type="date" value="${aud.data_fim||''}"></div>
        </div>
        <div class="fg"><label class="fl">Objetivo da auditoria</label><textarea class="fi" id="aud-obj" style="min-height:70px" placeholder="Descreva o objetivo...">${aud.objetivo||''}</textarea></div>
        <div class="fg"><label class="fl">Escopo</label><textarea class="fi" id="aud-escopo" style="min-height:70px" placeholder="Defina o escopo da auditoria...">${aud.escopo||''}</textarea></div>
        <div class="fg"><label class="fl">Equipe de auditoria</label><input class="fi" id="aud-equipe" value="${aud.equipe||''}" placeholder="Nomes dos auditores"></div>
        <div class="fg"><label class="fl">Critérios de auditoria</label><textarea class="fi" id="aud-crit" style="min-height:70px" placeholder="Ex: POP publicado, normas internas, indicadores de desempenho...">${aud.criterios||''}</textarea></div>
        <div class="fg"><label class="fl">Metodologia</label>
          <select class="fi" id="aud-metod">
            <option ${aud.metodologia==='Análise documental'?'selected':''}>Análise documental</option>
            <option ${aud.metodologia==='Entrevistas'?'selected':''}>Entrevistas</option>
            <option ${aud.metodologia==='Observação in loco'?'selected':''}>Observação in loco</option>
            <option ${aud.metodologia==='Mista'?'selected':''}>Mista</option>
          </select>
        </div>
        <button type="button" class="btn" onclick="salvarPlanejamentoAuditoria()">Salvar planejamento</button>
      </div>
      <div id="aud2" class="tab-p" style="display:none">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem">
          <span style="font-size:13px;color:var(--ink3)">${questoes.length} questão(ões) cadastrada(s)</span>
          <button type="button" class="btn btn-p" style="font-size:12px" onclick="iaGerarQuestoesAuditoria()">✦ Gerar com IA</button>
        </div>
        <div id="aud-ia-questoes"></div>
        <div style="margin-bottom:1rem">${questoesHtml||'<div style="font-size:12px;color:var(--ink3)">Nenhuma questão cadastrada.</div>'}</div>
        <div style="font-weight:600;font-size:13px;margin-bottom:.8rem;padding-top:.8rem;border-top:1px solid var(--bdr)" id="aud-q-form-title">Adicionar questão de auditoria</div>
        <input type="hidden" id="aud-q-idx" value="">
        <div class="fg"><label class="fl">Questão</label><textarea class="fi" id="aud-q-texto" style="min-height:60px" placeholder="Ex: O processo é executado conforme o POP?"></textarea></div>
        <div class="g2">
          <div class="fg"><label class="fl">Critério relacionado</label><input class="fi" id="aud-q-crit" placeholder="Qual critério essa questão avalia?"></div>
          <div class="fg"><label class="fl">Responsável por responder</label><input class="fi" id="aud-q-resp" placeholder="Nome do respondente"></div>
        </div>
        <div style="display:flex;gap:8px">
          <button type="button" class="btn btn-p" id="aud-q-save-btn" onclick="salvarQuestaoAuditoria()">＋ Adicionar questão</button>
          <button type="button" class="btn" id="aud-q-cancel-btn" style="display:none" onclick="cancelarEdicaoQuestao()">Cancelar</button>
        </div>
      </div>
      <div id="aud3" class="tab-p" style="display:none">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem">
          <span style="font-size:13px;color:var(--ink3)">${trilha.length} procedimento(s) registrado(s)</span>
        </div>
        <div style="margin-bottom:1rem">${trilhaHtml||'<div style="font-size:12px;color:var(--ink3)">Nenhum procedimento registrado. Use o formulário abaixo para registrar reuniões, entrevistas, testes e demais ações de auditoria.</div>'}</div>
        <div style="font-weight:600;font-size:13px;margin-bottom:.8rem;padding-top:.8rem;border-top:1px solid var(--bdr)">Registrar procedimento de auditoria</div>
        <div class="g2">
          <div class="fg"><label class="fl">Tipo de ação</label>
            <select class="fi" id="aud-tr-tipo">
              <option>Reunião de abertura</option>
              <option>Reunião de encerramento</option>
              <option>Entrevista</option>
              <option>Teste</option>
              <option>Pesquisa</option>
              <option>Análise documental</option>
              <option>Validação</option>
              <option>Diligência</option>
              <option>Outro</option>
            </select>
          </div>
          <div class="fg"><label class="fl">Data</label><input class="fi" id="aud-tr-data" type="date"></div>
        </div>
        <div class="fg"><label class="fl">Responsável</label><input class="fi" id="aud-tr-resp" placeholder="Auditor responsável pelo procedimento"></div>
        <div class="fg"><label class="fl">O que foi feito</label><textarea class="fi" id="aud-tr-desc" style="min-height:60px" placeholder="Descreva detalhadamente o procedimento realizado..."></textarea></div>
        <div class="fg"><label class="fl">Objetivo</label><textarea class="fi" id="aud-tr-obj" style="min-height:50px" placeholder="Qual o propósito deste procedimento?"></textarea></div>
        <div class="fg"><label class="fl">Evidências obtidas</label><textarea class="fi" id="aud-tr-evid" style="min-height:50px" placeholder="Documentos, atas, registros, declarações..."></textarea></div>
        <div class="fg"><label class="fl">Conclusões parciais</label><textarea class="fi" id="aud-tr-concl" style="min-height:50px" placeholder="Achados ou conclusões preliminares decorrentes deste procedimento..."></textarea></div>
        <button type="button" class="btn btn-p" onclick="adicionarProcedimentoAuditoria()">＋ Registrar procedimento</button>
      </div>
      <div id="aud4" class="tab-p" style="display:none">
        <div style="margin-bottom:1rem">${achadosHtml||'<div style="font-size:12px;color:var(--ink3)">Nenhum achado registrado.</div>'}</div>
        <div style="font-weight:600;font-size:13px;margin-bottom:.8rem;padding-top:.8rem;border-top:1px solid var(--bdr)">Registrar achado / não-conformidade</div>
        <!-- Picker: biblioteca de apontamentos padrão -->
        <div style="margin-bottom:.8rem;display:flex;gap:8px;align-items:center">
          <button type="button" class="btn" style="font-size:12px" onclick="toggleAudPicker()">📋 Usar apontamento padrão</button>
          <span style="font-size:11px;color:var(--ink3)">ou preencha o formulário abaixo</span>
        </div>
        <div id="aud-picker" style="display:none;border:1px solid var(--bdr);border-radius:8px;margin-bottom:1rem;max-height:260px;overflow-y:auto;background:var(--bg2)">
          <div style="padding:8px 12px;font-size:11px;color:var(--ink3);border-bottom:1px solid var(--bdr);position:sticky;top:0;background:var(--bg2)">Selecione um apontamento para pré-preencher o formulário:</div>
          ${APONTAMENTOS_PADRAO.map((ap,i)=>`
          <div onclick="preencherApontamento(${i})" style="padding:8px 12px;border-bottom:1px solid var(--bdr);cursor:pointer;font-size:12px;transition:background .15s" onmouseover="this.style.background='var(--teal-b)'" onmouseout="this.style.background=''">
            <div style="font-weight:600;color:var(--ink)">${esc(ap.a)}</div>
            <div style="color:var(--ink3);font-size:11px;margin-top:2px">${esc(ap.c)}</div>
          </div>`).join('')}
        </div>
        <!-- Formulário -->
        <div id="aud-form">
          <div class="g2">
            <div class="fg"><label class="fl">Título</label><input class="fi" id="aud-a-titulo" placeholder="Título do achado"></div>
            <div class="fg"><label class="fl">Tipo</label>
              <select class="fi" id="aud-a-tipo">
                <option>Não conformidade</option>
                <option>Observação</option>
                <option>Ponto de melhoria</option>
                <option>Conformidade</option>
              </select>
            </div>
          </div>
          <div class="fg"><label class="fl">Descrição / possível causa</label><textarea class="fi" id="aud-a-desc" style="min-height:60px" placeholder="Descreva o achado ou a possível causa..."></textarea></div>
          <div class="fg"><label class="fl">Evidência</label><input class="fi" id="aud-a-evid" placeholder="Documento, observação, entrevista..."></div>
          <div class="fg"><label class="fl">Recomendação / critério infringido</label><input class="fi" id="aud-a-crit" placeholder="Recomendação de melhoria ou critério não atendido"></div>
          <button type="button" class="btn" onclick="adicionarAchadoAuditoria()">＋ Registrar achado</button>
        </div>
      </div>
      <div id="aud5" class="tab-p" style="display:none">
        <div style="margin-bottom:1rem">${acoesHtml||'<div style="font-size:12px;color:var(--ink3)">Nenhuma ação corretiva registrada.</div>'}</div>
        <div style="font-weight:600;font-size:13px;margin-bottom:.8rem;padding-top:.8rem;border-top:1px solid var(--bdr)">Incluir ação corretiva</div>
        <div class="fg"><label class="fl">Ação</label><textarea class="fi" id="aud-ac-acao" style="min-height:60px" placeholder="Descreva a ação corretiva..."></textarea></div>
        <div class="g2">
          <div class="fg"><label class="fl">Responsável</label><input class="fi" id="aud-ac-resp" placeholder="Nome do responsável"></div>
          <div class="fg"><label class="fl">Prazo</label><input class="fi" id="aud-ac-prazo" type="date"></div>
        </div>
        <div class="fg"><label class="fl">Status</label>
          <select class="fi" id="aud-ac-status">
            <option>Pendente</option>
            <option>Em andamento</option>
            <option>Concluída</option>
          </select>
        </div>
        <div class="fg"><label class="fl">Achado relacionado</label><input class="fi" id="aud-ac-achado" placeholder="NC ou achado ao qual essa ação se refere"></div>
        <button type="button" class="btn" onclick="adicionarAcaoAuditoria()">＋ Incluir ação</button>
      </div>
      <div id="aud6" class="tab-p" style="display:none">
        <div style="display:flex;gap:10px;align-items:flex-end;margin-bottom:1rem;flex-wrap:wrap">
          <div class="fg" style="flex:1;min-width:180px;margin-bottom:0">
            <label class="fl">Conformidade geral</label>
            <select class="fi" id="aud-conf">
              <option ${aud.conformidade==='Conforme'?'selected':''}>Conforme</option>
              <option ${aud.conformidade==='Conforme com ressalvas'?'selected':''}>Conforme com ressalvas</option>
              <option ${aud.conformidade==='Não conforme'?'selected':''}>Não conforme</option>
            </select>
          </div>
          <button type="button" class="btn btn-t" id="aud-rel-btn" onclick="iaGerarRelatorioAuditoria()" style="white-space:nowrap;flex-shrink:0">✦ Gerar relatório com IA</button>
        </div>
        <div id="aud-rel-result">${aud.relatorio_html||'<div class="ib ibsl">Clique em "Gerar relatório com IA" para criar o relatório executivo automaticamente a partir das abas anteriores.</div>'}</div>
        <div class="btn-row" style="margin-top:1rem">
          <button type="button" class="btn" onclick="salvarRelatorioAuditoria(false)">Salvar</button>
          <button type="button" class="btn btn-p" onclick="salvarRelatorioAuditoria(true)">Concluir auditoria →</button>
        </div>
      </div>`;
    }},
};

// ─── Funções nomeadas para os formulários do ACOES ──────────────────────────
// Permite referenciar _formXxx(p) em vez de ACOES.xxx.form(p) em código novo
function _formAbertura(p)    { return ACOES.abertura.form(p); }
function _formQuestionario(p){ return ACOES.questionario.form(p); }
function _formReuniao(p)     { return ACOES.reuniao.form(p); }
function _formRiscos(p)      { return ACOES.riscos.form(p); }
function _formAnalise(p)     { return ACOES.analise.form(p); }
function _formEsbocoAsis(p)  { return ACOES.esboco_asis.form(p); }
function _formDetValidAsis(p){ return ACOES.det_valid_asis.form(p); }
function _formEsbocoTobe(p)  { return ACOES.esboco_tobe.form(p); }
function _formDetValidTobe(p){ return ACOES.det_valid_tobe.form(p); }
function _formMelhorias(p)   { return ACOES.melhorias.form(p); }
function _formDesenhoFinal(p){ return ACOES.desenho_final.form(p); }
function _formPop(p)         { return ACOES.pop.form(p); }
function _formComplement(p)  { return ACOES.complement.form(p); }
function _formApresentacao(p){ return ACOES.apresentacao.form(p); }
function _formPublicacao(p)  { return ACOES.publicacao.form(p); }
function _formAcompanha(p)   { return ACOES.acompanha.form(p); }
function _formAuditoria(p)   { return ACOES.auditoria.form(p); }

function navegarRetro(etId){
  epRetroEtapa=etId;
  document.querySelectorAll('#det-tabs .tab').forEach((t,i)=>t.classList.toggle('on',i===0));
  document.querySelectorAll('.tab-p').forEach(el=>el.classList.remove('on'));
  document.getElementById('tab-acao').classList.add('on');
  rAcaoRetro();
}
function fecharRetro(){
  epRetroEtapa=null;
  rDetalhe();
}
function rAcaoRetro(){
  const p=curProc,etId=epRetroEtapa;
  const ac=ACOES[etId];
  if(!ac)return;
  const isCurrent=etId===p.etapa;
  document.getElementById('tab-acao').innerHTML=`
    <div class="ib iba" style="margin-bottom:1rem;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span style="font-size:13px">✎ <strong>Editando:</strong> ${ac.titulo}</span>
      ${isCurrent?'':`<button type="button" class="btn" style="font-size:11px;padding:3px 8px;margin-left:auto" onclick="fecharRetro()">← Voltar à etapa atual</button>`}
    </div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.7rem;flex-wrap:wrap;gap:8px">
        <div><div class="card-t" style="margin-bottom:2px">${ac.titulo}</div>
        <div style="font-size:12px;color:var(--ink3)">${ac.sub}</div></div>
        <span class="badge bsl">${ac.role}</span>
      </div>
      ${ac.form(p)}
    </div>
    <div class="btn-row" style="margin-top:1rem;padding:.8rem;background:var(--bg2);border:1px solid var(--bdr);border-radius:8px">
      <span style="font-size:12px;color:var(--ink3)">Salva os dados sem avançar o fluxo</span>
      <button type="button" class="btn btn-p" onclick="salvarRetroativo('${etId}')">💾 Salvar dados</button>
    </div>`;
  document.querySelectorAll('#tab-acao .card .btn-row').forEach(r=>r.style.display='none');
  if(etId==='esboco_asis'||etId==='det_valid_asis'||etId==='desenho_final') setTimeout(()=>initBpmnMod('asis',p),120);
  if(etId==='esboco_tobe'||etId==='det_valid_tobe') setTimeout(()=>initBpmnMod('tobe',p),120);
}

// ── salvarRetroativo: handlers por etapa (extraídos para manutenibilidade) ──
function _rsAbertura(p){
  p.ent.dt_inicio=document.getElementById('a-ini')?.value||p.ent.dt_inicio;
  p.ent.dt_prev=document.getElementById('a-prev')?.value||p.ent.dt_prev;
  p.ent.equipe=document.getElementById('a-equipe')?.value||p.ent.equipe;
  p.objetivo=document.getElementById('a-obj')?.value||p.objetivo;
}
function _rsReuniao(p){
  p.ent.fornecedores=document.getElementById('r-fornec')?.value||p.ent.fornecedores;
  p.ent.clientes=document.getElementById('r-clientes')?.value||p.ent.clientes;
  p.ent.entradas=document.getElementById('r-entradas')?.value||p.ent.entradas;
  p.ent.atividades_principais=document.getElementById('r-atividades')?.value||p.ent.atividades_principais;
  p.ent.saidas=document.getElementById('r-saidas')?.value||p.ent.saidas;
  p.ent.atores=document.getElementById('r-atores')?.value||p.ent.atores;
  if(!p.ent.vol)p.ent.vol={};
  p.ent.vol.exec=document.getElementById('r-exec')?.value||p.ent.vol.exec;
  const tc=Number.parseFloat(document.getElementById('r-tciclo')?.value);
  const tr=Number.parseFloat(document.getElementById('r-treal')?.value);
  if(!Number.isNaN(tc)){p.ent.t_ciclo=tc;} if(!Number.isNaN(tr)){p.ent.t_real=tr;}
  if(p.ent.t_ciclo!=null&&p.ent.t_real!=null){p.ent.t_gaveta=+(p.ent.t_real-p.ent.t_ciclo).toFixed(1);}
  const prob=(document.getElementById('a-prob')?.value||'').split('\n').map(s=>s.trim()).filter(Boolean);
  if(prob.length){p.ent.prob=prob;}
}
function _rsEsbocaAsis(p){
  if(!p.mod)p.mod={};
  const txt=document.getElementById('e-asis')?.value;
  if(txt!=null) p.mod.asIs=txt;
}
function _rsEsbocaTobe(p){
  if(!p.mod)p.mod={};
  const txt=document.getElementById('e-tobe')?.value;
  if(txt!=null) p.mod.toBe=txt;
}
function _rsDetValidAsis(p){
  const obs=document.getElementById('aobs')?.value||'';
  if(obs){if(!p.ent.analise){p.ent.analise={};} p.ent.analise.obs_valid_asis=obs;}
}
function _rsDetValidTobe(p){
  if(!p.mod)p.mod={};
  const dt=document.getElementById('vtb-dt')?.value||'';
  const part=document.getElementById('vtb-part')?.value||'';
  const ata=document.getElementById('vtb-ata')?.value||'';
  const obs=document.getElementById('vtb-obs')?.value||'';
  if(dt||part||ata){p.mod.reuniao_valid_tobe={data:dt,participantes:part,ata};}
  if(obs){if(!p.mod.obs_valid_tobe){p.mod.obs_valid_tobe='';} p.mod.obs_valid_tobe=obs;}
}
function _rsApresentacao(p){
  if(!p.form)p.form={};
  const dt=document.getElementById('adt')?.value||'';
  const part=document.getElementById('apart')?.value||'';
  const ata=document.getElementById('apr-ata')?.value||'';
  if(dt||part||ata){p.form.reuniao_apresentacao={data:dt,participantes:part,ata};}
  const obs=document.getElementById('aobs')?.value||'';
  if(obs) p.form.obs_apresentacao=obs;
}
function _rsQuestionario(p){
  const resp=p.ent.quest_resp||{};
  const vals=Object.values(resp);
  const total=vals.reduce((a,b)=>a+b,0);
  const media=vals.length>0?(total/vals.length).toFixed(1):0;
  let mat;
  if(media<=1.5) mat=1;
  else if(media<=2.5) mat=2;
  else if(media<=3.5) mat=3;
  else if(media<=4.5) mat=4;
  else mat=5;
  p.ent.mat=mat;
}
function _rsAnalise(p){
  p.ent.analise=document.getElementById('a-anal')?.value||p.ent.analise;
}
function _rsDesenhoFinal(p){
  p.form=p.form||{};
  p.form.link_final=document.getElementById('a-link')?.value||p.form.link_final||'';
  p.form.ferramenta=document.getElementById('a-ferr')?.value||p.form.ferramenta||'';
  p.form.obs_final=document.getElementById('a-obs')?.value??p.form.obs_final??'';
}
function _rsComplement(p){
  p.form=p.form||{};
  p.form.faq=document.getElementById('afaq')?.value??p.form.faq??'';
  p.form.excecoes=document.getElementById('a-excecoes')?.value??p.form.excecoes??'';
  p.form.contatos=document.getElementById('a-contatos')?.value??p.form.contatos??'';
  p.form.forms=document.getElementById('aforms')?.value??p.form.forms??'';
  const obs=document.getElementById('aobs')?.value||'';
  if(obs) p.form.obs_complement=obs;
  const dt=document.getElementById('comp-dt')?.value||'';
  const part=document.getElementById('comp-part')?.value||'';
  const ata=document.getElementById('comp-ata')?.value||'';
  if(dt||part||ata) p.form.reuniao_complement={data:dt,participantes:part,ata};
}
function _rsPOP(p){
  p.form=p.form||{};
  const etapas=p.mod?.etapas_proc||[];
  const ativ_detalhes={...p.form.pop?.ativ_detalhes};
  etapas.forEach((_,i)=>{
    const descEl=document.getElementById(`pop-at-desc-${i}`);
    if(!descEl)return;
    const prev=ativ_detalhes[i]||{};
    const t=document.getElementById(`pop-at-tipo-${i}`)?.value;
    const r=document.getElementById(`pop-at-resp-${i}`)?.value;
    ativ_detalhes[i]={tipo:t||prev.tipo||'Atividade',desc:descEl.value||prev.desc||'',resp:r||prev.resp||''};
  });
  const prev=p.form.pop||{};
  p.form.pop={
    area:document.getElementById('pp-area')?.value||prev.area||'',
    ger:document.getElementById('pp-ger')?.value||prev.ger||'',
    mac:document.getElementById('pp-mac')?.value||prev.mac||'',
    obj:document.getElementById('pp-obj')?.value||prev.obj||'',
    def:document.getElementById('pp-def')?.value||prev.def||'',
    ent:document.getElementById('pp-ent')?.value||prev.ent||'',
    sai:document.getElementById('pp-sai')?.value||prev.sai||'',
    docs:document.getElementById('pp-docs')?.value||prev.docs||'',
    ativ_detalhes,
  };
}
function _rsPublicacao(p){
  p.form=p.form||{};
  p.form.pub_link=document.getElementById('pub-link')?.value||p.form.pub_link;
  p.form.pub_local=document.getElementById('pub-local')?.value||p.form.pub_local;
}
function _rsMelhorias(p){
  if(!p.ent.analise) p.ent.analise={};
  const fb={};
  (globalThis._dfbItems||[]).forEach(({tipo,texto})=>{
    const val=globalThis._dfb?.[tipo]?.[texto];
    if(val){if(!fb[tipo]){fb[tipo]={};} fb[tipo][texto]=val;}
  });
  const existing=p.ent.analise.feedback_dono||{};
  Object.keys(fb).forEach(t=>{existing[t]={...existing[t],...fb[t]};});
  p.ent.analise.feedback_dono=existing;
}
function _rsAcompanha(p){
  const data=document.getElementById('ac-data')?.value;
  if(!data) return;
  if(!p.reunioes_acomp) p.reunioes_acomp=[];
  p.reunioes_acomp.push({
    data,
    conformidade: document.getElementById('ac-conf')?.value||'Conforme',
    pauta:        document.getElementById('ac-pauta')?.value||'',
    desvios:      document.getElementById('ac-desv')?.value||'',
    acoes:        document.getElementById('ac-acoes')?.value||'',
    participantes:document.getElementById('ac-partic')?.value||'',
    proxima:      document.getElementById('ac-proxima')?.value||'',
    registrada_em:now()
  });
}
const _RS_MAP={
  abertura:_rsAbertura, reuniao:_rsReuniao, riscos:()=>{},
  esboco_asis:_rsEsbocaAsis, esboco_tobe:_rsEsbocaTobe,
  det_valid_asis:_rsDetValidAsis, det_valid_tobe:_rsDetValidTobe,
  apresentacao:_rsApresentacao, questionario:_rsQuestionario,
  analise:_rsAnalise, desenho_final:_rsDesenhoFinal,
  complement:_rsComplement, pop:_rsPOP, publicacao:_rsPublicacao,
  melhorias:_rsMelhorias, acompanha:_rsAcompanha,
};
function salvarRetroativo(etId){
  const p=curProc;
  if(_RS_MAP[etId]) _RS_MAP[etId](p);
  push(p,etId,'EP','Dados revisados retroativamente pelo EP');
  epRetroEtapa=null;
  toast('Revisão salva.','var(--blue)');
  rDetalhe();
  fbAutoSave('retroativo');
  updCounts();
}
function buildAcaoCardHTML(ac, p, extraNote){
  return `<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.7rem;flex-wrap:wrap;gap:8px">
      <div><div class="card-t" style="margin-bottom:2px">${ac.titulo}</div>
      <div style="font-size:12px;color:var(--ink3)">${ac.sub}</div></div>
      <span class="badge bsl">${ac.role}</span>
    </div>
    ${ac.form(p)}
    ${extraNote||''}
  </div>`;
}
function _rAcaoPrazoBanner(p){
  if(!p.prazo_dono) return '';
  const hoje=new Date().toISOString().split('T')[0];
  const atrasado=p.prazo_dono<hoje;
  const diff=Math.ceil((new Date(p.prazo_dono)-Date.now())/(1000*60*60*24));
  const pzFmt=p.prazo_dono.split('-').reverse().join('/');
  let cor;
  if(atrasado) cor='var(--red)';
  else if(diff<=3) cor='var(--amber)';
  else cor='var(--ink2)';
  let label;
  if(atrasado) label=` <span style="font-size:11px;font-weight:700;color:var(--red)">(ATRASADO)</span>`;
  else if(diff<=3) label=` <span style="font-size:11px;color:var(--amber)">(${diff} dia(s))</span>`;
  else label='';
  return `<span style="font-size:12px;font-weight:600;color:${cor}">📅 Prazo: ${pzFmt}${label}</span>`;
}
function _rAcaoTarefaRespondidaHTML(jr){
  const dtFmt=jr.dt?jr.dt.replace('T',' ').substring(0,16):'';
  return `<div class="card"><div class="ib" style="background:var(--amber-l,#fef3c7);border:1.5px solid var(--amber,#f59e0b);border-radius:8px;padding:1rem;margin-bottom:1rem;display:flex;align-items:flex-start;gap:.6rem">
    <span style="font-size:1.4rem">🔒</span>
    <div>
      <div style="font-weight:700;font-size:14px;color:var(--amber,#b45309);margin-bottom:.25rem">Esta tarefa já foi respondida</div>
      <div style="font-size:13px;color:var(--ink2)"><strong>${jr.nome}</strong> já enviou a resposta desta etapa${dtFmt?' em '+dtFmt:''}. A tarefa está concluída e o EP foi notificado.</div>
    </div>
  </div></div>`;
}
const _BPMN_INIT = {
  det_valid_asis: (p,mt) => { if(mt) setTimeout(()=>initBpmnMod('asis',p),120); },
  det_valid_tobe: (p,mt) => { if(mt) setTimeout(()=>initBpmnMod('tobe',p),120); },
  esboco_asis:    (p)    => { setTimeout(()=>initBpmnMod('asis',p),120); setTimeout(atualizarMermaid,300); },
  esboco_tobe:    (p)    => { setTimeout(()=>initBpmnMod('tobe',p),120); },
  desenho_final:  (p)    => { setTimeout(()=>initBpmnMod('asis',p),120); },
  pop:            ()     => { setTimeout(injectIaPop,100); },
};
function _rAcaoInitBpmn(p, minhaTarefa){
  _BPMN_INIT[p.etapa]?.(p, minhaTarefa);
}
function _rAcaoHandleDono(el, ac, p){
  const etObj=ETAPAS.find(e=>e.id===p.etapa);
  const isDonoProc=p.dono===usuarioLogado.nome;
  const isVinc=(usuarioLogado.processos_vinculados||[]).includes(p.arq_id);
  const minhaTarefa=etObj?.resp==='dono'&&(isDonoProc||isVinc);
  const prazoBanner=_rAcaoPrazoBanner(p);
  if(minhaTarefa){
    const jr=jaFoiRespondido(p.etapa);
    if(jr){ el.innerHTML=_rAcaoTarefaRespondidaHTML(jr); return; }
  }
  // Banner de devolução pendente (mostrado ao dono quando EP devolveu a tarefa)
  let devolucaoBanner='';
  const dv=p.ent?.devolucao_pendente;
  if(minhaTarefa && dv && dv.etapa===p.etapa){
    const tipoLabel=dv.tipo==='refazer'?'Nova elaboração solicitada':'Complementação solicitada';
    const corBg=dv.tipo==='refazer'?'#fef2f2':'#fffbeb';
    const corBrd=dv.tipo==='refazer'?'#fca5a5':'#fcd34d';
    const corTxt=dv.tipo==='refazer'?'#991b1b':'#92400e';
    devolucaoBanner=`<div style="background:${corBg};border:1.5px solid ${corBrd};border-radius:var(--r);padding:.8rem 1rem;margin-bottom:1rem;display:flex;gap:.7rem;align-items:flex-start">
      <span style="font-size:1.3rem">${dv.tipo==='refazer'?'🔄':'📝'}</span>
      <div>
        <div style="font-weight:700;font-size:13px;color:${corTxt};margin-bottom:3px">${tipoLabel} pelo EP</div>
        <div style="font-size:12.5px;color:var(--ink2)">${esc(dv.motivo)}</div>
        <div style="font-size:11px;color:var(--ink3);margin-top:4px">Solicitado por ${esc(dv.por)} em ${dv.dt}</div>
      </div>
    </div>`;
  }
  el.innerHTML=minhaTarefa
    ?`<div class="ib ibt" style="margin-bottom:1rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.4rem"><span>O EP encaminhou esta tarefa para você. Complete quando estiver pronto.</span>${prazoBanner}</div>${devolucaoBanner}${buildAcaoCardHTML(ac,p,'')}`
    :`<div class="card"><div class="ib iba" style="margin-bottom:1rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.4rem"><span>Esta etapa — <strong>${ac.titulo}</strong> — aguarda ação de <strong>${p.dono||'dono'}</strong>.</span>${prazoBanner}</div><div style="font-size:13px;color:var(--ink2)">${ac.sub}</div></div>`;
  _rAcaoInitBpmn(p, minhaTarefa);
}
function rAcao(p){
  const role=usuarioLogado?.perfil||'ep';
  const el=document.getElementById('tab-acao');
  const ac=ACOES[p.etapa];
  if(!ac){el.innerHTML='<div class="ib ibsl">Etapa não configurada.</div>';return;}
  if(role==='dono'){ _rAcaoHandleDono(el,ac,p); return; }
  // Se EP tem revisão de entrega do dono pendente, mostrar tela de revisão antes do fluxo normal
  if(isEP() && p.ent?.revisao_ep_pendente){
    _rAcaoRevisaoDono(el, p);
    return;
  }
  const roleNote=role===ac.rk?'':`<div class="ib iba" style="margin-top:.7rem">Esta etapa aguarda: <strong>${ac.role}</strong>. Troque o perfil para interagir.</div>`;
  el.innerHTML=buildAcaoCardHTML(ac,p,roleNote);
  // Barra de devolução ao dono (apenas EP, quando há etapa anterior do dono)
  if(isEP()){
    const etRet=getDevolverEtapa(p);
    if(etRet){
      const bar=document.createElement('div');
      bar.style.cssText='margin-top:.8rem;padding:.6rem 1rem;border:1px dashed var(--bdr);border-radius:var(--r);display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--bg2)';
      bar.innerHTML=`<span style="font-size:12px;color:var(--ink3)">Precisa que o dono refaça <strong>${etLb(etRet)}</strong>?</span>
        <button type="button" class="btn" style="font-size:12px;padding:4px 10px;color:#92400e;border-color:#f59e0b;background:#fef3c7" onclick="devolverAoDono()">↩ Devolver ao dono</button>`;
      el.appendChild(bar);
    }
  }
  _rAcaoInitBpmn(p, false);
}

// ═══════════════════════════════════════════
// FUNÇÕES DE SALVAR POR ETAPA
// ═══════════════════════════════════════════
function _addDias(dateStr,dias){
  if(!dateStr)return'';
  const [y,m,d]=dateStr.split('-').map(Number);
  const dt=new Date(y,m-1,d+dias);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}
function calcPrevAbr(){
  const ini=document.getElementById('a-ini')?.value;
  const prev=document.getElementById('a-prev');
  if(!ini||!prev)return;
  prev.value=_addDias(ini,90);
}
function calcGaveta(){
  const ciclo=Number.parseFloat(document.getElementById('r-tciclo')?.value)||0;
  const real=Number.parseFloat(document.getElementById('r-treal')?.value)||0;
  const gav=document.getElementById('r-tgaveta');
  if(gav&&(ciclo||real)) gav.value=(real-ciclo).toFixed(1)+' horas';
}
function salvarAbertura(){
  const p=curProc;
  p.ent.dt_inicio=document.getElementById('a-ini')?.value||'';
  p.ent.dt_prev=document.getElementById('a-prev')?.value||'';
  p.ent.equipe=document.getElementById('a-equipe')?.value||'';
  p.objetivo=document.getElementById('a-obj')?.value||p.objetivo;
  av('abertura','EP','Dados iniciais confirmados. Reunião de entendimento agendada.');
}
function setLikert(qid,val,btn){
  if(!curProc.ent.quest_resp)curProc.ent.quest_resp={};
  curProc.ent.quest_resp[qid]=val;
  btn.closest('.likert').querySelectorAll('.lk-btn').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
}
function _calcNivelMaturidade(media){
  if(media<=1.5) return 1;
  if(media<=2.5) return 2;
  if(media<=3.5) return 3;
  if(media<=4.5) return 4;
  return 5;
}
function salvarQuestionario(){
  const p=curProc;
  const jr=jaFoiRespondido(p.etapa);
  if(jr){toast('⚠ Tarefa já respondida por '+jr.nome+'. Não é possível enviar novamente.');return;}
  const resp=p.ent.quest_resp||{};
  const respondidas=Object.keys(resp).length;
  const _enviarQuestionario = () => {
    const total=Object.values(resp).reduce((a,b)=>a+b,0);
    const media=respondidas>0?(total/respondidas).toFixed(1):0;
    const nivel=_calcNivelMaturidade(Number.parseFloat(media));
    p.ent.mat=nivel;
    const nota=document.getElementById('quest-nota')?.value||'';
    p.ent.quest_nota=nota;
    if(!p.ent.quest_hist)p.ent.quest_hist=[];
    p.ent.quest_hist.push({dt:now(),nivel,media,respondidas,nota});
    registrarRespondidoPor('questionario');
    push(p,'questionario','Dono do processo','Questionário respondido — '+respondidas+'/15 perguntas — média '+media+' — nível '+nivel);
    const nx=nextEt('questionario');
    if(nx){p.etapa=nx;push(p,nx,'Sistema','Etapa iniciada');}
    {const epEmail=getEPEmail(p)||p.resp_ep+(p.resp_ep?.includes('@')?'':'@sefaz.rs.gov.br');enviarNotif(epEmail,p.resp_ep,'Questionário de maturidade respondido. Nível: '+nivel+'/5. Próxima etapa: '+etLb(nx||''),p.nome,'',p.dono);}
    toast('Questionário enviado! Maturidade nível '+nivel);
    rDetalhe();updCounts();
    fbAutoSave('questionario');
    setTimeout(()=>mostrarResultadoMaturidade(p,nivel,media),200);
  };
  if(respondidas<15) { confirmar(`Apenas ${respondidas}/15 afirmações respondidas. Continuar assim mesmo?`, _enviarQuestionario); } else { _enviarQuestionario(); }
}
function mostrarResultadoMaturidade(p,nivel,media){
  const resp=p.ent.quest_resp||{};
  const ML=['','Inicial','Repetível','Definido','Gerenciado','Otimizado'];
  // Calcula nota por dimensão
  const dims={};
  QUESTOES.forEach(q=>{if(!dims[q.dim]){dims[q.dim]={sum:0,cnt:0};} if(resp[q.id]){dims[q.dim].sum+=resp[q.id];dims[q.dim].cnt++;}});
  const corNivel=['','var(--red)','var(--amber)','var(--amber)','var(--teal)','var(--green)'][nivel]||'var(--blue)';
  const dimRows=Object.entries(dims).map(([dim,d])=>{
    const nota=d.cnt>0?(d.sum/d.cnt):0;
    const pct=Math.round(nota/5*100);
    let cor;
    if(nota<2) cor='#ef4444';
    else if(nota<3) cor='#f97316';
    else if(nota<4) cor='#eab308';
    else if(nota<4.5) cor='#22c55e';
    else cor='#16a34a';
    return `<div style="margin-bottom:.55rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
        <span style="font-size:12px;color:var(--ink2)">${dim}</span>
        <span style="font-size:12px;font-weight:700;color:${cor}">${nota.toFixed(1)}/5</span>
      </div>
      <div style="height:7px;background:var(--bg3);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${cor};border-radius:4px;transition:width .4s"></div>
      </div>
    </div>`;
  }).join('');
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem';
  ov.innerHTML=`<div style="background:var(--surf);border-radius:16px;padding:2rem;max-width:520px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.25);max-height:90vh;overflow-y:auto">
    <div style="text-align:center;margin-bottom:1.4rem">
      <div style="font-size:13px;color:var(--ink3);margin-bottom:.3rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em">Resultado do Questionário de Maturidade</div>
      <div style="font-size:48px;font-weight:900;color:${corNivel};line-height:1">${nivel}</div>
      <div style="font-size:22px;font-weight:700;color:${corNivel};margin-bottom:.2rem">${ML[nivel]||''}</div>
      <div style="font-size:13px;color:var(--ink3)">Média geral: <strong>${media}</strong> · Nível <strong>${nivel}/5</strong></div>
    </div>
    <div style="border-top:1px solid var(--bdr);padding-top:1.2rem;margin-bottom:1.4rem">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3);margin-bottom:.8rem">Nota por eixo</div>
      ${dimRows}
    </div>
    <div style="font-size:12px;color:var(--ink3);background:var(--bg2);border-radius:8px;padding:.8rem;margin-bottom:1.2rem;line-height:1.6">
      O EP foi notificado e dará continuidade ao mapeamento do processo.
    </div>
    <button type="button" onclick="this.closest('[style*=fixed]').remove()" style="width:100%;padding:.7rem;background:var(--blue);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Fechar</button>
  </div>`;
  document.body.appendChild(ov);
}
function salvarReuniao(){
  const p=curProc;
  p.ent.fornecedores=document.getElementById('r-fornec')?.value||'';
  p.ent.clientes=document.getElementById('r-clientes')?.value||'';
  p.ent.entradas=document.getElementById('r-entradas')?.value||'';
  p.ent.atividades_principais=document.getElementById('r-atividades')?.value||'';
  p.ent.saidas=document.getElementById('r-saidas')?.value||'';
  p.ent.atores=document.getElementById('r-atores')?.value||'';
  if(!p.ent.vol)p.ent.vol={};
  p.ent.vol.exec=document.getElementById('r-exec')?.value||'';
  p.ent.t_ciclo=Number.parseFloat(document.getElementById('r-tciclo')?.value)||null;
  p.ent.t_real=Number.parseFloat(document.getElementById('r-treal')?.value)||null;
  if(p.ent.t_ciclo!=null&&p.ent.t_real!=null) p.ent.t_gaveta=+(p.ent.t_real-p.ent.t_ciclo).toFixed(1);
  const prob=(document.getElementById('a-prob')?.value||'').split('\n').map(s=>s.trim()).filter(Boolean);
  p.ent.prob=prob;
  sincronizarSIPOCArquitetura(p);
  av('reuniao','EP','Reunião de entendimento concluída. '+prob.length+' problemas identificados.');
}
async function iaGerarRiscos(){
  const p=curProc;if(!p)return;
  const statusEl=document.getElementById('risco-ia-status');
  if(statusEl)statusEl.textContent='Gerando...';
  const etapasRisco=(p.mod?.etapas_proc||[]).map((e,i)=>`${i+1}. ${e.nome||e.desc||''} (${e.tipo||'Atividade'}, resp: ${e.resp||'—'})`).join('\n');
  const payload=`Processo: ${p.nome}\nÁrea: ${p.area}\nObjetivo: ${p.objetivo||''}\nAtividades principais: ${p.ent.atividades_principais||''}\nEntradas: ${p.ent.entradas||''}\nSaídas: ${p.ent.saidas||''}\nProblemas identificados: ${(p.ent.prob||[]).join('; ')}${etapasRisco?'\nEtapas detalhadas do processo:\n'+etapasRisco:''}\n\nIdentifique até 6 riscos operacionais relevantes para este processo, considerando as etapas detalhadas e os problemas identificados. Responda com uma lista, cada linha no formato exato:\nRisco | Probabilidade | Impacto\nOnde Probabilidade é Baixa/Media/Alta e Impacto é Baixo/Medio/Alto/Critico. Sem numeração, sem cabeçalho.`;
  const result=await chamarIA('assistente',payload,null);
  if(result){
    const linhas=result.split('\n').map(l=>l.trim()).filter(l=>l.includes('|'));
    let adicionados=0;
    if(!p.ent.riscos)p.ent.riscos=[];
    linhas.forEach(l=>{
      const partes=l.split('|').map(s=>s.trim());
      if(partes.length>=3){
        const prob=['Baixa','Media','Alta'].find(v=>partes[1].includes(v))||'Media';
        const imp=['Baixo','Medio','Alto','Critico'].find(v=>partes[2].includes(v))||'Medio';
        p.ent.riscos.push({desc:partes[0],prob,imp});
        adicionados++;
      }
    });
    atualizarRiscoUI();
    if(statusEl)statusEl.textContent=adicionados+' riscos adicionados pela IA';
  } else if(statusEl) {
    statusEl.textContent='Erro ao gerar riscos.';
  }
}
function salvarRiscos(){
  const p=curProc;
  av('riscos','EP','Riscos identificados: '+(p.ent.riscos||[]).length+' registro(s).');
}
async function registrarReuniaoAcomp(){
  const p=curProc;if(!p)return;
  if(!p.reunioes_acomp)p.reunioes_acomp=[];
  const r={
    data:document.getElementById('ac-data')?.value||now(),
    conformidade:document.getElementById('ac-conf')?.value||'Conforme',
    pauta:document.getElementById('ac-pauta')?.value||'',
    desvios:document.getElementById('ac-desv')?.value||'',
    acoes:document.getElementById('ac-acoes')?.value||'',
    participantes:document.getElementById('ac-partic')?.value||'',
    proxima:document.getElementById('ac-proxima')?.value||'',
    registrada_em:now()
  };
  if(!r.data){toast('Informe a data da reunião','var(--red)');return;}
  p.reunioes_acomp.push(r);
  push(p,'acompanha','EP','Reunião de acompanhamento registrada — '+r.data+' — '+r.conformidade);
  await fbSaveAll();
  toast('Reunião registrada!','var(--teal)');
  rDetalhe();
}
function editarReuniaoAcomp(idx){
  const r=(curProc?.reunioes_acomp||[])[idx];
  if(!r)return;
  globalThis._acEditIdx=idx;
  const v=id=>document.getElementById(id);
  v('ac-edit-data').value=r.data||'';
  v('ac-edit-conf').value=r.conformidade||'Conforme';
  v('ac-edit-pauta').value=r.pauta||'';
  v('ac-edit-desv').value=r.desvios||'';
  v('ac-edit-acoes').value=r.acoes||'';
  v('ac-edit-partic').value=r.participantes||'';
  v('ac-edit-proxima').value=r.proxima||'';
  v('ac-edit-panel').style.display='block';
  v('ac-edit-panel').scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function salvarEditReuniaoAcomp(){
  const p=curProc;if(!p)return;
  const idx=globalThis._acEditIdx;
  if(idx==null||!p.reunioes_acomp?.[idx])return;
  const v=id=>document.getElementById(id)?.value||'';
  p.reunioes_acomp[idx]={
    ...p.reunioes_acomp[idx],
    data:v('ac-edit-data'),
    conformidade:v('ac-edit-conf'),
    pauta:v('ac-edit-pauta'),
    desvios:v('ac-edit-desv'),
    acoes:v('ac-edit-acoes'),
    participantes:v('ac-edit-partic'),
    proxima:v('ac-edit-proxima'),
  };
  await fbSaveAll();
  toast('Reunião atualizada!','var(--teal)');
  globalThis._acEditIdx=null;
  rDetalhe();
}
function cancelarEditReuniaoAcomp(){
  globalThis._acEditIdx=null;
  document.getElementById('ac-edit-panel').style.display='none';
}
function excluirReuniaoAcomp(idx){
  confirmar('Excluir esta reunião de acompanhamento?',async()=>{
    const p=curProc;if(!p?.reunioes_acomp)return;
    p.reunioes_acomp.splice(idx,1);
    await fbSaveAll();
    toast('Reunião excluída.','var(--amber)');
    rDetalhe();
  });
}
function salvarDadosPublicacao(){
  const p=curProc;if(!p)return;
  const link=document.getElementById('a-link')?.value||'';
  const vig=document.getElementById('a-vig')?.value||'';
  const efet=document.getElementById('pub-efet')?.value||'';
  p.form=p.form||{};
  if(link)p.form.link_pub=link;
  if(vig)p.form.vig=vig;
  if(efet)p.ent.dt_efetiva=efet;
  fbAutoSave('salvarDadosPublicacao');
  toast('Dados salvos!','var(--teal)');
}
function publicarProcesso(){
  const p=curProc;
  p.ent.dt_efetiva=document.getElementById('pub-efet')?.value||p.ent.dt_efetiva;
  p.form=p.form||{};
  p.form.link_pub=document.getElementById('a-link')?.value||p.form.link_pub||'';
  p.form.vig=document.getElementById('a-vig')?.value||p.form.vig||'';
  av('publicacao','EP','Processo publicado. Início da operação.');
  // Notificar dono e interessados sobre publicação
  const donoEmail=getDonoEmail(p);
  const acao='Processo "'+p.nome+'" publicado! O POP está disponível no repositório.';
  if(donoEmail && p.dono) enviarNotif(donoEmail, p.dono, acao, p.nome, '', usuarioLogado?.nome||'EP');
  (p.interessados||[]).forEach(email=>{
    if(email) enviarNotif(email, email, acao, p.nome, '', usuarioLogado?.nome||'EP');
  });
}
function salvarAnalise(){
  const p=curProc;
  if(!p.ent.analise)p.ent.analise={};
  salvarDadosQuantitativos();
  av('analise','EP','Análise AS IS concluída');
}
function salvarDadosQuantitativos(){
  const p=curProc;if(!p)return;
  if(!p.ent.analise)p.ent.analise={};
  const a=p.ent.analise;
  a.t_ciclo_medio=document.getElementById('an-tciclo')?.value||'';
  a.t_espera_medio=document.getElementById('an-tespera')?.value||'';
  a.qtd_atividades=Number.parseInt(document.getElementById('an-ativ')?.value)||0;
  a.qtd_decisoes=Number.parseInt(document.getElementById('an-dec')?.value)||0;
  fbAutoSave('salvar');toast('Dados salvos!','var(--teal)');
}
function confirmarRegenerarAnalise(){
  const p=curProc;if(!p)return;
  const temFeedback=p.ent?.analise?.feedback_dono&&Object.keys(p.ent.analise.feedback_dono).length>0;
  if(temFeedback){
    confirmar('⚠ Atenção\n\nVocê já validou itens na etapa "Melhorias do Processo" (confirmações e descartes).\n\nAo regenerar a análise, todo esse trabalho de validação será perdido e precisará ser refeito.\n\nDeseja continuar mesmo assim?', () => gerarAnaliseIA());
  } else {
    gerarAnaliseIA();
  }
}
function _gerarAnaliseIAPayloadExtra(p){
  const problemas=(p.ent?.prob||[]).filter(Boolean);
  const riscos=(p.ent?.riscos||[]).map(r=>`${r.descricao||r.desc||''} (probabilidade: ${r.probabilidade||'—'}, impacto: ${r.impacto||'—'})`).filter(s=>s.trim()!=='(probabilidade: —, impacto: —)');
  if(!problemas.length && !riscos.length) return '';
  const probsStr=problemas.length?'\n\nProblemas/dores levantados na reunião de entendimento:\n'+problemas.map((x,i)=>`${i+1}. ${x}`).join('\n'):'';
  const riscosStr=riscos.length?'\n\nRiscos identificados na etapa de identificação de riscos:\n'+riscos.map((r,i)=>`${i+1}. ${r}`).join('\n'):'';
  const instrucoes='\n\nAlém dos campos padrão (resumo, gargalos, retrabalhos, gaps, oportunidades, complexidade), inclua obrigatoriamente no JSON:\n- "solucoes_problemas": array de strings, uma solução por problema listado acima, obrigatoriamente no formato "[Problema: <texto exato do problema>] <sugestão de solução concreta>" (mesma ordem e quantidade dos problemas)';
  return probsStr+riscosStr+instrucoes;
}
function _gerarAnaliseIASalvarJSON(p, json){
  p.ent.analise.ia_resultado=json;
  if(json.gargalos)p.ent.analise.gargalos=json.gargalos;
  if(json.retrabalhos)p.ent.analise.retrabalhos=json.retrabalhos;
  if(json.gaps)p.ent.analise.gaps=json.gaps;
  if(json.oportunidades)p.ent.analise.oportunidades=json.oportunidades;
  if(json.complexidade)p.ent.analise.complexidade=json.complexidade;
  if(json.solucoes_problemas)p.ent.analise.solucoes_problemas=json.solucoes_problemas;
  fbAutoSave('salvar');
  rDetalhe();
}
async function gerarAnaliseIA(){
  const p=curProc;if(!p)return;
  if(!p.ent.analise)p.ent.analise={};
  const el=document.getElementById('ia-analise-result');
  if(!el)return;
  const a=p.ent.analise;
  const etapas=(p.mod?.etapas_proc||[]).map((e,i)=>`${i+1}. ${e.nome||e.desc||''} | Resp: ${e.resp||''} | Tipo: ${e.tipo||''}`).join('\n');
  const payloadExtra=_gerarAnaliseIAPayloadExtra(p);
  const etapasProc=p.mod?.etapas_proc||[];
  const tCiclo=a.t_ciclo_medio||(p.ent.t_ciclo==null?'não informado':p.ent.t_ciclo+' h');
  const tEspera=a.t_espera_medio||(p.ent.t_gaveta==null?'não informado':p.ent.t_gaveta+' h');
  const qtdAtiv=a.qtd_atividades||etapasProc.filter(e=>!e.tipo||e.tipo==='Atividade').length||0;
  const qtdDec=a.qtd_decisoes||etapasProc.filter(e=>e.tipo==='Decisao').length||0;
  const payload=`Processo: ${p.nome}\nMacro: ${p.macro} | Área: ${p.area}\nObjetivo: ${p.objetivo||''}\nVolumetria: ${JSON.stringify(p.ent?.vol||{})}\nTempo de ciclo: ${tCiclo}\nTempo de espera: ${tEspera}\nQtd atividades: ${qtdAtiv}\nQtd decisões: ${qtdDec}${etapas?'\nEtapas do processo:\n'+etapas:''}${p.mod?.asIs?'\nDescrição AS IS:\n'+p.mod.asIs.substring(0,2000):''}${p.mod?.toBe?'\nDescrição TO BE:\n'+p.mod.toBe.substring(0,1000):''}${payloadExtra}`;
  const result=await chamarIA('analisar_bpmn',payload,el);
  if(result){
    try{
      _gerarAnaliseIASalvarJSON(p, JSON.parse(result));
    }catch{
      el.innerHTML=`<div class="ai-result"><div class="ai-result-lbl">✦ Análise IA</div>${esc(result)}</div>`;
    }
  }
}
function salvarEsboco(){
  const p=curProc;
  p.mod.asIs=document.getElementById('e-asis')?.value||p.mod.asIs||'';
  const mAs=bpmnModelers['asis'];
  if(mAs){mAs.saveXML({format:true}).then(({xml})=>{p.mod.bpmnAsIs=xml;}).catch(e=>console.warn('bpmn saveXML asis:',e.message));}
  av('esboco_asis','EP','Esboço AS IS elaborado com BPMN');
}
function salvarEsbocaTobe(){
  const p=curProc;
  p.mod.toBe=document.getElementById('e-tobe')?.value||p.mod.toBe||'';
  const mTo=bpmnModelers['tobe'];
  if(mTo){mTo.saveXML({format:true}).then(({xml})=>{p.mod.bpmnToBe=xml;}).catch(e=>console.warn('bpmn saveXML tobe:',e.message));}
  av('esboco_tobe','EP','Esboço TO BE elaborado com BPMN');
}


function pularEtapa(etId){
  push(curProc,etId,'EP','Etapa pulada (opcional)');
  const nx=nextEt(etId);
  if(nx){curProc.etapa=nx;push(curProc,nx,'Sistema','Etapa iniciada');}
  rDetalhe();updCounts();fbAutoSave('pularEtapa');
  if(isEP()&&curProc?.dono){
    const etObj=getEtapas(curProc).find(e=>e.id===nx);
    if(etObj?.resp==='dono')setTimeout(()=>perguntarNotifDono(nx),200);
  }
}
function salvarPOP(){
  const p=curProc;
  if(!p.form)p.form={pop_ok:false,pop:null,apresent:'',bpmnXml:null};
  const etapas=p.mod?.etapas_proc||[];
  const ativ_detalhes={...p.form.pop?.ativ_detalhes};
  etapas.forEach((_,i)=>{
    const descEl=document.getElementById(`pop-at-desc-${i}`);
    if(!descEl)return; // aba Atividades não renderizada, preserva valor anterior
    const prev=ativ_detalhes[i]||{};
    ativ_detalhes[i]={
      tipo:document.getElementById(`pop-at-tipo-${i}`)?.value||prev.tipo||'Atividade',
      desc:descEl.value||prev.desc||'',
      resp:document.getElementById(`pop-at-resp-${i}`)?.value||prev.resp||'',
    };
  });
  p.form.pop={
    area:document.getElementById('pp-area')?.value||'',
    ger:document.getElementById('pp-ger')?.value||'',
    mac:document.getElementById('pp-mac')?.value||'',
    obj:document.getElementById('pp-obj')?.value||'',
    def:document.getElementById('pp-def')?.value||'',
    ent:document.getElementById('pp-ent')?.value||'',
    sai:document.getElementById('pp-sai')?.value||'',
    docs:document.getElementById('pp-docs')?.value||'',
    ativ_detalhes,
  };
  p.form.pop_ok=true;
  av('pop','EP','POP construído no padrão CAGE');
  fbAutoSave('salvarPOP');
}
function salvarComplementacaoDono(){
  const p=curProc;
  const jr=jaFoiRespondido(p.etapa);
  if(jr){toast('⚠ Tarefa já respondida por '+jr.nome+'. Não é possível enviar novamente.');return;}
  if(!p.form)p.form={};
  p.form.faq=document.getElementById('afaq')?.value||p.form.faq||'';
  p.form.excecoes=document.getElementById('a-excecoes')?.value||p.form.excecoes||'';
  p.form.contatos=document.getElementById('a-contatos')?.value||p.form.contatos||'';
  p.form.forms=document.getElementById('aforms')?.value||p.form.forms||'';
  const obs=document.getElementById('aobs')?.value||'';
  if(obs) p.form.obs_complement=obs;
  const dt=document.getElementById('comp-dt')?.value||'';
  const part=document.getElementById('comp-part')?.value||'';
  const ata=document.getElementById('comp-ata')?.value||'';
  if(dt||part||ata) p.form.reuniao_complement={data:dt,participantes:part,ata};
  avDono('complement','Dono do processo','Complementação fornecida pelo dono do processo');
}
function salvarApresentacao(){
  const obs=document.getElementById('aobs')?.value||'';
  const p=curProc;
  if(!p.form)p.form={pop_ok:false,pop:null,apresent:''};
  p.form.apresent='Aprovado pelo gestor em '+now()+(obs?'. '+obs:'');
  const dt=document.getElementById('adt')?.value||'';
  const part=document.getElementById('apart')?.value||'';
  const ata=document.getElementById('apr-ata')?.value||'';
  if(dt||part||ata) p.form.reuniao_apresentacao={data:dt,participantes:part,ata};
  av('apresentacao','Gestor','Aprovado pelo gestor para publicação');
}

// ── GERAÇÃO DE POP EM PPT COM IA (PUBLICAÇÃO) ──

// Cache do logo SIGA em base64
let _logoB64 = null;
async function fetchLogoBase64() {
  if (_logoB64) return _logoB64;
  try {
    const resp = await fetch('logo-siga.png');
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise(res => {
      const reader = new FileReader();
      reader.onload = () => { _logoB64 = reader.result; res(reader.result); };
      reader.onerror = () => res(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

// Renderiza XML BPMN para PNG (data URI) via BpmnJS
async function renderBpmnToPng(xml) {
  if (!xml || typeof BpmnJS === 'undefined') return null;
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;left:-9999px;top:0;width:1400px;height:700px;overflow:hidden;';
    document.body.appendChild(wrap);
    let viewer;
    try {
      viewer = new BpmnJS({ container: wrap });
      viewer.importXML(xml)
        .then(() => { viewer.get('canvas').zoom('fit-viewport'); return viewer.saveSVG(); })
        .then(({ svg }) => {
          const img = new Image();
          const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          img.onload = () => {
            const c = document.createElement('canvas');
            const sc = 2;
            c.width = Math.max(img.width, 100) * sc;
            c.height = Math.max(img.height, 50) * sc;
            const ctx2d = c.getContext('2d');
            ctx2d.fillStyle = '#ffffff'; ctx2d.fillRect(0, 0, c.width, c.height);
            ctx2d.scale(sc, sc); ctx2d.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            try { viewer.destroy(); } catch(_e) { console.warn('BPMN viewer cleanup:', _e); }
            wrap.remove();
            resolve(c.toDataURL('image/png'));
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            try { viewer.destroy(); } catch(_e) { console.warn('BPMN viewer cleanup:', _e); }
            wrap.remove();
            resolve(null);
          };
          img.src = url;
        })
        .catch(() => {
          try { viewer.destroy(); } catch(_e) { console.warn('BPMN viewer cleanup:', _e); }
          try { wrap.remove(); } catch(_e) { console.warn('BPMN wrap cleanup:', _e); }
          resolve(null);
        });
    } catch(_e) {
      console.warn('BPMN render error:', _e);
      if (viewer) try { viewer.destroy(); } catch(error_) { console.warn('BPMN viewer cleanup:', error_); }
      try { wrap.remove(); } catch(error_) { console.warn('BPMN wrap cleanup:', error_); }
      resolve(null);
    }
  });
}

async function gerarFAQIA(){
  const p=curProc; if(!p) return;
  const btn=document.getElementById('btn-gerar-faq');
  const st=document.getElementById('faq-ia-status');
  if(btn) btn.disabled=true;
  const payload={
    processo: p.nome,
    objetivo: p.objetivo||'',
    etapas: (p.mod?.etapas_proc||[]).map(e=>e.nome).join(', '),
    problemas: (p.ent?.prob||[]).join('; '),
    atores: p.ent?.atores||'',
    produto: p.produto||''
  };
  try{
    const res = await chamarIA('gerar_faq', payload, st);
    if(res){
      const el=document.getElementById('afaq');
      if(el) el.value=(el.value?el.value+'\n\n':'')+res.trim();
      toast('FAQ gerado! Revise e edite conforme necessário.','var(--teal)');
    }
  } catch(e){ toast('Erro ao gerar FAQ: '+e.message,'var(--red)'); }
  finally{ if(btn){btn.disabled=false;} if(st){st.textContent='';} }
}

// ── gerarPOPPPT: construtores de strings extraídos para manutenibilidade ──
function _pptCtxStr(p, dimText, probsText, riscosText, solucoesFinal, {gargalosFinal, gapsFinal, oportunidadesFinal, faqText, indsText}){
  return `PROCESSO: ${p.nome}
MACROPROCESSO: ${p.macro || '—'}
ÁREA: ${p.area || '—'}
GESTOR/DONO: ${p.dono || '—'}
OBJETIVO: ${p.objetivo || '—'}
PRODUTO DO MAPEAMENTO: ${p.produto || '—'}
PRIORIDADE: ${p.prio || '—'}
VOLUME (execuções/período): ${p.ent?.vol?.exec || '—'}
TEMPO DE CICLO MÉDIO: ${p.ent?.t_ciclo == null ? p.ent?.vol?.tempo || '—' : p.ent.t_ciclo + ' h'}
TEMPO REAL (LEAD TIME): ${p.ent?.t_real == null ? '—' : p.ent.t_real + ' h'}
TEMPO DE GAVETA: ${p.ent?.t_gaveta == null ? '—' : p.ent.t_gaveta + ' h'}
SAZONALIDADE: ${p.ent?.vol?.sazon || '—'}
MATURIDADE GERAL: ${p.ent?.mat || 0}/5
MATURIDADE POR EIXO: ${dimText || '—'}
SIPOC — Fornecedores: ${p.ent?.fornecedores || '—'}
SIPOC — Entradas: ${p.ent?.entradas || '—'}
SIPOC — Saídas: ${p.ent?.saidas || '—'}
SIPOC — Clientes: ${p.ent?.clientes || '—'}
SIPOC — Atores: ${p.ent?.atores || '—'}
PROBLEMAS RELATADOS:
${probsText || 'Nenhum registrado'}
RISCOS IDENTIFICADOS:
${riscosText || 'Nenhum registrado'}
SOLUÇÕES DE PROBLEMAS CONFIRMADAS PELA EQUIPE (usar no slide de soluções):
${solucoesFinal.length ? solucoesFinal.map((s,i)=>`${i+1}. ${s}`).join('\n') : 'Nenhuma confirmada'}
SITUAÇÃO AS IS: ${p.mod?.asIs || '—'}
SITUAÇÃO TO BE: ${p.mod?.toBe || '—'}
GARGALOS CONFIRMADOS: ${gargalosFinal.join('; ') || '—'}
GAPS CONFIRMADOS: ${gapsFinal.join('; ') || '—'}
OPORTUNIDADES CONFIRMADAS: ${oportunidadesFinal.join('; ') || '—'}
FAQ:
${faqText || 'Não preenchido'}
INDICADORES VINCULADOS:
${indsText || 'Nenhum indicador cadastrado'}`;
}
function _pptPromptStr(ctx){
  return `Você é especialista em BPM gerando um POP em PowerPoint para publicação oficial.

Com base nos dados abaixo, gere o conteúdo para uma apresentação com EXATAMENTE 11 slides na ordem indicada.
Escreva em português formal e executivo. Retorne APENAS o JSON, sem markdown.

{
  "slides": [
    {"id":"apresentacao","titulo":"Apresentação do Processo","tipo":"dados",
      "dados":[{"label":"Macroprocesso","valor":"..."},{"label":"Processo / Subprocesso","valor":"..."},{"label":"Área responsável","valor":"..."},{"label":"Gestor do processo","valor":"..."},{"label":"Prioridade","valor":"..."},{"label":"Produto do mapeamento","valor":"..."}]},

    {"id":"sipoc_volumetria","titulo":"SIPOC, Volumetria e Maturidade","tipo":"sipoc",
      "sipoc":{"S":"fornecedores reais","I":"entradas reais","P":"nome do processo","O":"saídas reais","C":"clientes reais"},
      "volumetria":[{"label":"Execuções / período","valor":"..."},{"label":"Tempo de ciclo médio","valor":"..."},{"label":"Lead time (tempo real)","valor":"..."},{"label":"Tempo de gaveta","valor":"..."}],
      "maturidade":[{"eixo":"Alinhamento estratégico","nota":"X/5"},{"eixo":"Estrutura e padronização","nota":"X/5"},{"eixo":"Papéis e responsabilidades","nota":"X/5"},{"eixo":"Execução e controle","nota":"X/5"},{"eixo":"Automação e tecnologia","nota":"X/5"},{"eixo":"Monitoramento e melhoria","nota":"X/5"}]},

    {"id":"objetivo_problemas","titulo":"Objetivo do Mapeamento e Problemas Relatados","tipo":"objetivo",
      "objetivo":"parágrafo conciso explicando o objetivo do trabalho de mapeamento e contexto institucional...",
      "problemas":["problema 1 real","problema 2 real","..."]},

    {"id":"asis","titulo":"Desenho AS IS — Situação Atual","tipo":"bpmn_asis",
      "resumo":"descrição objetiva da situação atual do processo caso o diagrama não esteja disponível..."},

    {"id":"riscos","titulo":"Riscos Identificados","tipo":"bullets",
      "bullets":["Risco 1 — probabilidade / impacto","Risco 2 — ..."]},

    {"id":"solucoes","titulo":"Propostas de Soluções","tipo":"solucoes",
      "itens":[{"problema":"problema ou risco identificado","solucao":"sugestão de mitigação ou solução proposta"}]},

    {"id":"tobe","titulo":"Desenho TO BE — Situação Proposta","tipo":"bpmn_tobe",
      "resumo":"descrição objetiva da situação proposta caso o diagrama não esteja disponível..."},

    {"id":"comparativo","titulo":"Comparativo AS IS → TO BE","tipo":"bullets",
      "bullets":["Mudança 1: o que era X, passa a ser Y","Mudança 2: ..."]},

    {"id":"faq","titulo":"Perguntas Frequentes — FAQ","tipo":"faq",
      "itens":[{"pergunta":"P: pergunta frequente?","resposta":"R: resposta objetiva."}]},

    {"id":"indicadores","titulo":"Indicadores Vinculados ao Processo","tipo":"indicadores",
      "itens":[{"label":"nome do indicador","valor":"periodicidade — meta se houver"}]},

    {"id":"encerramento","titulo":"Encerramento","tipo":"encerramento",
      "mensagem":"mensagem executiva de encerramento, reforçando o valor do processo documentado..."}
  ]
}

DADOS DO PROCESSO:
${ctx}`;
}

async function gerarPOPPPT() {
  const p = curProc;
  if (!p) { toast('Nenhum processo selecionado.','var(--amber)'); return; }
  const btn = document.getElementById('btn-gerar-pop-ppt');
  const st = document.getElementById('pop-ppt-status');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Gerando...'; }
  if (st) st.innerHTML = '<div class="ai-loading"><div class="spin"></div>Carregando logo e diagramas...</div>';
  try {
    // Carrega logo e renderiza BPMNs em paralelo
    const [logoB64, bpmnAsisPng, bpmnTobePng] = await Promise.all([
      fetchLogoBase64(),
      p.mod?.bpmnAsIs ? renderBpmnToPng(p.mod.bpmnAsIs) : Promise.resolve(null),
      p.mod?.bpmnToBe ? renderBpmnToPng(p.mod.bpmnToBe) : Promise.resolve(null)
    ]);

    // Indicadores vinculados
    const indsProc = kpis.filter(k => k.pid === p.id);

    // Maturidade por dimensão
    const resp = p.ent?.quest_resp || {};
    const dims = {};
    QUESTOES.forEach(q => {
      if (!dims[q.dim]) dims[q.dim] = { sum: 0, cnt: 0 };
      if (resp[q.id]) { dims[q.dim].sum += resp[q.id]; dims[q.dim].cnt++; }
    });
    const dimText = Object.entries(dims).map(([d, v]) => `${d}: ${v.cnt > 0 ? (v.sum / v.cnt).toFixed(1) : '-'}/5`).join('; ');

    const a = p.ent?.analise || {};

    // Filtra apenas itens CONFIRMADOS na etapa Melhorias do Processo
    const fb = a.feedback_dono || {};
    function confirmados(tipo) {
      return Object.entries(fb[tipo] || {}).filter(([,v]) => v === 'confirmado').map(([k]) => k);
    }
    const solucoesConf    = confirmados('solucoes_problemas');
    const gargalosConf    = confirmados('gargalos');
    const oportunidadesConf = confirmados('oportunidades');
    const gapsConf        = confirmados('gaps');
    // Se não houver feedback ainda (etapa não percorrida), usa todos
    const hasFeedback = Object.keys(fb).length > 0;
    const gargalosFinal    = hasFeedback ? gargalosConf    : (a.gargalos || []);
    const oportunidadesFinal = hasFeedback ? oportunidadesConf : (a.oportunidades || []);
    const gapsFinal        = hasFeedback ? gapsConf        : (a.gaps || []);
    const solucoesFinal    = hasFeedback ? solucoesConf    : (a.solucoes_problemas || []);

    const riscosText = (p.ent?.riscos || []).map((r, i) => {
      const d = r.desc || r;
      const det = [r.prob ? 'Prob: ' + r.prob : '', r.impacto ? 'Impacto: ' + r.impacto : ''].filter(Boolean).join(', ');
      return `${i + 1}. ${d}${det ? ' (' + det + ')' : ''}`;
    }).filter(Boolean).join('\n');
    const probsText = (p.ent?.prob || []).join('\n');
    const indsText = indsProc.slice(0, 8).map(k => `${k.enunciado || k.indicador}${k.ciclo ? ' (' + k.ciclo + ')' : ''}${k.meta ? ' — meta: ' + k.meta : ''}`).join('\n');
    const faqText = p.form?.faq || '';

    const ctx = _pptCtxStr(p, dimText, probsText, riscosText, solucoesFinal, {gargalosFinal, gapsFinal, oportunidadesFinal, faqText, indsText});
    const prompt = _pptPromptStr(ctx);

    if (st) st.innerHTML = '<div class="ai-loading"><div class="spin"></div>IA elaborando conteúdo do POP...</div>';
    const raw = await chamarIA('gerar_ppt', prompt, st);
    if (!raw) return;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Resposta da IA não contém JSON válido.');
    const iaContent = JSON.parse(jsonMatch[0]);

    if (st) st.textContent = 'Montando arquivo PowerPoint...';
    await montarPOPPPT(p, iaContent, logoB64, bpmnAsisPng, bpmnTobePng, indsProc);
    if (st) st.textContent = '✓ POP gerado e baixado com sucesso!';
  } catch(e) {
    console.error('gerarPOPPPT:', e);
    if (st) st.textContent = '⚠ Erro: ' + e.message;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✨ Gerar POP em PPT com IA'; }
  }
}

async function montarPOPPPT(p, dados, logoB64, bpmnAsisPng, bpmnTobePng, indsProc) {
  if (typeof PptxGenJS === 'undefined') throw new Error('PptxGenJS não carregada.');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33" × 7.5"
  pptx.author = 'EP·CAGE'; pptx.company = 'CAGE/Sefaz-RS'; pptx.subject = p.nome;

  const C1='1E3A5F', C2='2E7D8F', C3='F5F7FA', CW='FFFFFF', CG='2E2E2E';
  const CA='1B5E7B', CL='C8DCE8';
  const ML_=['','Inicial','Repetível','Definido','Gerenciado','Otimizado'];
  const HCOLS=['1E3A5F','1A6674','2C5F8A','1E5E5E','2E4A7A','1A5A6A','243F6A','185A6A'];

  // Rodapé padrão com logo SIGA
  function addFooter(sl, num) {
    sl.addShape(pptx.ShapeType.rect, {x:0,y:6.87,w:'100%',h:0.28,fill:{color:'D8E5EF'}});
    sl.addText(p.nome, {x:0.28,y:6.89,w:9.4,h:0.22,fontSize:7.5,color:'7A8FA0',fontFace:'Calibri'});
    sl.addText(String(num), {x:12.45,y:6.89,w:0.5,h:0.22,fontSize:7.5,color:'7A8FA0',fontFace:'Calibri',align:'right'});
    if (logoB64) sl.addImage({data:logoB64, x:10.12,y:6.82,w:1.38,h:0.38});
  }

  // Cabeçalho padrão
  function addHeader(sl, titulo, cor) {
    sl.addShape(pptx.ShapeType.rect, {x:0,y:0,w:'100%',h:1.1,fill:{color:cor||C1}});
    sl.addShape(pptx.ShapeType.rect, {x:0,y:1.1,w:'100%',h:0.04,fill:{color:C2}});
    sl.addText(titulo||'', {x:0.45,y:0.17,w:11.3,h:0.78,fontSize:20,bold:true,color:CW,fontFace:'Calibri',valign:'middle'});
  }

  // ── CAPA ──
  {
    const sl = pptx.addSlide();
    sl.background = {color:C1};
    sl.addShape(pptx.ShapeType.rect, {x:0,y:3.35,w:'100%',h:0.07,fill:{color:C2}});
    sl.addShape(pptx.ShapeType.rect, {x:0,y:6.6,w:'100%',h:0.9,fill:{color:'152C47'}});
    // Logo SIGA em destaque na capa
    if (logoB64) sl.addImage({data:logoB64, x:8.85,y:0.32,w:3.6,h:0.98});
    sl.addText('Procedimento Operacional Padrão', {x:0.8,y:0.85,w:8,h:0.44,fontSize:12,color:'7AAFC8',fontFace:'Calibri',italic:true});
    sl.addText(p.nome, {x:0.8,y:1.25,w:11.7,h:1.55,fontSize:26,bold:true,color:CW,fontFace:'Calibri',valign:'middle',wrap:true});
    sl.addText(p.macro||'', {x:0.8,y:2.9,w:11.5,h:0.38,fontSize:13,color:'A8C4D4',fontFace:'Calibri'});
    const info = [p.area?'Área: '+p.area:'', p.dono?'Gestor: '+p.dono:'', now()].filter(Boolean).join('   |   ');
    sl.addText(info, {x:0.8,y:3.52,w:11.5,h:0.32,fontSize:10.5,color:'7A9AB5',fontFace:'Calibri'});
    sl.addText('EP·CAGE — Escritório de Processos — CAGE/Sefaz-RS', {x:0,y:6.65,w:'100%',h:0.3,fontSize:10,color:'5A7A95',align:'center',fontFace:'Calibri'});
  }

  function renderSlideDados(sl, slide, cor) {
    const itens = slide.dados || [];
    const cols = itens.length > 4 ? 2 : 1;
    const perCol = Math.ceil(itens.length / cols);
    itens.forEach((d, i) => {
      const col = Math.floor(i / perCol), row = i % perCol;
      const bx = 0.4 + col * 6.4, by = 1.22 + row * 1.02;
      sl.addShape(pptx.ShapeType.roundRect, {x:bx,y:by,w:6,h:0.86,fill:{color:CW},line:{color:cor,width:1.5},rectRadius:0.07});
      sl.addText(d.label||'', {x:bx+0.18,y:by+0.06,w:5.65,h:0.26,fontSize:9.5,color:'888888',fontFace:'Calibri'});
      sl.addText(d.valor||'', {x:bx+0.18,y:by+0.36,w:5.65,h:0.4,fontSize:13,color:cor,fontFace:'Calibri',bold:true});
    });
  }
  function renderSlideSipoc(sl, slide, cor) {
    const sipoc = slide.sipoc || {};
    const sdata = {
      S: sipoc.S || p.ent?.fornecedores || '—',
      I: sipoc.I || p.ent?.entradas || '—',
      P: sipoc.P || p.nome,
      O: sipoc.O || p.ent?.saidas || '—',
      C: sipoc.C || p.ent?.clientes || '—'
    };
    const skeys=['S','I','P','O','C'];
    const slabels={S:'Fornecedores',I:'Entradas',P:'Processo',O:'Saídas',C:'Clientes'};
    const sbg={S:'DBEAFE',I:'DCFCE7',P:'EDE9FE',O:'FEF3C7',C:'FCE7F3'};
    const stxt={S:'1D4ED8',I:'166534',P:'5B21B6',O:'92400E',C:'9D174D'};
    const cw=2.45, by0=1.18, bh=2.1;
    skeys.forEach((k, ki) => {
      const bx = 0.28 + ki * cw;
      sl.addShape(pptx.ShapeType.rect, {x:bx,y:by0,w:cw-0.04,h:bh,fill:{color:sbg[k]}});
      sl.addText(k, {x:bx+0.07,y:by0+0.04,w:0.44,h:0.52,fontSize:20,bold:true,color:stxt[k],fontFace:'Georgia'});
      sl.addText(slabels[k], {x:bx+0.07,y:by0+0.54,w:cw-0.18,h:0.22,fontSize:8,bold:true,color:stxt[k],fontFace:'Calibri'});
      sl.addText(sdata[k], {x:bx+0.07,y:by0+0.78,w:cw-0.18,h:bh-0.86,fontSize:9.5,color:'1E293B',fontFace:'Calibri',wrap:true,valign:'top'});
    });
    const vols = slide.volumetria || [];
    sl.addText('Volumetria e Tempos', {x:0.28,y:3.38,w:5,h:0.26,fontSize:9.5,bold:true,color:CA,fontFace:'Calibri'});
    vols.slice(0, 4).forEach((v, i) => {
      const bx = 0.28 + i * 3.06;
      sl.addShape(pptx.ShapeType.roundRect, {x:bx,y:3.67,w:2.96,h:0.74,fill:{color:CW},line:{color:C2,width:1},rectRadius:0.05});
      sl.addText(v.label||'', {x:bx+0.1,y:3.7,w:2.76,h:0.22,fontSize:8,color:'888888',fontFace:'Calibri'});
      sl.addText(v.valor||'—', {x:bx+0.1,y:3.92,w:2.76,h:0.36,fontSize:11,bold:true,color:CA,fontFace:'Calibri'});
    });
    const mats = slide.maturidade || [];
    sl.addText('Maturidade por Eixo', {x:0.28,y:4.52,w:5,h:0.26,fontSize:9.5,bold:true,color:CA,fontFace:'Calibri'});
    mats.slice(0, 6).forEach((m, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const bx = 0.28 + col * 4.18, by = 4.8 + row * 0.4;
      sl.addText((m.eixo||''), {x:bx,y:by,w:3.4,h:0.36,fontSize:9.5,color:CG,fontFace:'Calibri'});
      sl.addShape(pptx.ShapeType.roundRect, {x:bx+3.45,y:by+0.03,w:0.52,h:0.28,fill:{color:cor},rectRadius:0.04});
      sl.addText(m.nota||'—', {x:bx+3.45,y:by+0.03,w:0.52,h:0.28,fontSize:9,bold:true,color:CW,fontFace:'Calibri',align:'center',valign:'middle'});
    });
    const matGeral = p.ent?.mat || 0;
    sl.addText(`Maturidade Geral: ${matGeral}/5 — ${ML_[matGeral]||''}`, {x:8.5,y:4.52,w:4.2,h:0.26,fontSize:9.5,bold:true,color:cor,fontFace:'Calibri',align:'right'});
  }
  function renderSlideObjetivo(sl, slide) {
    sl.addText('Objetivo', {x:0.5,y:1.18,w:11.5,h:0.27,fontSize:10.5,bold:true,color:CA,fontFace:'Calibri'});
    sl.addShape(pptx.ShapeType.rect, {x:0.5,y:1.47,w:12.1,h:1.32,fill:{color:'EEF4FA'},line:{color:CL,width:1}});
    sl.addText(slide.objetivo||'—', {x:0.7,y:1.51,w:11.72,h:1.24,fontSize:12,color:CG,fontFace:'Calibri',valign:'middle',wrap:true});
    sl.addText('Problemas Relatados', {x:0.5,y:2.88,w:11.5,h:0.27,fontSize:10.5,bold:true,color:CA,fontFace:'Calibri'});
    (slide.problemas||[]).slice(0, 6).forEach((pr, i) => {
      const by = 3.18 + i * 0.59;
      sl.addShape(pptx.ShapeType.rect, {x:0.5,y:by+0.1,w:0.2,h:0.2,fill:{color:'C0392B'},line:{color:'C0392B'}});
      sl.addText(pr, {x:0.85,y:by,w:11.52,h:0.54,fontSize:11.5,color:CG,fontFace:'Calibri',valign:'middle',wrap:true});
    });
  }
  function renderSlideSolucoes(sl, slide) {
    const itens = slide.itens || [];
    sl.addShape(pptx.ShapeType.rect, {x:0.3,y:1.15,w:6,h:0.36,fill:{color:'B03030'}});
    sl.addText('Problema / Risco', {x:0.42,y:1.17,w:5.8,h:0.32,fontSize:10.5,bold:true,color:CW,fontFace:'Calibri',valign:'middle'});
    sl.addShape(pptx.ShapeType.rect, {x:6.42,y:1.15,w:6.22,h:0.36,fill:{color:'1A6674'}});
    sl.addText('Mitigação / Solução', {x:6.54,y:1.17,w:6,h:0.32,fontSize:10.5,bold:true,color:CW,fontFace:'Calibri',valign:'middle'});
    itens.slice(0, 6).forEach((item, i) => {
      const by = 1.55 + i * 0.87, bg = i % 2 === 0 ? 'F2F7FB' : CW;
      sl.addShape(pptx.ShapeType.rect, {x:0.3,y:by,w:6,h:0.82,fill:{color:bg},line:{color:'DDDDDD',width:0.5}});
      sl.addText(item.problema||'', {x:0.42,y:by+0.05,w:5.78,h:0.72,fontSize:10,color:CG,fontFace:'Calibri',wrap:true,valign:'middle'});
      sl.addShape(pptx.ShapeType.rect, {x:6.42,y:by,w:6.22,h:0.82,fill:{color:bg},line:{color:'DDDDDD',width:0.5}});
      sl.addText(item.solucao||'', {x:6.54,y:by+0.05,w:6,h:0.72,fontSize:10,color:CG,fontFace:'Calibri',wrap:true,valign:'middle'});
    });
  }
  function renderSlideFaq(sl, slide) {
    (slide.itens||[]).slice(0, 5).forEach((item, i) => {
      const by = 1.2 + i * 1.1;
      sl.addShape(pptx.ShapeType.roundRect, {x:0.35,y:by,w:12.35,h:1,fill:{color:'EEF4FA'},line:{color:CL,width:1},rectRadius:0.06});
      sl.addText(item.pergunta||'', {x:0.55,y:by+0.05,w:12.05,h:0.34,fontSize:11,bold:true,color:CA,fontFace:'Calibri',wrap:true});
      sl.addText(item.resposta||'', {x:0.55,y:by+0.42,w:12.05,h:0.5,fontSize:10.5,color:CG,fontFace:'Calibri',wrap:true});
    });
  }
  function renderSlideIndicadores(sl, slide, cor) {
    const source = indsProc.length > 0
      ? indsProc.slice(0, 8).map(k => ({
          label: k.enunciado || k.indicador || '',
          valor: [k.ciclo, k.meta ? 'Meta: ' + k.meta : ''].filter(Boolean).join(' | ') || '—'
        }))
      : (slide.itens || []).slice(0, 8);
    if (!source.length) {
      sl.addText('Nenhum indicador cadastrado para este processo.', {x:0.6,y:2.5,w:11.5,h:1,fontSize:13,color:'888888',fontFace:'Calibri',align:'center'});
      return;
    }
    const cols = source.length > 3 ? 2 : 1, perCol = Math.ceil(source.length / cols);
    source.forEach((d, i) => {
      const col = Math.floor(i / perCol), row = i % perCol;
      const bx = 0.4 + col * 6.45, by = 1.22 + row * 0.94;
      sl.addShape(pptx.ShapeType.roundRect, {x:bx,y:by,w:6.06,h:0.8,fill:{color:CW},line:{color:cor,width:1.2},rectRadius:0.06});
      sl.addText(d.label||'', {x:bx+0.15,y:by+0.05,w:5.78,h:0.28,fontSize:9,color:'888888',fontFace:'Calibri',wrap:true});
      sl.addText(d.valor||'—', {x:bx+0.15,y:by+0.36,w:5.78,h:0.36,fontSize:11,bold:true,color:cor,fontFace:'Calibri'});
    });
  }
  function renderSlideBullets(sl, slide, cor) {
    const bts = slide.bullets || [];
    if (slide.texto) {
      sl.addText(slide.texto, {x:0.55,y:1.22,w:11.5,h:5.4,fontSize:12.5,color:CG,fontFace:'Calibri',valign:'top',wrap:true,lineSpacingMultiple:1.4});
    } else {
      bts.slice(0, 7).forEach((b, i) => {
        const by = 1.22 + i * 0.77;
        sl.addShape(pptx.ShapeType.rect, {x:0.5,y:by+0.14,w:0.22,h:0.22,fill:{color:cor},line:{color:cor}});
        sl.addText(b, {x:0.88,y:by,w:11.5,h:0.68,fontSize:12.5,color:CG,fontFace:'Calibri',valign:'middle',wrap:true});
      });
    }
  }

  const slides = dados.slides || [];
  for (let idx = 0; idx < slides.length; idx++) {
    const slide = slides[idx];
    const tipo = slide.tipo || 'bullets';
    const cor = HCOLS[idx % HCOLS.length];
    const sl = pptx.addSlide();

    if (tipo === 'encerramento') {
      sl.background = {color:C1};
      sl.addShape(pptx.ShapeType.rect, {x:0,y:2.85,w:'100%',h:0.07,fill:{color:C2}});
      sl.addShape(pptx.ShapeType.rect, {x:0,y:6.6,w:'100%',h:0.9,fill:{color:'152C47'}});
      if (logoB64) sl.addImage({data:logoB64, x:8.85,y:0.3,w:3.6,h:0.98});
      sl.addText('Obrigado.', {x:0,y:0.9,w:'100%',h:0.9,fontSize:40,bold:true,color:CW,align:'center',fontFace:'Calibri'});
      sl.addText(slide.mensagem||'Processo mapeado e documentado pela EP·CAGE.', {x:0.8,y:3.12,w:11.7,h:0.7,fontSize:13,color:'A8C4D4',align:'center',fontFace:'Calibri',wrap:true});
      sl.addText(p.nome+' | '+now(), {x:0,y:3.95,w:'100%',h:0.38,fontSize:11,color:'7A9AB5',align:'center',fontFace:'Calibri'});
      sl.addText('EP·CAGE — Gestão de Processos Institucionais', {x:0,y:6.65,w:'100%',h:0.3,fontSize:10,color:'5A7A95',align:'center',fontFace:'Calibri'});
      continue;
    }

    sl.background = {color:C3};
    addHeader(sl, slide.titulo, cor);
    addFooter(sl, idx + 1);

    if (tipo === 'dados') {
      renderSlideDados(sl, slide, cor);
    } else if (tipo === 'sipoc') {
      renderSlideSipoc(sl, slide, cor);
    } else if (tipo === 'objetivo') {
      renderSlideObjetivo(sl, slide);
    } else if (tipo === 'bpmn_asis') {
      if (bpmnAsisPng) {
        sl.addImage({data:bpmnAsisPng, x:0.22,y:1.17,w:12.9,h:5.56, sizing:{type:'contain',w:12.9,h:5.56}});
      } else {
        sl.addText(slide.resumo || p.mod?.asIs || 'Diagrama AS IS não disponível.', {x:0.6,y:1.3,w:11.5,h:5.3,fontSize:12,color:CG,fontFace:'Calibri',valign:'top',wrap:true,lineSpacingMultiple:1.4});
      }
    } else if (tipo === 'bpmn_tobe') {
      if (bpmnTobePng) {
        sl.addImage({data:bpmnTobePng, x:0.22,y:1.17,w:12.9,h:5.56, sizing:{type:'contain',w:12.9,h:5.56}});
      } else {
        sl.addText(slide.resumo || p.mod?.toBe || 'Diagrama TO BE não disponível.', {x:0.6,y:1.3,w:11.5,h:5.3,fontSize:12,color:CG,fontFace:'Calibri',valign:'top',wrap:true,lineSpacingMultiple:1.4});
      }
    } else if (tipo === 'solucoes') {
      renderSlideSolucoes(sl, slide);
    } else if (tipo === 'faq') {
      renderSlideFaq(sl, slide);
    } else if (tipo === 'indicadores') {
      renderSlideIndicadores(sl, slide, cor);
    } else {
      renderSlideBullets(sl, slide, cor);
    }
  }

  const nomeArq = 'POP_' + p.nome.replaceAll(/[^a-zA-Z0-9]/g,'_').slice(0,38) + '_' + now().replaceAll('/','-');
  await pptx.writeFile({fileName: nomeArq + '.pptx'});
}
function salvarAuditoria(concluir){
  salvarRelatorioAuditoria(concluir);
}

async function iaGerarRelatorioAuditoria(){
  const p = curProc;
  if(!p?.auditoria){ toast('Nenhuma auditoria iniciada.','var(--amber)'); return; }
  const aud = p.auditoria;
  const btn = document.getElementById('aud-rel-btn');
  const el  = document.getElementById('aud-rel-result');
  if(btn) btn.disabled = true;

  const payload = JSON.stringify({
    processo: p.nome, area: p.area,
    objetivo: aud.objetivo||'', escopo: aud.escopo||'',
    equipe: aud.equipe||'', metodologia: aud.metodologia||'',
    criterios: aud.criterios||'',
    data_inicio: aud.data_inicio||'', data_fim: aud.data_fim||'',
    conformidade: document.getElementById('aud-conf')?.value || aud.conformidade || '',
    questoes: (aud.questoes||[]).map(q=>({questao:q.questao,criterio:q.criterio})),
    trilha: (aud.trilha||[]).map(t=>({tipo:t.tipo,data:t.data,responsavel:t.responsavel,descricao:t.descricao,objetivo:t.objetivo,evidencias:t.evidencias,conclusoes:t.conclusoes})),
    achados: (aud.achados_list||[]).map(a=>({tipo:a.tipo,titulo:a.titulo,desc:a.desc,evidencia:a.evidencia,criterio:a.criterio})),
    acoes: (aud.acoes_list||[]).map(a=>({acao:a.acao,responsavel:a.responsavel,prazo:a.prazo,status:a.status})),
  });

  const result = await chamarIA('relatorio_auditoria', payload, el);
  if(result){
    try {
      const json = JSON.parse(result.replace(/^```[a-z]*\n?/,'').replace(/```$/,'').trim());
      const conf = document.getElementById('aud-conf')?.value || aud.conformidade || '';
      const html = renderRelatorioAuditoria(json, conf, p, aud);
      p.auditoria.relatorio_html = html;
      el.textContent = 'Relatório gerado com sucesso. Utilize a visualização/exportação para consultar o conteúdo completo.';
    } catch {
      const html = `<div class="ai-result"><div class="ai-result-lbl">✦ Relatório</div><div style="white-space:pre-wrap;font-size:12px">${esc(result)}</div></div>`;
      el.innerHTML = html;
      p.auditoria.relatorio_html = '';
      p.auditoria.relatorio_texto = String(result||'');
    }
  }
  if(btn) btn.disabled = false;
}

function renderRelatorioAuditoria(json, conf, p, aud){
  const nc   = (aud.achados_list||[]).filter(a=>a.tipo==='Não conformidade').length;
  const obs  = (aud.achados_list||[]).filter(a=>a.tipo==='Observação'||a.tipo==='Ponto de melhoria').length;
  const confOk = conf==='Conforme';
  const confWarn = conf==='Conforme com ressalvas';
  let confColor,confBg;
  if(confOk){confColor='#16a34a';confBg='#dcfce7';}
  else if(confWarn){confColor='#d97706';confBg='#fef3c7';}
  else{confColor='#dc2626';confBg='#fee2e2';}

  const achadosHtml = (aud.achados_list||[]).map(a=>{
    let c;
    if(a.tipo==='Não conformidade')c='#dc2626';
    else if(a.tipo==='Conformidade')c='#16a34a';
    else c='#d97706';
    return `<div style="border-left:3px solid ${c};padding:.5rem .75rem;margin-bottom:.4rem;background:var(--surf2);border-radius:0 6px 6px 0">
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:2px">
        <span style="font-size:10px;font-weight:700;padding:1px 7px;border-radius:4px;background:${c}22;color:${c}">${esc(a.tipo)}</span>
        <strong style="font-size:12px">${esc(a.titulo)}</strong>
      </div>
      <div style="font-size:11.5px;color:var(--ink2)">${esc(a.desc)}</div>
      ${a.evidencia?`<div style="font-size:10px;color:var(--ink3);margin-top:2px">Evidência: ${esc(a.evidencia)}</div>`:''}
    </div>`;
  }).join('');

  const acoesHtml = (aud.acoes_list||[]).map(a=>{
    let sc;
    if(a.status==='Concluída') sc='#16a34a';
    else if(a.status==='Em andamento') sc='#d97706';
    else sc='#6b7280';
    return `<div style="display:flex;gap:8px;align-items:flex-start;padding:.4rem 0;border-bottom:1px solid var(--bdr)">
      <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:${sc}22;color:${sc};flex-shrink:0;margin-top:1px">${esc(a.status)}</span>
      <div style="flex:1"><div style="font-size:12px">${esc(a.acao)}</div><div style="font-size:10px;color:var(--ink3)">${esc(a.responsavel)} · ${esc(a.prazo)}</div></div>
    </div>`;
  }).join('');

  return `<div class="aud-report">
    <div class="aud-rep-header">
      <div>
        <div class="aud-rep-title">Relatório Executivo de Auditoria</div>
        <div class="aud-rep-sub">${esc(p.nome)} · ${esc(p.area)}</div>
        <div style="font-size:11px;color:rgba(255,255,255,.65);margin-top:3px">Emitido em ${now()}${aud.equipe?' · Equipe: '+esc(aud.equipe):''}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:10px;color:rgba(255,255,255,.7);margin-bottom:5px">Conformidade geral</div>
        <span class="aud-conf-badge" style="background:${confBg};color:${confColor}">${esc(conf)}</span>
      </div>
    </div>
    <div class="aud-rep-stats">
      <div class="aud-stat"><div class="aud-stat-n">${(aud.questoes||[]).length}</div><div class="aud-stat-l">Questões</div></div>
      <div class="aud-stat"><div class="aud-stat-n" style="color:#dc2626">${nc}</div><div class="aud-stat-l">Não conformidades</div></div>
      <div class="aud-stat"><div class="aud-stat-n" style="color:#d97706">${obs}</div><div class="aud-stat-l">Observações</div></div>
      <div class="aud-stat"><div class="aud-stat-n">${(aud.acoes_list||[]).length}</div><div class="aud-stat-l">Ações corretivas</div></div>
    </div>
    <div class="aud-rep-section">
      <div class="aud-rep-stitle">Sumário Executivo</div>
      <p class="aud-rep-p">${esc(json.sumario||'')}</p>
      ${json.conformidade_justificativa?`<p class="aud-rep-p" style="color:var(--ink3);font-style:italic">${esc(json.conformidade_justificativa)}</p>`:''}
    </div>
    ${json.achados_resumo?.length?`<div class="aud-rep-section">
      <div class="aud-rep-stitle">Principais Achados</div>
      <ul class="aud-rep-list">${json.achados_resumo.map(a=>`<li>${esc(a)}</li>`).join('')}</ul>
    </div>`:''}
    ${achadosHtml?`<div class="aud-rep-section">
      <div class="aud-rep-stitle">Achados Detalhados</div>${achadosHtml}
    </div>`:''}
    ${json.recomendacoes?.length?`<div class="aud-rep-section">
      <div class="aud-rep-stitle">Recomendações</div>
      <ul class="aud-rep-list">${json.recomendacoes.map(r=>`<li>${esc(r)}</li>`).join('')}</ul>
    </div>`:''}
    ${acoesHtml?`<div class="aud-rep-section">
      <div class="aud-rep-stitle">Ações Corretivas</div>${acoesHtml}
    </div>`:''}
    <div class="aud-rep-section">
      <div class="aud-rep-stitle">Conclusão</div>
      <p class="aud-rep-p">${esc(json.conclusao||'')}</p>
    </div>
  </div>`;
}
function salvarPlanejamentoAuditoria(){
  const p=curProc;if(!p)return;
  if(!p.auditoria)p.auditoria={};
  Object.assign(p.auditoria,{
    data_inicio:document.getElementById('aud-ini')?.value||'',
    data_fim:document.getElementById('aud-fim')?.value||'',
    objetivo:document.getElementById('aud-obj')?.value||'',
    escopo:document.getElementById('aud-escopo')?.value||'',
    equipe:document.getElementById('aud-equipe')?.value||'',
    criterios:document.getElementById('aud-crit')?.value||'',
    metodologia:document.getElementById('aud-metod')?.value||''
  });
  fbAutoSave('salvar');toast('Planejamento salvo!','var(--teal)');
}
function adicionarQuestaoAuditoria(){
  const p=curProc;if(!p)return;
  if(!p.auditoria)p.auditoria={};
  if(!p.auditoria.questoes)p.auditoria.questoes=[];
  const q={
    questao:document.getElementById('aud-q-texto')?.value||'',
    criterio:document.getElementById('aud-q-crit')?.value||'',
    responsavel:document.getElementById('aud-q-resp')?.value||'',
    resposta:'',criada_em:now()
  };
  if(!q.questao){toast('Informe a questão','var(--red)');return;}
  p.auditoria.questoes.push(q);
  fbAutoSave('salvar');toast('Questão adicionada!','var(--teal)');
  rDetalhe();
}

async function salvarQuestaoAuditoria(){
  const p=curProc;if(!p)return;
  if(!p.auditoria)p.auditoria={};
  if(!p.auditoria.questoes)p.auditoria.questoes=[];
  const texto=document.getElementById('aud-q-texto')?.value||'';
  const criterio=document.getElementById('aud-q-crit')?.value||'';
  const responsavel=document.getElementById('aud-q-resp')?.value||'';
  const idxStr=document.getElementById('aud-q-idx')?.value||'';
  if(!texto){toast('Informe a questão','var(--red)');return;}
  if(idxStr===''){
    p.auditoria.questoes.push({questao:texto,criterio,responsavel,resposta:'',criada_em:now()});
    toast('Questão adicionada!','var(--teal)');
  } else {
    const idx=Number.parseInt(idxStr);
    p.auditoria.questoes[idx]={...p.auditoria.questoes[idx],questao:texto,criterio,responsavel};
    toast('Questão atualizada!','var(--teal)');
  }
  await fbSaveAll();
  rDetalhe();
}

function editarQuestaoAuditoria(idx){
  const p=curProc;if(!p)return;
  const q=(p.auditoria?.questoes||[])[idx];if(!q)return;
  document.getElementById('aud-q-idx').value=idx;
  document.getElementById('aud-q-texto').value=q.questao||'';
  document.getElementById('aud-q-crit').value=q.criterio||'';
  document.getElementById('aud-q-resp').value=q.responsavel||'';
  document.getElementById('aud-q-form-title').textContent='Editar questão Q'+(idx+1);
  document.getElementById('aud-q-save-btn').textContent='Salvar alterações';
  document.getElementById('aud-q-cancel-btn').style.display='';
  document.getElementById('aud-q-texto').scrollIntoView({behavior:'smooth',block:'center'});
}

function cancelarEdicaoQuestao(){
  document.getElementById('aud-q-idx').value='';
  document.getElementById('aud-q-texto').value='';
  document.getElementById('aud-q-crit').value='';
  document.getElementById('aud-q-resp').value='';
  document.getElementById('aud-q-form-title').textContent='Adicionar questão de auditoria';
  document.getElementById('aud-q-save-btn').textContent='＋ Adicionar questão';
  document.getElementById('aud-q-cancel-btn').style.display='none';
}

async function excluirQuestaoAuditoria(idx){
  const p=curProc;if(!p)return;
  confirmar('Excluir esta questão?', async () => {
    p.auditoria.questoes.splice(idx,1);
    toast('Questão excluída','var(--amber)');
    rDetalhe();
    // Restore the Questões tab after rDetalhe resets it to Planejamento
    const aud2Tab = document.getElementById('tab-acao')?.querySelector('.tab[onclick*="aud2"]');
    if(aud2Tab) sstab('aud2', aud2Tab);
    await fbSaveAll();
  });
}

async function iaGerarQuestoesAuditoria(){
  const p=curProc;if(!p)return;
  const aud=p.auditoria||{};
  // Read from DOM (current form values) falling back to last-saved in-memory state
  const objetivo=(document.getElementById('aud-obj')?.value||'').trim()||aud.objetivo||'';
  const criterios=(document.getElementById('aud-crit')?.value||'').trim()||aud.criterios||'';
  if(!objetivo || !criterios){
    toast('Preencha o objetivo e os critérios da auditoria na aba Planejamento antes de gerar.','var(--amber)');return;
  }
  const targetEl=document.getElementById('aud-ia-questoes');
  const payload={
    processo: p.nome,
    area: p.area||'',
    objetivo_processo: p.objetivo||'',
    etapas: (p.mod?.etapas_proc||[]).map(e=>e.nome).join(', '),
    entradas: p.ent?.entradas||'',
    saidas: p.ent?.saidas||'',
    atores: p.ent?.atores||'',
    problemas: (p.ent?.prob||[]).join('; '),
    pop_objetivo: p.form?.pop?.obj||'',
    auditoria_objetivo: objetivo,
    auditoria_escopo: (document.getElementById('aud-escopo')?.value||'').trim()||aud.escopo||'',
    auditoria_criterios: criterios,
    auditoria_metodologia: (document.getElementById('aud-metod')?.value||'')||aud.metodologia||'',
  };
  const result=await chamarIA('gerar_questoes', payload, targetEl);
  if(!result)return;
  try{
    const clean=result.replaceAll(/```json|```/g,'').trim();
    const lista=JSON.parse(clean);
    if(!Array.isArray(lista))throw new Error('Formato inválido');
    if(!p.auditoria)p.auditoria={};
    if(!p.auditoria.questoes)p.auditoria.questoes=[];
    lista.forEach(item=>{
      if(item.questao) p.auditoria.questoes.push({
        questao:item.questao,
        criterio:item.criterio||'',
        responsavel:'',
        resposta:'',
        criada_em:now()
      });
    });
    fbSaveAll();
    toast(`${lista.length} questões geradas pela IA!`,'var(--teal)');
    rDetalhe();
  }catch(e){
  if(targetEl)targetEl.innerHTML=`<div class="ai-result"><div class="ai-result-lbl">⚠ Erro ao processar resposta da IA</div>${esc(e.message)}</div>`;
  }
}
function preencherApontamento(idx){
  const ap = APONTAMENTOS_PADRAO[idx];
  if(!ap) return;
  document.getElementById('aud-a-titulo').value = ap.a;
  document.getElementById('aud-a-desc').value = ap.c;
  document.getElementById('aud-a-tipo').value = 'Não conformidade';
  // Suggest the recommendation in the criteria field as a hint
  document.getElementById('aud-a-crit').value = ap.r;
  // Collapse picker, show form
  const picker = document.getElementById('aud-picker');
  const form = document.getElementById('aud-form');
  if(picker) picker.style.display='none';
  if(form) form.style.display='';
  document.getElementById('aud-a-titulo').focus();
}
function toggleAudPicker(){
  const picker = document.getElementById('aud-picker');
  const form = document.getElementById('aud-form');
  if(!picker||!form) return;
  if(picker.style.display === 'none'){
    picker.style.display = '';
  } else {
    picker.style.display = 'none';
    document.getElementById('aud-a-titulo').value='';
    document.getElementById('aud-a-desc').value='';
    document.getElementById('aud-a-crit').value='';
    document.getElementById('aud-a-tipo').value='Não conformidade';
  }
  form.style.display='';
}
function adicionarAchadoAuditoria(){
  const p=curProc;if(!p)return;
  if(!p.auditoria)p.auditoria={};
  if(!p.auditoria.achados_list)p.auditoria.achados_list=[];
  const a={
    titulo:document.getElementById('aud-a-titulo')?.value||'',
    tipo:document.getElementById('aud-a-tipo')?.value||'Não conformidade',
    descricao:document.getElementById('aud-a-desc')?.value||'',
    evidencia:document.getElementById('aud-a-evid')?.value||'',
    criterio:document.getElementById('aud-a-crit')?.value||'',
    data:now(),
    anexos:[]
  };
  if(!a.titulo){toast('Informe o título','var(--red)');return;}
  p.auditoria.achados_list.push(a);
  push(p,'auditoria','EP','Achado registrado: '+a.titulo+' ('+a.tipo+')');
  fbAutoSave('salvar');toast('Achado registrado!','var(--teal)');
  rDetalhe();
  const aud4Tab=document.getElementById('tab-acao')?.querySelector('.tab[onclick*="aud4"]');
  if(aud4Tab) sstab('aud4',aud4Tab);
}
function adicionarAcaoAuditoria(){
  const p=curProc;if(!p)return;
  if(!p.auditoria)p.auditoria={};
  if(!p.auditoria.acoes_list)p.auditoria.acoes_list=[];
  const a={
    acao:document.getElementById('aud-ac-acao')?.value||'',
    responsavel:document.getElementById('aud-ac-resp')?.value||'',
    prazo:document.getElementById('aud-ac-prazo')?.value||'',
    status:document.getElementById('aud-ac-status')?.value||'Pendente',
    achado:document.getElementById('aud-ac-achado')?.value||'',
    criada_em:now()
  };
  if(!a.acao){toast('Informe a ação','var(--red)');return;}
  p.auditoria.acoes_list.push(a);
  fbAutoSave('salvar');toast('Ação incluída!','var(--teal)');
  rDetalhe();
}
function adicionarProcedimentoAuditoria(){
  const p=curProc;if(!p)return;
  if(!p.auditoria)p.auditoria={};
  if(!p.auditoria.trilha)p.auditoria.trilha=[];
  const t={
    tipo:document.getElementById('aud-tr-tipo')?.value||'Outro',
    data:document.getElementById('aud-tr-data')?.value||'',
    responsavel:document.getElementById('aud-tr-resp')?.value||'',
    descricao:document.getElementById('aud-tr-desc')?.value||'',
    objetivo:document.getElementById('aud-tr-obj')?.value||'',
    evidencias:document.getElementById('aud-tr-evid')?.value||'',
    conclusoes:document.getElementById('aud-tr-concl')?.value||'',
    criado_em:now()
  };
  if(!t.descricao){toast('Informe o que foi feito','var(--red)');return;}
  p.auditoria.trilha.push(t);
  ['aud-tr-resp','aud-tr-desc','aud-tr-obj','aud-tr-evid','aud-tr-concl'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  fbAutoSave('salvar');
  toast('Procedimento registrado!','var(--teal)');
  rDetalhe();
  const aud3Tab=document.getElementById('tab-acao')?.querySelector('.tab[onclick*="aud3"]');
  if(aud3Tab) sstab('aud3',aud3Tab);
}
async function excluirProcedimentoAuditoria(idx){
  const p=curProc;if(!p)return;
  confirmar('Excluir este procedimento?', async () => {
    if(!p.auditoria?.trilha) return;
    p.auditoria.trilha.splice(idx,1);
    toast('Procedimento excluído','var(--amber)');
    rDetalhe();
    const aud3Tab=document.getElementById('tab-acao')?.querySelector('.tab[onclick*="aud3"]');
    if(aud3Tab) sstab('aud3',aud3Tab);
    await fbSaveAll();
  });
}
function toggleAnexoForm(idx){
  const el=document.getElementById('aud-anexo-form-'+idx);
  if(!el)return;
  const open=el.style.display==='flex';
  el.style.display=open?'none':'flex';
}
function adicionarLinkAchado(idx){
  const p=curProc;if(!p)return;
  const nome=(document.getElementById('aud-link-nome-'+idx)?.value||'').trim();
  const url=(document.getElementById('aud-link-url-'+idx)?.value||'').trim();
  if(!url){toast('Informe a URL do documento','var(--red)');return;}
  if(!url.startsWith('http')){toast('URL inválida','var(--red)');return;}
  const achado=p.auditoria?.achados_list?.[idx];
  if(!achado)return;
  if(!achado.anexos)achado.anexos=[];
  achado.anexos.push({tipo:'link',nome:nome||url,url});
  fbAutoSave('salvar');toast('Link adicionado!','var(--teal)');
  rDetalhe();
  const aud4Tab=document.getElementById('tab-acao')?.querySelector('.tab[onclick*="aud4"]');
  if(aud4Tab) sstab('aud4',aud4Tab);
}
async function uploadArquivoAchado(idx,input){
  const p=curProc;if(!p)return;
  const file=input?.files?.[0];if(!file)return;
  const achado=p.auditoria?.achados_list?.[idx];if(!achado)return;
  if(!achado.anexos)achado.anexos=[];
  const {storage,storageRef,uploadBytes,getDownloadURL}=globalThis._fb||{};
  if(!storage){toast('Armazenamento não disponível','var(--red)');return;}
  const path=`auditoria/${p.id||'sem-id'}/${Date.now()}_${file.name.replaceAll(/[^a-zA-Z0-9._-]/g,'_')}`;
  const ref=storageRef(storage,path);
  try{
    toast('Enviando arquivo…','var(--blue)');
    await uploadBytes(ref,file);
    const url=await getDownloadURL(ref);
    achado.anexos.push({tipo:'arquivo',nome:file.name,url,path});
    await fbSaveAll();
    toast('Arquivo enviado!','var(--teal)');
    rDetalhe();
    const aud4Tab=document.getElementById('tab-acao')?.querySelector('.tab[onclick*="aud4"]');
    if(aud4Tab) sstab('aud4',aud4Tab);
  }catch(e){
    console.error('upload erro',e);
    toast('Erro ao enviar arquivo: '+e.message,'var(--red)');
  }
}
async function removerAnexoAchado(achadoIdx,anexoIdx){
  const p=curProc;if(!p)return;
  confirmar('Remover este anexo?', async () => {
    const achado=p.auditoria?.achados_list?.[achadoIdx];if(!achado?.anexos)return;
    const anexo=achado.anexos[anexoIdx];
    if(anexo?.tipo==='arquivo'&&anexo.path){
      const {storage,storageRef,deleteObject}=globalThis._fb||{};
      if(storage&&anexo.path){
        try{await deleteObject(storageRef(storage,anexo.path));}catch(e){console.warn('delete storage err',e);}
      }
    }
    achado.anexos.splice(anexoIdx,1);
    toast('Anexo removido','var(--amber)');
    rDetalhe();
    const aud4Tab=document.getElementById('tab-acao')?.querySelector('.tab[onclick*="aud4"]');
    if(aud4Tab) sstab('aud4',aud4Tab);
    await fbSaveAll();
  });
}
function salvarRelatorioAuditoria(concluir){
  const p=curProc;if(!p)return;
  if(!p.auditoria)p.auditoria={};
  const conf = document.getElementById('aud-conf')?.value || p.auditoria.conformidade || '';
  Object.assign(p.auditoria,{conformidade:conf, data:now(), concluida:concluir});
  if(concluir)push(p,'auditoria','EP','Auditoria concluída. Conformidade: '+conf);
  fbAutoSave('salvar');toast(concluir?'Auditoria concluída!':'Relatório salvo!','var(--teal)');
  if(concluir){updCounts();rDetalhe();}
}
function visPopPreview(){
  const p=curProc;
  if(!p.form?.pop && !p.mod?.etapas_proc?.length){toast('Preencha o POP primeiro.','var(--amber)');return;}
  // Coleta estado atual do DOM sem avançar o workflow
  if(!p.form)p.form={};
  if(!p.form.pop)p.form.pop={};
  const prev=p.form.pop;
  ['pp-area','pp-ger','pp-mac','pp-obj','pp-def','pp-ent','pp-sai','pp-docs'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){const key=id.replaceAll('pp-','');prev[key]=el.value;}
  });
  const etapas=p.mod?.etapas_proc||[];
  const ativ_detalhes={...prev.ativ_detalhes};
  etapas.forEach((_,i)=>{
    const descEl=document.getElementById(`pop-at-desc-${i}`);
    if(!descEl)return;
    const pr=ativ_detalhes[i]||{};
    ativ_detalhes[i]={
      tipo:document.getElementById(`pop-at-tipo-${i}`)?.value||pr.tipo||'Atividade',
      desc:descEl.value||pr.desc||'',
      resp:document.getElementById(`pop-at-resp-${i}`)?.value||pr.resp||'',
    };
  });
  prev.ativ_detalhes=ativ_detalhes;
  stab('form',document.querySelectorAll('.tab')[3]);
  rForm(p);
}
function gerarAtivPop(etapas){
  if(!etapas||!etapas.length)return '';
  const grupos={};
  etapas.forEach(e=>{if(!grupos[e.executor]){grupos[e.executor]=[];} grupos[e.executor].push(e);});
  return Object.entries(grupos).map(([exec,ets])=>exec+'\n'+ets.map(e=>'- '+e.nome+(e.desc?' ('+e.desc+')':'')).join('\n')).join('\n\n');
}
function popAtivCards(p){
  const etapas=p.mod?.etapas_proc||[];
  const det=p.form?.pop?.ativ_detalhes||{};
  if(!etapas.length) return '<div class="ib iba">Nenhuma etapa cadastrada na modelagem. Complete a etapa "Detalhamento de etapas" primeiro.</div>';
  const TIPOS=['Atividade','Decisão','Observação','Evento'];
  const normTipo=t=>{if(t==='Decisao'||t==='Decisão'){return 'Decisão';}if(t==='Comentario'||t==='Observação'){return 'Observação';}return t||'Atividade';};
  const normModo=m=>{if(m==='Automatica'){return 'Automática';}if(m==='Semi-automatica'){return 'Semi-automática';}return m||'Manual';};
  const flat=etapas.map(e=>({nome:e.nome,tipo:normTipo(e.tipo),modo:normModo(e.modo),desc:e.desc||'',resp:e.executor||''}));
  return flat.map((e,i)=>{
    const d=det[i]||{};
    const tipo=normTipo(d.tipo)||e.tipo||'Atividade';
    const desc=(d.desc!==undefined&&d.desc!=='')?d.desc:(e.desc||e.nome||'');
    const resp=(d.resp!==undefined&&d.resp!=='')?d.resp:(e.resp||'');
    return `<div style="border:1px solid var(--bdr);border-left:3px solid var(--blue);border-radius:var(--r);padding:.7rem .9rem;margin-bottom:.6rem;background:var(--surf)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:.5rem">
        <span style="font-size:10px;font-weight:700;color:var(--ink3);background:var(--bg2);border-radius:4px;padding:1px 7px;flex-shrink:0">${i+1}</span>
        <strong style="font-size:13px;color:var(--ink)">${esc(e.nome||'(sem nome)')}</strong>
        <span style="font-size:10px;color:var(--ink3);background:var(--bg2);border-radius:4px;padding:1px 6px;margin-left:auto">${e.modo}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">
        <div class="fg"><label class="fl" style="font-size:10px">Tipo</label>
          <select class="fi" id="pop-at-tipo-${i}" style="font-size:12px">
            ${TIPOS.map(t=>`<option ${tipo===t?'selected':''}>${t}</option>`).join('')}
          </select></div>
        <div class="fg"><label class="fl" style="font-size:10px">Responsável</label>
          <input class="fi" id="pop-at-resp-${i}" value="${esc(resp)}" style="font-size:12px"></div>
        <div class="fg" style="grid-column:span 2"><label class="fl" style="font-size:10px">Descrição</label>
          <textarea class="fi" id="pop-at-desc-${i}" style="min-height:44px;font-size:12px">${esc(desc)}</textarea></div>
      </div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════
// ETAPAS DO PROCESSO
// ═══════════════════════════════════════════
const NATUREZAS=['Execucao','Comunicacao','Distribuicao','Preparacao','Revisao','Aprovacao'];
const _VERB_NAT={
  Execucao:['executar','realizar','fazer','elaborar','produzir','preencher','registrar','lançar','lancar','cadastrar','emitir','gerar','processar','calcular','conferir','verificar','analisar','apurar','consolidar','atualizar','ajustar','corrigir','providenciar','preparar','montar','organizar','coletar','compilar','redigir','formalizar','encaminhar'],
  Distribuicao:['distribuir','encaminhar','remeter','enviar','direcionar','transferir','atribuir','repassar','submeter','protocolar','despachar','alocar','delegar','disponibilizar','entregar','destinar','movimentar','expedir','transmitir','reencaminhar'],
  Preparacao:['preparar','planejar','organizar','estruturar','agendar','programar','definir','estabelecer','identificar','levantar','mapear','selecionar','separar','reunir','compilar','providenciar','configurar','parametrizar','instruir','iniciar','montar','ajustar','alinhar','dimensionar','prever'],
  Revisao:['revisar','analisar','examinar','avaliar','verificar','conferir','validar','criticar','inspecionar','auditar','comparar','checar','ratificar','retificar','corrigir','reexaminar','homologar','testar','controlar','monitorar'],
  Comunicacao:['comunicar','informar','notificar','avisar','orientar','solicitar','responder','esclarecer','reportar','relatar','registrar','divulgar','publicar','consultar','confirmar','alinhar','negociar','convocar','apresentar','cientificar'],
  Aprovacao:['aprovar','autorizar','validar','homologar','ratificar','deferir','indeferir','deliberar','decidir','confirmar','aceitar','rejeitar','vetar','chancelar','anuir','consentir','formalizar','referendar','admitir','sancionar'],
};
function inferNatureza(nome){
  if(!nome)return'';
  const verb=nome.trim().split(/\s+/)[0].toLowerCase()
    .normalize('NFD').replaceAll(/[\u0300-\u036f]/g,'')
    .replaceAll(/[^a-z]/g,'');
  for(const nat of NATUREZAS){
    if(_VERB_NAT[nat]?.includes(verb))return nat;
  }
  return'';
}
let etapasIdC=100;

function tipoCls(t,sub){
  if(t==='Atividade') return 'et-ativ';
  if(t==='Decisao')  return 'et-decisao';
  if(t==='Evento')   return sub==='Fim' ? 'et-evento-fim' : 'et-evento';
  return 'et-coment';
}

// Navigate a dot-path like "ep100.c0.a1.c0" into etapas_proc nested objects
function _resolvePathPart(obj, part){
  if(part[0]==='c') return obj.caminhos?.[Number.parseInt(part.slice(1))];
  if(part[0]==='a') return obj.acoes?.[Number.parseInt(part.slice(1))];
  return null;
}
function resolveGwPath(path){
  const parts=path.split('.');
  let obj=curProc.mod.etapas_proc.find(x=>x.id===parts[0]);
  for(let i=1;i<parts.length&&obj!=null;i++) obj=_resolvePathPart(obj,parts[i]);
  return obj??null;
}

function renderAcaoGw(camPath,ai,ac,depth){
  const acPath=`${camPath}.a${ai}`;
  const tipo=ac.tipo||'Atividade';
  const rootId=camPath.split('.')[0];
  const subtNone = ac.subtipo_evento ? '' : 'selected';
  const subtInicio = ac.subtipo_evento==='Início' ? 'selected' : '';
  const subtIntermediario = ac.subtipo_evento==='Intermediário' ? 'selected' : '';
  const subtFim = ac.subtipo_evento==='Fim' ? 'selected' : '';
  const modoManual = ac.modo==='Manual' ? 'selected' : '';
  const modoAuto = ac.modo==='Automatica' ? 'selected' : '';
  const modoSemi = ac.modo==='Semi-automatica' ? 'selected' : '';
  return `<div style="background:var(--surf);border:1px solid var(--bdr);border-radius:var(--r);padding:.55rem .75rem;margin-bottom:.4rem">
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:.35rem">
      <span class="etapa-tipo ${tipoCls(tipo)}" style="font-size:10px">${tipo}</span>
      <input class="fi" style="flex:1;font-size:12px" placeholder="Nome da ação" value="${(ac.nome||'').replaceAll('"','&quot;')}"
        oninput="(function(v){const _a=resolveGwPath('${camPath}').acoes[${ai}];_a.nome=v;if(_a.tipo==='Atividade'&&!_a.natureza){const inf=inferNatureza(v);if(inf){_a.natureza=inf;reRenderGw('${rootId}');}};})(this.value)">
      <button type="button" class="btn" style="font-size:10px;padding:2px 6px;color:var(--red);border-color:var(--red-b)"
        onclick="remAcaoGw('${camPath}',${ai});reRenderGw('${rootId}')">×</button>
    </div>
    <div class="g2" style="margin-bottom:.35rem">
      <div class="fg"><label class="fl" style="font-size:10px">Tipo</label>
        <select class="fi" style="font-size:12px"
          onchange="resolveGwPath('${camPath}').acoes[${ai}].tipo=this.value;reRenderGw('${rootId}')">
          <option ${tipo==='Atividade'?'selected':''}>Atividade</option>
          <option ${tipo==='Evento'?'selected':''}>Evento</option>
          <option ${tipo==='Decisao'?'selected':''}>Decisao</option>
          <option ${tipo==='Comentario'?'selected':''}>Comentario</option>
        </select>
      </div>
      ${tipo==='Evento'?`<div class="fg"><label class="fl" style="font-size:10px">Subtipo do evento</label>
        <select class="fi" style="font-size:12px" onchange="resolveGwPath('${camPath}').acoes[${ai}].subtipo_evento=this.value">
          <option value="" ${subtNone}>Selecione...</option>
          <option ${subtInicio}>Início</option>
          <option ${subtIntermediario}>Intermediário</option>
          <option ${subtFim}>Fim</option>
        </select></div>`:''}
    </div>
    ${tipo==='Atividade'?`<div class="g3" style="margin-bottom:.35rem">
      <div class="fg"><label class="fl" style="font-size:10px">Natureza</label>
        <select class="fi" style="font-size:12px" onchange="resolveGwPath('${camPath}').acoes[${ai}].natureza=this.value">
          <option value="">Selecione...</option>
          ${NATUREZAS.map(n=>`<option ${ac.natureza===n?'selected':''}>${n}</option>`).join('')}
        </select>
      </div>
      <div class="fg"><label class="fl" style="font-size:10px">Modo</label>
        <select class="fi" style="font-size:12px" onchange="resolveGwPath('${camPath}').acoes[${ai}].modo=this.value">
          <option ${modoManual}>Manual</option>
          <option ${modoAuto}>Automatica</option>
          <option ${modoSemi}>Semi-automatica</option>
        </select>
      </div>
      <div class="fg"><label class="fl" style="font-size:10px">Executor</label>
        <input class="fi" style="font-size:12px" value="${(ac.executor||'').replaceAll('"','&quot;')}"
          oninput="resolveGwPath('${camPath}').acoes[${ai}].executor=this.value">
      </div>
    </div>`:''}
    ${tipo==='Decisao'?renderGatewaySection(acPath,depth+1):''}
    <div class="fg"><label class="fl" style="font-size:10px">Descrição</label>
      <textarea class="fi" style="min-height:40px;font-size:12px"
        oninput="resolveGwPath('${camPath}').acoes[${ai}].desc=this.value">${ac.desc||''}</textarea>
    </div>
  </div>`;
}

function renderCaminhoGw(parentPath,ci,cam,depth){
  const camPath=`${parentPath}.c${ci}`;
  const rootId=parentPath.split('.')[0];
  const acoes=cam.acoes||[];
  return `<div style="border-left:3px solid var(--amber);padding:.5rem .75rem;margin-bottom:.5rem;background:var(--bg2);border-radius:0 6px 6px 0">
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:.4rem">
      <input class="fi" style="flex:1;font-size:12px" placeholder="Rótulo do caminho (ex: Sim, Não, Aprovado)"
        value="${(cam.label||'').replaceAll('"','&quot;')}"
        oninput="resolveGwPath('${parentPath}').caminhos[${ci}].label=this.value">
      <button type="button" class="btn" style="font-size:10px;padding:2px 6px;color:var(--red);border-color:var(--red-b)"
        onclick="remCaminhoGw('${parentPath}',${ci});reRenderGw('${rootId}')">×</button>
    </div>
    <div style="padding-left:4px">${acoes.map((ac,ai)=>renderAcaoGw(camPath,ai,ac,depth)).join('')}</div>
    <button type="button" class="btn" style="font-size:11px;margin-top:.3rem"
      onclick="addAcaoGw('${camPath}');reRenderGw('${rootId}')">+ Ação neste caminho</button>
  </div>`;
}

function renderGatewaySection(path,depth=0){
  const obj=resolveGwPath(path);
  if(!obj)return '';
  if(!obj.caminhos)obj.caminhos=[];
  const ml=depth>0?`margin-left:${depth*10}px;`:'';
  return `<div style="${ml}margin-top:.75rem;border-top:1px dashed var(--amber);padding-top:.6rem">
    <div style="font-size:11px;font-weight:700;color:var(--amber);margin-bottom:.5rem">🔀 Caminhos do gateway</div>
    ${obj.caminhos.map((cam,ci)=>renderCaminhoGw(path,ci,cam,depth)).join('')}
    <button type="button" class="btn" style="font-size:11px" onclick="addCaminhoGw('${path}');reRenderGw('${path.split('.')[0]}')">+ Caminho</button>
  </div>`;
}

function _renderEtapaAtividadeFields(e, id){
  if(e.tipo !== 'Atividade') return '';
  return `<div class="g3" style="margin-top:.4rem">
    <div class="fg"><label class="fl">Natureza</label>
      <select class="fi" onchange="curProc.mod.etapas_proc.find(x=>x.id==='${id}').natureza=this.value">
        <option value="">Selecione...</option>
        ${NATUREZAS.map(n=>`<option ${e.natureza===n?'selected':''}>${n}</option>`).join('')}
      </select>
    </div>
    <div class="fg"><label class="fl">Modo</label>
      <select class="fi" onchange="curProc.mod.etapas_proc.find(x=>x.id==='${id}').modo=this.value">
        <option ${e.modo==='Manual'?'selected':''}>Manual</option>
        <option ${e.modo==='Automatica'?'selected':''}>Automatica</option>
        <option ${e.modo==='Semi-automatica'?'selected':''}>Semi-automatica</option>
      </select>
    </div>
    <div class="fg"><label class="fl">Executor</label>
      <input class="fi" value="${(e.executor||'').replaceAll('"','&quot;')}"
        oninput="curProc.mod.etapas_proc.find(x=>x.id==='${id}').executor=this.value">
    </div>
  </div>`;
}
function _renderEtapaEventoFields(e, id){
  if(e.tipo !== 'Evento') return '';
  return `<div class="fg" style="margin-top:.4rem"><label class="fl">Subtipo do evento</label>
    <select class="fi" onchange="(function(s){const _e=curProc.mod.etapas_proc.find(x=>x.id==='${id}');_e.subtipo_evento=s.value||null;const _b=document.querySelector('#ep-${id} .etapa-tipo');if(_b){_b.className='etapa-tipo '+tipoCls('Evento',s.value||null);_b.textContent='Evento'+(_e.subtipo_evento?' · '+_e.subtipo_evento:'');}})(this)">
      <option value="" ${e.subtipo_evento?'':'selected'}>Selecione...</option>
      <option ${e.subtipo_evento==='Início'?'selected':''}>Início</option>
      <option ${e.subtipo_evento==='Intermediário'?'selected':''}>Intermediário</option>
      <option ${e.subtipo_evento==='Fim'?'selected':''}>Fim</option>
    </select>
  </div>`;
}
function exportarEtapasAsIsXlsx(){
  if(!curProc){ toast('Nenhum processo selecionado.','var(--amber)'); return; }
  const etapas = curProc.mod?.etapas_proc||[];
  if(!etapas.length){ toast('Nenhuma etapa cadastrada.','var(--amber)'); return; }

  const rows = [];
  rows.push(['Seq','Nome','Tipo','Subtipo/Evento','Natureza','Modo de execução','Executor','Descrição detalhada']);

  function flatEtapa(e, prefixSeq){
    const seq = prefixSeq === undefined ? (e.seq||'') : prefixSeq;
    rows.push([
      seq,
      e.nome||'',
      e.tipo||'',
      e.subtipo_evento||'',
      e.tipo==='Atividade'?(e.natureza||''):'',
      e.tipo==='Atividade'?(e.modo||'Manual'):'',
      e.tipo==='Atividade'?(e.executor||''):'',
      e.desc||'',
    ]);
    if(e.tipo==='Decisao'&&e.caminhos&&e.caminhos.length){
      e.caminhos.forEach((cam,ci)=>{
        rows.push(['',' → '+(cam.label||'Caminho '+(ci+1)),'→ Caminho','','','','','']);
        (cam.acoes||[]).forEach((a,ai)=>{
          flatEtapa(a, '  '+(ai+1));
        });
      });
    }
  }
  etapas.forEach(e=>flatEtapa(e));

  const ws = XLSX.utils.aoa_to_sheet(rows);
  // Header style (bold) - column widths
  ws['!cols'] = [{wch:6},{wch:35},{wch:14},{wch:18},{wch:18},{wch:18},{wch:22},{wch:50}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'AS IS');
  const nome = (curProc.nome||'processo').replaceAll(/\s+/g,'_').slice(0,40);
  XLSX.writeFile(wb, nome+'_etapas_asis.xlsx');
  toast('Planilha exportada com sucesso.');
}

function renderEtapaDetalheConteudo(e){
  const id=e.id;
  return `<div class="g2" style="margin-top:.6rem">
    <div class="fg"><label class="fl">Nome da etapa</label>
      <input class="fi" value="${(e.nome||'').replaceAll('"','&quot;')}"
        oninput="(function(v){const _e=curProc.mod.etapas_proc.find(x=>x.id==='${id}');_e.nome=v;document.querySelector('#ep-${id} .etapa-nome').textContent=v;if(_e.tipo==='Atividade'&&!_e.natureza){const inf=inferNatureza(v);if(inf){_e.natureza=inf;reRenderEtapaDetalhe('${id}');}}clearTimeout(globalThis._mmT);globalThis._mmT=setTimeout(atualizarMermaid,600);})(this.value)"
      >
    <div class="fg"><label class="fl">Tipo</label>
      <select class="fi" onchange="(function(s){const _e=curProc.mod.etapas_proc.find(x=>x.id==='${id}');_e.tipo=s.value;_e.subtipo_evento=null;const _b=document.querySelector('#ep-${id} .etapa-tipo');_b.className='etapa-tipo '+tipoCls(s.value,null);_b.textContent=s.value;reRenderEtapaDetalhe('${id}')})(this)">
        <option ${e.tipo==='Atividade'?'selected':''}>Atividade</option>
        <option ${e.tipo==='Evento'?'selected':''}>Evento</option>
        <option ${e.tipo==='Decisao'?'selected':''}>Decisao</option>
        <option ${e.tipo==='Comentario'?'selected':''}>Comentario</option>
      </select>
    </div>
  </div>
  ${_renderEtapaAtividadeFields(e, id)}
  ${_renderEtapaEventoFields(e, id)}
  ${e.tipo==='Decisao'?`<div id="gw-${id}">${renderGatewaySection(id,0)}</div>`:''}
  <div class="fg" style="margin-top:.4rem"><label class="fl">Descrição detalhada</label>
    <textarea class="fi" style="min-height:60px"
      oninput="curProc.mod.etapas_proc.find(x=>x.id==='${id}').desc=this.value">${e.desc||''}</textarea>
  </div>
  <div style="margin-top:.6rem">
    <button type="button" class="btn btn-p" style="font-size:11px;padding:4px 12px" onclick="salvarEtapa('${id}')">✓ Salvar etapa</button>
  </div>`;
}

function salvarEtapa(id){
  toggleEtapaDetalhe(id); // collapse the panel
  atualizarMermaid();
  fbAutoSave('salvarEtapa');
  toast('Etapa salva');
}

function renderEtapasProc(etapas){
  if(!etapas||!etapas.length)return '<div class="ib ibsl">Nenhuma etapa adicionada. Extraia do BPMN ou adicione manualmente.</div>';
  return etapas.map((e)=>`
    <div class="etapa-proc" id="ep-${e.id}" draggable="true"
      ondragstart="onEtapaDragStart(event,'${e.id}')"
      ondragend="onEtapaDragEnd(event,'${e.id}')"
      ondragover="onEtapaDragOver(event,'${e.id}')"
      ondrop="onEtapaDrop(event,'${e.id}')">
      <div class="etapa-proc-hd">
        <span class="etapa-drag-handle" title="Arrastar para reordenar">⠿</span>
        <div class="etapa-seq">${e.seq}</div>
        <span class="etapa-tipo ${tipoCls(e.tipo,e.subtipo_evento)}">${e.tipo}${e.subtipo_evento?' · '+e.subtipo_evento:''}</span>
        <div class="etapa-nome">${e.nome}</div>
        <button type="button" class="btn" style="font-size:11px;padding:3px 8px" onclick="toggleEtapaDetalhe('${e.id}')">✎ Detalhar</button>
        <button type="button" class="btn" style="font-size:11px;padding:3px 8px;color:var(--red);border-color:var(--red-b)" onclick="remEtapaProc('${e.id}')" aria-label="Remover etapa">×</button>
      </div>
      <div id="ed-${e.id}" style="display:none">${renderEtapaDetalheConteudo(e)}</div>
    </div>`).join('');
}

function reRenderEtapaDetalhe(etapaId){
  const el=document.getElementById('ed-'+etapaId);
  const e=curProc.mod.etapas_proc.find(x=>x.id===etapaId);
  if(el&&e){ el.innerHTML=renderEtapaDetalheConteudo(e); atualizarMermaid(); }
}
function reRenderGw(etapaId){
  const el=document.getElementById('gw-'+etapaId);
  const e=curProc.mod.etapas_proc.find(x=>x.id===etapaId);
  if(el&&e){ el.innerHTML=renderGatewaySection(etapaId,0); atualizarMermaid(); }
}
function addCaminhoGw(path){
  const obj=resolveGwPath(path);
  if(!obj)return;
  if(!obj.caminhos)obj.caminhos=[];
  obj.caminhos.push({label:'',acoes:[]});
}
function remCaminhoGw(path,ci){
  const obj=resolveGwPath(path);
  if(!obj?.caminhos)return;
  confirmar('Remover este caminho e todas as suas ações?', () => { obj.caminhos.splice(ci,1); });
}
function addAcaoGw(camPath){
  const cam=resolveGwPath(camPath);
  if(!cam)return;
  if(!cam.acoes)cam.acoes=[];
  cam.acoes.push({nome:'',tipo:'Atividade',natureza:'',modo:'Manual',executor:'',desc:'',subtipo_evento:null,caminhos:[]});
}
function remAcaoGw(camPath,ai){
  const cam=resolveGwPath(camPath);
  if(!cam?.acoes)return;
  cam.acoes.splice(ai,1);
}

// ── MERMAID LIVE PREVIEW ─────────────────────
let _mermaidCode = '';

function etapasToMermaid(etapas){
  if(!etapas||!etapas.length) return '';
  const safe = s => (s||'sem nome').replaceAll(/["'<>&[\]{}()]/g,' ').replaceAll(/\s+/g,' ').trim().slice(0,45);
  let lines = ['flowchart TD'];
  let nodeId = 0;
  const getId = () => 'N'+(nodeId++);

  function pushNodeShape(id, e, lbl){
    if(e.tipo==='Evento'){
      const sub = e.subtipo_evento||'';
      if(sub==='Início') lines.push(`  ${id}([▶ ${lbl}])`);
      else if(sub==='Fim') lines.push(`  ${id}([■ ${lbl}])`);
      else lines.push(`  ${id}((${lbl}))`);
      lines.push(`  style ${id} fill:#d1fae5,stroke:#16a34a,color:#14532d`);
    } else if(e.tipo==='Decisao'){
      lines.push(`  ${id}{${lbl}}`, `  style ${id} fill:#fef3c7,stroke:#d97706,color:#78350f`);
    } else if(e.tipo==='Comentario'){
      lines.push(`  ${id}[/${lbl}/]`, `  style ${id} fill:#f3f4f6,stroke:#d1d5db,color:#6b7280`);
    } else {
      lines.push(`  ${id}[${lbl}]`, `  style ${id} fill:#dbeafe,stroke:#2563eb,color:#1e3a5f`);
    }
  }
  function pushGatewayCaminhos(id, e){
    const mergeId = getId();
    lines.push(`  ${mergeId}[ ]`, `  style ${mergeId} fill:transparent,stroke:transparent`);
    e.caminhos.forEach(cam=>{
      const clbl = safe(cam.label||'');
      const acoes = cam.acoes||[];
      if(acoes.length){
        const firstId = 'N'+nodeId;
        buildNodes(acoes, null);
        const lastId = 'N'+(nodeId-1);
        lines.push(`  ${id} -->|${clbl}| ${firstId}`, `  ${lastId} --> ${mergeId}`);
      } else {
        const emptyId = getId();
        lines.push(`  ${emptyId}[ ]`, `  style ${emptyId} fill:transparent,stroke:transparent`, `  ${id} -->|${clbl}| ${emptyId}`, `  ${emptyId} --> ${mergeId}`);
      }
    });
    return mergeId;
  }
  function buildNodes(items, parentEndId){
    let prevId = parentEndId;
    items.forEach(e => {
      const id = getId();
      const lbl = safe(e.nome);
      pushNodeShape(id, e, lbl);
      if(prevId!==null) lines.push(`  ${prevId} --> ${id}`);
      if(e.tipo==='Decisao' && e.caminhos && e.caminhos.length){
        prevId = pushGatewayCaminhos(id, e);
        return;
      }
      prevId = id;
    });
    return prevId;
  }

  buildNodes(etapas, null);
  return lines.join('\n');
}

async function atualizarMermaid(){
  const el = document.getElementById('mermaid-preview');
  if(!el) return;
  const etapas = curProc?.mod?.etapas_proc||[];
  if(!etapas.length){
    el.innerHTML = '<div style="font-size:11px;color:var(--ink3);text-align:center;padding:1rem">Adicione etapas para visualizar o fluxo</div>';
    return;
  }
  _mermaidCode = etapasToMermaid(etapas);
  try {
    if(typeof mermaid === 'undefined') return;
    mermaid.initialize({startOnLoad:false, theme:'base',
      themeVariables:{primaryColor:'#e8f0fe',primaryBorderColor:'#4285f4',fontSize:'12px'}});
    const uid = 'mm-'+Date.now();
    const {svg} = await mermaid.render(uid, _mermaidCode);
    el.innerHTML = svg;
  } catch {
    el.innerHTML = `<pre style="font-size:10px;color:var(--red);white-space:pre-wrap;word-break:break-all">${esc(_mermaidCode)}</pre>`;
  }
}

// copiarMermaid removida (dead code — botão removido, não há chamador)

function toggleEtapaDetalhe(id){
  const el=document.getElementById('ed-'+id);
  if(el)el.style.display=el.style.display==='none'?'block':'none';
}
function remEtapaProc(id){
  if(!curProc?.mod?.etapas_proc)return;
  curProc.mod.etapas_proc=curProc.mod.etapas_proc.filter(e=>e.id!==id);
  curProc.mod.etapas_proc.forEach((e,i)=>e.seq=i+1);
  document.getElementById('etapas-proc-list').innerHTML=renderEtapasProc(curProc.mod.etapas_proc);
  atualizarMermaid();
}

// ── DRAG-AND-DROP REORDERING ─────────────────
let _dragSrcId = null;
function onEtapaDragStart(e, id){
  _dragSrcId = id;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', id); // required for Firefox
  setTimeout(()=>{ e.currentTarget.style.opacity='0.4'; }, 0);
}
function onEtapaDragEnd(e, id){
  e.currentTarget.style.opacity='';
  document.querySelectorAll('.etapa-proc').forEach(el=>el.classList.remove('drag-over'));
  _dragSrcId = null;
}
function onEtapaDragOver(e, id){
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = 'move';
  if(id !== _dragSrcId){
    document.querySelectorAll('.etapa-proc').forEach(el=>el.classList.remove('drag-over'));
    e.currentTarget.classList.add('drag-over');
  }
}
function onEtapaDrop(e, id){
  e.preventDefault(); e.stopPropagation();
  const srcId = _dragSrcId;
  if(!srcId || srcId === id) return;
  const etapas = curProc.mod.etapas_proc;
  const srcIdx = etapas.findIndex(x=>x.id===srcId);
  const tgtIdx = etapas.findIndex(x=>x.id===id);
  if(srcIdx<0||tgtIdx<0) return;
  const [moved] = etapas.splice(srcIdx, 1);
  etapas.splice(tgtIdx, 0, moved);
  etapas.forEach((et,i)=>et.seq=i+1);
  document.getElementById('etapas-proc-list').innerHTML = renderEtapasProc(etapas);
  atualizarMermaid();
  fbAutoSave('reordenarEtapas');
}
function addEtapaProc(){
  if(!curProc?.mod)return;
  if(!curProc.mod.etapas_proc)curProc.mod.etapas_proc=[];
  const seq=(curProc.mod.etapas_proc.length||0)+1;
  const nova={id:'ep'+etapasIdC++,seq,nome:'Nova etapa '+seq,tipo:'Atividade',natureza:'Execucao',modo:'Manual',executor:'',desc:'',subtipo_evento:null,caminhos:[]};
  curProc.mod.etapas_proc.push(nova);
  document.getElementById('etapas-proc-list').innerHTML=renderEtapasProc(curProc.mod.etapas_proc);
  setTimeout(()=>{ toggleEtapaDetalhe(nova.id); atualizarMermaid(); },50);
}
function _bpmnNodeType(tag, GW_TAGS, TASK_TAGS){
  if(tag==='startevent')    return {tipo:'Evento', subtipo:'Início', natureza:null, modo:null, desc:'Evento de início do processo'};
  if(tag==='endevent')      return {tipo:'Evento', subtipo:'Fim',    natureza:null, modo:null, desc:'Evento de fim do processo'};
  if(tag==='intermediatethrowevent'||tag==='intermediatecatchevent')
                            return {tipo:'Evento', subtipo:'Intermediário', natureza:null, modo:null, desc:''};
  if(tag==='exclusivegateway') return {tipo:'Decisao', subtipo_gateway:'exclusivo', natureza:null, modo:null, desc:''};
  if(tag==='parallelgateway')  return {tipo:'Decisao', subtipo_gateway:'paralelo',  natureza:null, modo:null, desc:''};
  if(tag==='inclusivegateway') return {tipo:'Decisao', subtipo_gateway:'inclusivo', natureza:null, modo:null, desc:''};
  if(tag==='complexgateway')   return {tipo:'Decisao', subtipo_gateway:'complexo',  natureza:null, modo:null, desc:''};
  if(GW_TAGS.has(tag))         return {tipo:'Decisao', subtipo_gateway:null,        natureza:null, modo:null, desc:''};
  if(TASK_TAGS.has(tag))    return {tipo:'Atividade', subtipo:null,
    natureza: tag==='sendtask'?'Comunicacao':null,
    modo:     tag==='servicetask'||tag==='scripttask'?'Automatica':'Manual', desc:''};
  return null;
}
function _bpmnFindAll(xml, localNames){
  const set=new Set(localNames.map(n=>n.toLowerCase()));
  return Array.from(xml.getElementsByTagName('*')).filter(e=>set.has(e.localName.toLowerCase()));
}
function _bpmnBuildLaneMap(xml){
  const laneMap={};
  _bpmnFindAll(xml,['lane']).forEach(lane=>{
    const nome=lane.getAttribute('name')||'';
    if(nome) Array.from(lane.getElementsByTagName('*')).filter(e=>e.localName.toLowerCase()==='flownoderef').forEach(ref=>{laneMap[ref.textContent.trim()]=nome;});
  });
  return laneMap;
}
function _bpmnBuildNodeInfo(xml, GW_TAGS, TASK_TAGS, laneMap){
  const nodeInfo={};
  const tags=[
    'startEvent','endEvent','intermediateThrowEvent','intermediateCatchEvent',
    'task','userTask','serviceTask','sendTask','receiveTask','manualTask','scriptTask',
    'exclusiveGateway','inclusiveGateway','parallelGateway','complexGateway'
  ];
  _bpmnFindAll(xml, tags).forEach(e=>{
    const tag=e.localName.toLowerCase();
    const typeInfo = _bpmnNodeType(tag, GW_TAGS, TASK_TAGS);
    if(!typeInfo) return;
    nodeInfo[e.id]={xmlId:e.id, nome:e.getAttribute('name')||'', executor:laneMap[e.id]||'', ...typeInfo};
  });
  return nodeInfo;
}
function _bpmnBuildOutgoing(xml){
  const outgoing={};
  _bpmnFindAll(xml,['sequenceFlow']).forEach(sf=>{
    const src=sf.getAttribute('sourceRef'), tgt=sf.getAttribute('targetRef');
    if(src&&tgt){ if(!outgoing[src]){ outgoing[src]=[]; } outgoing[src].push(tgt); }
  });
  return outgoing;
}
function _bpmnBfsOrder(xml, outgoing, nodeInfo){
  const startIds=[];
  _bpmnFindAll(xml,['startEvent']).forEach(e=>startIds.push(e.id));
  const visited=new Set();
  const ordered=[];
  const queue=[...startIds];
  while(queue.length){
    const id=queue.shift();
    if(visited.has(id)) continue;
    visited.add(id);
    if(nodeInfo[id]) ordered.push(nodeInfo[id]);
    (outgoing[id]||[]).forEach(tgt=>{if(!visited.has(tgt)) queue.push(tgt);});
  }
  Object.values(nodeInfo).forEach(n=>{if(!visited.has(n.xmlId)) ordered.push(n);});
  return ordered;
}
function extrairBpmn(){
  const p=curProc;
  const isTobe=p.etapa==='det_valid_tobe';
  const bpmnXml=isTobe?p.mod?.bpmnToBe:p.mod?.bpmnAsIs;
  if(!bpmnXml){
    toast('Nenhum fluxo BPMN '+(isTobe?'TO BE':'AS IS')+' salvo. Salve o BPMN na aba de Esboço primeiro.','var(--amber)');
    return;
  }
  const xml=new DOMParser().parseFromString(bpmnXml,'text/xml');
  const TASK_TAGS=new Set(['task','usertask','servicetask','sendtask','receivetask','manualtask','scripttask']);
  const GW_TAGS=new Set(['exclusivegateway','inclusivegateway','parallelgateway','complexgateway']);

  const laneMap  = _bpmnBuildLaneMap(xml);
  const nodeInfo = _bpmnBuildNodeInfo(xml, GW_TAGS, TASK_TAGS, laneMap);
  const outgoing = _bpmnBuildOutgoing(xml);
  const ordered  = _bpmnBfsOrder(xml, outgoing, nodeInfo);

  if(!ordered.length){toast('Nenhum elemento encontrado no BPMN. Desenhe o fluxo primeiro.','var(--amber)');return;}

  let seq=1;
  const elems=ordered.map(n=>{
    let nomeFallback;
    if(n.tipo==='Evento') nomeFallback = n.subtipo||'Evento';
    else if(n.tipo==='Decisao') nomeFallback = 'Decisão';
    else nomeFallback = 'Atividade';
    return {
      id:'ep'+etapasIdC++, seq:seq++,
      nome:n.nome||nomeFallback,
      tipo:n.tipo, subtipo_evento:n.subtipo||null,
      natureza:n.natureza||(n.tipo==='Atividade'?inferNatureza(n.nome||''):''), modo:n.modo,
      executor:n.executor, desc:n.desc||'', caminhos:[]
    };
  });

  if(!p.mod.etapas_proc) p.mod.etapas_proc=[];
  const existentes=new Set(p.mod.etapas_proc.map(e=>e.nome));
  const novas=elems.filter(e=>!existentes.has(e.nome));
  p.mod.etapas_proc=[...p.mod.etapas_proc,...novas];
  p.mod.etapas_proc.forEach((e,i)=>e.seq=i+1);
  document.getElementById('etapas-proc-list').innerHTML=renderEtapasProc(p.mod.etapas_proc);
  atualizarMermaid();
  toast(novas.length+' etapas extraídas do BPMN na ordem do fluxo!');
}

// ═══════════════════════════════════════════
// ABAS SECUNDÁRIAS DO DETALHE
// ═══════════════════════════════════════════
const ML=['','Inicial','Repetível','Definido','Gerenciado','Otimizado'];
// ── Índice Lean Processual ─────────────────
// ILP = (E + P + 0.5*(C+D)) / (Total + α*GxorDiv + β*(Atores-1)) * 100
// α=1: cada exclusive gateway divergente equivale a 1 atividade improdutiva
// β=0.5: cada ator extra além do primeiro equivale a 0.5
function calcILP(etapas){
  if(!etapas||!etapas.length)return null;
  // Flatten: conta atividades em todos os níveis (etapas raiz + acoes em gateways)
  function flatAcoes(nodes){
    const out=[];
    for(const n of nodes){
      out.push(n);
      for(const cam of (n.caminhos||[])){
        out.push(...flatAcoes(cam.acoes||[]));
      }
    }
    return out;
  }
  const all=flatAcoes(etapas);
  const atividades=all.filter(n=>n.tipo==='Atividade');
  const total=atividades.length;
  if(!total)return null;
  const cnt=nat=>atividades.filter(n=>n.natureza===nat).length;
  const E=cnt('Execucao'), P=cnt('Preparacao'), C=cnt('Comunicacao'), D=cnt('Distribuicao');
  // Exclusive diverging gateways: tipo Decisao, subtipo_gateway exclusivo, mais de 1 caminho de saída
  const gxorDiv=all.filter(n=>n.tipo==='Decisao'&&n.subtipo_gateway==='exclusivo'&&(n.caminhos||[]).length>1).length;
  // Atores distintos (executores não vazios)
  const atores=new Set(atividades.map(n=>(n.executor||'').trim()).filter(Boolean));
  const nAtores=atores.size||1;
  const numerador=E + P + 0.5*(C+D);
  const denominador=total + 1*gxorDiv + 0.5*Math.max(0,nAtores-1);
  const ilp=Math.round((numerador/denominador)*100);
  return {ilp,total,E,P,C,D,R:cnt('Revisao'),A:cnt('Aprovacao'),gxorDiv,nAtores};
}
function rEnt(p){
  const e=p.ent;
  const resp=e.quest_resp||{};
  const respondidas=Object.keys(resp).length;
  // Maturidade por dimensão
  const dims={};
  QUESTOES.forEach(q=>{
    if(!dims[q.dim])dims[q.dim]={sum:0,cnt:0};
    if(resp[q.id]){dims[q.dim].sum+=resp[q.id];dims[q.dim].cnt++;}
  });
  const matBadges=[1,2,3,4,5].map(n=>{
    let matBg,matColor;
    if((e.mat||0)===n){matBg='var(--blue)';matColor='#fff';}
    else if((e.mat||0)>n){matBg='var(--teal-l)';matColor='var(--teal)';}
    else{matBg='var(--bg3)';matColor='var(--ink3)';}
    return`<span class="badge" style="margin-right:4px;background:${matBg};color:${matColor}">${n} ${ML[n]}</span>`;
  }).join('');
  const ilpData=calcILP(p.mod?.etapas_proc||[]);
  const ilpCard=ilpData?(()=>{
    const {ilp,total,E,P,C,D,R,A,gxorDiv,nAtores}=ilpData;
    let ilpBg,ilpColor,ilpLabel;
    if(ilp>=75){ilpBg='#d1fae5';ilpColor='#065f46';ilpLabel='Processo enxuto';}
    else if(ilp>=50){ilpBg='#fef3c7';ilpColor='#92400e';ilpLabel='Melhorias possíveis';}
    else{ilpBg='#fee2e2';ilpColor='#991b1b';ilpLabel='Alto nível de controle';}
    const bar=w=>`<div style="height:8px;border-radius:4px;background:${ilpBg};overflow:hidden"><div style="height:100%;width:${w}%;background:${ilpColor};border-radius:4px;transition:width .5s"></div></div>`;
    const nat=(lbl,cnt,color)=>cnt?`<div style="display:flex;align-items:center;gap:6px;font-size:12px"><span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></span><span style="flex:1;color:var(--ink2)">${lbl}</span><span style="font-weight:600">${cnt}</span></div>`:'';
    return `<div class="card" style="margin-bottom:1rem;border-left:4px solid ${ilpColor}">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:.6rem">
        <div>
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--ink3)">Índice Lean Processual</div>
          <div style="font-size:28px;font-weight:800;color:${ilpColor};line-height:1.1">${ilp}<span style="font-size:14px;font-weight:500">/100</span></div>
          <span style="font-size:11px;font-weight:600;color:${ilpColor};background:${ilpBg};padding:2px 8px;border-radius:20px">${ilpLabel}</span>
        </div>
        <div style="flex:1">${bar(Math.min(ilp,100))}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin-bottom:.5rem">
        ${nat('Execução',E,'#0d9488')}${nat('Preparação',P,'#6366f1')}
        ${nat('Comunicação',C,'#f59e0b')}${nat('Distribuição',D,'#8b5cf6')}
        ${nat('Revisão',R,'#ef4444')}${nat('Aprovação',A,'#f97316')}
      </div>
      <div style="font-size:11px;color:var(--ink3);border-top:1px solid var(--bdr);padding-top:.4rem;display:flex;gap:12px;flex-wrap:wrap">
        <span>Total atividades: <strong>${total}</strong></span>
        <span>Gateways exclusivos (XOR÷): <strong>${gxorDiv}</strong></span>
        <span>Atores distintos: <strong>${nAtores}</strong></span>
      </div>
    </div>`; })():'';
      const linkPubHtml = p.form?.link_pub
        ? '<div style="margin-bottom:.4rem"><div class="sec-lbl">Link no repositório</div><div style="font-size:13px;word-break:break-all;overflow-wrap:anywhere"><a href="'+esc(p.form.link_pub)+'" target="_blank" rel="noopener noreferrer" style="color:var(--blue)">'+esc(p.form.link_pub)+'</a></div></div>'
        : '';
      const vigHtml = p.form?.vig
        ? '<div><div class="sec-lbl">Vigência</div><div style="font-size:13px;font-weight:500">'+esc(p.form.vig)+'</div></div>'
        : '';
      const pubExtra = (linkPubHtml||vigHtml) ? '<hr>'+linkPubHtml+vigHtml : '';
  document.getElementById('tab-ent').innerHTML=`
  ${ilpCard}
  <div class="g2" style="gap:12px;margin-bottom:1rem">
    <div class="card">
      <div class="card-t">Identificação temporal</div>
      <div class="g2">
        ${[['Início',e.dt_inicio||'—'],['Prev. entrega',e.dt_prev||'—'],['Entrega efetiva',e.dt_efetiva||'—'],['Produto',p.produto||'—'],['Tempo total',e.t_total||'—'],['Tempo sem fila',e.t_sem_fila||'—']].map(([l,v])=>`<div><div class="sec-lbl">${l}</div><div style="font-size:13px;font-weight:500">${v}</div></div>`).join('')}
      </div>
      <hr><div class="sec-lbl">Equipe</div><div style="font-size:13px">${e.equipe||'—'}</div>
      ${pubExtra}
    </div>
    <div class="card">
      <div class="card-t">Maturidade — Nível ${e.mat||0}/5: ${ML[e.mat||0]}</div>
      <div style="margin-bottom:.7rem">${matBadges}</div>
      <div class="sec-lbl">Respostas por dimensão (${respondidas}/15)</div>
      ${Object.entries(dims).map(([dim,d])=>`<div style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:12px">
        <span style="flex:1;color:var(--ink2)">${dim}</span>
        <span style="font-weight:600;color:var(--blue)">${d.cnt>0?(d.sum/d.cnt).toFixed(1):'-'}</span>
      </div>`).join('')}
    </div>
  </div>
  <div class="g2" style="gap:12px;margin-bottom:1rem">
    <div class="card"><div class="card-t">Volumetria</div>
      ${e.vol?.exec||e.t_ciclo||e.t_real?`<div class="g3" style="gap:10px">
        ${[['Execuções/período',e.vol?.exec],['Tempo médio de ciclo',e.t_ciclo==null?'':e.t_ciclo+' h'],['Tempo real (lead time)',e.t_real==null?'':e.t_real+' h'],['Tempo de gaveta',e.t_gaveta==null?'':e.t_gaveta+' h']].map(([l,v])=>v?`<div><div class="sec-lbl">${l}</div><div style="font-size:13px;font-weight:500">${v}</div></div>`:'').join('')}
      </div>`:'<div class="ib iba">Não preenchido.</div>'}
    </div>
    <div class="card"><div class="card-t">Problemas identificados (${(e.prob||[]).length})</div>
      ${(e.prob||[]).length?(e.prob||[]).map((pr,i)=>`<div style="display:flex;gap:6px;padding:5px 0;border-bottom:1px solid var(--bdr);font-size:12.5px"><span style="color:var(--red);font-weight:700;flex-shrink:0">${i+1}</span>${pr}</div>`).join(''):'<div class="ib iba">Nenhum problema registrado.</div>'}
    </div>
  </div>
  ${(e.fornecedores||e.entradas||e.saidas||e.clientes)?`<div class="card" style="margin-bottom:1rem">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.6rem">
      <div class="card-t" style="margin-bottom:0">SIPOC</div>
      <span style="font-size:10px;color:var(--ink3);font-weight:500">Fornecedores → Entradas → Processo → Saídas → Clientes</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:1px;border-radius:10px;overflow:hidden;border:1px solid var(--bdr)">
      ${[['S','Fornecedores',e.fornecedores,'#dbeafe','#1d4ed8'],['I','Entradas',e.entradas,'#dcfce7','#166534'],['P','Processo',p.nome,'#ede9fe','#5b21b6'],['O','Saídas',e.saidas,'#fef3c7','#92400e'],['C','Clientes',e.clientes,'#fce7f3','#9d174d']].map(([k,lb,v,bg,c])=>`<div style="background:${bg};padding:.75rem .55rem;min-width:0"><div style="font-size:22px;font-weight:900;color:${c};line-height:1;font-family:Georgia,serif">${k}</div><div style="font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:${c};margin:.3rem 0 .5rem;opacity:.8">${lb}</div><div style="font-size:11.5px;color:#1e293b;word-break:break-word;white-space:pre-wrap;line-height:1.4">${esc(v||'—')}</div></div>`).join('')}
    </div>
    ${(()=>{const atH=e.atores?`<div style="flex:1;min-width:140px;padding:.45rem .6rem;background:var(--bg2);border-radius:7px;font-size:11.5px"><span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--ink3);display:block;margin-bottom:3px">Atores / participantes</span>${esc(e.atores)}</div>`:'';const avH=e.atividades_principais?`<div style="flex:2;min-width:180px;padding:.45rem .6rem;background:var(--bg2);border-radius:7px;font-size:11.5px"><span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--ink3);display:block;margin-bottom:3px">Atividades principais</span><div style="white-space:pre-wrap;line-height:1.5">${esc(e.atividades_principais)}</div></div>`:'';return e.atores||e.atividades_principais?`<div style="display:flex;gap:.8rem;margin-top:.65rem;flex-wrap:wrap">${atH}${avH}</div>`:''})()}
  </div>`:''}
  ${e.analise&&(e.analise.gargalos||[]).length?`
  <div class="card"><div class="card-t">Análise AS IS</div>
    <div class="g4" style="margin-bottom:.8rem">
      ${[['Complexidade',e.analise.complexidade||'—'],['Ciclo médio',e.analise.t_ciclo_medio||'—'],['Espera/fila',e.analise.t_espera_medio||'—'],['Atividades',e.analise.qtd_atividades||0]].map(([l,v])=>`<div><div class="sec-lbl">${l}</div><div style="font-size:13px;font-weight:500">${v}</div></div>`).join('')}
    </div>
    ${_renderAnaliseItem(e.analise.gargalos||[], 'Gargalos', 'analise-gar', '⚠')}
    ${_renderAnaliseItem(e.analise.retrabalhos||[], 'Retrabalhos', 'analise-ret', '↩')}
    ${_renderAnaliseItem(e.analise.gaps||[], 'Pontos cegos', 'analise-gap', '○')}
    ${_renderAnaliseItem(e.analise.oportunidades||[], 'Oportunidades', 'analise-oport', '✦')}
  </div>`:''}
  ${isEP()&&e.analise?.feedback_dono&&Object.keys(e.analise.feedback_dono).length?`
  <div class="card" style="margin-top:.8rem;margin-bottom:1rem">
    <div class="card-t">Revisão do Dono — Feedback da validação</div>
    <div style="font-size:12px;color:var(--ink3);margin-bottom:.6rem">Itens avaliados pelo dono durante a validação. O EPP pode manter itens descartados.</div>
    ${renderFeedbackEP(e.analise)}
  </div>`:''}
  ${_renderRiscosCard(e.riscos||[])}`;
}

function _renderAnaliseItem(items, label, cssClass, icon){
  if(!items.length) return '';
  const rows=items.map(item=>`<div style="font-size:12.5px;padding:3px 0;border-bottom:1px solid var(--bdr)">${icon} ${item}</div>`).join('');
  return `<div class="analise-item"><div class="analise-cat ${cssClass}">${label} (${items.length})</div>${rows}</div>`;
}
function _renderRiscosCard(riscos){
  if(!riscos.length) return '';
  const rows=riscos.map(r=>`<tr><td>${r.desc}</td><td>${pbBadge(r.prob)}</td><td>${ibBadge(r.imp)}</td></tr>`).join('');
  return `<div class="card"><div class="card-t">Riscos (${riscos.length})</div>
    <table class="pop-tbl"><thead><tr><th>Risco</th><th>Prob.</th><th>Impacto</th></tr></thead>
    <tbody>${rows}</tbody></table>
  </div>`;
}
function _rModBizagiHTML(arqId, base64){
  return `<div style="background:var(--bg2);border:1px solid var(--bdr);border-radius:8px;padding:.8rem">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem">
      <span style="font-size:12px;font-weight:600;color:var(--ink2)">🗺 Fluxo Bizagi</span>
      <button type="button" class="btn" onclick="verFluxoBizagi('${arqId}',event)">⤢ Tela cheia</button>
    </div>
    <img src="${base64}" alt="Fluxo do processo" style="max-width:100%;border-radius:6px;border:1px solid var(--bdr);cursor:zoom-in" onclick="verFluxoBizagi('${arqId}',event)">
  </div>`;
}
async function rMod(p){
  document.getElementById('tab-mod').innerHTML=`
  <div class="tabs" style="margin-bottom:1rem">
    <div class="tab on" role="tab" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" onclick="sModTab('vm-asis',this)">AS IS</div>
    <div class="tab" role="tab" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" onclick="sModTab('vm-tobe',this)">TO BE</div>
    <div class="tab" role="tab" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" onclick="sModTab('vm-etapas',this)">Etapas detalhadas</div>
  </div>
  <div id="vm-asis" class="tab-p on">
    <div class="card" style="margin-bottom:.8rem">
      <div class="card-t">Descrição AS IS</div>
      ${p.mod.asIs?`<div style="font-size:13px;color:var(--ink2);white-space:pre-wrap">${p.mod.asIs}</div>`:'<div class="ib iba">Não preenchido.</div>'}
    </div>
    <div id="vm-asis-fluxo">${p.arq_id?'<div style="text-align:center;padding:1.5rem;color:var(--ink3)"><div class="spin" style="margin:0 auto .5rem"></div>Carregando fluxo Bizagi...</div>':bpmnEditorHTML('asis',p.mod.bpmnAsIs)}</div>
  </div>
  <div id="vm-tobe" class="tab-p" style="display:none">
    <div class="card" style="margin-bottom:.8rem">
      <div class="card-t">Descrição TO BE</div>
      ${p.mod.toBe?`<div style="font-size:13px;color:var(--ink2);white-space:pre-wrap">${p.mod.toBe}</div>`:'<div class="ib iba">Não preenchido.</div>'}
    </div>
    ${bpmnEditorHTML('tobe',p.mod.bpmnToBe)}
  </div>
  <div id="vm-etapas" class="tab-p" style="display:none">
    <div class="card"><div class="card-t">Etapas do processo (${(p.mod.etapas_proc||[]).length})</div>
      ${(p.mod.etapas_proc||[]).length?renderEtapasProc(p.mod.etapas_proc):'<div class="ib iba">Nenhuma etapa detalhada ainda.</div>'}
    </div>
  </div>`;
  if(p.arq_id){
    const base64=await loadFluxoImg(p.arq_id);
    const el=document.getElementById('vm-asis-fluxo');
    if(!el) return;
    if(base64){
      el.innerHTML=_rModBizagiHTML(p.arq_id, base64);
      p._hasBizagi=true;
    } else {
      el.innerHTML=bpmnEditorHTML('asis',p.mod.bpmnAsIs);
      p._hasBizagi=false;
      setTimeout(()=>initBpmnMod('asis',p),80);
    }
  } else { setTimeout(()=>initBpmnMod('asis',p),80); }
  setTimeout(()=>{ injectIaBpmn('asis'); injectIaBpmn('tobe'); }, 200);
}
function sModTab(id,el){
  el.closest('.tabs').querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  el.classList.add('on');
  ['vm-asis','vm-tobe','vm-etapas','sm-asis','sm-tobe'].forEach(s=>{const e=document.getElementById(s);if(e)e.style.display=s===id?'block':'none';});
  if(id==='vm-tobe'||id==='sm-tobe'){setTimeout(()=>initBpmnMod('tobe',curProc),80);}
  if(id==='vm-asis'||id==='sm-asis'){if(!curProc?._hasBizagi)setTimeout(()=>initBpmnMod('asis',curProc),80);}
}
function rForm(p){
  const pd=p.form?.pop;
  if(!pd){document.getElementById('tab-form').innerHTML='<div class="ib iba">POP não construído ainda.</div>';return;}
  document.getElementById('tab-form').innerHTML=`<div style="background:var(--surf);border:1px solid var(--bdr);border-radius:var(--rl);overflow:hidden">
    <div style="background:var(--ink);color:#fff;padding:1.2rem 1.5rem">
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:.8rem">
        <span style="background:rgba(255,255,255,.1);border-radius:5px;padding:3px 9px;font-family:var(--fh);font-size:11px">EPP</span>
        <span style="background:var(--blue);border-radius:5px;padding:3px 9px;font-size:11px;font-weight:600">CAGE</span>
      </div>
      <div style="font-family:var(--fh);font-size:15px;font-weight:600">${pd.area||p.area} / ${pd.mac||p.macro}</div>
      <div style="font-size:11px;color:rgba(255,255,255,.5)">Título: ${p.nome}</div>
    </div>
    <div style="padding:1.2rem 1.5rem">
      <table class="pop-tbl" style="margin-bottom:1.2rem"><thead><tr><th>Revisão</th><th>Data</th><th>Descrição</th></tr></thead><tbody><tr><td>0</td><td>${now()}</td><td>Emissão inicial</td></tr></tbody></table>
      <table class="pop-tbl" style="margin-bottom:1.5rem"><thead><tr><th>Ação</th><th>Elaborado por</th><th>Aprovado por</th></tr></thead><tbody><tr><td>Nome</td><td>${pd.ger||p.dono}</td><td>${p.pat||'—'}</td></tr><tr><td>Função</td><td>Chefe do EP</td><td>—</td></tr></tbody></table>
      <div style="margin-bottom:1rem"><div style="font-family:var(--fh);font-size:13px;font-weight:600;border-bottom:1px solid var(--bdr);padding-bottom:5px;margin-bottom:.7rem">1.0 Objetivo</div><div style="font-size:12.5px;color:var(--ink2)">${pd.obj||p.objetivo||'—'}</div></div>
      ${pd.def?`<div style="margin-bottom:1rem"><div style="font-family:var(--fh);font-size:13px;font-weight:600;border-bottom:1px solid var(--bdr);padding-bottom:5px;margin-bottom:.7rem">1.1 Definições</div><div style="font-size:12.5px;color:var(--ink2);white-space:pre-wrap">${pd.def}</div></div>`:''}
      <div style="margin-bottom:1rem"><div style="font-family:var(--fh);font-size:13px;font-weight:600;border-bottom:1px solid var(--bdr);padding-bottom:5px;margin-bottom:.7rem">1.2 Entradas</div><div style="font-size:12.5px">${pd.ent||'—'}</div></div>
      <div style="margin-bottom:1rem"><div style="font-family:var(--fh);font-size:13px;font-weight:600;border-bottom:1px solid var(--bdr);padding-bottom:5px;margin-bottom:.7rem">1.3 Saídas</div><div style="font-size:12.5px">${pd.sai||'—'}</div></div>
      ${(()=>{
        const etapas=curProc?.mod?.etapas_proc||[];
        const det=pd.ativ_detalhes||{};
        const normTipo=t=>{if(t==='Decisao'||t==='Decisão'){return 'Decisão';}if(t==='Comentario'||t==='Observação'){return 'Observação';}return t||'Atividade';};
        const normModo=m=>{if(m==='Automatica'){return 'Automática';}if(m==='Semi-automatica'){return 'Semi-automática';}return m||'Manual';};
        const linhas=etapas.map((e,i)=>{
          const d=det[i]||{};
          const desc=(d.desc!==undefined&&d.desc!=='')?d.desc:(e.desc||'');
          const resp=(d.resp!==undefined&&d.resp!=='')?d.resp:(e.executor||'');
          const tipo=normTipo(d.tipo||e.tipo);
          const modo=normModo(e.modo);
          const nat=e.natureza||'';
          return `<tr style="border-bottom:1px solid var(--bdr)">
            <td style="padding:5px 8px;font-size:11px;color:var(--ink3);white-space:nowrap">${i+1}</td>
            <td style="padding:5px 8px;font-size:12px;font-weight:600">${esc(e.nome||'')}</td>
            <td style="padding:5px 8px;font-size:11px;color:var(--ink3)">${esc(tipo)}</td>
            <td style="padding:5px 8px;font-size:11px;color:var(--ink3)">${esc(nat)}</td>
            <td style="padding:5px 8px;font-size:11px;color:var(--ink3)">${esc(modo)}</td>
            <td style="padding:5px 8px;font-size:12px">${esc(desc)}</td>
            <td style="padding:5px 8px;font-size:11px;color:var(--ink3)">${esc(resp)}</td>
          </tr>`;
        }).join('');
        if(!linhas)return pd.ativ?`<div style="margin-bottom:1rem"><div style="font-family:var(--fh);font-size:13px;font-weight:600;border-bottom:1px solid var(--bdr);padding-bottom:5px;margin-bottom:.7rem">2.0 Atividades</div><div style="font-size:12.5px;white-space:pre-wrap">${pd.ativ}</div></div>`:'';
        return `<div style="margin-bottom:1rem"><div style="font-family:var(--fh);font-size:13px;font-weight:600;border-bottom:1px solid var(--bdr);padding-bottom:5px;margin-bottom:.7rem">2.0 Atividades</div>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead><tr style="background:var(--bg2)">
              <th style="padding:5px 8px;text-align:left;font-size:10px;color:var(--ink3)">#</th>
              <th style="padding:5px 8px;text-align:left;font-size:10px;color:var(--ink3)">Etapa</th>
              <th style="padding:5px 8px;text-align:left;font-size:10px;color:var(--ink3)">Tipo</th>
              <th style="padding:5px 8px;text-align:left;font-size:10px;color:var(--ink3)">Natureza</th>
              <th style="padding:5px 8px;text-align:left;font-size:10px;color:var(--ink3)">Modo</th>
              <th style="padding:5px 8px;text-align:left;font-size:10px;color:var(--ink3)">Descrição</th>
              <th style="padding:5px 8px;text-align:left;font-size:10px;color:var(--ink3)">Responsável</th>
            </tr></thead>
            <tbody>${linhas}</tbody>
          </table></div>`;
      })()}
      ${pd.docs?`<div style="margin-bottom:1rem"><div style="font-family:var(--fh);font-size:13px;font-weight:600;border-bottom:1px solid var(--bdr);padding-bottom:5px;margin-bottom:.7rem">3.0 Documentos correlatos</div><div style="font-size:12.5px;white-space:pre-wrap">${pd.docs}</div></div>`:''}
      ${pd.ind?`<div style="margin-bottom:1rem"><div style="font-family:var(--fh);font-size:13px;font-weight:600;border-bottom:1px solid var(--bdr);padding-bottom:5px;margin-bottom:.7rem">4.0 Indicadores</div><div style="font-size:12.5px;white-space:pre-wrap">${pd.ind}</div></div>`:''}
      ${p.form.apresent?`<div style="margin-bottom:1rem"><div style="font-family:var(--fh);font-size:13px;font-weight:600;border-bottom:1px solid var(--bdr);padding-bottom:5px;margin-bottom:.7rem">5.0 Aprovações</div><div style="font-size:12.5px">${p.form.apresent}</div></div>`:''}
    </div>
  </div>
  <div class="pop-pdf-bar" style="margin-top:1rem;text-align:right">
    <button type="button" class="btn btn-a" onclick="gerarPopPdf()">⬇ Gerar POP em PDF</button>
  </div>`;
}
function gerarPopPdf(){
  const el=document.getElementById('tab-form');
  if(!el)return;
  const inner=el.querySelector('.pop-pdf-bar')?el.innerHTML.replace(/<div class="pop-pdf-bar"[\s\S]*?<\/div>/,''):el.innerHTML;
  if(!inner.trim())return;
  const nome=esc(curProc?.nome||'POP');
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${nome}</title>
  <style>
    :root{--blue:#1e6bfa;--ink:#1a1a2e;--ink2:#4a4a6a;--ink3:#8888aa;--bg2:#f4f5f8;--surf:#fff;--bdr:#e0e0f0;--r:6px;--rl:8px;--fh:'Segoe UI',Arial,sans-serif}
    *{box-sizing:border-box}
    body{font-family:Arial,sans-serif;background:#fff;margin:0;padding:20px;color:#1a1a2e}
    table{width:100%;border-collapse:collapse;margin-bottom:10px}
    th,td{border:1px solid #ddd;padding:5px 8px;text-align:left}
    th{background:#f4f5f8;font-size:10px}
    @media print{body{padding:10px}.pop-pdf-bar{display:none!important}}
  </style>
  </head><body>${inner}</body></html>`);
  w.document.close();
  setTimeout(()=>w.print(),400);
}
function rMon(p){
  const inds=kpis.filter(d=>d.pid===p.id);
  const audConclusaoHtml = p.auditoria?.conclusao ? `<div style="margin-top:.6rem"><div class="sec-lbl">Conclusão</div><div style="font-size:12.5px">${esc(p.auditoria.conclusao)}</div></div>` : '';
  const audBadgeCls = p.auditoria?.concluida ? 'bg' : 'ba';
  const audStatus = p.auditoria?.concluida ? 'Concluída' : 'Rascunho';
  const audHTML=p.auditoria?`<div class="card" style="margin-top:1rem"><div class="card-t">Auditoria — ${esc(p.auditoria.data||'')}</div>
    <div class="g2"><div><div class="sec-lbl">Conformidade</div><div style="font-size:13px;font-weight:600">${esc(p.auditoria.conformidade||'—')}</div></div><div><div class="sec-lbl">Status</div><span class="badge ${audBadgeCls}">${audStatus}</span></div></div>
    ${audConclusaoHtml}
  </div>`:'';
  document.getElementById('tab-mon').innerHTML=inds.length?`<div class="g3" style="gap:10px">${inds.map(d=>kpiCard(d)).join('')}</div>${audHTML}`:`<div class="ib ibb">Nenhum indicador vinculado a este processo. <button type="button" class="btn btn-p" style="font-size:12px;padding:4px 10px;margin-left:8px" onclick="go('indicadores',document.getElementById('nb-ind'))">Ir para indicadores →</button></div>${audHTML}`;
}
function rHist(p){
  const histItems=[...p.hist].reverse().map((h,i)=>{
    const dotClass=i===0?'da':'dn';
    const dot=i===0?'●':'✓';
    return `<div class="tl-i"><div class="tl-d ${dotClass}">${dot}</div><div><div class="tl-t">${esc(h.acao)}</div><div class="tl-m">${esc(h.role)} · ${esc(h.data)}</div></div></div>`;
  }).join('');
  document.getElementById('tab-hist').innerHTML=`<div class="card"><div class="card-t">Histórico completo</div><div class="tl">${histItems}</div></div>`;
}

function _renderAcompReuniao(r){
  let badgeClass;
  if(r.conformidade==='Conforme') badgeClass='bbt';
  else if(r.conformidade?.includes('Parcial')) badgeClass='bba';
  else badgeClass='bbr';
  const participantesHtml=r.participantes?`<div style="font-size:12px;color:var(--ink2);margin-bottom:.3rem">👥 ${esc(r.participantes)}</div>`:'';
  const pautaHtml=r.pauta?`<div style="font-size:12px;color:var(--ink2);margin-bottom:.3rem"><strong>Pauta:</strong> ${esc(r.pauta)}</div>`:'';
  const desviosHtml=r.desvios?`<div style="font-size:12px;color:var(--ink2);margin-bottom:.3rem"><strong>Desvios:</strong> ${esc(r.desvios)}</div>`:'';
  const acoesHtml=r.acoes?`<div style="font-size:12px;color:var(--ink2)"><strong>Ações:</strong> ${esc(r.acoes)}</div>`:'';
  return `<div class="card" style="margin-bottom:.6rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem">
        <div class="card-t" style="margin-bottom:0">Acompanhamento — ${esc(r.data||'')}</div>
        <span class="badge ${badgeClass}">${esc(r.conformidade||'')}</span>
      </div>
      ${participantesHtml}${pautaHtml}${desviosHtml}${acoesHtml}    </div>`;
}
function rReun(p){
  const REUN_TIPOS={
    reuniao_entendimento:'Reunião de entendimento',
    reuniao_valid_asis:'Validação AS IS',
    reuniao_valid_tobe:'Validação TO BE',
    reuniao_complement:'Complementação',
    reuniao_apresentacao:'Aprovação pelo Gestor',
    acompanhamento:'Acompanhamento',
    outra:'Outra reunião',
  };

  // Reuniões registradas nesta aba (array unificado, qualquer tipo, múltiplas por tipo)
  const reunioes=p.reunioes||[];

  // Reuniões fixas herdadas de outras abas (somente leitura nesta aba)
  const legacyFixas=[
    {key:'reuniao_entendimento', dados:p.ent?.reuniao_entendimento},
    {key:'reuniao_valid_asis',   dados:p.ent?.analise?.reuniao_valid_asis},
    {key:'reuniao_valid_tobe',   dados:p.mod?.reuniao_valid_tobe},
    {key:'reuniao_complement',   dados:p.form?.reuniao_complement},
    {key:'reuniao_apresentacao', dados:p.form?.reuniao_apresentacao},
  ].filter(t=>t.dados);

  // Reuniões de acompanhamento (gerenciadas pelo módulo EP)
  const acomp=p.reunioes_acomp||[];

  const cardReun=(r,label,editavel=false)=>`
    <div class="card" style="margin-bottom:.6rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem">
        <div class="card-t" style="margin-bottom:0">${esc(label)}</div>
        <div style="display:flex;gap:.4rem;align-items:center">
          ${r.data?`<span style="font-size:11px;color:var(--ink3)">${esc(r.data)}</span>`:''}
          ${editavel?`<button type="button" class="btn" style="padding:2px 8px;font-size:11px" onclick="editarReuniao('${esc(r.id)}')">Editar</button><button type="button" class="btn" style="padding:2px 8px;font-size:11px;color:var(--red)" onclick="excluirReuniao('${esc(r.id)}')">Excluir</button>`:''}
        </div>
      </div>
      ${r.participantes?`<div style="font-size:12px;color:var(--ink2);margin-bottom:.3rem">👥 ${esc(r.participantes)}</div>`:''}
      ${r.ata?`<div style="font-size:12px;color:var(--ink2);white-space:pre-wrap;margin-top:.4rem;padding:.5rem;background:var(--bg2);border-radius:5px">${esc(r.ata)}</div>`:''}
    </div>`;

  const reunioesHtml=reunioes.map(r=>cardReun(r,REUN_TIPOS[r.tipo]||r.tipo,true)).join('');

  const legacyHtml=legacyFixas.length?`
    <div style="font-weight:600;font-size:12px;color:var(--ink3);margin:.8rem 0 .4rem;text-transform:uppercase;letter-spacing:.04em">Registradas por outras abas</div>
    ${legacyFixas.map(t=>cardReun(t.dados,REUN_TIPOS[t.key]||t.key,false)).join('')}`:'';

  const acompHtml=acomp.length?`
    <div style="font-weight:600;font-size:13px;margin:1rem 0 .6rem">Reuniões de acompanhamento</div>
    ${acomp.map(r=>_renderAcompReuniao(r)).join('')}`:'';

  const allEmpty=!reunioes.length&&!legacyFixas.length&&!acomp.length;

  const novaReunBtn=isEP()?`
    <div id="nr-form" style="margin-top:1.2rem;padding-top:1rem;border-top:1px solid var(--bdr)">
      <div id="nr-form-title" style="font-weight:600;font-size:13px;margin-bottom:.8rem">+ Registrar nova reunião</div>
      <input type="hidden" id="nr-edit-id">
      <div class="g2" style="margin-bottom:.5rem">
        <div class="fg"><label class="fl">Tipo</label>
          <select class="fi" id="nr-tipo">
            <option value="reuniao_entendimento">Reunião de entendimento</option>
            <option value="reuniao_valid_asis">Validação AS IS</option>
            <option value="reuniao_valid_tobe">Validação TO BE</option>
            <option value="reuniao_complement">Complementação</option>
            <option value="reuniao_apresentacao">Aprovação pelo Gestor</option>
            <option value="acompanhamento">Acompanhamento</option>
            <option value="outra">Outra</option>
          </select>
        </div>
        <div class="fg"><label class="fl">Data</label><input class="fi" id="nr-data" type="date"></div>
      </div>
      <div class="fg" style="margin-bottom:.5rem"><label class="fl">Participantes</label><input class="fi" id="nr-part" placeholder="Nomes dos participantes"></div>
      <div class="fg" style="margin-bottom:.5rem"><label class="fl">Ata / encaminhamentos</label><textarea class="fi" id="nr-ata" style="min-height:80px" placeholder="Registre as decisões e encaminhamentos da reunião..."></textarea></div>
      <div class="btn-row">
        <button type="button" class="btn" id="nr-btn-cancel" style="display:none" onclick="cancelarEditReuniao()">Cancelar</button>
        <button type="button" class="btn btn-p" onclick="salvarReuniaoAvulsa()">＋ Registrar reunião</button>
      </div>
    </div>`:'';

  document.getElementById('tab-reun').innerHTML=`<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
      <div class="card-t" style="margin-bottom:0">Reuniões do processo</div>
    </div>
    ${allEmpty?`<div class="ib iba">Nenhuma reunião registrada ainda.</div>`:reunioesHtml+legacyHtml+acompHtml}
    ${novaReunBtn}
  </div>`;
}

function editarReuniao(id){
  const p=curProc; if(!p) return;
  const r=(p.reunioes||[]).find(x=>x.id===id);
  if(!r) return;
  const el=n=>document.getElementById(n);
  el('nr-edit-id').value=id;
  el('nr-tipo').value=r.tipo||'outra';
  el('nr-data').value=r.data||'';
  el('nr-part').value=r.participantes||'';
  el('nr-ata').value=r.ata||'';
  el('nr-form-title').textContent='Editar reunião';
  el('nr-btn-cancel').style.display='';
  el('nr-form').scrollIntoView({behavior:'smooth',block:'start'});
}

function cancelarEditReuniao(){
  const el=n=>document.getElementById(n);
  el('nr-edit-id').value='';
  el('nr-tipo').value='reuniao_entendimento';
  el('nr-data').value='';
  el('nr-part').value='';
  el('nr-ata').value='';
  el('nr-form-title').textContent='+ Registrar nova reunião';
  el('nr-btn-cancel').style.display='none';
}

async function excluirReuniao(id){
  const p=curProc; if(!p) return;
  confirmar('Excluir esta reunião?',async()=>{
    if(!p.reunioes) return;
    const idx=p.reunioes.findIndex(x=>x.id===id);
    if(idx>=0) p.reunioes.splice(idx,1);
    await fbSaveAll();
    toast('Reunião excluída','var(--amber)');
    rReun(p);
  });
}

async function salvarReuniaoAvulsa(){
  const p=curProc; if(!p) return;
  const REUN_TIPOS={
    reuniao_entendimento:'Reunião de entendimento',
    reuniao_valid_asis:'Validação AS IS',
    reuniao_valid_tobe:'Validação TO BE',
    reuniao_complement:'Complementação',
    reuniao_apresentacao:'Aprovação pelo Gestor',
    acompanhamento:'Acompanhamento',
    outra:'Outra reunião',
  };
  const editId=document.getElementById('nr-edit-id')?.value||'';
  const tipo=document.getElementById('nr-tipo')?.value||'outra';
  const data=document.getElementById('nr-data')?.value||'';
  const part=document.getElementById('nr-part')?.value||'';
  const ata=document.getElementById('nr-ata')?.value||'';
  if(!data){toast('Informe a data da reunião','var(--red)');return;}
  if(!p.reunioes) p.reunioes=[];
  if(editId){
    const r=p.reunioes.find(x=>x.id===editId);
    if(r){r.tipo=tipo;r.data=data;r.participantes=part;r.ata=ata;}
  } else {
    p.reunioes.push({id:'rn_'+Date.now(),tipo,data,participantes:part,ata,registrada_em:now()});
    push(p,'','EP','Reunião registrada: '+(REUN_TIPOS[tipo]||tipo)+' — '+data);
  }
  await fbSaveAll();
  toast(editId?'Reunião atualizada!':'Reunião registrada!','var(--teal)');
  rReun(p);
}

// ═══════════════════════════════════════════
// BPMN EDITOR
// ═══════════════════════════════════════════
function bpmnEditorHTML(which, existingXml){
  const saved = existingXml ? '● Fluxo salvo' : '○ Sem fluxo';
  const savedColor = existingXml ? 'var(--green)' : 'var(--ink4)';
  return `<div class="bpmn-wrap">
    <div class="bpmn-bar">
      <span style="font-size:12px;font-weight:600;color:var(--ink2)">${which.toUpperCase()}</span>
      <span style="font-size:11px;color:${savedColor}">${saved}</span>
      <span id="bpmn-${which}-dirty" class="bpmn-dirty" style="display:none">● Não salvo</span>
      <div style="flex:1"></div>
      <button type="button" class="btn" onclick="bpmnZ('${which}',1)">+</button>
      <button type="button" class="btn" onclick="bpmnZ('${which}',-1)">-</button>
      <button type="button" class="btn" onclick="bpmnFit('${which}')">Ajustar</button>
      <button type="button" class="btn" onclick="bpmnUndo('${which}')">Desfazer</button>
      <button type="button" class="btn" onclick="bpmnColorize('${which}')" title="Aplicar cores por tipo de elemento">🎨 Colorir</button>
      <button type="button" class="btn" onclick="bpmnExport('${which}')">↓ XML</button>
      <button type="button" class="btn" onclick="bpmnImport('${which}')">↑ XML</button>
      <button type="button" class="btn" onclick="bpmnExportPNG('${which}')" title="Salvar diagrama como imagem PNG">↓ PNG</button>
      <button type="button" class="btn btn-g" onclick="bpmnSave('${which}')">Salvar ${which.toUpperCase()}</button>
    </div>
    <div id="bpmn-${which}-canvas" class="bpmn-canvas">
      <div class="bpmn-spinner" id="bpmn-${which}-loading">
        <div class="spin"></div>
        <span>Carregando editor BPMN...</span>
        <span style="font-size:11px;color:var(--ink4)">Requer internet (cdn.jsdelivr.net)</span>
      </div>
    </div>
    <textarea id="bpmn-${which}-xml" class="fi" rows="4" style="display:none;border-radius:0;font-family:var(--fm);font-size:11px" placeholder="Cole o XML BPMN e clique em Importar XML novamente"></textarea>
  </div>`;
}

function initBpmnMod(which, p){
  if(bpmnModelers[which]){try{bpmnModelers[which].destroy();}catch{}bpmnModelers[which]=null;}
  const canvasEl=document.getElementById('bpmn-'+which+'-canvas');
  if(!canvasEl)return;
  if(typeof BpmnJS==='undefined'){
    const l=document.getElementById('bpmn-'+which+'-loading');
    if(l)l.innerHTML='<div style="text-align:center;padding:2rem"><div style="font-size:28px;margin-bottom:8px">📦</div><div style="font-size:13px;font-weight:600">Editor BPMN não disponível</div><div style="font-size:12px;color:var(--ink3);margin-top:4px">Requer conexão com internet</div></div>';
    return;
  }
  const mod=new BpmnJS({container:'#bpmn-'+which+'-canvas',keyboard:{bindTo:document}});
  bpmnModelers[which]=mod;
  bpmnDirty[which]=false;
  mod.on('commandStack.changed',()=>{
    bpmnDirty[which]=true;
    const lbl=document.getElementById('bpmn-'+which+'-dirty');
    if(lbl)lbl.style.display='inline';
  });
  const xmlKey=which==='asis'?'bpmnAsIs':'bpmnToBe';
  const xml=(p?.mod&&p.mod[xmlKey])?p.mod[xmlKey]:BPMN_DEFAULT;
  mod.importXML(xml).then(()=>{
    const l=document.getElementById('bpmn-'+which+'-loading');
    if(l)l.style.display='none';
    mod.get('canvas').zoom('fit-viewport');
  }).catch(err=>{
    const l=document.getElementById('bpmn-'+which+'-loading');
    if(l)l.innerHTML='<div style="color:var(--red);padding:1rem;font-size:13px">Erro: '+(err.message||err)+'</div>';
  });
}
function bpmnSave(which){
  const mod=bpmnModelers[which];
  if(!mod||!curProc)return;
  mod.saveXML({format:true}).then(({xml})=>{
    const key=which==='asis'?'bpmnAsIs':'bpmnToBe';
    if(!curProc.mod)curProc.mod={asIs:'',toBe:'',bpmnAsIs:null,bpmnToBe:null,etapas_proc:[],obs:''};
    curProc.mod[key]=xml;
    bpmnDirty[which]=false;
    const lbl=document.getElementById('bpmn-'+which+'-dirty');
    if(lbl)lbl.style.display='none';
    push(curProc,curProc.etapa,'EP','Fluxo BPMN '+which.toUpperCase()+' salvo');
    fbAutoSave('bpmnSave');
    toast('✓ Fluxo '+which.toUpperCase()+' salvo no servidor');
  }).catch(err=>toast('Erro ao salvar: '+(err.message||err),'var(--red)'));
}
function bpmnZ(which,dir){const m=bpmnModelers[which];if(!m){return;}try{m.get('zoomScroll').zoom(dir,{x:400,y:240});}catch{}}
function bpmnFit(which){const m=bpmnModelers[which];if(!m){return;}try{m.get('canvas').zoom('fit-viewport');}catch{}}
function bpmnUndo(which){const m=bpmnModelers[which];if(!m){return;}try{m.get('commandStack').undo();}catch{}}
function bpmnExport(which){
  const m=bpmnModelers[which];if(!m||!curProc){return;}
  m.saveXML({format:true}).then(({xml})=>{
    const b=new Blob([xml],{type:'text/xml'});const a=document.createElement('a');
    a.href=URL.createObjectURL(b);a.download=curProc.nome.replaceAll(/\s+/g,'_').slice(0,30)+'_'+which+'.bpmn';a.click();
  }).catch(err=>console.warn('bpmnExport error:',err.message||err));
}
function bpmnImport(which){
  const ta=document.getElementById('bpmn-'+which+'-xml');
  if(!ta)return;
  if(ta.style.display==='none'){ta.style.display='block';ta.focus();return;}
  const xml=ta.value.trim();
  if(!xml){ta.style.display='none';return;}
  const m=bpmnModelers[which];if(!m)return;
  m.importXML(xml).then(()=>{
    m.get('canvas').zoom('fit-viewport');
    ta.style.display='none';ta.value='';
    bpmnDirty[which]=true;
    const lbl=document.getElementById('bpmn-'+which+'-dirty');if(lbl)lbl.style.display='inline';
  }).catch(err=>toast('XML inválido: '+(err.message||err),'var(--red)'));
}

function bpmnColorize(which){
  const m=bpmnModelers[which];
  if(!m){toast('Editor BPMN não carregado.','var(--amber)');return;}
  try{
    const modeling=m.get('modeling');
    const reg=m.get('elementRegistry');
    reg.getAll().forEach(el=>{
      const t=el.type||'';
      if(t.includes('StartEvent')){
        modeling.setColor(el,{fill:'#D1FAE5',stroke:'#059669'});
      } else if(t.includes('EndEvent')){
        modeling.setColor(el,{fill:'#FEE2E2',stroke:'#DC2626'});
      } else if(t.includes('Gateway')){
        modeling.setColor(el,{fill:'#FEF3C7',stroke:'#D97706'});
      } else if(t==='bpmn:Task'||t.includes('Activity')){
        modeling.setColor(el,{fill:'#DBEAFE',stroke:'#2563EB'});
      } else if(t==='bpmn:SubProcess'){
        modeling.setColor(el,{fill:'#EDE9FE',stroke:'#7C3AED'});
      } else if(t==='bpmn:Participant'||t==='bpmn:Lane'){
        modeling.setColor(el,{fill:'#F0F9FF',stroke:'#0EA5E9'});
      }
    });
    bpmnDirty[which]=true;
    const lbl=document.getElementById('bpmn-'+which+'-dirty');
    if(lbl)lbl.style.display='inline';
    toast('✓ Cores aplicadas — clique em Salvar para persistir');
  }catch(e){console.warn('bpmnColorize:',e);toast('Erro ao colorir: '+e.message,'var(--red)');}
}

// ─── DESENHO FINAL ───────────────────────────────────────────────────────────
function bpmnExportPNG(which){
  const m=bpmnModelers[which];
  if(!m||!curProc){toast('Editor BPMN não carregado.','var(--amber)');return;}
  m.saveSVG().then(({svg})=>{
    // Usa data URI base64 em vez de blob URL para evitar canvas tainted
    const svgUri='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svg)));
    const img=new Image();
    img.onload=()=>{
      const scale=2;
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(img.width,1)*scale;
      canvas.height=Math.max(img.height,1)*scale;
      const ctx=canvas.getContext('2d');
      ctx.fillStyle='#ffffff';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.scale(scale,scale);
      ctx.drawImage(img,0,0);
      const a=document.createElement('a');
      a.href=canvas.toDataURL('image/png');
      a.download=(curProc.nome||'processo').replaceAll(/\s+/g,'_').slice(0,30)+'_'+which+'.png';
      a.click();
    };
    img.onerror=()=>toast('Erro ao renderizar SVG como imagem.','var(--red)');
    img.src=svgUri;
  }).catch(e=>toast('Erro ao exportar: '+(e.message||e),'var(--red)'));
}
function vincularDesenhoFinalArq(){
  const m=bpmnModelers['asis'];
  if(!m||!curProc){toast('Editor BPMN não carregado.','var(--amber)');return;}
  if(!curProc.arq_id){toast('Este processo não está vinculado a um item da arquitetura. Vincule na tela de arquitetura.','var(--amber)');return;}
  m.saveSVG().then(({svg})=>{
    const svgUri='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svg)));
    const img=new Image();
    img.onload=async()=>{
      const scale=2;
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(img.width,1)*scale;
      canvas.height=Math.max(img.height,1)*scale;
      const ctx=canvas.getContext('2d');
      ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.scale(scale,scale); ctx.drawImage(img,0,0);
      const png=canvas.toDataURL('image/png');
      await saveFluxoImg(curProc.arq_id, png);
      toast('✓ Imagem do fluxo vinculada à arquitetura!','var(--teal)');
    };
    img.onerror=()=>toast('Erro ao gerar imagem.','var(--red)');
    img.src=svgUri;
  }).catch(e=>toast('Erro: '+(e.message||e),'var(--red)'));
}
function salvarDesenhoFinal(){
  const p=curProc; if(!p) return;
  p.form=p.form||{};
  p.form.obs_final=document.getElementById('a-obs')?.value??p.form.obs_final??'';
  av('desenho_final','EP','Desenho final concluído',null,p.pat);
}

// ═══════════════════════════════════════════
// SUBTABS HELPERS
// ═══════════════════════════════════════════
function sstab(id,el){
  const tabsEl=el.closest('.tabs');
  tabsEl.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  el.classList.add('on');
  tabsEl.parentElement.querySelectorAll('.tab-p').forEach(p=>{const active=p.id===id;p.classList.toggle('on',active);p.style.display=active?'block':'none';});
}

// ═══════════════════════════════════════════
// RISCOS
// ═══════════════════════════════════════════
const RISCO_MATRIZ_COR = {
  'Alta|Baixo':   {bg:'#fef9c3',bd:'#ca8a04'},
  'Alta|Medio':   {bg:'#fed7aa',bd:'#ea580c'},
  'Alta|Alto':    {bg:'#fecaca',bd:'#dc2626'},
  'Alta|Critico': {bg:'#f87171',bd:'#b91c1c'},
  'Media|Baixo':  {bg:'#dcfce7',bd:'#16a34a'},
  'Media|Medio':  {bg:'#fef9c3',bd:'#ca8a04'},
  'Media|Alto':   {bg:'#fed7aa',bd:'#ea580c'},
  'Media|Critico':{bg:'#fecaca',bd:'#dc2626'},
  'Baixa|Baixo':  {bg:'#dcfce7',bd:'#16a34a'},
  'Baixa|Medio':  {bg:'#dcfce7',bd:'#16a34a'},
  'Baixa|Alto':   {bg:'#fef9c3',bd:'#ca8a04'},
  'Baixa|Critico':{bg:'#fed7aa',bd:'#ea580c'},
};
function zona(s){
  if(s<=2) return {bg:'#d1fae5',tx:'#065f46',lb:'Baixo'};
  if(s<=4) return {bg:'#fef3c7',tx:'#92400e',lb:'Moderado'};
  if(s<=8) return {bg:'#ffedd5',tx:'#9a3412',lb:'Alto'};
  return {bg:'#fee2e2',tx:'#991b1b',lb:'Crítico'};
}
function rRiscoMatriz(rs){
  if(!rs||!rs.length) return '';
  const probs=['Alta','Media','Baixa'];
  const imps=['Baixo','Medio','Alto','Critico'];
  const pScore={Alta:3,Media:2,Baixa:1};
  const iScore={Baixo:1,Medio:2,Alto:3,Critico:4};

  const rows=probs.map(prob=>{
    const cells=imps.map(imp=>{
      const s=pScore[prob]*iScore[imp];
      const z=zona(s);
      const items=rs.filter(r=>r.prob===prob&&r.imp===imp);
      const badge=items.length
        ?`<div style="width:28px;height:28px;border-radius:50%;background:${z.tx};color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 5px;box-shadow:0 1px 4px rgba(0,0,0,.18)">${items.length}</div>`
        :`<div style="width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,.07);margin:0 auto 5px"></div>`;
      const names=items.map(r=>`<div style="font-size:9.5px;color:${z.tx};font-weight:500;line-height:1.3;text-align:center;max-width:90px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis" title="${esc(r.desc)}">${esc(r.desc)}</div>`).join('');
      return `<td style="width:90px;height:80px;background:${z.bg};border:3px solid #fff;border-radius:8px;text-align:center;vertical-align:middle;padding:8px 6px">
        ${badge}${names}
      </td>`;
    }).join('');
    return `<tr>
      <td style="padding:4px 10px 4px 0;font-size:11px;font-weight:700;color:var(--ink2);text-align:right;white-space:nowrap;vertical-align:middle">${prob}</td>
      ${cells}
    </tr>`;
  }).join('');

  // Sorted risk list by severity
  const sorted=[...rs].sort((a,b)=>(pScore[b.prob]*iScore[b.imp])-(pScore[a.prob]*iScore[a.imp]));
  const riscoList=sorted.map(r=>{
    const s=pScore[r.prob]*iScore[r.imp];
    const z=zona(s);
    return `<div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--bdr)">
      <div style="width:8px;height:8px;border-radius:50%;background:${z.tx};margin-top:4px;flex-shrink:0"></div>
      <div style="flex:1;font-size:12.5px;color:var(--ink)">${esc(r.desc)}</div>
      <div style="display:flex;gap:4px;flex-shrink:0">
        <span style="font-size:10px;font-weight:600;padding:1px 7px;border-radius:99px;background:${z.bg};color:${z.tx}">${r.prob}</span>
        <span style="font-size:10px;font-weight:600;padding:1px 7px;border-radius:99px;background:${z.bg};color:${z.tx}">${r.imp}</span>
      </div>
    </div>`;
  }).join('');

  const legenda=[['#d1fae5','#065f46','Baixo'],['#fef3c7','#92400e','Moderado'],['#ffedd5','#9a3412','Alto'],['#fee2e2','#991b1b','Crítico']]
    .map(([bg,tx,lb])=>`<div style="display:flex;align-items:center;gap:5px"><div style="width:12px;height:12px;border-radius:3px;background:${bg};border:1.5px solid ${tx}"></div><span style="font-size:10.5px;color:var(--ink3)">${lb}</span></div>`).join('');

  return `<div style="margin-top:1.2rem">
    <div style="font-size:11px;font-weight:700;color:var(--ink3);letter-spacing:.07em;text-transform:uppercase;margin-bottom:.7rem">Mapa de calor</div>
    <div style="display:flex;align-items:stretch;gap:6px">
      <div style="display:flex;align-items:center;justify-content:center;padding-bottom:24px">
        <div style="writing-mode:vertical-rl;transform:rotate(180deg);font-size:10px;font-weight:700;color:var(--ink4);letter-spacing:.1em;text-transform:uppercase;white-space:nowrap">Probabilidade</div>
      </div>
      <div style="flex:1;overflow-x:auto">
        <table style="border-collapse:separate;border-spacing:4px;width:100%">
          <thead><tr>
            <th style="width:56px"></th>
            ${imps.map(i=>`<th style="text-align:center;font-size:10.5px;font-weight:700;color:var(--ink3);padding:0 4px 6px">${i}</th>`).join('')}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="text-align:center;font-size:10px;font-weight:700;color:var(--ink4);letter-spacing:.1em;text-transform:uppercase;margin-top:2px">Impacto</div>
        <div style="display:flex;gap:14px;margin-top:10px;flex-wrap:wrap">${legenda}</div>
      </div>
    </div>
    <div style="margin-top:1rem">
      <div style="font-size:11px;font-weight:700;color:var(--ink3);letter-spacing:.07em;text-transform:uppercase;margin-bottom:.4rem">Riscos identificados (${rs.length})</div>
      ${riscoList}
    </div>
  </div>`;
}
function atualizarRiscoUI(){
  const rs=curProc?.ent?.riscos;
  const el=document.getElementById('risco-list');
  const em=document.getElementById('risco-matrix');
  if(el) el.innerHTML=rRiscoList(rs);
  if(em) em.innerHTML=rRiscoMatriz(rs);
}
function rRiscoList(rs){
  if(!rs||!rs.length)return '<div style="font-size:12px;color:var(--ink4);padding:4px 0">Nenhum risco adicionado.</div>';
  return rs.map((r,i)=>`<div class="ri-item"><span>${esc(r.desc)}</span>${pbBadge(r.prob)}${ibBadge(r.imp)}<button type="button" class="btn" style="font-size:11px;padding:2px 8px" onclick="editarRisco(${i})" aria-label="Editar risco">✎</button><button type="button" class="ri-del" onclick="remR(${i})" aria-label="Remover risco">×</button></div>`).join('');
}
function editarRisco(i){
  const r=curProc.ent.riscos[i];
  if(!r)return;
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9998;display:flex;align-items:center;justify-content:center';
  ov.innerHTML=`<div style="background:var(--surf);border-radius:14px;padding:1.8rem;max-width:480px;width:94%;box-shadow:0 12px 40px rgba(0,0,0,.25)">
    <div style="font-size:15px;font-weight:700;color:var(--ink);margin-bottom:1.2rem">✎ Editar risco</div>
    <div class="fg" style="margin-bottom:.8rem">
      <label class="fl">Descrição do risco</label>
      <textarea class="fi" id="er-desc" style="min-height:80px">${esc(r.desc)}</textarea>
    </div>
    <div class="g2" style="margin-bottom:1.2rem">
      <div class="fg"><label class="fl">Probabilidade</label>
        <select class="fi" id="er-prob">
          <option value="Baixa" ${r.prob==='Baixa'?'selected':''}>Baixa</option>
          <option value="Media" ${r.prob==='Media'?'selected':''}>Média</option>
          <option value="Alta"  ${r.prob==='Alta' ?'selected':''}>Alta</option>
        </select>
      </div>
      <div class="fg"><label class="fl">Impacto</label>
        <select class="fi" id="er-imp">
          <option value="Baixo"  ${r.imp==='Baixo'  ?'selected':''}>Baixo</option>
          <option value="Medio"  ${r.imp==='Medio'  ?'selected':''}>Médio</option>
          <option value="Alto"   ${r.imp==='Alto'   ?'selected':''}>Alto</option>
          <option value="Critico"${r.imp==='Critico'?'selected':''}>Crítico</option>
        </select>
      </div>
    </div>
    <div class="btn-row">
      <button type="button" class="btn" onclick="this.closest('div[style*=fixed]').remove()">Cancelar</button>
      <button type="button" class="btn btn-p" onclick="salvarEdicaoRisco(${i},this)">Salvar →</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
}
function salvarEdicaoRisco(i,el){
  const desc=document.getElementById('er-desc')?.value.trim();
  const prob=document.getElementById('er-prob')?.value;
  const imp=document.getElementById('er-imp')?.value;
  if(!desc){toast('A descrição não pode ficar em branco.','var(--amber)');return;}
  const r=curProc.ent.riscos[i];
  r.desc=desc;r.prob=prob;r.imp=imp;
  el.closest('div[style*=fixed]').remove();
  atualizarRiscoUI();
  fbAutoSave('editarRisco');
}
function addRisco(){
  const desc=document.getElementById('rd')?.value.trim(),prob=document.getElementById('rp')?.value,imp=document.getElementById('ri')?.value;
  if(!desc||!prob||!imp){toast('Preencha descrição, probabilidade e impacto.','var(--amber)');return;}
  if(!curProc.ent.riscos)curProc.ent.riscos=[];
  curProc.ent.riscos.push({desc,prob,imp});
  document.getElementById('rd').value='';document.getElementById('rp').value='';document.getElementById('ri').value='';
  atualizarRiscoUI();
}
function remR(i){if(!curProc?.ent?.riscos){return;} curProc.ent.riscos.splice(i,1);atualizarRiscoUI();}

// ═══════════════════════════════════════════
// ARQUITETURA DE PROCESSOS
// ═══════════════════════════════════════════
function rArqPopulateFilters(){
  // Macroprocesso
  const mSel = document.getElementById('arq-f-macro');
  if(mSel){
    const cur = mSel.value;
    mSel.innerHTML = '<option value="">Todos</option>' +
      ARQUITETURA.map(m=>`<option ${cur===m.nome?'selected':''}>${m.nome}</option>`).join('');
  }
  // Área — collect from all processos and subprocessos
  const areas = new Set();
  const objEs = new Set();
  // Split by ";" since many processes have multiple strategic objectives
  function addObje(val){
    if(!val) return;
    val.split(';').map(s=>s.trim()).filter(Boolean).forEach(o=>objEs.add(o));
  }
  ARQUITETURA.forEach(m=>m.processos.forEach(p=>{
    if(p.area) areas.add(p.area);
    addObje(p.objetivo_estrategico);
    (p.subprocessos||[]).forEach(s=>{
      if(s.area) areas.add(s.area);
      addObje(s.objetivo_estrategico);
    });
  }));
  const aSel = document.getElementById('arq-f-area');
  if(aSel){
    const cur = aSel.value;
    aSel.innerHTML = '<option value="">Todas</option>' +
      [...areas].sort().map(a=>`<option ${cur===a?'selected':''}>${a}</option>`).join('');
  }
  const oSel = document.getElementById('arq-f-obje');
  if(oSel){
    const cur = oSel.value;
    oSel.innerHTML = '<option value="">Todos</option>' +
      [...objEs].sort().map(o=>`<option ${cur===o?'selected':''} title="${o}">${o.length>40?o.slice(0,40)+'…':o}</option>`).join('');
  }
}

function getArqFilters(){
  return {
    srch:  (document.getElementById('arq-srch')?.value||'').toLowerCase().trim(),
    macro: document.getElementById('arq-f-macro')?.value||'',
    area:  document.getElementById('arq-f-area')?.value||'',
    nat:   document.getElementById('arq-f-nat')?.value||'',
    obje:  document.getElementById('arq-f-obje')?.value||'',
    mapeado: document.getElementById('arq-f-map')?.value||'',
    critico: document.getElementById('arq-f-crit')?.value||'',
  };
}

// Returns true if a process/subprocesso matches current filters
function itemMatchesFilters(item, macroNome, f){
  if(f.area  && item.area  !== f.area)  return false;
  if(f.nat   && (item.natureza||'').toLowerCase() !== f.nat.toLowerCase()) return false;
  if(f.obje  && !(item.objetivo_estrategico||'').includes(f.obje)) return false;
  if(f.mapeado === 'sim' && !isMapeado(item.id)) return false;
  if(f.mapeado === 'nao' && isMapeado(item.id))  return false;
  if(f.critico === 'sim' && !isCritico(item.id)) return false;
  if(f.critico === 'nao' && isCritico(item.id))  return false;
  if(f.srch){
    const hay = [item.nome, item.area, item.gerente, item.objetivo,
                 item.objetivo_estrategico, item.clientes, macroNome]
                 .join(' ').toLowerCase();
    if(!hay.includes(f.srch)) return false;
  }
  return true;
}

function limparFiltrosArq(){
  ['arq-srch','arq-f-macro','arq-f-area','arq-f-nat','arq-f-obje','arq-f-map','arq-f-crit'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value = '';
  });
  rArq();
}

// ═══════════════════════════════════════════
// MÓDULO: BASE DE FAQs
// ═══════════════════════════════════════════
function _parseFaq(texto){
  // Converte texto no formato "P: ...\nR: ..." em array de {p, r}
  if(!texto || !texto.trim()) return [];
  return texto.split(/\n(?=P:|P\s*:)/i).filter(b=>b.trim()).map(bloco => {
    let pergunta = '', resposta = '';
    for(const linha of bloco.split('\n')){
      if(/^P\s*:/i.test(linha))      pergunta = linha.replace(/^P\s*:\s*/i,'').trim();
      else if(/^R\s*:/i.test(linha)) resposta = linha.replace(/^R\s*:\s*/i,'').trim();
      else if(resposta)              resposta += ' ' + linha.trim();
    }
    return pergunta ? {p: pergunta, r: resposta} : null;
  }).filter(Boolean);
}

function _rFaqHl(txt, srch){
  if(!srch) return esc(txt);
  return esc(txt).replaceAll(new RegExp('('+srch.replaceAll(/[.*+?^${}()|[\]\\]/g,String.raw`\$&`)+')','gi'),
    '<mark style="background:#fff176;border-radius:2px;padding:0 1px">$1</mark>');
}
function _rFaqItemHTML({p, r}, srch){
  return `<div style="padding:.7rem 0;border-bottom:1px solid var(--bdr)">
    <div style="font-weight:600;font-size:13px;color:var(--ink);margin-bottom:.3rem">❓ ${_rFaqHl(p, srch)}</div>
    ${r ? `<div style="font-size:12.5px;color:var(--ink2);line-height:1.6;padding-left:1.1rem">${_rFaqHl(r, srch)}</div>` : ''}
  </div>`;
}
function _rFaqProcHTML(procNome, pares, srch){
  return `
    <div style="margin-bottom:1rem">
      <div style="font-size:12px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.5rem;display:flex;align-items:center;gap:6px">
        <svg viewBox="0 0 16 16" fill="none" style="width:13px;height:13px"><path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        ${esc(procNome)}
        <span style="font-size:10px;font-weight:400;color:var(--ink3);text-transform:none;letter-spacing:0">${pares.length} pergunta${pares.length===1?'':'s'}</span>
      </div>
      <div style="background:var(--surf);border:1px solid var(--bdr);border-radius:var(--r);padding:.2rem 1rem">${pares.map(par=>_rFaqItemHTML(par, srch)).join('')}</div>
    </div>`;
}
function _rFaqMacroHTML(macro, procs, srch){
  const procHtml = Object.keys(procs).sort().map(nome => _rFaqProcHTML(nome, procs[nome], srch)).join('');
  return `
    <div style="margin-bottom:1.8rem">
      <div style="font-size:11px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.8px;margin-bottom:.8rem;padding-bottom:.4rem;border-bottom:2px solid var(--blue)">
        📂 ${esc(macro)}
      </div>
      ${procHtml}
    </div>`;
}
function rFaq(){
  const container = document.getElementById('faq-c');
  const cntEl     = document.getElementById('faq-result-cnt');
  const macroSel  = document.getElementById('faq-f-macro');
  if(!container) return;

  const srch      = (document.getElementById('faq-srch')?.value||'').toLowerCase().trim();
  const filtMacro = macroSel?.value || '';

  // Coleta todos os processos que têm FAQ preenchida
  const todos = processos.filter(p => p.form?.faq && p.form.faq.trim());

  // Preenche select de macroprocessos na primeira execução
  if(macroSel && macroSel.options.length <= 1){
    const macros = [...new Set(todos.map(p=>p.macro||'').filter(Boolean))].sort();
    const macroAtual = macroSel.value;
    macros.forEach(m=>{
      const opt = document.createElement('option');
      opt.value = m; opt.textContent = m;
      macroSel.appendChild(opt);
    });
    if(macroAtual) macroSel.value = macroAtual;
  }

  // Agrupa por macro > processo, aplica filtros
  const grupos = {};
  let totalPerguntas = 0;

  for(const proc of todos){
    const macro = proc.macro || '(Sem macroprocesso)';
    if(filtMacro && macro !== filtMacro) continue;

    const pares = _parseFaq(proc.form.faq);
    const paresFiltrados = srch
      ? pares.filter(({p,r})=>(p+' '+r).toLowerCase().includes(srch))
      : pares;

    if(!paresFiltrados.length) continue;

    if(!grupos[macro]) grupos[macro] = {};
    if(!grupos[macro][proc.nome]) grupos[macro][proc.nome] = [];
    grupos[macro][proc.nome].push(...paresFiltrados);
    totalPerguntas += paresFiltrados.length;
  }

  const pergPlural = totalPerguntas===1 ? '' : 's';
  if(cntEl) cntEl.textContent = totalPerguntas
    ? `${totalPerguntas} pergunta${pergPlural} encontrada${pergPlural}`
    : '';

  if(!Object.keys(grupos).length){
    container.innerHTML = `<div class="ib ibb">${srch||filtMacro ? 'Nenhuma FAQ encontrada para os filtros aplicados.' : 'Nenhum processo possui FAQ cadastrada ainda.'}</div>`;
    return;
  }

  container.innerHTML = Object.keys(grupos).sort().map(macro => _rFaqMacroHTML(macro, grupos[macro], srch)).join('');
}

function rArq(){
  aplicarPermissoes();
  rArqPopulateFilters();
  const el = document.getElementById('arq-content');
  if(!el) return;

  if(!ARQUITETURA.length){
    el.innerHTML='<div class="ib ibb">Nenhum macroprocesso cadastrado. Importe uma planilha ou clique em "+ Macroprocesso".</div>';
    return;
  }

  // Métricas no topo da arquitetura
  const mx=getMetricasArq();
  const pct=mx.nUnid>0?Math.round(mx.nMap/mx.nUnid*100):0;
  let pctColor;
  if(pct>=80) pctColor='var(--teal)';
  else if(pct>=50) pctColor='var(--amber)';
  else pctColor='var(--red)';
  document.getElementById('arq-sub').innerHTML=
    `${mx.nMacros} macroprocesso${mx.nMacros===1?'':'s'} · ${mx.nProc} processo${mx.nProc===1?'':'s'} · ${mx.nSub} subprocesso${mx.nSub===1?'':'s'} &nbsp;—&nbsp; `+
    `<strong style="color:${pctColor}">${pct}% mapeados</strong> (${mx.nMap}/${mx.nUnid})`;

  const f = getArqFilters();
  const hasFilter = f.srch || f.macro || f.area || f.nat || f.obje || f.mapeado || f.critico;

  // Hide import hint when filtering
  const hint = document.getElementById('arq-import-hint');
  if(hint) hint.style.display = hasFilter ? 'none' : '';

  if(!hasFilter){
    // Normal tree view
    el.innerHTML = ARQUITETURA.map(m=>macroArqHTML(m)).join('');
    document.getElementById('arq-result-cnt').textContent = '';
    document.getElementById('arq-sub').textContent = 'Macroprocesso → Processo → Subprocesso';
    return;
  }

  // Filter mode — flat list of matching items
  const results = [];
  ARQUITETURA.forEach(m=>{
    if(f.macro && m.nome !== f.macro) return;
    m.processos.forEach(p=>{
      const hasSubs = p.subprocessos && p.subprocessos.length > 0;
      if(hasSubs){
        p.subprocessos.forEach(s=>{
          if(itemMatchesFilters(s, m.nome, f)){
            results.push({item:s, macroNome:m.nome, procNome:p.nome, macroId:m.id, procId:p.id, isSub:true});
          }
        });
      } else if(itemMatchesFilters(p, m.nome, f)){
          results.push({item:p, macroNome:m.nome, procNome:null, macroId:m.id, procId:p.id, isSub:false});
        }
    });
  });

  const cnt = document.getElementById('arq-result-cnt');
  if(cnt) cnt.textContent = results.length + ' resultado' + (results.length===1?'':'s') + ' encontrado' + (results.length===1?'':'s');

  const sub = document.getElementById('arq-sub');
  if(sub) sub.textContent = 'Resultados da busca';

  if(!results.length){
    el.innerHTML = '<div class="ib iba">Nenhum processo encontrado com os filtros selecionados.</div>';
    return;
  }

  // Group by macroprocesso for display
  const grupos = {};
  results.forEach(r=>{
    if(!grupos[r.macroNome]) grupos[r.macroNome] = [];
    grupos[r.macroNome].push(r);
  });

  el.innerHTML = Object.entries(grupos).map(([macroNome, items])=>`
    <div class="arq-macro" style="margin-bottom:.8rem">
      <div class="arq-macro-hd" style="cursor:default">
        <span class="arq-macro-nome">${macroNome}</span>
        <span style="font-size:11px;color:rgba(255,255,255,.4)">${items.length} resultado${items.length===1?'':'s'}</span>
      </div>
      <div class="arq-macro-body">
        ${items.map(r=>resultCardHTML(r, f.srch)).join('')}
      </div>
    </div>`).join('');
}

function highlight(text, srch){
  if(!srch || !text) return text || '—';
  const escaped = srch.replaceAll(/[-.*+?^${}()|[\]\\]/g,String.raw`\$&`); const re = new RegExp('('+escaped+')', 'gi');
  return text.replaceAll(re, '<mark style="background:var(--amber-l);color:var(--amber);padding:0 2px;border-radius:2px">$1</mark>');
}

function resultCardHTML(r, srch){
  const item = r.item;
  const proc = processos.find(pr=>pr.arq_id===item.id)||null;
  const path = r.isSub ? `${r.macroNome} › ${r.procNome} › ${item.nome}` : `${r.macroNome} › ${item.nome}`;

  return `<div style="background:var(--surf);border:1px solid var(--bdr);border-radius:var(--r);padding:.8rem 1rem;margin-bottom:.5rem">
    <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:.5rem;flex-wrap:wrap">
      <div style="flex:1">
        <div style="font-size:11px;color:var(--ink3);margin-bottom:2px">${highlight(path, srch)}</div>
        <div style="font-size:13px;font-weight:600;color:var(--ink)">${highlight(item.nome, srch)}</div>
      </div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;flex-shrink:0">
        ${item.natureza ? `<span class="badge bgr" style="font-size:10px">${highlight(item.natureza, srch)}</span>` : ''}
        ${proc ? `<span class="badge ${EBADGE[proc.etapa]||'bgr'}" style="font-size:10px">${etLb(proc.etapa)}</span>` : '<span class="badge bgr" style="font-size:10px">Não mapeado</span>'}
        ${proc ? `<button type="button" class="btn btn-p" style="font-size:10px;padding:2px 8px" onclick="abrirProc(${proc.id})">Abrir →</button>` : ''}
        ${isEP() ? `<button type="button" class="btn" style="font-size:10px;padding:2px 8px" onclick="editSubArqFull('${r.macroId}','${r.procId}','${item.id}')" aria-label="Editar item">✎</button>` : ''}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;font-size:11px">
      ${item.area ? `<div><span style="font-weight:600;color:var(--ink2)">Área:</span> <span style="color:var(--ink3)">${highlight(item.area, srch)}</span></div>` : ''}
      ${item.gerente ? `<div><span style="font-weight:600;color:var(--ink2)">Gerente:</span> <span style="color:var(--ink3)">${highlight(item.gerente, srch)}</span></div>` : ''}
      ${item.objetivo_estrategico ? `<div style="grid-column:span 2"><span style="font-weight:600;color:var(--ink2)">Obj. estratégico:</span> <span style="color:var(--ink3)">${highlight(item.objetivo_estrategico, srch)}</span></div>` : ''}
      ${item.objetivo ? `<div style="grid-column:span 3"><span style="font-weight:600;color:var(--ink2)">Objetivo:</span> <span style="color:var(--ink3)">${highlight(item.objetivo, srch)}</span></div>` : ''}
    </div>
  </div>`;
}
function macroArqHTML(m){
  const tc=m.processos.length;
  const ts=m.processos.reduce((a,p)=>a+(p.subprocessos||[]).length,0);
  const tenhoAqui = usuarioLogado && usuarioLogado.perfil!=='ep' && getMinhasUnidades().some(u=>
    m.processos.some(p=>p.id===u.arq_id || (p.subprocessos||[]).some(s=>s.id===u.arq_id))
  );
  return `<div class="arq-macro" style="${tenhoAqui?'border:1px solid var(--teal-b)':''}">
    <div class="arq-macro-hd" onclick="toggleEl('arq-body-${m.id}','chv-${m.id}')" style="${tenhoAqui?'background:var(--teal)':''}">
      <span class="arq-chevron" id="chv-${m.id}">▶</span>
      <span class="arq-macro-nome">${m.nome}</span>
      ${tenhoAqui?'<span style="font-size:10px;background:rgba(255,255,255,.2);border-radius:4px;padding:1px 7px;font-weight:700">Meus processos</span>':''}
      <span style="font-size:11px;color:rgba(255,255,255,.4)">${tc} processo${tc===1?'':'s'} · ${ts} subprocesso${ts===1?'':'s'}</span>
      ${isEP()?`<button type="button" class="btn" style="font-size:10px;padding:2px 8px;background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2);color:#fff" onclick="event.stopPropagation();novoProcArq('${m.id}')">+ Processo</button>
      <button type="button" class="btn" style="font-size:10px;padding:2px 8px;background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.15);color:rgba(255,255,255,.5)" onclick="event.stopPropagation();editMacro('${m.id}')">✎ Renomear</button>
      <button type="button" class="btn" style="font-size:10px;padding:2px 8px;background:rgba(176,28,28,.3);border-color:rgba(242,160,160,.3);color:#F2A0A0" onclick="event.stopPropagation();removerMacro('${m.id}')">× Apagar</button>`:''}
    </div>
    <div class="arq-macro-body" id="arq-body-${m.id}" style="display:none">
      ${m.processos.map(p=>procArqHTML(m.id,p)).join('')}
      ${isEP()?`<button type="button" class="arq-add-btn" onclick="novoProcArq('${m.id}')">+ Adicionar processo</button>`:''}
    </div>
  </div>`;
}

function _procArqStatusBadge(p, hasSubs, linked){
  if(hasSubs) return `<span class="badge bgr" style="font-size:10px">Agrupador · ${p.subprocessos.length} subprocesso${p.subprocessos.length===1?'':'s'}</span>`;
  if(linked) return `<span class="badge ${EBADGE[linked.etapa]||'bgr'}" style="font-size:10px">${etLb(linked.etapa)}</span><button type="button" class="btn btn-p" style="font-size:10px;padding:2px 7px" onclick="event.stopPropagation();abrirProc(${linked.id})">Abrir</button>`;
  return isMapeado(p.id)
    ? `<span class="badge bg" style="font-size:10px">Mapeado</span>`
    : `<span class="badge bgr" style="font-size:10px">Não mapeado</span>`;
}
function _subArqItemHTML(mid, pid, s){
  const sl=s.proc_id?processos.find(pr=>pr.id===s.proc_id):null;
  const sMapeado = isMapeado(s.id);
  const sCritico = isCritico(s.id);
  const sMapeadoColor = sMapeado ? 'var(--red)' : 'var(--teal)';
  const sMapeadoLabel = sMapeado ? 'Desmarcar' : '✓ Mapeado';
  const sCriticoColor = sCritico ? '#dc2626' : 'var(--ink3)';
  const sCriticoLabel = sCritico ? 'Desmarcar crítico' : '⚠ Crítico';
  const slNoLink = sMapeado ? `<span class="badge bg" style="font-size:10px">Mapeado</span>` : `<span class="badge bgr" style="font-size:10px">Não mapeado</span>`;
  const slBadge=sl
    ?`<span class="badge ${EBADGE[sl.etapa]||'bgr'}" style="font-size:10px">${etLb(sl.etapa)}</span><button type="button" class="btn btn-p" style="font-size:10px;padding:2px 6px" onclick="event.stopPropagation();abrirProc(${sl.id})">Abrir mapeamento</button>`
    : slNoLink;
  return `<div style="border-top:1px solid var(--bdr)">
    <div style="display:flex;align-items:center;gap:8px;padding:.5rem .9rem;cursor:pointer" onclick="toggleEl('arq-ssub-${s.id}','chvss-${s.id}')">
      <span class="arq-chevron" id="chvss-${s.id}" style="color:var(--ink3);font-size:10px">▶</span>
      <span style="font-size:12.5px;font-weight:600;color:var(--ink);flex:1">${s.nome}</span>
      <span style="font-size:11px;color:var(--ink3)">${s.gerente||s.area||''}</span>
      ${isMeuProcesso(s.id)?'<span class="badge bb" style="font-size:9px">Meu processo</span>':''}
      ${slBadge}
      ${isEP()?`<button type="button" class="btn" style="font-size:10px;padding:2px 7px;color:${sMapeadoColor}" onclick="toggleMapeadoManual('${s.id}',event)">${sMapeadoLabel}</button>`:''}
      ${sCritico?`<span class="badge" style="font-size:10px;background:#dc2626;color:#fff;padding:2px 6px;border-radius:4px">⚠ Crítico</span>`:''}
      ${isEP()?`<button type="button" class="btn" style="font-size:10px;padding:2px 7px;color:${sCriticoColor}" onclick="toggleCriticoManual('${s.id}',event)">${sCriticoLabel}</button>`:''}
      ${isEP()?`<button type="button" class="btn" style="font-size:10px;padding:2px 7px" onclick="event.stopPropagation();editSubArqFull('${mid}','${pid}','${s.id}')">✎ Editar</button>
      <button type="button" class="btn" style="font-size:10px;padding:2px 6px;color:var(--red)" onclick="event.stopPropagation();remSubArq('${mid}','${pid}','${s.id}')" aria-label="Remover subprocesso">×</button>`:''}
    </div>
    <div id="arq-ssub-${s.id}" style="display:none;padding:.6rem 1.2rem .8rem 2.2rem;background:var(--surf);border-top:1px dashed var(--bdr)">
      ${metaFieldsReadonly(s)}
    </div>
  </div>`;
}
function procArqHTML(mid,p){
  const hasSubs = p.subprocessos && p.subprocessos.length > 0;
  const linked = !hasSubs && p.proc_id ? processos.find(pr=>pr.id===p.proc_id) : null;
  const addSubBtnBlock = isEP() ? `<div style="padding:.5rem .8rem"><button type="button" class="arq-add-btn" onclick="novoSubArq('${mid}','${p.id}')">+ Adicionar subprocesso</button></div>` : '';
  const addSubBtnInline = isEP() ? `<button type="button" class="arq-add-btn" style="margin-top:4px" onclick="novoSubArq('${mid}','${p.id}')">+ Adicionar subprocesso</button>` : '';
  const bodyHTML = hasSubs
    ? `<div style="padding:.5rem .8rem .2rem"><div class="ib ibsl" style="font-size:11px;margin-bottom:.5rem">Processo agrupador — os subprocessos abaixo são as unidades mapeáveis individualmente.</div></div>
       ${p.subprocessos.map(s=>_subArqItemHTML(mid,p.id,s)).join('')}
       ${addSubBtnBlock}`
    : `<div style="padding:.6rem .9rem .8rem">${metaFieldsReadonly(p)}${addSubBtnInline}</div>`;
  const pMapeado = isMapeado(p.id);
  const pCritico = isCritico(p.id);
  const pMapeadoColor = pMapeado ? 'var(--red)' : 'var(--teal)';
  const pMapeadoLabel = pMapeado ? 'Desmarcar mapeado' : '✓ Mapeado';
  const pCriticoColor = pCritico ? '#dc2626' : 'var(--ink3)';
  const pCriticoLabel = pCritico ? 'Desmarcar crítico' : '⚠ Crítico';
  return `<div style="margin-bottom:.5rem">
    <div class="arq-proc-hd" onclick="toggleEl('arq-sub-${p.id}','chvp-${p.id}')">
      <span class="arq-chevron" id="chvp-${p.id}" style="color:var(--ink3)">▶</span>
      <span style="font-size:13px;font-weight:600;color:var(--ink);flex:1">${p.nome}</span>
      <span style="font-size:11px;color:var(--ink3)">${p.area||''} · ${p.gerente||''}</span>
      ${_procArqStatusBadge(p, hasSubs, linked)}
      ${isEP()&&!hasSubs?`<button type="button" class="btn" style="font-size:10px;padding:2px 7px;color:${pMapeadoColor}" onclick="toggleMapeadoManual('${p.id}',event)">${pMapeadoLabel}</button>`:''}
      ${!hasSubs&&pCritico?`<span class="badge" style="font-size:10px;background:#dc2626;color:#fff;padding:2px 6px;border-radius:4px">⚠ Crítico</span>`:''}
      ${isEP()&&!hasSubs?`<button type="button" class="btn" style="font-size:10px;padding:2px 7px;color:${pCriticoColor}" onclick="toggleCriticoManual('${p.id}',event)">${pCriticoLabel}</button>`:''}
      ${isEP()?`<button type="button" class="btn" style="font-size:10px;padding:2px 7px" onclick="event.stopPropagation();novoSubArq('${mid}','${p.id}')">+ Sub</button>
      <button type="button" class="btn" style="font-size:10px;padding:2px 7px" onclick="event.stopPropagation();editProcArq('${mid}','${p.id}')">✎ Editar</button>
      <button type="button" class="btn" style="font-size:10px;padding:2px 7px;color:var(--red);border-color:var(--red-b)" onclick="event.stopPropagation();removerProcArq('${mid}','${p.id}')">× Apagar</button>`:''}
    </div>
    <div id="arq-sub-${p.id}" style="display:none;background:var(--surf2);border:1px solid var(--bdr);border-top:none;border-radius:0 0 var(--r) var(--r)">
      ${bodyHTML}
    </div>
  </div>`;
}

function _metaFieldsProgBar(proc){
  const etIdx_ = etIdx(proc.etapa);
  return ETAPAS.slice(0,etIdx_+1).map((e,i)=>{
    let barBg;
    if(i<etIdx_) barBg='var(--teal)';
    else if(i===etIdx_) barBg='var(--blue)';
    else barBg='var(--bg3)';
    return `<span title="${e.lb}" style="flex:1;height:4px;border-radius:2px;background:${barBg}"></span>`;
  }).join('') + ETAPAS.slice(etIdx_+1).map(()=>
    `<span style="flex:1;height:4px;border-radius:2px;background:var(--bg3)"></span>`
  ).join('');
}
function _metaFieldsMapeamentoHTML(item, proc){
  const ML_ = ['','Inicial','Repetível','Definido','Gerenciado','Otimizado'];
  const analise = proc.ent?.analise;
  const matNivel = proc.ent?.mat||0;
  const progBar = _metaFieldsProgBar(proc);
  const opElipsis = analise&&analise.oportunidades&&analise.oportunidades.length>2 ? ' …' : '';
  return `
  <div style="margin-top:.8rem;padding-top:.8rem;border-top:1px solid var(--bdr)">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:.5rem;flex-wrap:wrap">
      <span style="font-size:11px;font-weight:600;color:var(--ink2)">Mapeamento vinculado</span>
      <span class="badge ${EBADGE[proc.etapa]||'bgr'}" style="font-size:10px">${etLb(proc.etapa)}</span>
      <span class="badge ${FASE_COR[etFase(proc.etapa)]||'bgr'}" style="font-size:10px">${etFase(proc.etapa)}</span>
      <button type="button" class="btn btn-p" style="font-size:10px;padding:2px 8px;margin-left:auto" onclick="abrirProc(${proc.id})">Abrir mapeamento →</button>
      <button type="button" class="btn" style="font-size:10px;padding:2px 8px" onclick="verFluxoBizagi('${item.id}',event)">🗺 Ver fluxo Bizagi</button>
      ${isEP()?`<label class="btn" style="font-size:10px;padding:2px 8px;cursor:pointer" title="Carregar imagem de fluxo Bizagi">📎 Alterar imagem<input type="file" accept="image/*" style="display:none" onchange="uploadFluxoArq('${item.id}',this)"></label>`:''}
    </div>
    <div style="display:flex;gap:2px;margin-bottom:.6rem">${progBar}</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;font-size:11px">
      <div><span style="font-weight:600;color:var(--ink2)">Dono:</span> <span style="color:var(--ink3)">${proc.dono||'—'}</span></div>
      <div><span style="font-weight:600;color:var(--ink2)">Resp. EP:</span> <span style="color:var(--ink3)">${proc.resp_ep||'—'}</span></div>
      <div><span style="font-weight:600;color:var(--ink2)">Maturidade:</span> <span style="color:var(--ink3)">${matNivel?matNivel+'/5 — '+ML_[matNivel]:'Não avaliada'}</span></div>
      ${proc.ent?.dt_inicio?`<div><span style="font-weight:600;color:var(--ink2)">Início:</span> <span style="color:var(--ink3)">${proc.ent.dt_inicio}</span></div>`:''}
      ${proc.ent?.dt_prev?`<div><span style="font-weight:600;color:var(--ink2)">Previsão:</span> <span style="color:var(--ink3)">${proc.ent.dt_prev}</span></div>`:''}
      ${proc.produto?`<div><span style="font-weight:600;color:var(--ink2)">Produto:</span> <span style="color:var(--ink3)">${proc.produto}</span></div>`:''}
    </div>
    ${analise&&analise.gargalos?.length?`<div style="margin-top:.5rem;font-size:11px"><span style="font-weight:600;color:var(--red)">Gargalos:</span> <span style="color:var(--ink3)">${analise.gargalos.join(' · ')}</span></div>`:''}
    ${analise&&analise.oportunidades?.length?`<div style="margin-top:3px;font-size:11px"><span style="font-weight:600;color:var(--green)">Oportunidades:</span> <span style="color:var(--ink3)">${analise.oportunidades.slice(0,2).join(' · ')}${opElipsis}</span></div>`:''}
  </div>`;
}
// Render metadata fields read-only (expandable view) + linked mapeamento data
function metaFieldsReadonly(item){
  const fields=[
    ['Natureza',item.natureza],['Área',item.area],['Gerente',item.gerente],
    ['Objetivo',item.objetivo],['Objetivo estratégico',item.objetivo_estrategico],
    ['Entradas',item.entradas],['Entregas',item.entregas],
    ['Clientes',item.clientes],['Documentações/Regulamentações',item.docs],
  ];
  const metaHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px">
    ${fields.map(([l,v])=>v?`<div style="font-size:11px"><span style="font-weight:600;color:var(--ink2)">${l}:</span> <span style="color:var(--ink3)">${v}</span></div>`:'').join('')}
  </div>`;
  const proc = processos.find(pr=>pr.arq_id===item.id);
  if(!proc) return metaHTML;
  return metaHTML + _metaFieldsMapeamentoHTML(item, proc);
}

// Edit full metadata of a PROCESS (no subs)
function editProcArq(mid, pid){
  if(!isEP()){toast('Ação restrita ao EP.','var(--amber)');return;}
  const m=ARQUITETURA.find(x=>x.id===mid);
  const p=m?.processos.find(x=>x.id===pid);
  if(!p)return;
  if(p.subprocessos&&p.subprocessos.length>0){
    // Agrupador — use modal meta
    abrirModalMeta(p, ()=>{ rArq(); fbAutoSave('editProcArq'); });
    return;
  }
  abrirModalMeta(p, ()=>rArq());
}

// Edit full metadata of a SUBPROCESSO
function editSubArqFull(mid, pid, sid){
  const m=ARQUITETURA.find(x=>x.id===mid);
  const p=m?.processos.find(x=>x.id===pid);
  const s=p?.subprocessos?.find(x=>x.id===sid);
  if(!s)return;
  abrirModalMeta(s, ()=>rArq());
}

// Modal genérico de edição de metadados
function abrirModalMeta(item, onSave){
  // Remove existing modal if any
  document.getElementById('meta-modal')?.remove();
  const modal=document.createElement('div');
  modal.id='meta-modal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:500;display:flex;align-items:center;justify-content:center;padding:1rem';
  modal.innerHTML=`<div style="background:var(--surf);border-radius:var(--rl);padding:1.5rem;width:100%;max-width:680px;max-height:90vh;overflow-y:auto;box-shadow:var(--sh2)">
    <div style="font-family:var(--fh);font-size:16px;font-weight:600;margin-bottom:1rem">Editar dados do processo/subprocesso</div>
    <div class="fg"><label class="fl">Nome<span>*</span></label><input class="fi" id="mm-nome" value="${item.nome||''}"></div>
    <div class="g3">
      <div class="fg"><label class="fl">Natureza</label>
        <select class="fi" id="mm-nat">
          ${['','Finalístico','Suporte','Gestão','Controle'].map(n=>`<option ${item.natureza===n?'selected':''}>${n}</option>`).join('')}
        </select>
      </div>
      <div class="fg"><label class="fl">Área</label><input class="fi" id="mm-area" value="${item.area||''}"></div>
      <div class="fg"><label class="fl">Gerente do processo</label><input class="fi" id="mm-ger" value="${item.gerente||''}"></div>
    </div>
    <div class="fg"><label class="fl">Objetivo do processo</label><textarea class="fi" id="mm-obj" style="min-height:60px">${item.objetivo||''}</textarea></div>
    <div class="fg"><label class="fl">Objetivo estratégico</label><input class="fi" id="mm-obje" value="${item.objetivo_estrategico||''}"></div>
    <div class="g2">
      <div class="fg"><label class="fl">Entradas do processo</label><textarea class="fi" id="mm-ent" style="min-height:55px">${item.entradas||''}</textarea></div>
      <div class="fg"><label class="fl">Entregas do processo</label><textarea class="fi" id="mm-entr" style="min-height:55px">${item.entregas||''}</textarea></div>
    </div>
    <div class="fg"><label class="fl">Clientes do processo</label><input class="fi" id="mm-cli" value="${item.clientes||''}"></div>
    <div class="fg"><label class="fl">Documentações e regulamentações</label><textarea class="fi" id="mm-docs" style="min-height:55px">${item.docs||''}</textarea></div>
    <div class="btn-row">
      <button type="button" class="btn" onclick="document.getElementById('meta-modal').remove()">Cancelar</button>
      <button type="button" class="btn btn-p" onclick="salvarModalMeta()">Salvar</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  // Store reference to item
  modal._item=item;
  modal._onSave=onSave;
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
}

function salvarModalMeta(){
  const modal=document.getElementById('meta-modal');
  if(!modal)return;
  const item=modal._item;
  item.nome=document.getElementById('mm-nome').value.trim()||item.nome;
  item.natureza=document.getElementById('mm-nat').value;
  item.area=document.getElementById('mm-area').value.trim();
  item.gerente=document.getElementById('mm-ger').value.trim();
  item.objetivo=document.getElementById('mm-obj').value.trim();
  item.objetivo_estrategico=document.getElementById('mm-obje').value.trim();
  item.entradas=document.getElementById('mm-ent').value.trim();
  item.entregas=document.getElementById('mm-entr').value.trim();
  item.clientes=document.getElementById('mm-cli').value.trim();
  item.docs=document.getElementById('mm-docs').value.trim();
  if(modal._onSave)modal._onSave();
  modal.remove();
  fbAutoSave('salvarMeta');
  toast('Dados atualizados');
}

// ── Modal simples para pedir um nome (substitui prompt()) ─────────────────────
function _pedirNome(titulo, valorAtual, fn){
  const modal=document.createElement('div');
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:600;display:flex;align-items:center;justify-content:center;padding:1rem';
  modal.innerHTML=`<div style="background:var(--surf);border-radius:var(--rl);padding:1.4rem;width:100%;max-width:380px;box-shadow:var(--sh2)">
    <div style="font-family:var(--fh);font-size:15px;font-weight:600;margin-bottom:.9rem">${esc(titulo)}</div>
    <input class="fi" id="_pn-inp" value="${esc(valorAtual)}" placeholder="Nome..." style="width:100%;margin-bottom:1rem">
    <div class="btn-row">
      <button type="button" class="btn" onclick="document.getElementById('_pn-inp')?.closest('[data-pnm]')?.remove()">Cancelar</button>
      <button type="button" class="btn btn-p" id="_pn-ok">Salvar</button>
    </div>
  </div>`;
  modal.dataset.pnm='1';
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
  document.body.appendChild(modal);
  const inp=document.getElementById('_pn-inp');
  inp?.focus();
  inp?.addEventListener('keydown',e=>{
    if(e.key==='Enter') document.getElementById('_pn-ok')?.click();
    if(e.key==='Escape') modal.remove();
  });
  document.getElementById('_pn-ok').onclick=()=>{
    const val=(document.getElementById('_pn-inp')?.value||'').trim();
    if(!val){toast('Informe o nome.','var(--amber)');return;}
    modal.remove();
    fn(val);
  };
}

function toggleEl(id,chvId){
  const el=document.getElementById(id),chv=document.getElementById(chvId);
  if(!el){return;}const open=el.style.display!=='none';
  el.style.display=open?'none':'block';
  if(chv){chv.classList.toggle('open',!open);}
}
function novoMacro(){
  if(!isEP()){toast('Ação restrita ao EP.','var(--amber)');return;}
  _pedirNome('Novo macroprocesso','',nome=>{
    ARQUITETURA.push({id:'m'+arqIdC++,nome,processos:[]});
    rArq();
    fbAutoSave('novoMacro');
  });
}

function removerMacro(mid){
  if(!isEP()){toast('Ação restrita ao EP.','var(--amber)');return;}
  const m=ARQUITETURA.find(x=>x.id===mid);
  if(!m)return;
  const aviso = 'Apagar macroprocesso "' + m.nome + '"? Esta acao nao pode ser desfeita.';
  confirmar(aviso, () => {
    // Break links in processos[]
    m.processos.forEach(p=>{
      const ids = p.subprocessos&&p.subprocessos.length>0 ? p.subprocessos.map(s=>s.id) : [p.id];
      ids.forEach(id=>{ const pr=processos.find(x=>x.arq_id===id); if(pr) pr.arq_id=null; });
    });
    ARQUITETURA=ARQUITETURA.filter(x=>x.id!==mid);
    fbAutoSave('removerMacro');
    rArq();
    toast('Macroprocesso removido','var(--amber)');
  });
}

function removerProcArq(mid, pid){
  if(!isEP()){toast('Ação restrita ao EP.','var(--amber)');return;}
  const m=ARQUITETURA.find(x=>x.id===mid);
  const p=m?.processos.find(x=>x.id===pid);
  if(!p)return;
  const hasSubs = p.subprocessos&&p.subprocessos.length>0;
  const aviso = 'Apagar processo "' + p.nome + '"? Esta acao nao pode ser desfeita.';
  confirmar(aviso, () => {
    // Break links
    const ids = hasSubs ? p.subprocessos.map(s=>s.id) : [p.id];
    ids.forEach(id=>{ const pr=processos.find(x=>x.arq_id===id); if(pr) pr.arq_id=null; });
    m.processos=m.processos.filter(x=>x.id!==pid);
    fbAutoSave('removerProcArq');
    rArq();
    toast('Processo removido','var(--amber)');
  });
}
function editMacro(mid){
  const m=ARQUITETURA.find(x=>x.id===mid);
  if(!m) return;
  _pedirNome('Renomear macroprocesso',m.nome,nome=>{
    m.nome=nome;
    rArq();
    fbAutoSave('editMacro');
  });
}
function novoProcArq(mid){
  if(!isEP()){toast('Ação restrita ao EP.','var(--amber)');return;}
  const m=ARQUITETURA.find(x=>x.id===mid);if(!m)return;
  const newItem={id:'ap'+arqIdC++,nome:'',natureza:'',gerente:'',area:'',objetivo:'',objetivo_estrategico:'',entradas:'',entregas:'',clientes:'',docs:'',subprocessos:[],proc_id:null};
  abrirModalMeta(newItem, ()=>{
    if(!newItem.nome.trim()){toast('Informe o nome do processo.','var(--amber)');return;}
    m.processos.push(newItem);
    rArq();
    fbAutoSave('novoProcArq');
    setTimeout(()=>toggleEl('arq-body-'+mid,'chv-'+mid),50);
  });
}
function novoSubArq(mid,pid){
  if(!isEP()){toast('Ação restrita ao EP.','var(--amber)');return;}
  const m=ARQUITETURA.find(x=>x.id===mid);if(!m)return;
  const p=m.processos.find(x=>x.id===pid);if(!p)return;
  const newSub={id:'s'+arqIdC++,nome:'',natureza:'',area:'',gerente:'',objetivo:'',objetivo_estrategico:'',entradas:'',entregas:'',clientes:'',docs:''};
  abrirModalMeta(newSub, ()=>{
    if(!newSub.nome.trim()){toast('Informe o nome do subprocesso.','var(--amber)');return;}
    p.subprocessos.push(newSub);
    rArq();
    fbAutoSave('novoSubArq');
    setTimeout(()=>{toggleEl('arq-body-'+mid,'chv-'+mid);toggleEl('arq-sub-'+pid,'chvp-'+pid);},50);
  });
}
// editSubArq removida (dead code — alias sem chamador; use editSubArqFull())
function remSubArq(mid,pid,sid){
  confirmar('Remover subprocesso?', () => {
    const m=ARQUITETURA.find(x=>x.id===mid);const p=m?.processos.find(x=>x.id===pid);if(!p)return;
    p.subprocessos=p.subprocessos.filter(x=>x.id!==sid);rArq();
  });
}

// IMPORTAR EXCEL ARQUITETURA
async function importarArqExcel(input){
  if(!isEP()){toast('Ação restrita ao EP.','var(--amber)');return;}
  const file=input.files[0];if(!file)return;
  try{
      const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
      if(!rows.length){toast('Planilha vazia ou sem dados reconhecíveis.','var(--amber)');return;}
      // Normalize column name: lowercase, remove accents, collapse spaces
      function normCol(s){ return s.toString().normalize('NFD').replaceAll(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
      const allKeys = Object.keys(rows[0]);

      // Find column — exact match first, then includes
      function findCol(...variants){
        for(const v of variants){
          const nv = normCol(v);
          // Exact match first
          const exact = allKeys.find(k => normCol(k) === nv);
          if(exact) return exact;
        }
        for(const v of variants){
          const nv = normCol(v);
          // Partial match second
          const partial = allKeys.find(k => normCol(k).includes(nv));
          if(partial) return partial;
        }
        return null;
      }

      // Map columns — order matters: more specific first
      const cMacro  = findCol('macroprocesso');
      const cSub    = findCol('subprocessos','subprocesso');
      const cProc   = findCol('processo');  // after sub/macro so they don't steal it
      const cNat    = findCol('natureza');
      const cGer    = findCol('gerente do processo','gerente processo','gerente');
      const cArea   = findCol('area','área');
      const cObj    = findCol('objetivo do processo','objetivo processo');
      const cObje   = findCol('objetivos estrategicos','objetivo estrategico');
      const cEnt    = findCol('entradas do processo','entradas processo','entrada');
      const cEntr   = findCol('entregas do processo','entregas processo','entrega');
      const cCli    = findCol('clientes do processo','clientes processo','cliente');
      const cDocs   = findCol('documentacao e regulamentacoes','documentacao e regulamentacao','regulamentacao','documentacao');

      // Debug log — remove after confirming import works
      console.table({
        macro:  cMacro  || 'NAO ENCONTRADA',
        proc:   cProc   || 'NAO ENCONTRADA',
        sub:    cSub    || 'NAO ENCONTRADA',
        nat:    cNat    || 'NAO ENCONTRADA',
        ger:    cGer    || 'NAO ENCONTRADA',
        area:   cArea   || 'NAO ENCONTRADA',
        obj:    cObj    || 'NAO ENCONTRADA',
        obje:   cObje   || 'NAO ENCONTRADA',
        ent:    cEnt    || 'NAO ENCONTRADA',
        entr:   cEntr   || 'NAO ENCONTRADA',
        cli:    cCli    || 'NAO ENCONTRADA',
        docs:   cDocs   || 'NAO ENCONTRADA',
      });

      // Helper to get value safely
      function gv(row, col){ return col ? (row[col]||'').toString().trim() : ''; }

      let added=0;
      rows.forEach(row=>{
        const macro = gv(row, cMacro);
        const proc  = gv(row, cProc);
        if(!macro||!proc)return;

        let m=ARQUITETURA.find(x=>x.nome===macro);
        if(!m){m={id:'m'+arqIdC++,nome:macro,processos:[]};ARQUITETURA.push(m);}

        let p=m.processos.find(x=>x.nome===proc);
        if(!p){
          p={id:'ap'+arqIdC++,nome:proc,
            natureza:           gv(row,cNat) ? gv(row,cNat).charAt(0).toUpperCase()+gv(row,cNat).slice(1).toLowerCase() : '',
            gerente:            gv(row,cGer),
            area:               gv(row,cArea),
            objetivo:           gv(row,cObj),
            objetivo_estrategico: gv(row,cObje),
            entradas:           gv(row,cEnt),
            entregas:           gv(row,cEntr),
            clientes:           gv(row,cCli),
            docs:               gv(row,cDocs),
            subprocessos:[],proc_id:null};
          m.processos.push(p);added++;
        }

        const sub = gv(row, cSub);
        const subValido = sub && !/^n[ãa]o[\s\-_]*h[aá]/i.test(sub) && sub.toLowerCase()!=='nenhum' && sub.toLowerCase()!=='-' && sub.toLowerCase()!=='n/a';
        if(subValido && !p.subprocessos.some(s=>s.nome===sub)){
          p.subprocessos.push({
            id:'s'+arqIdC++, nome:sub,
            natureza:             gv(row,cNat) ? gv(row,cNat).charAt(0).toUpperCase()+gv(row,cNat).slice(1).toLowerCase() : '',
            gerente:              gv(row,cGer),
            area:                 gv(row,cArea),
            objetivo:             gv(row,cObj),
            objetivo_estrategico: gv(row,cObje),
            entradas:             gv(row,cEnt),
            entregas:             gv(row,cEntr),
            clientes:             gv(row,cCli),
            docs:                 gv(row,cDocs),
            proc_id:null
          });
        }
      });
      rArq();
      fbAutoSave('importarArq');
      toast('Importação concluída: '+added+' processo(s) adicionado(s)');
    }catch(err){toast('Erro ao ler planilha: '+err.message,'var(--red)');}
    input.value='';
}

// Retorna lista plana de todas as unidades mapeáveis da arquitetura
function getUnidadesMapeaveis(){
  const lista = [];
  ARQUITETURA.forEach(m=>{
    m.processos.forEach(p=>{
      if(p.subprocessos && p.subprocessos.length > 0){
        p.subprocessos.forEach(s=>{
          const proc = processos.find(pr=>pr.arq_id===s.id)||null;
          lista.push({arq_id:s.id, label:m.nome+' › '+p.nome+' › '+s.nome,
            nome:s.nome, gerente:s.gerente||p.gerente, area:s.area||p.area,
            macro:m.nome, proc, isSub:true, parentNome:p.nome});
        });
      } else {
        const proc = processos.find(pr=>pr.arq_id===p.id)||null;
        lista.push({arq_id:p.id, label:m.nome+' › '+p.nome,
          nome:p.nome, gerente:p.gerente, area:p.area,
          macro:m.nome, proc, isSub:false, parentNome:null});
      }
    });
  });
  return lista;
}

function isMapeado(arqId){
  if(mapeadosManual.has(arqId)) return true;
  const proc=processos.find(p=>p.arq_id===arqId);
  return proc ? ['publicacao','acompanha','auditoria'].includes(proc.etapa) : false;
}
function toggleMapeadoManual(arqId,ev){
  ev&&ev.stopPropagation();
  if(mapeadosManual.has(arqId)) mapeadosManual.delete(arqId);
  else mapeadosManual.add(arqId);
  lsSet('mapeadosManual',JSON.stringify([...mapeadosManual]));
  fbAutoSave('mapeados');
  rArq();
}
function isCritico(arqId){
  return criticosManual.has(arqId);
}
function toggleCriticoManual(arqId,ev){
  ev&&ev.stopPropagation();
  if(criticosManual.has(arqId)) criticosManual.delete(arqId);
  else criticosManual.add(arqId);
  lsSet('criticosManual',JSON.stringify([...criticosManual]));
  fbAutoSave('criticos');
  rArq();
}
function getMetricasArq(){
  let nMacros=ARQUITETURA.length,nProc=0,nSub=0,nUnid=0,nMap=0;
  ARQUITETURA.forEach(m=>{
    const vistosProc=new Set();
    m.processos.forEach(p=>{
      if(vistosProc.has(p.nome)) return; // ignora duplicatas de nome dentro do mesmo macro
      vistosProc.add(p.nome);
      if(p.subprocessos&&p.subprocessos.length>0){
        const vistosSub=new Set();
        p.subprocessos.forEach(s=>{
          if(vistosSub.has(s.nome)) return; // ignora duplicatas de sub
          vistosSub.add(s.nome);
          nSub++;nUnid++;if(isMapeado(s.id))nMap++;
        });
      } else {nProc++;nUnid++;if(isMapeado(p.id))nMap++;}
    });
  });
  return{nMacros,nProc,nSub,nUnid,nMap};
}

// Remove entradas duplicadas de processo/subprocesso dentro de cada macro (mesmo nome)
function deduplicarArquitetura(){
  if(!isEP()){toast('Ação restrita ao EP.','var(--amber)');return;}
  let rmProc=0,rmSub=0;
  ARQUITETURA.forEach(m=>{
    const antes=m.processos.length;
    const vistos=new Map(); // nome → primeiro objeto
    m.processos.forEach(p=>{
      const k=p.nome.trim().toLowerCase();
      if(!vistos.has(k)){
        // Deduplica subprocessos dentro deste processo
        if(p.subprocessos&&p.subprocessos.length>0){
          const vistosSub=new Set();
          const orig=p.subprocessos.length;
          p.subprocessos=p.subprocessos.filter(s=>{
            const sk=s.nome.trim().toLowerCase();
            if(vistosSub.has(sk)) return false;
            vistosSub.add(sk); return true;
          });
          rmSub+=orig-p.subprocessos.length;
        }
        vistos.set(k,p);
      }
    });
    m.processos=Array.from(vistos.values());
    rmProc+=antes-m.processos.length;
  });
  rArq();
  fbAutoSave('deduplicarArq');
  const msg=rmProc||rmSub
    ? `Limpeza concluída: ${rmProc} processo(s) e ${rmSub} subprocesso(s) duplicado(s) removido(s).`
    : 'Nenhuma duplicata encontrada.';
  toast(msg,'var(--amber)');
}
// Retorna apenas as unidades onde o usuário logado tem acesso
function getMinhasUnidades(){
  if(!usuarioLogado) return [];
  if(usuarioLogado.perfil==='ep') return getUnidadesMapeaveis(); // EP vê tudo
  const vinculos = usuarioLogado.processos_vinculados||[];
  if(!vinculos.length) return []; // dono sem vínculo não vê nada
  return getUnidadesMapeaveis().filter(u=>vinculos.includes(u.arq_id));
}

// Verifica se o usuário logado tem acesso a uma unidade arq_id
function isMeuProcesso(arq_id){
  if(!usuarioLogado) return false;
  if(usuarioLogado.perfil==='ep') return true;
  const vinculos = usuarioLogado.processos_vinculados||[];
  return vinculos.includes(arq_id);
}
// ═══════════════════════════════════════════
// INDICADORES — estrutura real da planilha
// Colunas: Área, Indicador, Enunciado, Descrição, Periodicidade,
//          Período, Ciclo, PPE?, % Índice, Meta, Realizado, Análise, % Realizado
// ═══════════════════════════════════════════

// kpis[] agora armazena objetos com todos os campos da planilha
// {id, area, codigo, nome, enunciado, desc, periodicidade, periodo, ciclo,
//  ppe, indice, meta, realizado, analise, pct_realizado}

let _kpiIdC = 1;
let _indPpeFiltro = '';

function fmtPeriodo(v){
  if(!v) return '';
  if(v instanceof Date) return v.toLocaleDateString('pt-BR',{month:'short',year:'numeric'});
  if(typeof v === 'number' && v > 0){
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toLocaleDateString('pt-BR',{month:'short',year:'numeric'});
  }
  return v.toString().trim();
}

// Parses numbers from Brazilian-locale spreadsheets (comma as decimal separator,
// dot as thousands separator). Also strips % suffix and handles already-numeric values.
function parseNumBR(v){
  if(typeof v === 'number') return v;
  let s = v.toString().trim().replaceAll('%','').trim();
  if(!s) return 0;
  const hasDot   = s.includes('.');
  const hasComma = s.includes(',');
  if(hasDot && hasComma){
    // Both present — whichever comes last is the decimal separator
    s = s.lastIndexOf(',') > s.lastIndexOf('.')
      ? s.replaceAll('.','').replaceAll(',','.')   // Brazilian: 1.234,56
      : s.replaceAll(',','');                       // US: 1,234.56
  } else if(hasComma){
    s = s.replace(',','.');                    // 95,09 → 95.09
  }
  return Number.parseFloat(s) || 0;
}

function _xlsNorm(s){ return s.toString().replaceAll(/[^\w\s]/gu,'').replaceAll(/\s+/g,' ').trim().toLowerCase(); }
function _xlsFindCol(keys, variants){
  for(const v of variants){
    const found = keys.find(k => _xlsNorm(k).includes(_xlsNorm(v)));
    if(found) return found;
  }
  return null;
}
async function importarIndicadores(input){
  const file = input.files[0]; if(!file) return;
    try{
      const wb = XLSX.read(await file.arrayBuffer(), {type:'array', cellDates:true});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, {defval:''});

      if(!rows.length){ toast('Planilha vazia.','var(--amber)'); return; }

      // Fuzzy column matcher — strips emojis/icons and normalizes
      const keys = Object.keys(rows[0]);
      const col = variants => _xlsFindCol(keys, variants);

      const cArea     = col(['área','area']);
      const cCodigo   = col(['indicador','código','codigo','id']);
      const cEnunc    = col(['enunciado ind','enunciado']);
      const cDesc     = col(['descrição ind','descri','description']);
      const cPeriod   = col(['periodicidade']);
      const cPeriodo  = col(['período','periodo']) ;
      const cCiclo    = col(['ciclo']);
      const cPPE      = col(['ppe']);
      const cIndice   = col(['índice','indice','% índice','% indice']);
      const cMeta     = col(['meta']);
      const cReal     = col(['realizado','realiz']);
      const cAnalise  = col(['análise','analise','análisis']);
      const cPctReal  = col(['% realizado','pct realizado']);

      let added = 0;
      rows.forEach(row => {
        const area    = (cArea    ? row[cArea]    : '').toString().trim();
        const nome    = (cCodigo  ? row[cCodigo]  : '').toString().trim();
        const enunc   = (cEnunc   ? row[cEnunc]   : '').toString().trim();
        const desc    = (cDesc    ? row[cDesc]    : '').toString().trim();
        const period  = (cPeriod  ? row[cPeriod]  : 'Mensal').toString().trim();
        const periodo = fmtPeriodo(cPeriodo ? row[cPeriodo] : '');
        const ciclo   = (cCiclo   ? row[cCiclo]   : '').toString().trim();
        const ppe     = (cPPE     ? row[cPPE]     : 'Não').toString().trim();
        const indice  = parseNumBR(cIndice  ? row[cIndice]  : 0);
        const meta    = parseNumBR(cMeta    ? row[cMeta]    : 0);
        const real    = parseNumBR(cReal    ? row[cReal]    : 0);
        const analise = (cAnalise  ? row[cAnalise]  : '').toString().trim();
        const pctReal = parseNumBR(cPctReal ? row[cPctReal] : 0) || (meta > 0 ? Math.round((real/meta)*100) : 0);

        if(!area && !nome && !enunc) return; // skip empty rows

        kpis.push({
          id: _kpiIdC++,
          area, codigo:nome, nome: enunc||nome, desc,
          periodicidade: period, periodo, ciclo,
          ppe, indice, meta, realizado: real,
          analise, pct_realizado: pctReal,
          origem: 'importado',
        });
        added++;
      });

      rInd();
      fbAutoSave('importarInd');
      toast(added + ' indicador(es) importado(s)');
    } catch(err){ toast('Erro ao ler planilha: ' + err.message,'var(--red)'); }
    input.value = '';
}

function populateIndFilters(){
  const areaSel   = document.getElementById('ind-area-sel');
  const cicloSel  = document.getElementById('ind-ciclo-sel');
  const periSel   = document.getElementById('ind-periodo-sel');
  const nomeSel   = document.getElementById('ind-nome-sel');
  if(!areaSel) return;

  const curArea  = areaSel.value;
  const curCiclo = cicloSel.value;
  const curPeri  = periSel.value;
  const curNome  = nomeSel ? nomeSel.value : '';

  const areas   = [...new Set(kpis.map(k=>k.area).filter(Boolean))].sort();
  const ciclos  = [...new Set(kpis.map(k=>k.ciclo).filter(Boolean))].sort();
  const periods = [...new Set(kpis.map(k=>k.periodo).filter(Boolean))].sort();
  const nomes   = [...new Set(kpis.map(k=>k.nome).filter(Boolean))].sort();

  areaSel.innerHTML  = '<option value="">Todas as áreas</option>'  + areas.map(a=>`<option ${curArea===a?'selected':''}>${esc(a)}</option>`).join('');
  cicloSel.innerHTML = '<option value="">Todos os ciclos</option>' + ciclos.map(a=>`<option ${curCiclo===a?'selected':''}>${esc(a)}</option>`).join('');
  periSel.innerHTML  = '<option value="">Todos os períodos</option>' + periods.map(a=>`<option ${curPeri===a?'selected':''}>${esc(a)}</option>`).join('');
  if(nomeSel) nomeSel.innerHTML = '<option value="">Todos os indicadores</option>' + nomes.map(a=>`<option ${curNome===a?'selected':''}>${esc(a)}</option>`).join('');
}

function _kpiGrpStatus(items){
  const withData = items.filter(i=>(Number.parseFloat(i.realizado)||0)>0);
  if(!withData.length) return null; // sem dados no período
  const last = withData[withData.length-1];
  if(Number(last.meta)<=0) return null; // sem meta real (apenas _metaFallback ou sem meta)
  const pol = items[0].polaridade||'Maior é melhor';
  let pct;
  if(pol==='Menor é melhor'){
    pct = Number(last.realizado)>0 ? (Number(last.meta)/Number(last.realizado))*100 : 0;
  } else {
    pct = (Number(last.realizado)/Number(last.meta))*100;
  }
  return pct>=100?'ok':'nok';
}
function rInd(){
  const epAct = document.getElementById('ind-actions-ep');
  if(epAct) epAct.style.display = isEP() ? 'flex' : 'none';
  const gsheetsSec = document.getElementById('ind-gsheets-sec');
  if(gsheetsSec){ gsheetsSec.style.display = isEP() ? 'flex' : 'none'; }
  const gsUrlInput = document.getElementById('ind-gsheets-url');
  if(gsUrlInput && !gsUrlInput.value){
    gsUrlInput.value = lsGet('epcage_gsheets_url');
  }

  // Destroy previous charts
  _indCharts.forEach(c=>{ try{ c.destroy(); }catch{} });
  _indCharts = [];

  populateIndFilters();
  const area   = document.getElementById('ind-area-sel')?.value   || '';
  const ciclo  = document.getElementById('ind-ciclo-sel')?.value  || '';
  const period = document.getElementById('ind-periodo-sel')?.value || '';
  const nome   = document.getElementById('ind-nome-sel')?.value   || '';
  const ppe    = document.getElementById('ind-ppe-sel')?.value    || '';

  const lista = kpis.filter(k=>
    (!area   || k.area   === area)   &&
    (!ciclo  || k.ciclo  === ciclo)  &&
    (!period || k.periodo === period) &&
    (!nome   || k.nome   === nome)   &&
    (!ppe    || k.ppe    === ppe)
  );

  const grupos = kpiGroupByKey(lista);
  const nGrupos = Object.keys(grupos).length;

  // Summary
  // Apenas conta indicadores com dados no período E com meta real (≠ _metaFallback / média histórica)
  // e considera polaridade ('Maior é melhor' vs 'Menor é melhor')
  const sumEl = document.getElementById('ind-summary');
  if(sumEl && lista.length){
    const statuses = Object.values(grupos).map(_kpiGrpStatus);
    const ating  = statuses.filter(s=>s==='ok').length;
    const abaixo = statuses.filter(s=>s==='nok').length;
    sumEl.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <span style="font-size:12px;color:var(--ink3)">${nGrupos} indicador${nGrupos===1?'':'es'}</span>
      ${ating>0?`<span class="badge bg">${ating} atingindo meta</span>`:''}
      ${abaixo>0?`<span class="badge br">${abaixo} abaixo da meta</span>`:''}
    </div>`;
  } else if(sumEl){ sumEl.innerHTML = ''; }

  const el = document.getElementById('ind-c');
  if(!lista.length){
    el.innerHTML = '<div class="ib ibb">Nenhum indicador. Importe a planilha ou clique em "+ Novo indicador".</div>';
    setTimeout(injectIaIndicadores, 100);
    return;
  }

  Object.values(grupos).forEach(kpiApplyMetaFallback);
  el.innerHTML = Object.entries(grupos).map(([key,items])=>kpiGrupoCardHTML(key,items)).join('');
  setTimeout(()=>{ Object.entries(grupos).forEach(([key,items])=>createKpiChart(key,items)); }, 50);
  setTimeout(injectIaIndicadores, 100);
}

// indFiltPpe removida (dead code — alias sem chamador; use rInd() diretamente)

let _indCharts = [];
function kpiGrupoCardHTML(key, items){
  const nome = items[0].nome;
  const polaridade = items[0].polaridade||'Maior é melhor';
  const area = items[0].area||'';
  const isPpe = items[0].ppe === 'Sim';

  // Border color based on most recent period WITH data (realizado > 0)
  const withData = items.filter(i=>(Number.parseFloat(i.realizado)||0) > 0);
  const last = withData.length ? withData[withData.length-1] : null;
  const hasMeta = last && (last.meta||0) > 0;
  let borderColor = 'var(--bdr)';
  if(hasMeta){
    let pct;
    if(polaridade==='Menor é melhor'){
      pct = last.realizado > 0 ? (last.meta/last.realizado)*100 : 0;
    } else {
      pct = (last.realizado/last.meta)*100;
    }
    if(pct>=100) borderColor = 'var(--green)';
    else if(pct>=80) borderColor = 'var(--amber)';
    else borderColor = 'var(--red)';
  }

  // Analysis lines with period label
  const analises = items.filter(i=>i.analise).map(i=>
    `<div style="margin-bottom:.3rem"><span style="font-size:10px;font-weight:600;color:var(--ink3)">${esc(i.periodo||'?')}:</span> <span style="font-size:11px;color:var(--ink2);line-height:1.5">${esc(i.analise)}</span></div>`
  ).join('');

  return `<div style="background:var(--surf);border:1px solid var(--bdr);border-left:3px solid ${borderColor};border-radius:var(--r);padding:1rem;margin-bottom:1rem;box-shadow:var(--sh)">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.5rem;gap:8px;flex-wrap:wrap">
      <div>
        <div style="font-size:12px;color:var(--ink3);margin-bottom:2px">${esc(area)}${items[0].codigo?' · '+esc(items[0].codigo):''} · ${polaridade==='Menor é melhor'?'↓':'↑'}${isPpe?' · <span title="Indicador PPE" style="color:#f59e0b">📝</span>':''}</div>
        <div style="font-size:14px;font-weight:600;color:var(--ink)">${esc(nome)}</div>
      </div>
      <div style="display:flex;gap:5px;flex-shrink:0">${isEP()?`<button type="button" class="btn" style="font-size:10px;padding:2px 8px" onclick="editKpi(${items[0].id})">✎ Editar</button><button type="button" class="btn" style="font-size:10px;padding:2px 8px;color:var(--red);border-color:var(--red-b)" onclick="deletarKpi(${items[0].id})" aria-label="Excluir indicador">×</button>`:''}</div>
    </div>
    <div style="position:relative;height:200px"><canvas id="chart-kpi-${key.replaceAll(/\W/g,'_')}"></canvas></div>
    ${analises?`<div style="margin-top:.5rem;padding:.4rem .6rem;background:var(--bg2);border-radius:5px;border-left:2px solid var(--bdr2)">${analises}</div>`:''}
  </div>`;
}
// populateGrfkFilters removida (dead code — alias sem chamador; use populateIndFilters())
function kpiBarColor(r, m, polaridade){
  if(!m) return 'rgba(96,165,250,0.7)';
  let pct;
  if(polaridade==='Menor é melhor'){
    pct = r > 0 ? m/r : 0;
  } else {
    pct = r/m;
  }
  if(pct>=1) return 'rgba(34,197,94,0.75)';
  if(pct>=0.8) return 'rgba(251,191,36,0.75)';
  return 'rgba(239,68,68,0.75)';
}
function kpiApplyMetaFallback(items){
  const semMeta = items.filter(i=>!i.meta||i.meta===0);
  if(!semMeta.length) return;
  const ultimos = items.slice(-12).map(i=>Number.parseFloat(i.realizado)||0);
  const media = ultimos.length ? ultimos.reduce((a,b)=>a+b,0)/ultimos.length : 0;
  semMeta.forEach(i=>{ if(!i._metaFallback) i._metaFallback = Math.round(media*10)/10; });
}
function periodoToNum(s){
  if(!s) return 0;
  const str = s.toString().toLowerCase();
  const MONTHS = {jan:1,fev:2,mar:3,abr:4,mai:5,jun:6,jul:7,ago:8,set:9,out:10,nov:11,dez:12};
  const y = (str.match(/\d{4}/)||['0'])[0];
  for(const [abbr,num] of Object.entries(MONTHS)){
    if(str.includes(abbr)) return Number.parseInt(y)*100 + num;
  }
  const tMatch = str.match(/t(\d)/);
  if(tMatch) return Number.parseInt(y)*100 + (Number.parseInt(tMatch[1])-1)*3 + 1;
  const semMatch = str.match(/(\d)[ºo\s]*sem/);
  if(semMatch) return Number.parseInt(y)*100 + (Number.parseInt(semMatch[1])===1 ? 1 : 7);
  if(Number.parseInt(y)) return Number.parseInt(y)*100;
  return 0;
}
function kpiGroupByKey(list){
  const source = list || kpis;
  const grupos = {};
  source.forEach(k=>{
    const key = (k.codigo||k.nome||'').trim() || k.nome;
    if(!grupos[key]){ grupos[key] = []; }
    grupos[key].push(k);
  });
  Object.values(grupos).forEach(g => g.sort((a,b)=>periodoToNum(a.periodo)-periodoToNum(b.periodo)));
  return grupos;
}
function createKpiChart(key, items){
  const canvas = document.getElementById('chart-kpi-'+key.replaceAll(/\W/g,'_'));
  if(!canvas) return;
  // Only show periods that have data (realizado > 0)
  const withData = items.filter(i=>(Number.parseFloat(i.realizado)||0) > 0);
  if(!withData.length){ canvas.parentElement.style.display='none'; return; }
  const polaridade = items[0].polaridade||'Maior é melhor';
  const unidade = items[0].unidade||'';
  const realizados = withData.map(i=>Number.parseFloat(i.realizado)||0);
  const metas = withData.map(i=>{ const m=Number.parseFloat(i.meta)||0; return m>0?m:(i._metaFallback||null); });
  const hasHistoricFallback = metas.some((m,i)=>m!==null&&withData[i]?._metaFallback);
  let metaSuffix;
  if(unidade){metaSuffix=' ('+unidade+')';}
  else if(hasHistoricFallback){metaSuffix='  (média histórica)';}
  else{metaSuffix='';}
  const metaLabel = 'Meta'+metaSuffix;
  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: withData.map(i=>i.periodo||'?'),
      datasets: [
        { label:'Realizado'+(unidade?' ('+unidade+')':''), data:realizados, borderRadius:4, order:2,
          backgroundColor: realizados.map((r,i)=>kpiBarColor(r,metas[i],polaridade)) },
        { label:metaLabel, data:metas, type:'line', order:1,
          borderColor:'rgba(99,102,241,0.9)', backgroundColor:'transparent',
          borderWidth:2, borderDash:[5,4], pointRadius:3 }
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins: {
        legend:{ position:'bottom', labels:{ font:{size:11} } },
        tooltip:{ callbacks:{ label: ctx=>ctx.dataset.label+': '+ctx.parsed.y+(unidade?' '+unidade:'') } }
      },
      scales: { y:{min:0,ticks:{font:{size:10}}}, x:{ticks:{font:{size:10}}} }
    }
  });
  _indCharts.push(chart);
}
// rIndGraficos removida (dead code — alias sem chamador; use rInd())

function kpiCard(k){
  const polaridade = k.polaridade || 'Maior é melhor';
  const unidade    = k.unidade ? ' '+k.unidade : '';
  const polIcon    = polaridade === 'Menor é melhor' ? '↓' : '↑';
  const hasMeta    = k.meta > 0;

  let pct = null, color, status, barW;
  if(hasMeta){
    if(polaridade === 'Menor é melhor'){
      pct = k.realizado > 0 ? Math.round((k.meta/k.realizado)*100) : (k.pct_realizado || 0);
    } else {
      pct = Math.round((k.realizado/k.meta)*100);
    }
    const ok   = pct >= 100;
    const warn = pct >= 80 && pct < 100;
    if(ok){ color='var(--green)'; status='✓ Meta atingida'; }
    else if(warn){ color='var(--amber)'; status='~ Próximo da meta'; }
    else{ color='var(--red)'; status='✗ Abaixo da meta'; }
    barW   = Math.min(100, Math.max(0, pct));
  } else {
    color  = 'var(--ink3)';
    status = null;
    barW   = 0;
  }
  const borderColor = hasMeta ? color : 'var(--bdr)';

  return `<div style="background:var(--surf);border:1px solid var(--bdr);border-left:3px solid ${borderColor};border-radius:var(--r);padding:.85rem 1rem;box-shadow:var(--sh)">
    <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:start;margin-bottom:.5rem">
      <div>
        <div style="font-size:12px;color:var(--ink3);margin-bottom:2px">${k.codigo ? '<strong>'+esc(k.codigo)+'</strong> · ' : ''}${esc(k.periodicidade)} · ${esc(k.periodo)}${k.ciclo?' · '+esc(k.ciclo):''}</div>
        <div style="font-size:13px;font-weight:600;color:var(--ink);line-height:1.4">${esc(k.nome)}</div>
        ${k.desc ? `<div style="font-size:11px;color:var(--ink3);margin-top:2px">${esc(k.desc)}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
        ${status ? `<span style="font-size:11px;font-weight:600;color:${color}">${status}</span>` : ''}
        <span style="font-size:10px;color:var(--ink3)">${polIcon} ${polaridade}</span>
        ${k.ppe==='Sim' ? '<span class="badge bb" style="font-size:10px">PPE</span>' : ''}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:${hasMeta?'repeat(4,1fr)':'repeat(3,1fr)'};gap:8px;margin-bottom:.6rem;font-size:12px">
      <div style="text-align:center;padding:5px;background:var(--bg2);border-radius:6px">
        <div style="font-size:10px;color:var(--ink3);margin-bottom:1px">% Índice</div>
        <div style="font-weight:700;color:var(--ink)">${k.indice}%</div>
      </div>
      <div style="text-align:center;padding:5px;background:var(--bg2);border-radius:6px">
        <div style="font-size:10px;color:var(--ink3);margin-bottom:1px">Meta</div>
        <div style="font-weight:700;color:var(--ink)">${hasMeta ? k.meta+unidade : '—'}</div>
      </div>
      <div style="text-align:center;padding:5px;background:var(--bg2);border-radius:6px">
        <div style="font-size:10px;color:var(--ink3);margin-bottom:1px">Realizado</div>
        <div style="font-weight:700;color:var(--ink)">${k.realizado}${unidade}</div>
      </div>
      ${hasMeta ? `<div style="text-align:center;padding:5px;background:var(--bg2);border-radius:6px;border:1px solid ${color}">
        <div style="font-size:10px;color:var(--ink3);margin-bottom:1px">Desempenho</div>
        <div style="font-weight:700;color:${color}">${pct}%</div>
      </div>` : ''}
    </div>
    ${hasMeta ? `<div style="height:6px;background:var(--bg3);border-radius:99px;overflow:hidden;margin-bottom:.5rem">
      <div style="height:100%;border-radius:99px;background:${color};width:${barW}%;transition:width .4s"></div>
    </div>` : ''}
    ${k.analise ? `<div style="font-size:11px;color:var(--ink3);line-height:1.5;padding:.4rem .6rem;background:var(--surf2);border-radius:5px;border-left:2px solid ${borderColor}">📝 ${esc(k.analise)}</div>` : ''}
    <div style="display:flex;gap:5px;margin-top:.5rem">
      <button type="button" class="btn" style="font-size:10px;padding:2px 8px" onclick="editKpi(${k.id})">✎ Editar</button>
      <button type="button" class="btn" style="font-size:10px;padding:2px 8px;color:var(--red);border-color:var(--red-b)" onclick="deletarKpi(${k.id})" aria-label="Excluir indicador">×</button>
    </div>
  </div>`;
}

function _kpiFormSetFields(k){
  const fv = (id, v) => { const el=document.getElementById(id); if(el) el.value=v; };
  fv('nkpi-area',       k.area       || '');
  fv('nkpi-codigo',     k.codigo     || '');
  fv('nkpi-nome',       k.nome       || '');
  fv('nkpi-desc',       k.desc       || '');
  fv('nkpi-period',     k.periodicidade || 'Mensal');
  fv('nkpi-periodo',    k.periodo    || '');
  fv('nkpi-ciclo',      k.ciclo      || '');
  fv('nkpi-ppe',        k.ppe        || 'Não');
  fv('nkpi-indice',     k.indice     || '');
  fv('nkpi-meta',       k.meta       || '');
  fv('nkpi-real',       k.realizado  || '');
  fv('nkpi-pct-real',   k.pct_realizado ? k.pct_realizado+'%' : '');
  fv('nkpi-unidade',    k.unidade    || '');
  fv('nkpi-polaridade', k.polaridade || 'Maior é melhor');
  fv('nkpi-analise',    k.analise    || '');
  // populate process selector
  const procSel = document.getElementById('nkpi-proc');
  if(procSel){
    procSel.innerHTML = '<option value="">— Nenhum —</option>'
      + processos.map(p => `<option value="${p.id}">${esc(p.macro?' ['+p.macro+'] ':'')}${esc(p.nome)}</option>`).join('');
    procSel.value = k.pid != null ? String(k.pid) : '';
  }
}
function _kpiUpdateNavDisplay(isMulti){
  const navBar = document.getElementById('kpi-nav-periodos');
  const cfgLbl = document.getElementById('kpi-config-geral-lbl');
  const valLbl = document.getElementById('kpi-valores-periodo-lbl');
  if(navBar) navBar.style.display = isMulti ? 'flex' : 'none';
  if(cfgLbl) cfgLbl.style.display = isMulti ? ''    : 'none';
  if(valLbl) valLbl.style.display = isMulti ? ''    : 'none';
}
function _kpiGetSamePeriods(k){
  const groupKey = k.codigo || k.nome;
  return kpis
    .filter(x => (x.codigo || x.nome) === groupKey)
    .slice()
    .sort((a,b) => periodoToNum(a.periodo) - periodoToNum(b.periodo));
}
function abrirNovoKpi(preselArea){
  if(!isEP()){toast('Ação restrita ao EPP.','var(--amber)');return;}
  const modal = document.getElementById('novo-kpi-modal');
  if(!modal) return;
  document.getElementById('kpi-modal-titulo').textContent = 'Novo indicador';
  document.getElementById('nkpi-edit-idx').value = '';
  document.getElementById('nkpi-edit-all-periods').value = '0';
  document.getElementById('kpi-del-btn').style.display = 'none';
  globalThis._kpiPeriodos = [];
  globalThis._kpiPeriodoIdx = 0;
  globalThis._kpiPeriodEdits = {};
  _kpiUpdateNavDisplay(false);
  _kpiFormSetFields({area: preselArea||'', periodicidade:'Mensal', ppe:'Não', polaridade:'Maior é melhor'});
  modal.style.display = 'flex';
}

function _kpiNavUpdateSelector(){
  const sel = document.getElementById('kpi-nav-sel');
  const info = document.getElementById('kpi-nav-info');
  if(!sel) return;
  sel.innerHTML = (globalThis._kpiPeriodos||[]).map((k,i) =>
    `<option value="${i}"${i===globalThis._kpiPeriodoIdx?' selected':''}>${esc(k.periodo||'?')}</option>`
  ).join('');
  if(info) info.textContent = `${(globalThis._kpiPeriodoIdx||0)+1} / ${(globalThis._kpiPeriodos||[]).length}`;
}

function _kpiNavFlushCurrent(){
  if(!(globalThis._kpiPeriodos||[]).length) return;
  const k = globalThis._kpiPeriodos[globalThis._kpiPeriodoIdx];
  if(!k) return;
  if(!globalThis._kpiPeriodEdits) globalThis._kpiPeriodEdits = {};
  globalThis._kpiPeriodEdits[k.id] = {
    periodo:   document.getElementById('nkpi-periodo')?.value.trim()  || '',
    realizado: Number.parseFloat(document.getElementById('nkpi-real')?.value)    || 0,
    indice:    Number.parseFloat(document.getElementById('nkpi-indice')?.value)  || 0,
    analise:   document.getElementById('nkpi-analise')?.value.trim()  || '',
  };
}

function _kpiNavLoadCurrent(){
  const periodos = globalThis._kpiPeriodos||[];
  const k = periodos[globalThis._kpiPeriodoIdx];
  if(!k) return;
  document.getElementById('nkpi-edit-idx').value = k.id;
  const edits = (globalThis._kpiPeriodEdits||{})[k.id];
  const fv = (id,v) => { const el=document.getElementById(id); if(el) el.value=v; };
  fv('nkpi-periodo',  edits ? edits.periodo   : (k.periodo   || ''));
  fv('nkpi-real',     edits ? edits.realizado  : (k.realizado || ''));
  fv('nkpi-indice',   edits ? edits.indice     : (k.indice    || ''));
  fv('nkpi-analise',  edits ? edits.analise    : (k.analise   || ''));
  calcPctReal();
  _kpiNavUpdateSelector();
}

function _kpiNavGoto(){
  const sel = document.getElementById('kpi-nav-sel');
  if(!sel) return;
  const newIdx = Number.parseInt(sel.value)||0;
  if(newIdx === globalThis._kpiPeriodoIdx) return;
  _kpiNavFlushCurrent();
  globalThis._kpiPeriodoIdx = newIdx;
  _kpiNavLoadCurrent();
}

function _kpiNavStep(dir){
  const periodos = globalThis._kpiPeriodos||[];
  const newIdx = (globalThis._kpiPeriodoIdx||0) + dir;
  if(newIdx < 0 || newIdx >= periodos.length) return;
  _kpiNavFlushCurrent();
  globalThis._kpiPeriodoIdx = newIdx;
  const sel = document.getElementById('kpi-nav-sel');
  if(sel) sel.value = newIdx;
  _kpiNavLoadCurrent();
}

function calcPctReal(){
  const meta = Number.parseFloat(document.getElementById('nkpi-meta').value) || 0;
  const real = Number.parseFloat(document.getElementById('nkpi-real').value) || 0;
  const pol  = document.getElementById('nkpi-polaridade').value;
  let pct = '';
  if(pol === 'Menor é melhor'){
    pct = real > 0 ? Math.round((meta/real)*100)+'%' : '';
  } else {
    pct = meta > 0 ? Math.round((real/meta)*100)+'%' : '';
  }
  document.getElementById('nkpi-pct-real').value = pct;
}

function editKpi(id){
  const k = kpis.find(x=>x.id===id);
  if(!k) return;
  const modal = document.getElementById('novo-kpi-modal');
  document.getElementById('kpi-modal-titulo').textContent = 'Editar indicador';
  document.getElementById('nkpi-edit-idx').value = id;
  document.getElementById('nkpi-edit-all-periods').value = '0';
  document.getElementById('kpi-del-btn').style.display = 'inline-flex';

  const samePeriods = _kpiGetSamePeriods(k);
  globalThis._kpiPeriodos    = samePeriods;
  globalThis._kpiPeriodoIdx  = Math.max(0, samePeriods.findIndex(x=>x.id===id));
  globalThis._kpiPeriodEdits = {};

  const isMulti = samePeriods.length > 1;
  _kpiUpdateNavDisplay(isMulti);
  _kpiFormSetFields(k);
  if(isMulti){ _kpiNavUpdateSelector(); }
  modal.style.display = 'flex';
}

function salvarNovoKpi(){
  const area = document.getElementById('nkpi-area').value.trim();
  const nome = document.getElementById('nkpi-nome').value.trim();
  if(!area || !nome){ toast('Informe Área e Enunciado do indicador.','var(--amber)'); return; }

  const editId = document.getElementById('nkpi-edit-idx').value;
  const periodos = globalThis._kpiPeriodos||[];

  if(editId && periodos.length > 1){
    // Multi-period edit: flush current period values first
    _kpiNavFlushCurrent();

    const _pidRaw = document.getElementById('nkpi-proc')?.value;
    const _pid = _pidRaw ? Number.parseInt(_pidRaw) : null;
    // General config fields (applied to all periods in the group)
    const generalCfg = {
      area,
      codigo:       document.getElementById('nkpi-codigo').value.trim(),
      nome,
      desc:         document.getElementById('nkpi-desc').value.trim(),
      periodicidade: document.getElementById('nkpi-period').value,
      ciclo:        document.getElementById('nkpi-ciclo').value.trim(),
      unidade:      document.getElementById('nkpi-unidade').value.trim(),
      polaridade:   document.getElementById('nkpi-polaridade').value,
      meta:         Number.parseFloat(document.getElementById('nkpi-meta').value) || 0,
      ppe:          document.getElementById('nkpi-ppe').value,
      pid:          _pid,
    };

    periodos.forEach(p => {
      const idx = kpis.findIndex(x => x.id === p.id);
      if(idx < 0) return;
      Object.assign(kpis[idx], generalCfg);
      // Promote gsheets→gsheets_editado so the next sync won't overwrite this manual edit
      if(kpis[idx].origem === 'gsheets'){ kpis[idx].origem = 'gsheets_editado'; }
      // Apply any period-specific edits made while navigating
      const edits = (globalThis._kpiPeriodEdits||{})[p.id];
      if(edits){
        kpis[idx].periodo   = edits.periodo;
        kpis[idx].realizado = edits.realizado;
        kpis[idx].indice    = edits.indice;
        kpis[idx].analise   = edits.analise;
      }
      // Recalculate pct_realizado
      const pol  = kpis[idx].polaridade;
      const meta = kpis[idx].meta;
      const real = kpis[idx].realizado;
      if(pol === 'Menor é melhor'){
        kpis[idx].pct_realizado = real > 0 ? Math.round((meta/real)*100) : 0;
      } else {
        kpis[idx].pct_realizado = meta > 0 ? Math.round((real/meta)*100) : 0;
      }
    });

  } else if(editId){
    // Single-period edit
    const meta      = Number.parseFloat(document.getElementById('nkpi-meta').value)  || 0;
    const real      = Number.parseFloat(document.getElementById('nkpi-real').value)  || 0;
    const polaridade = document.getElementById('nkpi-polaridade').value;
    let pct;
    if(polaridade === 'Menor é melhor'){
      pct = real > 0 ? Math.round((meta/real)*100) : 0;
    } else {
      pct = meta > 0 ? Math.round((real/meta)*100) : 0;
    }
    const editIdNum = Number.parseInt(editId);
    const idx = kpis.findIndex(k=>k.id===editIdNum);
    if(idx >= 0){
      const orig = kpis[idx];
      // Promote gsheets→gsheets_editado so the next sync won't overwrite this manual edit
      const novaOrigem = orig.origem === 'gsheets' ? 'gsheets_editado' : orig.origem;
      const pidRaw = document.getElementById('nkpi-proc')?.value;
      kpis[idx] = {
        id: editIdNum, origem: novaOrigem,
        area, codigo: document.getElementById('nkpi-codigo').value.trim(),
        nome, desc: document.getElementById('nkpi-desc').value.trim(),
        periodicidade: document.getElementById('nkpi-period').value,
        periodo: document.getElementById('nkpi-periodo').value.trim(),
        ciclo: document.getElementById('nkpi-ciclo').value.trim(),
        ppe: document.getElementById('nkpi-ppe').value,
        indice: Number.parseFloat(document.getElementById('nkpi-indice').value) || 0,
        unidade: document.getElementById('nkpi-unidade').value.trim(),
        polaridade, meta, realizado: real,
        analise: document.getElementById('nkpi-analise').value.trim(),
        pct_realizado: pct,
        pid: pidRaw ? Number.parseInt(pidRaw) : null,
      };
    }
  } else {
    // New KPI
    const meta      = Number.parseFloat(document.getElementById('nkpi-meta').value)  || 0;
    const real      = Number.parseFloat(document.getElementById('nkpi-real').value)  || 0;
    const polaridade = document.getElementById('nkpi-polaridade').value;
    let pct;
    if(polaridade === 'Menor é melhor'){
      pct = real > 0 ? Math.round((meta/real)*100) : 0;
    } else {
      pct = meta > 0 ? Math.round((real/meta)*100) : 0;
    }
    const newPidRaw = document.getElementById('nkpi-proc')?.value;
    kpis.push({
      id: _kpiIdC++, origem: 'manual',
      area, codigo: document.getElementById('nkpi-codigo').value.trim(),
      nome, desc: document.getElementById('nkpi-desc').value.trim(),
      periodicidade: document.getElementById('nkpi-period').value,
      periodo: document.getElementById('nkpi-periodo').value.trim(),
      ciclo: document.getElementById('nkpi-ciclo').value.trim(),
      ppe: document.getElementById('nkpi-ppe').value,
      indice: Number.parseFloat(document.getElementById('nkpi-indice').value) || 0,
      unidade: document.getElementById('nkpi-unidade').value.trim(),
      polaridade, meta, realizado: real,
      analise: document.getElementById('nkpi-analise').value.trim(),
      pct_realizado: pct,
      pid: newPidRaw ? Number.parseInt(newPidRaw) : null,
    });
  }

  document.getElementById('novo-kpi-modal').style.display = 'none';
  fbAutoSave('salvarKpi');
  rInd();
  toast('Indicador salvo');
}

function deletarKpi(id){
  const delId = id || Number.parseInt(document.getElementById('nkpi-edit-idx').value);
  if(!delId) return;
  confirmar('Remover este indicador?', () => {
    kpis = kpis.filter(k=>k.id !== delId);
    if(fbReady()){
      const {db,doc,deleteDoc}=fb();
      deleteDoc(doc(db,'kpis',String(delId))).catch(e=>console.warn('deleteKpi error:',e.message));
    }
    document.getElementById('novo-kpi-modal').style.display = 'none';
    rInd(); toast('Indicador removido', 'var(--amber)');
  });
}

async function limparKpisImportados(){
  const importados = kpis.filter(k => k.origem === 'importado' || k.origem === 'gsheets' || k.origem === 'gsheets_editado');
  if(!importados.length){ toast('Nenhum indicador importado encontrado.', 'var(--amber)'); return; }
  confirmar(`Remover ${importados.length} indicador(es) importado(s)/sincronizado(s)? Os indicadores manuais serão mantidos.`, async () => {
    if(fbReady()){
      const {db,doc,deleteDoc}=fb();
      await Promise.all(importados.map(k => deleteDoc(doc(db,'kpis',String(k.id))).catch(e=>console.warn(e.message))));
    }
    kpis = kpis.filter(k => k.origem !== 'importado' && k.origem !== 'gsheets' && k.origem !== 'gsheets_editado');
    rInd();
    toast(`${importados.length} indicador(es) removido(s).`, 'var(--amber)');
  });
}

function salvarGSheetsUrl(){
  const url = (document.getElementById('ind-gsheets-url')?.value||'').trim();
  lsSet('epcage_gsheets_url', url);
}

function _normalizeGsheetsUrl(url){
  if(url.includes('/pub?') || url.includes('pub?output'))
    return url.replace(/pub\?.*$/, 'pub?output=csv');
  if(!url.includes('format=csv') && !url.includes('output=csv'))
    return url.includes('?') ? url + '&format=csv' : url + '?format=csv';
  return url;
}
async function _fetchGsheetsCsv(url){
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 15000);
  try {
    const resp = await fetch(url, { signal: ctrl.signal });
    clearTimeout(tid);
    if(!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.text();
  } catch(err) {
    clearTimeout(tid);
    if(err.name !== 'AbortError' && !err.message.includes('timeout')) throw err;
  }
  // Fallback: CORS proxy
  const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
  const ctrl2 = new AbortController();
  const tid2 = setTimeout(() => ctrl2.abort(), 20000);
  try {
    const resp = await fetch(proxyUrl, { signal: ctrl2.signal });
    clearTimeout(tid2);
    if(!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.text();
  } catch {
    clearTimeout(tid2);
    throw new Error('Proxy timeout ou indisponível. Tente novamente.');
  }
}
async function sincronizarGSheets(){
  const urlInput = document.getElementById('ind-gsheets-url');
  const statusEl = document.getElementById('ind-gsheets-status');
  let url = (urlInput?.value||'').trim();
  if(!url){ if(statusEl){ statusEl.textContent = '⚠ Informe a URL da planilha publicada.'; } return; }

  url = _normalizeGsheetsUrl(url);

  if(statusEl) statusEl.textContent = '⏳ Sincronizando...';
  try{
    const csvText = await _fetchGsheetsCsv(url);
    const wb = XLSX.read(csvText, {type:'string', raw:true});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, {defval:'', raw:true});
    if(!rows.length){ if(statusEl){ statusEl.textContent = '⚠ Planilha vazia.'; } return; }

    const keys = Object.keys(rows[0]);
    const col = variants => _xlsFindCol(keys, variants);

    const cArea=col(['área','area']),cCodigo=col(['indicador','código','codigo','id']),
      cEnunc=col(['enunciado ind','enunciado']),cDesc=col(['descrição ind','descri','description']),
      cPeriod=col(['periodicidade']),cPeriodo=col(['período','periodo']),
      cCiclo=col(['ciclo']),cPPE=col(['ppe']),
      cIndice=col(['índice','indice','% índice','% indice']),cMeta=col(['meta']),
      cReal=col(['realizado','realiz']),cAnalise=col(['análise','analise','análisis']),
      cPctReal=col(['% realizado','pct realizado']);

    // Remove previously unedited GSheets entries; preserve gsheets_editado (manual edits)
    const oldGSheets = kpis.filter(k => k.origem === 'gsheets');
    kpis = kpis.filter(k => k.origem !== 'gsheets');
    // Build a set of (codigo||nome + "|" + periodo) that already have manual edits
    const editados = new Set(
      kpis.filter(k => k.origem === 'gsheets_editado')
          .map(k => (k.codigo||k.nome||'').trim() + '|' + (k.periodo||'').trim())
    );
    let added = 0;
    rows.forEach(row => {
      const area   =(cArea   ?row[cArea]   :'').toString().trim();
      const nome   =(cCodigo ?row[cCodigo] :'').toString().trim();
      const enunc  =(cEnunc  ?row[cEnunc]  :'').toString().trim();
      const desc   =(cDesc   ?row[cDesc]   :'').toString().trim();
      const period =(cPeriod ?row[cPeriod] :'Mensal').toString().trim();
      const periodo=fmtPeriodo(cPeriodo?row[cPeriodo]:'');
      const ciclo  =(cCiclo  ?row[cCiclo]  :'').toString().trim();
      const ppe    =(cPPE    ?row[cPPE]    :'Não').toString().trim();
      const indice =parseNumBR(cIndice ?row[cIndice] :0);
      const meta   =parseNumBR(cMeta   ?row[cMeta]  :0);
      const real   =parseNumBR(cReal   ?row[cReal]  :0);
      const analise=(cAnalise?row[cAnalise]:'').toString().trim();
      const pctReal=parseNumBR(cPctReal?row[cPctReal]:0) || (meta>0?Math.round((real/meta)*100):0);
      if(!area && !nome && !enunc) return;
      // Skip rows that the user has already edited manually
      const chave = (nome||enunc||'').trim() + '|' + periodo.trim();
      if(editados.has(chave)) return;
      kpis.push({ id:_kpiIdC++, area, codigo:nome, nome:enunc||nome, desc,
        periodicidade:period, periodo, ciclo, ppe, indice, meta, realizado:real,
        analise, pct_realizado:pctReal, origem:'gsheets' });
      added++;
    });

    rInd();

    // Delete old GSheets indicators from Firestore
    if(fbReady() && oldGSheets.length){
      const {db,doc,deleteDoc}=fb();
      await Promise.all(oldGSheets.map(k => deleteDoc(doc(db,'kpis',String(k.id))).catch(e=>console.warn(e.message))));
    }

    // Save all changes
    await fbSaveAll();

    const now = new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    if(statusEl) statusEl.textContent = `✓ ${added} indicador(es) — ${now}`;
  }catch(err){
    console.warn('GSheets sync error:', err);
    if(statusEl) statusEl.textContent = `✗ Erro: ${err.message}`;
  }
}

// ═══════════════════════════════════════════
// METODOLOGIAS E PUBLICAÇÕES
// ═══════════════════════════════════════════
let _pubFiltro = '';

function filtPub(cat, el){
  _pubFiltro = cat;
  document.querySelectorAll('#pub-chips .chip').forEach(c=>c.classList.remove('on'));
  if(el) el.classList.add('on');
  rPub();
}

function rPub(){
  const lista = _pubFiltro ? publicacoes.filter(p=>p.categoria===_pubFiltro) : publicacoes;
  const el = document.getElementById('pub-list');
  if(!el) return;
  document.getElementById('pub-sub').textContent =
    publicacoes.length + ' documento' + (publicacoes.length===1?'':'s') + ' publicado' + (publicacoes.length===1?'':'s');
  if(!lista.length){
    el.innerHTML = '<div class="ib ibsl">Nenhuma publicação encontrada. Clique em "+ Nova publicação" para adicionar.</div>';
    return;
  }
  const catColor = {Manual:'var(--blue)',Drop:'var(--teal)',Metodologia:'var(--purple,#7c3aed)',Formulário:'var(--amber)',Outro:'var(--ink3)'};
  el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">` +
    lista.map(p=>{
      const cor = catColor[p.categoria]||'var(--ink3)';
      const tags = (p.tags||'').split(',').map(t=>t.trim()).filter(Boolean);
      return `<div style="background:var(--surf);border:1px solid var(--bdr);border-top:3px solid ${cor};border-radius:var(--r);overflow:hidden;box-shadow:var(--sh);display:flex;flex-direction:column;gap:0">
        ${p.thumb_url&&safeUrl(p.thumb_url)?`<div style="width:100%;height:130px;overflow:hidden;background:var(--bg2)"><img src="${esc(safeUrl(p.thumb_url))}" alt="${esc(p.titulo||'Publicação')}" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`:''}
        <div style="padding:1rem;display:flex;flex-direction:column;gap:6px;flex:1">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
          <div>
            <div style="font-size:10px;font-weight:700;color:${cor};text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">${esc(p.categoria)}</div>
            <div style="font-size:13px;font-weight:600;color:var(--ink);line-height:1.35">${esc(p.titulo)}</div>
          </div>
          ${p.versao?`<span style="font-size:10px;background:var(--bg2);color:var(--ink3);padding:2px 7px;border-radius:99px;flex-shrink:0">${esc(p.versao)}</span>`:''}
        </div>
        ${p.desc?`<div style="font-size:11.5px;color:var(--ink2);line-height:1.5">${esc(p.desc)}</div>`:''}
        <div style="display:flex;flex-wrap:wrap;gap:4px">
          ${tags.map(t=>`<span style="font-size:10px;background:var(--bg3);color:var(--ink3);padding:1px 6px;border-radius:99px">${esc(t)}</span>`).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:6px;border-top:1px solid var(--bdr)">
          <div style="font-size:10.5px;color:var(--ink3)">${p.data?esc(p.data)+' · ':''}${esc(p.responsavel||'')}</div>
          <div style="display:flex;gap:5px">
            ${safeUrl(p.url)?`<a href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener noreferrer" class="btn" style="font-size:10px;padding:2px 8px;text-decoration:none">↗ Abrir</a>`:''}
            <button type="button" class="btn" style="font-size:10px;padding:2px 8px" onclick="editarPub(${p.id})" aria-label="Editar publicação">✎</button>
            <button type="button" class="btn" style="font-size:10px;padding:2px 8px;color:var(--red);border-color:var(--red-b)" onclick="deletarPub(${p.id})" aria-label="Excluir publicação">×</button>
          </div>
        </div>
        </div>
      </div>`;
    }).join('') + '</div>';
}

function abrirModalPub(){
  if(!isEP()){toast('Ação restrita ao EPP.','var(--amber)');return;}
  document.getElementById('pub-modal-titulo').textContent = 'Nova publicação';
  document.getElementById('pub-edit-id').value = '';
  document.getElementById('pub-del-btn').style.display = 'none';
  document.getElementById('pub-titulo').value  = '';
  document.getElementById('pub-cat').value     = 'Manual';
  document.getElementById('pub-versao').value  = '';
  document.getElementById('pub-desc').value    = '';
  document.getElementById('pub-url').value     = '';
  document.getElementById('pub-data').value    = new Date().toISOString().slice(0,10);
  document.getElementById('pub-resp').value    = '';
  document.getElementById('pub-tags').value    = '';
  document.getElementById('pub-thumb').value   = '';
  document.getElementById('pub-thumb-preview').style.display = 'none';
  document.getElementById('pub-modal').style.display = 'flex';
}

function editarPub(id){
  const p = publicacoes.find(x=>x.id===id);
  if(!p) return;
  document.getElementById('pub-modal-titulo').textContent = 'Editar publicação';
  document.getElementById('pub-edit-id').value  = id;
  document.getElementById('pub-del-btn').style.display = 'inline-flex';
  document.getElementById('pub-titulo').value   = p.titulo||'';
  document.getElementById('pub-cat').value      = p.categoria||'Manual';
  document.getElementById('pub-versao').value   = p.versao||'';
  document.getElementById('pub-desc').value     = p.desc||'';
  document.getElementById('pub-url').value      = p.url||'';
  document.getElementById('pub-data').value     = p.data||'';
  document.getElementById('pub-resp').value     = p.responsavel||'';
  document.getElementById('pub-tags').value     = p.tags||'';
  document.getElementById('pub-thumb').value    = p.thumb_url||'';
  const prev = document.getElementById('pub-thumb-preview');
  const img  = document.getElementById('pub-thumb-img');
  if(p.thumb_url){ img.src=p.thumb_url; prev.style.display='block'; } else { prev.style.display='none'; }
  document.getElementById('pub-modal').style.display = 'flex';
}

function salvarPub(){
  const titulo = document.getElementById('pub-titulo').value.trim();
  if(!titulo){ toast('Informe o título da publicação.','var(--amber)'); return; }
  const obj = {
    id: null,
    titulo,
    categoria:   document.getElementById('pub-cat').value,
    versao:      document.getElementById('pub-versao').value.trim(),
    desc:        document.getElementById('pub-desc').value.trim(),
    url:         document.getElementById('pub-url').value.trim(),
    data:        document.getElementById('pub-data').value,
    responsavel: document.getElementById('pub-resp').value.trim(),
    tags:        document.getElementById('pub-tags').value.trim(),
    thumb_url:   document.getElementById('pub-thumb').value.trim(),
  };
  const editId = document.getElementById('pub-edit-id').value;
  if(editId){
    const idx = publicacoes.findIndex(p=>p.id===Number.parseInt(editId));
    if(idx>=0){ obj.id=Number.parseInt(editId); publicacoes[idx]=obj; }
  } else {
    obj.id = _pubIdC++;
    publicacoes.push(obj);
  }
  document.getElementById('pub-modal').style.display = 'none';
  fbAutoSave('salvarPub');
  rPub();
  toast('Publicação salva');
}

async function uploadThumbPub(input){
  const file=input?.files?.[0];if(!file)return;
  const {storage,storageRef,uploadBytes,getDownloadURL}=globalThis._fb||{};
  if(!storage){toast('Armazenamento não disponível','var(--red)');return;}
  const path=`publicacoes/thumbs/${Date.now()}_${file.name.replaceAll(/[^a-zA-Z0-9._-]/g,'_')}`;
  const ref=storageRef(storage,path);
  try{
    toast('Enviando imagem…','var(--blue)');
    await uploadBytes(ref,file);
    const url=await getDownloadURL(ref);
    document.getElementById('pub-thumb').value=url;
    const img=document.getElementById('pub-thumb-img');
    img.src=url;
    document.getElementById('pub-thumb-preview').style.display='block';
    toast('Imagem enviada!','var(--teal)');
  }catch(e){
    toast('Erro ao enviar imagem: '+e.message,'var(--red)');
  }
}
function deletarPub(id){
  const delId = id || Number.parseInt(document.getElementById('pub-edit-id').value);
  if(!delId) return;
  confirmar('Remover esta publicação?', () => {
    publicacoes = publicacoes.filter(p=>p.id!==delId);
    document.getElementById('pub-modal').style.display = 'none';
    if(fbReady()){
      const {db,doc,deleteDoc}=fb();
      deleteDoc(doc(db,'publicacoes',String(delId))).catch(e=>console.warn('deletarPub error:',e.message));
    }
    fbAutoSave('deletarPub');
    rPub();
    toast('Publicação removida','var(--amber)');
  });
}

function simImport(){
  // kept for compatibility — now does nothing
  toast('Use o botão "↑ Importar planilha" para carregar dados reais.','var(--amber)');
}

// ═══════════════════════════════════════════
// ADMIN USUÁRIOS
// ═══════════════════════════════════════════
let filtUsrPerfil = '';

function filtUsr(p, el){
  filtUsrPerfil = p;
  document.querySelectorAll('#usr-chips .chip').forEach(c=>c.classList.remove('on'));
  el.classList.add('on');
  renderAdmin();
}

function renderAdmin(){
  if(!isEP()){document.getElementById('usr-tbody').innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--ink3);padding:1rem">Acesso restrito ao EPP.</td></tr>';return;}

  // Pending access requests
  const pendentes = solicitacoes.filter(s=>s.status==='pendente');
  let solSec = document.getElementById('sol-acesso-sec');
  if(!solSec){
    solSec = document.createElement('div');
    solSec.id = 'sol-acesso-sec';
    const tbl = document.getElementById('usr-tbody');
    if(tbl) tbl.closest('table')?.parentElement?.insertBefore(solSec, tbl.closest('table'));
  }
  if(pendentes.length){
    solSec.innerHTML = `<div class="card" style="margin-bottom:1.2rem;border-left:3px solid var(--red)">
      <div style="font-weight:600;margin-bottom:.75rem;display:flex;align-items:center;gap:.5rem">
        Solicitações de acesso pendentes
        <span class="badge" style="background:var(--red);color:#fff">${pendentes.length}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        ${pendentes.map(s=>`<tr style="border-bottom:1px solid var(--bg3)">
          <td style="padding:6px 8px;font-weight:500">${s.nome}</td>
          <td style="padding:6px 8px;color:var(--ink3)">${s.email}</td>
          <td style="padding:6px 8px;color:var(--ink4);font-size:11px">${s.solicitado_em?new Date(s.solicitado_em).toLocaleDateString('pt-BR'):''}</td>
          <td style="padding:6px 8px;white-space:nowrap">
            <button type="button" class="btn btn-p" style="font-size:11px;padding:3px 8px;margin-right:4px" onclick="aprovarSolicitacao('${s.email}')">Aprovar</button>
            <button type="button" class="btn" style="font-size:11px;padding:3px 8px;background:var(--red-l);color:var(--red)" onclick="rejeitarSolicitacao('${s.email}')">Rejeitar</button>
          </td>
        </tr>`).join('')}
      </table>
    </div>`;
    solSec.style.display = '';
  } else {
    solSec.innerHTML = '';
    solSec.style.display = 'none';
  }

  const srch = (document.getElementById('srch-usr')?.value||'').toLowerCase();
  const lista = USUARIOS.filter(u=>
    (!filtUsrPerfil||u.perfil===filtUsrPerfil) &&
    (!srch||u.nome.toLowerCase().includes(srch)||u.email.toLowerCase().includes(srch))
  );
  const tbody = document.getElementById('usr-tbody');
  if(!tbody) return;
  const cors = {ep:'#1A5DC8',dono:'#0A7060',gestor:'#A85C00'};
  const pBadge = p=>`<span class="badge ${{ep:'bb',dono:'bt',gestor:'ba'}[p]||'bgr'}">${PERFIL_LABELS[p]||p}</span>`;
  tbody.innerHTML = lista.map(u=>{
    const idx = USUARIOS.indexOf(u);
    const isMe = usuarioLogado?.email===u.email;
    const vinculos = (u.processos_vinculados||[]);
    const noVinculoHtml = u.perfil==='ep'?'<span style="color:var(--ink4)">Todos (EP)</span>':'<span style="color:var(--red)">Nenhum vínculo</span>';
    return `<tr style="${isMe?'background:var(--blue-l)':''}">
      <td><div style="width:28px;height:28px;border-radius:50%;background:${cors[u.perfil]||'#888'};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff">${u.iniciais}</div></td>
      <td style="font-weight:500">${u.nome}${isMe?' <span class="badge bb" style="font-size:10px">você</span>':''}</td>
      <td style="font-size:12px;color:var(--ink3)">${u.email}</td>
      <td>${pBadge(u.perfil)}</td>
      <td style="font-size:11px;color:var(--ink3)">
        ${vinculos.length
          ? vinculos.map(vid=>{
              const u2=getUnidadesMapeaveis().find(u=>u.arq_id===vid);
              return u2?`<span class="badge bgr" style="margin:1px;font-size:10px">${u2.nome}</span>`:'';
            }).join('')
          : noVinculoHtml}
      </td>
      <td><button type="button" class="btn" style="font-size:11px;padding:3px 8px" onclick="abrirModalUsr(${idx})">Editar</button></td>
    </tr>`;
  }).join('');
}

async function aprovarSolicitacao(email){
  const sol = solicitacoes.find(s=>s.email===email);
  if(!sol) return;
  if(!fbReady()){toast('Firebase não configurado.','red');return;}

  const nome    = sol.nome||'';
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  const iniciais = (palavras.length>=2 ? palavras[0][0]+palavras[palavras.length-1][0] : (palavras[0]||'?').slice(0,2)).toUpperCase();
  const senhaTemp = gerarSenhaTemp();

  try {
    const {db, doc, setDoc, initializeApp, deleteApp, getAuth, createUserWithEmailAndPassword, FIREBASE_CONFIG} = fb();

    // 1. Criar conta no Firebase Auth via app secundária (não desloga o admin)
    let contaCriada = false;
    try {
      const secApp  = initializeApp(FIREBASE_CONFIG, 'sec_' + Date.now());
      const secAuth = getAuth(secApp);
      try {
        await createUserWithEmailAndPassword(secAuth, email, senhaTemp);
        contaCriada = true;
      } catch(createErr){
        if(createErr.code === 'auth/email-already-in-use'){
          contaCriada = true; // conta já existe, senha definida pelo admin via EmailJS abaixo
        } else {
          console.warn('createUser:', createErr.message);
        }
      } finally {
        await deleteApp(secApp);
      }
    } catch(secErr){ console.warn('secApp:', secErr.message); }

    // 2. Adicionar ao USUARIOS com flag trocar_senha
    const novoUser = {email, nome, perfil:'dono', iniciais, processos_vinculados:[], trocar_senha:true};
    USUARIOS.push(novoUser);

    // 3. Persistir no Firestore
    await setDoc(doc(db,'solicitacoes',email),{...sol, status:'aprovado', aprovado_em: now()});
    solicitacoes = solicitacoes.map(s=>s.email===email?{...s,status:'aprovado'}:s);
    await fbSaveAll();

    // 4. Enviar senha temporária por e-mail
    _enviarSenhaAcesso(email, nome, senhaTemp);

    // 5. Mostrar feedback para o admin (inclui a senha como fallback caso EmailJS não esteja configurado)
    toast(`✓ ${nome} aprovado(a)! Senha temporária: ${senhaTemp}${contaCriada ? ' (enviada por e-mail)' : ' — configure EmailJS para envio automático'}`, 'var(--green)', 8000);
    renderAdmin();
    aplicarPermissoes();
  } catch(e){
    const idx = USUARIOS.findIndex(u=>u.email===email);
    if(idx!==-1) USUARIOS.splice(idx,1);
    toast('Erro ao aprovar: '+e.message,'red');
  }
}

async function rejeitarSolicitacao(email){
  if(!fbReady()){toast('Firebase não configurado.','red');return;}
  try {
    const {db, doc, setDoc} = fb();
    const sol = solicitacoes.find(s=>s.email===email)||{email, status:'rejeitado'};
    await setDoc(doc(db,'solicitacoes',email),{...sol, status:'rejeitado'});
    solicitacoes = solicitacoes.filter(s=>s.email!==email);
    toast('Solicitação rejeitada.','red');
    renderAdmin();
    aplicarPermissoes();
  } catch(e){
    toast('Erro ao rejeitar: '+e.message,'red');
  }
}

function onUsrPerfilChg(){
  const perfil = document.getElementById('usr-perfil')?.value;
  const sec = document.getElementById('usr-proc-section');
  if(sec) sec.style.display = perfil==='dono' ? 'block' : 'none';
}

function abrirModalUsr(idx){
  const modal = document.getElementById('usr-modal');
  modal.style.display = 'flex';
  const delBtn = document.getElementById('usr-del-btn');

  // Populate process selector
  const sel = document.getElementById('usr-proc-add-sel');
  const units = getUnidadesMapeaveis();
  sel.innerHTML = '<option value="">Selecione um processo para vincular...</option>' +
    units.map(u=>`<option value="${u.arq_id}">${u.label}</option>`).join('');

  if(idx===null){
    document.getElementById('usr-modal-t').textContent = 'Novo usuário';
    document.getElementById('usr-idx').value = '';
    ['usr-nome','usr-ini','usr-email'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('usr-perfil').value = 'dono';
    document.getElementById('usr-vinculos-list').innerHTML = '';
    document.getElementById('usr-proc-section').style.display = 'block';
    delBtn.style.display = 'none';
  } else {
    const u = USUARIOS[idx];
    document.getElementById('usr-modal-t').textContent = 'Editar usuário';
    document.getElementById('usr-idx').value = idx;
    document.getElementById('usr-nome').value = u.nome;
    document.getElementById('usr-ini').value = u.iniciais;
    document.getElementById('usr-email').value = u.email;
    document.getElementById('usr-perfil').value = u.perfil;
    document.getElementById('usr-proc-section').style.display = u.perfil==='dono' ? 'block' : 'none';
    renderVinculos(u.processos_vinculados||[]);
    delBtn.style.display = 'inline-flex';
  }
}

// Render vinculo list inside modal (temp, not saved yet)
let _tempVinculos = [];
function renderVinculos(vinculos){
  _tempVinculos = [...vinculos];
  const el = document.getElementById('usr-vinculos-list');
  if(!el) return;
  const units = getUnidadesMapeaveis();
  if(!_tempVinculos.length){
    el.innerHTML = '<div class="ib iba" style="font-size:11px">Nenhum processo vinculado. Este usuário não verá processos em Melhorias e Indicadores.</div>';
    return;
  }
  el.innerHTML = _tempVinculos.map((vid,i)=>{
    const u = units.find(u=>u.arq_id===vid);
    return `<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;background:var(--surf2);border:1px solid var(--bdr);border-radius:var(--r);margin-bottom:4px;font-size:12px">
      <div style="flex:1">
        <div style="font-weight:500">${u?u.nome:vid}</div>
        ${u?`<div style="font-size:11px;color:var(--ink3)">${u.label}</div>`:''}
      </div>
      <button type="button" class="btn" style="font-size:10px;padding:2px 7px;color:var(--red);border-color:var(--red-b)" onclick="remVinculo(${i})">× Remover</button>
    </div>`;
  }).join('');
}

function addVinculoProc(){
  const sel = document.getElementById('usr-proc-add-sel');
  const vid = sel.value;
  if(!vid) return;
  if(_tempVinculos.includes(vid)){ toast('Processo já vinculado','var(--amber)'); return; }
  _tempVinculos.push(vid);
  renderVinculos(_tempVinculos);
  sel.value = '';
}

function remVinculo(i){
  _tempVinculos.splice(i,1);
  renderVinculos(_tempVinculos);
}

async function salvarUsr(){
  const nome = document.getElementById('usr-nome').value.trim();
  const email = document.getElementById('usr-email').value.trim().toLowerCase();
  const perfil = document.getElementById('usr-perfil').value;
  if(!nome||!email){ toast('Preencha nome e e-mail.','var(--amber)'); return; }
  const ini = document.getElementById('usr-ini').value.trim() || nome.split(' ').map(p=>p[0]).join('').toUpperCase().slice(0,2);
  const vinculos = perfil==='dono' ? [..._tempVinculos] : [];
  const idxStr = document.getElementById('usr-idx').value;

  if(idxStr===''){
    if(USUARIOS.some(u=>u.email===email)){ toast('E-mail já cadastrado.','var(--amber)'); return; }
    USUARIOS.push({email, nome, perfil, perfis:[perfil], iniciais:ini, processos_vinculados:vinculos});
  } else {
    const idx = Number.parseInt(idxStr);
    if(USUARIOS.some((u,i)=>u.email===email&&i!==idx)){ toast('E-mail já usado por outro usuário.','var(--amber)'); return; }
    const perfisPrev = Array.isArray(USUARIOS[idx].perfis) ? USUARIOS[idx].perfis : (USUARIOS[idx].perfil ? [USUARIOS[idx].perfil] : []);
    USUARIOS[idx] = {...USUARIOS[idx], email, nome, perfil, perfis:[...new Set([...perfisPrev, perfil])], iniciais:ini, processos_vinculados:vinculos};
    if(usuarioLogado?.email===email){
      usuarioLogado = USUARIOS[idx];
      document.getElementById('aside-name').textContent = nome;
      document.getElementById('aside-role').textContent = PERFIL_LABELS[perfil]||perfil;
    }
  }
  document.getElementById('usr-modal').style.display = 'none';
  renderAdmin();
  await fbSaveAll();
  toast('Usuário salvo');
}

async function deletarUsr(){
  const idx = Number.parseInt(document.getElementById('usr-idx').value);
  const u = USUARIOS[idx]; if(!u) return;
  if(usuarioLogado?.email===u.email){ toast('Não é possível remover o usuário logado.','var(--amber)'); return; }
  confirmar('Remover "'+u.nome+'"?', async () => {
    USUARIOS.splice(idx,1);
    document.getElementById('usr-modal').style.display = 'none';
    renderAdmin();
    await fbSaveAll();
    toast('Usuário removido','var(--amber)');
  });
}


// ═══════════════════════════════════════════
// FIREBASE — PERSISTÊNCIA
// ═══════════════════════════════════════════

// Helper: wait for Firebase module to be ready (loaded async)
function fbReady(){ return globalThis._fbReady === true; }
function fb(){ return globalThis._fb; }

// ── SAVE ──────────────────────────────────
// Each collection stores one document per logical "table"
// processos   → doc per process id
// kpis        → doc per kpi id
// arquitetura → single doc "all"
// usuarios    → single doc "all"
// config      → single doc "ejs"

async function fbSave(col, id, data){
  if(!fbReady()) return;
  try {
    const {db, doc, setDoc} = fb();
    await setDoc(doc(db, col, String(id)), data);
  } catch(e){ console.warn('fbSave error:', e.message); }
}

// ═══════════════════════════════════════════
// PLANO ANUAL DE TRABALHO (PAT)
// ═══════════════════════════════════════════
const PLANO_STATUS_CFG = {
  planejado:   {lb:'Planejado',    cor:'#3b82f6', bg:'rgba(59,130,246,.1)'},
  em_execucao: {lb:'Em execução',  cor:'#f59e0b', bg:'rgba(245,158,11,.1)'},
  em_atraso:   {lb:'Em atraso',    cor:'#ef4444', bg:'rgba(239,68,68,.1)'},
  concluida:   {lb:'Concluída',    cor:'#14b8a6', bg:'rgba(20,184,166,.1)'},
};
const PLANO_PRIO_CFG = {
  alta:  {lb:'Alta',  cor:'#ef4444'},
  media: {lb:'Média', cor:'#f59e0b'},
  baixa: {lb:'Baixa', cor:'#14b8a6'},
};
const PLANO_CAT_LB = {auditoria:'Auditoria',mapeamento:'Mapeamento',normativa:'Normativa',capacitacao:'Capacitação',governanca:'Governança',outro:'Outro'};

function planoAno(){
  return Number.parseInt(document.getElementById('plano-ano-sel')?.value)||new Date().getFullYear();
}

const PLANO_FIM_TRI = {T1:'-03-31',T2:'-06-30',T3:'-09-30',T4:'-12-31',Anual:'-12-31'};
function planoStatusEfetivo(at){
  // 1. Quantidade realizada >= prevista → concluída automaticamente
  if(at.qt_prevista > 0 && (at.qt_realizada||0) >= at.qt_prevista) return 'concluida';
  // 2. Status manual concluída
  if(at.status==='concluida') return 'concluida';
  const hoje = new Date().toISOString().split('T')[0];
  // 3. Prazo individual ultrapassado
  if(at.prazo && at.prazo < hoje) return 'em_atraso';
  // 4. Data final do trimestre ultrapassada
  const sufTri = PLANO_FIM_TRI[at.trimestre];
  if(sufTri && at.ano && (`${at.ano}${sufTri}`) < hoje) return 'em_atraso';
  return at.status||'planejado';
}

function planoPct(at){
  if(!at.qt_prevista) return at.status==='concluida'?100:0;
  return Math.min(100, Math.round((at.qt_realizada||0)/at.qt_prevista*100));
}

function planoPopulateAnoSel(){
  const sel = document.getElementById('plano-ano-sel');
  if(!sel) return;
  const curY = new Date().getFullYear();
  const anos = [...new Set([curY, curY-1, curY+1, ...plano.map(a=>a.ano)])].sort((a,b)=>b-a);
  const cur  = Number.parseInt(sel.value)||curY;
  sel.innerHTML = anos.map(y=>`<option value="${y}" ${y===cur?'selected':''}>${y}</option>`).join('');
}

function rPlano(){
  if(!isEP()) return;
  planoPopulateAnoSel();
  const ano  = planoAno();
  const doAno = plano.filter(a=>a.ano===ano);
  const triF  = document.getElementById('plano-filt-tri')?.value||'';
  const stF   = document.getElementById('plano-filt-status')?.value||'';
  const prF   = document.getElementById('plano-filt-prio')?.value||'';
  const catF  = document.getElementById('plano-filt-cat')?.value||'';
  const srch  = (document.getElementById('plano-filt-srch')?.value||'').toLowerCase().trim();
  let lista = doAno.slice();
  if(triF)  lista = lista.filter(a=>a.trimestre===triF);
  if(stF)   lista = lista.filter(a=>planoStatusEfetivo(a)===stF);
  if(prF)   lista = lista.filter(a=>a.prioridade===prF);
  if(catF)  lista = lista.filter(a=>a.categoria===catF);
  if(srch)  lista = lista.filter(a=>
    (a.nome||'').toLowerCase().includes(srch)||
    (a.descricao||'').toLowerCase().includes(srch)||
    (a.responsavel||'').toLowerCase().includes(srch));
  planoDashAnual(doAno);
  planoStatsTrimestrais(doAno);
  const el = document.getElementById('plano-c');
  if(!el) return;
  if(!lista.length){
    el.innerHTML='<div class="ib ibb">Nenhuma atividade encontrada. <button type="button" class="btn" onclick="abrirPlanoModal(null)" style="font-size:12px;margin-left:8px">+ Nova atividade</button></div>';
    return;
  }
  const ORDEM = ['Anual','T1','T2','T3','T4'];
  const grupos = {};
  lista.forEach(a=>{ const k=a.trimestre||'Anual'; if(!grupos[k]){ grupos[k]=[]; } grupos[k].push(a); });
  const statusOrd = {em_atraso:0,em_execucao:1,planejado:2,concluida:3};
  el.innerHTML = ORDEM.filter(k=>grupos[k]).map(tri=>{
    const items = grupos[tri].sort((a,b)=>(statusOrd[planoStatusEfetivo(a)]??2)-(statusOrd[planoStatusEfetivo(b)]??2));
    const concl  = items.filter(a=>planoStatusEfetivo(a)==='concluida').length;
    const atraso = items.filter(a=>planoStatusEfetivo(a)==='em_atraso').length;
    const pct    = items.length ? Math.round(concl/items.length*100) : 0;
    return `<div style="margin-bottom:1.8rem">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:.6rem 1rem;background:var(--ink);color:#fff;border-radius:var(--r);margin-bottom:.7rem">
        <div style="font-family:var(--fh);font-size:13px;font-weight:600">${tri==='Anual'?'📅 Atividades Anuais':tri}</div>
        <div style="display:flex;align-items:center;gap:12px">
          ${atraso?`<span style="font-size:10px;background:rgba(239,68,68,.3);color:#fca5a5;padding:1px 8px;border-radius:10px">⚠ ${atraso} em atraso</span>`:''}
          <span style="font-size:11px;opacity:.6">${items.length} atividade${items.length===1?'':'s'}</span>
          <div style="display:flex;align-items:center;gap:6px">
            <div style="width:80px;height:6px;background:rgba(255,255,255,.2);border-radius:3px;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:#14b8a6;border-radius:3px"></div>
            </div>
            <span style="font-size:11px;opacity:.7">${pct}%</span>
          </div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">${items.map(a=>planoCardHTML(a)).join('')}</div>
    </div>`;
  }).join('');
}

function planoDashAnual(lista){
  const el = document.getElementById('plano-dash');
  if(!el) return;
  if(!lista.length){el.innerHTML='';return;}
  const total   = lista.length;
  const concl   = lista.filter(a=>planoStatusEfetivo(a)==='concluida').length;
  const atraso  = lista.filter(a=>planoStatusEfetivo(a)==='em_atraso').length;
  const execucao= lista.filter(a=>planoStatusEfetivo(a)==='em_execucao').length;
  const planej  = lista.filter(a=>planoStatusEfetivo(a)==='planejado').length;
  const pct = Math.round(concl/total*100);
  let cor;
  if(pct>=75) cor='#14b8a6';
  else if(pct>=40) cor='#f59e0b';
  else cor='#ef4444';
  // Métricas de pontualidade
  const conclLista = lista.filter(a=>planoStatusEfetivo(a)==='concluida'&&a.entrega_status);
  const emDia      = conclLista.filter(a=>a.entrega_status==='em_dia').length;
  const comAtraso  = conclLista.filter(a=>a.entrega_status==='com_atraso').length;
  const pctPontualidade = conclLista.length ? Math.round(emDia/conclLista.length*100) : null;
  let corPont;
  if(pctPontualidade>=80) corPont='#14b8a6';
  else if(pctPontualidade>=50) corPont='#f59e0b';
  else corPont='#ef4444';
  const dc = (v,l,c,bg)=>`<div style="flex:1;min-width:90px;background:${bg};border:1px solid ${c};border-radius:var(--r);padding:.7rem 1rem"><div style="font-size:22px;font-weight:700;color:${c};line-height:1">${v}</div><div style="font-size:11px;color:var(--ink3);margin-top:2px">${l}</div></div>`;
  el.innerHTML=`<div style="display:flex;gap:10px;flex-wrap:wrap;width:100%">
    ${dc(total,'Total atividades','var(--blue)','rgba(59,130,246,.07)')}
    ${dc(planej,'Planejadas','var(--ink3)','var(--bg2)')}
    ${dc(execucao,'Em execução','#f59e0b','rgba(245,158,11,.07)')}
    ${dc(atraso,'Em atraso','#ef4444','rgba(239,68,68,.07)')}
    ${dc(concl,'Concluídas','#14b8a6','rgba(20,184,166,.07)')}
    <div style="flex:1;min-width:120px;background:var(--bg2);border:1px solid var(--bdr);border-radius:var(--r);padding:.7rem 1rem">
      <div style="font-size:22px;font-weight:700;color:${cor};line-height:1">${pct}%</div>
      <div style="font-size:11px;color:var(--ink3);margin-top:2px">Conclusão anual</div>
      <div style="margin-top:5px;height:5px;background:var(--bdr2);border-radius:3px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${cor};border-radius:3px;transition:width .4s"></div>
      </div>
    </div>
    ${conclLista.length?`<div style="flex:1;min-width:160px;background:var(--bg2);border:1px solid var(--bdr);border-radius:var(--r);padding:.7rem 1rem">
      <div style="font-size:22px;font-weight:700;color:${corPont};line-height:1">${pctPontualidade}%</div>
      <div style="font-size:11px;color:var(--ink3);margin-top:2px">Pontualidade nas entregas</div>
      <div style="font-size:11px;margin-top:5px;display:flex;gap:8px;flex-wrap:wrap">
        <span style="color:#0f766e">✅ ${emDia} em dia</span>
        <span style="color:#dc2626">⚠ ${comAtraso} com atraso</span>
      </div>
    </div>`:''}
  </div>`;
}

function planoStatsTrimestrais(lista){
  const el = document.getElementById('plano-stats');
  if(!el) return;
  const mes = new Date().getMonth();
  let trimAtual;
  if(mes<3) trimAtual='T1';
  else if(mes<6) trimAtual='T2';
  else if(mes<9) trimAtual='T3';
  else trimAtual='T4';
  const trimestres = ['T1','T2','T3','T4'];
  el.innerHTML=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:.8rem">
    ${trimestres.map(tri=>{
      const items=lista.filter(a=>a.trimestre===tri);
      const isCur=tri===trimAtual;
      if(!items.length) return `<div style="background:var(--bg2);border:1px solid var(--bdr);border-radius:var(--r);padding:.8rem;opacity:.45">
        <div style="font-size:11px;font-weight:700;color:var(--ink3);margin-bottom:.3rem">${tri}${isCur?' <span style="color:var(--blue)">●</span>':''}</div>
        <div style="font-size:11px;color:var(--ink3)">Sem atividades</div></div>`;
      const concl   =items.filter(a=>planoStatusEfetivo(a)==='concluida').length;
      const atraso  =items.filter(a=>planoStatusEfetivo(a)==='em_atraso').length;
      const execucao=items.filter(a=>planoStatusEfetivo(a)==='em_execucao').length;
      const pct=Math.round(concl/items.length*100);
      let cor;
      if(pct>=75) cor='#14b8a6';
      else if(pct>=40) cor='#f59e0b';
      else cor='#ef4444';
      return `<div style="background:${isCur?'rgba(59,130,246,.06)':'var(--bg2)'};border:${isCur?'2px solid var(--blue)':'1px solid var(--bdr)'};border-radius:var(--r);padding:.8rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem">
          <span style="font-size:11px;font-weight:700;color:${isCur?'var(--blue)':'var(--ink)'}">${tri}${isCur?' ●':''}</span>
          <span style="font-size:18px;font-weight:700;color:${cor}">${pct}%</span>
        </div>
        <div style="height:4px;background:var(--bdr2);border-radius:2px;overflow:hidden;margin-bottom:.4rem">
          <div style="width:${pct}%;height:100%;background:${cor};border-radius:2px"></div>
        </div>
        <div style="font-size:10px;color:var(--ink3);display:flex;gap:7px;flex-wrap:wrap">
          <span>${items.length} ativ.</span>
          <span style="color:#14b8a6">${concl} concl.</span>
          ${atraso?`<span style="color:#ef4444">${atraso} atr.</span>`:''}
          ${execucao?`<span style="color:#f59e0b">${execucao} exec.</span>`:''}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function planoCardHTML(at){
  const st  = planoStatusEfetivo(at);
  const cfg = PLANO_STATUS_CFG[st]||PLANO_STATUS_CFG.planejado;
  const pct = planoPct(at);
  const prioC = PLANO_PRIO_CFG[at.prioridade]||PLANO_PRIO_CFG.media;
  const hoje = new Date().toISOString().split('T')[0];
  const diasRest = at.prazo && st!=='concluida'
    ? Math.ceil((new Date(at.prazo)-new Date(hoje))/86400000) : null;
  const prazoProximo = diasRest!==null && diasRest>=0 && diasRest<=7;
  const prazoText  = diasRest===0 ? 'Vence hoje' : diasRest+'d restantes';
  const prazoColor = st==='em_atraso' ? '#ef4444' : 'var(--ink3)';
  const prazoWarn  = st==='em_atraso' ? ' ⚠' : '';
  let entregaBg, entregaColor, entregaLabel;
  if(at.entrega_status==='em_dia'){
    entregaBg='rgba(20,184,166,.12)'; entregaColor='#0f766e'; entregaLabel='✅ Entregue em dia';
  } else if(at.entrega_status==='com_atraso'){
    entregaBg='rgba(239,68,68,.1)'; entregaColor='#dc2626'; entregaLabel=`⚠ Entregue com ${at.dias_atraso}d de atraso`;
  } else {
    entregaBg='var(--bg2)'; entregaColor='var(--ink3)'; entregaLabel='📅 Entregue sem prazo';
  }
  return `<div style="background:var(--surf);border:1px solid var(--bdr);border-left:3px solid ${cfg.cor};border-radius:var(--r);padding:.9rem 1rem;box-shadow:var(--sh)">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:4px">
          <span style="font-size:10px;font-weight:700;background:${cfg.bg};color:${cfg.cor};padding:2px 8px;border-radius:10px">${cfg.lb}</span>
          <span style="font-size:10px;color:${prioC.cor};padding:2px 7px;border-radius:10px;background:rgba(0,0,0,.04)">${prioC.lb}</span>
          ${at.categoria?`<span style="font-size:10px;color:var(--ink3);background:var(--bg2);padding:2px 7px;border-radius:10px">${esc(PLANO_CAT_LB[at.categoria]||at.categoria)}</span>`:''}
          ${at.vinculo_nome?`<span style="font-size:10px;color:var(--ink3);background:var(--bg2);padding:2px 7px;border-radius:10px">🔗 ${esc(at.vinculo_nome)}</span>`:''}
          ${prazoProximo?`<span style="font-size:10px;color:#f59e0b;background:rgba(245,158,11,.1);padding:2px 7px;border-radius:10px">⏰ ${prazoText}</span>`:''}
        </div>
        <div style="font-weight:600;font-size:13px;color:var(--ink);word-break:break-word">${esc(at.nome)}</div>
        ${at.descricao?`<div style="font-size:12px;color:var(--ink2);margin-top:2px">${esc(at.descricao)}</div>`:''}
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0">
        <button type="button" class="btn" style="font-size:11px;padding:2px 8px" onclick="abrirPlanoModal(${at.id})" title="Editar" aria-label="Editar atividade">✎</button>
        <button type="button" class="btn" style="font-size:11px;padding:2px 8px" onclick="duplicarAtividade(${at.id})" title="Duplicar" aria-label="Duplicar atividade">⧉</button>
        <button type="button" class="btn" style="font-size:11px;padding:2px 8px;color:var(--red)" onclick="deletarAtividade(${at.id})" title="Excluir" aria-label="Excluir atividade">🗑</button>
      </div>
    </div>
    <div style="display:flex;gap:12px;align-items:center;margin-top:.6rem;flex-wrap:wrap">
      ${at.responsavel?`<span style="font-size:11px;color:var(--ink3)">👤 ${esc(at.responsavel)}</span>`:''}
      ${at.prazo?`<span style="font-size:11px;color:${prazoColor}">📅 ${at.prazo}${prazoWarn}</span>`:''}
      ${at.qt_prevista?`<span style="font-size:11px;color:var(--ink3)">📊 ${at.qt_realizada||0}/${at.qt_prevista} (${pct}%)</span>`:''}
    </div>
    ${at.qt_prevista?`<div style="margin-top:7px">
      <div style="display:flex;justify-content:space-between;margin-bottom:2px">
        <span style="font-size:10px;color:var(--ink3)">Progresso realizado</span>
        <span style="font-size:10px;font-weight:700;color:${cfg.cor}">${pct}%</span>
      </div>
      <div style="height:5px;background:var(--bdr2);border-radius:3px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${cfg.cor};border-radius:3px;transition:width .4s"></div>
      </div>
    </div>`:''}
    ${at.obs?`<div style="margin-top:6px;font-size:11px;color:var(--ink2);background:var(--bg2);border-radius:4px;padding:4px 8px;border-left:2px solid var(--bdr2)">📝 ${esc(at.obs)}</div>`:''}
    ${at.evidencia&&st==='concluida'?`<div style="margin-top:5px;font-size:11px;color:#14b8a6;background:rgba(20,184,166,.07);border-radius:4px;padding:4px 8px">✅ ${esc(at.evidencia)}</div>`:''}
    ${st==='concluida'&&at.entrega_status?`<div style="margin-top:5px;display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:700;padding:2px 9px;border-radius:10px;
      background:${entregaBg};
      color:${entregaColor}">
      ${entregaLabel}
    </div>`:''}
  </div>`;
}

function fecharPlanoModal(){
  document.getElementById('plano-modal').style.display='none';
}

function planoVinculoOptsHTML(tipo, selId){
  if(tipo==='mapeamento'){
    return processos.map(p=>`<option value="${p.id}" ${selId==p.id?'selected':''}>${esc(p.nome)}</option>`).join('');
  }
  if(tipo==='auditoria'){
    const src = processos.filter(p=>p.auditoria||p.aud?.length);
    return (src.length?src:processos).map(p=>`<option value="${p.id}" ${selId==p.id?'selected':''}>Aud: ${esc(p.nome)}</option>`).join('');
  }
  return '';
}

function _planoModalBodyHTML(at){
  const vTipo = at?.vinculo_tipo||'';
  const vId   = at?.vinculo_id||'';
  const trOpts = ['Anual','T1','T2','T3','T4'].map(t=>{
    const sel = (at?.trimestre||'Anual')===t ? 'selected' : '';
    return `<option value="${t}" ${sel}>${t}</option>`;
  }).join('');
  const catOpts = Object.entries(PLANO_CAT_LB).map(([v,l])=>{
    const sel = at?.categoria===v ? 'selected' : '';
    return `<option value="${v}" ${sel}>${l}</option>`;
  }).join('');
  return `
    <input type="hidden" id="pm-id" value="${at?.id||''}">
    <input type="hidden" id="pm-ano" value="${at?.ano||planoAno()}">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.7rem">
      <div style="grid-column:1/-1">
        <div class="fl">Nome da atividade *</div>
        <input class="fi" id="pm-nome" value="${esc(at?.nome||'')}" placeholder="Ex: Auditoria do processo de licitação">
      </div>
      <div style="grid-column:1/-1">
        <div class="fl">Descrição</div>
        <textarea class="fi" id="pm-desc" rows="2" style="resize:vertical">${esc(at?.descricao||'')}</textarea>
      </div>
      <div>
        <div class="fl">Responsável</div>
        <input class="fi" id="pm-resp" value="${esc(at?.responsavel||usuarioLogado?.nome||'')}">
      </div>
      <div>
        <div class="fl">Prazo para conclusão</div>
        <input class="fi" type="date" id="pm-prazo" value="${at?.prazo||''}">
      </div>
      <div>
        <div class="fl">Trimestre</div>
        <select class="fi" id="pm-tri">
          ${trOpts}
        </select>
      </div>
      <div>
        <div class="fl">Status</div>
        <select class="fi" id="pm-status">
          <option value="planejado"   ${(!at||at.status==='planejado')?'selected':''}>Planejado</option>
          <option value="em_execucao" ${at?.status==='em_execucao'?'selected':''}>Em execução</option>
          <option value="em_atraso"   ${at?.status==='em_atraso'?'selected':''}>Em atraso</option>
          <option value="concluida"   ${at?.status==='concluida'?'selected':''}>Concluída</option>
        </select>
      </div>
      <div>
        <div class="fl">Prioridade</div>
        <select class="fi" id="pm-prio">
          <option value="alta"  ${at?.prioridade==='alta'?'selected':''}>Alta</option>
          <option value="media" ${(!at||at.prioridade==='media')?'selected':''}>Média</option>
          <option value="baixa" ${at?.prioridade==='baixa'?'selected':''}>Baixa</option>
        </select>
      </div>
      <div>
        <div class="fl">Categoria</div>
        <select class="fi" id="pm-cat">
          <option value="">Selecione...</option>
          ${catOpts}
        </select>
      </div>
      <div>
        <div class="fl">Quantidade prevista</div>
        <input class="fi" type="number" id="pm-qtprev" value="${at?.qt_prevista||''}" min="0" placeholder="0">
      </div>
      <div>
        <div class="fl">Quantidade realizada</div>
        <input class="fi" type="number" id="pm-qtreal" value="${at?.qt_realizada||''}" min="0" placeholder="0">
      </div>
      <div>
        <div class="fl">Tipo de vínculo</div>
        <select class="fi" id="pm-vint" onchange="planoAtualizarVinculo()">
          <option value="">Sem vínculo</option>
          <option value="mapeamento" ${vTipo==='mapeamento'?'selected':''}>Mapeamento</option>
          <option value="auditoria"  ${vTipo==='auditoria'?'selected':''}>Auditoria</option>
        </select>
      </div>
      <div>
        <div class="fl">Processo vinculado</div>
        <select class="fi" id="pm-vinid" ${vTipo?'':'disabled'}>
          <option value="">Selecione...</option>
          ${planoVinculoOptsHTML(vTipo,vId)}
        </select>
      </div>
      <div style="grid-column:1/-1">
        <div class="fl">Observações / andamento</div>
        <textarea class="fi" id="pm-obs" rows="2" style="resize:vertical">${esc(at?.obs||'')}</textarea>
      </div>
      <div style="grid-column:1/-1">
        <div class="fl">Evidência de conclusão</div>
        <textarea class="fi" id="pm-evid" rows="2" style="resize:vertical" placeholder="Descreva como a conclusão será/foi comprovada...">${esc(at?.evidencia||'')}</textarea>
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:1.2rem;border-top:1px solid var(--bdr);padding-top:1rem">
      <button type="button" class="btn" onclick="fecharPlanoModal()">Cancelar</button>
      <button type="button" class="btn btn-p" onclick="salvarAtividade()">Salvar atividade</button>
    </div>`;
}
function abrirPlanoModal(idOrObj){
  const at = typeof idOrObj==='number' ? plano.find(a=>a.id===idOrObj) : (idOrObj||null);
  const isNew = !at||!at.id;
  document.getElementById('plano-modal-title').textContent = isNew?'Nova atividade':'Editar atividade';
  document.getElementById('plano-modal-body').innerHTML = _planoModalBodyHTML(at);
  document.getElementById('plano-modal').style.display='block';
}

function planoAtualizarVinculo(){
  const tipo = document.getElementById('pm-vint')?.value||'';
  const sel  = document.getElementById('pm-vinid');
  if(!sel) return;
  sel.disabled = !tipo;
  sel.innerHTML = '<option value="">Selecione...</option>' + planoVinculoOptsHTML(tipo,'');
}

async function salvarAtividade(){
  const nome = document.getElementById('pm-nome')?.value.trim();
  if(!nome){toast('Informe o nome da atividade.','var(--amber)');return;}
  const id    = Number.parseInt(document.getElementById('pm-id')?.value)||0;
  const ano   = Number.parseInt(document.getElementById('pm-ano')?.value)||planoAno();
  const vTipo = document.getElementById('pm-vint')?.value||'';
  const vSel  = document.getElementById('pm-vinid');
  const vId   = vTipo&&vSel?.value ? Number.parseInt(vSel.value)||null : null;
  const vNome = vId ? (vSel.options[vSel.selectedIndex]?.text||'').replace(/^Aud:\s*/,'') : '';
  const qtPrev= Number.parseFloat(document.getElementById('pm-qtprev')?.value)||0;
  const qtReal= Number.parseFloat(document.getElementById('pm-qtreal')?.value)||0;
  const antigo= plano.find(a=>a.id===id);
  const at = {
    id: id||_planoIdC++,
    ano,
    nome,
    descricao:    document.getElementById('pm-desc')?.value.trim()||'',
    responsavel:  document.getElementById('pm-resp')?.value.trim()||'',
    prazo:        document.getElementById('pm-prazo')?.value||'',
    trimestre:    document.getElementById('pm-tri')?.value||'Anual',
    status:       document.getElementById('pm-status')?.value||'planejado',
    prioridade:   document.getElementById('pm-prio')?.value||'media',
    categoria:    document.getElementById('pm-cat')?.value||'',
    vinculo_tipo: vTipo,
    vinculo_id:   vId,
    vinculo_nome: vNome,
    qt_prevista:  qtPrev,
    qt_realizada: qtReal,
    obs:          document.getElementById('pm-obs')?.value.trim()||'',
    evidencia:    document.getElementById('pm-evid')?.value.trim()||'',
    dt_criacao:   antigo?.dt_criacao||new Date().toISOString().split('T')[0],
    dt_atualizacao: new Date().toISOString().split('T')[0],
    // Preserva histórico de entrega (calculado abaixo se estiver concluindo agora)
    dt_conclusao:   antigo?.dt_conclusao||'',
    entrega_status: antigo?.entrega_status||'',
    dias_atraso:    antigo?.dias_atraso??null,
  };
  // Detectar conclusão: status mudou para concluida agora
  const eraConcluidaAntes = antigo?.status==='concluida' || (antigo?.qt_prevista>0 && (antigo?.qt_realizada||0)>=antigo?.qt_prevista);
  const ficouConcluida = at.status==='concluida' || (at.qt_prevista>0 && at.qt_realizada>=at.qt_prevista);
  if(ficouConcluida && !eraConcluidaAntes){
    const hoje = new Date().toISOString().split('T')[0];
    at.dt_conclusao = hoje;
    if(at.prazo){
      const diffMs = new Date(hoje) - new Date(at.prazo);
      const dias   = Math.ceil(diffMs / 86400000); // positivo = atraso, negativo = adiantado
      at.dias_atraso    = Math.max(0, dias);
      at.entrega_status = dias <= 0 ? 'em_dia' : 'com_atraso';
    } else {
      at.entrega_status = 'sem_prazo';
      at.dias_atraso    = 0;
    }
  } else if(!ficouConcluida){
    // Reaberta: limpa os selos
    at.dt_conclusao   = '';
    at.entrega_status = '';
    at.dias_atraso    = null;
  }
  if(id){ const i=plano.findIndex(a=>a.id===id); if(i>=0) plano[i]=at; else plano.push(at); }
  else plano.push(at);
  fecharPlanoModal();
  await fbSaveAll();
  rPlano();
  toast(id?'Atividade atualizada':'Atividade criada');
}

async function deletarAtividade(id){
  confirmar('Excluir esta atividade do plano?', async () => {
    plano = plano.filter(a=>a.id!==id);
    if(fbReady()){
      try {
        const {db, doc, deleteDoc} = fb();
        await deleteDoc(doc(db,'plano',String(id)));
      } catch(e){ console.warn('deletarAtividade error:', e.message); }
    }
    rPlano();
    toast('Atividade excluída','var(--amber)');
  });
}

function duplicarAtividade(id){
  const src = plano.find(a=>a.id===id);
  if(!src) return;
  abrirPlanoModal({...src, id:0, nome:src.nome+' (cópia)', status:'planejado', qt_realizada:0, evidencia:'', dt_criacao:'', dt_atualizacao:''});
}

function _fsClean(v){
  if(v===null||v===undefined) return null;
  if(Array.isArray(v)) return v.map(_fsClean);
  if(typeof v==='object'&&!(v instanceof Date)){
    const r={};
    for(const k of Object.keys(v)){if(v[k]!==undefined) r[k]=_fsClean(v[k]);}
    return r;
  }
  return v;
}
async function fbSaveAll(){
  if(!fbReady()) return;
  try {
    const {db, doc, writeBatch} = fb();

    // Collect all set operations (strip undefined — Firestore rejects it)
    const ops = [];
    processos.forEach(p => ops.push({ref: doc(db,'processos',String(p.id)), data: _fsClean(p)}));
    kpis.forEach(k => ops.push({ref: doc(db,'kpis',String(k.id)), data: _fsClean(k)}));
    publicacoes.forEach(p => ops.push({ref: doc(db,'publicacoes',String(p.id)), data: _fsClean(p)}));
    plano.forEach(a => ops.push({ref: doc(db,'plano',String(a.id)), data: _fsClean(a)}));
    TRILHAS.forEach(t => ops.push({ref: doc(db,'trilhas',String(t.id)), data: _fsClean(t)}));
    ops.push(
      {ref: doc(db,'config','arquitetura'), data: {data: JSON.stringify(ARQUITETURA)}},
      {ref: doc(db,'config','usuarios'),    data: {data: JSON.stringify(USUARIOS)}},
      {ref: doc(db,'config','mapeados'),    data: {data: JSON.stringify([...mapeadosManual])}},
      {ref: doc(db,'config','criticos'),    data: {data: JSON.stringify([...criticosManual])}}
    );

    // Firestore batch limit is 500 — split into chunks of 450
    for(let i = 0; i < ops.length; i += 450){
      const batch = writeBatch(db);
      ops.slice(i, i + 450).forEach(({ref, data}) => batch.set(ref, data));
      await batch.commit();
    }
    toast('✓ Dados salvos na nuvem', 'var(--teal)');
  } catch(e){ console.warn('fbSaveAll error:', e.message); toast('⚠ Erro ao salvar na nuvem: '+e.message,'var(--red)'); }
}

// ── LOAD ──────────────────────────────────
async function fbLoad(){
  if(!fbReady()){
    console.info('Firebase não configurado — usando dados locais.');
    return false;
  }
  try {
    const {db, collection, getDocs, doc, getDoc} = fb();

    // processos
    const pSnap = await getDocs(collection(db,'processos'));
    if(!pSnap.empty){
      processos = [];
      pSnap.forEach(d => processos.push(d.data()));
      processos.sort((a,b) => a.id - b.id);
      nextProcId = Math.max(...processos.map(p=>p.id), 0) + 1;
      // Sync etapasIdC so new etapa IDs never collide with existing ones
      const allEtapaNums = processos.flatMap(p=>(p.mod?.etapas_proc||[]).map(e=>Number.parseInt(String(e.id||'').replaceAll('ep',''))||0));
      if(allEtapaNums.length) etapasIdC = Math.max(...allEtapaNums) + 1;
    }

    // kpis
    const kSnap = await getDocs(collection(db,'kpis'));
    if(!kSnap.empty){
      kpis = [];
      kSnap.forEach(d => kpis.push(d.data()));
      _kpiIdC = Math.max(...kpis.map(k=>k.id), 0) + 1;
    }

    // plano de trabalho
    const planoSnap = await getDocs(collection(db,'plano'));
    if(!planoSnap.empty){
      plano = [];
      planoSnap.forEach(d => plano.push(d.data()));
      _planoIdC = Math.max(...plano.map(a=>a.id), 0) + 1;
    }

    // solicitacoes de acesso
    const solSnap = await getDocs(collection(db,'solicitacoes'));
    if(!solSnap.empty){
      solicitacoes = [];
      solSnap.forEach(d => solicitacoes.push(d.data()));
    }

    // publicacoes
    const pubSnap = await getDocs(collection(db,'publicacoes'));
    if(!pubSnap.empty){
      publicacoes = [];
      pubSnap.forEach(d => publicacoes.push(d.data()));
      _pubIdC = Math.max(...publicacoes.map(p=>p.id), 0) + 1;
    }

    // arquitetura
    const arqDoc = await getDoc(doc(db,'config','arquitetura'));
    if(arqDoc.exists() && arqDoc.data().data){
      ARQUITETURA = JSON.parse(arqDoc.data().data);
    }

    // usuarios
    const usrDoc = await getDoc(doc(db,'config','usuarios'));
    if(usrDoc.exists() && usrDoc.data().data){
      USUARIOS = JSON.parse(usrDoc.data().data);
    }

    // mapeados manualmente
    const mapDoc = await getDoc(doc(db,'config','mapeados'));
    if(mapDoc.exists() && mapDoc.data().data){
      mapeadosManual = new Set(JSON.parse(mapDoc.data().data));
      lsSet('mapeadosManual', JSON.stringify([...mapeadosManual]));
    }

    // críticos manualmente
    const critDoc = await getDoc(doc(db,'config','criticos'));
    if(critDoc.exists() && critDoc.data().data){
      criticosManual = new Set(JSON.parse(critDoc.data().data));
      lsSet('criticosManual', JSON.stringify([...criticosManual]));
    }

    // emailjs config
    const ejsDoc = await getDoc(doc(db,'config','ejs'));
    if(ejsDoc.exists()){
      const d = ejsDoc.data();
      ejsConfig.service  = d.service  || '';
      ejsConfig.template = d.template || '';
      ejsConfig.pubkey   = d.pubkey   || '';
      if(ejsConfig.pubkey && typeof emailjs !== 'undefined'){
        emailjs.init({publicKey: ejsConfig.pubkey});
      }
    }

    // avisos
    const avSnap = await getDocs(collection(db,'avisos'));
    if(!avSnap.empty){
      AVISOS = [];
      avSnap.forEach(d => AVISOS.push(d.data()));
    }

    // trilhas de capacitação
    const trilhasSnap = await getDocs(collection(db,'trilhas'));
    if(!trilhasSnap.empty){
      TRILHAS = [];
      trilhasSnap.forEach(d => TRILHAS.push(d.data()));
      _trilhaIdC = Math.max(...TRILHAS.map(t => t.id), 0) + 1;
    }

    console.info('Firebase: dados carregados');
    return true;
  } catch(e){
    console.warn('fbLoad error:', e.message);
    return false;
  }
}

// ─── QUADRO DE AVISOS ────────────────────────────────────────

function rCarrosselAvisos(){
  const el = document.getElementById('avisos-carousel');
  if(!el || !usuarioLogado) return;
  const perfil = usuarioLogado.perfil;
  const ativos = AVISOS.filter(a => a.ativo && a.perfis && (a.perfis.includes('todos') || a.perfis.includes(perfil)));
  if(!ativos.length){ el.style.display='none'; el.innerHTML=''; return; }

  if(globalThis._avTimer){ clearInterval(globalThis._avTimer); globalThis._avTimer=null; }
  let idx = 0;

  function render(){
    const a = ativos[idx];
    const dotSpans = ativos.map((_,i)=>{
      const w  = i===idx ? 18 : 6;
      const bg = i===idx ? 'var(--blue)' : 'var(--blue-b)';
      return `<span style="width:${w}px;height:6px;border-radius:99px;background:${bg};transition:width .2s"></span>`;
    }).join('');
    const dots = ativos.length > 1
      ? `<div style="display:flex;gap:5px;align-items:center">${dotSpans}</div>`
      : '';
    const nav = ativos.length > 1
      ? `<button type="button" onclick="globalThis._avPrev()" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.7);border:1px solid var(--blue-b);border-radius:50%;width:26px;height:26px;cursor:pointer;font-size:14px;color:var(--blue);display:flex;align-items:center;justify-content:center;line-height:1">‹</button>
         <button type="button" onclick="globalThis._avNext()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.7);border:1px solid var(--blue-b);border-radius:50%;width:26px;height:26px;cursor:pointer;font-size:14px;color:var(--blue);display:flex;align-items:center;justify-content:center;line-height:1">›</button>`
      : '';
    el.innerHTML = `
      <div style="position:relative;background:var(--blue-l);border:1px solid var(--blue-b);border-radius:var(--rl);padding:1rem ${ativos.length>1?'2.8rem':'1.2rem'} 1rem 1.2rem;margin-bottom:1.2rem">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 3h12a1 1 0 011 1v7a1 1 0 01-1 1H9l-1 2-1-2H2a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="var(--blue)" stroke-width="1.5"/></svg>
          <span style="font-size:10px;font-weight:700;color:var(--blue);letter-spacing:.08em;text-transform:uppercase">Aviso ${ativos.length>1?idx+1+' / '+ativos.length:''}</span>
        </div>
        <div style="font-family:var(--fh);font-size:14px;font-weight:600;color:var(--ink);margin-bottom:4px">${esc(a.titulo)}</div>
        <div style="font-size:13px;color:var(--ink2);line-height:1.6;margin-bottom:.6rem">${esc(a.corpo)}</div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span style="font-size:11px;color:var(--ink4)">${esc(a.autor)} · ${esc(a.data)}</span>
          ${dots}
        </div>
        ${nav}
      </div>`;
  }

  globalThis._avNext = ()=>{ idx=(idx+1)%ativos.length; render(); };
  globalThis._avPrev = ()=>{ idx=(idx-1+ativos.length)%ativos.length; render(); };
  el.style.display = '';
  render();
  if(ativos.length > 1) globalThis._avTimer = setInterval(globalThis._avNext, 6000);
}

function updAvisosCnt(){
  const el = document.getElementById('nb-avisos-cnt');
  if(el) el.textContent = AVISOS.filter(a=>a.ativo).length;
}

function rAvisos(){
  updAvisosCnt();
  const tbody = document.getElementById('avisos-tbody');
  if(!tbody) return;
  if(!AVISOS.length){
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--ink4)">Nenhum aviso criado</td></tr>';
    return;
  }
  tbody.innerHTML = AVISOS.map(a=>`
    <tr>
      <td style="font-weight:500">${esc(a.titulo)}</td>
      <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink2)">${esc(a.corpo)}</td>
      <td style="font-size:12px">${(a.perfis||[]).map(p=>p==='todos'?'<span style="background:var(--slate-l);color:var(--slate);padding:2px 7px;border-radius:99px;font-size:11px">Todos</span>':('<span style="background:var(--bg2);color:var(--ink2);padding:2px 7px;border-radius:99px;font-size:11px">'+(PERFIL_LABELS[p]||p)+'</span>')).join(' ')}</td>
      <td><span style="padding:2px 9px;border-radius:99px;font-size:11px;font-weight:600;background:${a.ativo?'var(--green-l)':'var(--bg2)'};color:${a.ativo?'var(--green)':'var(--ink4)'}">${a.ativo?'Ativo':'Inativo'}</span></td>
      <td style="display:flex;gap:6px">
        <button type="button" class="btn" style="font-size:11px" onclick="abrirModalAviso('${a.id}')">Editar</button>
      </td>
    </tr>`).join('');
}

function abrirModalAviso(id){
  const modal = document.getElementById('aviso-modal');
  const aviso = id ? AVISOS.find(a=>a.id===id) : null;
  document.getElementById('aviso-modal-t').textContent = aviso ? 'Editar aviso' : 'Novo aviso';
  document.getElementById('aviso-id').value = id||'';
  document.getElementById('aviso-titulo').value = aviso?.titulo||'';
  document.getElementById('aviso-corpo').value = aviso?.corpo||'';
  document.getElementById('aviso-ativo').checked = aviso ? aviso.ativo : true;
  const perfis = aviso?.perfis || ['todos'];
  const todosChk = document.getElementById('aviso-perfil-todos');
  todosChk.checked = perfis.includes('todos');
  ['ep','dono'].forEach(p=>{
    const cb = document.getElementById('aviso-perfil-'+p);
    if(cb) cb.checked = perfis.includes(p);
  });
  onAvisoPerfisChg();
  const delBtn = document.getElementById('aviso-del-btn');
  if(delBtn) delBtn.style.display = aviso ? '' : 'none';
  modal.style.display = 'flex';
}

function onAvisoPerfisChg(){
  const todos = document.getElementById('aviso-perfil-todos');
  const ind = document.getElementById('aviso-perfis-ind');
  if(!todos || !ind) return;
  ind.style.opacity = todos.checked ? '.4' : '1';
  ind.style.pointerEvents = todos.checked ? 'none' : '';
}

async function salvarAviso(){
  const id = document.getElementById('aviso-id').value || ('av_'+Date.now());
  const titulo = document.getElementById('aviso-titulo').value.trim();
  const corpo = document.getElementById('aviso-corpo').value.trim();
  const ativo = document.getElementById('aviso-ativo').checked;
  if(!titulo){ toast('Informe o título do aviso.','var(--amber)'); return; }
  if(!corpo)  { toast('Informe a mensagem do aviso.','var(--amber)'); return; }
  const todosChk = document.getElementById('aviso-perfil-todos').checked;
  let perfis;
  if(todosChk){
    perfis = ['todos'];
  } else {
    perfis = ['ep','dono'].filter(p=>document.getElementById('aviso-perfil-'+p)?.checked);
    if(!perfis.length){ toast('Selecione ao menos um perfil destinatário.','var(--amber)'); return; }
  }
  const aviso = { id, titulo, corpo, perfis, ativo, autor: usuarioLogado.nome, data: now() };
  const idx = AVISOS.findIndex(a=>a.id===id);
  if(idx>=0) AVISOS[idx]=aviso; else AVISOS.push(aviso);
  if(fbReady()){
    try{ const {db,doc,setDoc}=fb(); await setDoc(doc(db,'avisos',id), aviso); }
    catch(e){ console.warn('salvarAviso error:',e.message); }
  }
  document.getElementById('aviso-modal').style.display='none';
  rAvisos();
  toast('✓ Aviso salvo','var(--teal)');
}

async function excluirAvisoModal(){
  const id = document.getElementById('aviso-id').value;
  if(!id) return;
  confirmar('Excluir este aviso permanentemente?', async () => {
    AVISOS = AVISOS.filter(a=>a.id!==id);
    if(fbReady()){
      try{ const {db,doc,deleteDoc}=fb(); await deleteDoc(doc(db,'avisos',id)); }
      catch(e){ console.warn('excluirAviso error:',e.message); }
    }
    document.getElementById('aviso-modal').style.display='none';
    rAvisos();
    toast('Aviso excluído','var(--ink3)');
  });
}


// ── AUTO-SAVE HOOKS ───────────────────────
// Wrap key mutation functions to auto-save after changes

// ═══════════════════════════════════════════
// TRILHAS DE CAPACITAÇÃO
// ═══════════════════════════════════════════

// ── Render ────────────────────────────────
function rTrilhas(){
  const el = document.getElementById('trilhas-lista');
  if(!el) return;
  if(!TRILHAS.length){
    el.innerHTML = '<div class="ib ibb">Nenhuma trilha cadastrada. Clique em "+ Nova trilha" para começar.</div>';
    return;
  }
  el.innerHTML = TRILHAS.map(t => _trilhaCardHTML(t)).join('');
}

function _trilhaCardHTML(t){
  const macroNome = _trilhaMacroNome(t.macro_id);
  const procsVinc = (t.proc_ids||[]).map(pid => {
    const p = processos.find(x => x.id === pid);
    return p ? esc(p.nome) : '';
  }).filter(Boolean);
  const procsHtml = procsVinc.length
    ? procsVinc.map(n => '<span class="badge bgr" style="font-size:10px;margin-right:3px">'+n+'</span>').join('')
    : '<span style="font-size:12px;color:var(--ink3)">Nenhum processo vinculado</span>';
  const niveisCount = (t.niveis||[]).length;
  const compCount = (t.niveis||[]).reduce((acc, nv) => acc + (nv.competencias||[]).length, 0);
  const btnsEP = isEP()
    ? '<button type="button" class="btn" style="font-size:11px;padding:2px 8px" onclick="editarTrilha('+t.id+')">✎ Editar</button>'
      + '<button type="button" class="btn" style="font-size:11px;padding:2px 8px;color:var(--red);border-color:var(--red)" onclick="excluirTrilha('+t.id+')" aria-label="Excluir trilha">✕</button>'
    : '';
  return '<div class="card" style="margin-bottom:1rem">'
    + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:.5rem">'
    + '<div>'
    + '<div style="font-family:var(--fh);font-size:15px;font-weight:600;margin-bottom:2px">'+esc(t.nome)+'</div>'
    + '<div style="font-size:12px;color:var(--ink3);margin-bottom:4px">'+esc(macroNome)+'</div>'
    + (t.descricao ? '<div style="font-size:13px;color:var(--ink2);margin-bottom:6px">'+esc(t.descricao)+'</div>' : '')
    + '<div style="margin-bottom:4px">'+procsHtml+'</div>'
    + '<div style="font-size:11px;color:var(--ink3)">'+niveisCount+' nível(is) · '+compCount+' competência(s)</div>'
    + '</div>'
    + '<div style="display:flex;gap:4px;flex-shrink:0">'+btnsEP+'</div>'
    + '</div>'
    + '<div id="trilha-niveis-'+t.id+'" style="margin-top:.6rem">'
    + _trilhaNiveisHTML(t)
    + '</div>'
    + '</div>';
}

function _trilhaNiveisHTML(t){
  if(!(t.niveis||[]).length){ return ''; }
  return t.niveis.map(nv => {
    const compHtml = (nv.competencias||[]).length
      ? nv.competencias.map(c => _trilhaCompHTML(c)).join('')
      : '<div style="font-size:12px;color:var(--ink3);padding:.3rem 0">Nenhuma competência cadastrada.</div>';
    return '<details style="margin-bottom:.4rem;border:1px solid var(--bdr);border-radius:var(--r)">'
      + '<summary style="padding:.5rem .8rem;cursor:pointer;font-weight:600;font-size:13px;list-style:none;display:flex;align-items:center;gap:6px">'
      + '<span style="background:var(--blue);color:#fff;border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0">'+nv.ordem+'</span>'
      + esc(nv.nome)
      + '</summary>'
      + '<div style="padding:.6rem .8rem .8rem">'+compHtml+'</div>'
      + '</details>';
  }).join('');
}

function _trilhaCompHTML(c){
  const cursosHtml = (c.cursos||[]).length
    ? '<ul style="margin:.4rem 0 0 1rem;padding:0;font-size:12px;color:var(--ink2)">'
      + c.cursos.map(cs => {
        const link = safeUrl(cs.link);
        const label = esc(cs.nome);
        const tipoTag = cs.tipo ? ' <span style="font-size:10px;color:var(--ink3)">['+esc(cs.tipo)+']</span>' : '';
        if(link){ return '<li><a href="'+link+'" target="_blank" rel="noopener noreferrer" style="color:var(--blue)">'+label+'</a>'+tipoTag+'</li>'; }
        return '<li>'+label+tipoTag+'</li>';
      }).join('')
      + '</ul>'
    : '';
  return '<div style="padding:.4rem 0;border-bottom:1px solid var(--bdr)">'
    + '<div style="font-size:13px;font-weight:500">'+esc(c.nome)+'</div>'
    + (c.descricao ? '<div style="font-size:12px;color:var(--ink2);margin-top:2px">'+esc(c.descricao)+'</div>' : '')
    + cursosHtml
    + '</div>';
}

function _trilhaMacroNome(macroId){
  const m = ARQUITETURA.find(x => x.id === macroId);
  return m ? m.nome : '—';
}

// ── Abrir / Fechar Modal ───────────────────
function abrirNovaTrilha(){
  if(!isEP()){ toast('Ação restrita ao EPP.','var(--amber)'); return; }
  const modal = document.getElementById('trilha-modal');
  if(!modal) return;
  document.getElementById('trilha-modal-t').textContent = 'Nova trilha';
  document.getElementById('trilha-edit-id').value = '';
  document.getElementById('trilha-del-btn').style.display = 'none';
  document.getElementById('trilha-nome').value = '';
  document.getElementById('trilha-desc').value = '';
  document.getElementById('trilha-niveis-num').value = '3';
  _trilhaPopulateMacros('');
  _trilhaBuildNiveisEditor([]);
  modal.style.display = 'flex';
}

function editarTrilha(id){
  if(!isEP()){ toast('Ação restrita ao EPP.','var(--amber)'); return; }
  const t = TRILHAS.find(x => x.id === id);
  if(!t) return;
  const modal = document.getElementById('trilha-modal');
  document.getElementById('trilha-modal-t').textContent = 'Editar trilha';
  document.getElementById('trilha-edit-id').value = String(id);
  document.getElementById('trilha-del-btn').style.display = '';
  document.getElementById('trilha-nome').value = t.nome;
  document.getElementById('trilha-desc').value = t.descricao || '';
  document.getElementById('trilha-niveis-num').value = String((t.niveis||[]).length || 3);
  _trilhaPopulateMacros(t.macro_id||'');
  trilhaPopulateProcs(t.proc_ids||[]);
  _trilhaBuildNiveisEditor(t.niveis||[]);
  modal.style.display = 'flex';
}

function _trilhaPopulateMacros(selectedId){
  const sel = document.getElementById('trilha-macro');
  if(!sel) return;
  sel.innerHTML = '<option value="">Selecione...</option>'
    + ARQUITETURA.map(m => '<option value="'+esc(m.id)+'"'+(m.id===selectedId?' selected':'')+'>'+esc(m.nome)+'</option>').join('');
}

function trilhaPopulateProcs(selectedIds){
  const macroId = document.getElementById('trilha-macro')?.value;
  const container = document.getElementById('trilha-procs-chk');
  if(!container) return;
  const checked = Array.isArray(selectedIds) ? selectedIds : [];
  if(!macroId){
    container.innerHTML = '<span style="font-size:12px;color:var(--ink3)">Selecione o macroprocesso primeiro.</span>';
    return;
  }
  const macro = ARQUITETURA.find(m => m.id === macroId);
  if(!macro || !(macro.processos||[]).length){
    container.innerHTML = '<span style="font-size:12px;color:var(--ink3)">Nenhum processo neste macroprocesso.</span>';
    return;
  }
  const items = [];
  macro.processos.forEach(ap => {
    if(ap.proc_id != null){
      const pid = ap.proc_id;
      const isChk = checked.includes(pid) ? ' checked' : '';
      items.push('<label style="display:flex;align-items:center;gap:7px;font-size:13px;cursor:pointer;padding:2px 0">'
        + '<input type="checkbox" class="trilha-proc-chk" value="'+pid+'"'+isChk+'> '+esc(ap.nome)+'</label>');
    }
    (ap.subprocessos||[]).forEach(s => {
      if(s.proc_id != null){
        const pid = s.proc_id;
        const isChk = checked.includes(pid) ? ' checked' : '';
        items.push('<label style="display:flex;align-items:center;gap:7px;font-size:13px;cursor:pointer;padding:2px 0;padding-left:16px">'
          + '<input type="checkbox" class="trilha-proc-chk" value="'+pid+'"'+isChk+'> '+esc(s.nome)+'</label>');
      }
    });
  });
  container.innerHTML = items.length
    ? items.join('')
    : '<span style="font-size:12px;color:var(--ink3)">Nenhum processo cadastrado neste macroprocesso.</span>';
}

// ── Editor de Níveis (inline no modal) ─────
function _trilhaBuildNiveisEditor(niveis){
  globalThis._trilhaNiveisEdit = niveis.length
    ? niveis.map(nv => ({
        id:   nv.id   || ('nv_'+Date.now()+'_'+Math.random().toString(36).slice(2,6)),
        nome: nv.nome || '',
        ordem: nv.ordem || 1,
        competencias: (nv.competencias||[]).map(c => ({
          id:        c.id  || ('cp_'+Date.now()+'_'+Math.random().toString(36).slice(2,6)),
          nome:      c.nome      || '',
          descricao: c.descricao || '',
          cursos:    (c.cursos||[]).map(cs => ({nome:cs.nome||'',link:cs.link||'',tipo:cs.tipo||''})),
        })),
      }))
    : [];
  const numInput = Number.parseInt(document.getElementById('trilha-niveis-num')?.value) || 3;
  while(globalThis._trilhaNiveisEdit.length < numInput){
    const ordem = globalThis._trilhaNiveisEdit.length + 1;
    globalThis._trilhaNiveisEdit.push({
      id: 'nv_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
      nome: 'Nível '+ordem, ordem, competencias:[],
    });
  }
  _trilhaRenderEditor();
}

function trilhaAddNivel(){
  if(!globalThis._trilhaNiveisEdit){ globalThis._trilhaNiveisEdit = []; }
  const ordem = globalThis._trilhaNiveisEdit.length + 1;
  globalThis._trilhaNiveisEdit.push({
    id: 'nv_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
    nome: 'Nível '+ordem, ordem, competencias:[],
  });
  _trilhaRenderEditor();
}

function trilhaRemNivel(nvId){
  if(!globalThis._trilhaNiveisEdit) return;
  globalThis._trilhaNiveisEdit = globalThis._trilhaNiveisEdit.filter(n => n.id !== nvId);
  globalThis._trilhaNiveisEdit.forEach((n, i) => { n.ordem = i + 1; });
  _trilhaRenderEditor();
}

function trilhaAddComp(nvId){
  if(!globalThis._trilhaNiveisEdit) return;
  const nv = globalThis._trilhaNiveisEdit.find(n => n.id === nvId);
  if(!nv) return;
  nv.competencias.push({
    id: 'cp_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
    nome:'', descricao:'', cursos:[],
  });
  _trilhaRenderEditor();
}

function trilhaRemComp(nvId, cpId){
  if(!globalThis._trilhaNiveisEdit) return;
  const nv = globalThis._trilhaNiveisEdit.find(n => n.id === nvId);
  if(!nv) return;
  nv.competencias = nv.competencias.filter(c => c.id !== cpId);
  _trilhaRenderEditor();
}

function trilhaAddCurso(nvId, cpId){
  if(!globalThis._trilhaNiveisEdit) return;
  const nv = globalThis._trilhaNiveisEdit.find(n => n.id === nvId);
  if(!nv) return;
  const cp = nv.competencias.find(c => c.id === cpId);
  if(!cp) return;
  cp.cursos.push({nome:'', link:'', tipo:''});
  _trilhaRenderEditor();
}

function trilhaRemCurso(nvId, cpId, cidx){
  if(!globalThis._trilhaNiveisEdit) return;
  const nv = globalThis._trilhaNiveisEdit.find(n => n.id === nvId);
  if(!nv) return;
  const cp = nv.competencias.find(c => c.id === cpId);
  if(!cp) return;
  cp.cursos.splice(cidx, 1);
  _trilhaRenderEditor();
}

function _trilhaFlushEditorInputs(){
  if(!globalThis._trilhaNiveisEdit) return;
  globalThis._trilhaNiveisEdit.forEach(nv => {
    const nomeEl = document.getElementById('nvn-'+nv.id);
    if(nomeEl){ nv.nome = nomeEl.value; }
    nv.competencias.forEach(cp => {
      const cpNomeEl = document.getElementById('cpn-'+cp.id);
      const cpDescEl = document.getElementById('cpd-'+cp.id);
      if(cpNomeEl){ cp.nome = cpNomeEl.value; }
      if(cpDescEl){ cp.descricao = cpDescEl.value; }
      cp.cursos.forEach((cs, i) => {
        const csNomeEl = document.getElementById('csn-'+cp.id+'-'+i);
        const csLinkEl = document.getElementById('csl-'+cp.id+'-'+i);
        const csTipoEl = document.getElementById('cst-'+cp.id+'-'+i);
        if(csNomeEl){ cs.nome = csNomeEl.value; }
        if(csLinkEl){ cs.link = csLinkEl.value; }
        if(csTipoEl){ cs.tipo = csTipoEl.value; }
      });
    });
  });
}

function _trilhaRenderEditor(){
  const container = document.getElementById('trilha-niveis-editor');
  if(!container) return;
  const niveis = globalThis._trilhaNiveisEdit || [];
  if(!niveis.length){
    container.innerHTML = '<div style="font-size:12px;color:var(--ink3);padding:.4rem 0">Nenhum nível. Clique em "+ Nível" acima.</div>';
    return;
  }
  container.innerHTML = niveis.map(nv => _trilhaNivelEditorHTML(nv)).join('');
}

function _trilhaNivelEditorHTML(nv){
  const compsEl = (nv.competencias||[]).map(c => _trilhaCompEditorHTML(nv.id, c)).join('');
  return '<div style="border:1px solid var(--bdr);border-radius:var(--r);margin-bottom:.5rem;padding:.6rem .8rem">'
    + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:.4rem">'
    + '<span style="background:var(--blue);color:#fff;border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0">'+nv.ordem+'</span>'
    + '<input class="fi" id="nvn-'+nv.id+'" value="'+esc(nv.nome)+'" placeholder="Nome do nível" style="flex:1;font-size:13px">'
    + '<button type="button" class="btn" style="font-size:11px;padding:2px 7px;color:var(--red);border-color:var(--red)" onclick="trilhaFlushAndRemNivel(\''+nv.id+'\')" aria-label="Remover nível">✕</button>'
    + '</div>'
    + '<div style="margin-left:26px">'
    + compsEl
    + '<button type="button" class="btn" style="font-size:11px;padding:2px 8px;margin-top:.3rem" onclick="trilhaFlushAndAddComp(\''+nv.id+'\')">+ Competência</button>'
    + '</div>'
    + '</div>';
}

function _trilhaCompEditorHTML(nvId, c){
  const cursosEl = (c.cursos||[]).map((cs, i) => _trilhaCursoEditorHTML(nvId, c.id, i, cs)).join('');
  return '<div style="background:var(--bg2);border-radius:var(--r);padding:.5rem .6rem;margin-bottom:.4rem">'
    + '<div style="display:flex;align-items:center;gap:4px;margin-bottom:.3rem">'
    + '<input class="fi" id="cpn-'+c.id+'" value="'+esc(c.nome)+'" placeholder="Nome da competência*" style="flex:1;font-size:12px">'
    + '<button type="button" class="btn" style="font-size:10px;padding:1px 6px;color:var(--red);border-color:var(--red)" onclick="trilhaFlushAndRemComp(\''+nvId+'\',\''+c.id+'\')" aria-label="Remover competência">✕</button>'
    + '</div>'
    + '<input class="fi" id="cpd-'+c.id+'" value="'+esc(c.descricao||'')+'" placeholder="Descrição (opcional)" style="font-size:12px;margin-bottom:.3rem">'
    + cursosEl
    + '<button type="button" class="btn" style="font-size:10px;padding:1px 7px;margin-top:.2rem" onclick="trilhaFlushAndAddCurso(\''+nvId+'\',\''+c.id+'\')">+ Sugestão de curso</button>'
    + '</div>';
}

function _trilhaCursoEditorHTML(nvId, cpId, idx, cs){
  return '<div style="display:flex;align-items:center;gap:4px;margin-bottom:.25rem">'
    + '<input class="fi" id="csn-'+cpId+'-'+idx+'" value="'+esc(cs.nome||'')+'" placeholder="Nome do curso" style="flex:2;font-size:11px">'
    + '<input class="fi" id="csl-'+cpId+'-'+idx+'" value="'+esc(cs.link||'')+'" placeholder="Link (opcional)" style="flex:2;font-size:11px">'
    + '<input class="fi" id="cst-'+cpId+'-'+idx+'" value="'+esc(cs.tipo||'')+'" placeholder="Tipo (EAD, presencial...)" style="flex:1;font-size:11px">'
    + '<button type="button" class="btn" style="font-size:10px;padding:1px 5px;color:var(--red);border-color:var(--red)" onclick="trilhaFlushAndRemCurso(\''+nvId+'\',\''+cpId+'\','+idx+')" aria-label="Remover curso">✕</button>'
    + '</div>';
}

// Flush-and-mutate helpers (preserve input values before re-rendering)
function trilhaFlushAndRemNivel(nvId){ _trilhaFlushEditorInputs(); trilhaRemNivel(nvId); }
function trilhaFlushAndAddComp(nvId){ _trilhaFlushEditorInputs(); trilhaAddComp(nvId); }
function trilhaFlushAndRemComp(nvId,cpId){ _trilhaFlushEditorInputs(); trilhaRemComp(nvId,cpId); }
function trilhaFlushAndAddCurso(nvId,cpId){ _trilhaFlushEditorInputs(); trilhaAddCurso(nvId,cpId); }
function trilhaFlushAndRemCurso(nvId,cpId,cidx){ _trilhaFlushEditorInputs(); trilhaRemCurso(nvId,cpId,cidx); }

// ── Salvar ─────────────────────────────────
function salvarTrilha(){
  const nome = document.getElementById('trilha-nome').value.trim();
  const macroId = document.getElementById('trilha-macro').value;
  if(!nome){   toast('Informe o nome da trilha.','var(--amber)'); return; }
  if(!macroId){ toast('Selecione o macroprocesso.','var(--amber)'); return; }

  _trilhaFlushEditorInputs();

  const niveis = (globalThis._trilhaNiveisEdit||[]).map((nv, i) => ({
    id:   nv.id,
    nome: nv.nome || 'Nível '+(i+1),
    ordem: i + 1,
    competencias: (nv.competencias||[])
      .filter(c => c.nome.trim())
      .map(c => ({
        id:        c.id,
        nome:      c.nome.trim(),
        descricao: c.descricao.trim(),
        cursos:    (c.cursos||[]).filter(cs => cs.nome.trim()).map(cs => ({
          nome: cs.nome.trim(),
          link: cs.link.trim(),
          tipo: cs.tipo.trim(),
        })),
      })),
  }));

  const procIds = Array.from(
    document.querySelectorAll('.trilha-proc-chk:checked')
  ).map(chk => Number.parseInt(chk.value)).filter(v => !Number.isNaN(v));

  const editId = document.getElementById('trilha-edit-id').value;
  if(editId){
    const idx = TRILHAS.findIndex(t => t.id === Number.parseInt(editId));
    if(idx >= 0){
      TRILHAS[idx] = Object.assign({}, TRILHAS[idx], {
        nome,
        descricao: document.getElementById('trilha-desc').value.trim(),
        macro_id: macroId,
        proc_ids: procIds,
        niveis,
        atualizado_em: now(),
      });
    }
  } else {
    TRILHAS.push({
      id: _trilhaIdC++,
      nome,
      descricao: document.getElementById('trilha-desc').value.trim(),
      macro_id: macroId,
      proc_ids: procIds,
      niveis,
      criado_em: now(),
    });
  }

  document.getElementById('trilha-modal').style.display = 'none';
  fbAutoSave('salvarTrilha');
  rTrilhas();
  toast('Trilha salva!','var(--teal)');
}

// ── Excluir ────────────────────────────────
function excluirTrilha(id){
  confirmar('Remover esta trilha de capacitação?', () => {
    TRILHAS = TRILHAS.filter(t => t.id !== id);
    if(fbReady()){
      const {db, doc, deleteDoc} = fb();
      deleteDoc(doc(db,'trilhas',String(id))).catch(e => console.warn('deleteTrilha error:', e.message));
    }
    rTrilhas();
    toast('Trilha removida.','var(--amber)');
  });
}

function excluirTrilhaModal(){
  const id = Number.parseInt(document.getElementById('trilha-edit-id').value);
  if(!id) return;
  document.getElementById('trilha-modal').style.display = 'none';
  excluirTrilha(id);
}

// ── END TRILHAS ────────────────────────────

function fbAutoSave(label){
  if(!fbReady()) return;
  // Debounce: wait 1.5s after last change before saving
  clearTimeout(globalThis._fbSaveTimer);
  globalThis._fbSaveTimer = setTimeout(()=>{
    fbSaveAll();
  }, 1500);
}

// Save EmailJS config to Firebase when saved locally
async function fbSaveEjs(){
  if(!fbReady()) return;
  try {
    const {db, doc, setDoc} = fb();
    await setDoc(doc(db,'config','ejs'), ejsConfig);
  } catch(e){ console.warn('fbSaveEjs error:', e.message); }
}

// ── FLUXO BIZAGI (imagens) ────────────────
async function saveFluxoImg(arqId, base64){
  if(!fbReady()){ fluxosCache[arqId]=base64; return; }
  try {
    const {db, doc, setDoc} = fb();
    await setDoc(doc(db,'fluxos',arqId), {data: base64, updatedAt: Date.now()});
    fluxosCache[arqId] = base64;
  } catch(e){ console.warn('saveFluxoImg:', e.message); toast('⚠ Erro ao salvar imagem: '+e.message,'var(--red)'); }
}
async function loadFluxoImg(arqId){
  if(fluxosCache[arqId] !== undefined) return fluxosCache[arqId];
  if(!fbReady()) return null;
  try {
    const {db, doc, getDoc} = fb();
    const snap = await getDoc(doc(db,'fluxos',arqId));
    const data = snap.exists() ? (snap.data().data||null) : null;
    fluxosCache[arqId] = data;
    return data;
  } catch(e){ console.warn('loadFluxoImg:', e.message); return null; }
}
async function verFluxoBizagi(arqId, ev){
  ev&&ev.stopPropagation();
  const base64 = await loadFluxoImg(arqId);
  if(!base64){ toast('Nenhuma imagem de fluxo cadastrada para este processo.','var(--amber)'); return; }
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:zoom-out';
  ov.innerHTML = `<img src="${base64}" alt="Visualização ampliada do fluxo" style="max-width:95vw;max-height:85vh;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,.6);cursor:default" onclick="event.stopPropagation()">
    <button type="button" style="margin-top:1rem;background:#fff;border:none;border-radius:6px;padding:6px 18px;cursor:pointer;font-size:13px" onclick="event.stopPropagation();this.parentNode.remove()">✕ Fechar</button>`;
  ov.onclick = () => ov.remove();
  document.body.appendChild(ov);
}
function uploadFluxoArq(arqId, input){
  const file = input.files[0];
  if(!file) return;
  if(file.size > 3*1024*1024){ toast('Imagem muito grande (máx. 3 MB). Comprima antes de enviar.','var(--amber)'); input.value=''; return; }
  const reader = new FileReader();
  reader.onload = async e => {
    await saveFluxoImg(arqId, e.target.result);
    toast('✓ Imagem do fluxo Bizagi salva!', 'var(--teal)');
  };
  reader.readAsDataURL(file);
}
function previewFluxoImg(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const prev = document.getElementById('pop-fluxo-preview');
    const img  = document.getElementById('pop-fluxo-img-prev');
    if(prev && img){ img.src = e.target.result; prev.style.display = 'block'; }
  };
  reader.readAsDataURL(file);
}

// ── SAVE BUTTON ───────────────────────────
// Add a persistent "Salvar na nuvem" button to the sidebar footer
function injectSaveBtn(){
  const foot = document.querySelector('.aside-foot');
  if(!foot || document.getElementById('fb-save-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'fb-save-btn';
  btn.className = 'logout-btn';
  btn.style.cssText = 'color:rgba(255,255,255,.5);margin-top:4px;display:flex;align-items:center;gap:5px';
  btn.innerHTML = '☁ Salvar na nuvem agora';
  btn.onclick = fbSaveAll;
  foot.appendChild(btn);
}

// ── STATUS INDICATOR ─────────────────────
function fbStatusBadge(){
  const brand = document.querySelector('.aside-top');
  if(!brand || document.getElementById('fb-status')) return;
  const span = document.createElement('div');
  span.id = 'fb-status';
  span.style.cssText = 'font-size:9px;margin-top:4px;letter-spacing:.05em;text-transform:uppercase';
  span.textContent = fbReady() ? '● nuvem ativa' : '○ modo local';
  span.style.color = fbReady() ? '#8DD5C8' : 'rgba(255,255,255,.25)';
  brand.appendChild(span);
}

// ═══════════════════════════════════════════
// INIT — MODO LOCAL (login desativado para testes)
// ═══════════════════════════════════════════
// Tela de login neutralizada: o sistema abre direto no Hub
const _ls_init = document.getElementById('login-screen');
if(_ls_init) _ls_init.style.display='none';

// Boot sequence simplificada: apenas chama hooks essenciais (updCounts, badge, save btn)
// NÃO autentica via Firebase e NÃO reativa tela de login
(async function boot(){
  updCounts();
  try { fbStatusBadge(); } catch(_e) {}
  try { injectSaveBtn(); } catch(_e) {}
})();

// ═══════════════════════════════════════════
// IA — AZURE OPENAI VIA FIREBASE FUNCTION
// ═══════════════════════════════════════════

// URL da Firebase Function (preencher após deploy)
// NOTE: Load from config.local.js or localStorage for local development
const AI_FUNCTION_URL = (globalThis.CONFIG?.AI_FUNCTION_URL || 'https://ai-kvhsbvnxhq-uc.a.run.app');

async function chamarIA(mode, payload, targetEl){
  const url = lsGet('epcage_ai_url') || AI_FUNCTION_URL;
  if(!url || url === '__AI_FUNCTION_URL__'){
    const msg = 'URL da função IA não configurada. Acesse Notificações → Configuração da IA e informe a URL do Firebase Function.';
    if(targetEl) targetEl.innerHTML = `<div class="ai-result"><div class="ai-result-lbl">⚠ IA não configurada</div>${esc(msg)}</div>`;
    return null;
  }
  if(targetEl) targetEl.innerHTML = '<div class="ai-loading"><div class="spin"></div>IA analisando...</div>';
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({mode, payload}),
    });
    if(!resp.ok){
      const err = await resp.json().catch(()=>({error:'Erro desconhecido'}));
      throw new Error(err.error || 'Erro '+resp.status);
    }
    const text = await resp.text();
    if(text.trimStart().startsWith('<')){
      throw new Error('URL incorreta: o servidor retornou uma página HTML em vez de JSON. Verifique a URL da Firebase Function em Notificações → Configuração da IA.');
    }
    const data = JSON.parse(text);
    return data.result || '';
  } catch(e){
    if(targetEl) targetEl.innerHTML = `<div class="ai-result"><div class="ai-result-lbl">⚠ Erro</div>${esc(e.message)}</div>`;
    return null;
  }
}

// ── 1. ANALISAR BPMN ─────────────────────
async function iaAnalisarBpmn(which){
  const p = curProc;
  if(!p) return;
  const xmlKey = which === 'asis' ? 'bpmnAsIs' : 'bpmnToBe';
  const xml = p.mod?.[xmlKey];
  if(!xml){ toast('Salve o BPMN antes de analisar.','var(--amber)'); return; }

  const btn = document.getElementById('ia-bpmn-btn-'+which);
  const el  = document.getElementById('ia-bpmn-result-'+which);
  if(btn) btn.disabled = true;

  const result = await chamarIA('analisar_bpmn', xml, el);

  if(result){
    try {
      const json = JSON.parse(result);
      // Auto-populate análise fields if on analise step
      if(p.etapa === 'analise' || p.etapa === 'esboco_asis'){
        if(json.gargalos?.length)   { const f=document.getElementById('an-gar');   if(f) f.value = json.gargalos.join('\n'); }
        if(json.retrabalhos?.length){ const f=document.getElementById('an-ret');   if(f) f.value = json.retrabalhos.join('\n'); }
        if(json.gaps?.length)       { const f=document.getElementById('an-gap');   if(f) f.value = json.gaps.join('\n'); }
        if(json.oportunidades?.length){ const f=document.getElementById('an-oport'); if(f) f.value = json.oportunidades.join('\n'); }
        if(json.complexidade)       { const f=document.getElementById('an-comp');  if(f) f.value = json.complexidade; }
      }
      el.innerHTML = `<div class="ai-result">
        <div class="ai-result-lbl">✦ Análise IA — ${esc(which.toUpperCase())}</div>
        <div style="margin-bottom:.5rem;color:var(--ink3)">${esc(json.resumo||'')}</div>
        ${json.gargalos?.length?`<div style="margin-bottom:.3rem"><strong style="color:var(--red)">Gargalos:</strong> ${json.gargalos.map(g=>esc(g)).join(' · ')}</div>`:''}
        ${json.retrabalhos?.length?`<div style="margin-bottom:.3rem"><strong style="color:var(--amber)">Retrabalhos:</strong> ${json.retrabalhos.map(r=>esc(r)).join(' · ')}</div>`:''}
        ${json.gaps?.length?`<div style="margin-bottom:.3rem"><strong style="color:var(--purple)">Gaps:</strong> ${json.gaps.map(g=>esc(g)).join(' · ')}</div>`:''}
        ${json.oportunidades?.length?`<div><strong style="color:var(--green)">Oportunidades:</strong> ${json.oportunidades.map(o=>esc(o)).join(' · ')}</div>`:''}
        <div style="margin-top:.5rem;font-size:11px;color:var(--ink4)">Campos de análise preenchidos automaticamente ↑</div>
      </div>`;
    } catch {
      el.innerHTML = `<div class="ai-result"><div class="ai-result-lbl">✦ Análise IA</div>${esc(result)}</div>`;
    }
  }
  if(btn) btn.disabled = false;
}

// ── 2. GERAR POP ─────────────────────────
async function iaGerarPop(){
  const p = curProc;
  if(!p) return;
  const etapas = p.mod?.etapas_proc || [];
  if(!etapas.length){ toast('Detalhe as etapas do processo antes de gerar o POP.','var(--amber)'); return; }

  const btn = document.getElementById('ia-pop-btn');
  const el  = document.getElementById('ia-pop-result');
  if(btn) btn.disabled = true;

  // Itens confirmados na etapa Melhorias (excluindo descartados)
  const a = p.ent?.analise || {};
  const fb = a.feedback_dono || {};
  function confirmados(tipo){ return Object.entries(fb[tipo]||{}).filter(([,v])=>v==='confirmado').map(([k])=>k); }
  const hasFeedback = Object.keys(fb).length > 0;
  const gargalosConf    = hasFeedback ? confirmados('gargalos')         : (a.gargalos||[]);
  const oportunidadesConf = hasFeedback ? confirmados('oportunidades')  : (a.oportunidades||[]);
  const solucoesConf    = hasFeedback ? confirmados('solucoes_problemas') : (a.solucoes_problemas||[]);

  const payload = {
    nome: p.nome,
    area: p.area,
    objetivo: p.objetivo,
    macro: p.macro,
    etapas: etapas.map(e=>({
      seq: e.seq, nome: e.nome, tipo: e.tipo,
      natureza: e.natureza, modo: e.modo,
      executor: e.executor, desc: e.desc
    })),
    entradas: p.form?.pop?.ent || '',
    saidas: p.form?.pop?.sai || '',
    ...(gargalosConf.length     ? {gargalos_confirmados: gargalosConf}         : {}),
    ...(oportunidadesConf.length ? {oportunidades_confirmadas: oportunidadesConf} : {}),
    ...(solucoesConf.length     ? {solucoes_confirmadas: solucoesConf}          : {}),
  };

  const result = await chamarIA('gerar_pop', JSON.stringify(payload), el);

  if(result){
    // Auto-fill POP fields
    const ppAtiv = document.getElementById('pp-ativ');
    const ppObj  = document.getElementById('pp-obj');
    if(ppAtiv) ppAtiv.value = result;
    if(ppObj && !ppObj.value) ppObj.value = p.objetivo || '';

    el.innerHTML = `<div class="ai-result">
      <div class="ai-result-lbl">✦ Rascunho gerado pela IA</div>
      <div style="white-space:pre-wrap;font-size:12px">${esc(result)}</div>
      <div style="margin-top:.5rem;font-size:11px;color:var(--ink4)">Conteúdo copiado para o campo "Atividades" do POP ↑</div>
    </div>`;
  }
  if(btn) btn.disabled = false;
}

// ── 3. ASSISTENTE ─────────────────────────
async function iaAssistente(){
  const pergunta = document.getElementById('ia-chat-input')?.value?.trim();
  if(!pergunta) return;

  const el = document.getElementById('ia-chat-result');
  const p  = curProc;

  const contexto = p ? `Processo: ${p.nome} | Área: ${p.area} | Etapa: ${etLb(p.etapa)} | Fase: ${etFase(p.etapa)}` : '';
  const payload  = contexto ? `Contexto: ${contexto}\n\nPergunta: ${pergunta}` : pergunta;

  document.getElementById('ia-chat-input').value = '';
  const result = await chamarIA('assistente', payload, el);

  if(result && el){
    el.innerHTML = `<div class="ai-result"><div class="ai-result-lbl">✦ Resposta</div>${esc(result).replaceAll('\n','<br>')}</div>`;
  }
}

// ── 4. ANALISAR INDICADORES ───────────────
// Retorna true somente se o período é o 1º mês de um trimestre
// (jan, abr, jul, out) — únicos meses em que zero pode significar
// ausência de preenchimento no SISPLAN. O 2º mês (fev, mai, ago, nov)
// com zero já é resultado real, pois o 1º mês poderia ter valor acumulado.
function _ehMesNaoFechamento(periodo){
  if(!periodo) return false;
  const s = periodo.toString().toLowerCase();
  // Apenas o 1º mês de cada trimestre: janeiro, abril, julho, outubro
  return /^(jan|abr|jul|out|janeiro|abril|julho|outubro)/.test(s.trim());
}

async function iaAnalisarIndicadores(){
  const area   = document.getElementById('ind-area-sel')?.value  || '';
  const ciclo  = document.getElementById('ind-ciclo-sel')?.value || '';
  const lista  = kpis.filter(k=>
    (!area  || k.area  === area)  &&
    (!ciclo || k.ciclo === ciclo)
  );
  if(!lista.length){ toast('Nenhum indicador visível para analisar.','var(--amber)'); return; }

  const btn = document.getElementById('ia-ind-btn');
  const el  = document.getElementById('ia-ind-result');
  if(btn) btn.disabled = true;

  // Filtra antes de enviar: remove indicadores sem dados (realizado nulo, vazio ou zero)
  // Indicadores aguardando fechamento do trimestre também são excluídos — a IA não deve vê-los
  const listaValida = lista.filter(k => {
    const aguardando = (!k.realizado || Number(k.realizado) === 0) && _ehMesNaoFechamento(k.periodo);
    if(aguardando) return false;
    const r = Number(k.realizado);
    return k.realizado !== null && k.realizado !== undefined && k.realizado !== '' && r !== 0;
  });

  if(!listaValida.length){
    if(el) el.innerHTML = `<div class="ai-result"><div class="ai-result-lbl">✦ Análise IA dos indicadores</div><div style="line-height:1.7">Nenhum indicador com dados disponíveis para análise neste período.</div></div>`;
    if(btn) btn.disabled = false;
    return;
  }

  const payload = {
    indicadores: listaValida.map(k=>({
      area: k.area, nome: k.nome,
      meta: k.meta, realizado: k.realizado,
      pct: k.pct_realizado, periodo: k.periodo,
    })),
  };

  _lastIndLista = lista;
  const result = await chamarIA('analisar_indicadores', JSON.stringify(payload), el);

  if(result){
    _lastIndAnalise = result;
    const pdfBtn = document.getElementById('ia-ind-pdf-btn');
    if(pdfBtn) pdfBtn.style.display = '';
    el.innerHTML = `<div class="ai-result">
      <div class="ai-result-lbl">✦ Análise IA dos indicadores</div>
      <div style="line-height:1.7">${esc(result)}</div>
    </div>`;
  }
  if(btn) btn.disabled = false;
}

function statusInfo(pct, hasMeta){
    if(!hasMeta || pct===null) return {label:'Sem meta', color:'#9ca3af', bg:'', rowBg:'', badge:'', tier:0};
    if(pct >= 130) return {label:'📝 Destaque',     color:'#065f46', bg:'#d1fae5', rowBg:'#f0fff8', badge:'destaque', tier:4};
    if(pct >= 100) return {label:'✓ Meta atingida',  color:'#16a34a', bg:'#dcfce7', rowBg:'',       badge:'ok',      tier:3};
    if(pct >= 80)  return {label:'~ Próximo da meta',color:'#92400e', bg:'#fef3c7', rowBg:'',       badge:'warn',    tier:2};
    if(pct >= 50)  return {label:'✗ Abaixo da meta', color:'#b91c1c', bg:'#fee2e2', rowBg:'#fff5f5',badge:'nok',     tier:1};
    return            {label:'⚠ Muito abaixo',      color:'#7f1d1d', bg:'#fca5a5', rowBg:'#fff0f0',badge:'crit',    tier:0};
  }
function gerarRelatorioIndPdf(){
  if(!_lastIndAnalise){ toast('Execute a análise de IA primeiro.','var(--amber)'); return; }

  const area  = document.getElementById('ind-area-sel')?.value  || '';
  const ciclo = document.getElementById('ind-ciclo-sel')?.value || '';
  const dtHoje = new Date().toLocaleDateString('pt-BR');

  // Apenas indicadores com dados válidos (mesma lógica do prompt)
  const lista = _lastIndLista.filter(k => {
    const aguardando = (!k.realizado || k.realizado===0) && _ehMesNaoFechamento(k.periodo);
    return !aguardando && k.realizado !== null && k.realizado !== undefined && k.realizado !== '' && Number(k.realizado) !== 0;
  });

  if(!lista.length){ toast('Nenhum indicador com dados para o relatório.','var(--amber)'); return; }

  // ── Calcula pct e classifica cada indicador ──────────────────────────
  function calcPct(k){
    const pol = k.polaridade||'Maior é melhor';
    const hasMeta = Number(k.meta)>0;
    if(!hasMeta) return null;
    if(pol==='Menor é melhor'){
      return Number(k.realizado)>0 ? Math.round((Number(k.meta)/Number(k.realizado))*100) : 0;
    }
    return Math.round((Number(k.realizado)/Number(k.meta))*100);
  }

  // ── Agregador por área ───────────────────────────────────────────────
  // Métrica: taxa de atingimento = (nº atingiram meta / nº com meta) * 100
  // Legível e sempre 0-100%; não é distorcida por outliers extremos
  const areaMap = {};
  lista.forEach(k=>{
    const a = k.area||'(sem área)';
    if(!areaMap[a]) areaMap[a]={total:0,comMeta:0,atingiram:0,destaque:0,critico:0};
    const pct = calcPct(k);
    areaMap[a].total++;
    if(pct!==null){
      areaMap[a].comMeta++;
      if(pct>=100) areaMap[a].atingiram++;
      if(pct>=130) areaMap[a].destaque++;
      if(pct<50)   areaMap[a].critico++;
    }
  });
  const areaCards = Object.entries(areaMap).sort((a,b)=>a[0].localeCompare(b[0])).map(([nome,d])=>{
    // taxa 0-100%: quantos indicadores (com meta) atingiram a meta
    const taxa = d.comMeta ? Math.round((d.atingiram/d.comMeta)*100) : null;
    let cl, bg, border;
    if(taxa===null){
      cl='#6b7280'; bg='#f3f4f6'; border='#d1d5db';
    } else if(taxa>=80){
      cl='#16a34a'; bg='#f0fdf4'; border='#4ade80';
    } else if(taxa>=60){
      cl='#d97706'; bg='#fffbeb'; border='#fbbf24';
    } else if(taxa>=40){
      cl='#dc2626'; bg='#fff5f5'; border='#f87171';
    } else {
      cl='#991b1b'; bg='#fee2e2'; border='#ef4444';
    }
    const destaqueS = d.destaque > 1 ? 's' : '';
    const criticoS = d.critico > 1 ? 's' : '';
    const extras = [
      d.destaque ? `<span style="font-size:10px;color:#065f46">📝 ${d.destaque} destaque${destaqueS}</span>` : '',
      d.critico  ? `<span style="font-size:10px;color:#7f1d1d">⚠ ${d.critico} crítico${criticoS}</span>` : '',
    ].filter(Boolean).join(' ');
    return `<div style="background:${bg};border:1.5px solid ${border};border-radius:8px;padding:10px 14px;min-width:140px;flex:1">
      <div style="font-size:10px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">${esc(nome)}</div>
      <div style="font-size:22px;font-weight:800;color:${cl};line-height:1">${taxa===null?'—':taxa+'%'}</div>
      <div style="font-size:10px;color:#6b7280;margin-top:2px">${d.atingiram} de ${d.comMeta} atingiram a meta</div>
      <div style="font-size:10px;color:#9ca3af">${d.total} indicador${d.total===1?'':'es'} no total</div>
      ${extras?`<div style="margin-top:4px;display:flex;gap:8px">${extras}</div>`:''}
    </div>`;
  }).join('');

  // ── Linhas da tabela ────────────────────────────────────────────────
  const rows = lista.map(k => {
    const und     = k.unidade ? ' '+k.unidade : '';
    const hasMeta = Number(k.meta)>0;
    const pct     = calcPct(k);
    const st      = statusInfo(pct, hasMeta);
    // Fonte maior para extremos
    let pctStyle;
    if(st.tier===4) pctStyle=`font-size:14px;font-weight:800;color:${st.color}`;
    else if(st.tier===0 && pct!==null) pctStyle=`font-size:13px;font-weight:800;color:${st.color}`;
    else pctStyle=`font-weight:700;color:${st.color}`;
    const badgeStyle = `display:inline-block;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700;background:${st.bg};color:${st.color}`;
    return `<tr style="background:${st.rowBg}">
      <td>${k.codigo?'<strong>'+esc(k.codigo)+'</strong> — ':''}${esc(k.nome)}</td>
      <td style="font-size:10px;color:#6b7280">${esc(k.area||'—')}</td>
      <td style="font-size:10px;color:#6b7280">${esc(k.periodo||'—')}</td>
      <td style="text-align:center">${hasMeta?esc(String(k.meta)+und):'—'}</td>
      <td style="text-align:center;font-weight:600">${esc(String(k.realizado)+und)}</td>
      <td style="text-align:center;${pctStyle}">${pct===null?'—':pct+'%'}</td>
      <td style="text-align:center"><span style="${badgeStyle}">${st.label}</span></td>
    </tr>`;
  }).join('');

  // ── Totalizador rodapé ───────────────────────────────────────────────
  // Taxa de atingimento geral (sempre 0-100%, não distorcida por outliers)
  const comMeta    = lista.filter(k=>Number(k.meta)>0);
  const atingiramG = comMeta.filter(k=>{ const p=calcPct(k); return p!==null&&p>=100; }).length;
  const taxaGeral  = comMeta.length ? Math.round((atingiramG/comMeta.length)*100) : null;
  const destTotal  = lista.filter(k=>{ const p=calcPct(k); return p!==null&&p>=130; }).length;
  const critTotal  = lista.filter(k=>{ const p=calcPct(k); return p!==null&&p<50; }).length;
  let taxaCl;
  if(taxaGeral===null) taxaCl='#6b7280';
  else if(taxaGeral>=80) taxaCl='#16a34a';
  else if(taxaGeral>=60) taxaCl='#d97706';
  else taxaCl='#dc2626';

  const destS = destTotal > 1 ? 's' : '';
  const critS = critTotal > 1 ? 's' : '';
  const filtros = [area?'Área: '+area:'', ciclo?'Ciclo: '+ciclo:''].filter(Boolean).join(' · ') || 'Todos os indicadores';
  const w = window.open('','_blank');
  const relHtml = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de Indicadores</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1a1a2e;background:#fff;padding:20px 28px}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1e6bfa;padding-bottom:10px;margin-bottom:14px}
  .hdr-l .org{font-size:9px;font-weight:700;color:#1e6bfa;letter-spacing:1px;text-transform:uppercase;margin-bottom:2px}
  .hdr-l .tit{font-size:18px;font-weight:700;color:#1a1a2e;line-height:1.2}
  .hdr-l .sub{font-size:11px;color:#6b7280;margin-top:3px}
  .hdr-r{text-align:right;font-size:11px;color:#6b7280;line-height:1.8}
  .sec{font-size:9px;font-weight:700;color:#1e6bfa;letter-spacing:.8px;text-transform:uppercase;margin:12px 0 6px}
  .ia-box{background:#f0f4ff;border-left:3px solid #1e6bfa;border-radius:5px;padding:9px 12px;font-size:11.5px;line-height:1.65;color:#1a1a2e}
  .area-grid{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:4px}
  table{width:100%;border-collapse:collapse;font-size:11px}
  thead th{background:#1e3a8a;color:#fff;padding:6px 8px;text-align:left;font-weight:600;font-size:10px;letter-spacing:.3px;text-transform:uppercase}
  tbody tr:nth-child(even){filter:brightness(.98)}
  tbody td{padding:5px 8px;border-bottom:1px solid #e5e7eb;vertical-align:middle}
  .tfoot-row td{background:#f1f5f9;font-weight:700;font-size:11px;border-top:2px solid #cbd5e1}
  .legend{display:flex;gap:12px;flex-wrap:wrap;margin-top:6px;font-size:9.5px;color:#374151}
  .legend span{display:flex;align-items:center;gap:4px}
  .ftr{margin-top:12px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;display:flex;justify-content:space-between}
  @media print{body{padding:10px 16px}@page{margin:.8cm;size:A4 landscape}}
</style></head><body>
<div class="hdr">
  <div class="hdr-l">
    <div class="org">EP·CAGE · Escritório de Processos</div>
    <div class="tit">Relatório Executivo de Indicadores</div>
    <div class="sub">${esc(filtros)}</div>
  </div>
  <div class="hdr-r">
    <div><strong>Data:</strong> ${dtHoje}</div>
    <div><strong>Total analisados:</strong> ${lista.length}</div>
    ${taxaGeral===null?'':`<div><strong>Taxa de atingimento geral:</strong> <strong style="color:${taxaCl}">${atingiramG}/${comMeta.length} (${taxaGeral}%)</strong></div>`}
    ${destTotal?`<div style="color:#065f46">📝 ${destTotal} destaque${destS}</div>`:''}
    ${critTotal?`<div style="color:#7f1d1d">⚠ ${critTotal} crítico${critS}</div>`:''}
  </div>
</div>
<div class="sec">Taxa de atingimento por área</div>
<div class="area-grid">${areaCards}</div>
<div class="sec">✦ Análise da Inteligência Artificial</div>
<div class="ia-box">${esc(_lastIndAnalise).replaceAll('\n','<br>')}</div>
<div class="sec">Indicadores com dados no período</div>
<table>
  <thead><tr>
    <th>Indicador</th><th>Área</th><th>Período</th>
    <th style="text-align:center">Meta</th>
    <th style="text-align:center">Realizado</th>
    <th style="text-align:center">Desempenho</th>
    <th style="text-align:center">Status</th>
  </tr></thead>
  <tbody>${rows}</tbody>
  ${taxaGeral===null?'':`<tfoot><tr class="tfoot-row">
    <td colspan="5">Taxa de atingimento geral (indicadores com meta)</td>
    <td style="text-align:center;font-size:14px;color:${taxaCl}">${atingiramG}/${comMeta.length} — ${taxaGeral}%</td>
    <td></td>
  </tr></tfoot>`}
</table>
<div class="legend">
  <span><span style="background:#d1fae5;color:#065f46;padding:1px 6px;border-radius:10px;font-weight:700">📝 Destaque</span> ≥ 130% da meta</span>
  <span><span style="background:#dcfce7;color:#16a34a;padding:1px 6px;border-radius:10px;font-weight:700">✓ Meta atingida</span> ≥ 100%</span>
  <span><span style="background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:10px;font-weight:700">~ Próximo</span> 80–99%</span>
  <span><span style="background:#fee2e2;color:#b91c1c;padding:1px 6px;border-radius:10px;font-weight:700">✗ Abaixo</span> 50–79%</span>
  <span><span style="background:#fca5a5;color:#7f1d1d;padding:1px 6px;border-radius:10px;font-weight:700">⚠ Muito abaixo</span> &lt; 50%</span>
</div>
<div class="ftr">
  <span>Gerado pelo sistema SIGA 2.0 — EP·CAGE/Sefaz-RS</span>
  <span>${dtHoje}</span>
</div>
<script>setTimeout(()=>window.print(),500);</scri\u0070t>
  </body></html>`;
  const relBlob = new Blob([relHtml], {type:'text/html;charset=utf-8'});
  w.location.href = URL.createObjectURL(relBlob);
}

// ── INJECT IA BUTTONS INTO PAGES ─────────

// Called after rMod renders — adds IA button to BPMN bars
function injectIaBpmn(which){
  const bar = document.getElementById('bpmn-'+which+'-canvas')?.closest('.bpmn-wrap')?.querySelector('.bpmn-bar');
  if(!bar || document.getElementById('ia-bpmn-btn-'+which)) return;
  const btn = document.createElement('button');
  btn.id = 'ia-bpmn-btn-'+which;
  btn.className = 'ai-btn';
  btn.innerHTML = '✦ Analisar com IA';
  btn.onclick = ()=>iaAnalisarBpmn(which);
  bar.appendChild(btn);

  // Add result container after bpmn-wrap
  const wrap = bar.closest('.bpmn-wrap');
  if(wrap && !document.getElementById('ia-bpmn-result-'+which)){
    const div = document.createElement('div');
    div.id = 'ia-bpmn-result-'+which;
    wrap.after(div);
  }
}

// Called after rAcao renders pop step
function injectIaPop(){
  const btn = document.getElementById('ia-pop-btn');
  if(btn) return; // already injected
  const rows = document.querySelectorAll('.btn-row');
  if(!rows.length) return;
  const lastRow = rows[rows.length-1];

  const aiBtn = document.createElement('button');
  aiBtn.id = 'ia-pop-btn';
  aiBtn.className = 'ai-btn';
  aiBtn.style.marginRight = 'auto';
  aiBtn.innerHTML = '✦ Gerar rascunho com IA';
  aiBtn.onclick = iaGerarPop;
  lastRow.prepend(aiBtn);

  const resDiv = document.createElement('div');
  resDiv.id = 'ia-pop-result';
  lastRow.before(resDiv);
}

// Indicadores page — inject IA analysis button
function injectIaIndicadores(){
  const el = document.getElementById('ind-c');
  if(!el || document.getElementById('ia-ind-panel')) return;
  const panel = document.createElement('div');
  panel.id = 'ia-ind-panel';
  panel.className = 'ai-panel';
  panel.style.marginBottom = '1rem';
  panel.innerHTML = `<div class="ai-panel-t">✦ Análise inteligente dos indicadores</div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <button type="button" id="ia-ind-btn" class="ai-btn" onclick="iaAnalisarIndicadores()">Analisar indicadores visíveis com IA</button>
      <button type="button" id="ia-ind-pdf-btn" class="btn btn-a" onclick="gerarRelatorioIndPdf()" style="display:none;font-size:12px;padding:5px 12px">⬇ Relatório PDF</button>
      <span style="font-size:11px;color:var(--ink3)">Analisa os indicadores do filtro atual e gera um comentário executivo.</span>
    </div>
    <div id="ia-ind-result"></div>`;
  el.before(panel);
}

// Assistente — inject chat panel in detalhe page
function injectIaAssistente(){
  if(!isEP()) return;
  const hist = document.getElementById('tab-hist');
  if(!hist || document.getElementById('ia-chat-panel')) return;
  const panel = document.createElement('div');
  panel.id = 'ia-chat-panel';
  panel.className = 'ai-panel';
  panel.style.marginBottom = '1rem';
  panel.innerHTML = `<div class="ai-panel-t">✦ Assistente do processo</div>
    <div style="display:flex;gap:8px;margin-bottom:.5rem">
      <input class="fi" id="ia-chat-input" placeholder="Pergunte algo sobre este processo..." style="flex:1"
        onkeydown="if(event.key==='Enter')iaAssistente()">
      <button type="button" class="ai-btn" onclick="iaAssistente()">Perguntar</button>
    </div>
    <div id="ia-chat-result"></div>`;
  // Insert before the first tab panel
  const firstTab = document.getElementById('tab-acao');
  if(firstTab) firstTab.before(panel);
}


// ── CONFIG URL ────────────────────────────
// Show AI config field in notificacoes page for EP
function injectAiConfigField(){
  const cfgCard = document.getElementById('ejs-config-card');
  if(!cfgCard || document.getElementById('ai-url-section')) return;
  const sec = document.createElement('div');
  sec.id = 'ai-url-section';
  sec.innerHTML = `<hr style="margin:.8rem 0">
    <div class="card-t" style="margin-bottom:.4rem">Configuração da IA (Azure OpenAI)</div>
    <div class="ib ibp" style="font-size:11px;margin-bottom:.6rem">
      Cole a URL da Firebase Function após o deploy. Formato: <code>https://ai-XXXXXXXX-uc.a.run.app</code>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      <input class="fi" id="ai-fn-url" placeholder="https://ai-XXXXXXXX-uc.a.run.app"
        value="${lsGet('epcage_ai_url') || AI_FUNCTION_URL}"
        style="flex:1">
      <button type="button" class="btn btn-p" onclick="salvarAiUrl()" style="font-size:12px">Salvar URL</button>
    </div>`;
  cfgCard.appendChild(sec);
}

function salvarAiUrl(){
  const url = document.getElementById('ai-fn-url')?.value.trim();
  if(!url){ toast('Informe a URL.','var(--amber)'); return; }
  lsSet('epcage_ai_url', url);
  // Patch the constant at runtime
  globalThis._aiUrl = url;
  toast('URL da IA salva');
}


// Restore AI URL from localStorage on boot
(function(){
  const saved = lsGet('epcage_ai_url');
  if(saved) globalThis._aiUrl = saved;
})();

// ═══════════════════════════════════════════
// AZURE OPENAI CONFIG
// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
// IMPORTAÇÃO DE POP (Word + IA)
// ═══════════════════════════════════════════
function abrirImportPOP(){
  // Popula select de arquitetura
  const sel=document.getElementById('pop-arq-sel');
  sel.innerHTML='<option value="">— Selecione (opcional) —</option>';
  getUnidadesMapeaveis().forEach(u=>{
    const opt=document.createElement('option');
    opt.value=u.arq_id;
    opt.textContent=u.label;
    sel.appendChild(opt);
  });
  document.getElementById('pop-step1').style.display='block';
  document.getElementById('pop-step2').style.display='none';
  document.getElementById('pop-loading').style.display='none';
  document.getElementById('pop-file-input').value='';
  document.getElementById('pop-import-modal').style.display='block';
}
function fecharImportPOP(){
  document.getElementById('pop-import-modal').style.display='none';
  const prev = document.getElementById('pop-fluxo-preview');
  if(prev) prev.style.display = 'none';
  const fi = document.getElementById('pop-fluxo-img');
  if(fi) fi.value = '';
}
function voltarImportPOP(){
  document.getElementById('pop-step2').style.display='none';
  document.getElementById('pop-step1').style.display='block';
}
async function processarArquivoPOP(input){
  if(!input.files||!input.files[0])return;
  const loadEl=document.getElementById('pop-loading');
  loadEl.style.display='block';
  document.getElementById('pop-file-input').disabled=true;
  try{
    const arrayBuffer=await input.files[0].arrayBuffer();
    const result=await mammoth.extractRawText({arrayBuffer});
    const texto=result.value.trim().slice(0,12000);
    const prompt=`Analise o POP abaixo e retorne APENAS um JSON válido (sem markdown) com a estrutura:
{"nome":"...","area":"...","objetivo":"...","atores":["..."],"etapas":[{"nome":"...","tipo":"Atividade|Decisao|Evento","executor":"..."}]}

REGRAS para classificar cada elemento do fluxo:
- "Atividade": tarefas, execuções, verificações, comunicações, registros (a maioria)
- "Decisao": gateways, bifurcações, condicionais — frases numeradas como "2.3.1", "Qual é o risco?", "O processo está no escopo?", "Caso sim/não"
- "Evento": início do processo, fim/encerramento ("Processo devolvido", "fim do processo")

REGRAS CRÍTICAS para o campo "executor" (ator por etapa):
- Neste tipo de documento, o ator aparece como uma LINHA ISOLADA antes de um grupo de atividades (ex: "Auxiliar Administrativo", "Servidor", "Analista", "Auditor")
- Esse ator se aplica a TODAS as atividades listadas abaixo dele, até que apareça outro nome de ator isolado
- Quando uma seção diz "Se o analista analisou: ..." → executor é "Analista"; "Se o auditor analisou: ..." → executor é "Auditor"
- Quando o texto cita explicitamente "O Auditor então deverá:" ou "Auditor" em negrito/isolado → o executor muda para "Auditor"
- Use o nome do papel exatamente como aparece no documento (ex: "Auxiliar Administrativo", "Analista", "Auditor", "Servidor")
- Se genuinamente não for possível identificar, use ""

Inclua TODOS os elementos do fluxo, inclusive os gateways/condicionais e eventos de fim.

POP:\n${texto}`;
    const rawText = await chamarIA('extrair_pop', prompt, loadEl);
    if(!rawText) throw new Error('Sem resposta da IA.');
    const jsonStr=rawText.trim().replaceAll(/```json?/g,'').replaceAll('```','').trim();
    const extracted=JSON.parse(jsonStr);
    document.getElementById('pop-nome').value=extracted.nome||'';
    document.getElementById('pop-area').value=extracted.area||'';
    document.getElementById('pop-objetivo').value=extracted.objetivo||'';
    document.getElementById('pop-atores').value=(extracted.atores||[]).join('\n');
    // Encode type and executor in textarea so confirmarImportPOP can recover them
    const etapasExtraidas=(extracted.etapas||[]);
    document.getElementById('pop-etapas').value=etapasExtraidas.map(e=>
      typeof e==='string'?e:`[${e.tipo||'Atividade'}|${e.executor||''}] ${e.nome||e}`
    ).join('\n');
    loadEl.style.display='none';
    document.getElementById('pop-step1').style.display='none';
    document.getElementById('pop-step2').style.display='block';
  }catch(err){
    loadEl.style.display='none';
    document.getElementById('pop-file-input').disabled=false;
    toast('Erro ao processar o arquivo: '+err.message,'var(--red)');
  }
}
function confirmarImportPOP(){
  const nome=document.getElementById('pop-nome').value.trim();
  if(!nome){toast('Informe o nome do processo.','var(--amber)');return;}
  const arqId=document.getElementById('pop-arq-sel').value||null;
  // Tenta encontrar metadados na arquitetura
  let arqItem=null;
  if(arqId) arqItem=getUnidadesMapeaveis().find(u=>u.arq_id===arqId);
  const area=document.getElementById('pop-area').value.trim()||arqItem?.area||'';
  const objetivo=document.getElementById('pop-objetivo').value.trim()||arqItem?.objetivo||'';
  const atores=(document.getElementById('pop-atores').value.trim().split('\n').map(s=>s.trim()).filter(Boolean)).join(', ');
  const etapasTexto=document.getElementById('pop-etapas').value.trim();
  const agora=new Date().toLocaleDateString('pt-BR');
  const novoId=Date.now();
  // Parse typed etapas: "[Tipo|Executor] Nome" prefix encoded by processarArquivoPOP
  const etapasProc=etapasTexto.split('\n').filter(Boolean).map((d,i)=>{
    const m=d.match(/^\[(Atividade|Decisao|Evento|Comentario)(?:\|([^\]]*))?\]\s*/i);
    const tipo=m?m[1]:'Atividade';
    const executorEtapa=m&&m[2]&&m[2].trim()?m[2].trim():atores;
    const nome=m?d.slice(m[0].length).trim():d.trim();
    return {id:'ep'+(novoId+i),seq:i+1,nome,tipo,natureza:'Execucao',modo:'Manual',executor:executorEtapa,desc:''};
  });
  const ativTexto=etapasProc.map(e=>`${e.seq}. [${e.tipo}] ${e.nome}`).join('\n');
  const donoNome=arqItem?.gerente||'';
  const novoProc={
    id:novoId,
    arq_id:arqId||null,
    nome,area,objetivo,
    macro:arqItem?.macro||'Importado via POP',
    produto:'POP',
    dono:donoNome,
    resp_ep:usuarioLogado?.nome||'',
    pat:'',
    prio:'Normal',
    etapa:'publicacao', // inicia já na etapa de publicação
    mapeado:true,
    ent:{dt_inicio:agora,dt_prev:'',equipe:'',prob:[],prev_ops:[],analise:'',mat:0,quest_resp:{}},
    mod:{asIs:'',toBe:'',bpmnAsIs:null,bpmnToBe:null,obs:'',etapas_proc:etapasProc},
    form:{faq:'',links:'',forms:'',pop_data:{area,objetivo,atores,atividades:etapasTexto},
      pop:{area,ger:donoNome,mac:arqItem?.macro||'',obj:objetivo,def:'',ent:'',sai:'',ativ:ativTexto,ind:'',docs:''},
      pop_ok:true},
    hist:[{acao:'Processo criado via importação de POP Word (IA)',role:'EP',data:agora}],
    auditoria:null
  };
  processos.push(novoProc);
  // Marca como mapeado manualmente se não tem arq_id
  if(arqId){mapeadosManual.add(arqId);lsSet('mapeadosManual',JSON.stringify([...mapeadosManual]));fbAutoSave('mapeados');}
  updCounts();
  fbAutoSave('importPOP');
  // Salva imagem do fluxo Bizagi se selecionada
  const fluxoInput = document.getElementById('pop-fluxo-img');
  const fluxoFile = fluxoInput?.files?.[0];
  if(fluxoFile && arqId){
    if(fluxoFile.size > 3*1024*1024){ toast('Imagem de fluxo muito grande (máx. 3 MB). Processo salvo sem a imagem.','var(--amber)'); }
    else {
      const reader = new FileReader();
      reader.onload = async e => { await saveFluxoImg(arqId, e.target.result); };
      reader.readAsDataURL(fluxoFile);
    }
  }
  fecharImportPOP();
  toast('POP importado! Processo criado em "Publicação".');
  renderProcs();
}

// ═══════════════════════════════════════════════════════════════════
// MÓDULO DE PROJETOS — CAGE-RS
// Namespace: proj_* para evitar conflitos com o módulo de processos
// Dados: localStorage com chave "cage_projetos_v1"
// ═══════════════════════════════════════════════════════════════════

// ── Estado global do módulo de projetos ─────────────────────────
let _projetos = [];
let _programas = [];
let _projCurrentId = null; // ID do projeto em visualização
let _progCurrentId = null; // ID do programa em visualização
let _hubVisible = false;
const PROJ_STORAGE_KEY = 'cage_projetos_v6';
const PROG_STORAGE_KEY = 'cage_programas_v6';

// ── Fases do workflow ────────────────────────────────────────────
const PROJ_FASES = [
  { id:'aprovacao',   label:'Aprovação',          short:'Aprovação'   },
  { id:'ideacao',     label:'Ideação',             short:'Ideação'     },
  { id:'planejamento',label:'Planejamento',        short:'Planejamento'},
  { id:'execucao',    label:'Execução/Monit.',     short:'Execução'    },
  { id:'conclusao',   label:'Conclusão',           short:'Conclusão'   },
];
const FASE_IDX = Object.fromEntries(PROJ_FASES.map((f,i)=>[f.id,i]));

var _macroprocessos = [
  '[Gestão] Gestão estratégica','[Gestão] Comunicação e relacionamento institucional',
  '[Finalístico] Orientação e suporte à tomada de decisão','[Finalístico] Contabilidade',
  '[Finalístico] Transparência e estímulo ao controle social','[Finalístico] Controle',
  '[Finalístico] Auditoria','[Finalístico] Promoção da integridade e prevenção à corrupção',
  '[Apoio] Gestão de dados e informações','[Apoio] Gestão administrativa',
  '[Apoio] Gestão de TIC','[Apoio] Gestão de pessoas'
];
var _objetivosEstrategicos = [
  '[Resultados] Colaborar para a implementação de políticas públicas efetivas',
  '[Resultados] Aperfeiçoar a transparência pública e fomentar o controle social',
  '[Resultados] Promover a integridade pública e privada e fortalecer a prevenção à corrupção',
  '[Resultados] Otimizar a utilização dos recursos públicos',
  '[Articulação] Aprimorar o assessoramento aos gestores públicos',
  '[Articulação] Fortalecer a credibilidade e a imagem da CAGE',
  '[Processos] Desenvolver modelo de controle baseado em riscos e orientado pela utilização de dados',
  '[Processos] Sistematizar e implementar modelo de avaliação de políticas públicas',
  '[Processos] Reestruturar as ações de transparência, com foco no cidadão',
  '[Processos] Qualificar a informação contábil',
  '[Processos] Otimizar a contribuição da auditoria para o aprimoramento da gestão pública estadual',
  '[Processos] Promover a cultura de integridade na Administração Pública',
  '[Processos] Otimizar os processos de trabalho, com foco em eficiência operacional e automação',
  '[Aprendizado] Gerir as pessoas com foco na estratégia',
  '[Aprendizado] Aperfeiçoar a governança organizacional e fortalecer a cultura de colaboração e inovação',
  '[Aprendizado] Promover uma comunicação interna mais efetiva',
  '[Aprendizado] Assegurar serviços de TIC para suportar os processos e a estratégia'
];
const PROJ_FB = Object.freeze({
  colProjetos: 'proj_projetos',
  colProgramas: 'proj_programas',
  cfgCol: 'config',
  cfgMacrosId: 'proj_macroprocessos',
  cfgObjetivosId: 'proj_objetivos'
});
const _projFbState = {loaded:false, loading:false, saveTimer:null};

function projLoadListas(){
  try{
    var m=localStorage.getItem('cage_macroprocessos_v6');if(m)_macroprocessos=JSON.parse(m);
    var o=localStorage.getItem('cage_objetivos_v6');if(o)_objetivosEstrategicos=JSON.parse(o);
  }catch(e){}
}
function projSaveListas(){
  localStorage.setItem('cage_macroprocessos_v6',JSON.stringify(_macroprocessos));
  localStorage.setItem('cage_objetivos_v6',JSON.stringify(_objetivosEstrategicos));
  projFbAutoSave('listas');
}

async function projFbSyncCollection(col, items){
  const {db, doc, writeBatch, collection, getDocs} = fb();
  const ids = new Set((items||[]).map(i=>String(i.id)));
  const ops = [];
  (items||[]).forEach(item=>{
    ops.push({type:'set', ref:doc(db,col,String(item.id)), data:_fsClean(item)});
  });
  const snap = await getDocs(collection(db,col));
  snap.forEach(d=>{ if(!ids.has(String(d.id))) ops.push({type:'del', ref:d.ref}); });
  for(let i=0;i<ops.length;i+=400){
    const batch = writeBatch(db);
    ops.slice(i,i+400).forEach(op=>{
      if(op.type==='set') batch.set(op.ref, op.data);
      else batch.delete(op.ref);
    });
    await batch.commit();
  }
}

async function projFbSaveAll(){
  if(!fbReady()) return;
  try{
    const {db, doc, setDoc} = fb();
    await projFbSyncCollection(PROJ_FB.colProjetos, _projetos||[]);
    await projFbSyncCollection(PROJ_FB.colProgramas, _programas||[]);
    await setDoc(doc(db,PROJ_FB.cfgCol,PROJ_FB.cfgMacrosId), {data: JSON.stringify(_macroprocessos||[])});
    await setDoc(doc(db,PROJ_FB.cfgCol,PROJ_FB.cfgObjetivosId), {data: JSON.stringify(_objetivosEstrategicos||[])});
  } catch(e){ console.warn('projFbSaveAll:', e.message); }
}

function projFbAutoSave(label){
  if(!fbReady()) return;
  clearTimeout(_projFbState.saveTimer);
  _projFbState.saveTimer = setTimeout(()=>{ projFbSaveAll().catch(e=>console.warn('projFbAutoSave('+label+'):',e.message)); }, 1200);
}

function projRenderCurrentPage(){
  const active = document.querySelector('.proj-nav-btn.on');
  const page = active ? (active.id||'').replace('pnb-','') : 'inicio';
  if(document.getElementById('proj-shell')?.classList.contains('on')){
    projGo(page || 'inicio', active || document.getElementById('pnb-inicio'));
  }
}

async function projFbLoadOnce(){
  if(!fbReady() || _projFbState.loaded || _projFbState.loading) return;
  _projFbState.loading = true;
  try{
    const {db, collection, getDocs, doc, getDoc, setDoc} = fb();
    const [pSnap, gSnap] = await Promise.all([
      getDocs(collection(db,PROJ_FB.colProjetos)),
      getDocs(collection(db,PROJ_FB.colProgramas))
    ]);

    // Fallback/migração: se nuvem estiver vazia, sobe o que existe no localStorage.
    if(pSnap.empty && gSnap.empty && ((_projetos||[]).length || (_programas||[]).length)){
      await projFbSaveAll();
    } else {
      if(!pSnap.empty){
        _projetos = [];
        pSnap.forEach(d=>_projetos.push(projFixDefaults(d.data())));
      }
      if(!gSnap.empty){
        _programas = [];
        gSnap.forEach(d=>_programas.push(progFixDefaults(d.data())));
      }
    }

    const [macrosDoc, objetivosDoc] = await Promise.all([
      getDoc(doc(db,PROJ_FB.cfgCol,PROJ_FB.cfgMacrosId)),
      getDoc(doc(db,PROJ_FB.cfgCol,PROJ_FB.cfgObjetivosId))
    ]);
    if(macrosDoc.exists() && typeof macrosDoc.data()?.data === 'string'){
      try{ _macroprocessos = JSON.parse(macrosDoc.data().data); }catch(_e){}
    } else {
      await setDoc(doc(db,PROJ_FB.cfgCol,PROJ_FB.cfgMacrosId), {data: JSON.stringify(_macroprocessos||[])});
    }
    if(objetivosDoc.exists() && typeof objetivosDoc.data()?.data === 'string'){
      try{ _objetivosEstrategicos = JSON.parse(objetivosDoc.data().data); }catch(_e){}
    } else {
      await setDoc(doc(db,PROJ_FB.cfgCol,PROJ_FB.cfgObjetivosId), {data: JSON.stringify(_objetivosEstrategicos||[])});
    }

    // Mantém cache local para modo offline.
    try{
      localStorage.setItem(PROJ_STORAGE_KEY, JSON.stringify(_projetos||[]));
      localStorage.setItem(PROG_STORAGE_KEY, JSON.stringify(_programas||[]));
      localStorage.setItem('cage_macroprocessos_v6', JSON.stringify(_macroprocessos||[]));
      localStorage.setItem('cage_objetivos_v6', JSON.stringify(_objetivosEstrategicos||[]));
    }catch(_e){}

    _projFbState.loaded = true;
    projRenderCurrentPage();
  } catch(e){ console.warn('projFbLoadOnce:', e.message); }
  finally { _projFbState.loading = false; }
}


// ── Persistência ─────────────────────────────────────────────────
function projLoad() {
  try {
    const raw = localStorage.getItem(PROJ_STORAGE_KEY);
    _projetos = raw ? JSON.parse(raw) : [];
  } catch(e) {
    _projetos = [];
  }
  // Ensure each project has proper structure
  _projetos = _projetos.map(p => projFixDefaults(p));
  // Load programas and lists too
  progLoad();
  projLoadListas();
  projFbLoadOnce().catch(e=>console.warn('projLoad/fb:',e.message));
}

function projSave() {
  try {
    localStorage.setItem(PROJ_STORAGE_KEY, JSON.stringify(_projetos));
    projFbAutoSave('projetos');
  } catch(e) {
    projToast('Erro ao salvar dados.', 'var(--red)');
  }
}

// ── Persistência de Programas ───────────────────────────────────
function progLoad() {
  try {
    const raw = localStorage.getItem(PROG_STORAGE_KEY);
    _programas = raw ? JSON.parse(raw) : [];
  } catch(e) {
    _programas = [];
  }
  _programas = _programas.map(pg => progFixDefaults(pg));
}

function progSave() {
  try {
    localStorage.setItem(PROG_STORAGE_KEY, JSON.stringify(_programas));
    projFbAutoSave('programas');
  } catch(e) {
    projToast('Erro ao salvar programas.', 'var(--red)');
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
  const projs = _projetos.filter(p => String(p.programa_id) === String(programaId));
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
    objetivos_estrategicos: p.objetivos_estrategicos || [],
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
    planejamento: p.planejamento || {
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

// ── Navegação entre módulos ───────────────────────────────────────
function _atualizarCardsHub(){
  const cardProc = document.getElementById('hub-card-proc');
  const cardProj = document.getElementById('hub-card-proj');
  if(cardProc) cardProc.style.display = hasProcessosAccess() ? '' : 'none';
  if(cardProj) cardProj.style.display = hasProjetosAccess()  ? '' : 'none';
}

function mostrarHub() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('module-hub').style.display = 'flex';
  document.querySelector('.shell').style.display = 'none';
  const ps = document.getElementById('proj-shell');
  ps.classList.remove('on');
  _atualizarCardsHub();
  _hubVisible = true;
}

function abrirModuloProcessos() {
  if(!hasProcessosAccess()){ projToast('Seu perfil não tem acesso ao módulo de processos.','var(--red)'); return; }
  document.getElementById('module-hub').style.display = 'none';
  document.querySelector('.shell').style.display = 'grid';
  document.getElementById('proj-shell').classList.remove('on');
  _hubVisible = false;
}

function abrirModuloProjetos() {
  if(!hasProjetosAccess()){ projToast('Seu perfil não tem acesso ao módulo de projetos.','var(--red)'); return; }
  document.getElementById('module-hub').style.display = 'none';
  document.querySelector('.shell').style.display = 'none';
  const ps = document.getElementById('proj-shell');
  ps.classList.add('on');
  _hubVisible = false;
  projLoad();
  projGo('inicio', document.getElementById('pnb-inicio'));
}

function voltarAoHub() {
  // Volta para a landing oficial de módulos no index.
  // O index já possui o fluxo de autenticação + hub centralizado.
  window.location.href = 'index.html';
}

function projGoBack() {
  // From hub back to login
  document.getElementById('module-hub').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
}

// Após login bem-sucedido, roteia para o módulo correto conforme perfil
(function() {
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      if(m.target.id === 'login-screen' && m.target.style.display === 'none') {
        const temProc = hasProcessosAccess();
        const temProj = hasProjetosAccess();
        if(temProj && !temProc) {
          // Gerente de Projeto puro → vai direto ao módulo de projetos
          document.querySelector('.shell').style.display = 'none';
          const hub = document.getElementById('module-hub');
          if(hub) hub.style.display = 'none';
          const ps = document.getElementById('proj-shell');
          if(ps) ps.classList.add('on');
          _hubVisible = false;
          projLoad();
        } else if(temProc && !temProj) {
          // Processos puro → vai direto ao shell de processos
          document.querySelector('.shell').style.display = 'grid';
          const hub = document.getElementById('module-hub');
          if(hub) hub.style.display = 'none';
          _hubVisible = false;
        } else {
          // Acesso duplo ou EP → mostra hub com cards filtrados
          document.querySelector('.shell').style.display = 'none';
          const hub = document.getElementById('module-hub');
          if(hub) { hub.classList.add('on'); hub.style.display = ''; }
          _atualizarCardsHub();
          _hubVisible = true;
        }
      }
    });
  });
  document.addEventListener('DOMContentLoaded', function() {
    const ls = document.getElementById('login-screen');
    if(ls) observer.observe(ls, { attributes: true, attributeFilter: ['style'] });
  });
})();

// ── Navegação interna do módulo de projetos ──────────────────────
function projGo(pageId, btnEl) {
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
    case 'portfolio': projRenderPortfolio(); projRenderQuickAccess(); break;
    case 'concluidos': projRenderConcluidos(); break;
    case 'programas': progRenderPage(); break;
    case 'estrategia': projRenderEstrategiaPage(); break;
    case 'reunioes':  projRenderReunioesPage(); break;
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
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
  const cleanup = () => { dialog.style.display = 'none'; okBtn.onclick = null; };
  okBtn.onclick = () => { cleanup(); onConfirm(); };
  // Override the cancel button
  const cancelBtn = dialog.querySelector('button.btn:not(#modal-confirm-ok)');
  if(cancelBtn) cancelBtn.onclick = cleanup;
}

// ════════════════════════════════════════════════════════════════════
// PÁGINA: INÍCIO (Dashboard)
// ════════════════════════════════════════════════════════════════════
function projRenderInicio() {
  projLoad();
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', {weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const dateEl = document.getElementById('proj-dash-date');
  if(dateEl) dateEl.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  const ativos = _projetos.filter(p=>p.status==='ativo');
  const emExecucao = ativos.filter(p=>p.fase_atual==='execucao');
  const emIdeacaoPlan = ativos.filter(p=>p.fase_atual==='ideacao'||p.fase_atual==='planejamento'||p.fase_atual==='aprovacao');
  const concluidos = _projetos.filter(p=>p.status==='concluido');

  // ── PROGRESS MAP ──
  const lpContainer = document.getElementById('proj-launchpad-container');
  if(lpContainer) {
    const allProjects = _projetos.filter(p => p.status==='ativo');
    let laneOrder;
    try { laneOrder = JSON.parse(localStorage.getItem('proj_lane_order')||'null'); } catch(e) { laneOrder = null; }
    let ordered = [];
    if(laneOrder && Array.isArray(laneOrder)) {
      laneOrder.forEach(id => { const p = allProjects.find(x => String(x.id)===String(id)); if(p) ordered.push(p); });
      allProjects.forEach(p => { if(!ordered.find(x=>String(x.id)===String(p.id))) ordered.push(p); });
    } else {
      ordered = allProjects.slice();
    }

    // Build lanes
    const gridSegs = Array.from({length:10},()=>'<div class="proj-launchpad-lane-grid-seg"></div>').join('');
    let lanesHTML = '';
    ordered.forEach((p, idx) => {
      const pct = p.percentual || 0;
      const emoji = p.icone_emoji || '📋';
      lanesHTML += `
        <div class="proj-launchpad-lane" id="proj-lane-${p.id}" data-id="${p.id}" data-idx="${idx}">
          <div class="proj-launchpad-lane-grid">${gridSegs}</div>
          <div class="proj-rocket" id="proj-rocket-${p.id}"
               data-id="${p.id}" data-pct="${pct}"
               style="left:calc(${pct}% - 22px)"
               onmousedown="projRocketUnifiedDrag(event,'${p.id}')"
               ontouchstart="projRocketUnifiedDrag(event,'${p.id}')"
               ondblclick="projAbrirDetalhe('${p.id}')">
            <div class="proj-rocket-icon">
              ${p.icone_url ? `<img src="${projEsc(p.icone_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:9px">` : emoji}
            </div>
            <div class="proj-rocket-label">
              <div class="proj-rocket-name" title="${projEsc(p.nome)}">${projEsc(p.nome)}</div>
              <div class="proj-rocket-mgr">${projEsc(p.gerente||'')}</div>
              <div class="proj-rocket-pct">${pct}%</div>
              <div class="proj-rocket-bar"><div class="proj-rocket-bar-fill" style="width:${pct}%"></div></div>
            </div>
          </div>
        </div>`;
    });

    // Build axis — tick marks + labels at absolute % positions
    let axisInner = '';
    for(let i = 0; i <= 10; i++) {
      const pct = i * 10;
      axisInner += `<div class="proj-launchpad-axis-tick" style="left:${pct}%"></div>`;
      axisInner += `<div class="proj-launchpad-axis-lbl" style="left:${pct}%">${pct}%</div>`;
    }

    lpContainer.innerHTML = `
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
          <div class="proj-launchpad-legend">
            <span><span class="proj-launchpad-legend-key"></span> Arraste na horizontal para ajustar %</span>
            <span>Arraste na vertical para reordenar</span>
            <span>Duplo-clique para abrir</span>
          </div>
        </div>
        <div class="proj-launchpad-body">
          <div class="proj-launchpad-track" id="proj-launchpad-track">
            <div class="proj-launchpad-lanes" id="proj-launchpad-lanes">
              ${lanesHTML}
            </div>
            <div class="proj-launchpad-progress-line"></div>
            <div class="proj-launchpad-axis">${axisInner}</div>
          </div>
        </div>
      </div>
    `;
  }

  // 2. Painéis executivos v9
  projRenderDashV9();

  // 3. Reuniões do mês
  projRenderReunioesDoMes();
  projAtualizarBadgeReunioes();

  // 4. Estatísticas
  const statsRow = document.getElementById('proj-stats-row');
  if(statsRow) statsRow.innerHTML = `
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
  `;
}

// ── UNIFIED DRAG: detects horizontal vs vertical intent ──
let _rocketDrag = null;
function projRocketUnifiedDrag(e, projId) {
  e.preventDefault();
  e.stopPropagation();
  const lane = document.getElementById('proj-lane-' + projId);
  const rocket = document.getElementById('proj-rocket-' + projId);
  const lanesContainer = document.getElementById('proj-launchpad-lanes');
  if(!lane || !rocket || !lanesContainer) return;

  const startX = e.touches ? e.touches[0].clientX : e.clientX;
  const startY = e.touches ? e.touches[0].clientY : e.clientY;
  const THRESHOLD = 6;
  let mode = null;

  const laneRect = lane.getBoundingClientRect();
  let dragLaneEl = lane;

  function onMove(ev) {
    ev.preventDefault();
    const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
    const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
    const dx = cx - startX;
    const dy = cy - startY;

    if(!mode) {
      if(Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;
      mode = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
      if(mode === 'h') {
        rocket.classList.add('dragging');
      } else {
        dragLaneEl.classList.add('lane-dragging');
      }
    }

    if(mode === 'h') {
      let relX = cx - laneRect.left;
      relX = Math.max(0, Math.min(relX, laneRect.width));
      const pct = Math.round((relX / laneRect.width) * 100);
      rocket.style.left = `calc(${pct}% - 22px)`;
      rocket.setAttribute('data-pct', pct);
      const pctEl = rocket.querySelector('.proj-rocket-pct');
      if(pctEl) pctEl.textContent = pct + '%';
      const barFill = rocket.querySelector('.proj-rocket-bar-fill');
      if(barFill) barFill.style.width = pct + '%';
    } else {
      dragLaneEl.style.transform = `translateY(${dy}px)`;
      const lanes = Array.from(lanesContainer.querySelectorAll('.proj-launchpad-lane'));
      const dragIdx = lanes.indexOf(dragLaneEl);
      lanes.forEach(l => { l.classList.remove('lane-drop-above','lane-drop-below'); });
      for(let i = 0; i < lanes.length; i++) {
        if(i === dragIdx) continue;
        const r = lanes[i].getBoundingClientRect();
        if(cy >= r.top && cy <= r.bottom) {
          const midY = r.top + r.height / 2;
          lanes[i].classList.add(cy < midY ? 'lane-drop-above' : 'lane-drop-below');
        }
      }
    }
  }

  function onEnd(ev) {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onEnd);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onEnd);

    if(mode === 'h') {
      rocket.classList.remove('dragging');
      const newPct = parseInt(rocket.getAttribute('data-pct')) || 0;
      projLoad();
      const proj = _projetos.find(p => String(p.id) === String(projId));
      if(proj) {
        proj.percentual = newPct;
        if(!proj.execucao) proj.execucao = { planner_link:'', percentual:0, reunioes:[] };
        proj.execucao.percentual = newPct;
        projSave();
        projToast(`${proj.nome}: ${newPct}%`, 'var(--blue)');
      }
    } else if(mode === 'v') {
      dragLaneEl.classList.remove('lane-dragging');
      dragLaneEl.style.transform = '';
      const cy = ev.changedTouches ? ev.changedTouches[0].clientY : ev.clientY;
      const lanes = Array.from(lanesContainer.querySelectorAll('.proj-launchpad-lane'));
      const dragIdx = lanes.indexOf(dragLaneEl);
      lanes.forEach(l => { l.classList.remove('lane-drop-above','lane-drop-below'); });
      let targetIdx = dragIdx;
      for(let i = 0; i < lanes.length; i++) {
        if(i === dragIdx) continue;
        const r = lanes[i].getBoundingClientRect();
        if(cy >= r.top && cy <= r.bottom) {
          const midY = r.top + r.height / 2;
          targetIdx = cy < midY ? i : i + 1;
          if(targetIdx > dragIdx) targetIdx--;
          break;
        }
      }
      if(targetIdx !== dragIdx) {
        lanesContainer.removeChild(dragLaneEl);
        const updatedLanes = Array.from(lanesContainer.querySelectorAll('.proj-launchpad-lane'));
        if(targetIdx >= updatedLanes.length) {
          lanesContainer.appendChild(dragLaneEl);
        } else {
          lanesContainer.insertBefore(dragLaneEl, updatedLanes[targetIdx]);
        }
        const finalLanes = Array.from(lanesContainer.querySelectorAll('.proj-launchpad-lane'));
        const order = finalLanes.map(l => l.getAttribute('data-id'));
        try { localStorage.setItem('proj_lane_order', JSON.stringify(order)); } catch(e){}
        projToast('Ordem atualizada','#0e7490');
      }
    }
    mode = null;
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onEnd);
  document.addEventListener('touchmove', onMove, {passive:false});
  document.addEventListener('touchend', onEnd);
}

function projRenderReunioesDoMes() {
  const reunEl = document.getElementById('proj-dash-reunioes');
  if(!reunEl) return;
  const { mes, ano } = projGetMesAtual();
  const todas = [];
  _projetos.forEach(p => {
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
    reunEl.innerHTML = '<div style="text-align:center;padding:1.2rem;color:#b0b8cc;font-size:13px">Nenhuma reunião agendada este mês</div>';
    return;
  }

  reunEl.innerHTML = todas.map(r => `
    <div class="proj-reunion-item ${r.realizada ? 'proj-reunion-done' : ''}" id="reunion-item-${projEsc(r.id)}">
      <div class="proj-reunion-check ${r.realizada ? 'done' : ''}" onclick="projToggleReuniao('${r._projeto_id}','${projEsc(r.id)}')">
        ${r.realizada ? '<svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M2 6l3 3 5-5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
      </div>
      <div style="flex:1;min-width:0">
        <div class="proj-reunion-text">${projEsc(r.nome)}</div>
        <div class="proj-reunion-proj" style="margin-top:2px">${projIconHtml(r._projeto)} ${projEsc(r._projeto_nome)}</div>
      </div>
      ${r.data ? `<div class="proj-reunion-date">${projFormatDate(r.data)}</div>` : ''}
    </div>
  `).join('');
}

function projToggleReuniao(projetoId, reuniaoId) {
  projLoad();
  const proj = _projetos.find(p => String(p.id) === String(projetoId));
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
  const { mes, ano } = projGetMesAtual();
  let pendentes = 0;
  _projetos.forEach(p => {
    (p.execucao?.reunioes||[]).forEach(r => {
      const isCurrentMonth = !r.data || (() => {
        const d = new Date(r.data);
        return d.getMonth() === mes && d.getFullYear() === ano;
      })();
      if(isCurrentMonth && !r.realizada) pendentes++;
    });
  });
  const badge = document.getElementById('pnb-reunioes-cnt');
  if(badge) {
    badge.textContent = pendentes;
    badge.style.display = pendentes > 0 ? 'inline-block' : 'none';
  }
}

// ════════════════════════════════════════════════════════════════════
// PÁGINA: PORTFÓLIO
// ════════════════════════════════════════════════════════════════════
function projRenderProjItem(p) {
  return `
    <div class="proj-list-item" onclick="projAbrirDetalhe('${p.id}')">
      <div class="proj-list-icon">
        ${p.icone_url ? `<img src="${projEsc(p.icone_url)}" alt="ícone">` : `<span style="font-size:20px">${p.icone_emoji || '📁'}</span>`}
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
        <button type="button" class="proj-btn" style="font-size:11px;padding:3px 9px" onclick="event.stopPropagation();projTrocarIcone('${p.id}')">🎨</button>
        <button type="button" class="proj-btn danger" style="font-size:11px;padding:3px 9px" onclick="event.stopPropagation();projExcluir('${p.id}')">Excluir</button>
      </div>
    </div>
  `;
}

function projRenderPortfolio() {
  projLoad();
  const el = document.getElementById('proj-portfolio-content');
  if(!el) return;

  const ativos = _projetos.filter(p=>p.status==='ativo');
  const concluidos = _projetos.filter(p=>p.status==='concluido' || p.status==='cancelado');

  if(ativos.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:3rem;color:#b0b8cc"><div style="font-size:40px;margin-bottom:12px">📋</div><div style="font-size:15px;font-weight:600;margin-bottom:6px">Nenhum projeto em andamento</div><div style="font-size:13px">Clique em "Novo Projeto" para começar.</div></div>';
  } else {
    // Show only active projects - grouped by program
    let html = '';
    progLoad();
    const programasAtivos = _programas.filter(pg => pg.status !== 'cancelado');

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
    el.innerHTML = html;
  }

  // Link to concluded projects
  if(concluidos.length > 0) {
    el.innerHTML += `
      <div style="margin-top:2rem;padding-top:1.4rem;border-top:2px solid #eaecf3;text-align:center">
        <button type="button" class="proj-btn" style="font-size:13px;padding:8px 20px" onclick="projGo('concluidos')">
          🏆 Ver Projetos Concluídos (${concluidos.length})
        </button>
      </div>`;
  }
}

function projRenderConcluidos() {
  projLoad();
  const el = document.getElementById('proj-concluidos-content');
  if(!el) return;
  const concluidos = _projetos.filter(p=>p.status==='concluido');
  const cancelados = _projetos.filter(p=>p.status==='cancelado');
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
  el.insertAdjacentHTML('beforeend', html);
}

// ════════════════════════════════════════════════════════════════════
// PÁGINA: REUNIÕES
// ════════════════════════════════════════════════════════════════════
function projRenderStatusReport() {
  projLoad();
  const el = document.getElementById('proj-status-report-content');
  if(!el) return;
  const ativos = _projetos.filter(p => p.status === 'ativo');
  if(!ativos.length) {
    el.innerHTML = '<div style="text-align:center;padding:2rem;color:#b0b8cc;font-size:13px">Nenhum projeto em andamento encontrado.</div>';
    return;
  }
  el.innerHTML = `
    <div class="proj-ib proj-ib-blue">Preencha a observação livre de cada projeto. Esse texto será exibido ao lado do projeto no PDF do Status Report.</div>
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
            <label class="proj-fl" for="sr-obs-${projEsc(String(p.id))}">Texto livre para o Status Report</label>
            <textarea class="proj-fi proj-status-note" id="sr-obs-${projEsc(String(p.id))}" data-proj-id="${projEsc(String(p.id))}" rows="3" placeholder="Digite aqui o comentário executivo deste projeto..." onchange="projSalvarStatusReportObs('${projEsc(String(p.id))}',this.value)">${projEsc(p.status_report_obs||'')}</textarea>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function projSalvarStatusReportObs(projId, value, silent) {
  if(!projCanWriteExec()){ if(!silent) projToast('Somente EPP ou Gerente de Projeto pode salvar status report.','#d97706'); return; }
  projLoad();
  const proj = _projetos.find(p => String(p.id) === String(projId));
  if(!proj) return;
  proj.status_report_obs = value || '';
  projSave();
  if(!silent) projToast('Observação salva.');
}

function projSaveStatusReportFromForm() {
  let changed = false;
  document.querySelectorAll('.proj-status-note[data-proj-id]').forEach(txt => {
    const proj = _projetos.find(p => String(p.id) === String(txt.dataset.projId));
    if(proj && proj.status_report_obs !== txt.value) {
      proj.status_report_obs = txt.value;
      changed = true;
    }
  });
  if(changed) projSave();
}

function projBuildStatusReportHTML() {
  const ativos = _projetos.filter(p => p.status === 'ativo');
  const data = new Date().toLocaleDateString('pt-BR');
  const rows = ativos.map(p => {
    const pct = Math.max(0, Math.min(100, p.percentual || 0));
    const obs = projEsc(p.status_report_obs || 'Sem observações registradas.').replace(/\n/g,'<br>');
    return `
      <section class="sr-card">
        <div class="sr-card-main">
          <div class="sr-title-row">
            <div class="sr-icon">${p.icone_url ? `<img src="${projEsc(p.icone_url)}" alt="">` : projEsc(p.icone_emoji || '📁')}</div>
            <div>
              <h2>${projEsc(p.nome)}</h2>
              <div class="sr-sub">Projeto em andamento · ${projEsc(projFaseText(p))}</div>
            </div>
            <div class="sr-pct">${pct}%</div>
          </div>
          <div class="sr-progress"><div style="width:${pct}%"></div></div>
          <div class="sr-info">
            <div><span>Patrocinador</span>${projEsc(p.patrocinador||'Não informado')}</div>
            <div><span>Gerente</span>${projEsc(p.gerente||'Não informado')}</div>
            <div><span>Gerente substituto</span>${projEsc(p.gerente_substituto||'Não informado')}</div>
            <div><span>% de conclusão</span>${pct}%</div>
          </div>
        </div>
        <aside class="sr-note">
          <span>Informação executiva</span>
          <p>${obs}</p>
        </aside>
      </section>
    `;
  }).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Status Report</title>
    <style>
      @page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#1a2540;margin:0;background:#fff}
      .sr-cover{border-left:8px solid var(--blue);padding:18px 22px;margin-bottom:18px;background:linear-gradient(90deg,#f0f6ff,#fff)}
      .sr-kicker{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#00a89a}.sr-cover h1{margin:4px 0;font-size:25px;color:var(--blue)}.sr-date{font-size:12px;color:#5f6b80}
      .sr-summary{display:flex;gap:10px;margin-bottom:16px}.sr-chip{border:1px solid #d9e5f5;border-radius:8px;padding:8px 12px;font-size:12px;background:#f8fbff}.sr-chip strong{font-size:18px;color:var(--blue);display:block}
      .sr-card{display:grid;grid-template-columns:1.45fr .9fr;gap:14px;border:1px solid #d9e2ef;border-radius:10px;padding:14px;margin-bottom:12px;break-inside:avoid;page-break-inside:avoid}
      .sr-title-row{display:flex;align-items:center;gap:10px}.sr-icon{width:36px;height:36px;border-radius:9px;background:var(--blue-l);display:flex;align-items:center;justify-content:center;font-size:18px;overflow:hidden}.sr-icon img{width:100%;height:100%;object-fit:cover}
      h2{font-size:15px;margin:0;color:#0f2746}.sr-sub{font-size:10.5px;color:#6b7588;margin-top:2px}.sr-pct{margin-left:auto;font-size:24px;font-weight:800;color:#00a89a}
      .sr-progress{height:7px;border-radius:99px;background:#e7edf5;overflow:hidden;margin:12px 0}.sr-progress div{height:100%;background:linear-gradient(90deg,var(--blue),var(--teal))}
      .sr-info{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sr-info div{font-size:12px;border-top:1px solid #edf2f7;padding-top:6px}.sr-info span,.sr-note span{display:block;font-size:9px;color:var(--blue);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}
      .sr-note{border-left:3px solid #f59e0b;padding-left:12px}.sr-note p{font-size:12px;line-height:1.45;margin:0;color:#334155}
      .sr-empty{font-size:13px;color:#6b7588;padding:18px;border:1px solid #d9e2ef;border-radius:10px}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none!important}}
    </style></head><body>
      <header class="sr-cover"><div class="sr-kicker">CAGE-RS · Escritório de Projetos e Processos</div><h1>Status Report</h1><div class="sr-date">Emitido em ${data}</div></header>
      <div class="sr-summary"><div class="sr-chip"><strong>${ativos.length}</strong>Projetos em andamento</div><div class="sr-chip"><strong>${ativos.length ? Math.round(ativos.reduce((a,p)=>a+(p.percentual||0),0)/ativos.length) : 0}%</strong>Média de conclusão</div></div>
      ${ativos.length ? rows : '<div class="sr-empty">Nenhum projeto em andamento encontrado.</div>'}
      <script>setTimeout(function(){window.print();},350);</script>
    </body></html>`;
}

function projExportStatusReportPDF() {
  projLoad();
  projSaveStatusReportFromForm();
  const w = window.open('', '_blank');
  if(!w) { projToast('Permita pop-ups para exportar o PDF.', '#d97706'); return; }
  w.document.open();
  w.document.write(projBuildStatusReportHTML());
  w.document.close();
}

function projExportReunioesRealizadasPDF() {
  projLoad();
  const monthValue = document.getElementById('greuniao-rel-mes')?.value || projMonthValue();
  const label = projMonthLabel(monthValue);
  const realizadas = [];
  _projetos.forEach(p => {
    (p.execucao?.reunioes||[]).forEach(r => {
      if(r.realizada && r.data && projIsoInMonth(r.data, monthValue)) realizadas.push({ ...r, _projeto:p });
    });
  });
  const rows = realizadas.sort((a,b)=>(a.data||'').localeCompare(b.data||'')).map(r => `
    <tr>
      <td>${projFormatDate(r.data)}</td>
      <td>${projEsc(r._projeto.nome)}</td>
      <td>${projEsc(r.nome)}</td>
      <td>${projEsc(r.participantes||'')}</td>
      <td>${projEsc(r.observacoes||'')}</td>
    </tr>
  `).join('');
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Reuniões Realizadas</title>
    <style>@page{size:A4;margin:14mm}body{font-family:Arial,Helvetica,sans-serif;color:#1a2540}.head{border-left:8px solid var(--blue);padding:14px 18px;background:#f0f6ff;margin-bottom:16px}.k{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#00a89a;font-weight:700}h1{margin:4px 0;color:var(--blue);font-size:24px}.sub{font-size:12px;color:#5f6b80}table{width:100%;border-collapse:collapse;font-size:11.5px}th{background:var(--blue);color:#fff;text-align:left;padding:8px}td{border-bottom:1px solid #d9e2ef;padding:7px;vertical-align:top}tr:nth-child(even) td{background:#f8fbff}.empty{padding:18px;border:1px solid #d9e2ef;border-radius:8px;color:#5f6b80}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>
    </head><body><div class="head"><div class="k">CAGE-RS · Escritório de Projetos e Processos</div><h1>Reuniões Realizadas</h1><div class="sub">${label} · ${realizadas.length} reunião(ões)</div></div>
    ${realizadas.length ? `<table><thead><tr><th>Data</th><th>Projeto</th><th>Reunião</th><th>Participantes</th><th>Observações</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">Nenhuma reunião realizada encontrada para o mês/ano selecionado.</div>'}
    <script>setTimeout(function(){window.print();},350);</script></body></html>`;
  const w = window.open('', '_blank');
  if(!w) { projToast('Permita pop-ups para exportar o PDF.', '#d97706'); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function projAddMonths(date, months) {
  const d = date || new Date();
  return new Date(d.getFullYear(), d.getMonth() + (months||0), 1);
}

function projAutoAddReunioesTipo(tipo, monthOffset) {
  projLoad();
  const target = projAddMonths(new Date(), monthOffset || 0);
  const mn = projMonthLabel(projMonthValue(target));
  const dataStatus = projMonthFirstDay(target);
  const isCronograma = tipo === 'cronograma';
  const baseNome = isCronograma ? 'Acompanhamento de Cronograma' : 'Reuniao de Status Patrocinador';
  const nome = baseNome + ' - ' + mn;
  let count = 0;
  let jaExiste = 0;
  _projetos.forEach(function(proj){
    if(proj.status === 'concluido' || proj.status === 'cancelado') return;
    if(!proj.execucao) proj.execucao = {planner_link:'',percentual:0,reunioes:[]};
    if(!proj.execucao.reunioes) proj.execucao.reunioes = [];
    var ja = proj.execucao.reunioes.some(function(r){
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
  _projetos.forEach(function(p){
    (p.execucao?.reunioes || []).forEach(function(r){
      todas.push({ ...r, _projeto:p });
    });
  });
  return todas;
}

function projRenderReunioesCalendar(container) {
  const monthValue = document.getElementById('proj-cal-reuniao-mes')?.value || projMonthValue();
  const parts = monthValue.split('-').map(Number);
  const ano = parts[0];
  const mesIndex = (parts[1] || 1) - 1;
  const first = new Date(ano, mesIndex, 1);
  const daysInMonth = new Date(ano, mesIndex + 1, 0).getDate();
  const startOffset = first.getDay();
  const reunioes = projColetarReunioesGlobal().filter(r => r.data && projIsoInMonth(r.data, monthValue));
  const byDay = {};
  reunioes.forEach(r => {
    const day = parseInt(String(r.data).slice(8,10), 10);
    if(!byDay[day]) byDay[day] = [];
    byDay[day].push(r);
  });

  const section = document.createElement('div');
  section.className = 'proj-form-section proj-meeting-calendar-section';
  section.style.marginBottom = '1rem';

  // Title — static SVG + text
  const titleDiv = document.createElement('div');
  titleDiv.className = 'proj-form-section-title';
  titleDiv.innerHTML = '<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><rect x="1.5" y="3" width="13" height="11.5" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M5 1.5v3M11 1.5v3M1.5 6.5h13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
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
  monthInput.addEventListener('change', () => projRenderReunioesPage());
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
    items.slice(0,3).forEach(r => {
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
    if(items.length > 3){
      const more = document.createElement('div');
      more.className = 'proj-meeting-cal-more';
      more.textContent = '+' + (items.length - 3) + ' reunião(ões)';
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
  let payload = null;
  try { payload = JSON.parse(ev.dataTransfer.getData('text/plain') || '{}'); } catch(e) { payload = null; }
  if(!payload?.projetoId || !payload?.reuniaoId || !novaData) return;
  projLoad();
  const proj = _projetos.find(p => String(p.id) === String(payload.projetoId));
  const reuniao = proj?.execucao?.reunioes?.find(r => String(r.id) === String(payload.reuniaoId));
  if(!reuniao) return;
  reuniao.data = novaData;
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
  el.innerHTML = `
    <div class="proj-form-section" style="margin-bottom:1rem">
      <div class="proj-form-section-title">
        <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M3 2.5h10v11H3z" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 6h5M5.5 8.5h5M5.5 11h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        Relatório de Reuniões Realizadas
      </div>
      <div style="display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap">
        <div class="proj-fg" style="margin:0;min-width:180px">
          <label class="proj-fl" for="greuniao-rel-mes">Mês/Ano</label>
          <input type="month" class="proj-fi" id="greuniao-rel-mes" value="${projMonthValue()}">
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
  `;

  // Calendar built entirely via DOM (user data via textContent/title/addEventListener)
  const calDiv = document.createElement('div');
  projRenderReunioesCalendar(calDiv);
  el.prepend(calDiv.firstElementChild || calDiv);

  // Populate project select options safely via DOM
  const sel = document.getElementById('greuniao-proj');
  if(sel) {
    _projetos.filter(p => p.status === 'ativo').forEach(p => {
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
  _projetos.forEach(p => {
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
      hd.innerHTML = calSvg;
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
    hd.innerHTML = calSvg;
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
  const proj = _projetos.find(p => String(p.id) === String(projId));
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

  el.innerHTML = html;
}

// ── Helper: render a single reunião item ──
function projRenderReuniaoItem(projId, r, isDone) {
  return `
    <div class="proj-reunion-item ${isDone?'proj-reunion-done':''}" style="display:grid;grid-template-columns:auto 1fr auto auto auto;align-items:center;gap:8px;padding:.6rem 0;border-bottom:1px solid #eaecf3">
      <div class="proj-reunion-check ${isDone?'done':''}" onclick="projToggleReuniaoPage('${projId}','${projEsc(r.id)}')">
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
      <button type="button" class="proj-btn" style="font-size:11px;padding:3px 8px" onclick="projEditarReuniaoModal('${projId}','${projEsc(r.id)}')">✏️</button>
      <button type="button" class="proj-btn danger" style="font-size:11px;padding:3px 8px" onclick="projExcluirReuniao('${projId}','${projEsc(r.id)}')">✕</button>
    </div>
  `;
}

function projAdicionarReuniaoGlobal() {
  const projId = document.getElementById('greuniao-proj')?.value;
  const nome = document.getElementById('greuniao-nome')?.value.trim();
  if(!projId) { projToast('Selecione um projeto.', '#d97706'); return; }
  if(!nome)   { projToast('Informe o nome da reunião.', '#d97706'); return; }
  projLoad();
  const proj = _projetos.find(p => String(p.id) === String(projId));
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
  projLoad();
  const proj = _projetos.find(p => String(p.id) === String(projetoId));
  if(!proj) return;
  const r = (proj.execucao?.reunioes||[]).find(r => String(r.id) === String(reuniaoId));
  if(!r) return;

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem';
  modal.innerHTML = `
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
        <button type="button" class="proj-btn primary" onclick="projSalvarEdicaoReuniao('${projetoId}','${reuniaoId}',this)">Salvar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function projSalvarEdicaoReuniao(projetoId, reuniaoId, btn) {
  const nome = document.getElementById('edit-r-nome')?.value.trim();
  if(!nome) { projToast('Informe o nome.','#d97706'); return; }
  projLoad();
  const proj = _projetos.find(p => String(p.id) === String(projetoId));
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
  projConfirmar('Tem certeza que deseja excluir esta reunião?\n\nEsta ação não pode ser desfeita.', () => {
    projLoad();
    const proj = _projetos.find(p => String(p.id) === String(projetoId));
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
    const ativos = _programas.filter(pg => pg.status === 'ativo');
    progSel.innerHTML = '<option value="">Sem programa</option>' +
      ativos.map(pg => `<option value="${projEsc(String(pg.id))}">${projEsc(pg.nome)}</option>`).join('');
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
  _projetos.push(novo);
  projSave();
  projToast('Projeto "' + nome + '" criado com sucesso!');
  projAbrirDetalhe(novo.id);
}

// ════════════════════════════════════════════════════════════════════
// EXCLUIR PROJETO
// ════════════════════════════════════════════════════════════════════
function projExcluir(id) {
  if(!projEnsureWriteAll()) return;
  const proj = _projetos.find(p => String(p.id) === String(id));
  if(!proj) return;
  projConfirmar(`Excluir o projeto "${proj.nome}"?\n\nAtenção: esta ação é irreversível e apagará todos os dados do projeto.`, () => {
    projConfirmar('Confirme novamente: EXCLUIR permanentemente o projeto "' + proj.nome + '"?', () => {
      projLoad();
      _projetos = _projetos.filter(p => String(p.id) !== String(id));
      projSave();
      projToast('Projeto excluído.');
      projGo('portfolio', document.getElementById('pnb-portfolio'));
    });
  });
}

// ════════════════════════════════════════════════════════════════════
// DETALHE DO PROJETO
// ════════════════════════════════════════════════════════════════════
function projAbrirDetalhe(id, forceWorkflow) {
  projLoad();
  _projCurrentId = String(id);
  const proj = _projetos.find(p => String(p.id) === String(id));
  if(!proj) { projToast('Projeto não encontrado.', '#b91c1c'); return; }

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

function projRenderMemorial(p) {
  const el = document.getElementById('proj-detalhe-content');
  if(!el) return;
  const conc = p.conclusao || {};
  const isSuccess = p.status === 'concluido';
  const statusColor = isSuccess ? 'var(--teal)' : '#b91c1c';
  const statusBg = isSuccess ? 'var(--teal-l)' : '#fde8e8';
  const statusIcon = isSuccess ? '✅' : '🚫';
  const statusLabel = isSuccess ? 'Concluído com Sucesso' : 'Cancelado';

  const links = (conc.links_noticias||'').split('\n').filter(l=>l.trim());

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:1.6rem;flex-wrap:wrap">
      <button type="button" class="proj-btn" style="font-size:12px;padding:5px 11px" onclick="projGo('portfolio',document.getElementById('pnb-portfolio'))">← Portfólio</button>
      <div style="flex:1">
        <div style="font-family:'Syne',sans-serif;font-size:19px;font-weight:700;color:#1a2540">${projEsc(p.nome)}</div>
        <div style="font-size:12px;color:var(--ink3);margin-top:2px">Gerente: ${projEsc(p.gerente)} ${p.patrocinador ? '· Patrocinador: '+projEsc(p.patrocinador) : ''}</div>
      </div>
      <span style="background:${statusBg};color:${statusColor};padding:4px 14px;border-radius:8px;font-size:12px;font-weight:700">${statusIcon} ${statusLabel}</span>
      <button type="button" class="proj-btn" style="font-size:12px;padding:5px 11px" onclick="projRenderDetalhe(_projetos.find(p=>String(p.id)===_projCurrentId))">📋 Ver Workflow</button>
    </div>

    <!-- Banner principal -->
    <div style="background:linear-gradient(135deg,${isSuccess?'var(--blue),var(--teal)':'#4a1a1a,#7f1d1d'});border-radius:18px;padding:2rem 2.2rem;margin-bottom:1.4rem;position:relative;overflow:hidden">
      <div style="position:absolute;right:-20px;top:-20px;font-size:100px;opacity:.08">${statusIcon}</div>
      <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem">Projeto ${statusLabel}</div>
      <div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:700;color:#fff;margin-bottom:.4rem">${projEsc(p.nome)}</div>
      <div style="font-size:13px;color:rgba(255,255,255,.7)">
        ${p.dt_inicio ? '📅 Início: '+projFormatDate(p.dt_inicio) : ''}
        ${p.dt_inicio && conc.dt_conclusao ? ' · ' : ''}
        ${conc.dt_conclusao ? '🏁 Encerramento: '+projFormatDate(conc.dt_conclusao) : ''}
      </div>
      ${conc.link_termo_aceite ? `
        <div style="margin-top:.8rem">
          <a href="${projEsc(conc.link_termo_aceite)}" target="_blank" style="background:rgba(255,255,255,.2);color:#fff;padding:5px 14px;border-radius:7px;text-decoration:none;font-size:12px;font-weight:600;border:1px solid rgba(255,255,255,.3)">📄 Termo de Aceite</a>
        </div>
      ` : ''}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:1.4rem">
      <!-- História -->
      <div class="proj-card" style="grid-column:${conc.historia ? '1 / -1' : '1'}">
        <div class="proj-card-t">📖 História do Projeto</div>
        ${conc.historia
          ? `<div style="font-size:13px;color:#3a4560;line-height:1.7;white-space:pre-wrap">${projEsc(conc.historia)}</div>`
          : `<div style="color:#b0b8cc;font-size:13px;text-align:center;padding:.8rem">Nenhuma história registrada. <button type="button" class="proj-btn" style="font-size:11px;padding:3px 9px;margin-left:6px" onclick="projRenderDetalhe(_projetos.find(p=>String(p.id)===_projCurrentId));setTimeout(()=>document.querySelector('#proj-detalhe-tabs .proj-tab:last-child').click(),100)">Registrar na aba Conclusão</button></div>`
        }
      </div>
      ${!conc.historia && links.length > 0 ? '' : ''}
    </div>

    ${links.length > 0 ? `
      <div class="proj-card" style="margin-bottom:1.4rem">
        <div class="proj-card-t">🔗 Resultados e Notícias</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${links.map((l,i) => `<a href="${projEsc(l.trim())}" target="_blank" style="font-size:12.5px;color:var(--blue);text-decoration:none;display:flex;align-items:center;gap:6px"><span style="background:var(--blue-l);border-radius:5px;padding:1px 7px;font-size:10.5px;font-weight:600;color:var(--blue)">${i+1}</span>${projEsc(l.trim())}</a>`).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Resumo do projeto (dados do canvas) -->
    ${(p.ideacao?.descricao || p.ideacao?.objetivo_smart) ? `
      <div class="proj-card" style="margin-bottom:1.4rem">
        <div class="proj-card-t">📋 Resumo do Projeto</div>
        ${p.ideacao?.descricao ? `<div style="margin-bottom:.7rem"><div style="font-size:10px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">Descrição</div><div style="font-size:13px;color:#3a4560">${projEsc(p.ideacao.descricao)}</div></div>` : ''}
        ${p.ideacao?.objetivo_smart ? `<div><div style="font-size:10px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">Objetivo</div><div style="font-size:13px;color:#3a4560">${projEsc(p.ideacao.objetivo_smart)}</div></div>` : ''}
      </div>
    ` : ''}
  `;
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

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:1.4rem;flex-wrap:wrap">
      <button type="button" class="proj-btn" style="font-size:12px;padding:5px 11px" onclick="projGo('portfolio',document.getElementById('pnb-portfolio'))">← Portfólio</button>
      <div style="font-size:28px;cursor:pointer;padding:2px 6px;border-radius:8px;border:1px dashed transparent;transition:all .2s" title="Alterar ícone" onclick="projShowEmojiPicker(${JSON.stringify(String(p.id))})" onmouseover="this.style.borderColor='#1A5DC8';this.style.background='#ebf1fc'" onmouseout="this.style.borderColor='transparent';this.style.background='none'">${p.icone_url ? '<img src="'+projEsc(p.icone_url)+'" style="width:32px;height:32px;object-fit:cover;border-radius:6px">' : (p.icone_emoji || '📁')}</div>
      <div style="flex:1">
        <div style="font-family:'Syne',sans-serif;font-size:19px;font-weight:700;color:#1a2540">${projEsc(p.nome)}</div>
        <div style="font-size:12px;color:var(--ink3);margin-top:2px">Gerente: ${projEsc(p.gerente)} ${p.patrocinador ? '· Patrocinador: '+projEsc(p.patrocinador) : ''}</div>
      </div>
      <span class="proj-list-badge ${projFaseBadgeClass(p.status,p.fase_atual)}" style="font-size:12px;padding:4px 12px">${projFaseText(p)}</span>
      ${p.status==='ativo' ? '<span id="proj-fase-buttons" data-pid="' + p.id + '"></span>' : ''}
    </div>

    <!-- Workflow -->
    <div class="proj-card" style="margin-bottom:1.2rem">
      <div class="proj-workflow">${workflow}</div>
    </div>

    <!-- Tabs das fases -->
    <div class="proj-tabs" id="proj-detalhe-tabs">${tabs}</div>
    <div id="proj-detalhe-tab-content"></div>
  `;

  // Populate fase buttons (avoid nested template literals)
  var faseBtn = document.getElementById('proj-fase-buttons');
  if(faseBtn) {
    var pid = faseBtn.getAttribute('data-pid');
    var fIdx = FASE_IDX[p.fase_atual] || 0;
    faseBtn.replaceChildren();
    if(fIdx > 0){ const b=document.createElement('button'); b.type='button'; b.className='proj-btn'; b.style.cssText='font-size:12px;padding:5px 11px;margin-right:6px'; b.textContent='← Regredir Fase'; b.onclick=()=>projRegredirFase(pid); faseBtn.appendChild(b);}
    if(fIdx < PROJ_FASES.length - 1){ const b=document.createElement('button'); b.type='button'; b.className='proj-btn'; b.style.cssText='font-size:12px;padding:5px 11px'; b.textContent='Avançar Fase →'; b.onclick=()=>projAvancarFase(pid); faseBtn.appendChild(b);}
  }
  // Render first tab
  var faseToOpen = p.fase_atual || 'aprovacao';
  var tabIdx = {aprovacao:0, ideacao:1, planejamento:2, execucao:3, conclusao:4};
  var tIdx = tabIdx[faseToOpen] || 0;
  var tabEls = el.querySelectorAll('#proj-detalhe-tabs .proj-tab');
  projDetalheTab(faseToOpen, tabEls[tIdx] || tabEls[0]);
}

function projDetalheTab(faseId, tabEl) {
  document.querySelectorAll('#proj-detalhe-tabs .proj-tab').forEach(t => t.classList.remove('on'));
  if(tabEl) tabEl.classList.add('on');
  const proj = _projetos.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  const content = document.getElementById('proj-detalhe-tab-content');
  if(!content) return;

  switch(faseId) {
    case 'aprovacao':    content.innerHTML = projTabAprovacao(proj); setTimeout(projPopulateVinculacoes,50); break;
    case 'ideacao':      content.innerHTML = projTabIdeacao(proj); break;
    case 'planejamento': content.innerHTML = projTabPlanejamento(proj); break;
    case 'execucao':     content.innerHTML = projTabExecucao(proj); break;
    case 'conclusao':    content.innerHTML = projTabConclusao(proj); break;
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
          <label class="proj-fl">Divisão (opcional)</label>
          <select class="proj-fi" id="aprov-divisao" onchange="projSalvarAprovacao()">
            <option value="" ${!p.divisao?'selected':''}>— Nenhuma —</option>
            <option value="GAB" ${p.divisao==='GAB'?'selected':''}>GAB</option>
            <option value="DCO" ${p.divisao==='DCO'?'selected':''}>DCO</option>
            <option value="DAUD" ${p.divisao==='DAUD'?'selected':''}>DAUD</option>
            <option value="DCON" ${p.divisao==='DCON'?'selected':''}>DCON</option>
            <option value="DTTI" ${p.divisao==='DTTI'?'selected':''}>DTTI</option>
            <option value="DIE" ${p.divisao==='DIE'?'selected':''}>DIE</option>
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
            ${(_programas||[]).filter(pg=>pg.status!=='cancelado').map(pg=>`<option value="${projEsc(String(pg.id))}" ${String(p.programa_id)===String(pg.id)?'selected':''}>${projEsc(pg.nome)}</option>`).join('')}
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
        <div style="margin-top:6px;display:flex;gap:6px">
          <input type="text" class="proj-fi" id="aprov-macro-novo" placeholder="Ou digite um novo..." style="flex:1;font-size:12px">
          <button type="button" class="proj-btn" style="font-size:11px;padding:4px 10px;white-space:nowrap" onclick="projAddMacroNovo()">+ Novo</button>
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
  const proj = _projetos.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  // Save project metadata (editable from this tab)
  const newNome = document.getElementById('aprov-nome')?.value.trim();
  if(newNome) proj.nome = newNome;
  proj.gerente = document.getElementById('aprov-gerente')?.value.trim() || proj.gerente;
  proj.gerente_substituto = document.getElementById('aprov-gerente-sub')?.value.trim() || '';
  proj.patrocinador = document.getElementById('aprov-patrocinador')?.value.trim() || proj.patrocinador;
  proj.dt_inicio = document.getElementById('aprov-inicio')?.value || proj.dt_inicio;
  proj.dt_fim = document.getElementById('aprov-fim')?.value || proj.dt_fim;
  proj.fonte = document.getElementById('aprov-fonte')?.value || proj.fonte;
  proj.divisao = document.getElementById('aprov-divisao')?.value || '';
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

// ── Populate vinculações after tab renders ─────────────────────
function projPopulateVinculacoes() {
  projLoad();
  var proj = _projetos.find(function(p){return String(p.id)===_projCurrentId;});
  if(!proj) return;
  // Macroprocessos list
  var ml = document.getElementById('aprov-macro-list');
  if(ml) {
    ml.innerHTML = (proj.macroprocessos||[]).map(function(m,i){
      return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;padding:4px 8px;background:#f0f4ff;border-radius:6px;font-size:12px;color:#1a2540"><span style="flex:1">'+projEsc(m)+'</span><button type="button" style="background:none;border:none;cursor:pointer;color:#b91c1c;font-size:14px;padding:0 4px" onclick="projRemoverMacro('+i+')">✕</button></div>';
    }).join('');
  }
  var ms = document.getElementById('aprov-macro-sel');
  if(ms) {
    ms.innerHTML = '<option value="">Selecione...</option>' + _macroprocessos.map(function(m){return '<option value="'+projEsc(m)+'">'+projEsc(m)+'</option>';}).join('');
  }
  // Objetivos list
  var ol = document.getElementById('aprov-obj-list');
  if(ol) {
    ol.innerHTML = (proj.objetivos_estrategicos||[]).map(function(o,i){
      return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;padding:4px 8px;background:var(--teal-l);border-radius:6px;font-size:12px;color:#1a2540"><span style="flex:1">'+projEsc(o)+'</span><button type="button" style="background:none;border:none;cursor:pointer;color:#b91c1c;font-size:14px;padding:0 4px" onclick="projRemoverObj('+i+')">✕</button></div>';
    }).join('');
  }
  var os = document.getElementById('aprov-obj-sel');
  if(os) {
    os.innerHTML = '<option value="">Selecione...</option>' + _objetivosEstrategicos.map(function(o){return '<option value="'+projEsc(o)+'">'+projEsc(o)+'</option>';}).join('');
  }
}

function projAddMacro(){var s=document.getElementById('aprov-macro-sel');if(!s||!s.value){projToast('Selecione um macroprocesso.','#d97706');return;}projLoad();var p=_projetos.find(function(x){return String(x.id)===_projCurrentId;});if(!p)return;if(!p.macroprocessos)p.macroprocessos=[];if(p.macroprocessos.indexOf(s.value)>=0){projToast('Já vinculado.','#d97706');return;}p.macroprocessos.push(s.value);projSave();projPopulateVinculacoes();}
function projAddMacroNovo(){var inp=document.getElementById('aprov-macro-novo');if(!inp||!inp.value.trim()){projToast('Digite o macroprocesso.','#d97706');return;}var v=inp.value.trim();if(_macroprocessos.indexOf(v)<0){_macroprocessos.push(v);projSaveListas();}projLoad();var p=_projetos.find(function(x){return String(x.id)===_projCurrentId;});if(!p)return;if(!p.macroprocessos)p.macroprocessos=[];if(p.macroprocessos.indexOf(v)<0)p.macroprocessos.push(v);projSave();inp.value='';projPopulateVinculacoes();}
function projRemoverMacro(i){projLoad();var p=_projetos.find(function(x){return String(x.id)===_projCurrentId;});if(!p||!p.macroprocessos)return;p.macroprocessos.splice(i,1);projSave();projPopulateVinculacoes();}
function projAddObj(){var s=document.getElementById('aprov-obj-sel');if(!s||!s.value){projToast('Selecione um objetivo.','#d97706');return;}projLoad();var p=_projetos.find(function(x){return String(x.id)===_projCurrentId;});if(!p)return;if(!p.objetivos_estrategicos)p.objetivos_estrategicos=[];if(p.objetivos_estrategicos.indexOf(s.value)>=0){projToast('Já vinculado.','#d97706');return;}p.objetivos_estrategicos.push(s.value);projSave();projPopulateVinculacoes();}
function projAddObjNovo(){var inp=document.getElementById('aprov-obj-novo');if(!inp||!inp.value.trim()){projToast('Digite o objetivo.','#d97706');return;}var v=inp.value.trim();if(_objetivosEstrategicos.indexOf(v)<0){_objetivosEstrategicos.push(v);projSaveListas();}projLoad();var p=_projetos.find(function(x){return String(x.id)===_projCurrentId;});if(!p)return;if(!p.objetivos_estrategicos)p.objetivos_estrategicos=[];if(p.objetivos_estrategicos.indexOf(v)<0)p.objetivos_estrategicos.push(v);projSave();inp.value='';projPopulateVinculacoes();}
function projRemoverObj(i){projLoad();var p=_projetos.find(function(x){return String(x.id)===_projCurrentId;});if(!p||!p.objetivos_estrategicos)return;p.objetivos_estrategicos.splice(i,1);projSave();projPopulateVinculacoes();}

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
            <div style="padding:1rem;overflow-x:auto">${ide.canvas_html}</div>
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
          ${projCanvasCell(11,'OBJETIVO ESTRATÉGICO','Com qual objetivo este projeto contribui?','canvas-objetivo_estrategico',ide.objetivo_estrategico||'')}
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
  const proj = _projetos.find(p => String(p.id) === _projCurrentId);
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

function projSalvarIdeacao() {
  if(!projEnsureWriteAll()) return;
  projLoad();
  const proj = _projetos.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  const fields = ['descricao','objetivo_smart','beneficios','requisitos','premissas','restricoes',
    'entregas_macro','riscos_canvas','equipe','partes_interessadas','objetivo_estrategico',
    'custos','resultados_esperados','acoes_imediatas'];
  if(!proj.ideacao) proj.ideacao = {};
  fields.forEach(f => {
    const el = document.getElementById('canvas-'+f);
    if(el) proj.ideacao[f] = el.value;
  });
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

      <!-- Adicionar risco -->
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:8px;align-items:end;margin-bottom:.8rem">
        <div class="proj-fg" style="margin:0"><label class="proj-fl">Risco</label><input type="text" class="proj-fi" id="risco-desc" placeholder="Descrição do risco"></div>
        <div class="proj-fg" style="margin:0"><label class="proj-fl">Probabilidade</label>
          <select class="proj-fi" id="risco-prob">
            <option value="1">Muito Baixa (1)</option><option value="2">Baixa (2)</option>
            <option value="3" selected>Média (3)</option><option value="4">Alta (4)</option><option value="5">Muito Alta (5)</option>
          </select></div>
        <div class="proj-fg" style="margin:0"><label class="proj-fl">Impacto</label>
          <select class="proj-fi" id="risco-impacto">
            <option value="1">Muito Baixo (1)</option><option value="2">Baixo (2)</option>
            <option value="3" selected>Médio (3)</option><option value="4">Alto (4)</option><option value="5">Muito Alto (5)</option>
          </select></div>
        <div class="proj-fg" style="margin:0"><label class="proj-fl">Urgência</label>
          <select class="proj-fi" id="risco-urgencia">
            <option value="baixa">Baixa</option><option value="media" selected>Média</option><option value="alta">Alta</option>
          </select></div>
        <button type="button" class="proj-btn primary" style="margin-bottom:0;align-self:flex-end;padding:8px 14px" onclick="projAdicionarRisco()">+ Adicionar</button>
      </div>

      <!-- Tabela de riscos -->
      ${riscos.length > 0 ? `
        <table class="proj-risk-table" style="margin-bottom:1rem">
          <thead><tr>
            <th>#</th><th>Risco</th><th>Probabilidade</th><th>Impacto</th><th>Urgência</th><th>Criticidade</th><th>Ações</th>
          </tr></thead>
          <tbody>
            ${riscos.map((r,i) => {
              const crit = r.probabilidade * r.impacto;
              const critClass = crit >= 20 ? 'risk-critico' : crit >= 12 ? 'risk-alto' : crit >= 6 ? 'risk-medio' : 'risk-baixo';
              const critLabel = crit >= 20 ? 'Crítico' : crit >= 12 ? 'Alto' : crit >= 6 ? 'Médio' : 'Baixo';
              return `<tr>
                <td>${i+1}</td>
                <td>${projEsc(r.descricao)}</td>
                <td style="text-align:center">${r.probabilidade}</td>
                <td style="text-align:center">${r.impacto}</td>
                <td style="text-align:center">${projEsc(r.urgencia||'—')}</td>
                <td><span class="risk-heat ${critClass}">${critLabel} (${crit})</span></td>
                <td><button type="button" class="proj-btn danger" style="font-size:11px;padding:2px 7px" onclick="projExcluirRisco(${i})">✕</button></td>
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

function projGerarMapaCalor(riscos) {
  var cells = {};
  riscos.forEach(function(r) {
    var key = r.probabilidade + '-' + r.impacto;
    if(!cells[key]) cells[key] = [];
    cells[key].push(r.descricao);
  });
  function getHeatClass(p, imp) {
    var v = p * imp;
    if(v >= 20) return 'heat-5';
    if(v >= 12) return 'heat-4';
    if(v >= 6) return 'heat-3';
    if(v >= 3) return 'heat-2';
    return 'heat-1';
  }
  var html = '<div class="heat-map-grid" style="grid-template-columns:50px repeat(5,1fr)">';
  html += '<div class="heat-cell heat-label"></div>';
  for(var imp=1; imp<=5; imp++) html += '<div class="heat-cell heat-label" style="font-size:9px;background:none">Impacto '+imp+'</div>';
  for(var prob=5; prob>=1; prob--) {
    html += '<div class="heat-cell heat-label" style="font-size:9px;background:none;height:auto">Prob. '+prob+'</div>';
    for(var imp2=1; imp2<=5; imp2++) {
      var titles = cells[prob+'-'+imp2] || [];
      var cc = titles.length > 0 ? titles.map(function(t){return '<div style="font-size:8px;line-height:1.2;margin:1px 0">'+projEsc(t)+'</div>';}).join('') : '';
      html += '<div class="heat-cell '+getHeatClass(prob,imp2)+'" style="height:auto;min-height:36px;padding:3px;align-items:flex-start;flex-direction:column" title="Prob.'+prob+' x Imp.'+imp2+' = '+(prob*imp2)+'">'+cc+'</div>';
    }
  }
  html += '</div>';
  return html;
}

function projAdicionarRisco() {
  const desc = document.getElementById('risco-desc')?.value.trim();
  if(!desc) { projToast('Informe a descrição do risco.', '#d97706'); return; }
  projLoad();
  const proj = _projetos.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  if(!proj.planejamento) proj.planejamento = { eap_html:'', riscos:[], planner_link:'' };
  if(!proj.planejamento.riscos) proj.planejamento.riscos = [];
  proj.planejamento.riscos.push({
    id: Date.now(),
    descricao: desc,
    probabilidade: parseInt(document.getElementById('risco-prob')?.value)||3,
    impacto: parseInt(document.getElementById('risco-impacto')?.value)||3,
    urgencia: document.getElementById('risco-urgencia')?.value||'media'
  });
  projSave();
  projToast('Risco adicionado!');
  projDetalheTab('planejamento', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(3)'));
}

function projExcluirRisco(idx) {
  projConfirmar('Excluir este risco?', () => {
    projLoad();
    const proj = _projetos.find(p => String(p.id) === _projCurrentId);
    if(!proj) return;
    proj.planejamento.riscos.splice(idx, 1);
    projSave();
    projToast('Risco excluído.');
    projDetalheTab('planejamento', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(3)'));
  });
}

function projSalvarPlanejamento() {
  if(!projEnsureWriteAll()) return;
  projLoad();
  const proj = _projetos.find(p => String(p.id) === _projCurrentId);
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
  const proj = _projetos.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  if(!proj.planejamento) proj.planejamento = { eap_html:'', riscos:[], planner_link:'', eap_link:'', eap_mode:'html', eap_sub_mode:'texto' };
  const toggle = document.getElementById('eap-mode-toggle');
  proj.planejamento.eap_mode = toggle && toggle.checked ? 'link' : 'html';
  projSave();
  projDetalheTab('planejamento', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(3)'));
}

function projToggleEapSub() {
  projLoad();
  const proj = _projetos.find(p => String(p.id) === _projCurrentId);
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
    const proj = _projetos.find(p => String(p.id) === _projCurrentId);
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
function projTabExecucao(p) {
  const exec = p.execucao || {};
  const reunioes = exec.reunioes || [];
  const cronMode = exec.cron_mode || 'planner'; // 'planner' or 'siga'
  const pctMode = exec.pct_mode || 'manual'; // 'manual' or 'derivado'
  const tarefas = exec.tarefas || [];
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
    <div class="proj-form-section">
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
            ${atrasadas.map(t => `<div style="font-size:11px;color:#991b1b">• ${projEsc(t.nome)} (prev: ${projFormatDate(t.dt_fim)})</div>`).join('')}
          </div>
        ` : ''}
        <!-- Tabela de tarefas -->
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="background:#f0f4ff">
                <th style="padding:6px 8px;text-align:left;border-bottom:2px solid #d0d5e3;width:70px">Nº</th>
                <th style="padding:6px 4px;text-align:center;border-bottom:2px solid #d0d5e3;width:24px">✓</th>
                <th style="padding:6px 8px;text-align:left;border-bottom:2px solid #d0d5e3">Nome</th>
                <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #d0d5e3;width:68px">PPE</th>
                <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #d0d5e3;width:78px">Marco</th>
                <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #d0d5e3;width:100px">Início</th>
                <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #d0d5e3;width:100px">Fim Prev.</th>
                <th style="padding:6px 8px;text-align:left;border-bottom:2px solid #d0d5e3;width:120px">Responsável</th>
                <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #d0d5e3;width:70px">%</th>
                <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #d0d5e3;width:40px">Sub</th>
                <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #d0d5e3;width:30px"></th>
              </tr>
            </thead>
            <tbody id="exec-tarefas-body">
              ${projRenderTarefasRows(tarefas, 0)}
            </tbody>
          </table>
        </div>
        <div style="margin-top:.6rem;display:flex;gap:8px">
          <button type="button" class="proj-btn primary" style="font-size:11px;padding:5px 12px" onclick="projAddTarefa(null)">+ Tarefa</button>
          <button type="button" class="proj-btn" style="font-size:11px;padding:5px 12px" onclick="projExportCronogramaXLSX()">Exportar .xlsx</button>
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
function projFlattenTasks(tarefas, depth) {
  let result = [];
  (tarefas||[]).forEach(t => {
    const copy = Object.assign({}, t, {_depth: depth||0, _children: t.subtarefas||[]});
    result.push(copy);
    if(t.subtarefas && t.subtarefas.length > 0) {
      result = result.concat(projFlattenTasks(t.subtarefas, (depth||0)+1));
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

function projCalcDerivedPct(tarefas) {
  if(!tarefas || tarefas.length === 0) return 0;
  const sum = tarefas.reduce((a,t) => a + projCalcTaskPct(t), 0);
  return Math.round(sum / tarefas.length);
}

function projRenderTarefasRows(tarefas, depth, parentIdx) {
  if(!tarefas) return '';
  let html = '';
  tarefas.forEach((t, i) => {
    const path = parentIdx !== undefined && parentIdx !== null ? parentIdx+'.'+i : ''+i;
    const hasSubs = t.subtarefas && t.subtarefas.length > 0;
    const pct = hasSubs ? projCalcTaskPct(t) : (t.conclusao||0);
    const indent = depth * 20;
    const bold = hasSubs ? 'font-weight:700' : '';
    const strike = t.concluida ? 'text-decoration:line-through;color:#9ca3af' : '';
    const today = new Date().toISOString().slice(0,10);
    const overdue = !t.concluida && t.dt_fim && t.dt_fim < today;
    const rowBg = overdue ? 'background:#fef2f2' : (t.concluida ? 'background:#f0fdf4' : '');
    html += `<tr style="${rowBg}">
      <td style="padding:5px 8px;border-bottom:1px solid #eaecf3;${strike};font-family:'DM Mono',monospace;font-size:11px;white-space:nowrap">${path.split('.').map(n=>parseInt(n,10)+1).join('.')}.</td>
      <td style="padding:5px 4px;text-align:center;border-bottom:1px solid #eaecf3">
        ${!hasSubs ? `<input type="checkbox" ${t.concluida?'checked':''} onchange="projToggleTarefa('${path}')">` : ''}
      </td>
      <td style="padding:5px 8px;border-bottom:1px solid #eaecf3;padding-left:${8+indent}px;${bold};${strike}">
        <input type="text" class="proj-task-name-input" value="${projEsc(t.nome||'Nova tarefa')}" placeholder="Nova tarefa" aria-label="Nome da tarefa" onchange="projUpdateTarefa('${path}','nome',this.value.trim()||'Nova tarefa')" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">
      </td>
      <td style="padding:5px 8px;text-align:center;border-bottom:1px solid #eaecf3">
        <button type="button" class="proj-task-flag ppe ${t.ppe?'on':''}" onclick="projToggleTarefaFlag('${path}','ppe')">PPE</button>
      </td>
      <td style="padding:5px 8px;text-align:center;border-bottom:1px solid #eaecf3">
        <button type="button" class="proj-task-flag marco ${t.marco?'on':''}" onclick="projToggleTarefaFlag('${path}','marco')">Marco</button>
      </td>
      <td style="padding:5px 8px;text-align:center;border-bottom:1px solid #eaecf3;${strike}"><input type="date" value="${t.dt_inicio||''}" onchange="projUpdateTarefa('${path}','dt_inicio',this.value)" style="font-size:11px;border:1px solid #ddd;border-radius:4px;padding:2px 4px;width:100%"></td>
      <td style="padding:5px 8px;text-align:center;border-bottom:1px solid #eaecf3;${strike}${overdue?';color:#dc2626;font-weight:600':''}"><input type="date" value="${t.dt_fim||''}" onchange="projUpdateTarefa('${path}','dt_fim',this.value)" style="font-size:11px;border:1px solid ${overdue?'#fca5a5':'#ddd'};border-radius:4px;padding:2px 4px;width:100%"></td>
      <td style="padding:5px 8px;border-bottom:1px solid #eaecf3;${strike}"><input type="text" value="${projEsc(t.responsavel||'')}" onchange="projUpdateTarefa('${path}','responsavel',this.value)" style="font-size:11px;border:1px solid #ddd;border-radius:4px;padding:2px 4px;width:100%" placeholder="—"></td>
      <td style="padding:5px 8px;text-align:center;border-bottom:1px solid #eaecf3;${strike}">
        ${hasSubs ? `<span style="font-size:11px;font-weight:600;color:var(--blue)">${pct}%</span>` :
          `<input type="number" min="0" max="100" value="${pct}" onchange="projUpdateTarefa('${path}','conclusao',parseInt(this.value)||0)" style="font-size:11px;border:1px solid #ddd;border-radius:4px;padding:2px 4px;width:50px;text-align:center">`}
      </td>
      <td style="padding:5px 4px;text-align:center;border-bottom:1px solid #eaecf3">
        <button type="button" title="Adicionar subtarefa" style="background:none;border:none;cursor:pointer;font-size:13px;padding:0" onclick="projAddTarefa('${path}')">＋</button>
      </td>
      <td style="padding:5px 4px;text-align:center;border-bottom:1px solid #eaecf3">
        <button type="button" title="Excluir" style="background:none;border:none;cursor:pointer;font-size:13px;color:#dc2626;padding:0" onclick="projRemoveTarefa('${path}')">✕</button>
      </td>
    </tr>`;
    if(hasSubs) {
      html += projRenderTarefasRows(t.subtarefas, depth+1, path);
    }
  });
  return html;
}

// ── Planner SIGA: CRUD ──
function projGetTarefaByPath(tarefas, path) {
  const parts = path.split('.').map(Number);
  let list = tarefas;
  for(let i=0;i<parts.length-1;i++){
    if(!list[parts[i]]) return null;
    list = list[parts[i]].subtarefas || [];
  }
  return {list, index: parts[parts.length-1]};
}

function projAddTarefa(parentPath) {
  projLoad();
  const proj = _projetos.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  if(!proj.execucao) proj.execucao = {planner_link:'',percentual:0,reunioes:[],tarefas:[]};
  if(!proj.execucao.tarefas) proj.execucao.tarefas = [];
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
  projSave();
  projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
}

function projRemoveTarefa(path) {
  projLoad();
  const proj = _projetos.find(p => String(p.id) === _projCurrentId);
  if(!proj || !proj.execucao || !proj.execucao.tarefas) return;
  const ref = projGetTarefaByPath(proj.execucao.tarefas, path);
  if(ref) ref.list.splice(ref.index, 1);
  projSave();
  projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
}

function projUpdateTarefa(path, field, value) {
  projLoad();
  const proj = _projetos.find(p => String(p.id) === _projCurrentId);
  if(!proj || !proj.execucao || !proj.execucao.tarefas) return;
  const ref = projGetTarefaByPath(proj.execucao.tarefas, path);
  if(ref && ref.list[ref.index]) {
    ref.list[ref.index][field] = value;
    if(field === 'conclusao' && value >= 100) ref.list[ref.index].concluida = true;
    if(field === 'conclusao' && value < 100) ref.list[ref.index].concluida = false;
  }
  // Update derived pct
  if(proj.execucao.pct_mode === 'derivado') {
    proj.percentual = projCalcDerivedPct(proj.execucao.tarefas);
    proj.execucao.percentual = proj.percentual;
  }
  projSave();
  projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
}

function projToggleTarefaFlag(path, field) {
  projLoad();
  const proj = _projetos.find(p => String(p.id) === _projCurrentId);
  if(!proj || !proj.execucao || !proj.execucao.tarefas) return;
  const ref = projGetTarefaByPath(proj.execucao.tarefas, path);
  if(ref && ref.list[ref.index]) {
    ref.list[ref.index][field] = !ref.list[ref.index][field];
  }
  projSave();
  projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
}

function projToggleTarefa(path) {
  projLoad();
  const proj = _projetos.find(p => String(p.id) === _projCurrentId);
  if(!proj || !proj.execucao || !proj.execucao.tarefas) return;
  const ref = projGetTarefaByPath(proj.execucao.tarefas, path);
  if(ref && ref.list[ref.index]) {
    ref.list[ref.index].concluida = !ref.list[ref.index].concluida;
    ref.list[ref.index].conclusao = ref.list[ref.index].concluida ? 100 : 0;
  }
  if(proj.execucao.pct_mode === 'derivado') {
    proj.percentual = projCalcDerivedPct(proj.execucao.tarefas);
    proj.execucao.percentual = proj.percentual;
  }
  projSave();
  projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
}

// ── Toggle cron mode / pct mode ──
function projToggleCronMode() {
  projLoad();
  const proj = _projetos.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  if(!proj.execucao) proj.execucao = {planner_link:'',percentual:0,reunioes:[],tarefas:[]};
  const toggle = document.getElementById('exec-cron-toggle');
  proj.execucao.cron_mode = toggle && toggle.checked ? 'siga' : 'planner';
  projSave();
  projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
}

function projTogglePctMode() {
  projLoad();
  const proj = _projetos.find(p => String(p.id) === _projCurrentId);
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
}

function projSalvarExecucao() {
  if(!projEnsureWriteExec()) return;
  projLoad();
  const proj = _projetos.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  if(!proj.execucao) proj.execucao = { planner_link:'', percentual:0, reunioes:[], tarefas:[], cron_mode:'planner', pct_mode:'manual' };
  proj.execucao.planner_link = document.getElementById('exec-planner')?.value || proj.execucao.planner_link || '';
  if(proj.execucao.pct_mode !== 'derivado') {
    proj.percentual = parseInt(document.getElementById('exec-percentual')?.value)||0;
  } else {
    proj.percentual = projCalcDerivedPct(proj.execucao.tarefas||[]);
  }
  proj.execucao.percentual = proj.percentual;
  projSave();
  projToast('Execução salva!');
}

function projAdicionarReuniao() {
  const nome = document.getElementById('reuniao-nome')?.value.trim();
  if(!nome) { projToast('Informe o nome da reunião.', '#d97706'); return; }
  projLoad();
  const proj = _projetos.find(p => String(p.id) === _projCurrentId);
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
  projLoad();
  const proj = _projetos.find(p => String(p.id) === _projCurrentId);
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
  projConfirmar('Excluir esta reunião?', () => {
    projLoad();
    const proj = _projetos.find(p => String(p.id) === _projCurrentId);
    if(!proj) return;
    proj.execucao.reunioes = (proj.execucao.reunioes||[]).filter(r => String(r.id) !== String(reuniaoId));
    projSave();
    projToast('Reunião excluída.');
    projAtualizarBadgeReunioes();
    projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
  });
}

function projAutoAddReunioesMes(){projLoad();var proj=_projetos.find(function(p){return String(p.id)===_projCurrentId;});if(!proj)return;if(!proj.execucao)proj.execucao={planner_link:'',percentual:0,reunioes:[]};if(!proj.execucao.reunioes)proj.execucao.reunioes=[];var now=new Date();var dataStatus=projMonthFirstDay(now);var mn=projMonthLabel(projMonthValue(now));var nome='Reunião de Status Patrocinador - '+mn;var ja=proj.execucao.reunioes.some(function(r){return r.nome===nome||(r.auto&&r.data===dataStatus);});if(ja){projToast('Reunião deste mês já existe.','#d97706');return;}proj.execucao.reunioes.push({id:'r'+Date.now(),nome:nome,data:dataStatus,participantes:'',observacoes:'Reunião mensal de acompanhamento com o patrocinador',realizada:false,auto:true});projSave();projToast('Reunião de Status adicionada!');projAtualizarBadgeReunioes();projDetalheTab('execucao',document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));}
function projDeduplicarReunioes(){projLoad();var proj=_projetos.find(function(p){return String(p.id)===_projCurrentId;});if(!proj||!proj.execucao||!proj.execucao.reunioes)return;var seen={};var orig=proj.execucao.reunioes.length;proj.execucao.reunioes=proj.execucao.reunioes.filter(function(r){var k=r.nome+'|'+(r.data||'');if(seen[k])return false;seen[k]=true;return true;});var rem=orig-proj.execucao.reunioes.length;projSave();if(rem>0){projToast(rem+' duplicada(s) removida(s).');projDetalheTab('execucao',document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));}else{projToast('Nenhuma duplicata encontrada.');}}

// ── ABA: CONCLUSÃO ───────────────────────────────────────────────
function projTabConclusao(p) {
  const conc = p.conclusao || {};
  const selectedSuccess = conc.tipo === 'sucesso';
  const selectedCancel = conc.tipo === 'cancelamento';

  return `
    <div class="proj-form-section">
      <div class="proj-form-section-title">
        <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M3 8l4 4 7-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Fase 5: Conclusão
      </div>
      <div class="proj-ib proj-ib-blue">
        Registre aqui o encerramento oficial do projeto. O tipo de conclusão, link para o Termo de Aceite, e informações narrativas sobre o projeto.
      </div>
      <div class="proj-fg">
        <label class="proj-fl">Tipo de Conclusão<span>*</span></label>
        <div class="proj-conclusao-tipo">
          <div class="proj-conclusao-card ${selectedSuccess?'selected-success':''}" onclick="projSelecionarTipoConclusao('sucesso')">
            <div class="proj-conclusao-icon">✅</div>
            <div class="proj-conclusao-label">Conclusão com Sucesso</div>
            <div class="proj-conclusao-desc">Projeto entregue conforme planejado</div>
          </div>
          <div class="proj-conclusao-card ${selectedCancel?'selected-cancel':''}" onclick="projSelecionarTipoConclusao('cancelamento')">
            <div class="proj-conclusao-icon">🚫</div>
            <div class="proj-conclusao-label">Cancelamento</div>
            <div class="proj-conclusao-desc">Projeto encerrado sem conclusão das entregas</div>
          </div>
        </div>
      </div>
      <div class="proj-g2">
        <div class="proj-fg">
          <label class="proj-fl">Data de Conclusão/Cancelamento</label>
          <input type="date" class="proj-fi" id="conc-data" value="${projEsc(conc.dt_conclusao||'')}">
        </div>
        <div class="proj-fg">
          <label class="proj-fl">Link para o Termo de Aceite</label>
          <input type="url" class="proj-fi" id="conc-termo" value="${projEsc(conc.link_termo_aceite||'')}" placeholder="https://...">
        </div>
      </div>
      <div class="proj-fg">
        <label class="proj-fl">História do Projeto <span style="font-size:10px;color:var(--ink3)">(opcional — conte como foi o projeto)</span></label>
        <textarea class="proj-fi" id="conc-historia" rows="5" placeholder="Conte a história e trajetória do projeto, principais marcos, aprendizados...">${projEsc(conc.historia||'')}</textarea>
      </div>
      <div class="proj-fg">
        <label class="proj-fl">Links de Notícias / Resultados <span style="font-size:10px;color:var(--ink3)">(opcional — um por linha)</span></label>
        <textarea class="proj-fi" id="conc-links" rows="3" placeholder="https://noticia1.gov.br&#10;https://noticia2.gov.br">${projEsc(conc.links_noticias||'')}</textarea>
      </div>
      <div class="proj-form-section" style="background:#f8fbff;margin-top:1rem">
        <div class="proj-form-section-title">Reunião de Lições Aprendidas</div>
        <div class="proj-g2">
          <div class="proj-fg">
            <label class="proj-fl">Data da reunião</label>
            <input type="date" class="proj-fi" id="conc-lic-data" value="${projEsc(conc.licoes_data||'')}">
          </div>
          <div class="proj-fg">
            <label class="proj-fl">Participantes</label>
            <input type="text" class="proj-fi" id="conc-lic-part" value="${projEsc(conc.licoes_participantes||'')}" placeholder="Nomes dos participantes">
          </div>
        </div>
        <div class="proj-g3">
          <div class="proj-fg">
            <label class="proj-fl">O que deu certo?</label>
            <textarea class="proj-fi" id="conc-lic-certo" rows="4">${projEsc(conc.licoes_certo||'')}</textarea>
          </div>
          <div class="proj-fg">
            <label class="proj-fl">O que pode melhorar?</label>
            <textarea class="proj-fi" id="conc-lic-melhorar" rows="4">${projEsc(conc.licoes_melhorar||'')}</textarea>
          </div>
          <div class="proj-fg">
            <label class="proj-fl">Sugestões / ideias</label>
            <textarea class="proj-fi" id="conc-lic-ideias" rows="4">${projEsc(conc.licoes_ideias||'')}</textarea>
          </div>
        </div>
        <div class="proj-fg">
          <label class="proj-fl">Anexo de imagens</label>
          <input type="file" class="proj-fi" accept="image/*" multiple onchange="projUploadConclusaoImagens(this)">
          ${(conc.imagens||[]).length ? `<div class="proj-v9-attach-grid">${(conc.imagens||[]).map((img,i)=>`<div><img src="${projEsc(img.data)}" alt="${projEsc(img.nome||'Imagem')}"><button type="button" class="proj-btn danger" style="font-size:10px;padding:2px 6px;margin-top:3px;width:100%" onclick="projRemoveConclusaoImagem(${i})">Remover</button></div>`).join('')}</div>` : '<div style="font-size:11px;color:var(--ink3);margin-top:4px">Nenhuma imagem anexada.</div>'}
        </div>
      </div>
      <div class="proj-btn-row">
        <button type="button" class="proj-btn teal" onclick="projSalvarConclusao()">💾 Salvar</button>
        ${p.status !== 'concluido' && p.status !== 'cancelado' ? `
          <button type="button" class="proj-btn primary" onclick="projFinalizarProjeto()">🏁 Encerrar Projeto</button>
        ` : `<div style="font-size:12.5px;color:var(--teal);font-weight:600;align-self:center">✓ Projeto encerrado</div>`}
      </div>
    </div>
  `;
}

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
  const proj = _projetos.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  if(!proj.conclusao) proj.conclusao = {};
  proj.conclusao.tipo = _tipoConclusaoSelecionado || proj.conclusao.tipo || '';
  proj.conclusao.dt_conclusao = document.getElementById('conc-data')?.value||'';
  proj.conclusao.link_termo_aceite = document.getElementById('conc-termo')?.value||'';
  proj.conclusao.historia = document.getElementById('conc-historia')?.value||'';
  proj.conclusao.links_noticias = document.getElementById('conc-links')?.value||'';
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
    const proj = _projetos.find(p => String(p.id) === _projCurrentId);
    if(!proj) return;
    proj.status = tipo === 'sucesso' ? 'concluido' : 'cancelado';
    proj.fase_atual = 'conclusao';
    projSave();
    projToast('Projeto encerrado!', 'var(--teal)');
    projAbrirDetalhe(_projCurrentId, false);
  });
}

// ── AVANÇAR FASE ──────────────────────────────────────────────────
function projAvancarFase(id) {
  projLoad();
  const proj = _projetos.find(p => String(p.id) === String(id));
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
  var proj = _projetos.find(function(p){return String(p.id)===String(id);});
  if(!proj) return;
  var idx = FASE_IDX[proj.fase_atual] || 0;
  if(idx <= 0) { projToast('Já está na primeira fase.','#d97706'); return; }
  var faseAnterior = PROJ_FASES[idx - 1];
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
    const proj = _projetos.find(p => String(p.id) === String(id));
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

  if(_programas.length === 0) {
    el.innerHTML = `
      <div style="text-align:center;padding:3rem;color:#b0b8cc">
        <div style="font-size:40px;margin-bottom:12px">📂</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:6px">Nenhum programa cadastrado</div>
        <div style="font-size:13px;margin-bottom:1rem">Programas agrupam projetos relacionados sob uma mesma estratégia.</div>
        <button type="button" class="proj-btn primary" onclick="progAbrirModalNovo()">+ Criar primeiro programa</button>
      </div>`;
    return;
  }

  const ativos     = _programas.filter(pg => pg.status === 'ativo');
  const concluidos = _programas.filter(pg => pg.status === 'concluido');
  const cancelados = _programas.filter(pg => pg.status === 'cancelado');

  const renderProg = (pg) => {
    const projs = _projetos.filter(p => String(p.programa_id) === String(pg.id));
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

  el.innerHTML = renderGrp('Programas Ativos', ativos) + renderGrp('Programas Concluídos', concluidos) + renderGrp('Programas Cancelados', cancelados);
}

function progAbrirModalNovo() {
  _progModal({ id: null, nome: '', descricao: '', gerente: '', patrocinador: '', status: 'ativo' }, 'Novo Programa');
}

function progAbrirModalEditar(id) {
  progLoad();
  const pg = _programas.find(p => String(p.id) === String(id));
  if(!pg) return;
  _progModal(pg, 'Editar Programa');
}

function _progModal(pg, titulo) {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;overflow-y:auto';
  modal.innerHTML = `
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
  `;
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
    const pg = _programas.find(p => String(p.id) === String(idRaw));
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
    _programas.push(novo);
    progSave();
    projToast('Programa "' + nome + '" criado!');
  }

  btn.closest('[style*=fixed]').remove();
  progRenderPage();
}

function progExcluir(id) {
  if(!projEnsureWriteAll('Apenas EPP pode excluir programas.')) return;
  progLoad();
  const pg = _programas.find(p => String(p.id) === String(id));
  if(!pg) return;
  const projsVinc = _projetos.filter(p => String(p.programa_id) === String(id));
  const msg = projsVinc.length > 0
    ? `Excluir o programa "${pg.nome}"?\n\nAtenção: ${projsVinc.length} projeto(s) deste programa ficarão sem programa vinculado (os projetos NÃO serão excluídos).`
    : `Excluir o programa "${pg.nome}"?`;
  projConfirmar(msg, () => {
    // Desvincular projetos
    projLoad();
    _projetos.forEach(p => {
      if(String(p.programa_id) === String(id)) p.programa_id = null;
    });
    projSave();
    // Remover programa
    _programas = _programas.filter(p => String(p.id) !== String(id));
    progSave();
    projToast('Programa excluído.');
    progRenderPage();
  });
}

function progAbrirDetalhe(id) {
  progLoad();
  const pg = _programas.find(p => String(p.id) === String(id));
  if(!pg) return;
  const projs = _projetos.filter(p => String(p.programa_id) === String(id));
  const pct = progPercentualMedio(id);

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;overflow-y:auto';
  modal.innerHTML = `
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
  `;
  document.body.appendChild(modal);
}

// ════════════════════════════════════════════════════════════════════
// CARREGAR DADOS INICIAIS (PORTFÓLIO CAGE DO STATUS REPORT MAR/26)
// ════════════════════════════════════════════════════════════════════
function projCarregarDemoSeVazio() {
  projLoad();
  if(_projetos.length > 0 || _programas.length > 0) return;
  try {
    var data = JSON.parse('{"projetos":[{"id":1000101,"nome":"Seccional de Obras","gerente":"Elizandro Moch","gerente_substituto":"Leonardo Cecconello","descricao":"Desenvolvimento de controles baseados em riscos para gestão e fiscalização de contratos de obras no DAER-FUNRIGS.","dt_inicio":"","dt_fim":"","patrocinador":"Jociê Pereira","fonte":"Gestão","fase_atual":"execucao","status":"ativo","percentual":65,"icone_url":"","icone_emoji":"🏗️","dt_criacao":"2026-04-22","programa_id":2000001,"aprovacao":{"motivo_inicio":"","aprovado":false,"deliberacao":"","dt_aprovacao":"","obs":""},"ideacao":{"descricao":"","objetivo_smart":"","beneficios":"","requisitos":"","premissas":"","restricoes":"","entregas_macro":"","riscos_canvas":"","equipe":"","partes_interessadas":"","objetivo_estrategico":"","custos":"","resultados_esperados":"","acoes_imediatas":""},"planejamento":{"eap_html":"","riscos":[],"planner_link":""},"execucao":{"planner_link":"","percentual":65,"reunioes":[]},"conclusao":{"tipo":"","dt_conclusao":"","link_termo_aceite":"","historia":"","links_noticias":""}},{"id":1000102,"nome":"Seccional de Transferências Voluntárias","gerente":"Patricia Leão","gerente_substituto":"Eneias Eler","descricao":"Refinamento do painel de riscos, análise amostral, definição de protocolos de análise e evoluções sistêmicas para convênios.","dt_inicio":"","dt_fim":"","patrocinador":"Jociê Pereira","fonte":"Gestão","fase_atual":"execucao","status":"ativo","percentual":60,"icone_url":"","icone_emoji":"🔍","dt_criacao":"2026-04-22","programa_id":2000001,"aprovacao":{"motivo_inicio":"","aprovado":false,"deliberacao":"","dt_aprovacao":"","obs":""},"ideacao":{"descricao":"","objetivo_smart":"","beneficios":"","requisitos":"","premissas":"","restricoes":"","entregas_macro":"","riscos_canvas":"","equipe":"","partes_interessadas":"","objetivo_estrategico":"","custos":"","resultados_esperados":"","acoes_imediatas":""},"planejamento":{"eap_html":"","riscos":[],"planner_link":""},"execucao":{"planner_link":"","percentual":60,"reunioes":[]},"conclusao":{"tipo":"","dt_conclusao":"","link_termo_aceite":"","historia":"","links_noticias":""}},{"id":1000103,"nome":"AIRA - Arquitetura Inteligente de Redes de Agentes","gerente":"Jimmy Paiva Gomes","gerente_substituto":"","descricao":"Aperfeiçoar o processo de controle da execução da despesa com base em riscos, com o uso de agentes de IA.","dt_inicio":"2025-01-15","dt_fim":"2027-12-31","patrocinador":"Jociê Pereira","fonte":"Gestão","fase_atual":"execucao","status":"ativo","percentual":0,"icone_url":"","icone_emoji":"🤖","dt_criacao":"2025-01-15","programa_id":2000001,"aprovacao":{"motivo_inicio":"Aperfeiçoar o processo de controle da execução da despesa com base em riscos, com o uso de agentes de IA, ampliando a eficiência operacional e o controle baseado em dados.","aprovado":true,"deliberacao":"","dt_aprovacao":"","obs":"Aprovado em reunião ordinária do CGP."},"ideacao":{"descricao":"Aperfeiçoar o processo de controle da execução da despesa com base em riscos, com o uso de agentes de IA.","objetivo_smart":"XX% das solicitações de liquidação de despesa atendidas com uso de IA até 31/12/2027.","beneficios":"Eficiência no controle da despesa pública; Escalabilidade, rastreabilidade e auditabilidade da atividade de controle; Melhor mensuração dos custos do controle; Aumento da produtividade.","requisitos":"Uma única interface para o usuário; Integração com os demais sistemas do Estado; Autonomia sem intervenção humana.","premissas":"Disponibilidade de recursos do Profisco III para o projeto; Haverá possibilidade de integração com o SEI.","restricoes":"Atuação inicialmente limitada ao controle do Poder Executivo; Apenas na liquidação da despesa; Em processos SEI.","entregas_macro":"Elaboração de protocolos por tipo de objeto; Padronização de documentos de liquidação da despesa no SEI; Proposta de reorganização do processo de trabalho da área de Controle.","riscos_canvas":"Dependência de partes externas para integração do sistema; Atrasos no andamento do Profisco III; Risco de impactos negativos na qualidade e risco de imagem.","equipe":"Jimmy, Robson, Jonas, Marcus Pizzato, Felipe Thiesen, Michel.","partes_interessadas":"SPGG (SEI), PROCERGS (FPE), servidores das seccionais da CAGE e servidores do Estado que atuam em processos de liquidação.","objetivo_estrategico":"Otimizar os processos de trabalho, com foco na melhoria da eficiência operacional e automação; Desenvolver modelo de controle baseado em riscos e orientado pela utilização de dados.","custos":"Disponibilidade de pessoal para o desenvolvimento; Infraestrutura tecnológica.","resultados_esperados":"Redução do tempo médio de atendimento das solicitações de liquidação pela CAGE; Reorganização da estrutura da CAGE.","acoes_imediatas":"Pilotos nas áreas de negócio envolvidas; Disseminação do projeto para consolidação.","canvas_mode":"manual"},"planejamento":{"eap_html":"<!DOCTYPE html>\\n<!-- saved from url=(0052)file:///C:/Users/ewwoy/Downloads/EAP_AIRA%20(3).html -->\\n<html lang=\\"pt-BR\\"><head><meta http-equiv=\\"Content-Type\\" content=\\"text/html; charset=UTF-8\\">\\n\\n<meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1.0\\">\\n<title>EAP - AIRA</title>\\n<link href=\\"./1. EAP - AIRA_files/css2\\" rel=\\"stylesheet\\">\\n<style>\\n  * { margin: 0; padding: 0; box-sizing: border-box; }\\n\\n  body {\\n    font-family: \'DM Sans\', sans-serif;\\n    background: #f4f6f9;\\n    color: #111;\\n    padding: 32px 24px 48px;\\n    min-width: 1100px;\\n  }\\n\\n  .header {\\n    background: #fff;\\n    border-radius: 12px;\\n    padding: 20px 32px;\\n    margin-bottom: 32px;\\n    display: flex;\\n    align-items: center;\\n    justify-content: space-between;\\n    box-shadow: 0 2px 12px rgba(0,0,0,0.07);\\n    border-bottom: 3px solid #0B5EA8;\\n  }\\n\\n  .logos {\\n    display: flex;\\n    align-items: center;\\n    gap: 24px;\\n  }\\n\\n  .logos img.logo-cage {\\n    height: 56px;\\n    object-fit: contain;\\n  }\\n\\n  .logos img.logo-epp {\\n    height: 28px;\\n    object-fit: contain;\\n  }\\n\\n  .header-title {\\n    text-align: center;\\n    flex: 1;\\n  }\\n\\n  .header-title h1 {\\n    font-size: 1.35rem;\\n    font-weight: 700;\\n    color: #0B5EA8;\\n    letter-spacing: 0.01em;\\n    line-height: 1.3;\\n  }\\n\\n  .header-title p {\\n    font-size: 0.82rem;\\n    color: #555;\\n    margin-top: 4px;\\n    font-weight: 400;\\n    letter-spacing: 0.04em;\\n    text-transform: uppercase;\\n  }\\n\\n  .tree {\\n    display: flex;\\n    flex-direction: column;\\n    align-items: center;\\n  }\\n\\n  .root-node {\\n    background: #0B5EA8;\\n    color: #fff;\\n    padding: 12px 40px;\\n    border-radius: 8px;\\n    font-size: 0.95rem;\\n    font-weight: 700;\\n    letter-spacing: 0.03em;\\n    text-align: center;\\n    box-shadow: 0 4px 16px rgba(11,94,168,0.25);\\n    position: relative;\\n    z-index: 2;\\n  }\\n\\n  .connector-root {\\n    width: 2px;\\n    height: 28px;\\n    background: #0B5EA8;\\n    margin: 0 auto;\\n  }\\n\\n  .columns-wrapper {\\n    width: 100%;\\n    position: relative;\\n  }\\n\\n  .h-bar {\\n    position: absolute;\\n    top: 0;\\n    left: 0;\\n    right: 0;\\n    height: 2px;\\n    background: #0B5EA8;\\n  }\\n\\n  .columns {\\n    display: flex;\\n    width: 100%;\\n    gap: 10px;\\n    align-items: flex-start;\\n  }\\n\\n  .column {\\n    flex: 1;\\n    display: flex;\\n    flex-direction: column;\\n    align-items: center;\\n  }\\n\\n  .connector-down {\\n    width: 2px;\\n    height: 28px;\\n    background: #0B5EA8;\\n  }\\n\\n  .macro-node {\\n    width: 100%;\\n    padding: 9px 8px;\\n    border-radius: 7px;\\n    font-size: 0.78rem;\\n    font-weight: 700;\\n    text-align: center;\\n    color: #000;\\n    line-height: 1.35;\\n    box-shadow: 0 2px 8px rgba(0,0,0,0.10);\\n    cursor: default;\\n    transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;\\n  }\\n\\n  .macro-node:hover {\\n    transform: translateY(-2px) scale(1.02);\\n    box-shadow: 0 6px 16px rgba(11,94,168,0.22);\\n    filter: brightness(0.94);\\n  }\\n\\n  .connector-sub {\\n    width: 2px;\\n    height: 18px;\\n    background: #0B5EA8;\\n  }\\n\\n  .sub-items {\\n    display: flex;\\n    flex-direction: column;\\n    gap: 6px;\\n    width: 100%;\\n  }\\n\\n  .sub-item {\\n    width: 100%;\\n    padding: 7px 8px;\\n    border-radius: 6px;\\n    font-size: 0.70rem;\\n    font-weight: 400;\\n    text-align: center;\\n    color: #000;\\n    line-height: 1.35;\\n    box-shadow: 0 1px 4px rgba(0,0,0,0.08);\\n    cursor: default;\\n    transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;\\n  }\\n\\n  .sub-item:hover {\\n    transform: translateX(3px);\\n    box-shadow: 0 3px 10px rgba(11,94,168,0.18);\\n    filter: brightness(0.93);\\n  }\\n\\n  /* Blues: mais claro na col-1, progressivamente mais saturado até col-5 */\\n  .col-1 .macro-node { background: #E8F3FA; }\\n  .col-1 .sub-item   { background: #EEF6FB; }\\n\\n  .col-2 .macro-node { background: #D8EBF7; }\\n  .col-2 .sub-item   { background: #E4F0F9; }\\n\\n  .col-3 .macro-node { background: #C8DFF4; }\\n  .col-3 .sub-item   { background: #D8EAF6; }\\n\\n  .col-4 .macro-node { background: #B8D4EE; }\\n  .col-4 .sub-item   { background: #CCDFF2; }\\n\\n  .col-5 .macro-node { background: #A8C8E8; }\\n  .col-5 .sub-item   { background: #C4D9EE; }\\n</style>\\n</head>\\n<body>\\n\\n<div class=\\"header\\">\\n  <div class=\\"logos\\">\\n    <img src=\\"data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAHCAyADASIAAhEBAxEB/8QAHQABAAIDAQEBAQAAAAAAAAAAAAEIBQYHBAMCCf/EAFwQAAEDAgIEBggQCAwFBQEAAAABAgMEBQYRBxIhMQgTQVFhgRQVIjJxkaGxFhcjN0JSVWJ0kpOUssHR0jZUVnJzorPCJCUmMzVDZnWCpOLwRlNjZIQYRJXD4TT/xAAcAQEAAQUBAQAAAAAAAAAAAAAABgIDBAUHAQj/xABCEQACAQIDAwcIBwgDAQEBAAAAAQIDBAURIRIxQQZRcYGhsdETFBYiNFJhkQcVMjNywfAXIzVCU5Ki4SRU4mLxQ//aAAwDAQACEQMRAD8AuWAAAAQASQCQAQSQACQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAABABIAAAAAAAAAAAAAAAAAAIJAABABJBIAAAAAAABCkgAAEAEgAAAgAEkAAAkAAAAAAAAgkgkAAgkAAAAAAAAAAAgkAAAAAAAAAAAAAAAAAAAAAAAAAAEAEgAAAAAAAAAAAAgkAAAAAAAAgkAAgkAAEZAE5AgAEggZAEgEAEggkAAAAAAAAAAAAAAAAAAAAAAgkAAEEgAAAAgkAAAAAEAAEkEgAEEgAAgkAEEgAAAAAEAEggkAAAAgkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgkAAAAgkAAAAAEEgAAAAEEgAAAAAAAgkAAAAAEEgAAAAAAAAAAAEAEkEgAAAAAAAgkAAAEAEggkAAEAEgAAAAAAAAAgkAAAAAAAAAAgkAAgEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgkAAAAAAAAAAAAAAAAAgkAAAAAAAAAAAAAAAAAAAAEEgAAAAAAAAAAgkAAAEAEgAAEEgAAEAAkgkAAEAEgEAEgAAAAAAAAAgkAgkAAAgkAAAAAgkAAAAAgkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAEgAAAAAAAAAAAAAAAAAAAAAAAAEAEgEAEgAAAAAAAAAgkAAAAAgkAAgkAAAAAAAAAAAAAAAAAEAEggkAAEAEgAAAAAAgkAAAAAAAAAAAAAAAAAAAAAAAAAAgkAAgkAAAAAEAEggAEggkAAAAAAAAEAEgAAAgkAAgkAAAAAgkAAEAEgEAEggkAAAAAAAAAAAAAAAAAEAEgEAEgAAAgkAAAAAAAAgkAEEgAAAAEEgAEEgAAgkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADkAAIJIJAAAABBIABBJABJBIAIJIJAIBIAAAAAIJAAAAIJAAIAJAABABIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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\\" alt=\\"CAGE\\" class=\\"logo-cage\\">\\n    <img src=\\"data:image/png;base64,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\\" alt=\\"Escritório de Projetos e Processos\\" class=\\"logo-epp\\">\\n  </div>\\n  <div class=\\"header-title\\">\\n    <h1>Estrutura Analítica do Projeto (EAP)</h1>\\n    <p>AIRA</p>\\n  </div>\\n  <div style=\\"width:220px\\"></div>\\n</div>\\n\\n<div class=\\"tree\\">\\n\\n  <div class=\\"root-node\\">AIRA</div>\\n  <div class=\\"connector-root\\"></div>\\n\\n  <div class=\\"columns-wrapper\\">\\n    <div class=\\"h-bar\\"></div>\\n    <div class=\\"columns\\">\\n\\n      <!-- COL 1: Diagnóstico e Modelagem — 5 itens -->\\n      <div class=\\"column col-1\\">\\n        <div class=\\"connector-down\\"></div>\\n        <div class=\\"macro-node\\">Diagnóstico e<br>Modelagem</div>\\n        <div class=\\"connector-sub\\"></div>\\n        <div class=\\"sub-items\\">\\n          <div class=\\"sub-item\\">Taxonomia dos Tipos de Processos Administrativos e Controles</div>\\n          <div class=\\"sub-item\\">Redesenho de Processos de Trabalho</div>\\n          <div class=\\"sub-item\\">Desenho de Processo de Monitoramento</div>\\n          <div class=\\"sub-item\\">Instrução Normativa com Padronização</div>\\n          <div class=\\"sub-item\\">Ato Normativo para uso de Controle Automático</div>\\n        </div>\\n      </div>\\n\\n      <!-- COL 2: Desenvolvimento do Sistema — 5 itens -->\\n      <div class=\\"column col-2\\">\\n        <div class=\\"connector-down\\"></div>\\n        <div class=\\"macro-node\\">Desenvolvimento<br>do Sistema</div>\\n        <div class=\\"connector-sub\\"></div>\\n        <div class=\\"sub-items\\">\\n          <div class=\\"sub-item\\">Documentação</div>\\n          <div class=\\"sub-item\\">Módulos Adicionais</div>\\n          <div class=\\"sub-item\\">Painéis de Operação do AIRA</div>\\n          <div class=\\"sub-item\\">Códigos, IaC e DevOps</div>\\n          <div class=\\"sub-item\\">Manual de Usuário</div>\\n        </div>\\n      </div>\\n\\n      <!-- COL 3: Integrações de Sistema — 4 itens -->\\n      <div class=\\"column col-3\\">\\n        <div class=\\"connector-down\\"></div>\\n        <div class=\\"macro-node\\">Integrações<br>de Sistema</div>\\n        <div class=\\"connector-sub\\"></div>\\n        <div class=\\"sub-items\\">\\n          <div class=\\"sub-item\\">Relatório de Integração SEI</div>\\n          <div class=\\"sub-item\\">Relatório de Integração FPE</div>\\n          <div class=\\"sub-item\\">Relatório de Integração CAGE Gerencial</div>\\n          <div class=\\"sub-item\\">Relatório de Integração SINCAGE</div>\\n        </div>\\n      </div>\\n\\n      <!-- COL 4: Conformidade e Segurança — 7 itens -->\\n      <div class=\\"column col-4\\">\\n        <div class=\\"connector-down\\"></div>\\n        <div class=\\"macro-node\\">Conformidade<br>e Segurança</div>\\n        <div class=\\"connector-sub\\"></div>\\n        <div class=\\"sub-items\\">\\n          <div class=\\"sub-item\\">Relatório de Conformidade — Política de Desenvolvimento</div>\\n          <div class=\\"sub-item\\">Relatório de Conformidade — Política de Segurança</div>\\n          <div class=\\"sub-item\\">Relatório de Conformidade — Política de Uso de IA</div>\\n          <div class=\\"sub-item\\">Relatório de Conformidade — Agentic Trust Framework</div>\\n          <div class=\\"sub-item\\">Matriz de Riscos e Plano de Incidentes</div>\\n          <div class=\\"sub-item\\">Avaliação de Impacto à Proteção de Dados</div>\\n          <div class=\\"sub-item\\">Relatório de Conformidade de Governança de Dados</div>\\n        </div>\\n      </div>\\n\\n      <!-- COL 5: Implantação e Sustentação — 3 itens -->\\n      <div class=\\"column col-5\\">\\n        <div class=\\"connector-down\\"></div>\\n        <div class=\\"macro-node\\">Implantação<br>e Sustentação</div>\\n        <div class=\\"connector-sub\\"></div>\\n        <div class=\\"sub-items\\">\\n          <div class=\\"sub-item\\">Relatório de Implantação por objeto de controle</div>\\n          <div class=\\"sub-item\\">Plano de Capacitação</div>\\n          <div class=\\"sub-item\\">Dashboard de Implantação do AIRA</div>\\n        </div>\\n      </div>\\n\\n    </div>\\n  </div>\\n</div>\\n\\n\\n\\n</body></html>","riscos":[{"id":1,"descricao":"Dependência de partes externas para integração","probabilidade":4,"impacto":4,"urgencia":"alta"},{"id":2,"descricao":"Atrasos no Profisco III","probabilidade":3,"impacto":3,"urgencia":"media"},{"id":3,"descricao":"Resistência dos usuários","probabilidade":2,"impacto":2,"urgencia":"baixa"}],"planner_link":"","eap_link":""},"execucao":{"planner_link":"","percentual":0,"reunioes":[{"id":"r1001","nome":"Reunião de Status Patrocinador do Projeto AIRA","data":"","participantes":"Jimmy, Robson, Coordenador","observacoes":"Reunião mensal de acompanhamento","realizada":false,"auto":true}]},"conclusao":{"tipo":"","dt_conclusao":"","link_termo_aceite":"","historia":"","links_noticias":""}},{"id":1000201,"nome":"Identificação das Fontes de Recursos","gerente":"Guilherme Lentz","gerente_substituto":"Gabriela Machado","descricao":"Envio da Matriz de Saldos Contábeis com ativo e passivo financeiros e disponibilidade por destinação de recursos (DDR). Redesenho da DDR e abertura do Ativo Financeiro no FPE.","dt_inicio":"","dt_fim":"","patrocinador":"Felipe Bittencourt","fonte":"Gestão","fase_atual":"conclusao","status":"concluido","percentual":100,"icone_url":"","icone_emoji":"📝","dt_criacao":"2026-04-22","programa_id":2000002,"aprovacao":{"motivo_inicio":"","aprovado":true,"deliberacao":"","dt_aprovacao":"","obs":""},"ideacao":{"descricao":"","objetivo_smart":"","beneficios":"","requisitos":"","premissas":"","restricoes":"","entregas_macro":"","riscos_canvas":"","equipe":"","partes_interessadas":"","objetivo_estrategico":"","custos":"","resultados_esperados":"","acoes_imediatas":""},"planejamento":{"eap_html":"","riscos":[],"planner_link":""},"execucao":{"planner_link":"","percentual":100,"reunioes":[]},"conclusao":{"tipo":"sucesso","dt_conclusao":"","link_termo_aceite":"","historia":"Projeto atingiu a meta com a obtenção da nota A no ranking da STN (referente à qualificação da informação contábil). A frente de Identificação das Fontes de Recursos teve a Matriz de Saldos Contábeis de novembro/2025 enviada com ativo e passivo financeiros e DDR abertos por recurso. ","links_noticias":""}},{"id":1000301,"nome":"Coordenação Geral das UCI\'s","gerente":"José Carlos","gerente_substituto":"","descricao":"Definição da estrutura de assessoria técnica (Coordenação), mapeamento de interfaces e fluxos de integração com UCIs, além de suas atividades obrigatórias. Elaborado novo decreto do Sistema de CI.","dt_inicio":"","dt_fim":"","patrocinador":"Jociê Pereira","fonte":"Gestão","fase_atual":"execucao","status":"ativo","percentual":56,"icone_url":"","icone_emoji":"📁","dt_criacao":"2026-04-22","programa_id":null,"aprovacao":{"motivo_inicio":"","aprovado":false,"dt_aprovacao":"","obs":""},"ideacao":{"descricao":"","objetivo_smart":"","beneficios":"","requisitos":"","premissas":"","restricoes":"","entregas_macro":"","riscos_canvas":"","equipe":"","partes_interessadas":"","objetivo_estrategico":"","custos":"","resultados_esperados":"","acoes_imediatas":""},"planejamento":{"eap_html":"","riscos":[],"planner_link":""},"execucao":{"planner_link":"","percentual":56,"reunioes":[]},"conclusao":{"tipo":"","dt_conclusao":"","link_termo_aceite":"","historia":"","links_noticias":""}},{"id":1000302,"nome":"BIGDATA-CAGE","gerente":"Felipe Thiesen","gerente_substituto":"","descricao":"Montagem da réplica FPE, documentação dos scripts de extração e acesso ao banco SEF_CADASTRO. Transformações para uso em aplicações Qlik (DIE) e novos fluxos para tabelas do DW Sefaz (DETIC).","dt_inicio":"","dt_fim":"","patrocinador":"Antônio Kehrwald","fonte":"Gestão","fase_atual":"execucao","status":"ativo","percentual":56,"icone_url":"","icone_emoji":"📊","dt_criacao":"2026-04-22","programa_id":null,"aprovacao":{"motivo_inicio":"","aprovado":false,"dt_aprovacao":"","obs":""},"ideacao":{"descricao":"","objetivo_smart":"","beneficios":"","requisitos":"","premissas":"","restricoes":"","entregas_macro":"","riscos_canvas":"","equipe":"","partes_interessadas":"","objetivo_estrategico":"","custos":"","resultados_esperados":"","acoes_imediatas":""},"planejamento":{"eap_html":"","riscos":[],"planner_link":""},"execucao":{"planner_link":"","percentual":56,"reunioes":[]},"conclusao":{"tipo":"","dt_conclusao":"","link_termo_aceite":"","historia":"","links_noticias":""}},{"id":1000303,"nome":"EvoluTIva","gerente":"Leonardo Branco","gerente_substituto":"","descricao":"Desenvolvimento das bases para acompanhamento do desempenho dos projetos e das demandas de melhoria da DTTI. MVP de dashboard já disponibilizado na intranet.","dt_inicio":"","dt_fim":"","patrocinador":"Antônio Kehrwald","fonte":"Gestão","fase_atual":"execucao","status":"ativo","percentual":70,"icone_url":"","icone_emoji":"🖥️","dt_criacao":"2026-04-22","programa_id":null,"aprovacao":{"motivo_inicio":"","aprovado":false,"dt_aprovacao":"","obs":""},"ideacao":{"descricao":"","objetivo_smart":"","beneficios":"","requisitos":"","premissas":"","restricoes":"","entregas_macro":"","riscos_canvas":"","equipe":"","partes_interessadas":"","objetivo_estrategico":"","custos":"","resultados_esperados":"","acoes_imediatas":""},"planejamento":{"eap_html":"","riscos":[],"planner_link":""},"execucao":{"planner_link":"","percentual":70,"reunioes":[]},"conclusao":{"tipo":"","dt_conclusao":"","link_termo_aceite":"","historia":"","links_noticias":""}},{"id":1000304,"nome":"Projeto Escola Íntegra","gerente":"Álvaro Santos","gerente_substituto":"","descricao":"Concluída a 3ª edição do concurso de manifestações artísticas. Elaboração do ebook, reuniões com a SEDUC, evento de premiação em 2025 e expansão para 100% das escolas estaduais.","dt_inicio":"","dt_fim":"","patrocinador":"Jociê Pereira","fonte":"Gestão","fase_atual":"conclusao","status":"concluido","percentual":100,"icone_url":"","icone_emoji":"🏆","dt_criacao":"2026-04-22","programa_id":null,"aprovacao":{"motivo_inicio":"","aprovado":false,"dt_aprovacao":"","obs":""},"ideacao":{"descricao":"","objetivo_smart":"","beneficios":"","requisitos":"","premissas":"","restricoes":"","entregas_macro":"","riscos_canvas":"","equipe":"","partes_interessadas":"","objetivo_estrategico":"","custos":"","resultados_esperados":"","acoes_imediatas":""},"planejamento":{"eap_html":"","riscos":[],"planner_link":""},"execucao":{"planner_link":"","percentual":100,"reunioes":[]},"conclusao":{"tipo":"sucesso","dt_conclusao":"","link_termo_aceite":"","historia":"O Projeto atingiu a meta. Realizada a Reunião de lições aprendidas. Expansão para 100% das escolas estaduais.","links_noticias":""}},{"id":1000305,"nome":"Portal e-Cage","gerente":"Marcos Ramos","gerente_substituto":"","descricao":"Priorizadas 7 melhorias de usabilidade. Homologação de dashboard estratégico, ajustes UX (e-mail, reclassificação, observação, filtros) e processos de monitoramento.","dt_inicio":"","dt_fim":"","patrocinador":"Jociê Pereira","fonte":"Gestão","fase_atual":"conclusao","status":"concluido","percentual":100,"icone_url":"","icone_emoji":"🌐","dt_criacao":"2026-04-22","programa_id":null,"aprovacao":{"motivo_inicio":"","aprovado":false,"dt_aprovacao":"","obs":""},"ideacao":{"descricao":"","objetivo_smart":"","beneficios":"","requisitos":"","premissas":"","restricoes":"","entregas_macro":"","riscos_canvas":"","equipe":"","partes_interessadas":"","objetivo_estrategico":"","custos":"","resultados_esperados":"","acoes_imediatas":""},"planejamento":{"eap_html":"","riscos":[],"planner_link":""},"execucao":{"planner_link":"","percentual":100,"reunioes":[]},"conclusao":{"tipo":"sucesso","dt_conclusao":"","link_termo_aceite":"","historia":"Projeto concluído com aceite do Patrocinador e transição formal da operação para a área de negócio.","links_noticias":""}},{"id":1000306,"nome":"Pró-Audit","gerente":"Lorenzo Venzon","gerente_substituto":"","descricao":"Validação externa do IA-CM (KPAs 2.9, 2.10 e 2.1) concluída e validadas KPAs 2.2 a 2.8. Monitoramento das recomendações no SAEWEB.","dt_inicio":"","dt_fim":"","patrocinador":"Jociê Pereira","fonte":"Gestão","fase_atual":"conclusao","status":"concluido","percentual":100,"icone_url":"","icone_emoji":"🔬","dt_criacao":"2026-04-22","programa_id":null,"aprovacao":{"motivo_inicio":"","aprovado":false,"dt_aprovacao":"","obs":""},"ideacao":{"descricao":"","objetivo_smart":"","beneficios":"","requisitos":"","premissas":"","restricoes":"","entregas_macro":"","riscos_canvas":"","equipe":"","partes_interessadas":"","objetivo_estrategico":"","custos":"","resultados_esperados":"","acoes_imediatas":""},"planejamento":{"eap_html":"","riscos":[],"planner_link":""},"execucao":{"planner_link":"","percentual":100,"reunioes":[]},"conclusao":{"tipo":"sucesso","dt_conclusao":"","link_termo_aceite":"","historia":"Obtida a validação nível 2 do IA-CM. Realizada a reunião de lições aprendidas e encerramento do Projeto. Será iniciado em 2026 novo projeto para obtenção do nível 3 do IA-CM.","links_noticias":""}},{"id":1000307,"nome":"Transparência Cidadã","gerente":"Leonardo Branco","gerente_substituto":"","descricao":"Implantado painel reformulado de Contratos de Obras (novo layout), concluídos novos FAQs (Obras e Dívida Ativa), iniciada reformulação dos painéis \\"Despesas com Fornecedores e Prestadores\\" e mapeamento de interesses dos cidadãos.","dt_inicio":"","dt_fim":"","patrocinador":"Antônio Kehrwald","fonte":"Gestão","fase_atual":"conclusao","status":"concluido","percentual":100,"icone_url":"","icone_emoji":"📋","dt_criacao":"2026-04-22","programa_id":null,"aprovacao":{"motivo_inicio":"","aprovado":false,"dt_aprovacao":"","obs":""},"ideacao":{"descricao":"","objetivo_smart":"","beneficios":"","requisitos":"","premissas":"","restricoes":"","entregas_macro":"","riscos_canvas":"","equipe":"","partes_interessadas":"","objetivo_estrategico":"","custos":"","resultados_esperados":"","acoes_imediatas":""},"planejamento":{"eap_html":"","riscos":[],"planner_link":""},"execucao":{"planner_link":"","percentual":100,"reunioes":[]},"conclusao":{"tipo":"sucesso","dt_conclusao":"","link_termo_aceite":"","historia":"O Projeto atingiu a meta ao ganhar selo Diamante no ranking PNTP. Algumas pendências ficaram acordadas para serem entregues em 2026 por meio de controle da própria Área e acompanhamento pelo EPP ao final do 1º trimestre de 2026.","links_noticias":""}}],"programas":[{"id":2000001,"nome":"Gestão de Riscos no Controle","descricao":"Programa estratégico para desenvolvimento de controles baseados em riscos em diferentes áreas da CAGE.","gerente":"Ricardo Santiago","patrocinador":"Jociê Pereira","status":"ativo","dt_criacao":"2026-04-22"},{"id":2000002,"nome":"Qualificação da Informação Contábil","descricao":"Programa para qualificação da informação contábil no Siconfi e identificação das fontes de recursos.","gerente":"Guilherme Lentz","patrocinador":"Felipe Bittencourt","status":"ativo","dt_criacao":"2026-04-22"}],"exportDate":"2026-04-22T16:02:01.832Z","version":"SIGA_Projetos_v4"}');
    _projetos = data.projetos.map(function(p){return projFixDefaults(p);});
    projSave();
    if(data.programas) { _programas = data.programas.map(function(pg){return progFixDefaults(pg);}); progSave(); }
  } catch(e) { console.warn("Demo data error:", e); }
}


// ── Criar Reunioes de Status Patrocinador para todos os projetos ativos ──
function projAutoAddReunioesStatusTodos(){
  projAutoAddReunioesTipo('status', 0);
}

// ── Excluir reuniões duplicadas em TODOS os projetos ──
function projDeduplicarReunioesGlobal(){
  projLoad();
  var totalRem = 0;
  _projetos.forEach(function(proj){
    if(!proj.execucao || !proj.execucao.reunioes) return;
    var seen = {};
    var orig = proj.execucao.reunioes.length;
    proj.execucao.reunioes = proj.execucao.reunioes.filter(function(r){
      var k = r.nome + '|' + (r.data||'');
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
function projExportJSON(){
  projLoad();
  var data = {
    projetos: _projetos,
    programas: _programas,
    exportDate: new Date().toISOString(),
    version: 'SIGA_Projetos_v6'
  };
  var blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'SIGA_Projetos_backup_' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  projToast('Backup exportado!');
}

function projImportJSON(){
  var inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json';
  inp.onchange = function(e){
    var file = e.target.files[0];
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(ev){
      try {
        var data = JSON.parse(ev.target.result);
        if(!data.projetos || !Array.isArray(data.projetos)){
          projToast('Arquivo JSON invalido.','#d97706');
          return;
        }
        projConfirmar('Importar dados? Isso substituira TODOS os projetos e programas atuais.', function(){
          _projetos = data.projetos.map(function(p){return projFixDefaults(p);});
          if(data.programas) _programas = data.programas.map(function(pg){return progFixDefaults(pg);});
          projSave();
          projToast('Dados importados com sucesso!');
          projGo('inicio', document.getElementById('pnb-inicio'));
        });
      } catch(err){
        projToast('Erro ao ler arquivo: ' + err.message, '#d97706');
      }
    };
    reader.readAsText(file);
  };
  inp.click();
}


// ── Alterar Emoji do Projeto (Picker) ──────────────────────────
var _projWorkEmojis = [
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
  var overlay = document.createElement('div');
  overlay.id = 'proj-emoji-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';

  var box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:14px;padding:1.5rem;max-width:440px;width:95%;max-height:70vh;overflow-y:auto;box-shadow:0 16px 48px rgba(0,0,0,.3)';

  var header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem';
  var title = document.createElement('div');
  title.style.cssText = 'font-weight:700;font-size:15px;color:#1a2540';
  title.textContent = 'Selecionar Icone do Projeto';
  var closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '\u2715';
  closeBtn.style.cssText = 'background:none;border:none;font-size:20px;cursor:pointer;color:#70709a';
  closeBtn.onclick = function(){ overlay.remove(); };
  header.appendChild(title);
  header.appendChild(closeBtn);
  box.appendChild(header);

  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(40px,1fr));gap:4px';
  _projWorkEmojis.forEach(function(em){
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = em;
    btn.style.cssText = 'font-size:22px;padding:6px;background:none;border:1px solid #e4e2d8;border-radius:8px;cursor:pointer;transition:all .15s';
    btn.onmouseover = function(){ this.style.background='#ebf1fc'; this.style.borderColor='#1A5DC8'; };
    btn.onmouseout = function(){ this.style.background='none'; this.style.borderColor='#e4e2d8'; };
    btn.onclick = function(){
      projLoad();
      var proj = _projetos.find(function(p){return String(p.id)===String(projId);});
      if(proj){ proj.icone_emoji = em; proj.icone_url = ''; projSave(); projToast('Icone atualizado!'); projAbrirDetalhe(projId, true); }
      overlay.remove();
    };
    grid.appendChild(btn);
  });
  box.appendChild(grid);

  var uploadDiv = document.createElement('div');
  uploadDiv.style.cssText = 'margin-top:1rem;padding-top:1rem;border-top:1px solid #e4e2d8;text-align:center';
  var uploadLabel = document.createElement('label');
  uploadLabel.className = 'proj-btn';
  uploadLabel.style.cssText = 'cursor:pointer;font-size:12px;padding:6px 14px';
  uploadLabel.textContent = '\u{1F4F7} Enviar imagem personalizada';
  var uploadInput = document.createElement('input');
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
function projProgramaNome(p) { if(p && p.programa_id){ const pg=(_programas||[]).find(x=>String(x.id)===String(p.programa_id)); if(pg)return pg.nome; } return 'Sem programa'; }
function projDimensoesProjeto(p) { return {patrocinador:p.patrocinador||'', objetivo:p.ideacao?.objetivo_estrategico||(p.objetivos_estrategicos||[])[0]||'', macro:(p.macroprocessos||[])[0]||p.macroprocesso||'', divisao:p.divisao||''}; }
function projOptionsFromProjetos(projects,getter){return [...new Set(projects.map(getter).filter(Boolean))].sort();}
function projGetDashFiltro(){return {patrocinador:document.getElementById('proj-f-patrocinador')?.value||'',objetivo:document.getElementById('proj-f-objetivo')?.value||'',macro:document.getElementById('proj-f-macro')?.value||'',divisao:document.getElementById('proj-f-divisao')?.value||''};}
function projFiltrarProjetosV9(projects){const f=projGetDashFiltro();return projects.filter(p=>{const d=projDimensoesProjeto(p);return(!f.patrocinador||d.patrocinador===f.patrocinador)&&(!f.objetivo||d.objetivo===f.objetivo)&&(!f.macro||d.macro===f.macro)&&(!f.divisao||d.divisao===f.divisao);});}
function projGroupCount(projects,getter){const map={};projects.forEach(p=>{const k=getter(p)||'Não informado';map[k]=(map[k]||0)+1;});return Object.entries(map).map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count).slice(0,8);}
function projChartBars(title,items){const max=Math.max(1,...items.map(i=>i.count));return `<div class="proj-v9-chart-card"><div class="proj-card-t">${title}</div><div class="proj-v9-bars">${items.length?items.map(i=>`<div class="proj-v9-bar-row"><span title="${projEsc(i.label)}">${projEsc(i.label)}</span><div class="proj-v9-bar"><div style="width:${Math.max(6,Math.round(i.count/max*100))}%"></div></div><strong>${i.count}</strong></div>`).join(''):'<div style="font-size:12px;color:var(--ink3)">Sem dados.</div>'}</div></div>`;}
function projTarefasAtrasadasProjeto(p){const today=new Date().toISOString().slice(0,10);return projFlattenTasks(p.execucao?.tarefas||[]).filter(t=>!(t._children&&t._children.length)&&!t.concluida&&t.dt_fim&&t.dt_fim<today);}
function projRenderDashV9(){const all=(_projetos||[]).filter(p=>p.status==='ativo');const cur=projGetDashFiltro();const opts={patrocinador:projOptionsFromProjetos(all,p=>projDimensoesProjeto(p).patrocinador),objetivo:projOptionsFromProjetos(all,p=>projDimensoesProjeto(p).objetivo),macro:projOptionsFromProjetos(all,p=>projDimensoesProjeto(p).macro),divisao:projOptionsFromProjetos(all,p=>projDimensoesProjeto(p).divisao)};const sel=(id,label,arr,val)=>`<div class="proj-fg" style="margin:0"><label class="proj-fl">${label}</label><select class="proj-fi" id="${id}" onchange="projRenderDashV9()"><option value="">Todos</option>${arr.map(v=>`<option value="${projEsc(v)}" ${v===val?'selected':''}>${projEsc(v)}</option>`).join('')}</select></div>`;const filtrados=projFiltrarProjetosV9(all);const filtrosEl=document.getElementById('proj-dash-filtros');if(filtrosEl)filtrosEl.innerHTML=`<div class="proj-v9-filter-card"><div class="proj-card-t">Filtros</div><div class="proj-v9-filter-grid">${sel('proj-f-patrocinador','Patrocinador',opts.patrocinador,cur.patrocinador)}${sel('proj-f-objetivo','Objetivo Estratégico',opts.objetivo,cur.objetivo)}${sel('proj-f-macro','Macroprocesso',opts.macro,cur.macro)}${sel('proj-f-divisao','Divisão',opts.divisao,cur.divisao)}</div></div>`;const alertasEl=document.getElementById('proj-dash-alertas');if(alertasEl){const comAtraso=filtrados.map(p=>({p,tarefas:projTarefasAtrasadasProjeto(p)})).filter(x=>x.tarefas.length);alertasEl.innerHTML=`<div class="proj-v9-alert-card"><div class="proj-card-t">Painel de Alertas</div>${comAtraso.length?comAtraso.map(({p,tarefas})=>`<div class="proj-v9-alert-project"><div style="display:flex;justify-content:space-between;gap:10px"><strong>${projIconHtml(p)} ${projEsc(p.nome)}</strong><span style="font-size:11px;color:#dc2626;font-weight:800">${tarefas.length} atrasada(s)</span></div>${tarefas.slice(0,6).map(t=>`<div class="proj-v9-alert-task"><span>${projEsc(t.nome)}</span><span>${projEsc(t.responsavel||'')}</span><strong>${projFormatDate(t.dt_fim)}</strong></div>`).join('')}</div>`).join(''):'<div style="font-size:12px;color:var(--ink3)">Nenhum projeto com tarefas atrasadas nos filtros atuais.</div>'}</div>`;}const graficosEl=document.getElementById('proj-dash-graficos');if(graficosEl){const indTotal=filtrados.reduce((acc,p)=>acc+(p.execucao?.indicadores||[]).length,0);graficosEl.innerHTML=`<div class="proj-v9-chart-card"><div class="proj-card-t">Dashboard Executivo</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px"><div><strong>${filtrados.length}</strong><span> Projetos</span></div><div><strong>${Math.round(filtrados.reduce((a,p)=>a+(p.percentual||0),0)/(filtrados.length||1))}%</strong><span> Média</span></div><div><strong>${indTotal}</strong><span> Indicadores</span></div><div><strong>${filtrados.filter(p=>projTarefasAtrasadasProjeto(p).length).length}</strong><span> Com atraso</span></div></div></div><div class="proj-v9-chart-grid">${projChartBars('Projetos por Subprocesso',projGroupCount(filtrados,p=>p.subprocesso||p.nome))}${projChartBars('Projetos por Patrocinador',projGroupCount(filtrados,p=>p.patrocinador))}${projChartBars('Projetos por Indicadores',projGroupCount(filtrados,p=>(p.execucao?.indicadores||[]).length?'Com indicadores':'Sem indicadores'))}</div>`;}}
function projRenderIndicadoresExecucao(p){const inds=p.execucao?.indicadores||[];return `<div style="display:flex;flex-direction:column;gap:8px">${inds.length?inds.map((i,idx)=>`<div class="proj-v9-ind-grid"><input class="proj-fi" value="${projEsc(i.nome||'')}" onchange="projUpdateIndicador(${idx},'nome',this.value)" placeholder="Indicador"><input class="proj-fi" type="number" value="${projEsc(String(i.meta||''))}" onchange="projUpdateIndicador(${idx},'meta',this.value)" placeholder="Meta"><input class="proj-fi" type="number" value="${projEsc(String(i.atual||''))}" onchange="projUpdateIndicador(${idx},'atual',this.value)" placeholder="Atual"><select class="proj-fi" onchange="projUpdateIndicador(${idx},'status',this.value)"><option ${i.status==='Em acompanhamento'?'selected':''}>Em acompanhamento</option><option ${i.status==='Atingido'?'selected':''}>Atingido</option><option ${i.status==='Atenção'?'selected':''}>Atenção</option></select><button type="button" class="proj-btn danger" onclick="projRemoveIndicador(${idx})">×</button></div>`).join(''):'<div style="font-size:12px;color:var(--ink3)">Nenhum indicador registrado para este projeto.</div>'}<div><button type="button" class="proj-btn primary" style="font-size:11px;padding:5px 12px" onclick="projAddIndicador()">+ Indicador</button></div></div>`;}
function projAddIndicador(){projLoad();const proj=_projetos.find(p=>String(p.id)===_projCurrentId);if(!proj)return;if(!proj.execucao)proj.execucao={planner_link:'',percentual:0,reunioes:[],tarefas:[]};if(!proj.execucao.indicadores)proj.execucao.indicadores=[];proj.execucao.indicadores.push({nome:'Novo indicador',meta:'',atual:'',status:'Em acompanhamento'});projSave();projDetalheTab('execucao',document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));}
function projUpdateIndicador(idx,field,value){projLoad();const proj=_projetos.find(p=>String(p.id)===_projCurrentId);if(!proj?.execucao?.indicadores?.[idx])return;proj.execucao.indicadores[idx][field]=value;projSave();}
function projRemoveIndicador(idx){projLoad();const proj=_projetos.find(p=>String(p.id)===_projCurrentId);if(!proj?.execucao?.indicadores)return;proj.execucao.indicadores.splice(idx,1);projSave();projDetalheTab('execucao',document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));}
function projFlattenTasksForExport(tasks,prefix){let rows=[];(tasks||[]).forEach((t,i)=>{const num=prefix?prefix+'.'+(i+1):String(i+1);rows.push({Numero:num,Nome:t.nome||'',PPE:t.ppe?'Sim':'Não',Marco:t.marco?'Sim':'Não',Inicio:t.dt_inicio||'',Fim:t.dt_fim||'',Responsavel:t.responsavel||'',Conclusao:t.conclusao||0,Concluida:t.concluida?'Sim':'Não'});rows=rows.concat(projFlattenTasksForExport(t.subtarefas||[],num));});return rows;}
function projExportCronogramaXLSX(){projLoad();const proj=_projetos.find(p=>String(p.id)===_projCurrentId);if(!proj)return;const rows=projFlattenTasksForExport(proj.execucao?.tarefas||[]);if(!rows.length){projToast('Não há tarefas para exportar.','#d97706');return;}if(typeof XLSX==='undefined'){projToast('Biblioteca XLSX indisponível.','#d97706');return;}const ws=XLSX.utils.json_to_sheet(rows);ws['!cols']=[{wch:10},{wch:42},{wch:8},{wch:8},{wch:12},{wch:12},{wch:24},{wch:10},{wch:10}];const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Cronograma SIGA');XLSX.writeFile(wb,'Cronograma_SIGA_'+(proj.nome||'projeto').replace(/[^\w]+/g,'_').slice(0,40)+'.xlsx');}
function projUploadConclusaoImagens(inputEl){const files=Array.from(inputEl.files||[]);if(!files.length)return;projLoad();const proj=_projetos.find(p=>String(p.id)===_projCurrentId);if(!proj)return;if(!proj.conclusao)proj.conclusao={};if(!proj.conclusao.imagens)proj.conclusao.imagens=[];let pending=files.length;files.forEach(file=>{if(!file.type.startsWith('image/')){pending--;return;}const reader=new FileReader();reader.onload=e=>{proj.conclusao.imagens.push({nome:file.name,data:e.target.result});pending--;if(pending<=0){projSave();projDetalheTab('conclusao',document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(5)'));}};reader.readAsDataURL(file);});}
function projRemoveConclusaoImagem(idx){projLoad();const proj=_projetos.find(p=>String(p.id)===_projCurrentId);if(!proj?.conclusao?.imagens)return;proj.conclusao.imagens.splice(idx,1);projSave();projDetalheTab('conclusao',document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(5)'));}
function projRenderStatusReport(){projLoad();progLoad();const el=document.getElementById('proj-status-report-content');if(!el)return;const ativos=_projetos.filter(p=>p.status==='ativo');const grupos={};ativos.forEach(p=>{const g=projProgramaNome(p);if(!grupos[g])grupos[g]=[];grupos[g].push(p);});el.innerHTML=`<div class="proj-ib proj-ib-blue">Status Report Executivo agrupado por programa. O campo abaixo de cada projeto será usado como <strong>Sumário Executivo</strong> no PDF.</div><div class="proj-status-grid">${Object.entries(grupos).map(([prog,items])=>`<div><div class="proj-v9-program-title">${projEsc(prog)}</div>${items.map(p=>{const pct=Math.max(0,Math.min(100,p.percentual||0));return `<div class="proj-status-card"><div class="proj-status-head"><div class="proj-status-icon">${p.icone_url?`<img src="${projEsc(p.icone_url)}" alt="">`:projEsc(p.icone_emoji||'▣')}</div><div style="flex:1"><div class="proj-status-name">${projEsc(p.nome)}</div><div class="proj-status-meta">Patrocinador: ${projEsc(p.patrocinador||'Não informado')} · Gerente: ${projEsc(p.gerente||'Não informado')}</div></div><div class="proj-status-pct">${pct}%</div></div><div class="proj-status-bar"><div style="width:${pct}%"></div></div><div class="proj-fg" style="margin:.8rem 0 0"><label class="proj-fl">Sumário Executivo</label><textarea class="proj-fi proj-status-note" data-proj-id="${projEsc(String(p.id))}" rows="3" onchange="projSalvarStatusReportObs('${projEsc(String(p.id))}',this.value)">${projEsc(p.status_report_obs||'')}</textarea></div></div>`;}).join('')}</div>`).join('')}</div>`;}
function projBuildStatusReportHTML(){progLoad();const ativos=_projetos.filter(p=>p.status==='ativo');const data=new Date().toLocaleDateString('pt-BR');const grupos={};ativos.forEach(p=>{const g=projProgramaNome(p);if(!grupos[g])grupos[g]=[];grupos[g].push(p);});const groupsHtml=Object.entries(grupos).map(([prog,items])=>`<h2 class="sr-program">${projEsc(prog)}</h2>${items.map(p=>{const pct=Math.max(0,Math.min(100,p.percentual||0));const obs=projEsc(p.status_report_obs||'Sem sumário executivo registrado.').replace(/\n/g,'<br>');return `<section class="sr-card"><div class="sr-card-main"><div class="sr-title-row"><div class="sr-icon">${p.icone_url?`<img src="${projEsc(p.icone_url)}" alt="">`:projEsc(p.icone_emoji||'▣')}</div><div><h3>${projEsc(p.nome)}</h3><div class="sr-sub">Projeto em andamento · ${projEsc(projFaseText(p))}</div></div><div class="sr-pct">${pct}%</div></div><div class="sr-progress"><div style="width:${pct}%"></div></div><div class="sr-info"><div><span>Patrocinador</span>${projEsc(p.patrocinador||'Não informado')}</div><div><span>Gerente</span>${projEsc(p.gerente||'Não informado')}</div><div><span>Gerente substituto</span>${projEsc(p.gerente_substituto||'Não informado')}</div><div><span>% de conclusão</span>${pct}%</div></div></div><aside class="sr-note"><span>Sumário Executivo</span><p>${obs}</p></aside></section>`}).join('')}`).join('');return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Status Report Executivo</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#1a2540;margin:0;background:#fff}.sr-cover{border-left:8px solid var(--blue);padding:18px 22px;margin-bottom:18px;background:linear-gradient(90deg,#eaf4ff,#fff)}.sr-brand{font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--blue)}.sr-brand b{color:#00a89a}.sr-cover h1{margin:4px 0;font-size:26px;color:#0f2746}.sr-date{font-size:12px;color:#5f6b80}.sr-summary{display:flex;gap:10px;margin-bottom:16px}.sr-chip{border:1px solid #d9e5f5;border-radius:8px;padding:8px 12px;font-size:12px;background:#f8fbff}.sr-chip strong{font-size:18px;color:var(--blue);display:block}.sr-program{font-size:16px;color:var(--blue);border-bottom:2px solid #00a89a;padding-bottom:5px;margin:18px 0 10px}.sr-card{display:grid;grid-template-columns:1.45fr .9fr;gap:14px;border:1px solid #d9e2ef;border-radius:10px;padding:14px;margin-bottom:12px;break-inside:avoid}.sr-title-row{display:flex;align-items:center;gap:10px}.sr-icon{width:36px;height:36px;border-radius:9px;background:var(--blue-l);display:flex;align-items:center;justify-content:center;font-size:18px;overflow:hidden}.sr-icon img{width:100%;height:100%;object-fit:cover}h3{font-size:15px;margin:0;color:#0f2746}.sr-sub{font-size:10.5px;color:#6b7588;margin-top:2px}.sr-pct{margin-left:auto;font-size:24px;font-weight:800;color:#00a89a}.sr-progress{height:7px;border-radius:99px;background:#e7edf5;overflow:hidden;margin:12px 0}.sr-progress div{height:100%;background:linear-gradient(90deg,var(--blue),var(--teal))}.sr-info{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sr-info div{font-size:12px;border-top:1px solid #edf2f7;padding-top:6px}.sr-info span,.sr-note span{display:block;font-size:9px;color:var(--blue);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}.sr-note{border-left:3px solid #f59e0b;padding-left:12px}.sr-note p{font-size:12px;line-height:1.45;margin:0;color:#334155}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><header class="sr-cover"><div class="sr-brand">CAGE-RS · <b>Escritório de Projetos e Processos</b></div><h1>Status Report Executivo</h1><div class="sr-date">Emitido em ${data}</div></header><div class="sr-summary"><div class="sr-chip"><strong>${ativos.length}</strong>Projetos em andamento</div><div class="sr-chip"><strong>${ativos.length?Math.round(ativos.reduce((a,p)=>a+(p.percentual||0),0)/ativos.length):0}%</strong>Média de conclusão</div><div class="sr-chip"><strong>${Object.keys(grupos).length}</strong>Programas</div></div>${groupsHtml||'<div>Nenhum projeto em andamento encontrado.</div>'}<script>setTimeout(function(){window.print();},350);<\/script></body></html>`;}// ── Init ao carregar ──────────────────────────────────────────────
// ── Ajustes v9.1: indicadores, memorial e report executivo ───────
const PROJ_CAGE_REPORT_LOGO = 'file:///C:/Users/ewwoy/OneDrive/Imagens/04091256_2280_GD.png';

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

function projDimensoesProjeto(p) {
  const objetivos = projMultiValues(p.objetivos_estrategicos, p.ideacao?.objetivo_estrategico);
  const macros = projMultiValues(p.macroprocessos, p.macroprocesso);
  return {
    patrocinador:p.patrocinador||'',
    objetivo:objetivos[0]||'',
    objetivos,
    macro:macros[0]||'',
    macros,
    divisao:p.divisao||''
  };
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
  return vals.sort();
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
  return (allValues||[]).map(v => String(v||'').trim()).filter(v => v && !linked.has(v)).sort();
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

function projIndicadorPct(ind) {
  const meta = projIndicadorValor(ind,'meta');
  const resultado = projIndicadorValor(ind,'resultado');
  return meta ? Math.max(0, Math.min(999, Math.round(resultado/meta*100))) : 0;
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
  return `<div class="proj-v9-chart-card"><div class="proj-card-t">Resultado vs. Meta</div><div class="proj-v9-meta-list">${
    (rows||[]).length ? rows.map(r => {
      const meta = projIndicadorValor(r.ind,'meta');
      const atual = projIndicadorValor(r.ind,'resultado');
      const pctReal = meta ? (atual / meta) * 100 : 0;
      const pct = Math.max(0, Math.min(100, pctReal));
      const pctLabel = meta ? Math.round(pctReal) : 0;
      return `<div class="proj-v9-meta-row" title="${projEsc(r.p.nome)}: ${atual} / ${meta}"><div class="proj-v9-meta-name">${projEsc(r.ind.nome||'Indicador')}<div style="font-size:10.5px;color:var(--ink3)">${projEsc(r.p.nome||'')}</div></div><div class="proj-v9-meta-wrap"><div class="proj-v9-meta-target">${projEsc(meta)}</div><div class="proj-v9-meta-track"><div class="proj-v9-meta-fill" style="width:${pct}%"></div></div><div class="proj-v9-meta-current" style="left:${pct}%">${projEsc(atual)}</div><div class="proj-v9-meta-pct">${pctLabel}%</div></div></div>`;
    }).join('') : '<div style="font-size:12px;color:var(--ink3)">Nenhum indicador encontrado para os filtros atuais.</div>'
  }</div></div>`;
}

function projRenderDashV9() {
  if(typeof projLoadListas === 'function') projLoadListas();
  const all = (_projetos||[]).filter(p => p.status === 'ativo');
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
  if(filtrosEl) filtrosEl.innerHTML = `<div class="proj-v9-filter-card"><div class="proj-card-t">Filtros</div><div class="proj-v9-filter-grid">${sel('proj-f-patrocinador','Patrocinador',opts.patrocinador,cur.patrocinador)}${sel('proj-f-objetivo','Objetivo Estratégico',opts.objetivo,cur.objetivo)}${sel('proj-f-macro','Macroprocesso',opts.macro,cur.macro)}${sel('proj-f-divisao','Divisão',opts.divisao,cur.divisao)}</div></div>`;

  const alertasEl = document.getElementById('proj-dash-alertas');
  if(alertasEl) {
    const comAtraso = filtrados.map(p => ({ p, tarefas:projTarefasAtrasadasProjeto(p) })).filter(x => x.tarefas.length);
    alertasEl.innerHTML = `<div class="proj-v9-alert-card"><div class="proj-card-t">Painel de Alertas</div>${comAtraso.length ? comAtraso.map(({p,tarefas}) => `<div class="proj-v9-alert-project"><div style="display:flex;justify-content:space-between;gap:10px"><strong>${projIconHtml(p)} ${projEsc(p.nome)}</strong><span style="font-size:11px;color:#dc2626;font-weight:800">${tarefas.length} atrasada(s)</span></div>${tarefas.slice(0,6).map(t => `<div class="proj-v9-alert-task"><span>${projEsc(t.nome)}</span><span>${projEsc(t.responsavel||'')}</span><strong>${projFormatDate(t.dt_fim)}</strong></div>`).join('')}</div>`).join('') : '<div style="font-size:12px;color:var(--ink3)">Nenhum projeto com tarefas atrasadas nos filtros atuais.</div>'}</div>`;
  }

  const graficosEl = document.getElementById('proj-dash-graficos');
  if(graficosEl) {
    const inds = projIndicadoresLista(filtrados);
    const macrosSemProjeto = projUnlinkedValues(_macroprocessos, all, p => projDimensoesProjeto(p).macros);
    const objetivosSemProjeto = projUnlinkedValues(_objetivosEstrategicos, all, p => projDimensoesProjeto(p).objetivos);
    const indResumo = inds.slice(0,8).map(({p,ind}) => `<div class="proj-v9-mini-ind"><div><strong>${projEsc(ind.nome||'Indicador')}</strong><div style="font-size:11px;color:var(--ink3)">${projEsc(p.nome)}</div></div><div>${projEsc(projIndicadorResumo(ind))}</div></div>`).join('');
    graficosEl.innerHTML = `<div class="proj-v9-chart-card"><div class="proj-card-t">Resumo de Indicadores</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px"><div><strong>${filtrados.length}</strong><span> Projetos</span></div><div><strong>${Math.round(filtrados.reduce((a,p)=>a+(p.percentual||0),0)/(filtrados.length||1))}%</strong><span> Média</span></div><div><strong>${inds.length}</strong><span> Indicadores</span></div><div><strong>${filtrados.filter(p=>projTarefasAtrasadasProjeto(p).length).length}</strong><span> Com atraso</span></div></div>${indResumo ? `<div class="proj-v9-mini-list">${indResumo}</div>` : '<div style="font-size:12px;color:var(--ink3);margin-top:.7rem">Nenhum indicador cadastrado nos filtros atuais.</div>'}</div><div class="proj-v9-chart-grid">${projChartBars('Projetos por Macroprocesso', projGroupCountWithProjects(filtrados, p => projDimensoesProjeto(p).macros), {unlinkedLabel:'Ver Macroprocessos sem Projeto vinculado', unlinkedItems:macrosSemProjeto, unlinkedKey:'macroprocessos-sem-projeto'})}${projChartBars('Projetos por Objetivo Estratégico', projGroupCountWithProjects(filtrados, p => projDimensoesProjeto(p).objetivos), {unlinkedLabel:'Ver Objetivos Estratégicos sem Projeto vinculado', unlinkedItems:objetivosSemProjeto, unlinkedKey:'objetivos-sem-projeto'})}${projChartBars('Projetos por Patrocinador', projGroupCountWithProjects(filtrados, p => projDimensoesProjeto(p).patrocinador))}${projChartBars('Projetos por Indicadores', projIndicadoresDashItems(inds))}</div>`;
  }
}

function projRenderIndicadoresPage() {
  projLoad();
  const el = document.getElementById('proj-indicadores-content');
  if(!el) return;
  const projetos = (_projetos||[]).filter(p => p.status === 'ativo');
  const fProj = document.getElementById('proj-ind-filter-proj')?.value || '';
  const fArea = document.getElementById('proj-ind-filter-area')?.value || '';
  let rows = projIndicadoresLista(projetos);
  if(fProj) rows = rows.filter(r => String(r.p.id) === fProj);
  if(fArea) rows = rows.filter(r => projDimensoesProjeto(r.p).macros.includes(fArea));
  const projetosOpts = projetos.map(p => `<option value="${projEsc(String(p.id))}" ${String(p.id)===fProj?'selected':''}>${projEsc(p.nome)}</option>`).join('');
  const macroOpts = projOptionsFromProjetos(projetos, p => projDimensoesProjeto(p).macros).map(v => `<option value="${projEsc(v)}" ${v===fArea?'selected':''}>${projEsc(v)}</option>`).join('');
  const chart = projIndicadoresMetaChart(rows);
  const table = rows.length ? `<table class="proj-v9-table"><thead><tr><th>Projeto</th><th>Indicador</th><th>Meta</th><th>Resultado</th><th>Unidade</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td>${projEsc(r.p.nome)}</td><td><input class="proj-fi" value="${projEsc(r.ind.nome||'')}" onchange="projUpdateIndicadorGlobal('${projEsc(String(r.p.id))}',${r.idx},'nome',this.value)"></td><td><input class="proj-fi" type="number" step="0.01" value="${projEsc(r.ind.meta||'')}" onchange="projUpdateIndicadorGlobal('${projEsc(String(r.p.id))}',${r.idx},'meta',this.value)"></td><td><input class="proj-fi" type="number" step="0.01" value="${projEsc(r.ind.resultado ?? r.ind.atual ?? '')}" onchange="projUpdateIndicadorGlobal('${projEsc(String(r.p.id))}',${r.idx},'resultado',this.value)"></td><td><input class="proj-fi" value="${projEsc(r.ind.unidade||'')}" onchange="projUpdateIndicadorGlobal('${projEsc(String(r.p.id))}',${r.idx},'unidade',this.value)"></td><td><button type="button" class="proj-btn danger" style="font-size:11px;padding:4px 8px" onclick="projRemoveIndicadorGlobal('${projEsc(String(r.p.id))}',${r.idx})">Remover</button></td></tr>`).join('')}</tbody></table>` : '<div class="proj-v9-chart-card" style="font-size:12px;color:var(--ink3)">Nenhum indicador encontrado para os filtros atuais.</div>';
  el.innerHTML = `<div class="proj-v9-filter-card"><div class="proj-card-t">Filtros e edição</div><div class="proj-v9-filter-grid"><div class="proj-fg" style="margin:0"><label class="proj-fl">Projeto</label><select class="proj-fi" id="proj-ind-filter-proj" onchange="projRenderIndicadoresPage()"><option value="">Todos</option>${projetosOpts}</select></div><div class="proj-fg" style="margin:0"><label class="proj-fl">Macroprocesso</label><select class="proj-fi" id="proj-ind-filter-area" onchange="projRenderIndicadoresPage()"><option value="">Todos</option>${macroOpts}</select></div><div class="proj-fg" style="margin:0"><label class="proj-fl">Adicionar em projeto</label><select class="proj-fi" id="proj-ind-add-proj"><option value="">Selecione</option>${projetosOpts}</select></div><div style="display:flex;align-items:end"><button type="button" class="proj-btn primary" onclick="projAddIndicadorProjetoGlobal()">+ Indicador</button></div></div></div><div class="proj-v9-bi-grid"><div>${chart}</div><div class="proj-v9-chart-card"><div class="proj-card-t">Indicadores cadastrados</div>${table}</div></div>`;
}

function projUpdateIndicadorGlobal(projId, idx, field, value) {
  projLoad();
  const p = _projetos.find(x => String(x.id) === String(projId));
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
  const proj = _projetos.find(p => String(p.id) === _projCurrentId);
  if(!proj) return;
  if(!proj.execucao) proj.execucao = { planner_link:'', percentual:0, reunioes:[], tarefas:[] };
  if(!proj.execucao.indicadores) proj.execucao.indicadores = [];
  proj.execucao.indicadores.push({ nome:'Novo indicador', meta:'', resultado:'', atual:'', unidade:'%', status:'Em acompanhamento' });
  projSave();
  projDetalheTab('execucao', document.querySelector('#proj-detalhe-tabs .proj-tab:nth-child(4)'));
}

function projUpdateIndicador(idx, field, value) {
  projLoad();
  const proj = _projetos.find(p => String(p.id) === _projCurrentId);
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
  const p = _projetos.find(x => String(x.id) === String(projId));
  if(!p) return;
  if(!p.execucao) p.execucao = {};
  if(!p.execucao.indicadores) p.execucao.indicadores = [];
  p.execucao.indicadores.push({ nome:'Novo indicador', meta:100, resultado:0, atual:0, unidade:'%' });
  projSave();
  projRenderIndicadoresPage();
}

function projRemoveIndicadorGlobal(projId, idx) {
  projLoad();
  const p = _projetos.find(x => String(x.id) === String(projId));
  if(!p?.execucao?.indicadores) return;
  p.execucao.indicadores.splice(idx,1);
  projSave();
  projRenderIndicadoresPage();
}

function projTabConclusao(p) {
  const conc = p.conclusao || {};
  const selectedSuccess = conc.tipo === 'sucesso';
  const selectedCancel = conc.tipo === 'cancelamento';
  return `<div class="proj-form-section"><div class="proj-form-section-title">Fase 5: Conclusão</div><div class="proj-ib proj-ib-blue">Registre o encerramento oficial, o Memorial do Projeto, as notícias e os aprendizados.</div><div class="proj-fg"><label class="proj-fl">Tipo de Conclusão<span>*</span></label><div class="proj-conclusao-tipo"><div class="proj-conclusao-card ${selectedSuccess?'selected-success':''}" onclick="projSelecionarTipoConclusao('sucesso')"><div class="proj-conclusao-icon">OK</div><div class="proj-conclusao-label">Conclusão com Sucesso</div><div class="proj-conclusao-desc">Projeto entregue conforme planejado</div></div><div class="proj-conclusao-card ${selectedCancel?'selected-cancel':''}" onclick="projSelecionarTipoConclusao('cancelamento')"><div class="proj-conclusao-icon">X</div><div class="proj-conclusao-label">Cancelamento</div><div class="proj-conclusao-desc">Projeto encerrado sem conclusão das entregas</div></div></div></div><div class="proj-g2"><div class="proj-fg"><label class="proj-fl">Data de Conclusão/Cancelamento</label><input type="date" class="proj-fi" id="conc-data" value="${projEsc(conc.dt_conclusao||'')}"></div><div class="proj-fg"><label class="proj-fl">Link para o Termo de Aceite</label><input type="url" class="proj-fi" id="conc-termo" value="${projEsc(conc.link_termo_aceite||'')}" placeholder="https://..."></div></div><div class="proj-fg"><label class="proj-fl">História do Projeto</label><textarea class="proj-fi" id="conc-historia" rows="5" placeholder="Conte a história e trajetória do projeto, principais marcos, aprendizados...">${projEsc(conc.historia||'')}</textarea></div><div class="proj-fg"><label class="proj-fl">Links de Notícias / Resultados <span style="font-size:10px;color:var(--ink3)">(um por linha)</span></label><textarea class="proj-fi" id="conc-links" rows="3" placeholder="https://noticia1.gov.br&#10;https://noticia2.gov.br">${projEsc(conc.links_noticias||'')}</textarea></div><div class="proj-form-section" style="background:#fff;margin-top:1rem"><div class="proj-form-section-title">Anexos de Imagens do Memorial</div><div class="proj-fg"><input type="file" class="proj-fi" accept="image/*" multiple onchange="projUploadConclusaoImagens(this)">${(conc.imagens||[]).length ? `<div class="proj-v9-attach-grid">${(conc.imagens||[]).map((img,i)=>`<div><img src="${projEsc(img.data)}" alt="${projEsc(img.nome||'Imagem')}"><button type="button" class="proj-btn danger" style="font-size:10px;padding:2px 6px;margin-top:3px;width:100%" onclick="projRemoveConclusaoImagem(${i})">Remover</button></div>`).join('')}</div>` : '<div style="font-size:11px;color:var(--ink3);margin-top:4px">Nenhuma imagem anexada.</div>'}</div></div><div class="proj-form-section" style="background:#f8fbff;margin-top:1rem"><div class="proj-form-section-title">Reunião de Lições Aprendidas</div><div class="proj-g2"><div class="proj-fg"><label class="proj-fl">Data da reunião</label><input type="date" class="proj-fi" id="conc-lic-data" value="${projEsc(conc.licoes_data||'')}"></div><div class="proj-fg"><label class="proj-fl">Participantes</label><input type="text" class="proj-fi" id="conc-lic-part" value="${projEsc(conc.licoes_participantes||'')}" placeholder="Nomes dos participantes"></div></div><div class="proj-g3"><div class="proj-fg"><label class="proj-fl">O que deu certo?</label><textarea class="proj-fi" id="conc-lic-certo" rows="4">${projEsc(conc.licoes_certo||'')}</textarea></div><div class="proj-fg"><label class="proj-fl">O que pode melhorar?</label><textarea class="proj-fi" id="conc-lic-melhorar" rows="4">${projEsc(conc.licoes_melhorar||'')}</textarea></div><div class="proj-fg"><label class="proj-fl">Sugestões / ideias</label><textarea class="proj-fi" id="conc-lic-ideias" rows="4">${projEsc(conc.licoes_ideias||'')}</textarea></div></div></div><div class="proj-btn-row"><button type="button" class="proj-btn teal" onclick="projSalvarConclusao()">Salvar</button>${p.status !== 'concluido' && p.status !== 'cancelado' ? `<button type="button" class="proj-btn primary" onclick="projFinalizarProjeto()">Encerrar Projeto</button>` : `<div style="font-size:12.5px;color:var(--teal);font-weight:600;align-self:center">Projeto encerrado</div>`}</div></div>`;
}

function projMemorialNewsEmbeds(conc) {
  const links = String(conc.links_noticias||'').split(/\n+/).map(s => s.trim()).filter(Boolean);
  if(!links.length) return '';
  return `<div class="proj-form-section" style="margin-top:1rem"><div class="proj-form-section-title">Notícias e Resultados</div>${links.map((url,i) => `<div class="proj-v9-news-card"><div class="proj-v9-news-head"><span>Notícia ${i+1}</span><a href="${projEsc(url)}" target="_blank" rel="noopener">Abrir em nova aba</a></div><iframe class="proj-v9-news-frame" src="${projEsc(url)}" loading="lazy"></iframe></div>`).join('')}</div>`;
}

function projRenderMemorial(p) {
  const conc = p.conclusao || {};
  const content = document.getElementById('proj-detalhe-content');
  if(!content) return;
  const licoes = [conc.licoes_data, conc.licoes_participantes, conc.licoes_certo, conc.licoes_melhorar, conc.licoes_ideias].some(Boolean);
  const imgs = (conc.imagens||[]).length ? `<div class="proj-v9-attach-grid">${(conc.imagens||[]).map(img => `<a href="${projEsc(img.data)}" target="_blank"><img src="${projEsc(img.data)}" alt="${projEsc(img.nome||'Imagem do memorial')}"></a>`).join('')}</div>` : '<div style="font-size:12px;color:var(--ink3)">Nenhuma imagem anexada ao Memorial.</div>';
  content.innerHTML = `<div class="proj-ph"><div><div class="proj-ph-t">Memorial do Projeto</div><div class="proj-ph-s">${projEsc(p.nome||'Projeto')}</div></div><button type="button" class="proj-btn" style="font-size:12px;padding:5px 11px" onclick="projGo('portfolio',document.getElementById('pnb-portfolio'))">Voltar ao Portfólio</button></div><div class="proj-form-section"><div class="proj-form-section-title">Informações Gerais</div><div class="proj-g3"><div><div class="proj-fl">Projeto</div><strong>${projEsc(p.nome||'')}</strong></div><div><div class="proj-fl">Patrocinador</div><strong>${projEsc(p.patrocinador||'Não informado')}</strong></div><div><div class="proj-fl">Gerente</div><strong>${projEsc(p.gerente||'Não informado')}</strong></div></div></div><div class="proj-form-section"><div class="proj-form-section-title">História do Projeto</div><div style="font-size:13px;color:#334155;line-height:1.7;white-space:pre-wrap">${projEsc(conc.historia||'História ainda não registrada.')}</div></div>${projMemorialNewsEmbeds(conc)}<div class="proj-form-section" style="margin-top:1rem"><div class="proj-form-section-title">Anexos de Imagens do Memorial</div>${imgs}</div>${licoes ? `<div class="proj-form-section" style="margin-top:1rem"><div class="proj-form-section-title">Lições Aprendidas</div><div class="proj-g2"><div><div class="proj-fl">Data da reunião</div><strong>${projFormatDate(conc.licoes_data)||'Não informada'}</strong></div><div><div class="proj-fl">Participantes</div><strong>${projEsc(conc.licoes_participantes||'Não informado')}</strong></div></div><div class="proj-g3" style="margin-top:1rem"><div><div class="proj-fl">O que deu certo?</div><div style="white-space:pre-wrap">${projEsc(conc.licoes_certo||'')}</div></div><div><div class="proj-fl">O que pode melhorar?</div><div style="white-space:pre-wrap">${projEsc(conc.licoes_melhorar||'')}</div></div><div><div class="proj-fl">Sugestões / ideias</div><div style="white-space:pre-wrap">${projEsc(conc.licoes_ideias||'')}</div></div></div></div>` : ''}`;
}

function projBuildStatusReportHTML() {
  progLoad();
  const ativos = _projetos.filter(p => p.status === 'ativo');
  const data = new Date().toLocaleDateString('pt-BR');
  const grupos = {};
  ativos.forEach(p => { const g = projProgramaNome(p); if(!grupos[g]) grupos[g] = []; grupos[g].push(p); });
  const media = ativos.length ? Math.round(ativos.reduce((a,p)=>a+(p.percentual||0),0)/ativos.length) : 0;
  const groupsHtml = Object.entries(grupos).map(([prog,items]) => `<h2 class="sr-program">${projEsc(prog)}</h2>${items.map(p => { const pct = Math.max(0,Math.min(100,p.percentual||0)); const obs = projEsc(p.status_report_obs||'Sem sumário executivo registrado.').replace(/\n/g,'<br>'); return `<section class="sr-card"><div class="sr-card-main"><div class="sr-title-row"><div><h3>${projEsc(p.nome)}</h3><div class="sr-sub">Projeto em andamento · ${projEsc(projFaseText(p))}</div></div><div class="sr-pct">${pct}%</div></div><div class="sr-progress"><div style="width:${pct}%"></div></div><div class="sr-info"><div><span>Patrocinador</span>${projEsc(p.patrocinador||'Não informado')}</div><div><span>Gerente</span>${projEsc(p.gerente||'Não informado')}</div><div><span>Gerente substituto</span>${projEsc(p.gerente_substituto||'Não informado')}</div><div><span>% de conclusão</span>${pct}%</div></div></div><aside class="sr-note"><span>Sumário Executivo</span><p>${obs}</p></aside></section>`; }).join('')}`).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Status Report Executivo</title><style>@page{size:A4;margin:13mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#172033;margin:0;background:#fff}.sr-cover{display:flex;align-items:center;justify-content:space-between;gap:22px;padding:18px 20px;margin-bottom:18px;border:1px solid #d8e6f5;border-left:8px solid var(--blue);background:linear-gradient(90deg,#f5fbff,#fff)}.sr-logo{width:168px;max-height:62px;object-fit:contain}.sr-kicker{font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--blue)}.sr-cover h1{margin:4px 0;font-size:27px;color:#0f2746}.sr-date{font-size:12px;color:#5f6b80}.sr-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}.sr-chip{border:1px solid #d9e5f5;border-radius:8px;padding:9px 12px;font-size:12px;background:#f8fbff}.sr-chip strong{font-size:20px;color:var(--blue);display:block}.sr-program{font-size:16px;color:var(--blue);border-bottom:2px solid var(--teal);padding-bottom:5px;margin:18px 0 10px}.sr-card{display:grid;grid-template-columns:1.45fr .9fr;gap:14px;border:1px solid #d9e2ef;border-radius:10px;padding:14px;margin-bottom:12px;break-inside:avoid;background:#fff}.sr-title-row{display:flex;align-items:flex-start;gap:10px}.sr-title-row>div:first-child{flex:1}h3{font-size:15px;margin:0;color:#0f2746}.sr-sub{font-size:10.5px;color:#6b7588;margin-top:2px}.sr-pct{font-size:26px;font-weight:800;color:#00a89a}.sr-progress{height:7px;border-radius:99px;background:#e7edf5;overflow:hidden;margin:12px 0}.sr-progress div{height:100%;background:linear-gradient(90deg,var(--blue),var(--teal))}.sr-info{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sr-info div{font-size:12px;border-top:1px solid #edf2f7;padding-top:6px}.sr-info span,.sr-note span{display:block;font-size:9px;color:var(--blue);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}.sr-note{border-left:3px solid #f59e0b;padding-left:12px}.sr-note p{font-size:12px;line-height:1.45;margin:0;color:#334155}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><header class="sr-cover"><div><div class="sr-kicker">CAGE-RS · Escritório de Projetos e Processos</div><h1>Status Report Executivo</h1><div class="sr-date">Emitido em ${data}</div></div><img class="sr-logo" src="${PROJ_CAGE_REPORT_LOGO}" alt="CAGE"></header><div class="sr-summary"><div class="sr-chip"><strong>${ativos.length}</strong>Projetos em andamento</div><div class="sr-chip"><strong>${media}%</strong>Média de conclusão</div><div class="sr-chip"><strong>${Object.keys(grupos).length}</strong>Programas</div></div>${groupsHtml||'<div>Nenhum projeto em andamento encontrado.</div>'}<script>setTimeout(function(){window.print();},450);<\/script></body></html>`;
}

// ── V10: Estratégia como fonte oficial ───────────────────────────
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
  return Object.values(byBase).sort();
}

function projNormalizeStrategyLists() {
  if(typeof projLoadListas === 'function') projLoadListas();
  const oldM = JSON.stringify(_macroprocessos||[]);
  const oldO = JSON.stringify(_objetivosEstrategicos||[]);
  if(Array.isArray(_projetos)) {
    _projetos.forEach(p => {
      projMultiValues(p.macroprocessos, p.macroprocesso).forEach(v => {
        if(/^\s*\[[^\]]+\]/.test(v) && !(_macroprocessos||[]).includes(v)) _macroprocessos.push(v);
      });
      projMultiValues(p.objetivos_estrategicos, p.ideacao?.objetivo_estrategico).forEach(v => {
        if(/^\s*\[[^\]]+\]/.test(v) && !(_objetivosEstrategicos||[]).includes(v)) _objetivosEstrategicos.push(v);
      });
    });
  }
  _macroprocessos = projNormalizeStrategyList(_macroprocessos);
  _objetivosEstrategicos = projNormalizeStrategyList(_objetivosEstrategicos);
  if(oldM !== JSON.stringify(_macroprocessos) || oldO !== JSON.stringify(_objetivosEstrategicos)) projSaveListas();
}

function projCanonicalStrategyValue(v, list) {
  const clean = String(v||'').trim();
  if(!clean) return '';
  if((list||[]).includes(clean)) return clean;
  const base = projStrategyBaseName(clean).toLowerCase();
  return (list||[]).find(x => projStrategyBaseName(x).toLowerCase() === base) || clean;
}

function projDimensoesProjeto(p) {
  projNormalizeStrategyLists();
  const objetivos = projMultiValues(p.objetivos_estrategicos, p.ideacao?.objetivo_estrategico)
    .map(v => projCanonicalStrategyValue(v, _objetivosEstrategicos)).filter(Boolean);
  const macros = projMultiValues(p.macroprocessos, p.macroprocesso)
    .map(v => projCanonicalStrategyValue(v, _macroprocessos)).filter(Boolean);
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
  return (_projetos||[]).filter(p => {
    const d = projDimensoesProjeto(p);
    return kind === 'macro' ? d.macros.includes(value) : d.objetivos.includes(value);
  });
}

function projStrategyRelatedHtml(kind, values) {
  return `<div class="proj-v10-related"><div class="proj-v10-related-title">Projetos relacionados</div>${
    values.length ? values.map(v => {
      const ps = projProjetosRelacionados(kind, v);
      return `<div class="proj-v10-related-group"><div class="proj-v10-related-name">${projEsc(v)} <span style="color:var(--ink3);font-weight:700">(${ps.length})</span></div>${ps.length ? ps.map(p => `<a href="#" class="proj-v10-chart-project" onclick="event.preventDefault();projAbrirDetalhe('${projEsc(String(p.id))}', true)">${projIconHtml(p)}<span>${projEsc(p.nome||'Projeto sem nome')}</span></a>`).join('') : '<div style="font-size:11px;color:var(--ink3)">Nenhum projeto vinculado.</div>'}</div>`;
    }).join('') : '<div style="font-size:12px;color:var(--ink3)">Nenhum item cadastrado.</div>'
  }</div>`;
}

function projRenderEstrategiaPage() {
  projLoad();
  projNormalizeStrategyLists();
  const el = document.getElementById('proj-estrategia-content');
  if(!el) return;
  el.innerHTML = `<div class="proj-v10-strategy-grid"><div class="proj-v9-chart-card"><div class="proj-card-t">Macroprocessos</div><div class="proj-ib proj-ib-blue" style="font-size:12px">Um item por linha. Se existir uma versão com prefixo entre colchetes e outra sem, a versão com colchetes é mantida.</div><textarea id="estrat-macros" class="proj-fi proj-v10-strategy-text">${projEsc((_macroprocessos||[]).join('\n'))}</textarea><div class="proj-btn-row"><button type="button" class="proj-btn primary" onclick="projSalvarEstrategia('macro')">Salvar Macroprocessos</button></div>${projStrategyRelatedHtml('macro', _macroprocessos||[])}</div><div class="proj-v9-chart-card"><div class="proj-card-t">Objetivos Estratégicos</div><div class="proj-ib proj-ib-blue" style="font-size:12px">Um item por linha. Estes dados alimentam o workflow e os gráficos do dashboard.</div><textarea id="estrat-objetivos" class="proj-fi proj-v10-strategy-text">${projEsc((_objetivosEstrategicos||[]).join('\n'))}</textarea><div class="proj-btn-row"><button type="button" class="proj-btn primary" onclick="projSalvarEstrategia('objetivo')">Salvar Objetivos Estratégicos</button></div>${projStrategyRelatedHtml('objetivo', _objetivosEstrategicos||[])}</div></div>`;
}

function projSalvarEstrategia(kind) {
  const id = kind === 'macro' ? 'estrat-macros' : 'estrat-objetivos';
  const lines = (document.getElementById(id)?.value||'').split(/\n+/).map(s => s.trim()).filter(Boolean);
  if(kind === 'macro') _macroprocessos = projNormalizeStrategyList(lines);
  else _objetivosEstrategicos = projNormalizeStrategyList(lines);
  projSaveListas();
  projToast('Estratégia atualizada.');
  projRenderEstrategiaPage();
}

function projPopulateVinculacoes() {
  projNormalizeStrategyLists();
  projLoad();
  var proj = _projetos.find(function(p){return String(p.id)===_projCurrentId;});
  if(!proj) return;
  var ml = document.getElementById('aprov-macro-list');
  if(ml) ml.innerHTML = (proj.macroprocessos||[]).map(function(m,i){var v=projCanonicalStrategyValue(m,_macroprocessos);return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;padding:4px 8px;background:#f0f4ff;border-radius:6px;font-size:12px;color:#1a2540"><span style="flex:1">'+projEsc(v)+'</span><button type="button" style="background:none;border:none;cursor:pointer;color:#b91c1c;font-size:14px;padding:0 4px" onclick="projRemoverMacro('+i+')">✕</button></div>';}).join('');
  var ms = document.getElementById('aprov-macro-sel');
  if(ms) ms.innerHTML = '<option value="">Selecione...</option>' + _macroprocessos.map(function(m){return '<option value="'+projEsc(m)+'">'+projEsc(m)+'</option>';}).join('');
  var ol = document.getElementById('aprov-obj-list');
  if(ol) ol.innerHTML = (proj.objetivos_estrategicos||[]).map(function(o,i){var v=projCanonicalStrategyValue(o,_objetivosEstrategicos);return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;padding:4px 8px;background:var(--teal-l);border-radius:6px;font-size:12px;color:#1a2540"><span style="flex:1">'+projEsc(v)+'</span><button type="button" style="background:none;border:none;cursor:pointer;color:#b91c1c;font-size:14px;padding:0 4px" onclick="projRemoverObj('+i+')">✕</button></div>';}).join('');
  var os = document.getElementById('aprov-obj-sel');
  if(os) os.innerHTML = '<option value="">Selecione...</option>' + _objetivosEstrategicos.map(function(o){return '<option value="'+projEsc(o)+'">'+projEsc(o)+'</option>';}).join('');
}

function projAddMacroNovo(){var inp=document.getElementById('aprov-macro-novo');if(!inp||!inp.value.trim()){projToast('Digite o macroprocesso.','#d97706');return;}var v=inp.value.trim();_macroprocessos=projNormalizeStrategyList([].concat(_macroprocessos||[],[v]));projSaveListas();v=projCanonicalStrategyValue(v,_macroprocessos);projLoad();var p=_projetos.find(function(x){return String(x.id)===_projCurrentId;});if(!p)return;if(!p.macroprocessos)p.macroprocessos=[];if(!p.macroprocessos.includes(v))p.macroprocessos.push(v);projSave();inp.value='';projPopulateVinculacoes();}
function projAddObjNovo(){var inp=document.getElementById('aprov-obj-novo');if(!inp||!inp.value.trim()){projToast('Digite o objetivo.','#d97706');return;}var v=inp.value.trim();_objetivosEstrategicos=projNormalizeStrategyList([].concat(_objetivosEstrategicos||[],[v]));projSaveListas();v=projCanonicalStrategyValue(v,_objetivosEstrategicos);projLoad();var p=_projetos.find(function(x){return String(x.id)===_projCurrentId;});if(!p)return;if(!p.objetivos_estrategicos)p.objetivos_estrategicos=[];if(!p.objetivos_estrategicos.includes(v))p.objetivos_estrategicos.push(v);projSave();inp.value='';projPopulateVinculacoes();}

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
    return `<div class="proj-v12-single-image"><a href="${projEsc(img.data)}" target="_blank"><img src="${projEsc(img.data)}" alt="${projEsc(img.nome||'Imagem do memorial')}"></a></div>`;
  }
  return `<div class="proj-v12-carousel" id="proj-memorial-carousel" data-index="0"><button type="button" class="proj-v12-carousel-btn prev" onclick="projMemorialCarouselStep(-1)" aria-label="Imagem anterior">‹</button><div class="proj-v12-carousel-stage">${imagens.map((img,i) => `<a href="${projEsc(img.data)}" target="_blank" class="proj-v12-carousel-slide ${i===0?'on':''}"><img src="${projEsc(img.data)}" alt="${projEsc(img.nome||'Imagem do memorial')}"></a>`).join('')}</div><button type="button" class="proj-v12-carousel-btn next" onclick="projMemorialCarouselStep(1)" aria-label="Próxima imagem">›</button><div class="proj-v12-carousel-counter">1 / ${imagens.length}</div></div>`;
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
  content.innerHTML = `<div class="proj-ph"><div><div class="proj-ph-t">Memorial do Projeto</div><div class="proj-ph-s">${projEsc(p.nome||'Projeto')}</div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="proj-btn primary" style="font-size:12px;padding:5px 11px" onclick="projAbrirDetalhe('${projEsc(String(p.id))}', true)">Ver Workflow</button><button type="button" class="proj-btn" style="font-size:12px;padding:5px 11px" onclick="projGo('portfolio',document.getElementById('pnb-portfolio'))">Voltar ao Portfólio</button></div></div><div class="proj-form-section"><div class="proj-form-section-title">Informações Gerais</div><div class="proj-g3"><div><div class="proj-fl">Projeto</div><strong>${projEsc(p.nome||'')}</strong></div><div><div class="proj-fl">Patrocinador</div><strong>${projEsc(p.patrocinador||'Não informado')}</strong></div><div><div class="proj-fl">Gerente</div><strong>${projEsc(p.gerente||'Não informado')}</strong></div></div></div><div class="proj-form-section"><div class="proj-form-section-title">História do Projeto</div><div style="font-size:13px;color:#334155;line-height:1.7;white-space:pre-wrap">${projEsc(conc.historia||'História ainda não registrada.')}</div></div>${projMemorialNewsEmbeds(conc)}<div class="proj-form-section" style="margin-top:1rem"><div class="proj-form-section-title">Anexos de Imagens do Memorial</div>${imgs}</div>${licoes ? `<div class="proj-form-section" style="margin-top:1rem"><div class="proj-form-section-title">Lições Aprendidas</div><div class="proj-g2"><div><div class="proj-fl">Data da reunião</div><strong>${projFormatDate(conc.licoes_data)||'Não informada'}</strong></div><div><div class="proj-fl">Participantes</div><strong>${projEsc(conc.licoes_participantes||'Não informado')}</strong></div></div><div class="proj-g3" style="margin-top:1rem"><div><div class="proj-fl">O que deu certo?</div><div style="white-space:pre-wrap">${projEsc(conc.licoes_certo||'')}</div></div><div><div class="proj-fl">O que pode melhorar?</div><div style="white-space:pre-wrap">${projEsc(conc.licoes_melhorar||'')}</div></div><div><div class="proj-fl">Sugestões / ideias</div><div style="white-space:pre-wrap">${projEsc(conc.licoes_ideias||'')}</div></div></div></div>` : ''}`;
}

document.addEventListener('DOMContentLoaded', function() {
  // Hide login and hub, show projects directly
  var loginEl = document.getElementById('login-screen');
  if(loginEl) loginEl.style.display = 'none';
  var hubEl = document.getElementById('module-hub');
  if(hubEl) hubEl.style.display = 'none';
  var procShell = document.querySelector('.shell');
  if(procShell) procShell.style.display = 'none';
  var projShell = document.getElementById('proj-shell');
  if(projShell) projShell.classList.add('on');
  
  projCarregarDemoSeVazio();
  projLoad();
  projGo('inicio', document.getElementById('pnb-inicio'));
  projRenderQuickAccess();
});
