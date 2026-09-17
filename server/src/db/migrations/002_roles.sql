-- 002: add manager role (admin > manager > staff > customer)
ALTER TABLE users MODIFY COLUMN role ENUM('customer','staff','manager','admin') NOT NULL DEFAULT 'customer';
