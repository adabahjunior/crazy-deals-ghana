-- CrazyDeals Ghana Database Schema

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  wallet_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_deposits NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
  store_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_withdrawn NUMERIC(12,2) NOT NULL DEFAULT 0,
  api_key TEXT NOT NULL DEFAULT ('cd_gh_' || encode(extensions.gen_random_bytes(24), 'hex')),
  store_slug TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS data_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network TEXT NOT NULL CHECK (network IN ('mtn', 'airtel-ishare', 'airtel-bigtime', 'telecel')),
  size_gb NUMERIC NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  validity TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('data_purchase', 'wallet_topup', 'store_order', 'withdrawal')),
  network TEXT,
  package_id UUID REFERENCES data_packages(id),
  phone TEXT,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS store_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  network TEXT NOT NULL,
  size_gb NUMERIC NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS store_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  package_label TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  momo_number TEXT NOT NULL,
  momo_network TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS afa_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  id_type TEXT NOT NULL,
  id_number TEXT NOT NULL,
  region TEXT NOT NULL,
  network TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS issue_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL,
  transaction_ref TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, store_slug, api_key)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'store-' || substr(NEW.id::text, 1, 8),
    'cd_gh_' || encode(extensions.gen_random_bytes(24), 'hex')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION purchase_data_package(
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
  v_pkg data_packages%ROWTYPE;
  v_tx_id UUID;
  v_network_label TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_pkg FROM data_packages WHERE id = p_package_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Package not found';
  END IF;

  IF (SELECT wallet_balance FROM profiles WHERE id = v_user_id) < v_pkg.price THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  v_network_label := CASE v_pkg.network
    WHEN 'mtn' THEN 'MTN'
    WHEN 'airtel-ishare' THEN 'AirtelTigo iShare'
    WHEN 'airtel-bigtime' THEN 'AirtelTigo BigTime'
    WHEN 'telecel' THEN 'Telecel'
    ELSE v_pkg.network
  END;

  UPDATE profiles
  SET wallet_balance = wallet_balance - v_pkg.price,
      total_spent = total_spent + v_pkg.price,
      updated_at = now()
  WHERE id = v_user_id;

  INSERT INTO transactions (user_id, type, network, package_id, phone, amount, description, status)
  VALUES (
    v_user_id,
    'data_purchase',
    v_network_label,
    p_package_id,
    p_phone,
    v_pkg.price,
    v_network_label || ' ' || v_pkg.size_gb || 'GB → ' || p_phone,
    'success'
  )
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION topup_wallet(
  p_amount NUMERIC,
  p_method TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tx_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  UPDATE profiles
  SET wallet_balance = wallet_balance + p_amount,
      total_deposits = total_deposits + p_amount,
      updated_at = now()
  WHERE id = v_user_id;

  INSERT INTO transactions (user_id, type, amount, description, status)
  VALUES (
    v_user_id,
    'wallet_topup',
    p_amount,
    'Wallet top up via ' || p_method,
    'success'
  )
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION request_withdrawal(
  p_amount NUMERIC,
  p_momo_number TEXT,
  p_momo_network TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_wd_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount < 10 THEN
    RAISE EXCEPTION 'Minimum withdrawal is GHS 10';
  END IF;

  IF (SELECT store_balance FROM profiles WHERE id = v_user_id) < p_amount THEN
    RAISE EXCEPTION 'Insufficient store balance';
  END IF;

  UPDATE profiles
  SET store_balance = store_balance - p_amount,
      updated_at = now()
  WHERE id = v_user_id;

  INSERT INTO withdrawals (user_id, amount, momo_number, momo_network, status)
  VALUES (v_user_id, p_amount, p_momo_number, p_momo_network, 'pending')
  RETURNING id INTO v_wd_id;

  RETURN v_wd_id;
END;
$$;

CREATE OR REPLACE FUNCTION regenerate_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_key TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_key := 'cd_gh_' || encode(extensions.gen_random_bytes(24), 'hex');

  UPDATE profiles SET api_key = v_key, updated_at = now() WHERE id = v_user_id;

  RETURN v_key;
END;
$$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE afa_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone authenticated reads active packages" ON data_packages;
DROP POLICY IF EXISTS "Users read own transactions" ON transactions;
DROP POLICY IF EXISTS "Users manage own store packages" ON store_packages;
DROP POLICY IF EXISTS "Users read own store orders" ON store_orders;
DROP POLICY IF EXISTS "Users read own withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Users manage own afa registrations" ON afa_registrations;
DROP POLICY IF EXISTS "Users manage own issue reports" ON issue_reports;

CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone authenticated reads active packages" ON data_packages FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Users read own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users manage own store packages" ON store_packages FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users read own store orders" ON store_orders FOR SELECT USING (auth.uid() = store_user_id);

CREATE POLICY "Users read own withdrawals" ON withdrawals FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users manage own afa registrations" ON afa_registrations FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own issue reports" ON issue_reports FOR ALL USING (auth.uid() = user_id);

GRANT EXECUTE ON FUNCTION purchase_data_package TO authenticated;
GRANT EXECUTE ON FUNCTION topup_wallet TO authenticated;
GRANT EXECUTE ON FUNCTION request_withdrawal TO authenticated;
GRANT EXECUTE ON FUNCTION regenerate_api_key TO authenticated;

INSERT INTO data_packages (network, size_gb, price, validity, sort_order)
SELECT * FROM (VALUES
  ('mtn', 1, 4.50, '7 days', 1),
  ('mtn', 2, 8.00, '7 days', 2),
  ('mtn', 3, 11.50, '15 days', 3),
  ('mtn', 5, 18.00, '30 days', 4),
  ('mtn', 10, 32.00, '30 days', 5),
  ('mtn', 15, 45.00, '30 days', 6),
  ('mtn', 20, 58.00, '30 days', 7),
  ('mtn', 50, 130.00, '60 days', 8),
  ('airtel-ishare', 1, 4.00, '7 days', 1),
  ('airtel-ishare', 2, 7.50, '7 days', 2),
  ('airtel-ishare', 3, 10.50, '15 days', 3),
  ('airtel-ishare', 5, 16.50, '30 days', 4),
  ('airtel-ishare', 10, 30.00, '30 days', 5),
  ('airtel-ishare', 15, 42.00, '30 days', 6),
  ('airtel-ishare', 20, 55.00, '30 days', 7),
  ('airtel-bigtime', 5, 15.00, '30 days', 1),
  ('airtel-bigtime', 10, 28.00, '30 days', 2),
  ('airtel-bigtime', 20, 52.00, '30 days', 3),
  ('airtel-bigtime', 30, 72.00, '60 days', 4),
  ('airtel-bigtime', 50, 115.00, '60 days', 5),
  ('airtel-bigtime', 100, 210.00, '90 days', 6),
  ('telecel', 1, 4.20, '7 days', 1),
  ('telecel', 2, 7.80, '7 days', 2),
  ('telecel', 3, 11.00, '15 days', 3),
  ('telecel', 5, 17.00, '30 days', 4),
  ('telecel', 10, 31.00, '30 days', 5),
  ('telecel', 20, 56.00, '30 days', 6)
) AS v(network, size_gb, price, validity, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM data_packages LIMIT 1);
