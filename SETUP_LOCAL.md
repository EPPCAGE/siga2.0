# Configuração Local - EP·CAGE v2

## Variáveis de Ambiente

Para rodar a aplicação localmente com as funções de IA, você precisa configurar as credenciais do Firebase e Azure.

### Opção 1: Usando `config.local.js` (Recomendado para desenvolvimento)

1. Copie o arquivo de exemplo:
   ```bash
   cp config.local.js config.local.js
   ```

2. Edite `config.local.js` com suas credenciais:
   ```javascript
   window.CONFIG = {
     FIREBASE_API_KEY: 'sua-chave-api-aqui',
     AI_FUNCTION_URL: 'https://sua-funcao-cloud-run.a.run.app'
   };
   ```

3. No `index.html`, o script `config.local.js` será carregado automaticamente (se existir).

### Opção 2: Usando variáveis de ambiente

Você pode definir as variáveis de ambiente e carregá-las em tempo de deploy via CI/CD:
- `FIREBASE_API_KEY` → substitui `__FIREBASE_API_KEY__`
- `AI_FUNCTION_URL` → substitui `__AI_FUNCTION_URL__`

### Encontrando suas credenciais

**Firebase API Key:**
- Firebase Console → Configurações do Projeto → copie o `apiKey` do config JavaScript

**AI Function URL:**
- Google Cloud Console → Cloud Run → função `ai` → copie a URL de invocação

## Rodando localmente

```bash
# Inicie o Firebase Emulator e HTTP Server
firebase emulators:start --project=gesproc2

# Em outro terminal, inicie o servidor HTTP
python -m http.server 3000
```

Acesse: `http://localhost:3000`

## ⚠️ Segurança

- **NUNCA** commite credenciais reais em `index.html`, `.env`, ou arquivos rastreados
- `config.local.js` está no `.gitignore` e é seguro usar localmente
- Em produção, use variáveis de ambiente do seu host (Firebase Hosting, etc)
