$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
Set-Location "C:\Users\Alperen\Desktop\deneme\frontend"
Write-Host "Node: $(node --version)"
Write-Host "Running npm install..."
& npm install
Write-Host "Exit code: $LASTEXITCODE"
