-- Drop legacy single price column; user_price and agent_price are canonical
ALTER TABLE public.data_packages DROP COLUMN IF EXISTS price;
