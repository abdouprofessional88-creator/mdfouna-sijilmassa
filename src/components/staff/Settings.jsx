import { useEffect, useState } from 'react'
import { staffApi } from '../../api/client.js'

const FIELDS = [
  { key: 'display_name', ar: 'اسم المطعم المعروض' },
  { key: 'phone_primary', ar: 'الهاتف الرئيسي' },
  { key: 'address_note', ar: 'ملاحظة العنوان' },
  { key: 'opening_hours_note', ar: 'ملاحظة أوقات العمل' },
  { key: 'reservation_notice', ar: 'تنبيه الحجز' },
]

const ZONE_FIELDS = [
  { key: 'restaurant_lat', ar: 'خط عرض المطعم (GPS)' },
  { key: 'restaurant_lng', ar: 'خط طول المطعم (GPS)' },
  { key: 'delivery_max_km', ar: 'أقصى مسافة توصيل (كم)' },
  { key: 'delivery_fee_mad', ar: 'رسم التوصيل الثابت (درهم)' },
  { key: 'delivery_fee_per_km', ar: 'رسم الكيلومتر (درهم)' },
  { key: 'free_delivery_over_mad', ar: 'توصيل مجاني فوق (درهم)' },
]

const RES_FIELDS = [
  { key: 'reservation_duration_min', ar: 'مدة الحجز الافتراضية (دقيقة)' },
  { key: 'service_windows', ar: 'نوافذ الاستقبال (مثال: 12:00-15:00,19:00-23:00)' },
]

/** Restaurant settings — admin/manager (backend enforces). */
export default function Settings() {
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    staffApi.settings().then((d) => setForm(d.settings)).catch((e) => setError(e.message))
  }, [])

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setSaved('')
    try {
      const d = await staffApi.updateSettings(form)
      setForm(d.settings)
      setSaved('تم حفظ الإعدادات ✓ (تُطبق على الموقع في المرحلة القادمة)')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (error) return <p className="auth__err">{error}</p>
  if (!form) return <p className="dash__muted">جاري تحميل الإعدادات…</p>

  return (
    <form className="dash__form" onSubmit={save} style={{ marginTop: 0 }}>
      <p className="dash__muted">تُحفظ في MySQL فوراً. ربطها بالواجهة العامة في المرحلة القادمة.</p>
      {FIELDS.map((f) => (
        <label key={f.key} style={{ display: 'block', fontSize: 13.5, fontWeight: 600, marginTop: 12 }}>
          {f.ar}
          <input className="auth__input" value={form[f.key] || ''}
            onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
        </label>
      ))}
      <h3 className="dash__sub">🛵 نطاق التوصيل والرسوم (تُطبق فوراً على الطلبات)</h3>
      {ZONE_FIELDS.map((f) => (
        <label key={f.key} style={{ display: 'block', fontSize: 13.5, fontWeight: 600, marginTop: 12 }}>
          {f.ar}
          <input className="auth__input" value={form[f.key] || ''} dir="ltr"
            onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
        </label>
      ))}
      <h3 className="dash__sub">🪑 إعدادات الحجز (تُطبق فوراً)</h3>
      {RES_FIELDS.map((f) => (
        <label key={f.key} style={{ display: 'block', fontSize: 13.5, fontWeight: 600, marginTop: 12 }}>
          {f.ar}
          <input className="auth__input" value={form[f.key] || ''} dir="ltr"
            onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
        </label>
      ))}
      <h3 className="dash__sub">💳 طرق الدفع</h3>
      {[
        { key: 'cash_on_delivery', ar: 'الدفع نقداً عند الاستلام' },
        { key: 'card_enabled', ar: 'الدفع بالبطاقة' },
      ].map((f) => (
        <label key={f.key} className="addr-save">
          <input type="checkbox" checked={form[f.key] !== '0'}
            onChange={(e) => setForm({ ...form, [f.key]: e.target.checked ? '1' : '0' })} />
          <span>{f.ar} {form[f.key] === '0' && '(معطّل — لن يظهر للزبناء)'}</span>
        </label>
      ))}
      <button className="btn btn-primary" style={{ padding: '10px 26px', fontSize: 14, marginTop: 14 }} disabled={busy}>
        {busy ? '…' : 'حفظ الإعدادات'}
      </button>
      {saved && <p className="auth__fine">{saved}</p>}
    </form>
  )
}
