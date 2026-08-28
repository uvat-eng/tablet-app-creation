ALTER TABLE house_expenses ADD COLUMN IF NOT EXISTS facility VARCHAR(24) DEFAULT 'house';
UPDATE house_expenses SET facility = 'house' WHERE facility IS NULL;
CREATE INDEX IF NOT EXISTS idx_house_exp_facility ON house_expenses(facility);
