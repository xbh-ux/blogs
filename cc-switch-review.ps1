#Requires -Version 7.0
[CmdletBinding()]
param(
  [string[]]$Paths = @(),
  [ValidateSet('low', 'medium', 'high', 'xhigh', 'max')]
  [string]$Effort = 'high',
  [string]$Model = 'sonnet',
  [string]$OutputPath = '',
  [int]$TimeoutMinutes = 10,
  [int]$RetryCount = 3,
  [int]$RetryDelaySeconds = 10,
  [switch]$NewSession
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$reviewDir = Join-Path ([System.IO.Path]::GetTempPath()) 'blogs-next-claude-reviews'
$script:ClaudeCommandPath = $null
$script:ClaudeRuntimeEnv = @{}
$script:ClaudeRuntimeSource = @()
$script:UseBareClaude = $false

function Assert-Command {
  param([string]$Name)
  $commands = @(Get-Command $Name -All -ErrorAction SilentlyContinue)
  if (-not $commands -or $commands.Count -eq 0) {
    throw "Missing command: $Name"
  }

  if ($Name -eq 'claude') {
    $preferred = $commands | Where-Object { $_.CommandType -eq 'Application' -and $_.Source -like '*.cmd' } | Select-Object -First 1
    if (-not $preferred) {
      $preferred = $commands | Where-Object { $_.CommandType -eq 'Application' } | Select-Object -First 1
    }
    if (-not $preferred) {
      $preferred = $commands | Select-Object -First 1
    }
    $script:ClaudeCommandPath = $preferred.Source
  }
}

function Assert-ClaudeAuth {
  if ($script:UseBareClaude) {
    Write-Host "[claude] auth: proxy settings"
    return
  }

  $statusRaw = & $script:ClaudeCommandPath auth status
  if (-not $statusRaw) {
    throw 'Unable to read Claude auth status.'
  }

  $loggedIn = $false
  try {
    $status = $statusRaw | ConvertFrom-Json -ErrorAction Stop
    $loggedIn = [bool]$status.loggedIn
  } catch {
    $loggedIn = ($statusRaw -match 'logged.?in|oauth_token|firstParty')
  }

  if (-not $loggedIn) {
    throw 'Claude CLI is not logged in. Run: claude auth login'
  }

  Write-Host "[claude] auth: oauth"
}

function Read-JsonObject {
  param([string]$Path)

  try {
    if (-not (Test-Path -LiteralPath $Path -ErrorAction Stop)) {
      return $null
    }
  } catch {
    Write-Warning "Skipping inaccessible JSON path: $Path"
    return $null
  }

  try {
    return (Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json -ErrorAction Stop)
  } catch {
    Write-Warning "Failed to parse JSON: $Path"
    return $null
  }
}

function Initialize-ClaudeRuntime {
  $candidates = @(
    (Join-Path $HOME '.claude\settings.json'),
    (Join-Path $projectRoot '.claude\settings.json'),
    (Join-Path $projectRoot '.claude\settings.local.json')
  )

  $mergedEnv = @{}
  $sources = New-Object System.Collections.Generic.List[string]

  foreach ($candidate in $candidates) {
    $json = Read-JsonObject -Path $candidate
    if (-not $json -or -not $json.PSObject.Properties['env'] -or -not $json.env) {
      continue
    }

    foreach ($prop in $json.env.PSObject.Properties) {
      $mergedEnv[$prop.Name] = [string]$prop.Value
    }

    $sources.Add($candidate)
  }

  if ($mergedEnv.ContainsKey('ANTHROPIC_AUTH_TOKEN') -and -not $mergedEnv.ContainsKey('ANTHROPIC_API_KEY')) {
    $mergedEnv['ANTHROPIC_API_KEY'] = $mergedEnv['ANTHROPIC_AUTH_TOKEN']
  }

  $script:ClaudeRuntimeEnv = $mergedEnv
  $script:ClaudeRuntimeSource = $sources.ToArray()
  $script:UseBareClaude = $mergedEnv.ContainsKey('ANTHROPIC_API_KEY')

  if ($script:UseBareClaude) {
    $sourceLabel = if ($script:ClaudeRuntimeSource.Count -gt 0) {
      $script:ClaudeRuntimeSource -join ', '
    } else {
      'settings env'
    }

    Write-Host "[claude] proxy config loaded from: $sourceLabel"
  }
}

function Resolve-Targets {
  param([string[]]$CandidatePaths)

  if (-not $CandidatePaths -or $CandidatePaths.Count -eq 0) {
    return @('.')
  }

  $resolved = New-Object System.Collections.Generic.List[string]
  foreach ($candidate in $CandidatePaths) {
    if ([string]::IsNullOrWhiteSpace($candidate)) {
      continue
    }

    $full = if ([System.IO.Path]::IsPathRooted($candidate)) {
      $candidate
    } else {
      Join-Path $projectRoot $candidate
    }

    if (-not (Test-Path -LiteralPath $full)) {
      throw "Path does not exist: $candidate"
    }

    $resolved.Add((Resolve-Path -LiteralPath $full).Path)
  }

  return $resolved.ToArray()
}

function Build-Prompt {
  param([string[]]$TargetPaths)

  $targetBlock = $TargetPaths -join ', '

  "Read only these exact absolute file paths and identify concrete defects: $targetBlock. Do not ask for more targets unless a path is unreadable. Focus on bugs, regressions, maintainability risks, missing error handling, and obvious UI or interaction issues. For frontend files, also inspect repeated information hierarchy, responsive layout risks, style hardcoding that breaks the shared design system, and dead code or logic that is not wired into the UI. Output findings sorted by severity, and every finding must include file path and line number. If there are no clear defects, say 'No clear defects found' and then list residual risks. Do not output patches. Output language: Chinese."
}

function Invoke-ClaudeReview {
  param(
    [string]$PromptText,
    [string]$SelectedModel,
    [string]$SelectedEffort,
    [int]$TimeoutMinutesValue
  )

  $argumentList = @(
    '-p'
    $PromptText
    '--output-format', 'stream-json'
    '--include-partial-messages'
    '--verbose'
    '--permission-mode', 'dontAsk'
    '--allowedTools', 'Read,Grep,Glob,LS'
    '--model', $SelectedModel
    '--effort', $SelectedEffort
  )

  if (-not $NewSession) {
    $argumentList += '--continue'
  }

  if ($script:UseBareClaude) {
    $argumentList += '--bare'
  }

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $script:ClaudeCommandPath
  $psi.WorkingDirectory = $projectRoot
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  foreach ($arg in $argumentList) {
    [void]$psi.ArgumentList.Add($arg)
  }

  foreach ($entry in $script:ClaudeRuntimeEnv.GetEnumerator()) {
    if ($entry.Key -eq 'ANTHROPIC_AUTH_TOKEN') {
      continue
    }

    $psi.Environment[$entry.Key] = [string]$entry.Value
  }

  if ($script:UseBareClaude) {
    $psi.Environment.Remove('ANTHROPIC_AUTH_TOKEN') | Out-Null
  }

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $psi
  [void]$process.Start()

  $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
  $reviewBuilder = New-Object System.Text.StringBuilder
  $stderrLines = New-Object System.Collections.Generic.List[string]
  $printedText = $false

  while (-not $process.HasExited -or -not $process.StandardOutput.EndOfStream -or -not $process.StandardError.EndOfStream) {
    while (-not $process.StandardOutput.EndOfStream) {
      $line = $process.StandardOutput.ReadLine()
      if ([string]::IsNullOrWhiteSpace($line)) {
        continue
      }

      try {
        $payload = $line | ConvertFrom-Json -ErrorAction Stop
      } catch {
        [void]$reviewBuilder.AppendLine($line)
        Write-Host $line
        $printedText = $true
        continue
      }

      $payloadType = $null
      if ($payload -and $payload.PSObject.Properties['type']) {
        $payloadType = [string]$payload.type
      }

      if ($payloadType -eq 'system' -and $payload.PSObject.Properties['subtype'] -and $payload.subtype -eq 'status') {
        Write-Host "[claude] status: $($payload.status)"
        continue
      }

      $eventType = $null
      $deltaType = $null
      if ($payloadType -eq 'stream_event' -and $payload.PSObject.Properties['event'] -and $payload.event) {
        if ($payload.event.PSObject.Properties['type']) {
          $eventType = [string]$payload.event.type
        }
        if ($payload.event.PSObject.Properties['delta'] -and $payload.event.delta -and $payload.event.delta.PSObject.Properties['type']) {
          $deltaType = [string]$payload.event.delta.type
        }
      }

      if ($payloadType -eq 'stream_event' -and $eventType -eq 'content_block_delta' -and $deltaType -eq 'text_delta') {
        $chunk = [string]$payload.event.delta.text
        if ($chunk) {
          [void]$reviewBuilder.Append($chunk)
          Write-Host -NoNewline $chunk
          $printedText = $true
        }
        continue
      }

      if ($payloadType -eq 'result' -and -not $reviewBuilder.Length -and $payload.PSObject.Properties['result'] -and $payload.result) {
        [void]$reviewBuilder.Append([string]$payload.result)
        Write-Host $payload.result
        $printedText = $true
      }
    }

    while (-not $process.StandardError.EndOfStream) {
      $stderrLine = $process.StandardError.ReadLine()
      if (-not [string]::IsNullOrWhiteSpace($stderrLine)) {
        $stderrLines.Add($stderrLine)
      }
    }

    if ($stopwatch.Elapsed.TotalMinutes -ge $TimeoutMinutesValue) {
      try {
        if (-not $process.HasExited) {
          $process.Kill($true)
        }
      } catch {
      }
      throw "Claude review timed out after $TimeoutMinutesValue minutes."
    }

    Start-Sleep -Milliseconds 150
  }

  $process.WaitForExit()
  if ($printedText) {
    Write-Host ''
  }

  if ($process.ExitCode -ne 0) {
    $stderrText = ($stderrLines -join [Environment]::NewLine).Trim()
    $stdoutText = $reviewBuilder.ToString().Trim()
    if ($stderrText) {
      throw "Claude review failed: $stderrText"
    }
    if ($stdoutText) {
      throw "Claude review failed: $stdoutText"
    }
    throw "Claude review failed with exit code $($process.ExitCode)."
  }

  return $reviewBuilder.ToString().Trim()
}

function Test-TransientClaudeFailure {
  param([string]$Message)

  if ([string]::IsNullOrWhiteSpace($Message)) {
    return $false
  }

  $patterns = @(
    '系统服务繁忙',
    'service busy',
    'temporarily unavailable',
    'rate limit',
    'overloaded',
    'timeout'
  )

  foreach ($pattern in $patterns) {
    if ($Message -match $pattern) {
      return $true
    }
  }

  return $false
}

Assert-Command 'claude'
Initialize-ClaudeRuntime
Assert-ClaudeAuth

if ($NewSession) {
  Write-Host "[claude] session: new"
} else {
  Write-Host "[claude] session: continue-last-in-project"
}

$targets = Resolve-Targets -CandidatePaths $Paths
$prompt = Build-Prompt -TargetPaths $targets

if (-not $OutputPath) {
  $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $OutputPath = Join-Path $reviewDir "claude-review-$timestamp.md"
} elseif (-not [System.IO.Path]::IsPathRooted($OutputPath)) {
  $OutputPath = Join-Path $projectRoot $OutputPath
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath) | Out-Null

$review = $null
for ($attempt = 1; $attempt -le $RetryCount; $attempt++) {
  try {
    if ($attempt -gt 1) {
      Write-Host "[claude] retry $attempt/$RetryCount"
    }

    $review = Invoke-ClaudeReview -PromptText $prompt -SelectedModel $Model -SelectedEffort $Effort -TimeoutMinutesValue $TimeoutMinutes
    break
  } catch {
    $message = $_.Exception.Message
    if ($attempt -ge $RetryCount -or -not (Test-TransientClaudeFailure -Message $message)) {
      throw
    }

    Write-Host "[claude] transient failure, retrying in $RetryDelaySeconds seconds..."
    Start-Sleep -Seconds $RetryDelaySeconds
  }
}

if (-not $review) {
  throw 'Claude returned no review output.'
}

$header = @(
  "# Claude Review"
  ""
  "- Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
  "- Model: $Model"
  "- Effort: $Effort"
  "- Targets:"
) + ($targets | ForEach-Object { "  - $_" }) + @("", "---", "")

$content = ($header -join "`n") + $review

Set-Content -Path $OutputPath -Value $content -Encoding UTF8
Write-Host "[review saved] $OutputPath"
Write-Output $OutputPath
