-- ZUNE Delivery readiness hardening — 2026-11-22
-- Safe incremental changes: preserve existing deliveries, payments and audit history.

-- 1) One source of truth for document eligibility. License is not required for bicycles;
--    license and insurance require a future expiry date.
create or replace function public.zune_delivery_driver_has_required_documents(p_driver_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
 select exists (
  select 1 from public.delivery_driver_profiles p
  where p.user_id=p_driver_id and not exists (
   select 1 from (values ('national_id'),('driver_photo'),('driving_license'),('vehicle_registration'),('vehicle_insurance')) required(doc_type)
   where (required.doc_type <> 'driving_license' or coalesce(p.vehicle_type,'') <> 'bicycle')
    and not exists (
     select 1 from public.delivery_driver_documents doc
     where doc.user_id=p.user_id and doc.document_type=required.doc_type and doc.status='approved'
      and (
       (required.doc_type in ('driving_license','vehicle_insurance') and doc.expiry_date is not null and doc.expiry_date>=current_date)
       or (required.doc_type not in ('driving_license','vehicle_insurance') and (doc.expiry_date is null or doc.expiry_date>=current_date))
      )
    )
  )
 );
$$;
revoke all on function public.zune_delivery_driver_has_required_documents(uuid) from public,anon,authenticated;

-- 2) Driver queue uses the central expiry-aware gate.
create or replace function public.zune_delivery_driver_queue()
returns table(
 delivery_id uuid,checkout_id uuid,delivery_fee numeric,currency text,delivery_status text,
 recipient_name text,recipient_phone text,delivery_address text,region text,district text,
 latitude double precision,longitude double precision,
 seller_handover_confirmed_at timestamptz,driver_pickup_confirmed_at timestamptz,
 driver_delivered_at timestamptz,buyer_confirmed_at timestamptz,created_at timestamptz
)
language plpgsql security definer set search_path = ''
as $$
begin
 if auth.uid() is null then raise exception 'Tafadhali ingia kwanza.'; end if;
 if not exists(select 1 from public.delivery_driver_profiles p where p.user_id=auth.uid() and p.status='active')
    or not public.zune_delivery_driver_has_required_documents(auth.uid()) then
  raise exception 'Akaunti ya dereva haijaidhinishwa au nyaraka za lazima hazijaidhinishwa/zimemaliza muda.';
 end if;
 return query
 select d.id,d.checkout_id,d.delivery_fee,d.currency,d.status,c.recipient_name,c.recipient_phone,
 c.delivery_address,c.region,c.district,c.latitude,c.longitude,d.seller_handover_confirmed_at,
 d.driver_pickup_confirmed_at,d.driver_delivered_at,d.buyer_confirmed_at,d.created_at
 from public.order_deliveries d join public.order_checkouts c on c.id=d.checkout_id
 where d.assigned_driver_id=auth.uid() order by d.created_at desc;
end;
$$;
revoke all on function public.zune_delivery_driver_queue() from public,anon;
grant execute on function public.zune_delivery_driver_queue() to authenticated;

-- 3) Correct driver totals: only explicit Admin-entered deductions count. No hidden 3% default.
create or replace function public.zune_driver_payment_dashboard()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 v_uid uuid:=auth.uid(); v_gross_earned numeric(14,2):=0; v_commission numeric(14,2):=0;
 v_earned numeric(14,2):=0; v_paid numeric(14,2):=0; v_pending numeric(14,2):=0;
 v_delivery_count integer:=0; v_payments jsonb:='[]'::jsonb; v_deliveries jsonb:='[]'::jsonb;
