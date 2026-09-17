import { z } from 'zod'

const email = z.string().trim().toLowerCase().email('بريد إلكتروني غير صالح')
const phone = z.string().trim().min(8, 'رقم الهاتف قصير').max(20, 'رقم الهاتف طويل')
  .regex(/^[+0-9][0-9\s.-]*$/, 'رقم هاتف غير صالح')
const password = z.string().min(8, 'كلمة المرور 8 أحرف على الأقل').max(100, 'كلمة المرور طويلة')

export const registerSchema = z.object({
  full_name: z.string().trim().min(3, 'الاسم الكامل مطلوب').max(120),
  email,
  phone,
  password,
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: 'تأكيد كلمة المرور غير متطابق',
  path: ['confirm_password'],
})

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'البريد أو الهاتف مطلوب'), // email OR phone
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
})

export const profileSchema = z.object({
  full_name: z.string().trim().min(3, 'الاسم الكامل مطلوب').max(120),
  phone,
})

export const validate = (schema) => (req, _res, next) => {
  const r = schema.safeParse(req.body)
  if (!r.success) {
    const err = new Error('بيانات غير صالحة')
    err.status = 422
    err.details = r.error.flatten().fieldErrors
    return next(err)
  }
  req.validated = r.data
  next()
}

/* shared primitives (declared early — used by order/address/quote schemas) */
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'التاريخ غير صالح')
const timeStr = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'الوقت غير صالح')
const latSchema = z.coerce.number().min(-90, 'خط عرض غير صالح').max(90, 'خط عرض غير صالح')
const lngSchema = z.coerce.number().min(-180, 'خط طول غير صالح').max(180, 'خط طول غير صالح')

/* ── staff dashboard schemas ── */
export const reservationStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'], {
    errorMap: () => ({ message: 'حالة غير صالحة' }),
  }),
})

export const tableSchema = z.object({
  table_number: z.string().trim().min(1, 'رقم الطاولة مطلوب').max(20),
  capacity: z.coerce.number().int().min(1, 'السعة 1 على الأقل').max(50),
  area: z.enum(['salle', 'terrasse', 'salon', 'prive']),
  description: z.string().trim().max(255).optional().nullable(),
  status: z.enum(['available', 'occupied', 'reserved', 'maintenance']).optional(),
})

export const tablePatchSchema = tableSchema.partial()

export const staffCreateSchema = z.object({
  full_name: z.string().trim().min(3, 'الاسم الكامل مطلوب').max(120),
  email: z.string().trim().toLowerCase().email('بريد إلكتروني غير صالح'),
  phone: z.string().trim().min(8, 'رقم الهاتف قصير').max(20),
  password: z.string().min(8, 'كلمة المرور 8 أحرف على الأقل').max(100),
  role: z.enum(['receptionist', 'kitchen_staff', 'delivery_driver', 'manager']),
})

export const rolePatchSchema = z.object({
  role: z.enum(['receptionist', 'kitchen_staff', 'delivery_driver', 'manager', 'admin', 'customer']),
})

export const activePatchSchema = z.object({
  is_active: z.coerce.boolean(),
})

export const passwordResetSchema = z.object({
  new_password: z.string().min(8, 'كلمة المرور 8 أحرف على الأقل').max(100),
})

export const menuItemPatchSchema = z.object({
  is_available: z.coerce.boolean().optional(),
  base_price: z.coerce.number().min(0, 'السعر غير صالح').max(10000).optional(),
  availability_mode: z.enum(['all_day', 'lunch', 'dinner', 'preorder']).optional(),
})

export const offerPatchSchema = z.object({
  is_active: z.coerce.boolean().optional(),
  price: z.coerce.number().min(0, 'السعر غير صالح').max(10000).optional().nullable(),
})

/* ── ordering ── */
const orderLineSchema = z.object({
  menu_item_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(20),
  options: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional().default({}),
  item_note: z.string().trim().max(255).optional().default(''),
})

