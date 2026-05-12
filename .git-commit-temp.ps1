# Script temporário para commit e push
$ErrorActionPreference = "Stop"

# Navegar para o diretório do projeto
Set-Location "c:\Users\FelipeT\Documents\siga2.0"

# Configurar git temporário se não estiver configurado
$gitConfigUser = git config user.name 2>$null
if (-not $gitConfigUser) {
    git config user.name "Felipe Tourinho"
    git config user.email "felipe.tourinho@sefaz.rs.gov.br"
}

# Adicionar arquivos ao staging
Write-Host "Adicionando arquivos ao staging..." -ForegroundColor Cyan
git add processos.html

# Fazer commit
Write-Host "Fazendo commit..." -ForegroundColor Cyan
$commitMessage = "feat: adicionar migração de dt_proximo_acompanhamento

Implementa função migrarProximoAcompanhamento() que:
- Identifica processos publicados sem dt_proximo_acompanhamento
- Calcula automaticamente como dt_efetiva + 180 dias
- Atualiza todos os processos no Firestore
- Fornece relatório detalhado da migração

Adiciona botão na interface Admin para executar a migração.

Resolve problema onde alguns processos não exibiam informação de 
'Entrega efetiva' e 'Próx. acompanhamento' na interface."

git commit -m $commitMessage

# Fazer push
Write-Host "Fazendo push para o repositório remoto..." -ForegroundColor Cyan  
git push origin main

Write-Host "`nConcluído com sucesso!" -ForegroundColor Green
