$ErrorActionPreference = "Stop"

$port = 5000
$listeners = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
if ($listeners) {
  $processIds = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($procId in $processIds) {
    if ($procId -and $procId -ne $PID) {
      Write-Host "Stopping process $procId using port $port..."
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
  }
}

Write-Host "Starting dev server on port $port..."
npx tsx server/index.ts
