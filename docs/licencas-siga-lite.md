# Central de Licenças SIGA Conecta — configuração e operação

> O licenciamento online desta Central foi retomado na versão 1.0.37. Veja [o modelo atual com dados locais e arquivos de rede](siga-conecta-local-licenca-online.md). A licença por arquivo da 1.0.36 é uma solução histórica, substituída nesta edição.

## Funcionamento

Desde a versão 1.0.29, o instalador apresenta o termo integral e exige apenas o aceite “Li e aceito os Termos de Licença de Uso”. O código distribuído pela CAGE é solicitado e validado pela internet na primeira abertura do aplicativo. Instalações já ativadas preservam sua autorização. Um código não emitido pela CAGE não libera o aplicativo.

Cada licença identifica um órgão e autoriza uma única instalação. O cadastro exige o nome oficial e o CNPJ; a sigla e as observações são opcionais. A primeira ativação reserva o código e muda sua situação de Emitida para Ativada. Outra instalação não pode usar o mesmo código, mesmo depois de revogar e reativar a licença. O órgão vem preenchido da licença e fica fixo. Importar uma base de outro órgão é bloqueado. A CAGE administra os códigos pelo módulo Central de Licenças SIGA Conecta, no menu do SIGA original.

O aplicativo consulta o serviço na abertura e a cada cinco minutos durante o uso. Uma autorização válida permite até sete dias sem internet, contados desde a última validação bem-sucedida. Falhas de rede não reiniciam esse prazo.

Uma revogação recebida bloqueia as operações e permanece registrada nas próximas aberturas offline. Uma máquina desconectada não recebe a revogação instantaneamente: pode continuar até vencer sua autorização de sete dias. Depois, só uma nova confirmação online de licença ativa libera o uso.

O bloqueio não apaga a base. A tela de licença permite exportar os registros locais e abrir o portal e-CAGE. Cópias antigas já distribuídas precisam ser atualizadas para a versão 1.0.22 ou posterior; elas não recebem retroativamente este controle.

## Segurança e privacidade

- O Firebase recebe dados de controle da licença e instalação. A verificação não envia processos, mapeamentos ou documentos da base local.
- Autorizações assinadas com Ed25519; o aplicativo contém somente a chave pública.
- A chave privada fica fora do pacote, em .license-secrets/signing-key.pem, para envio exclusivo ao Secret Manager do projeto Firebase.
- A credencial de ativação é protegida pelo Windows com safeStorage, fora do banco e dos backups. Um backup de dados não ativa outra máquina.
- O servidor guarda o hash do código. O painel exibe o código completo somente na emissão.
- A administração exige token Firebase validado, com verificação de revogação de sessão, e UID expressamente autorizado. O perfil EP comum não concede a permissão.
- Emissão e revogação têm registro de gestão na mesma transação da mudança.
- As coleções siga_lite_licenses, siga_lite_license_audit e siga_lite_license_limits são inacessíveis pelo SDK do navegador nas regras atuais do SIGA.

O controle trabalha junto das proteções do executável e da pasta de instalação. Não é garantia absoluta contra um administrador que adultere o sistema operacional, substitua o programa por uma versão antiga ou restaure imagens completas da máquina. O modo offline não permite revogação instantânea.

## Integração local preparada

Projeto Firebase: gesproc2. Site: sigaepp. Diretório: C:\gesproc-functions.

- functions/licencas-lite.js: serviços sigaLiteLicense e sigaLiteLicenseAdmin.
- functions/license-core.cjs: emissão, consultas, instalações e revogação.
- functions/index.js: registro dos dois serviços, preservando os existentes.
- src/admin/licencas-lite.js: painel que utiliza a sessão Firebase do SIGA original.
- processos.html: carregamento do painel ao fim do documento.

O módulo “Central de Licenças SIGA Conecta” aparece no menu somente para uma conta autorizada pelo servidor. Manipular um botão no navegador não concede permissão.

## Publicação ainda necessária

**O commit do módulo não configura os segredos nem publica os serviços de licença. Complete esta etapa antes de disponibilizar o módulo em produção.**

1. Informar o UID da conta administradora, disponível em Firebase Console → Authentication → Users. UID não é senha ou chave privada.
2. Criar .license-secrets/admin-uids.json com a lista JSON dos UIDs autorizados.
3. Definir os segredos e publicar somente os serviços de licença, usando os comandos abaixo no diretório do SIGA original.
4. Publicar a alteração de hosting depois de revisar seu conteúdo e os arquivos ignorados no firebase.json. Não incluir materiais privados de trabalho.
5. Entrar no SIGA original com a conta autorizada, emitir uma licença de homologação e testar o executável empacotado.
6. Revogar a licença de homologação, conferir o bloqueio e a exportação dos dados. Só então distribuir para os órgãos.

Comandos de configuração (ainda não executados):

    firebase functions:secrets:set SIGA_LITE_LICENSE_SIGNING_KEY --project gesproc2 --data-file "C:\SIGA-Offline\.license-secrets\signing-key.pem"
    firebase functions:secrets:set SIGA_LITE_LICENSE_ADMINS --project gesproc2 --data-file "C:\SIGA-Offline\.license-secrets\admin-uids.json"
    firebase deploy --project gesproc2 --only functions:sigaLiteLicense,functions:sigaLiteLicenseAdmin

Endpoints configurados:

- https://us-central1-gesproc2.cloudfunctions.net/sigaLiteLicense
- https://us-central1-gesproc2.cloudfunctions.net/sigaLiteLicenseAdmin

Conferir os endereços após publicar. A chave pública do aplicativo precisa corresponder à chave privada do servidor; não substituir apenas uma delas.

Para substituir uma máquina ou reinstalar após apagar as credenciais locais, a CAGE deve emitir um novo código para o mesmo órgão e revogar o anterior. Acrescentar usuários locais na instalação ativada não consome novos códigos.

O CNPJ é validado pelos dígitos verificadores, com suporte ao formato numérico e ao alfanumérico conforme a [documentação técnica da Receita Federal](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj).

Referências: [segredos das Cloud Functions](https://firebase.google.com/docs/functions/config-env) e [transações do Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions).

## Testes no repositório do SIGA original

Execute os testes gerais com npm run test:unit e os testes específicos com node --test tests/licencas-lite/*.test.cjs. Estes últimos usam dados temporários e serviços simulados, sem consultar a base de produção.

O workflow atual de publicação em main lista serviços específicos e ainda não inclui sigaLiteLicense e sigaLiteLicenseAdmin. Publique os dois serviços pelos comandos acima após configurar os segredos, ou acrescente-os ao workflow quando a configuração institucional estiver pronta.
