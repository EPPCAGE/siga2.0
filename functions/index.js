const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");

const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("node:crypto");

admin.initializeApp();


// ---------------------------------------------------------------------------
// Rate limiting — Firestore-backed sliding window counter.
// key:      document ID under rate_limits/ (must be Firestore-safe)
// maxCalls: maximum number of calls allowed within the window
// windowMs: window duration in milliseconds
// Returns true (allowed) or false (limit exceeded).
// Fails-open on Firestore errors to avoid blocking legitimate requests.
// ---------------------------------------------------------------------------
async function checkRateLimit(key, maxCalls, windowMs) {
  const db = admin.firestore();
  const ref = db.doc(`rate_limits/${key}`);
  const now = Date.now();
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists || now > snap.data().reset_at) {
        tx.set(ref, { count: 1, reset_at: now + windowMs });
        return true;
      }
      const { count } = snap.data();
      if (count >= maxCalls) return false;
      tx.update(ref, { count: count + 1 });
      return true;
    });
  } catch (e) {
    console.error("checkRateLimit error:", e);
    return true;
  }
}

function getClientIpHash(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded ? forwarded.split(",")[0].trim() : (req.ip || "unknown");
  return crypto.createHash("sha256").update(ip).digest("hex").substring(0, 16);
}

const ALLOWED_ORIGINS = new Set([
  "https://eppcage.com.br",
  "https://www.eppcage.com.br",
  "https://eppcage.github.io",
  "https://sigaepp.web.app",
  "https://sigaepp.firebaseapp.com",
]);

const AZURE_KEY      = defineSecret("AZURE_OPENAI_KEY");
const AZURE_ENDPOINT = defineSecret("AZURE_OPENAI_ENDPOINT");
const AZURE_DEPLOY   = defineSecret("AZURE_OPENAI_DEPLOYMENT");

const MAX_PAYLOAD_BYTES = 20 * 1024; // 20 KB

function setCorsHeaders(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Vary", "Origin");
}

async function verifyToken(req, res) {
  // Aceitar token do body (_token) ou do header Authorization
  let idToken = req.body?._token;
  
  // Se não veio no body, tentar pegar do header Authorization
  if (!idToken) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      idToken = authHeader.substring(7); // Remove "Bearer "
    }
  }
  
  if (!idToken) {
    res.status(401).json({ error: "Autenticação necessária" });
    return null;
  }
  
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: "Token inválido ou expirado" });
    return null;
  }
}

