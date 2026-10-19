$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$failures = @()
Get-ChildItem -LiteralPath (Join-Path $root 'src') -Filter '*.ps1' | ForEach-Object {
    $tokens = $null
    $errors = $null
    [void][Management.Automation.Language.Parser]::ParseFile($_.FullName, [ref]$tokens, [ref]$errors)
    $failures += $errors
}
if ($failures.Count) { $failures | Out-String | Write-Error; exit 1 }
# Compile only the local native-console declaration; never open a credential prompt in CI.
& ([scriptblock]::Create((Get-Content -LiteralPath (Join-Path $root 'src/native-console.ps1') -Raw)))
if (-not ('UserWindowNative' -as [type])) { throw 'Native console declaration did not compile.' }
Write-Output 'PASS: PowerShell parse and native API declaration compilation'
