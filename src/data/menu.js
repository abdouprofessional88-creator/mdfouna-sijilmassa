import { photos } from './demo.js'

/**
 * MENU DATA — single source of truth, UI-agnostic.
 * ─────────────────────────────────────────────
 * - All prices are FICTIONAL DEMO prices (MAD) for design purposes only.
 *   The UI always labels them "سعر تجريبي". The owner replaces them later.
 * - Shape is intentionally flat & serializable so it can later be
 *   served from MySQL via a tiny REST API with zero component changes:
 *     GET /api/menu → { categories, products }
 * - Images reuse the SafeImage chain { real?, src, fallback }.
 * - No localStorage, no cart persistence: ordering is NOT enabled yet.
 */

const px = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=900`

const extra = {
  harira: { src: px(15913595), fallback: 'tanjia.svg', approx: true }, // tomato soup, clay bowl
  juice: { src: px(5817626), fallback: 'tea.svg', approx: false }, // avocado-mango smoothie
  salad: { src: px(37206677), fallback: 'couscous.svg', approx: true }, // med salad w/ olives
  dessert: { src: px(33997736), fallback: 'pastilla.svg', approx: true }, // crescent nut pastries
}

export const CATEGORIES = [
  { id: 'all', ar: 'الكل', latin: 'All' },
  { id: 'madfouna', ar: 'المدفونة', latin: 'Madfouna' },
  { id: 'tanjia', ar: 'الطنجية', latin: 'Tanjia' },
  { id: 'chicken', ar: 'الدجاج', latin: 'Poulet' },
  { id: 'rfissa', ar: 'الرفيسة', latin: 'Rfissa' },
  { id: 'marocaine', ar: 'الأطباق المغربية', latin: 'Marocain' },
  { id: 'starters', ar: 'المقبلات', latin: 'Entrées' },
  { id: 'salads', ar: 'السلطات', latin: 'Salades' },
  { id: 'drinks', ar: 'المشروبات', latin: 'Boissons' },
  { id: 'desserts', ar: 'الحلويات', latin: 'Desserts' },
  { id: 'offers', ar: 'العروض', latin: 'Offres' },
]

export const categoryLabel = (id) => CATEGORIES.find((c) => c.id === id)?.ar ?? id

/**
 * Product shape:
 * { id, cat, name, latin, desc, price (MAD, DEMO), image, badge?,
 *   available, popular?, tags[] (search keywords ar/fr/en),
 *   ingredients (DEMO placeholder), allergens (DEMO placeholder) }
 */
export const PRODUCTS = [
  // ── المدفونة ──
  { id: 'madfouna-grande', cat: 'madfouna', name: 'مدفونة كبيرة', latin: 'Grande Madfouna', desc: 'خبزة محشوة باللحم والتوابل، تكفي 4 إلى 6 أشخاص. تُطهى على نار هادئة.', price: 140, image: photos.madfouna, badge: 'طبق التوقيع', available: true, popular: true, tags: ['madfouna', 'medfouna', 'كبيرة', 'عائلية'], ingredients: 'دقيق، لحم، بصل، توابل مغربية (قائمة إرشادية — DEMO)', allergens: 'الغلوتين (DEMO)' },
  { id: 'madfouna-moyenne', cat: 'madfouna', name: 'مدفونة متوسطة', latin: 'Madfouna Moyenne', desc: 'الحجم المتوسط — مثالي لشخصين أو ثلاثة، بنفس الحشوة الأصيلة.', price: 90, image: photos.madfouna, available: true, tags: ['madfouna', 'متوسطة'], ingredients: 'دقيق، لحم، بصل، توابل مغربية (قائمة إرشادية — DEMO)', allergens: 'الغلوتين (DEMO)' },
  { id: 'madfouna-petite', cat: 'madfouna', name: 'مدفونة صغيرة', latin: 'Petite Madfouna', desc: 'حجم فردي لاكتشاف النكهة، تُقدَّم ساخنة مع أتاي.', price: 55, image: photos.madfouna, available: true, tags: ['madfouna', 'صغيرة', 'فردي'], ingredients: 'دقيق، لحم، بصل، توابل مغربية (قائمة إرشادية — DEMO)', allergens: 'الغلوتين (DEMO)' },
  { id: 'mini-madfouna', cat: 'madfouna', name: 'ميني مدفونة', latin: 'Mini Madfouna', desc: 'قطعة صغيرة للتجربة الأولى أو كمرافقة للأطباق.', price: 30, image: photos.madfouna, badge: 'جديد', available: true, tags: ['madfouna', 'mini', 'ميني', 'تجربة'], ingredients: 'دقيق، لحم، توابل (قائمة إرشادية — DEMO)', allergens: 'الغلوتين (DEMO)' },

  // ── الطنجية ──
  { id: 'tanjia-viande', cat: 'tanjia', name: 'طنجية اللحم', latin: 'Tanjia de Bœuf', desc: 'لحم يُطهى 8 ساعات في جرة الرماد مع الثوم والكمون والسمن.', price: 120, image: photos.tanjia, badge: 'طهي بطيء', available: true, popular: true, availability_mode: 'preorder', tags: ['tanjia', 'tangia', 'طنجية', 'لحم', 'beef', 'رماد'], ingredients: 'لحم، ثوم، كمون، سمن، زيت (قائمة إرشادية — DEMO)', allergens: '— (DEMO)' },
  { id: 'tanjia-poulet', cat: 'tanjia', name: 'طنجية الدجاج', latin: 'Tanjia de Poulet', desc: 'نسخة الدجاج من الطنجية، بمرق مركّز وحامض مخلل.', price: 85, image: photos.tanjia, available: false, availability_mode: 'preorder', tags: ['tanjia', 'طنجية', 'دجاج', 'chicken'], ingredients: 'دجاج، حامض مخلل، زيتون، توابل (قائمة إرشادية — DEMO)', allergens: '— (DEMO)' },

  // ── الدجاج ──
  { id: 'poulet-mhammar', cat: 'chicken', name: 'الدجاج المحمر', latin: 'Poulet Rôti', desc: 'دجاج بلدي متبّل ومحمّر، يُقدَّم مع الحمص والمرق الغني.', price: 75, image: photos.poulet, badge: 'الأكثر طلباً', available: true, popular: true, tags: ['chicken', 'poulet', 'دجاج', 'محمر', 'roast'], ingredients: 'دجاج بلدي، حمص، بصل، توابل (قائمة إرشادية — DEMO)', allergens: '— (DEMO)' },
  { id: 'poulet-madghamar', cat: 'chicken', name: 'الدجاج المدغمر', latin: "Poulet M'Dammar", desc: 'وصفة مكناسية بمرق مركّز، تُقدَّم مع الزيتون والليمون.', price: 80, image: photos.madghamar, badge: 'وصفة مكناسية', available: true, tags: ['chicken', 'دجاج', 'مدغمر', 'مكناس'], ingredients: 'دجاج، زيتون، حامض، توابل (قائمة إرشادية — DEMO)', allergens: '— (DEMO)' },
  { id: 'demi-poulet', cat: 'chicken', name: 'نصف دجاج محمر', latin: 'Demi-Poulet Rôti', desc: 'نصف دجاجة محمرة مع مرق وحمص — وجبة فردية متكاملة.', price: 45, image: photos.poulet, available: true, tags: ['chicken', 'دجاج', 'نصف', 'فردي'], ingredients: 'دجاج، حمص، مرق (قائمة إرشادية — DEMO)', allergens: '— (DEMO)' },

  // ── الرفيسة ──
  { id: 'rfissa-trid', cat: 'rfissa', name: 'الرفيسة بالتريد', latin: 'Rfissa au Trid', desc: 'تريد مسقي بمرق الدجاج مع الحلبة والعدس والبيض.', price: 65, image: photos.rfissa, badge: 'تقليدي', available: true, popular: true, tags: ['rfissa', 'رفيسة', 'تريد', 'عدس', 'حلبة'], ingredients: 'تريد، دجاج، عدس، حلبة، بيض (قائمة إرشادية — DEMO)', allergens: 'الغلوتين، البيض (DEMO)' },
  { id: 'rfissa-beldi', cat: 'rfissa', name: 'رفيسة بالدجاج البلدي', latin: 'Rfissa Poulet Beldi', desc: 'نسخة الدجاج البلدي الفاخرة مع سمن بلدي إضافي.', price: 78, image: photos.rfissa, available: true, tags: ['rfissa', 'رفيسة', 'بلدي'], ingredients: 'تريد، دجاج بلدي، سمن، عدس (قائمة إرشادية — DEMO)', allergens: 'الغلوتين، البيض، الحليب (DEMO)' },

  // ── الأطباق المغربية ──
  { id: 'couscous-vendredi', cat: 'marocaine', name: 'كسكس الجمعة', latin: 'Couscous du Vendredi', desc: 'كسكس بالخضرة السبع ولحم مختار، يُقدَّم يوم الجمعة.', price: 60, image: photos.couscous, badge: 'يوم الجمعة', available: true, popular: true, availability_mode: 'lunch', tags: ['couscous', 'كسكس', 'كسكسو', 'خضرة', 'جمعة'], ingredients: 'كسكس، خضرة، لحم، حمص (قائمة إرشادية — DEMO)', allergens: 'الغلوتين (DEMO)' },
  { id: 'pastilla-poulet', cat: 'marocaine', name: 'بسطيلة الدجاج', latin: 'Pastilla au Poulet', desc: 'ورقة مقرمشة محشوة بالدجاج واللوز، مرشوشة بالقرفة والسكر.', price: 70, image: photos.pastilla, available: true, tags: ['pastilla', 'bastilla', 'بسطيلة', 'لوز'], ingredients: 'ورقة، دجاج، لوز، بيض، قرفة (قائمة إرشادية — DEMO)', allergens: 'الغلوتين، البيض، المكسرات (DEMO)' },
  { id: 'pastilla-poisson', cat: 'marocaine', name: 'بسطيلة السمك', latin: 'Pastilla aux Poissons', desc: 'فواكه البحر بتوابل مغربية في ورقة ذهبية مقرمشة.', price: 85, image: photos.pastilla, available: false, tags: ['pastilla', 'بسطيلة', 'سمك', 'fish', 'fruits de mer'], ingredients: 'ورقة، سمك، شعرية، توابل (قائمة إرشادية — DEMO)', allergens: 'الغلوتين، السمك (DEMO)' },
  { id: 'tajine-pruneaux', cat: 'marocaine', name: 'طاجين اللحم بالبرقوق', latin: 'Tajine aux Pruneaux', desc: 'لحم طري بالبرقوق المكرمل واللوز المحمر وعبق القرفة.', price: 75, image: photos.hero, available: true, tags: ['tajine', 'tagine', 'طاجين', 'لحم', 'برقوق'], ingredients: 'لحم، برقوق، لوز، قرفة (قائمة إرشادية — DEMO)', allergens: 'المكسرات (DEMO)' },

  // ── المقبلات ──
  { id: 'harira', cat: 'starters', name: 'الحريرة المغربية', latin: 'Harira', desc: 'شوربة الطماطم والحمص والعدس بالكزبرة — بداية كل مائدة.', price: 20, image: extra.harira, available: true, popular: true, tags: ['harira', 'حريرة', 'شوربة', 'soup', 'soupe'], ingredients: 'طماطم، حمص، عدس، كزبرة (قائمة إرشادية — DEMO)', allergens: '— (DEMO)' },
  { id: 'zaalouk', cat: 'starters', name: 'زعلوك', latin: 'Zaalouk', desc: 'سلطة الباذنجال المشوي بزيت الزيتون والكمون.', price: 25, image: extra.salad, available: true, tags: ['zaalouk', 'زعلوك', 'باذنجال', 'aubergine'], ingredients: 'باذنجال، طماطم، زيت زيتون (قائمة إرشادية — DEMO)', allergens: '— (DEMO)' },
  { id: 'briouates', cat: 'starters', name: 'بريوات مقرمشة', latin: 'Briouates', desc: 'مثلثات الورقة المحشوة — 4 قطع بالدجاج أو الخضرة.', price: 30, image: photos.pastilla, available: true, tags: ['briouates', 'بريوات', 'مقرمش'], ingredients: 'ورقة، دجاج/خضرة (قائمة إرشادية — DEMO)', allergens: 'الغلوتين (DEMO)' },

  // ── السلطات ──
  { id: 'salade-marocaine', cat: 'salads', name: 'شلاضة مغربية', latin: 'Salade Marocaine', desc: 'طماطم، خيار، زيتون بنفسجي، بصل وزيت زيتون بلدية.', price: 25, image: extra.salad, available: true, popular: true, tags: ['salad', 'salade', 'شلاضة', 'سلطة', 'tomate'], ingredients: 'طماطم، خيار، زيتون، بصل (قائمة إرشادية — DEMO)', allergens: '— (DEMO)' },
  { id: 'salade-avocat', cat: 'salads', name: 'سلطة الأفوكادو', latin: "Salade d'Avocat", desc: 'أفوكادو، ذرة، طماطم كرزية وصلصة الليمون.', price: 35, image: extra.salad, available: true, tags: ['salad', 'أفوكادو', 'avocat', 'avocado'], ingredients: 'أفوكادو، ذرة، طماطم (قائمة إرشادية — DEMO)', allergens: '— (DEMO)' },

  // ── المشروبات ──
  { id: 'atay', cat: 'drinks', name: 'أتاي بالنعناع', latin: 'Thé à la Menthe', desc: 'شاي أخضر بالنعناع الطازج على الأصول — إبريق يكفي اثنين.', price: 15, image: photos.tea, badge: 'على الأصول', available: true, popular: true, tags: ['tea', 'atay', 'أتاي', 'thé', 'نعناع', 'menthe'], ingredients: 'شاي أخضر، نعناع، سكر (قائمة إرشادية — DEMO)', allergens: '— (DEMO)' },
  { id: 'panache', cat: 'drinks', name: 'باناشي', latin: 'Panaché', desc: 'طبقات الفواكه الموسمية بالحليب واللوز — كأس كبير.', price: 30, image: extra.juice, available: true, tags: ['jus', 'juice', 'باناشي', 'panaché', 'عصير', 'avocat'], ingredients: 'فواكه موسمية، حليب، لوز (قائمة إرشادية — DEMO)', allergens: 'الحليب، المكسرات (DEMO)' },
  { id: 'jus-avocat', cat: 'drinks', name: 'عصير الأفوكادو باللوز', latin: "Jus d'Avocat", desc: 'أفوكادو مخفوق بالحليب واللوز المحمر والعسل.', price: 35, image: extra.juice, available: true, tags: ['jus', 'أفوكادو', 'عصير', 'amande'], ingredients: 'أفوكادو، حليب، لوز، عسل (قائمة إرشادية — DEMO)', allergens: 'الحليب، المكسرات (DEMO)' },

  // ── الحلويات ──
  { id: 'kaab-ghazal', cat: 'desserts', name: 'كعب غزال', latin: "Kaab el Ghazal", desc: 'هلال اللوز المعطر بماء زهر البرتقال — 6 قطع.', price: 40, image: extra.dessert, badge: 'صناعة تقليدية', available: true, popular: true, tags: ['kaab', 'كعب', 'غزال', 'لوز', 'cornes', 'gazelle', 'حلويات'], ingredients: 'لوز، سكر، ماء الزهر (قائمة إرشادية — DEMO)', allergens: 'المكسرات، الغلوتين (DEMO)' },
  { id: 'chebakia', cat: 'desserts', name: 'الشباكية', latin: 'Chebakia', desc: 'وردة السمسم المقلية المعسولة — تُقدَّم مع الحريرة.', price: 35, image: extra.dessert, available: true, tags: ['chebakia', 'شباكية', 'سمسم', 'عسل'], ingredients: 'دقيق، سمسم، عسل (قائمة إرشادية — DEMO)', allergens: 'الغلوتين، السمسم (DEMO)' },

  // ── العروض ──
  { id: 'offre-famille', cat: 'offers', name: 'العرض العائلي', latin: 'Offre Familiale', desc: 'مدفونة كبيرة + شلاضة + إبريق أتاي — تكفي 4 أشخاص. (عرض تجريبي)', price: 180, image: photos.madfouna, badge: 'عرض', available: true, popular: true, tags: ['offre', 'عرض', 'عائلي', 'formule', 'menu'], ingredients: 'حسب الأطباق المختارة (DEMO)', allergens: 'حسب الأطباق (DEMO)' },
  { id: 'formule-vendredi', cat: 'offers', name: 'فورمولا الجمعة', latin: 'Formule Vendredi', desc: 'كسكس الجمعة + حريرة + تمر وحليب. (عرض تجريبي)', price: 70, image: photos.couscous, badge: 'كل جمعة', available: true, tags: ['offre', 'جمعة', 'فورمولا', 'couscous'], ingredients: 'كسكس، حريرة (DEMO)', allergens: 'الغلوتين (DEMO)' },
]

/* ── search helpers ─────────────────────────── */
const norm = (s = '') =>
  s
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/ـ/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')

export function searchProducts(query, list = PRODUCTS) {
  const q = norm(query).trim()
  if (!q) return list
  return list.filter((p) =>
    norm([p.name, p.latin, p.desc, categoryLabel(p.cat), ...(p.tags || [])].join(' ')).includes(q)
  )
}

export function sortProducts(list, mode) {
  const arr = [...list]
  if (mode === 'price-asc') arr.sort((a, b) => a.price - b.price)
  else if (mode === 'price-desc') arr.sort((a, b) => b.price - a.price)
  else if (mode === 'name') arr.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  else arr.sort((a, b) => Number(b.popular || false) - Number(a.popular || false) || a.price - b.price)
  return arr
}

export function relatedProducts(product, n = 3, list = PRODUCTS) {
  return list.filter((p) => p.cat === product.cat && p.id !== product.id).slice(0, n)
}

/* ── availability modes (configurable, owner-driven — no policy enforced) ── */
export const AVAIL_MODES = {
  all_day: 'متوفر طوال اليوم',
  lunch: 'الغداء فقط',
  dinner: 'العشاء فقط',
  preorder: 'يُحضّر عند الطلب',
}
export const modeLabel = (m) => AVAIL_MODES[m] || AVAIL_MODES.all_day

/* ── live option groups (DB-driven customization) ── */
let _groups = []

export function setOptionGroups(groups) { _groups = Array.isArray(groups) ? groups : [] }
export function getOptionGroups() { return _groups }

/** Groups applying to a product: item scope > category scope > all. */
export function groupsForProduct(product) {
  const pid = String(product.dbId || '').replace(/^db-/, '')
  const byId = _groups.filter((g) => g.scope_type === 'item' && String(g.scope_value) === pid)
  const byCat = _groups.filter((g) => g.scope_type === 'category' && g.scope_value === product.cat)
  const all = _groups.filter((g) => g.scope_type === 'all')
  return [...byId, ...byCat, ...all].sort((a, b) => a.sort_order - b.sort_order)
}

/** Default selection: required single → first option; else empty. */
export function defaultSelection(groups) {
  const sel = {}
  for (const g of groups) {
    if (g.selection === 'single' && g.is_required && g.options?.length) sel[String(g.id)] = String(g.options[0].id)
    else if (g.selection === 'multiple') sel[String(g.id)] = []
  }
  return sel
}

export function selectionPrice(groups, selection) {
  let d = 0
  for (const g of groups) {
    const v = selection[String(g.id)]
    const ids = g.selection === 'multiple' ? (Array.isArray(v) ? v : []) : (v ? [v] : [])
    for (const oid of ids) {
      const o = g.options?.find((x) => String(x.id) === String(oid))
      if (o) d += Number(o.price_delta) || 0
    }
  }
  return d
}

export function selectionLines(groups, selection) {
  const out = []
  for (const g of groups) {
    const v = selection[String(g.id)]
    const ids = g.selection === 'multiple' ? (Array.isArray(v) ? v : []) : (v ? [v] : [])
    for (const oid of ids) {
      const o = g.options?.find((x) => String(x.id) === String(oid))
      if (o) out.push({ groupId: g.id, group: g.group_label_ar, optionId: String(oid), label_ar: o.label_ar, price_delta: Number(o.price_delta) || 0 })
    }
  }
  return out
}

/* ── live API adapter ─────────────────────────
 * Maps MySQL rows (GET /api/menu) to the same product shape.
 * Falls back gracefully: unknown image_key → remote URL or default art.
 */
const LIVE_FALLBACK = { src: '', fallback: 'couscous.svg', approx: true }

export function adaptApiMenu({ categories, items }) {
  const liveCats = [
    { id: 'all', ar: 'الكل', latin: 'All' },
    ...categories.map((c) => ({ id: c.slug, ar: c.name_ar, latin: c.name_en })),
  ]
  const liveProducts = items.map((row) => ({
    id: `db-${row.id}`,
    dbId: row.id,
    cat: row.category,
    name: row.name_ar,
    latin: row.name_en || row.name_ar,
    desc: row.description_ar || '',
    price: Number(row.base_price),
    image: photos[row.image_key] || (row.image_url ? { ...LIVE_FALLBACK, src: row.image_url } : LIVE_FALLBACK),
    badge: row.badge_ar || undefined,
    available: Boolean(row.is_available),
    availability_mode: row.availability_mode || 'all_day',
    popular: Boolean(row.is_popular),
    tags: [row.name_en || '', row.category].filter(Boolean),
    ingredients: 'تُحدد القائمة النهائية مع الإدارة (DEMO)',
    allergens: 'يُرجى الاستفسار عند الحجز (DEMO)',
  }))
  return { categories: liveCats, products: liveProducts }
}
