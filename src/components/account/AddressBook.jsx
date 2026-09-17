import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import MapPicker from '../map/MapPicker.jsx'

const LABEL_AR = { home: 'الدار', work: 'العمل', other: 'أخرى' }

/** Saved delivery addresses (MySQL — never localStorage). */
export default function AddressBook() {
  const [list, setList] = useState(null)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [point, setPoint] = useState(null)
  const [manualAddr, setManualAddr] = useState('')
  const [notes, setNotes] = useState('')
  const [label, setLabel] = useState('home')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      setList((await api.addresses()).addresses)
    } catch (e) {
      setError(e.message)
    }
  }
  useEffect(() => { load() }, [])

  const resetForm = () => {
    setAdding(false)
    setEditing(null)
    setPoint(null)
    setManualAddr('')
    setNotes('')
    setLabel('home')
    setError('')
  }

  const buildPayload = () => {
    if (!point) throw new Error('حدد النقطة على الخريطة أولاً.')
    const manual = point.geocodeFailed ? manualAddr.trim() : ''
    if (point.geocodeFailed && manual.length < 5) throw new Error('أضف وصفاً قصيراً للعنوان.')
    return {
      label,
      formatted_address: point.formatted || manual || `GPS: ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
      street: point.parts?.street || '',
      neighborhood: point.parts?.neighborhood || '',
      city: point.parts?.city || 'مكناس',
      postal_code: point.parts?.postal_code || '',
      country: point.parts?.country || 'المغرب',
      latitude: point.lat,
      longitude: point.lng,
      accuracy_m: point.accuracy,
      delivery_notes: notes.trim(),
      is_default: (list?.length || 0) === 0,
    }
  }

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const payload = buildPayload()
      if (editing) await api.updateAddress(editing, payload)
      else await api.saveAddress(payload)
      resetForm()
      await load()
    } catch (err) {
      setError(err.details ? Object.values(err.details).flat().join('، ') : err.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id) => {
    if (!window.confirm('حذف هذا العنوان؟')) return
    try {
      await api.deleteAddress(id)
      await load()
    } catch (e) {
      alert(e.message)
    }
  }

  const makeDefault = async (a) => {
    try {
      await api.updateAddress(a.id, { is_default: true })
      await load()
    } catch (e) {
      alert(e.message)
    }
  }

  const startEdit = (a) => {
    setEditing(a.id)
    setAdding(true)
    setLabel(a.label)
    setNotes(a.delivery_notes || '')
    setManualAddr('')
    setPoint({ lat: Number(a.latitude), lng: Number(a.longitude), formatted: a.formatted_address, parts: null })
  }

  return (
    <div>
      <h3 style={{ marginTop: 26 }}>عناوين التوصيل ({list === null ? '…' : list.length})</h3>
      {error && <p className="auth__err">{error}</p>}
      {list === null && <p>جاري التحميل…</p>}
      {list !== null && list.length === 0 && !adding && (
        <p className="acct__muted">لا عناوين محفوظة — أضف عنوان الدار لتطلب بسرعة.</p>
      )}
      {list !== null && list.map((a) => (
        <div key={a.id} className="addr-card">
          <div><strong>{LABEL_AR[a.label] || a.label}</strong>{a.is_default && ' ★ افتراضي'} — {a.formatted_address}</div>
          {a.delivery_notes && <div className="acct__muted">📝 {a.delivery_notes}</div>}
          <div className="dash__acts">
            {!a.is_default && <button onClick={() => makeDefault(a)}>افتراضي</button>}
            <button onClick={() => startEdit(a)}>تعديل</button>
            <button onClick={() => remove(a.id)}>حذف</button>
          </div>
        </div>
      ))}
      {!adding && (
        <button className="btn btn-outline" style={{ padding: '10px 24px', fontSize: 14, marginTop: 6 }}
          onClick={() => { setAdding(true); setEditing(null); setPoint(null); setManualAddr(''); setNotes(''); setLabel('home') }}>
          + عنوان جديد بالخريطة
        </button>
      )}
      {adding && (
        <form onSubmit={save} className="dash__form" style={{ marginTop: 14 }}>
          <MapPicker initial={point} onSelect={setPoint} compact />
          {point?.geocodeFailed && (
            <label>وصف العنوان (إجباري هنا)
              <input className="auth__input" value={manualAddr} onChange={(e) => setManualAddr(e.target.value)}
                placeholder="زنقة 12، عمارة النور…" />
            </label>
          )}
          <div className="auth__grid">
            <label>التصنيف
              <select className="auth__input" value={label} onChange={(e) => setLabel(e.target.value)}>
                <option value="home">الدار</option>
                <option value="work">العمل</option>
                <option value="other">أخرى</option>
              </select>
            </label>
            <label>ملاحظات التوصيل
              <input className="auth__input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={255} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="btn btn-primary" style={{ padding: '10px 26px', fontSize: 14 }} disabled={busy}>
              {busy ? '…' : editing ? 'حفظ التعديل' : 'حفظ العنوان'}
            </button>
            <button type="button" className="btn btn-outline" style={{ padding: '10px 26px', fontSize: 14 }} onClick={resetForm}>
              إلغاء
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
