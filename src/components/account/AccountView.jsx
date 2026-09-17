import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { api } from '../../api/client.js'
import { toDayKey, fmtDay } from '../../utils/dates.js'
import AddressBook from './AddressBook.jsx'

const STATUS_AR = {
  pending: 'قيد المراجعة', confirmed: 'مؤكدة', seated: 'جالس الآن',
  completed: 'مكتملة', cancelled: 'ملغاة', no_show: 'لم يحضر',
}

const ORDER_STATUS_AR = {
  pending_payment: 'بانتظار الدفع', received: 'مستلم', accepted: 'مقبول',
  preparing: 'قيد التحضير', ready: 'جاهز', assigned_to_driver: 'مع موصل',
  out_for_delivery: 'في الطريق', delivered: 'تم التوصيل',
  cancelled: 'ملغي', rejected: 'مرفوض',
  // legacy (old orders)
  pending: 'قيد المراجعة', confirmed: 'مؤكد', completed: 'مكتمل',
}

const fmtDate = (d) => fmtDay(d)

export default function AccountView({ onLogin }) {
  const { user, logout, refresh } = useAuth()
  const [reservations, setReservations] = useState(null)
  const [orders, setOrders] = useState(null)
  const [openOrder, setOpenOrder] = useState(null)
  const [orderDetail, setOrderDetail] = useState({})
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ full_name: '', phone: '' })
  const [saved, setSaved] = useState('')

  useEffect(() => {
    if (!user) return
    setForm({ full_name: user.full_name, phone: user.phone })
    api.myReservations()
      .then((d) => setReservations(d.reservations))
      .catch((e) => setError(e.message))
    api.myOrders()
      .then((d) => setOrders(d.orders))
      .catch(() => setOrders([]))
  }, [user])

  if (!user) {
    return (
      <section className="section">
        <div className="container auth__wrap">
          <div className="auth__card" style={{ textAlign: 'center' }}>
            <h2 className="h2">حسابي</h2>
            <p className="lead" style={{ margin: '10px auto 20px' }}>سجّل الدخول لعرض ملفك وحجوزاتك.</p>
            <button className="btn btn-primary" onClick={onLogin}>تسجيل الدخول</button>
          </div>
        </div>
      </section>
    )
  }

  const today = toDayKey(new Date())
  const upcoming = (reservations || []).filter((r) => r.reservation_date >= today && !['cancelled', 'completed', 'no_show'].includes(r.status))
  const past = (reservations || []).filter((r) => !upcoming.includes(r))

  const save = async (e) => {
    e.preventDefault()
    setSaved('')
    try {
      await api.updateProfile(form)
      await refresh()
      setEditing(false)
      setSaved('تم حفظ التعديلات ✓')
    } catch (err) {
      setSaved(err.message)
    }
  }

  const reloadReservations = async () => {
    try {
      setReservations((await api.myReservations()).reservations)
    } catch {}
  }

  const cancelRes = async (id) => {
    if (!window.confirm('إلغاء طلب الحجز؟')) return
    try {
      await api.cancelReservation(id)
      await reloadReservations()
    } catch (e) {
      alert(e.message)
    }
  }

  const Card = ({ r }) => (
    <article className="acct__res">
      <div>
        <strong>{fmtDate(r.reservation_date)} — {String(r.start_time).slice(0, 5)}{r.end_time ? ` حتى ${String(r.end_time).slice(0, 5)}` : ''}</strong>
        <p>{r.guest_count} ضيوف{r.table_number ? ` · طاولة ${r.table_number} (${r.table_area})` : ''}{r.occasion ? ` · ${r.occasion}` : ''}</p>
        {r.special_requests && <p className="acct__muted">“{r.special_requests}”</p>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'end' }}>
        <span className={`acct__status st-${r.status}`}>{STATUS_AR[r.status] || r.status}</span>
        {r.status === 'pending' && (
          <button className="dash__today" style={{ fontSize: 12 }} onClick={() => cancelRes(r.id)}>
            إلغاء الطلب
          </button>
        )}
      </div>
    </article>
  )

  return (
    <section className="section">
      <div className="container acct">
        <div className="acct__head">
          <div>
            <span className="kicker">حسابي</span>
            <h2 className="h2" style={{ marginTop: 10 }}>أهلاً {user.full_name.split(' ')[0]}</h2>
          </div>
          <button className="btn btn-outline" onClick={logout}>تسجيل الخروج</button>
        </div>

        <div className="acct__grid">
          <div className="acct__profile">
            <h3>الملف الشخصي</h3>
            {editing ? (
              <form onSubmit={save}>
                <label>الاسم الكامل<input className="auth__input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></label>
                <label>الهاتف<input className="auth__input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" /></label>
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button className="btn btn-primary" style={{ padding: '10px 24px', fontSize: 14 }}>حفظ</button>
                  <button type="button" className="btn btn-outline" style={{ padding: '10px 24px', fontSize: 14 }} onClick={() => setEditing(false)}>إلغاء</button>
                </div>
              </form>
            ) : (
              <>
                <p><strong>الاسم:</strong> {user.full_name}</p>
                <p dir="ltr" style={{ textAlign: 'right' }}><strong>البريد:</strong> {user.email}</p>
                <p dir="ltr" style={{ textAlign: 'right' }}><strong>الهاتف:</strong> {user.phone}</p>
                <button className="btn btn-outline" style={{ padding: '10px 24px', fontSize: 14, marginTop: 8 }} onClick={() => setEditing(true)}>تعديل</button>
              </>
            )}
            {saved && <p className="auth__fine">{saved}</p>}
            <AddressBook />
          </div>

          <div>
            <h3>الحجوزات القادمة ({upcoming.length})</h3>
            <p className="acct__remind">🔔 سنذكرك برسالة قبل موعدك — التذكير التلقائي يُفعّل قريباً.</p>
            {reservations === null ? <p>جاري التحميل…</p>
              : error ? <p className="auth__err">{error}</p>
              : upcoming.length === 0 ? <p className="acct__muted">لا حجوزات قادمة — احجز طاولتك عبر الهاتف.</p>
              : upcoming.map((r) => <Card key={r.id} r={r} />)}
            <h3 style={{ marginTop: 26 }}>الحجوزات السابقة ({past.length})</h3>
            {reservations !== null && !error && (past.length === 0
              ? <p className="acct__muted">لا حجوزات سابقة بعد.</p>
              : past.map((r) => <Card key={r.id} r={r} />))}

            <h3 style={{ marginTop: 26 }}>طلباتي ({orders === null ? '…' : orders.length})</h3>
            {orders === null && <p>جاري التحميل…</p>}
            {orders !== null && orders.length === 0 && <p className="acct__muted">لا طلبات بعد — جرّب الطلب من المينيو.</p>}
            {orders !== null && orders.map((o) => (
              <article key={o.id} className="acct__res">
                <div style={{ flex: 1 }}>
                  <strong dir="ltr">{o.order_number}</strong>
                  <p>{fmtDay(o.created_at)} · {o.order_type === 'delivery' ? 'توصيل' : 'استلام'} · {o.total} درهم</p>
                  {openOrder === o.id && orderDetail[o.id] && (
                    <ul className="acct__items">
                      {orderDetail[o.id].items.map((it, i) => (
                        <li key={i}>{it.quantity} × {it.name_ar}
                          {it.options?.length > 0 && <small> ({it.options.map((x) => x.label_ar).join('، ')})</small>}
                          {' '}— {Number(it.unit_price) * it.quantity} درهم</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'end' }}>
                  <span className={`acct__status st-${o.status}`}>{ORDER_STATUS_AR[o.status] || o.status}</span>
                  <span className="acct__muted" style={{ fontSize: 12 }}>
                    الدفع: {o.payment_status === 'paid' ? 'تم ✓' : o.payment_status === 'unpaid' ? 'نقداً عند الاستلام' : o.payment_status}
                  </span>
                  <button className="dash__today" style={{ fontSize: 12 }} onClick={async () => {
                    if (openOrder === o.id) { setOpenOrder(null); return }
                    if (!orderDetail[o.id]) {
                      const d = await api.orderDetail(o.id)
                      setOrderDetail((m) => ({ ...m, [o.id]: d.order }))
                    }
                    setOpenOrder(o.id)
                  }}>
                    {openOrder === o.id ? 'إخفاء' : 'التفاصيل'}
                  </button>
                  {['pending_payment', 'received'].includes(o.status) && (
                    <button className="dash__today" style={{ fontSize: 12 }} onClick={async () => {
                      if (!window.confirm('إلغاء هذا الطلب؟')) return
                      try {
                        await api.cancelOrder(o.id)
                        setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, status: 'cancelled' } : x)))
                      } catch (e) { alert(e.message) }
                    }}>
                      إلغاء الطلب
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
