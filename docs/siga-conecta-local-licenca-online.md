# SIGA Conecta 1.0.37 — dados locais, arquivos de rede e licença online

> Documento histórico. A Central de Licenças e seus serviços foram retirados do código em 22/10/2026. As instruções e verificações de licenciamento abaixo não se aplicam ao código atual. Consulte [a retirada da Central](licencas-siga-lite.md).

Na versão 1.0.38, o aviso de edição simultânea foi movido da faixa fixa para o pop-up inicial de importação. Esse pop-up permite importar um arquivo local/de rede ou continuar com os dados do computador. O aviso explica que alterações paralelas não são mescladas e geram bases diferentes, orientando a evitar uso simultâneo em mais de uma máquina.

Validação: 65 testes unitários passaram, incluindo a transição do licenciamento e as transferências por arquivo. Os testes de interface validaram ativação, revogação, expiração, exportação, importação com cópia anterior e saída sem nuvem. O compartilhamento foi simulado em uma pasta separada; não houve acesso a um servidor SMB do órgão. O executável passou nas verificações de integridade, e o pacote foi conferido por `tools/verify-siga-local-package.cjs`.

## Modelo atual

- Os processos, documentos e anexos ficam no banco local do computador.
- O Firebase pessoal `gesproc2` é utilizado somente para emissão, ativação e validação de licenças. Esta versão não envia a base nem consulta presença de usuários.
- A integração com Google Drive e sua configuração OAuth foram retiradas do aplicativo e do pacote. A abertura não solicita conta Google; ao sair, o aplicativo salva localmente e fecha.
- A Central de Licenças continua emitindo os códigos atuais. A ativação exige internet; uma autorização validada admite até sete dias sem nova confirmação. Revogação e limite de instalação continuam aplicáveis.
- A proposta de 1.000 códigos pré-gerados e a ativação por arquivo offline não foram adotadas nesta versão.

## Transferir progresso pela rede

1. No primeiro computador, clicar em **Salvar progresso**.
2. No diálogo do Windows, escolher uma pasta local, uma unidade de rede mapeada ou um compartilhamento acessível, como `\\servidor\setor\SIGA`.
3. Salvar com um nome novo. O nome sugerido inclui data e identificador para preservar versões.
4. No segundo computador, já autorizado pela licença do mesmo órgão, clicar em **Importar progresso** e escolher o `.siga-backup`.
5. Confirmar a substituição da base local. O aplicativo guarda uma cópia anterior.

Na primeira utilização de um computador que receberá uma base existente, usar a importação inicial antes de cadastrar uma base separada. O arquivo de progresso preserva a identidade da base do órgão. Instalações independentes com identidades diferentes não são mescladas.

A pasta compartilhada contém apenas arquivos de transferência; o banco em uso não é aberto na rede. A exportação cria a cópia SQLite localmente e transfere um arquivo temporário, publicando o nome final depois da cópia completa. Um arquivo de reserva impede duas exportações do aplicativo para o mesmo nome; arquivos anteriores não são sobrescritos. Uma interrupção abrupta pode deixar um `.partial` ou `.lock`; escolher um novo nome permite nova exportação.

A importação primeiro copia o arquivo recebido para o computador e depois verifica a licença e a base. Se a rede falhar durante essa cópia, a base local não é substituída. O aplicativo não verifica automaticamente qual arquivo é o mais recente nem mescla alterações: a equipe deve alternar a edição e selecionar a versão correta.

As permissões e a disponibilidade da pasta de rede dependem da infraestrutura do órgão. Os arquivos de progresso contêm a base completa e devem ser guardados em pastas com acesso apropriado.

## Atualização

Instalações das versões até 1.0.35 com credenciais online válidas preservadas continuam utilizando a mesma ativação. Instalações que passaram a usar exclusivamente o arquivo offline da 1.0.36 podem precisar de um novo código, pois esse arquivo não fornece a credencial de ativação do servidor. Os dados locais são preservados.

As instruções de licença offline e configuração OAuth da 1.0.36 são históricas e não se aplicam a esta edição.
