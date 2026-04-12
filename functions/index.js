const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const ALLOWED_ORIGINS = [
  "https://eppcage.github.io",
  "http://localhost:3000",
  "http://localhost:5000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5000",
];
const corsMiddleware = require("cors")({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, same-origin server calls)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error("CORS: origin not allowed"));
  },
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
});

const AZURE_KEY      = defineSecret("AZURE_OPENAI_KEY");
const AZURE_ENDPOINT = defineSecret("AZURE_OPENAI_ENDPOINT");
const AZURE_DEPLOY   = defineSecret("AZURE_OPENAI_DEPLOYMENT");

exports.ai = onRequest(
  { secrets: [AZURE_KEY, AZURE_ENDPOINT, AZURE_DEPLOY] },
  (req, res) => {
    corsMiddleware(req, res, async () => {
      if (req.method === "OPTIONS") { res.status(204).send(""); return; }
      if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

      const { mode, payload } = req.body || {};
      if (!mode || !payload) {
        res.status(400).json({ error: "Campos obrigat\u00f3rios: mode, payload" });
        return;
      }

      const SYSTEM = {
        analisar_bpmn: `Voc\u00ea \u00e9 um especialista em BPM (Business Process Management) e an\u00e1lise de processos.\nAnalise o XML BPMN fornecido e retorne um JSON com:\n{\n  "gargalos": ["..."],\n  "retrabalhos": ["..."],\n  "gaps": ["..."],\n  "oportunidades": ["..."],\n  "complexidade": "Baixa|Media|Alta|Muito alta",\n  "resumo": "texto curto com principais achados"\n}\nResponda APENAS com o JSON, sem markdown, sem texto adicional.`,

        gerar_pop: `Voc\u00ea \u00e9 especialista em reda\u00e7\u00e3o de Procedimentos Operacionais Padr\u00e3o (POP) no padr\u00e3o da administra\u00e7\u00e3o p\u00fablica brasileira.\nCom base nas etapas do processo fornecidas, gere um texto estruturado para o POP com as se\u00e7\u00f5es:\n1.0 Objetivo, 1.1 Defini\u00e7\u00f5es, 1.2 Entradas, 1.3 Sa\u00eddas, 2.0 Atividades (por respons\u00e1vel), 3.0 Documentos correlatos.\nSeja objetivo, use linguagem formal e imperativa. Retorne como texto simples sem markdown.`,

        assistente: `Voc\u00ea \u00e9 um assistente especializado em gest\u00e3o de processos do Escrit\u00f3rio de Processos da CAGE/Sefaz-RS.\nResponda de forma clara, objetiva e em portugu\u00eas brasileiro. Contexto do sistema: EP\u00b7CAGE \u00e9 um sistema de mapeamento e gest\u00e3o de processos institucionais seguindo metodologia BPM.\nLimite suas respostas a 300 palavras.`,

        analisar_indicadores: `Voc\u00ea \u00e9 especialista em an\u00e1lise de desempenho e indicadores de processos da administra\u00e7\u00e3o p\u00fablica.\nCom base nos indicadores fornecidos, gere um coment\u00e1rio anal\u00edtico conciso (m\u00e1ximo 150 palavras) destacando:\n- Indicadores que merecem aten\u00e7\u00e3o (abaixo da meta)\n- Tend\u00eancias positivas\n- Recomenda\u00e7\u00e3o principal\nRetorne APENAS o texto do coment\u00e1rio, sem t\u00edtulo, sem markdown.`,

        gerar_ppt: `Voc\u00ea \u00e9 especialista em gest\u00e3o de processos e cria\u00e7\u00e3o de apresenta\u00e7\u00f5es executivas.\nCom base nas informa\u00e7\u00f5es do processo fornecidas, gere um JSON com o conte\u00fado para uma apresenta\u00e7\u00e3o PowerPoint executiva sobre o mapeamento deste processo. Seja direto, profissional e conciso.\nRetorne APENAS o JSON v\u00e1lido, sem markdown, sem texto adicional.`,

        extrair_pop: `Voc\u00ea \u00e9 especialista em an\u00e1lise de documentos de gest\u00e3o p\u00fablica.\nAnalise o POP (Procedimento Operacional Padr\u00e3o) fornecido e extraia as informa\u00e7\u00f5es no formato JSON exato:\n{"nome":"nome do processo","area":"\u00e1rea respons\u00e1vel","objetivo":"objetivo em uma frase","atores":["ator1","ator2"],"etapas":["etapa 1","etapa 2"]}\nRetorne APENAS o JSON, sem texto adicional.`,
      };

      const systemPrompt = SYSTEM[mode];
      if (!systemPrompt) {
        res.status(400).json({ error: `Mode inv\u00e1lido: ${mode}` });
        return;
      }

      const userMessage = typeof payload === "string" ? payload : JSON.stringify(payload);

      try {
        const endpoint = AZURE_ENDPOINT.value();
        const deploy   = AZURE_DEPLOY.value();
        const apiKey   = AZURE_KEY.value();

        const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deploy}/chat/completions?api-version=2024-12-01-preview`;

        const fetch = (await import("node-fetch")).default;
        const resp = await fetch(url, {
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
        });

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
    });
  }
);
