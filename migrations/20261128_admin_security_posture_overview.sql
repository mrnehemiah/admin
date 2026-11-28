-- Phase 5: deterministic, read-only operational risk score for Admin Intelligence.
create or replace function public.admin_security_posture_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_admin_count integer; v_tables_total integer; v_rls_disabled integer; v_rls_no_policy integer;
  v_public_definer_anon integer; v_audit_7d integer; v_security_alerts_7d integer;
  v_open_disputes integer; v_payout_holds integer; v_ai_errors_30d integer;
  v_rls_disabled_names jsonb; v_rls_no_policy_names jsonb; v_anon_definer_names jsonb;
  v_health jsonb; v_backup jsonb; v_health_status text; v_health_checked timestamptz;
  v_backup_status text; v_backup_created timestamptz; v_risk_score integer := 0;
  v_risk_level text; v_risk_factors jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not public.zune_is_admin() then raise exception 'Admin Mkuu access required' using errcode='42501'; end if;
  select count(*) into v_admin_count from public.profiles where role::text='admin';
  select count(*) into v_tables_total from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p');
  select count(*) into v_rls_disabled from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and not c.relrowsecurity;
  select count(*) into v_rls_no_policy from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and c.relrowsecurity and not exists(select 1 from pg_catalog.pg_policies pol where pol.schemaname='public' and pol.tablename=c.relname);
  select count(*) into v_public_definer_anon from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and has_function_privilege('anon',p.oid,'EXECUTE');
  select coalesce(jsonb_agg(c.relname order by c.relname),'[]'::jsonb) into v_rls_disabled_names from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and not c.relrowsecurity;
  select coalesce(jsonb_agg(c.relname order by c.relname),'[]'::jsonb) into v_rls_no_policy_names from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and c.relrowsecurity and not exists(select 1 from pg_catalog.pg_policies pol where pol.schemaname='public' and pol.tablename=c.relname);
  select coalesce(jsonb_agg(jsonb_build_object('name',p.proname,'arguments',pg_catalog.pg_get_function_identity_arguments(p.oid)) order by p.proname),'[]'::jsonb) into v_anon_definer_names from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=n.oid where n.nspname='public' and p.prosecdef and has_function_privilege('anon',p.oid,'EXECUTE');
  select count(*) into v_audit_7d from public.admin_activity_logs where created_at>=now()-interval '7 days';
  select count(*) into v_security_alerts_7d from public.security_events where severity in ('critical','high') and occurred_at>=now()-interval '7 days';
  select count(*) into v_open_disputes from public.transaction_disputes where status in ('open','under_review','waiting_for_buyer','waiting_for_seller','escalated');
  select count(*) into v_payout_holds from public.order_deliveries where payout_status='on_hold_dispute';
  select count(*) into v_ai_errors_30d from public.ai_usage_logs where created_at>=now()-interval '30 days' and status in ('error','failed');
  select jsonb_build_object('component',component,'status',status,'latency_ms',latency_ms,'checked_at',checked_at),status,checked_at into v_health,v_health_status,v_health_checked from public.system_health_logs order by checked_at desc limit 1;
  select jsonb_build_object('operation',operation,'status',status,'reference',reference,'created_at',created_at),status,created_at into v_backup,v_backup_status,v_backup_created from public.backup_recovery_logs order by created_at desc limit 1;
  v_risk_score:=v_risk_score+least(30,v_security_alerts_7d*10);
  if v_security_alerts_7d>0 then v_risk_factors:=v_risk_factors||jsonb_build_array(jsonb_build_object('code','security_events','severity','high','count',v_security_alerts_7d,'message','High/critical security events in the last 7 days')); end if;
  v_risk_score:=v_risk_score+least(20,v_rls_disabled*10);
  if v_rls_disabled>0 then v_risk_factors:=v_risk_factors||jsonb_build_array(jsonb_build_object('code','rls_disabled','severity','critical','count',v_rls_disabled,'message','Public tables with RLS disabled')); end if;
  v_risk_score:=v_risk_score+least(20,v_public_definer_anon*10);
  if v_public_definer_anon>0 then v_risk_factors:=v_risk_factors||jsonb_build_array(jsonb_build_object('code','anon_definer','severity','high','count',v_public_definer_anon,'message','SECURITY DEFINER RPCs executable by anon; review each public contract')); end if;
  v_risk_score:=v_risk_score+least(10,v_open_disputes*2);
  if v_open_disputes>0 then v_risk_factors:=v_risk_factors||jsonb_build_array(jsonb_build_object('code','open_disputes','severity','medium','count',v_open_disputes,'message','Open transaction disputes require review')); end if;
  v_risk_score:=v_risk_score+least(10,v_payout_holds*2);
  if v_payout_holds>0 then v_risk_factors:=v_risk_factors||jsonb_build_array(jsonb_build_object('code','payout_holds','severity','medium','count',v_payout_holds,'message','Driver payouts currently held by disputes')); end if;
  v_risk_score:=v_risk_score+least(10,v_ai_errors_30d*2);
  if v_ai_errors_30d>0 then v_risk_factors:=v_risk_factors||jsonb_build_array(jsonb_build_object('code','ai_errors','severity','medium','count',v_ai_errors_30d,'message','AI feature errors in the last 30 days')); end if;
  if v_health_status is null then v_risk_score:=v_risk_score+10;v_risk_factors:=v_risk_factors||jsonb_build_array(jsonb_build_object('code','health_missing','severity','medium','message','No system health check has been recorded'));
  elsif v_health_status='down' then v_risk_score:=v_risk_score+20;v_risk_factors:=v_risk_factors||jsonb_build_array(jsonb_build_object('code','health_down','severity','critical','message','Latest recorded health check reports DOWN'));
  elsif v_health_status<>'healthy' or v_health_checked<now()-interval '24 hours' then v_risk_score:=v_risk_score+10;v_risk_factors:=v_risk_factors||jsonb_build_array(jsonb_build_object('code','health_stale_or_degraded','severity','medium','message','Health check is degraded, unknown or older than 24 hours')); end if;
  if v_backup_status is null then v_risk_score:=v_risk_score+15;v_risk_factors:=v_risk_factors||jsonb_build_array(jsonb_build_object('code','backup_missing','severity','high','message','No backup/recovery log has been recorded'));
  elsif v_backup_status='failed' then v_risk_score:=v_risk_score+15;v_risk_factors:=v_risk_factors||jsonb_build_array(jsonb_build_object('code','backup_failed','severity','high','message','Latest recorded backup/recovery operation failed'));
  elsif v_backup_status='started' or v_backup_created<now()-interval '7 days' then v_risk_score:=v_risk_score+10;v_risk_factors:=v_risk_factors||jsonb_build_array(jsonb_build_object('code','backup_stale','severity','medium','message','Latest backup/recovery log is incomplete or older than 7 days')); end if;
  v_risk_score:=least(100,v_risk_score);
  v_risk_level:=case when v_risk_score>=75 then 'critical' when v_risk_score>=50 then 'high' when v_risk_score>=20 then 'medium' else 'low' end;
  return jsonb_build_object(
    'admin_accounts_count',v_admin_count,'single_admin_ok',v_admin_count=1,'public_tables_total',v_tables_total,
    'public_tables_rls_disabled',v_rls_disabled,'public_tables_rls_enabled_no_policy',v_rls_no_policy,
    'public_tables_rls_disabled_names',v_rls_disabled_names,'public_tables_rls_no_policy_names',v_rls_no_policy_names,
    'public_security_definer_anon_count',v_public_definer_anon,'public_security_definer_anon_functions',v_anon_definer_names,
    'admin_audit_events_7d',v_audit_7d,'high_security_events_7d',v_security_alerts_7d,
    'open_disputes',v_open_disputes,'payout_holds',v_payout_holds,'ai_errors_30d',v_ai_errors_30d,
    'latest_health_check',v_health,'latest_backup',v_backup,'risk_score',v_risk_score,'risk_level',v_risk_level,
    'risk_factors',v_risk_factors,'risk_scoring_note','Deterministic operational indicator only; not a fraud verdict and does not trigger automated actions.','generated_at',now()
  );
end;
$function$;
revoke all on function public.admin_security_posture_overview() from public,anon;
grant execute on function public.admin_security_posture_overview() to authenticated;