# Configurações de caminho
$serverPath = "C:\Users\Aluno_Tarde\Desktop\BoaParte"
$proxyPath = "C:\Users\Aluno_Tarde\Desktop\Servidor-Boa-Parte"
$ngrokJsonPath = "$serverPath\ngrok.json"
$proxyServerJsPath = "$proxyPath\server.js"

# Iniciar servidor local
Start-Process cmd.exe -ArgumentList "/c cd `"$serverPath`" && node server.js"
Write-Host "Servidor Node iniciado" -ForegroundColor Cyan

# Aguardar inicializacao
Start-Sleep -Seconds 15

# Verificar existencia do arquivo ngrok.json
if (-not (Test-Path $ngrokJsonPath)) {
    Write-Host "Erro: ngrok.json nao encontrado" -ForegroundColor Red
    exit
}

# Processar arquivo ngrok.json
try {
    $ngrokData = Get-Content $ngrokJsonPath -Raw | ConvertFrom-Json
    $ngrokUrl = $ngrokData.ngrokUrl
    # Validar URL
    if (-not ($ngrokUrl -match '^https://')) {
        throw "URL invalida: $ngrokUrl"
    }
}
catch {
    Write-Host "Erro no ngrok.json: $_" -ForegroundColor Red
    exit
}

# Atualizar proxy
Write-Host "Atualizando proxy com URL: $ngrokUrl" -ForegroundColor Yellow

# Fazer backup
$backupPath = "$proxyServerJsPath.bak"
Copy-Item $proxyServerJsPath $backupPath -Force
Write-Host "Backup criado: $backupPath" -ForegroundColor DarkGray

# Atualizar URL no arquivo
$content = Get-Content $proxyServerJsPath -Raw
$newContent = $content -replace "target: 'https://[^']*'", "target: '$ngrokUrl'"
Set-Content $proxyServerJsPath $newContent

# Atualizar repositorio Git
Set-Location $proxyPath

git add .
$changes = git status --porcelain

if ($changes) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git commit -m "Atualizacao automatica ngrok $timestamp"
    git push origin main
    Write-Host "Atualizacao enviada para o GitHub" -ForegroundColor Green
}
else {
    Write-Host "Nenhuma alteracao detectada" -ForegroundColor Gray
}

Set-Location $env:USERPROFILE\Desktop

Read-Host "Operacao concluida. Pressione ENTER para sair"