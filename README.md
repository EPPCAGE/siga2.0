# EP·CAGE — Sistema Integrado de Gestão Estratégica e Alinhamento

Sistema web para mapeamento, auditoria e gestão estratégica de processos e projetos institucionais da CAGE/Sefaz-RS, com integração de IA (Azure OpenAI via Firebase Cloud Functions) e persistência em Firestore.

---

## Módulos

O sistema possui dois módulos independentes acessados a partir de um hub central:

| Módulo | Arquivo | Perfis com acesso |
|--------|---------|-------------------|
| **SIGA Processos** | `processos.html` | EP, Dono de Processo, Gestor |
| **SIGA Projetos** | `projetos.html` | EP, Gerente de Projeto |

Usuários com perfil `ep` têm acesso total a ambos os módulos. Usuários podem ter múltiplos perfis simultaneamente (ex.: Dono de Processo + Gerente de Projeto).

### Funcionalidades do SIGA Processos

| Seção | Perfis | Descrição |
|-------|--------|-----------|
| Fila de tarefas | Todos | Tarefas pendentes do usuário logado na pipeline |
| Painel geral | Todos | Dashboard com pipeline, pendências e resumo |
| Processos em andamento | Todos | Lista de processos em mapeamento |
| Arquitetura de processos | Todos | Macroprocesso → Processo → Subprocesso |
| Indicadores (KPIs) | Todos | KPIs com filtros, importação xlsx e sincronização com Google Sheets |
| Trilhas de capacitação | Todos | Trilhas por nível e competência, vinculadas à arquitetura |
| FAQ | Todos | Perguntas e respostas frequentes |
| PAT | EP | Plano Anual de Trabalho — atividades por trimestre |
| Auditoria | EP | Auditorias de conformidade por processo |
| Metodologias | Todos | Publicações e documentos do EP |
| Notificações | Todos | Histórico de notificações e config EmailJS |
| Administração | EP | Cadastro de usuários, perfis e vínculos |
| Avisos | EP | Gerenciamento de avisos institucionais |

---

## Perfis de Usuário

| Perfil | Código | Módulo | Descrição |
|--------|--------|--------|-----------|
| Escritório de Processos | `ep` | Ambos | Acesso total a todos os módulos e funcionalidades |
| Dono de Processo | `dono` | SIGA Processos | Vê apenas processos onde é dono ou interessado |
| Gestor / Adjunto | `gestor` | SIGA Processos | Acesso de leitura + etapas de aprovação |
| Gerente de Projeto | `gerente_projeto` | SIGA Projetos | Visualização e edição de tarefas delegadas |

Um mesmo usuário pode ter múltiplos perfis. O campo `perfis` no Firestore armazena um array; o campo legado `perfil` mantém o primeiro perfil para retrocompatibilidade.

### Primeiro acesso

Usuários criados pelo EP recebem `trocar_senha: true` no cadastro. Ao fazer login pela primeira vez, um modal bloqueia o acesso aos módulos e exige:
1. Definição de uma senha definitiva (mín. 6 caracteres)
2. Seleção do(s) perfil(is) de acesso (para usuários não-EP)

O hub de módulos só é exibido após a conclusão desse fluxo.

---

## Pipeline de Mapeamento

Cada processo percorre as seguintes etapas na ordem:

```
abertura → reuniao → riscos → questionario → esboco → det_etapas
→ analise_asis → valid_dono → desenho_final → aprovacao → pop
→ complement → apresentacao → publicacao → acompanha → auditoria
```

| Etapa | Fase | Responsável |
|-------|------|-------------|
| Abertura | Entendimento | EP |
| Reunião de entendimento (SIPOC) | Entendimento | EP |
| Identificação de riscos | Entendimento | EP |
| Questionário de maturidade | Entendimento | Dono |
| Esboço AS IS / TO BE | Modelagem | EP |
| Detalhamento de etapas | Modelagem | EP |
| Análise AS IS | Modelagem | EP |
| Validação com dono | Modelagem | Dono |
| Desenho final | Modelagem | EP |
| Aprovação | Formalização | EP |
| Construção POP | Formalização | EP |
| Complemento do dono | Formalização | Dono |
| Aprovação do patrocinador | Formalização | Patrocinador |
| Publicação | Formalização | EP |
| Acompanhamento | Operação | EP |
| Auditoria | Operação | EP |

