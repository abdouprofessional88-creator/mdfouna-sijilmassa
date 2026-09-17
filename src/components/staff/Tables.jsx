import { useEffect, useState } from 'react'
import { staffApi } from '../../api/client.js'
import { TABLE_AREAS, TABLE_STATUSES, Empty } from './common.jsx'

const AREAS = Object.keys(TABLE_AREAS)
const STATUSES = Object.keys(TABLE_STATUSES)

export default function Tables({ canManage, bookingsToday }) {
  const [tables, setTables] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ table_number: '', capacity: 4, area: 'salle', description: '' })
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const d = await staffApi.tables()
      setTables(d.tables)
    } catch (e) {
      setError(e.message)
    }
  }
  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (editing) await staffApi.updateTable(editing, { ...form, capacity: Number(form.capacity) })
      else await staffApi.createTable({ ...form, capacity: Number(form.capacity) })
      setForm({ table_number: '', capacity: 4, area: 'salle', description: '' })
      setEditing(null)
      await load()
    } catch (err) {
      setError(err.details ? Object.values(err.details).flat().join('، ') : err.message)
    } finally {
      setBusy(false)
    }
  }

  const quickStatus = async (t, status) => {
    if (!window.confirm(`تغيير حالة الطاولة ${t.table_number} إلى «${TABLE_STATUSES[status]}»؟`)) return
    try {
      await staffApi.updateTable(t.id, { status })
      await load()
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <>
      {error && <p className="auth__err">{error}</p>}
      {tables === null && <p className="dash__muted">جاري تحميل الطاولات…</p>}
      {tables !== null && tables.length === 0 && <Empty text="لا طاولات مسجلة بعد." />}

      {tables !== null && (
        <div className="dash__table-wrap">
          <table className="dash__table">
            <thead>
              <tr><th>الطاولة</th><th>السعة</th><th>المنطقة</th><th>الحالة</th><th>حجوزات اليوم</th>{canManage && <th>إجراءات</th>}</tr>
            </thead>
            <tbody>
              {tables.map((t) => (
                <tr key={t.id} className={t.status === 'maintenance' ? 'is-off' : ''}>
                  <td><strong>{t.table_number}</strong><br /><small>{t.description || ''}</small></td>
                  <td>{t.capacity}</td>
                  <td>{TABLE_AREAS[t.area]}</td>
                  <td><span className={`tstatus t-${t.status}`}>{TABLE_STATUSES[t.status]}</span></td>
                  <td>{bookingsToday?.[t.id] ? `${bookingsToday[t.id]} حجوزات` : '—'}</td>
                  {canManage && (
                    <td className="dash__acts">
                      <button onClick={() => { setEditing(t.id); setForm({ table_number: t.table_number, capacity: t.capacity, area: t.area, description: t.description || '' }) }}>تعديل</button>
                      {t.status !== 'maintenance'
                        ? <button className="act-cancelled" onClick={() => quickStatus(t, 'maintenance')}>تعطيل</button>
                        : <button className="act-confirmed" onClick={() => quickStatus(t, 'available')}>تفعيل</button>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canManage && (
        <form className="dash__form" onSubmit={submit}>
          <h3 className="dash__sub">{editing ? `تعديل الطاولة` : 'إضافة طاولة جديدة'}</h3>
          <div className="dash__form-grid">
            <label>الرقم<input className="auth__input" value={form.table_number} onChange={(e) => setForm({ ...form, table_number: e.target.value })} placeholder="T9" required /></label>
            <label>السعة<input className="auth__input" type="number" min={1} max={50} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required /></label>
            <label>المنطقة
              <select className="auth__input" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>
                {AREAS.map((a) => <option key={a} value={a}>{TABLE_AREAS[a]}</option>)}
              </select>
            </label>
            <label>وصف<input className="auth__input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="اختياري" /></label>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="btn btn-primary" style={{ padding: '10px 26px', fontSize: 14 }} disabled={busy}>
              {busy ? '…' : editing ? 'حفظ التعديل' : 'إضافة الطاولة'}
            </button>
            {editing && <button type="button" className="btn btn-outline" style={{ padding: '10px 26px', fontSize: 14 }} onClick={() => { setEditing(null); setForm({ table_number: '', capacity: 4, area: 'salle', description: '' }) }}>إلغاء</button>}
          </div>
        </form>
      )}
      {!canManage && <p className="dash__muted">إدارة الطاولات (إضافة/تعديل) من صلاحيات المدير فقط — يمكنك الاطلاع هنا.</p>}
    </>
  )
}
