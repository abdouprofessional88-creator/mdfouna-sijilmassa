-- 004: online ordering — orders, items, configurable product options
CREATE TABLE IF NOT EXISTS product_options (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  scope_type ENUM('category','item','all') NOT NULL DEFAULT 'category',
  scope_value VARCHAR(60) NOT NULL DEFAULT '' COMMENT 'category slug, item id, or empty for all',
  group_label_ar VARCHAR(120) NOT NULL,
  group_label_en VARCHAR(120) NULL,
  selection ENUM('single','multiple') NOT NULL DEFAULT 'single',
  is_required TINYINT(1) NOT NULL DEFAULT 0,
  options_json JSON NOT NULL COMMENT '[{id,label_ar,label_en,price_delta}]',
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  KEY ix_opt_scope (scope_type, scope_value, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(20) NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  order_type ENUM('delivery','pickup') NOT NULL DEFAULT 'delivery',
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  address_line VARCHAR(255) NULL,
  city VARCHAR(80) NULL DEFAULT 'مكناس',
  special_instructions VARCHAR(500) NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  payment_method ENUM('cash','card_demo','online_demo') NOT NULL DEFAULT 'cash',
  payment_status ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  status ENUM('pending','confirmed','preparing','ready','out_for_delivery','completed','cancelled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ord_customer FOREIGN KEY (customer_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE KEY uq_orders_number (order_number),
  KEY ix_orders_customer (customer_id, created_at),
  KEY ix_orders_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  menu_item_id BIGINT UNSIGNED NULL,
  name_ar VARCHAR(150) NOT NULL COMMENT 'snapshot at order time',
  unit_price DECIMAL(10,2) NOT NULL COMMENT 'snapshot incl. options, per unit',
  quantity TINYINT UNSIGNED NOT NULL,
  options_json JSON NULL COMMENT '[{group, label_ar, price_delta}] snapshot',
  item_note VARCHAR(255) NULL,
  CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_oi_item FOREIGN KEY (menu_item_id) REFERENCES menu_items (id) ON DELETE SET NULL,
  KEY ix_oi_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO settings (`key`, `value`) VALUES
  ('delivery_fee_mad', '20'),
  ('free_delivery_over_mad', '200')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
