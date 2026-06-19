-- Promo checkout redemption + sub-agent earnings & catalog sync

DROP FUNCTION IF EXISTS public.place_store_order(TEXT, UUID, TEXT);

ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agent_profit NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sub_agent_earnings NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_earnings NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_promo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS earnings_settled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS parent_agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_approved BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.networks_match(p_catalog_network TEXT, p_display_network TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(p_catalog_network))
    WHEN 'mtn' THEN lower(p_display_network) LIKE '%mtn%'
    WHEN 'telecel' THEN lower(p_display_network) LIKE '%telecel%'
    WHEN 'airtel-ishare' THEN lower(p_display_network) LIKE '%ishare%'
    WHEN 'airtel-bigtime' THEN lower(p_display_network) LIKE '%bigtime%'
    ELSE lower(trim(p_catalog_network)) = lower(trim(p_display_network))
  END;
$$;

CREATE OR REPLACE FUNCTION public.validate_promo_code(
  p_slug TEXT,
  p_code TEXT,
  p_package_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store RECORD;
  v_pkg RECORD;
  v_promo public.promo_codes%ROWTYPE;
  v_code TEXT := upper(trim(p_code));
BEGIN
  IF v_code = '' THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Enter a promo code');
  END IF;

  SELECT id INTO v_store
  FROM public.profiles
  WHERE store_slug = p_slug AND store_published = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Store not found');
  END IF;

  SELECT * INTO v_pkg
  FROM public.store_packages
  WHERE id = p_package_id AND user_id = v_store.id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Package not found');
  END IF;

  SELECT * INTO v_promo
  FROM public.promo_codes
  WHERE agent_id = v_store.id
    AND upper(code) = v_code
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Invalid promo code');
  END IF;

  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at <= now() THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This promo code has expired');
  END IF;

  IF v_promo.redemption_count >= v_promo.max_redemptions THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This promo code has reached its usage limit');
  END IF;

  IF NOT public.networks_match(v_promo.network, v_pkg.network) THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Promo code is for a different network');
  END IF;

  IF v_promo.size_gb <> v_pkg.size_gb THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message',
      format('Promo code is for %sGB, but you selected %sGB', v_promo.size_gb, v_pkg.size_gb)
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'message', 'Promo code applied — this order is free',
    'promo_code_id', v_promo.id,
    'promo_code', v_promo.code,
    'original_amount', v_pkg.price,
    'final_amount', 0,
    'promo_label', public.network_label(v_promo.network) || ' ' || v_promo.size_gb || 'GB FREE'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.place_store_order(
  p_slug TEXT,
  p_package_id UUID,
  p_customer_phone TEXT,
  p_promo_code TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store RECORD;
  v_pkg RECORD;
  v_phone TEXT;
  v_order_id UUID;
  v_amount NUMERIC(10,2);
  v_parent_id UUID;
  v_commission NUMERIC(5,2);
  v_profit NUMERIC(10,2);
  v_sub_earnings NUMERIC(10,2) := 0;
  v_parent_earnings NUMERIC(10,2) := 0;
  v_is_promo BOOLEAN := false;
  v_promo_id UUID;
  v_validation JSONB;
BEGIN
  SELECT id, parent_agent_id, sub_agent_commission_pct
  INTO v_store
  FROM public.profiles
  WHERE store_slug = p_slug AND store_published = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Store not found';
  END IF;

  SELECT * INTO v_pkg
  FROM public.store_packages
  WHERE id = p_package_id AND user_id = v_store.id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Package not found';
  END IF;

  v_phone := public.normalize_ghana_phone(p_customer_phone);
  IF v_phone !~ '^0[235]\d{8}$' THEN
    RAISE EXCEPTION 'Enter a valid Ghana phone number';
  END IF;

  v_amount := v_pkg.price;
  v_profit := COALESCE(v_pkg.profit, 0);
  v_parent_id := v_store.parent_agent_id;
  v_commission := COALESCE(v_store.sub_agent_commission_pct, 0);

  IF p_promo_code IS NOT NULL AND trim(p_promo_code) <> '' THEN
    v_validation := public.validate_promo_code(p_slug, p_promo_code, p_package_id);
    IF NOT (v_validation->>'valid')::boolean THEN
      RAISE EXCEPTION '%', v_validation->>'message';
    END IF;

    v_is_promo := true;
    v_amount := 0;
    v_profit := 0;
    v_sub_earnings := 0;
    v_parent_earnings := 0;
    v_promo_id := (v_validation->>'promo_code_id')::uuid;

    UPDATE public.promo_codes
    SET redemption_count = redemption_count + 1
    WHERE id = v_promo_id;

    INSERT INTO public.promo_redemptions (promo_code_id, customer_phone)
    VALUES (v_promo_id, v_phone);
  ELSIF v_parent_id IS NOT NULL AND v_profit > 0 THEN
    v_sub_earnings := round(v_profit * v_commission / 100, 2);
    v_parent_earnings := round(v_profit - v_sub_earnings, 2);
  END IF;

  INSERT INTO public.store_orders (
    store_user_id,
    customer_phone,
    package_label,
    amount,
    status,
    promo_code_id,
    parent_agent_id,
    agent_profit,
    sub_agent_earnings,
    parent_earnings,
    is_promo
  ) VALUES (
    v_store.id,
    v_phone,
    v_pkg.network || ' ' || v_pkg.size_gb || 'GB',
    v_amount,
    CASE WHEN v_is_promo THEN 'success' ELSE 'pending' END,
    v_promo_id,
    v_parent_id,
    v_profit,
    v_sub_earnings,
    v_parent_earnings,
    v_is_promo
  )
  RETURNING id INTO v_order_id;

  IF v_is_promo THEN
    PERFORM public.settle_store_order_earnings(v_order_id);
  END IF;

  RETURN v_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_store_order_earnings(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.store_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order
  FROM public.store_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND OR v_order.earnings_settled OR v_order.status <> 'success' OR v_order.is_promo THEN
    RETURN;
  END IF;

  IF v_order.parent_agent_id IS NOT NULL THEN
    UPDATE public.profiles
    SET store_balance = store_balance + v_order.sub_agent_earnings,
        updated_at = now()
    WHERE id = v_order.store_user_id;

    UPDATE public.profiles
    SET store_balance = store_balance + v_order.parent_earnings,
        updated_at = now()
    WHERE id = v_order.parent_agent_id;
  ELSE
    UPDATE public.profiles
    SET store_balance = store_balance + v_order.agent_profit,
        updated_at = now()
    WHERE id = v_order.store_user_id;
  END IF;

  UPDATE public.store_orders
  SET earnings_settled = true
  WHERE id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_store_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'success' AND (OLD.status IS DISTINCT FROM 'success') THEN
    PERFORM public.settle_store_order_earnings(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_store_order_settle_earnings ON public.store_orders;
CREATE TRIGGER trg_store_order_settle_earnings
  AFTER UPDATE OF status ON public.store_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.on_store_order_status_change();

CREATE OR REPLACE FUNCTION public.sync_store_packages_from_parent(p_sub_agent_id UUID DEFAULT auth.uid())
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub_agent public.profiles%ROWTYPE;
  v_parent_id UUID;
  v_commission NUMERIC(5,2);
  v_count INT := 0;
  v_parent_pkg RECORD;
  v_sub_profit NUMERIC(10,2);
BEGIN
  SELECT * INTO v_sub_agent FROM public.profiles WHERE id = p_sub_agent_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sub-agent not found';
  END IF;

  v_parent_id := v_sub_agent.parent_agent_id;
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'This account is not linked to a parent agent';
  END IF;

  IF auth.uid() IS NOT NULL
     AND auth.uid() <> p_sub_agent_id
     AND NOT public.is_admin()
     AND auth.uid() <> v_parent_id THEN
    RAISE EXCEPTION 'Not authorized to sync this catalog';
  END IF;

  v_commission := COALESCE(v_sub_agent.sub_agent_commission_pct, 10);

  FOR v_parent_pkg IN
    SELECT * FROM public.store_packages
    WHERE user_id = v_parent_id AND is_active = true
  LOOP
    v_sub_profit := round(COALESCE(v_parent_pkg.profit, 0) * v_commission / 100, 2);

    IF v_parent_pkg.data_package_id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM public.store_packages
         WHERE user_id = p_sub_agent_id AND data_package_id = v_parent_pkg.data_package_id
       ) THEN
      UPDATE public.store_packages
      SET
        network = v_parent_pkg.network,
        size_gb = v_parent_pkg.size_gb,
        base_price = v_parent_pkg.base_price,
        profit = v_sub_profit,
        price = v_parent_pkg.base_price + v_sub_profit,
        is_active = true
      WHERE user_id = p_sub_agent_id AND data_package_id = v_parent_pkg.data_package_id;
    ELSIF EXISTS (
      SELECT 1 FROM public.store_packages
      WHERE user_id = p_sub_agent_id
        AND network = v_parent_pkg.network
        AND size_gb = v_parent_pkg.size_gb
    ) THEN
      UPDATE public.store_packages
      SET
        base_price = v_parent_pkg.base_price,
        profit = v_sub_profit,
        price = v_parent_pkg.base_price + v_sub_profit,
        is_active = true
      WHERE user_id = p_sub_agent_id
        AND network = v_parent_pkg.network
        AND size_gb = v_parent_pkg.size_gb;
    ELSE
      INSERT INTO public.store_packages (
        user_id,
        data_package_id,
        network,
        size_gb,
        base_price,
        profit,
        price,
        is_active
      ) VALUES (
        p_sub_agent_id,
        v_parent_pkg.data_package_id,
        v_parent_pkg.network,
        v_parent_pkg.size_gb,
        v_parent_pkg.base_price,
        v_sub_profit,
        v_parent_pkg.base_price + v_sub_profit,
        true
      );
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_sub_agent_invite(p_invite_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_invite public.sub_agent_invites%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_invite
  FROM public.sub_agent_invites
  WHERE invite_code = lower(trim(p_invite_code)) AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  IF v_invite.parent_agent_id = v_user_id THEN
    RAISE EXCEPTION 'You cannot join your own team';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND parent_agent_id IS NOT NULL) THEN
    RAISE EXCEPTION 'You are already linked to a parent agent';
  END IF;

  UPDATE public.profiles
  SET
    parent_agent_id = v_invite.parent_agent_id,
    sub_agent_commission_pct = v_invite.commission_pct,
    updated_at = now()
  WHERE id = v_user_id;

  UPDATE public.sub_agent_invites
  SET uses_count = uses_count + 1
  WHERE id = v_invite.id;

  PERFORM public.sync_store_packages_from_parent(v_user_id);

  RETURN v_invite.parent_agent_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount NUMERIC,
  p_momo_number TEXT,
  p_momo_network TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_parent_id UUID;
  v_withdrawal_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount < 10 THEN
    RAISE EXCEPTION 'Minimum withdrawal is GHS 10';
  END IF;

  IF (SELECT store_balance FROM public.profiles WHERE id = v_user_id) < p_amount THEN
    RAISE EXCEPTION 'Insufficient store balance';
  END IF;

  SELECT parent_agent_id INTO v_parent_id FROM public.profiles WHERE id = v_user_id;

  UPDATE public.profiles
  SET store_balance = store_balance - p_amount,
      total_withdrawn = total_withdrawn + p_amount,
      updated_at = now()
  WHERE id = v_user_id;

  INSERT INTO public.withdrawals (
    user_id,
    amount,
    momo_number,
    momo_network,
    status,
    parent_agent_id,
    parent_approved
  ) VALUES (
    v_user_id,
    p_amount,
    public.normalize_ghana_phone(p_momo_number),
    p_momo_network,
    'pending',
    v_parent_id,
    v_parent_id IS NULL
  )
  RETURNING id INTO v_withdrawal_id;

  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES (
    v_user_id,
    'withdrawal',
    p_amount,
    'Store withdrawal to ' || p_momo_number,
    'pending'
  );

  RETURN v_withdrawal_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.parent_approve_sub_agent_withdrawal(p_withdrawal_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_withdrawal public.withdrawals%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_withdrawal FROM public.withdrawals WHERE id = p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;

  IF v_withdrawal.parent_agent_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Not authorized to approve this withdrawal';
  END IF;

  UPDATE public.withdrawals
  SET parent_approved = true
  WHERE id = p_withdrawal_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_sub_agent_info()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_parent public.profiles%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  IF v_profile.parent_agent_id IS NULL THEN
    RETURN jsonb_build_object('is_sub_agent', false);
  END IF;

  SELECT * INTO v_parent FROM public.profiles WHERE id = v_profile.parent_agent_id;

  RETURN jsonb_build_object(
    'is_sub_agent', true,
    'parent_id', v_parent.id,
    'parent_name', COALESCE(v_parent.store_name, v_parent.full_name),
    'parent_slug', v_parent.store_slug,
    'commission_pct', v_profile.sub_agent_commission_pct
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_promo_code TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_store_order TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_store_packages_from_parent TO authenticated;
GRANT EXECUTE ON FUNCTION public.parent_approve_sub_agent_withdrawal TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sub_agent_info TO authenticated;
