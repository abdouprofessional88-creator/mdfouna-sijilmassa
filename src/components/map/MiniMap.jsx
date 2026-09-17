import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/** Read-only mini map for staff order details (no interaction needed). */
export default function MiniMap({ lat, lng, label }) {
  const divRef = useRef(null)

  useEffect(() => {
    if (!divRef.current || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return
    const map = L.map(divRef.current, {
      zoomControl: false, dragging: false, scrollWheelZoom: false,
      doubleClickZoom: false, boxZoom: false, keyboard: false,
      attributionControl: false,
    }).setView([Number(lat), Number(lng)], 15)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
    L.marker([Number(lat), Number(lng)], {
      icon: L.divIcon({
        className: 'mappin-wrap',
        html: '<span class="mappin">📍</span>',
        iconSize: [34, 34],
        iconAnchor: [17, 30],
      }),
      interactive: false,
      keyboard: false,
    }).addTo(map)
    return () => map.remove()
  }, [lat, lng])

  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return null
  return (
    <div>
      <div ref={divRef} className="mini-map" aria-label={label || 'موقع التوصيل'} />
      <a className="maps-link" target="_blank" rel="noreferrer"
        href={`https://www.google.com/maps?q=${lat},${lng}`}>
        فتح الموقع في خرائط جوجل ←
      </a>
    </div>
  )
}
