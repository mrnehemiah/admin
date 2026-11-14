(() => {
  'use strict';
  const c=()=>window.ZUNE_CORE, ui=()=>window.ZUNE_LAYOUT, A=()=>window.ZUNE_ACTIONS;
  let rows=[], inflight=null;
  const open=r=>['pending','under_review'].includes(String(r.status||'').toLowerCase());
  function render(){
    c().setRows('sellerApplicationsBody',rows,[
      {key:'owner_name',html:r=>ui().esc(r.owner_name||r.user_id||'—')},{key:'store_name'},
      {key:'created_at',html:r=>ui().date(r.created_at)},{key:'id_type',html:r=>ui().esc(r.id_type||'—')},
      {key:'status',html:r=>ui().status(r.status)},
      {key:'id',html:r=>open(r)?`<div class="action-row"><button class="primary-btn" type="button" data-app-act="approved" data-id="${ui().esc(r.id)}">Approve</button><button class="danger-btn" type="button" data-app-act="rejected" data-id="${ui().esc(r.id)}">Reject</button></div>`:'<span class="muted">Imekamilika</span>'}
    ],'Hakuna maombi ya Seller.');
    const pendingCount=rows.filter(r=>String(r.status||'').toLowerCase()==='pending').length.toLocaleString();
    c().setText('sellerApplicationsPendingCount',pendingCount);
  }
  function load(){
    if(inflight)return inflight;
    inflight=(async()=>{try{rows=await c().rows(c().cfg.TABLES.sellerApplications,300);render();}catch(e){c().error('sellerApplicationsBody',e);}finally{inflight=null;}})();
    return inflight;
  }
  function decide(app,decision){
    const approve=decision==='approved', verb=approve?'Approve':'Reject';
    A().confirm({title:`${verb} ombi la Seller`,message:`${verb}: ${app.store_name||app.owner_name||app.id}. ${approve?'Mtumiaji atapewa role ya Seller.':'Mwombaji ataonyeshwa kuwa amekataliwa.'} Andika sababu.`,confirmText:verb,
      fn:async reason=>{await A().rpc('admin_review_seller_application',{p_application_id:app.id,p_decision:decision,p_reason:reason});ui().toast(approve?'Ombi limeidhinishwa.':'Ombi limekataliwa.','success');await load();window.ZUNE_SELLERS?.load();}});
  }
  document.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('sellerApplicationsBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-app-act]');if(!b)return;const app=rows.find(r=>String(r.id)===b.dataset.id);if(app)decide(app,b.dataset.appAct);});
  });
  document.addEventListener('zune:page-changed',e=>{if(e.detail.page==='seller-applications')load();});
  document.addEventListener('zune:admin-refresh',()=>{if(window.ZUNE_ROUTER?.current==='seller-applications')load();});
  window.ZUNE_SELLER_APPLICATIONS={load};
})();
