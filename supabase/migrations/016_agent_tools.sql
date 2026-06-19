-- Agent tools: promo codes, sub-agents, email campaigns, agent settings

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS parent_agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sub_agent_commission_pct NUMERIC(5,2) NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS agent_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS profiles_parent_agent_id_idx ON public.profiles (parent_agent_id)
  WHERE parent_agent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  network TEXT NOT NULL,
  size_gb NUMERIC NOT NULL,
  max_redemptions INT NOT NULL DEFAULT 1 CHECK (max_redemptions > 0),
  redemption_count INT NOT NULL DEFAULT 0 CHECK (redemption_count >= 0),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agent_id, code)
);

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sub_agent_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  label TEXT,
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 10 CHECK (commission_pct >= 0 AND commission_pct <= 100),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  uses_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  recipient_count INT NOT NULL DEFAULT 0 CHECK (recipient_count >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

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
    NEW.parent_agent_id := OLD.parent_agent_id;
    NEW.sub_agent_commission_pct := OLD.sub_agent_commission_pct;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_agent_settings(p_settings JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_current JSONB;
  v_merged JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT agent_settings INTO v_current FROM public.profiles WHERE id = v_user_id;
  v_merged := COALESCE(v_current, '{}'::jsonb) || COALESCE(p_settings, '{}'::jsonb);

  UPDATE public.profiles
  SET agent_settings = v_merged, updated_at = now()
  WHERE id = v_user_id;

  RETURN v_merged;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_promo_codes(
  p_count INT,
  p_network TEXT,
  p_size_gb NUMERIC,
  p_prefix TEXT DEFAULT 'CD',
  p_max_redemptions INT DEFAULT 1,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS SETOF public.promo_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_i INT;
  v_code TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_count < 1 OR p_count > 100 THEN
    RAISE EXCEPTION 'Generate between 1 and 100 codes at a time';
  END IF;

  IF p_size_gb <= 0 THEN
    RAISE EXCEPTION 'Data size must be greater than zero';
  END IF;

  FOR v_i IN 1..p_count LOOP
    v_code := upper(trim(p_prefix)) || '-' || upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 6));
    RETURN QUERY
    INSERT INTO public.promo_codes (
      agent_id, code, network, size_gb, max_redemptions, expires_at
    ) VALUES (
      v_user_id, v_code, p_network, p_size_gb, GREATEST(p_max_redemptions, 1), p_expires_at
    )
    RETURNING *;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_promo_code(p_code_id UUID, p_active BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.promo_codes
  SET is_active = p_active
  WHERE id = p_code_id AND agent_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Promo code not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_sub_agent_invite(
  p_label TEXT DEFAULT NULL,
  p_commission_pct NUMERIC DEFAULT 10
)
RETURNS public.sub_agent_invites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_code TEXT;
  v_row public.sub_agent_invites;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_commission_pct < 0 OR p_commission_pct > 100 THEN
    RAISE EXCEPTION 'Commission must be between 0 and 100';
  END IF;

  v_code := 'sa-' || lower(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 10));

  INSERT INTO public.sub_agent_invites (parent_agent_id, invite_code, label, commission_pct)
  VALUES (v_user_id, v_code, NULLIF(trim(p_label), ''), p_commission_pct)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_sub_agent_invite(p_invite_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.sub_agent_invites
  SET status = 'revoked'
  WHERE id = p_invite_id AND parent_agent_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;
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

  RETURN v_invite.parent_agent_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_sub_agent(p_sub_agent_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.profiles
  SET parent_agent_id = NULL, updated_at = now()
  WHERE id = p_sub_agent_id AND parent_agent_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sub-agent not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_sub_agent_commission(
  p_sub_agent_id UUID,
  p_commission_pct NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_commission_pct < 0 OR p_commission_pct > 100 THEN
    RAISE EXCEPTION 'Commission must be between 0 and 100';
  END IF;

  UPDATE public.profiles
  SET sub_agent_commission_pct = p_commission_pct, updated_at = now()
  WHERE id = p_sub_agent_id AND parent_agent_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sub-agent not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_email_campaign(
  p_subject TEXT,
  p_body TEXT,
  p_recipient_count INT DEFAULT 0
)
RETURNS public.email_campaigns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_row public.email_campaigns;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF trim(p_subject) = '' OR trim(p_body) = '' THEN
    RAISE EXCEPTION 'Subject and message are required';
  END IF;

  INSERT INTO public.email_campaigns (agent_id, subject, body, recipient_count)
  VALUES (v_user_id, trim(p_subject), trim(p_body), GREATEST(p_recipient_count, 0))
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_email_campaign(p_campaign_id UUID)
RETURNS public.email_campaigns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_row public.email_campaigns;
  v_smtp JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT agent_settings->'email' INTO v_smtp FROM public.profiles WHERE id = v_user_id;

  IF v_smtp IS NULL OR COALESCE(v_smtp->>'host', '') = '' THEN
    RAISE EXCEPTION 'Configure SMTP settings before sending campaigns';
  END IF;

  UPDATE public.email_campaigns
  SET status = 'sent', sent_at = now()
  WHERE id = p_campaign_id AND agent_id = v_user_id AND status = 'draft'
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found or already sent';
  END IF;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_sub_agent_ids(p_parent_id UUID DEFAULT auth.uid())
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE parent_agent_id = p_parent_id;
$$;

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_agent_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents manage own promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Admins read all promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Agents read own promo redemptions" ON public.promo_redemptions;
DROP POLICY IF EXISTS "Admins read all promo redemptions" ON public.promo_redemptions;
DROP POLICY IF EXISTS "Agents manage own sub-agent invites" ON public.sub_agent_invites;
DROP POLICY IF EXISTS "Admins read all sub-agent invites" ON public.sub_agent_invites;
DROP POLICY IF EXISTS "Agents manage own email campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Admins read all email campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Admins manage all withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Parent agents read sub-agent withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Parent agents read sub-agent store orders" ON public.store_orders;

CREATE POLICY "Agents manage own promo codes" ON public.promo_codes
  FOR ALL TO authenticated
  USING (agent_id = auth.uid() OR public.is_admin())
  WITH CHECK (agent_id = auth.uid() OR public.is_admin());

CREATE POLICY "Agents read own promo redemptions" ON public.promo_redemptions
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.promo_codes pc
      WHERE pc.id = promo_code_id AND pc.agent_id = auth.uid()
    )
  );

CREATE POLICY "Agents manage own sub-agent invites" ON public.sub_agent_invites
  FOR ALL TO authenticated
  USING (parent_agent_id = auth.uid() OR public.is_admin())
  WITH CHECK (parent_agent_id = auth.uid() OR public.is_admin());

CREATE POLICY "Agents manage own email campaigns" ON public.email_campaigns
  FOR ALL TO authenticated
  USING (agent_id = auth.uid() OR public.is_admin())
  WITH CHECK (agent_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins manage all withdrawals" ON public.withdrawals
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Parent agents read sub-agent withdrawals" ON public.withdrawals
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = withdrawals.user_id AND p.parent_agent_id = auth.uid()
    )
  );

CREATE POLICY "Parent agents read sub-agent store orders" ON public.store_orders
  FOR SELECT TO authenticated
  USING (
    store_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = store_orders.store_user_id AND p.parent_agent_id = auth.uid()
    )
  );

GRANT EXECUTE ON FUNCTION public.update_agent_settings TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_promo_codes TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_promo_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sub_agent_invite TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_sub_agent_invite TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_sub_agent_invite TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_sub_agent TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_sub_agent_commission TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_email_campaign TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_email_campaign TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sub_agent_ids TO authenticated;
