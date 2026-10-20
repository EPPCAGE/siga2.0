# Esboço AS IS por cards — teste experimental

Na etapa **Esboço AS IS**, use **Experimentar esboço por cards**. O editor BPMN existente continua disponível.

- Os cards são compactos: clique no título ou em **Editar** para abrir o pop-up. Criar e cancelar um card não altera o fluxo.
- Edite o início e adicione atividades, decisões exclusivas, paralelos, inclusivos, esperas temporizadas, encerramentos e retornos a etapas anteriores. Informe responsáveis e modos de execução nas atividades.
- Reordene os cards pelas setas. Os caminhos têm nomes livres; no pop-up do gateway, adicione ou remova saídas e nomeie cada uma (por exemplo, Aprovar, Revisar e Arquivar). No pop-up, escolha reencontrá-los ou mantê-los independentes, com finais separados. Cards após um encerramento são impedidos para evitar atividades inalcançáveis.
- As conexões são roteadas em corredores livres. O roteador procura trajetos ortogonais livres em diferentes lados dos elementos, inclusive nas divisões e junções dos gateways. Apenas quando essa busca não encontra uma rota sem cruzamento usa pares de eventos de link BPMN com o mesmo identificador (L1, L2...), mantendo a continuidade sem cruzar linhas.
- A prévia à direita é BPMN real, com raias por responsável. Os botões permitem ampliar, reduzir e ajustar o desenho.
- A prévia só modifica o processo ao confirmar a substituição e usar **Aplicar e salvar AS IS**. Fechar descarta as alterações do teste.
- A aplicação salva os cards em `mod.asIsCards`, o XML/SVG AS IS e `mod.etapas_proc` no mesmo processo. Uma versão anterior do desenho e das etapas é arquivada.
- Reabrir recupera os cards anteriormente aplicados. Um BPMN desenhado livremente ou importado não é convertido automaticamente em cards. Reaplicar os cards substitui ajustes do editor livre, após confirmação.

## Repetir até a decisão ser positiva

1. Crie a decisão, por exemplo **Documentação completa?**.
2. No caminho **Não**, adicione **Corrigir documentos** e depois **Retornar à etapa**. No pop-up, selecione **Documentação completa?** como destino; também é possível voltar à atividade de preparação anterior.
3. No caminho **Sim**, adicione as atividades de aprovação. Deixe a decisão configurada para **Reencontrar e continuar o processo** e adicione a próxima etapa fora dela.

O caminho de correção volta à decisão; ele não segue indevidamente para a junção. Quando a resposta for positiva, o processo segue pela aprovação e continua. O retorno representa uma seta BPMN e não cria uma atividade artificial. Os destinos são etapas anteriores do mesmo caminho ou gateways que o contêm; etapas de outro caminho e o evento de início não são destinos de retorno.

## Limites desta versão

Até 60 cards e cinco níveis de ramificações, com 2 a 60 caminhos nomeados por gateway. Esperas usam temporizador com duração ISO 8601, como PT30M, PT1H ou P1D. Retornos a etapas anteriores são feitos com o card **Retornar à etapa**. Saltos entre caminhos independentes, subprocessos e outros tipos de eventos permanecem no editor livre. Não há sincronização de alterações livres de volta aos cards, nem uso de IA.

A estrutura salva usa `mod.asIsCards.version = 3`, com `start` e `cards`. Cada gateway guarda `branches: [{id, nome, cards}]`. Cards das versões 1 e 2 (`yes`/`no`) são lidos sem alterar os dados persistidos, preservando os cards, seus IDs e os rótulos Sim/Não; a nova estrutura só é gravada ao aplicar.

## Validação

```bash
npx vitest run tests/unit/asis-cards.test.js
node tests/e2e/asis-cards.cjs
```

O teste funcional usa Chromium e o modeler BPMN real, com persistência simulada. Aceita `BPMN_MODELER_PATH` para um bundle local do bpmn-js 17 e `BPMN_DIAGRAM_CSS` para sua folha de estilos local; sem esses parâmetros, carrega os arquivos do CDN usado pela aplicação.
