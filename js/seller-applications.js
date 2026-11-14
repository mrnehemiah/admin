(() => {
  'use strict';
  const c=()=>window.ZUNE_CORE, ui=()=>window.ZUNE_LAYOUT, A=()=>window.ZUNE_ACTIONS;
  let rows=[], inflight=null;
  const isOpen=r=>['pending','under_review'].includes(String(r.status||'').toLowerCase());
  const value=v=>ui().esc(v==null||String(v).trim()===''?'—':String(v));
  const field=(label,v)=>`<div class="seller-app-detail-field"><small>${label}</small><strong>${value(v)}</strong></div>`;

  function ensureDetailsModal(){
    let modal=document.getElementById('sellerApplicationDetailsModal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='sellerApplicationDetailsModal';
    modal.className='seller-app-details-backdrop';
    modal.hidden=true;
    modal.innerHTML=`<section class="seller-app-details-dialog" role="dialog" aria-modal="true" aria-labelledby="sellerApplicationDetailsTitle">
      <header class="seller-app-details-header"><div><span class="seller-app-eyebrow">SELLER APPLICATION REVIEW</span><h2 id="sellerApplicationDetailsTitle">Taarifa za mwombaji</h2></div><button type="button" class="seller-app-details-close" aria-label="Funga">×</button></header>
      <div class="seller-app-details-content" id="sellerApplicationDetailsContent"></div>
      <footer class="seller-app-details-footer" id="sellerApplicationDetailsActions"></footer>
    </section>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('.seller-app-details-close'))closeDetails();});
    modal.addEventListener('click',e=>{const b=e.target.closest('[data-detail-decision]');if(!b)return;const app=rows.find(r=>String(r.id)===b.dataset.id);if(!app)return;const decision=b.dataset.detailDecision;closeDetails();decide(app,decision);});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeDetails();});
    return modal;
  }
  function closeDetails(){const modal=document.getElementById('sellerApplicationDetailsModal');if(modal)modal.hidden=true;}
  function showDetails(app){
    const modal=ensureDetailsModal();
    const content=document.getElementById('sellerApplicationDetailsContent');
    const actions=document.getElementById('sellerApplicationDetailsActions');
    const status=String(app.status||'pending').replace(/_/g,' ');
    content.innerHTML=`
      <section class="seller-app-detail-section"><h3>Taarifa za mwombaji</h3><div class="seller-app-detail-grid">
        ${field('Jina kamili',app.owner_name)}${field('Barua pepe',app.email)}${field('Namba ya simu',app.phone)}${field('User ID',app.user_id)}
      </div></section>
      <section class="seller-app-detail-section"><h3>Taarifa za biashara na duka</h3><div class="seller-app-detail-grid">
        ${field('Jina la duka',app.store_name)}${field('Jina la biashara',app.business_name)}${field('Aina ya biashara',app.category)}${field('Namba ya TIN',app.tin_number)}
      </div></section>
      <section class="seller-app-detail-section"><h3>Anuani ya biashara</h3><div class="seller-app-detail-grid">
        ${field('Nchi',app.country)}${field('Jiji',app.city)}${field('Mkoa',app.region)}${field('Wilaya',app.district)}${field('Mtaa / Street',app.street)}${field('Anuani kamili',app.address)}
      </div></section>
      <section class="seller-app-detail-section"><h3>Taarifa za kitambulisho</h3><div class="seller-app-detail-grid">
        ${field('Aina ya kitambulisho',app.id_type)}${field('Namba ya kitambulisho',app.id_number)}
      </div><p class="seller-app-detail-note">Fomu ya sasa ya Seller Application haijahifadhi faili/picha ya kitambulisho; ina aina na namba tu.</p></section>
      <section class="seller-app-detail-section"><h3>Hali ya ombi</h3><div class="seller-app-detail-grid">
        ${field('Hali',status)}${field('Tarehe ya kutuma',app.created_at?ui().date(app.created_at):'—')}${field('Tarehe ya uamuzi',app.reviewed_at?ui().date(app.reviewed_at):'—')}${field('Maelezo ya Admin',app.admin_note)}
      </div></section>`;
    actions.innerHTML=isOpen(app)?`<button type="button" class="danger-btn" data-detail-decision="rejected" data-id="${value(app.id)}">Reject</button><button type="button" class="primary-btn" data-detail-decision="approved" data-id="${value(app.id)}">Approve</button>`:'<span class="muted">Ombi hili limekwisha fanyiwa uamuzi.</span>';
    modal.hidden=false;
  }

  function render(){
    c().setRows('sellerApplicationsBody',rows,[
      {key:'owner_name',html:r=>`<span class="seller-app-row-name">${value(r.owner_name||r.user_id)}</span><small class="seller-app-row-hint">Gusa kuona taarifa zote</small>`},
      {key:'store_name'},
      {key:'created_at',html:r=>ui().date(r.created_at)},
      {key:'id_type',html:r=>`<span>${value(r.id_type)}</span><small class="seller-app-row-hint">${r.id_number?'Namba: '+value(r.id_number):'Hakuna namba'}</small>`},
      {key:'status',html:r=>ui().status(r.status)},
      {key:'id',html:r=>isOpen(r)?`<div class="action-row"><button class="primary-btn" type="button" data-app-act="approved" data-id="${value(r.id)}">Approve</button><button class="danger-btn" type="button" data-app-act="rejected" data-id="${value(r.id)}">Reject</button></div>`:'<span class="muted">Imekamilika</span>'}
    ],'Hakuna maombi ya Seller.');
    const body=document.getElementById('sellerApplicationsBody');
    body?.querySelectorAll('tr').forEach((tr,i)=>{if(!rows[i])return;tr.dataset.appView=rows[i].id;tr.tabIndex=0;tr.setAttribute('role','button');});
    const pendingCount=rows.filter(r=>String(r.status||'').toLowerCase()==='pending').length.toLocaleString();
    c().setText('sellerApplicationsPendingCount',pendingCount);
  }
  function load(){
    if(inflight)return inflight;
    inflight=(async()=>{try{rows=await c().rows(c().cfg.TABLES.sellerApplications,300);render();}catch(e){c().error('sellerApplicationsBody',e);}finally{inflight=null;}})();
    return inflight;
  }
  function decide(app,decision){
    const approve=decision==='approved',verb=approve?'Approve':'Reject';
    A().confirm({title:`${verb} ombi la Seller`,message:`${verb}: ${app.store_name||app.owner_name||app.id}. ${approve?'Mtumiaji atapewa role ya Seller na duka lake litawezeshwa.':'Mwombaji ataonyeshwa kuwa amekataliwa.'} Andika sababu.`,confirmText:verb,
      fn:async reason=>{
        const result=await A().rpc('admin_review_seller_application',{p_application_id:app.id,p_decision:decision,p_reason:reason});
        if(!result||result.ok!==true)throw new Error('Supabase haikuthibitisha uamuzi wa ombi.');
        ui().toast(approve?'Ombi limeidhinishwa na role ya Seller imesasishwa.':'Ombi limekataliwa.','success');
        await load();await window.ZUNE_SELLERS?.load();
      }});
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const body=document.getElementById('sellerApplicationsBody');
    body?.addEventListener('click',e=>{
      const action=e.target.closest('[data-app-act]');
      if(action){const app=rows.find(r=>String(r.id)===action.dataset.id);if(app)decide(app,action.dataset.appAct);return;}
      const tr=e.target.closest('tr[data-app-view]');if(tr){const app=rows.find(r=>String(r.id)===tr.dataset.appView);if(app)showDetails(app);}
    });
    body?.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('tr[data-app-view]')){e.preventDefault();const app=rows.find(r=>String(r.id)===e.target.dataset.appView);if(app)showDetails(app);}});
  });
  document.addEventListener('zune:page-changed',e=>{if(e.detail.page==='seller-applications')load();});
  document.addEventListener('zune:admin-refresh',()=>{if(window.ZUNE_ROUTER?.current==='seller-applications')load();});
  window.ZUNE_SELLER_APPLICATIONS={load,closeDetails};
})();
