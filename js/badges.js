(() => {
  'use strict';
  const c=()=>window.ZUNE_CORE, ui=()=>window.ZUNE_LAYOUT, A=()=>window.ZUNE_ACTIONS, $=id=>document.getElementById(id);
  let reqs=[], verified=[], inR=null, inV=null;
  const lc=v=>String(v||'').toLowerCase(), isOpen=r=>['pending','under_review'].includes(lc(r.status));
  const refilter=id=>$(id)?.dispatchEvent(new Event('input'));
  function reqButtons(r){
    if(lc(r.status)!=='pending')return '<span class="muted">—</span>';
    const id=ui().esc(r.id);
    return `<div class="action-row"><button class="primary-btn" type="button" data-badge-act="approved" data-id="${id}">Approve</button><button class="danger-btn" type="button" data-badge-act="rejected" data-id="${id}">Reject</button></div>`;
  }
  function renderRequests(){
    const f=$('badgeRequestStatus')?.value||'', data=f?reqs.filter(r=>lc(r.status)===f):reqs;
    const body=$('badgeRequestsBody'); if(!body)return;
    body.innerHTML=data.length?data.map(r=>{const doc=r.__documentUrl?(String(r.document_path||'').toLowerCase().endsWith('.pdf')?'<a href="'+ui().esc(r.__documentUrl)+'" target="_blank" rel="noopener">Fungua PDF</a>':'<a href="'+ui().esc(r.__documentUrl)+'" target="_blank" rel="noopener"><img src="'+ui().esc(r.__documentUrl)+'" alt="Verification document" style="width:76px;height:64px;object-fit:cover;border-radius:9px;border:1px solid var(--border)"></a>'):'<span class="muted">Haijawekwa</span>';return '<tr><td>'+ui().esc(r.full_name||r.user_id||'—')+'</td><td>'+ui().esc(r.user_id||'—')+'</td><td>'+ui().esc(r.verification_type==='seller'?'Seller / Verified Store':'Customer / Verified Account')+'</td><td>'+ui().esc(r.rejection_reason||r.business_name||'—')+'</td><td>'+doc+'</td><td>'+ui().date(r.created_at)+'</td><td>'+ui().status(r.status)+'</td><td>'+reqButtons(r)+'</td></tr>';}).join(''):'<tr><td colspan="8" class="empty-state">Hakuna badge requests.</td></tr>';
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
  function loadRequests(){if(inR)return inR;inR=(async()=>{try{await window.ZUNE_AUTH_READY;const {data,error}=await c().db().from('verified_badge_requests').select('*').order('created_at',{ascending:false}).limit(300);if(error)throw error;reqs=data||[];await Promise.all(reqs.map(async r=>{if(!r.document_path)return;const {data:link,error:linkError}=await c().db().storage.from('zune-verification-documents').createSignedUrl(r.document_path,300);if(!linkError&&link?.signedUrl)r.__documentUrl=link.signedUrl;}));renderRequests();}catch(e){c().error('badgeRequestsBody',e);}finally{inR=null;}})();return inR;}
  function loadVerified(){if(inV)return inV;inV=(async()=>{try{if(window.ZUNE_AUTH_READY)await window.ZUNE_AUTH_READY;
    const {data,error}=await c().db().from('profiles').select('id,full_name,email,role,is_verified,created_at').eq('is_verified',true).order('created_at',{ascending:false}).limit(500);
    if(error)throw error;verified=data||[];renderVerified();}catch(e){c().error('verifiedUsersBody',e);}finally{inV=null;}})();return inV;}
  const reloadAll=()=>Promise.all([loadRequests(),loadVerified()]);
  function decide(r,decision){
    const label={under_review:'Weka Under Review',approved:'Idhinisha',rejected:'Kataa'}[decision];
    A().confirm({title:`${label} — Verified Badge`,message:`${label}: ${r.full_name||r.user_id}. ${decision==='approved'?'Badge itatolewa kwa mtumiaji huyu.':''} Andika sababu.`,confirmText:label,
      fn:async reason=>{await A().rpc('admin_review_zune_badge_request',{p_request_id:r.id,p_decision:decision==='under_review'?'approved':decision,p_reason:reason});ui().toast('Ombi la badge limesasishwa.','success');await reloadAll();}});
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
