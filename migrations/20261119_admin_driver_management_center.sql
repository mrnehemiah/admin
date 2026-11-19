-- ZUNE Delivery Admin: complete driver onboarding, document review, invitations and lifecycle controls.
CREATE OR REPLACE FUNCTION public.admin_review_delivery_driver_application(p_application_id uuid,p_decision text,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_admin uuid; v_app public.delivery_driver_applications%rowtype;
BEGIN
  v_admin:=public.zune_assert_admin(p_reason);
  IF p_decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Uamuzi si sahihi.' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_app FROM public.delivery_driver_applications WHERE id=p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ombi la dereva halijapatikana.'; END IF;
  IF v_app.status<>'pending' THEN RAISE EXCEPTION 'Ombi hili limeshakaguliwa.'; END IF;
  IF p_decision='approved' AND (
    NOT EXISTS(SELECT 1 FROM public.delivery_driver_documents d WHERE d.user_id=v_app.user_id AND d.document_type='national_id' AND d.status='approved')
    OR NOT EXISTS(SELECT 1 FROM public.delivery_driver_documents d WHERE d.user_id=v_app.user_id AND d.document_type='driver_photo' AND d.status='approved')
    OR NOT EXISTS(SELECT 1 FROM public.delivery_driver_documents d WHERE d.user_id=v_app.user_id AND d.document_type='driving_license' AND d.status='approved' AND d.expiry_date IS NOT NULL AND d.expiry_date>=current_date)
    OR NOT EXISTS(SELECT 1 FROM public.delivery_driver_documents d WHERE d.user_id=v_app.user_id AND d.document_type='vehicle_registration' AND d.status='approved')
    OR NOT EXISTS(SELECT 1 FROM public.delivery_driver_documents d WHERE d.user_id=v_app.user_id AND d.document_type='vehicle_insurance' AND d.status='approved' AND d.expiry_date IS NOT NULL AND d.expiry_date>=current_date)
  ) THEN RAISE EXCEPTION 'Nyaraka tano za lazima lazima ziwe approved; leseni na bima visiwe vimeisha muda.'; END IF;
  UPDATE public.delivery_driver_profiles SET status=CASE WHEN p_decision='approved' THEN 'active' ELSE 'rejected' END,
    approved_by=CASE WHEN p_decision='approved' THEN v_admin ELSE NULL END,
    approved_at=CASE WHEN p_decision='approved' THEN now() ELSE NULL END,
    rejection_reason=CASE WHEN p_decision='rejected' THEN btrim(p_reason) ELSE NULL END,updated_at=now()
    WHERE user_id=v_app.user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Taarifa za dereva hazijapatikana.'; END IF;
  UPDATE public.profiles SET role=CASE WHEN p_decision='approved' THEN 'driver'::public.user_role
    WHEN role::text='driver' THEN 'buyer'::public.user_role ELSE role END WHERE id=v_app.user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wasifu wa akaunti haujapatikana.'; END IF;
  UPDATE public.delivery_driver_applications SET status=p_decision,reviewed_at=now(),reviewed_by=v_admin,review_note=btrim(p_reason) WHERE id=p_application_id;
  INSERT INTO public.delivery_driver_audit_logs(driver_user_id,performed_by,action,reason) VALUES(v_app.user_id,v_admin,p_decision,btrim(p_reason));
  RETURN jsonb_build_object('ok',true,'application_id',p_application_id,'driver_user_id',v_app.user_id,'status',p_decision);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_review_delivery_driver_document(p_document_id uuid,p_decision text,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_admin uuid; v_doc public.delivery_driver_documents%rowtype;
BEGIN
  v_admin:=public.zune_assert_admin(p_reason);
  IF p_decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Uamuzi wa nyaraka si sahihi.'; END IF;
  SELECT * INTO v_doc FROM public.delivery_driver_documents WHERE id=p_document_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Nyaraka haijapatikana.'; END IF;
  IF p_decision='approved' AND v_doc.document_type IN ('driving_license','vehicle_insurance')
    AND (v_doc.expiry_date IS NULL OR v_doc.expiry_date<current_date) THEN RAISE EXCEPTION 'Nyaraka imeisha muda au haina tarehe ya mwisho.'; END IF;
  UPDATE public.delivery_driver_documents SET status=p_decision,review_note=nullif(btrim(p_reason),''),reviewed_by=v_admin,reviewed_at=now(),updated_at=now() WHERE id=p_document_id;
  INSERT INTO public.delivery_driver_audit_logs(driver_user_id,performed_by,action,reason)
    VALUES(v_doc.user_id,v_admin,CASE WHEN p_decision='approved' THEN 'document_approved' ELSE 'document_returned' END,coalesce(nullif(btrim(p_reason),''),'Ukaguzi wa nyaraka: '||v_doc.document_type));
  RETURN jsonb_build_object('ok',true,'document_id',p_document_id,'driver_user_id',v_doc.user_id,'status',p_decision);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_delivery_driver_status(p_driver_id uuid,p_status text,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_admin uuid; v_old text;
BEGIN
  v_admin:=public.zune_assert_admin(p_reason);
  IF p_status NOT IN ('active','suspended') THEN RAISE EXCEPTION 'Hali mpya si sahihi.'; END IF;
  SELECT status INTO v_old FROM public.delivery_driver_profiles WHERE user_id=p_driver_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Dereva hajapatikana.'; END IF;
  IF p_status='active' AND NOT EXISTS(SELECT 1 FROM public.delivery_driver_applications a WHERE a.user_id=p_driver_id AND a.status='approved')
    THEN RAISE EXCEPTION 'Dereva ambaye hajaidhinishwa hawezi kurejeshwa.'; END IF;
  IF p_status='active' AND (SELECT count(DISTINCT d.document_type) FROM public.delivery_driver_documents d
    WHERE d.user_id=p_driver_id AND d.status='approved' AND (d.document_type NOT IN ('driving_license','vehicle_insurance') OR (d.expiry_date IS NOT NULL AND d.expiry_date>=current_date)))<5
    THEN RAISE EXCEPTION 'Dereva hawezi kurejeshwa mpaka nyaraka tano ziwe approved na halali.'; END IF;
  UPDATE public.delivery_driver_profiles SET status=p_status,updated_at=now(),rejection_reason=CASE WHEN p_status='active' THEN NULL ELSE rejection_reason END WHERE user_id=p_driver_id;
  INSERT INTO public.delivery_driver_audit_logs(driver_user_id,performed_by,action,reason)
    VALUES(p_driver_id,v_admin,CASE WHEN p_status='active' THEN 'restored' ELSE 'suspended' END,btrim(p_reason));
  RETURN jsonb_build_object('ok',true,'driver_user_id',p_driver_id,'previous_status',v_old,'status',p_status);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_create_delivery_driver_invitation(p_phone text,p_email text,p_expires_hours integer,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $function$
DECLARE v_admin uuid; v_code text; v_id uuid; v_expiry timestamptz;
BEGIN
  v_admin:=public.zune_assert_admin(p_reason);
  IF nullif(btrim(coalesce(p_phone,'')),'') IS NULL AND nullif(btrim(coalesce(p_email,'')),'') IS NULL THEN RAISE EXCEPTION 'Weka simu au email ya mwombaji.'; END IF;
  IF p_expires_hours IS NULL OR p_expires_hours<1 OR p_expires_hours>720 THEN RAISE EXCEPTION 'Muda wa mwaliko uwe kati ya saa 1 na 720.'; END IF;
  v_code:=upper(encode(extensions.gen_random_bytes(6),'hex'));v_expiry:=now()+make_interval(hours=>p_expires_hours);
  INSERT INTO public.delivery_driver_invitations(created_by,invite_code_hash,intended_phone,intended_email,expires_at)
    VALUES(v_admin,encode(extensions.digest(lower(v_code),'sha256'),'hex'),nullif(btrim(p_phone),''),nullif(lower(btrim(p_email)),''),v_expiry) RETURNING id INTO v_id;
  INSERT INTO public.delivery_driver_audit_logs(driver_user_id,performed_by,action,reason) VALUES(v_admin,v_admin,'invitation_created',btrim(p_reason));
  RETURN jsonb_build_object('ok',true,'invitation_id',v_id,'invite_code',v_code,'expires_at',v_expiry);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_review_delivery_driver_application(uuid,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.admin_review_delivery_driver_document(uuid,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.admin_set_delivery_driver_status(uuid,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.admin_create_delivery_driver_invitation(text,text,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_review_delivery_driver_application(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_delivery_driver_document(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_delivery_driver_status(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_delivery_driver_invitation(text,text,integer,text) TO authenticated;
