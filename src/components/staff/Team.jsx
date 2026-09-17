import { useEffect, useState } from 'react'
import { staffApi } from '../../api/client.js'
import { ROLE_AR, Empty } from './common.jsx'

const ROLES = ['receptionist', 'kitchen_staff', 'delivery_driver', 'manager', 'admin']

/** Team management — admin only (backend enforces). */
export default function Team() {
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', role: 'receptionist' })
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      setUsers((await staffApi.team()).users)
    } catch (e) {
      setError(e.message)
    }
  }
  useEffect(() => { load() }, [])

  const create = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await staffApi.createStaff(form)
      setForm({ full_name: '', email: '', phone: '', password: '', role: 'receptionist' })
      await load()
    } catch (err) {
      setError(err.details ? Object.values(err.details).flat().join('، ') : err.message)
    } finally {
      setBusy(false)
    }
  }

  const changeRole = async (u, role) => {
    if (!window.confirm(`تغيير دور ${u.full_name} إلى «${ROLE_AR[role] || role}»؟`)) return
    try {
      await staffApi.setRole(u.id, role)
      await load()
    } catch (err) {
      alert(err.message)
    }
  }

  const toggleActive = async (u) => {
    if (!window.confirm(`${u.is_active ? 'تعطيل' : 'تفعيل'} حساب ${u.full_name}؟`)) return
    try {
      await staffApi.setActive(u.id, !u.is_active)
      await load()
    } catch (err) {
      alert(err.message)
    }
  }

  const resetPw = async (u) => {
    const np = window.prompt(`كلمة مرور جديدة لـ ${u.full_name} (8 أحرف على الأقل):`)
    if (!np) return
    try {
      await staffApi.resetPassword(u.id, np)
      alert('تم تعيين كلمة المرور الجديدة — أبلغها للموظف عبر قناة آمنة.')
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <>
      {error && <p className="auth__err">{error}</p>}
      {users === null && <p className="dash__muted">جاري تحميل الطاقم…</p>}
      {users !== null && users.length === 0 && <Empty text="لا أعضاء بعد." />}
      {users !== null && (
        <div className="dash__table-wrap">
          <table className="dash__table">
            <thead><tr><th>الاسم</th><th>البريد / الهاتف</th><th>الدور</th><th>الحالة</th><th>إدارة</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={u.is_active ? '' : 'is-off'}>
                  <td><strong>{u.full_name}</strong></td>
                  <td><span dir="ltr">{u.email}</span><br /><small dir="ltr">{u.phone}</small></td>
                  <td>{ROLE_AR[u.role] || u.role}</td>
                  <td>{u.is_active ? 'نشط' : 'معطّل'}</td>
                  <td className="dash__acts">
                    {ROLES.filter((r) => r !== u.role).map((r) => (
                      <button key={r} onClick={() => changeRole(u, r)}>→ {ROLE_AR[r]}</button>
                    ))}
                    <button onClick={() => toggleActive(u)}>{u.is_active ? 'تعطيل' : 'تفعيل'}</button>
                    <button onClick={() => resetPw(u)}>كلمة جديدة</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <form className="dash__form" onSubmit={create}>
        <h3 className="dash__sub">إضافة عضو جديد</h3>
        <div className="dash__form-grid">
          <label>الاسم الكامل<input className="auth__input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></label>
          <label>البريد<input className="auth__input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" required /></label>
          <label>الهاتف<input className="auth__input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" required /></label>
          <label>كلمة المرور (8+)<input className="auth__input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
          <label>الدور
            <select className="auth__input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="receptionist">استقبال</option>
              <option value="kitchen_staff">مطبخ</option>
              <option value="delivery_driver">موصل</option>
              <option value="manager">مدير قاعة</option>
            </select>
          </label>
        </div>
        <button className="btn btn-primary" style={{ padding: '10px 26px', fontSize: 14, marginTop: 12 }} disabled={busy}>
          {busy ? '…' : 'إضافة العضو'}
        </button>
      </form>
    </>
  )
}
