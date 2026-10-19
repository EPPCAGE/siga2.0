# SIGA Conecta 1.0.36 — independente dos projetos pessoais

> Documento histórico. Por decisão posterior, a versão 1.0.37 retomou o licenciamento pelo Firebase e retirou a integração com Drive. Veja [o procedimento atual](siga-conecta-local-licenca-online.md).

A versão 1.0.36 não consulta o Firebase para ativação, validação de licença ou presença. A inicialização, a edição dos registros, os alertas em Minhas tarefas, os anexos e os backups locais funcionam sem serviço central. O diretório de dados e a identidade da instalação permanecem compatíveis com as versões anteriores.

Validação: 68 testes unitários passaram. Os testes de interface validaram emissão da solicitação, importação da licença assinada, cadastro e reinício com chamadas de rede bloqueadas, além dos alertas em Minhas tarefas. O executável final passou nas verificações de integridade e rejeição de adulteração. `tools/verify-siga-independent-package.cjs` verificou o `app.asar`, a ausência de endpoints pessoais, credenciais OAuth compartilhadas e chave privada, e a exclusão do cliente de presença central.

## Licença offline

1. No computador destinatário, clicar em **Gerar solicitação de licença**. O arquivo `.siga-request` contém o identificador da instalação; não contém chave privada, senha nem base de dados.
2. Encaminhar esse arquivo à equipe responsável pela distribuição.
3. Na máquina de emissão, executar na pasta `C:\SIGA-Offline`:

```powershell
node tools/issue-offline-license.cjs --request "C:\Solicitacoes\orgao.siga-request" --organization "Nome oficial do órgão" --cnpj "CNPJ_DO_ORGAO" --key ".license-secrets/signing-key.pem" --out "C:\Licencas\orgao.siga-license"
```

4. Enviar somente o `.siga-license` ao destinatário, que deve clicar em **Importar arquivo de licença**.

A assinatura Ed25519 é verificada localmente com a chave pública do aplicativo. A licença fica vinculada à instalação e ao órgão, sem vencimento de sete dias nem renovação por rede. Arquivos adulterados, de outra instalação ou de outro órgão não são aceitos. Preservar a chave de emissão correspondente à chave pública distribuída; substituí-la exige planejar a atualização das licenças. Não distribuir a chave privada nem a pasta `.license-secrets`.

Autorizações anteriores assinadas como ativas são mantidas na mesma instalação, inclusive após o antigo prazo offline. Uma revogação anteriormente recebida continua bloqueada até uma nova licença offline válida. O licenciamento offline não permite revogação remota. Não há acesso ao servidor anterior na migração.

## Google Drive opcional, com infraestrutura do órgão

O pacote não contém `client_id` ou `client_secret` dos projetos pessoais. As conexões Google antigas não são reutilizadas. O gerador do instalador não lê mais `google-oauth-desktop.json` para embutir credenciais.

Para habilitar o Drive, o próprio órgão deve providenciar um projeto Google Cloud administrado por ele, habilitar a API do Drive e configurar uma credencial OAuth do tipo aplicativo para computador e a autorização de uso de suas contas. Em **Progresso no Drive → Configurar Drive do órgão**, selecionar esse JSON. O aplicativo recusa os identificadores dos projetos pessoais retirados e protege a configuração local com o Windows. As conexões são isoladas por cliente OAuth, usuário e órgão.

Sem essa configuração, o usuário pode continuar com os dados locais, exportar backups e transferir arquivos manualmente. A configuração institucional e a autorização da conta são necessárias para publicar documentos e transferir progresso pelo Drive. A troca de cliente OAuth pode limitar a visibilidade dos arquivos antigos pelo escopo `drive.file`; exportar backups pela versão anterior ou baixar os arquivos pela própria conta antes da migração, conforme necessário. Nenhum arquivo remoto é apagado.

## Uso compartilhado

O aviso de presença central foi retirado. Esta versão informa expressamente que não verifica usuários online. Coordenar o trabalho alternado: importar uma cópia completa substitui os registros locais, e o sistema não mescla edições. Os alertas de prazo de Minhas tarefas continuam funcionando localmente.

## Serviços antigos

As funções e os dados já existentes nos projetos pessoais não são apagados por esta atualização. Versões 1.0.35 e anteriores continuam contendo as dependências antigas e precisam ser substituídas. Desativar serviços usados pelas versões antigas antes da migração pode bloqueá-las; a retirada do pacote novo não exige publicar qualquer alteração no Firebase.
