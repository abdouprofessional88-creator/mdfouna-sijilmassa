-- 005: dish availability modes + reservation occasion visibility
ALTER TABLE menu_items
  ADD COLUMN availability_mode ENUM('all_day','lunch','dinner','preorder') NOT NULL DEFAULT 'all_day'
  AFTER is_available;

-- sensible demo defaults (owner can change from dashboard)
UPDATE menu_items SET availability_mode = 'preorder' WHERE image_key = 'tanjia';
UPDATE menu_items SET availability_mode = 'lunch' WHERE image_key = 'couscous';
