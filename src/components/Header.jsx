import { useEffect, useState } from 'react'
import { restaurant } from '../config/restaurant.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useCart } from '../cart/CartContext.jsx'
import Logo from './Logo.jsx'

export default function Header({ view = 'home', onNav = () => {} }) {
  const { user, logout } = useAuth()
  const { count, setOpen: setCartOpen } = useCart()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const go = (v) => { onNav(v); setOpen(false) }

  return (
    <header className={`header ${scrolled ? 'header--scrolled' : ''}`}>
      <div className="container header__inner">
        <button onClick={() => go('home')} className="header__brand" aria-label="مدفونة سجلماسة — الرئيسية" style={{ background: 'none', border: 0, cursor: 'pointer', font: 'inherit' }}>
          <Logo compact={scrolled} />
        </button>

        <nav className={`header__nav ${open ? 'is-open' : ''}`} aria-label="التنقل الرئيسي">
          {view === 'home' ? (
            restaurant.navigation.map((l) => (
              <a key={l.id} href={`#${l.id}`} onClick={() => setOpen(false)}>
                {l.label}
              </a>
            ))
          ) : (
            <a href="#home" onClick={(e) => { e.preventDefault(); go('home') }}>→ عودة للرئيسية</a>
          )}
          {user ? (
            <>
              <button className="header__link" onClick={() => go('account')}>
                حسابي: {user.full_name.split(' ')[0]}
              </button>
              <button className="btn btn-outline header__cta" style={{ color: 'inherit' }} onClick={() => { logout(); go('home') }}>
                خروج
              </button>
            </>
          ) : (
            <button className="btn btn-primary header__cta" onClick={() => go('auth')}>
              دخول / حساب جديد
            </button>
          )}
          {view === 'home' && (
            <a href="#reserve" className="btn btn-primary header__cta" onClick={() => setOpen(false)}>
              {restaurant.ctas.reserve}
            </a>
          )}
          <button className="header__cart" onClick={() => { setCartOpen(true); setOpen(false) }} aria-label={`سلة الطلب (${count})`}>
            <span aria-hidden="true">🧺</span>
            {count > 0 && <b>{count}</b>}
          </button>
        </nav>

        <button
          className="header__burger"
          aria-expanded={open}
          aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  )
}
