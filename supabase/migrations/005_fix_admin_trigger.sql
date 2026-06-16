-- Fix: allow admin flag updates from SQL/service context (auth.uid() is null)
-- while still blocking regular users from self-escalation

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role, migrations, and Supabase SQL editor have no auth.uid()
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_admin() THEN
    NEW.is_admin := OLD.is_admin;
    NEW.wallet_balance := OLD.wallet_balance;
    NEW.total_deposits := OLD.total_deposits;
    NEW.total_spent := OLD.total_spent;
    NEW.store_balance := OLD.store_balance;
    NEW.total_withdrawn := OLD.total_withdrawn;
    NEW.api_key := OLD.api_key;
    NEW.email := OLD.email;
  END IF;

  RETURN NEW;
END;
$$;

UPDATE public.profiles
SET is_admin = true, updated_at = now()
WHERE email = 'adabahjunior@gmail.com';
