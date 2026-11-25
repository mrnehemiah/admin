(() => {
'use strict';
const BUCKET='zune-reels', $=s=>document.querySelector(s);
let mounted=false,rows=[],products=[],sounds=[],reports=[];
let adminCompletedUpload=null;
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const db=()=>window.ZUNE_CORE&&window.ZUNE_CORE.db?window.ZUNE_CORE.db():window.zuneSupabase;
const user=()=>window.ZUNE_ADMIN_PROFILE||window.ZUNE_CURRENT_USER||{};
const toast=m=>window.ZUNE_LAYOUT&&window.ZUNE_LAYOUT.toast?window.ZUNE_LAYOUT.toast(m,'info'):alert(m);
const url=p=>db().storage.from(BUCKET).getPublicUrl(p).data.publicUrl;
function mount(){
 const section=document.querySelector('[data-section="reels"]');if(!section||mounted)return;mounted=true;
 section.innerHTML='<div class="section-intro"><div><h2>ZUNE Reels Management</h2><p>Simamia video za wauzaji na akaunti rasmi ya ZUNE, kagua maudhui na ufuatilie utendaji.</p></div><button class="secondary-btn" id="reelsRefresh">↻ Refresh</button></div>'+
 '<div class="reels-admin-stats"><article><small>Jumla ya Reels</small><strong id="reelsTotal">—</strong></article><article><small>Published</small><strong id="reelsPublished">—</strong></article><article><small>Pending review</small><strong id="reelsPending">—</strong></article><article><small>Views zilizorekodiwa</small><strong id="reelsViews">—</strong></article><article><small>Likes</small><strong id="reelsLikes">—</strong></article><article><small>Comments</small><strong id="reelsComments">—</strong></article><article><small>Shares</small><strong id="reelsShares">—</strong></article></div>'+
 '<div class="panel reels-admin-upload"><div class="section-intro"><div><h3>Chapisha Reel rasmi ya ZUNE</h3><p>Video hii itaonekana kama ZUNE Official na itapata Official badge kutoka role ya Admin.</p></div><span class="badge-pill success">ZUNE OFFICIAL</span></div>'+
 '<form id="adminReelForm" class="form-grid"><label class="form-field">Video (MP4 / WebM / MOV)<input id="adminReelVideo" type="file" accept="video/mp4,video/webm,video/quicktime" required><small>Upeo 100 MB. Video wima ya 9:16 inapendekezwa.</small></label><label class="form-field">Bidhaa ya kuunganisha (hiari)<select id="adminReelProduct"><option value="">Hakuna bidhaa maalumu</option></select></label><label class="form-field">Music Library (hiari)<select id="adminReelSound"><option value="">Tumia Original Audio</option></select></label><label class="form-field full-width">Caption<textarea id="adminReelCaption" maxlength="2200" required placeholder="Andika ujumbe rasmi wa ZUNE..."></textarea></label><label class="form-field full-width">Hashtags<input id="adminReelTags" maxlength="300" placeholder="#ZUNE #ZUNEMarketplace"></label><label class="form-field full-width"><span><input id="adminReelRights" type="checkbox" required> Nina haki ya kutumia video na sauti zote zilizomo.</span></label><div class="full-width"><button class="primary-btn" id="adminReelPublish" type="submit">Chapisha Reel rasmi</button><p class="muted small" id="adminReelMessage">Sauti iliyomo ndani ya video itatumika kama Original Audio. Music Library inahitaji leseni na schema ya ziada.</p></div></form></div>'+
 '<div class="panel reels-admin-music"><div class="section-intro"><div><h3>Music Library</h3><p>Weka sauti ambazo zina leseni inayoruhusu matumizi ya kibiashara.</p></div><span class="badge-pill success">LICENSE CHECK</span></div><form id="adminSoundForm" class="form-grid"><label class="form-field">Jina la wimbo<input id="soundTitle" maxlength="160" required></label><label class="form-field">Msanii (hiari)<input id="soundArtist" maxlength="160"></label><label class="form-field">Faili ya sauti (MP3, WAV, AAC, OGG)<input id="soundFile" type="file" accept="audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/ogg,audio/webm" required><small>Upeo 15 MB.</small></label><label class="form-field">Jina la leseni / chanzo<input id="soundLicense" maxlength="180" required placeholder="Mfano: Commercial music license"></label><label class="form-field full-width">License reference / URL<input id="soundLicenseRef" maxlength="1000" placeholder="Namba ya leseni au URL ya ushahidi"></label><label class="form-field full-width"><span><input id="soundCommercial" type="checkbox" required> Nimethibitisha kuwa leseni inaruhusu matumizi ya kibiashara kwenye Marketplace.</span></label><label class="form-field full-width"><span><input id="soundActive" type="checkbox"> Iruhusu wimbo uonekane kwenye Music Library baada ya kuhifadhi.</span></label><div class="full-width"><button class="primary-btn" id="soundUploadBtn" type="submit">Ongeza Music Track</button><p id="soundMessage" class="muted small">Music Library itawashwa baada ya backend extension kuidhinishwa.</p></div></form><div id="adminSoundsList" class="reels-admin-list"><div class="empty-state">Inasubiri Music Library...</div></div></div>' + '<div class="panel"><div class="section-intro"><div><h3>Reels zote</h3><p>Orodha ya maudhui kutoka Sellers na ZUNE Official.</p></div></div><div class="table-toolbar"><input class="table-search" id="reelsSearch" placeholder="Tafuta caption, Seller au ID..."><select id="reelsStatus"><option value="">Status zote</option><option value="pending">Pending</option><option value="published">Published</option><option value="rejected">Rejected</option><option value="archived">Archived</option></select></div><div id="reelsAdminList" class="reels-admin-list"><div class="empty-state">Inasubiri data kutoka Supabase...</div></div></div>'+
 '<div class="panel"><div class="section-intro"><div><h3>Ripoti za Reels</h3><p>Kagua ripoti za wateja na chukua hatua za moderation.</p></div><button class="secondary-btn" id="reportsRefresh" type="button">Refresh reports</button></div><div id="reelsReportsList" class="reels-admin-list"><div class="empty-state">Inapakia ripoti...</div></div></div>'+
 '<div class="panel"><div class="section-intro"><div><h3>Creator Monetization Review</h3><p>Kagua maombi ya creators na uthibitishe views halali kabla ya kuhesabiwa.</p></div><button class="secondary-btn" id="creatorMonetizationRefresh" type="button">Refresh</button></div><h4>Maombi ya Creators</h4><div id="creatorMonetizationApplications" class="reels-admin-list"><div class="empty-state">Inapakia maombi...</div></div><h4 style="margin-top:18px">Mipangilio ya mapato</h4><form id="creatorRatesForm" class="form-grid"><label class="form-field">TZS kwa verified view<input id="creatorViewRate" type="number" min="0" step="0.0001" required></label><label class="form-field">Global sales commission (%)<input id="creatorSalesCommission" type="number" min="0" max="100" step="0.01" required></label><label class="form-field">Kiwango cha chini cha withdrawal (TZS)<input id="creatorMinimumWithdrawal" type="number" min="0" step="1" required></label><div class="full-width"><button class="primary-btn" type="submit" id="creatorRatesSave">Hifadhi viwango</button><span id="creatorRatesMessage" class="muted small"></span></div></form><h4 style="margin-top:18px">Views zinazosubiri uthibitisho</h4><div id="creatorVerifiedViews" class="reels-admin-list"><div class="empty-state">Inapakia views...</div></div><h4 style="margin-top:18px">Creator Withdrawal Requests</h4><div id="creatorWithdrawalQueue" class="reels-admin-list"><div class="empty-state">Inapakia withdrawals...</div></div></div>' +
 '<div class="panel"><div class="section-intro"><div><h3>ZUNE Creator Challenges</h3><p>Tengeneza challenge, weka muda wa kuanza/kumalizika na ukague Reels zilizowasilishwa.</p></div><button class="secondary-btn" id="challengeRefresh" type="button">Refresh</button></div><form id="reelChallengeForm" class="form-grid"><label class="form-field">Jina la Challenge<input id="challengeTitle" maxlength="120" required></label><label class="form-field">Hashtag<input id="challengeHashtag" maxlength="40" pattern="[A-Za-z0-9_]{2,40}" required placeholder="ZUNEChallenge"></label><label class="form-field">Muda wa kuanza<input id="challengeStarts" type="datetime-local" required></label><label class="form-field">Muda wa kumalizika<input id="challengeEnds" type="datetime-local" required></label><label class="form-field full-width">Maelezo<textarea id="challengeDescription" maxlength="2000"></textarea></label><label class="form-field full-width">Zawadi / Maelezo ya tuzo<input id="challengeReward" maxlength="500" placeholder="Hiari — eleza tuzo au motisha"></label><div class="full-width"><button class="primary-btn" type="submit" id="challengeCreateBtn">Hifadhi Challenge</button><span id="challengeMessage" class="muted small"></span></div></form><h4>Challenges zilizopo</h4><div id="adminReelChallenges" class="reels-admin-list"></div><h4 style="margin-top:18px">Mawasilisho yanayosubiri</h4><div id="adminChallengeEntries" class="reels-admin-list"></div></div>' +
 '<div id="reelCommentsModal" class="modal-backdrop"><div class="modal-card"><div class="modal-heading"><h3>Comments za Reel</h3><button type="button" class="icon-btn" id="closeReelComments">×</button></div><div id="reelCommentsBody"></div></div></div>';
 const st=document.createElement('style');st.textContent='.reels-admin-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0 0 16px}.reels-admin-stats article{padding:14px;border:1px solid var(--line);border-radius:12px;background:#ffffff06}.reels-admin-stats small{display:block;color:var(--muted);font-size:10px}.reels-admin-stats strong{display:block;font:800 23px Manrope;margin-top:6px}.reels-admin-upload{margin-bottom:16px}.reels-admin-list{display:grid;gap:10px}.reels-admin-row{display:grid;grid-template-columns:86px minmax(0,1fr) auto;gap:13px;align-items:center;padding:12px;border:1px solid var(--line);border-radius:13px;background:#ffffff04}.reels-admin-row video{width:86px;height:112px;object-fit:cover;border-radius:9px;background:#071c18}.reels-admin-meta{min-width:0}.reels-admin-meta strong{display:block;font-size:12px}.reels-admin-meta p{font-size:10px;color:var(--muted);line-height:1.5;margin:5px 0}.reels-admin-actions{display:flex;flex-direction:column;gap:6px}.reels-admin-actions button{white-space:nowrap}.reels-admin-badge{display:inline-flex;color:#8ccfff;font-size:9px;font-weight:900;margin-left:5px}.reels-comment-row{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--line);font-size:11px}@media(max-width:700px){.reels-admin-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.reels-admin-row{grid-template-columns:64px minmax(0,1fr)}.reels-admin-row video{width:64px;height:86px}.reels-admin-actions{grid-column:1/-1;flex-direction:row;flex-wrap:wrap}}';document.head.appendChild(st);
 $('#reelsRefresh').onclick=()=>load().catch(showError);$('#reportsRefresh').onclick=()=>loadReports().catch(showReportError);$('#creatorMonetizationRefresh').onclick=()=>loadCreatorMonetization().catch(showError);$('#challengeRefresh').onclick=()=>loadReelChallenges().catch(showError);$('#reelChallengeForm').onsubmit=createReelChallenge;$('#reelsSearch').oninput=filter;$('#reelsStatus').onchange=filter;$('#closeReelComments').onclick=()=>$('#reelCommentsModal').classList.remove('show');
 $('#reelCommentsModal').onclick=e=>{if(e.target.id==='reelCommentsModal')$('#reelCommentsModal').classList.remove('show')};
 $('#adminReelForm').onsubmit=uploadOfficial;$('#adminSoundForm').onsubmit=uploadSound;
}
function filter(){const q=($('#reelsSearch')?.value||'').toLowerCase(),status=$('#reelsStatus')?.value||'';document.querySelectorAll('.reels-admin-row').forEach(el=>el.hidden=!(el.textContent.toLowerCase().includes(q)&&(!status||el.dataset.status===status)))}
async function loadProducts(){
 const r=await db().from('products').select('id,title,price,stock_quantity,moderation_status,removed_at,seller_archived_at').eq('moderation_status','approved').is('removed_at',null).is('seller_archived_at',null).order('created_at',{ascending:false}).limit(400);
 if(r.error)throw r.error;products=r.data||[];
 const select=$('#adminReelProduct');if(!select)return;
 select.innerHTML='<option value="">Hakuna bidhaa maalumu</option>'+products.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.title)+' — TSh '+Number(p.price||0).toLocaleString('en-TZ')+'</option>').join('');
 select.value='';select.style.display='none';
 let picker=$('#adminReelProductPicker');
 if(!picker){picker=document.createElement('section');picker.id='adminReelProductPicker';picker.style.cssText='margin-top:10px;padding:13px;border:1px solid #d8deea;border-radius:14px;background:#fff;color:#182033';select.insertAdjacentElement('afterend',picker);}
 picker.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:9px"><strong style="font-size:13px">Tag bidhaa kwenye Reel</strong><span id="adminProductTagCount" style="font-size:11px;color:#64748b">0/10</span></div><p style="margin:0 0 10px;color:#64748b;font-size:11px">Chagua bidhaa zilizoidhinishwa. Upeo ni bidhaa 10 kwa Reel.</p><div style="display:grid;gap:7px;max-height:230px;overflow:auto">'+(products.length?products.map(p=>'<label style="display:flex;gap:9px;align-items:center;padding:8px;border:1px solid #e6eaf1;border-radius:10px;font-size:12px"><input type="checkbox" value="'+esc(p.id)+'" data-admin-product-tag style="width:17px;height:17px;accent-color:#7c3aed"><span style="min-width:0;flex:1"><strong style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(p.title)+'</strong><small style="color:#64748b">TSh '+Number(p.price||0).toLocaleString('en-TZ')+' · Stock '+Number(p.stock_quantity||0)+'</small></span></label>').join(''):'<small style="color:#64748b">Hakuna bidhaa zilizoidhinishwa zinazopatikana.</small>')+'</div>';
 const update=()=>{const boxes=[...picker.querySelectorAll('[data-admin-product-tag]')],n=boxes.filter(x=>x.checked).length;const count=$('#adminProductTagCount');if(count)count.textContent=n+'/10';boxes.forEach(x=>{x.disabled=!x.checked&&n>=10;x.closest('label').style.opacity=x.disabled?'.45':'1';});};
 picker.onchange=e=>{if(e.target.matches('[data-admin-product-tag]'))update();};update();
}
function selectedAdminProductIds(){return [...($('#adminReelProductPicker')?.querySelectorAll('[data-admin-product-tag]:checked')||[])].map(x=>x.value).slice(0,10)}
async function load(){
 if(window.ZUNE_AUTH_READY)await window.ZUNE_AUTH_READY;if(!db())throw new Error('Supabase haijaunganishwa.');
 const r=await db().from('zune_reels').select('*,creator:profiles!zune_reels_creator_id_fkey(full_name,role,is_verified)').order('created_at',{ascending:false}).limit(300);if(r.error)throw r.error;rows=r.data||[];
 const ids=rows.map(x=>x.id),[likes,comments]=await Promise.all([ids.length?db().from('zune_reel_likes').select('reel_id').in('reel_id',ids):Promise.resolve({data:[]}),ids.length?db().from('zune_reel_comments').select('reel_id').in('reel_id',ids):Promise.resolve({data:[]})]);
 if(likes.error)throw likes.error;if(comments.error)throw comments.error;
 const countBy=list=>(list||[]).reduce((m,x)=>{m[x.reel_id]=(m[x.reel_id]||0)+1;return m},{}),likeCounts=countBy(likes.data),commentCounts=countBy(comments.data);
 rows=rows.map(x=>Object.assign({},x,{likes_count:likeCounts[x.id]||0,comments_count:commentCounts[x.id]||0}));
 $('#reelsTotal').textContent=rows.length.toLocaleString();$('#reelsPublished').textContent=rows.filter(x=>x.status==='published').length.toLocaleString();$('#reelsPending').textContent=rows.filter(x=>x.status==='pending').length.toLocaleString();$('#reelsViews').textContent=rows.reduce((n,x)=>n+Number(x.views_count||0),0).toLocaleString();$('#reelsLikes').textContent=rows.reduce((n,x)=>n+Number(x.likes_count||0),0).toLocaleString();$('#reelsComments').textContent=rows.reduce((n,x)=>n+Number(x.comments_count||0),0).toLocaleString();$('#reelsShares').textContent=rows.reduce((n,x)=>n+Number(x.shares_count||0),0).toLocaleString();
 await loadProducts();
 const tagResult=ids.length?await db().from('zune_reel_products').select('reel_id,product_id').in('reel_id',ids):{data:[]};
 if(tagResult.error)console.warn('Admin Reel product tags:',tagResult.error);
 const tagsByReel=(tagResult.data||[]).reduce((m,x)=>{(m[x.reel_id] ||= []).push(x.product_id);return m},{});
 rows=rows.map(r=>Object.assign({},r,{taggedProducts:(tagsByReel[r.id]||[]).map(id=>products.find(p=>p.id===id)).filter(Boolean)}));
 renderRows();
 try { await loadSounds(); } catch (soundError) { const soundHost=$('#adminSoundsList'); if(soundHost)soundHost.innerHTML='<div class="notice-box">Music Library haijapatikana: '+esc(soundError.message||soundError)+'</div>'; }
 try { await loadReports(); } catch(reportError) { showReportError(reportError); }
 try { await loadCreatorMonetization(); } catch(monetizationError) { showReportError(monetizationError); }
 try { await loadReelChallenges(); } catch(challengeError) { showReportError(challengeError); }
}

