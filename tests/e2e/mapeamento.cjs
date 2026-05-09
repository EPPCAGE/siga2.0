const { chromium } = require('playwright');
const fs = require('fs');

const URL = 'http://localhost:8000/processos.html';
const ARTIFACTS_DIR = 'tests/e2e/artifacts';
const SCREENSHOT_PATH = `${ARTIFACTS_DIR}/mapeamento-final.png`;
const REPORT_PATH = `${ARTIFACTS_DIR}/mapeamento-report.json`;
const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10);

(async () => {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const logs = [];
  const findings = [];
  const steps = [];
  page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => logs.push({ type: 'pageerror', text: err.message }));

  async function step(name, fn) {
    try {
      const result = await fn();
      steps.push({ name, ok: true, result });
      return result;
    } catch (error) {
      steps.push({ name, ok: false, error: error.stack || error.message });
      findings.push({ severity: 'blocker', area: name, message: error.message });
      return null;
    }
  }

  await step('abrir app', async () => {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => typeof _aplicarUsuario === 'function' && typeof go === 'function', null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    return await page.title();
  });

  await step('entrar como usuário dono e abrir Solicitações', async () => {
    return await page.evaluate(() => {
      const macroId = ARQUITETURA[0]?.id || 'm1';
      _aplicarUsuario({ email: 'qa.dono@sefaz.rs.gov.br', nome: 'Usuário QA Dono', perfil: 'dono', perfis: ['dono'], iniciais: 'QD', macroprocessos_vinculados: [macroId] });
      go('solicitacoes', document.getElementById('nb-sol'));
      return { perfil: usuarioLogado.perfil, macroId, servicosCards: document.querySelectorAll('#sol-servicos .card').length };
    });
  });

  await step('criar solicitação de mapeamento via modal', async () => {
    await page.evaluate(({ today, tomorrow }) => {
      abrirSolicitacaoModal('mapeamento');
      const processo = document.getElementById('sol-processo');
      processo.value = processo.querySelectorAll('option')[1]?.value || '';
      document.getElementById('sol-prioridade').value = 'alta';
      document.getElementById('sol-prazo').value = tomorrow;
      document.getElementById('sol-envolvidos').value = 'Equipe QA, área demandante';
      document.getElementById('sol-justificativa').value = 'Simulação QA: necessidade de mapear fluxo ponta a ponta para validar o novo módulo de solicitações.';
      document.getElementById('sol-resultado').value = 'Mapeamento AS IS validado e pronto para formalização.';
      enviarSolicitacaoServico();
    }, { today, tomorrow });
    await page.waitForTimeout(500);
    return await page.evaluate(() => ({ total: solicitacoes.length, ultima: solicitacoes[0] }));
  });

  await step('entrar como EP, aprovar e converter solicitação em mapeamento', async () => {
    return await page.evaluate(() => {
      _aplicarUsuario({ email: 'ep@sefaz.rs.gov.br', nome: 'Equipe EP', perfil: 'ep', perfis: ['ep'], iniciais: 'EP' });
      go('solicitacoes', document.getElementById('nb-sol'));
      const sol = solicitacoes[0];
      aprovarSolicitacao(sol.id);
      converterSolicitacaoMapeamento(sol.id);
      const proc = processos.find(p => p.origem_solicitacao_id === sol.id);
      if(!proc) throw new Error('Conversão não criou processo em mapeamento');
      abrirProc(proc.id);
      return { solStatus: sol.status, procId: proc.id, procNome: proc.nome, etapa: proc.etapa, produto: proc.produto, dono: proc.dono };
    });
  });
  await page.waitForTimeout(800);

  await step('preencher e avançar Abertura', async () => {
    return await page.evaluate(({ today, tomorrow }) => {
      document.getElementById('a-ini').value = today;
      document.getElementById('a-prev').value = tomorrow;
      document.getElementById('a-equipe').value = 'Equipe EP; Usuário QA Dono';
      document.getElementById('a-obj').value = 'Mapear fluxo atual para identificar responsabilidades, riscos e oportunidades.';
      document.getElementById('a-escopo').value = 'Da entrada da demanda até a entrega final validada.';
      salvarAbertura(true);
      return { etapa: curProc.etapa };
    }, { today, tomorrow });
  });

  await step('preencher e avançar Reunião de entendimento', async () => {
    return await page.evaluate(() => {
      document.getElementById('r-fornec').value = 'Área demandante; Sistemas corporativos';
      document.getElementById('r-clientes').value = 'Gestores e equipe executora';
      document.getElementById('r-entradas').value = 'Solicitação, documentos de referência e dados do sistema';
      document.getElementById('r-atividades').value = 'Receber solicitação; analisar documentos; executar conferência; publicar resultado';
      document.getElementById('r-saidas').value = 'Resultado validado e comunicado';
      document.getElementById('r-atores').value = 'Dono do processo, executor, gestor, EP';
      const tc = document.getElementById('r-tciclo'); if(tc) tc.value = '8';
      const tr = document.getElementById('r-treal'); if(tr) tr.value = '12';
      const ex = document.getElementById('r-exec-mensal'); if(ex) ex.value = '20';
      curProc.ent.prob = [{ desc: 'Retrabalho por falta de checklist inicial', solucao: 'Criar checklist de entrada' }];
      salvarReuniao(true);
      return { etapa: curProc.etapa, problemas: curProc.ent.prob.length };
    });
  });

  await step('responder Questionário como dono', async () => {
    return await page.evaluate(() => {
      _aplicarUsuario({ email: curProc.dono_email || 'qa.dono@sefaz.rs.gov.br', nome: curProc.dono || 'Usuário QA Dono', perfil: 'dono', perfis: ['dono'], iniciais: 'QD', macroprocessos_vinculados: [_macroIdPorArqId(curProc.arq_id)] });
      abrirProc(curProc.id);
      curProc.ent.quest_resp = {};
      QUESTOES.forEach(q => { curProc.ent.quest_resp[q.id] = 4; });
      salvarQuestionario();
      return { etapa: curProc.etapa, statusWorkflow: curProc.status_workflow, mat: curProc.ent.mat };
    });
  });
  await page.waitForTimeout(700);

  await step('retomar como EP e avançar etapas de modelagem/formalização', async () => {
    return await page.evaluate(() => {
      _aplicarUsuario({ email: 'ep@sefaz.rs.gov.br', nome: 'Equipe EP', perfil: 'ep', perfis: ['ep'], iniciais: 'EP' });
      abrirProc(curProc.id);
      if(curProc.ent?.revisao_ep_pendente) delete curProc.ent.revisao_ep_pendente;
      curProc.status_workflow = 'em_andamento';

      const trail = [];
      function jump(etapa, acao) {
        if(curProc.etapa !== etapa) throw new Error(`Esperava etapa ${etapa}, mas estava ${curProc.etapa}`);
        av(etapa, 'EP', acao || `QA concluiu ${etapa}`);
        trail.push(curProc.etapa);
      }

      curProc.mod.asIs = 'Fluxo AS IS simulado: receber demanda, conferir documentos, executar análise, revisar e comunicar resultado.';
      jump('esboco_asis', 'Esboço AS IS simulado');

      // Etapa do dono: simula validação e remove pendência de revisão para seguir.
      if(curProc.etapa !== 'det_valid_asis') throw new Error(`Esperava det_valid_asis, veio ${curProc.etapa}`);
      av('det_valid_asis', 'Dono do processo', 'Detalhamento AS IS validado na simulação');
      trail.push(curProc.etapa);

      curProc.ent.riscos = [{ desc: 'Falha de entrada incompleta', prob: 'Media', imp: 'Alto' }];
      jump('riscos', 'Riscos registrados');

      curProc.ent.analise = { t_ciclo_medio: '8h', t_espera_medio: '4h', qtd_atividades: 4, qtd_decisoes: 1, gargalos: ['Conferência inicial'], oportunidades: ['Checklist'] };
      jump('analise', 'Análise AS IS simulada');

      curProc.ent.analise.feedback_dono = { 'Checklist': 'manter' };
      jump('melhorias', 'Melhorias priorizadas');

      curProc.form.obs_final = 'Desenho final validado na simulação';
      jump('desenho_final', 'Desenho final concluído');

      jump('indicadores_proc', 'Indicadores definidos');

      curProc.form.pop = { area: curProc.area, ger: curProc.resp_ep, mac: curProc.macro, obj: curProc.objetivo, def: 'Procedimento simulado', ent: curProc.ent.entradas, sai: curProc.ent.saidas, docs: 'Documentos de referência', ativ_detalhes: {} };
      curProc.form.pop_ok = true;
      jump('pop', 'POP construído');

      jump('apresentacao', 'Gestor aprovou');
      jump('publicacao', 'Publicado');
      jump('acompanha', 'Acompanhamento registrado');
      jump('auditoria', 'Análise de aderência concluída');
      return { etapaFinal: curProc.etapa, statusWorkflow: curProc.status_workflow, hist: curProc.hist.length, trail };
    });
  });

  await step('verificar Meus Processos e alinhamento dos cards', async () => {
    return await page.evaluate(() => {
      _aplicarUsuario({ email: curProc.dono_email || 'qa.dono@sefaz.rs.gov.br', nome: curProc.dono || 'Usuário QA Dono', perfil: 'dono', perfis: ['dono'], iniciais: 'QD', macroprocessos_vinculados: [_macroIdPorArqId(curProc.arq_id)] });
      go('meusprocessos', document.getElementById('nb-meusproc'));
      const cards = [...document.querySelectorAll('#meus-proc-list > .card')].slice(0, 3);
      const tops = cards.map(c => Math.round(c.getBoundingClientRect().top));
      const aligned = tops.length < 2 || Math.max(...tops) - Math.min(...tops) <= 2;
      return { count: cards.length, tops, aligned, summary: document.getElementById('meus-proc-summary')?.innerText || '' };
    });
  });

  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });

  const state = await page.evaluate(() => ({
    solicitacoes: solicitacoes.map(s => ({ id: s.id, status: s.status, servico: s.servico, processo: s.processo_label })),
    processoSimulado: curProc ? { id: curProc.id, nome: curProc.nome, etapa: curProc.etapa, statusWorkflow: curProc.status_workflow, hist: curProc.hist?.length, mat: curProc.ent?.mat } : null,
    counts: { processos: processos.length, solicitacoes: solicitacoes.length }
  }));

  const report = { steps, findings, logs: logs.slice(-120), state, screenshot: SCREENSHOT_PATH };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})();
