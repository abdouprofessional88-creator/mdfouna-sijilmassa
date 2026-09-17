-- 011: payment_method values cash|card (demo placeholders removed)
UPDATE orders SET payment_method = 'cash' WHERE payment_method NOT IN ('cash','card');
ALTER TABLE orders MODIFY COLUMN payment_method ENUM('cash','card') NOT NULL DEFAULT 'cash';
