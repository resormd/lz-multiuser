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
    # CreateProcessWithLogonW limits its target command to 1024 characters.
    # Store only launch code in an owner-controlled folder; no credentials are stored.
    $currentSid = [Security.Principal.WindowsIdentity]::GetCurrent().User
    $targetAccount = New-Object Security.Principal.NTAccount ($env:COMPUTERNAME + '\' + $request.user)
    $targetSid = $targetAccount.Translate([Security.Principal.SecurityIdentifier])
    $jobRoot = Join-Path $env:ProgramData ('windows-user-vscode-' + $currentSid.Value)
    if ($jobRoot -match '[%\r\n"]') { throw 'Unsupported ProgramData path.' }
    $createdRoot = $false
    if (-not (Test-Path -LiteralPath $jobRoot)) {
        [void](New-Item -ItemType Directory -Path $jobRoot -ErrorAction Stop)
        $createdRoot = $true
    }
    $rootInfo = Get-Item -LiteralPath $jobRoot -Force
    if ($rootInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Launcher storage must not be a reparse point.' }
    $rootAcl = Get-Acl -LiteralPath $jobRoot
    if ($rootAcl.GetOwner([Security.Principal.SecurityIdentifier]) -ne $currentSid) { throw 'Launcher storage belongs to a different account.' }
    if ($createdRoot) {
        $rootAcl = New-Object Security.AccessControl.DirectorySecurity
        $rootAcl.SetOwner($currentSid)
        $rootAcl.SetAccessRuleProtection($true, $false)
        foreach ($sid in @($currentSid.Value, 'S-1-5-18', 'S-1-5-32-544')) {
            $rule = New-Object Security.AccessControl.FileSystemAccessRule ([Security.Principal.SecurityIdentifier]$sid), 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow'
            [void]$rootAcl.AddAccessRule($rule)
        }
        $rule = New-Object Security.AccessControl.FileSystemAccessRule ([Security.Principal.SecurityIdentifier]'S-1-5-32-545'), 'ReadAndExecute', 'None', 'None', 'Allow'
        [void]$rootAcl.AddAccessRule($rule)
        Set-Acl -LiteralPath $jobRoot -AclObject $rootAcl
    }
    # Reject an existing root with writable permissions for another account.
    foreach ($rule in $rootAcl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier])) {
        if ($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Value -notin @($currentSid.Value, 'S-1-5-18', 'S-1-5-32-544') -and
            ($rule.FileSystemRights -band ([Security.AccessControl.FileSystemRights]::Write -bor [Security.AccessControl.FileSystemRights]::Delete -bor [Security.AccessControl.FileSystemRights]::ChangePermissions -bor [Security.AccessControl.FileSystemRights]::TakeOwnership))) {
            throw 'Launcher storage has unsafe writable permissions. No permissions were changed on this existing folder.'
        }
    }
    $jobDirectory = Join-Path $jobRoot ([guid]::NewGuid().ToString('N'))
    [void](New-Item -ItemType Directory -Path $jobDirectory)
    $jobAcl = New-Object Security.AccessControl.DirectorySecurity
    $jobAcl.SetOwner($currentSid)
    $jobAcl.SetAccessRuleProtection($true, $false)
    foreach ($sid in @($currentSid.Value, 'S-1-5-18', 'S-1-5-32-544')) {
        [void]$jobAcl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule ([Security.Principal.SecurityIdentifier]$sid), 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow'))
    }
    if ($targetSid -ne $currentSid) {
        [void]$jobAcl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule $targetSid, 'ReadAndExecute', 'ContainerInherit,ObjectInherit', 'None', 'Allow'))
    }
    Set-Acl -LiteralPath $jobDirectory -AclObject $jobAcl
    $scriptFile = Join-Path $jobDirectory 'launch.ps1'
    [IO.File]::WriteAllText($scriptFile, $payload, (New-Object Text.UTF8Encoding $true))
    $powerShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $targetCommand = '"' + $powerShell + '" -NoLogo -NoProfile -File "' + $scriptFile + '"'
    if ($targetCommand.Length -ge 1024) { throw 'Target command exceeds the Windows logon-process limit.' }
    $env:UW_SCRIPT_PATH = $scriptFile
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
    @{jobDirectory=$jobDirectory; commandLength=$targetCommand.Length} | ConvertTo-Json -Compress
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
