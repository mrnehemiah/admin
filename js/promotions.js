(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const db = () => window.zuneSupabase;
  const esc = v => String(v ?? '—').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtDate = v => v ? new Date(v).toLocaleString('sw-TZ') : '—';
  let loaded = false;
  async function loadCoupons() {
    const body = $('couponsTableBody');
    if (!body) return;
    const {data,error} = await db().from('coupons').select('*').order('created_at',{ascending:false}).limit(200);
    if (error) { body.innerHTML = '<tr><td colspan="6" class="empty-state">Imeshindikana: '+esc(error.message)+'</td></tr>'; return; }
    body.innerHTML = (data||[]).map(c => '<tr><td>'+esc(c.code)+'</td><td>'+esc(c.discount_type==='percentage'?c.discount_value+'%':'TSh '+c.discount_value)+'</td><td>'+esc(fmtDate(c.starts_at))+' — '+esc(fmtDate(c.expires_at))+'</td><td>'+esc(c.usage_count)+' / '+esc(c.usage_limit ?? '∞')+'</td><td>'+esc(c.status)+'</td><td>—</td></tr>').join('') || '<tr><td colspan="6" class="empty-state">Hakuna coupon.</td></tr>';
  }
  async function loadSellerPromotions() {
    const body = $('sellerPromotionsBody');
    if (!body || !db()) return;
    body.innerHTML = '<tr><td colspan="6" class="empty-state">Inapakia maombi...</td></tr>';
    const {data,error} = await db().from('seller_promotions').select('*, stores(store_name)').order('created_at',{ascending:false}).limit(300);
    if (error) { body.innerHTML = '<tr><td colspan="6" class="empty-state">Imeshindikana kupakia: '+esc(error.message)+'</td></tr>'; return; }
    body.innerHTML = (data||[]).map(p => {
      const discount = p.discount_type==='percentage' ? p.discount_value+'%' : 'TSh '+Number(p.discount_value).toLocaleString();
      const canReview = ['pending_approval','changes_requested','approved'].includes(p.status);
      const actions = canReview ? '<button class="secondary-btn" data-promo-review="approved" data-id="'+esc(p.id)+'">Idhinisha</button> <button class="warning-btn" data-promo-review="changes_requested" data-id="'+esc(p.id)+'">Omba marekebisho</button> <button class="danger-btn" data-promo-review="rejected" data-id="'+esc(p.id)+'">Kataa</button>' : '—';
      return '<tr><td>'+esc(p.stores?.store_name || p.store_id)+'</td><td><strong>'+esc(p.title)+'</strong><br><small>'+esc(p.description||'')+'</small></td><td>'+esc(discount)+'</td><td>'+esc(fmtDate(p.starts_at))+' — '+esc(fmtDate(p.expires_at))+'</td><td>'+esc(p.status)+(p.admin_note?'<br><small>'+esc(p.admin_note)+'</small>':'')+'</td><td><div class="action-row">'+actions+'</div></td></tr>';
    }).join('') || '<tr><td colspan="6" class="empty-state">Hakuna maombi ya promotions kwa sasa.</td></tr>';
  }
  async function refresh() {
    if (window.ZUNE_AUTH_READY) await window.ZUNE_AUTH_READY;
    if (!db()) return;
    await Promise.all([loadCoupons(),loadSellerPromotions()]);
    loaded = true;
  }
  async function review(id, decision) {
    const promptText = decision==='approved' ? 'Sababu/maelezo ya kuidhinisha:' : decision==='rejected' ? 'Sababu ya kukataa:' : 'Maelekezo ya marekebisho:';
    const note = window.prompt(promptText);
    if (note === null) return;
    if (note.trim().length < 5) { window.alert('Andika maelezo yenye angalau herufi 5.'); return; }
    const {data,error} = await db().rpc('admin_review_seller_promotion',{p_promotion_id:id,p_decision:decision,p_note:note.trim()});
    if (error) { window.alert('Imeshindikana: '+error.message); return; }
    window.alert('Uamuzi umehifadhiwa: '+(data?.status||decision));
    await loadSellerPromotions();
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-promo-review]');
    if (b) review(b.dataset.id,b.dataset.promoReview);
    if (e.target.closest('#refreshSellerPromotions')) refresh();
  });
  document.addEventListener('zune:page-changed', e => { if (e.detail?.page === 'coupons') refresh(); });
  document.addEventListener('DOMContentLoaded', () => { if (location.hash === '#coupons') refresh(); });
  window.ZUNE_PROMOTIONS = {refresh};
})();