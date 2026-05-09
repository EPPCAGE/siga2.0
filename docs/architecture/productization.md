# Plano de Produto Cedivel

Este plano organiza o SIGA para cessao a outros orgaos sem transformar a evolucao em um refatoramento arriscado. A regra principal e: separar responsabilidades primeiro, migrar dados depois, e so entao endurecer backend/seguranca.

## 1. Configuracao institucional

Objetivo: retirar do codigo nomes, logos, dominios, e-mails, URLs e identidade do orgao.

Estado atual:

- `config/config.example.js` define o modelo publico de configuracao.
- `src/processos/org-config.js` centraliza identidade institucional do modulo Processos.
- `src/shared/tenant-config.js` prepara configuracao de ambiente e tenant.

Proximos ajustes:

- Substituir textos institucionais remanescentes em relatorios, e-mails, POPs e templates.
- Criar um checklist de parametrizacao por orgao antes de instalar.
- Evitar qualquer credencial real em arquivos versionados.

## 2. Multiempresa / multi-tenant

Objetivo: impedir que dados de um cliente/orgao se misturem com dados de outro.

Modelo preparado:

```text
tenants/{tenantId}/processos/{processoId}
tenants/{tenantId}/kpis/{kpiId}
tenants/{tenantId}/config/{documento}
tenants/{tenantId}/solicitacoes/{solicitacaoId}
```

Enquanto `CONFIG.TENANCY.enabled` estiver `false`, o sistema continua usando as colecoes legadas na raiz do Firestore, como `processos`, `kpis` e `config`. Isso evita perda ou sumico de dados na base atual.

Proximos ajustes:

- Consolidar o uso dos repositórios Firestore tenant-aware nos fluxos restantes.
- Validar o script de migracao das colecoes raiz para `tenants/cage-rs/...` em homologacao.
- Atualizar regras Firestore para validar `tenantId` por usuario.

Status: os caminhos ativos continuam legados com `CONFIG.TENANCY.enabled:false`, mas o sistema ja possui caminho alvo tenant-aware por `tenantScopedCollectionPath`/`tenantScopedDocPath`. O script `tools/migrate-firestore-tenant.mjs` gera o plano de migracao sem alterar dados por padrao.

## 3. Backend e seguranca

Objetivo: sair de um front-end que conversa diretamente com tudo para uma arquitetura com APIs, auditoria e permissoes robustas.

Roteiro detalhado: `docs/architecture/frontend-backend-roadmap.md`.

Ordem recomendada:

1. Centralizar acesso a dados em servicos JavaScript internos.
2. Mover operacoes sensiveis para Firebase Cloud Functions.
3. Registrar auditoria de acoes criticas: criar, aprovar, excluir, converter solicitacao, alterar perfil, importar dados.
4. Reescrever regras Firestore por tenant e papel do usuario.
5. Remover credenciais e configuracoes sensiveis do cliente.

## 4. Empacotamento

Objetivo: ter instalacao controlada, versionamento e ambientes separados.

Ordem recomendada:

1. Definir versao do produto (`package.json` + changelog).
2. Separar ambientes `dev`, `homolog` e `prod`.
3. Criar build validado com smoke tests.
4. Criar procedimento de instalacao por orgao.
5. Criar pacote de entrega com codigo, checklist, regras Firebase e documentacao.

## Sequencia segura de execucao

1. Concluir extracao de configuracoes e constantes.
2. Criar camada de dados usando helpers de tenant, ainda com tenant desligado.
3. Rodar smoke tests em Processos e Projetos.
4. Criar migracao controlada para tenant.
5. Ativar tenant primeiro em homologacao.
6. Endurecer regras Firestore e mover operacoes sensiveis para backend.
