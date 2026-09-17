import { menuPreview, photos } from '../data/demo.js'
import SafeImage from './SafeImage.jsx'

export default function MenuPreview() {
  return (
    <section id="menu" className="section menu">
      <div className="container menu__grid">
        <div className="reveal menu__side">
          <span className="kicker kicker--light">المينيو</span>
          <h2 className="h2" style={{ margin: '14px 0', color: 'var(--cream-100)' }}>
            نظرة على المائدة
          </h2>
          <p className="lead lead--light">
            الأصناف مؤكدة من واقع منشورات المطعم. الأثمنة الرسمية لا تُعرض هنا — تُحدد لاحقاً من طرف الإدارة.
          </p>
          <span className="demo-pill demo-pill--light" style={{ marginTop: 14 }}>
            DEMO — بدون أثمنة رسمية
          </span>
          <div style={{ marginTop: 26, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="#reserve" className="btn btn-primary">
              احجز طاولتك
            </a>
            <a href="#contact" className="btn btn-ghost">
              اسأل عن اليوم
            </a>
          </div>
          <figure className="menu__figure">
            <SafeImage real={photos.pastilla.real} src={photos.pastilla.src} fallback={photos.pastilla.fallback} alt="حلويات وبسطيلة مغربية" loading="lazy" />
            <figcaption>بسطيلة وحلويات مغربية — صورة تقريبية</figcaption>
          </figure>
        </div>

        <div className="menu__cards">
          {menuPreview.map((cat, i) => (
            <article key={cat.category} className="reveal menu-card" data-delay={String(i + 1)}>
              <header>
                <h3>{cat.category}</h3>
                <span className="demo-pill">{cat.note}</span>
              </header>
              <ul>
                {cat.items.map((it) => (
                  <li key={it.name}>
                    <div>
                      <strong>{it.name}</strong>
                      <p>{it.desc}</p>
                    </div>
                    <span className="dots" aria-hidden="true" />
                    <span className="price">—</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
