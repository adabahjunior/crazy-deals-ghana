-- Agent store packages linked to admin catalog (agent price + profit)

ALTER TABLE public.store_packages
  ADD COLUMN IF NOT EXISTS data_package_id UUID REFERENCES public.data_packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS base_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS profit NUMERIC(10,2) NOT NULL DEFAULT 0;

UPDATE public.store_packages
SET base_price = COALESCE(base_price, price),
    profit = COALESCE(profit, 0)
WHERE base_price IS NULL;

ALTER TABLE public.store_packages
  ALTER COLUMN base_price SET NOT NULL;

UPDATE public.data_packages SET validity = 'Non expiry';

CREATE UNIQUE INDEX IF NOT EXISTS store_packages_user_catalog_unique
  ON public.store_packages (user_id, data_package_id)
  WHERE data_package_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.network_label(p_network TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_network
    WHEN 'mtn' THEN 'MTN'
    WHEN 'airtel-ishare' THEN 'AirtelTigo iShare'
    WHEN 'airtel-bigtime' THEN 'AirtelTigo BigTime'
    WHEN 'telecel' THEN 'Telecel'
    ELSE p_network
  END;
$$;

CREATE OR REPLACE FUNCTION public.sync_store_packages_from_catalog()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.agent_price IS DISTINCT FROM NEW.agent_price THEN
    UPDATE public.store_packages
    SET base_price = NEW.agent_price,
        price = NEW.agent_price + profit
    WHERE data_package_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_store_packages_base_price ON public.data_packages;
CREATE TRIGGER trg_sync_store_packages_base_price
  AFTER UPDATE OF agent_price ON public.data_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_store_packages_from_catalog();

CREATE OR REPLACE FUNCTION public.add_store_package(
  p_data_package_id UUID,
  p_profit NUMERIC DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_catalog public.data_packages%ROWTYPE;
  v_id UUID;
  v_profit NUMERIC := COALESCE(p_profit, 0);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (SELECT store_published FROM public.profiles WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Publish your store before adding packages';
  END IF;

  IF v_profit < 0 THEN
    RAISE EXCEPTION 'Profit cannot be negative';
  END IF;

  SELECT * INTO v_catalog
  FROM public.data_packages
  WHERE id = p_data_package_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Catalog package not found or inactive';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.store_packages
    WHERE user_id = v_user_id AND data_package_id = p_data_package_id
  ) THEN
    RAISE EXCEPTION 'This package is already in your store';
  END IF;

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
    v_user_id,
    p_data_package_id,
    public.network_label(v_catalog.network),
    v_catalog.size_gb,
    v_catalog.agent_price,
    v_profit,
    v_catalog.agent_price + v_profit,
    true
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_store_package_profit(
  p_store_package_id UUID,
  p_profit NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_profit NUMERIC := COALESCE(p_profit, 0);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_profit < 0 THEN
    RAISE EXCEPTION 'Profit cannot be negative';
  END IF;

  UPDATE public.store_packages
  SET profit = v_profit,
      price = base_price + v_profit
  WHERE id = p_store_package_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Store package not found';
  END IF;
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
      'price', sp.price,
      'validity', 'Non expiry'
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

GRANT EXECUTE ON FUNCTION public.add_store_package TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_store_package_profit TO authenticated;
