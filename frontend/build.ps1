$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
Set-Location "C:\Users\Alperen\Desktop\deneme\frontend"
npm run build 2>&1
Write-Host "Build exit code: $LASTEXITCODE"
