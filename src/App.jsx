import { useEffect, useState } from 'react'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import Intro from './components/Intro.jsx'
import SignatureDishes from './components/SignatureDishes.jsx'
import MenuSection from './components/menu/MenuSection.jsx'
import ReservationCTA from './components/ReservationCTA.jsx'
import Offers from './components/Offers.jsx'
import Contact from './components/Contact.jsx'
import Footer from './components/Footer.jsx'
import AuthView from './components/auth/AuthView.jsx'
import AccountView from './components/account/AccountView.jsx'
import StaffDashboard from './components/staff/StaffDashboard.jsx'
import { CartDrawer, CartToaster, StickyCart } from './components/order/CartDrawer.jsx'
import DemoBanner from './components/DemoBanner.jsx'
import { CheckoutView, OrderSuccessView } from './components/order/Checkout.jsx'
import { ReserveView, ReserveSuccessView } from './components/reserve/ReserveView.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import { CartProvider } from './cart/CartContext.jsx'
import { useReveal } from './hooks/useReveal.js'

function Shell() {
  const [view, setView] = useState('home')
  const [lastOrder, setLastOrder] = useState(null)
  const [lastReservation, setLastReservation] = useState(null)
  useReveal([view])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view])

  const goHomeSection = (section) => {
    setView('home')
    requestAnimationFrame(() => {
      setTimeout(() => document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' }), 60)
    })
  }

  return (
    <>
      <DemoBanner />
      <Header view={view} onNav={setView} />
      <main key={view} className="view-fade">
        {view === 'home' && (
          <>
            <Hero />
            <div className="zellige-line" aria-hidden="true" />
            <Intro />
            <SignatureDishes />
            <MenuSection />
            <ReservationCTA onReserve={() => setView('reserve')} />
            <Offers />
            <Contact />
          </>
        )}
        {view === 'auth' && <AuthView onDone={() => setView('account')} />}
        {view === 'account' && <AccountView onLogin={() => setView('auth')} />}
        {view === 'staff' && <StaffDashboard />}
        {view === 'checkout' && (
          <CheckoutView onDone={(order) => { setLastOrder(order); setView('order-success') }} onLogin={() => setView('auth')} />
        )}
        {view === 'order-success' && (
          <OrderSuccessView order={lastOrder} onTrack={() => setView('account')} onHome={() => setView('home')} />
        )}
        {view === 'reserve' && (
          <ReserveView onDone={(r) => { setLastReservation(r); setView('reserve-success') }} onLogin={() => setView('auth')} />
        )}
        {view === 'reserve-success' && (
          <ReserveSuccessView reservation={lastReservation} onTrack={() => setView('account')} onHome={() => setView('home')} />
        )}
      </main>
      <Footer onStaff={() => setView('staff')} />
      <CartToaster />
      <StickyCart visible={view === 'home'} />
      <CartDrawer onCheckout={() => setView('checkout')} onBrowse={() => goHomeSection('menu')} />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Shell />
      </CartProvider>
    </AuthProvider>
  )
}