---

## Indicadores (KPIs)

### Origens

| Origem | Descrição |
|--------|-----------|
| `manual` | Criado diretamente na interface |
| `importado` | Importado via arquivo `.xlsx` |
| `importado_editado` | Importado via xlsx e editado manualmente — não sobrescrito em re-importações |
| `gsheets` | Sincronizado via Google Sheets |
| `gsheets_editado` | Sincronizado via Google Sheets e editado manualmente — não sobrescrito em re-sincronizações |

### Regras de persistência

- Ao editar qualquer campo de um indicador importado ou sincronizado, a origem é promovida para `importado_editado` ou `gsheets_editado`.
- Re-importações e re-sincronizações ignoram períodos já promovidos, preservando edições manuais.
- **Limpar importados** remove `importado` e `gsheets`/`gsheets_editado`, mas mantém `importado_editado` e `manual`.

### Indicadores PPE

Indicadores marcados como PPE (Produto ou Processo Estratégico) recebem a etiqueta **PPE** no relatório PDF executivo.

### Relatório PDF

Gerado a partir da análise de IA, exibe:
- Cards de taxa de atingimento por área
- Comentário executivo gerado por IA
- Tabela de indicadores ordenada por Área → Nome → Período (cronológico), com etiqueta PPE

---

## Integrações de IA (Azure OpenAI)

A Cloud Function `functions/index.js` expõe o endpoint `/ai` com os seguintes modos:

| Modo | Uso |
|------|-----|
| `analisar_bpmn` | Analisa XML BPMN e retorna JSON com gargalos, oportunidades e complexidade |
| `gerar_pop` | Gera texto estruturado de POP a partir das etapas do processo |
| `assistente` | Assistente geral de gestão de processos (inclui geração de riscos) |
| `analisar_indicadores` | Comentário analítico executivo sobre KPIs (base para o relatório PDF) |
| `gerar_ppt` | Gera JSON para apresentação PowerPoint executiva |
| `extrair_pop` | Extrai metadados de um POP existente |
| `relatorio_auditoria` | Gera relatório executivo de auditoria em JSON |
| `gerar_questoes` | Gera lista de questões de auditoria com base no escopo |
| `gerar_faq` | Gera FAQ do processo para publicação |

Todas as chamadas requerem um Firebase ID token no campo `_token` do body (verificado no servidor).

---

## Persistência — Firestore

| Coleção | Conteúdo |
|---------|----------|
| `processos/{id}` | Dados completos de cada processo em mapeamento |
| `kpis/{id}` | Indicadores de desempenho (origem, meta, realizado, vínculo com processo) |
| `trilhas/{id}` | Trilhas de capacitação (níveis, competências, cursos e processos vinculados) |
| `publicacoes/{id}` | Metodologias e documentos publicados |
| `plano/{id}` | Atividades do Plano Anual de Trabalho (PAT) |
| `config/arquitetura` | JSON da arquitetura de processos (macros/processos/subprocessos) |
| `config/usuarios` | Cadastro de usuários e perfis |
| `config/mapeados` | Set de processos marcados como mapeados manualmente |
| `config/criticos` | Set de processos marcados como críticos manualmente |
| `config/ejs` | Credenciais EmailJS para envio de notificações |
| `config/last_modified` | Sentinela de edição simultânea — atualizado a cada `fbSaveAll()` |

### Detecção de edição simultânea

Ao carregar os dados (`fbLoad`), o sistema registra o timestamp local. A cada salvamento, o documento `config/last_modified` é atualizado com o timestamp e o e-mail do usuário que salvou. Um listener `onSnapshot` em todas as sessões abertas detecta atualizações externas: se o timestamp remoto for mais recente que o carregamento local, um banner de alerta é exibido permitindo recarregar do servidor ou manter os dados locais.

---

## Segurança e UX

