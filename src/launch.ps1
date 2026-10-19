try {
    if ($request.user -match '[\r\n]' -or $request.user -notmatch '^[\p{L}\p{N}_. -]{1,64}$') { throw 'Unsupported local username format.' }
    if (-not (Test-Path -LiteralPath $request.executable -PathType Leaf)) { throw 'VS Code executable does not exist.' }
    if ((Split-Path -Leaf $request.executable) -notin @('Code.exe', 'Code - Insiders.exe')) { throw 'Select the official VS Code executable.' }
    if (Test-Path -LiteralPath (Join-Path (Split-Path -Parent $request.executable) 'data')) {
        throw 'Portable mode detected. Choose a standard VS Code installation to keep Windows-user data separate.'
    }
    if ($request.bootstrap -match '[%\r\n"]' -or -not (Test-Path -LiteralPath $request.bootstrap -PathType Leaf)) { throw 'Unsupported or missing extension launcher path.' }
    # Pass only public launch settings, never passwords, to the target user's process.
    $settings64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((@{user=$request.user; executable=$request.executable} | ConvertTo-Json -Compress)))
    $payload = @'
$ErrorActionPreference = 'Stop'
try {
    $settings = ConvertFrom-Json ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('__SETTINGS__')))
    if ($env:USERNAME -ine $settings.user) { throw 'Unexpected Windows account. Launch cancelled.' }
    if (-not (Test-Path -LiteralPath $settings.executable -PathType Leaf)) { throw 'The target user cannot access this VS Code installation. Use an all-users installation or adjust the selected path.' }
    foreach ($key in @([Environment]::GetEnvironmentVariables().Keys)) {
        if ($key -match '^(VSCODE_|ELECTRON_|UW_)') { [Environment]::SetEnvironmentVariable($key, $null, 'Process') }
    }
    Start-Process -FilePath $settings.executable -ArgumentList '--new-window' -WorkingDirectory (Split-Path -Parent $settings.executable) -WindowStyle Normal -ErrorAction Stop
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    [void](Read-Host 'Press Enter to close this error window')
    exit 1
}
'@
    $payload = $payload.Replace('__SETTINGS__', $settings64)
    $env:UW_LAUNCH_PAYLOAD = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($payload))
    $env:UW_ACCOUNT = $env:COMPUTERNAME + '\' + $request.user
    $env:UW_SAME_USER = [string][int]([Security.Principal.WindowsIdentity]::GetCurrent().Name -ieq $env:UW_ACCOUNT)
    $cmd = Join-Path $env:SystemRoot 'System32\cmd.exe'
    $line = '"' + $cmd + '" /d /v:off /k ""' + $request.bootstrap + '""'
    $startup = New-Object UserWindowNative+StartupInfo
    $startup.cb = [Runtime.InteropServices.Marshal]::SizeOf($startup)
    $startup.title = 'Windows User VS Code - password'
    $startup.flags = 1
    $startup.show = 1
    $process = New-Object UserWindowNative+ProcessInfo
    $created = [UserWindowNative]::CreateProcessW($cmd, (New-Object Text.StringBuilder $line), [IntPtr]::Zero,
        [IntPtr]::Zero, $false, 0x10, [IntPtr]::Zero, $env:SystemRoot, [ref]$startup, [ref]$process)
    if (-not $created) { throw (New-Object ComponentModel.Win32Exception ([Runtime.InteropServices.Marshal]::GetLastWin32Error())) }
    [void][UserWindowNative]::CloseHandle($process.thread)
    [void][UserWindowNative]::CloseHandle($process.process)
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
