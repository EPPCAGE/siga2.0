# Configuracao Institucional

Esta documentacao lista os campos de identidade que devem ser ajustados quando o SIGA for cedido para outro orgao.

## Arquivos

- `config/config.example.js`: modelo publico de configuracao.
- `config/config.local.js`: configuracao local, ignorada pelo Git.
- `config/config.deploy.js`: configuracao de ambiente publicado, ignorada quando contiver dados reais.
- `src/shared/org-config.js`: valores padrao e mesclagem com `window.CONFIG.ORG`.

## Campos Principais

- `systemName`: nome base do sistema.
- `systemBrand`: marca curta exibida em e-mails e mensagens.
- `systemFullName`: nome completo usado em relatorios e textos institucionais.
- `publicUrl`: URL publica do ambiente.
- `organizationName`: nome curto da organizacao.
- `institutionName`: nome institucional completo.
- `officeName`: nome do escritorio de processos.
- `projectOfficeName`: nome do escritorio/projeto usado no modulo Projetos.
- `reportHeaderLabel`: linha institucional de cabecalho em relatorios.
- `supportTeamLabel`: rotulo da equipe de suporte/administracao.
- `epProfileLabel`: nome exibido para o perfil administrador do escritorio.
- `epTeamEmail`: e-mail institucional de contato.
- `supportPortalUrl`: URL do portal de atendimento.
- `allowedDomains`: dominios aceitos para primeiro acesso.
- `domainProfiles`: perfil padrao por dominio.
- `logos.app`: logo principal do sistema.
- `logos.organization`: logo da organizacao.

## Campos de Relatorios e Exportacoes

- `processPresentationFooter`: rodape das apresentacoes de processos.
- `processPresentationClosingMessage`: mensagem padrao de encerramento das apresentacoes.
- `processPresentationClosingFooter`: rodape final das apresentacoes.
- `indicatorReportOrgLabel`: cabecalho do relatorio de indicadores.
- `indicatorReportFooter`: rodape do relatorio de indicadores.

## Regra de Uso

Textos institucionais novos nao devem ser escritos diretamente em `processos.html`, `projetos.html` ou `projetos-logic.js`. Use `ORG_CONFIG`.

Exemplo:

```javascript
ORG_CONFIG.reportHeaderLabel
ORG_CONFIG.publicUrl
ORG_CONFIG.epTeamEmail
```