// ---------------------------------------------------------------------------
// checkEmail — verifica se um e-mail está cadastrado em config/usuarios.
// Endpoint público (sem auth): elimina a necessidade de leitura pública do
// Firestore para o fluxo de Primeiro Acesso.
// Retorna apenas {exists: boolean} — nunca expõe o documento completo.
// ---------------------------------------------------------------------------
exports.checkEmail = onRequest(async (req, res) => {
  setCorsHeaders(req, res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  // Throttle: 10 calls per 15 minutes per IP to prevent user enumeration
  const ipAllowed = await checkRateLimit(`email_${getClientIpHash(req)}`, 10, 15 * 60 * 1000);
  if (!ipAllowed) {
    res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
    return;
  }

  const email = req.body?.email;
  if (!email || typeof email !== "string" || email.length > 254) {
    res.status(400).json({ error: "Campo obrigatório: email" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const doc = await admin.firestore().doc("config/usuarios").get();
    if (!doc.exists) { res.status(200).json({ exists: false }); return; }
    const rawData = doc.data()?.data;
    const usuarios = typeof rawData === "string" ? JSON.parse(rawData) : [];
    const exists = Array.isArray(usuarios) && usuarios.some(u => u?.email === normalizedEmail);
    res.status(200).json({ exists });
  } catch (e) {
    console.error("checkEmail error:", e);
    res.status(500).json({ error: "Erro interno" });
  }
});

// ---------------------------------------------------------------------------
// setUserClaims — atribui Custom Claim {perfil} ao token do usuário autenticado.
// Deve ser chamado logo após o login. O cliente precisa renovar o ID Token
// (getIdToken(true)) após a resposta para que as regras do Firestore recebam
// o claim atualizado.
// ---------------------------------------------------------------------------
exports.setUserClaims = onRequest(async (req, res) => {
  setCorsHeaders(req, res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  const decoded = await verifyToken(req, res);
  if (!decoded) return;

  try {
    const doc = await admin.firestore().doc("config/usuarios").get();
    const rawData = doc.exists ? doc.data()?.data : null;
    const usuarios = typeof rawData === "string" ? JSON.parse(rawData) : [];
    const user = Array.isArray(usuarios)
      ? usuarios.find(u => u?.email === decoded.email)
      : null;

    const perfil = user?.perfil || "dono";
    await admin.auth().setCustomUserClaims(decoded.uid, { perfil });
    res.status(200).json({ ok: true, perfil });
  } catch (e) {
    console.error("setUserClaims error:", e);
    res.status(500).json({ error: "Erro interno" });
  }
});

// ---------------------------------------------------------------------------
// registerUser — cria conta Firebase Auth e registra em config/usuarios.
// Endpoint público (sem auth): o usuário ainda não está autenticado no momento
// do primeiro acesso. Validação por domínio de e-mail + rate limiting por IP.
// Retorna {status, senhaTemp?}:
//   "created"    — conta Auth criada, senhaTemp disponível para envio
//   "siga_added" — conta Auth já existia, usuário adicionado ao SIGA
//   "exists"     — usuário já estava no SIGA (nenhuma ação realizada)
// ---------------------------------------------------------------------------
function _generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(10);
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

exports.registerUser = onRequest(async (req, res) => {
  setCorsHeaders(req, res);
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  // Rate limit: 5 tentativas por hora por IP para prevenir abuso
  const ipAllowed = await checkRateLimit(`reg_${getClientIpHash(req)}`, 5, 60 * 60 * 1000);
  if (!ipAllowed) {
    res.status(429).json({ error: "Muitas tentativas de cadastro. Aguarde antes de tentar novamente." });
    return;
  }

  const { email, nome } = req.body || {};
  if (!email || typeof email !== "string" || email.length > 254) {
    res.status(400).json({ error: "Campo obrigatório: email" });
    return;
  }
  if (!nome || typeof nome !== "string" || nome.trim().length < 2) {
    res.status(400).json({ error: "Campo obrigatório: nome completo" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Lê domínios permitidos do Firestore (fallback para domínios padrão)
  let allowedDomains = ["sefaz.rs.gov.br", "cage.rs.gov.br"];
  try {
    const orgDoc = await admin.firestore().doc("config/org_config").get();
    if (orgDoc.exists) {
      const domains = orgDoc.data()?.allowedDomains;
      if (Array.isArray(domains) && domains.length > 0) allowedDomains = domains;
    }
  } catch (_) { /* usa fallback */ }

  const domain = normalizedEmail.split("@")[1] || "";
  if (!allowedDomains.includes(domain)) {
    res.status(403).json({ error: "Domínio de e-mail não autorizado para cadastro." });
    return;
  }

  try {
    const db = admin.firestore();
    const configDoc = await db.doc("config/usuarios").get();
    const rawData = configDoc.exists ? configDoc.data()?.data : null;
    const lista = typeof rawData === "string" ? JSON.parse(rawData) : [];

    // Já está no SIGA — nenhuma ação necessária
    if (Array.isArray(lista) && lista.some(u => u?.email === normalizedEmail)) {
      res.status(200).json({ status: "exists" });
      return;
    }

    // Tenta criar conta Firebase Auth
    let senhaTemp = null;
    let authStatus = "siga_added";
    try {
      senhaTemp = _generateTempPassword();
      await admin.auth().createUser({ email: normalizedEmail, password: senhaTemp });
      authStatus = "created";
    } catch (authErr) {
      if (authErr.code !== "auth/email-already-exists") throw authErr;
      // Conta Auth já existe — apenas registrar no SIGA
    }

    // Adiciona ao SIGA
    const palavras = nome.trim().split(/\s+/).filter(Boolean);
    const iniciais = (palavras.length >= 2
      ? palavras[0][0] + palavras[palavras.length - 1][0]
      : (palavras[0] || "?").slice(0, 2)).toUpperCase();

    const novoUsuario = {
      email: normalizedEmail,
      nome: palavras.join(" ") || normalizedEmail,
      perfil: "dono",
      perfis: ["dono", "gerente_projeto"],
      iniciais,
      macroprocessos_vinculados: [],
      processos_vinculados: [],
      trocar_senha: true,
    };

    const listaAtualizada = Array.isArray(lista) ? [...lista, novoUsuario] : [novoUsuario];
    await db.doc("config/usuarios").set({ data: JSON.stringify(listaAtualizada) });

    const result = { status: authStatus };
    if (senhaTemp) result.senhaTemp = senhaTemp;
    res.status(200).json(result);
  } catch (e) {
    console.error("registerUser error:", e);
    res.status(500).json({ error: "Erro interno ao criar acesso. Tente novamente ou contate o administrador." });
  }
});

// ---------------------------------------------------------------------------
// ai — proxy autenticado para Azure OpenAI.
// ---------------------------------------------------------------------------
exports.ai = onRequest(
  { secrets: [AZURE_KEY, AZURE_ENDPOINT, AZURE_DEPLOY] },
  async (req, res) => {
    setCorsHeaders(req, res);

    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

    const decoded = await verifyToken(req, res);
    if (!decoded) return;

    // Rate limit: 30 calls per hour per authenticated user
    const aiAllowed = await checkRateLimit(`ai_${decoded.uid}`, 30, 60 * 60 * 1000);
    if (!aiAllowed) {
      res.status(429).json({ error: "Limite de requisições atingido. Tente novamente em 1 hora." });
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
      analisar_bpmn: `Você é um especialista em BPM (Business Process Management) e análise de processos.\nAnalise o processo fornecido e retorne um JSON com:\n{\n  "gargalos": ["..."],\n  "retrabalhos": ["..."],\n  "gaps": ["..."],\n  "oportunidades": ["..."],\n  "complexidade": "Baixa|Media|Alta|Muito alta",\n  "resumo": "..."\n}\n\nINSTRUÇÕES PARA O CAMPO "resumo":\n- Escreva 2 a 3 frases em tom construtivo, encorajador e diplomático.\n- Comece reconhecendo o propósito ou o valor do processo para a organização.\n- Aponte 1 ou 2 oportunidades de melhoria, sempre enquadrando como potencial a explorar — nunca como falha ou problema grave.\n- Evite palavras negativas diretas como "falha", "ruim", "precário", "sério problema" ou "grave". Prefira "oportunidade", "ponto de atenção", "pode ser aprimorado", "há espaço para evoluir".\n- O dono do processo deve terminar de ler o resumo sentindo que seu trabalho é valorizado e que há caminhos claros de melhoria.\n\nResponda APENAS com o JSON, sem markdown, sem texto adicional.`,

      gerar_pop: `Você é especialista em redação de Procedimentos Operacionais Padrão (POP) no padrão da administração pública brasileira.\nCom base nas etapas do processo fornecidas, gere um texto estruturado para o POP com as seções:\n1.0 Objetivo, 1.1 Definições, 1.2 Entradas, 1.3 Saídas, 2.0 Atividades (por responsável), 3.0 Documentos correlatos.\nSe o payload incluir "gargalos_confirmados", "oportunidades_confirmadas" ou "solucoes_confirmadas", incorpore essas informações de forma natural no texto do POP: mencione os gargalos como pontos de atenção nas atividades relevantes, inclua as soluções e oportunidades como orientações ou boas práticas dentro das seções pertinentes. Não crie seções separadas para esses itens — integre-os ao corpo do POP.\nSeja objetivo, use linguagem formal e imperativa. Retorne como texto simples sem markdown.`,

      assistente: `Você é um assistente especializado em gestão de processos do Escritório de Processos da CAGE/Sefaz-RS.\nResponda de forma clara, objetiva e em português brasileiro. Contexto do sistema: EP·CAGE é um sistema de mapeamento e gestão de processos institucionais seguindo metodologia BPM.\nLimite suas respostas a 300 palavras.`,

      analisar_indicadores: `Você é especialista em análise de desempenho e indicadores de processos da administração pública.\nO payload pode conter um campo "nota_sisplan" com instruções sobre a convenção de preenchimento, e um array "indicadores".\n\nREGRAS DE DESCARTE — descarte COMPLETAMENTE estes indicadores (não os mencione de forma alguma):\n1. Indicadores com "aguardando_fechamento": true.\n2. Indicadores cujo "realizado" é null, undefined, vazio ou zero sem histórico preenchido.\n3. Indicadores com "sem_meta": true — estes não possuem meta definida e NÃO devem ser avaliados como positivos ou negativos em relação a metas.\n\nREGRAS DE INTERPRETAÇÃO:\n- O campo "polaridade" indica a direção desejada: "Maior é melhor" (padrão) ou "Menor é melhor".\n- O campo "unidade" indica a unidade de medida dos valores (ex: HORAS, DIAS, %, unidades). Use-o para interpretar e nomear corretamente os valores — nunca assuma uma unidade diferente da informada.\n- Para indicadores com "polaridade": "Menor é melhor", valores abaixo da meta são positivos.\n\nAnalise APENAS os indicadores que possuem dados válidos e meta definida. Com base neles, gere um comentário analítico conciso (máximo 150 palavras) destacando:\n- Indicadores que merecem atenção (abaixo da meta, considerando a polaridade)\n- Tendências positivas\n- Recomendação principal\nSe não houver nenhum indicador com dados válidos e meta definida, retorne apenas: "Nenhum indicador com dados disponíveis para análise neste período."\nRetorne APENAS o texto do comentário, sem título, sem markdown.`,

      extrair_pop: `Você é especialista em análise de documentos de gestão pública.\nAnalise o POP (Procedimento Operacional Padrão) fornecido e extraia as informações no formato JSON exato, sem markdown:\n{"nome":"nome do processo","area":"área responsável","objetivo":"objetivo em uma frase","atores":["ator1","ator2"],"etapas":[{"nome":"nome da etapa","tipo":"Atividade|Decisao|Evento","executor":"ator responsável pela etapa"}]}\nClassifique cada etapa:\n- "Atividade": tarefas, execuções, verificações, comunicações, registros (a maioria)\n- "Decisao": gateways, bifurcações, condicionais (ex: "Caso sim/não", "O processo está no escopo?")\n- "Evento": início e fim do processo\nO executor de cada etapa é o ator explicitamente responsável por ela no documento. Se não identificado, use "".\nInclua TODOS os elementos do fluxo, inclusive gateways e eventos de fim.\nRetorne APENAS o JSON válido, sem texto adicional.`,

      relatorio_auditoria: `Você é especialista em análise de aderência de processos da administração pública brasileira.\nCom base nos dados da análise de aderência fornecidos, elabore um Relatório Executivo de Análise de Aderência completo e profissional.\nUse sempre os termos "análise de aderência", "processo analisado", "equipe de análise" e "trabalho de análise" — nunca use "auditoria", "auditado" ou "auditor".\nRetorne APENAS um JSON válido (sem markdown, sem bloco de código) com a estrutura:\n{\n  "sumario": "Sumário executivo em 2-3 parágrafos descrevendo o processo analisado, o período e os principais resultados",\n  "conformidade_justificativa": "Justificativa objetiva para a conformidade geral atribuída",\n  "achados_resumo": ["achado resumido 1", "achado resumido 2"],\n  "recomendacoes": ["recomendação 1", "recomendação 2", "recomendação 3"],\n  "conclusao": "Parágrafo de conclusão com avaliação final e próximos passos"\n}`,

      gerar_questoes: `Você é especialista em análise de aderência de processos da administração pública brasileira.\nCom base no objetivo, escopo, critérios da análise de aderência e no conteúdo do processo mapeado fornecidos, gere uma lista de questões de análise relevantes e objetivas.\nUse sempre os termos "análise de aderência", "processo analisado" e "equipe de análise" — nunca use "auditoria", "auditado" ou "auditor".\nCada questão deve ser verificável, diretamente ligada a um critério e adequada ao contexto do processo.\nRetorne APENAS um JSON válido (sem markdown, sem bloco de código) com a estrutura:\n[\n  {"questao": "texto da questão", "criterio": "critério relacionado"},\n  ...\n]\nGere entre 8 e 15 questões cobrindo conformidade, desempenho, controles internos e evidências documentais.`,

      sugerir_achados: `Você é especialista em análise de aderência de processos da administração pública brasileira.\nCom base nas questões de análise e suas respectivas respostas fornecidas, identifique potenciais achados que possam ser confirmados pelo analista.\nUse sempre os termos "análise de aderência" e "processo analisado" — nunca use "auditoria" ou "auditado".\nGere achados APENAS para respostas que indiquem problema, lacuna ou oportunidade de melhoria. Se todas indicarem conformidade plena, retorne no máximo um achado do tipo Conformidade.\nRetorne APENAS um JSON válido (sem markdown) com a estrutura:\n[\n  {\n    "titulo": "título objetivo e direto do achado",\n    "tipo": "Não conformidade|Observação|Ponto de melhoria|Conformidade",\n    "descricao": "descrição da situação encontrada e possível causa (2-3 frases)",\n    "evidencia": "tipo de evidência documental ou observacional que sustenta o achado",\n    "criterio": "critério, norma ou boa prática relacionada, com recomendação de melhoria"\n  }\n]\nGere entre 1 e 6 achados. Seja preciso e objetivo — cada achado deve ser diretamente rastreável a uma ou mais respostas fornecidas.`,

      descrever_achado: `Você é especialista em análise de aderência de processos da administração pública brasileira.\nCom base no título e tipo do achado fornecidos, gere uma descrição técnica completa e profissional do apontamento.\nUse sempre os termos "análise de aderência" e "processo analisado" — nunca use "auditoria" ou "auditado".\nRetorne APENAS um JSON válido (sem markdown) com a estrutura:\n{\n  "descricao": "descrição detalhada da situação encontrada e possível causa (2-3 frases técnicas e objetivas)",\n  "evidencia": "sugestão de evidência documental ou observacional que poderia sustentar este achado",\n  "criterio": "critério, norma, regulamento ou boa prática relacionada, seguido de recomendação de melhoria"\n}`,

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
            max_completion_tokens: mode === 'extrair_pop' ? 4000 : 1500,
            ...( ["extrair_pop","analisar_bpmn","gerar_questoes","sugerir_achados","descrever_achado","relatorio_auditoria"].includes(mode)
              ? { response_format: { type: "json_object" } }
              : {} ),
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

// ---------------------------------------------------------------------------
// migrateAllUserClaims — Migra perfis de TODOS os usuários para Custom Claims.
// Esta função deve ser executada UMA VEZ após o primeiro deploy da Fase 1.
// Requer autenticação e perfil EP.
// ---------------------------------------------------------------------------
exports.migrateAllUserClaims = onCall(async (request) => {
  // Verificar autenticação (onCall faz automaticamente)
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  try {
    const db = admin.firestore();
    const doc = await db.doc("config/usuarios").get();
    const rawData = doc.exists ? doc.data()?.data : null;
    const usuarios = typeof rawData === "string" ? JSON.parse(rawData) : [];
    
    // Verificar se quem está chamando é EP
    const caller = Array.isArray(usuarios)
      ? usuarios.find(u => u?.email === request.auth.token.email)
      : null;

    if (caller?.perfil !== 'ep') {
      throw new HttpsError(
        'permission-denied',
        'Apenas usuários EP podem executar migração'
      );
    }

    // Processar todos os usuários
    const resultados = {
      total: usuarios.length,
      sucesso: 0,
      erros: 0,
      detalhes: []
    };

    for (const usuario of usuarios) {
      try {
        const { perfil, email } = usuario;
        
        if (!email) {
          resultados.erros++;
          resultados.detalhes.push({
            nome: usuario.nome || 'N/A',
            erro: 'E-mail ausente'
          });
          continue;
        }

        if (!perfil) {
          resultados.erros++;
          resultados.detalhes.push({
            email: email,
            erro: 'Perfil ausente'
          });
          continue;
        }

        // Buscar UID do Firebase Auth pelo e-mail
        let uid;
        try {
          const userRecord = await admin.auth().getUserByEmail(email);
          uid = userRecord.uid;
        } catch (authError) {
          resultados.erros++;
          resultados.detalhes.push({
            email: email,
            erro: `Usuário não encontrado no Firebase Auth: ${authError.message}`
          });
          continue;
        }

        // Setar Custom Claim
        await admin.auth().setCustomUserClaims(uid, { perfil });
        resultados.sucesso++;
        
        console.log(`Claim migrado: uid=${uid}, email=${email}, perfil=${perfil}`);
        
      } catch (error) {
        resultados.erros++;
        resultados.detalhes.push({
          email: usuario.email || 'N/A',
          erro: error.message
        });
        console.error(`Erro ao migrar usuário ${usuario.email}:`, error);
      }
    }

    console.log('Migração concluída:', resultados);

    // onCall retorna diretamente o objeto (não precisa de res.json)
    return {
      ok: true,
      resultados
    };

  } catch (error) {
    console.error('Erro na migração de claims:', error);
    throw new HttpsError(
      'internal',
      `Erro interno durante migração: ${error.message}`
    );
  }
});

