import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'

export default function StaffLogin({ onDone }) {
  const { login, logout } = useAuth()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const user = await login(form)
      if (user.role === 'customer') {
        await logout()
        setError('هذا الحساب زبون — بوابة الموظفين تتطلب حساب موظف.')
        return
      }
      onDone()
    } catch (err) {
      setError(err.details ? Object.values(err.details).flat().join('، ') : err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section">
      <div className="container auth__wrap">
        <div className="auth__card">
          <span className="kicker">بوابة الموظفين</span>
          <h2 className="h2" style={{ margin: '10px 0 4px' }}>دخول الطاقم</h2>
          <p className="lead" style={{ fontSize: 15 }}>مخصصة لطاقم المطعم فقط — الزبناء يستعملون حساب الزبون.</p>
          {error && <p className="auth__err" role="alert">{error}</p>}
          <form onSubmit={submit} noValidate>
            <label>البريد المهني
              <input className="auth__input" type="email" value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                placeholder="staff@sijilmassa.ma" autoComplete="username" dir="ltr" />
            </label>
            <label>كلمة المرور
              <input className="auth__input" type="password" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password" />
            </label>
            <button className="btn btn-primary auth__submit" disabled={busy}>
              {busy ? 'جاري التحقق…' : 'دخول اللوحة'}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
