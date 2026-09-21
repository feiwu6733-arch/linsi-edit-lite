$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
$pythonCommand = Get-Command py.exe -ErrorAction SilentlyContinue
if ($pythonCommand) { & $pythonCommand.Source -3 serve.py; exit $LASTEXITCODE }
$pythonCommand = Get-Command python.exe -ErrorAction SilentlyContinue
if (-not $pythonCommand) { Write-Host 'Please install Python 3.11 or newer, then start again.'; exit 1 }
& $pythonCommand.Source serve.py
exit $LASTEXITCODE
