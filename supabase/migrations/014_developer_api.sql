-- Developer API: external reference idempotency + service purchase RPC

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS external_reference TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_external_ref_unique
  ON public.transactions (user_id, external_reference)
  WHERE external_reference IS NOT NULL;

CREATE OR REPLACE FUNCTION public.api_purchase_data_package(
  p_user_id UUID,
  p_package_id UUID,
  p_phone TEXT,
  p_request_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_pkg public.data_packages%ROWTYPE;
  v_price NUMERIC;
  v_tx_id UUID;
  v_network_label TEXT;
  v_role_label TEXT;
  v_phone TEXT;
  v_enabled TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User id required';
  END IF;

  IF p_request_id IS NOT NULL AND trim(p_request_id) <> '' THEN
    SELECT id INTO v_tx_id
    FROM public.transactions
    WHERE user_id = p_user_id AND external_reference = trim(p_request_id);

    IF FOUND THEN
      RETURN v_tx_id;
    END IF;
  END IF;

  SELECT * INTO v_pkg FROM public.data_packages WHERE id = p_package_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Package not found';
  END IF;

  v_price := public.get_effective_package_price(v_pkg, p_user_id);

  IF (SELECT wallet_balance FROM public.profiles WHERE id = p_user_id) < v_price THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  v_phone := public.normalize_ghana_phone(p_phone);
  IF v_phone !~ '^(0[235]\d{8})$' THEN
    RAISE EXCEPTION 'Enter a valid Ghana phone number';
  END IF;

  v_role_label := CASE
    WHEN (SELECT store_published FROM public.profiles WHERE id = p_user_id) THEN 'Agent'
    ELSE 'User'
  END;

  v_network_label := public.swiftdata_network_label(v_pkg.network);

  UPDATE public.profiles
  SET wallet_balance = wallet_balance - v_price,
      total_spent = total_spent + v_price,
      updated_at = now()
  WHERE id = p_user_id;

  SELECT value INTO v_enabled FROM site_settings WHERE key = 'swiftdata_enabled';

  INSERT INTO transactions (
    user_id, type, network, package_id, phone, amount, description, status, external_reference
  ) VALUES (
    p_user_id,
    'data_purchase',
    v_network_label,
    p_package_id,
    v_phone,
    v_price,
    v_network_label || ' ' || v_pkg.size_gb || 'GB → ' || v_phone || ' (API ' || v_role_label || ' rate)',
    CASE WHEN COALESCE(v_enabled, 'false') = 'true' THEN 'processing' ELSE 'success' END,
    NULLIF(trim(p_request_id), '')
  )
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.api_purchase_data_package TO service_role;
