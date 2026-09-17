import bcrypt from 'bcryptjs'
import { query } from './pool.js'

/**
 * Demo seed — tables, menu categories/items (subset of the frontend demo
 * menu), offers, one demo customer + two reservations (upcoming & past).
 * Prices are DEMO. Idempotent-ish: skips when tables already have rows.
 *
 * Demo login: demo@sijilmassa.ma / Demo1234  (change/remove in production)
 */
async function main() {
  const [{ n: tCount }] = await query('SELECT COUNT(*) n FROM restaurant_tables')
  if (Number(tCount) === 0) {
    const tables = [
      ['T1', 2, 'salle', 'طاولة لشخصين قرب الجدارية'],
      ['T2', 2, 'salle', 'طاولة لشخصين'],
      ['T3', 4, 'salle', 'طاولة عائلية'],
      ['T4', 4, 'terrasse', 'طاولة التراس'],
      ['T5', 6, 'salle', 'طاولة كبيرة للمجموعات'],
      ['T6', 6, 'salon', 'صالون خاص'],
      ['T7', 8, 'salle', 'مائدة المناسبات'],
      ['T8', 4, 'terrasse', 'طاولة التراس'],
    ]
    for (const [num, cap, area, desc] of tables) {
      await query('INSERT INTO restaurant_tables (table_number, capacity, area, description) VALUES (?,?,?,?)', [num, cap, area, desc])
    }
    console.log('seeded 8 tables')
  }

  const [{ n: cCount }] = await query('SELECT COUNT(*) n FROM menu_categories')
  if (Number(cCount) === 0) {
    const cats = [
      ['madfouna', 'المدفونة', 'Madfouna', 1], ['tanjia', 'الطنجية', 'Tanjia', 2],
      ['chicken', 'الدجاج', 'Poulet', 3], ['rfissa', 'الرفيسة', 'Rfissa', 4],
      ['marocaine', 'الأطباق المغربية', 'Marocain', 5], ['starters', 'المقبلات', 'Entrees', 6],
      ['salads', 'السلطات', 'Salades', 7], ['drinks', 'المشروبات', 'Boissons', 8],
      ['desserts', 'الحلويات', 'Desserts', 9], ['offers', 'العروض', 'Offres', 10],
    ]
    for (const [slug, ar, en, ord] of cats) {
      await query('INSERT INTO menu_categories (slug, name_ar, name_en, sort_order) VALUES (?,?,?,?)', [slug, ar, en, ord])
    }
    console.log('seeded 10 categories')

    const catId = Object.fromEntries(
      (await query('SELECT id, slug FROM menu_categories')).map((r) => [r.slug, r.id])
    )
    const items = [
      // [cat, ar, en, descAr, image_key, price, popular, badge, available]
      ['madfouna', 'مدفونة كبيرة', 'Grande Madfouna', 'خبزة محشوة باللحم والتوابل، تكفي 4 إلى 6 أشخاص.', 'madfouna', 140, 1, 'طبق التوقيع', 1],
      ['madfouna', 'ميني مدفونة', 'Mini Madfouna', 'حجم فردي لاكتشاف النكهة.', 'madfouna', 30, 0, 'جديد', 1],
      ['tanjia', 'طنجية اللحم', 'Tanjia de Boeuf', 'لحم يُطهى 8 ساعات في جرة الرماد.', 'tanjia', 120, 1, 'طهي بطيء', 1],
      ['chicken', 'الدجاج المحمر', 'Poulet Roti', 'دجاج بلدي متبّل ومحمّر مع الحمص والمرق.', 'poulet', 75, 1, 'الأكثر طلباً', 1],
      ['chicken', 'الدجاج المدغمر', "Poulet M'Dammar", 'وصفة مكناسية بمرق مركّز والزيتون.', 'madghamar', 80, 0, 'وصفة مكناسية', 1],
      ['rfissa', 'الرفيسة بالتريد', 'Rfissa au Trid', 'تريد مسقي بمرق الدجاج مع الحلبة والعدس.', 'rfissa', 65, 1, 'تقليدي', 1],
      ['marocaine', 'كسكس الجمعة', 'Couscous du Vendredi', 'كسكس بالخضرة السبع ولحم مختار.', 'couscous', 60, 1, 'يوم الجمعة', 1],
      ['marocaine', 'بسطيلة الدجاج', 'Pastilla au Poulet', 'ورقة مقرمشة بالدجاج واللوز والقرفة.', 'pastilla', 70, 0, null, 1],
      ['starters', 'الحريرة المغربية', 'Harira', 'شوربة الطماطم والحمص والعدس.', 'tanjia', 20, 1, null, 1],
      ['salads', 'شلاضة مغربية', 'Salade Marocaine', 'طماطم، خيار، زيتون وزيت زيتون بلدية.', 'couscous', 25, 0, null, 1],
      ['drinks', 'أتاي بالنعناع', 'The a la Menthe', 'شاي أخضر بالنعناع على الأصول.', 'tea', 15, 1, 'على الأصول', 1],
      ['desserts', 'كعب غزال', 'Kaab el Ghazal', 'هلال اللوز بماء زهر البرتقال — 6 قطع.', 'pastilla', 40, 1, 'صناعة تقليدية', 1],
    ]
    for (const [cat, ar, en, desc, key, price, pop, badge, avail] of items) {
      await query(
        'INSERT INTO menu_items (category_id, name_ar, name_en, description_ar, image_key, base_price, is_popular, badge_ar, is_available) VALUES (?,?,?,?,?,?,?,?,?)',
        [catId[cat], ar, en, desc, key, price, pop, badge, avail]
      )
    }
    console.log('seeded 12 menu items')
  }

  const [{ n: oCount }] = await query('SELECT COUNT(*) n FROM offers')
  if (Number(oCount) === 0) {
    await query("INSERT INTO offers (title_ar, description_ar, image_key, price) VALUES ('العرض العائلي','مدفونة كبيرة + شلاضة + إبريق أتاي — تكفي 4 أشخاص. (عرض تجريبي)','madfouna',180)")
    await query("INSERT INTO offers (title_ar, description_ar, image_key, price) VALUES ('فورمولا الجمعة','كسكس الجمعة + حريرة + تمر وحليب. (عرض تجريبي)','couscous',70)")
    console.log('seeded 2 offers')
  }

  const [existing] = await query('SELECT id FROM users WHERE email = ?', ['demo@sijilmassa.ma'])
  let demoId = existing?.id
  if (!demoId) {
    const hash = await bcrypt.hash('Demo1234', 12)
    const r = await query('INSERT INTO users (full_name, email, phone, password_hash) VALUES (?,?,?,?)',
      ['زبون تجريبي', 'demo@sijilmassa.ma', '0600000000', hash])
    demoId = r.insertId
    console.log('seeded demo user demo@sijilmassa.ma / Demo1234')
  }
  const [{ n: rCount }] = await query('SELECT COUNT(*) n FROM reservations WHERE customer_id = ?', [demoId])
  if (Number(rCount) === 0) {
    await query(
      "INSERT INTO reservations (customer_id, table_id, reservation_date, start_time, end_time, guest_count, occasion, status) VALUES (?,?, '2026-10-02','19:30','21:30',4,'عشاء عائلي','confirmed')",
      [demoId, 5]
    )
    await query(
      "INSERT INTO reservations (customer_id, table_id, reservation_date, start_time, end_time, guest_count, status) VALUES (?,?,'2026-08-10','13:00','14:30',2,'completed')",
      [demoId, 1]
    )
    console.log('seeded 2 demo reservations (1 upcoming, 1 past)')
  }

  // Demo accounts — development only. Disabled when SEED_DEMO=0.
  // Remove before production: npm run purge-demo
  if (process.env.SEED_DEMO !== '0') {
    const team = [
      ['المدير العام', 'admin@sijilmassa.ma', '0600000001', 'Admin1234!', 'admin'],
      ['مدير القاعة', 'manager@sijilmassa.ma', '0600000002', 'Manager1234!', 'manager'],
      ['موظف الاستقبال', 'reception@sijilmassa.ma', '0600000013', 'Reception1234!', 'receptionist'],
      ['موظف المطبخ', 'kitchen@sijilmassa.ma', '0600000014', 'Kitchen1234!', 'kitchen_staff'],
      ['موصل', 'driver@sijilmassa.ma', '0600000015', 'Driver1234!', 'delivery_driver'],
      ['زبون تجريبي', 'customer@sijilmassa.ma', '0600000016', 'Customer1234!', 'customer'],
    ]
    for (const [name, email, phone, pass, role] of team) {
      const hash = await bcrypt.hash(pass, 12)
      const [ex] = await query('SELECT id FROM users WHERE email = ?', [email])
      if (!ex) {
        await query('INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?,?,?,?,?)',
          [name, email, phone, hash, role])
        console.log(`seeded ${role} account ${email}`)
      } else {
        // keep dev credentials in sync with the documented demo logins
        await query('UPDATE users SET password_hash = ?, role = ?, is_active = 1 WHERE email = ?', [hash, role, email])
        console.log(`refreshed ${role} account ${email}`)
      }
    }
  } else {
    console.log('SEED_DEMO=0 — skipping demo accounts')
  }
  // Configurable product options (per category scope)
  const [{ n: poCount }] = await query('SELECT COUNT(*) n FROM product_options')
  if (Number(poCount) === 0) {
    const J = (arr) => JSON.stringify(arr)
    const opts = [
      // [scope_type, scope_value, label_ar, label_en, selection, required, options, sort]
      ['category', 'madfouna', 'حجم الحصة', 'Portion', 'single', 1, J([
        { id: 'std', label_ar: 'عادية', label_en: 'Standard', price_delta: 0 },
        { id: 'xl', label_ar: 'كبيرة (+20)', label_en: 'Large', price_delta: 20 },
      ]), 1],
      ['category', 'madfouna', 'إضافات', 'Extras', 'multiple', 0, J([
        { id: 'cheese', label_ar: 'فرماج إضافي (+10)', label_en: 'Extra cheese', price_delta: 10 },
        { id: 'sauce', label_ar: 'صوص حارة (+5)', label_en: 'Spicy sauce', price_delta: 5 },
      ]), 2],
      ['category', 'chicken', 'الحصة', 'Portion', 'single', 1, J([
        { id: 'std', label_ar: 'كاملة', label_en: 'Whole', price_delta: 0 },
        { id: 'half', label_ar: 'نصف (− نصف السعر تقريباً)', label_en: 'Half', price_delta: -20 },
      ]), 1],
      ['category', 'chicken', 'المرافقات', 'Sides', 'multiple', 0, J([
        { id: 'fries', label_ar: 'بطاطس مقلية (+15)', label_en: 'Fries', price_delta: 15 },
        { id: 'drink', label_ar: 'مشروب غازي (+10)', label_en: 'Soda', price_delta: 10 },
        { id: 'bread', label_ar: 'خبز إضافي (+5)', label_en: 'Extra bread', price_delta: 5 },
      ]), 2],
      ['category', 'tanjia', 'عدد الأشخاص', 'Serves', 'single', 1, J([
        { id: 'p2', label_ar: 'شخصان', label_en: '2 persons', price_delta: 0 },
        { id: 'p4', label_ar: '4 أشخاص (+60)', label_en: '4 persons', price_delta: 60 },
      ]), 1],
      ['category', 'rfissa', 'المرق', 'Broth', 'single', 0, J([
        { id: 'std', label_ar: 'عادي', label_en: 'Normal', price_delta: 0 },
        { id: 'extra', label_ar: 'مرق إضافي (+8)', label_en: 'Extra broth', price_delta: 8 },
      ]), 1],
      ['category', 'marocaine', 'الحصة', 'Portion', 'single', 1, J([
        { id: 'std', label_ar: 'عادية', label_en: 'Standard', price_delta: 0 },
        { id: 'fam', label_ar: 'عائلية (+40)', label_en: 'Family', price_delta: 40 },
      ]), 1],
      ['all', '', 'مشروب مع الوجبة', 'Drink', 'single', 0, J([
        { id: 'none', label_ar: 'بدون', label_en: 'None', price_delta: 0 },
        { id: 'soda', label_ar: 'مشروب غازي (+10)', label_en: 'Soda', price_delta: 10 },
        { id: 'juice', label_ar: 'عصير برتقال (+15)', label_en: 'Orange juice', price_delta: 15 },
      ]), 99],
    ]
    for (const [st, sv, la, le, sel, req, js, sort] of opts) {
      await query(
        'INSERT INTO product_options (scope_type, scope_value, group_label_ar, group_label_en, selection, is_required, options_json, sort_order) VALUES (?,?,?,?,?,?,?,?)',
        [st, sv, la, le, sel, req, js, sort]
      )
    }
    console.log('seeded 8 product option groups')
  }
  console.log('SEED DONE')
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error('SEED FAILED:', e.message); process.exit(1) })
