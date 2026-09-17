import { Fragment, useCallback, useEffect, useState } from 'react'
import { staffApi } from '../../api/client.js'
import { fmtDay, fmtTime, toDayKey, todayKey } from '../../utils/dates.js'
import { STATUS_AR, STATUS_LIST, StatusBadge, Empty } from './common.jsx'

const NEXT = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['seated', 'cancelled'],
  seated: ['completed', 'no_show'],
  completed: [], cancelled: [], no_show: [],
}

export default function Reservations() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [date, setDate] = useState('')
  const [status, setStatusFilter] = useState('')
  const [q, setQ] = useState('')
  const [table, setTable] = useState('')
  const [openId, setOpenId] = useState(null)
  const [busy, setBusy] = useState(null)

  const load = useCallback(async () => {
    setError('')
    try {
      const d = await staffApi.reservations({ date, status, q, table })
      setRows(d.reservations)
    } catch (e) {
      setError(e.message)
    }
  }, [date, status, q, table])

  useEffect(() => { load() }, [load])

  const setStatus = async (id, next) => {
    const labels = STATUS_AR
    if (!window.confirm(`تغيير حالة الحجز #${id} إلى «${labels[next]}»؟`)) return
    setBusy(id)
    try {
      await staffApi.setStatus(id, next)
      await load()
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
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="اسم الزبون، الهاتف، الطاولة…" aria-label="البحث في الحجوزات" />
          {q && <button className="menux__clear" onClick={() => setQ('')} aria-label="مسح">✕</button>}
        </div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="dash__date" aria-label="فلترة بالتاريخ" />
        <input value={table} onChange={(e) => setTable(e.target.value)} placeholder="طاولة…" className="dash__date" style={{ maxWidth: 110 }} aria-label="فلترة بالطاولة" />
        <select value={status} onChange={(e) => setStatusFilter(e.target.value)} className="dash__select" aria-label="فلترة بالحالة">
          <option value="">كل الحالات</option>
          {STATUS_LIST.map((s) => <option key={s} value={s}>{STATUS_AR[s]}</option>)}
        </select>
        {(date || status || q || table) && <button className="menux__reset" onClick={() => { setDate(''); setStatusFilter(''); setQ(''); setTable('') }}>إعادة الضبط</button>}
        <button className="dash__today" onClick={() => setDate(todayKey())}>اليوم</button>
      </div>

      {error && <p className="auth__err">{error}</p>}
      {rows === null && <p className="dash__muted">جاري تحميل الحجوزات…</p>}
      {rows !== null && rows.length === 0 && <Empty text="لا حجوزات مطابقة — جرّب تاريخاً أو حالة أخرى." />}

      {rows !== null && rows.length > 0 && (
        <div className="dash__table-wrap">
          <table className="dash__table">
            <thead>
              <tr>
                <th>التاريخ · الوقت</th><th>الزبون</th><th>الطاولة</th><th>الضيوف</th><th>الحالة</th><th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.id}>
                  <tr key={r.id} className={toDayKey(r.reservation_date) === todayKey() ? 'is-today' : ''}>
                    <td><strong>{fmtDay(r.reservation_date)}</strong><br />{fmtTime(r.start_time)}{r.end_time ? ` – ${fmtTime(r.end_time)}` : ''}</td>
                    <td>{r.customer_name}<br /><small dir="ltr">{r.customer_phone}</small></td>
                    <td>{r.table_number ? `${r.table_number} (${r.table_area})` : '—'}</td>
                    <td>{r.guest_count}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="dash__acts">
                      <button onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                        {openId === r.id ? 'إخفاء' : 'التفاصيل'}
                      </button>
                      {NEXT[r.status]?.map((n) => (
                        <button key={n} disabled={busy === r.id} className={`act-${n}`}
                          onClick={() => setStatus(r.id, n)}>
                          {n === 'confirmed' ? 'تأكيد' : n === 'cancelled' ? 'إلغاء' : n === 'seated' ? 'إجلاس' : n === 'completed' ? 'إتمام' : 'غياب'}
                        </button>
                      ))}
                    </td>
                  </tr>
                  {openId === r.id && (
                    <tr key={`${r.id}-d`} className="dash__detail">
                      <td colSpan={6}>
                        <strong>طلبات خاصة:</strong> {r.special_requests || '—'} ·
                        <strong> المناسبة:</strong> {r.occasion || '—'} ·
                        <strong> البريد:</strong> <span dir="ltr">{r.customer_email}</span> ·
                        <strong> أُنشئ:</strong> {fmtDay(r.created_at)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows !== null && <p className="dash__muted">{rows.length} نتيجة</p>}
    </>
  )
}
