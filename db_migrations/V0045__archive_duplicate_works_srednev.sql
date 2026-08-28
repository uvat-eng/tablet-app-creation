UPDATE biotech_works SET archived = TRUE
WHERE guest_id = 40 AND id NOT IN (
  SELECT min(id) FROM biotech_works WHERE guest_id = 40 GROUP BY work_on, qty, unit
);
