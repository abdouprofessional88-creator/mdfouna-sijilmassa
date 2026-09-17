const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(status, data) {
    super(data?.error || 'خطأ في الاتصال')
    this.status = status
    this.details = data?.details
  }
}

/** fetch wrapper — cookies included for session persistence. */
export async function apiFetch(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data)
  return data
}

export const api = {
  me: () => apiFetch('/api/auth/me'),
  register: (payload) => apiFetch('/api/auth/register', { method: 'POST', body: payload }),
  login: (payload) => apiFetch('/api/auth/login', { method: 'POST', body: payload }),
  logout: () => apiFetch('/api/auth/logout', { method: 'POST' }),
  updateProfile: (payload) => apiFetch('/api/auth/me', { method: 'PATCH', body: payload }),
  menu: () => apiFetch('/api/menu'),
  menuOptions: () => apiFetch('/api/menu/options'),
  offers: () => apiFetch('/api/offers'),
  createOrder: (payload) => apiFetch('/api/orders', { method: 'POST', body: payload }),
  myOrders: () => apiFetch('/api/orders/mine'),
  orderDetail: (id) => apiFetch(`/api/orders/${id}`),
  myReservations: () => apiFetch('/api/reservations/mine'),
  createReservation: (payload) => apiFetch('/api/reservations', { method: 'POST', body: payload }),
  cancelReservation: (id) => apiFetch(`/api/reservations/mine/${id}/cancel`, { method: 'PATCH' }),
  tables: () => apiFetch('/api/tables'),
  availableTables: (params) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch(`/api/tables/available?${qs}`)
  },
  reverseGeocode: (lat, lng) => apiFetch(`/api/geo/reverse?lat=${lat}&lon=${lng}`),
  searchPlaces: (q) => apiFetch(`/api/geo/search?q=${encodeURIComponent(q)}`),
  deliveryQuote: (payload) => apiFetch('/api/delivery/quote', { method: 'POST', body: payload }),
  addresses: () => apiFetch('/api/addresses'),
  saveAddress: (payload) => apiFetch('/api/addresses', { method: 'POST', body: payload }),
  updateAddress: (id, payload) => apiFetch(`/api/addresses/${id}`, { method: 'PATCH', body: payload }),
  deleteAddress: (id) => apiFetch(`/api/addresses/${id}`, { method: 'DELETE' }),
  notifications: () => apiFetch('/api/notifications'),
  readNotification: (id) => apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  readAllNotifications: () => apiFetch('/api/notifications/read-all', { method: 'PATCH' }),
  createPayment: (payload) => apiFetch('/api/payments/create', { method: 'POST', body: payload }),
  mockConfirmPayment: (payload) => apiFetch('/api/payments/mock/confirm', { method: 'POST', body: payload }),
  paymentDetail: (id) => apiFetch(`/api/payments/${id}`),
  cancelOrder: (id) => apiFetch(`/api/orders/${id}/cancel`, { method: 'POST' }),
  driverAvailable: () => apiFetch('/api/delivery/available'),
  driverMine: (active = true) => apiFetch(`/api/delivery/my-orders?active=${active ? '1' : '0'}`),
  driverDetail: (id) => apiFetch(`/api/delivery/${id}`),
  driverClaim: (id) => apiFetch(`/api/delivery/${id}/claim`, { method: 'POST' }),
  driverStart: (id) => apiFetch(`/api/delivery/${id}/start`, { method: 'POST' }),
  driverComplete: (id) => apiFetch(`/api/delivery/${id}/complete`, { method: 'POST' }),
  driverFail: (id, reason) => apiFetch(`/api/delivery/${id}/fail`, { method: 'POST', body: { reason } }),
}

