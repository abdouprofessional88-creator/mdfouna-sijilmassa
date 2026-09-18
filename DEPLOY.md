# النشر أونلاين — Deploy

## الفكرة (مهم)

GitHub **لا يشغّل سيرفرات** — لذلك الموقع الكامل (واجهة + API + MySQL)
يُستضاف خارجياً، والكود يبقى على GitHub.

## الخيار 1: مجاني بالكامل (موصى به للتجربة)

ثلاث خدمات مجانية، كل واحدة تربطها بـ GitHub:

| الطبقة | الخدمة المجانية | ملاحظة |
|---|---|---|
| الواجهة | **Cloudflare Pages** | مجاني + يعمل مع المستودعات الخاصة |
| الـ API | **Koyeb** (أو Render) | مجاني، ينام بعد الخمول |
| MySQL | **Aiven** (خطة Free) | MySQL حقيقي مجاني |

### الخطوات
1. **MySQL على Aiven**: حساب → Create MySQL (Free plan) → انسخ **Connection URI**
   (شكله `mysql://user:pass@host:port/db`).
2. **API على Koyeb**: حساب مربوط بـ GitHub → Create App من المستودع →
   - Builder: Dockerfile، مسار `server/Dockerfile`
   - المتغيرات: `DATABASE_URL` (الصقه من Aiven)، `JWT_SECRET` (نص طويل عشوائي)،
     `CLIENT_ORIGINS` (رابط واجهتك لاحقاً)، `SEED_DEMO=0`، `NODE_ENV=production`
   - بعد الإقلاع نفّذ مرة واحدة (Console داخل Koyeb):
     `npm run migrate` ثم `SEED_DEMO=1 npm run seed`
3. **الواجهة على Cloudflare Pages**: حساب → Pages → ربط المستودع →
   Build: `npm run build` + Output: `dist` + متغير `VITE_API_URL` = رابط الـ API.
4. ارجع لـ Koyeb وحدّث `CLIENT_ORIGINS` برابط Cloudflare، وأعد النشر.
5. ادخل بحساب المدير المؤقت وغيّر كلمته فوراً، ثم احذف حسابات الديمو.

> تنبيه: الخدمات المجانية تنام بعد الخمول (أول فتح بطيء ~30 ثانية) —
> مقبول للتجربة والعرض، لا للزبناء الحقيقيين.

## الخيار 2: Render بنقرة واحدة (قد يتطلب دفعاً للقرص)

## خطوات النشر على Render (مرة واحدة)

1. أنشئ حساباً على https://render.com (واربطه بـ GitHub).
2. من لوحة Render: **New → Blueprint** واختر مستودع `mdfouna-sijilmassa`.
3. سيُنشأ تلقائياً:
   - `sijilmassa-mysql` — قاعدة MySQL بقرص دائم.
   - `mdfouna-sijilmassa` — التطبيق (الواجهة + API في خدمة واحدة).
4. بعد الإقلاع، افتح **Shell** خدمة التطبيق ونفّذ **مرة واحدة**:
   ```sh
   cd /app/server
   SEED_DEMO=1 npm run seed   # يزرع المينيو + حساب مدير مؤقت
   ```
   (الترحيلات تعمل تلقائياً عند كل إقلاع. مستخدم MySQL يُنشأ تلقائياً من إعدادات خدمة القاعدة.)
5. ادخل بحساب المدير المؤقت (`admin@sijilmassa.ma / Admin1234!`)، **غيّر كلمته فوراً** من تبويب الطاقم، وأنشئ حسابات الموظفين الحقيقية، ثم احذف حسابات الديمو.
6. عدّل متغير `CLIENT_ORIGINS` إلى رابط خدمتك:
   `https://mdfouna-sijilmassa.onrender.com`
6. افتح الرابط — الموقع يعمل من أي جهاز 🎉

## ملاحظات الإنتاج

- `JWT_SECRET` مولّد تلقائياً، `SEED_DEMO=0` افتراضياً (بدون حسابات تجريبية).
- قبل الاستعمال الحقيقي: `CONFIRM_PURGE=yes npm run purge-demo` إن وُجدت حسابات ديمو،
  وأدخل بيانات المطعم الحقيقية من لوحة المدير.
- الخطة المجانية تنام بعد الخمول (أول تحميل بطيء) وقرص MySQL مدفوع —
  راجع أسعار Render الحالية.
- بديل MySQL مجاني: Aiven/PlanetScale مع `DATABASE_URL` (الكود يدعمه).

## فحص CI

كل push يشغّل GitHub Actions (بناء الواجهة + فحص السيرفر) — الشارة تظهر في صفحة المستودع.
