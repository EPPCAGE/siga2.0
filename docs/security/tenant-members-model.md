# Modelo de membros por tenant

O modelo alvo de permissao usa um documento por usuario autenticado em:

```text
tenants/{tenantId}/members/{uid}
```

O `{uid}` deve ser o UID real do Firebase Authentication, nao o e-mail. Isso evita ambiguidade, troca de e-mail e problemas de normalizacao.

## Estrutura recomendada

```json
{
  "uid": "firebase-auth-uid",
  "email": "usuario@orgao.gov.br",
  "nome": "Nome do Usuario",
  "roles": ["dono", "gerente_projeto"],
  "active": true,
  "macroprocessoIds": ["macro-123"],
  "processoIds": ["proc-456"],
  "createdAt": "2026-05-09T00:00:00.000Z",
  "updatedAt": "2026-05-09T00:00:00.000Z"
}
```

Para compatibilidade durante a transicao, as regras exemplo tambem aceitam o campo legado:

```json
{
  "role": "ep"
}
```

## Perfis e papeis

| Papel | Uso | Permissao alvo |
|-------|-----|----------------|
| `admin` | Administrador tecnico/institucional | Administra tenant, membros e configuracoes |
| `ep` | Escritorio de Projetos e Processos | Administra dados de processos, projetos, indicadores e solicitacoes |
| `dono` | Dono de processo | Le dados do tenant e cria/acompanha solicitacoes |
| `gestor` | Gestor/aprovador | Le dados e participa de aprovacoes conforme regras de negocio |
| `gerente_projeto` | Gerente de projeto | Le dados e atualiza dados operacionais de projetos quando delegado |

## Migracao de usuarios

A base atual guarda usuarios em `config/usuarios`, mas esse documento normalmente nao contem UID do Firebase Auth. Por isso, a migracao de membros deve ser feita em homologacao com uma destas estrategias:

1. Exportar usuarios do Firebase Auth, cruzar por e-mail e gerar `members/{uid}`.
2. Criar tela administrativa para vincular usuario autenticado ao tenant no primeiro acesso.
3. Criar script controlado que recebe um arquivo CSV/JSON com `uid,email,roles`.

Nao ative regras baseadas em `members/{uid}` enquanto os documentos de membros nao existirem para todos os usuarios ativos.

## Checklist antes de ativar regras robustas

- Todos os usuarios ativos possuem documento `tenants/{tenantId}/members/{uid}`.
- Pelo menos dois usuarios `admin` ou `ep` foram validados para evitar bloqueio administrativo.
- Usuarios `dono`, `gestor` e `gerente_projeto` foram testados em homologacao.
- Regras Firestore foram publicadas primeiro em projeto de homologacao.
- `TENANCY.enabled:true` foi ativado somente no ambiente de teste/homologacao.
