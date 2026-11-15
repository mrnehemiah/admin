/* ZUNE Ads Management — live Supabase integration */
(() => {
  'use strict';
  const db = () => window.zuneSupabase;
  const $ = (s, root=document) => root.querySelector(s);
  const esc = value => String(value ?? '—').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = value => 'TZS ' + Number(value || 0).toLocaleString('en-US');
  const date = value => value ? new Date(value).toLocaleString() : '—';
  const status = value => esc(String(value || '—').replaceAll('_',' '));
  let loading = false;
  async function query(table, select='*') {
    const {data,error}=await db().from(table).select(select);
    if(error) throw error;
    return data || [];
  }
  function body(id, rows, cols, empty) {
    const el=document.getElementById(id); if(!el)return;
    el.innerHTML=rows.length ? rows.map(row=>'<tr>'+cols.map(col=>'<td>'+col(row)+'</td>').join('')+'</tr>').join('')
      : '<tr><td colspan="'+cols.length+'" class="empty-state">'+esc(empty)+'</td></tr>';
  }
  function metric(label, value) {
    const node=document.querySelector('[data-ads-metric="'+label+'"]');
    if(node) node.textContent=value;
  }
  async function load() {
    if(loading || !db()) return;
    loading=true;
    try {
      if(window.ZUNE_AUTH_READY) await window.ZUNE_AUTH_READY; else if(window.ZUNE_SECURITY?.requireAdmin) await window.ZUNE_SECURITY.requireAdmin();
      const [campaigns,packages,wallets,transactions,events,reports,profiles,stores]=await Promise.all([
        query('ad_campaigns'),query('ad_packages'),query('ads_wallets'),query('ads_wallet_transactions'),
        query('ad_events'),query('ad_reports'),query('profiles','id,full_name'),query('stores','id,store_name,owner_id')
      ]);
      const signedTransactions=await Promise.all(transactions.map(async tx=>{if(!tx.receipt_path)return tx;const {data}=await db().storage.from('ads-payment-receipts').createSignedUrl(tx.receipt_path,300);return {...tx,receipt_url:data?.signedUrl||null};}));
      const names=new Map(profiles.map(p=>[p.id,p.full_name||'—']));
      const storeNames=new Map(stores.map(s=>[s.id,s.store_name||'—']));
      const pending=campaigns.filter(x=>x.status==='pending_review').length;
      const active=campaigns.filter(x=>x.status==='approved' && (!x.ends_at || new Date(x.ends_at)>new Date())).length;
      metric('campaigns',String(campaigns.length)); metric('pending',String(pending)); metric('active',String(active));
      metric('revenue',money(transactions.filter(x=>x.transaction_type==='campaign_charge' && x.status==='completed').reduce((n,x)=>n+Number(x.amount_tzs||0),0)));
      const campaignRows=campaigns.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
      body('adsCampaignRows',campaignRows,[
        x=>'<strong>'+esc(x.title)+'</strong><small>'+esc(x.id.slice(0,8))+'</small>',
        x=>esc(names.get(x.seller_id)),x=>status(x.campaign_type),x=>status(x.placement),
        x=>money(x.budget_tzs),x=>esc(date(x.starts_at)+' – '+date(x.ends_at)),
        x=>'<span class="badge-pill">'+status(x.status)+'</span>',
        x=>x.status==='pending_review' || x.status==='approved'
          ? '<button class="secondary-btn ads-review" data-id="'+esc(x.id)+'" data-decision="approved">Approve</button> <button class="warning-btn ads-review" data-id="'+esc(x.id)+'" data-decision="'+(x.status==='approved'?'paused':'rejected')+'">'+(x.status==='approved'?'Pause':'Reject')+'</button>' : '—'
      ],'Hakuna kampeni zilizowasilishwa.');
      body('adsReviewRows',campaignRows.filter(x=>x.status==='pending_review'),[
        x=>'<strong>'+esc(x.title)+'</strong>',
        x=>esc(names.get(x.seller_id)),
        x=>status(x.placement),
        x=>esc(date(x.created_at)),
        x=>'<button class="secondary-btn ads-review" data-id="'+esc(x.id)+'" data-decision="approved">Approve</button> <button class="warning-btn ads-review" data-id="'+esc(x.id)+'" data-decision="rejected">Reject</button>'
      ],'Hakuna kampeni zinazosubiri review.');
      body('adsPackageRows',packages,[
        x=>'<strong>'+esc(x.name)+'</strong><small>'+esc(x.description||'')+'</small>',
        x=>status(x.campaign_type),x=>esc(x.duration_days)+' siku',
        x=>esc((x.placements||[]).join(', ')||'—'),x=>money(x.price_tzs),
        x=>'<span class="badge-pill">'+(x.is_active?'Active':'Inactive')+'</span>',
        x=>'<button class="secondary-btn ads-package-toggle" data-id="'+esc(x.id)+'" data-active="'+(!x.is_active)+'">'+(x.is_active?'Zima':'Washa')+'</button>'
      ],'Hakuna package zilizowekwa bado.');
      body('adsWalletRows',signedTransactions.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),[
        x=>esc(names.get(x.seller_id)),x=>status(x.transaction_type)+'<small>'+esc(x.external_transaction_id||x.id.slice(0,8))+'</small>'+(x.receipt_url?'<small><a href="'+esc(x.receipt_url)+'" target="_blank" rel="noopener">Fungua risiti</a></small>':(x.receipt_path?'<small>Receipt haijapatikana</small>':'')),
        x=>money(x.amount_tzs),x=>status(x.status),x=>esc(date(x.created_at)),
        x=>x.transaction_type==='deposit_request' && x.status==='pending'
          ? '<button class="secondary-btn ads-deposit" data-id="'+esc(x.id)+'" data-decision="approved">Thibitisha</button> <button class="warning-btn ads-deposit" data-id="'+esc(x.id)+'" data-decision="rejected">Kataa</button>' : '—'
      ],'Hakuna miamala ya Ads Wallet.');
      const available=wallets.reduce((n,x)=>n+Number(x.available_tzs||0),0);
      const pendingBalance=wallets.reduce((n,x)=>n+Number(x.pending_tzs||0),0);
      const reserved=wallets.reduce((n,x)=>n+Number(x.reserved_tzs||0),0);
      metric('available',money(available)); metric('walletPending',money(pendingBalance)); metric('reserved',money(reserved));
      const counts={impression:0,click:0,store_visit:0,attributed_order:0};
      events.forEach(e=>{if(counts[e.event_type]!==undefined)counts[e.event_type]++;});
      const ctr=counts.impression ? (counts.click/counts.impression*100).toFixed(2)+'%' : '0%';
      metric('impressions',String(counts.impression)); metric('clicks',String(counts.click));
      metric('ctr',ctr); metric('conversions',String(counts.attributed_order));
      body('adsReportRows',reports.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),[
        x=>esc(x.id.slice(0,8)),x=>esc(x.campaign_id.slice(0,8)),x=>status(x.reason),
        x=>'<span class="badge-pill">'+status(x.severity)+'</span>',x=>status(x.status),
        x=>'<button class="secondary-btn ads-report-status" data-id="'+esc(x.id)+'" data-status="resolved">Resolve</button> <button class="warning-btn ads-report-status" data-id="'+esc(x.id)+'" data-status="dismissed">Dismiss</button>'
      ],'Hakuna ripoti za matangazo.');
      document.querySelectorAll('[data-ads-connected]').forEach(x=>x.textContent='Backend imeunganishwa');
      const notice=$('#adsBackendNotice'); if(notice) notice.hidden=true;
    } catch(error) {
      console.error('Ads backend load failed:',error);
      const notice=$('#adsBackendNotice'); if(notice){notice.hidden=false;notice.textContent='Imeshindikana kupakia Ads data: '+(error.message||error);}
    } finally { loading=false; }
  }
  function addPackageForm() {
    const host=$('#adsPackagesTab .panel'); if(!host || $('#adsPackageForm')) return;
    const form=document.createElement('form'); form.id='adsPackageForm'; form.className='panel';
    form.innerHTML='<h3>Tengeneza Ad Package</h3><div class="settings-grid"><label>Jina<input class="field-input" name="name" maxlength="100" required></label><label>Aina<select class="field-input" name="campaign_type"><option value="sponsored_store">Sponsored Stores</option><option value="sponsored_product">Sponsored Products</option><option value="combo">Combo</option></select></label><label>Muda (siku)<input class="field-input" name="duration_days" type="number" min="1" required></label><label>Bei (TZS)<input class="field-input" name="price_tzs" type="number" min="0" step="1" required></label><label>Placements (tenganisha kwa koma)<input class="field-input" name="placements" placeholder="home,search,category"></label></div><button class="primary-btn" type="submit">Hifadhi Package</button>';
    host.prepend(form);
    form.addEventListener('submit',async e=>{
      e.preventDefault(); const data=new FormData(form);
      const placements=String(data.get('placements')||'').split(',').map(x=>x.trim()).filter(Boolean);
      const payload={name:String(data.get('name')).trim(),campaign_type:data.get('campaign_type'),duration_days:Number(data.get('duration_days')),price_tzs:Number(data.get('price_tzs')),placements,is_active:true,created_by:window.ZUNE_CURRENT_USER?.id||null};
      const {error}=await db().from('ad_packages').insert(payload);
      if(error){alert('Package haijahifadhiwa: '+error.message);return;}
      form.reset(); await load(); alert('Ad Package imehifadhiwa.');
    });
  }
  document.addEventListener('click',async event=>{
    const review=event.target.closest('.ads-review');
    const deposit=event.target.closest('.ads-deposit');
    const toggle=event.target.closest('.ads-package-toggle');
    const report=event.target.closest('.ads-report-status');
    try {
      if(review){
        const reason=prompt('Andika sababu ya uamuzi (angalau herufi 5):'); if(!reason || reason.trim().length<5)return;
        const {error}=await db().rpc('zune_admin_review_ad_campaign',{p_campaign_id:review.dataset.id,p_decision:review.dataset.decision,p_reason:reason.trim()});
        if(error)throw error; await load();
      } else if(deposit){
        const reason=prompt('Thibitisha kwanza malipo ya nje. Andika kumbukumbu ya ukaguzi:'); if(!reason || reason.trim().length<5)return;
        const {error}=await db().rpc('zune_admin_review_ads_deposit',{p_transaction_id:deposit.dataset.id,p_decision:deposit.dataset.decision,p_reason:reason.trim()});
        if(error)throw error; await load();
      } else if(toggle){
        const {error}=await db().from('ad_packages').update({is_active:toggle.dataset.active==='true',updated_at:new Date().toISOString()}).eq('id',toggle.dataset.id);
        if(error)throw error; await load();
      } else if(report){
        const reason=prompt('Andika maelezo ya Admin (angalau herufi 5):'); if(!reason || reason.trim().length<5)return;
        const {error}=await db().from('ad_reports').update({status:report.dataset.status,admin_note:reason,reviewed_by:window.ZUNE_CURRENT_USER?.id,reviewed_at:new Date().toISOString()}).eq('id',report.dataset.id);
        if(error)throw error; await load();
      }
    } catch(error){alert('Kitendo kimeshindwa: '+(error.message||error));}
  });
  document.addEventListener('DOMContentLoaded',()=>{addPackageForm();load();});
  document.addEventListener('zune:page-changed',event=>{if(event.detail?.page==='ads'){addPackageForm();load();}});
  window.ZUNE_ADS={refresh:load};
})();