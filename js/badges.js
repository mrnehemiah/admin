(() => {
  'use strict';
  const c=()=>window.ZUNE_CORE, ui=()=>window.ZUNE_LAYOUT, A=()=>window.ZUNE_ACTIONS, $=id=>document.getElementById(id);
  let reqs=[], verified=[], inR=null, inV=null;
  const lc=v=>String(v||'').toLowerCase(), isOpen=r=>['pending','under_review'].includes(lc(r.status));
  const refilter=id=>$(id)?.dispatchEvent(new Event('input'));
  function reqButtons(r){
    if(!isOpen(r))return '<span class="muted">—</span>';
    const id=ui().esc(r.id);
    return `<div class="action-row">${lc(r.status)==='pending'?`<button class="secondary-btn" type="button" data-badge-act="under_review" data-id="${id}">Review</button>`:''}<button class="primary-btn" type="button" data-badge-act="approved" data-id="${id}">Approve</button><button class="danger-btn" type="button" data-badge-act="rejected" data-id="${id}">Reject</button></div>`;
  }
  function renderRequests(){
    const f=$('badgeRequestStatus')?.value||'', data=f?reqs.filter(r=>lc(r.status)===f):reqs;
    c().setRows('badgeRequestsBody',data,[
      {html:r=>ui().esc(r.full_name||r.user_id||'—')},{html:r=>ui().esc(r.user_id||'—')},
      {html:r=>ui().esc(r.user_type||r.document_type||'—')},{html:r=>ui().esc(r.reason||r.admin_note||'—')},
      {html:r=>ui().esc(r.document_number||'—')},{html:r=>ui().date(r.created_at)},
      {html:r=>ui().status(r.status)},{html:reqButtons}
    ],'Hakuna badge requests.');
    const n=s=>reqs.filter(r=>lc(r.status)===s).length.toLocaleString();
    c().setText('badgePendingCount',n('pending'));c().setText('badgeReviewCount',n('under_review'));c().setText('badgeApprovedCount',n('approved'));c().setText('badgeRejectedCount',n('rejected'));
    refilter('badgeRequestsSearch');
  }
  function renderVerified(){
    const t=$('verifiedUserType')?.value||'', data=t?verified.filter(r=>r.role===t):verified;
    c().setRows('verifiedUsersBody',data,[
      {html:r=>ui().esc(r.full_name||r.email||r.id)},{html:r=>ui().esc(r.id)},
      {html:r=>ui().esc(r.role==='vendor'?'Seller':r.role==='buyer'?'Buyer':r.role||'—')},
      {html:()=>'—'},{html:()=>'—'},
      {html:r=>`<button class="danger-btn" type="button" data-badge-remove="${ui().esc(r.id)}">Remove Badge</button>`}
    ],'Hakuna watumiaji wenye Verified Badge.');
    refilter('verifiedUsersSearch');
  }
  function loadRequests(){if(inR)return inR;inR=(async()=>{try{reqs=await c().rows('verification_requests',300);renderRequests();}catch(e){c().error('badgeRequestsBody',e);}finally{inR=null;}})();return inR;}
  function loadVerified(){if(inV)return inV;inV=(async()=>{try{if(window.ZUNE_AUTH_READY)await window.ZUNE_AUTH_READY;
    const {data,error}=await c().db().from('profiles').select('id,full_name,email,role,is_verified,created_at').eq('is_verified',true).order('created_at',{ascending:false}).limit(500);
    if(error)throw error;verified=data||[];renderVerified();}catch(e){c().error('verifiedUsersBody',e);}finally{inV=null;}})();return inV;}
  const reloadAll=()=>Promise.all([loadRequests(),loadVerified()]);
  function decide(r,decision){
    const label={under_review:'Weka Under Review',approved:'Idhinisha',rejected:'Kataa'}[decision];
    A().confirm({title:`${label} — Verified Badge`,message:`${label}: ${r.full_name||r.user_id}. ${decision==='approved'?'Badge itatolewa kwa mtumiaji huyu.':''} Andika sababu.`,confirmText:label,
      fn:async reason=>{await A().rpc('admin_review_badge_request',{p_request_id:r.id,p_decision:decision,p_reason:reason});ui().toast('Ombi la badge limesasishwa.','success');await reloadAll();}});
  }
  function removeBadge(userId,label,reason=''){
    A().confirm({title:'Ondoa Verified Badge',message:`Ondoa badge: ${label}. Akaunti haitafutwa.`,confirmText:'Remove Badge',reason,
      fn:async r=>{await A().rpc('admin_set_badge',{p_user_id:userId,p_grant:false,p_reason:r});ui().toast('Verified Badge imeondolewa.','success');await reloadAll();window.ZUNE_SELLERS?.load();}});
  }
  document.addEventListener('DOMContentLoaded',()=>{
    $('badgeRequestsBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-badge-act]');if(!b)return;const r=reqs.find(x=>String(x.id)===b.dataset.id);if(r)decide(r,b.dataset.badgeAct);});
    $('verifiedUsersBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-badge-remove]');if(!b)return;const u=verified.find(x=>String(x.id)===b.dataset.badgeRemove);if(u)removeBadge(u.id,u.full_name||u.email||u.id);});
    $('badgeRequestStatus')?.addEventListener('change',renderRequests);$('verifiedUserType')?.addEventListener('change',renderVerified);
    c().bindFilter('badgeRequestsSearch','badgeRequestsBody');c().bindFilter('verifiedUsersSearch','verifiedUsersBody');
    $('removeBadgeBtn')?.addEventListener('click',()=>{
      const id=$('removeBadgeUserId')?.value.trim()||'', reason=$('removeBadgeReason')?.value.trim()||'';
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)){ui().toast('Ingiza User ID sahihi (UUID).','warning');return;}
      removeBadge(id,id,reason);
    });
  });
  document.addEventListener('zune:page-changed',e=>{if(e.detail.page==='badge-requests')loadRequests();if(e.detail.page==='badge-management')loadVerified();});
  document.addEventListener('zune:admin-refresh',()=>{const p=window.ZUNE_ROUTER?.current;if(p==='badge-requests')loadRequests();if(p==='badge-management')loadVerified();});
  window.ZUNE_BADGES={loadRequests,loadVerified};
})();
