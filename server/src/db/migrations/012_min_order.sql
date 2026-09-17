-- 012: minimum order amount + delivery hours note (display)
INSERT INTO settings (`key`, `value`) VALUES
  ('min_order_mad', '0'),
  ('delivery_hours_note', 'التوصيل يومياً 12:00 - 23:00 (DEMO)')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
