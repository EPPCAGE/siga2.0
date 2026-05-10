# Multi-Tenant

O SIGA nasceu com colecoes Firestore na raiz do banco. Para cessao a outros orgaos, o modelo alvo deve isolar dados por tenant.

## Configuracao

O arquivo `config/config.example.js` contem:

```javascript
TENANCY: {
  enabled: false,
  tenantId: 'cage-rs',
  dataRoot: 'tenants',
  environment: 'dev',
}
```

- `enabled:false`: usa colecoes legadas, preservando o funcionamento atual.
- `enabled:true`: usa caminhos isolados por tenant.
- `tenantId`: identificador do orgao/cliente.
- `environment`: `dev`, `homolog` ou `prod`.

## Caminhos

O codigo deve sempre montar caminhos por `tenantCollectionPath` e `tenantDocPath`.

Com tenant desligado (`TENANCY.enabled:false`), o caminho ativo segue legado para preservar a base atual:

```text
processos/{id}
config/usuarios
kpis/{id}
```

Com tenant ligado (`TENANCY.enabled:true`), o caminho ativo passa a ser isolado:

```text
tenants/{tenantId}/processos/{id}
tenants/{tenantId}/config/usuarios
tenants/{tenantId}/kpis/{id}
```

Mesmo com tenant desligado, `tenantScopedCollectionPath` e `tenantScopedDocPath` ja permitem prever o caminho alvo da migracao. Isso evita ativar multi-tenant antes dos dados estarem copiados e validados.

## Migracao

Existe um script de preparacao em `tools/migrate-firestore-tenant.mjs`.

Para listar o plano sem alterar dados:

```bash
npm run tenant:migration:plan
```

Para validar contagem e integridade de um tenant ja copiado:

```bash
npm run tenant:migration:validate
```

Para execucao real, usar apenas em homologacao/controlado, com credenciais administrativas configuradas por `GOOGLE_APPLICATION_CREDENTIALS`:

```bash
node tools/migrate-firestore-tenant.mjs --tenant=cage-rs --execute
```

O script copia as colecoes legadas para `tenants/{tenantId}/...` e documentos conhecidos de `config/{doc}` para `tenants/{tenantId}/config/{doc}`. Ele nao apaga a base legada. Apos copiar, valida contagem e integridade por hash dos documentos copiados.

## Membros e permissoes

O modelo alvo de permissao usa:

```text
tenants/{tenantId}/members/{uid}
```

O `uid` deve ser o UID real do Firebase Authentication. O modelo detalhado esta em `docs/security/tenant-members-model.md`.

Enquanto todos os membros nao existirem no tenant, nao publicar regras robustas em producao.

## Cuidados antes de ativar

- Migrar dados existentes para o tenant correto.
- Atualizar todos os pontos de leitura e escrita para usar repositórios Firestore.
- Criar documentos `members/{uid}` para todos os usuarios ativos.
- Atualizar regras Firestore para impedir acesso cruzado.
- Validar login, solicitacoes, mapeamento, indicadores, relatorios e projetos em homologacao.
- Ativar `TENANCY.enabled:true` somente apos comparar base legada e base tenant.

## Estado da preparacao

- Processos: leituras/escritas centrais de colecoes de negocio passam por repositórios tenant-aware.
- Projetos: leituras/escritas centrais de projetos, programas e configuracoes passam por repositórios tenant-aware.
- Sessoes de login usam repositório proprio e serao copiadas se necessario.
- `TENANCY.enabled` permanece `false`; por isso os caminhos gerados continuam iguais aos legados.
