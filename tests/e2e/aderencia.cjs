const { chromium } = require('playwright');
const fs = require('node:fs');

const URL = 'http://localhost:8000/processos.html';
const ARTIFACTS_DIR = 'tests/e2e/artifacts';
const SCREENSHOT_PATH = `${ARTIFACTS_DIR}/aderencia-final.png`;
const REPORT_PATH = `${ARTIFACTS_DIR}/aderencia-report.json`;
const today = new Date().toISOString().slice(0, 10);
const future = new Date(Date.now() + 86400000 * 45).toISOString().slice(0, 10);

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
    await page.waitForFunction(() => typeof _aplicarUsuario === 'function' && typeof converterSolicitacaoAnalise === 'function', null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    return await page.title();
  });

  await step('criar solicitação de análise de aderência como dono', async () => {
    return await page.evaluate(({ future }) => {
      const macroId = ARQUITETURA[0]?.id || 'm1';
      _aplicarUsuario({ email: 'qa.dono@sefaz.rs.gov.br', nome: 'Usuário QA Dono', perfil: 'dono', perfis: ['dono'], iniciais: 'QD', macroprocessos_vinculados: [macroId] });
      enterProcessModule();
      go('solicitacoes', document.getElementById('nb-sol'));
      abrirSolicitacaoModal('aderencia');
      const processo = document.getElementById('sol-processo');
      processo.value = processo.querySelectorAll('option')[1]?.value || '';
      document.getElementById('sol-prioridade').value = 'critica';
      document.getElementById('sol-prazo').value = future;
      document.getElementById('sol-envolvidos').value = 'Dono do processo, equipe executora e EPP';
      document.getElementById('sol-justificativa').value = 'Simulação QA: validar aderência do processo ao POP, critérios internos e evidências de execução.';
      document.getElementById('sol-resultado').value = 'Relatório de análise de aderência com achados, evidências e plano de ação.';
      enviarSolicitacaoServico();
      const sol = solicitacoes[0];
      return { totalSolicitacoes: solicitacoes.length, sol: { id: sol.id, servico: sol.servico, status: sol.status, processo: sol.processo_label } };
    }, { future });
  });

  await step('aprovar e converter solicitação em análise de aderência como EP', async () => {
    return await page.evaluate(() => {
      _aplicarUsuario({ email: 'ep@sefaz.rs.gov.br', nome: 'Equipe EP', perfil: 'ep', perfis: ['ep'], iniciais: 'EP' });
      enterProcessModule();
      go('solicitacoes', document.getElementById('nb-sol'));
      const sol = solicitacoes[0];
      aprovarSolicitacao(sol.id);
      converterSolicitacaoAnalise(sol.id);
      const proc = processos.find(p => p.origem_solicitacao_id === sol.id);
      if(!proc) throw new Error('Conversão não criou processo para análise de aderência');
      abrirProc(proc.id);
      return { solStatus: sol.status, processoId: proc.id, nome: proc.nome, etapa: proc.etapa, produto: proc.produto, auditoriaInicial: proc.auditoria };
    });
  });
  await page.waitForTimeout(600);

  await step('registrar planejamento da análise', async () => {
    return await page.evaluate(({ today, future }) => {
      document.getElementById('aud-ini').value = today;
      document.getElementById('aud-fim').value = future;
      document.getElementById('aud-obj').value = 'Avaliar se o processo está sendo executado conforme critérios definidos e boas práticas de controle.';
      document.getElementById('aud-escopo').value = 'Amostra documental, entrevistas com responsáveis e verificação das evidências de execução.';
      document.getElementById('aud-equipe').value = 'Equipe EP; Usuário QA Dono';
      document.getElementById('aud-crit').value = 'POP vigente; normas internas; registros do sistema; critérios de segregação de função.';
      document.getElementById('aud-metod').value = 'Mista';
      salvarPlanejamentoAuditoria();
      return { planejamento: curProc.auditoria };
    }, { today, future });
  });

  await step('registrar questão, resposta e evidência', async () => {
    return await page.evaluate(async () => {
      document.getElementById('aud-q-texto').value = 'O processo é executado conforme o POP vigente e com evidências rastreáveis?';
      document.getElementById('aud-q-crit').value = 'POP vigente e registros do sistema';
      document.getElementById('aud-q-resp').value = 'Dono do processo';
      await salvarQuestaoAuditoria();
      const resposta = document.getElementById('aud-q-resposta-0');
      if(!resposta) throw new Error('Campo de resposta da questão não ficou disponível após adicionar questão');
      resposta.value = 'Parcialmente. Existem evidências, mas parte dos registros ainda é mantida fora do sistema oficial.';
      await salvarRespostaQuestaoAuditoria(0);
      return { questoes: curProc.auditoria.questoes.map(q => ({ questao: q.questao, resposta: q.resposta })) };
    });
  });

  await step('registrar procedimento de análise', async () => {
    return await page.evaluate(async ({ today }) => {
      document.getElementById('aud-tr-tipo').value = 'Entrevista';
      document.getElementById('aud-tr-data').value = today;
      document.getElementById('aud-tr-resp').value = 'Equipe EP';
      document.getElementById('aud-tr-desc').value = 'Entrevista com o dono do processo e conferência de uma amostra de registros.';
      document.getElementById('aud-tr-obj').value = 'Verificar aderência entre prática executada, POP e evidências registradas.';
      document.getElementById('aud-tr-evid').value = 'Ata da entrevista; prints do sistema; planilha de controle complementar.';
      document.getElementById('aud-tr-concl').value = 'Há aderência parcial, com necessidade de centralizar evidências no sistema oficial.';
      await salvarProcedimentoAuditoria();
      return { procedimentos: curProc.auditoria.trilha.length };
    }, { today });
  });

  await step('registrar achado e plano de ação', async () => {
    return await page.evaluate(({ future }) => {
      document.getElementById('aud-a-titulo').value = 'Evidências parcialmente fora do sistema oficial';
      document.getElementById('aud-a-tipo').value = 'Observação';
      document.getElementById('aud-a-desc').value = 'Parte dos registros que comprovam execução do processo permanece em planilhas paralelas.';
      document.getElementById('aud-a-evid').value = 'Amostra de registros e entrevista com responsáveis.';
      document.getElementById('aud-a-crit').value = 'Centralizar evidências no sistema oficial e atualizar orientação do POP.';
      adicionarAchadoAuditoria();

      document.getElementById('aud-ac-acao').value = 'Migrar evidências recorrentes para o sistema oficial e revisar checklist de execução.';
      document.getElementById('aud-ac-resp').value = 'Dono do processo';
      document.getElementById('aud-ac-prazo').value = future;
      document.getElementById('aud-ac-status').value = 'Pendente';
      document.getElementById('aud-ac-achado').value = 'Evidências parcialmente fora do sistema oficial';
      adicionarAcaoAuditoria();
      return { achados: curProc.auditoria.achados_list.length, acoes: curProc.auditoria.acoes_list.length };
    }, { future });
  });

  await step('salvar relatório e concluir análise de aderência', async () => {
    return await page.evaluate(() => {
      const conf = document.getElementById('aud-conf');
      if(!conf) throw new Error('Campo de conformidade geral não disponível');
      conf.value = 'Conforme com ressalvas';
      salvarRelatorioAuditoria(false);
      salvarRelatorioAuditoria(true);
      return { concluida: curProc.auditoria.concluida, conformidade: curProc.auditoria.conformidade, hist: curProc.hist.length, etapa: curProc.etapa };
    });
  });

  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
  const state = await page.evaluate(() => ({
    solicitacoes: solicitacoes.map(s => ({ id: s.id, status: s.status, servico: s.servico, processo: s.processo_label })),
    processo: curProc ? {
      id: curProc.id,
      nome: curProc.nome,
      produto: curProc.produto,
      etapa: curProc.etapa,
      auditoria: {
        concluida: curProc.auditoria?.concluida,
        conformidade: curProc.auditoria?.conformidade,
        questoes: curProc.auditoria?.questoes?.length || 0,
        procedimentos: curProc.auditoria?.trilha?.length || 0,
        achados: curProc.auditoria?.achados_list?.length || 0,
        acoes: curProc.auditoria?.acoes_list?.length || 0
      }
    } : null,
    counts: { processos: processos.length, solicitacoes: solicitacoes.length }
  }));

  const report = { steps, findings, logs: logs.slice(-140), state, screenshot: SCREENSHOT_PATH };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})();
