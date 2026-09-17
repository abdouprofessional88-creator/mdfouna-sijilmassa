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

$r = Req $demo "GET" "/api/menu/options"
"options: code=" + $r.code + " groups=" + $r.json.groups.Count
$mp = 0
$mx = 0
foreach ($g in $r.json.groups) {
  if ($g.scope_value -eq "madfouna" -and $g.sort_order -eq 1) { $mp = $g.id }
  if ($g.scope_value -eq "madfouna" -and $g.sort_order -eq 2) { $mx = $g.id }
}
"portion group=" + $mp + " extras group=" + $mx

$opt1 = @{}
$opt1["$mp"] = "xl"
$opt1["$mx"] = @("cheese")
$item1 = @{ menu_item_id = 1; quantity = 1; options = $opt1; item_note = "" }
$item2 = @{ menu_item_id = 11; quantity = 2; options = @{}; item_note = "" }
$orderBody = @{
  order_type = "delivery"; full_name = "QA Eater"; phone = "0611223344"
  address_line = "Lot 431, Ryad Al Ismailia"; city = "Meknes"
  latitude = 33.895; longitude = -5.545; delivery_notes = "door 3"
  payment_method = "cash"; special_instructions = "test order"
  items = @($item1, $item2)
}
$r = Req $demo "POST" "/api/orders" $orderBody
$o = $r.json.order
"create: code=" + $r.code + " no=" + $o.order_number + " sub=" + $o.subtotal + " fee=" + $o.delivery_fee + " total=" + $o.total + " status=" + $o.status + " pay=" + $o.payment_status
"expect: sub=200.00 fee=0.00 total=200.00"
$oid = $o.id

$r = Req $demo "GET" "/api/orders/mine"
"mine: code=" + $r.code + " n=" + $r.json.orders.Count
$r = Req $demo "GET" ("/api/orders/" + $oid)
"detail: code=" + $r.code + " items=" + $r.json.order.items.Count
$t = Req $null "POST" "/api/orders" $orderBody
"unauth create: code=" + $t.code + " want=401"
$badItem = @{ order_type = "pickup"; full_name = "QA Eater"; phone = "0611223344"; payment_method = "cash"; items = @(@{ menu_item_id = 9999; quantity = 1 }) }
$t = Req $demo "POST" "/api/orders" $badItem
"bad item: code=" + $t.code + " want=422"
$opt2 = @{}
$opt2["$mp"] = "std"
$noAddr = @{ order_type = "delivery"; full_name = "QA Eater"; phone = "0611223344"; payment_method = "cash"; items = @(@{ menu_item_id = 1; quantity = 1; options = $opt2 }) }
$t = Req $demo "POST" "/api/orders" $noAddr
"no address: code=" + $t.code + " want=422"
$r = Req $staff "GET" "/api/staff/orders"
"staff list: code=" + $r.code + " n=" + $r.json.orders.Count
$st = @{ status = "confirmed" }
$t = Req $staff "PATCH" ("/api/staff/orders/" + $oid + "/status") $st
"staff confirm: code=" + $t.code
$st2 = @{ status = "zzz" }
$t = Req $staff "PATCH" ("/api/staff/orders/" + $oid + "/status") $st2
"staff bad-status: code=" + $t.code + " want=422"
$t = Req $demo "GET" "/api/staff/orders"
"customer staff-list: code=" + $t.code + " want=403"
