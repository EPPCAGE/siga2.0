# Backup completo de Processos

O botão de backup JSON de Processos gera o arquivo `siga-processos-completo-<data-hora>.json`, no formato `SIGA_BACKUP_COMPLETO`, versão 2. O recurso exige sessão Firebase válida e perfil EPP, conferidos também no servidor. A gestão de usuários e a gestão de Projetos foram excluídas deste backup por solicitação do usuário. A exportação própria de Projetos mantém seu formato antigo e continua separada.

## Cobertura

- Todos os documentos das coleções de Processos, Indicadores, Plano de Trabalho e metas, Publicações, Arquitetura, notificações, registros/solicitações de processos, mapeamentos colaborativos (incluindo rascunhos de outros autores), controles, suas aplicações e biblioteca, relatórios de indicadores.
- Documentos de `config` ligados a Processos: arquitetura, objetivos estratégicos compartilhados (`proj_objetivos`), configuração/histórico da cadeia de valor, avaliações/histórico de maturidade da gestão, indicadores descontinuados e relatórios PAT. São excluídos cadastros `usuarios`/`users` e variantes, configurações `proj_*` (exceto objetivos compartilhados) e `riscosProjetoCanvas_*`, inclusive suas subcoleções.
- Coleções legadas `fluxos`, `ideias` e coleções `wf_*`, quando existentes. A lista de módulos está em `COLLECTIONS`, em `functions/system-backup.cjs`; novos módulos com coleções próprias devem ser incorporados a esse registro.
- Subcoleções dos documentos encontrados, com caminhos e IDs preservados.
- Arquivos do bucket Storage padrão que não pertençam aos diretórios de usuários e Projetos: conteúdo binário em blocos base64, nome/caminho, geração, tamanho, tipo de conteúdo e metadados de arquivo. Cada bloco contém SHA-256, conferido antes de baixar o JSON. Ler uma geração específica evita combinar pedaços de versões distintas de um arquivo.

O exportador não usa as listas carregadas no navegador nem exige abrir cada módulo antes. O servidor usa Admin SDK para incluir os rascunhos privados que as regras normais corretamente ocultam do revisor.

## Limites explícitos

O arquivo registra as exclusões e os nomes de coleções encontradas fora do escopo. Não inclui credenciais/contas do Firebase Authentication, senhas, sessões de login, limites de requisição, segredos do servidor, licenciamento retirado, código ou infraestrutura. O cadastro de usuários do SIGA também está excluído (`usuarios` e `config/usuarios`). Nomes, e-mails e IDs que fazem parte de atribuições, autoria e histórico de processos permanecem: a exclusão é do módulo de gestão de usuários, não anonimização dos registros de negócio.

Projetos, Programas e governança não integram o arquivo. Os anexos nos prefixos `projetos/`, `projects/`, `usuarios/`, `users/` e `avatars/` são filtrados na listagem e recusados também em chamadas de leitura direta.

Documentos em sites externos não são copiados: os links permanecem nos dados e referências externas identificadas são listadas no JSON. Arquivos de Processos no Storage padrão do SIGA são incorporados. Se a leitura de uma coleção ou anexo falhar, nenhum arquivo é baixado como backup completo.

As leituras são paginadas e sequenciais; não são um snapshot transacional de todo o banco. Recomenda-se exportar sem edições concorrentes. Documentos-parentes inexistentes que tenham subcoleções órfãs não são enumerados pela consulta normal; um backup forense integral do projeto deve usar ferramentas administrativas do Firestore. Esta versão atende a instalação atual nas coleções raiz; com `TENANT_CONFIG.enabled`, o cliente recusa a operação em vez de exportar dados da raiz equivocadamente. A migração multi-tenant exige adaptar a seleção de escopo e a autorização no servidor.

O JSON é montado no navegador. A paginação e os blocos evitam respostas HTTP enormes, mas bases/anexos maiores que a memória disponível exigem um processo de backup de infraestrutura. Falhas ou cancelamentos interrompem a operação. Dados sensíveis do cadastro e dos documentos integram o arquivo administrativo.

## Formato e restauração

`colecoes` associa cada caminho de coleção a documentos com `id`, `path`, `data` e caminhos de subcoleções. O campo `data` usa envelopes tipados: mapas e arrays são `$type: map/array` com `value`; timestamps preservam segundos/nanossegundos, referências preservam caminhos e bytes são base64. Geopoints, datas e números especiais têm tipos explícitos, sem colidir com campos comuns chamados `$type`.

`anexos` armazena os descritores dos arquivos e seus blocos `{offset, bytes, base64, sha256}`. A recomposição deve conferir tamanho, ordem e hashes antes de gravar o objeto.

A importação antiga de Projetos permanece compatível com arquivos antigos, mas **recusa o backup completo**, para não restaurar apenas parte dos dados por engano. Esta alteração implementa exportação; não cria restauração automática pela interface. Uma restauração administrativa deve decodificar os tipos, planejar colisões/sobrescritas, restaurar documentos/caminhos e arquivos e validar vínculos. Não usar o JSON v2 como entrada direta para `setDoc` sem decodificação.

## Publicação

Publicar a nova função HTTP `systemBackup` junto com o frontend. O pipeline Firebase foi atualizado para isso e configura `SYSTEM_BACKUP_URL` a partir de `FIREBASE_PROJECT_ID`. A função usa as permissões do serviço Firebase para ler Firestore e o Storage padrão; não precisa de um segredo novo. A URL também pode ser definida em `config/config.local.js`/`config.deploy.js`; sem URL explícita, usa o projectId da aplicação Firebase inicializada.

A política CSP da página de Projetos foi alinhada para permitir o endpoint Cloud Functions. Nenhuma regra de leitura do Firestore/Storage foi ampliada para o navegador. Não houve acesso a produção, publicação ou cópia de dados reais durante o desenvolvimento.

## Verificação

- `npm run test:unit`: inclui autorização, origem, serialização, escopo, paginação, rascunhos privados, anexos, integridade e cancelamento.
- `node tests/e2e/system-backup.cjs`: usa Chromium e servidor simulado, verifica o conteúdo do JSON de Processos, as exclusões, a continuidade da exportação independente de Projetos e a ausência de download em falha.
