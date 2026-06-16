-- Admin wallet credit with audit transaction

CREATE OR REPLACE FUNCTION public.admin_credit_wallet(
  p_user_id UUID,
  p_amount NUMERIC,
  p_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_tx_id UUID;
  v_description TEXT;
BEGIN
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  v_description := COALESCE(NULLIF(trim(p_note), ''), 'Admin wallet credit');

  UPDATE public.profiles
  SET wallet_balance = wallet_balance + p_amount,
      total_deposits = total_deposits + p_amount,
      updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES (
    p_user_id,
    'wallet_topup',
    p_amount,
    v_description,
    'success'
  )
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_credit_wallet TO authenticated;
