try {
    $account = $env:COMPUTERNAME + '\' + $request.user
    $ids = @()
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        $ids = @(Get-CimInstance Win32_Process -Filter "Name='Code.exe' OR Name='Code - Insiders.exe'" | ForEach-Object {
            $owner = Invoke-CimMethod -InputObject $_ -MethodName GetOwner -ErrorAction SilentlyContinue
            if ($owner.ReturnValue -eq 0 -and ($owner.Domain + '\' + $owner.User) -ieq $account -and $_.ExecutablePath -ieq $request.executable) {
                $candidate = Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue
                if ($candidate -and $candidate.MainWindowHandle -ne 0) { $_.ProcessId }
            }
        })
        if ($ids.Count -gt 0) { break }
        Start-Sleep -Milliseconds 2000
    }
    @{account=$account; processes=@($ids)} | ConvertTo-Json -Compress
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