export const orderCreateSchema = z.object({
  order_type: z.enum(['delivery', 'pickup']),
  full_name: z.string().trim().min(3, 'الاسم مطلوب').max(120),
  phone: z.string().trim().min(8, 'الهاتف مطلوب').max(20),
  address_line: z.string().trim().max(255).optional().default(''),
  city: z.string().trim().max(80).optional().default('مكناس'),
  special_instructions: z.string().trim().max(500).optional().default(''),
  payment_method: z.enum(['cash', 'card']),
  items: z.array(orderLineSchema).min(1, 'السلة فارغة').max(30),
  // GPS delivery snapshot (validated ranges; zone + fee recomputed server-side)
  address_id: z.coerce.number().int().positive().optional().nullable(),
  latitude: latSchema.optional().nullable(),
  longitude: lngSchema.optional().nullable(),
  delivery_notes: z.string().trim().max(500).optional().default(''),
}).refine((d) => d.order_type !== 'delivery' || d.address_line.trim().length >= 5, {
  message: 'عنوان التوصيل مطلوب (5 أحرف على الأقل)',
  path: ['address_line'],
}).refine((d) => {
  if (d.latitude == null && d.longitude == null) return true
  if (d.latitude == null || d.longitude == null) return false
  return !(d.latitude === 0 && d.longitude === 0)
}, {
  message: 'إحداثيات غير صالحة',
  path: ['latitude'],
})

export const orderStatusSchema = z.object({
  status: z.enum(['pending_payment', 'received', 'accepted', 'preparing', 'ready', 'assigned_to_driver', 'out_for_delivery', 'delivered', 'cancelled', 'rejected']),
})

