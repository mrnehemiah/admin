(function(){
'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const db=()=>window.ZUNE_CORE&&window.ZUNE_CORE.db?window.ZUNE_CORE.db():window.zuneSupabase;
const toast=m=>window.ZUNE_LAYOUT&&window.ZUNE_LAYOUT.toast?window.ZUNE_LAYOUT.toast(m,'info'):alert(m);
let mounted=false;
async function load(){
 const host=$('#adminLiveBroadcasts');if(!host)return;
 host.innerHTML='<div class="empty-state">Inapakia matangazo...</div>';
 const {data,error}=await db().rpc('zune_admin_list_live_broadcasts');
 if(error)throw error;
 const rows=Array.isArray(data)?data:[];
 host.innerHTML=rows.length?rows.map(x=>'<article class="reels-admin-row"><div class="reels-admin-meta"><strong>'+esc(x.title||'ZUNE Live')+' · '+esc(x.broadcast_status)+'</strong><p>Duka: '+esc(x.store_name||x.store_id||'—')+' · Creator: '+esc(x.seller_owner_id)+'</p><p>Privacy: '+esc(x.privacy_status)+' · Marketplace: '+esc(x.zune_moderation_status)+'</p><p>Scheduled: '+(x.scheduled_start_time?new Date(x.scheduled_start_time).toLocaleString('sw-TZ'):'—')+'</p><p>'+esc(x.zune_moderation_note||'')+'</p>'+(x.youtube_watch_url?'<p><a href="'+esc(x.youtube_watch_url)+'" target="_blank" rel="noopener">Fungua YouTube Live</a></p>':'')+'</div><div class="reels-admin-actions">'+(x.zune_moderation_status==='active'?'<button class="warning-btn" data-live-moderation="hide" data-id="'+esc(x.id)+'">Hide Marketplace</button><button class="danger-btn" data-live-moderation="remove" data-id="'+esc(x.id)+'">Remove</button>':'<button class="primary-btn" data-live-moderation="restore" data-id="'+esc(x.id)+'">Restore</button>')+'</div></article>').join(''):'<div class="empty-state">Hakuna matangazo ya Live yaliyopangwa au yaliyowahi kurushwa.</div>';
}
function mount(){
 const section=$('[data-section="reels"]');if(!section||mounted)return;
 if(!section.querySelector('#reelCommentsModal'))return;
 mounted=true;
 const panel=document.createElement('div');panel.className='panel';panel.innerHTML='<div class="section-intro"><div><h3>ZUNE Live Moderation</h3><p>Fuatilia matangazo ya Sellers na uyafiche Marketplace yakikiuka kanuni. Kitendo hiki hakizimi matangazo kwenye YouTube.</p></div><button class="secondary-btn" id="liveModerationRefresh" type="button">Refresh Live</button></div><div id="adminLiveBroadcasts" class="reels-admin-list"><div class="empty-state">Inapakia matangazo...</div></div>';
 section.querySelector('#reelCommentsModal').before(panel);
 $('#liveModerationRefresh').addEventListener('click',()=>load().catch(e=>toast(e.message||'Imeshindikana kupakia Live.')));
 $('#adminLiveBroadcasts').addEventListener('click',async e=>{
  const button=e.target.closest('[data-live-moderation]');if(!button)return;
  const action=button.dataset.liveModeration;
  const reason=prompt(action==='restore'?'Sababu ya kurudisha matangazo (hiari):':'Sababu ya kuficha/kuondoa matangazo haya:');
  if(reason===null)return;
  if(action!=='restore'&&!reason.trim()){toast('Andika sababu ya moderation kwanza.');return;}
  button.disabled=true;
  try{
   const {data,error}=await db().rpc('zune_admin_moderate_live_broadcast',{p_broadcast_id:button.dataset.id,p_action:action,p_reason:reason.trim()||null});
   if(error)throw error;
   toast(action==='restore'?'Live imerudishwa Marketplace.':'Live imefichwa kwenye Marketplace.');
   await load();
  }catch(err){toast(err.message||'Imeshindikana kufanya moderation.');button.disabled=false;}
 });
 load().catch(e=>toast(e.message||'Imeshindikana kupakia Live.'));
}
document.addEventListener('DOMContentLoaded',mount);
document.addEventListener('zune:page-changed',()=>mount());
const observer=new MutationObserver(()=>{if(!mounted)mount();});
document.addEventListener('DOMContentLoaded',()=>{const section=$('[data-section="reels"]');if(section)observer.observe(section,{childList:true,subtree:true});});
})();