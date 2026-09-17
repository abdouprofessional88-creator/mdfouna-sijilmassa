import { restaurant } from '../config/restaurant.js'
import Logo from './Logo.jsx'

export default function Footer({ onStaff = null }) {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div>
          <Logo />
          <p className="footer__desc">{restaurant.descriptionAr}</p>
          <p className="latin footer__latin">Patrimoine &amp; Goût — Meknès</p>
        </div>
        <nav aria-label="روابط سريعة">
          <strong>أقسام الموقع</strong>
          <ul>
            {restaurant.navigation.map((l) => (
              <li key={l.id}>
                <a href={`#${l.id}`}>{l.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <strong>تواصل</strong>
          <ul>
            {restaurant.phones.map((p) => (
              <li key={p.label}>
                <a href={p.href} dir="ltr">
                  {p.label}
                </a>
              </li>
            ))}
            <li>
              <a href={restaurant.social.instagram} target="_blank" rel="noreferrer">
                إنستغرام الرسمي
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="container footer__bottom">
        <span>© 2026 {restaurant.nameAr} — جميع الحقوق محفوظة</span>
        {onStaff && (
          <button onClick={onStaff} className="footer__staff">
            بوابة الموظفين (Staff)
          </button>
        )}
      </div>
    </footer>
  )
}
