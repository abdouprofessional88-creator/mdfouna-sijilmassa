-- 006: duplicate reservation prevention (same customer + date + time)
ALTER TABLE reservations
  ADD UNIQUE KEY uq_res_slot (customer_id, reservation_date, start_time);
