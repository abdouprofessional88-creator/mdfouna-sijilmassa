import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { fmtDay, fmtTime } from '../../utils/dates.js'
import { Empty } from './common.jsx'
import MiniMap from '../map/MiniMap.jsx'

/** Driver dashboard: available claims, active delivery, history. */
export default function Driver() {
  const [tab, setTab] = useState('available')
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)
  const [busy, setBusy] = useState(null)
  const [gps, setGps] = useState(null)

  const load = useCallback(async () => {
    setError('')
    try {
      if (tab === 'available') setRows((await api.driverAvailable()).orders)
      else setRows((await api.driverMine(tab !== 'history')).orders)
    } catch (e) {
      setError(e.message)
    }
  }, [tab])

  useEffect(() => { setRows(null); setDetail(null); load() }, [load])

  const act = async (fn, id, label, extra) => {
    if (!window.confirm(`${label}؟`)) return
    setBusy(id)
    try {
      await fn()
      setDetail(null)
      await load()
      if (extra) extra()
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(null)
    }
  }

  const openDetail = async (o) => {
    if (detail?.id === o.id) { setDetail(null); return }
    try {
      setDetail((await api.driverDetail(o.id)).order)
    } catch (e) {
      alert(e.message)
    }
  }

  const locateMe = () => {
    if (!('geolocation' in navigator)) {
      alert('GPS غير متاح على هذا الجهاز.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => alert('تعذّر تحديد موقعك — تحقق من إذن الموقع.'),
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }

  return (
    <>
      <div className="dash__tabs" style={{ border: 0, marginBottom: 14 }}>
        {[{ id: 'available', ar: '🆕 متاحة للاستلام' }, { id: 'active', ar: '🚚 مهامي النشطة' }, { id: 'history', ar: '📁 السجل' }].map((t) => (
          <button key={t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => setTab(t.id)}>{t.ar}</button>
        ))}
      </div>
      {error && <p className="auth__err">{error}</p>}
      {rows === null && <p className="dash__muted">جاري التحميل…</p>}
      {rows !== null && rows.length === 0 && (
        <Empty text={tab === 'available' ? 'لا طلبات متاحة حالياً.' : tab === 'active' ? 'لا مهام نشطة.' : 'لا سجل بعد.'} />
      )}
      {rows !== null && rows.map((o) => (
        <article key={o.id} className="kcard">
          <header>
            <strong dir="ltr">{o.order_number}</strong>
            <small className="dash__muted">{fmtDay(o.created_at)} {fmtTime(String(o.created_at).slice(11))}</small>
          </header>
          <p className="dash__muted">
            {o.city || ''}{o.delivery_distance_km != null && ` · ${o.delivery_distance_km} كم`} · {o.total} درهم
          </p>
          <div className="dash__acts">
            <button onClick={() => openDetail(o)}>{detail?.id === o.id ? 'إخفاء' : 'التفاصيل'}</button>
            {tab === 'available' && (
              <button disabled={busy === o.id} className="act-confirmed" onClick={() => act(() => api.driverClaim(o.id), o.id, 'استلام هذا الطلب')}>
                استلام الطلب
              </button>
            )}
          </div>
          {detail?.id === o.id && (
            <div className="dash__detail-box">
              <p><strong>{detail.full_name}</strong> · <span dir="ltr">{detail.phone}</span></p>
              <p>{detail.address_line} ({detail.city})</p>
              {detail.delivery_notes && <p>📝 {detail.delivery_notes}</p>}
              <ul className="acct__items">
                {detail.items.map((it, i) => (
                  <li key={i}>{it.quantity} × {it.name_ar}</li>
                ))}
              </ul>
              <MiniMap lat={detail.delivery_latitude} lng={detail.delivery_longitude} label="موقع الزبون" />
              <p>
                <a className="maps-link" target="_blank" rel="noreferrer"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${detail.delivery_latitude},${detail.delivery_longitude}`}>
                  🧭 فتح المسار (مطعم ← زبون)
                </a>
                {' '}· <button className="dash__today" style={{ fontSize: 12 }} onClick={locateMe}>موقعي الحالي</button>
                {gps && <small dir="ltr"> {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</small>}
              </p>
              <div className="dash__acts">
                {['assigned_to_driver'].includes(detail.status) && (
                  <button disabled={busy === o.id} className="act-confirmed"
                    onClick={() => act(() => api.driverStart(o.id), o.id, 'بدأت التوصيل بعد استلام الطلب')}>
                    🛵 بدء التوصيل
                  </button>
                )}
                {detail.status === 'out_for_delivery' && (
                  <>
                    <button disabled={busy === o.id} className="act-confirmed"
                      onClick={() => act(() => api.driverComplete(o.id), o.id, 'تأكيد التوصيل')}>
                      ✅ تم التوصيل
                    </button>
                    <button disabled={busy === o.id} className="act-cancelled"
                      onClick={() => {
                        const reason = window.prompt('سبب تعذّر التوصيل:')
                        if (reason) act(() => api.driverFail(o.id, reason), o.id, 'تسجيل التعذّر')
                      }}>
                      تعذّر
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </article>
      ))}
    </>
  )
}
