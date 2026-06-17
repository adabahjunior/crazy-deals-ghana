-- Gamification: points, spin wheel, referrals, redemption

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS points_balance INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS bonus_spin_chances INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_spin_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key ON public.profiles (referral_code)
  WHERE referral_code IS NOT NULL;

UPDATE public.profiles
SET referral_code = lower(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8))
WHERE referral_code IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN referral_code SET DEFAULT lower(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));

CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('referral', 'spin', 'redemption', 'admin_adjustment')),
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  points_awarded INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.spin_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prize_type TEXT NOT NULL CHECK (prize_type IN ('points', 'data')),
  prize_label TEXT NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  data_gb NUMERIC,
  package_id UUID REFERENCES public.data_packages(id),
  phone TEXT,
  transaction_id UUID REFERENCES public.transactions(id),
  claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN (
    'data_purchase', 'wallet_topup', 'store_order', 'withdrawal', 'store_activation',
    'points_redemption', 'spin_reward'
  ));

INSERT INTO public.site_settings (key, value, label) VALUES
  ('gamification_referral_points', '10', 'Referral Signup Points'),
  ('gamification_redemption_points', '100', 'Points Required for 1GB Redemption'),
  ('gamification_spin_interval_days', '25', 'Days Between Free Spins'),
  ('gamification_spin_network', 'mtn', 'Default Network for Spin/Redemption Data'),
  ('gamification_spin_weight_points_5', '70', 'Spin Wheel Weight: 5 Points'),
  ('gamification_spin_weight_points_10', '25', 'Spin Wheel Weight: 10 Points'),
  ('gamification_spin_weight_data', '5', 'Spin Wheel Weight: 1GB Data')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_site_setting_int(p_key TEXT, p_default INTEGER)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(trim(value), '')::INTEGER, p_default)
  FROM public.site_settings
  WHERE key = p_key;
$$;

CREATE OR REPLACE FUNCTION public.get_site_setting_text(p_key TEXT, p_default TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(trim(value), ''), p_default)
  FROM public.site_settings
  WHERE key = p_key;
$$;

