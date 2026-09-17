import { useEffect, useState } from 'react'
import { staffApi } from '../../api/client.js'
import { fmtTime, todayKey } from '../../utils/dates.js'
import { StatusBadge, Empty } from './common.jsx'

/** Day schedule: time slots → table → customer → guests → status. */
export default function Schedule() {
  const [date, setDate] = useState(todayKey())
  const [rows, setRows] = useState(null)
  const [tables, setTables] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    setRows(null)
    setError('')
    Promise.all([staffApi.reservations({ date }), staffApi.tables()])
      .then(([r, t]) => { setRows(r.reservations); setTables(t.tables) })
      .catch((e) => setError(e.message))
  }, [date])

  const active = (rows || []).filter((r) => !['cancelled', 'no_show'].includes(r.status))
  const byTable = {}
  for (const r of active) {
    const k = r.table_number || 'بدون طاولة'
    ;(byTable[k] = byTable[k] || []).push(r)
  }

  return (
    <>
      <div className="dash__filters">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="dash__date" aria-label="يوم الجدول" />
        <button className="dash__today" onClick={() => setDate(todayKey())}>اليوم</button>
        <span className="dash__muted">{active.length} حجوزات نشطة هذا اليوم</span>
      </div>
      {error && <p className="auth__err">{error}</p>}
      {rows === null && <p className="dash__muted">جاري تحميل الجدول…</p>}
      {rows !== null && active.length === 0 && <Empty text="لا حجوزات في هذا اليوم." />}
      {active.length > 0 && (
        <div className="sched">
          {[...active]
            .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)))
            .map((r) => (
              <div key={r.id} className="sched__row">
                <span className="sched__time" dir="ltr">{fmtTime(r.start_time)}</span>
                <span className="sched__arrow" aria-hidden="true">→</span>
                <span className="sched__table">طاولة {r.table_number || '—'}</span>
                <span className="sched__guest">{r.guest_count} ضيوف</span>
                <span className="sched__name">{r.customer_name}</span>
                <StatusBadge status={r.status} />
              </div>
            ))}
        </div>
      )}
      {tables.length > 0 && (
        <>
          <h3 className="dash__sub">تغطية الطاولات ({date})</h3>
          <div className="dash__chips">
            {tables.map((t) => {
              const n = (byTable[t.table_number] || []).length
              return (
                <span key={t.id} className={`dash__chip ${n > 0 ? 'busy' : ''} ${t.status === 'maintenance' ? 'off' : ''}`}>
                  {t.table_number} · {n} {n === 1 ? 'حجز' : 'حجوزات'}
                </span>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
