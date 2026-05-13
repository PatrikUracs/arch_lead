-- Phase A: new columns on submissions
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS design_budget_huf    text,
  ADD COLUMN IF NOT EXISTS fitout_planned       boolean,
  ADD COLUMN IF NOT EXISTS fitout_budget_huf    text,
  ADD COLUMN IF NOT EXISTS project_type         text,
  ADD COLUMN IF NOT EXISTS room_count           integer,
  ADD COLUMN IF NOT EXISTS offer_direction      jsonb;

-- Phase A: new columns on designers
ALTER TABLE designers
  ADD COLUMN IF NOT EXISTS pricing_hourly          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pricing_flat            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pricing_minimum         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pricing_m2              boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pricing_hourly_rate     integer,
  ADD COLUMN IF NOT EXISTS pricing_flat_rate       integer,
  ADD COLUMN IF NOT EXISTS pricing_minimum_amount  integer,
  ADD COLUMN IF NOT EXISTS pricing_m2_rate         integer,
  ADD COLUMN IF NOT EXISTS market_positioning      text;
