# Central de Controles — SIGA original

O menu **Central de Controles** usa o mesmo padrão visual e funcionalidades da edição Lite: catálogo, cartões de resumo, pesquisa, filtros por processo e risco, classificação por tipo e efetividade, setor e responsável e associação a vários processos. O ícone lateral e o formulário seguem o padrão do SIGA original.

## Dados e vínculos

O módulo reúne os 40 controles de fábrica, a biblioteca compartilhada e os controles existentes e de tratamento dos riscos cadastrados. Os controles legados recebem identificador determinístico; aplicações equivalentes não criam novos registros a cada abertura.

O cadastro e as associações são persistidos na coleção **central_controles** do Firestore. As aplicações específicas são derivadas dos riscos dos processos; mudar as referências do catálogo não modifica as avaliações dos riscos. Ao consultar a central como EP, os registros ainda ausentes são cadastrados por transações que não sobrescrevem documentos existentes. Usuários de consulta também visualizam os controles derivados dos riscos, mesmo antes desse cadastro inicial.

A seleção de processos inclui processos mapeados e processos e subprocessos da arquitetura. Uma associação à arquitetura continua sendo apresentada quando seu mapeamento é iniciado. O filtro por risco considera as aplicações nos riscos existentes; associar o controle a um processo não cria artificialmente um risco ou uma avaliação.

As alterações dos processos, da biblioteca, da arquitetura e da central atualizam a tela enquanto ela estiver aberta. Ao salvar um controle, o sistema verifica se outro gestor alterou seu cadastro e, se isso ocorreu, solicita reabertura dos detalhes. A biblioteca do mapeamento inclui os controles da central e seus valores de referência.

## Permissões

Usuários autenticados podem consultar a central. Somente o perfil EP pode cadastrar ou editar. As regras Firestore restringem a escrita ao claim EP, validam campos, limites, tipos, efetividade, autor e horários e preservam os textos e a origem dos controles de fábrica. A exclusão direta de controles não é permitida.

O módulo não concede acesso à Central de Licenças SIGA Lite; a autorização administrativa desse serviço continua independente.

## Publicação e testes

A publicação exige a nova tela, scripts, CSS e regras Firestore. Não requer nova Cloud Function nem envio de segredos. As regras podem ser publicadas com `firebase deploy --project gesproc2 --only firestore:rules`; o frontend utiliza o Hosting já existente.

Testes: `npm run test:unit` e `npm run test:e2e:controles`. A interface é verificada com Firebase simulado e base temporária, sem emitir licenças nem modificar processos de produção. A compilação das regras também foi conferida no Firebase.
