-- 008: drop uq_res_slot — it wrongly blocks rebooking after cancellation.
-- Double-booking is prevented by the overlap engine (availabilityService)
-- + table-row locking, not by this unique key.
ALTER TABLE reservations DROP INDEX uq_res_slot;
