# Limpeza de código morto e duplicidades — 22/10/2026

## Alterações

- Retirado `projetos.shared.js` (624 linhas), sem script/import em nenhuma entrada atual. Suas versões antigas de login, permissão, sessão, navegação e bootstrap duplicavam responsabilidades que hoje estão nos módulos `src/shared` e nas páginas.
- Retiradas 40 funções sem chamadas diretas, referências globais ou uso nos handlers HTML atuais: 27 em `processos.html`, 12 em `projetos-logic.js` e uma em `src/shared/auth/auth-controller.js`. Foram conferidos também testes, scripts e referências por string. Helpers que só atendiam renderizadores mortos foram retirados em sequência.
- Retiradas duas versões antigas de relatório executivo de Projetos; preservado `projBuildStatusReportHTML`, chamado pela exportação atual.
- Retirada a carga de demonstração embutida em `projCarregarDemoSeVazio`, cujo único chamador estava no arquivo compartilhado antigo. O carregamento atual de `projetos-default.json` permanece disponível.
- Retirados renderizadores da antiga lista agrupada de FAQs e auxiliares que não são chamados pela busca atual. Permanecem busca geral, glossário e edição de perguntas.
- Retirados o antigo anexo ILP do PDF (já fora da composição atual), auxiliares de uma interface antiga de ações de auditoria e análise BPMN sem botão/chamador. Os cálculos e telas atuais de ILP, aderência e IA permanecem.
- Atualizadas as referências atuais de documentação e comentário que apontavam ao arquivo compartilhado removido. Documentos históricos de arquitetura continuam registrando a estrutura anterior.

## Limites da consolidação

`_confirmarSim`, `_confirmarNao` e `_fsClean` continuam em Processos e Projetos. São entradas independentes e implementações distintas: callbacks de confirmação usam estados diferentes; o sanitizador de Projetos trata arrays aninhados, chaves e valores especiais de forma própria. Unificá-las apenas pelo nome alteraria comportamento.

Compatibilidade de dados antigos (prefixos legacy, migrações, fallbacks de configuração e relatórios salvos) não foi retirada por parecer antiga. Nenhum banco ou dado de usuário foi apagado.

A remoção da Central de Licenças já estava pendente antes desta limpeza e continua na árvore de trabalho. É uma alteração anterior separada; não faz parte das contagens acima.

## Validação

- 54 arquivos / 425 testes unitários aprovados.
- Roteiro Chromium de Projetos: arquitetura, filtros, vínculos e persistência aprovados.
- Roteiro Chromium de Mapear processo: autor/gestor, cards, desenho livre, detalhamento, falha de gravação, envio, revisão, publicação, aviso e recuperação para POP aprovados.
- JavaScript analisado sintaticamente; comparação por AST das funções que permaneceram nos três arquivos confirmou ausência de alterações de lógica nesta limpeza. A navegação `go` e `_getPageRenderer` já possuíam a retirada da Central de Licenças, feita na tarefa anterior.
- `git diff --check` aprovado.
- O E2E `busca-geral.cjs` falha na expectativa antiga de três filtros: a tela já contém também Glossário. A mesma falha foi reproduzida com `processos.html` do HEAD anterior à limpeza. O teste não foi tratado como aprovado nem alterado nesta tarefa.

A análise estática é evidência para os trechos removidos, não uma garantia de ausência de todo código morto no sistema. Não houve commit, push ou publicação nesta tarefa.

## Funções retiradas

- `_invokeGlobalHandler`
- `confirmarNotifDono`
- `_acaoBadgeCls`
- `_renderAnexosAcao`
- `adicionarAcaoAuditoria`
- `toggleAnexoFormAcao`
- `adicionarLinkAcao`
- `uploadArquivoAcao`
- `removerAnexoAcao`
- `excluirAcaoAuditoria`
- `_popPdfIlpSection`
- `_rFaqHl`
- `_rFaqItemHTML`
- `_faqProcKey`
- `toggleFaqProc`
- `_rFaqProcHTML`
- `_rFaqMacroHTML`
- `excluirFaqItem`
- `abrirAdicionarFaqItem`
- `_faqPopulateMacroSelect`
- `_faqBuildGroups`
- `_faqFilterPairs`
- `_faqCountLabel`
- `_iaPreencherCampoAnalise`
- `_iaAutopreencherAnaliseBpmn`
- `_iaAnaliseBpmnHtml`
- `iaAnalisarBpmn`
- `projCanViewOnly`
- `projEnsureWriteExec`
- `projSetSafeHtml`
- `projRenderPainelGeral`
- `projCarregarDemoSeVazio`
- `projGroupCount`
- `projIndicadorPct`
- `projBuildStatusReportHTMLLegacy`
- `projBuildStatusReportHTMLV10`
- `projStrategyRelatedHtml`
- `projRenderEstrategiaPageLegacy`
- `projAddMacroNovo`
- `_garantirCadastroSiga`
