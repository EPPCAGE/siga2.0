# Camadas Iniciais do Front-end

Esta divisao estabelece a organizacao minima do front-end antes de refatoracoes maiores. O objetivo e reduzir o monolito com seguranca, mantendo as funcoes globais que ainda sao chamadas por HTML inline.

## Camada Compartilhada

Arquivos em `src/shared/` podem ser usados por Processos e Projetos.

- `tenant-config.js`: configuracao de ambiente e tenant.
- `org-config.js`: identidade institucional e textos parametrizaveis.
- `firebase-helpers.js`: helpers Firebase/Firestore tenant-aware.

## Camada Processos

Arquivos em `src/processos/` pertencem ao modulo Processos.

- `app-constants.js`: labels, cores e enums.
- `security-utils.js`: escape de HTML e validacao de URLs.
- `storage-utils.js`: acesso seguro a `localStorage`.
- `module-hub-controller.js`: navegacao inicial entre Processos e Projetos.
- `org-branding.js`: aplica identidade institucional no login, hub e exemplos EmailJS.

## Compatibilidade Global

Enquanto houver `onclick` inline e HTML monolitico, novos modulos devem expor no `globalThis` apenas o que a tela precisa chamar.

Exemplos:

```javascript
globalThis.openModuleHub = openModuleHub;
globalThis.fbDocRef = fbDocRef;
```

## Proximas Fronteiras

Ordem recomendada para continuar:

1. `src/processos/services/`: repositorios de dados por dominio.
2. `src/processos/renderers/`: renderizacao de telas por modulo.
3. `src/processos/controllers/`: eventos e orquestracao por modulo.
4. `src/processos/styles/`: CSS extraido por dominio visual.

## Conclusao da Modularizacao Inicial

A etapa inicial fica considerada concluida quando:

- configuracoes institucionais estao fora do monolito;
- helpers compartilhados de Firebase/tenant/storage estao em arquivos proprios;
- constantes e utilitarios basicos estao fora de `processos.html`;
- o controller do hub inicial esta modularizado;
- o front ainda preserva compatibilidade global com os handlers inline existentes;
- smoke tests de Processos e Projetos permanecem aprovados.

## Regra de Seguranca

Cada extracao deve manter aprovados:

- `npm run test:e2e:smoke`
- `npm run test:e2e:projetos`
- `node --check` nos arquivos alterados
- `git diff --check`
