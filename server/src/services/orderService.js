import { pool } from '../db/pool.js'
import { distanceKm, validCoords, zoneFor } from '../utils/geo.js'
import { transitionOrder, notifyUsers, staffIdsByRoles } from './payments/workflow.js'

export const ORDER_TYPES = ['delivery', 'pickup']

const rowToOptions = (options_json) => {
  if (!options_json) return []
  try {
    return typeof options_json === 'string' ? JSON.parse(options_json) : options_json
  } catch { return [] }
}

async function loadPricelist(conn) {
  const [items] = await conn.query(
    'SELECT i.id, i.name_ar, i.base_price, i.is_available, c.slug AS category FROM menu_items i JOIN menu_categories c ON c.id = i.category_id'
  )
  const [groups] = await conn.query('SELECT * FROM product_options WHERE is_active = 1')
  const [settings] = await conn.query("SELECT `key`, `value` FROM settings WHERE `key` IN ('delivery_fee_mad','free_delivery_over_mad','delivery_fee_per_km','delivery_max_km','restaurant_lat','restaurant_lng')")
  const s = Object.fromEntries(settings.map((r) => [r.key, r.value]))
  return {
    items: new Map(items.map((i) => [Number(i.id), i])),
    groups: groups.map((g) => ({ ...g, options: rowToOptions(g.options_json) })),
    delivery: {
      fixed: Number(s.delivery_fee_mad) || 0,
      freeOver: Number(s.free_delivery_over_mad) || 0,
      perKm: Number(s.delivery_fee_per_km) || 0,
      maxKm: Number(s.delivery_max_km) || 0,
      restLat: Number(s.restaurant_lat) || 0,
      restLng: Number(s.restaurant_lng) || 0,
    },
  }
}

/** Server-side delivery verdict: zone + distance + fee. Never trusts the client. */
export function resolveDelivery({ lat, lng, subtotal, cfg }) {
  const distance = distanceKm(cfg.restLat, cfg.restLng, lat, lng)
  const zone = zoneFor(distance, cfg.maxKm)
  if (zone === 'outside') {
    return { ok: false, zone, distanceKm: round2(distance), fee: 0 }
  }
  const free = cfg.freeOver > 0 && subtotal >= cfg.freeOver
  const fee = free ? 0 : Math.round(cfg.fixed + cfg.perKm * distance)
  return { ok: true, zone, distanceKm: round2(distance), fee, free }
}

const round2 = (n) => Math.round(n * 100) / 100

/** Resolve applicable option groups for a menu item (item scope wins, then category, then all). */
function groupsFor(groups, item) {
  const byId = groups.filter((g) => g.scope_type === 'item' && String(g.scope_value) === String(item.id))
  const byCat = groups.filter((g) => g.scope_type === 'category' && g.scope_value === item.category)
  const all = groups.filter((g) => g.scope_type === 'all')
  return [...byId, ...byCat, ...all].sort((a, b) => a.sort_order - b.sort_order)
}

/**
 * Creates an order. Prices are ALWAYS recomputed server-side from
 * menu_items + product_options — client totals are ignored.
 * Runs in a transaction. Throws {status} errors on validation problems.
 */
