-- 010: payments, workflow statuses, assignments, history, notifications
-- ENUM widening via VARCHAR (MySQL cannot UPDATE to values outside the old enum)
ALTER TABLE orders MODIFY COLUMN status VARCHAR(40) NOT NULL DEFAULT 'pending_payment';
ALTER TABLE orders MODIFY COLUMN payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid';

-- step 1: migrate existing values to the new workflow, then widen enums
UPDATE orders SET status = CASE status
  WHEN 'pending' THEN 'pending_payment'
  WHEN 'confirmed' THEN 'accepted'
  WHEN 'completed' THEN 'delivered'
  ELSE status END
WHERE status IN ('pending','confirmed','completed');

UPDATE orders SET payment_status = 'unpaid' WHERE payment_status = 'pending';

ALTER TABLE orders
  MODIFY COLUMN status ENUM('pending_payment','received','accepted','preparing','ready','assigned_to_driver','out_for_delivery','delivered','cancelled','rejected') NOT NULL DEFAULT 'pending_payment',
  MODIFY COLUMN payment_status ENUM('unpaid','pending','paid','failed','cancelled','refunded','partially_refunded') NOT NULL DEFAULT 'unpaid',
  ADD COLUMN reject_reason VARCHAR(255) NULL AFTER status,
  ADD COLUMN estimated_at DATETIME NULL AFTER reject_reason;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  provider VARCHAR(30) NOT NULL COMMENT 'cash|mock_dev|stripe|cmi',
  provider_payment_id VARCHAR(120) NOT NULL,
  provider_event_id VARCHAR(120) NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'MAD',
  status ENUM('unpaid','pending','paid','failed','cancelled','refunded','partially_refunded') NOT NULL DEFAULT 'pending',
  failure_reason VARCHAR(255) NULL,
  paid_at DATETIME NULL,
  refunded_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pay_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_pay_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE KEY uq_pay_provider_ref (provider, provider_payment_id),
  UNIQUE KEY uq_pay_event (provider, provider_event_id),
  KEY ix_pay_status (status),
  KEY ix_pay_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  changed_by BIGINT UNSIGNED NULL COMMENT 'NULL = system/webhook',
  previous_status VARCHAR(40) NULL,
  new_status VARCHAR(40) NOT NULL,
  reason VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_h_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_h_user FOREIGN KEY (changed_by) REFERENCES users (id) ON DELETE SET NULL,
  KEY ix_h_order (order_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS delivery_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  driver_id BIGINT UNSIGNED NOT NULL,
  status ENUM('assigned','accepted','started','delivered','failed','cancelled') NOT NULL DEFAULT 'assigned',
  failure_reason VARCHAR(255) NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at DATETIME NULL,
  started_at DATETIME NULL,
  delivered_at DATETIME NULL,
  failed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_da_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_da_driver FOREIGN KEY (driver_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE KEY uq_da_order (order_id),
  KEY ix_da_driver (driver_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(40) NOT NULL COMMENT 'order_received|order_ready|assignment|status|payment',
  order_id BIGINT UNSIGNED NULL,
  title VARCHAR(150) NOT NULL,
  message VARCHAR(300) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_n_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_n_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  KEY ix_n_user (user_id, is_read, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO settings (`key`, `value`) VALUES
  ('cash_on_delivery', '1'),
  ('card_enabled', '1')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
