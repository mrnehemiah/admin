(()=>{
const $=s=>document.querySelector(s),body=$('#deliveryOpsBody'),events=$('#deliveryOpsEvents');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'TSh '+Number(v||0).toLocaleString('en-US');
const labels={pending:'Inasubiri',assigned:'Dereva amechaguliwa',ready_for_pickup:'Muuzaji amekabidhi',picked_up:'Dereva amepokea',in_transit:'Iko njiani',delivered:'Imefikishwa',completed:'Imekamilika',disputed:'Ina uchunguzi',cancelled:'Imeghairiwa'};
let rows=[],trackingRows=[],activeDrivers=[];
async function loadDriverApplications(){
 const appsBody=$('#driverApplicationsBody');if(!appsBody)return;
 const db=window.ZUNE_CORE?.db?.();if(!db){appsBody.innerHTML='<tr><td colspan="6">Supabase haijaunganishwa.</td></tr>';return;}
 appsBody.innerHTML='<tr><td colspan="6">Inapakia maombi...</td></tr>';
 const {data:apps,error}=await db.from('delivery_driver_applications').select('id,user_id,application_source,status,submitted_at').eq('status','pending').order('submitted_at',{ascending:true});
 if(error){appsBody.innerHTML='<tr><td colspan="6">'+esc(error.message)+'</td></tr>';return;}
 if(!apps?.length){appsBody.innerHTML='<tr><td colspan="6" class="empty-state">Hakuna maombi ya dereva yanayosubiri.</td></tr>';return;}
 const ids=apps.map(a=>a.user_id);
 const {data:drivers,error:driverError}=await db.from('delivery_driver_profiles').select('user_id,full_name,phone_number,email,vehicle_type,vehicle_registration,license_number').in('user_id',ids);
 if(driverError){appsBody.innerHTML='<tr><td colspan="6">'+esc(driverError.message)+'</td></tr>';return;}
 const byId=new Map((drivers||[]).map(d=>[d.user_id,d]));
 appsBody.innerHTML=apps.map(a=>{
  const d=byId.get(a.user_id)||{};
  const contact=[d.phone_number,d.email].filter(Boolean).map(esc).join('<br>');
  const vehicle=[d.vehicle_type,d.vehicle_registration,d.license_number].filter(Boolean).map(esc).join(' · ');
  return '<tr><td><strong>'+esc(d.full_name||'Dereva')+'</strong><small>'+esc(a.user_id)+'</small></td><td>'+(contact||'—')+'</td><td>'+(vehicle||'—')+'</td><td>'+esc(a.application_source==='admin_invite'?'Mwaliko wa Admin':'Ombi binafsi')+'</td><td>'+esc(a.submitted_at?new Date(a.submitted_at).toLocaleString('sw-TZ'):'—')+'</td><td><div class="action-row"><button class="primary-btn" type="button" data-driver-review="approved" data-application-id="'+esc(a.id)+'">Idhinisha</button><button class="danger-btn" type="button" data-driver-review="rejected" data-application-id="'+esc(a.id)+'">Kataa</button></div></td></tr>';
 }).join('');
}
async function reviewDriverApplication(id,decision,button){
 const reason=window.prompt(decision==='approved'?'Andika sababu ya kuidhinisha dereva:':'Andika sababu ya kukataa ombi:');
 if(!reason||reason.trim().length<5){window.alert('Sababu lazima iwe na angalau herufi 5.');return;}
 if(!window.confirm(decision==='approved'?'Unathibitisha kumuidhinisha dereva huyu?':'Unathibitisha kukataa ombi hili?'))return;
 button.disabled=true;
 const db=window.ZUNE_CORE?.db?.();
 const {data,error}=await db.rpc('admin_review_delivery_driver_application',{p_application_id:id,p_decision:decision,p_reason:reason.trim()});
 button.disabled=false;
 if(error){window.alert(error.message);return;}
 if(!data?.ok){window.alert('Admin haikuthibitisha mabadiliko.');return;}
 window.alert(decision==='approved'?'Dereva ameidhinishwa na sasa anaweza kupangiwa delivery.':'Ombi la dereva limekataliwa.');
 await loadDriverApplications();
}

let directoryRows=[],documentRows=[];
const driverDocLabels={national_id:'Kitambulisho NIDA',driver_photo:'Picha ya dereva',driving_license:'Leseni ya udereva',vehicle_registration:'Kadi ya usajili',vehicle_insurance:'Bima ya chombo',vehicle_photo:'Picha ya chombo',vehicle_authorization:'Ruhusa ya kutumia chombo'};
async function loadDriverDirectory(){
 const db=window.ZUNE_CORE?.db?.(),body=$('#driverDirectoryBody');if(!db||!body)return;
 body.innerHTML='<tr><td colspan="6">Inapakia...</td></tr>';
 const {data,error}=await db.from('delivery_driver_profiles').select('user_id,full_name,phone_number,email,vehicle_type,vehicle_registration,status,created_at').order('created_at',{ascending:false});
 if(error){body.innerHTML='<tr><td colspan="6">'+esc(error.message)+'</td></tr>';return;}
 directoryRows=data||[];
 $('#driverCountAll').textContent=directoryRows.length;
 $('#driverCountActive').textContent=directoryRows.filter(x=>x.status==='active').length;
 $('#driverCountPending').textContent=directoryRows.filter(x=>x.status==='pending').length;
 $('#driverCountSuspended').textContent=directoryRows.filter(x=>x.status==='suspended').length;
 renderDriverDirectory();
}
function renderDriverDirectory(){
 const body=$('#driverDirectoryBody');if(!body)return;
 const q=String($('#driverDirectorySearch')?.value||'').toLowerCase(),filter=$('#driverDirectoryFilter')?.value||'all';
 const list=directoryRows.filter(d=>(filter==='all'||d.status===filter)&&[d.full_name,d.phone_number,d.email,d.user_id,d.vehicle_registration].some(v=>String(v||'').toLowerCase().includes(q)));
 body.innerHTML=list.length?list.map(d=>{
  const status=d.status==='active'?'success':d.status==='suspended'||d.status==='rejected'?'danger':'warning';
  const action=d.status==='active'?'<button class="danger-btn" data-driver-status="suspended" data-driver-id="'+esc(d.user_id)+'">Simamisha</button>':d.status==='suspended'?'<button class="primary-btn" data-driver-status="active" data-driver-id="'+esc(d.user_id)+'">Rejesha</button>':'—';
  return '<tr><td><strong>'+esc(d.full_name)+'</strong><small>'+esc(d.user_id)+'</small></td><td>'+esc(d.phone_number)+'<br><small>'+esc(d.email||'')+'</small></td><td>'+esc(d.vehicle_type)+'<br><small>'+esc(d.vehicle_registration||'—')+'</small></td><td><span class="badge-pill '+status+'">'+esc(d.status)+'</span></td><td>'+esc(d.created_at?new Date(d.created_at).toLocaleDateString('sw-TZ'):'—')+'</td><td><div class="action-row">'+action+'</div></td></tr>';
 }).join(''):'<tr><td colspan="6" class="empty-state">Hakuna dereva anayelingana na utafutaji.</td></tr>';
}
async function setDriverStatus(id,status,button){
 const reason=window.prompt(status==='suspended'?'Sababu ya kusimamisha dereva:':'Sababu ya kurejesha dereva:');
 if(!reason||reason.trim().length<5){window.alert('Sababu lazima iwe na angalau herufi 5.');return;}
 if(!window.confirm(status==='suspended'?'Unathibitisha kusimamisha dereva huyu?':'Unathibitisha kurejesha dereva huyu?'))return;
 button.disabled=true;
 const db=window.ZUNE_CORE?.db?.(),{data:{user}}=await db.auth.getUser();
 const {error}=await db.from('delivery_driver_profiles').update({status,updated_at:new Date().toISOString()}).eq('user_id',id);
 if(error){button.disabled=false;window.alert(error.message);return;}
 const {error:auditError}=await db.from('delivery_driver_audit_logs').insert({driver_user_id:id,performed_by:user.id,action:status,reason:reason.trim()});
 if(auditError)window.alert('Hali imebadilika lakini audit log haikuandikwa: '+auditError.message);
 await loadDriverDirectory();
}
async function loadDriverDocuments(){
 const db=window.ZUNE_CORE?.db?.(),body=$('#driverDocumentsBody');if(!db||!body)return;
 body.innerHTML='<tr><td colspan="6">Inapakia...</td></tr>';
 const {data,error}=await db.from('delivery_driver_documents').select('id,user_id,document_type,file_path,original_file_name,expiry_date,status,review_note,created_at').order('created_at',{ascending:false});
 if(error){body.innerHTML='<tr><td colspan="6">'+esc(error.message)+'</td></tr>';return;}
 documentRows=data||[];
 const ids=[...new Set(documentRows.map(d=>d.user_id))];
 let names={};
 if(ids.length){const {data:drivers}=await db.from('delivery_driver_profiles').select('user_id,full_name,phone_number').in('user_id',ids);(drivers||[]).forEach(d=>names[d.user_id]=d);}
 const signed=await Promise.all(documentRows.map(async d=>{const {data}=await db.storage.from('zune-driver-documents').createSignedUrl(d.file_path,120);return [d.id,data?.signedUrl||null]}));
 const urls=Object.fromEntries(signed);
 body.innerHTML=documentRows.length?documentRows.map(d=>{
  const driver=names[d.user_id]||{},url=urls[d.id],status=d.status==='approved'?'success':d.status==='rejected'?'danger':'warning';
  return '<tr><td><strong>'+esc(driver.full_name||'Dereva')+'</strong><small>'+esc(driver.phone_number||'')+'</small></td><td>'+esc(driverDocLabels[d.document_type]||d.document_type)+'</td><td>'+(url?'<a class="secondary-btn" target="_blank" rel="noopener noreferrer" href="'+esc(url)+'">Fungua faili</a>':'Haipatikani')+'<small>'+esc(d.original_file_name||'')+'</small></td><td>'+esc(d.expiry_date||'—')+'</td><td><span class="badge-pill '+status+'">'+esc(d.status)+'</span>'+(d.review_note?'<small>'+esc(d.review_note)+'</small>':'')+'</td><td><div class="action-row"><button class="primary-btn" data-doc-review="approved" data-doc-id="'+esc(d.id)+'">Idhinisha</button><button class="danger-btn" data-doc-review="rejected" data-doc-id="'+esc(d.id)+'">Rudisha</button></div></td></tr>';
 }).join(''):'<tr><td colspan="6" class="empty-state">Bado hakuna nyaraka zilizopakiwa.</td></tr>';
}
async function reviewDriverDocument(id,status,button){
 const reason=window.prompt(status==='approved'?'Maelezo ya ukaguzi (hiari):':'Sababu ya kurudisha nyaraka kwa marekebisho:');
 if(status==='rejected'&&(!reason||reason.trim().length<5)){window.alert('Andika sababu yenye angalau herufi 5.');return;}
 if(!window.confirm(status==='approved'?'Unaidhinisha nyaraka hii?':'Unarudisha nyaraka hii kwa marekebisho?'))return;
 button.disabled=true;
 const db=window.ZUNE_CORE?.db?.(),{data:{user}}=await db.auth.getUser();
 const {error}=await db.from('delivery_driver_documents').update({status,review_note:reason?.trim()||null,reviewed_by:user.id,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id);
 if(error){button.disabled=false;window.alert(error.message);return;}
 await loadDriverDocuments();
}
async function load(){
 if(window.ZUNE_AUTH_READY)await window.ZUNE_AUTH_READY;
 const db=window.ZUNE_CORE?.db?.();if(!db){body.innerHTML='<tr><td colspan="9">Supabase haijaunganishwa.</td></tr>';return;}
 body.innerHTML='<tr><td colspan="9">Inapakia...</td></tr>';
 const {data,error}=await db.rpc('zune_delivery_seller_queue');if(error)throw error;rows=data||[];
 const [trackResult,driverResult]=await Promise.all([db.rpc('zune_delivery_seller_tracking'),db.rpc('zune_delivery_active_drivers')]);
 trackingRows=trackResult.error?[]:(trackResult.data||[]);activeDrivers=driverResult.error?[]:(driverResult.data||[]);
 if(trackResult.error)console.warn('Delivery tracking:',trackResult.error.message);if(driverResult.error)console.warn('Active drivers:',driverResult.error.message);
 await loadDriverApplications();
 body.innerHTML=rows.length?rows.map(d=>{const track=trackingRows.find(x=>x.delivery_id===d.delivery_id)||{};const driver=activeDrivers.find(x=>x.driver_id===d.assigned_driver_id);const lat=track.last_latitude,lng=track.last_longitude,dlat=d.latitude,dlng=d.longitude;const valid=(a,b)=>a!=null&&b!=null&&Number.isFinite(Number(a))&&Number.isFinite(Number(b));const driverMap=valid(lat,lng)?'<a class="secondary-btn" target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/?mlat='+Number(lat)+'&mlon='+Number(lng)+'#map=16/'+Number(lat)+'/'+Number(lng)+'">Dereva</a>':'';const buyerMap=valid(dlat,dlng)?'<a class="secondary-btn" target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/?mlat='+Number(dlat)+'&mlon='+Number(dlng)+'#map=16/'+Number(dlat)+'/'+Number(dlng)+'">Mnunuzi</a>':'';const updated=track.last_location_at?'<small>GPS: '+esc(new Date(track.last_location_at).toLocaleString('sw-TZ'))+'</small>':'';return '<tr><td><button class="secondary-btn" data-events="'+esc(d.delivery_id)+'">'+esc(d.delivery_id.slice(0,8))+'</button></td><td>'+esc(d.vendor_id)+'</td><td>'+esc(d.recipient_name)+'<br><small>'+esc(d.recipient_phone)+'</small></td><td>'+esc(driver?.full_name||(d.assigned_driver_id||'Hajapangiwa'))+(driver?.phone_number?'<br><small>'+esc(driver.phone_number)+'</small>':'')+'</td><td><span class="badge-pill '+(d.delivery_status==='completed'?'success':'warning')+'">'+esc(labels[d.delivery_status]||d.delivery_status)+'</span></td><td>'+money(d.delivery_fee)+'</td><td>'+esc(d.payout_status||'awaiting_confirmation')+'</td><td>'+esc(d.created_at?new Date(d.created_at).toLocaleString('sw-TZ'):'—')+'</td><td><div class="action-row">'+(driverMap||'')+(buyerMap||'')+'</div>'+updated+'</td></tr>';}).join(''):'<tr><td colspan="9" class="empty-state">Hakuna delivery zilizorekodiwa bado.</td></tr>';
 body.querySelectorAll('[data-events]').forEach(b=>b.onclick=()=>loadEvents(b.dataset.events));
}
async function loadEvents(id){
 const db=window.ZUNE_CORE?.db?.();events.textContent='Inapakia historia...';
 const {data,error}=await db.from('zune_delivery_events').select('event_type,note,actor_id,created_at').eq('delivery_id',id).order('created_at',{ascending:true});
 if(error){events.textContent=error.message;return;}
 events.innerHTML=data?.length?data.map(e=>'<p><b>'+esc(e.event_type)+'</b> · '+esc(e.created_at?new Date(e.created_at).toLocaleString('sw-TZ'):'')+'<br>'+esc(e.note||'')+'<br><small>Actor: '+esc(e.actor_id||'—')+'</small></p>').join(''):'Hakuna hatua zilizorekodiwa.';
}
document.addEventListener('DOMContentLoaded',()=>{
 $('#refreshDeliveryOps')?.addEventListener('click',()=>load().catch(e=>body.innerHTML='<tr><td colspan="9">'+esc(e.message)+'</td></tr>'));
 $('#driverApplicationsBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-driver-review]');if(b)reviewDriverApplication(b.dataset.applicationId,b.dataset.driverReview,b).catch(err=>window.alert(err.message));});\n $('#driverDirectoryBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-driver-status]');if(b)setDriverStatus(b.dataset.driverId,b.dataset.driverStatus,b).catch(err=>window.alert(err.message));});\n $('#driverDocumentsBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-doc-review]');if(b)reviewDriverDocument(b.dataset.docId,b.dataset.docReview,b).catch(err=>window.alert(err.message));});\n $('#driverDirectorySearch')?.addEventListener('input',renderDriverDirectory);$('#driverDirectoryFilter')?.addEventListener('change',renderDriverDirectory);
 load().catch(e=>body.innerHTML='<tr><td colspan="9">'+esc(e.message)+'</td></tr>');
});
document.addEventListener('zune:page-changed',e=>{if(e.detail.page==='delivery-operations')load().catch(err=>body.innerHTML='<tr><td colspan="9">'+esc(err.message)+'</td></tr>');});
setInterval(()=>{if(!document.hidden&&location.hash==='#delivery-operations')load().catch(err=>console.warn('Delivery auto-refresh:',err));},20000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&location.hash==='#delivery-operations')load().catch(err=>console.warn('Delivery refresh:',err));});
})();