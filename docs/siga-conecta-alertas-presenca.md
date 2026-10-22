# SIGA Conecta — alertas de prazo e uso simultâneo

> Documento histórico. A Central de Licenças e seus serviços foram retirados do código em 22/10/2026. As instruções e verificações de licenciamento abaixo não se aplicam ao código atual. Consulte [a retirada da Central](licencas-siga-lite.md).

> Histórico da versão 1.0.35. A versão 1.0.36 preserva os alertas locais e retira a presença e o licenciamento centralizados. Veja [a migração sem Firebase](siga-conecta-sem-firebase.md).

## Alertas em Minhas tarefas

A versão 1.0.35 apresenta vencidos, vencimentos de hoje e dos próximos sete dias. Revisões e acompanhamentos de processos usam janela de 30 dias. A data de referência é a de São Paulo, com comparação por dia de calendário.

Entram os prazos de entrega/etapa do mapeamento, melhorias do processo, ações corretivas de auditoria, tratamentos de riscos, planos/ações em execução ou verificação e recomendações/apontamentos abertos. Os alertas abrem o processo ou registro correspondente.

A visão inicial considera o responsável selecionado e tarefas compartilhadas da fila da equipe. Uma opção explícita amplia para os demais responsáveis do órgão. São exibidos oito itens inicialmente, ordenados do mais atrasado ao mais distante, com opção de expandir.

Não entram datas informativas (documento, recebimento, vigência do POP), períodos dos indicadores, prazos técnicos de licença, planos em rascunho/concluídos, ações concluídas, tratamentos implementados, recomendações encerradas, nem processos suspensos/cancelados. Evidência de ação corretiva já enviada não gera cobrança de execução ao responsável enquanto aguarda validação.

## Aviso de uso simultâneo

O aplicativo consulta o endpoint existente `sigaLiteLicense` com a ação `presence`. A credencial da instalação é validada no servidor. O CNPJ vem da licença, nunca de um órgão informado livremente pelo cliente. Licenças diferentes do mesmo CNPJ encontram as mesmas sessões, independentemente da conta Google utilizada.

Cada processo do aplicativo possui uma sessão aleatória. A cada minuto, envia nome do usuário local e sinal de edição recente (últimos dois minutos). Operações gravadas e alterações em campos do formulário alimentam esse sinal. Não são enviados registros, anexos, textos de formulários, e-mails ou caminhos locais. O nome é o cadastro local, não uma identidade de usuário autenticada pelo servidor.

A sessão expira após três minutos sem sinal. A saída normal envia a remoção, com prazo curto de rede; falhas, desligamentos e encerramentos forçados são cobertos pela expiração. Sessões expiradas são descartadas na próxima consulta do órgão. Um documento por hash do CNPJ guarda as sessões no Firestore (`siga_conecta_presence`), inacessível diretamente pelo SDK nas regras atuais. `expiresAt` está preparado para política de TTL; essa política não é criada automaticamente. Sem ela, o último documento pode permanecer armazenado, mas seus usuários expirados não são considerados online.

O segundo usuário recebe aviso ao entrar; enquanto existir outra sessão, uma faixa permanece visível. A ausência de resposta não é apresentada como ausência de usuários. O aplicativo mostra que a verificação está indisponível, sem bloquear o trabalho local.

Texto do aviso:

> Outro servidor deste órgão está usando o SIGA Conecta. As alterações feitas em computadores diferentes não são combinadas automaticamente. Combinem quem continuará a edição. Antes de retomar, importe o progresso mais recente; importar outra base substitui os dados locais.

O mecanismo é consultivo: não oferece bloqueio exclusivo nem mescla de bases. Computadores sem internet e versões antigas não anunciam presença. A proteção existente contra envio de uma base desatualizada ao Drive é preservada.

## Publicação

Publicado em 15/10/2026 no projeto `gesproc2`, somente `sigaLiteLicense` (us-central1). O Firebase confirmou a atualização. O teste em `tools/verify-siga-conecta-presence.mjs` confirmou que a ação `presence` está acessível, que `presence` e `check` recusam credenciais sintéticas com HTTP 401 `invalid-license` e que GET é recusado com HTTP 405. Não foram criadas licenças ou sessões reais para essa verificação.

Validação local: 74 testes unitários do aplicativo e nove do serviço de licenças/presença passaram. O teste funcional `tests/deadlines-presence-desktop.cjs` valida o alerta em Minhas tarefas, a abertura do processo, o aviso de segunda sessão, a exibição segura de nomes e as transições de indisponibilidade e ausência de outras sessões. As verificações de integridade do executável também passaram. As sessões remotas foram simuladas; a homologação entre computadores em produção depende da publicação abaixo.

A alteração do serviço está em `functions/license-presence.cjs` e `functions/licencas-lite.js`. Não exige mudar as chaves nem publicar a função administrativa ou o hosting. Para ativar a consulta entre computadores, publicar somente:

```powershell
firebase deploy --project gesproc2 --only functions:sigaLiteLicense
```

Em falhas de acesso ao serviço, os alertas locais continuam funcionando e o aplicativo informa que a verificação de uso simultâneo está indisponível. Resta homologar duas instalações licenciadas do mesmo CNPJ e uma de outro CNPJ, verificando o aviso, o isolamento e a expiração entre computadores reais.
