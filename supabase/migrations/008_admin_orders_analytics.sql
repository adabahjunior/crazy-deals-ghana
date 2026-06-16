-- Admin dashboard analytics and order management

DROP POLICY IF EXISTS "Admins read all store orders" ON store_orders;
DROP POLICY IF EXISTS "Admins update all store orders" ON store_orders;
DROP POLICY IF EXISTS "Admins update all transactions" ON transactions;

CREATE POLICY "Admins read all store orders" ON store_orders
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins update all store orders" ON store_orders
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins update all transactions" ON transactions
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_start TIMESTAMPTZ := date_trunc('day', now());
  v_result JSON;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'total_platform_orders', (
      SELECT COUNT(*) FROM transactions WHERE type = 'data_purchase'
    ),
    'total_store_orders', (SELECT COUNT(*) FROM store_orders),
    'total_orders', (
      SELECT COUNT(*) FROM transactions WHERE type = 'data_purchase'
    ) + (SELECT COUNT(*) FROM store_orders),
    'total_revenue', (
      SELECT COALESCE(SUM(amount), 0) FROM transactions
      WHERE type = 'data_purchase' AND status = 'success'
    ) + (
      SELECT COALESCE(SUM(amount), 0) FROM store_orders
      WHERE status = 'success'
    ),
    'today_orders', (
      SELECT COUNT(*) FROM transactions
      WHERE type = 'data_purchase' AND created_at >= v_today_start
    ) + (
      SELECT COUNT(*) FROM store_orders WHERE created_at >= v_today_start
    ),
    'today_revenue', (
      SELECT COALESCE(SUM(amount), 0) FROM transactions
      WHERE type = 'data_purchase' AND status = 'success' AND created_at >= v_today_start
    ) + (
      SELECT COALESCE(SUM(amount), 0) FROM store_orders
      WHERE status = 'success' AND created_at >= v_today_start
    ),
    'pending_orders', (
      SELECT COUNT(*) FROM transactions
      WHERE type = 'data_purchase' AND status = 'pending'
    ) + (
      SELECT COUNT(*) FROM store_orders WHERE status = 'pending'
    ),
    'wallet_topups_today', (
      SELECT COALESCE(SUM(amount), 0) FROM transactions
      WHERE type = 'wallet_topup' AND status = 'success' AND created_at >= v_today_start
    ),
    'active_stores', (SELECT COUNT(*) FROM profiles WHERE store_published = true),
    'sales_per_day', (
      SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.day DESC), '[]'::json)
      FROM (
        SELECT
          to_char(day, 'YYYY-MM-DD') AS day,
          SUM(orders)::int AS orders,
          ROUND(SUM(revenue)::numeric, 2) AS revenue
        FROM (
          SELECT
            date_trunc('day', created_at) AS day,
            COUNT(*) AS orders,
            COALESCE(SUM(amount) FILTER (WHERE status = 'success'), 0) AS revenue
          FROM transactions
          WHERE type = 'data_purchase'
            AND created_at >= date_trunc('day', now()) - INTERVAL '13 days'
          GROUP BY 1
          UNION ALL
          SELECT
            date_trunc('day', created_at) AS day,
            COUNT(*) AS orders,
            COALESCE(SUM(amount) FILTER (WHERE status = 'success'), 0) AS revenue
          FROM store_orders
          WHERE created_at >= date_trunc('day', now()) - INTERVAL '13 days'
          GROUP BY 1
        ) combined
        GROUP BY day
        ORDER BY day DESC
        LIMIT 14
      ) d
    ),
    'recent_orders', public.get_admin_orders(10)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_orders(p_limit INT DEFAULT 200)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(o) ORDER BY o.created_at DESC), '[]'::json)
    FROM (
      SELECT
        t.id,
        'platform'::text AS source,
        t.user_id,
        p.full_name AS user_name,
        p.email AS user_email,
        t.description,
        t.network,
        t.phone,
        t.amount,
        t.status,
        t.created_at,
        NULL::text AS store_name,
        NULL::text AS customer_phone,
        NULL::text AS package_label
      FROM transactions t
      LEFT JOIN profiles p ON p.id = t.user_id
      WHERE t.type = 'data_purchase'

      UNION ALL

      SELECT
        so.id,
        'store'::text AS source,
        so.store_user_id AS user_id,
        sp.full_name AS user_name,
        sp.email AS user_email,
        (so.package_label || ' → ' || so.customer_phone) AS description,
        NULL::text AS network,
        so.customer_phone AS phone,
        so.amount,
        so.status,
        so.created_at,
        sp.store_name,
        so.customer_phone,
        so.package_label
      FROM store_orders so
      LEFT JOIN profiles sp ON sp.id = so.store_user_id

      ORDER BY created_at DESC
      LIMIT p_limit
    ) o
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_orders TO authenticated;
