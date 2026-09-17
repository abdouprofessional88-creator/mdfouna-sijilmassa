-- 007: delivery system — saved addresses, order snapshots, zone config
CREATE TABLE IF NOT EXISTS customer_addresses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  label ENUM('home','work','other') NOT NULL DEFAULT 'home',
  label_note VARCHAR(80) NULL,
  formatted_address VARCHAR(255) NOT NULL,
  street VARCHAR(150) NULL,
  neighborhood VARCHAR(120) NULL,
  city VARCHAR(80) NULL DEFAULT 'مكناس',
  postal_code VARCHAR(20) NULL,
  country VARCHAR(80) NULL DEFAULT 'المغرب',
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  accuracy_m INT NULL,
  delivery_notes VARCHAR(255) NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_addr_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  KEY ix_addr_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- order-level delivery snapshot (history preserved even if saved address changes)
ALTER TABLE orders
  ADD COLUMN delivery_latitude DECIMAL(10,7) NULL AFTER city,
  ADD COLUMN delivery_longitude DECIMAL(10,7) NULL AFTER delivery_latitude,
  ADD COLUMN delivery_notes VARCHAR(500) NULL AFTER delivery_longitude,
  ADD COLUMN delivery_distance_km DECIMAL(8,2) NULL AFTER delivery_notes,
  ADD COLUMN delivery_zone VARCHAR(10) NULL COMMENT 'inside|review' AFTER delivery_distance_km,
  ADD COLUMN delivery_status ENUM('pending','accepted','preparing','ready','out_for_delivery','delivered','failed','cancelled') NOT NULL DEFAULT 'pending' AFTER delivery_zone;

INSERT INTO settings (`key`, `value`) VALUES
  ('restaurant_lat', '33.8935000'),
  ('restaurant_lng', '-5.5473000'),
  ('delivery_max_km', '10'),
  ('delivery_fee_per_km', '2'),
  ('reservation_duration_min', '120'),
  ('service_windows', '12:00-15:00,19:00-23:00')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
