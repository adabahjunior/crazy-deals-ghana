-- Admin dashboard schema

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill emails from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  label TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'alert')),
  created_by UUID REFERENCES public.profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_dismissals (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, notification_id)
);

INSERT INTO public.site_settings (key, value, label) VALUES
  ('site_name', 'CrazyDeals Ghana', 'Site Name'),
  ('support_email', 'support@crazydeals.gh', 'Support Email'),
  ('support_phone', '0244123456', 'Support Phone'),
  ('maintenance_mode', 'false', 'Maintenance Mode'),
  ('min_wallet_topup', '5', 'Minimum Wallet Top-up (GHS)'),
  ('announcement_banner', '', 'Announcement Banner')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, store_slug, api_key, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'store-' || substr(NEW.id::text, 1, 8),
    'cd_gh_' || encode(extensions.gen_random_bytes(24), 'hex'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage packages" ON data_packages;
DROP POLICY IF EXISTS "Admins read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins update all profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone reads site settings" ON site_settings;
DROP POLICY IF EXISTS "Admins manage site settings" ON site_settings;
DROP POLICY IF EXISTS "Admins manage notifications" ON notifications;
DROP POLICY IF EXISTS "Users read active notifications" ON notifications;
DROP POLICY IF EXISTS "Users manage own dismissals" ON notification_dismissals;
DROP POLICY IF EXISTS "Admins read all transactions" ON transactions;

CREATE POLICY "Admins manage packages" ON data_packages
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins read all profiles" ON profiles
  FOR SELECT TO authenticated
  USING (public.is_admin() OR auth.uid() = id);

CREATE POLICY "Admins update all profiles" ON profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR auth.uid() = id)
  WITH CHECK (public.is_admin() OR auth.uid() = id);

CREATE POLICY "Anyone reads site settings" ON site_settings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage site settings" ON site_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins manage notifications" ON notifications
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users read active notifications" ON notifications
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY "Users manage own dismissals" ON notification_dismissals
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all transactions" ON transactions
  FOR SELECT TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);
