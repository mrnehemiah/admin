-- Phase 5: Admin Intelligence overview RPC
-- Source migration for the already-applied Supabase migration:
-- phase5_admin_intelligence_overview_20261128
-- This function returns live aggregate metrics only; it does not write business data.

create or replace function public.admin_intelligence_overview(
  p_from timestamptz default null,
  p_to timestamptz default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_from timestamptz := coalesce(p_from, now() - interval '30 days');
  v_to timestamptz := coalesce(p_to, now());
  v_admin_count integer;
  v_result jsonb;
begin
  if auth.uid() is null or not public.zune_is_admin() then
    raise exception 'Admin Mkuu access required' using errcode='42501';
  end if;

  select count(*) into v_admin_count
  from public.profiles where role::text='admin';
  if v_admin_count <> 1 then
    raise exception 'Single Admin Mkuu invariant is not satisfied';
  end if;

  if v_from >= v_to then
    raise exception 'Tarehe ya mwanzo lazima iwe kabla ya tarehe ya mwisho.' using errcode='22023';
  end if;
  if v_to > now() + interval '1 minute' then
    raise exception 'Tarehe ya mwisho haiwezi kuwa mbele ya muda wa sasa.' using errcode='22023';
  end if;

  select jsonb_build_object(
    'period_from',v_from,'period_to',v_to,'generated_at',now(),
    'users_total',(select count(*) from public.profiles),
    'buyers_total',(select count(*) from public.profiles where role::text='buyer'),
    'sellers_total',(select count(*) from public.profiles where role::text='vendor'),
    'sellers_active',(select count(*) from public.profiles where role::text='vendor' and account_status='active'),
    'users_new_period',(select count(*) from public.profiles where created_at>=v_from and created_at<v_to),
    'sellers_new_period',(select count(*) from public.profiles where role::text='vendor' and created_at>=v_from and created_at<v_to),
    'seller_applications_pending',(select count(*) from public.seller_applications where status='pending'),
    'seller_applications_period',(select count(*) from public.seller_applications where created_at>=v_from and created_at<v_to),
    'verifications_pending',(select count(*) from public.verification_applications where status='pending'),
    'verified_individuals_total',(select count(*) from public.profiles where is_verified=true),
    'verified_stores_total',(select count(*) from public.stores where verification_status='verified' and is_active=true),
    'products_total',(select count(*) from public.products),
    'products_visible',(select count(*) from public.products where removed_at is null and seller_archived_at is null),
    'products_new_period',(select count(*) from public.products where created_at>=v_from and created_at<v_to),
    'orders_total',(select count(*) from public.orders),
    'orders_period',(select count(*) from public.orders where created_at>=v_from and created_at<v_to),
    'orders_pending',(select count(*) from public.orders where status::text='pending'),
    'orders_confirmed',(select count(*) from public.orders where status::text='confirmed'),
    'orders_completed_period',(select count(*) from public.orders where status::text='completed' and created_at>=v_from and created_at<v_to),
    'orders_cancelled_period',(select count(*) from public.orders where status::text='cancelled' and created_at>=v_from and created_at<v_to),
    'gross_completed_orders_period_tzs',(select coalesce(sum(total_price),0) from public.orders where status::text='completed' and created_at>=v_from and created_at<v_to),
    'commission_completed_orders_period_tzs',(select coalesce(sum(commission_fee),0) from public.orders where status::text='completed' and created_at>=v_from and created_at<v_to),
    'payments_paid_period_tzs',(select coalesce(sum(amount),0) from public.payments where payment_status='paid' and created_at>=v_from and created_at<v_to),
    'payments_pending',(select count(*) from public.payments where payment_status in ('pending','processing')),
    'verification_payments_paid_period_tzs',(select coalesce(sum(amount),0) from public.payment_transactions where status='paid' and purpose in ('individual_verification','store_verification') and coalesce(verified_at,created_at)>=v_from and coalesce(verified_at,created_at)<v_to),
    'verification_payments_pending',(select count(*) from public.payment_transactions where status in ('awaiting_payment','submitted','verifying')),
    'wallet_liabilities_tzs',(select coalesce(sum(balance),0) from public.wallets),
    'withdrawals_pending',(select count(*) from public.withdrawal_requests where status in ('pending','under_review','approved','processing')),
    'withdrawals_pending_tzs',(select coalesce(sum(amount),0) from public.withdrawal_requests where status in ('pending','under_review','approved','processing')),
    'admin_wallet_available_tzs',(select coalesce(available_balance,0) from public.zune_marketing_wallet_state where singleton=true),
    'admin_wallet_credits_tzs',(select coalesce(sum(amount),0) from public.zune_marketing_wallet_ledger where direction='credit'),
    'admin_wallet_debits_tzs',(select coalesce(sum(amount),0) from public.zune_marketing_wallet_ledger where direction='debit'),
    'disputes_open',(select count(*) from public.transaction_disputes where status in ('open','under_review','waiting_for_buyer','waiting_for_seller','escalated')),
    'disputes_period',(select count(*) from public.transaction_disputes where created_at>=v_from and created_at<v_to),
    'support_open',(select count(*) from public.support_tickets where status not in ('resolved','closed')),
    'support_period',(select count(*) from public.support_tickets where created_at>=v_from and created_at<v_to),
    'deliveries_in_transit',(select count(*) from public.order_deliveries where status='in_transit'),
    'deliveries_completed_period',(select count(*) from public.order_deliveries where status='completed' and buyer_confirmed_at>=v_from and buyer_confirmed_at<v_to),
    'deliveries_payout_on_hold',(select count(*) from public.order_deliveries where payout_status='on_hold_dispute'),
    'driver_payouts_paid_period_tzs',(select coalesce(sum(net_amount),0) from public.zune_driver_payment_records where status='paid' and paid_at>=v_from and paid_at<v_to),
    'driver_payouts_pending',(select count(*) from public.zune_driver_payment_records where status in ('pending','processing')),
    'security_events_critical_7d',(select count(*) from public.security_events where severity in ('critical','high') and occurred_at>=now()-interval '7 days'),
    'ai_requests_30d',(select count(*) from public.ai_usage_logs where created_at>=now()-interval '30 days'),
    'ai_errors_30d',(select count(*) from public.ai_usage_logs where created_at>=now()-interval '30 days' and status in ('error','failed')),
    'ai_estimated_cost_30d',(select coalesce(sum(estimated_cost),0) from public.ai_usage_logs where created_at>=now()-interval '30 days'),
    'latest_health_check',(select jsonb_build_object('component',component,'status',status,'latency_ms',latency_ms,'checked_at',checked_at) from public.system_health_logs order by checked_at desc limit 1),
    'latest_backup',(select jsonb_build_object('operation',operation,'status',status,'reference',reference,'created_at',created_at) from public.backup_recovery_logs order by created_at desc limit 1)
  ) into v_result;
  return v_result;
end;
$function$;

revoke all on function public.admin_intelligence_overview(timestamptz,timestamptz) from public,anon;
grant execute on function public.admin_intelligence_overview(timestamptz,timestamptz) to authenticated;
