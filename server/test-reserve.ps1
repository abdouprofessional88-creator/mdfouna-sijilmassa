$B = "http://127.0.0.1:4000"
function Login($id, $pw) {
  $jar = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $body = @{ identifier = $id; password = $pw } | ConvertTo-Json
  Invoke-WebRequest -Uri "$B/api/auth/login" -Method POST -Body $body -ContentType "application/json" -WebSession $jar -UseBasicParsing -TimeoutSec 10 | Out-Null
  return $jar
}
function Req($jar, $method, $url, $body) {
  $p = @{ Uri = "$B$url"; Method = $method; UseBasicParsing = $true; TimeoutSec = 10 }
  if ($jar) { $p.WebSession = $jar }
  if ($body) { $p.Body = ($body | ConvertTo-Json -Depth 5); $p.ContentType = "application/json" }
  try {
    $r = Invoke-WebRequest @p
    return @{ code = $r.StatusCode; json = ($r.Content | ConvertFrom-Json) }
  } catch {
    $c = 0
    if ($_.Exception.Response) { $c = [int]$_.Exception.Response.StatusCode }
    return @{ code = $c; json = $null }
  }
}
$demo = Login "demo@sijilmassa.ma" "Demo1234"
$staff = Login "staff@sijilmassa.ma" "Staff1234"
$good = @{ reservation_date = "2026-12-01"; start_time = "19:30"; guest_count = 4; occasion = "family"; special_requests = "quiet table"; table_id = 3 }
$r = Req $demo "POST" "/api/reservations" $good
"create: code=" + $r.code + " status=" + $r.json.reservation.status + " table=" + $r.json.reservation.table_number + " id=" + $r.json.reservation.id
$rid = $r.json.reservation.id
$past = @{ reservation_date = "2020-01-01"; start_time = "19:30"; guest_count = 2 }
$t = Req $demo "POST" "/api/reservations" $past
"past date: code=" + $t.code + " want=422"
$bad = @{ reservation_date = "2026-12-01"; start_time = "19:30"; guest_count = 4; table_id = 9999 }
$t = Req $demo "POST" "/api/reservations" $bad
"bad table: code=" + $t.code + " want=422"
$t = Req $null "POST" "/api/reservations" $good
"unauth: code=" + $t.code + " want=401"
$r = Req $staff "GET" ("/api/staff/reservations?date=2026-12-01")
$n = $r.json.reservations.Count
"staff sees new: code=" + $r.code + " n=" + $n
$found = $false
foreach ($x in $r.json.reservations) { if ($x.id -eq $rid) { $found = $true } }
"new request visible with occasion+notes: " + $found
$r = Req $demo "GET" "/api/menu"
$modes = $r.json.items | Group-Object -Property availability_mode | ForEach-Object { $_.Name + "=" + $_.Count }
"modes: " + ($modes -join " ")
