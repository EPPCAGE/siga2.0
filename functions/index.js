const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const AZURE_KEY      = defineSecret("AZURE_OPENAI_KEY");
const AZURE_ENDPOINT = defineSecret("AZURE_OPENAI_ENDPOINT");
const AZURE_DEPLOY   = defineSecret("AZURE_OPENAI_DEPLOYMENT");

exports.ai = onRequest(
  { secrets: [AZURE_KEY, AZURE_ENDPOINT, AZURE_DEPLOY] },
  async (req, res) => {
    // CORS — permite qualquer origem (segurança real está nos secrets do Azure)
    res.set("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

      const { mode, payload } = req.body || {};
      if (!mode || !payload) {
        res.status(400).json({ error: "Campos obrigat\u00f3rios: mode, payload" });
        return;
      }

      const SYSTEM = {
        analisar_bpmn: `Voc\u00ea \u00e9 um especialista em BPM (Business Process Management) e an\u00e1lise de processos.\nAnalise o XML BPMN fornecido e retorne um JSON com:\n{\n  "gargalos": ["..."],\n  "retrabalhos": ["..."],\n  "gaps": ["..."],\n  "oportunidades": ["..."],\n  "complexidade": "Baixa|Media|Alta|Muito alta",\n  "resumo": "texto curto com principais achados"\n}\nResponda APENAS com o JSON, sem markdown, sem texto adicional.`,

        gerar_pop: `Voc\u00ea \u00e9 especialista em reda\u00e7\u00e3o de Procedimentos Operacionais Padr\u00e3o (POP) no padr\u00e3o da administra\u00e7\u00e3o p\u00fablica brasileira.\nCom base nas etapas do processo fornecidas, gere um texto estruturado para o POP com as se\u00e7\u00f5es:\n1.0 Objetivo, 1.1 Defini\u00e7\u00f5es, 1.2 Entradas, 1.3 Sa\u00eddas, 2.0 Atividades (por respons\u00e1vel), 3.0 Documentos correlatos.\nSe o payload incluir "gargalos_confirmados", "oportunidades_confirmadas" ou "solucoes_confirmadas", incorpore essas informa\u00e7\u00f5es de forma natural no texto do POP: mencione os gargalos como pontos de aten\u00e7\u00e3o nas atividades relevantes, inclua as solu\u00e7\u00f5es e oportunidades como orienta\u00e7\u00f5es ou boas pr\u00e1ticas dentro das se\u00e7\u00f5es pertinentes. N\u00e3o crie se\u00e7\u00f5es separadas para esses itens \u2014 integre-os ao corpo do POP.\nSeja objetivo, use linguagem formal e imperativa. Retorne como texto simples sem markdown.`,

        assistente: `Voc\u00ea \u00e9 um assistente especializado em gest\u00e3o de processos do Escrit\u00f3rio de Processos da CAGE/Sefaz-RS.\nResponda de forma clara, objetiva e em portugu\u00eas brasileiro. Contexto do sistema: EP\u00b7CAGE \u00e9 um sistema de mapeamento e gest\u00e3o de processos institucionais seguindo metodologia BPM.\nLimite suas respostas a 300 palavras.`,

        analisar_indicadores: `Voc\u00ea \u00e9 especialista em an\u00e1lise de desempenho e indicadores de processos da administra\u00e7\u00e3o p\u00fablica.\nO payload pode conter um campo "nota_sisplan" com instru\u00e7\u00f5es sobre a conven\u00e7\u00e3o de preenchimento, e um array "indicadores".\nANTES de analisar, descarte COMPLETAMENTE os seguintes tipos de indicadores — n\u00e3o os mencione de forma alguma, nem positiva nem negativamente:\n1. Indicadores com "aguardando_fechamento": true (est\u00e3o nos 2 primeiros meses de um trimestre; o SISPLAN s\u00f3 registra resultados no \u00faltimo m\u00eas do trimestre).\n2. Indicadores cujo campo "realizado" \u00e9 null, undefined, vazio ou igual a zero E que n\u00e3o possuem nenhum dado hist\u00f3rico preenchido — esses indicadores ainda n\u00e3o foram alimentados e n\u00e3o devem ser interpretados como desempenho ruim.\nAnalise APENAS os indicadores que possuem dados v\u00e1lidos. Com base neles, gere um coment\u00e1rio anal\u00edtico conciso (m\u00e1ximo 150 palavras) destacando:\n- Indicadores que merecem aten\u00e7\u00e3o (abaixo da meta)\n- Tend\u00eancias positivas\n- Recomenda\u00e7\u00e3o principal\nSe n\u00e3o houver nenhum indicador com dados v\u00e1lidos, retorne apenas: "Nenhum indicador com dados dispon\u00edveis para an\u00e1lise neste per\u00edodo."\nRetorne APENAS o texto do coment\u00e1rio, sem t\u00edtulo, sem markdown.`,

        gerar_ppt: `Voc\u00ea \u00e9 especialista em gest\u00e3o de processos e cria\u00e7\u00e3o de apresenta\u00e7\u00f5es executivas.\nCom base nas informa\u00e7\u00f5es do processo fornecidas, gere um JSON com o conte\u00fado para uma apresenta\u00e7\u00e3o PowerPoint executiva sobre o mapeamento deste processo. Seja direto, profissional e conciso.\nRetorne APENAS o JSON v\u00e1lido, sem markdown, sem texto adicional.`,

        extrair_pop: `Voc\u00ea \u00e9 especialista em an\u00e1lise de documentos de gest\u00e3o p\u00fablica.\nAnalise o POP (Procedimento Operacional Padr\u00e3o) fornecido e extraia as informa\u00e7\u00f5es no formato JSON exato:\n{"nome":"nome do processo","area":"\u00e1rea respons\u00e1vel","objetivo":"objetivo em uma frase","atores":["ator1","ator2"],"etapas":["etapa 1","etapa 2"]}\nRetorne APENAS o JSON, sem texto adicional.`,

        relatorio_auditoria: `Voc\u00ea \u00e9 especialista em auditoria de processos da administra\u00e7\u00e3o p\u00fablica brasileira.\nCom base nos dados da auditoria fornecidos, elabore um Relat\u00f3rio Executivo de Auditoria de Processo completo e profissional.\nRetorne APENAS um JSON v\u00e1lido (sem markdown, sem bloco de c\u00f3digo) com a estrutura:\n{\n  "sumario": "Sum\u00e1rio executivo em 2-3 par\u00e1grafos descrevendo o processo auditado, o per\u00edodo e os principais resultados",\n  "conformidade_justificativa": "Justificativa objetiva para a conformidade geral atribu\u00edda",\n  "achados_resumo": ["achado resumido 1", "achado resumido 2"],\n  "recomendacoes": ["recomenda\u00e7\u00e3o 1", "recomenda\u00e7\u00e3o 2", "recomenda\u00e7\u00e3o 3"],\n  "conclusao": "Par\u00e1grafo de conclus\u00e3o com avalia\u00e7\u00e3o final e pr\u00f3ximos passos"\n}`,

        gerar_questoes: `Voc\u00ea \u00e9 especialista em auditoria de processos da administra\u00e7\u00e3o p\u00fablica brasileira.\nCom base no objetivo, escopo, crit\u00e9rios da auditoria e no conte\u00fado do processo mapeado fornecidos, gere uma lista de quest\u00f5es de auditoria relevantes e objetivas.\nCada quest\u00e3o deve ser verific\u00e1vel, diretamente ligada a um crit\u00e9rio e adequada ao contexto do processo.\nRetorne APENAS um JSON v\u00e1lido (sem markdown, sem bloco de c\u00f3digo) com a estrutura:\n[\n  {"questao": "texto da quest\u00e3o", "criterio": "crit\u00e9rio relacionado"},\n  ...\n]\nGere entre 8 e 15 quest\u00f5es cobrindo conformidade, desempenho, controles internos e evid\u00eancias documentais.`,

        gerar_faq: `Voc\u00ea \u00e9 especialista em gest\u00e3o de processos e comunica\u00e7\u00e3o institucional da administra\u00e7\u00e3o p\u00fablica brasileira.\nCom base nas informa\u00e7\u00f5es do processo fornecidas, gere entre 5 e 8 perguntas frequentes (FAQ) com suas respectivas respostas.\nAs perguntas devem refletir d\u00favidas reais de cidad\u00e3os ou servidores sobre o processo.\nFormato de sa\u00edda: apenas o texto puro, sem markdown, sem numeração extra, no padr\u00e3o:\nP: [pergunta]\nR: [resposta objetiva em at\u00e9 3 frases]\n\nRepita o bloco P/R para cada item.`,
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
  }
);
