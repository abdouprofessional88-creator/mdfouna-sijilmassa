import { useEffect, useMemo, useState } from 'react'
import { categoryLabel, defaultSelection, groupsForProduct, modeLabel, relatedProducts, selectionLines, selectionPrice } from '../../data/menu.js'
import { restaurant } from '../../config/restaurant.js'
import { useCart } from '../../cart/CartContext.jsx'
import SafeImage from '../SafeImage.jsx'

export default function MenuModal({ product, items, onClose, onSelect, startCustomize = false }) {
  const { add, setOpen } = useCart()
  const [customizing, setCustomizing] = useState(startCustomize)
  const groups = useMemo(() => groupsForProduct(product), [product])
  const [selection, setSelection] = useState(() => defaultSelection(groups))
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')
  const [warn, setWarn] = useState('')

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  useEffect(() => {
    setSelection(defaultSelection(groupsForProduct(product)))
    setQty(1)
    setNote('')
    setWarn('')
    setCustomizing(startCustomize)
  }, [product, startCustomize])

  if (!product) return null
  const related = relatedProducts(product, 3, items)
  const delta = selectionPrice(groups, selection)
  const unit = Math.max(0, Number(product.price) + delta)

  const pick = (g, oid) => {
    setWarn('')
    setSelection((s) => {
      if (g.selection === 'multiple') {
        const cur = Array.isArray(s[String(g.id)]) ? s[String(g.id)] : []
        return { ...s, [String(g.id)]: cur.includes(oid) ? cur.filter((x) => x !== oid) : [...cur, oid] }
      }
      return { ...s, [String(g.id)]: oid }
    })
  }

  const doAdd = () => {
    const pid = Number(String(product.dbId || product.id).replace(/^db-/, ''))
    if (!pid) {
      setWarn('الطلب الإلكتروني متاح فقط عند الاتصال بسيرفر المطعم — حدّث الصفحة وحاول مجدداً.')
      return
    }
    const missing = groups.find((g) => {
      if (!g.is_required) return false
      const v = selection[String(g.id)]
      return g.selection === 'multiple' ? !(Array.isArray(v) && v.length) : !v
    })
    if (missing) {
      setWarn(`اختيار «${missing.group_label_ar}» إجباري`)
      return
    }
    add({
      productId: product.dbId || product.id,
      name: product.name, latin: product.latin, image: product.image,
      basePrice: Number(product.price), qty,
      options: selectionLines(groups, selection), note: note.trim(),
    })
    onClose()
    setOpen(true)
  }

  return (
    <div className="mmodal" role="dialog" aria-modal="true" aria-label={product.name}>
      <button className="mmodal__backdrop" onClick={onClose} aria-label="إغلاق" tabIndex={-1} />
      <div className="mmodal__box">
        <button className="mmodal__close" onClick={onClose} aria-label="إغلاق التفاصيل">✕</button>
        <div className="mmodal__media" key={product.id}>
          <SafeImage
            real={product.image.real}
            src={product.image.src}
            fallback={product.image.fallback}
            alt={product.name}
          />
          {product.badge && <span className="mcard__badge">{product.badge}</span>}
        </div>
        <div className="mmodal__body">
          <p className="mcard__cat">{categoryLabel(product.cat)}</p>
          <h3 className="mmodal__title">{product.name}</h3>
          <p className="latin mmodal__latin">{product.latin}</p>
          <p className="mmodal__desc">{product.desc}</p>
          {(product.availability_mode || 'all_day') !== 'all_day' && (
            <p className="mmodal__mode">
              ⏰ {modeLabel(product.availability_mode)}
              {product.availability_mode === 'preorder' && ' — يُحضّر خصيصاً لك، اطلبه مسبقاً (يفضل قبل 24 ساعة، DEMO)'}
            </p>
          )}

          <div className="mmodal__row">
            <span className="mmodal__price">{product.price} درهم <small>سعر تجريبي</small></span>
            <span className={`mmodal__avail ${product.available ? 'ok' : 'no'}`}>
              {product.available ? '● متوفر' : '● غير متوفر حالياً'}
            </span>
          </div>

          {product.available && groups.length > 0 && !customizing && (
            <button className="btn btn-outline cust__toggle" onClick={() => setCustomizing(true)}>
              تخصيص الوجبة ({groups.length} {groups.length === 1 ? 'خيار' : 'خيارات'})
            </button>
          )}

          {product.available && customizing && (
            <div className="cust">
              {groups.map((g) => {
                const v = selection[String(g.id)]
                return (
                  <fieldset key={g.id} className="cust__group">
                    <legend>{g.group_label_ar} {g.is_required && <b>*</b>} <small>{g.selection === 'multiple' ? '(اختيارات متعددة)' : ''}</small></legend>
                    <div className="cust__opts">
                      {g.options.map((o) => {
                        const on = g.selection === 'multiple' ? (Array.isArray(v) && v.includes(String(o.id))) : String(v) === String(o.id)
                        return (
                          <button key={o.id} type="button" className={on ? 'is-on' : ''}
                            onClick={() => pick(g, String(o.id))} aria-pressed={on}>
                            {o.label_ar}
                            {Number(o.price_delta) !== 0 && (
                              <small> {Number(o.price_delta) > 0 ? '+' : ''}{o.price_delta} درهم</small>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </fieldset>
                )
              })}
              <label className="cust__note">ملاحظات خاصة
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="بدون ملح، حار زيادة…" maxLength={255} />
              </label>
              {warn && <p className="auth__field-err" role="alert">{warn}</p>}
            </div>
          )}

          {product.available && (
            <div className="cust__buy">
              <div className="cust__qty" role="group" aria-label="الكمية">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="إنقاص">−</button>
                <strong>{qty}</strong>
                <button onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="زيادة">+</button>
              </div>
              <button className="btn btn-primary cust__add" onClick={doAdd}>
                أضف للسلة · {unit * qty} درهم
              </button>
            </div>
          )}

          <dl className="mmodal__meta">
            <div>
              <dt>المكونات</dt>
              <dd>{product.ingredients || 'تُحدد القائمة النهائية مع الإدارة'} <span className="demo-pill">DEMO</span></dd>
            </div>
            <div>
              <dt>الحساسية</dt>
              <dd>{product.allergens || 'يُرجى الاستفسار عند الحجز'} <span className="demo-pill">DEMO</span></dd>
            </div>
          </dl>

          {related.length > 0 && (
            <div className="mmodal__related">
              <strong>أطباق مشابهة</strong>
              <div className="mmodal__rel-grid">
                {related.map((r) => (
                  <button key={r.id} onClick={() => onSelect(r)}>
                    <SafeImage real={r.image.real} src={r.image.src} fallback={r.image.fallback} alt={r.name} loading="lazy" />
                    <span>{r.name}</span>
                    <small>{r.price} درهم</small>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mmodal__actions">
            <a className="btn btn-ghost-inv" href={restaurant.phones[0].href}>
              اتصل للحجز — {restaurant.phones[0].label}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
