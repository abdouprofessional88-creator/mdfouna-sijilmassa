/**
 * Centralized restaurant configuration.
 * ─────────────────────────────────────────────
 * RULE: never invent official data.
 * - Values marked `source: 'instagram'` were read from the
 *   official Instagram screenshots provided by the owner
 *   (madfounat_sijilmassa_officiel) and still need final
 *   owner confirmation before production.
 * - Values marked `source: 'demo'` are clearly-labeled
 *   placeholders to be replaced once the owner provides assets.
 */

export const restaurant = {
  nameAr: 'مدفونة سجلماسة',
  nameLatin: 'Mdfouna Sijilmassa',
  baseline: 'Patrimoine & Goût — Depuis 2016',
  cityAr: 'مكناس',
  cityNoteAr: 'العاصمة الإسماعيلية',
  descriptionAr:
    'مطعم مغربي أصيل في مكناس، متخصص في المدفونة والطنجية المراكشية والدجاج المحمر والرفيسة بالتريد.',
  cuisine: ['مدفونة', 'الطنجية المراكشية', 'الدجاج المحمر', 'الدجاج المدغمر', 'الرفيسة بالتريد'],

  // Contact — observed on official Instagram bio / flyers. Confirm before production.
  phones: [
    { label: '05.35.46.92.04', href: 'tel:+212535469204', source: 'instagram' },
    { label: '06.61.25.10.03', href: 'tel:+212661251003', source: 'instagram' },
    { label: '06.61.31.50.20', href: 'tel:+212661315020', source: 'instagram' },
  ],
  address: {
    ar: 'Lot 431، الرياض الإسماعيلية، عناسي، مكناس',
    latin: 'Lot 431, Ryad Al Ismailia, Anassi, Meknes',
    source: 'instagram',
    mapUrl: 'https://maps.google.com/?q=Madfounat+Sijilmassa+Meknes',
    isPlaceholder: true, // keep true until owner confirms exact address
  },
  hours: {
    ar: 'يومياً — تُحدد أوقات العمل الرسمية لاحقاً (DEMO)',
    source: 'demo',
    isPlaceholder: true,
  },

  social: {
    instagram: 'https://www.instagram.com/madfounat_sijilmassa_officiel/',
    instagramHandle: 'madfounat_sijilmassa_officiel',
    linktree: 'https://linktr.ee/madfounat_sijilmassa_officiel1',
    whatsapp: '', // owner to provide, e.g. 'https://wa.me/212600000000'
  },

  navigation: [
    { id: 'home', label: 'الرئيسية' },
    { id: 'story', label: 'حكايتنا' },
    { id: 'signature', label: 'أطباق التوقيع' },
    { id: 'menu', label: 'المينيو' },
    { id: 'offers', label: 'العروض' },
    { id: 'contact', label: 'اتصل بنا' },
  ],

  ctas: {
    reserve: 'احجز طاولتك',
    menu: 'اكتشف المينيو',
  },
}

export const assetNotes = {
  logo: 'Interim logo.svg recreates the official circular badge (Depuis 2016 / Patrimoine & Goût / مدفونة سجلماسة). Drop the real file as public/images/real/logo.png (then tell me to switch it) or replace logo.svg.',
  photos:
    'CHAIN: public/images/real/*.jpg (owner photos, auto-detected) → Pexels remote (verified) → local SVG (offline). To use real photos, just drop JPGs with the exact names from public/images/real/README.md — no code changes needed.',
}
