-- ZUNE Admin product moderation
-- Applied to Supabase project rpkogiieegqgxqbzwxwo on 2026-11-14.
-- Removed products are archived by status; product rows are never hard-deleted.
alter table public.products add column if not exists removed_at timestamptz, add column if not exists removed_by uuid references auth.users(id) on delete set null;
alter table public.products drop constraint if exists products_moderation_status_check;
alter table public.products add constraint products_moderation_status_check check (moderation_status = any (array['pending','approved','blocked','review','removed']));
alter table public.product_moderation_reviews drop constraint if exists product_moderation_reviews_status_check;
alter table public.product_moderation_reviews add constraint product_moderation_reviews_status_check check (status = any (array['approved','blocked','review','error','removed']));

drop policy if exists zune_admin_insert_product_notifications on public.notifications;\ncreate policy zune_admin_insert_product_notifications on public.notifications for insert to authenticated with check (public.zune_is_admin());\ndrop policy if exists zune_admin_insert_product_reviews on public.product_moderation_reviews;\ncreate policy zune_admin_insert_product_reviews on public.product_moderation_reviews for insert to authenticated with check (public.zune_is_admin());\n\ncreate or replace function public.zune_admin_manage_product(p_product_id uuid,p_action text,p_reason text default null,p_message text default null)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $
declare
 v_product public.products%rowtype;
 v_action text:=lower(trim(coalesce(p_action,'')));
 v_reason text:=nullif(trim(coalesce(p_reason,'')),'');
 v_message text:=nullif(trim(coalesce(p_message,'')),'');
 v_title text; v_body text; v_status text;
begin
 if auth.uid() is null or not public.zune_is_admin() then raise exception 'Admin permission required' using errcode='42501'; end if;
 if v_action not in ('approve','block','remove','message') then raise exception 'Invalid product action'; end if;
 if v_action in ('block','remove') and length(coalesce(v_reason,''))<5 then raise exception 'Sababu lazima iwe na angalau herufi 5.'; end if;
 if v_action='message' and length(coalesce(v_message,''))<5 then raise exception 'Ujumbe lazima uwe na angalau herufi 5.'; end if;
 select * into v_product from public.products where id=p_product_id for update;
 if not found then raise exception 'Bidhaa haijapatikana.'; end if;
 if v_action='approve' then
  update public.products set moderation_status='approved',moderation_reason=null,moderated_at=now(),published_at=coalesce(published_at,now()),removed_at=null,removed_by=null where id=p_product_id;
  v_status:='approved';v_title:='Bidhaa imeidhinishwa';v_body:=coalesce(v_message,'Bidhaa yako imeidhinishwa na inaweza kuonekana sokoni.');
 elsif v_action='block' then
  update public.products set moderation_status='blocked',moderation_reason=v_reason,moderated_at=now() where id=p_product_id;
  v_status:='blocked';v_title:='Bidhaa imezuiwa';v_body:=coalesce(v_message,'Bidhaa yako imezuiwa. Sababu: '||v_reason);
 elsif v_action='remove' then
  update public.products set moderation_status='removed',moderation_reason=v_reason,moderated_at=now(),removed_at=now(),removed_by=auth.uid() where id=p_product_id;
  v_status:='removed';v_title:='Bidhaa imeondolewa sokoni';v_body:=coalesce(v_message,'Bidhaa yako imeondolewa sokoni. Sababu: '||v_reason||'. Rekodi ya bidhaa imehifadhiwa.');
 else
  v_status:=coalesce(v_product.moderation_status,'unknown');v_title:='Ujumbe kutoka ZUNE Admin';v_body:=v_message;
 end if;
 insert into public.product_moderation_reviews(user_id,product_id,title,status,reason,categories,model)
 values(v_product.vendor_id,p_product_id,v_product.title,case when v_action='message' then 'review' else v_status end,coalesce(v_reason,v_message),case when v_product.category is null then '[]'::jsonb else jsonb_build_array(v_product.category) end,'admin-manual');
 insert into public.notifications(user_id,type,title_sw,title_en,body_sw,body_en,action_url,data,is_read)
 values(v_product.vendor_id,'product_moderation',v_title,v_title,v_body,v_body,'/#seller-dashboard',jsonb_build_object('product_id',p_product_id,'product_title',v_product.title,'action',v_action,'moderation_status',v_status),false);
 insert into public.admin_activity_logs(actor_id,action,target_type,target_id,reason,details,result)
 values(auth.uid(),'product_'||v_action,'product',p_product_id::text,coalesce(v_reason,v_message,'Admin product action'),jsonb_build_object('product_title',v_product.title,'vendor_id',v_product.vendor_id,'previous_status',v_product.moderation_status,'new_status',v_status,'seller_message',v_message),'success');
 return jsonb_build_object('success',true,'product_id',p_product_id,'action',v_action,'moderation_status',v_status);
end;$$;
revoke all on function public.zune_admin_manage_product(uuid,text,text,text) from public,anon;
grant execute on function public.zune_admin_manage_product(uuid,text,text,text) to authenticated;
