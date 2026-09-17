import { restaurant } from '../config/restaurant.js'
import { photos } from '../data/demo.js'
import SafeImage from './SafeImage.jsx'

const points = [
  { title: 'هوية مغربية', desc: 'المدفونة والطنجية والرفيسة — أطباق من صميم المطبخ المغربي، تُحضَّر بوصفاتها الأصيلة.' },
  { title: 'فرن ونار هادئة', desc: 'طهي بطيء يحترم الوصفة الأصلية ويُبرز عمق النكهات، من الجرة إلى المائدة.' },
  { title: 'ضيافة عائلية', desc: 'قاعة دافئة بالألوان المغربية تستقبل العائلات والضيوف والمجموعات — منذ 2016.' },
  { title: 'للعائلات والمناسبات', desc: 'لمات عائلية، أعياد ميلاد، وعشاء عمل — أخبرنا بمناسبتك وسنجهز لك الاستقبال.' },
]

export default function Intro() {
  return (
    <section id="story" className="section intro">
      <div className="container intro__grid">
        <div className="reveal">
          <span className="kicker">حكاية الدار</span>
          <h2 className="h2" style={{ margin: '14px 0' }}>
            مطبخ مغربي أصيل،
            <br />
            وضيافة من القلب
          </h2>
          <p className="lead">
            {restaurant.descriptionAr} هنا تُقدَّم الأطباق بسخاء كما في الدار المغربية:
            المدفونة من الفرن، والطنجية من الرماد، وأتاي بالنعناع لختام كل وجبة.
          </p>
          <figure className="intro__figure">
            <SafeImage real={photos.interior.real} src={photos.interior.src} fallback={photos.interior.fallback} alt="قاعة مدفونة سجلماسة — الجلسة المغربية" loading="lazy" />
            <figcaption>قاعة مدفونة سجلماسة الحقيقية — الجلسة المغربية بالمخاد والألوان الدافئة</figcaption>
          </figure>
          <div className="intro__tags">
            {restaurant.cuisine.map((c) => (
              <span key={c} className="chip">
                {c}
              </span>
            ))}
          </div>
          <p className="intro__fine">
            <span className="demo-pill">DEMO</span> النصوص النهائية حول تاريخ المطعم تُكتب بعد تزويدنا بالمعلومات
            الرسمية من طرفكم.
          </p>
        </div>

        <div className="intro__cards">
          {points.map((p, i) => (
            <article key={p.title} className="reveal mini-card" data-delay={String(i + 1)}>
              <span className="mini-card__num latin">0{i + 1}</span>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </article>
          ))}
          <figure className="reveal mini-card mini-card--tea" data-delay="3">
            <SafeImage real={photos.tea.real} src={photos.tea.src} fallback={photos.tea.fallback} alt="حفل أتاي مغربي بإبريق فضي" loading="lazy" />
            <figcaption>ختام كل وجبة: أتاي بالنعناع على الأصول</figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
