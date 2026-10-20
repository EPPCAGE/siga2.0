# Esboço AS IS por cards — teste experimental

Na etapa **Esboço AS IS**, use **Experimentar esboço por cards**. O editor BPMN existente continua disponível.

- Os cards são compactos: clique no título ou em **Editar** para abrir o pop-up. Criar e cancelar um card não altera o fluxo.
- Edite o início e adicione atividades, decisões exclusivas, paralelos, inclusivos, esperas temporizadas e encerramentos. Informe responsáveis e modos de execução nas atividades.
- Reordene os cards pelas setas. Cada ramificação tem dois caminhos. No pop-up, escolha reencontrá-los ou mantê-los independentes, com finais separados. Cards após um encerramento são impedidos para evitar atividades inalcançáveis.
- As conexões são roteadas em corredores livres. Ramificações e conexões que conflitam usam pares de eventos de link BPMN com o mesmo identificador (L1, L2...), mantendo a continuidade sem cruzar linhas.
- A prévia à direita é BPMN real, com raias por responsável. Os botões permitem ampliar, reduzir e ajustar o desenho.
- A prévia só modifica o processo ao confirmar a substituição e usar **Aplicar e salvar AS IS**. Fechar descarta as alterações do teste.
- A aplicação salva os cards em `mod.asIsCards`, o XML/SVG AS IS e `mod.etapas_proc` no mesmo processo. Uma versão anterior do desenho e das etapas é arquivada.
- Reabrir recupera os cards anteriormente aplicados. Um BPMN desenhado livremente ou importado não é convertido automaticamente em cards. Reaplicar os cards substitui ajustes do editor livre, após confirmação.

## Limites desta versão

Até 60 cards e cinco níveis de ramificações, com dois caminhos por gateway. Esperas usam temporizador com duração ISO 8601, como PT30M, PT1H ou P1D. Ciclos, subprocessos e outros tipos de eventos permanecem no editor livre. Não há sincronização de alterações livres de volta aos cards, nem uso de IA.

A estrutura salva usa `mod.asIsCards.version = 2`, com `start` e `cards`. Cards da versão 1 são lidos sem conversão destrutiva e mantêm o reencontro por padrão.

## Validação

```bash
npx vitest run tests/unit/asis-cards.test.js
node tests/e2e/asis-cards.cjs
```

O teste funcional usa Chromium e o modeler BPMN real, com persistência simulada. Aceita `BPMN_MODELER_PATH` para um bundle local do bpmn-js 17 e `BPMN_DIAGRAM_CSS` para sua folha de estilos local; sem esses parâmetros, carrega os arquivos do CDN usado pela aplicação.
