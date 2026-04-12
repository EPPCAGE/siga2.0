# EP·CAGE — Gestão de Processos v2

Sistema web de mapeamento e gestão de processos institucionais com integração de IA (Azure OpenAI).

## 📁 Estrutura do Projeto

```
gesproc2.0/
├── index.html              # Front-end da aplicação
├── index.js                # Cloud Functions (Azure OpenAI integration)
├── package.json            # Dependências Node.js
├── firebase.json           # Configuração Firebase
├── .firebaserc             # Projeto Firebase
├── sonar-project.properties # Configuração SonarCloud
├── .env.example            # Template de variáveis de ambiente
├── config.local.js         # Template de config local (não commitado)
├── SETUP_LOCAL.md          # Guia de configuração local
├── README.md               # Este arquivo
├── .github/
│   └── workflows/
│       └── deploy-pages.yml # CI/CD: Deploy automático para GitHub Pages
└── functions/
    └── node_modules/       # Dependências das Cloud Functions
```

## 🚀 Deploy Automático

O projeto usa **GitHub Pages** para hosting com deploy automático:

1. Push para `main` → Workflow `deploy-pages.yml` executa
2. Credenciais injetadas dos Secrets do GitHub
3. Site publicado em: `https://eppcage.github.io/gesproc2.0/`

### Variáveis de Ambiente (Secrets)

Configure no GitHub: `Settings → Secrets and variables → Actions`

| Secret | Descrição |
|--------|-----------|
| `FIREBASE_API_KEY` | Chave API do Firebase |
| `AI_FUNCTION_URL` | URL da função Azure OpenAI |

## 🛠️ Desenvolvimento Local

Para rodar localmente com credenciais:

1. Copie as credenciais para `config.local.js`
2. Veja instruções em `SETUP_LOCAL.md`

## 📦 Dependências

- **Firebase Hosting**: UI e Realtime Database
- **Azure OpenAI**: Modelos de IA para análise
- **BPMN.js**: Visualização de diagramas de processos

## 🔐 Segurança

- ✅ Nenhuma credencial commitada
- ✅ Secrets gerenciados via GitHub
- ✅ Config local ignorada pelo Git (`.gitignore`)

## 📝 Licença

Interna - CAGE/Sefaz-RS
