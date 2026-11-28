(() => {
 'use strict';
 const $=s=>document.querySelector(s);const c=()=>window.ZUNE_CORE,ui=()=>window.ZUNE_LAYOUT;
 const authReady=window.ZUNE_SECURITY.requireAdmin();window.ZUNE_AUTH_READY=authReady;
 async function init(){
  try{const profile=await authReady;if(!profile)return;
   const display=profile.full_name||profile.email||'Admin Mkuu';['adminDisplayName','topAdminName','welcomeAdminName'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=display;});
   const av=$('#adminAvatar');if(av)av.textContent=display.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
   ui().toast('Umeingia kwenye ZUNE PREMIUM ADMIN.','success');
   document.dispatchEvent(new Event('zune:admin-refresh'));
   const health=$('#systemStatusText');if(health)health.textContent='Admin amethibitishwa';
   await runSystemHealthChecks();
  }catch(e){console.error(e);const msg=$('#globalMessage');if(msg){msg.hidden=false;msg.textContent=e.message||'Imeshindikana kuthibitisha Admin.';}ui().toast(e.message||'Admin access denied','error');}
 }
 function schemaNoticePages(){
  const pending={
   'badge-requests':'Schema ya verified badge requests haijawekwa kwenye package kwa sababu jina la jedwali na columns halijathibitishwa.',
   'badge-management':'Verified badge status ya profiles.is_verified inasomwa. Mabadiliko ya badge yatahitaji RPC salama ya backend.',
   categories:'Categories na subcategories husimamiwa kupitia Admin RPC zenye uthibitishaji wa Admin na audit log.',
   security:'Security events zinasomwa kutoka security_events; risk posture na RLS/RPC findings zinaonekana kwenye Admin Intelligence Dashboard.',
   'system-health':'Health checks za Data API, Authentication, Admin authorization na Marketplace Data API huhifadhiwa kwenye system_health_logs. Cloud uptime na backup restore bado huthibitishwa Supabase Dashboard/CLI.',database:'Database monitoring: tumia Supabase Dashboard kwa metrics za ndani; browser key haiwezi kusoma database internals.',backup:'Backup na recovery husimamiwa kupitia Supabase Dashboard/CLI, si frontend browser.'
  };
  Object.entries(pending).forEach(([id,msg])=>c().notice(id,msg));
 }
 async function runSystemHealthChecks(){
  const db=c().db();if(!db)return;
  const checks=[
   ['database',async()=>{const r=await db.from('profiles').select('id',{head:true,count:'exact'});if(r.error)throw r.error;}],
   ['authentication',async()=>{const r=await db.auth.getSession();if(r.error)throw r.error;if(!r.data?.session?.user)throw new Error('Hakuna active Admin session.');}],
   ['admin_authorization',async()=>{const r=await db.rpc('admin_security_posture_overview');if(r.error)throw r.error;if(!r.data?.single_admin_ok)throw new Error('Single Admin Mkuu invariant inahitaji ukaguzi.');}],
   ['marketplace_data_api',async()=>{const results=await Promise.all([db.from('orders').select('id',{head:true,count:'exact'}),db.from('products').select('id',{head:true,count:'exact'})]);if(results[0].error)throw results[0].error;if(results[1].error)throw results[1].error;}]
  ];
  const labels={database:'Supabase Data API',authentication:'Supabase Authentication',admin_authorization:'Admin authorization',marketplace_data_api:'Marketplace Data API'};
  const results=await Promise.all(checks.map(async([component,run])=>{
   const start=performance.now();let status='healthy',details={};
   try{await run();}catch(e){status='degraded';details={message:String(e?.message||e).slice(0,240)};}
   const latency=Math.max(0,Math.round(performance.now()-start));
   try{const saved=await db.rpc('admin_record_system_health_check',{p_component:component,p_status:status,p_latency_ms:latency,p_details:details});if(saved.error)throw saved.error;}
   catch(e){console.warn('Health log haijahifadhiwa:',component,e.message);}
   return {component,status,latency,details};
  }));
  const textFor=r=>labels[r.component]+': '+r.status.toUpperCase()+' · '+r.latency+' ms'+(r.details.message?' · '+r.details.message:'');
  const sup=results.find(x=>x.component==='database'),auth=results.find(x=>x.component==='authentication'),market=results.find(x=>x.component==='marketplace_data_api');
  const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
  set('supabaseHealth',textFor(sup));set('authHealth',textFor(auth));set('serviceHealth',textFor(market));
  const healthSection=document.querySelector('[data-section="system-health"]');
  if(healthSection){let footer=healthSection.querySelector('[data-health-footnote]');if(!footer){footer=document.createElement('p');footer.dataset.healthFootnote='1';footer.className='notice-box';healthSection.appendChild(footer);}footer.textContent='Vipimo hivi vinakagua Data API, Authentication, Admin authorization na Marketplace Data API wakati Admin anapoingia. Haviwakilishi uptime ya cloud, Storage, Edge Functions au uthibitisho wa backup restore.';}
 }
 function bindActions(){
  document.getElementById('globalSearch')?.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const q=e.target.value.trim();if(!q)return;const page=/order/i.test(q)?'orders':/seller|duka/i.test(q)?'sellers':/product|bidhaa/i.test(q)?'products':'users';window.ZUNE_ROUTER.show(page);const target=document.querySelector(`[data-section="${page}"] input[type="search"], [data-section="${page}"] input`);if(target){target.value=q;target.dispatchEvent(new Event('input'));}});
  document.getElementById('addSellerBtn')?.addEventListener('click',async()=>{
   const btn=document.getElementById('addSellerBtn');if(btn?.disabled)return;
   const original=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Inatafuta Buyer...';}
   try{
    if(window.ZUNE_AUTH_READY)await window.ZUNE_AUTH_READY;
    const db=c().db();if(!db)throw new Error('Supabase haijaunganishwa.');
    const term=window.prompt('Tafuta akaunti ya Buyer kwa jina, email, simu au ZUNE ID:');
    if(term===null)return;if(!term.trim())throw new Error('Weka taarifa za kumtafuta Buyer.');
    const {data,error}=await db.rpc('admin_list_users',{p_search:term.trim(),p_role:'buyer',p_status:null,p_limit:100,p_offset:0});
    if(error)throw error;
    const buyers=Array.isArray(data?.users)?data.users:[];
    if(!buyers.length)throw new Error('Hakuna akaunti ya Buyer iliyopatikana kwa utafutaji huo. Hakikisha mtumiaji amesajiliwa kama Buyer.');
    let selected=buyers[0];
    if(buyers.length>1){
     const options=buyers.map((u,i)=>`${i+1}. ${u.full_name||'Bila jina'} — ${u.email||u.phone_number||u.zune_id||u.id}`).join('\\n');
     const choice=window.prompt(`Akaunti zaidi ya moja zimepatikana. Chagua namba ya Buyer:\\n\\n${options}`,'1');
     if(choice===null)return;const index=Number(choice)-1;if(!Number.isInteger(index)||index<0||index>=buyers.length)throw new Error('Namba ya chaguo si sahihi.');selected=buyers[index];
    }
    const reason=window.prompt(`Unaongeza ${selected.full_name||selected.email||'Buyer huyu'} kuwa Seller. Andika sababu (angalau herufi 5):`);
    if(reason===null)return;if(reason.trim().length<5)throw new Error('Sababu lazima iwe na angalau herufi 5.');
    if(btn)btn.textContent='Inaongeza Seller...';
    const {data:result,error:rpcError}=await db.rpc('admin_add_seller',{p_user_id:selected.id,p_reason:reason.trim()});
    if(rpcError)throw rpcError;
    if(!result?.success)throw new Error('Backend haikuthibitisha kuongezwa kwa Seller.');
    ui().toast(`${selected.full_name||selected.email||'Mtumiaji'} ameongezwa kama Seller kwa mafanikio.`,'success');
    await window.ZUNE_SELLERS?.load?.();
    document.dispatchEvent(new Event('zune:admin-refresh'));
   }catch(e){console.error('ZUNE Add Seller failed:',e);ui().toast(e.message||'Imeshindikana kuongeza Seller.','error');}
   finally{if(btn){btn.disabled=false;btn.textContent=original||'＋ Add Seller';}}
  });
  document.getElementById('addCategoryBtn')?.addEventListener('click',()=>ui().toast('Tunahitaji kuthibitisha schema ya categories kabla ya kuhifadhi.','warning'));
  ['blockSellerBtn','deleteSellerBtn'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>ui().toast('Hatua hii inahitaji RPC ya backend na audit record; haijawashwa ili kuzuia mabadiliko yasiyo salama.','warning')));
  document.getElementById('refreshDashboard')?.addEventListener('click',()=>document.dispatchEvent(new Event('zune:admin-refresh')));
  document.getElementById('saveMonthlyAuditBtn')?.addEventListener('click',()=>ui().toast('Checklist imehifadhiwa kwenye ukurasa huu pekee. Database persistence itahitaji audit/settings schema.','info'));
  const checks=[...document.querySelectorAll('[data-audit-item]')];const update=()=>{const done=checks.filter(x=>x.checked).length,pct=checks.length?Math.round(done/checks.length*100):0;const t=$('#auditProgressText'),b=$('#auditProgressBar');if(t)t.textContent=`${pct}% imekamilika (${done}/${checks.length})`;if(b)b.style.width=`${pct}%`;};checks.forEach(x=>x.addEventListener('change',update));update();
 }
 document.addEventListener('DOMContentLoaded',()=>{schemaNoticePages();bindActions();init();});
 window.ZUNE_ADMIN={refresh:()=>document.dispatchEvent(new Event('zune:admin-refresh'))};
})();