begin
 if v_uid is null then raise exception 'Tafadhali ingia kwanza.'; end if;
 if not exists(select 1 from public.delivery_driver_profiles p where p.user_id=v_uid and p.status='active') then
  raise exception 'Akaunti hii si dereva aliyeidhinishwa wa ZUNE Delivery.';
 end if;
 select coalesce(sum(d.driver_payout_amount),0),coalesce(sum(coalesce(p.deduction,0)),0),count(*)
 into v_gross_earned,v_commission,v_delivery_count
 from public.order_deliveries d left join public.zune_driver_payment_records p on p.delivery_id=d.id
 where d.assigned_driver_id=v_uid and d.status='completed' and d.buyer_confirmed_at is not null;
 v_earned:=greatest(v_gross_earned-v_commission,0);
 select coalesce(sum(p.net_amount),0) into v_paid from public.zune_driver_payment_records p
 where p.driver_id=v_uid and p.status='paid';
 v_pending:=greatest(v_earned-v_paid,0);
 select coalesce(jsonb_agg(x.obj order by x.created_at desc),'[]'::jsonb) into v_payments
 from (
  select jsonb_build_object('id',p.id,'delivery_id',p.delivery_id,'amount',p.amount,'deduction',p.deduction,
   'net_amount',p.net_amount,'payment_method',p.payment_method,'payment_phone',p.payment_phone,
   'transaction_reference',p.transaction_reference,'status',p.status,'admin_note',p.admin_note,
   'created_at',p.created_at,'paid_at',p.paid_at) obj,p.created_at
  from public.zune_driver_payment_records p where p.driver_id=v_uid order by p.created_at desc limit 100
 ) x;
 select coalesce(jsonb_agg(x.obj order by x.created_at desc),'[]'::jsonb) into v_deliveries
 from (
  select jsonb_build_object('id',d.id,'status',d.status,'delivery_fee',d.delivery_fee,
   'driver_payout_amount',d.driver_payout_amount,'zune_delivery_amount',d.zune_delivery_amount,
   'payout_status',d.payout_status,'created_at',d.created_at,'buyer_confirmed_at',d.buyer_confirmed_at) obj,d.created_at
  from public.order_deliveries d where d.assigned_driver_id=v_uid and d.status in ('completed','delivered')
  order by d.created_at desc limit 100
 ) x;
 return jsonb_build_object('currency','TZS','totals',jsonb_build_object(
  'gross_earned',v_gross_earned,'commission',v_commission,'earned',v_earned,'paid',v_paid,
  'pending',v_pending,'completed_deliveries',v_delivery_count),'payments',v_payments,'deliveries',v_deliveries);
end;
$$;
revoke all on function public.zune_driver_payment_dashboard() from public,anon;
grant execute on function public.zune_driver_payment_dashboard() to authenticated;

-- 4) Audited driver vehicle-change requests. Old profile values remain live until approval.
create table if not exists public.delivery_driver_vehicle_change_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.delivery_driver_profiles(user_id) on delete restrict,
 current_vehicle_type text,current_vehicle_registration text,current_license_number text,current_vehicle_ownership text,
 requested_vehicle_type text not null,requested_vehicle_registration text,requested_license_number text,
 requested_vehicle_ownership text,reason text not null check(length(btrim(reason))>=5),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 submitted_at timestamptz not null default now(),reviewed_at timestamptz,
 reviewed_by uuid references public.profiles(id) on delete restrict,review_note text
);
create unique index if not exists delivery_driver_vehicle_change_one_pending_idx
 on public.delivery_driver_vehicle_change_requests(user_id) where status='pending';
create index if not exists delivery_driver_vehicle_change_status_idx
 on public.delivery_driver_vehicle_change_requests(status,submitted_at desc);
alter table public.delivery_driver_vehicle_change_requests enable row level security;
drop policy if exists driver_read_own_vehicle_change_requests on public.delivery_driver_vehicle_change_requests;
create policy driver_read_own_vehicle_change_requests on public.delivery_driver_vehicle_change_requests
 for select to authenticated using(user_id=(select auth.uid()) or public.zune_is_admin());
drop policy if exists driver_submit_own_vehicle_change_request on public.delivery_driver_vehicle_change_requests;
create policy driver_submit_own_vehicle_change_request on public.delivery_driver_vehicle_change_requests
 for insert to authenticated with check(user_id=(select auth.uid()) and status='pending' and reviewed_by is null and reviewed_at is null);
grant select,insert on public.delivery_driver_vehicle_change_requests to authenticated;

