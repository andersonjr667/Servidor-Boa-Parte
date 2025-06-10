# Caminhos
$serverPath = "C:\Users\Aluno_Tarde\Desktop\BoaParte"
$proxyPath = "C:\Users\Aluno_Tarde\Desktop\Servidor-Boa-Parte"
$ngrokJsonPath = Join-Path $serverPath "ngrok.json"
$proxyServerJsPath = Join-Path $proxyPath "server.js"

# Iniciar servidor Node.js
Start-Process cmd.exe -ArgumentList "/c cd `"$serverPath`" && node server.js"
Write-Host "Servidor Node iniciado." -ForegroundColor Cyan

# Aguardar inicialização
Start-Sleep -Seconds 15

# Verificar existência do ngrok.json
if (-not (Test-Path $ngrokJsonPath)) {
    Write-Host "Erro: ngrok.json não encontrado." -ForegroundColor Red
    exit 1
}

# Ler e validar o conteúdo do ngrok.json
try {
    $ngrokData = Get-Content $ngrokJsonPath -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
    $ngrokUrl = $ngrokData.ngrokUrl

    if (-not ($ngrokUrl -match '^https://')) {
        throw "URL inválida: $ngrokUrl"
    }
}
catch {
    Write-Host "Erro ao processar ngrok.json: $_" -ForegroundColor Red
    exit 1
}

# Backup do server.js do proxy
$backupPath = "$proxyServerJsPath.bak"
Copy-Item $proxyServerJsPath $backupPath -Force
Write-Host "Backup criado: $backupPath" -ForegroundColor DarkGray

# Substituir a URL antiga pela nova
Write-Host "Atualizando proxy com URL: $ngrokUrl" -ForegroundColor Yellow
$content = Get-Content $proxyServerJsPath -Raw
$pattern = "target:\s*['""]https://.*?['""]"
$replacement = "target: '$ngrokUrl'"
$newContent = [regex]::Replace($content, $pattern, $replacement)
Set-Content -Path $proxyServerJsPath -Value $newContent -Encoding UTF8

# Commit e push para o Git
Set-Location $proxyPath
git add .

$changes = git status --porcelain
if ($changes) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git commit -m "Atualização automática ngrok $timestamp"
    git push origin main
    Write-Host "Atualização enviada para o GitHub." -ForegroundColor Green
}
else {
    Write-Host "Nenhuma alteração detectada." -ForegroundColor Gray
}

# --- COMMIT AUTOMÁTICO DA PASTA DB A CADA 10 MINUTOS ---
$boaPartePath = $serverPath
$dbPath = Join-Path $proxyPath "db"

Start-Job -ScriptBlock {
    param($boaPartePath, $dbPath)
    while ($true) {
        Set-Location $boaPartePath
        git add $dbPath
        $changes = git status --porcelain $dbPath
        if ($changes) {
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            git commit -m "Commit automático da pasta db $timestamp"
            git push origin main
            Write-Host "Commit automático da pasta db realizado em $timestamp" -ForegroundColor Green
        } else {
            Write-Host "Nenhuma alteração detectada na pasta db." -ForegroundColor Gray
        }
        for ($i = 600; $i -gt 0; $i -= 10) {
            Write-Host ("[DB] Próximo commit em: {0} segundos" -f $i) -NoNewline
            Start-Sleep -Seconds 10
        }
        Write-Host ""  # Limpa linha
    }
} -ArgumentList $boaPartePath, $dbPath | Out-Null

# --- TIMER PARA O COMMIT DO SERVIDOR-BOA-PARTE (NGROK) ---
Start-Job -ScriptBlock {
    while ($true) {
        for ($i = 600; $i -gt 0; $i -= 10) {
            Write-Host ("[NGROK] Próximo commit em: {0} segundos" -f $i) -NoNewline
            Start-Sleep -Seconds 10
        }
        Write-Host ""  # Limpa linha
    }
} | Out-Null

# Retornar para Desktop
Set-Location "$env:USERPROFILE\Desktop"

# Finalizar
Read-Host "Operação concluída. Pressione ENTER para sair."