CREATE OR REPLACE FUNCTION public.add_points(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount = 0 THEN
    RETURN;
  END IF;

  UPDATE public.profiles
  SET points_balance = points_balance + p_amount,
      updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.point_transactions (user_id, amount, type, description, reference_id)
  VALUES (p_user_id, p_amount, p_type, p_description, p_reference_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.award_referral_points(
  p_referrer_id UUID,
  p_referred_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points INTEGER;
BEGIN
  IF p_referrer_id IS NULL OR p_referred_user_id IS NULL OR p_referrer_id = p_referred_user_id THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_user_id = p_referred_user_id) THEN
    RETURN;
  END IF;

  v_points := public.get_site_setting_int('gamification_referral_points', 10);

  INSERT INTO public.referrals (referrer_id, referred_user_id, points_awarded)
  VALUES (p_referrer_id, p_referred_user_id, v_points);

  PERFORM public.add_points(
    p_referrer_id,
    v_points,
    'referral',
    'Referral signup bonus',
    p_referred_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_ref_code TEXT;
  v_referrer_id UUID;
BEGIN
  v_ref_code := NULLIF(trim(NEW.raw_user_meta_data->>'referral_code'), '');

  IF v_ref_code IS NOT NULL THEN
    SELECT id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = v_ref_code
      AND id <> NEW.id
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, full_name, store_slug, api_key, email, referred_by, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'store-' || substr(NEW.id::text, 1, 8),
    'cd_gh_' || encode(extensions.gen_random_bytes(24), 'hex'),
    NEW.email,
    v_referrer_id,
    lower(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8))
  );

  IF v_referrer_id IS NOT NULL THEN
    PERFORM public.award_referral_points(v_referrer_id, NEW.id);
  END IF;

  RETURN NEW;
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
    NEW.points_balance := OLD.points_balance;
    NEW.referral_code := OLD.referral_code;
    NEW.referred_by := OLD.referred_by;
    NEW.bonus_spin_chances := OLD.bonus_spin_chances;
    NEW.last_spin_at := OLD.last_spin_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_gamification_status()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_interval_days INTEGER;
  v_can_spin BOOLEAN := false;
  v_days_until INTEGER := 0;
  v_next_spin_at TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  v_interval_days := public.get_site_setting_int('gamification_spin_interval_days', 25);

  IF v_profile.bonus_spin_chances > 0 THEN
    v_can_spin := true;
    v_days_until := 0;
  ELSIF v_profile.last_spin_at IS NULL THEN
    v_can_spin := true;
    v_days_until := 0;
  ELSE
    v_next_spin_at := v_profile.last_spin_at + (v_interval_days || ' days')::INTERVAL;
    IF now() >= v_next_spin_at THEN
      v_can_spin := true;
      v_days_until := 0;
    ELSE
      v_can_spin := false;
      v_days_until := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_next_spin_at - now())) / 86400)::INTEGER);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'points_balance', v_profile.points_balance,
    'referral_code', v_profile.referral_code,
    'bonus_spin_chances', v_profile.bonus_spin_chances,
    'can_spin', v_can_spin,
    'days_until_spin', v_days_until,
    'last_spin_at', v_profile.last_spin_at,
    'referral_points', public.get_site_setting_int('gamification_referral_points', 10),
    'redemption_threshold', public.get_site_setting_int('gamification_redemption_points', 100),
    'spin_interval_days', v_interval_days
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.perform_spin()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_interval_days INTEGER;
  v_can_spin BOOLEAN := false;
  v_roll INTEGER;
  v_w5 INTEGER;
  v_w10 INTEGER;
  v_wd INTEGER;
  v_total INTEGER;
  v_prize TEXT;
  v_spin_id UUID;
  v_pkg public.data_packages%ROWTYPE;
  v_network TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  v_interval_days := public.get_site_setting_int('gamification_spin_interval_days', 25);

  IF v_profile.bonus_spin_chances > 0 THEN
    v_can_spin := true;
  ELSIF v_profile.last_spin_at IS NULL OR now() >= v_profile.last_spin_at + (v_interval_days || ' days')::INTERVAL THEN
    v_can_spin := true;
  END IF;

  IF NOT v_can_spin THEN
    RAISE EXCEPTION 'Spin not available yet. Try again in % days.', GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM ((v_profile.last_spin_at + (v_interval_days || ' days')::INTERVAL) - now())) / 86400)::INTEGER
    );
  END IF;

  v_w5 := public.get_site_setting_int('gamification_spin_weight_points_5', 70);
  v_w10 := public.get_site_setting_int('gamification_spin_weight_points_10', 25);
  v_wd := public.get_site_setting_int('gamification_spin_weight_data', 5);
  v_total := GREATEST(v_w5 + v_w10 + v_wd, 1);
  v_roll := floor(random() * v_total)::INTEGER + 1;

  IF v_roll <= v_w5 THEN
    v_prize := 'points_5';
  ELSIF v_roll <= v_w5 + v_w10 THEN
    v_prize := 'points_10';
  ELSE
    v_prize := 'data';
  END IF;

  IF v_profile.bonus_spin_chances > 0 THEN
    UPDATE public.profiles
    SET bonus_spin_chances = bonus_spin_chances - 1,
        updated_at = now()
    WHERE id = v_user_id;
  ELSE
    UPDATE public.profiles
    SET last_spin_at = now(),
        updated_at = now()
    WHERE id = v_user_id;
  END IF;

  IF v_prize = 'points_5' THEN
    PERFORM public.add_points(v_user_id, 5, 'spin', 'Spin wheel: 5 points');

    INSERT INTO public.spin_history (user_id, prize_type, prize_label, points_awarded, claimed)
    VALUES (v_user_id, 'points', '5 Points', 5, true)
    RETURNING id INTO v_spin_id;

    RETURN jsonb_build_object(
      'spin_id', v_spin_id,
      'prize_type', 'points',
      'prize_label', '5 Points',
      'points_awarded', 5,
      'segment_index', 0
    );
  ELSIF v_prize = 'points_10' THEN
    PERFORM public.add_points(v_user_id, 10, 'spin', 'Spin wheel: 10 points');

    INSERT INTO public.spin_history (user_id, prize_type, prize_label, points_awarded, claimed)
    VALUES (v_user_id, 'points', '10 Points', 10, true)
    RETURNING id INTO v_spin_id;

    RETURN jsonb_build_object(
      'spin_id', v_spin_id,
      'prize_type', 'points',
      'prize_label', '10 Points',
      'points_awarded', 10,
      'segment_index', 1
    );
  END IF;

  v_network := public.get_site_setting_text('gamification_spin_network', 'mtn');

  SELECT * INTO v_pkg
  FROM public.data_packages
  WHERE is_active = true
    AND network = v_network
    AND size_gb <= 1
  ORDER BY size_gb DESC, sort_order ASC
  LIMIT 1;

  IF NOT FOUND THEN
  SELECT * INTO v_pkg
  FROM public.data_packages
  WHERE is_active = true
    AND size_gb <= 1
  ORDER BY size_gb DESC, sort_order ASC
  LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    PERFORM public.add_points(v_user_id, 10, 'spin', 'Spin wheel fallback: 10 points (no data package)');

    INSERT INTO public.spin_history (user_id, prize_type, prize_label, points_awarded, claimed)
    VALUES (v_user_id, 'points', '10 Points (fallback)', 10, true)
    RETURNING id INTO v_spin_id;

    RETURN jsonb_build_object(
      'spin_id', v_spin_id,
      'prize_type', 'points',
      'prize_label', '10 Points',
      'points_awarded', 10,
      'segment_index', 1
    );
  END IF;

  INSERT INTO public.spin_history (
    user_id, prize_type, prize_label, data_gb, package_id, claimed
  ) VALUES (
    v_user_id,
    'data',
    v_pkg.size_gb || 'GB Data',
    v_pkg.size_gb,
    v_pkg.id,
    false
  )
  RETURNING id INTO v_spin_id;

  RETURN jsonb_build_object(
    'spin_id', v_spin_id,
    'prize_type', 'data',
    'prize_label', v_pkg.size_gb || 'GB Data',
    'data_gb', v_pkg.size_gb,
    'requires_phone', true,
    'segment_index', 2
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_spin_data_prize(
  p_spin_id UUID,
  p_phone TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_spin public.spin_history%ROWTYPE;
  v_phone TEXT;
  v_network_label TEXT;
  v_enabled TEXT;
  v_tx_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_spin
  FROM public.spin_history
  WHERE id = p_spin_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Spin reward not found';
  END IF;

  IF v_spin.prize_type <> 'data' THEN
    RAISE EXCEPTION 'This spin reward is not a data prize';
  END IF;

  IF v_spin.claimed THEN
    RAISE EXCEPTION 'This spin reward has already been claimed';
  END IF;

  v_phone := public.normalize_ghana_phone(p_phone);
  IF v_phone !~ '^(0[235]\d{8})$' THEN
    RAISE EXCEPTION 'Enter a valid Ghana phone number';
  END IF;

  SELECT public.swiftdata_network_label(network) INTO v_network_label
  FROM public.data_packages
  WHERE id = v_spin.package_id;

  SELECT value INTO v_enabled FROM public.site_settings WHERE key = 'swiftdata_enabled';

  INSERT INTO public.transactions (user_id, type, network, package_id, phone, amount, description, status)
  VALUES (
    v_user_id,
    'spin_reward',
    v_network_label,
    v_spin.package_id,
    v_phone,
    0,
    'Spin wheel reward: ' || v_spin.prize_label || ' → ' || v_phone,
    CASE WHEN COALESCE(v_enabled, 'false') = 'true' THEN 'processing' ELSE 'success' END
  )
  RETURNING id INTO v_tx_id;

  UPDATE public.spin_history
  SET claimed = true,
      phone = v_phone,
      transaction_id = v_tx_id
  WHERE id = p_spin_id;

  RETURN v_tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_points_for_data(
  p_network TEXT,
  p_phone TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_points INTEGER;
  v_threshold INTEGER;
  v_pkg public.data_packages%ROWTYPE;
  v_phone TEXT;
  v_network_label TEXT;
  v_enabled TEXT;
  v_tx_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_threshold := public.get_site_setting_int('gamification_redemption_points', 100);

  SELECT points_balance INTO v_points
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_points < v_threshold THEN
    RAISE EXCEPTION 'You need at least % points to redeem 1GB data', v_threshold;
  END IF;

  SELECT * INTO v_pkg
  FROM public.data_packages
  WHERE is_active = true
    AND network = p_network
    AND size_gb = 1
  ORDER BY sort_order ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active 1GB package found for this network';
  END IF;

  v_phone := public.normalize_ghana_phone(p_phone);
  IF v_phone !~ '^(0[235]\d{8})$' THEN
    RAISE EXCEPTION 'Enter a valid Ghana phone number';
  END IF;

  UPDATE public.profiles
  SET points_balance = points_balance - v_threshold,
      updated_at = now()
  WHERE id = v_user_id;

  INSERT INTO public.point_transactions (user_id, amount, type, description)
  VALUES (v_user_id, -v_threshold, 'redemption', 'Redeemed ' || v_threshold || ' points for 1GB data');

  v_network_label := public.swiftdata_network_label(v_pkg.network);
  SELECT value INTO v_enabled FROM public.site_settings WHERE key = 'swiftdata_enabled';

  INSERT INTO public.transactions (user_id, type, network, package_id, phone, amount, description, status)
  VALUES (
    v_user_id,
    'points_redemption',
    v_network_label,
    v_pkg.id,
    v_phone,
    0,
    'Points redemption: 1GB ' || v_network_label || ' → ' || v_phone,
    CASE WHEN COALESCE(v_enabled, 'false') = 'true' THEN 'processing' ELSE 'success' END
  )
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_spin_chances(
  p_user_id UUID,
  p_count INTEGER,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
BEGIN
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_count IS NULL OR p_count <= 0 THEN
    RAISE EXCEPTION 'Count must be greater than zero';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  UPDATE public.profiles
  SET bonus_spin_chances = bonus_spin_chances + p_count,
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_adjust_points(
  p_user_id UUID,
  p_amount INTEGER,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_description TEXT;
BEGIN
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'Amount must not be zero';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  v_description := COALESCE(NULLIF(trim(p_note), ''), 'Admin points adjustment');

  PERFORM public.add_points(p_user_id, p_amount, 'admin_adjustment', v_description);
END;
$$;

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spin_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own point transactions" ON public.point_transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users read own referrals" ON public.referrals
  FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR public.is_admin());

CREATE POLICY "Users read own spin history" ON public.spin_history
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

GRANT EXECUTE ON FUNCTION public.get_gamification_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.perform_spin TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_spin_data_prize TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_points_for_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_spin_chances TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_points TO authenticated;
