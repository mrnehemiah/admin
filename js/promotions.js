(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const db = () => window.zuneSupabase || window.ZUNE_CORE?.db?.();
  const esc = v => String(v ?? '—').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = v => 'TSh ' + Number(v || 0).toLocaleString('en-TZ',{maximumFractionDigits:2});
  const fmtDate = v => v ? new Date(v).toLocaleString('sw-TZ') : '—';
  let busy = false;
  let storeRows = [];
  let productRows = [];

  async function loadCoupons() {
    const body = $('couponsTableBody');
    if (!body || !db()) return;
    const {data,error} = await db().from('coupons').select('*').order('created_at',{ascending:false}).limit(200);
    if (error) { body.innerHTML = '<tr><td colspan="8" class="empty-state">Imeshindikana: '+esc(error.message)+'</td></tr>'; return; }
    body.innerHTML = (data||[]).map(c => {
      const target = (c.eligible_store_ids||[]).length ? (c.eligible_store_ids.length+' duka') : 'Maduka yote';
      const productTarget = (c.eligible_product_ids||[]).length ? ' · '+c.eligible_product_ids.length+' bidhaa' : '';
      const budget = c.funding_source==='zune_commission' ? money(c.budget_amount) : 'Legacy';
      const spent = c.funding_source==='zune_commission' ? money(c.budget_spent)+' / '+money(c.budget_amount) : '—';
      const discount = c.discount_type==='percentage' ? c.discount_value+'%' : money(c.discount_value);
      return '<tr><td><strong>'+esc(c.code)+'</strong><br><small>'+esc(c.funding_source==='zune_commission'?'ZUNE funded':c.funding_source||'legacy')+'</small></td><td>'+esc(discount)+'</td><td>'+esc(target+productTarget)+'</td><td>'+esc(budget)+'</td><td>'+esc(spent)+'</td><td>'+esc(fmtDate(c.starts_at))+' — '+esc(fmtDate(c.expires_at))+'</td><td>'+esc(c.usage_count)+' / '+esc(c.usage_limit ?? '∞')+'</td><td>'+esc(c.status)+'</td></tr>';
    }).join('') || '<tr><td colspan="8" class="empty-state">Hakuna coupon.</td></tr>';
  }

  async function loadWallet() {
    const {data,error} = await db().rpc('zune_admin_marketing_overview');
    if (error) {
      $('marketingWalletBalance').textContent='Haipatikani';
      $('marketingCommissionTotal').textContent='—';
      $('marketingCouponSpent').textContent='—';
      $('marketingActiveCampaigns').textContent='—';
      console.error('Marketing wallet overview:',error);
      return;
    }
    $('marketingWalletBalance').textContent=money(data?.available_balance);
    $('marketingCommissionTotal').textContent=money(data?.lifetime_commission);
    $('marketingCouponSpent').textContent=money(data?.coupon_spent);
    $('marketingActiveCampaigns').textContent=String(data?.active_campaigns ?? 0);
  }

  async function loadTargets() {
    const [stores,products] = await Promise.all([
      db().from('stores').select('id,store_name,owner_id').eq('is_active',true).order('store_name'),
      db().from('products').select('id,title,vendor_id').eq('moderation_status','approved').is('removed_at',null).order('title')
    ]);
    if (stores.error) throw stores.error;
    if (products.error) throw products.error;
    storeRows=stores.data||[];
    productRows=products.data||[];
    const storeMap=new Map(storeRows.map(s=>[s.owner_id,s.store_name]));
    $('zuneCouponStores').innerHTML=storeRows.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.store_name)+'</option>').join('') || '<option disabled>Hakuna duka active</option>';
    $('zuneCouponProducts').innerHTML=productRows.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.title)+' — '+esc(storeMap.get(p.vendor_id)||'Duka')+'</option>').join('') || '<option disabled>Hakuna bidhaa zilizoidhinishwa</option>';
  }

  async function loadSellerPromotions() {
    const body = $('sellerPromotionsBody');
    if (!body || !db()) return;
    body.innerHTML = '<tr><td colspan="6" class="empty-state">Inapakia maombi...</td></tr>';
    const {data,error} = await db().from('seller_promotions').select('*, stores(store_name)').order('created_at',{ascending:false}).limit(300);
    if (error) { body.innerHTML = '<tr><td colspan="6" class="empty-state">Imeshindikana kupakia: '+esc(error.message)+'</td></tr>'; return; }
    body.innerHTML = (data||[]).map(p => {
      const discount = p.discount_type==='percentage' ? p.discount_value+'%' : money(p.discount_value);
      const canReview = ['pending_approval','changes_requested','approved'].includes(p.status);
      const actions = canReview ? '<button class="secondary-btn" data-promo-review="approved" data-id="'+esc(p.id)+'">Idhinisha</button> <button class="warning-btn" data-promo-review="changes_requested" data-id="'+esc(p.id)+'">Omba marekebisho</button> <button class="danger-btn" data-promo-review="rejected" data-id="'+esc(p.id)+'">Kataa</button>' : '—';
      return '<tr><td>'+esc(p.stores?.store_name || p.store_id)+'</td><td><strong>'+esc(p.title)+'</strong><br><small>'+esc(p.description||'')+'</small></td><td>'+esc(discount)+'</td><td>'+esc(fmtDate(p.starts_at))+' — '+esc(fmtDate(p.expires_at))+'</td><td>'+esc(p.status)+(p.admin_note?'<br><small>'+esc(p.admin_note)+'</small>':'')+'</td><td><div class="action-row">'+actions+'</div></td></tr>';
    }).join('') || '<tr><td colspan="6" class="empty-state">Hakuna maombi ya promotions kwa sasa.</td></tr>';
  }

  async function refresh() {
    if (window.ZUNE_AUTH_READY) await window.ZUNE_AUTH_READY;
    if (!db()) return;
    await Promise.all([loadCoupons(),loadSellerPromotions(),loadWallet(),loadTargets()]);
  }

  async function createCoupon(event) {
    event.preventDefault();
    if (busy) return;
    const formMessage=$('zuneCouponFormMessage');
    const button=$('createZuneCouponBtn');
    const starts=$('zuneCouponStarts').value;
    const expires=$('zuneCouponExpires').value;
    const stores=[...$('zuneCouponStores').selectedOptions].map(x=>x.value);
    const products=[...$('zuneCouponProducts').selectedOptions].map(x=>x.value);
    const optionalNumber=id => $(id).value.trim()===''?null:Number($(id).value);
    const params={
      p_code:$('zuneCouponCode').value.trim().toUpperCase(),
      p_description:$('zuneCouponDescription').value.trim()||null,
      p_discount_type:$('zuneCouponType').value,
      p_discount_value:Number($('zuneCouponValue').value),
      p_min_order_amount:Number($('zuneCouponMinimum').value||0),
      p_max_discount_amount:optionalNumber('zuneCouponMaximum'),
      p_usage_limit:optionalNumber('zuneCouponUsageLimit'),
      p_max_per_buyer:optionalNumber('zuneCouponBuyerLimit'),
      p_starts_at:new Date(starts).toISOString(),
      p_expires_at:expires?new Date(expires).toISOString():null,
      p_budget_amount:Number($('zuneCouponBudget').value),
      p_store_ids:stores,
      p_product_ids:products
    };
    if (!starts || !Number.isFinite(Date.parse(starts))) { formMessage.textContent='Weka tarehe ya kuanza iliyo sahihi.'; return; }
    if (expires && (!Number.isFinite(Date.parse(expires)) || Date.parse(expires)<=Date.parse(starts))) { formMessage.textContent='Tarehe ya mwisho lazima iwe baada ya tarehe ya kuanza.'; return; }
    busy=true;button.disabled=true;button.textContent='Inatengeneza...';formMessage.textContent='Inahifadhi coupon na audit record...';
    try {
      const {data,error}=await db().rpc('zune_admin_create_platform_coupon',params);
      if(error) throw error;
      if(!data?.success) throw new Error('Backend haikuthibitisha kutengenezwa kwa coupon.');
      formMessage.textContent='Coupon '+data.code+' imetengenezwa. Itatumika tu pale wallet na bajeti vitakapokuwa na salio la kutosha.';
      $('zuneCouponForm').reset();
      $('zuneCouponMinimum').value='0';
      await Promise.all([loadCoupons(),loadWallet()]);
      window.zuneToast?.('ZUNE coupon '+data.code+' imetengenezwa.','success');
    } catch(error) {
      formMessage.textContent=error.message||'Imeshindikana kutengeneza coupon.';
      window.zuneToast?.(error.message||'Imeshindikana kutengeneza coupon.','error');
    } finally { busy=false;button.disabled=false;button.textContent='Tengeneza ZUNE coupon'; }
  }

  async function review(id,decision) {
    const promptText=decision==='approved'?'Sababu/maelezo ya kuidhinisha:':decision==='rejected'?'Sababu ya kukataa:':'Maelekezo ya marekebisho:';
    const note=window.prompt(promptText);
    if(note===null)return;
    if(note.trim().length<5){window.alert('Andika maelezo yenye angalau herufi 5.');return;}
    const {data,error}=await db().rpc('admin_review_seller_promotion',{p_promotion_id:id,p_decision:decision,p_note:note.trim()});
    if(error){window.alert('Imeshindikana: '+error.message);return;}
    window.alert('Uamuzi umehifadhiwa: '+(data?.status||decision));
    await loadSellerPromotions();
  }

  document.addEventListener('submit',e=>{if(e.target?.id==='zuneCouponForm')createCoupon(e);});
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-promo-review]');
    if(b)review(b.dataset.id,b.dataset.promoReview);
    if(e.target.closest('#refreshSellerPromotions'))refresh().catch(err=>window.zuneToast?.(err.message,'error'));
  });
  document.addEventListener('zune:page-changed',e=>{if(e.detail?.page==='coupons')refresh().catch(err=>console.error(err));});
  document.addEventListener('DOMContentLoaded',()=>{
    const now=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
    if($('zuneCouponStarts'))$('zuneCouponStarts').value=now;
    if(location.hash==='#coupons')refresh().catch(err=>console.error(err));
  });
  window.ZUNE_PROMOTIONS={refresh};
})();