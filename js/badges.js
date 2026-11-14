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

  let verificationRows=[],verificationLoad=null;
  const verificationBucket='zune-verification-documents';
  const verificationEsc=v=>ui().esc(v==null?'':String(v));
  async function verificationSignedUrl(row){
    let value=row.document_path||row.document_url||'';
    if(!value)return null;
    const cfg=c().cfg||{};
    if(/^https?:\/\//i.test(value)){
      try{
        const u=new URL(value),base=new URL(cfg.SUPABASE_URL);
        if(u.origin!==base.origin)return null;
        if(u.pathname.includes('/storage/v1/object/sign/'+verificationBucket+'/'))return u.href;
        const marker='/'+verificationBucket+'/';
        const at=u.pathname.indexOf(marker);
        if(at<0)return null;
        value=decodeURIComponent(u.pathname.slice(at+marker.length));
      }catch(_){return null;}
    }
    value=String(value).replace(/^\/+/,'');
    const {data,error}=await c().db().storage.from(verificationBucket).createSignedUrl(value,600);
    if(error||!data?.signedUrl)return null;
    return data.signedUrl;
  }
  function verificationTypeLabel(row){
    const type=String(row.verification_type||row.role||'').toLowerCase();
    if(type==='seller'||type==='store'||type==='vendor')return 'Seller / Verified Store';
    if(type==='customer'||type==='individual'||type==='buyer')return 'Customer / Verified Account';
    return row.document_type||'Verification';
  }
  function renderVerificationDocuments(){
    const body=$('verificationTableBody');
    if(!body)return;
    const section=document.querySelector('[data-section="verification"]');
    const head=section?.querySelector('thead tr');
    if(head)head.innerHTML='<th>Mwombaji</th><th>Aina</th><th>Nyaraka</th><th>Reference / Maelezo</th><th>Tarehe</th><th>Hali</th><th>Ukaguzi</th>';
    const q=($('verificationDocumentsSearch')?.value||'').toLowerCase().trim();
    const status=$('verificationDocumentsStatus')?.value||'';
    const rows=verificationRows.filter(r=>(!status||String(r.status||'').toLowerCase()===status)&&(!q||JSON.stringify([r.full_name,r.user_id,r.document_type,r.document_number,r.document_note,r.reason,r.business_name,r.status]).join(' ').toLowerCase().includes(q)));
    if(!rows.length){
      body.innerHTML='<tr><td colspan="7" class="empty-state">'+(verificationRows.length?'Hakuna maombi yanayolingana na utafutaji.':'Hakuna maombi ya verification yaliyopatikana.')+'</td></tr>';
      return;
    }
    body.innerHTML=rows.map(r=>{
      const key=verificationEsc(r.__key),name=verificationEsc(r.full_name||r.user_id||'—');
      const doc=r.__documentUrl?'<button class="secondary-btn" type="button" data-vdoc-open="'+key+'">Fungua nyaraka</button>':'<span class="muted">'+(r.document_note?'Maelezo tu — hakuna faili':'Nyaraka hazijaambatishwa')+'</span>';
      const ref=verificationEsc(r.document_number||r.document_note||r.reason||r.business_name||'—');
      const badgeSource=r.__source==='badge';
      const pending=String(r.status||'').toLowerCase()==='pending';
      const canApprove=!badgeSource||!!r.__documentUrl;
      const actions=pending?'<div class="action-row"><button class="primary-btn" type="button" data-vdoc-review="approved" data-vdoc-key="'+key+'" '+(canApprove?'':'disabled title="Nyaraka hazijaambatishwa"')+'>Idhinisha</button><button class="danger-btn" type="button" data-vdoc-review="rejected" data-vdoc-key="'+key+'">Kataa</button></div>':'<span class="muted">—</span>';
      return '<tr><td>'+name+'<small class="muted" style="display:block">'+verificationEsc(r.user_id||'')+'</small></td><td>'+verificationEsc(verificationTypeLabel(r))+'</td><td>'+doc+'</td><td>'+ref+'</td><td>'+ui().date(r.created_at)+'</td><td>'+ui().status(r.status)+'</td><td>'+actions+'</td></tr>';
    }).join('');
  }
  async function loadVerificationDocuments(){
    if(verificationLoad)return verificationLoad;
    verificationLoad=(async()=>{
      const body=$('verificationTableBody');if(!body)return;
      body.innerHTML='<tr><td colspan="7" class="empty-state">Inapakia maombi na nyaraka kutoka Supabase...</td></tr>';
      try{
        await window.ZUNE_AUTH_READY;
        const db=c().db();
        const [applicationResult,badgeResult]=await Promise.allSettled([
          db.rpc('admin_list_verification_applications',{p_status:null,p_type:null,p_source:'all',p_limit:100,p_offset:0}),
          db.from('verified_badge_requests').select('id,user_id,full_name,business_name,verification_type,document_url,document_path,status,rejection_reason,created_at,updated_at').order('created_at',{ascending:false}).limit(300)
        ]);
        const rows=[];
        if(applicationResult.status==='fulfilled'&&!applicationResult.value.error){
          const payload=applicationResult.value.data||{};
          (payload.applications||[]).forEach(r=>rows.push({...r,__source:r.source||'request',__key:(r.source||'request')+':'+r.id}));
        }else if(applicationResult.status==='rejected'||applicationResult.value?.error){
          console.warn('Verification applications load failed',applicationResult.reason||applicationResult.value.error);
        }
        if(badgeResult.status==='fulfilled'&&!badgeResult.value.error){
          (badgeResult.value.data||[]).forEach(r=>rows.push({...r,__source:'badge',__key:'badge:'+r.id}));
        }else if(badgeResult.status==='rejected'||badgeResult.value?.error){
          console.warn('Verified badge requests load failed',badgeResult.reason||badgeResult.value.error);
        }
        await Promise.all(rows.map(async r=>{try{r.__documentUrl=await verificationSignedUrl(r);}catch(e){console.warn('Document link unavailable',e);r.__documentUrl=null;}}));
        verificationRows=rows.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
        renderVerificationDocuments();
        if(!rows.length&&applicationResult.status!=='fulfilled'&&badgeResult.status!=='fulfilled')c().error('verificationTableBody',applicationResult.reason||badgeResult.reason);
      }catch(e){c().error('verificationTableBody',e);}
      finally{verificationLoad=null;}
    })();
    return verificationLoad;
  }
  function openVerificationDocument(row){
    if(!row?.__documentUrl)return;
    const old=$('verificationDocumentModal');old?.remove();
    const isPdf=/\.pdf(?:$|[?#])/i.test(row.document_path||row.document_url||'');
    const media=isPdf
      ?'<iframe title="Verification document" src="'+verificationEsc(row.__documentUrl)+'" style="width:100%;height:min(68vh,720px);border:0;border-radius:10px;background:#fff"></iframe>'
      :'<img alt="Verification document" src="'+verificationEsc(row.__documentUrl)+'" style="display:block;max-width:100%;max-height:68vh;margin:auto;object-fit:contain;border-radius:10px">';
    const modal=document.createElement('div');modal.id='verificationDocumentModal';modal.className='modal-backdrop show';
    modal.innerHTML='<div class="modal-card" style="width:min(96vw,900px);max-height:92vh;overflow:auto"><div class="modal-heading"><h3>Nyaraka za '+verificationEsc(row.full_name||'mwombaji')+'</h3><button class="icon-btn" type="button" data-vdoc-close aria-label="Funga">×</button></div><p class="muted">Hifadhi ya nyaraka ni private. Kiungo hiki ni cha muda mfupi.</p>'+media+'<div class="modal-actions"><a class="secondary-btn" href="'+verificationEsc(row.__documentUrl)+'" target="_blank" rel="noopener">Fungua kwenye tab mpya</a><button class="secondary-btn" type="button" data-vdoc-close>Funga</button></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('[data-vdoc-close]'))modal.remove();});
  }
  function reviewVerificationDocument(row,decision){
    if(!row)return;
    if(row.__source==='badge'&&decision==='approved'&&!row.__documentUrl){
      ui().toast('Ombi haliwezi kuidhinishwa: nyaraka hazijaambatishwa.','warning');return;
    }
    const label=decision==='approved'?'Idhinisha':'Kataa';
    A().confirm({title:label+' Verification',message:label+' ombi la '+(row.full_name||row.user_id)+'. Andika sababu ya uamuzi (angalau herufi 5).',confirmText:label,
      fn:async reason=>{
        if(row.__source==='badge'){
          await A().rpc('admin_review_zune_badge_request',{p_request_id:row.id,p_decision:decision,p_reason:reason});
        }else{
          await A().rpc('admin_review_verification_application',{p_application_id:row.id,p_source:row.__source,p_decision:decision,p_reason:reason});
        }
        ui().toast('Uamuzi wa verification umehifadhiwa.','success');
        await loadVerificationDocuments();
        if(row.__source==='badge')await loadRequests();
      }});
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const section=document.querySelector('[data-section="verification"]');
    if(section){
      const toolbar=document.createElement('div');toolbar.className='table-toolbar';
      toolbar.innerHTML='<input class="table-search" id="verificationDocumentsSearch" placeholder="Tafuta jina, User ID au nyaraka..."><select id="verificationDocumentsStatus"><option value="">Hali zote</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select><button class="secondary-btn" id="refreshVerificationDocuments" type="button">↻ Refresh</button>';
      const tableWrap=section.querySelector('.table-wrap');if(tableWrap)tableWrap.parentNode.insertBefore(toolbar,tableWrap);
      $('verificationDocumentsSearch')?.addEventListener('input',renderVerificationDocuments);
      $('verificationDocumentsStatus')?.addEventListener('change',renderVerificationDocuments);
      $('refreshVerificationDocuments')?.addEventListener('click',()=>loadVerificationDocuments());
      $('verificationTableBody')?.addEventListener('click',e=>{
        const open=e.target.closest('[data-vdoc-open]');
        if(open){const row=verificationRows.find(x=>x.__key===open.dataset.vdocOpen);if(row)openVerificationDocument(row);return;}
        const review=e.target.closest('[data-vdoc-review]');
        if(review){const row=verificationRows.find(x=>x.__key===review.dataset.vdocKey);if(row)reviewVerificationDocument(row,review.dataset.vdocReview);}
      });
      loadVerificationDocuments();
    }
  });
  document.addEventListener('zune:page-changed',e=>{if(e.detail.page==='verification')loadVerificationDocuments();});
  document.addEventListener('zune:admin-refresh',()=>{if(window.ZUNE_ROUTER?.current==='verification')loadVerificationDocuments();});
  window.ZUNE_VERIFICATION_DOCUMENTS={load:loadVerificationDocuments};

})();
