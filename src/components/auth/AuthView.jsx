import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'

const inputCls = 'auth__input'

function FieldErrors({ errors }) {
  if (!errors?.length) return null
  return <p className="auth__field-err">{errors.join('، ')}</p>
}

export default function AuthView({ onDone }) {
  const { login, register } = useAuth()
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', confirm_password: '', identifier: '' })
  const [errors, setErrors] = useState({})
  const [topError, setTopError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    setTopError('')
    try {
      if (tab === 'login') {
        await login({ identifier: form.identifier, password: form.password })
      } else {
        await register({
          full_name: form.full_name, email: form.email, phone: form.phone,
          password: form.password, confirm_password: form.confirm_password,
        })
      }
      onDone()
    } catch (err) {
      if (err.details) setErrors(err.details)
      else setTopError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section auth">
      <div className="container auth__wrap">
        <div className="auth__card">
          <span className="kicker">حساب الزبون</span>
          <h2 className="h2" style={{ margin: '10px 0 4px' }}>
            {tab === 'login' ? 'مرحباً بعودتك' : 'أنشئ حسابك'}
          </h2>
          <p className="lead" style={{ fontSize: 15 }}>
            {tab === 'login'
              ? 'سجّل الدخول لمتابعة حجوزاتك.'
              : 'حساب واحد لحجوزاتك وطلباتك القادمة.'}
          </p>

          <div className="auth__tabs" role="tablist">
            {[{ id: 'login', ar: 'دخول' }, { id: 'register', ar: 'حساب جديد' }].map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id}
                className={tab === t.id ? 'is-on' : ''} onClick={() => { setTab(t.id); setTopError(''); setErrors({}) }}>
                {t.ar}
              </button>
            ))}
          </div>

          {topError && <p className="auth__err" role="alert">{topError}</p>}

          <form onSubmit={submit} noValidate>
            {tab === 'login' ? (
              <>
                <label>البريد الإلكتروني أو الهاتف
                  <input className={inputCls} value={form.identifier} onChange={set('identifier')}
                    placeholder="example@mail.com أو 06…" autoComplete="username" />
                </label>
                <FieldErrors errors={errors.identifier} />
                <label>كلمة المرور
                  <input className={inputCls} type="password" value={form.password} onChange={set('password')}
                    autoComplete="current-password" />
                </label>
                <FieldErrors errors={errors.password} />
              </>
            ) : (
              <>
                <label>الاسم الكامل
                  <input className={inputCls} value={form.full_name} onChange={set('full_name')}
                    placeholder="مثال: ياسين العلوي" autoComplete="name" />
                </label>
                <FieldErrors errors={errors.full_name} />
                <div className="auth__grid">
                  <div>
                    <label>البريد الإلكتروني
                      <input className={inputCls} type="email" value={form.email} onChange={set('email')}
                        placeholder="example@mail.com" autoComplete="email" dir="ltr" />
                    </label>
                    <FieldErrors errors={errors.email} />
                  </div>
                  <div>
                    <label>الهاتف
                      <input className={inputCls} value={form.phone} onChange={set('phone')}
                        placeholder="06…" autoComplete="tel" dir="ltr" />
                    </label>
                    <FieldErrors errors={errors.phone} />
                  </div>
                </div>
                <div className="auth__grid">
                  <div>
                    <label>كلمة المرور (8+ أحرف)
                      <input className={inputCls} type="password" value={form.password} onChange={set('password')}
                        autoComplete="new-password" />
                    </label>
                    <FieldErrors errors={errors.password} />
                  </div>
                  <div>
                    <label>تأكيد كلمة المرور
                      <input className={inputCls} type="password" value={form.confirm_password} onChange={set('confirm_password')}
                        autoComplete="new-password" />
                    </label>
                    <FieldErrors errors={errors.confirm_password} />
                  </div>
                </div>
              </>
            )}
            <button className="btn btn-primary auth__submit" disabled={busy}>
              {busy ? 'لحظة…' : tab === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
