# Changelog — Fase 1: Segurança

## Data: 11/05/2026

### Resumo

Implementação da Fase 1 de melhorias de segurança com foco em **Custom Claims** e preparação para regras Firestore server-side robustas. **Nenhum dado foi alterado ou removido.**

---

## 🆕 Adições

### Cloud Functions

1. **`migrateAllUserClaims`** (NOVA)
   - Migra perfis de todos os usuários para Custom Claims de uma vez
   - Requer autenticação e perfil EP
   - Retorna relatório detalhado de sucesso/erros
   - Arquivo: `functions/index.js`

### Documentação

1. **`docs/security/FASE1-MIGRACAO-SEGURANCA.md`** (NOVO)
   - Guia completo de execução da Fase 1
   - Checklist de validação
   - Roteiro passo a passo sem risco

2. **`docs/security/firestore-enhanced.rules.example`** (NOVO)
   - Regras Firestore melhoradas com validação de perfil
   - Pronto para usar na Fase 2
   - Comentários explicativos em cada coleção

3. **`docs/security/CHANGELOG-FASE1.md`** (NOVO)
   - Este arquivo

### Storage Rules

1. **Validação de tamanho de arquivo** (`storage.rules`)
   - Limite de 20 MB por arquivo
   - Previne uploads excessivos
   - Mantém compatibilidade total

---

## ✅ Funcionalidades já existentes (mantidas)

1. **`checkEmail`** — já estava implementada
2. **`setUserClaims`** — já estava implementada
3. Todas as regras Firestore atuais — **mantidas sem alteração**

---

## 🔄 Alterações

### `functions/index.js`

**Adicionado:**
- Função `migrateAllUserClaims` (linhas ~290-360)

**Não alterado:**
- `checkEmail` (mantida como estava)
- `setUserClaims` (mantida como estava)
- `ai` (mantida como estava)

### `storage.rules`

**Antes:**
```javascript
allow read, write: if request.auth != null;
```

**Depois:**
```javascript
function validSize() {
  return request.resource.size < 20 * 1024 * 1024;  // 20 MB
}

match /projetos/{allPaths=**} {
  allow read: if isAuth();
  allow write: if isAuth() && validSize();
}
// ... demais coleções com validSize()
```

**Impacto:** Uploads maiores que 20 MB serão rejeitados. Isso protege a cota de Storage.

---

## ⚠️ Não alterado (mantido como estava)

### `firestore.rules`

**Status:** Mantido exatamente como estava.

**Motivo:** Custom Claims precisam ser migrados para TODOS os usuários antes de enforçar validação server-side.

**Próximo passo (Fase 2):** Após validar que todos os usuários têm claims corretos, substituir por `firestore-enhanced.rules.example`.

---

## 📋 Checklist de deploy

- [ ] Deploy functions: `firebase deploy --only functions`
- [ ] Executar `migrateAllUserClaims` (logado como EP)
- [ ] Validar claims de 3 usuários de perfis diferentes
- [ ] Testar upload de arquivo <20 MB (sucesso)
- [ ] Testar upload de arquivo >20 MB (rejeição esperada)
- [ ] Verificar que sistema continua funcionando normalmente

---

## 🔐 Próximas ações (Fase 2)

1. Validar que TODOS os usuários têm Custom Claims setados
2. Testar regras `firestore-enhanced.rules.example` em homologação
3. Aplicar regras gradualmente por coleção
4. Monitorar logs de acesso negado
5. Ajustar regras conforme necessário

**Timeline sugerido:** 1-2 semanas após Fase 1.

---

## 🆘 Reversão (se necessário)

**Reverter Custom Claims:** Não é necessário — claims ficam setados mas não são usados até enforçar nas regras.

**Reverter Storage rules:** 
```bash
git checkout HEAD~1 -- storage.rules
firebase deploy --only storage
```

**Reverter Functions:**
```bash
git checkout HEAD~1 -- functions/index.js
cd functions && npm install
cd .. && firebase deploy --only functions
```

---

*Última atualização: 11/05/2026*
