$B = "http://127.0.0.1:4000"
$jar = New-Object Microsoft.PowerShell.Commands.WebRequestSession
function Req($method, $url, $body) {
  $p = @{ Uri = "$B$url"; Method = $method; WebSession = $jar; UseBasicParsing = $true; TimeoutSec = 10 }
  if ($body) { $p.Body = ($body | ConvertTo-Json); $p.ContentType = "application/json" }
  try { $r = Invoke-WebRequest @p; return @{ code = $r.StatusCode; json = ($r.Content | ConvertFrom-Json) } }
  catch { $code = [int]$_.Exception.Response.StatusCode; return @{ code = $code; json = $null } }
}
$stamp = Get-Date -Format "HHmmss"
$email = "qa$stamp@sijilmassa.ma"

$r = Req POST "/api/auth/register" @{ full_name = "QA User"; email = $email; phone = "0699$stamp"; password = "Qa123456"; confirm_password = "Qa123456" }
"register(new): $($r.code) user=$($r.json.user.email)"
$r = Req POST "/api/auth/register" @{ full_name = "QA User"; email = $email; phone = "0699$stamp"; password = "Qa123456"; confirm_password = "Qa123456" }
"register(dup): $($r.code) err=$($r.json.error)"
$r = Req POST "/api/auth/login" @{ identifier = $email; password = "wrongpass" }
"login(wrong): $($r.code)"
$r = Req POST "/api/auth/login" @{ identifier = $email; password = "Qa123456" }
"login(phone-ok): $($r.code) user=$($r.json.user.full_name)"
$r = Req GET "/api/auth/me"
"me: $($r.code) role=$($r.json.user.role)"
$r = Req GET "/api/menu"
"menu: $($r.code) cats=$($r.json.categories.Count) items=$($r.json.items.Count) offers=$($r.json.offers.Count)"
$r = Req GET "/api/tables"
"tables: $($r.code) n=$($r.json.tables.Count)"
$r = Req GET "/api/reservations/mine"
"mine(new user): $($r.code) n=$($r.json.reservations.Count)"
$r = Req POST "/api/auth/logout"
"logout: $($r.code)"
$r = Req GET "/api/auth/me"
"me-after-logout: $($r.code)"
$r = Req GET "/api/reservations/mine"
"mine-noauth: $($r.code)"
# demo user seeded reservations
$r = Req POST "/api/auth/login" @{ identifier = "demo@sijilmassa.ma"; password = "Demo1234" }
"demo login: $($r.code)"
$r = Req GET "/api/reservations/mine"
"demo mine: $($r.code) n=$($r.json.reservations.Count) statuses=$((($r.json.reservations | ForEach-Object { $_.status }) -join ','))"