- **Auto-logout**: sessão encerrada automaticamente após 5 minutos de inatividade. Um aviso aparece 30 segundos antes, com opção de continuar conectado.
- **Primeiro acesso**: modal obrigatório bloqueia o hub até que o usuário defina senha definitiva e selecione o(s) perfil(is).
- **Controle de acesso por módulo**: o hub exibe apenas os cards dos módulos acessíveis ao perfil do usuário; tentativas de acesso direto via código são bloqueadas.

---

## Estrutura do Projeto

```
siga2.0/
├── processos.html           # SIGA Processos — front-end completo (~15 000 linhas)
├── projetos.html            # SIGA Projetos — front-end completo (~1 200 linhas)
├── scripts.js               # Lógica de negócio compartilhada (~13 700 linhas)
├── styles.css               # CSS compartilhado
├── fonts/                   # Fontes woff2 e fonts.css
├── logo-siga.png            # Logo da aplicação
├── functions/
│   ├── index.js             # Cloud Function (Azure OpenAI proxy com auth)
│   ├── package.json         # Dependências das functions
│   └── package-lock.json
├── firebase.json            # Configuração Firebase Hosting + Firestore + Functions
├── firestore.rules          # Regras de segurança do Firestore
├── .firebaserc              # ID do projeto Firebase
├── sonar-project.properties # Configuração SonarCloud
├── config.local.js          # Credenciais locais (não commitado — ver SETUP_LOCAL.md)
└── .github/
    └── workflows/
        ├── firebase-deploy.yml  # Deploy para Firebase Hosting
        └── codeql.yml           # Análise estática de segurança
```

---

## Deploy

### Firebase Hosting (produção)

Push para `main` → workflow `firebase-deploy.yml` executa automaticamente:
1. Injeta credenciais dos Secrets do GitHub em `processos.html`
2. Publica em: `https://sigaepp.web.app`

**Secrets necessários no GitHub** (`Settings → Secrets and variables → Actions`):

| Secret | Descrição |
|--------|-----------|
| `FIREBASE_API_KEY` | Chave API do Firebase |
| `AI_FUNCTION_URL` | URL da Cloud Function (Azure OpenAI proxy) |

### Cloud Functions

```bash
cd functions
firebase deploy --only functions --project=gesproc2
```

**Secrets necessários no Firebase** (Google Cloud Secret Manager):

| Secret | Descrição |
|--------|-----------|
| `AZURE_OPENAI_KEY` | Chave da API Azure OpenAI |
| `AZURE_OPENAI_ENDPOINT` | Endpoint Azure (ex: `https://xxx.openai.azure.com`) |
| `AZURE_OPENAI_DEPLOYMENT` | Nome do deployment (ex: `gpt-4o`) |

---

## Desenvolvimento Local

Veja `SETUP_LOCAL.md` para instruções completas.

```bash
# Terminal 1 — Firebase Emulator (Firestore)
firebase emulators:start --project=gesproc2

# Terminal 2 — Servidor HTTP
python -m http.server 3000
```

Acesse: `http://localhost:3000/processos.html`

---

## Tecnologias

- **Firebase Firestore** — banco de dados NoSQL em tempo real
- **Firebase Hosting** — hospedagem estática com CDN
- **Firebase Auth** — autenticação de usuários
- **Azure OpenAI** — modelos de linguagem para análise e geração de conteúdo
- **BPMN.js** — modelagem de diagramas de processo
- **Chart.js** — gráficos de indicadores
- **EmailJS** — envio de notificações por e-mail
- **XLSX.js** — importação de planilhas
- **PptxGenJS** — exportação de apresentações PowerPoint
- **Mammoth.js** — leitura de documentos Word (.docx)

---

## Segurança

- Nenhuma credencial commitada no repositório
- Secrets gerenciados via GitHub Actions e Google Cloud Secret Manager
- `config.local.js` ignorado pelo Git
- CORS restrito às origens permitidas na Cloud Function
- Firebase ID token verificado no servidor antes de cada chamada de IA
- Firestore Rules restringem leitura/escrita por autenticação

---

Interno — CAGE/Sefaz-RS
