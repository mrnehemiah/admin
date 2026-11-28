CREATE OR REPLACE FUNCTION public.admin_get_user_details(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.zune_is_admin() THEN
    RAISE EXCEPTION 'Admin Mkuu access required' USING ERRCODE='42501';
  END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'User id is required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user_id) THEN RAISE EXCEPTION 'User not found'; END IF;
  SELECT jsonb_build_object(
    'profile',(SELECT to_jsonb(p) FROM public.profiles p WHERE p.id=p_user_id),
    'auth_account',(SELECT jsonb_build_object('id',au.id,'email',au.email,'phone',au.phone,'email_confirmed_at',au.email_confirmed_at,'phone_confirmed_at',au.phone_confirmed_at,'last_sign_in_at',au.last_sign_in_at,'last_sign_in_ip',au.last_sign_in_ip,'created_at',au.created_at,'updated_at',au.updated_at) FROM auth.users au WHERE au.id=p_user_id),
    'store',(SELECT to_jsonb(s) FROM public.stores s WHERE s.owner_id=p_user_id),
    'driver_profile',(SELECT to_jsonb(dp) FROM public.delivery_driver_profiles dp WHERE dp.user_id=p_user_id),
    'delivery_addresses',(SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.is_default DESC,a.created_at DESC),'[]'::jsonb) FROM public.delivery_addresses a WHERE a.user_id=p_user_id),
    'driver_applications',(SELECT COALESCE(jsonb_agg(to_jsonb(da) ORDER BY da.submitted_at DESC),'[]'::jsonb) FROM public.delivery_driver_applications da WHERE da.user_id=p_user_id),
    'driver_documents',(SELECT COALESCE(jsonb_agg(to_jsonb(dd) ORDER BY dd.created_at DESC),'[]'::jsonb) FROM public.delivery_driver_documents dd WHERE dd.user_id=p_user_id),
    'wallet',(SELECT to_jsonb(w) FROM public.wallets w WHERE w.user_id=p_user_id),
    'products',(SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) FROM public.products x WHERE x.vendor_id=p_user_id),
    'buyer_orders',(SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) FROM public.orders x WHERE x.buyer_id=p_user_id),
    'seller_orders',(SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) FROM public.orders x JOIN public.products pr ON pr.id=x.product_id WHERE pr.vendor_id=p_user_id),
    'payments',(SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) FROM public.payment_transactions x WHERE x.user_id=p_user_id),
    'order_payments',(SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) FROM public.payments x WHERE x.buyer_id=p_user_id),
    'wallet_transactions',(SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) FROM public.admin_wallet_transactions x WHERE x.user_id=p_user_id),
    'withdrawals',(SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) FROM public.withdrawal_requests x WHERE x.user_id=p_user_id),
    'seller_applications',(SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) FROM public.seller_applications x WHERE x.user_id=p_user_id),
    'verification_applications',(SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) FROM public.verification_applications x WHERE x.user_id=p_user_id),
    'verification_requests',(SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) FROM public.verification_requests x WHERE x.user_id=p_user_id),
    'disputes',(SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) FROM public.transaction_disputes x WHERE x.buyer_id=p_user_id OR x.seller_id=p_user_id),
    'support_tickets',(SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) FROM public.support_tickets x WHERE x.user_id=p_user_id),
    'admin_actions',(SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) FROM public.admin_user_actions x WHERE x.target_user_id=p_user_id)
  ) INTO v_result;
  RETURN v_result;
END;
$function$;