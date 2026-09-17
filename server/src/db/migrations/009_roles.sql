-- 009: six-role system + account activation flag
-- step 1: widen enum to include new roles (keeps legacy 'staff' valid for now)
ALTER TABLE users
  MODIFY COLUMN role ENUM('customer','staff','receptionist','kitchen_staff','delivery_driver','manager','admin') NOT NULL DEFAULT 'customer';

-- step 2: migrate legacy staff accounts
UPDATE users SET role = 'receptionist' WHERE role = 'staff';

-- step 3: final enum + activation flag
ALTER TABLE users
  MODIFY COLUMN role ENUM('customer','receptionist','kitchen_staff','delivery_driver','manager','admin') NOT NULL DEFAULT 'customer',
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER role;
