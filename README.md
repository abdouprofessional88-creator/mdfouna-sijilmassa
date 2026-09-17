# مدفونة سجلماسة — Mdfouna Sijilmassa

منصة مطعم مغربي في مكناس: موقع فاخر (RTL) + طلبات أونلاين + حجوزات + لوحات موظفين — بbackend حقيقي.

## البنية

- `src/` — واجهة React + Vite (عربية RTL)
- `server/` — API بـ Express + MySQL (`mysql2`)، مصادقة JWT عبر httpOnly cookies
- `server/src/db/migrations/` — ترحيلات SQL مرقّمة (12 حتى الآن)

## التشغيل محلياً

```bat
REM 1) قاعدة البيانات (MySQL 8) — أول مرة فقط
cd server
npm install
copy .env.example .env
REM املأ DB_ROOT_PASSWORD ثم:
node src/db/create.js
npm run migrate
npm run seed
npm start

REM 2) الواجهة (نافذة ثانية، من جذر المشروع)
start-website.bat
```

الموقع: http://localhost:5173 — الـ API: http://localhost:4000

## حسابات التطوير (محلية فقط — تُحذف قبل الإنتاج)

`admin / manager / reception / kitchen / driver / customer` عبر `@sijilmassa.ma`
(راجع `server/README.md`) — ممنوع عرضها في الواجهة.

## قبل الإنتاج

`JWT_SECRET` جديد + كلمة مرور DB قوية + `CONFIRM_PURGE=yes npm run purge-demo`
+ HTTPS + بوابة دفع حقيقية (CMI) + نسخ احتياطي.
