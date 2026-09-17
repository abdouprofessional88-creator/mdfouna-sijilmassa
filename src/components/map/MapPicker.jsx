import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '../../api/client.js'

/**
 * Reusable interactive map (Leaflet + OpenStreetMap — free, no API keys).
 * - "Use my location" ONLY on explicit user click (never auto-requested).
 * - Draggable marker + click-to-select.
 * - Address search + reverse geocoding via OUR server proxy (keys/UA stay server-side).
 * - All GPS/permission/geocoding states handled explicitly in Arabic.
 */

const PIN = (color) => L.divIcon({
  className: 'mappin-wrap',
  html: `<span class="mappin" style="background:${color}">📍</span>`,
  iconSize: [38, 38],
  iconAnchor: [19, 34],
})

export default function MapPicker({ initial, restaurant, onSelect, compact = false }) {
  const mapRef = useRef(null)
  const divRef = useRef(null)
  const markerRef = useRef(null)
  const [pos, setPos] = useState(initial || null) // {lat, lng, accuracy?}
  const [addr, setAddr] = useState('')
  const [addrParts, setAddrParts] = useState(null)
  const [geoState, setGeoState] = useState('idle') // idle|locating|denied|unavailable|timeout|error
  const [revState, setRevState] = useState('idle') // idle|loading|failed
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const posRef = useRef(pos)
  posRef.current = pos

  const center = restaurant && Number.isFinite(restaurant.lat)
    ? [restaurant.lat, restaurant.lng]
    : [33.8935, -5.5473] // Meknes fallback

  // init map once
  useEffect(() => {
    if (mapRef.current || !divRef.current) return
    const map = L.map(divRef.current, { scrollWheelZoom: !compact }).setView(pos?.lat ? [pos.lat, pos.lng] : center, 14)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)
    if (Number.isFinite(center[0])) {
      L.marker(center, { icon: PIN('#274e6d'), interactive: false, keyboard: false })
        .addTo(map).bindTooltip('مطعم مدفونة سجلماسة')
    }
    map.on('click', (e) => place(e.latlng.lat, e.latlng.lng, null, true))
    mapRef.current = map
    if (pos?.lat) place(pos.lat, pos.lng, pos.accuracy ?? null, false)
    return () => { map.remove(); mapRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const place = (lat, lng, accuracy, reverse) => {
    const p = { lat, lng, accuracy: accuracy ?? null }
    setPos(p)
    if (markerRef.current) markerRef.current.setLatLng([lat, lng])
    else if (mapRef.current) {
      markerRef.current = L.marker([lat, lng], { icon: PIN('#bc5a32'), draggable: true }).addTo(mapRef.current)
      markerRef.current.on('dragend', () => {
        const ll = markerRef.current.getLatLng()
        place(ll.lat, ll.lng, null, true)
      })
    }
    mapRef.current?.setView([lat, lng], Math.max(mapRef.current.getZoom(), 15))
    if (reverse) doReverse(lat, lng)
    else onSelect?.({ ...p, formatted: addr, parts: addrParts })
  }

  const doReverse = async (lat, lng) => {
    setRevState('loading')
    try {
      const j = await api.reverseGeocode(lat, lng)
      setAddr(j.formatted || '')
      setAddrParts(j)
      onSelect?.({ lat, lng, accuracy: posRef.current?.accuracy ?? null, formatted: j.formatted || '', parts: j })
    } catch {
      setRevState('failed')
      setAddr('')
      setAddrParts(null)
      onSelect?.({ lat, lng, accuracy: posRef.current?.accuracy ?? null, formatted: '', parts: null, geocodeFailed: true })
    } finally {
      setRevState((s) => (s === 'loading' ? 'idle' : s))
    }
  }

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoState('unavailable')
      return
    }
    setGeoState('locating')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (!Number.isFinite(p.coords.latitude) || !Number.isFinite(p.coords.longitude)) {
          setGeoState('error')
          return
        }
        setGeoState('idle')
        if ((p.coords.accuracy || 0) > 5000) setGeoState('lowaccuracy')
        place(p.coords.latitude, p.coords.longitude, Math.round(p.coords.accuracy || 0), true)
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGeoState('denied')
        else if (err.code === err.TIMEOUT) setGeoState('timeout')
        else if (err.code === err.POSITION_UNAVAILABLE) setGeoState('unavailable')
        else setGeoState('error')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    )
  }

  const search = async (e) => {
    e.preventDefault()
    if (q.trim().length < 2) return
    setSearching(true)
    try {
      const j = await api.searchPlaces(q.trim())
      setSearchResults(j.results || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const GEO_MSG = {
    locating: 'جاري تحديد موقعك…',
    denied: 'رُفض إذن الموقع — فعّله من المتصفح أو اختر يدوياً على الخريطة.',
    unavailable: 'GPS غير متاح على هذا الجهاز — اختر يدوياً على الخريطة.',
    timeout: 'انتهت مهلة تحديد الموقع — حاول مجدداً أو اختر يدوياً.',
    lowaccuracy: 'دقة منخفضة — حرّك الدبوس للتصحيح.',
    error: 'تعذّر تحديد الموقع — اختر يدوياً على الخريطة.',
  }

  return (
    <div className="mapwrap">
      <div className="mapwrap__bar">
        <button type="button" className="btn btn-primary mapwrap__gps" onClick={useMyLocation} disabled={geoState === 'locating'}>
          {geoState === 'locating' ? 'جاري التحديد…' : '📍 استعمل موقعي الحالي'}
        </button>
        <form className="mapwrap__search" onSubmit={search} role="search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن حي أو شارع…" aria-label="البحث عن عنوان" />
          <button type="submit" disabled={searching}>{searching ? '…' : 'بحث'}</button>
        </form>
      </div>
      {geoState !== 'idle' && <p className="mapwrap__note" role="status">{GEO_MSG[geoState]}</p>}
      {searchResults.length > 0 && (
        <ul className="mapwrap__results">
          {searchResults.map((r, i) => (
            <li key={i}>
              <button type="button" onClick={() => { setSearchResults([]); place(r.lat, r.lng, null, true) }}>
                {r.formatted}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div ref={divRef} className="mapwrap__map" role="application" aria-label="خريطة اختيار عنوان التوصيل" />
      <p className="mapwrap__hint">اسحب الدبوس 📍 أو انقر على الخريطة لتصحيح الموقع.</p>
      <div className="mapwrap__addr" aria-live="polite">
        {revState === 'loading' && <span>جاري استخراج العنوان…</span>}
        {revState === 'failed' && <span className="auth__field-err">تعذّر استخراج العنوان — احتفظنا بالإحداثيات، أضف وصفاً قصيراً أدناه.</span>}
        {addr && <span>📌 {addr}</span>}
        {!addr && revState !== 'loading' && <span className="dash__muted">اختر نقطة على الخريطة لعرض العنوان.</span>}
      </div>
    </div>
  )
}
