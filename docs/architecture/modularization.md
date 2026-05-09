# Plano de Modularizacao

O arquivo `processos.html` ainda concentra HTML, CSS e JavaScript do modulo de processos. Para transformar o SIGA em um software cedivel e manutenivel, a divisao deve ser gradual, sempre com smoke test apos cada etapa.

## Principios

- Evitar grandes refatores simultaneos.
- Preservar handlers inline ate que a tela correspondente seja extraida com teste.
- Extrair primeiro blocos sem regra de negocio.
- Manter compatibilidade global enquanto o monolito existir.
- Validar cada etapa com `npm run test:e2e:smoke`.

## Ordem recomendada

1. Configuracao institucional e branding.
2. Utilitarios puros sem dependencia de DOM.
3. Servicos de integracao: Firebase, EmailJS, IA e storage.
4. Camada de dados: usuarios, arquitetura, processos, indicadores e solicitacoes.
5. Renderizadores por modulo: arquitetura, solicitacoes, indicadores, auditoria, publicacoes.
6. Eventos e controllers, removendo progressivamente `onclick` inline.
7. Separacao de CSS por dominio visual.

## Estado atual

- `src/shared/tenant-config.js`: configuracao compartilhada de ambiente/tenant, ainda desligada por padrao para preservar a base legada.
- `src/shared/org-config.js`: configuracao institucional compartilhada entre Processos e Projetos e exposta globalmente como `ORG_CONFIG`.
- `src/shared/firebase-helpers.js`: helpers compartilhados para Firebase/Firestore com caminhos tenant-aware.
- `src/shared/firestore-repositories.js`: camada unica de repositórios Firestore usada pelos modulos.
- `src/processos/app-constants.js`: labels, cores e enums centrais compartilhados pelo modulo Processos.
- `src/processos/module-hub-controller.js`: controller do hub de modulos, mantendo funcoes globais por compatibilidade com HTML inline.
- `src/processos/org-branding.js`: aplicacao da identidade institucional no login, hub e exemplos de e-mail do modulo Processos.
- `src/processos/security-utils.js`: helpers de escape de HTML e validacao de URLs antes de inserir conteudo dinamico.
- `src/processos/storage-utils.js`: utilitarios seguros de `localStorage` e leitura de arrays JSON extraidos do monolito.
- `processos.html` e `scripts.js`: acessos Firestore centrais ja passam por helpers de caminho tenant-aware, mantendo `TENANCY.enabled:false` por compatibilidade.

Detalhamento das camadas iniciais: `docs/architecture/frontend-layers.md`.

Enquanto `processos.html` ainda depender de variaveis globais, novos arquivos em `src/processos/` devem expor apenas objetos/funcoes explicitamente necessarios em `globalThis`.
