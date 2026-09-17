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
$manager = Login "manager@sijilmassa.ma" "Manager1234"
$staff = Login "staff@sijilmassa.ma" "Staff1234"
$D = "2027-04-20"
$b1 = @{ reservation_date = $D; start_time = "19:00"; guest_count = 2; table_id = 2 }
$r = Req $demo "POST" "/api/reservations" $b1
"book T2 19:00: code=" + $r.code
$id1 = $r.json.reservation.id
$r = Req $demo "GET" ("/api/tables/available?date=" + $D + "&time=21:00&guests=2")
$t2 = @($r.json.tables | Where-Object { $_.table_number -eq "T2" })
"T2 free adjacent 21:00: " + ($t2.Count -gt 0)
$b2 = @{ reservation_date = $D; start_time = "19:00"; guest_count = 6; table_id = 2 }
"t2 cap 6 guests: code=" + (Req $demo "POST" "/api/reservations" $b2).code + " want=422"
$t = Req $manager "PATCH" "/api/staff/tables/8" @{ status = "maintenance" }
"disable T8: code=" + $t.code
$r = Req $demo "GET" ("/api/tables/available?date=" + $D + "&time=19:30&guests=2")
$t8 = @($r.json.tables | Where-Object { $_.table_number -eq "T8" })
"T8 excluded when disabled: " + ($t8.Count -eq 0)
$t = Req $manager "PATCH" "/api/staff/tables/8" @{ status = "available" }
"re-enable T8: code=" + $t.code
$bc = @{ reservation_date = $D; start_time = "19:30"; guest_count = 2; table_id = 8 }
"book disabled-check T8: code=" + (Req $demo "POST" "/api/reservations" $bc).code + " want=201"
"confirm T2 booking: code=" + (Req $staff "PATCH" ("/api/staff/reservations/" + $id1 + "/status") @{ status = "confirmed" }).code
