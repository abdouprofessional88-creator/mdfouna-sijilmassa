$B = "http://127.0.0.1:4000"
function Login($id, $pw) {
  $jar = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $r = Invoke-WebRequest -Uri "$B/api/auth/login" -Method POST -Body (@{ identifier = $id; password = $pw } | ConvertTo-Json) -ContentType "application/json" -WebSession $jar -UseBasicParsing -TimeoutSec 10
  return $jar
}
function Req($jar, $method, $url, $body) {
  $p = @{ Uri = "$B$url"; Method = $method; UseBasicParsing = $true; TimeoutSec = 10 }
  if ($jar) { $p.WebSession = $jar }
  if ($body) { $p.Body = ($body | ConvertTo-Json); $p.ContentType = "application/json" }
  try { $r = Invoke-WebRequest @p; return @{ code = $r.StatusCode; json = ($r.Content | ConvertFrom-Json) } }
  catch { return @{ code = [int]$_.Exception.Response.StatusCode; json = $null } }
}
$stamp = Get-Date -Format "HHmmss"
$staff = Login "staff@sijilmassa.ma" "Staff1234"
$manager = Login "manager@sijilmassa.ma" "Manager1234"
$admin = Login "admin@sijilmassa.ma" "Admin1234"
$customer = Login "demo@sijilmassa.ma" "Demo1234"

"unauth overview: $((Req $null GET '/api/staff/overview').code) (want 401)"
"customer overview: $((Req $customer GET '/api/staff/overview').code) (want 403)"
$r = Req $staff GET "/api/staff/overview"
"staff overview: $($r.code) today=$($r.json.reservations.today) tables_avail=$($r.json.tables.available)"
$r = Req $staff GET "/api/staff/reservations?date=2026-10-02"
"day filter: $($r.code) n=$($r.json.reservations.Count)"
$r = Req $staff GET "/api/staff/reservations?q=0600000000"
"search: $($r.code) n=$($r.json.reservations.Count)"
$id = ($r.json.reservations | Select-Object -First 1).id
"status->seated: $((Req $staff PATCH "/api/staff/reservations/$id/status" @{ status = 'seated' }).code)"
"persist check: $((Req $staff GET "/api/staff/reservations/$id").json.reservation.status)"
"status->confirmed(revert): $((Req $staff PATCH "/api/staff/reservations/$id/status" @{ status = 'confirmed' }).code)"
"bad status: $((Req $staff PATCH "/api/staff/reservations/$id/status" @{ status = 'xxx' }).code) (want 422)"
"customer status-patch: $((Req $customer PATCH "/api/staff/reservations/$id/status" @{ status = 'cancelled' }).code) (want 403)"
"staff create-table: $((Req $staff POST '/api/staff/tables' @{ table_number = 'TMP-1'; capacity = 2; area = 'salle' }).code) (want 403)"
$r = Req $manager POST "/api/staff/tables" @{ table_number = "TMP-$stamp"; capacity = 2; area = 'terrasse'; description = 'test' }
"manager create-table: $($r.code) id=$($r.json.table.id)"
$tid = $r.json.table.id
"manager disable-table: $((Req $manager PATCH "/api/staff/tables/$tid" @{ status = 'maintenance' }).code)"
"manager menu-toggle: $((Req $manager PATCH '/api/staff/menu-items/1' @{ is_available = $false }).code)"
"manager menu-revert: $((Req $manager PATCH '/api/staff/menu-items/1' @{ is_available = $true }).code)"
"staff menu-toggle: $((Req $staff PATCH '/api/staff/menu-items/1' @{ is_available = $false }).code) (want 403)"
"manager create-user: $((Req $manager POST '/api/staff/users' @{ full_name = 'X'; email = 'x@y.ma'; phone = '0600000099'; password = 'Xx123456'; role = 'staff' }).code) (want 403)"
"staff list-users: $((Req $staff GET '/api/staff/users').code) (want 403)"
$r = Req $admin POST "/api/staff/users" @{ full_name = "QA Staff $stamp"; email = "qastaff$stamp@sijilmassa.ma"; phone = "0677$stamp"; password = "Qa123456"; role = "staff" }
"admin create-user: $($r.code) role=$($r.json.user.role)"
"admin list-users: $((Req $admin GET '/api/staff/users').code) n=$((Req $admin GET '/api/staff/users').json.users.Count)"
