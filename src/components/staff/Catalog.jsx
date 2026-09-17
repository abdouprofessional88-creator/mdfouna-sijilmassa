import { useEffect, useState } from 'react'
import { staffApi } from '../../api/client.js'
import { Empty } from './common.jsx'

const MODES = { all_day: 'طوال اليوم', lunch: 'الغداء', dinner: 'العشاء', preorder: 'طلب مسبق' }

/** Menu + offers management (admin/manager): availability toggles + prices. */
export default function Catalog() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [prices, setPrices] = useState({})

  const load = async () => {
    try {
      setData(await staffApi.staffMenu())
    } catch (e) {
      setError(e.message)
    }
  }
  useEffect(() => { load() }, [])

  const toggleItem = async (it) => {
    try {
      await staffApi.updateMenuItem(it.id, { is_available: !it.is_available })
      await load()
    } catch (e) {
      alert(e.message)
    }
  }

  const savePrice = async (it) => {
    const v = prices[it.id]
    if (v === undefined || v === '') return
    try {
      await staffApi.updateMenuItem(it.id, { base_price: Number(v) })
      setPrices((p) => ({ ...p, [it.id]: undefined }))
      await load()
    } catch (e) {
      alert(e.message)
    }
  }

  const toggleOffer = async (o) => {
    try {
      await staffApi.updateOffer(o.id, { is_active: !o.is_active })
      await load()
    } catch (e) {
      alert(e.message)
    }
  }

  if (error) return <p className="auth__err">{error}</p>
  if (!data) return <p className="dash__muted">جاري تحميل المينيو…</p>

  const byCat = {}
  for (const it of data.items) {
    const c = data.categories.find((x) => x.id === it.category_id)
    const k = c ? c.name_ar : '?'
    ;(byCat[k] = byCat[k] || []).push(it)
  }

  return (
    <>
      <p className="dash__muted">التغييرات تُحفظ في MySQL فوراً وتنعكس على مينيو الزبناء. الأثمنة تجريبية (DEMO).</p>
      {Object.entries(byCat).map(([cat, items]) => (
        <div key={cat}>
          <h3 className="dash__sub">{cat} ({items.length})</h3>
          <div className="dash__table-wrap">
            <table className="dash__table">
              <thead><tr><th>الصنف</th><th>السعر (درهم)</th><th>التوفر</th><th>الوضع</th><th>إجراءات</th></tr></thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className={it.is_available ? '' : 'is-off'}>
                    <td><strong>{it.name_ar}</strong><br /><small>{it.name_en || ''}</small></td>
                    <td>
                      <span className="dash__price">
                        <input type="number" min={0} className="dash__num"
                          defaultValue={Number(it.base_price)}
                          onChange={(e) => setPrices((p) => ({ ...p, [it.id]: e.target.value }))}
                          aria-label={`سعر ${it.name_ar}`} />
                        {prices[it.id] !== undefined && prices[it.id] !== '' && (
                          <button onClick={() => savePrice(it)}>حفظ</button>
                        )}
                      </span>
                    </td>
                    <td>{it.is_available ? 'متوفر' : 'موقوف'}</td>
                    <td>
                      <select className="dash__select" style={{ padding: '6px 12px', fontSize: 13 }} value={it.availability_mode || 'all_day'}
                        onChange={async (e) => {
                          try {
                            await staffApi.updateMenuItem(it.id, { availability_mode: e.target.value })
                            await load()
                          } catch (err) { alert(err.message) }
                        }} aria-label={`وضع توفر ${it.name_ar}`}>
                        {Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td className="dash__acts">
                      <button onClick={() => toggleItem(it)}>
                        {it.is_available ? 'إيقاف' : 'تفعيل'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <h3 className="dash__sub">العروض</h3>
      {data.offers.length === 0 && <Empty text="لا عروض مسجلة." />}
      {data.offers.map((o) => (
        <div key={o.id} className="dash__offer">
          <div><strong>{o.title_ar}</strong> — {o.price} درهم <small>(تجريبي)</small></div>
          <div className="dash__acts">
            <button onClick={() => toggleOffer(o)}>{o.is_active ? 'تعطيل' : 'تفعيل'}</button>
            <button onClick={async () => {
              if (!window.confirm(`حذف عرض «${o.title_ar}» نهائياً؟`)) return
              try { await staffApi.deleteOffer(o.id); await load() } catch (e) { alert(e.message) }
            }}>حذف</button>
          </div>
        </div>
      ))}
      <ManageForms data={data} load={load} setError={setError} />
    </>
  )
}

const blankItem = { category_id: '', name_ar: '', name_en: '', description_ar: '', base_price: '', badge_ar: '' };

/** Full menu/offers/categories/options management forms. */
function ManageForms({ data, load, setError }) {
  const [item, setItem] = useState(blankItem)
  const [editingId, setEditingId] = useState(null)
  const [catName, setCatName] = useState('')
  const [offer, setOffer] = useState({ title_ar: '', description_ar: '', price: '' })
  const [groups, setGroups] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    staffApi.optionGroups().then((d) => setGroups(d.groups)).catch(() => setGroups([]))
  }, [])

  const err = (e) => setError(e.details ? Object.values(e.details).flat().join('، ') : e.message)

  const submitItem = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const payload = { ...item, base_price: Number(item.base_price), category_id: Number(item.category_id) }
      if (editingId) await staffApi.updateMenuItemFull(editingId, payload)
      else await staffApi.createMenuItem(payload)
      setItem(blankItem)
      setEditingId(null)
      await load()
    } catch (e) { err(e) } finally { setBusy(false) }
  }

  const startEdit = (it) => {
    const c = data.categories.find((x) => x.id === it.category_id)
    setEditingId(it.id)
    setItem({
      category_id: String(it.category_id), name_ar: it.name_ar, name_en: it.name_en || '',
      description_ar: it.description_ar || '', base_price: String(it.base_price),
      badge_ar: it.badge_ar || '',
    })
    window.scrollTo({ top: document.querySelector('.dash__form')?.offsetTop - 100 || 0, behavior: 'smooth' })
  }

  const delItem = async (it) => {
    if (!window.confirm(`حذف «${it.name_ar}» نهائياً؟ (طلبات الزبناء القديمة تبقى محفوظة)`)) return
    try { await staffApi.deleteMenuItem(it.id); await load() } catch (e) { err(e) }
  }

  const addCat = async (e) => {
    e.preventDefault()
    if (catName.trim().length < 2) return
    try {
      await staffApi.createCategory({ name_ar: catName.trim(), sort_order: data.categories.length + 1 })
      setCatName('')
      await load()
    } catch (e) { err(e) }
  }

  const addOffer = async (e) => {
    e.preventDefault()
    if (offer.title_ar.trim().length < 2) return
    try {
      await staffApi.createOffer({ title_ar: offer.title_ar.trim(), description_ar: offer.description_ar, price: Number(offer.price) || null })
      setOffer({ title_ar: '', description_ar: '', price: '' })
      await load()
    } catch (e) { err(e) }
  }

  return (
    <>
      <form className="dash__form" onSubmit={submitItem}>
        <h3 className="dash__sub">{editingId ? 'تعديل الطبق' : 'إضافة طبق جديد'}</h3>
        <div className="dash__form-grid">
          <label>الصنف
            <select className="auth__input" value={item.category_id} onChange={(e) => setItem({ ...item, category_id: e.target.value })} required>
              <option value="">— اختر —</option>
              {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
            </select>
          </label>
          <label>الاسم بالعربية<input className="auth__input" value={item.name_ar} onChange={(e) => setItem({ ...item, name_ar: e.target.value })} required /></label>
          <label>الاسم الثاني<input className="auth__input" value={item.name_en} onChange={(e) => setItem({ ...item, name_en: e.target.value })} dir="ltr" /></label>
          <label>السعر (درهم)<input className="auth__input" type="number" min={0} value={item.base_price} onChange={(e) => setItem({ ...item, base_price: e.target.value })} required /></label>
          <label>الوصف<input className="auth__input" value={item.description_ar} onChange={(e) => setItem({ ...item, description_ar: e.target.value })} /></label>
          <label>شارة<input className="auth__input" value={item.badge_ar} onChange={(e) => setItem({ ...item, badge_ar: e.target.value })} placeholder="اختياري" /></label>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button className="btn btn-primary" style={{ padding: '10px 26px', fontSize: 14 }} disabled={busy}>
            {busy ? '…' : editingId ? 'حفظ التعديل' : 'إضافة الطبق'}
          </button>
          {editingId && <button type="button" className="btn btn-outline" style={{ padding: '10px 26px', fontSize: 14 }} onClick={() => { setEditingId(null); setItem(blankItem) }}>إلغاء</button>}
        </div>
        <p className="dash__muted" style={{ marginTop: 10 }}>لتعديل طبق موجود: اختر “تعديل” من جدول الأصناف — <EditShortcuts data={data} onEdit={startEdit} onDelete={delItem} /></p>
      </form>

      <form className="dash__form" onSubmit={addCat}>
        <h3 className="dash__sub">إضافة صنف جديد</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="auth__input" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="مثال: الشوربات" style={{ flex: 1 }} />
          <button className="btn btn-primary" style={{ padding: '10px 26px', fontSize: 14 }}>إضافة</button>
        </div>
      </form>

      <form className="dash__form" onSubmit={addOffer}>
        <h3 className="dash__sub">إضافة عرض (تجريبي)</h3>
        <div className="dash__form-grid">
          <label>العنوان<input className="auth__input" value={offer.title_ar} onChange={(e) => setOffer({ ...offer, title_ar: e.target.value })} required /></label>
          <label>الوصف<input className="auth__input" value={offer.description_ar} onChange={(e) => setOffer({ ...offer, description_ar: e.target.value })} /></label>
          <label>السعر (درهم)<input className="auth__input" type="number" min={0} value={offer.price} onChange={(e) => setOffer({ ...offer, price: e.target.value })} /></label>
        </div>
        <button className="btn btn-primary" style={{ padding: '10px 26px', fontSize: 14, marginTop: 12 }}>إضافة العرض</button>
      </form>

      <div className="dash__form">
        <h3 className="dash__sub">مجموعات التخصيص ({groups === null ? '…' : groups.length})</h3>
        {groups !== null && groups.length === 0 && <Empty text="لا مجموعات." />}
        {(groups || []).map((g) => (
          <div key={g.id} className="dash__offer">
            <div><strong>{g.group_label_ar}</strong> <small>({g.scope_type}:{g.scope_value || 'الكل'}) — {(g.options || []).length} خيارات</small></div>
            <div className="dash__acts">
              <button onClick={async () => {
                try { await staffApi.updateOptionGroup(g.id, { is_active: !g.is_active }); setGroups((await staffApi.optionGroups()).groups) }
                catch (e) { err(e) }
              }}>{g.is_active ? 'تعطيل' : 'تفعيل'}</button>
              <button onClick={async () => {
                if (!window.confirm(`حذف مجموعة «${g.group_label_ar}»؟`)) return
                try { await staffApi.deleteOptionGroup(g.id); setGroups((await staffApi.optionGroups()).groups) }
                catch (e) { err(e) }
              }}>حذف</button>
            </div>
          </div>
        ))}
        <p className="dash__muted">إضافة مجموعات جديدة: من قاعدة البيانات مباشرة حالياً — التعطيل والحذف متاحان هنا.</p>
      </div>
    </>
  )
}

function EditShortcuts({ data, onEdit, onDelete }) {
  const [id, setId] = useState('')
  const all = []
  for (const it of data.items) all.push(it)
  return (
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <select className="dash__select" value={id} onChange={(e) => setId(e.target.value)} aria-label="اختيار طبق للتعديل">
        <option value="">— اختر طبقاً —</option>
        {all.map((it) => <option key={it.id} value={it.id}>{it.name_ar}</option>)}
      </select>
      <button type="button" className="dash__today" disabled={!id}
        onClick={() => { const it = all.find((x) => String(x.id) === String(id)); if (it) onEdit(it) }}>
        تعديل
      </button>
      <button type="button" className="dash__today" disabled={!id}
        onClick={() => { const it = all.find((x) => String(x.id) === String(id)); if (it) onDelete(it) }}>
        حذف
      </button>
    </span>
  )
}
