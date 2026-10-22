# Central de Licenças SIGA Conecta — retirada

A Central de Licenças foi removida do código do SIGA em 22/10/2026, incluindo menu, página administrativa, contratos, emissão, consulta, edição cadastral, ativação, validação, revogação e presença. Os módulos Processos e Projetos não dependem mais desse código. Os testes e utilitários exclusivos do licenciamento também foram retirados.

## Serviços já publicados

Remover os exports do código não exclui automaticamente funções antigas no projeto Firebase, especialmente porque o pipeline publica uma lista explícita de serviços. Na publicação desta retirada, desativar explicitamente `sigaLiteLicense` e `sigaLiteLicenseAdmin` na região `us-central1` do projeto `gesproc2`. Essa operação não foi executada pela alteração de código.

Instalações externas antigas que ainda consultam esses endpoints perderão a capacidade de ativar ou renovar a validação após a desativação. O código/executável dessas instalações não está neste repositório e não foi alterado.

Os documentos existentes de licenças, auditoria, limites e presença não são apagados por esta remoção. Permanecem sem acesso pelo SDK do navegador, sujeitos à regra padrão de negação do Firestore. Não há migração nem exclusão automática de dados ou segredos.

Os demais documentos sobre versões antigas do SIGA Conecta são registros históricos, não instruções de implantação da Central atual.
