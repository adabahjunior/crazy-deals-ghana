-- Fix signup: profile trigger must set search_path and generate api_key explicitly

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
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
$$;

-- Allow auth system to insert profiles via trigger
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT ON public.profiles TO supabase_auth_admin;

-- Fallback insert policy so authenticated users can create their own profile
DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
CREATE POLICY "Users insert own profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Fix api_key column default for any direct inserts
ALTER TABLE public.profiles
  ALTER COLUMN api_key SET DEFAULT ('cd_gh_' || encode(extensions.gen_random_bytes(24), 'hex'));

-- Fix regenerate_api_key to use extensions schema
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
