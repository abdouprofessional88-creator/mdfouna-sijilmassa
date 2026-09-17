import { useEffect, useMemo, useState } from 'react'
import { CATEGORIES, PRODUCTS, adaptApiMenu, searchProducts, setOptionGroups, sortProducts } from '../../data/menu.js'
import { api } from '../../api/client.js'
import { useCart } from '../../cart/CartContext.jsx'
import MenuCard from './MenuCard.jsx'
import MenuModal from './MenuModal.jsx'
import SafeImage from '../SafeImage.jsx'

const SORTS = [
  { id: 'popular', ar: 'الأكثر تميزاً' },
  { id: 'price-asc', ar: 'السعر: من الأقل' },
  { id: 'price-desc', ar: 'السعر: من الأعلى' },
  { id: 'name', ar: 'أبجدي' },
]

const AVAIL = [
  { id: 'all', ar: 'الكل' },
  { id: 'yes', ar: 'متوفر' },
  { id: 'no', ar: 'غير متوفر' },
]

export default function MenuSection() {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState('popular')
  const [avail, setAvail] = useState('all')
  const [selected, setSelected] = useState(null)
  const [customize, setCustomize] = useState(false)
  const [cats, setCats] = useState(CATEGORIES)
  const [items, setItems] = useState([])
  const [live, setLive] = useState(false)
  const [loading, setLoading] = useState(true)
  const openProduct = (p, cust = false) => {
    setSelected(p)
    setCustomize(cust)
    // recently viewed (local UI history only — not order data)
    try {
      const k = 'ms_recent'
      const prev = JSON.parse(localStorage.getItem(k) || '[]').filter((x) => x !== p.id)
      localStorage.setItem(k, JSON.stringify([p.id, ...prev].slice(0, 8)))
    } catch {}
  }
  // Live menu from MySQL API — silent fallback to local demo data if offline
  const { setFees } = useCart()
  useEffect(() => {
    let done = false
    const finish = (products, categories, isLive) => {
      if (done) return
      done = true
      setCats(categories)
      setItems(products)
      setLive(isLive)
      setLoading(false)
    }
    const fallbackTimer = setTimeout(() => finish(PRODUCTS, CATEGORIES, false), 1200)
    api.menu()
      .then((d) => {
        if (d.fees) setFees({ delivery_fee_mad: Number(d.fees.delivery_fee_mad) || 0, free_delivery_over_mad: Number(d.fees.free_delivery_over_mad) || 0 })
        const adapted = adaptApiMenu(d)
        if (adapted.products.length > 0) {
          clearTimeout(fallbackTimer)
          finish(adapted.products, adapted.categories, true)
        }
      })
      .catch(() => {})
    api.menuOptions?.().then((d) => setOptionGroups(d.groups)).catch(() => {})
    return () => { done = true; clearTimeout(fallbackTimer) }
  }, [setFees])

  const counts = useMemo(() => {
    const m = { all: items.length }
    for (const p of items) m[p.cat] = (m[p.cat] || 0) + 1
    return m
  }, [items])

  const results = useMemo(() => {
    let list = searchProducts(query, items)
    if (cat !== 'all') list = list.filter((p) => p.cat === cat)
    if (avail === 'yes') list = list.filter((p) => p.available)
    if (avail === 'no') list = list.filter((p) => !p.available)
    return sortProducts(list, sort)
  }, [query, cat, sort, avail, items])

  const reset = () => {
    setQuery('')
    setCat('all')
    setSort('popular')
    setAvail('all')
  }

  const picks = useMemo(() => items.filter((p) => p.popular && p.available).slice(0, 6), [items])
  const recent = useMemo(() => {
    try {
      const ids = JSON.parse(localStorage.getItem('ms_recent') || '[]')
      return ids.map((id) => items.find((p) => p.id === id)).filter(Boolean).slice(0, 6)
    } catch { return [] }
  }, [items, selected])

  return (
    <section id="menu" className="section menux">
      <div className="container">
        <div className="reveal section-head">
          <div>
            <span className="kicker kicker--light">المينيو الكامل</span>
            <h2 className="h2" style={{ marginTop: 12, color: 'var(--cream-100)' }}>
              اكتشف أطباقنا
            </h2>
          </div>
          <span className="demo-pill demo-pill--light">
            {live ? 'مباشر من قاعدة البيانات ✓' : 'DEMO — الأصناف والأثمنة تجريبية'}
          </span>
        </div>

        <div className="menux__toolbar">
          <div className="menux__search" role="search">
            <span className="menux__icon" aria-hidden="true">⌕</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="قلّب: مدفونة، طنجية، chicken…"
              aria-label="البحث في المينيو"
            />
            {query && (
              <button className="menux__clear" onClick={() => setQuery('')} aria-label="مسح البحث">
                ✕
              </button>
            )}
          </div>

          <div className="menux__row">
            <label className="menux__sort">
              ترتيب:
              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="ترتيب النتائج">
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.ar}
                  </option>
                ))}
              </select>
            </label>
            <div className="menux__avail" role="group" aria-label="التوفر">
              {AVAIL.map((a) => (
                <button
                  key={a.id}
                  className={avail === a.id ? 'is-on' : ''}
                  onClick={() => setAvail(a.id)}
                >
                  {a.ar}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="menux__cats" role="tablist" aria-label="أصناف المينيو">
          {cats.map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={cat === c.id}
              className={cat === c.id ? 'is-on' : ''}
              onClick={() => setCat(c.id)}
            >
              {c.ar} <small>{counts[c.id] || 0}</small>
            </button>
          ))}
        </div>

        <p className="menux__count" aria-live="polite">
          {results.length === 0
            ? 'لا نتائج'
            : `${results.length} ${results.length === 1 ? 'طبق' : results.length === 2 ? 'طبقان' : 'أطباق'}`}
          {query && (
            <>
              {' '}عن <strong>“{query}”</strong>{' '}
              <button className="menux__reset" onClick={reset}>
                إعادة الضبط
              </button>
            </>
          )}
        </p>

        {loading ? (
          <div className="menux__grid" aria-label="جاري التحميل">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skel">
                <div className="skel__img" />
                <div className="skel__line w60" />
                <div className="skel__line" />
                <div className="skel__line w40" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {!query && cat === 'all' && picks.length > 0 && (
              <div className="picks">
                <div className="picks__head">
                  <strong>⭐ مقترحات الشيف</strong>
                  <span>الأطباق التي يطلبها زبناؤنا أكثر</span>
                </div>
                <div className="picks__row">
                  {picks.map((p) => (
                    <button key={p.id} className="pick" onClick={() => openProduct(p)}>
                      <SafeImage real={p.image.real} src={p.image.src} fallback={p.image.fallback} alt={p.name} loading="lazy" />
                      <span>{p.name}</span>
                      <small>{p.price} درهم</small>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!query && cat === 'all' && recent.length > 0 && (
              <div className="picks picks--recent">
                <div className="picks__head">
                  <strong>🕘 شاهدت مؤخراً</strong>
                </div>
                <div className="picks__row">
                  {recent.map((p) => (
                    <button key={p.id} className="pick" onClick={() => openProduct(p)}>
                      <SafeImage real={p.image.real} src={p.image.src} fallback={p.image.fallback} alt={p.name} loading="lazy" />
                      <span>{p.name}</span>
                      <small>{p.price} درهم</small>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {results.length === 0 ? (
              <div className="menux__empty">
                <span className="menux__empty-art" aria-hidden="true">◍</span>
                <h3>ما لقيناش هاد الطبق</h3>
                <p>جرّب كلمة أخرى أو اكتشف باقي المينيو.</p>
                <button className="btn btn-primary" onClick={reset}>
                  عرض المينيو كامل
                </button>
              </div>
            ) : (
              <div className="menux__grid" key={`${cat}-${sort}-${avail}-${query}`}>
                {results.map((p) => (
                  <MenuCard key={p.id} product={p} onOpen={openProduct} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <MenuModal product={selected} items={items} startCustomize={customize}
          onClose={() => { setSelected(null); setCustomize(false) }} onSelect={(p) => { setSelected(p); setCustomize(false) }} />
      )}
    </section>
  )
}
