-- 003: restaurant settings (key-value, edited from staff dashboard)
CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(80) PRIMARY KEY,
  `value` TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO settings (`key`, `value`) VALUES
  ('display_name', 'مدفونة سجلماسة'),
  ('phone_primary', '05.35.46.92.04'),
  ('address_note', 'Lot 431، الرياض الإسماعيلية، عناسي، مكناس (يحتاج تأكيد المالك)'),
  ('opening_hours_note', 'يومياً — تُحدد أوقات العمل الرسمية لاحقاً (DEMO)'),
  ('reservation_notice', 'الحجز حالياً عبر الهاتف المباشر.')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