export const deliveryStatusSchema = z.object({
  delivery_status: z.enum(['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'failed', 'cancelled']),
})

export const orderRejectSchema = z.object({
  reason: z.string().trim().min(3, 'سبب الرفض مطلوب').max(255),
})

/* ── payments & delivery ops ── */
export const paymentCreateSchema = z.object({
  order_id: z.coerce.number().int().positive(),
  method: z.enum(['cash', 'card']),
})

export const assignDriverSchema = z.object({
  driver_id: z.coerce.number().int().positive(),
})

export const deliveryFailSchema = z.object({
  reason: z.string().trim().min(3, 'سبب التعذّر مطلوب').max(255),
})

export const orderStatusChangeSchema = z.object({
  status: z.enum(['pending_payment', 'received', 'accepted', 'preparing', 'ready', 'assigned_to_driver', 'out_for_delivery', 'delivered', 'cancelled', 'rejected']),
  reason: z.string().trim().max(255).optional().default(''),
})

/* ── menu management ── */
export const categoryCreateSchema = z.object({
  slug: z.string().trim().max(60).optional().default(''),
  name_ar: z.string().trim().min(2, 'الاسم مطلوب').max(120),
  name_en: z.string().trim().max(120).optional().default(''),
  sort_order: z.coerce.number().int().min(0).max(1000).optional().default(0),
})

export const categoryPatchSchema = z.object({
  name_ar: z.string().trim().min(2).max(120).optional(),
  name_en: z.string().trim().max(120).optional(),
  sort_order: z.coerce.number().int().min(0).max(1000).optional(),
  is_active: z.coerce.boolean().optional(),
})

const menuItemBase = z.object({
  category_id: z.coerce.number().int().positive(),
  name_ar: z.string().trim().min(2, 'الاسم مطلوب').max(150),
  name_en: z.string().trim().max(150).optional().default(''),
  description_ar: z.string().trim().max(500).optional().default(''),
  description_en: z.string().trim().max(500).optional().default(''),
  image_key: z.string().trim().max(60).optional().default(''),
  image_url: z.string().trim().max(500).optional().default(''),
  base_price: z.coerce.number().min(0, 'السعر غير صالح').max(10000),
  is_available: z.coerce.boolean().optional().default(true),
  is_popular: z.coerce.boolean().optional().default(false),
  badge_ar: z.string().trim().max(60).optional().default(''),
  availability_mode: z.enum(['all_day', 'lunch', 'dinner', 'preorder']).optional().default('all_day'),
})

export const menuItemCreateSchema = menuItemBase
export const menuItemPutSchema = menuItemBase.partial()

const offerBase = z.object({
  title_ar: z.string().trim().min(2, 'العنوان مطلوب').max(150),
  description_ar: z.string().trim().max(500).optional().default(''),
  image_key: z.string().trim().max(60).optional().default(''),
  image_url: z.string().trim().max(500).optional().default(''),
  price: z.coerce.number().min(0).max(10000).optional().nullable(),
  is_active: z.coerce.boolean().optional().default(true),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
})

export const offerCreateSchema = offerBase
export const offerPutSchema = offerBase.partial()

const optOption = z.object({
  id: z.string().trim().min(1).max(40),
  label_ar: z.string().trim().min(1).max(80),
  label_en: z.string().trim().max(80).optional().default(''),
  price_delta: z.coerce.number().min(-10000).max(10000),
})

const optionGroupBase = z.object({
  scope_type: z.enum(['category', 'item', 'all']),
  scope_value: z.string().trim().max(60).optional().default(''),
  group_label_ar: z.string().trim().min(2, 'التسمية مطلوبة').max(120),
  group_label_en: z.string().trim().max(120).optional().default(''),
  selection: z.enum(['single', 'multiple']),
  is_required: z.coerce.boolean().optional().default(false),
  options: z.array(optOption).min(1, 'خيار واحد على الأقل').max(30),
  sort_order: z.coerce.number().int().min(0).max(1000).optional().default(0),
  is_active: z.coerce.boolean().optional().default(true),
})

export const optionGroupCreateSchema = optionGroupBase
export const optionGroupPatchSchema = optionGroupBase.partial().extend({
  options: z.array(optOption).min(1).max(30).optional(),
})

const addressBase = z.object({
  label: z.enum(['home', 'work', 'other']),
  label_note: z.string().trim().max(80).optional().default(''),
  formatted_address: z.string().trim().min(5, 'العنوان قصير').max(255),
  street: z.string().trim().max(150).optional().default(''),
  neighborhood: z.string().trim().max(120).optional().default(''),
  city: z.string().trim().max(80).optional().default('مكناس'),
  postal_code: z.string().trim().max(20).optional().default(''),
  country: z.string().trim().max(80).optional().default('المغرب'),
  latitude: latSchema,
  longitude: lngSchema,
  accuracy_m: z.coerce.number().int().min(0).max(100000).optional().nullable(),
  delivery_notes: z.string().trim().max(255).optional().default(''),
  is_default: z.coerce.boolean().optional().default(false),
})

export const addressSchema = addressBase.refine((d) => !(d.latitude === 0 && d.longitude === 0), {
  message: 'إحداثيات غير صالحة',
  path: ['latitude'],
})

export const addressPatchSchema = addressBase.partial()

export const quoteSchema = z.object({
  latitude: latSchema,
  longitude: lngSchema,
  subtotal: z.coerce.number().min(0).max(100000).optional().default(0),
}).refine((d) => !(d.latitude === 0 && d.longitude === 0), {
  message: 'إحداثيات غير صالحة',
  path: ['latitude'],
})

export const reservationCreateSchema = z.object({
  reservation_date: dateStr.refine((d) => d >= new Date().toISOString().slice(0, 10), {
    message: 'التاريخ يجب أن يكون اليوم أو بعده',
  }),
  start_time: timeStr,
  guest_count: z.coerce.number().int().min(1, 'ضيف واحد على الأقل').max(30, 'للمجموعات الكبيرة اتصلوا بنا'),
  table_id: z.coerce.number().int().positive().optional().nullable(),
  occasion: z.enum(['family', 'birthday', 'business', 'celebration', 'other']).optional().nullable(),
  special_requests: z.string().trim().max(500, 'الملاحظة طويلة').optional().default(''),
})
