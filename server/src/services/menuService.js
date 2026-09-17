import { query } from '../db/pool.js'

/** Full menu catalog management (manager/admin). */

export async function createCategory({ slug, name_ar, name_en, sort_order = 0 }) {
  const clean = String(slug).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || `cat-${Date.now().toString(36)}`
  const r = await query('INSERT INTO menu_categories (slug, name_ar, name_en, sort_order) VALUES (?,?,?,?)',
    [clean, name_ar, name_en || name_ar, Number(sort_order) || 0])
  const rows = await query('SELECT * FROM menu_categories WHERE id = ?', [r.insertId])
  return rows[0]
}

export async function updateCategory(id, patch) {
  const allowed = ['name_ar', 'name_en', 'sort_order', 'is_active']
  const sets = []
  const params = []
  for (const k of allowed) {
    if (patch[k] === undefined) continue
    sets.push(`${k} = ?`)
    params.push(k === 'sort_order' ? Number(patch[k]) || 0 : k === 'is_active' ? (patch[k] ? 1 : 0) : patch[k])
  }
  if (!sets.length) throw Object.assign(new Error('لا تغييرات'), { status: 422 })
  params.push(id)
  const r = await query(`UPDATE menu_categories SET ${sets.join(', ')} WHERE id = ?`, params)
  if (!r.affectedRows) throw Object.assign(new Error('الصنف غير موجود'), { status: 404 })
  const rows = await query('SELECT * FROM menu_categories WHERE id = ?', [id])
  return rows[0]
}

export async function deleteCategory(id) {
  const [{ n }] = await query('SELECT COUNT(*) n FROM menu_items WHERE category_id = ?', [id])
  if (Number(n) > 0) throw Object.assign(new Error('لا يمكن حذف صنف يحتوي على أطباق — انقلها أولاً'), { status: 422 })
  const r = await query('DELETE FROM menu_categories WHERE id = ?', [id])
  if (!r.affectedRows) throw Object.assign(new Error('الصنف غير موجود'), { status: 404 })
  return { ok: true }
}

const ITEM_FIELDS = ['category_id', 'name_ar', 'name_en', 'description_ar', 'description_en',
  'image_key', 'image_url', 'base_price', 'is_available', 'is_popular', 'badge_ar', 'availability_mode']

