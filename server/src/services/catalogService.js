import { query } from '../db/pool.js'

export async function listCategories() {
  return query('SELECT id, slug, name_ar, name_en, sort_order FROM menu_categories WHERE is_active = 1 ORDER BY sort_order')
}

export async function listItems() {
  return query(
    `SELECT i.id, i.name_ar, i.name_en, i.description_ar, i.description_en,
            i.image_key, i.image_url, i.base_price, i.is_available, i.availability_mode,
            i.is_popular, i.badge_ar, c.slug AS category
     FROM menu_items i
     JOIN menu_categories c ON c.id = i.category_id
     WHERE c.is_active = 1
     ORDER BY c.sort_order, i.id`
  )
}

export async function listOffers() {
  return query('SELECT id, title_ar, description_ar, image_key, image_url, price FROM offers WHERE is_active = 1 ORDER BY id')
}

export async function listTables() {
  return query('SELECT id, table_number, capacity, area, status, description FROM restaurant_tables ORDER BY id')
}
