# Plano de Modularização do SIGA 2.0

**Data:** 11/05/2026  
**Status:** Em planejamento  
**Abordagem:** Gradual, módulo por módulo, com testes E2E antes de cada extração

---

## 📊 Análise Atual

### Tamanho do monolito
- **Arquivo:** `processos.html`
- **Linhas totais:** ~18.000
- **Código JavaScript:** ~15.000 linhas
- **Variáveis globais:** 20+
- **Handlers inline (`onclick`):** 300+

---

## 🎯 Estratégia de Modularização

### Princípios
1. ✅ **Gradual:** Um módulo por vez
2. ✅ **Testado:** Criar testes E2E antes de extrair
3. ✅ **Reversível:** Cada commit pode ser revertido facilmente
4. ✅ **Compatível:** Manter funcionamento global durante transição
5. ✅ **Store por módulo:** Criar state manager específico ao extrair

### Ordem de prioridade
- **Baixo risco primeiro:** Módulos isolados, sem dependências críticas
- **Alto valor depois:** Módulos complexos que mais se beneficiam da modularização

---

## 📋 Módulos Identificados (20 módulos)

| # | Módulo | Linhas | Risco | Prioridade | Testes E2E | Depende de |
|---|--------|--------|-------|------------|------------|------------|
| **FASE 1: Fundação (baixo risco, alto isolamento)** |
| 1 | 🎓 Trilhas | ~800 | ⚪ Baixo | 🔥 Alta | ❌ Criar | - |
| 2 | 📢 Notificações/Email | ~600 | ⚪ Baixo | 🔥 Alta | ❌ Criar | EmailJS |
| 3 | 🔔 Avisos | ~400 | ⚪ Baixo | 🔥 Alta | ❌ Criar | - |
| 4 | 📊 Auditoria | ~1.500 | ⚪ Baixo | 🔥 Alta | ✅ Existe | BPMN |
| 5 | 💾 Backup/Restore | ~300 | ⚪ Baixo | 🟡 Média | ❌ Criar | - |
| **FASE 2: Gestão de dados (médio risco)** |
| 6 | 👥 Usuários/Admin | ~1.200 | 🟡 Médio | 🟡 Média | ❌ Criar | Auth |
| 7 | 🏗️ Arquitetura | ~1.000 | 🟡 Médio | 🟡 Média | ❌ Criar | - |
| 8 | 📈 KPIs/Indicadores | ~2.000 | 🟡 Médio | 🔥 Alta | ❌ Criar | IA, Processos |
| 9 | 🎯 Metas/PAT | ~800 | 🟡 Médio | 🟡 Média | ❌ Criar | - |
| 10 | 📝 Solicitações | ~1.200 | 🟡 Médio | 🔥 Alta | ❌ Criar | Processos, Email |
| **FASE 3: Mapeamento (alto risco, alto acoplamento)** |
| 11 | 🗺️ BPMN Editor | ~2.500 | 🔴 Alto | 🔥 Alta | ✅ Existe | BpmnJS |
| 12 | 📋 Ciclo de vida | ~800 | 🔴 Alto | 🔥 Alta | ✅ Existe | Processos |
| 13 | 🎭 Etapas: Abertura | ~600 | 🔴 Alto | 🟡 Média | ✅ Existe | BPMN |
| 14 | 🎭 Etapas: Modelagem | ~1.800 | 🔴 Alto | 🔥 Alta | ✅ Existe | BPMN, IA |
| 15 | 🎭 Etapas: Formalização | ~1.200 | 🔴 Alto | 🟡 Média | ✅ Existe | POP, PPT |
| 16 | 🎭 Etapas: Operação | ~400 | 🔴 Alto | 🟡 Média | ❌ Criar | - |
| 17 | 🎭 Etapas: Auditoria Proc | ~600 | 🔴 Alto | 🟡 Média | ❌ Criar | - |
| 18 | 📄 Geração de POP | ~1.500 | 🟡 Médio | 🔥 Alta | ❌ Criar | IA, BPMN |
| 19 | 📊 Geração de PPT | ~800 | 🟡 Médio | 🟡 Média | ❌ Criar | IA |
| 20 | 📊 Dashboard | ~1.000 | 🟡 Médio | 🟡 Média | ❌ Criar | KPIs, Processos |

**Total:** ~20.100 linhas a serem extraídas

---

## 🗓️ Cronograma Sugerido

### **Fase 1: Fundação** (3-4 semanas)
Extrair módulos isolados e de baixo risco

**Semana 1:**
- ✅ Estrutura base de modularização
- 🎓 Módulo Trilhas (800 linhas)
- 📢 Módulo Notificações (600 linhas)

**Semana 2:**
- 🔔 Módulo Avisos (400 linhas)
- 📊 Módulo Auditoria (1.500 linhas)

**Semana 3:**
- 💾 Módulo Backup (300 linhas)
- 📝 Documentação e validação

**Resultado:** ~3.600 linhas extraídas, sistema 20% mais modular

---

### **Fase 2: Gestão de dados** (4-5 semanas)

**Semana 4:**
- 👥 Módulo Usuários/Admin (1.200 linhas)