export async function createItem(input) {
  const cat = await query('SELECT id FROM menu_categories WHERE id = ?', [input.category_id])
  if (!cat[0]) throw Object.assign(new Error('الصنف غير موجود'), { status: 422 })
  const r = await query(
    `INSERT INTO menu_items (category_id, name_ar, name_en, description_ar, description_en,
      image_key, image_url, base_price, is_available, is_popular, badge_ar, availability_mode)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [input.category_id, input.name_ar, input.name_en || null, input.description_ar || null,
      input.description_en || null, input.image_key || null, input.image_url || null,
      input.base_price, input.is_available ? 1 : 0, input.is_popular ? 1 : 0,
      input.badge_ar || null, input.availability_mode || 'all_day']
  )
  const rows = await query('SELECT * FROM menu_items WHERE id = ?', [r.insertId])
  return rows[0]
}

export async function updateItem(id, patch) {
  const sets = []
  const params = []
  for (const k of ITEM_FIELDS) {
    if (patch[k] === undefined || k === 'category_id') continue
    sets.push(`${k} = ?`)
    params.push(['is_available', 'is_popular'].includes(k) ? (patch[k] ? 1 : 0) : (patch[k] === '' ? null : patch[k]))
  }
  if (patch.category_id !== undefined) {
    const cat = await query('SELECT id FROM menu_categories WHERE id = ?', [patch.category_id])
    if (!cat[0]) throw Object.assign(new Error('الصنف غير موجود'), { status: 422 })
    sets.push('category_id = ?')
    params.push(patch.category_id)
  }
  if (!sets.length) throw Object.assign(new Error('لا تغييرات'), { status: 422 })
  params.push(id)
  const r = await query(`UPDATE menu_items SET ${sets.join(', ')} WHERE id = ?`, params)
  if (!r.affectedRows) throw Object.assign(new Error('الطبق غير موجود'), { status: 404 })
  const rows = await query('SELECT * FROM menu_items WHERE id = ?', [id])
  return rows[0]
}

export async function deleteItem(id) {
  await query("DELETE FROM product_options WHERE scope_type = 'item' AND scope_value = ?", [String(id)])
  const r = await query('DELETE FROM menu_items WHERE id = ?', [id])
  if (!r.affectedRows) throw Object.assign(new Error('الطبق غير موجود'), { status: 404 })
  return { ok: true }
}

export async function createOffer(input) {
  const r = await query(
    'INSERT INTO offers (title_ar, description_ar, image_key, image_url, price, is_active, start_date, end_date) VALUES (?,?,?,?,?,?,?,?)',
    [input.title_ar, input.description_ar || null, input.image_key || null, input.image_url || null,
      input.price ?? null, input.is_active ? 1 : 0, input.start_date || null, input.end_date || null]
  )
  const rows = await query('SELECT * FROM offers WHERE id = ?', [r.insertId])
  return rows[0]
}

export async function updateOfferFull(id, patch) {
  const allowed = ['title_ar', 'description_ar', 'image_key', 'image_url', 'price', 'is_active', 'start_date', 'end_date']
  const sets = []
  const params = []
  for (const k of allowed) {
    if (patch[k] === undefined) continue
    sets.push(`${k} = ?`)
    params.push(k === 'is_active' ? (patch[k] ? 1 : 0) : (patch[k] === '' ? null : patch[k]))
  }
  if (!sets.length) throw Object.assign(new Error('لا تغييرات'), { status: 422 })
  params.push(id)
  const r = await query(`UPDATE offers SET ${sets.join(', ')} WHERE id = ?`, params)
  if (!r.affectedRows) throw Object.assign(new Error('العرض غير موجود'), { status: 404 })
  const rows = await query('SELECT * FROM offers WHERE id = ?', [id])
  return rows[0]
}

export async function deleteOffer(id) {
  const r = await query('DELETE FROM offers WHERE id = ?', [id])
  if (!r.affectedRows) throw Object.assign(new Error('العرض غير موجود'), { status: 404 })
  return { ok: true }
}

export async function listOptionGroups() {
  const rows = await query('SELECT * FROM product_options ORDER BY sort_order')
  return rows.map((g) => {
    let options = []
    try { options = typeof g.options_json === 'string' ? JSON.parse(g.options_json) : g.options_json } catch {}
    return { ...g, options }
  })
}

export async function createOptionGroup(input) {
  const r = await query(
    'INSERT INTO product_options (scope_type, scope_value, group_label_ar, group_label_en, selection, is_required, options_json, sort_order, is_active) VALUES (?,?,?,?,?,?,?,?,?)',
    [input.scope_type, String(input.scope_value || ''), input.group_label_ar, input.group_label_en || null,
      input.selection, input.is_required ? 1 : 0, JSON.stringify(input.options), Number(input.sort_order) || 0,
      input.is_active === false ? 0 : 1]
  )
  const rows = await query('SELECT * FROM product_options WHERE id = ?', [r.insertId])
  return rows[0]
}

export async function updateOptionGroup(id, patch) {
  const allowed = ['group_label_ar', 'group_label_en', 'selection', 'is_required', 'sort_order', 'is_active']
  const sets = []
  const params = []
  for (const k of allowed) {
    if (patch[k] === undefined) continue
    sets.push(`${k} = ?`)
    params.push(k === 'is_required' || k === 'is_active' ? (patch[k] ? 1 : 0) : patch[k])
  }
  if (patch.options !== undefined) {
    sets.push('options_json = ?')
    params.push(JSON.stringify(patch.options))
  }
  if (!sets.length) throw Object.assign(new Error('لا تغييرات'), { status: 422 })
  params.push(id)
  const r = await query(`UPDATE product_options SET ${sets.join(', ')} WHERE id = ?`, params)
  if (!r.affectedRows) throw Object.assign(new Error('المجموعة غير موجودة'), { status: 404 })
  const rows = await query('SELECT * FROM product_options WHERE id = ?', [id])
  return rows[0]
}

export async function deleteOptionGroup(id) {
  const r = await query('DELETE FROM product_options WHERE id = ?', [id])
  if (!r.affectedRows) throw Object.assign(new Error('المجموعة غير موجودة'), { status: 404 })
  return { ok: true }
}
