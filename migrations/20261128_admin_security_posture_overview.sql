-- Phase 5: read-only security posture summary for Admin Intelligence.
create or replace function public.admin_security_posture_overview()
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare
  v_admin_count integer; v_tables_total integer; v_rls_disabled integer;
  v_rls_no_policy integer; v_public_definer_anon integer;
  v_audit_7d integer; v_security_alerts_7d integer;
begin
  if auth.uid() is null or not public.zune_is_admin() then
    raise exception 'Admin Mkuu access required' using errcode='42501';
  end if;
  select count(*) into v_admin_count from public.profiles where role::text='admin';
  select count(*) into v_tables_total
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p');
  select count(*) into v_rls_disabled
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p') and not c.relrowsecurity;
  select count(*) into v_rls_no_policy
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p') and c.relrowsecurity
    and not exists (select 1 from pg_catalog.pg_policies pol where pol.schemaname='public' and pol.tablename=c.relname);
  select count(*) into v_public_definer_anon
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prosecdef and has_function_privilege('anon',p.oid,'EXECUTE');
  select count(*) into v_audit_7d from public.admin_activity_logs where created_at>=now()-interval '7 days';
  select count(*) into v_security_alerts_7d from public.security_events
  where severity in ('critical','high') and occurred_at>=now()-interval '7 days';
  return jsonb_build_object(
    'admin_accounts_count',v_admin_count,'single_admin_ok',v_admin_count=1,
    'public_tables_total',v_tables_total,'public_tables_rls_disabled',v_rls_disabled,
    'public_tables_rls_enabled_no_policy',v_rls_no_policy,
    'public_security_definer_anon_count',v_public_definer_anon,
    'admin_audit_events_7d',v_audit_7d,'high_security_events_7d',v_security_alerts_7d,
    'generated_at',now()
  );
end;
$function$;
revoke all on function public.admin_security_posture_overview() from public,anon;
grant execute on function public.admin_security_posture_overview() to authenticated;
