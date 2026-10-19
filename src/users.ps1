try {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    $users = @(Get-CimInstance Win32_UserAccount -Filter 'LocalAccount=True AND Disabled=False' | Where-Object {
        [int]($_.SID.Split('-')[-1]) -ge 1000 -and $_.Name -notmatch '^CodexSandbox' -and -not $_.Lockout
    } | Sort-Object Name | ForEach-Object {
        $account = $_.Domain + '\' + $_.Name
        @{name=$_.Name; account=$account; current=($account -ieq $identity)}
    })
    @{users=$users} | ConvertTo-Json -Depth 4 -Compress
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
