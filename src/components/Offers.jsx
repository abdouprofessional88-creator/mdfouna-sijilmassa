import { useEffect, useState } from 'react'
import { offers as fallbackOffers } from '../data/demo.js'
import { photos } from '../data/demo.js'
import { api } from '../api/client.js'
import { fmtDay } from '../utils/dates.js'
import SafeImage from './SafeImage.jsx'

/** Live offers from MySQL (active only) — falls back to demo data offline. */
export default function Offers() {
  const [live, setLive] = useState(null)

  useEffect(() => {
    api.offers().then((d) => setLive(d.offers)).catch(() => setLive([]))
  }, [])

  const items = live === null || live.length === 0
    ? fallbackOffers
    : live.map((o) => ({
        id: `db-${o.id}`,
        title: o.title_ar,
        desc: o.description_ar || '',
        badge: o.price ? `${o.price} درهم (تجريبي)` : 'عرض',
        image: photos[o.image_key] || photos.couscous,
        start: o.start_date, end: o.end_date,
      }))

  return (
    <section id="offers" className="section">
      <div className="container">
        <div className="reveal section-head">
          <div>
            <span className="kicker">العروض والخدمات</span>
            <h2 className="h2" style={{ marginTop: 12 }}>
              أكثر من وجبة
            </h2>
          </div>
          <span className="demo-pill">
            {live !== null && live.length > 0 ? 'عروض مباشرة من المطعم ✓' : 'DEMO — تُؤكد التفاصيل مع الإدارة'}
          </span>
        </div>
        <div className="offers">
          {items.map((o, i) => (
            <article key={o.id} className="reveal offer" data-delay={String((i % 3) + 1)}>
              <div className="offer__art">
                <SafeImage real={o.image.real} src={o.image.src} fallback={o.image.fallback} alt={o.title} loading="lazy" />
                <span className="offer__badge">{o.badge}</span>
              </div>
              <h3>{o.title}</h3>
              <p>{o.desc}</p>
              {(o.start || o.end) && (
                <p className="offer__dates">
                  صالح{o.start ? ` من ${fmtDay(o.start)}` : ''}{o.end ? ` إلى ${fmtDay(o.end)}` : ''}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