export const staffApi = {
  overview: () => apiFetch('/api/staff/overview'),
  reservations: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
    return apiFetch(`/api/staff/reservations${qs ? `?${qs}` : ''}`)
  },
  reservation: (id) => apiFetch(`/api/staff/reservations/${id}`),
  setStatus: (id, status) => apiFetch(`/api/staff/reservations/${id}/status`, { method: 'PATCH', body: { status } }),
  tables: () => apiFetch('/api/tables'),
  createTable: (payload) => apiFetch('/api/staff/tables', { method: 'POST', body: payload }),
  updateTable: (id, payload) => apiFetch(`/api/staff/tables/${id}`, { method: 'PATCH', body: payload }),
  staffMenu: () => apiFetch('/api/staff/menu'),
  updateMenuItem: (id, payload) => apiFetch(`/api/staff/menu-items/${id}`, { method: 'PATCH', body: payload }),
  updateMenuItemFull: (id, payload) => apiFetch(`/api/staff/menu-items/${id}/full`, { method: 'PATCH', body: payload }),
  createMenuItem: (payload) => apiFetch('/api/staff/menu-items', { method: 'POST', body: payload }),
  deleteMenuItem: (id) => apiFetch(`/api/staff/menu-items/${id}`, { method: 'DELETE' }),
  createCategory: (payload) => apiFetch('/api/staff/categories', { method: 'POST', body: payload }),
  updateCategory: (id, payload) => apiFetch(`/api/staff/categories/${id}`, { method: 'PATCH', body: payload }),
  deleteCategory: (id) => apiFetch(`/api/staff/categories/${id}`, { method: 'DELETE' }),
  createOffer: (payload) => apiFetch('/api/staff/offers', { method: 'POST', body: payload }),
  updateOfferFull: (id, payload) => apiFetch(`/api/staff/offers/${id}/full`, { method: 'PATCH', body: payload }),
  deleteOffer: (id) => apiFetch(`/api/staff/offers/${id}`, { method: 'DELETE' }),
  optionGroups: () => apiFetch('/api/staff/option-groups'),
  createOptionGroup: (payload) => apiFetch('/api/staff/option-groups', { method: 'POST', body: payload }),
  updateOptionGroup: (id, payload) => apiFetch(`/api/staff/option-groups/${id}`, { method: 'PATCH', body: payload }),
  deleteOptionGroup: (id) => apiFetch(`/api/staff/option-groups/${id}`, { method: 'DELETE' }),
  updateOffer: (id, payload) => apiFetch(`/api/staff/offers/${id}`, { method: 'PATCH', body: payload }),
  team: () => apiFetch('/api/staff/users'),
  createStaff: (payload) => apiFetch('/api/staff/users', { method: 'POST', body: payload }),
  setRole: (id, role) => apiFetch(`/api/staff/users/${id}/role`, { method: 'PATCH', body: { role } }),
  orders: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
    return apiFetch(`/api/staff/orders${qs ? `?${qs}` : ''}`)
  },
  orderDetail: (id) => apiFetch(`/api/staff/orders/${id}`),
  setOrderStatus: (id, status, reason = '') => apiFetch(`/api/staff/orders/${id}/status`, { method: 'PATCH', body: { status, reason } }),
  assignDriver: (id, driver_id) => apiFetch(`/api/staff/orders/${id}/assign-driver`, { method: 'POST', body: { driver_id } }),
  setDeliveryStatus: (id, delivery_status) => apiFetch(`/api/staff/orders/${id}/delivery`, { method: 'PATCH', body: { delivery_status } }),
  refundPayment: (id) => apiFetch(`/api/staff/payments/${id}/refund`, { method: 'POST' }),
  setActive: (id, is_active) => apiFetch(`/api/staff/users/${id}/active`, { method: 'PATCH', body: { is_active } }),
  resetPassword: (id, new_password) => apiFetch(`/api/staff/users/${id}/reset-password`, { method: 'POST', body: { new_password } }),
  settings: () => apiFetch('/api/staff/settings'),
  updateSettings: (payload) => apiFetch('/api/staff/settings', { method: 'PATCH', body: payload }),
}
