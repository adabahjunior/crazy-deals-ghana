-- Protect store_slug and store_published from direct user updates (use create_or_update_store RPC)

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    NEW.store_slug := OLD.store_slug;
    NEW.store_published := OLD.store_published;
  END IF;

  RETURN NEW;
END;
$$;