create or replace function public.zune_driver_submit_vehicle_change_request(
 p_vehicle_type text,p_vehicle_registration text,p_license_number text,p_vehicle_ownership text,p_reason text
) returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare v_profile public.delivery_driver_profiles%rowtype; v_id uuid;
begin
 if auth.uid() is null then raise exception 'Tafadhali ingia kwanza.'; end if;
 if p_vehicle_type not in ('motorcycle','car','bicycle','other') then raise exception 'Aina ya chombo si sahihi.'; end if;
 if length(coalesce(p_vehicle_registration,''))>40 or length(coalesce(p_license_number,''))>60 then raise exception 'Taarifa za chombo zimezidi urefu unaoruhusiwa.'; end if;
 if nullif(btrim(coalesce(p_reason,'')),'') is null or length(btrim(p_reason))<5 then raise exception 'Eleza sababu ya mabadiliko kwa angalau herufi 5.'; end if;
 if p_vehicle_ownership not in ('owned','borrowed','rented','company') then raise exception 'Aina ya umiliki si sahihi.'; end if;
 if p_vehicle_type<>'bicycle' and (nullif(btrim(coalesce(p_vehicle_registration,'')),'') is null or nullif(btrim(coalesce(p_license_number,'')),'') is null) then
  raise exception 'Kwa chombo cha injini, namba ya usajili na leseni vinahitajika.';
 end if;
 select * into v_profile from public.delivery_driver_profiles where user_id=auth.uid() and status='active' for share;
 if not found then raise exception 'Akaunti hai ya dereva pekee inaweza kuomba mabadiliko.'; end if;
 insert into public.delivery_driver_vehicle_change_requests(user_id,current_vehicle_type,current_vehicle_registration,current_license_number,current_vehicle_ownership,
  requested_vehicle_type,requested_vehicle_registration,requested_license_number,requested_vehicle_ownership,reason)
 values(auth.uid(),v_profile.vehicle_type,v_profile.vehicle_registration,v_profile.license_number,v_profile.vehicle_ownership,
  btrim(p_vehicle_type),nullif(btrim(coalesce(p_vehicle_registration,'')),''),nullif(btrim(coalesce(p_license_number,'')),''),p_vehicle_ownership,btrim(p_reason))
 returning id into v_id;
 return jsonb_build_object('ok',true,'request_id',v_id,'status','pending');
end;
$$;
revoke all on function public.zune_driver_submit_vehicle_change_request(text,text,text,text,text) from public,anon;
grant execute on function public.zune_driver_submit_vehicle_change_request(text,text,text,text,text) to authenticated;

