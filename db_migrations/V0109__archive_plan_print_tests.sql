UPDATE t_p51170708_tablet_app_creation.hunt_plan_rows
SET archived = TRUE
WHERE plan_id IN (
  SELECT id FROM t_p51170708_tablet_app_creation.hunt_plans WHERE title LIKE 'ТЕСТ%'
);

UPDATE t_p51170708_tablet_app_creation.hunt_plans
SET archived = TRUE
WHERE title LIKE 'ТЕСТ%';