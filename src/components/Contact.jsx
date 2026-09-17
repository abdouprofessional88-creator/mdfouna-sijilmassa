import { restaurant } from '../config/restaurant.js'

export default function Contact() {
  return (
    <section id="contact" className="section contact">
      <div className="container contact__grid">
        <div className="reveal">
          <span className="kicker">تواصل معنا</span>
          <h2 className="h2" style={{ margin: '12px 0' }}>
            تجدنا في مكناس
          </h2>
          <p className="lead">
            المعلومات أدناه كما وردت في الحساب الرسمي — المرجو تأكيدها قبل الإطلاق النهائي.
          </p>

          <ul className="contact__list">
            <li>
              <strong>العنوان (يحتاج تأكيداً)</strong>
              <p>{restaurant.address.ar}</p>
              <p className="latin" dir="ltr" style={{ textAlign: 'right' }}>
                {restaurant.address.latin}
              </p>
              <a href={restaurant.address.mapUrl} target="_blank" rel="noreferrer" className="contact__link">
                فتح في خرائط جوجل ←
              </a>
            </li>
            <li>
              <strong>الهاتف</strong>
              <div className="contact__phones">
                {restaurant.phones.map((p) => (
                  <a key={p.label} href={p.href} dir="ltr">
                    {p.label}
                  </a>
                ))}
              </div>
            </li>
            <li>
              <strong>أوقات العمل</strong>
              <p>
                {restaurant.hours.ar} <span className="demo-pill">DEMO</span>
              </p>
            </li>
          </ul>
        </div>

        <div className="reveal contact__card" data-delay="1">
          <h3>بطاقة تواصل سريعة</h3>
          <p>للطلبات الخارجية والحجز الفوري، الاتصال المباشر هو الأسرع حالياً.</p>
          <a className="btn btn-primary" href={restaurant.phones[0].href} style={{ width: '100%' }}>
            اتصل الآن — {restaurant.phones[0].label}
          </a>
          <a className="btn btn-outline" href={restaurant.social.instagram} target="_blank" rel="noreferrer" style={{ width: '100%' }}>
            @{restaurant.social.instagramHandle}
          </a>
          {restaurant.social.whatsapp ? (
            <a className="wa-btn" href={restaurant.social.whatsapp} target="_blank" rel="noreferrer" style={{ width: '100%', justifyContent: 'center' }}>
              واتساب المطعم
            </a>
          ) : (
            <span className="wa-btn is-off" style={{ width: '100%', justifyContent: 'center' }}>
              واتساب — يُضاف برقم المالك قريباً
            </span>
          )}
          <div className="map-ph" aria-label="موقع المطعم — خريطة تجريبية">
            <div className="map-ph__pin">
              <span aria-hidden="true">📍</span>
              <p>{restaurant.address.ar}<br />الخريطة التفاعلية تُفعّل قريباً</p>
              <a href={restaurant.address.mapUrl} target="_blank" rel="noreferrer" className="contact__link">
                فتح في خرائط جوجل ←
              </a>
            </div>
          </div>
          <div className="zellige-line" style={{ margin: '18px 0' }} />
          <p className="contact__fine">
            الحجز الإلكتروني يعمل الآن من قسم الحجز أعلاه.
          </p>
        </div>
      </div>
    </section>
  )
}
