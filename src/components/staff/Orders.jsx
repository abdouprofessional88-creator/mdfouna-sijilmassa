import { useCallback, useEffect, useState } from 'react'
import { staffApi } from '../../api/client.js'
import { fmtDay, fmtTime } from '../../utils/dates.js'
import { Empty } from './common.jsx'
import MiniMap from '../map/MiniMap.jsx'

const OST = {
  pending_payment: 'بانتظار الدفع', received: 'مستلم', accepted: 'مقبول',
  preparing: 'قيد التحضير', ready: 'جاهز', assigned_to_driver: 'مُسند لموصل',
  out_for_delivery: 'في الطريق', delivered: 'تم التوصيل',
  cancelled: 'ملغي', rejected: 'مرفوض',
}
const PAY_AR = {
  unpaid: 'غير مدفوع', pending: 'دفع معلق', paid: 'تم الدفع ✓',
  failed: 'فشل الدفع', cancelled: 'ملغي', refunded: 'مُسترجع', partially_refunded: 'مسترجع جزئياً',
}
const NEXT = {
  pending_payment: [], received: ['accepted', 'rejected', 'cancelled'],
  accepted: ['preparing', 'rejected', 'cancelled'], preparing: ['ready'],
  ready: [], assigned_to_driver: [], out_for_delivery: [],
  delivered: [], cancelled: [], rejected: [], failed: [],
}
const NEXT_AR = { accepted: 'قبول', rejected: 'رفض', preparing: 'بدء التجهيز', cancelled: 'إلغاء' }

const ago = (iso) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (m < 1) return 'الآن'
  if (m < 60) return `منذ ${m} دقيقة`
  const h = Math.floor(m / 60)
  return `منذ ${h} ساعة${h > 2 ? 'ات' : h === 2 ? 'تين' : ''}`
}

