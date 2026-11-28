-- Fix auth.users metadata field to match the active Supabase schema.
CREATE OR REPLACE FUNCTION public.admin_get_user_details(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
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
    'auth_account',(SELECT jsonb_build_object('id',au.id,'email',au.email,'phone',au.phone,'email_confirmed_at',au.email_confirmed_at,'phone_confirmed_at',au.phone_confirmed_at,'last_sign_in_at',au.last_sign_in_at,'created_at',au.created_at,'updated_at',au.updated_at) FROM auth.users au WHERE au.id=p_user_id),
    'store',(SELECT to_jsonb(s) FROM public.stores s WHERE s.owner_id=p_user_id),
    'driver_profile',(SELECT to_jsonb(dp) FROM public.delivery_driver_profiles dp WHERE dp.user_id=p_user_id),
    'delivery_addresses',(SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.is_default DESC,a.created_at DESC),'[]'::jsonb) FROM public.delivery_addresses a WHERE a.user_id=p_user_id),
    'driver_applications',(SELECT COALESCE(jsonb_agg(to_jsonb(da) ORDER BY da.submitted_at DESC),'[]'::jsonb) FROM public.delivery_driver_applications da WHERE da.user_id=p_user_id),
    'driver_documents',(SELECT COALESCE(jsonb_agg(to_jsonb(dd) ORDER BY dd.created_at DESC),'[]'::jsonb) FROM public.delivery_driver_documents dd WHERE dd.user_id=p_user_id),
    'wallet',(SELECT to_jsonb(w) FROM public.wallets w WHERE w.user_id=p_user_id),
    'products',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.products x WHERE x.vendor_id=p_user_id),
    'buyer_orders',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.orders x WHERE x.buyer_id=p_user_id),
    'seller_orders',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.orders x WHERE x.vendor_id=p_user_id),
    'order_items',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.order_items x WHERE x.seller_id=p_user_id),
    'order_deliveries',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.order_deliveries x WHERE x.vendor_id=p_user_id),
    'payments',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.payment_transactions x WHERE x.user_id=p_user_id),
    'order_payments',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.payments x WHERE x.buyer_id=p_user_id),
    'wallet_transactions',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.admin_wallet_transactions x WHERE x.user_id=p_user_id),
    'wallet_ledger',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.wallet_ledger x WHERE x.user_id=p_user_id),
    'wallet_payout_accounts',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.wallet_payout_accounts x WHERE x.user_id=p_user_id),
    'wallet_refunds',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.wallet_refund_requests x WHERE x.user_id=p_user_id),
    'withdrawals',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.withdrawal_requests x WHERE x.user_id=p_user_id),
    'cart_items',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.cart_items x WHERE x.user_id=p_user_id),
    'wishlists',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.wishlists x WHERE x.user_id=p_user_id),
    'notifications',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.notifications x WHERE x.user_id=p_user_id),
    'price_drop_alerts',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.price_drop_alerts x WHERE x.user_id=p_user_id),
    'coupon_redemptions',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.coupon_redemptions x WHERE x.buyer_id=p_user_id),
    'order_checkouts',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.order_checkouts x WHERE x.buyer_id=p_user_id),
    'product_reviews',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.product_reviews x WHERE x.buyer_id=p_user_id),
    'product_questions',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.product_questions x WHERE x.asker_id=p_user_id),
    'product_answers',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.product_question_answers x WHERE x.seller_id=p_user_id),
    'chat_conversations',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.chat_conversations x WHERE x.buyer_id=p_user_id OR x.seller_id=p_user_id),
    'conversation_participants',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.conversation_participants x WHERE x.user_id=p_user_id),
    'conversations_created',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.conversations x WHERE x.created_by=p_user_id),
    'support_tickets',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.support_tickets x WHERE x.user_id=p_user_id),
    'disputes',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.transaction_disputes x WHERE x.buyer_id=p_user_id OR x.seller_id=p_user_id),
    'security_events',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.security_events x WHERE x.user_id=p_user_id),
    'admin_login_events',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.admin_login_events x WHERE x.user_id=p_user_id),
    'seller_applications',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.seller_applications x WHERE x.user_id=p_user_id),
    'verification_applications',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.verification_applications x WHERE x.user_id=p_user_id),
    'verification_requests',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.verification_requests x WHERE x.user_id=p_user_id),
    'verification_audit_logs',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.verification_audit_logs x WHERE x.user_id=p_user_id),
    'verified_badge_requests',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.verified_badge_requests x WHERE x.user_id=p_user_id),
    'public_badges',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.public_badge_registry x WHERE x.user_id=p_user_id),
    'public_individual_badges',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.public_verified_individual_badges x WHERE x.user_id=p_user_id),
    'public_store_badges',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.public_verified_store_badges x WHERE x.owner_id=p_user_id),
    'driver_vehicle_change_requests',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.delivery_driver_vehicle_change_requests x WHERE x.user_id=p_user_id),
    'driver_payment_records',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.zune_driver_payment_records x WHERE x.driver_id=p_user_id),
    'seller_earnings',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.zune_seller_earnings_ledger x WHERE x.seller_id=p_user_id),
    'seller_payout_methods',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.zune_seller_payout_methods x WHERE x.seller_id=p_user_id),
    'seller_locations',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.seller_locations x WHERE x.vendor_id=p_user_id),
    'seller_promotions',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.seller_promotions x WHERE x.seller_id=p_user_id),
    'seller_business_goals',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.seller_business_goals x WHERE x.owner_id=p_user_id),
    'ad_campaigns',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.ad_campaigns x WHERE x.seller_id=p_user_id),
    'ad_auction_bids',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.ad_auction_bids x WHERE x.seller_id=p_user_id),
    'ads_wallet',(SELECT to_jsonb(x) FROM public.ads_wallets x WHERE x.seller_id=p_user_id),
    'ads_wallet_transactions',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.ads_wallet_transactions x WHERE x.seller_id=p_user_id),
    'coupon_ownership',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.coupons x WHERE x.seller_id=p_user_id),
    'store_login_aliases',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.store_login_aliases x WHERE x.user_id=p_user_id),
    'store_follows',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.zune_store_follows x WHERE x.follower_id=p_user_id),
    'reels',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.zune_reels x WHERE x.creator_id=p_user_id),
    'reel_comments',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.zune_reel_comments x WHERE x.user_id=p_user_id),
    'reel_likes',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.zune_reel_likes x WHERE x.user_id=p_user_id),
    'reel_saves',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.zune_reel_saves x WHERE x.user_id=p_user_id),
    'reel_shares',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.zune_reel_shares x WHERE x.user_id=p_user_id),
    'reel_follows',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.zune_reel_follows x WHERE x.follower_id=p_user_id OR x.creator_id=p_user_id),
    'status_comments',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.zune_status_comments x WHERE x.user_id=p_user_id),
    'status_likes',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.zune_status_likes x WHERE x.user_id=p_user_id),
    'store_statuses',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.zune_store_statuses x WHERE x.owner_id=p_user_id),
    'creator_earnings',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.zune_creator_earnings x WHERE x.creator_id=p_user_id),
    'creator_applications',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.zune_creator_monetization_applications x WHERE x.creator_id=p_user_id),
    'creator_withdrawals',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.zune_creator_withdrawals x WHERE x.creator_id=p_user_id),
    'reward_accounts',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.zune_reward_accounts x WHERE x.user_id=p_user_id),
    'reward_ledger',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.zune_reward_ledger x WHERE x.user_id=p_user_id),
    'referral_codes',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.zune_referral_codes x WHERE x.user_id=p_user_id),
    'theme_assets',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.zune_theme_assets x WHERE x.owner_id=p_user_id),
    'theme_trusted_creator',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.zune_theme_trusted_creators x WHERE x.user_id=p_user_id),
    'admin_actions',(SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.admin_user_actions x WHERE x.target_user_id=p_user_id)
  ) INTO v_result;
  RETURN v_result;
END;
$function$

