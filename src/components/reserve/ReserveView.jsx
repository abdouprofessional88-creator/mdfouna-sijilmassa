import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { api } from '../../api/client.js'
import { todayKey } from '../../utils/dates.js'

const OCCASIONS = [
  { id: '', ar: 'بدون مناسبة' },
  { id: 'family', ar: 'لمة عائلية 👨‍👩‍👧' },
  { id: 'birthday', ar: 'عيد ميلاد 🎂' },
  { id: 'business', ar: 'عشاء عمل 💼' },
  { id: 'celebration', ar: 'احتفال 🎉' },
  { id: 'other', ar: 'أخرى' },
]

const TIMES = ['12:00', '12:30', '13:00', '13:30', '14:00', '19:00', '19:30', '20:00', '20:30', '21:00']

export function ReserveView({ onDone, onLogin }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    reservation_date: '', start_time: '19:30', guest_count: 2,
    table_id: null, occasion: '', special_requests: '',
  })
  const [avail, setAvail] = useState({ state: 'idle', tables: [], reason: null, endTime: null })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [busy, setBusy] = useState(false)

  // Live availability whenever date/time/guests change
  useEffect(() => {
    if (!user || !form.reservation_date) {
      setAvail({ state: 'idle', tables: [], reason: null, endTime: null })
      return
    }
    let live = true
    setAvail((a) => ({ ...a, state: 'loading' }))
    setForm((f) => ({ ...f, table_id: null }))
    api.availableTables({
      date: form.reservation_date, time: form.start_time, guests: form.guest_count,
    })
      .then((d) => live && setAvail({ state: 'done', tables: d.tables, reason: d.reason, endTime: d.endTime }))
      .catch((e) => live && setAvail({ state: 'error', tables: [], reason: null, endTime: null, msg: e.message }))
    return () => { live = false }
  }, [user, form.reservation_date, form.start_time, form.guest_count])

  if (!user) {
    return (
      <section className="section"><div className="container auth__wrap">
        <div className="auth__card" style={{ textAlign: 'center' }}>
          <h2 className="h2">طلب حجز طاولة</h2>
          <p className="lead" style={{ margin: '10px auto 20px' }}>سجّل الدخول أولاً لنتابع طلبك ونؤكده معك.</p>
          <button className="btn btn-primary" onClick={onLogin}>تسجيل الدخول</button>
        </div>
      </div></section>
    )
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setFieldErrors({})
    try {
      const payload = {
        reservation_date: form.reservation_date,
        start_time: form.start_time,
        guest_count: Number(form.guest_count),
        table_id: form.table_id ? Number(form.table_id) : null,
        occasion: form.occasion || null,
        special_requests: form.special_requests.trim(),
      }
      const { reservation } = await api.createReservation(payload)
      onDone(reservation)
    } catch (err) {
      if (err.details) {
        const flat = {}
        for (const [k, v] of Object.entries(err.details)) flat[k] = v.join('، ')
        setFieldErrors(flat)
      } else setError(err.message) // includes 409 conflict text from the server
    } finally {
      setBusy(false)
    }
  }

  const err = (k) => fieldErrors[k] && <p className="auth__field-err">{fieldErrors[k]}</p>
  const chosen = avail.tables.find((t) => t.id === form.table_id)

  return (
    <section className="section">
      <div className="container checkout">
        <span className="kicker">حجز طاولة</span>
        <h2 className="h2" style={{ margin: '10px 0 6px' }}>اطلب حجزك وسنؤكده معك</h2>
        <p className="lead" style={{ marginBottom: 20, fontSize: 15 }}>
          اختر اليوم والوقت وعدد الضيوف — نعرض لك الطاولات المتاحة فعلاً.
        </p>
        {error && <p className="auth__err" role="alert">{error}</p>}
        <form onSubmit={submit} noValidate className="reserve__form">
          <div className="auth__grid">
            <label>1 · التاريخ<input type="date" className="auth__input" value={form.reservation_date}
              min={todayKey()} onChange={set('reservation_date')} required />
              {err('reservation_date')}</label>
            <label>2 · الوقت
              <select className="auth__input" value={form.start_time} onChange={set('start_time')}>
                {TIMES.map((t) => <option key={t} value={t} dir="ltr">{t}</option>)}
              </select>
              {err('start_time')}</label>
          </div>
          <label>3 · عدد الضيوف
            <span className="cust__qty" style={{ marginTop: 6, width: 'fit-content' }}>
              <button type="button" onClick={() => setForm((f) => ({ ...f, guest_count: Math.max(1, f.guest_count - 1) }))}>−</button>
              <strong>{form.guest_count}</strong>
              <button type="button" onClick={() => setForm((f) => ({ ...f, guest_count: Math.min(30, f.guest_count + 1) }))}>+</button>
            </span>
            {err('guest_count')}</label>

          <div className="tables-pick">
            <span className="occasion__label">4 · اختر طاولتك</span>
            {!form.reservation_date && <p className="dash__muted">اختر التاريخ أولاً لعرض الطاولات المتاحة.</p>}
            {form.reservation_date && avail.state === 'loading' && (
              <div className="tables-pick__grid" aria-label="جاري التحميل">
                {[1, 2, 3].map((i) => <div key={i} className="skel" style={{ minHeight: 90 }}><div className="skel__line w60" /></div>)}
              </div>
            )}
            {form.reservation_date && avail.state === 'error' && (
              <p className="auth__err">{avail.msg || 'تعذّر تحميل الطاولات — حاول مجدداً.'}</p>
            )}
            {form.reservation_date && avail.state === 'done' && avail.tables.length === 0 && (
              <div className="menux__empty">
                <h3>ما كايناش طاولة متاحة فهاد الوقت.</h3>
                <p>جرّب وقتاً آخر أو غيّر عدد الأشخاص.</p>
              </div>
            )}
            {avail.state === 'done' && avail.tables.length > 0 && (
              <>
                <div className="tables-pick__grid">
                  {avail.tables.map((t) => (
                    <button type="button" key={t.id}
                      className={form.table_id === t.id ? 'is-on' : ''}
                      onClick={() => setForm((f) => ({ ...f, table_id: t.id }))}>
                      <strong>طاولة {t.table_number}</strong>
                      <small>{t.capacity} ضيوف · {t.area} · حتى {String(t.slot_end).slice(0, 5)}</small>
                    </button>
                  ))}
                </div>
                {chosen && <p className="tables-pick__sel">✓ اخترت طاولة {chosen.table_number} ({chosen.capacity} ضيوف)</p>}
              </>
            )}
            {err('table_id')}
          </div>

          <div className="occasion">
            <span className="occasion__label">5 · المناسبة (اختياري)</span>
            <div className="occasion__chips">
              {OCCASIONS.map((o) => (
                <button type="button" key={o.id} className={form.occasion === o.id ? 'is-on' : ''}
                  onClick={() => setForm((f) => ({ ...f, occasion: o.id }))}>
                  {o.ar}
                </button>
              ))}
            </div>
          </div>
          <label>6 · طلبات خاصة (اختياري)
            <textarea className="auth__input" rows={3} value={form.special_requests} onChange={set('special_requests')}
              placeholder="بغيت طاولة هادئة… عندنا طفل… مناسبة خاصة…" maxLength={500} />
            {err('special_requests')}</label>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 18 }} disabled={busy || (form.reservation_date && avail.state === 'done' && avail.tables.length === 0)}>
            {busy ? 'جاري إرسال الطلب…' : 'تأكيد طلب الحجز'}
          </button>
        </form>
      </div>
    </section>
  )
}

export function ReserveSuccessView({ reservation, onTrack, onHome }) {
  if (!reservation) return null
  return (
    <section className="section">
      <div className="container auth__wrap">
        <div className="auth__card success-pop" style={{ textAlign: 'center' }}>
          <span className="success-check" aria-hidden="true">✓</span>
          <h2 className="h2" style={{ marginTop: 8 }}>طلبك وصلنا!</h2>
          <p className="lead" style={{ margin: '10px auto' }}>
            {reservation.reservation_date} على الساعة {String(reservation.start_time).slice(0, 5)}
            {reservation.end_time && ` (حتى ${String(reservation.end_time).slice(0, 5)})`} ·
            طاولة {reservation.table_number || 'يحددها الاستقبال'}<br />
            الحالة: <strong>قيد المراجعة</strong> — سنتصل بك قريباً للتأكيد.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 18 }}>
            <button className="btn btn-primary" onClick={onTrack}>حجوزاتي</button>
            <button className="btn btn-outline" onClick={onHome}>الرئيسية</button>
          </div>
        </div>
      </div>
    </section>
  )
}
