# Mapear processo

Donos de processo e gestores possuem o menu **Mapear processo**. Escolhem um macroprocesso, informam o nome e o objetivo e selecionam **AS IS** (funcionamento atual) ou **TO BE** (funcionamento futuro). O vínculo considera o nome sem diferenciar maiúsculas e minúsculas, dentro do macroprocesso selecionado. Homônimos precisam de uma escolha explícita; nomes inexistentes ficam pendentes de vínculo pelo EPP.

O rascunho abre na própria página do módulo, mantendo a navegação lateral. O **Modo Simplificado**, com cards e prévia BPMN automática, é o padrão para novos desenhos. O botão **Modo Avançado** abre o editor BPMN livre na mesma página. As ferramentas de desenho livre ficam visíveis apenas nesse modo. Fluxos existentes criados livremente continuam abrindo no modo avançado para preservar seu conteúdo; ao retornar para os cards após alterações livres, o sistema pede confirmação porque não há conversão automática de BPMN em cards. Na prévia dos cards, as bolinhas azuis das conexões podem ser arrastadas para mudar o ponto de entrada ou saída na mesma forma. Trocar a atividade de origem ou destino exige alterar os cards. Esses pontos são preservados ao salvar e reabrir.

Desenho livre, marcos, responsáveis, decisões e detalhamentos ficam salvos no rascunho do autor, sem criar um ciclo completo de mapeamento. As alterações precisam ser salvas; ao sair com alterações pendentes o sistema avisa. É possível baixar BPMN, PNG e uma planilha das atividades. **Extrair atividades** organiza os elementos para que o autor detalhe o passo a passo, responsável, entradas, saídas e documentos/sistemas. O envio pode conter apenas o desenho, sem exigir o detalhamento.

**Excluir** fica disponível nos rascunhos do próprio autor, pede confirmação e remove apenas esse rascunho e seu conteúdo. Envios e publicações não podem ser excluídos por essa ação. A exclusão confere o estado e a revisão no servidor para impedir apagar um desenho já encaminhado em outra sessão.

**Encaminhar ao EPP** encerra a edição pelo autor e cria o aviso em **Minhas tarefas** do EPP. O revisor pode ajustar o desenho, os cards e os detalhes, vincular à arquitetura ou cadastrar um processo/subprocesso. Ao publicar, a arquitetura, a publicação em **Publicações › Fluxos** e o status do envio são gravados em uma única transação. O autor recebe um aviso persistente em **Minhas tarefas**, que pode marcar como lido. Cada publicação guarda uma cópia independente do desenho e das atividades; o EPP pode consultá-la ou exportá-la depois.

## Aproveitar em mapeamento completo / POP

O EPP pode recuperar o desenho e os detalhes durante a revisão (após vincular) ou a partir da publicação. Se já existir um mapeamento do processo, o sistema pede confirmação e arquiva o desenho e etapas anteriores antes da substituição. Caso contrário, abre o cadastro padrão com processo, objetivo e autor preenchidos. O EPP completa dono, patrocinador e demais dados e cria o mapeamento para continuar as etapas normais até o POP. As entradas, saídas e documentos também são incluídos na descrição das etapas recuperadas. O fluxo publicado permanece independente.

## Persistência e permissões

A coleção `mapeamentos_colaborativos` guarda autor, vínculo, versão AS IS/TO BE, objetivo, status, revisão e o conteúdo JSON do desenho e das atividades. Os estados são `rascunho → enviado → publicado`. As regras do Firestore restringem a leitura e edição de rascunhos ao autor, a revisão de enviados ao EPP e impedem alteração do conteúdo após publicação. Autores podem marcar apenas o próprio aviso de publicação como lido. Uma revisão numérica com transações impede que uma sessão antiga sobrescreva alterações de outra sessão. O conteúdo é limitado a 700 KB para respeitar o limite por documento do Firestore.

A publicação usa documentos `publicacoes` e o documento de configuração `config/arquitetura` existentes. Não depende de uploads para Storage nem de IA. A coleção nova exige publicar **firestore.rules** junto com o frontend. As regras atuais seguem a configuração de coleções raiz do ambiente; uma futura migração de tenant deve incluir esta coleção.

## Verificação

- `npx vitest run tests/unit/mapeamento-colaborativo.test.js tests/unit/asis-cards.test.js tests/unit/asis-cards-validation.test.js`
- `node tests/e2e/mapear-processo.cjs` usa Playwright com um BPMN real e persistência simulada para o caminho do autor ao EPP, falha de gravação, publicação e recuperação. `BPMN_DIAGRAM_CSS` e `BPMN_MODELER_PATH` apontam aos assets BPMN disponíveis no ambiente.
- `tests/security/mapear-processo.rules.cjs` usa `@firebase/rules-unit-testing` e `firebase/firestore` com o emulador Firestore para verificar autoria, envio, revisão, publicação atômica e aviso. As dependências podem ser instaladas fora do repositório; `FIREBASE_RULES_TESTING` e `FIREBASE_TEST_SDK` permitem indicar esses caminhos.
