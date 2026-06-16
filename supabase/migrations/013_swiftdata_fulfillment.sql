-- SwiftData GH API fulfillment (edge function handles HTTP)

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_status_check
  CHECK (status IN ('pending', 'processing', 'success', 'failed'));

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS provider_order_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_status TEXT,
  ADD COLUMN IF NOT EXISTS provider_error TEXT;

INSERT INTO public.site_settings (key, value, label) VALUES
  ('swiftdata_enabled', 'true', 'SwiftData API Enabled'),
  ('swiftdata_api_key', '', 'SwiftData API Key'),
  ('swiftdata_api_url', 'https://lsocdjpflecduumopijn.supabase.co/functions/v1/developer-api/buy', 'SwiftData Buy URL')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.swiftdata_network_label(p_network TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_network
    WHEN 'mtn' THEN 'MTN'
    WHEN 'telecel' THEN 'Telecel'
    WHEN 'airtel-ishare' THEN 'AirtelTigo iShare'
    WHEN 'airtel-bigtime' THEN 'AirtelTigo BigTime'
    ELSE p_network
  END;
$$;

CREATE OR REPLACE FUNCTION public.swiftdata_package_size(p_size_gb NUMERIC)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_size_gb = trunc(p_size_gb) THEN trunc(p_size_gb)::text || 'GB'
    ELSE trim(to_char(p_size_gb, 'FM999999990.9')) || 'GB'
  END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_ghana_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_phone TEXT := regexp_replace(trim(p_phone), '\s', '', 'g');
BEGIN
  IF v_phone ~ '^233' THEN
    v_phone := '0' || substr(v_phone, 4);
  END IF;
  RETURN v_phone;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_failed_purchase(p_tx_id UUID, p_error TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx public.transactions%ROWTYPE;
BEGIN
  SELECT * INTO v_tx FROM public.transactions WHERE id = p_tx_id FOR UPDATE;
  IF NOT FOUND OR v_tx.status IN ('success', 'failed') THEN
    RETURN;
  END IF;

  UPDATE public.profiles
  SET wallet_balance = wallet_balance + v_tx.amount,
      total_spent = GREATEST(total_spent - v_tx.amount, 0),
      updated_at = now()
  WHERE id = v_tx.user_id;

  UPDATE public.transactions
  SET status = 'failed',
      provider_error = COALESCE(p_error, provider_error),
      description = COALESCE(description, '') || ' [Refunded]'
  WHERE id = p_tx_id;
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
  v_phone TEXT;
  v_enabled TEXT;
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

  v_phone := public.normalize_ghana_phone(p_phone);
  IF v_phone !~ '^(0[235]\d{8})$' THEN
    RAISE EXCEPTION 'Enter a valid Ghana phone number';
  END IF;

  v_role_label := CASE
    WHEN (SELECT store_published FROM public.profiles WHERE id = v_user_id) THEN 'Agent'
    ELSE 'User'
  END;

  v_network_label := public.swiftdata_network_label(v_pkg.network);

  UPDATE public.profiles
  SET wallet_balance = wallet_balance - v_price,
      total_spent = total_spent + v_price,
      updated_at = now()
  WHERE id = v_user_id;

  SELECT value INTO v_enabled FROM site_settings WHERE key = 'swiftdata_enabled';

  INSERT INTO transactions (user_id, type, network, package_id, phone, amount, description, status)
  VALUES (
    v_user_id,
    'data_purchase',
    v_network_label,
    p_package_id,
    v_phone,
    v_price,
    v_network_label || ' ' || v_pkg.size_gb || 'GB → ' || v_phone || ' (' || v_role_label || ' rate)',
    CASE WHEN COALESCE(v_enabled, 'false') = 'true' THEN 'processing' ELSE 'success' END
  )
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

DROP POLICY IF EXISTS "Anyone reads site settings" ON public.site_settings;
CREATE POLICY "Read site settings" ON public.site_settings
  FOR SELECT TO authenticated
  USING (public.is_admin() OR key NOT IN ('swiftdata_api_key'));
