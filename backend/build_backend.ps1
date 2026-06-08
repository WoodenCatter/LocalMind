$ErrorActionPreference = "Stop"

$BackendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $BackendDir

$Python = Join-Path $BackendDir ".venv\Scripts\python.exe"
if (-not (Test-Path $Python)) {
  $Python = "python"
}

& $Python -m pip install -r requirements.txt
& $Python -m pip install -r requirements-build.txt

& $Python -m PyInstaller `
  --noconfirm `
  --clean `
  --name localmind-backend `
  --onefile `
  --hidden-import hnswlib `
  --hidden-import rank_bm25 `
  --hidden-import jieba `
  --collect-all chromadb `
  --collect-all pypika `
  --collect-all onnxruntime `
  --collect-all rapidocr_onnxruntime `
  --collect-all tokenizers `
  desktop_server.py

Write-Host "Backend executable created at backend\dist\localmind-backend.exe"
