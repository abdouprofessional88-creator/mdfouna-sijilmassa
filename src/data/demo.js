/**
 * Demo content — clearly labeled, no invented prices / awards / history.
 *
 * PHOTOS: real professional stock photos (Pexels, free license, verified 200).
 * Some are close approximations (flagged approx:true → UI shows "صورة تقريبية").
 * Every photo has a local SVG fallback in /public/images/ if the remote file
 * ever fails. Replace any remote URL with the restaurant's real photo later —
 * same object shape, zero component changes.
 *
 * Sources (photo pages):
 * - hero/tagine veg:      https://www.pexels.com/photo/cooked-food-on-a-clay-pot-4502970/
 * - madfouna/flatbread:   https://www.pexels.com/photo/baker-preparing-traditional-middle-eastern-flatbread-37290077/
 * - tanjia/stew pot:      https://www.pexels.com/photo/cooked-food-in-black-bowl-8617421/
 * - poulet/roast:         https://www.pexels.com/photo/roasted-chicken-on-white-ceramic-plate-5591223/
 * - madghamar/chicken:    https://www.pexels.com/photo/food-on-a-plate-5810670/
 * - rfissa/chicken stew:    https://www.pexels.com/photo/delicious-african-dish-with-chicken-and-beans-37100202/
 * - couscous/lamb:        https://www.pexels.com/photo/a-delicious-rice-meal-topped-with-rolled-meat-6844877/
 * - interior/riad:        https://www.pexels.com/photo/interior-of-a-palace-18320914/
 * - tea/ceremony:         https://www.pexels.com/photo/traditional-moroccan-tea-ceremony-with-silver-teapot-29477345/
 * - pastilla/dusted pie:    https://www.pexels.com/photo/a-brown-pie-sprinkled-with-confectioners-sugar-5837104/
 */

const px = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=900`

export const photos = {
  hero: { real: 'real/hero.jpg', src: px(4502970), fallback: 'hero.svg', approx: false },
  madfouna: { real: 'real/madfouna.jpg', src: px(37290077), fallback: 'madfouna.svg', approx: false },
  tanjia: { real: 'real/tanjia.png', src: px(8617421), fallback: 'tanjia.svg', approx: false },
  poulet: { real: 'real/poulet.png', src: px(5591223), fallback: 'poulet.svg', approx: false },
  madghamar: { real: 'real/madghamar.png', src: px(5810670), fallback: 'poulet.svg', approx: false },
  rfissa: { real: 'real/rfissa.webp', src: px(37100202), fallback: 'rfissa.svg', approx: false },
  couscous: { real: 'real/couscous.jpg', src: px(6844877), fallback: 'couscous.svg', approx: false },
  pastilla: { real: 'real/pastilla.jpg', src: px(5837104), fallback: 'pastilla.svg', approx: true },
  interior: { real: 'real/interior.png', src: px(18320914), fallback: 'interior.svg', approx: false },
  tea: { real: 'real/tea.jpg', src: px(29477345), fallback: 'tea.svg', approx: false },
}

export const signatureDishes = [
  {
    id: 'madfouna',
    name: 'المدفونة السجلماسية',
    latin: 'Madfouna — Signature',
    desc: 'خبزة محشوة على الطريقة التقليدية، تُطهى على نار هادئة. طبق التوقيع الذي اشتهر به المطعم.',
    tag: 'طبق التوقيع',
    image: photos.madfouna,
  },
  {
    id: 'tanjia',
    name: 'الطنجية المراكشية',
    latin: 'Tanjia Marrakchia',
    desc: 'لحم يُطهى ببطء في جرة الرماد لساعات، بنكهة عميقة وقوام يذوب في الفم.',
    tag: 'طهي بطيء',
    image: photos.tanjia,
  },
  {
    id: 'djaj-mhammar',
    name: 'الدجاج المحمر',
    latin: 'Poulet Rôti Marocain',
    desc: 'دجاج بلدي متبّل بالتوابل المغربية، محمّر ومقدّم مع الحمص والمرق الغني.',
    tag: 'الأكثر طلباً',
    image: photos.poulet,
  },
  {
    id: 'madghamar',
    name: 'الدجاج المدغمر',
    latin: 'Poulet M’Dammar',
    desc: 'وصفة مكناسية أصيلة بمرق مركّز وتوابل مدروسة، لعشاق النكهات القوية.',
    tag: 'وصفة مكناسية',
    image: photos.madghamar,
  },
  {
    id: 'rfissa',
    name: 'الرفيسة بالتريد',
    latin: 'Rfissa & Trid',
    desc: 'تريد مسقي بمرق الدجاج والحلبة والعدس — طبق الدفء والضيافة المغربية.',
    tag: 'تقليدي',
    image: photos.rfissa,
  },
  {
    id: 'couscous',
    name: 'الكسكس الخاص',
    latin: 'Couscous Spécial',
    desc: 'كسكس الجمعة بالخضرة ولحم مختار، يُقدّم في أجواء عائلية دافئة.',
    tag: 'يوم الجمعة',
    image: photos.couscous,
  },
]

export const menuPreview = [
  {
    category: 'أطباق التوقيع',
    note: 'DEMO — الأصناف مؤكدة، الأثمنة تُحدد لاحقاً من طرف المطعم',
    items: [
      { name: 'مدفونة سجلماسة', desc: 'الحجم الكبير / المتوسط / الصغير — حسب التوفر' },
      { name: 'ميني مدفونة', desc: 'حجم فردي — مثالي للتجربة الأولى' },
      { name: 'طنجية مراكشية', desc: 'طهي بطيء على الرماد' },
    ],
  },
  {
    category: 'الدجاج والأطباق التقليدية',
    note: 'DEMO',
    items: [
      { name: 'الدجاج المحمر بالحمص', desc: 'يُقدّم مع المرق والليمون المخلل' },
      { name: 'الدجاج المدغمر', desc: 'وصفة مكناسية بمرق مركّز' },
      { name: 'الرفيسة بالتريد', desc: 'دجاج بلدي، حلبة، عدس' },
    ],
  },
  {
    category: 'بسطيلة وكسكس',
    note: 'DEMO',
    items: [
      { name: 'بسطيلة الدجاج', desc: 'ورقة مقرمشة، لوز، قرفة' },
      { name: 'بسطيلة السمك', desc: 'فواكه البحر بتوابل مغربية' },
      { name: 'كسكس خاص', desc: 'يُقدّم يوم الجمعة' },
    ],
  },
]

export const offers = [
  {
    id: 'friday',
    title: 'كسكس الجمعة',
    desc: 'أجواء عائلية وطبق الجمعة المغربي الأصيل. الحجز المسبق مستحسن. (DEMO — التفاصيل تُؤكد لاحقاً)',
    badge: 'كل جمعة',
    image: photos.couscous,
  },
  {
    id: 'takeaway',
    title: 'سفري + توصيل',
    desc: 'المدفونة والأطباق التقليدية متوفرة للطلب الخارجي. اتصلوا بنا مباشرة. (DEMO)',
    badge: 'Service Emporter',
    image: photos.madfouna,
  },
  {
    id: 'events',
    title: 'المناسبات والعائلات',
    desc: 'قاعة واسعة تستقبل العائلات والمجموعات والضيوف من داخل وخارج مكناس. (DEMO)',
    badge: 'للمجموعات',
    image: photos.interior,
  },
]
