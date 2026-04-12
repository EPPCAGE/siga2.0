# SIGA 2.0 — Sistema Integrado de Gestão Estratégica e Alinhamento

Sistema web single-file para mapeamento, auditoria e gestão estratégica de processos institucionais da CAGE/Sefaz-RS, com integração de IA (Azure OpenAI via Firebase Cloud Functions) e persistência em Firestore.

---

## Módulos

| Módulo | Perfis com acesso | Descrição |
|--------|-------------------|-----------|
| **Fila de tarefas** | Todos | Tarefas pendentes do usuário logado na pipeline |
| **Painel geral** | Todos | Dashboard com pipeline, pendências e resumo |
| **Processos em andamento** | Todos | Lista de processos em mapeamento |
| **Arquitetura de processos** | Todos | Macroprocesso → Processo → Subprocesso |
| **Indicadores (KPIs)** | Todos | Lista e gráficos de KPIs com filtros |
| **PAT** | EP | Plano Anual de Trabalho — atividades por trimestre |
| **Auditoria** | EP | Auditorias de conformidade por processo |
| **Metodologias** | Todos | Publicações e documentos do EP |
| **Notificações** | Todos | Histórico de notificações e config EmailJS |
| **Administração** | EP | Cadastro de usuários, perfis e vínculos |

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

## Perfis de Usuário

| Perfil | Código | Acesso |
|--------|--------|--------|
| Escritório de Processos | `ep` | Total — gerencia todos os processos e módulos |
| Dono de processo | `dono` | Vê apenas processos onde é dono ou interessado |
| Gestor / Adjunto | `gestor` | Acesso de leitura + etapas de aprovação |
| Patrocinador | `patrocinador` | Etapa de aprovação do patrocinador |

---

## Integrações de IA (Azure OpenAI)

A Cloud Function `functions/index.js` expõe o endpoint `/ai` com os seguintes modos:

| Modo | Uso |
|------|-----|
| `analisar_bpmn` | Analisa XML BPMN e retorna JSON com gargalos, oportunidades, complexidade |
| `gerar_pop` | Gera texto estruturado de POP a partir das etapas do processo |
| `assistente` | Assistente geral de gestão de processos (inclui geração de riscos) |
| `analisar_indicadores` | Comentário analítico sobre KPIs |
| `gerar_ppt` | Gera JSON para apresentação PowerPoint executiva |
| `extrair_pop` | Extrai metadados de um POP existente |
| `relatorio_auditoria` | Gera relatório executivo de auditoria em JSON |

---

## Persistência — Firestore

| Coleção | Conteúdo |
|---------|----------|
| `processos/{id}` | Dados completos de cada processo em mapeamento |
| `kpis/{id}` | Indicadores de desempenho |
| `publicacoes/{id}` | Metodologias e documentos publicados |
| `plano/{id}` | Atividades do Plano Anual de Trabalho (PAT) |
| `config/arquitetura` | JSON da arquitetura de processos (macros/processos/subprocessos) |
| `config/usuarios` | Cadastro de usuários e perfis |
| `config/mapeados` | Set de processos marcados como mapeados manualmente |
| `config/criticos` | Set de processos marcados como críticos manualmente |
| `config/ejs` | Credenciais EmailJS para envio de notificações |

---

## Estrutura do Projeto

```
gesproc2.0/
├── index.html              # Front-end completo da aplicação (~6000 linhas)
├── functions/
│   └── index.js            # Cloud Function Firebase (Azure OpenAI proxy)
├── firebase.json           # Configuração Firebase Hosting + Functions
├── .firebaserc             # Projeto Firebase (gesproc2)
├── package.json            # Dependências
├── sonar-project.properties # Configuração SonarCloud
├── config.local.js         # Credenciais locais (não commitado)
├── SETUP_LOCAL.md          # Guia de configuração local
└── .github/
    └── workflows/
        └── deploy-pages.yml # CI/CD: Deploy automático para GitHub Pages
```

---

## Deploy

### Produção (GitHub Pages)

Push para `main` → workflow `deploy-pages.yml` executa automaticamente:
1. Injeta credenciais dos Secrets do GitHub no `index.html`
2. Publica em: `https://eppcage.github.io/gesproc2.0/`

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

Acesse: `http://localhost:3000`

---

## Tecnologias

- **Firebase Firestore** — banco de dados NoSQL
- **Firebase Hosting** — hospedagem estática
- **Azure OpenAI** — modelos de linguagem para análise e geração de conteúdo
- **BPMN.js** — modelagem de diagramas de processo
- **Chart.js** — gráficos de indicadores
- **EmailJS** — envio de notificações por e-mail

---

## Segurança

- Nenhuma credencial commitada no repositório
- Secrets gerenciados via GitHub Actions e Google Cloud Secret Manager
- `config.local.js` ignorado pelo Git
- CORS restrito às origens permitidas na Cloud Function

---

Interno — CAGE/Sefaz-RS
