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

Com tenant desligado:

```text
processos/{id}
config/usuarios
kpis/{id}
```

Com tenant ligado:

```text
tenants/{tenantId}/processos/{id}
tenants/{tenantId}/config/usuarios
tenants/{tenantId}/kpis/{id}
```

## Cuidados antes de ativar

- Migrar dados existentes para o tenant correto.
- Atualizar todos os pontos de leitura e escrita para usar helpers de caminho.
- Atualizar regras Firestore para impedir acesso cruzado.
- Validar login, solicitacoes, mapeamento, indicadores, relatorios e projetos em homologacao.

## Estado da preparacao

- Processos: leituras/escritas centrais de colecoes de negocio ja usam helpers tenant-aware.
- Projetos: leituras/escritas centrais de projetos, programas e configuracoes ja usam helpers tenant-aware.
- Sessoes de login continuam globais por usuario, fora do tenant.
- `TENANCY.enabled` permanece `false`; por isso os caminhos gerados continuam iguais aos legados.