/** Reception order management — workflow transitions, drivers, payments. */
export default function Orders({ canManage = false }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [payment, setPayment] = useState('')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState(null)
  const [details, setDetails] = useState({})
  const [busy, setBusy] = useState(null)
  const [drivers, setDrivers] = useState([])
  const [assignId, setAssignId] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const [o, team] = await Promise.all([
        staffApi.orders({ status, type, payment }),
        canManage ? staffApi.team().catch(() => ({ users: [] })) : Promise.resolve({ users: [] }),
      ])
      let list = o.orders
      if (q.trim()) {
        const nq = q.trim().toLowerCase()
        list = list.filter((x) => [x.order_number, x.customer_name, x.full_name, x.phone].filter(Boolean).join(' ').toLowerCase().includes(nq))
      }
      setRows(list)
      setDrivers((team.users || []).filter((u) => u.role === 'delivery_driver' && u.is_active))
    } catch (e) {
      setError(e.message)
    }
  }, [status, type, payment, q, canManage])

  useEffect(() => { load() }, [load])

  const openDetail = async (id) => {
    if (openId === id) { setOpenId(null); return }
    if (!details[id]) {
      try {
        const d = await staffApi.orderDetail(id)
        setDetails((m) => ({ ...m, [id]: d.order }))
      } catch (e) {
        alert(e.message)
        return
      }
    }
    setOpenId(id)
  }

  const setSt = async (id, next) => {
    let reason = ''
    if (next === 'rejected' || next === 'cancelled') {
      reason = window.prompt(next === 'rejected' ? 'سبب الرفض:' : 'سبب الإلغاء (اختياري):') || ''
      if (next === 'rejected' && reason.trim().length < 3) {
        alert('سبب الرفض مطلوب.')
        return
      }
    } else if (!window.confirm(`تغيير حالة الطلب إلى «${OST[next]}»؟`)) return
    setBusy(id)
    try {
      await staffApi.setOrderStatus(id, next, reason)
      setDetails((m) => { const n = { ...m }; delete n[id]; return n })
      await load()
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(null)
    }
  }

  const assign = async (id) => {
    if (!assignId) {
      alert('اختر السائق أولاً.')
      return
    }
    if (!window.confirm('إسناد هذا الطلب للسائق المختار؟')) return
    setBusy(id)
    try {
      await staffApi.assignDriver(id, Number(assignId))
      setDetails((m) => { const n = { ...m }; delete n[id]; return n })
      await load()
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(null)
    }
  }

  const refund = async (o) => {
    const pid = o.payment_id || (details[o.id]?.payment_id)
    if (!pid) {
      alert('لا توجد دفعة مدفوعة لهذا الطلب.')
      return
    }
    if (!window.confirm(`استرجاع مبلغ ${o.total} درهم للزبون؟`)) return
    setBusy(o.id)
    try {
      await staffApi.refundPayment(pid)
      await load()
      alert('تم الاسترجاع ✓')
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <div className="dash__filters">
        <div className="menux__search dash__search" role="search">
          <span className="menux__icon" aria-hidden="true">⌕</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="رقم الطلب، الاسم، الهاتف…" aria-label="البحث في الطلبات" />
          {q && <button className="menux__clear" onClick={() => setQ('')} aria-label="مسح">✕</button>}
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="dash__select" aria-label="فلترة بحالة الطلب">
          <option value="">كل الحالات</option>
          {Object.entries(OST).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className="dash__select" aria-label="نوع الطلب">
          <option value="">توصيل + استلام</option>
          <option value="delivery">توصيل</option>
          <option value="pickup">استلام</option>
        </select>
        <select value={payment} onChange={(e) => setPayment(e.target.value)} className="dash__select" aria-label="حالة الدفع">
          <option value="">كل المدفوعات</option>
          {Object.entries(PAY_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {(status || type || payment || q) && <button className="menux__reset" onClick={() => { setStatus(''); setType(''); setPayment(''); setQ('') }}>إعادة الضبط</button>}
      </div>

      {error && <p className="auth__err">{error}</p>}
      {rows === null && <p className="dash__muted">جاري تحميل الطلبات…</p>}
      {rows !== null && rows.length === 0 && <Empty text="لا طلبات مطابقة." />}

      {rows !== null && rows.length > 0 && (
        <div className="dash__table-wrap">
          <table className="dash__table">
            <thead><tr><th>الطلب</th><th>الزبون</th><th>النوع</th><th>المجموع</th><th>الدفع</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className={o.status === 'pending_payment' || o.status === 'received' ? 'is-today' : ''}>
                  <td><strong dir="ltr">{o.order_number}</strong><br /><small>{ago(o.created_at)}</small></td>
                  <td>{o.customer_name || o.full_name}<br /><a href={`tel:${o.phone}`} dir="ltr">{o.phone}</a></td>
                  <td>{o.order_type === 'delivery' ? 'توصيل' : 'استلام'}</td>
                  <td><strong>{o.total} درهم</strong></td>
                  <td><span className={`st st-${o.payment_status === 'paid' ? 'ready' : o.payment_status === 'unpaid' ? 'pending' : 'out_for_delivery'}`}>{PAY_AR[o.payment_status] || o.payment_status}</span></td>
                  <td><span className={`st st-${o.status}`}>{OST[o.status] || o.status}</span></td>
                  <td className="dash__acts">
                    <button onClick={() => openDetail(o.id)}>{openId === o.id ? 'إخفاء' : 'التفاصيل'}</button>
                    {(NEXT[o.status] || []).map((n) => (
                      <button key={n} disabled={busy === o.id} className={n === 'cancelled' || n === 'rejected' ? 'act-cancelled' : 'act-confirmed'}
                        onClick={() => setSt(o.id, n)}>{NEXT_AR[n]}</button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {openId && details[openId] && (
        <OrderDetailBox
          d={details[openId]}
          busy={busy === openId}
          drivers={drivers}
          canManage={canManage}
          onAssign={assign}
          onRefund={refund}
          assignId={assignId}
          setAssignId={setAssignId}
        />
      )}
      {rows !== null && <p className="dash__muted">{rows.length} نتيجة</p>}
    </>
  )
}

function OrderDetailBox({ d, busy, drivers, canManage, onAssign, onRefund, assignId, setAssignId }) {
  return (
    <div className="dash__form" style={{ marginTop: 16 }}>
      <h3 className="dash__sub" style={{ marginTop: 0 }}>تفاصيل <span dir="ltr">{d.order_number}</span></h3>
      <p className="dash__muted">
        {d.full_name} · <a href={`tel:${d.phone}`} dir="ltr">{d.phone}</a>
        {d.address_line && <> · {d.address_line} ({d.city})</>}
        {d.special_instructions && <> · “{d.special_instructions}”</>}
        {' '}· الدفع: {d.payment_method === 'cash' ? 'نقداً' : 'بطاقة'} ({PAY_AR[d.payment_status] || d.payment_status})
        {d.reject_reason && <> · السبب: {d.reject_reason}</>}
      </p>
      <ul className="acct__items">
        {d.items.map((it, i) => (
          <li key={i}>{it.quantity} × {it.name_ar}
            {it.options?.length > 0 && <small> ({it.options.map((x) => x.label_ar).join('، ')})</small>}
            {it.item_note && <small> 📝{it.item_note}</small>}
            {' '}— {Number(it.unit_price) * it.quantity} درهم</li>
        ))}
      </ul>
      <p><strong>الفرعي:</strong> {d.subtotal} · <strong>التوصيل:</strong> {d.delivery_fee} · <strong>المجموع:</strong> {d.total} درهم</p>
      {d.order_type === 'delivery' && (
        <div className="dash__delivery">
          <h4>🚚 معلومات التوصيل</h4>
          <p className="dash__muted">
            {d.address_line} ({d.city})
            {d.delivery_notes && <> · 📝 {d.delivery_notes}</>}
            {d.delivery_distance_km != null && <> · المسافة: {d.delivery_distance_km} كم</>}
            {d.delivery_zone === 'review' && <> · ⚠ يحتاج مراجعة</>}
            {d.delivery_latitude != null && <> · <span dir="ltr">{d.delivery_latitude}, {d.delivery_longitude}</span></>}
          </p>
          <MiniMap lat={d.delivery_latitude} lng={d.delivery_longitude} label="موقع توصيل الطلب" />
          {d.status === 'ready' && drivers.length > 0 && (
            <div className="dash__acts" style={{ marginTop: 10 }}>
              <select className="dash__select" value={assignId} onChange={(e) => setAssignId(e.target.value)} aria-label="اختيار السائق">
                <option value="">— اختر السائق —</option>
                {drivers.map((dr) => <option key={dr.id} value={dr.id}>{dr.full_name} · <span dir="ltr">{dr.phone}</span></option>)}
              </select>
              <button disabled={busy} onClick={() => onAssign(d.id)}>تعيين موصل</button>
            </div>
          )}
        </div>
      )}
      {canManage && d.payment_status === 'paid' && (
        <div className="dash__acts" style={{ marginTop: 10 }}>
          <button disabled={busy} onClick={() => onRefund(d)}>استرجاع المبلغ</button>
        </div>
      )}
    </div>
  )
}
