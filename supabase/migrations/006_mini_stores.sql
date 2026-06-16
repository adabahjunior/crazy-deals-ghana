-- Mini store fields and public store APIs

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS store_name TEXT,
  ADD COLUMN IF NOT EXISTS store_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS store_published BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_store_slug_unique
  ON public.profiles (store_slug)
  WHERE store_slug IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_unique_store_slug(p_base TEXT, p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_slug TEXT;
  v_candidate TEXT;
  v_counter INT := 0;
BEGIN
  v_slug := lower(regexp_replace(trim(p_base), '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);

  IF v_slug = '' OR length(v_slug) < 3 THEN
    v_slug := 'store-' || substr(p_user_id::text, 1, 8);
  END IF;

  v_candidate := v_slug;

  WHILE EXISTS (
    SELECT 1 FROM public.profiles
    WHERE store_slug = v_candidate AND id <> p_user_id
  ) LOOP
    v_counter := v_counter + 1;
    v_candidate := v_slug || '-' || v_counter;
  END LOOP;

  RETURN v_candidate;
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

  SELECT store_slug INTO v_slug FROM public.profiles WHERE id = v_user_id;

  IF v_slug IS NULL THEN
    v_slug := public.generate_unique_store_slug(p_store_name, v_user_id);
  END IF;

  UPDATE public.profiles
  SET
    store_name = trim(p_store_name),
    store_whatsapp = v_whatsapp,
    store_slug = v_slug,
    store_published = true,
    updated_at = now()
  WHERE id = v_user_id;

  RETURN v_slug;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_store(p_slug TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store RECORD;
  v_packages JSON;
BEGIN
  SELECT id, store_name, store_whatsapp, store_slug
  INTO v_store
  FROM public.profiles
  WHERE store_slug = p_slug AND store_published = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(json_agg(
    json_build_object(
      'id', sp.id,
      'network', sp.network,
      'size_gb', sp.size_gb,
      'price', sp.price
    ) ORDER BY sp.network, sp.size_gb
  ), '[]'::json)
  INTO v_packages
  FROM public.store_packages sp
  WHERE sp.user_id = v_store.id AND sp.is_active = true;

  RETURN json_build_object(
    'store_name', v_store.store_name,
    'whatsapp', v_store.store_whatsapp,
    'slug', v_store.store_slug,
    'packages', v_packages
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.place_store_order(
  p_slug TEXT,
  p_package_id UUID,
  p_customer_phone TEXT
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
BEGIN
  SELECT id, store_name INTO v_store
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

  v_phone := regexp_replace(trim(p_customer_phone), '\s', '', 'g');
  IF v_phone !~ '^(0[235]\d{8}|233[235]\d{8})$' THEN
    RAISE EXCEPTION 'Enter a valid Ghana phone number';
  END IF;

  IF v_phone ~ '^233' THEN
    v_phone := '0' || substr(v_phone, 4);
  END IF;

  INSERT INTO public.store_orders (
    store_user_id,
    customer_phone,
    package_label,
    amount,
    status
  ) VALUES (
    v_store.id,
    v_phone,
    v_pkg.network || ' ' || v_pkg.size_gb || 'GB',
    v_pkg.price,
    'pending'
  )
  RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_or_update_store TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_store TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_store_order TO anon, authenticated;
