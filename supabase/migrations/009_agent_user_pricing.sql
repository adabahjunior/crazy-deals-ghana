-- Agent vs User pricing, store activation fee

ALTER TABLE public.data_packages
  ADD COLUMN IF NOT EXISTS user_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS agent_price NUMERIC(10,2);

UPDATE public.data_packages
SET user_price = COALESCE(user_price, price),
    agent_price = COALESCE(agent_price, price)
WHERE user_price IS NULL OR agent_price IS NULL;

ALTER TABLE public.data_packages
  ALTER COLUMN user_price SET NOT NULL,
  ALTER COLUMN agent_price SET NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS store_activation_paid BOOLEAN NOT NULL DEFAULT false;

UPDATE public.profiles
SET store_activation_paid = true
WHERE store_published = true;

INSERT INTO public.site_settings (key, value, label) VALUES
  ('store_activation_enabled', 'false', 'Store Activation Fee Enabled'),
  ('store_activation_cost', '50', 'Store Activation Cost (GHS)')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('data_purchase', 'wallet_topup', 'store_order', 'withdrawal', 'store_activation'));

CREATE OR REPLACE FUNCTION public.get_effective_package_price(p_pkg public.data_packages, p_user_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN (SELECT store_published FROM public.profiles WHERE id = p_user_id)
    THEN p_pkg.agent_price
    ELSE p_pkg.user_price
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_store_activation_info()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_enabled TEXT;
  v_cost TEXT;
  v_paid BOOLEAN;
  v_published BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT value INTO v_enabled FROM site_settings WHERE key = 'store_activation_enabled';
  SELECT value INTO v_cost FROM site_settings WHERE key = 'store_activation_cost';
  SELECT store_activation_paid, store_published INTO v_paid, v_published
  FROM profiles WHERE id = v_user_id;

  RETURN json_build_object(
    'enabled', COALESCE(v_enabled, 'false') = 'true',
    'cost', COALESCE(NULLIF(trim(v_cost), '')::numeric, 0),
    'paid', COALESCE(v_paid, false) OR COALESCE(v_published, false),
    'is_agent', COALESCE(v_published, false)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_or_update_store(
  p_store_name TEXT,
  p_whatsapp TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_slug TEXT;
  v_whatsapp TEXT;
  v_published BOOLEAN;
  v_paid BOOLEAN;
  v_enabled TEXT;
  v_cost NUMERIC;
  v_balance NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF trim(p_store_name) = '' THEN
    RAISE EXCEPTION 'Store name is required';
  END IF;

  v_whatsapp := regexp_replace(trim(p_whatsapp), '\s', '', 'g');
  IF v_whatsapp !~ '^(0[235]\d{8}|233[235]\d{8})$' THEN
    RAISE EXCEPTION 'Enter a valid Ghana WhatsApp number';
  END IF;

  IF v_whatsapp ~ '^233' THEN
    v_whatsapp := '0' || substr(v_whatsapp, 4);
  END IF;

  SELECT store_slug, store_published, store_activation_paid, wallet_balance
  INTO v_slug, v_published, v_paid, v_balance
  FROM public.profiles WHERE id = v_user_id;

  IF NOT COALESCE(v_published, false) AND NOT COALESCE(v_paid, false) THEN
    SELECT value INTO v_enabled FROM site_settings WHERE key = 'store_activation_enabled';
    IF COALESCE(v_enabled, 'false') = 'true' THEN
      SELECT COALESCE(NULLIF(trim(value), '')::numeric, 0) INTO v_cost
      FROM site_settings WHERE key = 'store_activation_cost';

      IF v_cost > 0 THEN
        IF v_balance < v_cost THEN
          RAISE EXCEPTION 'Insufficient wallet balance. Store activation costs GHS %', v_cost;
        END IF;

        UPDATE public.profiles
        SET wallet_balance = wallet_balance - v_cost,
            total_spent = total_spent + v_cost,
            store_activation_paid = true,
            updated_at = now()
        WHERE id = v_user_id;

        INSERT INTO public.transactions (user_id, type, amount, description, status)
        VALUES (
          v_user_id,
          'store_activation',
          v_cost,
          'Store activation fee — ' || trim(p_store_name),
          'success'
        );
      ELSE
        UPDATE public.profiles
        SET store_activation_paid = true, updated_at = now()
        WHERE id = v_user_id;
      END IF;
    END IF;
  END IF;

  IF v_slug IS NULL THEN
    v_slug := public.generate_unique_store_slug(p_store_name, v_user_id);
  END IF;

  UPDATE public.profiles
  SET
    store_name = trim(p_store_name),
    store_whatsapp = v_whatsapp,
    store_slug = v_slug,
    store_published = true,
    store_activation_paid = true,
    updated_at = now()
  WHERE id = v_user_id;

  RETURN v_slug;
END;
$$;

CREATE OR REPLACE FUNCTION public.purchase_data_package(
  p_package_id UUID,
  p_phone TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_pkg public.data_packages%ROWTYPE;
  v_price NUMERIC;
  v_tx_id UUID;
  v_network_label TEXT;
  v_role_label TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_pkg FROM public.data_packages WHERE id = p_package_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Package not found';
  END IF;

  v_price := public.get_effective_package_price(v_pkg, v_user_id);

  IF (SELECT wallet_balance FROM public.profiles WHERE id = v_user_id) < v_price THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  v_role_label := CASE
    WHEN (SELECT store_published FROM public.profiles WHERE id = v_user_id) THEN 'Agent'
    ELSE 'User'
  END;

  v_network_label := CASE v_pkg.network
    WHEN 'mtn' THEN 'MTN'
    WHEN 'airtel-ishare' THEN 'AirtelTigo iShare'
    WHEN 'airtel-bigtime' THEN 'AirtelTigo BigTime'
    WHEN 'telecel' THEN 'Telecel'
    ELSE v_pkg.network
  END;

  UPDATE public.profiles
  SET wallet_balance = wallet_balance - v_price,
      total_spent = total_spent + v_price,
      updated_at = now()
  WHERE id = v_user_id;

  INSERT INTO transactions (user_id, type, network, package_id, phone, amount, description, status)
  VALUES (
    v_user_id,
    'data_purchase',
    v_network_label,
    p_package_id,
    p_phone,
    v_price,
    v_network_label || ' ' || v_pkg.size_gb || 'GB → ' || p_phone || ' (' || v_role_label || ' rate)',
    'success'
  )
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

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
    NEW.store_activation_paid := OLD.store_activation_paid;
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_store_activation_info TO authenticated;
