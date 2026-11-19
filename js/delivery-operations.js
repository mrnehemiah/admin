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
 $('#driverApplicationsBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-driver-review]');if(b)reviewDriverApplication(b.dataset.applicationId,b.dataset.driverReview,b).catch(err=>window.alert(err.message));});
 load().catch(e=>body.innerHTML='<tr><td colspan="8">'+esc(e.message)+'</td></tr>');
});
document.addEventListener('zune:page-changed',e=>{if(e.detail.page==='delivery-operations')load().catch(err=>body.innerHTML='<tr><td colspan="9">'+esc(err.message)+'</td></tr>');});
setInterval(()=>{if(!document.hidden&&location.hash==='#delivery-operations')load().catch(err=>console.warn('Delivery auto-refresh:',err));},20000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&location.hash==='#delivery-operations')load().catch(err=>console.warn('Delivery refresh:',err));});
})();