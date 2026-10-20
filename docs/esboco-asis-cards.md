# Esboço AS IS por cards — teste experimental

Na etapa **Esboço AS IS**, use **Experimentar esboço por cards**. O editor BPMN existente continua disponível.

- Adicione atividades e decisões, informe nomes e responsáveis e escolha o modo de execução.
- Reordene os cards pelas setas. Cada caminho Sim/Não tem seus próprios cards e volta a se encontrar antes da próxima atividade.
- A prévia à direita é BPMN real, com raias por responsável. Os botões permitem ampliar, reduzir e ajustar o desenho.
- A prévia só modifica o processo ao confirmar a substituição e usar **Aplicar e salvar AS IS**. Fechar descarta as alterações do teste.
- A aplicação salva os cards em `mod.asIsCards`, o XML/SVG AS IS e `mod.etapas_proc` no mesmo processo. Uma versão anterior do desenho e das etapas é arquivada.
- Reabrir recupera os cards anteriormente aplicados. Um BPMN desenhado livremente ou importado não é convertido automaticamente em cards. Reaplicar os cards substitui ajustes do editor livre, após confirmação.

## Limites desta versão

Até 60 cards e cinco níveis de decisões. Atividades manuais, semiautomáticas e automáticas; decisões exclusivas Sim/Não com junção. Paralelismos, ciclos, subprocessos e eventos específicos permanecem no editor livre. Não há sincronização de alterações livres de volta aos cards, nem uso de IA.

## Validação

```bash
npx vitest run tests/unit/asis-cards.test.js
node tests/e2e/asis-cards.cjs
```

O teste funcional usa Chromium e o modeler BPMN real, com persistência simulada. Aceita `BPMN_MODELER_PATH` para um bundle local do bpmn-js 17 e `BPMN_DIAGRAM_CSS` para sua folha de estilos local; sem esses parâmetros, carrega os arquivos do CDN usado pela aplicação.
