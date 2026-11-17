(()=>{
const $=s=>document.querySelector(s),body=$('#deliveryOpsBody'),events=$('#deliveryOpsEvents');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'TSh '+Number(v||0).toLocaleString('en-US');
const labels={pending:'Inasubiri',assigned:'Dereva amechaguliwa',ready_for_pickup:'Muuzaji amekabidhi',picked_up:'Dereva amepokea',in_transit:'Iko njiani',delivered:'Imefikishwa',completed:'Imekamilika',disputed:'Ina uchunguzi',cancelled:'Imeghairiwa'};
let rows=[];
async function load(){
 if(window.ZUNE_AUTH_READY)await window.ZUNE_AUTH_READY;
 const db=window.ZUNE_CORE?.db?.();if(!db){body.innerHTML='<tr><td colspan="8">Supabase haijaunganishwa.</td></tr>';return;}
 body.innerHTML='<tr><td colspan="8">Inapakia...</td></tr>';
 const {data,error}=await db.rpc('zune_delivery_seller_queue');if(error)throw error;rows=data||[];
 body.innerHTML=rows.length?rows.map(d=>'<tr><td><button class="secondary-btn" data-events="'+d.delivery_id+'">'+esc(d.delivery_id.slice(0,8))+'</button></td><td>'+esc(d.vendor_id)+'</td><td>'+esc(d.recipient_name)+'<br><small>'+esc(d.recipient_phone)+'</small></td><td>'+esc(d.assigned_driver_id||'Hajapangiwa')+'</td><td><span class="badge-pill '+(d.delivery_status==='completed'?'success':'warning')+'">'+esc(labels[d.delivery_status]||d.delivery_status)+'</span></td><td>'+money(d.delivery_fee)+'</td><td>'+esc(d.payout_status||'awaiting_confirmation')+'</td><td>'+esc(d.created_at?new Date(d.created_at).toLocaleString('sw-TZ'):'—')+'</td></tr>').join(''):'<tr><td colspan="8" class="empty-state">Hakuna delivery zilizorekodiwa bado.</td></tr>';
 body.querySelectorAll('[data-events]').forEach(b=>b.onclick=()=>loadEvents(b.dataset.events));
}
async function loadEvents(id){
 const db=window.ZUNE_CORE?.db?.();events.textContent='Inapakia historia...';
 const {data,error}=await db.from('zune_delivery_events').select('event_type,note,actor_id,created_at').eq('delivery_id',id).order('created_at',{ascending:true});
 if(error){events.textContent=error.message;return;}
 events.innerHTML=data?.length?data.map(e=>'<p><b>'+esc(e.event_type)+'</b> · '+esc(e.created_at?new Date(e.created_at).toLocaleString('sw-TZ'):'')+'<br>'+esc(e.note||'')+'<br><small>Actor: '+esc(e.actor_id||'—')+'</small></p>').join(''):'Hakuna hatua zilizorekodiwa.';
}
document.addEventListener('DOMContentLoaded',()=>{$('#refreshDeliveryOps')?.addEventListener('click',()=>load().catch(e=>body.innerHTML='<tr><td colspan="8">'+esc(e.message)+'</td></tr>'));load().catch(e=>body.innerHTML='<tr><td colspan="8">'+esc(e.message)+'</td></tr>');});
document.addEventListener('zune:page-changed',e=>{if(e.detail.page==='delivery-operations')load().catch(err=>body.innerHTML='<tr><td colspan="8">'+esc(err.message)+'</td></tr>');});
})();