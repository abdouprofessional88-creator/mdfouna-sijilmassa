import { restaurant } from '../config/restaurant.js'
import { photos } from '../data/demo.js'
import SafeImage from './SafeImage.jsx'

const heroTiles = [
  { id: 'm', name: 'مدفونة', latin: 'Madfouna', image: photos.madfouna },
  { id: 't', name: 'طنجية', latin: 'Tanjia', image: photos.tanjia },
  { id: 'd', name: 'دجاج محمر', latin: 'Poulet', image: photos.poulet },
  { id: 'r', name: 'رفيسة', latin: 'Rfissa', image: photos.rfissa },
]

export default function Hero() {
  return (
    <section id="home" className="hero">
      <div className="hero__bg" aria-hidden="true">
        <div className="hero__pattern" />
        <div className="hero__glow" />
      </div>

      <div className="container hero__grid">
        <div className="hero__copy page-enter">
          <p className="latin hero__latin">Meknès · Capitale Ismailienne · Depuis 2016</p>
          <h1 className="display hero__title">
            نكهة المغرب،
            <br />
            <span className="hero__accent">في قلب العاصمة الإسماعيلية</span>
          </h1>
          <p className="lead lead--light hero__sub">
            اكتشف أطباقاً مغربية أصيلة، من المدفونة والطنجية إلى الدجاج المحمر والرفيسة بالتريد —
            في تجربة تجمع بين الطعم والضيافة.
          </p>
          <div className="hero__actions">
            <a href="#reserve" className="btn btn-primary">
              {restaurant.ctas.reserve}
              <span aria-hidden="true">←</span>
            </a>
            <a href="#menu" className="btn btn-ghost">
              {restaurant.ctas.menu}
            </a>
          </div>
          <ul className="hero__meta">
            <li>
              <strong>{restaurant.cityAr}</strong>
              <span>{restaurant.cityNoteAr}</span>
            </li>
            <li>
              <strong>مطبخ تقليدي</strong>
              <span>Patrimoine &amp; Goût</span>
            </li>
            <li>
              <strong>للعائلات</strong>
              <span>سفري · توصيل · مناسبات</span>
            </li>
          </ul>
        </div>

        <div className="hero__visual" aria-label="تشكيلة من أطباق المطعم">
          <div className="hero__frame">
            <div className="hero__main">
              <SafeImage
                real={photos.hero.real}
                src={photos.hero.src}
                fallback={photos.hero.fallback}
                alt="طاجين مغربي بالخضرة في طبق فخاري"
              />
            </div>
            <div className="hero__tiles">
              {heroTiles.map((t, i) => (
                <figure key={t.id} className="tile" style={{ '--d': `${0.15 + i * 0.12}s` }}>
                  <SafeImage real={t.image.real} src={t.image.src} fallback={t.image.fallback} alt={t.name} loading={i > 1 ? 'lazy' : 'eager'} />
                  <figcaption>
                    <strong>{t.name}</strong>
                    <small className="latin">{t.latin}</small>
                  </figcaption>
                  {t.image.approx && <span className="tile__approx">صورة تقريبية</span>}
                </figure>
              ))}
            </div>
            <p className="hero__note">صور حقيقية — بعضها تقريبي ويُستبدل بصور المطعم عند توفرها</p>
          </div>
        </div>
      </div>

      <a className="hero__scroll" href="#story" aria-label="مرر للأسفل لاكتشاف المزيد">
        <span />
      </a>
    </section>
  )
}