create or replace function public.admin_review_delivery_vehicle_change_request(p_request_id uuid,p_decision text,p_reason text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_admin uuid; v_req public.delivery_driver_vehicle_change_requests%rowtype;
begin
 v_admin:=public.zune_assert_admin(p_reason);
 if p_decision not in ('approved','rejected') then raise exception 'Uamuzi si sahihi.'; end if;
 select * into v_req from public.delivery_driver_vehicle_change_requests where id=p_request_id for update;
 if not found then raise exception 'Ombi la mabadiliko ya chombo halijapatikana.'; end if;
 if v_req.status<>'pending' then raise exception 'Ombi hili limeshakaguliwa.'; end if;
 if p_decision='approved' then
  update public.delivery_driver_profiles set vehicle_type=v_req.requested_vehicle_type,
   vehicle_registration=v_req.requested_vehicle_registration,license_number=v_req.requested_license_number,
   vehicle_ownership=v_req.requested_vehicle_ownership,updated_at=now() where user_id=v_req.user_id;
  if not found then raise exception 'Wasifu wa dereva haujapatikana.'; end if;
 end if;
 update public.delivery_driver_vehicle_change_requests set status=p_decision,reviewed_at=now(),reviewed_by=v_admin,review_note=btrim(p_reason) where id=p_request_id;
 insert into public.delivery_driver_audit_logs(driver_user_id,performed_by,action,reason)
 values(v_req.user_id,v_admin,case when p_decision='approved' then 'vehicle_change_approved' else 'vehicle_change_rejected' end,btrim(p_reason));
 return jsonb_build_object('ok',true,'request_id',p_request_id,'driver_user_id',v_req.user_id,'status',p_decision);
end;
$$;
revoke all on function public.admin_review_delivery_vehicle_change_request(uuid,text,text) from public,anon;
grant execute on function public.admin_review_delivery_vehicle_change_request(uuid,text,text) to authenticated;

-- 5) Keep Admin approval and restoration on the same document gate.
create or replace function public.admin_review_delivery_driver_application(p_application_id uuid,p_decision text,p_reason text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_admin uuid; v_app public.delivery_driver_applications%rowtype;
begin
 v_admin:=public.zune_assert_admin(p_reason);
 if p_decision not in ('approved','rejected') then raise exception 'Uamuzi si sahihi.'; end if;
 select * into v_app from public.delivery_driver_applications where id=p_application_id for update;
 if not found then raise exception 'Ombi la dereva halijapatikana.'; end if;
 if v_app.status<>'pending' then raise exception 'Ombi hili limeshakaguliwa.'; end if;
 if p_decision='approved' and not public.zune_delivery_driver_has_required_documents(v_app.user_id) then raise exception 'Nyaraka zote za lazima lazima ziwe approved na zisizoisha muda.'; end if;
 update public.delivery_driver_profiles set status=case when p_decision='approved' then 'active' else 'rejected' end,
  approved_by=case when p_decision='approved' then v_admin else null end,approved_at=case when p_decision='approved' then now() else null end,
  rejection_reason=case when p_decision='rejected' then btrim(p_reason) else null end,updated_at=now() where user_id=v_app.user_id;
 if not found then raise exception 'Taarifa za dereva hazijapatikana.'; end if;
 update public.profiles set role=case when p_decision='approved' then 'driver'::public.user_role when role::text='driver' then 'buyer'::public.user_role else role end where id=v_app.user_id;
 if not found then raise exception 'Wasifu wa akaunti haujapatikana.'; end if;
 update public.delivery_driver_applications set status=p_decision,reviewed_at=now(),reviewed_by=v_admin,review_note=btrim(p_reason) where id=p_application_id;
 insert into public.delivery_driver_audit_logs(driver_user_id,performed_by,action,reason) values(v_app.user_id,v_admin,p_decision,btrim(p_reason));
 return jsonb_build_object('ok',true,'application_id',p_application_id,'driver_user_id',v_app.user_id,'status',p_decision);
end;
$$;

create or replace function public.admin_set_delivery_driver_status(p_driver_id uuid,p_status text,p_reason text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_admin uuid; v_old text;
begin
 v_admin:=public.zune_assert_admin(p_reason);
 if p_status not in ('active','suspended') then raise exception 'Hali mpya si sahihi.'; end if;
 select status into v_old from public.delivery_driver_profiles where user_id=p_driver_id for update;
 if not found then raise exception 'Dereva hajapatikana.'; end if;
 if p_status='active' and not exists(select 1 from public.delivery_driver_applications a where a.user_id=p_driver_id and a.status='approved') then raise exception 'Dereva ambaye hajaidhinishwa hawezi kurejeshwa.'; end if;
 if p_status='active' and not public.zune_delivery_driver_has_required_documents(p_driver_id) then raise exception 'Dereva hawezi kurejeshwa mpaka nyaraka zote za lazima ziwe approved na halali.'; end if;
 update public.delivery_driver_profiles set status=p_status,updated_at=now(),rejection_reason=case when p_status='active' then null else rejection_reason end where user_id=p_driver_id;
 insert into public.delivery_driver_audit_logs(driver_user_id,performed_by,action,reason) values(p_driver_id,v_admin,case when p_status='active' then 'restored' else 'suspended' end,btrim(p_reason));
 return jsonb_build_object('ok',true,'driver_user_id',p_driver_id,'previous_status',v_old,'status',p_status);
end;
$$;
revoke all on function public.admin_review_delivery_driver_application(uuid,text,text) from public,anon;
revoke all on function public.admin_set_delivery_driver_status(uuid,text,text) from public,anon;
grant execute on function public.admin_review_delivery_driver_application(uuid,text,text) to authenticated;
grant execute on function public.admin_set_delivery_driver_status(uuid,text,text) to authenticated;

-- 6) Targeted indexes for driver queue, document eligibility and audit timeline.
create index if not exists delivery_driver_documents_eligibility_idx
 on public.delivery_driver_documents(user_id,document_type,status,expiry_date);
create index if not exists order_deliveries_driver_created_idx
 on public.order_deliveries(assigned_driver_id,created_at desc);
create index if not exists zune_delivery_events_delivery_created_idx
 on public.zune_delivery_events(delivery_id,created_at);
