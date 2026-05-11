# Fase 1: Migração de Segurança — Guia de Execução

**Data:** Maio 2026  
**Status:** PRONTO PARA EXECUÇÃO  
**Risco de perda de dados:** ❌ NENHUM (apenas adiciona funcionalidades novas)

---

## ⚠️ GARANTIAS DE SEGURANÇA

✅ **NENHUM dado será perdido ou alterado**  
✅ **NENHUMA funcionalidade existente será quebrada**  
✅ **Sistema continua funcionando normalmente durante toda a migração**  
✅ **Reversão é simples: basta não enforçar as regras novas**

Esta migração é **100% aditiva** — apenas adiciona camadas de segurança sem remover nada.

---

## 📋 O que foi implementado

### 1. Custom Claims para perfis (✅ já existe)
- Função `setUserClaims` já estava implementada
- Chama automaticamente após login
- Atribui claim `{perfil: 'ep'|'dono'|'gestor'|'gerente_projeto'}` ao token

### 2. Migração em massa (🆕 adicionado agora)
- Nova função `migrateAllUserClaims`
- Seta claims para TODOS os usuários existentes de uma vez
- Requer perfil EP para executar
- Retorna relatório completo de sucesso/erros

### 3. checkEmail público (✅ já existe)
- Já estava implementado
- Permite remover leitura pública de `config/` no futuro
- Por enquanto, mantém compatibilidade

---

## 🚀 Roteiro de Execução

### Passo 1: Deploy das novas funções

```bash
# No diretório raiz do projeto
firebase deploy --only functions
```

**Tempo estimado:** 2-3 minutos  
**Impacto no sistema:** NENHUM (apenas adiciona funções novas)

---

### Passo 2: Executar migração de claims

**IMPORTANTE:** Execute este comando UMA ÚNICA VEZ, logado como usuário EP.

```javascript
// No console do navegador (logado como EP):
const functions = firebase.functions();
const migrate = httpsCallable(functions, 'migrateAllUserClaims');

try {
  const result = await migrate();
  console.log('Migração concluída:', result.data);
  
  if (result.data.resultados.erros > 0) {
    console.warn('Usuários com erro:', result.data.resultados.detalhes);
  } else {
    console.log('✅ Todos os usuários migrados com sucesso!');
  }
} catch (error) {
  console.error('Erro na migração:', error);
}
```

**Resultado esperado:**
```json
{
  "ok": true,
  "resultados": {
    "total": 15,
    "sucesso": 15,
    "erros": 0,
    "detalhes": []
  }
}
```

**Tempo estimado:** 10-30 segundos (depende do número de usuários)  
**Impacto no sistema:** NENHUM — usuários continuam logados normalmente

---

### Passo 3: Validar claims setados

Peça para 2-3 usuários de perfis diferentes fazerem logout/login e verificar:

```javascript
// No console do navegador (após login):
const user = firebase.auth().currentUser;
const token = await user.getIdTokenResult();
console.log('Perfil no claim:', token.claims.perfil);
```

**Resultado esperado:** Deve mostrar o perfil correto (`'ep'`, `'dono'`, `'gestor'` ou `'gerente_projeto'`).

---

### Passo 4: (FUTURO) Endurecer regras Firestore

**⚠️ NÃO FAÇA ISSO AINDA!**

Apenas depois de validar que TODOS os usuários têm claims corretos (Passo 3), você pode endurecer as regras.

Exemplo de regra futura (ainda não aplicar):

```javascript
// firestore.rules — EXEMPLO FUTURO
match /processos/{procId} {
  allow read: if isAuth();
  allow create: if isAuth();
  allow update: if isAuth() && (
    request.auth.token.perfil == 'ep' ||  // EP pode tudo
    resource.data.dono == request.auth.uid  // Dono pode editar próprio
  );
  allow delete: if isAuth() && request.auth.token.perfil == 'ep';
}
```

Essa regra ficará em `docs/security/firestore-enhanced.rules.example` como referência futura.

---

## 🔍 Validação e Testes

### Checklist de validação

- [ ] Deploy de functions executado sem erros
- [ ] Função `migrateAllUserClaims` chamada com sucesso
- [ ] Relatório de migração mostra `erros: 0`
- [ ] 3 usuários de perfis diferentes fizeram logout/login
- [ ] Claims verificados no console: todos corretos
- [ ] Sistema continua funcionando normalmente
- [ ] Nenhum dado perdido ou alterado

### Em caso de problemas

**Problema:** Migração retorna erros para alguns usuários  
**Solução:** Verificar `resultados.detalhes` no retorno. Usuários sem UID ou perfil precisam ser corrigidos manualmente no Firestore (`config/usuarios`).

**Problema:** Claim não aparece após login  
**Solução:** Forçar renovação do token: `await user.getIdToken(true)`. Isso força o Firebase a buscar o claim atualizado.

**Problema:** Quero reverter tudo  
**Solução:** Custom Claims não afetam o funcionamento atual. Basta não enforçar as regras novas. Os claims ficarão setados mas não serão usados.

---

## 📊 Próximos passos (Fase 2)

Após validar que todos os claims estão corretos:

1. Criar regras Firestore melhoradas em arquivo separado
2. Testar em ambiente de homologação
3. Aplicar gradualmente por coleção (começar por `publicacoes`, depois `plano`, etc.)
4. Validar que nada quebrou
5. Aplicar em coleções críticas (`processos`, `kpis`, etc.)

**Timeline sugerido:** 1-2 semanas de validação antes de Fase 2.

---

## 🆘 Suporte

Se encontrar qualquer problema durante a migração:

1. **NÃO PÂNICO** — nenhum dado será perdido
2. Anote a mensagem de erro completa
3. Verifique o console do Firebase Functions (Logs)
4. Se necessário, reverta o deploy: `firebase deploy --only functions` com versão anterior

**Contato técnico:** [Inserir contato do responsável técnico]

---

*Última atualização: 11/05/2026*
