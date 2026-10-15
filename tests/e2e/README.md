# Testes E2E

Scripts Playwright para smoke tests e simulacoes funcionais do SIGA.

Antes de executar, suba um servidor local na raiz do projeto:

```bash
python -m http.server 8000
```

Depois execute um dos comandos:

```bash
npm run test:e2e:smoke
npm run test:e2e:projetos
```

Artefatos gerados ficam em `tests/e2e/artifacts/` e nao devem ser versionados.

Cadastro manual de riscos e integração com o mapeamento:

```bash
node tests/e2e/riscos-manual.cjs
```

Esse teste usa dados e persistência simulados, sem serviços de produção. Valida o cadastro com e sem resposta/controle, recuperação após recarregar os dados, início de mapeamento, permissões e falhas de gravação.

Abas de indicadores e lançamento de resultados dos mapeamentos:

```bash
node tests/e2e/indicadores-manuais.cjs
```

Usa Chromium e persistência simulada para verificar as abas SISPLAN/manuais, vínculos com processos, lançamento e edição de resultados, períodos duplicados, falhas de gravação, recarga dos dados e permissões.
