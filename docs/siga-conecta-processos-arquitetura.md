Conferência de processos da arquitetura — versão 1.0.39

- Indicadores: corrigida a exclusão de processos que possuem subprocessos. A seleção inclui também descendentes e reconhece o mapeamento pelo arq_id, mesmo sem proc_id na arquitetura.
- Mapeamento/POP e visão integrada do processo: indicadores passam a ser encontrados pelo ID do mapeamento ou pelo ID da arquitetura. Corrigida também a lista usada ao alterar a inclusão no POP, para manter o índice consistente com a exibição.
- Base de conhecimento: filtro inclui processos sem mapeamento; busca de POPs publicados respeita esse filtro e percorre descendentes.
- Riscos manuais, catálogo de controles, planos de ação e recomendações já admitem associação à arquitetura antes do mapeamento. Conferidos os catálogos e os testes de associação/persistência. Não é criado um mapeamento para fazer essas associações.
- Listas de tarefas de mapeamento e auditoria continuam exigindo registros na etapa correspondente: cadastrar um processo na arquitetura não equivale a iniciar ou concluir seu mapeamento.
- Minhas tarefas: título, textos auxiliares, filtro, estado vazio e lista de prazos usam tamanhos e espaçamentos compatíveis com os cartões do sistema.

Verificação específica: `node tools/verify-process-architecture.cjs` (requer a cópia desktop preparada em C:/SIGA-Offline).
