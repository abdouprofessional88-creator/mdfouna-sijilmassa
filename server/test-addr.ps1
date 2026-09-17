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
$other = Login "manager@sijilmassa.ma" "Manager1234"

$addr = @{ label = "home"; formatted_address = "Test Rue 1, Meknes"; city = "Meknes"; latitude = 33.895; longitude = -5.545; delivery_notes = "door 3" }
$r = Req $demo "POST" "/api/addresses" $addr
"save addr: code=" + $r.code + " def=" + $r.json.address.is_default
$aid = $r.json.address.id
$addr2 = @{ label = "work"; formatted_address = "Test Ave 2, Meknes"; latitude = 33.9; longitude = -5.55 }
$r = Req $demo "POST" "/api/addresses" $addr2
"save addr2: code=" + $r.code + " def=" + $r.json.address.is_default
$aid2 = $r.json.address.id
$r = Req $demo "GET" "/api/addresses"
"list: code=" + $r.code + " n=" + $r.json.addresses.Count
$t = Req $demo "PATCH" ("/api/addresses/" + $aid2) @{ is_default = $true }
"set default: code=" + $t.code
$r = Req $demo "GET" "/api/addresses"
"defaults count=" + @(($r.json.addresses | Where-Object { $_.is_default }).Count)
$t = Req $other "GET" ("/api/addresses")
"other user sees demo addrs: n=" + $t.json.addresses.Count + " want=0"
$t = Req $other "PATCH" ("/api/addresses/" + $aid) @{ city = "Fes" }
"cross-user edit: code=" + $t.code + " want=404"
$t = Req $demo "POST" "/api/addresses" @{ label = "home"; formatted_address = "x"; latitude = 200; longitude = 0 }
"bad coords: code=" + $t.code + " want=422"
$t = Req $demo "DELETE" ("/api/addresses/" + $aid2) $null
"delete: code=" + $t.code
$r = Req $demo "GET" "/api/addresses"
"after delete n=" + $r.json.addresses.Count + " newdef=" + ($r.json.addresses | Select-Object -First 1).is_default
