# Configuracao do SIGA

Esta pasta concentra os arquivos de configuracao por ambiente ou cliente.

- `config.example.js`: modelo publico, sem chaves reais.
- `config.local.js`: configuracao local de desenvolvimento. Nao deve ser versionado.
- `config.deploy.js`: configuracao de producao/publicacao. Nao deve ser versionado quando contiver dados reais do cliente.

Para configurar um ambiente, copie `config.example.js` para `config.local.js` ou `config.deploy.js` e preencha os valores necessarios.

## Blocos principais

- `FIREBASE_API_KEY`: chave publica do projeto Firebase usado pelo ambiente.
- `AI_FUNCTION_URL`: URL da Cloud Function/Cloud Run que atende recursos de IA.
- `TENANCY`: configuracao de ambiente e isolamento por orgao/cliente.
- `ORG`: identidade visual e institucional exibida no sistema.

## Multi-tenant

Por padrao, `TENANCY.enabled` fica `false` para preservar a base legada atual nas colecoes raiz do Firestore.

Quando a migracao estiver pronta, cada orgao deve receber um `tenantId` proprio, por exemplo:

```javascript
TENANCY: {
  enabled: true,
  tenantId: 'orgao-exemplo',
  dataRoot: 'tenants',
  environment: 'prod',
}
```

Ativar tenant sem migrar os dados antes pode fazer o sistema parecer vazio, porque ele passara a procurar documentos em outro caminho.
