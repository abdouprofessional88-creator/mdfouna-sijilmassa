$B = "http://127.0.0.1:4000"
function Req($method, $url, $body) {
  $p = @{ Uri = "$B$url"; Method = $method; UseBasicParsing = $true; TimeoutSec = 15 }
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
$q = @{ latitude = 33.895; longitude = -5.545; subtotal = 100 }
$r = Req "POST" "/api/delivery/quote" $q
"inside: code=" + $r.code + " zone=" + $r.json.zone + " dist=" + $r.json.distanceKm + " fee=" + $r.json.fee
$q2 = @{ latitude = 34.05; longitude = -5.0; subtotal = 100 }
$r = Req "POST" "/api/delivery/quote" $q2
"outside: code=" + $r.code + " want=422"
$q3 = @{ latitude = 33.895; longitude = -5.545; subtotal = 500 }
$r = Req "POST" "/api/delivery/quote" $q3
"free over min: code=" + $r.code + " fee=" + $r.json.fee + " want=0"
$q4 = @{ latitude = 0; longitude = 0; subtotal = 50 }
$r = Req "POST" "/api/delivery/quote" $q4
"zero coords: code=" + $r.code + " want=422"
$q5 = @{ latitude = 200; longitude = 0; subtotal = 50 }
$r = Req "POST" "/api/delivery/quote" $q5
"bad range: code=" + $r.code + " want=422"
$r = Req "GET" "/api/geo/reverse?lat=33.8935&lon=-5.5473" $null
"reverse: code=" + $r.code
if ($r.code -eq 200) { "addr=" + $r.json.formatted.SubString(0, [Math]::Min(80, $r.json.formatted.Length)) }
$r = Req "GET" "/api/geo/search?q=Ryad%20Al%20Ismailia" $null
"search: code=" + $r.code
if ($r.code -eq 200) { "results=" + $r.json.results.Count }
