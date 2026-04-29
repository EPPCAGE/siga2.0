# Configuração Local — EP·CAGE

## Pré-requisitos

- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- Conta no Firebase com acesso ao projeto `gesproc2`

---

## Credenciais

A aplicação precisa de duas credenciais para funcionar localmente:

| Variável | Origem |
|----------|--------|
| `FIREBASE_API_KEY` | Firebase Console → Configurações do Projeto → `apiKey` |
| `AI_FUNCTION_URL` | Google Cloud Console → Cloud Run → função `ai` → URL de invocação |

### Configuração via `config.local.js` (recomendado)

1. Crie o arquivo `config.local.js` na raiz do projeto (já está no `.gitignore`):

```javascript
window.CONFIG = {
  FIREBASE_API_KEY: 'sua-chave-api-aqui',
  AI_FUNCTION_URL: 'https://sua-funcao.a.run.app'
};
```

2. O arquivo é carregado automaticamente por `processos.html` e `projetos.html` quando presente.

---

## Rodando localmente

```bash
# Terminal 1 — Firebase Emulator (Firestore + Auth)
firebase emulators:start --project=gesproc2

# Terminal 2 — Servidor HTTP simples
python -m http.server 3000
```

Acesse: `http://localhost:3000/processos.html`

> **Atenção:** servidores como `python -m http.server` não têm fallback para `processos.html` ao acessar `/`. Acesse o arquivo diretamente pela URL.

---

## Deploy via CI/CD

Em produção, as credenciais são injetadas automaticamente pelo workflow `firebase-deploy.yml` via Secrets do GitHub. Não é necessário nenhum arquivo local para o deploy.

---

## Segurança

- **NUNCA** commite credenciais reais em `processos.html`, `.env` ou qualquer arquivo rastreado pelo Git
- `config.local.js` está no `.gitignore` — é seguro usar localmente
- Em produção, use os Secrets do GitHub Actions e do Google Cloud Secret Manager
