$B = "http://127.0.0.1:4000"
function Login($id, $pw) {
  $jar = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  Invoke-WebRequest -Uri "$B/api/auth/login" -Method POST -Body (@{ identifier = $id; password = $pw } | ConvertTo-Json) -ContentType "application/json" -WebSession $jar -UseBasicParsing -TimeoutSec 10 | Out-Null
  return $jar
}
function Req($jar, $method, $url, $body) {
  $p = @{ Uri = "$B$url"; Method = $method; UseBasicParsing = $true; TimeoutSec = 10 }
  if ($jar) { $p.WebSession = $jar }
  if ($body) { $p.Body = ($body | ConvertTo-Json); $p.ContentType = "application/json" }
  try { $r = Invoke-WebRequest @p; return @{ code = $r.StatusCode; json = ($r.Content | ConvertFrom-Json) } }
  catch { return @{ code = [int]$_.Exception.Response.StatusCode; json = $null } }
}
$manager = Login "manager@sijilmassa.ma" "Manager1234"
$staff = Login "staff@sijilmassa.ma" "Staff1234"
$customer = Login "demo@sijilmassa.ma" "Demo1234"
$r = Req $manager GET "/api/staff/settings"
"manager get-settings: $($r.code) keys=$($r.json.settings.PSObject.Properties.Count)"
$r = Req $manager PATCH "/api/staff/settings" @{ opening_hours_note = "TEST-NOTE" }
"manager patch-settings: $($r.code) val=$($r.json.settings.opening_hours_note)"
$r = Req $manager PATCH "/api/staff/settings" @{ opening_hours_note = "DAILY-DEMO" }
"manager revert-settings: $($r.code)"
"staff patch-settings: $((Req $staff PATCH '/api/staff/settings' @{ opening_hours_note = 'X' }).code) (want 403)"
"staff get-settings: $((Req $staff GET '/api/staff/settings').code) (want 403)"
"customer get-settings: $((Req $customer GET '/api/staff/settings').code) (want 403)"
"unauth get-settings: $((Req $null GET '/api/staff/settings').code) (want 401)"
