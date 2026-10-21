# Esboço AS IS por cards — teste experimental

Na etapa **Esboço AS IS**, use **Experimentar esboço por cards**. O editor BPMN existente continua disponível.

- Os cards são compactos: clique no título ou em **Editar** para abrir o pop-up. Criar e cancelar um card não altera o fluxo.
- Edite o início e adicione atividades, decisões exclusivas, paralelos, inclusivos, esperas temporizadas, encerramentos e retornos a etapas anteriores. Informe o responsável/raia também no início, gateways, esperas e encerramentos; o modo de execução é configurado nas atividades.
- Reordene os cards pelas setas. Os caminhos têm nomes livres; no pop-up do gateway, adicione ou remova saídas e nomeie cada uma (por exemplo, Aprovar, Revisar e Arquivar). No pop-up, escolha reencontrá-los ou mantê-los independentes, com finais separados. Cards após um encerramento são impedidos para evitar atividades inalcançáveis.
- As conexões são roteadas em corredores livres. O roteador procura trajetos ortogonais livres em diferentes lados dos elementos, inclusive nas divisões e junções dos gateways. Cada saída tenta usar uma ponta distinta do gateway; quando há mais saídas que pontas disponíveis, os caminhos se separam imediatamente, sem compartilhar trechos. Conexões que atravessariam três ou mais raias usam links. Também quando a busca não encontra uma rota sem cruzamento usa pares de eventos de link BPMN com o mesmo identificador (L1, L2...), mantendo a continuidade sem cruzar linhas.
- O campo **Responsável / raia** oferece sugestões dos nomes já usados no próprio processo, incluindo início e caminhos aninhados. Selecione uma sugestão ou digite um novo nome; nomes que diferem apenas por maiúsculas/minúsculas e espaços nas pontas formam a mesma raia. A lista é atualizada ao salvar cada card.
- A prévia à direita é BPMN real, com raias por responsável. Eventos e gateways ficam nessas mesmas raias, sem raia técnica separada. Quando o responsável de um evento ou gateway estiver vazio, ele herda o da etapa anterior do caminho; se não houver, usa o da próxima etapa. A junção acompanha o responsável do gateway. Se nenhum responsável estiver disponível, usa uma única raia “Responsável não informado”. Os botões permitem ampliar, reduzir e ajustar o desenho.
- A prévia só modifica o processo ao confirmar a substituição e usar **Aplicar e salvar AS IS**. Fechar descarta as alterações do teste.
- A aplicação salva os cards em `mod.asIsCards`, o XML/SVG AS IS e `mod.etapas_proc` no mesmo processo. Uma versão anterior do desenho e das etapas é arquivada.
- Reabrir recupera os cards anteriormente aplicados. Um BPMN desenhado livremente ou importado não é convertido automaticamente em cards. Ajustes visuais são preservados ao reaplicar os cards. Mudanças da estrutura feitas no editor livre continuam sendo substituídas pelo fluxo dos cards, após confirmação.

## Marcos (milestones)

Nos cards de atividade, preencha **Marco (milestone)** escolhendo uma sugestão do próprio processo ou digitando um novo nome. Os nomes são reutilizados sem distinguir maiúsculas/minúsculas. Deixar o campo vazio mantém a atividade sem marco, fora das faixas nomeadas.

O desenho cria divisões verticais por marco, atravessando todas as raias, e coloca cada atividade na faixa correspondente. A ordem das faixas segue a primeira utilização dos nomes nos cards; retornos a marcos anteriores continuam possíveis. Início, decisões, esperas e finais acompanham o contexto das atividades próximas. Mudar o marco de uma atividade a reposiciona na faixa correta; ajustes manuais compatíveis são preservados. Os marcos são salvos no BPMN e no SVG usado pelo POP/PDF, com o mesmo formato de fases já utilizado no editor livre.

## Ajustar o desenho manualmente

No desenho à direita, arraste os elementos e os rótulos, ajuste seus tamanhos e os pontos das conexões. **Aplicar e salvar AS IS** grava o XML e o SVG do desenho que está na tela, junto dos cards e das etapas. Verificar o fluxo não regenera o desenho quando os cards não mudaram.

