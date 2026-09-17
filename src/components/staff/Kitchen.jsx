import { useCallback, useEffect, useState } from 'react'
import { staffApi } from '../../api/client.js'
import { fmtDay, fmtTime } from '../../utils/dates.js'
import { Empty } from './common.jsx'

/** Kitchen view: accepted + preparing orders with items. */
export default function Kitchen() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        staffApi.orders({ status: 'accepted' }),
        staffApi.orders({ status: 'preparing' }),
      ])
      setRows([...a.orders, ...b.orders].sort((x, y) => String(x.created_at).localeCompare(String(y.created_at))))
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const act = async (o, to, label) => {
    if (!window.confirm(`${label} — طلب ${o.order_number}؟`)) return
    setBusy(o.id)
    try {
      await staffApi.setOrderStatus(o.id, to)
      await load()
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(null)
    }
  }

  const [details, setDetails] = useState({})
  const toggle = async (o) => {
    if (details[o.id]) {
      setDetails((m) => { const n = { ...m }; delete n[o.id]; return n })
      return
    }
    try {
      const d = await staffApi.orderDetail(o.id)
      setDetails((m) => ({ ...m, [o.id]: d.order }))
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <>
      {error && <p className="auth__err">{error}</p>}
      {rows === null && <p className="dash__muted">جاري تحميل طلبات المطبخ…</p>}
      {rows !== null && rows.length === 0 && <Empty text="لا طلبات بانتظار التحضير حالياً. 👨‍🍳" />}
      {rows !== null && rows.map((o) => (
        <article key={o.id} className="kcard">
          <header>
            <strong dir="ltr">{o.order_number}</strong>
            <span className={`st st-${o.status}`}>{o.status === 'accepted' ? 'مقبول' : 'قيد التحضير'}</span>
            <small className="dash__muted">{fmtDay(o.created_at)} {fmtTime(String(o.created_at).slice(11))}</small>
          </header>
          <button className="kcard__items-btn" onClick={() => toggle(o)}>
            {details[o.id] ? 'إخفاء الأصناف' : 'عرض الأصناف'}
          </button>
          {details[o.id] && (
            <ul className="acct__items">
              {details[o.id].items.map((it, i) => (
                <li key={i}><strong>{it.quantity} × {it.name_ar}</strong>
                  {it.options?.length > 0 && <small> ({it.options.map((x) => x.label_ar).join('، ')})</small>}
                  {it.item_note && <small> 📝{it.item_note}</small>}
                </li>
              ))}
              {details[o.id].special_instructions && <li><small>📝 {details[o.id].special_instructions}</small></li>}
            </ul>
          )}
          <div className="dash__acts">
            {o.status === 'accepted' && (
              <button disabled={busy === o.id} className="act-confirmed" onClick={() => act(o, 'preparing', 'بدء التجهيز')}>
                🔥 بدء التجهيز
              </button>
            )}
            {o.status === 'preparing' && (
              <button disabled={busy === o.id} className="act-confirmed" onClick={() => act(o, 'ready', 'الطلب جاهز')}>
                ✅ جاهز للاستلام
              </button>
            )}
          </div>
        </article>
      ))}
    </>
  )
}
