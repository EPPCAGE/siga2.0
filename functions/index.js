const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp();

const ALLOWED_ORIGINS = [
  "https://eppcage.github.io",
  "https://sigaepp.web.app",
  "https://sigaepp.firebaseapp.com",
];

const AZURE_KEY      = defineSecret("AZURE_OPENAI_KEY");
const AZURE_ENDPOINT = defineSecret("AZURE_OPENAI_ENDPOINT");
const AZURE_DEPLOY   = defineSecret("AZURE_OPENAI_DEPLOYMENT");

const MAX_PAYLOAD_BYTES = 20 * 1024; // 20 KB

exports.ai = onRequest(
  { secrets: [AZURE_KEY, AZURE_ENDPOINT, AZURE_DEPLOY] },
  async (req, res) => {
    const origin = req.headers.origin || "";
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    res.set("Access-Control-Allow-Origin", allowedOrigin);
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Vary", "Origin");

    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

    // Verify Firebase ID token
    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!idToken) {
      res.status(401).json({ error: "Autenticação necessária" });
      return;
    }
    try {
      await admin.auth().verifyIdToken(idToken);
    } catch (_e) {
      res.status(401).json({ error: "Token inválido ou expirado" });
      return;
    }

    // Validate payload size
    if (JSON.stringify(req.body).length > MAX_PAYLOAD_BYTES) {
      res.status(413).json({ error: "Payload muito grande" });
      return;
    }

    const { mode, payload } = req.body || {};
    if (!mode || !payload) {
      res.status(400).json({ error: "Campos obrigatórios: mode, payload" });
      return;
    }

    const SYSTEM = {
      analisar_bpmn: `Você é um especialista em BPM (Business Process Management) e análise de processos.\nAnalise o XML BPMN fornecido e retorne um JSON com:\n{\n  "gargalos": ["..."],\n  "retrabalhos": ["..."],\n  "gaps": ["..."],\n  "oportunidades": ["..."],\n  "complexidade": "Baixa|Media|Alta|Muito alta",\n  "resumo": "texto curto com principais achados"\n}\nResponda APENAS com o JSON, sem markdown, sem texto adicional.`,

      gerar_pop: `Você é especialista em redação de Procedimentos Operacionais Padrão (POP) no padrão da administração pública brasileira.\nCom base nas etapas do processo fornecidas, gere um texto estruturado para o POP com as seções:\n1.0 Objetivo, 1.1 Definições, 1.2 Entradas, 1.3 Saídas, 2.0 Atividades (por responsável), 3.0 Documentos correlatos.\nSe o payload incluir "gargalos_confirmados", "oportunidades_confirmadas" ou "solucoes_confirmadas", incorpore essas informações de forma natural no texto do POP: mencione os gargalos como pontos de atenção nas atividades relevantes, inclua as soluções e oportunidades como orientações ou boas práticas dentro das seções pertinentes. Não crie seções separadas para esses itens — integre-os ao corpo do POP.\nSeja objetivo, use linguagem formal e imperativa. Retorne como texto simples sem markdown.`,

      assistente: `Você é um assistente especializado em gestão de processos do Escritório de Processos da CAGE/Sefaz-RS.\nResponda de forma clara, objetiva e em português brasileiro. Contexto do sistema: EP·CAGE é um sistema de mapeamento e gestão de processos institucionais seguindo metodologia BPM.\nLimite suas respostas a 300 palavras.`,

      analisar_indicadores: `Você é especialista em análise de desempenho e indicadores de processos da administração pública.\nO payload pode conter um campo "nota_sisplan" com instruções sobre a convenção de preenchimento, e um array "indicadores".\nANTES de analisar, descarte COMPLETAMENTE os seguintes tipos de indicadores — não os mencione de forma alguma, nem positiva nem negativamente:\n1. Indicadores com "aguardando_fechamento": true (estão nos 2 primeiros meses de um trimestre; o SISPLAN só registra resultados no último mês do trimestre).\n2. Indicadores cujo campo "realizado" é null, undefined, vazio ou igual a zero E que não possuem nenhum dado histórico preenchido — esses indicadores ainda não foram alimentados e não devem ser interpretados como desempenho ruim.\nAnalise APENAS os indicadores que possuem dados válidos. Com base neles, gere um comentário analítico conciso (máximo 150 palavras) destacando:\n- Indicadores que merecem atenção (abaixo da meta)\n- Tendências positivas\n- Recomendação principal\nSe não houver nenhum indicador com dados válidos, retorne apenas: "Nenhum indicador com dados disponíveis para análise neste período."\nRetorne APENAS o texto do comentário, sem título, sem markdown.`,

      gerar_ppt: `Você é especialista em gestão de processos e criação de apresentações executivas.\nCom base nas informações do processo fornecidas, gere um JSON com o conteúdo para uma apresentação PowerPoint executiva sobre o mapeamento deste processo. Seja direto, profissional e conciso.\nRetorne APENAS o JSON válido, sem markdown, sem texto adicional.`,

      extrair_pop: `Você é especialista em análise de documentos de gestão pública.\nAnalise o POP (Procedimento Operacional Padrão) fornecido e extraia as informações no formato JSON exato:\n{"nome":"nome do processo","area":"área responsável","objetivo":"objetivo em uma frase","atores":["ator1","ator2"],"etapas":["etapa 1","etapa 2"]}\nRetorne APENAS o JSON, sem texto adicional.`,

      relatorio_auditoria: `Você é especialista em auditoria de processos da administração pública brasileira.\nCom base nos dados da auditoria fornecidos, elabore um Relatório Executivo de Auditoria de Processo completo e profissional.\nRetorne APENAS um JSON válido (sem markdown, sem bloco de código) com a estrutura:\n{\n  "sumario": "Sumário executivo em 2-3 parágrafos descrevendo o processo auditado, o período e os principais resultados",\n  "conformidade_justificativa": "Justificativa objetiva para a conformidade geral atribuída",\n  "achados_resumo": ["achado resumido 1", "achado resumido 2"],\n  "recomendacoes": ["recomendação 1", "recomendação 2", "recomendação 3"],\n  "conclusao": "Parágrafo de conclusão com avaliação final e próximos passos"\n}`,

      gerar_questoes: `Você é especialista em auditoria de processos da administração pública brasileira.\nCom base no objetivo, escopo, critérios da auditoria e no conteúdo do processo mapeado fornecidos, gere uma lista de questões de auditoria relevantes e objetivas.\nCada questão deve ser verificável, diretamente ligada a um critério e adequada ao contexto do processo.\nRetorne APENAS um JSON válido (sem markdown, sem bloco de código) com a estrutura:\n[\n  {"questao": "texto da questão", "criterio": "critério relacionado"},\n  ...\n]\nGere entre 8 e 15 questões cobrindo conformidade, desempenho, controles internos e evidências documentais.`,

      gerar_faq: `Você é especialista em gestão de processos e comunicação institucional da administração pública brasileira.\nCom base nas informações do processo fornecidas, gere entre 5 e 8 perguntas frequentes (FAQ) com suas respectivas respostas.\nAs perguntas devem refletir dúvidas reais de cidadãos ou servidores sobre o processo.\nFormato de saída: apenas o texto puro, sem markdown, sem numeração extra, no padrão:\nP: [pergunta]\nR: [resposta objetiva em até 3 frases]\n\nRepita o bloco P/R para cada item.`,
    };

    const systemPrompt = SYSTEM[mode];
    if (!systemPrompt) {
      res.status(400).json({ error: `Mode inválido: ${mode}` });
      return;
    }

    const userMessage = typeof payload === "string" ? payload : JSON.stringify(payload);

    try {
      const endpoint = AZURE_ENDPOINT.value();
      const deploy   = AZURE_DEPLOY.value();
      const apiKey   = AZURE_KEY.value();

      const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deploy}/chat/completions?api-version=2024-12-01-preview`;

      const fetch = (await import("node-fetch")).default;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      let resp;
      try {
        resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": apiKey,
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user",   content: userMessage  },
            ],
            max_completion_tokens: 1500,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!resp.ok) {
        const err = await resp.text();
        console.error("Azure error:", err);
        res.status(502).json({ error: "Erro na API Azure OpenAI" });
        return;
      }

      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content || "";
      res.status(200).json({ result: text });

    } catch (e) {
      console.error("Function error:", e);
      res.status(500).json({ error: "Erro interno ao processar a requisição." });
    }
  }
);