async function loadCreatorMonetization(){
 const appHost=$('#creatorMonetizationApplications'),viewHost=$('#creatorVerifiedViews');if(!appHost||!viewHost)return;
 const [apps,views,rates,withdrawals]=await Promise.all([
  db().from('zune_creator_monetization_applications').select('id,creator_id,status,application_note,created_at').order('created_at',{ascending:false}).limit(200),
  db().from('zune_reel_views').select('id,reel_id,viewer_id,created_at,verification_status,reel:zune_reels!inner(creator_id,caption)').eq('verification_status','pending').order('created_at',{ascending:false}).limit(200),
  db().from('zune_creator_monetization_settings').select('verified_view_rate_tzs,sales_commission_rate,minimum_withdrawal_tzs').eq('id',true).maybeSingle(),
  db().from('zune_creator_withdrawals').select('id,creator_id,amount,payout_method,account_name,account_reference,status,created_at,admin_note,payout_reference').order('created_at',{ascending:false}).limit(200)
 ]);
 for(const x of [apps,views,rates,withdrawals])if(x.error)throw x.error;
 if(rates.data){$('#creatorViewRate').value=rates.data.verified_view_rate_tzs;$('#creatorSalesCommission').value=rates.data.sales_commission_rate;$('#creatorMinimumWithdrawal').value=rates.data.minimum_withdrawal_tzs;}
 appHost.innerHTML=(apps.data||[]).length?(apps.data||[]).map(x=>'<article class="reels-admin-row"><div class="reels-admin-meta"><strong>Creator · '+esc(x.status)+'</strong><p>Creator ID: '+esc(x.creator_id)+'</p><p>'+esc(x.application_note||'Hakuna maelezo')+'</p><p>'+new Date(x.created_at).toLocaleString('sw-TZ')+'</p></div><div class="reels-admin-actions">'+(x.status==='pending'?'<button class="primary-btn" data-creator-app-action="approved" data-id="'+esc(x.id)+'">Approve</button><button class="warning-btn" data-creator-app-action="rejected" data-id="'+esc(x.id)+'">Reject</button>':'<span class="muted small">'+esc(x.status)+'</span>')+'</div></article>').join(''):'<div class="empty-state">Hakuna maombi ya Creator Monetization.</div>';
 const payoutHost=$('#creatorWithdrawalQueue');if(payoutHost)payoutHost.innerHTML=(withdrawals.data||[]).length?(withdrawals.data||[]).map(x=>'<article class="reels-admin-row"><div class="reels-admin-meta"><strong>TZS '+Number(x.amount).toLocaleString('en-US')+' · '+esc(x.status)+'</strong><p>Creator: '+esc(x.creator_id)+'</p><p>'+esc(x.payout_method)+' · '+esc(x.account_name)+' · '+esc(x.account_reference)+'</p><p>'+new Date(x.created_at).toLocaleString('sw-TZ')+'</p><p>'+esc(x.admin_note||'')+(x.payout_reference?' · Ref: '+esc(x.payout_reference):'')+'</p></div><div class="reels-admin-actions">'+(x.status==='pending'?'<button class="primary-btn" data-creator-withdrawal="approved" data-id="'+esc(x.id)+'">Approve</button><button class="warning-btn" data-creator-withdrawal="rejected" data-id="'+esc(x.id)+'">Reject</button>':'')+(x.status==='approved'||x.status==='processing'?'<button class="primary-btn" data-creator-withdrawal="paid" data-id="'+esc(x.id)+'">Mark paid</button><button class="secondary-btn" data-creator-withdrawal="processing" data-id="'+esc(x.id)+'">Processing</button>':'')+'</div></article>').join(''):'<div class="empty-state">Hakuna maombi ya malipo.</div>';
 viewHost.innerHTML=(views.data||[]).length?(views.data||[]).map(x=>'<article class="reels-admin-row"><div class="reels-admin-meta"><strong>View · '+esc(x.verification_status)+'</strong><p>Reel: '+esc(x.reel_id)+' · Creator: '+esc(x.reel?.creator_id||'—')+'</p><p>Viewer: '+esc(x.viewer_id||'Guest')+'</p><p>'+new Date(x.created_at).toLocaleString('sw-TZ')+'</p><p>'+esc(x.reel?.caption||'')+'</p></div><div class="reels-admin-actions"><button class="primary-btn" data-view-review="verified" data-id="'+esc(x.id)+'">Verify</button><button class="warning-btn" data-view-review="rejected" data-id="'+esc(x.id)+'">Reject</button><button class="secondary-btn" data-view-review="flagged" data-id="'+esc(x.id)+'">Flag</button></div></article>').join(''):'<div class="empty-state">Hakuna views zinazosubiri uthibitisho.</div>';
 $('#creatorRatesForm').onsubmit=async e=>{e.preventDefault();const b=$('#creatorRatesSave'),m=$('#creatorRatesMessage');b.disabled=true;try{const r=await db().from('zune_creator_monetization_settings').update({verified_view_rate_tzs:Number($('#creatorViewRate').value),sales_commission_rate:Number($('#creatorSalesCommission').value),minimum_withdrawal_tzs:Number($('#creatorMinimumWithdrawal').value),updated_by:user().id,updated_at:new Date().toISOString()}).eq('id',true);if(r.error)throw r.error;m.textContent='Viwango vimehifadhiwa. Rate mpya itatumika kwa views zitakazothibitishwa kuanzia sasa.';toast('Creator rates zimehifadhiwa.');}catch(err){m.textContent=err.message||'Imeshindikana kuhifadhi.';}finally{b.disabled=false;}};
 payoutHost.onclick=async e=>{const b=e.target.closest('[data-creator-withdrawal]');if(!b)return;const action=b.dataset.creatorWithdrawal;let payload={status:action,reviewed_by:user().id,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()};if(action==='paid'){const ref=prompt('Weka transaction reference ya malipo yaliyofanyika:');if(ref===null)return;if(!ref.trim()){toast('Transaction reference inahitajika kuthibitisha malipo.');return;}payload={...payload,payout_reference:ref.trim(),paid_at:new Date().toISOString()};}else if(action==='rejected'||action==='approved'){const note=prompt('Maelezo ya uamuzi (hiari):');if(note===null)return;payload.admin_note=note.trim()||null;}b.disabled=true;const r=await db().from('zune_creator_withdrawals').update(payload).eq('id',b.dataset.id);if(r.error){toast(r.error.message);b.disabled=false;return;}toast(action==='paid'?'Malipo yamerekodiwa.':'Ombi la malipo limesasishwa.');await loadCreatorMonetization();};
 appHost.onclick=async e=>{const b=e.target.closest('[data-creator-app-action]');if(!b)return;const note=prompt('Maelezo ya uamuzi wa Admin (hiari):');if(note===null)return;b.disabled=true;const r=await db().from('zune_creator_monetization_applications').update({status:b.dataset.creatorAppAction,reviewed_by:user().id,reviewed_at:new Date().toISOString(),review_note:note.trim()||null}).eq('id',b.dataset.id);if(r.error){toast('Imeshindikana: '+r.error.message);b.disabled=false;return;}toast('Ombi la creator limehakikiwa.');await loadCreatorMonetization();};
 viewHost.onclick=async e=>{const b=e.target.closest('[data-view-review]');if(!b)return;const note=prompt('Sababu ya uthibitisho/kukataliwa (hiari):');if(note===null)return;b.disabled=true;const r=await db().from('zune_reel_views').update({verification_status:b.dataset.viewReview,reviewed_by:user().id,reviewed_at:new Date().toISOString(),review_note:note.trim()||null}).eq('id',b.dataset.id);if(r.error){toast('Imeshindikana: '+r.error.message);b.disabled=false;return;}toast('View imehakikiwa.');await loadCreatorMonetization();};
}


