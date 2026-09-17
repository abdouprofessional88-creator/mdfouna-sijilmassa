import { signatureDishes } from '../data/demo.js'
import SafeImage from './SafeImage.jsx'

export default function SignatureDishes() {
  return (
    <section id="signature" className="section signature">
      <div className="container">
        <div className="reveal section-head">
          <div>
            <span className="kicker">أطباق التوقيع</span>
            <h2 className="h2" style={{ marginTop: 12 }}>
              ما يشتهر به المطعم فعلاً
            </h2>
          </div>
          <p className="lead" style={{ maxWidth: 440 }}>
            صور حقيقية لأطباق مغربية أصيلة — الصور الموسومة "تقريبية" تُستبدل بصور المطعم لاحقاً.
          </p>
        </div>

        <div className="dishes">
          {signatureDishes.map((d, i) => (
            <article key={d.id} className="reveal dish" data-delay={String((i % 3) + 1)}>
              <div className="dish__art">
                <SafeImage real={d.image.real} src={d.image.src} fallback={d.image.fallback} alt={d.name} loading="lazy" />
                <span className="dish__tag">{d.tag}</span>
                {d.image.approx && <span className="dish__approx">صورة تقريبية</span>}
              </div>
              <div className="dish__body">
                <p className="latin dish__latin">{d.latin}</p>
                <h3>{d.name}</h3>
                <p>{d.desc}</p>
                <span className="dish__more">
                  تُقدَّم يومياً حسب التوفر <span aria-hidden="true">←</span>
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
