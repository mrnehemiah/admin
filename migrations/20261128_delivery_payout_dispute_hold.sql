-- ZUNE Delivery Phase 4 payout rules
-- Apply after supabase-driver-payments.sql.
-- Direct table writes are revoked; Admin must use the guarded RPC below.
revoke insert, update, delete on public.zune_driver_payment_records from public,anon,authenticated;
grant select on public.zune_driver_payment_records to authenticated;
drop policy if exists zune_driver_payment_admin_insert on public.zune_driver_payment_records;
drop policy if exists zune_driver_payment_admin_update on public.zune_driver_payment_records;
-- Approved policy: fixed 3% of gross driver payout is credited to Admin Wallet
-- after Admin confirms the transfer. Any active related dispute holds unpaid payout.

create or replace function private.zune_sync_delivery_dispute_payout_hold_for(p_checkout_id uuid,p_vendor_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
 update public.order_deliveries d
 set payout_status=case
  when exists(
   select 1 from public.orders o join public.transaction_disputes td on td.order_id=o.id
   where o.checkout_id=d.checkout_id and o.vendor_id=d.vendor_id
    and td.status in ('open','under_review','waiting_for_buyer','waiting_for_seller','escalated')
  ) then 'on_hold_dispute'
  else coalesce((
   select case p.status when 'paid' then 'paid' when 'processing' then 'processing'
    when 'pending' then 'awaiting_payout' when 'rejected' then 'rejected' else null end
   from public.zune_driver_payment_records p where p.delivery_id=d.id
  ),'awaiting_allocation')
 end
 where d.checkout_id=p_checkout_id and d.vendor_id=p_vendor_id
  and d.status='completed' and d.buyer_confirmed_at is not null
  and (
   d.payout_status='on_hold_dispute'
   or (
    exists(select 1 from public.orders o join public.transaction_disputes td on td.order_id=o.id
     where o.checkout_id=d.checkout_id and o.vendor_id=d.vendor_id
      and td.status in ('open','under_review','waiting_for_buyer','waiting_for_seller','escalated'))
    and not exists(select 1 from public.zune_driver_payment_records p
     where p.delivery_id=d.id and p.status='paid')
   )
  );
end; $$;
revoke all on function private.zune_sync_delivery_dispute_payout_hold_for(uuid,uuid) from public,anon,authenticated;

create or replace function private.zune_sync_delivery_dispute_payout_hold_trigger()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_checkout_id uuid;v_vendor_id uuid;v_order_id uuid;
begin
 if tg_table_name='transaction_disputes' then
  v_order_id:=case when tg_op='DELETE' then old.order_id else new.order_id end;
  select o.checkout_id,o.vendor_id into v_checkout_id,v_vendor_id from public.orders o where o.id=v_order_id;
 else
  v_checkout_id:=new.checkout_id;v_vendor_id:=new.vendor_id;
 end if;
 if v_checkout_id is not null and v_vendor_id is not null then
  perform private.zune_sync_delivery_dispute_payout_hold_for(v_checkout_id,v_vendor_id);
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end; $$;
revoke all on function private.zune_sync_delivery_dispute_payout_hold_trigger() from public,anon,authenticated;

drop trigger if exists zune_sync_delivery_payout_hold_from_disputes on public.transaction_disputes;
create trigger zune_sync_delivery_payout_hold_from_disputes
after insert or update or delete on public.transaction_disputes
for each row execute function private.zune_sync_delivery_dispute_payout_hold_trigger();

drop trigger if exists zune_sync_delivery_payout_hold_after_completion on public.order_deliveries;
create trigger zune_sync_delivery_payout_hold_after_completion
after update of status,buyer_confirmed_at on public.order_deliveries
for each row execute function private.zune_sync_delivery_dispute_payout_hold_trigger();

create or replace function private.zune_admin_record_driver_payment(
 p_delivery_id uuid,p_amount numeric,p_deduction numeric,p_payment_method text,
 p_payment_phone text,p_transaction_reference text,p_status text,p_admin_reason text
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
 v_admin uuid;v_driver_id uuid;v_payment_id uuid;v_ledger_id uuid;
 v_net numeric(14,2);v_commission numeric(14,2);v_old public.zune_driver_payment_records%rowtype;
 v_delivery_fee numeric(14,2);v_checkout_id uuid;v_vendor_id uuid;v_reference text;
 v_phone text:=nullif(trim(coalesce(p_payment_phone,'')),'');
 v_tx text:=nullif(trim(coalesce(p_transaction_reference,'')),'');
 v_note text:=nullif(trim(coalesce(p_admin_reason,'')),'');
begin
 v_admin:=public.zune_assert_admin(p_admin_reason);
 if p_amount is null or p_amount<=0 or coalesce(p_deduction,0)<0 then raise exception 'Kiasi cha malipo si sahihi.';end if;
 if p_status not in ('pending','processing','paid','rejected') then raise exception 'Hali ya malipo si sahihi.';end if;
 if p_payment_method not in ('mpesa','airtel_money','mixx_by_yas','halopesa','bank','cash','manual') then raise exception 'Njia ya malipo haijaruhusiwa.';end if;
 if p_status='paid' and v_tx is null then raise exception 'Transaction reference is required before marking a driver payment as paid.';end if;

 select d.assigned_driver_id,d.delivery_fee,d.checkout_id,d.vendor_id
 into v_driver_id,v_delivery_fee,v_checkout_id,v_vendor_id
 from public.order_deliveries d join public.delivery_driver_profiles dp on dp.user_id=d.assigned_driver_id
 where d.id=p_delivery_id and d.status='completed' and d.buyer_confirmed_at is not null for update of d;
 if v_driver_id is null then raise exception 'Delivery haijakamilika, haijathibitishwa, au dereva hajapatikana.';end if;
 if p_amount>v_delivery_fee then raise exception 'Malipo ya dereva hayawezi kuzidi delivery fee.';end if;

 select * into v_old from public.zune_driver_payment_records where delivery_id=p_delivery_id for update;
 if v_old.status='paid' then
  if p_status='paid' and p_amount=v_old.amount
   and p_payment_method is not distinct from v_old.payment_method
   and v_phone is not distinct from v_old.payment_phone
   and v_tx is not distinct from v_old.transaction_reference
   and v_note is not distinct from v_old.admin_note then
   return jsonb_build_object('ok',true,'payment_id',v_old.id,'driver_id',v_old.driver_id,
    'delivery_id',p_delivery_id,'amount',v_old.amount,'deduction',v_old.deduction,
    'net_amount',v_old.net_amount,'commission_rate',0.03,'status','paid','idempotent_replay',true);
  end if;
  raise exception 'Malipo yaliyokamilika hayawezi kubadilishwa; tumia utaratibu wa marekebisho.';
 end if;

 if exists(select 1 from public.orders o join public.transaction_disputes td on td.order_id=o.id
  where o.checkout_id=v_checkout_id and o.vendor_id=v_vendor_id
   and td.status in ('open','under_review','waiting_for_buyer','waiting_for_seller','escalated')) then
  raise exception 'Malipo ya dereva yamesimamishwa kwa sababu kuna mgogoro wa oda. Subiri Admin atatue mgogoro kwanza.';
 end if;

 -- p_deduction is retained only for RPC compatibility; fixed 3% cannot be edited.
 v_commission:=round(p_amount*0.03,2);v_net:=p_amount-v_commission;
 v_reference:='ZUNE-DELIVERY-COMMISSION-'||p_delivery_id::text;
 insert into public.zune_driver_payment_records(
  driver_id,delivery_id,amount,deduction,net_amount,payment_method,payment_phone,
  transaction_reference,status,admin_note,created_by,paid_at
 ) values(v_driver_id,p_delivery_id,p_amount,v_commission,v_net,p_payment_method,v_phone,
  v_tx,p_status,v_note,v_admin,case when p_status='paid' then now() else null end)
 on conflict(delivery_id) do update set
  driver_id=excluded.driver_id,amount=excluded.amount,deduction=excluded.deduction,
  net_amount=excluded.net_amount,payment_method=excluded.payment_method,
  payment_phone=excluded.payment_phone,transaction_reference=excluded.transaction_reference,
  status=excluded.status,admin_note=excluded.admin_note,created_by=excluded.created_by,
  paid_at=case when excluded.status='paid' then coalesce(public.zune_driver_payment_records.paid_at,now()) else null end
 returning id into v_payment_id;

 update public.order_deliveries set driver_payout_amount=p_amount,zune_delivery_amount=v_commission,
  payout_status=case p_status when 'paid' then 'paid' when 'processing' then 'processing'
   when 'rejected' then 'rejected' else 'awaiting_payout' end
 where id=p_delivery_id;

 if p_status='paid' and v_commission>0 then
  insert into public.admin_wallet_transactions(reference,user_id,transaction_type,direction,amount,currency,status,description,payment_reference,created_by,approved_by,updated_at)
  values(v_reference,null,'commission','credit',v_commission,'TZS','completed',
   'Delivery commission (3%) for delivery '||p_delivery_id::text,coalesce(v_tx,p_delivery_id::text),v_admin,v_admin,now())
  on conflict(reference) do nothing;

  insert into public.zune_marketing_wallet_ledger(entry_type,direction,amount,reference,description)
  values('commission_credit','credit',v_commission,'commission:'||v_reference,
   'Delivery commission (3%) for delivery '||p_delivery_id::text)
  on conflict(reference) do nothing returning id into v_ledger_id;
  if v_ledger_id is not null then
   update public.zune_marketing_wallet_state set available_balance=available_balance+v_commission,updated_at=now()
   where singleton=true;
  end if;
 end if;

 insert into public.delivery_driver_audit_logs(driver_user_id,performed_by,action,reason)
 values(v_driver_id,v_admin,'payment_recorded',btrim(p_admin_reason));
 return jsonb_build_object('ok',true,'payment_id',v_payment_id,'driver_id',v_driver_id,
  'delivery_id',p_delivery_id,'amount',p_amount,'deduction',v_commission,'net_amount',v_net,
  'commission_rate',0.03,'status',p_status,'idempotent_replay',false);
end; $$;
revoke all on function private.zune_admin_record_driver_payment(uuid,numeric,numeric,text,text,text,text,text) from public,anon;
grant usage on schema private to authenticated;

create or replace function public.zune_driver_payment_dashboard()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
 v_uid uuid:=auth.uid();v_gross_earned numeric(14,2):=0;v_commission numeric(14,2):=0;
 v_earned numeric(14,2):=0;v_paid numeric(14,2):=0;v_pending numeric(14,2):=0;
 v_on_hold_dispute numeric(14,2):=0;v_delivery_count integer:=0;
 v_payments jsonb:='[]'::jsonb;v_deliveries jsonb:='[]'::jsonb;
begin
 if v_uid is null then raise exception 'Tafadhali ingia kwanza.';end if;
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
 select coalesce(sum(coalesce(p.net_amount,d.driver_payout_amount,0)),0) into v_on_hold_dispute
 from public.order_deliveries d left join public.zune_driver_payment_records p on p.delivery_id=d.id
 where d.assigned_driver_id=v_uid and d.status='completed' and d.buyer_confirmed_at is not null
  and d.payout_status='on_hold_dispute' and coalesce(p.status,'pending')<>'paid';
 v_pending:=greatest(v_earned-v_paid,0);

 select coalesce(jsonb_agg(x.obj order by x.created_at desc),'[]'::jsonb) into v_payments
 from (
  select jsonb_build_object('id',p.id,'delivery_id',p.delivery_id,'order_numbers',
   (select coalesce(jsonb_agg(z.public_id order by z.public_id),'[]'::jsonb)
    from (select distinct coalesce(o.public_order_id,o.order_number) public_id
     from public.order_deliveries d2 join public.orders o on o.checkout_id=d2.checkout_id and o.vendor_id=d2.vendor_id
     where d2.id=p.delivery_id) z),
   'amount',p.amount,'deduction',p.deduction,'net_amount',p.net_amount,'payment_method',p.payment_method,
   'payment_phone',p.payment_phone,'transaction_reference',p.transaction_reference,'status',p.status,
   'admin_note',p.admin_note,'created_at',p.created_at,'paid_at',p.paid_at) obj,p.created_at
  from public.zune_driver_payment_records p where p.driver_id=v_uid order by p.created_at desc limit 100
 ) x;

 select coalesce(jsonb_agg(x.obj order by x.created_at desc),'[]'::jsonb) into v_deliveries
 from (
  select jsonb_build_object('id',d.id,'order_numbers',
   (select coalesce(jsonb_agg(z.public_id order by z.public_id),'[]'::jsonb)
    from (select distinct coalesce(o.public_order_id,o.order_number) public_id
     from public.orders o where o.checkout_id=d.checkout_id and o.vendor_id=d.vendor_id) z),
   'status',d.status,'delivery_fee',d.delivery_fee,'driver_payout_amount',d.driver_payout_amount,
   'zune_delivery_amount',d.zune_delivery_amount,'payout_status',d.payout_status,
   'created_at',d.created_at,'buyer_confirmed_at',d.buyer_confirmed_at) obj,d.created_at
  from public.order_deliveries d where d.assigned_driver_id=v_uid and d.status in ('completed','delivered')
  order by d.created_at desc limit 100
 ) x;

 return jsonb_build_object('currency','TZS','totals',jsonb_build_object(
  'gross_earned',v_gross_earned,'commission',v_commission,'earned',v_earned,
  'paid',v_paid,'pending',v_pending,'on_hold_dispute',v_on_hold_dispute,
  'completed_deliveries',v_delivery_count),'payments',v_payments,'deliveries',v_deliveries);
end; $$;
revoke all on function public.zune_driver_payment_dashboard() from public,anon;
grant execute on function public.zune_driver_payment_dashboard() to authenticated;
