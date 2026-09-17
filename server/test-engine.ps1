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
  if ($body) { $p.Body = ($body | ConvertTo-Json -Depth 6); $p.ContentType = "application/json" }
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
$D = "2027-03-15"

$r = Req $demo "GET" ("/api/tables/available?date=" + $D + "&time=19:30&guests=2")
"avail empty day: code=" + $r.code + " n=" + $r.json.tables.Count + " end=" + $r.json.endTime
$r = Req $demo "GET" ("/api/tables/available?date=" + $D + "&time=19:30&guests=50")
"guests=50: code=" + $r.code + " n=" + $r.json.tables.Count + " reason=" + $r.json.reason
$r = Req $demo "GET" ("/api/tables/available?date=" + $D + "&time=04:00&guests=2")
"outside hours: code=" + $r.code + " reason=" + $r.json.reason
$bk = @{ reservation_date = $D; start_time = "19:30"; guest_count = 2; table_id = 1 }
$r = Req $demo "POST" "/api/reservations" $bk
"book T1 19:30: code=" + $r.code + " id=" + $r.json.reservation.id + " end=" + $r.json.reservation.end_time
$rid = $r.json.reservation.id
$r = Req $demo "GET" ("/api/tables/available?date=" + $D + "&time=19:30&guests=2")
$hasT1 = ($r.json.tables | Where-Object { $_.table_number -eq "T1" }).Count
"T1 blocked same slot: " + ($hasT1 -eq 0)
$r = Req $demo "GET" ("/api/tables/available?date=" + $D + "&time=20:30&guests=2")
$hasT1b = ($r.json.tables | Where-Object { $_.table_number -eq "T1" }).Count
"T1 blocked overlap 20:30: " + ($hasT1b -eq 0)
$r = Req $demo "GET" ("/api/tables/available?date=" + $D + "&time=21:30&guests=2")
$hasT1c = ($r.json.tables | Where-Object { $_.table_number -eq "T1" }).Count
"T1 free adjacent 21:30: " + ($hasT1c -gt 0)
$bk2 = @{ reservation_date = $D; start_time = "20:00"; guest_count = 2; table_id = 1 }
$t = Req $demo "POST" "/api/reservations" $bk2
"overlap create: code=" + $t.code + " want=409"
$t = Req $demo "PATCH" ("/api/reservations/mine/" + $rid + "/cancel") $null
"own cancel: code=" + $t.code
$r = Req $demo "GET" ("/api/tables/available?date=" + $D + "&time=19:30&guests=2")
$hasT1d = ($r.json.tables | Where-Object { $_.table_number -eq "T1" }).Count
"T1 free after cancel: " + ($hasT1d -gt 0)
