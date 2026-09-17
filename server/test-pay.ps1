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
$cust = Login "customer@sijilmassa.ma" "Customer1234!"
$staff = Login "reception@sijilmassa.ma" "Reception1234!"
$ob = @{
  order_type = "pickup"; full_name = "Pay Tester"; phone = "0611223344"
  payment_method = "card"; special_instructions = "paytest"
  items = @(@{ menu_item_id = 11; quantity = 1; options = @{} })
}
$r = Req $cust "POST" "/api/orders" $ob
"order: code=" + $r.code + " status=" + $r.json.order.status + " pay=" + $r.json.order.payment_status
$oid = $r.json.order.id
$r = Req $cust "POST" "/api/payments/create" @{ order_id = $oid; method = "card" }
"intent: code=" + $r.code + " paystatus=" + $r.json.payment.status + " provider=" + $r.json.provider
$ppid = $r.json.payment.provider_payment_id
$r = Req $cust "GET" ("/api/orders/" + $oid)
"order still pending_payment: " + ($r.json.order.status -eq "pending_payment")
$r = Req $cust "POST" "/api/payments/mock/confirm" @{ provider_payment_id = $ppid; outcome = "paid" }
"mock confirm: code=" + $r.code + " deduped=" + $r.json.deduped
$r = Req $cust "GET" ("/api/orders/" + $oid)
"order received+paid: " + ($r.json.order.status -eq "received")
$r = Req $cust "POST" "/api/payments/mock/confirm" @{ provider_payment_id = $ppid; outcome = "paid" }
"replay deduped: code=" + $r.code + " deduped=" + $r.json.deduped
$r = Req $cust "POST" "/api/payments/create" @{ order_id = $oid; method = "card" }
"second intent after paid: code=" + $r.code + " want=422"
$t = Req $cust "PATCH" ("/api/staff/orders/" + $oid + "/status") @{ status = "delivered"; reason = "" }
"customer staff-write: code=" + $t.code + " want=403"
$t = Req $staff "PATCH" ("/api/staff/orders/" + $oid + "/status") @{ status = "delivered"; reason = "" }
"invalid jump received->delivered: code=" + $t.code + " want=422"
$t = Req $staff "PATCH" ("/api/staff/orders/" + $oid + "/status") @{ status = "accepted"; reason = "" }
"reception accept: code=" + $t.code
