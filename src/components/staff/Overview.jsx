import { useEffect, useState } from 'react'
import { staffApi } from '../../api/client.js'
import { Empty } from './common.jsx'

export default function Overview({ go }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    staffApi.overview().then(setData).catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="auth__err">{error}</p>
  if (!data) return <p className="dash__muted">جاري تحميل المؤشرات…</p>

  const r = data.reservations
  const totalTables = Object.values(data.tables).reduce((a, b) => a + b, 0)
  const cards = [
    { label: 'حجوزات اليوم', value: r.today, go: 'schedule', cls: 'hot' },
    { label: 'قادمة (نشطة)', value: r.upcoming, go: 'reservations' },
    { label: 'قيد المراجعة', value: r.pending, go: 'reservations' },
    { label: 'مؤكدة', value: r.confirmed, go: 'reservations' },
    { label: 'مكتملة', value: r.completed, go: 'reservations' },
    { label: 'ملغاة', value: r.cancelled, go: 'reservations' },
    { label: 'طاولات متاحة', value: `${data.tables.available || 0} / ${totalTables}`, go: 'tables' },
  ]

  return (
    <>
      <div className="dash__cards">
        {cards.map((c) => (
          <button key={c.label} className={`dash__card ${c.cls || ''}`} onClick={() => go(c.go)}>
            <strong>{c.value}</strong>
            <span>{c.label}</span>
          </button>
        ))}
      </div>
      <div className="dash__quick">
        <strong>إجراءات سريعة:</strong>
        <button className="btn btn-primary" style={{ padding: '10px 22px', fontSize: 14 }} onClick={() => go('schedule')}>جدول اليوم</button>
        <button className="btn btn-outline" style={{ padding: '10px 22px', fontSize: 14 }} onClick={() => go('reservations')}>مراجعة القيد</button>
        <button className="btn btn-outline" style={{ padding: '10px 22px', fontSize: 14 }} onClick={() => go('tables')}>حالة الطاولات</button>
      </div>
      {(r.pending || 0) > 0 && (
        <p className="dash__alert">⚠ {r.pending} {r.pending === 1 ? 'حجز بانتظار' : 'حجوزات بانتظار'} التأكيد — راجعوها من تبويب الحجوزات.</p>
      )}
      {(!r.today && !r.upcoming) && <Empty text="لا حجوزات نشطة حالياً." />}
    </>
  )
}
