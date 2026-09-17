import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { staffApi } from '../../api/client.js'
import { ROLE_AR } from './common.jsx'
import StaffLogin from './StaffLogin.jsx'
import Overview from './Overview.jsx'
import Reservations from './Reservations.jsx'
import Orders from './Orders.jsx'
import Schedule from './Schedule.jsx'
import Tables from './Tables.jsx'
import Catalog from './Catalog.jsx'
import Team from './Team.jsx'
import Settings from './Settings.jsx'
import Kitchen from './Kitchen.jsx'
import Driver from './Driver.jsx'
import Bell from './Bell.jsx'

const TITLES = {
  receptionist: 'مكتب الاستقبال',
  kitchen_staff: 'المطبخ',
  delivery_driver: 'التوصيل',
  manager: 'الإدارة',
  admin: 'الإدارة العامة',
}

export default function StaffDashboard() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState('overview')
  const [bookings, setBookings] = useState(null)

  useEffect(() => {
    if (user && user.role !== 'customer') {
      staffApi.overview().then((d) => setBookings(d.bookingsToday)).catch(() => {})
    }
  }, [user])

  if (!user || user.role === 'customer') {
    return <StaffLogin onDone={() => {}} />
  }

  const isManager = user.role === 'admin' || user.role === 'manager'
  const isAdmin = user.role === 'admin'
  const isKitchen = user.role === 'kitchen_staff'
  const isDriver = user.role === 'delivery_driver'
  const isReception = user.role === 'receptionist'

  const tabs = []
  if (isKitchen) {
    tabs.push({ id: 'kitchen', ar: 'طلبات المطبخ' })
  } else if (isDriver) {
    tabs.push({ id: 'driver', ar: 'مهام التوصيل' })
  } else {
    tabs.push(
      { id: 'overview', ar: 'نظرة عامة' },
      { id: 'reservations', ar: 'الحجوزات' },
      { id: 'orders', ar: 'الطلبات' },
      { id: 'schedule', ar: 'جدول اليوم' },
      { id: 'tables', ar: 'الطاولات' },
    )
    if (isManager) {
      tabs.push({ id: 'menu', ar: 'المينيو والعروض' }, { id: 'settings', ar: 'الإعدادات' })
    }
    if (isAdmin) tabs.push({ id: 'team', ar: 'الطاقم' })
  }
  const activeTab = tabs.some((t) => t.id === tab) ? tab : tabs[0].id

  return (
    <section className="section dash">
      <div className="container">
        <div className="dash__head">
          <div>
            <span className="kicker">لوحة الموظفين</span>
            <h2 className="h2" style={{ marginTop: 8 }}>{TITLES[user.role] || 'الطاقم'}</h2>
            <p className="dash__muted">{user.full_name} · {ROLE_AR[user.role] || user.role}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Bell />
            <button className="btn btn-outline" style={{ padding: '10px 22px', fontSize: 14 }} onClick={logout}>
              خروج
            </button>
          </div>
        </div>

        <div className="dash__tabs" role="tablist" aria-label="أقسام اللوحة">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={activeTab === t.id}
              className={activeTab === t.id ? 'is-on' : ''} onClick={() => setTab(t.id)}>
              {t.ar}
            </button>
          ))}
        </div>

        <div className="dash__panel">
          {activeTab === 'overview' && !isKitchen && !isDriver && <Overview go={setTab} />}
          {activeTab === 'reservations' && (isReception || isManager) && <Reservations />}
          {activeTab === 'orders' && (isReception || isManager) && <Orders />}
          {activeTab === 'schedule' && (isReception || isManager) && <Schedule />}
          {activeTab === 'tables' && (isReception || isManager) && <Tables canManage={isManager} bookingsToday={bookings} />}
          {activeTab === 'menu' && isManager && <Catalog />}
          {activeTab === 'settings' && isManager && <Settings />}
          {activeTab === 'team' && isAdmin && <Team />}
          {activeTab === 'kitchen' && (isKitchen || isManager) && <Kitchen />}
          {activeTab === 'driver' && (isDriver || isManager) && <Driver />}
        </div>
      </div>
    </section>
  )
}
