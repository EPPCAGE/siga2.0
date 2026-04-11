const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

// Chave guardada como Secret do Firebase (nunca exposta no código)
const AZURE_KEY      = defineSecret("AZURE_OPENAI_KEY");
const AZURE_ENDPOINT = defineSecret("AZURE_OPENAI_ENDPOINT");
const AZURE_DEPLOY   = defineSecret("AZURE_OPENAI_DEPLOYMENT");

exports.ai = onRequest(
  { secrets: [AZURE_KEY, AZURE_ENDPOINT, AZURE_DEPLOY], cors: true },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "https://eppcage.github.io");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")    { res.status(405).json({ error: "Method not allowed" }); return; }

    const { mode, payload } = req.body || {};
    if (!mode || !payload) {
      res.status(400).json({ error: "Campos obrigatórios: mode, payload" });
      return;
    }

    const SYSTEM = {
      analisar_bpmn: `Você é um especialista em BPM (Business Process Management) e análise de processos.
Analise o XML BPMN fornecido e retorne um JSON com:
{
  "gargalos": ["..."],
  "retrabalhos": ["..."],
  "gaps": ["..."],
  "oportunidades": ["..."],
  "complexidade": "Baixa|Media|Alta|Muito alta",
  "resumo": "texto curto com principais achados"
}
Responda APENAS com o JSON, sem markdown, sem texto adicional.`,

      gerar_pop: `Você é especialista em redação de Procedimentos Operacionais Padrão (POP) no padrão da administração pública brasileira.
Com base nas etapas do processo fornecidas, gere um texto estruturado para o POP com as seções:
1.0 Objetivo, 1.1 Definições, 1.2 Entradas, 1.3 Saídas, 2.0 Atividades (por responsável), 3.0 Documentos correlatos.
Seja objetivo, use linguagem formal e imperativa. Retorne como texto simples sem markdown.`,

      assistente: `Você é um assistente especializado em gestão de processos do Escritório de Processos da CAGE/Sefaz-RS.
Responda de forma clara, objetiva e em português brasileiro. Contexto do sistema: EP·CAGE é um sistema de mapeamento e gestão de processos institucionais seguindo metodologia BPM.
Limite suas respostas a 300 palavras.`,

      analisar_indicadores: `Você é especialista em análise de desempenho e indicadores de processos da administração pública.
Com base nos indicadores fornecidos, gere um comentário analítico conciso (máximo 150 palavras) destacando:
- Indicadores que merecem atenção (abaixo da meta)
- Tendências positivas
- Recomendação principal
Retorne APENAS o texto do comentário, sem título, sem markdown.`,

      gerar_ppt: `Você é especialista em gestão de processos e criação de apresentações executivas.
Com base nas informações do processo fornecidas, gere um JSON com o conteúdo para uma apresentação PowerPoint executiva sobre o mapeamento deste processo. Seja direto, profissional e conciso.
Retorne APENAS o JSON válido, sem markdown, sem texto adicional.`,

      extrair_pop: `Você é especialista em análise de documentos de gestão pública.
Analise o POP (Procedimento Operacional Padrão) fornecido e extraia as informações no formato JSON exato:
{"nome":"nome do processo","area":"área responsável","objetivo":"objetivo em uma frase","atores":["ator1","ator2"],"etapas":["etapa 1","etapa 2"]}
Retorne APENAS o JSON, sem texto adicional.`,
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

      const url = `${endpoint}/openai/deployments/${deploy}/chat/completions?api-version=2024-02-01`;

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
          temperature: 0.4,
          max_tokens: 1500,
        }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        console.error("Azure error:", err);
        res.status(502).json({ error: "Erro na API Azure OpenAI", detail: err });
        return;
      }

      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content || "";
      res.status(200).json({ result: text });

    } catch (e) {
      console.error("Function error:", e);
      res.status(500).json({ error: e.message });
    }
  }
);