**Semana 5:**
- 🏗️ Módulo Arquitetura (1.000 linhas)

**Semana 6:**
- 📈 Módulo KPIs (2.000 linhas)

**Semana 7:**
- 🎯 Módulo Metas (800 linhas)
- 📝 Módulo Solicitações (1.200 linhas)

**Semana 8:**
- 📝 Testes e validação

**Resultado:** ~6.200 linhas adicionais, sistema 50% mais modular

---

### **Fase 3: Mapeamento** (6-8 semanas)

**Semana 9-10:**
- 🗺️ Módulo BPMN Editor (2.500 linhas)

**Semana 11:**
- 📋 Módulo Ciclo de vida (800 linhas)

**Semana 12-13:**
- 🎭 Módulos de Etapas: Abertura, Modelagem (2.400 linhas)

**Semana 14:**
- 🎭 Módulos de Etapas: Formalização, Operação, Auditoria (2.200 linhas)

**Semana 15:**
- 📄 Módulo Geração POP (1.500 linhas)
- 📊 Módulo Geração PPT (800 linhas)

**Semana 16:**
- 📊 Módulo Dashboard (1.000 linhas)
- 📝 Validação final

**Resultado:** ~11.200 linhas adicionais, **sistema 100% modularizado!**

---

## 📁 Estrutura de diretórios proposta

```
src/processos/
├── core/
│   ├── state-manager.js       # Store centralizado (criado gradualmente)
│   ├── event-bus.js           # Sistema de eventos entre módulos
│   └── router.js              # Navegação entre telas
├── trilhas/
│   ├── trilhas-state.js       # Estado local do módulo
│   ├── trilhas-renderer.js    # Renderização UI
│   ├── trilhas-controller.js  # Lógica e eventos
│   └── trilhas-types.js       # Tipos e constantes
├── notificacoes/
│   ├── notificacoes-state.js
│   ├── notificacoes-renderer.js
│   ├── notificacoes-controller.js
│   └── email-service.js
├── avisos/
│   └── ...
├── auditoria/
│   └── ...
├── kpis/
│   └── ...
├── solicitacoes/
│   └── ...
├── bpmn/
│   ├── bpmn-editor.js
│   ├── bpmn-renderer.js
│   └── bpmn-validators.js
├── etapas/
│   ├── abertura/
│   ├── modelagem/
│   ├── formalizacao/
│   ├── operacao/
│   └── auditoria/
├── geracao/
│   ├── pop-generator.js
│   └── ppt-generator.js
└── dashboard/
    └── ...
```

---

## ✅ Checklist por módulo

Para cada módulo extraído:

### Antes de extrair
- [ ] Identificar todas as funções do módulo
- [ ] Mapear variáveis globais usadas
- [ ] Mapear handlers inline (`onclick`)
- [ ] Criar testes E2E cobrindo funcionalidade principal
- [ ] Documentar dependências externas

### Durante extração
- [ ] Criar arquivos em `src/processos/{modulo}/`
- [ ] Criar state manager local do módulo
- [ ] Substituir `onclick` por `addEventListener`
- [ ] Expor apenas o necessário em `globalThis` (transição)
- [ ] Adicionar comentários explicativos

### Após extração
- [ ] Rodar testes E2E (garantir que nada quebrou)
- [ ] Rodar `npm run test:e2e:smoke`
- [ ] Validar manualmente a funcionalidade
- [ ] Remover código do `processos.html`
- [ ] Commit individual com mensagem clara
- [ ] Atualizar documentação

---

## 📈 Métricas de sucesso

| Métrica | Início | Meta Fase 1 | Meta Fase 2 | Meta Fase 3 |
|---------|--------|-------------|-------------|-------------|
| Linhas em processos.html | 18.000 | 14.400 | 8.200 | <2.000 |
| Módulos independentes | 0 | 5 | 10 | 20 |
| Variáveis globais | 20+ | 15 | 8 | 0 |
| Handlers inline | 300+ | 200 | 100 | 0 |
| Cobertura testes E2E | 40% | 50% | 70% | 90% |
| Tempo onboarding dev | 2-3 sem | 1-2 sem | 5-7 dias | 3-5 dias |

---

## 🚨 Riscos e mitigações

### Risco: Regressão funcional
**Mitigação:** Testes E2E obrigatórios antes e depois de cada extração

### Risco: Performance degradada
**Mitigação:** Medir tempo de carregamento antes/depois de cada módulo

### Risco: Conflitos de estado
**Mitigação:** State manager bem definido desde o início

### Risco: Dependências circulares
**Mitigação:** Event bus para comunicação entre módulos

---

## 🎯 Próximo passo imediato

**Iniciar Fase 1 extraindo módulo Trilhas:**

1. Criar branch `feature/modularizacao-trilhas`
2. Criar testes E2E para trilhas
3. Extrair código para `src/processos/trilhas/`
4. Validar com testes
5. Merge na main

**Tempo estimado:** 1-2 dias  
**Linhas extraídas:** 800  
**Risco:** Baixo

---

*Última atualização: 11/05/2026*
