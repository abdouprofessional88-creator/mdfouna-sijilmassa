$B = "http://127.0.0.1:4000"
function Login($id, $pw) {
  $jar = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $body = @{ identifier = $id; password = $pw } | ConvertTo-Json
  $r = Invoke-WebRequest -Uri "$B/api/auth/login" -Method POST -Body $body -ContentType "application/json" -WebSession $jar -UseBasicParsing -TimeoutSec 10
  return @{ jar = $jar; user = ($r.Content | ConvertFrom-Json).user }
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
$R = @{}
$R.cust = Login "customer@sijilmassa.ma" "Customer1234!"
$R.recp = Login "reception@sijilmassa.ma" "Reception1234!"
$R.kit = Login "kitchen@sijilmassa.ma" "Kitchen1234!"
$R.drv = Login "driver@sijilmassa.ma" "Driver1234!"
$R.mgr = Login "manager@sijilmassa.ma" "Manager1234!"
$R.adm = Login "admin@sijilmassa.ma" "Admin1234!"
"roles: " + $R.cust.user.role + "," + $R.recp.user.role + "," + $R.kit.user.role + "," + $R.drv.user.role + "," + $R.mgr.user.role + "," + $R.adm.user.role
$t = Req $null "POST" "/api/auth/login" @{ identifier = "customer@sijilmassa.ma"; password = "badpassxx" }
"bad pw: code=" + $t.code + " want=401"
$t = Req $R.kit.jar "GET" "/api/staff/menu"
"kitchen menu-mgmt: code=" + $t.code + " want=403"
$t = Req $R.drv.jar "GET" "/api/staff/users"
"driver users: code=" + $t.code + " want=403"
$t = Req $R.cust.jar "GET" "/api/staff/orders"
"cust staff: code=" + $t.code + " want=403"

$item = @{ menu_item_id = 11; quantity = 1; options = @{} }
$ob = @{ order_type = "pickup"; full_name = "Flow Test"; phone = "0611223344"; payment_method = "card"; special_instructions = "flowtest"; items = @($item) }
$r = Req $R.cust.jar "POST" "/api/orders" $ob
"order: code=" + $r.code + " st=" + $r.json.order.status
$oid = $r.json.order.id
$r = Req $R.cust.jar "POST" "/api/payments/create" @{ order_id = $oid; method = "card" }
"intent: code=" + $r.code + " p=" + $r.json.payment.status
$ppid = $r.json.payment.provider_payment_id
$r = Req $R.cust.jar "POST" "/api/payments/mock/confirm" @{ provider_payment_id = $ppid; outcome = "paid" }
"confirm: code=" + $r.code + " dedup=" + $r.json.deduped
$r = Req $R.cust.jar "GET" ("/api/orders/" + $oid)
"paid+received: " + ($r.json.order.payment_status -eq "paid" -and $r.json.order.status -eq "received")
$t = Req $R.recp.jar "PATCH" ("/api/staff/orders/" + $oid + "/status") @{ status = "accepted"; reason = "" }
"reception accept: code=" + $t.code
$t = Req $R.kit.jar "PATCH" ("/api/staff/orders/" + $oid + "/status") @{ status = "preparing"; reason = "" }
"kitchen preparing: code=" + $t.code
$t = Req $R.kit.jar "PATCH" ("/api/staff/orders/" + $oid + "/status") @{ status = "ready"; reason = "" }
"kitchen ready: code=" + $t.code
$t = Req $R.drv.jar "POST" ("/api/delivery/" + $oid + "/claim") $null
"note: pickup order cannot be claimed (want 404/422): code=" + $t.code

$ob2 = @{ order_type = "delivery"; full_name = "Flow D"; phone = "0611223344"; address_line = "Rue Test 1"; city = "Meknes"; latitude = 33.895; longitude = -5.545; payment_method = "cash"; special_instructions = "flowtest-d"; items = @($item) }
$r = Req $R.cust.jar "POST" "/api/orders" $ob2
"delivery order: code=" + $r.code + " st=" + $r.json.order.status + " fee=" + $r.json.order.delivery_fee
$did = $r.json.order.id
$r = Req $R.cust.jar "POST" "/api/payments/create" @{ order_id = $did; method = "cash" }
"cash intent: code=" + $r.code
$t = Req $R.recp.jar "PATCH" ("/api/staff/orders/" + $did + "/status") @{ status = "accepted"; reason = "" }
"accept: code=" + $t.code
$t = Req $R.kit.jar "PATCH" ("/api/staff/orders/" + $did + "/status") @{ status = "preparing"; reason = "" }
"preparing: code=" + $t.code
$t = Req $R.kit.jar "PATCH" ("/api/staff/orders/" + $did + "/status") @{ status = "ready"; reason = "" }
"ready: code=" + $t.code
$r = Req $R.drv.jar "GET" "/api/delivery/available"
"driver available sees it: " + (($r.json.orders | Where-Object { $_.id -eq $did }).Count -gt 0)
$t = Req $R.drv.jar "POST" ("/api/delivery/" + $did + "/claim") $null
"claim: code=" + $t.code
$t = Req $R.drv.jar "POST" ("/api/delivery/" + $did + "/claim") $null
"double claim: code=" + $t.code + " want=409"
$t = Req $R.drv.jar "POST" ("/api/delivery/" + $did + "/start") $null
"start: code=" + $t.code
$t = Req $R.drv.jar "POST" ("/api/delivery/" + $did + "/complete") $null
"complete: code=" + $t.code
$r = Req $R.cust.jar "GET" ("/api/orders/" + $did)
"final delivered: " + ($r.json.order.status -eq "delivered")
$t = Req $R.drv.jar "PATCH" ("/api/staff/orders/" + $did + "/status") @{ status = "preparing"; reason = "" }
"driver invalid jump: code=" + $t.code + " want=422"
