# Correção dos alertas de dependências — outubro de 2026

Foram atualizados os arquivos de dependências do portal e das Cloud Functions. `npm audit` passou a retornar zero vulnerabilidades nos dois diretórios, incluindo as dependências de desenvolvimento.

- Portal: Vitest e cobertura atualizados para 4.1.12; Vite 8.3.5, PostCSS 8.5.31, source-map-js 1.2.2 e demais transitivas resolvidas pelo lockfile.
- Mermaid foi removido do pacote e do carregamento por CDN de `projetos.html`: não havia chamadas dessa biblioteca no código. Os diagramas Markdown de `docs/architecture/diagrama-arquitetura.md` continuam independentes do pacote npm e são renderizados pelo GitHub/editor.
- DOMPurify servido no navegador atualizado de 3.3.3 para 3.4.17, com URL fixa e SHA-384 recalculado. A remoção da dependência Mermaid também removeu as cópias npm vulneráveis de DOMPurify e KaTeX.
- Cloud Functions: Firebase Admin atualizado de 12.7.0 para 13.10.0, removendo node-forge da árvore; Firebase Functions atualizado de 5.1.1 para 7.4.0, mantendo o runtime Node 20 e as APIs v2 já usadas no código.
- Transitivas do backend: websocket-driver 0.7.5, proxy-addr 2.0.8, form-data 2.5.6, @fastify/busboy 3.2.3, @grpc/grpc-js 1.14.6, protobufjs 7.6.6, body-parser 2.3.0 e qs 6.16.1. A restrição anterior de protobufjs foi atualizada para permitir a linha corrigida 7.6.

## Validação

- Instalação limpa a partir dos dois lockfiles (`npm ci`).
- Auditorias `npm audit` no portal e em `functions/`: zero vulnerabilidades.
- Suíte unitária completa: 425 testes passaram.
- Carregamento de `functions/index.js` em Node 20.20.2: todos os 14 exports carregados; APIs Auth, Firestore e FieldValue disponíveis, sem chamadas a serviços de produção.
- `tests/e2e/projetos-sanitizacao.cjs`: confere o SHA-384 do DOMPurify efetivamente carregado, remoção de scripts/atributos maliciosos e preservação dos handlers autorizados dos templates internos. Pode receber `DOMPURIFY_TEST_PATH` para usar uma cópia local verificada.

Os alertas do GitHub serão reavaliados após estas alterações chegarem à branch padrão. A publicação do frontend e das funções é uma etapa separada.