async function createReelChallenge(e){
 e.preventDefault();const button=$('#challengeCreateBtn'),message=$('#challengeMessage');button.disabled=true;message.textContent='Inahifadhi...';
 try{
  const title=$('#challengeTitle').value.trim(),hashtag=$('#challengeHashtag').value.trim().replace(/^#/,'');
  const starts=new Date($('#challengeStarts').value),ends=new Date($('#challengeEnds').value);
  if(!title||!hashtag||!Number.isFinite(starts.getTime())||!Number.isFinite(ends.getTime())||ends<=starts)throw new Error('Weka jina, hashtag na muda sahihi wa challenge.');
  const now=new Date(),status=starts<=now&&ends>now?'active':'draft';
  const result=await db().from('zune_reel_challenges').insert({title,hashtag,description:$('#challengeDescription').value.trim(),starts_at:starts.toISOString(),ends_at:ends.toISOString(),reward_description:$('#challengeReward').value.trim()||null,status,created_by:user().id,updated_by:user().id});
  if(result.error)throw result.error;$('#reelChallengeForm').reset();message.textContent='Challenge imehifadhiwa.';toast('Creator Challenge imehifadhiwa.');await loadReelChallenges();
 }catch(err){message.textContent=err.message||'Imeshindikana kuhifadhi challenge.';toast(message.textContent);}finally{button.disabled=false;}
}
async function loadReelChallenges(){
 const host=$('#adminReelChallenges'),entriesHost=$('#adminChallengeEntries');if(!host||!entriesHost)return;
 const [challenges,entries]=await Promise.all([
  db().from('zune_reel_challenges').select('*').order('created_at',{ascending:false}).limit(100),
  db().from('zune_reel_challenge_entries').select('id,challenge_id,reel_id,creator_id,status,submitted_at,review_note').eq('status','pending').order('submitted_at',{ascending:false}).limit(200)
 ]);
 if(challenges.error)throw challenges.error;if(entries.error)throw entries.error;
 host.innerHTML=(challenges.data||[]).length?(challenges.data||[]).map(x=>'<article class="reels-admin-row"><div class="reels-admin-meta"><strong>'+esc(x.title)+' · #'+esc(x.hashtag)+'</strong><p>'+esc(x.status)+' · '+new Date(x.starts_at).toLocaleString('sw-TZ')+' — '+new Date(x.ends_at).toLocaleString('sw-TZ')+'</p><p>'+esc(x.description||'')+'</p><p>'+esc(x.reward_description||'Hakuna tuzo iliyoainishwa')+'</p></div><div class="reels-admin-actions">'+(x.status==='draft'?'<button class="primary-btn" data-challenge-status="active" data-id="'+esc(x.id)+'">Activate</button>':'')+(x.status==='active'?'<button class="warning-btn" data-challenge-status="ended" data-id="'+esc(x.id)+'">End</button>':'')+'</div></article>').join(''):'<div class="empty-state">Bado hakuna challenge.</div>';
 entriesHost.innerHTML=(entries.data||[]).length?(entries.data||[]).map(x=>'<article class="reels-admin-row"><div class="reels-admin-meta"><strong>Challenge entry · '+esc(x.status)+'</strong><p>Challenge: '+esc(x.challenge_id)+'</p><p>Reel: '+esc(x.reel_id)+'</p><p>Creator: '+esc(x.creator_id)+'</p><p>'+new Date(x.submitted_at).toLocaleString('sw-TZ')+'</p></div><div class="reels-admin-actions"><button class="primary-btn" data-challenge-entry="approved" data-id="'+esc(x.id)+'">Approve</button><button class="warning-btn" data-challenge-entry="rejected" data-id="'+esc(x.id)+'">Reject</button></div></article>').join(''):'<div class="empty-state">Hakuna mawasilisho yanayosubiri.</div>';
 host.onclick=async e=>{const b=e.target.closest('[data-challenge-status]');if(!b)return;b.disabled=true;const r=await db().from('zune_reel_challenges').update({status:b.dataset.challengeStatus,updated_by:user().id,updated_at:new Date().toISOString()}).eq('id',b.dataset.id);if(r.error){toast(r.error.message);b.disabled=false;return;}await loadReelChallenges();};
 entriesHost.onclick=async e=>{const b=e.target.closest('[data-challenge-entry]');if(!b)return;const note=prompt('Maelezo ya ukaguzi (hiari):');if(note===null)return;b.disabled=true;const r=await db().from('zune_reel_challenge_entries').update({status:b.dataset.challengeEntry,reviewed_by:user().id,reviewed_at:new Date().toISOString(),review_note:note.trim()||null}).eq('id',b.dataset.id);if(r.error){toast(r.error.message);b.disabled=false;return;}toast('Mawasilisho yamehakikiwa.');await loadReelChallenges();};
}

function renderRows(){
 const host=$('#reelsAdminList');if(!host)return;if(!rows.length){host.innerHTML='<div class="empty-state">Bado hakuna Reel iliyopakiwa.</div>';return}
 host.innerHTML=rows.map(r=>{
 const official=String(r.creator?.role||'').toLowerCase()==='admin',name=official?'ZUNE Official':(r.creator?.full_name||r.creator_display_name||'Seller');
 const badge=official?' <span class="reels-admin-badge">✦ OFFICIAL</span>':(r.creator?.is_verified?' <span class="reels-admin-badge">✓ VERIFIED</span>':'');
 const tagged=r.taggedProducts?.length?r.taggedProducts:products.filter(p=>p.id===r.product_id);
 return '<article class="reels-admin-row" data-status="'+esc(r.status)+'"><video src="'+esc(url(r.video_path))+'" muted playsinline controls preload="metadata"></video><div class="reels-admin-meta"><strong>'+esc(name)+badge+'</strong><p>'+esc(r.caption||'Reel ya bidhaa')+'</p><p>'+esc(r.status)+' · '+Number(r.views_count||0).toLocaleString()+' views · '+Number(r.likes_count||0)+' likes · '+Number(r.comments_count||0)+' comments · '+Number(r.shares_count||0)+' shares · '+new Date(r.created_at).toLocaleString('sw-TZ')+'</p>'+(tagged.length?'<p>Bidhaa: '+tagged.map(p=>esc(p.title)).join(' · ')+'</p>':'')+(r.moderation_note?'<p>Maelezo: '+esc(r.moderation_note)+'</p>':'')+'</div><div class="reels-admin-actions">'+(r.status!=='published'?'<button class="primary-btn" data-reel-action="publish" data-id="'+esc(r.id)+'">Publish</button>':'')+(r.status!=='rejected'?'<button class="warning-btn" data-reel-action="reject" data-id="'+esc(r.id)+'">Reject</button>':'')+(r.status!=='archived'?'<button class="secondary-btn" data-reel-action="archive" data-id="'+esc(r.id)+'">Archive</button>':'')+'<button class="secondary-btn" data-reel-comments="'+esc(r.id)+'">Comments</button></div></article>';
 }).join('');
 host.querySelectorAll('video').forEach(video=>video.addEventListener('error',()=>{const row=video.closest('.reels-admin-row');if(row){const note=document.createElement('p');note.className='notice-box';note.textContent='Video haipatikani kwenye Storage. Inahitaji kurejeshwa au kupakiwa tena; rekodi ya Reel haijafutwa.';row.querySelector('.reels-admin-meta')?.appendChild(note);}video.replaceWith(document.createElement('div'));},{once:true}));
 host.querySelectorAll('[data-reel-action]').forEach(b=>b.onclick=()=>moderate(b.dataset.id,b.dataset.reelAction,b));
 host.querySelectorAll('[data-reel-comments]').forEach(b=>b.onclick=()=>loadComments(b.dataset.reelComments));filter();
}
async function moderate(id,action,button){
 const status={publish:'published',reject:'rejected',archive:'archived'}[action],reason=prompt('Andika sababu ya hatua hii (angalau herufi 5):');if(reason===null)return;if(reason.trim().length<5){toast('Sababu lazima iwe na angalau herufi 5.');return}button.disabled=true;
 try{const r=await db().from('zune_reels').update({status,moderation_note:reason.trim(),moderated_by:user().id,moderated_at:new Date().toISOString()}).eq('id',id);if(r.error)throw r.error;await window.ZUNE_CORE?.audit?.('reel_'+action,'zune_reels',id,reason.trim(),{status});toast('Reel imesasishwa.');await load()}catch(e){toast('Imeshindikana: '+(e.message||e));button.disabled=false}
}
async function loadComments(id){
 const r=await db().from('zune_reel_comments').select('id,body,created_at,author:profiles!zune_reel_comments_user_id_fkey(full_name)').eq('reel_id',id).order('created_at',{ascending:false}).limit(150);if(r.error){toast(r.error.message);return}
 const host=$('#reelCommentsBody');host.innerHTML=(r.data||[]).length?r.data.map(c=>'<div class="reels-comment-row"><div><strong>'+esc(c.author?.full_name||'Mtumiaji')+'</strong><p>'+esc(c.body)+'</p><small>'+new Date(c.created_at).toLocaleString('sw-TZ')+'</small></div><button class="danger-btn" data-delete-comment="'+esc(c.id)+'">Ondoa</button></div>').join(''):'<p class="muted">Hakuna comments kwenye Reel hii.</p>';
 host.querySelectorAll('[data-delete-comment]').forEach(b=>b.onclick=async()=>{if(!confirm('Ondoa comment hii?'))return;const d=await db().from('zune_reel_comments').delete().eq('id',b.dataset.deleteComment);if(d.error){toast(d.error.message);return}b.closest('.reels-comment-row').remove();toast('Comment imeondolewa.')});$('#reelCommentsModal').classList.add('show');
}

async function loadSounds(){
 const host=$('#adminSoundsList');if(!host)return;
 const r=await db().from('zune_reel_sounds').select('id,title,artist,audio_path,license_name,license_reference,commercial_use_allowed,is_active,created_at').order('created_at',{ascending:false}).limit(200);
 if(r.error)throw r.error;
 const list=r.data||[];sounds=list;
 const soundSelect=$('#adminReelSound');if(soundSelect)soundSelect.innerHTML='<option value="">Tumia Original Audio</option>'+list.filter(x=>x.is_active&&x.commercial_use_allowed).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.title)+(x.artist?' — '+esc(x.artist):'')+'</option>').join('');
 host.innerHTML=list.length?list.map(x=>'<article class="reels-admin-row"><div class="reels-admin-meta"><strong>'+esc(x.title)+(x.artist?' · '+esc(x.artist):'')+'</strong><p>'+esc(x.license_name)+' · '+(x.commercial_use_allowed?'Commercial use approved':'Not approved')+'</p><p>'+ (x.is_active?'Active in Music Library':'Inactive')+'</p></div><div class="reels-admin-actions"><button class="'+(x.is_active?'warning-btn':'primary-btn')+'" data-sound-toggle="'+esc(x.id)+'" data-active="'+(x.is_active?'1':'0')+'">'+(x.is_active?'Zima':'Washa')+'</button></div></article>').join(''):'<div class="empty-state">Bado hakuna Music Track iliyoidhinishwa.</div>';
 host.querySelectorAll('[data-sound-toggle]').forEach(b=>b.onclick=async()=>{const next=b.dataset.active!=='1';const u=await db().from('zune_reel_sounds').update({is_active:next}).eq('id',b.dataset.soundToggle);if(u.error){toast(u.error.message);return}toast(next?'Music Track imewashwa.':'Music Track imezimwa.');await loadSounds()});
}
async function loadReports(){
 const host=$('#reelsReportsList');if(!host)return;
 const r=await db().from('zune_reel_reports').select('id,reel_id,reporter_id,reason,details,status,created_at,admin_note').order('created_at',{ascending:false}).limit(200);
 if(r.error)throw r.error;
 reports=r.data||[];
 host.innerHTML=reports.length?reports.map(x=>'<article class="reels-admin-row"><div class="reels-admin-meta"><strong>Ripoti · '+esc(x.status)+'</strong><p>Reel ID: '+esc(x.reel_id)+'</p><p>Sababu: '+esc(x.reason)+'</p>'+(x.details?'<p>Maelezo: '+esc(x.details)+'</p>':'')+'<p>'+new Date(x.created_at).toLocaleString('sw-TZ')+'</p>'+(x.admin_note?'<p>Admin note: '+esc(x.admin_note)+'</p>':'')+'</div><div class="reels-admin-actions"><button class="secondary-btn" data-report-action="reviewing" data-id="'+esc(x.id)+'">Inakaguliwa</button><button class="primary-btn" data-report-action="resolved" data-id="'+esc(x.id)+'">Tatua</button><button class="warning-btn" data-report-action="dismissed" data-id="'+esc(x.id)+'">Funga ripoti</button></div></article>').join(''):'<div class="empty-state">Hakuna ripoti za Reels kwa sasa.</div>';
 host.querySelectorAll('[data-report-action]').forEach(b=>b.onclick=async()=>{
  const note=prompt('Andika maelezo ya hatua ya Admin (hiari):');if(note===null)return;
  b.disabled=true;
  const update=await db().from('zune_reel_reports').update({status:b.dataset.reportAction,admin_note:note.trim()||null,reviewed_by:user().id,reviewed_at:new Date().toISOString()}).eq('id',b.dataset.id);
  if(update.error){toast('Imeshindikana: '+update.error.message);b.disabled=false;return}
  await window.ZUNE_CORE?.audit?.('reel_report_'+b.dataset.reportAction,'zune_reel_reports',b.dataset.id,note.trim(),{status:b.dataset.reportAction});
  toast('Ripoti imesasishwa.');await loadReports();
 });
}
function showReportError(error){
 const host=$('#reelsReportsList');if(host)host.innerHTML='<div class="notice-box">Ripoti hazijapatikana: '+esc(error.message||error)+'</div>';
}
async function uploadAdminReelTus(file,path){
 const tus=window.tus?.Upload;if(!tus)throw new Error('TUS browser library haijapakia. Refresh ukurasa.');
 const {data:{session},error}=await db().auth.getSession();if(error)throw error;
 if(!session?.access_token)throw new Error('Session ya Admin imeisha. Ingia tena.');
 const endpoint='https://rpkogiieegqgxqbzwxwo.storage.supabase.co/storage/v1/upload/resumable';
 return await new Promise((resolve,reject)=>{
  const upload=new tus(file,{endpoint,headers:{authorization:'Bearer '+session.access_token,apikey:window.ZUNE_CONFIG?.SUPABASE_PUBLISHABLE_KEY||''},metadata:{bucketName:BUCKET,objectName:path,contentType:file.type||'application/octet-stream',cacheControl:'3600'},chunkSize:6*1024*1024,retryDelays:[0,3000,5000,10000,20000],removeFingerprintOnSuccess:true,
   onProgress:(sent,total)=>{const pct=total?Math.round(sent/total*100):0;const msg=$('#adminReelMessage');if(msg)msg.textContent='Inapakia video kwa vipande: '+pct+'%';},
   onError:reject,onSuccess:()=>resolve({path})});
  upload.start();
 });
}
async function uploadSound(e){
 e.preventDefault();const file=$('#soundFile').files?.[0],title=$('#soundTitle').value.trim(),license=$('#soundLicense').value.trim(),button=$('#soundUploadBtn'),message=$('#soundMessage');
 if(!file||!title||!license||!$('#soundCommercial').checked)return;
 const allowed=['audio/mpeg','audio/mp4','audio/aac','audio/wav','audio/ogg','audio/webm'];
 if(!allowed.includes(file.type)){toast('Aina ya audio haikubaliki.');return}
 if(file.size>15*1024*1024){toast('Faili imezidi 15 MB.');return}
 if(!user().id){toast('Admin hajathibitishwa.');return}
 button.disabled=true;button.textContent='Inapakia music...';let path='';
 try{
  const id=crypto.randomUUID(),ext=(file.name.split('.').pop()||'mp3').toLowerCase().replace(/[^a-z0-9]/g,'');path=user().id+'/'+id+'.'+ext;
  const up=await db().storage.from('zune-reel-audio').upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});if(up.error)throw up.error;
  const ins=await db().from('zune_reel_sounds').insert({title,artist:$('#soundArtist').value.trim()||null,audio_path:up.data.path,license_name:license,license_reference:$('#soundLicenseRef').value.trim()||null,commercial_use_allowed:true,is_active:$('#soundActive').checked,created_by:user().id});
  if(ins.error)throw ins.error;
  e.currentTarget.reset();message.textContent='Music Track imehifadhiwa pamoja na taarifa za leseni.';toast('Music Track imeongezwa.');await loadSounds();
 }catch(err){if(path)await db().storage.from('zune-reel-audio').remove([path]).catch(()=>{});message.textContent=err.message||'Music upload imeshindikana.';toast(message.textContent)}
 finally{button.disabled=false;button.textContent='Ongeza Music Track'}
}

