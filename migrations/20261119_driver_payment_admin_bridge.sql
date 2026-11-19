-- ZUNE Admin bridge for driver payouts. Records payouts only; does not send mobile money.
drop function if exists public.zune_admin_record_driver_payment(uuid,numeric,numeric,text,text,text,text);
create function public.zune_admin_record_driver_payment(
 p_delivery_id uuid,p_amount numeric,p_deduction numeric default 0,
 p_payment_method text default 'manual',p_payment_phone text default null,
 p_transaction_reference text default null,p_status text default 'pending',p_admin_reason text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_admin uuid;v_driver_id uuid;v_payment_id uuid;v_net numeric(14,2);v_old_status text;
begin
 v_admin:=public.zune_assert_admin(p_admin_reason);
 if p_amount is null or p_amount<=0 or coalesce(p_deduction,0)<0 or coalesce(p_deduction,0)>p_amount then raise exception 'Kiasi au makato si sahihi.';end if;
 if p_status not in ('pending','processing','paid','rejected') then raise exception 'Hali ya malipo si sahihi.';end if;
 if p_payment_method not in ('mpesa','airtel_money','mixx_by_yas','halopesa','bank','cash','manual') then raise exception 'Njia ya malipo haijaruhusiwa.';end if;
 select d.assigned_driver_id into v_driver_id from public.order_deliveries d
 join public.delivery_driver_profiles dp on dp.user_id=d.assigned_driver_id
 where d.id=p_delivery_id and d.status='completed' and d.buyer_confirmed_at is not null and dp.status='active'
 for update of d;
 if v_driver_id is null then raise exception 'Delivery haijakamilika, haijathibitishwa, au dereva si active.';end if;
 select status into v_old_status from public.zune_driver_payment_records where delivery_id=p_delivery_id;
 v_net:=p_amount-coalesce(p_deduction,0);
 insert into public.zune_driver_payment_records(driver_id,delivery_id,amount,deduction,net_amount,payment_method,payment_phone,transaction_reference,status,admin_note,created_by,paid_at)
 values(v_driver_id,p_delivery_id,p_amount,coalesce(p_deduction,0),v_net,p_payment_method,nullif(trim(coalesce(p_payment_phone,'')),''),
 nullif(trim(coalesce(p_transaction_reference,'')),''),p_status,nullif(trim(coalesce(p_admin_reason,'')),''),v_admin,case when p_status='paid' then now() else null end)
 on conflict(delivery_id) do update set driver_id=excluded.driver_id,amount=excluded.amount,deduction=excluded.deduction,net_amount=excluded.net_amount,
 payment_method=excluded.payment_method,payment_phone=excluded.payment_phone,transaction_reference=excluded.transaction_reference,
 status=excluded.status,admin_note=excluded.admin_note,created_by=excluded.created_by,paid_at=excluded.paid_at returning id into v_payment_id;
 update public.order_deliveries set driver_payout_amount=p_amount,payout_status=case p_status when 'paid' then 'paid' when 'processing' then 'processing' when 'rejected' then 'rejected' else 'awaiting_payout' end where id=p_delivery_id;
 insert into public.delivery_driver_audit_logs(driver_user_id,performed_by,action,reason)
 values(v_driver_id,v_admin,case when v_old_status is null then 'payment_recorded' else 'payment_updated' end,btrim(p_admin_reason));
 return jsonb_build_object('ok',true,'payment_id',v_payment_id,'driver_id',v_driver_id,'delivery_id',p_delivery_id,'amount',p_amount,'deduction',coalesce(p_deduction,0),'net_amount',v_net,'status',p_status);
end;$$;
revoke all on function public.zune_admin_record_driver_payment(uuid,numeric,numeric,text,text,text,text,text) from public,anon;
grant execute on function public.zune_admin_record_driver_payment(uuid,numeric,numeric,text,text,text,text,text) to authenticated;