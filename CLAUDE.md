# SIGA 2.0 — Guia para Desenvolvimento

Sistema de Gestão de Processos Institucionais do EP·CAGE (CAGE/Sefaz-RS).
Firebase Hosting + Firestore + Cloud Functions (Node.js 20) + Azure OpenAI.

**Repositório:** https://dev.azure.com/sefaz-rs/siga/_git/siga2.0
**Branches:** `main` (produção) → `hml` (homologação) → `dev` (desenvolvimento)
Todo desenvolvimento parte de uma branch de feature para `dev` via Pull Request.

## Estrutura de arquivos

```
siga2.0/
├── processos.html          # Módulo principal (monolito, ~18 mil linhas)
├── projetos.html           # Módulo de projetos (~1.3 mil linhas)
├── projetos-logic.js       # Lógica exclusiva do módulo de projetos
├── projetos.shared.js      # Funções compartilhadas do módulo de projetos
├── styles.css              # CSS compartilhado entre módulos
├── src/
│   ├── shared/             # Camada reutilizável entre módulos
│   │   ├── tenant-config.js          # Paths multi-tenant (habilitável via CONFIG)
│   │   ├── org-config.js             # Branding e config institucional
│   │   ├── firebase-helpers.js       # Inicialização Firebase e refs
│   │   └── firestore-repositories.js # Repositórios de dados (acesso ao Firestore)
│   └── processos/          # Módulos extraídos do monolito processos.html
│       ├── app-constants.js          # Enums, labels e cores (PERFIL, STATUS etc.)
│       ├── module-hub-controller.js  # Controle do hub central (seleção de módulo)
│       ├── org-branding.js           # Aplicação de branding institucional na UI
│       ├── security-utils.js         # esc(), safeUrl() — sanitização de HTML/URLs
│       └── storage-utils.js          # Acesso seguro ao localStorage
├── functions/
│   └── index.js            # Cloud Function: proxy Azure OpenAI (autenticado)
├── config/
│   ├── config.example.js   # Template de configuração — copiar para config.local.js
│   └── README.md           # Como configurar localmente
├── firestore.rules         # Regras de segurança do Firestore
├── storage.rules           # Regras de segurança do Cloud Storage
├── firebase.json           # Configuração Firebase (hosting, functions, firestore)
├── docs/                   # Documentação de arquitetura, segurança e deploy
└── tests/e2e/              # Testes E2E com Playwright
```

## Configuração local

Ver `SETUP_LOCAL.md`. Resumo:
1. Copiar `config/config.example.js` para `config/config.local.js` e preencher
2. Iniciar Firebase Emulator: `firebase emulators:start`
3. Servir arquivos: `npx serve .` ou `python3 -m http.server`

Nunca commitar `config.local.js` — está no `.gitignore`.

## Perfis de usuário

| Perfil            | Constante           | Acesso                                |
|-------------------|---------------------|---------------------------------------|
| `ep`              | `PERFIL.EP`         | Admin completo                        |
| `dono`            | `PERFIL.DONO`       | Processos próprios                    |
| `gestor`          | `PERFIL.GESTOR`     | Leitura + aprovação                   |
| `gerente_projeto` | `PERFIL.GERENTE_PROJETO` | Módulo de projetos vinculados   |

Perfis definidos em `src/processos/app-constants.js`. Verificação de perfil via
`isEP()`, `isDono()`, `isGestor()` — funções globais em `processos.html`.

## Coleções Firestore

| Coleção          | Conteúdo                            |
|------------------|-------------------------------------|
| `processos`      | Mapeamentos (todas as etapas)       |
| `kpis`           | Indicadores de desempenho           |
| `trilhas`        | Trilhas de capacitação              |
| `publicacoes`    | Metodologias publicadas             |
| `plano`          | PAT — Plano Anual de Trabalho       |
| `plano_metas`    | Metas estratégicas                  |
| `arquitetura`    | Árvore: macroprocesso → subprocesso |
| `config/usuarios`| Cadastro de usuários e perfis       |
| `config/ejs`     | Credenciais EmailJS                 |
| `sessions/{uid}` | Sessão do usuário (idle timeout)    |
| `projPROJETOS`   | Portfólio de projetos               |
| `projPROGRAMAS`  | Programas (agrupamento de projetos) |

Acesso via repositórios em `src/shared/firestore-repositories.js`:
```js
await processosRepository.list()
await kpisRepository.get('id')
await configRepository.get('usuarios')
```

## Cloud Function `/ai`

Proxy autenticado para Azure OpenAI. Requer token Firebase no body (`_token`).
Modos disponíveis: `analisar_bpmn`, `gerar_pop`, `assistente`, `analisar_indicadores`,
`gerar_ppt`, `extrair_pop`, `relatorio_auditoria`, `gerar_questoes`, `gerar_faq`.

Segredos gerenciados via Google Cloud Secret Manager (não em variáveis de ambiente).

## Deploy

CI/CD automático via GitHub Actions ao fazer push em `main`.
Ver `.github/workflows/firebase-deploy.yml`.

Segredos necessários no repositório GitHub:
- `FIREBASE_API_KEY`
- `AI_FUNCTION_URL`
- `FIREBASE_SERVICE_ACCOUNT`

## Testes E2E

```bash
npm run test:e2e:smoke       # Navegação básica e login
npm run test:e2e:projetos    # Módulo de projetos
npm run test:e2e:mapeamento  # Fluxo completo de mapeamento
```

Requer variáveis de ambiente `TEST_EMAIL` e `TEST_PASSWORD`.

## Convenções de código

- Módulos em `src/` usam IIFE com `(function init...(globalScope){...})(globalThis)`
  para manter compatibilidade com handlers inline (`onclick="fn()"`) no HTML monolítico.
- Sanitize sempre saídas HTML com `esc(valor)` de `security-utils.js`.
- Sanitize URLs com `safeUrl(url)` — aceita apenas `https://`.
- Dados para o Firestore passam por `_fsClean()` para prevenir prototype pollution.
- Nunca adicionar `console.log` de debug em produção.

## Dívidas técnicas conhecidas

Ver `docs/architecture/` para roadmap de modularização.
Ver `firestore.rules` para dívidas de segurança documentadas nas regras.

Principais pendências:
1. `processos.html` (~18 mil linhas) precisa ser dividido em módulos ES em `src/processos/`
2. Regras Firestore precisam de Custom Claims para enforcement de perfil server-side
3. Leitura pública de `config/` precisa ser migrada para Cloud Function anônima
