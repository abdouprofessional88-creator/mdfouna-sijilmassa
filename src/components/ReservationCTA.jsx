import { restaurant } from '../config/restaurant.js'

export default function ReservationCTA({ onReserve }) {
  return (
    <section id="reserve" className="section reserve">
      <div className="container reveal reserve__box">
        <div className="reserve__pattern" aria-hidden="true" />
        <div className="reserve__content">
          <span className="kicker kicker--light">الحجز</span>
          <h2 className="display" style={{ color: 'var(--cream-100)', marginTop: 10 }}>
            طاولتك محفوظة،
            <br />
            وضيافتنا جاهزة
          </h2>
          <p className="lead lead--light" style={{ margin: '14px auto 0' }}>
            اطلب حجزك إلكترونياً (التاريخ، الوقت، المناسبة وملاحظاتك) وسيصلك تأكيدنا عبر الهاتف —
            أو اتصل بنا مباشرة.
          </p>
          <div className="reserve__actions">
            <button className="btn btn-primary" onClick={onReserve}>
              طلب حجز إلكتروني ←
            </button>
            {restaurant.phones.slice(0, 1).map((p) => (
              <a key={p.label} className="btn btn-ghost" href={p.href}>
                <span aria-hidden="true">☎</span> {p.label}
              </a>
            ))}
          </div>
          <p className="reserve__fine">
            طلبك يصل للاستقبال فوراً (قيد المراجعة) ويُحفظ في قاعدة البيانات.
          </p>
        </div>
      </div>
    </section>
  )
}
