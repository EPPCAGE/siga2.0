# Diagnóstico funcional — 12/10/2026

## Escopo e limites

Foi avaliado o SIGA disponível em `C:\gesproc-functions`, com interface em `processos.html`. Não foi encontrada referência a uma edição chamada Siga Lite. Os resultados precisam ser confirmados na edição pretendida pelo usuário.

Os testes de navegador executaram módulos reais com dados sintéticos e persistência simulada. Não houve acesso autenticado a produção, alteração de dados reais nem validação de ponta a ponta contra Firestore, serviços de IA ou geração final de PDF. Os testes de mapeamento cobrem componentes e regras; não comprovam a conclusão de um mapeamento inteiro na aplicação integrada.

## Resultados

- `npm run test:unit`: 43 arquivos e 333 testes aprovados. Incluem arquitetura, vínculos, permissões de mapeamento, BPMN e POP.
- `node tests/e2e/cadeia-valor.cjs`: criação de macroprocesso, categoria, transferência de processo, preservação de subprocessos e riscos, gravação atômica simulada, histórico, conflito de edição, perfil gestor e largura de 390 px aprovados.
- `node tests/e2e/processos-objetivos.cjs`: edição, seleção múltipla e persistência simulada de objetivos estratégicos aprovadas.
- `node tests/e2e/registros-processo.cjs`: cinco tipos de registro, processos sem mapeamento, falhas de gravação/leitura, fila e histórico aprovados.
- `node tests/e2e/riscos.cjs`: filtros, matriz, tratamento, persistência simulada, integração com mapeamento e permissões aprovados.
- `node tests/e2e/maturidade-gestao.cjs`: cálculo, rascunho, conclusão, histórico, concorrência, permissões, pesquisa e responsividade aprovados.

## Melhorias confirmadas por reprodução em Chromium

### 1. Destino de desdobramento permanece após remover macroprocesso

Prioridade: média. Arquivo: `src/processos/cadeia-valor-module.js`, função `cadeiaRemoveMacro`.

Reprodução:
1. Abrir Construir cadeia.
2. Adicionar um macroprocesso, informar nome e categoria.
3. Selecioná-lo como destino de um processo existente.
4. Remover o macroprocesso recém-criado.
5. Tentar salvar.

Resultado: o macroprocesso removido permanece nas opções de destino e selecionado. A validação impede salvar com a mensagem de destino inválido. Os dados persistidos ficam preservados, mas a interface apresenta uma opção obsoleta.

Melhoria sugerida: reconstruir os seletores ao remover o macroprocesso, invalidar explicitamente os destinos afetados e solicitar nova escolha. Evitar realocar silenciosamente processos.

### 2. Visualização não identifica alterações ainda não salvas

Prioridade: média. Arquivo: `src/processos/cadeia-valor-module.js`, funções `cadeiaSetEditing`, `cadeiaRender` e `cadeiaPrint`.

Reprodução:
1. Abrir Construir cadeia e modificar o nome.
2. Clicar em Visualizar cadeia sem salvar.

Resultado: a prévia apresenta o nome alterado sem aviso de rascunho. A impressão utiliza o conteúdo dessa prévia, o que pode levar o usuário a compartilhar uma cadeia diferente da versão persistida.

Melhoria sugerida: mostrar um indicador de alterações não salvas na visualização e identificar o rascunho na impressão. Oferecer salvar ou descartar de forma clara.

O script de reprodução está em `tests/e2e/artifacts/cadeia-diagnostico.cjs` (artefato local ignorado pelo Git). Ele verifica a existência dos comportamentos acima; não é um teste de regressão de uma correção.

## Próxima validação necessária

Identificar o endereço ou pasta do Siga Lite e executar a jornada integrada em ambiente de teste: instituição sem arquitetura → cadeia → macroprocessos → processos → subprocessos → abertura do mapeamento → SIPOC → riscos → AS IS/TO BE → validação → POP → publicação → reabertura e conferência dos vínculos. Incluir cancelamento, falhas de conexão, duas sessões concorrentes e perfis distintos.

## Correções implementadas

As duas melhorias foram implementadas na versão local:

- Remover um macroprocesso reconstrói os seletores e deixa os processos afetados sem destino, com solicitação explícita de uma nova escolha. A validação também recusa esse destino vazio, sem retornar silenciosamente ao macroprocesso original.
- A prévia identifica alterações não salvas, inclusive no conteúdo enviado à impressão. A visualização oferece continuar a edição para salvar ou descartar. O aviso desaparece ao salvar, descartar ou reverter todas as alterações.

Validação após as correções: 43 arquivos e 334 testes unitários aprovados; roteiro Chromium de cadeia de valor aprovado, ampliado para testar remoção do destino, tentativa de salvamento inválido sem gravação, preservação da escolha pendente ao adicionar outro macroprocesso, aviso de rascunho na visualização e impressão, retomada da edição e descarte. A impressão foi verificada pelo HTML enviado à janela, sem gerar um PDF real.

O script de diagnóstico em `artifacts` registra o comportamento anterior e foi substituído, para validação das correções, pelos testes de regressão em `tests/e2e/cadeia-valor.cjs`.

As alterações estão locais; não houve publicação em produção.