export async function createOrder(customerId, input) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const { items, groups, delivery } = await loadPricelist(conn)

    if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 30) {
      throw Object.assign(new Error('السلة فارغة أو غير صالحة'), { status: 422 })
    }

    let subtotal = 0
    const lines = []
    for (const line of input.items) {
      const item = items.get(Number(line.menu_item_id))
      if (!item) throw Object.assign(new Error('صنف غير موجود في المينيو'), { status: 422 })
      if (!item.is_available) throw Object.assign(new Error(`«${item.name_ar}» غير متوفر حالياً`), { status: 422 })
      const qty = Math.floor(Number(line.quantity))
      if (!qty || qty < 1 || qty > 20) throw Object.assign(new Error('الكمية غير صالحة'), { status: 422 })

      const applicable = groupsFor(groups, item)
      const chosen = []
      let delta = 0
      for (const g of applicable) {
        const sel = (line.options || {})[String(g.id)]
        const ids = g.selection === 'multiple' ? (Array.isArray(sel) ? sel : []) : (sel ? [sel] : [])
        if (g.is_required && ids.length === 0) {
          throw Object.assign(new Error(`اختيار «${g.group_label_ar}» إجباري`), { status: 422 })
        }
        for (const oid of ids) {
          const opt = g.options.find((o) => String(o.id) === String(oid))
          if (!opt) throw Object.assign(new Error('خيار غير صالح'), { status: 422 })
          delta += Number(opt.price_delta) || 0
          chosen.push({ group: g.group_label_ar, label_ar: opt.label_ar, price_delta: Number(opt.price_delta) || 0 })
        }
      }
      const unit = Math.max(0, Number(item.base_price) + delta)
      subtotal += unit * qty
      lines.push({
        menu_item_id: item.id, name_ar: item.name_ar, unit_price: unit, quantity: qty,
        options_json: JSON.stringify(chosen), item_note: (line.item_note || '').slice(0, 255) || null,
      })
    }

    const isDelivery = input.order_type === 'delivery'
    // Delivery snapshot: prefer the customer's owned saved address, else validated coords.
    let dLat = null
    let dLng = null
    let dNotes = (input.delivery_notes || '').slice(0, 500) || null
    if (isDelivery && input.address_id) {
      const [savedRows] = await conn.query(
        'SELECT latitude, longitude, formatted_address, delivery_notes FROM customer_addresses WHERE id = ? AND user_id = ?',
        [input.address_id, customerId]
      )
      const saved = savedRows[0]
      if (!saved) throw Object.assign(new Error('عنوان التوصيل غير موجود'), { status: 422 })
      dLat = Number(saved.latitude)
      dLng = Number(saved.longitude)
      if (!dNotes && saved.delivery_notes) dNotes = saved.delivery_notes
    } else if (isDelivery && input.latitude != null && input.longitude != null) {
      if (!validCoords(input.latitude, input.longitude)) {
        throw Object.assign(new Error('إحداثيات غير صالحة'), { status: 422 })
      }
      dLat = Number(input.latitude)
      dLng = Number(input.longitude)
    }
    let fee = 0
    let distanceKm = null
    let zone = null
    if (isDelivery) {
      if (dLat == null) throw Object.assign(new Error('موقع التوصيل مطلوب'), { status: 422 })
      const verdict = resolveDelivery({ lat: dLat, lng: dLng, subtotal, cfg: delivery })
      if (!verdict.ok) {
        throw Object.assign(new Error('عذراً، هذا العنوان خارج نطاق التوصيل حالياً.'), { status: 422 })
      }
      fee = verdict.fee
      distanceKm = verdict.distanceKm
      zone = verdict.zone
    }
    const total = subtotal + fee
    const [minRows] = await conn.query("SELECT `value` FROM settings WHERE `key` = 'min_order_mad'")
    const minOrder = Number(minRows[0]?.value) || 0
    if (minOrder > 0 && subtotal < minOrder) {
      throw Object.assign(new Error(`الحد الأدنى للطلب ${minOrder} درهم`), { status: 422 })
    }
    const order_number = 'SJ-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 90 + 10)
    // Every order starts UNPAID + pending_payment. Only a verified provider
    // webhook (or a cash intent) may advance payment/order status. Never the client.

    const [o] = await conn.query(
      `INSERT INTO orders (order_number, customer_id, order_type, full_name, phone, address_line, city,
        delivery_latitude, delivery_longitude, delivery_notes, delivery_distance_km, delivery_zone,
        special_instructions, subtotal, delivery_fee, total, payment_method, payment_status, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [order_number, customerId, input.order_type, input.full_name, input.phone,
        isDelivery ? (input.address_line || null) : null, input.city || 'مكناس',
        dLat, dLng, dNotes, distanceKm, zone,
        (input.special_instructions || '').slice(0, 500) || null,
        subtotal.toFixed(2), fee.toFixed(2), total.toFixed(2), input.payment_method, 'unpaid', 'pending_payment']
    )
    for (const l of lines) {
      await conn.query(
        'INSERT INTO order_items (order_id, menu_item_id, name_ar, unit_price, quantity, options_json, item_note) VALUES (?,?,?,?,?,?,?)',
        [o.insertId, l.menu_item_id, l.name_ar, l.unit_price.toFixed(2), l.quantity, l.options_json, l.item_note]
      )
    }
    await conn.commit()
    return getOrderById(o.insertId, customerId)
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

const ORDER_HEAD = `o.id, o.order_number, o.order_type, o.full_name, o.phone, o.address_line, o.city,
  o.delivery_latitude, o.delivery_longitude, o.delivery_notes, o.delivery_distance_km,
  o.delivery_zone, o.delivery_status, o.reject_reason, o.estimated_at,
  o.special_instructions, o.subtotal, o.delivery_fee, o.total, o.payment_method,
  o.payment_status, o.status, o.created_at, o.updated_at`

export async function getOrderById(id, customerId = null) {
  let sql = `SELECT ${ORDER_HEAD} FROM orders o WHERE o.id = ?`
  const params = [id]
  if (customerId !== null) { sql += ' AND o.customer_id = ?'; params.push(customerId) }
  const [rows] = await pool.query(sql, params)
  if (!rows[0]) return null
  const [items] = await pool.query(
    'SELECT menu_item_id, name_ar, unit_price, quantity, options_json, item_note FROM order_items WHERE order_id = ? ORDER BY id',
    [id]
  )
  return { ...rows[0], items: items.map((i) => ({ ...i, options: rowToOptions(i.options_json) })) }
}

export async function listMyOrders(customerId) {
  const [rows] = await pool.query(
    `SELECT ${ORDER_HEAD} FROM orders o WHERE o.customer_id = ? ORDER BY o.created_at DESC LIMIT 50`,
    [customerId]
  )
  return rows
}

export async function listOrders({ status, type, payment, limit = 100 } = {}) {
  const where = []
  const params = []
  if (status) { where.push('o.status = ?'); params.push(status) }
  if (type) { where.push('o.order_type = ?'); params.push(type) }
  if (payment) { where.push('o.payment_status = ?'); params.push(payment) }
  const sql = `SELECT ${ORDER_HEAD}, u.full_name AS customer_name,
    (SELECT p.id FROM payments p WHERE p.order_id = o.id AND p.status = 'paid' ORDER BY p.id DESC LIMIT 1) AS payment_id
    FROM orders o
    JOIN users u ON u.id = o.customer_id${where.length ? ' WHERE ' + where.join(' AND ') : ''}
    ORDER BY o.created_at DESC LIMIT ${Math.min(Number(limit) || 100, 300)}`
  const [rows] = await pool.query(sql, params)
  return rows
}

/** Staff-driven status change through the validated workflow engine. */
export async function moveOrderStatus({ id, to, actorId, actorRole, reason }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const moved = await transitionOrder(conn, { orderId: id, to, actorId, actorRole, reason })
    if (['rejected', 'cancelled'].includes(to) && reason) {
      await conn.query('UPDATE orders SET reject_reason = ? WHERE id = ?', [reason.slice(0, 255), id])
    }
    // notify the customer on meaningful transitions
    if (['accepted', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'rejected'].includes(to)) {
      await notifyUsers(conn, [moved.customer_id], {
        type: 'status', orderId: id, title: 'تحديث طلبك', message: `طلبك الآن: ${to}`,
      })
    }
    await conn.commit()
    return getOrderById(id)
  } catch (e) {
    try { await conn.rollback() } catch {}
    throw e
  } finally {
    conn.release()
  }
}

/** Customer cancels their own order (only before payment/acceptance). */
export async function cancelOwnOrder(customerId, id) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [rows] = await conn.query('SELECT * FROM orders WHERE id = ? AND customer_id = ? FOR UPDATE', [id, customerId])
    const o = rows[0]
    if (!o) throw Object.assign(new Error('الطلب غير موجود'), { status: 404 })
    if (!['pending_payment', 'received'].includes(o.status)) {
      throw Object.assign(new Error('لا يمكن إلغاء الطلب في هذه المرحلة — اتصل بالمطعم'), { status: 422 })
    }
    const [pays] = await conn.query("SELECT id FROM payments WHERE order_id = ? AND status = 'paid' LIMIT 1", [id])
    if (pays[0]) throw Object.assign(new Error('طلب مدفوع — الاسترجاع عبر الإدارة'), { status: 422 })
    await conn.query("UPDATE payments SET status = 'cancelled' WHERE order_id = ? AND status IN ('pending','unpaid')", [id])
    await transitionOrder(conn, { orderId: id, to: 'cancelled', actorId: customerId, actorRole: 'customer', reason: 'customer cancel' })
    await conn.commit()
    return getOrderById(id)
  } catch (e) {
    try { await conn.rollback() } catch {}
    throw e
  } finally {
    conn.release()
  }
}

export async function listOptions() {
  const [groups] = await pool.query('SELECT * FROM product_options WHERE is_active = 1 ORDER BY sort_order')
  return groups.map((g) => ({ ...g, options: rowToOptions(g.options_json) }))
}

export async function getFees() {
  const [settings] = await pool.query("SELECT `key`, `value` FROM settings WHERE `key` IN ('delivery_fee_mad','free_delivery_over_mad','delivery_fee_per_km','delivery_max_km','restaurant_lat','restaurant_lng','cash_on_delivery','card_enabled')")
  const get = (k) => (settings.find((r) => r.key === k) || {}).value
  const num = (k) => Number(get(k)) || 0
  return {
    delivery_fee_mad: num('delivery_fee_mad'),
    free_delivery_over_mad: num('free_delivery_over_mad'),
    delivery_fee_per_km: num('delivery_fee_per_km'),
    delivery_max_km: num('delivery_max_km'),
    restaurant_lat: num('restaurant_lat'),
    restaurant_lng: num('restaurant_lng'),
    cash_on_delivery: get('cash_on_delivery') !== '0',
    card_enabled: get('card_enabled') !== '0',
  }
}

export const DELIVERY_STATUSES = ['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'failed', 'cancelled']

export async function setDeliveryStatus(id, status) {
  if (!DELIVERY_STATUSES.includes(status)) {
    throw Object.assign(new Error('حالة توصيل غير صالحة'), { status: 422 })
  }
  const [r] = await pool.query('UPDATE orders SET delivery_status = ? WHERE id = ?', [status, id])
  if (r.affectedRows === 0) throw Object.assign(new Error('الطلب غير موجود'), { status: 404 })
  return getOrderById(id)
}
