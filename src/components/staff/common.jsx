export const STATUS_AR = {
  pending: 'قيد المراجعة',
  confirmed: 'مؤكدة',
  seated: 'جالس الآن',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
  no_show: 'لم يحضر',
}

export const STATUS_LIST = Object.keys(STATUS_AR)

export const TABLE_AREAS = { salle: 'القاعة', terrasse: 'التراس', salon: 'الصالون', prive: 'خاص' }
export const TABLE_STATUSES = { available: 'متاحة', occupied: 'مشغولة', reserved: 'محجوزة', maintenance: 'صيانة' }

export const ROLE_AR = {
  admin: 'مدير عام', manager: 'مدير قاعة',
  receptionist: 'استقبال', kitchen_staff: 'مطبخ', delivery_driver: 'موصل',
}

export function StatusBadge({ status }) {
  return <span className={`st st-${status}`}>{STATUS_AR[status] || status}</span>
}

export function Empty({ text }) {
  return <p className="dash__muted">{text}</p>
}
