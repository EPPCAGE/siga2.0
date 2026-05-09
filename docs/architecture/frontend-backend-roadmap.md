# Ajustes de Frontend e Backend

Este roteiro separa o que precisa mudar no front-end e no back-end para transformar o SIGA em um software cedivel, seguro e instalavel em outros orgaos.

## Front-end

Objetivo: deixar o front-end como interface e orquestrador leve, sem concentrar regra sensivel, permissao ou configuracao institucional.

Prioridade imediata:

- Continuar quebrando `processos.html` em modulos pequenos.
- Separar renderizadores por modulo: arquitetura, solicitacoes, mapeamento, indicadores, auditoria, publicacoes.
- Criar uma camada unica de dados para Firestore, em vez de chamar `doc`, `collection`, `setDoc` e `getDocs` espalhados pela UI.
- Remover gradualmente `onclick` inline e centralizar eventos em controllers.
- Mover CSS para arquivos por dominio visual quando a estrutura JS estiver mais estavel.
- Usar `ORG_CONFIG` e `TENANT_CONFIG` em todo texto institucional ainda hardcoded.

O que nao deve ficar no front-end no produto final:

- Decidir sozinho se o usuario pode aprovar, excluir ou alterar dados criticos.
- Enviar e-mails diretamente como unica fonte de verdade.
- Conter credenciais, chaves privadas ou regras sensiveis.
- Executar conversoes criticas sem auditoria no servidor.

## Backend

Objetivo: transformar operacoes criticas em APIs/Cloud Functions com validacao, auditoria e permissoes por tenant.

Prioridade imediata:

- Criar Cloud Functions para acoes sensiveis:
  - aprovar solicitacao;
  - converter solicitacao em mapeamento;
  - converter solicitacao em analise de aderencia;
  - alterar perfis de usuario;
  - excluir registros;
  - importar planilhas;
  - enviar notificacoes oficiais.
- Criar log de auditoria em `tenants/{tenantId}/audit_logs/{logId}`.
- Validar tenant e perfil no servidor antes de gravar.
- Tornar CORS e origens permitidas parametrizaveis por ambiente.
- Separar ambientes `dev`, `homolog` e `prod` no Firebase.

## Firestore Rules

Estado atual:

- As regras permitem leitura/escrita ampla para qualquer usuario autenticado em varias colecoes.
- Isso funciona para prototipo interno, mas nao e robusto para cessao ou multiempresa.

Modelo alvo:

- Dados de negocio em `tenants/{tenantId}/...`.
- Usuarios com claims ou documento de membership por tenant.
- EP/admin com escrita ampla apenas dentro do seu tenant.
- Dono/gestor com escrita limitada as acoes permitidas.
- Logs de auditoria sem alteracao pelo cliente.

## Storage Rules

Estado atual:

- Pastas como `projetos`, `publicacoes` e `auditoria` aceitam leitura/escrita de qualquer autenticado.

Modelo alvo:

- Arquivos em `tenants/{tenantId}/...`.
- Escrita restrita por papel e tipo de arquivo.
- Tamanho e content-type validados quando possivel.
- Exclusao preferencialmente via backend para gerar auditoria.

## Ordem segura

1. Preparar helpers e documentar modelo alvo.
2. Criar regras exemplo sem ativar.
3. Criar migração de dados para tenant.
4. Criar Cloud Functions para uma primeira acao critica.
5. Alterar o front-end para chamar essa Function.
6. Validar em homologacao.
7. Endurecer regras Firestore/Storage.
8. Repetir para as demais acoes criticas.
