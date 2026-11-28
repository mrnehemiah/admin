-- Phase 5: Admin-only health check writer.
-- Browser checks may record only a fixed set of components and safe status values.
create or replace function public.admin_record_system_health_check(
  p_component text,
  p_status text,
  p_latency_ms integer default null,
  p_details jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_id uuid;
  v_admin_count integer;
  v_component text := lower(btrim(coalesce(p_component,'')));
  v_status text := lower(btrim(coalesce(p_status,'')));
begin
  if auth.uid() is null or not public.zune_is_admin() then
    raise exception 'Admin Mkuu access required' using errcode='42501';
  end if;
  select count(*) into v_admin_count from public.profiles where role::text='admin';
  if v_admin_count<>1 then
    raise exception 'Single Admin Mkuu invariant is not satisfied' using errcode='42501';
  end if;
  if v_component not in ('database','authentication','admin_authorization','marketplace_data_api') then
    raise exception 'Unsupported health component' using errcode='22023';
  end if;
  if v_status not in ('healthy','degraded','down','unknown') then
    raise exception 'Unsupported health status' using errcode='22023';
  end if;
  if p_latency_ms is not null and (p_latency_ms<0 or p_latency_ms>600000) then
    raise exception 'Invalid health-check latency' using errcode='22023';
  end if;
  if p_details is not null and jsonb_typeof(p_details)<>'object' then
    raise exception 'Health details must be a JSON object' using errcode='22023';
  end if;
  insert into public.system_health_logs(component,status,latency_ms,details)
  values(v_component,v_status,p_latency_ms,coalesce(p_details,'{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$function$;
revoke all on function public.admin_record_system_health_check(text,text,integer,jsonb) from public,anon;
grant execute on function public.admin_record_system_health_check(text,text,integer,jsonb) to authenticated;