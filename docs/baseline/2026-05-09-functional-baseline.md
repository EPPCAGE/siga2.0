# Baseline Funcional — 2026-05-09

## Ponto de Controle

- Data UTC: 2026-05-09T18:38:47Z
- Branch: `feat/score-improvements`
- Commit remoto de referencia: `e2b8fa8`
- Objetivo: congelar uma referencia funcional antes dos proximos ajustes estruturais de frontend, backend, tenant e empacotamento.

## Validacoes Executadas

- `npm run test:e2e:smoke`: aprovado.
- `npm run test:e2e:projetos`: aprovado.
- `node --check scripts.js`: aprovado.
- `git diff --check`: aprovado.

Observacoes esperadas nos testes locais:

- `config/config.deploy.js not found`: esperado em desenvolvimento local.
- `legacy config.deploy.js not found`: esperado em desenvolvimento local.
- `Missing or insufficient permissions`: esperado em smoke tests sem usuario autenticado com acesso Firestore completo.

## Fluxos Criticos a Preservar

- Login, primeiro acesso e troca obrigatoria de senha.
- Hub de modulos Processos/Projetos.
- Meus Processos e Fila de Tarefas.
- Solicitacoes: criar, editar, aprovar, converter e excluir.
- Arquitetura: macroprocessos, processos, subprocessos e vinculos.
- Mapeamento ponta a ponta.
- Analise de aderencia ponta a ponta.
- Indicadores: cadastro, edicao, importacao, sincronizacao e relatorios.
- Publicacoes e documentos.
- PAT e metas anuais.
- Projetos: portfolio, programas, cronograma, indicadores e relatorio executivo.
- Permissoes por perfil: EPP, dono, gestor e gerente de projeto.

## Rollback

Rollback de codigo:

```bash
git fetch origin
git checkout feat/score-improvements
git reset --hard e2b8fa8
```

Rollback sem descartar trabalho local:

```bash
git fetch origin
git checkout -b rollback/baseline-2026-05-09 e2b8fa8
```

Rollback de dados:

- Nao executar migracoes multi-tenant diretamente em producao.
- Antes de qualquer migracao Firestore, exportar a base ou criar backup.
- Ativar `TENANCY.enabled:true` apenas em homologacao apos validar copia dos dados.

## Criterio Para Avancar

Qualquer etapa estrutural futura deve manter aprovados:

- smoke test de Processos;
- smoke test de Projetos;
- sintaxe dos arquivos alterados;
- ausencia de credenciais reais em arquivos versionados.