async function uploadOfficial(e){
 e.preventDefault();const file=$('#adminReelVideo').files?.[0],caption=$('#adminReelCaption').value.trim(),button=$('#adminReelPublish'),message=$('#adminReelMessage');
 if(!file||!caption||!$('#adminReelRights').checked)return;if(!['video/mp4','video/webm','video/quicktime'].includes(file.type)){toast('Chagua MP4, WebM au MOV.');return}if(file.size>100*1024*1024){toast('Video imezidi 100 MB.');return}
 if(!user().id){toast('Admin hajathibitishwa.');return}button.disabled=true;button.textContent='Inapakia video...';let path='';
 try{
 let id;
 if(adminCompletedUpload&&adminCompletedUpload.file===file){path=adminCompletedUpload.path;id=adminCompletedUpload.id;message.textContent='Video tayari imepakiwa. Inahifadhi Reel...';}
 else{
  id=crypto.randomUUID();const ext=(file.name.split('.').pop()||'mp4').toLowerCase().replace(/[^a-z0-9]/g,'');path=user().id+'/'+id+'.'+ext;
  const up=await uploadAdminReelTus(file,path);path=up.path;adminCompletedUpload={file,path,id};
 }
 const hashtags=$('#adminReelTags').value.split(/[\s,]+/).map(x=>x.trim().replace(/^#/,'')).filter(Boolean).slice(0,20);
 const taggedProductIds=selectedAdminProductIds();
 const payload={id,creator_id:user().id,video_path:path,caption,hashtags,product_id:taggedProductIds[0]||null,status:'published',creator_display_name:'ZUNE Official'};
 const soundId=$('#adminReelSound')?.value||'';const sound=sounds.find(x=>x.id===soundId);
 if(sound){payload.sound_id=sound.id;payload.audio_source='library';payload.audio_title=sound.title;payload.audio_artist=sound.artist||null;}
 const ins=await db().from('zune_reels').insert(payload);if(ins.error)throw ins.error;
 let tagWarning='';
 if(taggedProductIds.length){const tags=await db().from('zune_reel_products').insert(taggedProductIds.map(product_id=>({reel_id:id,product_id})));if(tags.error){console.error('Admin Reel product tags:',tags.error);tagWarning=' Reel imechapishwa lakini product tags hazikuhifadhiwa.';}}
 adminCompletedUpload=null;
 await window.ZUNE_CORE?.audit?.('reel_published','zune_reels',id,'Official ZUNE Reel published',{status:'published'});e.currentTarget.reset();message.textContent='Reel rasmi ya ZUNE imechapishwa.'+tagWarning;toast(tagWarning||'ZUNE Official Reel imechapishwa.');await load();
 }catch(err){message.textContent=(adminCompletedUpload&&adminCompletedUpload.path===path?'Video imepakiwa lakini taarifa hazijahifadhiwa. Bonyeza tena bila kubadilisha faili. ':'')+(err.message||'Imeshindikana kuchapisha Reel.');toast(message.textContent)}finally{button.disabled=false;button.textContent='Chapisha Reel rasmi'}
}
function showError(e){console.error('ZUNE Admin Reels:',e);const h=$('#reelsAdminList');if(h)h.innerHTML='<div class="notice-box">Reels hazikupatikana: '+esc(e.message||e)+'</div>'}
document.addEventListener('zune:page-changed',e=>{if(e.detail?.page==='reels'){if(!mounted)mount();load().catch(showError)}});
document.addEventListener('DOMContentLoaded',()=>{if(location.pathname.endsWith('/reels.html')&&document.querySelector('[data-section="reels"]')){mount();load().catch(showError)}});

})();