Ao editar cards, os ajustes dos elementos que continuam no mesmo responsável são reaproveitados; novas ligações ou elementos que mudaram de raia recebem o traçado apropriado. O layout também é recuperado ao reabrir o esboço. Nomes, responsáveis, tipos de elementos e ligações do processo são editados pelos cards para manter o fluxo e o POP sincronizados. Fechar sem aplicar descarta as alterações desta sessão.

## Repetir até a decisão ser positiva

1. Crie a decisão, por exemplo **Documentação completa?**.
2. No caminho **Não**, adicione **Corrigir documentos** e depois **Retornar à etapa**. No pop-up, selecione **Documentação completa?** como destino; também é possível voltar à atividade de preparação anterior.
3. No caminho **Sim**, adicione as atividades de aprovação. Deixe a decisão configurada para **Reencontrar e continuar o processo** e adicione a próxima etapa fora dela.

O caminho de correção volta à decisão; se apenas a saída de aprovação continuar, ela segue diretamente à próxima etapa, sem gateway de junção. Uma junção só é criada quando dois ou mais caminhos continuam e precisam convergir. Quando a resposta for positiva, o processo segue pela aprovação e continua. O retorno representa uma seta BPMN e não cria uma atividade artificial. Os destinos são etapas anteriores do mesmo caminho ou gateways que o contêm; etapas de outro caminho e o evento de início não são destinos de retorno.

## Validação do fluxo

A validação roda ao gerar a prévia, pelo botão **Verificar fluxo** e novamente antes de aplicar. Erros bloqueiam **Aplicar e salvar AS IS**, sem alterar o desenho atual:

- Identidades duplicadas, setas quebradas, links sem par, início/finais inválidos e pontas soltas.
- Elementos inalcançáveis a partir do início e caminhos que não podem chegar a nenhum encerramento.
- Ciclos sem saída, mesmo que outro caminho do processo consiga terminar.
- Possíveis travamentos nas junções, por exemplo uma escolha XOR que alimenta uma junção paralela que espera todas as entradas.
- Retornos que reabrem um paralelo/inclusivo antes da conclusão dos caminhos, podendo acumular execuções.

Ciclos com saída são permitidos e geram alerta para revisão das condições de saída. Finais independentes e ciclos locais em um caminho paralelo são aceitos quando não impedem a conclusão.

A verificação explora execuções possíveis com escolhas XOR, todos os subconjuntos OR de até seis saídas e sincronização dos caminhos ativos nas junções inclusivas. Eventos de link mantêm a continuidade do fluxo. Por padrão, a análise é limitada a 3.000 estados, 20.000 transições e 48 execuções simultâneas; ao atingir o limite ou amostrar inclusivos maiores, exibe **análise parcial**, sem afirmar que todos os cenários foram verificados. As condições dos caminhos são textos livres: sua viabilidade e o atendimento das regras de negócio precisam de revisão humana. A verificação cobre o modelo gerado pelos cards, não alterações posteriores no editor livre.

## Limites desta versão

Até 60 cards e cinco níveis de ramificações, com 2 a 60 caminhos nomeados por gateway. Esperas usam temporizador com duração ISO 8601, como PT30M, PT1H ou P1D. Retornos a etapas anteriores são feitos com o card **Retornar à etapa**. Saltos entre caminhos independentes, subprocessos e outros tipos de eventos permanecem no editor livre. Não há sincronização de alterações livres de volta aos cards, nem uso de IA.

A estrutura salva usa `mod.asIsCards.version = 4`, com `start`, `cards` e `layout`. Cada gateway guarda `branches: [{id, nome, cards}]`. Cards das versões 1 e 2 (`yes`/`no`) são lidos sem alterar os dados persistidos, preservando os cards, seus IDs e os rótulos Sim/Não; a nova estrutura só é gravada ao aplicar.

## Validação

```bash
npx vitest run tests/unit/asis-cards.test.js tests/unit/asis-cards-validation.test.js
node tests/e2e/asis-cards.cjs
```

O teste funcional usa Chromium e o modeler BPMN real, com persistência simulada. Aceita `BPMN_MODELER_PATH` para um bundle local do bpmn-js 17 e `BPMN_DIAGRAM_CSS` para sua folha de estilos local; sem esses parâmetros, carrega os arquivos do CDN usado pela aplicação.
