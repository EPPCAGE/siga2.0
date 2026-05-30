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
