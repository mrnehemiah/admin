(() => {
 'use strict';
 const c=()=>window.ZUNE_CORE,ui=()=>window.ZUNE_LAYOUT;
 let items=[],channel=null,filter='all',search='',busy=false;
 const esc=v=>ui().esc(String(v??''));
 const priorityLabel=p=>({critical:'Muhimu sana',high:'Juu',normal:'Kawaida',low:'Chini'}[String(p||'normal').toLowerCase()]||String(p||'Kawaida'));
 const eventLabel=v=>({profiles_insert:'Usajili wa mtumiaji',profiles_update:'Mabadiliko ya mtumiaji',seller_applications_insert:'Ombi jipya la seller',seller_applications_update:'Mabadiliko ya ombi la seller',orders_insert:'Oda mpya',orders_update:'Mabadiliko ya oda',products_insert:'Bidhaa mpya',verification_requests_insert:'Ombi jipya la uthibitisho',verification_requests_update:'Mabadiliko ya uthibitisho'}[v]||String(v||'Taarifa ya mfumo').replaceAll('_',' '));
 const date=v=>{try{return new Intl.DateTimeFormat('sw-TZ',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v));}catch{return '—';}};
 const unread=()=>items.filter(x=>!x.is_read).length;
 function ensureUI(){
  const section=document.querySelector('[data-section="notifications"]');if(!section||section.dataset.inboxReady)return;
  section.dataset.inboxReady='1';
  const intro=section.querySelector('.section-intro');
  if(intro){const p=intro.querySelector('p');if(p)p.textContent='Inbox ya Admin Mkuu: arifa za matukio muhimu ya ZUNE kwa wakati halisi.';}
  const panel=section.querySelector('.panel');if(!panel)return;
  panel.innerHTML=`
   <div class="notification-inbox-head"><div><span class="notification-eyebrow">ADMIN INBOX</span><h3>Arifa za mfumo</h3><p>Fuatilia matukio mapya na fungua sehemu husika kwa hatua inayofuata.</p></div><button class="secondary-btn" id="refreshAdminNotifications" type="button">↻ Sasisha</button></div>
   <div class="notification-stats"><article><small>Jumla ya arifa</small><strong id="adminNotifTotal">—</strong></article><article><small>Hazijasomwa</small><strong id="adminNotifUnread">—</strong></article><article><small>Arifa muhimu</small><strong id="adminNotifHigh">—</strong></article><article><small>Leo</small><strong id="adminNotifToday">—</strong></article></div>
   <div class="notification-controls"><input id="adminNotifSearch" type="search" placeholder="Tafuta ujumbe, aina au chanzo…"><select id="adminNotifFilter" aria-label="Chuja arifa"><option value="all">Arifa zote</option><option value="unread">Hazijasomwa</option><option value="read">Zilizosomwa</option><option value="high">Muhimu (Juu/Critical)</option></select><button class="secondary-btn" id="markAllAdminNotifications" type="button">✓ Soma zote</button></div>
   <div class="notification-list-wrap"><table class="notification-table"><thead><tr><th>TAARIFA</th><th>KIPAUMBELE</th><th>TAREHE</th><th>HALI</th><th></th></tr></thead><tbody id="notificationsTableBody"><tr><td colspan="5" class="empty-state">Inapakia arifa…</td></tr></tbody></table></div>
   <p class="notification-footnote" id="adminNotifFootnote">Arifa mpya zitaonekana hapa bila ku-refresh ukurasa.</p>`;
  const style=document.createElement('style');style.textContent=`
   .notification-inbox-head{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:4px 2px 18px}.notification-inbox-head h3{font:800 18px Manrope;margin:4px 0}.notification-inbox-head p{font-size:11px;color:var(--muted);margin:0}.notification-eyebrow{font-size:9px;letter-spacing:1.5px;color:var(--gold-2);font-weight:800}
   .notification-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:18px}.notification-stats article{padding:14px;border:1px solid var(--line);border-radius:12px;background:#ffffff05}.notification-stats small{display:block;color:var(--muted);font-size:10px}.notification-stats strong{display:block;font:800 22px Manrope;margin-top:7px}
   .notification-controls{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin:0 0 14px}.notification-controls input,.notification-controls select{min-height:38px;border:1px solid var(--line);border-radius:9px;background:#091f19;color:var(--text);padding:9px 11px;font-size:11px}.notification-controls input{flex:1;min-width:180px}.notification-controls select{min-width:145px}
   .notification-table{width:100%;border-collapse:collapse}.notification-table th{font-size:9px;letter-spacing:.7px;color:var(--muted);text-align:left;padding:12px 10px;border-bottom:1px solid var(--line)}.notification-table td{padding:13px 10px;border-bottom:1px solid #ffffff0b;font-size:11px;vertical-align:middle}.notification-row.unread{background:#d9b66c08}.notification-title{display:flex;gap:9px;align-items:flex-start;min-width:220px}.notification-dot{width:7px;height:7px;border-radius:50%;background:#d9b66c;flex:none;margin-top:5px}.notification-row.read .notification-dot{background:#6e897c}.notification-title strong{display:block;font-size:11px;color:var(--text)}.notification-title small{display:block;color:var(--muted);font-size:10px;margin-top:4px;max-width:470px;white-space:normal;line-height:1.5}.notification-pill{display:inline-flex;padding:4px 8px;border-radius:30px;font-size:9px;font-weight:800;background:#ffffff10;color:#b8c9be}.notification-pill.critical{background:#e36e7020;color:#ff9b9c}.notification-pill.high{background:#eaa35c20;color:#f0bd7c}.notification-pill.normal{background:#d9b66c16;color:var(--gold-2)}.notification-open-btn{border:1px solid var(--line);border-radius:8px;background:#ffffff08;color:var(--gold-2);padding:7px 10px;font-size:10px;font-weight:800}.notification-footnote{font-size:10px;color:var(--muted);padding:10px 2px 0}.notification-modal-backdrop{position:fixed;inset:0;background:#000b;z-index:120;display:grid;place-items:center;padding:18px}.notification-modal{width:min(100%,480px);background:#102c24;border:1px solid var(--line);border-radius:18px;padding:22px;box-shadow:var(--shadow)}.notification-modal h3{font:800 18px Manrope;margin:8px 0}.notification-modal p{font-size:12px;line-height:1.7;color:#d3ded6;white-space:pre-wrap}.notification-modal small{color:var(--muted);font-size:10px}.notification-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}
   @media(max-width:650px){.notification-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.notification-inbox-head{align-items:flex-start}.notification-controls>*{width:100%}.notification-controls input{min-width:0}.notification-table{min-width:620px}}
  `;document.head.appendChild(style);
  document.getElementById('refreshAdminNotifications')?.addEventListener('click',load);
  document.getElementById('adminNotifSearch')?.addEventListener('input',e=>{search=e.target.value.toLowerCase().trim();render();});
  document.getElementById('adminNotifFilter')?.addEventListener('change',e=>{filter=e.target.value;render();});
  document.getElementById('markAllAdminNotifications')?.addEventListener('click',markAllRead);
  document.getElementById('notificationsTableBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-admin-notif-open]');if(b)open(b.dataset.adminNotifOpen);});
 }
 function badge(){
  const count=unread(),bell=document.getElementById('adminNotificationBtn');if(!bell)return;
  let n=bell.querySelector('.notification-count');if(count){if(!n){n=document.createElement('span');n.className='notification-count';bell.appendChild(n);}n.textContent=count>99?'99+':String(count);bell.setAttribute('aria-label',count+' notifications ambazo hazijasomwa');}
  else{n?.remove();bell.setAttribute('aria-label','Notifications');}
 }
 function preview(){
  const host=document.getElementById('notificationPreview');if(!host)return;
  const list=[...items].sort((a,b)=>Number(a.is_read)-Number(b.is_read)||new Date(b.created_at)-new Date(a.created_at)).slice(0,7);
  host.innerHTML=list.length?list.map(x=>`<button class="notification-item ${x.is_read?'':'unread'}" data-notification-open="${esc(x.id)}"><strong>${esc(x.title||'Taarifa ya ZUNE')}</strong><span>${esc(x.message||'')}</span><small>${esc(priorityLabel(x.priority))} · ${esc(date(x.created_at))}</small></button>`).join(''):'<p class="data-muted">Hakuna notifications kwa sasa.</p>';
 }
 function render(){
  const body=document.getElementById('notificationsTableBody');if(!body)return;
  const today=new Date().toLocaleDateString('en-CA');
  const high=items.filter(x=>['high','critical'].includes(String(x.priority||'normal').toLowerCase())).length;
  const el=(id,v)=>{const n=document.getElementById(id);if(n)n.textContent=v;};
  el('adminNotifTotal',items.length);el('adminNotifUnread',unread());el('adminNotifHigh',high);el('adminNotifToday',items.filter(x=>new Date(x.created_at).toLocaleDateString('en-CA')===today).length);
  const rows=items.filter(x=>{
   const q=[x.title,x.message,x.event_type,x.entity_table,x.source_table,x.target_page].join(' ').toLowerCase();
   if(search&&!q.includes(search))return false;
   const p=String(x.priority||'normal').toLowerCase();
   if(filter==='unread'&&x.is_read)return false;
   if(filter==='read'&&!x.is_read)return false;
   if(filter==='high'&&!['high','critical'].includes(p))return false;
   return true;
  });
  body.innerHTML=rows.length?rows.map(x=>{
   const p=String(x.priority||'normal').toLowerCase();
   return `<tr class="notification-row ${x.is_read?'read':'unread'}"><td><div class="notification-title"><i class="notification-dot"></i><div><strong>${esc(x.title||eventLabel(x.event_type))}</strong><small>${esc(x.message||'Hakuna maelezo ya ziada.')} · ${esc(eventLabel(x.event_type))}</small></div></div></td><td><span class="notification-pill ${esc(p)}">${esc(priorityLabel(p))}</span></td><td>${esc(date(x.created_at))}</td><td>${x.is_read?'<span class="notification-pill">Imesomwa</span>':'<span class="notification-pill high">Mpya</span>'}</td><td><button class="notification-open-btn" data-admin-notif-open="${esc(x.id)}">Fungua ↗</button></td></tr>`;
  }).join(''):'<tr><td colspan="5" class="empty-state">Hakuna arifa zinazolingana na kichujio hiki.</td></tr>';
  const foot=document.getElementById('adminNotifFootnote');if(foot)foot.textContent=`Inaonyesha ${rows.length} kati ya ${items.length} arifa. Arifa mpya husasishwa moja kwa moja.`;
  badge();preview();
 }
 async function load(){
  ensureUI();const body=document.getElementById('notificationsTableBody');
  try{
   if(window.ZUNE_AUTH_READY)await window.ZUNE_AUTH_READY;
   const db=c().db();if(!db)throw new Error('Supabase haijaunganishwa.');
   const {data,error}=await db.from(c().cfg.TABLES.notifications||'admin_notifications').select('*').order('created_at',{ascending:false}).limit(250);
   if(error)throw error;items=data||[];render();
  }catch(e){if(body)body.innerHTML=`<tr><td colspan="5" class="empty-state">Imeshindikana kupakia arifa: ${esc(e.message||e)}</td></tr>`;console.warn('ZUNE notifications load error',e);}
 }
 async function markAllRead(){
  const ids=items.filter(x=>!x.is_read).map(x=>x.id);if(!ids.length){ui().toast('Hakuna arifa mpya za kusoma.','info');return;}
  const btn=document.getElementById('markAllAdminNotifications');if(btn){btn.disabled=true;btn.textContent='Inasoma…';}
  try{
   const {error}=await c().db().from(c().cfg.TABLES.notifications||'admin_notifications').update({is_read:true,read_at:new Date().toISOString()}).in('id',ids);
   if(error)throw error;items=items.map(x=>x.is_read?x:{...x,is_read:true,read_at:new Date().toISOString()});render();ui().toast('Arifa zote zimewekwa kuwa zimesomwa.','success');
  }catch(e){ui().toast('Imeshindikana kusoma arifa zote: '+e.message,'error');}
  finally{if(btn){btn.disabled=false;btn.textContent='✓ Soma zote';}}
 }
 function modal(n){
  document.getElementById('adminNotificationDetail')?.remove();
  const target=n.target_page,canGo=target&&window.ZUNE_ROUTER?.titles?.[target];
  const host=document.createElement('div');host.id='adminNotificationDetail';host.className='notification-modal-backdrop';
  host.innerHTML=`<div class="notification-modal" role="dialog" aria-modal="true" aria-labelledby="adminNotificationDetailTitle"><span class="notification-eyebrow">${esc(priorityLabel(n.priority))} · ${esc(eventLabel(n.event_type))}</span><h3 id="adminNotificationDetailTitle">${esc(n.title||'Taarifa ya ZUNE')}</h3><p>${esc(n.message||'Hakuna maelezo ya ziada.')}</p><small>${esc(date(n.created_at))} · Chanzo: ${esc(n.entity_table||n.source_table||'Mfumo')}</small><div class="notification-modal-actions"><button class="secondary-btn" id="closeAdminNotificationDetail" type="button">Funga</button>${canGo?'<button class="primary-btn" id="goAdminNotificationTarget" type="button">Fungua sehemu husika ↗</button>':''}</div></div>`;
  document.body.appendChild(host);
  host.addEventListener('click',e=>{if(e.target===host)host.remove();});
  host.querySelector('#closeAdminNotificationDetail')?.addEventListener('click',()=>host.remove());
  host.querySelector('#goAdminNotificationTarget')?.addEventListener('click',()=>{host.remove();window.ZUNE_ROUTER.show(target);document.getElementById('notificationDropdown')?.classList.remove('open');});
 }
 async function open(id){
  const n=items.find(x=>String(x.id)===String(id));if(!n)return;
  if(!n.is_read){
   const {error}=await c().db().from(c().cfg.TABLES.notifications||'admin_notifications').update({is_read:true,read_at:new Date().toISOString()}).eq('id',n.id);
   if(error){ui().toast('Imeshindikana kuweka alama ya kusomwa: '+error.message,'warning');return;}
   n.is_read=true;n.read_at=new Date().toISOString();
  }
  render();modal(n);document.getElementById('notificationDropdown')?.classList.remove('open');
 }
 function realtime(){
  if(!c().db()||channel)return;
  channel=c().db().channel('zune-admin-inbox').on('postgres_changes',{event:'*',schema:'public',table:c().cfg.TABLES.notifications||'admin_notifications'},payload=>{
   if(payload.eventType==='INSERT'){items=[payload.new,...items.filter(x=>x.id!==payload.new.id)];render();ui().toast(payload.new.title||'Notification mpya','info');}
   else if(payload.eventType==='UPDATE'){items=items.map(x=>x.id===payload.new.id?payload.new:x);render();}
   else if(payload.eventType==='DELETE'){items=items.filter(x=>x.id!==payload.old.id);render();}
  }).subscribe();
 }
 document.addEventListener('DOMContentLoaded',()=>{
  ensureUI();load();realtime();
  document.getElementById('adminNotificationBtn')?.addEventListener('click',()=>document.getElementById('notificationDropdown')?.classList.toggle('open'));
  document.getElementById('viewAllNotifications')?.addEventListener('click',()=>{document.getElementById('notificationDropdown')?.classList.remove('open');window.ZUNE_ROUTER?.show('notifications');});
  document.addEventListener('click',e=>{const b=e.target.closest('[data-notification-open]');if(b)open(b.dataset.notificationOpen);});
  document.addEventListener('zune:admin-refresh',load);
 });
 document.addEventListener('zune:page-changed',e=>{if(e.detail.page==='notifications')load();});
 window.ZUNE_NOTIFICATIONS={load,open,markAllRead,get items(){return items;}};
})();