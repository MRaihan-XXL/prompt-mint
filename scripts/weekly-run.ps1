# weekly-run.ps1 — DepthGlow weekly pipeline wrapper
# Registered in Task Scheduler: every Saturday 17:00
# Chain: weekly-batch (gen+gate) -> full gate -> thumbs -> sync-vault -> deploy
# Logs to eval-shots/scheduler.log (rotated weekly by filename date)

$ErrorActionPreference = "Continue"
$ROOT = "D:\FlyEnv-Data\server\www\prompt-mint"
$LOG  = "$ROOT\eval-shots\scheduler-$(Get-Date -Format yyyy-MM-dd).log"

function Log($msg) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
    Add-Content -Path $LOG -Value $line
    Write-Host $line
}

Log "=== weekly-run START ==="

# 1. Generate + per-template gate (queue -> demos, only passing stay)
Log "STEP 1: weekly-batch.mjs"
node "$ROOT\scripts\weekly-batch.mjs" 2>&1 | Tee-Object -FilePath $LOG -Append
$batchExit = $LASTEXITCODE
Log "weekly-batch exit=$batchExit"

# 2. Full visual gate (brightness/contrast/CTA/modal) on ALL templates
#    Only run if at least one new demo was generated this session
$demoCount = (Get-ChildItem "$ROOT\demos" -Directory | Measure-Object).Count
Log "STEP 2: deploy-gate.mjs (full, $demoCount demos)"
node "$ROOT\scripts\deploy-gate.mjs" --full 2>&1 | Tee-Object -FilePath $LOG -Append
$gateExit = $LASTEXITCODE
Log "deploy-gate exit=$gateExit"

# 3. Thumbnails for any demo missing a thumb
Log "STEP 3: capture-thumbs.mjs"
node "$ROOT\scripts\capture-thumbs.mjs" 2>&1 | Tee-Object -FilePath $LOG -Append
Log "capture-thumbs exit=$LASTEXITCODE"

# 4. Sync pro/max prompts to Supabase Storage (vault -> bucket)
Log "STEP 4: sync-vault.mjs"
node "$ROOT\scripts\sync-vault.mjs" 2>&1 | Tee-Object -FilePath $LOG -Append
Log "sync-vault exit=$LASTEXITCODE"

# 5. Deploy to Cloudflare (only if gate passed)
if ($gateExit -eq 0) {
    Log "STEP 5: wrangler deploy (gate PASSED)"
    Push-Location $ROOT
    npx wrangler deploy 2>&1 | Tee-Object -FilePath $LOG -Append
    Log "wrangler deploy exit=$LASTEXITCODE"
    Pop-Location
} else {
    Log "STEP 5: SKIPPED deploy — gate FAILED (exit=$gateExit). Templates NOT shipped."
}

Log "=== weekly-run END ==="

# Rotate: delete scheduler logs older than 30 days
Get-ChildItem "$ROOT\eval-shots\scheduler-*.log" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
    Remove-Item -Force
