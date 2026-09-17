import { useEffect } from 'react'
import { useCart } from '../../cart/CartContext.jsx'
import SafeImage from '../SafeImage.jsx'

export function CartToaster() {
  const { toast, setToast } = useCart()
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast, setToast])
  if (!toast) return null
  return <div key={toast.at} className="toast" role="status">✓ أُضيف «{toast.name}» إلى السلة</div>
}

export function CartDrawer({ onCheckout, onBrowse }) {
  const { lines, setQty, remove, subtotal, count, open, setOpen, feeFor, lineTotal } = useCart()

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open ])

  if (!open) return null
  const fee = feeFor('delivery')

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label="سلة الطلب">
      <button className="mmodal__backdrop" onClick={() => setOpen(false)} aria-label="إغلاق السلة" tabIndex={-1} />
      <aside className="drawer__box">
        <header className="drawer__head">
          <h3>سلة الطلب ({count})</h3>
          <button className="mmodal__close" style={{ position: 'static' }} onClick={() => setOpen(false)} aria-label="إغلاق">✕</button>
        </header>

        {lines.length === 0 ? (
          <div className="drawer__empty">
            <span aria-hidden="true">🧺</span>
            <p><strong>سلتك فارغة</strong></p>
            <p className="dash__muted">اكتشف المينيو وأضف ما يعجبك.</p>
            <button className="btn btn-primary" onClick={() => { setOpen(false); onBrowse() }}>
              تابع التسوق
            </button>
          </div>
        ) : (
          <>
            <ul className="drawer__list">
              {lines.map((l) => (
                <li key={l.key} className="drawer__line">
                  <SafeImage real={l.image.real} src={l.image.src} fallback={l.image.fallback} alt={l.name} loading="lazy" />
                  <div className="drawer__info">
                    <strong>{l.name}</strong>
                    {l.options.length > 0 && (
                      <small>{l.options.map((o) => o.label_ar).join(' · ')}</small>
                    )}
                    {l.note && <small>📝 {l.note}</small>}
                    <div className="drawer__qty">
                      <button onClick={() => setQty(l.key, l.qty - 1)} aria-label="إنقاص">−</button>
                      <strong>{l.qty}</strong>
                      <button onClick={() => setQty(l.key, l.qty + 1)} aria-label="زيادة">+</button>
                      <span className="drawer__price">{lineTotal(l)} درهم</span>
                    </div>
                  </div>
                  <button className="drawer__rm" onClick={() => remove(l.key)} aria-label={`حذف ${l.name}`}>✕</button>
                </li>
              ))}
            </ul>
            <footer className="drawer__foot">
              <div className="drawer__row"><span>المجموع الفرعي</span><strong>{subtotal} درهم</strong></div>
              <div className="drawer__row"><span>التوصيل (تقديري)</span><strong>{fee === 0 ? 'مجاني 🎉' : `${fee} درهم`}</strong></div>
              <div className="drawer__row total"><span>المجموع</span><strong>{subtotal + fee} درهم</strong></div>
              <p className="drawer__fine">الأثمنة تجريبية — يُعاد الحساب في السيرفر عند التأكيد.</p>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={onCheckout}>
                إتمام الطلب ←
              </button>
              <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => { setOpen(false); onBrowse() }}>
                تابع التسوق
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}

/** Sticky mobile bar — visible when the cart has items (mobile only via CSS). */
export function StickyCart({ visible }) {
  const { count, subtotal, open, setOpen } = useCart()
  if (!visible || open || count === 0) return null
  return (
    <button className="sticky-cart is-show" onClick={() => setOpen(true)} aria-label={`فتح السلة (${count})`}>
      <span>🧺 السلة</span>
      <b>{count}</b>
      <span>{subtotal} درهم ←</span>
    </button>
  )
}
