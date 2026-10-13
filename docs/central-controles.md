# Central de Controles — classificações por processo e setor

O **tipo** (Preventivo, Detectivo ou Corretivo) é a classificação geral do controle. **Setor, responsável e efetividade pertencem à aplicação do controle em um processo**. Um controle pode ser eficaz no processo A e ineficaz no processo B, com responsáveis diferentes. No mesmo processo, podem ser cadastradas aplicações para vários setores.

## Cadastro e consulta

Em **Detalhar / editar**, selecione os processos e preencha setor, responsável e efetividade em cada um. O botão **Adicionar setor neste processo** permite novas aplicações para o mesmo processo. Alterar ou remover uma aplicação não altera as demais. Aplicações vinculadas aos riscos continuam mostrando seus registros específicos; a avaliação da central não substitui o conteúdo do mapeamento.

A tabela apresenta o tipo geral e as aplicações com seus processos, setores, responsáveis e efetividades. O filtro de processo exibe os valores desse processo; o filtro de risco continua consultando os vínculos registrados nos mapeamentos. O resumo de avaliações pendentes conta aplicações, não controles sem uma suposta efetividade global.

Quando o controle é selecionado na biblioteca do mapeamento, os valores sugeridos vêm somente da aplicação no processo atual. Se houver vários setores e não for possível determinar qual usar, os campos ficam para preenchimento, sem aproveitar dados de outro processo.

## Armazenamento e migração

- **central_controles** guarda a definição do controle, seu tipo geral, referências aos processos e versão de esquema 2.
- **controles_aplicacoes** guarda documentos separados com controle, processo, setor, responsável e efetividade. Cada documento tem autor e horários próprios.
- As gravações do controle e suas aplicações são transacionais. Conflitos no cadastro geral ou em uma aplicação impedem sobrescrever mudanças de outro gestor.
- Os dados dos riscos são consultados diretamente dos processos e preservados.
- Cadastros anteriores são atualizados na primeira consulta do EP. Valores gerais antigos são conservados em metadados históricos e migrados para as associações anteriores; quando existe avaliação no risco, ela tem prioridade na apresentação. Aplicações legadas extensas continuam consultáveis pelo histórico mesmo antes da materialização de todos os documentos.
- As associações com a arquitetura são preservadas quando o mapeamento é iniciado.

Usuários autenticados consultam; apenas EP edita. As regras mantêm os textos e a origem dos controles de fábrica e impedem que um cadastro migrado volte a receber classificações globais por uma versão antiga da tela.

## Verificação e publicação

Passaram 342 testes unitários e o teste de interface, cobrindo efetividades distintas por processo, vários setores no mesmo processo, migração, remoção isolada de aplicação, referências sem transferência entre processos e conflitos entre gestores. As regras foram validadas pela operação de teste do Firebase sem publicar uma release.

Publicar a alteração requer atualizar as regras Firestore e o frontend do SIGA original no projeto `gesproc2`. A coleção nova não exige Cloud Function ou segredo. O SIGA Lite permanece com sua implementação anterior nesta alteração.
