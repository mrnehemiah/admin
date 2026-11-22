(()=>{
const $=s=>document.querySelector(s),body=$('#deliveryOpsBody'),events=$('#deliveryOpsEvents');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'TSh '+Number(v||0).toLocaleString('en-US');
const labels={pending:'Inasubiri',assigned:'Dereva amechaguliwa',ready_for_pickup:'Muuzaji amekabidhi',picked_up:'Dereva amepokea',in_transit:'Iko njiani',delivered:'Imefikishwa',completed:'Imekamilika',disputed:'Ina uchunguzi',cancelled:'Imeghairiwa'};
let rows=[],trackingRows=[],activeDrivers=[],applicationRows=[],directoryRows=[],documentRows=[];
const requiredDocs=['national_id','driver_photo','driving_license','vehicle_registration','vehicle_insurance'];
const driverDocLabels={national_id:'Kitambulisho NIDA',driver_photo:'Picha ya dereva',driving_license:'Leseni ya udereva',vehicle_registration:'Kadi ya usajili',vehicle_insurance:'Bima ya chombo',vehicle_photo:'Picha ya chombo',vehicle_authorization:'Ruhusa ya kutumia chombo'};
const date=v=>v?new Date(v).toLocaleString('sw-TZ'):'—';
async function loadDriverApplications(){
 const appsBody=$('#driverApplicationsBody');if(!appsBody)return;
 const db=window.ZUNE_CORE?.db?.();if(!db){appsBody.innerHTML='<tr><td colspan="6">Supabase haijaunganishwa.</td></tr>';return;}
 appsBody.innerHTML='<tr><td colspan="6">Inapakia maombi...</td></tr>';
 const {data:apps,error}=await db.from('delivery_driver_applications').select('id,user_id,application_source,status,submitted_at,reviewed_at,review_note').order('submitted_at',{ascending:false});
 if(error){appsBody.innerHTML='<tr><td colspan="6">'+esc(error.message)+'</td></tr>';return;}
 applicationRows=apps||[];
 const ids=[...new Set(applicationRows.map(a=>a.user_id))];
 const {data:drivers,error:driverError}=ids.length?await db.from('delivery_driver_profiles').select('user_id,full_name,phone_number,email,vehicle_type,vehicle_registration,license_number,status').in('user_id',ids):{data:[],error:null};
 if(driverError){appsBody.innerHTML='<tr><td colspan="6">'+esc(driverError.message)+'</td></tr>';return;}
 const byId=new Map((drivers||[]).map(d=>[d.user_id,d]));
 applicationRows=applicationRows.map(a=>({...a,driver:byId.get(a.user_id)||{}}));
 renderDriverApplications();
}
function renderDriverApplications(){
 const appsBody=$('#driverApplicationsBody');if(!appsBody)return;
 const q=String($('#driverApplicationSearch')?.value||'').toLowerCase().trim(),filter=$('#driverApplicationFilter')?.value||'all';
 const list=applicationRows.filter(a=>(filter==='all'||a.status===filter)&&[a.driver.full_name,a.driver.phone_number,a.driver.email,a.user_id].some(v=>String(v||'').toLowerCase().includes(q)));
 appsBody.innerHTML=list.length?list.map(a=>{
  const d=a.driver||{},contact=[d.phone_number,d.email].filter(Boolean).map(esc).join('<br>');
  const vehicle=[d.vehicle_type,d.vehicle_registration,d.license_number].filter(Boolean).map(esc).join(' · ');
  const status=a.status==='approved'?'success':a.status==='rejected'?'danger':'warning';
  const action=a.status==='pending'?'<button class="primary-btn" type="button" data-driver-review="approved" data-application-id="'+esc(a.id)+'">Idhinisha</button><button class="danger-btn" type="button" data-driver-review="rejected" data-application-id="'+esc(a.id)+'">Kataa</button>':'<span class="badge-pill '+status+'">'+esc(a.status)+'</span>';
  return '<tr><td><strong>'+esc(d.full_name||'Dereva')+'</strong><small>'+esc(a.user_id)+'</small></td><td>'+(contact||'—')+'</td><td>'+(vehicle||'—')+'</td><td>'+esc(a.application_source==='admin_invite'?'Mwaliko wa Admin':'Ombi binafsi')+'</td><td>'+esc(date(a.submitted_at))+'</td><td><div class="action-row">'+action+'</div>'+(a.review_note?'<small>'+esc(a.review_note)+'</small>':'')+'</td></tr>';
 }).join(''):'<tr><td colspan="6" class="empty-state">Hakuna maombi yanayolingana na kichujio.</td></tr>';
}
async function reviewDriverApplication(id,decision,button){
 const reason=window.prompt(decision==='approved'?'Sababu ya kuidhinisha dereva:':'Sababu ya kukataa ombi:');
 if(!reason||reason.trim().length<5){window.alert('Sababu lazima iwe na angalau herufi 5.');return;}
 if(!window.confirm(decision==='approved'?'Unathibitisha kumuidhinisha dereva? Mfumo utakagua nyaraka 5 na role itakuwa Driver.':'Unathibitisha kukataa ombi hili?'))return;
 button.disabled=true;
 const db=window.ZUNE_CORE?.db?.();
 const {data,error}=await db.rpc('admin_review_delivery_driver_application',{p_application_id:id,p_decision:decision,p_reason:reason.trim()});
 button.disabled=false;
 if(error){window.alert(error.message);return;}
 if(!data?.ok){window.alert('Admin haikuthibitisha mabadiliko.');return;}
 window.alert(decision==='approved'?'Dereva ameidhinishwa. Role imebadilika kuwa Driver.':'Ombi limekataliwa; akaunti imebaki Buyer.');
 await Promise.all([loadDriverApplications(),loadDriverDirectory(),loadDriverDocuments()]);
}
async function createDriverInvitation(event){
 event.preventDefault();const form=$('#driverInviteForm'),button=$('#createDriverInviteBtn'),result=$('#driverInviteResult');
 const phone=$('#driverInvitePhone')?.value.trim()||null,email=$('#driverInviteEmail')?.value.trim()||null,reason=$('#driverInviteReason')?.value.trim()||'';
 if(!phone&&!email){window.alert('Weka namba ya simu au email.');return;}
 if(reason.length<5){window.alert('Sababu iwe na angalau herufi 5.');return;}
 button.disabled=true;button.textContent='Inatengeneza...';
 try{
  const db=window.ZUNE_CORE?.db?.();
  const {data,error}=await db.rpc('admin_create_delivery_driver_invitation',{p_phone:phone,p_email:email,p_expires_hours:Number($('#driverInviteExpiry').value),p_reason:reason});
  if(error)throw error;if(!data?.ok)throw new Error('Mwaliko haukutengenezwa.');
  result.hidden=false;result.innerHTML='<strong>Code ya mwaliko (itumike mara moja):</strong><div style="font-size:22px;font-weight:900;letter-spacing:3px;margin:8px 0">'+esc(data.invite_code)+'</div><div>Inaisha: '+esc(date(data.expires_at))+'</div><button type="button" class="secondary-btn" id="copyDriverInviteCode">Nakili code</button>';
  $('#copyDriverInviteCode')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(data.invite_code);window.alert('Code imenakiliwa.');}catch{window.prompt('Nakili code hii:',data.invite_code);}});
  form.reset();
 }catch(e){window.alert(e.message||e);}finally{button.disabled=false;button.textContent='Tengeneza mwaliko';}
}
async function loadDriverDirectory(){
 const db=window.ZUNE_CORE?.db?.(),body=$('#driverDirectoryBody');if(!db||!body)return;
 body.innerHTML='<tr><td colspan="7">Inapakia...</td></tr>';
 const {data,error}=await db.from('delivery_driver_profiles').select('user_id,full_name,phone_number,email,vehicle_type,vehicle_registration,status,created_at').order('created_at',{ascending:false});
 if(error){body.innerHTML='<tr><td colspan="7">'+esc(error.message)+'</td></tr>';return;}
 directoryRows=data||[];
 const {data:docRows,error:docError}=await db.from('delivery_driver_documents').select('user_id,document_type,status,expiry_date');
 if(docError)console.warn('Driver document summary:',docError.message);
 const today=new Date().toISOString().slice(0,10),docMap=new Map();(docRows||[]).forEach(x=>{const v=docMap.get(x.user_id)||{approved:new Set(),total:0};v.total++;const expiryValid=['driving_license','vehicle_insurance'].includes(x.document_type)?!!x.expiry_date&&x.expiry_date>=today:(!x.expiry_date||x.expiry_date>=today);if(x.status==='approved'&&requiredDocs.includes(x.document_type)&&expiryValid)v.approved.add(x.document_type);docMap.set(x.user_id,v);});
 directoryRows=directoryRows.map(d=>{const docsRequired=requiredDocs.filter(t=>!(t==='driving_license'&&d.vehicle_type==='bicycle')).length;return {...d,docsApproved:requiredDocs.filter(t=>!(t==='driving_license'&&d.vehicle_type==='bicycle')&&docMap.get(d.user_id)?.approved.has(t)).length,docsRequired,docsTotal:docMap.get(d.user_id)?.total||0};});
 $('#driverCountAll').textContent=directoryRows.length;$('#driverCountActive').textContent=directoryRows.filter(x=>x.status==='active').length;$('#driverCountPending').textContent=directoryRows.filter(x=>x.status==='pending').length;$('#driverCountSuspended').textContent=directoryRows.filter(x=>x.status==='suspended').length;
 renderDriverDirectory();
}
function renderDriverDirectory(){
 const body=$('#driverDirectoryBody');if(!body)return;
 const q=String($('#driverDirectorySearch')?.value||'').toLowerCase(),filter=$('#driverDirectoryFilter')?.value||'all';
 const list=directoryRows.filter(d=>(filter==='all'||d.status===filter)&&[d.full_name,d.phone_number,d.email,d.user_id,d.vehicle_registration].some(v=>String(v||'').toLowerCase().includes(q)));
 body.innerHTML=list.length?list.map(d=>{
  const status=d.status==='active'?'success':d.status==='suspended'||d.status==='rejected'?'danger':'warning';
  const action=d.status==='active'?'<button class="danger-btn" data-driver-status="suspended" data-driver-id="'+esc(d.user_id)+'">Simamisha</button>':d.status==='suspended'?'<button class="primary-btn" data-driver-status="active" data-driver-id="'+esc(d.user_id)+'">Rejesha</button>':'—';
  const compliance=d.docsApproved===d.docsRequired?'<span class="badge-pill success">'+d.docsApproved+'/'+d.docsRequired+' zimeidhinishwa</span>':'<span class="badge-pill warning">'+d.docsApproved+'/'+d.docsRequired+' zimeidhinishwa</span>';
  return '<tr><td><strong>'+esc(d.full_name)+'</strong><small>'+esc(d.user_id)+'</small></td><td>'+esc(d.phone_number)+'<br><small>'+esc(d.email||'')+'</small></td><td>'+esc(d.vehicle_type)+'<br><small>'+esc(d.vehicle_registration||'—')+'</small></td><td>'+compliance+'</td><td><span class="badge-pill '+status+'">'+esc(d.status)+'</span></td><td>'+esc(d.created_at?new Date(d.created_at).toLocaleDateString('sw-TZ'):'—')+'</td><td><div class="action-row">'+action+'</div></td></tr>';
 }).join(''):'<tr><td colspan="7" class="empty-state">Hakuna dereva anayelingana na utafutaji.</td></tr>';
}
async function setDriverStatus(id,status,button){
 const reason=window.prompt(status==='suspended'?'Sababu ya kusimamisha dereva:':'Sababu ya kurejesha dereva:');
 if(!reason||reason.trim().length<5){window.alert('Sababu lazima iwe na angalau herufi 5.');return;}
 if(!window.confirm(status==='suspended'?'Unathibitisha kusimamisha dereva?':'Unathibitisha kurejesha dereva?'))return;
 button.disabled=true;
 const db=window.ZUNE_CORE?.db?.();
 const {data,error}=await db.rpc('admin_set_delivery_driver_status',{p_driver_id:id,p_status:status,p_reason:reason.trim()});
 button.disabled=false;if(error){window.alert(error.message);return;}
 if(!data?.ok){window.alert('Mabadiliko hayakuthibitishwa.');return;}
 await loadDriverDirectory();
}
async function loadVehicleChangeRequests(){
 const body=$('#vehicleChangeRequestsBody'),client=window.ZUNE_CORE?.db?.();if(!body||!client)return;
 body.innerHTML='<tr><td colspan="6">Inapakia maombi...</td></tr>';
 const {data,error}=await client.from('delivery_driver_vehicle_change_requests').select('id,user_id,current_vehicle_type,current_vehicle_registration,current_license_number,current_vehicle_ownership,requested_vehicle_type,requested_vehicle_registration,requested_license_number,requested_vehicle_ownership,reason,status,submitted_at,review_note').order('submitted_at',{ascending:false}).limit(250);
 if(error){body.innerHTML='<tr><td colspan="6">'+esc(error.message)+'</td></tr>';return;}
 const requests=data||[],ids=[...new Set(requests.map(x=>x.user_id))];
 const {data:drivers,error:driverError}=ids.length?await client.from('delivery_driver_profiles').select('user_id,full_name,phone_number').in('user_id',ids):{data:[],error:null};
 if(driverError){body.innerHTML='<tr><td colspan="6">'+esc(driverError.message)+'</td></tr>';return;}
 const byId=new Map((drivers||[]).map(x=>[x.user_id,x]));
 const vehicle=(type,reg,license,ownership)=>[type,reg,license,ownership].filter(Boolean).join(' · ')||'—';
 body.innerHTML=requests.length?requests.map(r=>{
  const d=byId.get(r.user_id)||{},status=r.status==='approved'?'success':r.status==='rejected'?'danger':'warning';
  const action=r.status==='pending'?'<div class="action-row"><button class="primary-btn" data-vehicle-change-review="approved" data-request-id="'+esc(r.id)+'">Idhinisha</button><button class="danger-btn" data-vehicle-change-review="rejected" data-request-id="'+esc(r.id)+'">Kataa</button></div>':'<span class="badge-pill '+status+'">'+esc(r.status)+'</span>'+(r.review_note?'<small>'+esc(r.review_note)+'</small>':'');
  return '<tr><td><strong>'+esc(d.full_name||'Dereva')+'</strong><small>'+esc(d.phone_number||'')+'</small></td><td>'+esc(vehicle(r.current_vehicle_type,r.current_vehicle_registration,r.current_license_number,r.current_vehicle_ownership))+'</td><td><strong>'+esc(vehicle(r.requested_vehicle_type,r.requested_vehicle_registration,r.requested_license_number,r.requested_vehicle_ownership))+'</strong></td><td>'+esc(r.reason)+'</td><td>'+esc(date(r.submitted_at))+'</td><td>'+action+'</td></tr>';
 }).join(''):'<tr><td colspan="6" class="empty-state">Hakuna ombi la kubadilisha chombo.</td></tr>';
}
async function reviewVehicleChangeRequest(id,decision,button){
 const reason=window.prompt(decision==='approved'?'Sababu ya kuidhinisha mabadiliko ya chombo:':'Sababu ya kukataa ombi la mabadiliko:');
 if(!reason||reason.trim().length<5){window.alert('Sababu lazima iwe na angalau herufi 5.');return;}
 if(!window.confirm(decision==='approved'?'Unaidhinisha taarifa mpya za chombo? Zitaanza kutumika baada ya uamuzi huu.':'Unathibitisha kukataa ombi hili? Taarifa za sasa zitaendelea kutumika.'))return;
 button.disabled=true;
 const {data,error}=await window.ZUNE_CORE.db().rpc('admin_review_delivery_vehicle_change_request',{p_request_id:id,p_decision:decision,p_reason:reason.trim()});
 button.disabled=false;if(error){window.alert(error.message);return;}if(!data?.ok){window.alert('Uamuzi haukukamilika.');return;}
 window.alert(decision==='approved'?'Taarifa mpya za chombo zimeidhinishwa.':'Ombi limekataliwa; taarifa za awali zimebaki.');
 await Promise.all([loadVehicleChangeRequests(),loadDriverDirectory()]);
}
async function loadDriverDocuments(){
 const db=window.ZUNE_CORE?.db?.(),body=$('#driverDocumentsBody');if(!db||!body)return;
 body.innerHTML='<tr><td colspan="6">Inapakia...</td></tr>';
 const {data,error}=await db.from('delivery_driver_documents').select('id,user_id,document_type,file_path,original_file_name,expiry_date,status,review_note,created_at').order('created_at',{ascending:false});
 if(error){body.innerHTML='<tr><td colspan="6">'+esc(error.message)+'</td></tr>';return;}
 documentRows=data||[];const ids=[...new Set(documentRows.map(d=>d.user_id))];let names={};
 if(ids.length){const {data:drivers}=await db.from('delivery_driver_profiles').select('user_id,full_name,phone_number').in('user_id',ids);(drivers||[]).forEach(d=>names[d.user_id]=d);}
 const signed=await Promise.all(documentRows.map(async d=>{const {data,error}=await db.storage.from('zune-driver-documents').createSignedUrl(d.file_path,120);if(error)console.warn('Signed document URL:',error.message);return [d.id,data?.signedUrl||null];}));
 const urls=Object.fromEntries(signed);
 body.innerHTML=documentRows.length?documentRows.map(d=>{
  const driver=names[d.user_id]||{},url=urls[d.id],status=d.status==='approved'?'success':d.status==='rejected'?'danger':'warning';
  const reviewable=['pending','submitted','needs_correction'].includes(d.status);
  return '<tr><td><strong>'+esc(driver.full_name||'Dereva')+'</strong><small>'+esc(driver.phone_number||'')+'</small></td><td>'+esc(driverDocLabels[d.document_type]||d.document_type)+'</td><td>'+(url?'<a class="secondary-btn" target="_blank" rel="noopener noreferrer" href="'+esc(url)+'">Fungua faili</a>':'Haipatikani')+'<small>'+esc(d.original_file_name||'')+'</small></td><td>'+esc(d.expiry_date||'—')+'</td><td><span class="badge-pill '+status+'">'+esc(d.status)+'</span>'+(d.review_note?'<small>'+esc(d.review_note)+'</small>':'')+'</td><td><div class="action-row">'+(reviewable?'<button class="primary-btn" data-doc-review="approved" data-doc-id="'+esc(d.id)+'">Idhinisha</button><button class="danger-btn" data-doc-review="rejected" data-doc-id="'+esc(d.id)+'">Rudisha</button>':'—')+'</div></td></tr>';
 }).join(''):'<tr><td colspan="6" class="empty-state">Bado hakuna nyaraka zilizopakiwa.</td></tr>';
}
async function reviewDriverDocument(id,status,button){
 const reason=window.prompt(status==='approved'?'Maelezo ya ukaguzi (hiari):':'Sababu ya kurudisha nyaraka kwa marekebisho:');
 if(status==='rejected'&&(!reason||reason.trim().length<5)){window.alert('Andika sababu yenye angalau herufi 5.');return;}
 if(!window.confirm(status==='approved'?'Unaidhinisha nyaraka hii?':'Unarudisha nyaraka hii kwa marekebisho?'))return;
 button.disabled=true;const db=window.ZUNE_CORE?.db?.();
 const {data,error}=await db.rpc('admin_review_delivery_driver_document',{p_document_id:id,p_decision:status,p_reason:(reason||'Nyaraka imekaguliwa na Admin').trim()});
 button.disabled=false;if(error){window.alert(error.message);return;}if(!data?.ok){window.alert('Ukaguzi haukukamilika.');return;}
 await Promise.all([loadDriverDocuments(),loadDriverDirectory()]);
}
async function load(){
 if(window.ZUNE_AUTH_READY)await window.ZUNE_AUTH_READY;
 const db=window.ZUNE_CORE?.db?.();if(!db){if(body)body.innerHTML='<tr><td colspan="9">Supabase haijaunganishwa.</td></tr>';return;}
 if(body)body.innerHTML='<tr><td colspan="9">Inapakia...</td></tr>';
 const {data,error}=await db.rpc('zune_delivery_seller_queue');if(error)throw error;rows=data||[];
 const [trackResult,driverResult]=await Promise.all([db.rpc('zune_delivery_seller_tracking'),db.rpc('zune_delivery_active_drivers')]);
 trackingRows=trackResult.error?[]:(trackResult.data||[]);activeDrivers=driverResult.error?[]:(driverResult.data||[]);
 if(trackResult.error)console.warn('Delivery tracking:',trackResult.error.message);if(driverResult.error)console.warn('Active drivers:',driverResult.error.message);
 if(body)body.innerHTML=rows.length?rows.map(d=>{const track=trackingRows.find(x=>x.delivery_id===d.delivery_id)||{};const driver=activeDrivers.find(x=>x.driver_id===d.assigned_driver_id);const lat=track.last_latitude,lng=track.last_longitude,dlat=d.latitude,dlng=d.longitude;const valid=(a,b)=>a!=null&&b!=null&&Number.isFinite(Number(a))&&Number.isFinite(Number(b));const driverMap=valid(lat,lng)?'<a class="secondary-btn" target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/?mlat='+Number(lat)+'&mlon='+Number(lng)+'#map=16/'+Number(lat)+'/'+Number(lng)+'">Dereva</a>':'';const buyerMap=valid(dlat,dlng)?'<a class="secondary-btn" target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/?mlat='+Number(dlat)+'&mlon='+Number(dlng)+'#map=16/'+Number(dlat)+'/'+Number(dlng)+'">Mnunuzi</a>':'';const updated=track.last_location_at?'<small>GPS: '+esc(date(track.last_location_at))+'</small>':'';return '<tr><td><button class="secondary-btn" data-events="'+esc(d.delivery_id)+'">'+esc(d.delivery_id.slice(0,8))+'</button></td><td>'+esc(d.vendor_id)+'</td><td>'+esc(d.recipient_name)+'<br><small>'+esc(d.recipient_phone)+'</small></td><td>'+esc(driver?.full_name||(d.assigned_driver_id||'Hajapangiwa'))+(driver?.phone_number?'<br><small>'+esc(driver.phone_number)+'</small>':'')+'</td><td><span class="badge-pill '+(d.delivery_status==='completed'?'success':'warning')+'">'+esc(labels[d.delivery_status]||d.delivery_status)+'</span></td><td>'+money(d.delivery_fee)+'</td><td>'+esc(d.payout_status||'awaiting_confirmation')+'</td><td>'+esc(date(d.created_at))+'</td><td><div class="action-row">'+driverMap+buyerMap+'</div>'+updated+'</td></tr>';}).join(''):'<tr><td colspan="9" class="empty-state">Hakuna delivery zilizorekodiwa bado.</td></tr>';
}
async function loadEvents(id){
 if(!events)return;const db=window.ZUNE_CORE?.db?.();events.textContent='Inapakia historia...';
 const {data,error}=await db.from('zune_delivery_events').select('event_type,note,actor_id,created_at').eq('delivery_id',id).order('created_at',{ascending:true});
 if(error){events.textContent=error.message;return;}
 events.innerHTML=data?.length?data.map(e=>'<p><b>'+esc(e.event_type)+'</b> · '+esc(date(e.created_at))+'<br>'+esc(e.note||'')+'<br><small>Actor: '+esc(e.actor_id||'—')+'</small></p>').join(''):'Hakuna hatua zilizorekodiwa.';
}
document.addEventListener('DOMContentLoaded',()=>{
 $('#refreshDeliveryOps')?.addEventListener('click',()=>load().catch(e=>{if(body)body.innerHTML='<tr><td colspan="9">'+esc(e.message)+'</td></tr>';}));
 $('#refreshDriverApplications')?.addEventListener('click',()=>loadDriverApplications());
 $('#refreshDriverDirectory')?.addEventListener('click',()=>Promise.all([loadDriverDirectory(),loadDriverDocuments(),loadVehicleChangeRequests()]));
 $('#refreshVehicleChangeRequests')?.addEventListener('click',loadVehicleChangeRequests);
 $('#vehicleChangeRequestsBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-vehicle-change-review]');if(b)reviewVehicleChangeRequest(b.dataset.requestId,b.dataset.vehicleChangeReview,b).catch(err=>window.alert(err.message));});
 $('#driverInviteForm')?.addEventListener('submit',createDriverInvitation);
 $('#driverApplicationSearch')?.addEventListener('input',renderDriverApplications);$('#driverApplicationFilter')?.addEventListener('change',renderDriverApplications);
 $('#driverApplicationsBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-driver-review]');if(b)reviewDriverApplication(b.dataset.applicationId,b.dataset.driverReview,b).catch(err=>window.alert(err.message));});
 $('#driverDirectoryBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-driver-status]');if(b)setDriverStatus(b.dataset.driverId,b.dataset.driverStatus,b).catch(err=>window.alert(err.message));});
 $('#driverDocumentsBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-doc-review]');if(b)reviewDriverDocument(b.dataset.docId,b.dataset.docReview,b).catch(err=>window.alert(err.message));});
 $('#driverDirectorySearch')?.addEventListener('input',renderDriverDirectory);$('#driverDirectoryFilter')?.addEventListener('change',renderDriverDirectory);
 const initial=location.hash.slice(1);
 if(initial==='driver-applications')loadDriverApplications();
 else if(initial==='driver-list')Promise.all([loadDriverDirectory(),loadDriverDocuments(),loadVehicleChangeRequests()]);
 else if(initial==='delivery-operations'||!initial)load().catch(e=>{if(body)body.innerHTML='<tr><td colspan="9">'+esc(e.message)+'</td></tr>';});
});
document.addEventListener('zune:page-changed',e=>{
 if(e.detail.page==='driver-applications')loadDriverApplications();
 else if(e.detail.page==='driver-list')Promise.all([loadDriverDirectory(),loadDriverDocuments(),loadVehicleChangeRequests()]);
 else if(e.detail.page==='delivery-operations')load().catch(err=>{if(body)body.innerHTML='<tr><td colspan="9">'+esc(err.message)+'</td></tr>';});
});
setInterval(()=>{if(!document.hidden&&location.hash==='#delivery-operations')load().catch(err=>console.warn('Delivery auto-refresh:',err));},20000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&location.hash==='#delivery-operations')load().catch(err=>console.warn('Delivery refresh:',err));});
})();