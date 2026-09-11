$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Prefer a local venv (venv\ per README, or ttenv\ for this dev machine), else fall back to system python
$venvPython = Join-Path $root "venv\Scripts\python.exe"
$ttenvPython = Join-Path (Split-Path -Parent $root) "ttenv\Scripts\python.exe"
if (Test-Path $venvPython) { $py = $venvPython }
elseif (Test-Path $ttenvPython) { $py = $ttenvPython }
else { $py = "python" }

Start-Process powershell -ArgumentList "-NoExit","-Command","Set-Location $root; & '$py' -m pip install -r requirements.txt -q; & '$py' -m uvicorn gateway:app --reload --host 0.0.0.0 --port 8000"
Start-Sleep 2
Start-Process powershell -ArgumentList "-NoExit","-Command","Set-Location $root\portal; npm install --silent; npx vite --port 5173"
Start-Process powershell -ArgumentList "-NoExit","-Command","Set-Location $root\landing; npm install --silent; npx vite --port 5175"
Write-Host "Backend  : http://localhost:8000" -ForegroundColor Green
Write-Host "API docs : http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "Portal   : http://localhost:5173" -ForegroundColor Green
Write-Host "Landing  : http://localhost:5175" -ForegroundColor Green
