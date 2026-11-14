(() => {
'use strict';
const c=()=>window.ZUNE_CORE, ui=()=>window.ZUNE_LAYOUT, A=()=>window.ZUNE_ACTIONS, $=id=>document.getElementById(id);
let products=[], profiles=new Map(), stores=new Map(), busy=false;
const esc=v=>ui().esc(v??'');
const safeImage=v=>{try{const u=new URL(String(v||''),location.href);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};
const imagesOf=p=>[...new Set([...(Array.isArray(p.image_urls)?p.image_urls:[]),p.image_url].map(safeImage).filter(Boolean))];
const statusLabel=s=>({pending:'Pending',approved:'Approved',blocked:'Blocked',review:'In Review',removed:'Removed'})[String(s||'').toLowerCase()]||String(s||'Unknown');
const statusClass=s=>({approved:'success',blocked:'danger',removed:'danger',pending:'warning',review:'warning'})[String(s||'').toLowerCase()]||'warning';
const sellerOf=p=>profiles.get(String(p.vendor_id))||{};
const storeOf=p=>stores.get(String(p.vendor_id))||{};
function productStatus(p){return String(p.moderation_status||'pending').toLowerCase();}
function renderCard(p){
 const imgs=imagesOf(p), store=storeOf(p), seller=sellerOf(p), status=productStatus(p);
 const name=store.store_name||seller.store_name||seller.full_name||seller.email||'Seller';
 const src=imgs[0];
 return '<article class="zune-admin-product-card">'+
  (src?'<img class="zune-admin-product-image" src="'+esc(src)+'" alt="'+esc(p.title||'Bidhaa')+'" loading="lazy">':'<div class="zune-admin-product-image zune-admin-product-no-image">Hakuna picha</div>')+
  '<div class="zune-admin-product-body"><div class="zune-admin-product-top"><span class="badge-pill '+statusClass(status)+'">'+esc(statusLabel(status))+'</span><small>'+esc(ui().date(p.created_at))+'</small></div>'+
  '<h3>'+esc(p.title||'Bidhaa bila jina')+'</h3><strong class="zune-admin-product-price">'+esc(ui().money(p.price))+'</strong>'+
  '<p class="zune-admin-product-description">'+esc(p.description||'Hakuna maelezo ya bidhaa yaliyoingizwa.')+'</p>'+
  '<div class="zune-admin-product-meta"><span>Duka: <b>'+esc(name)+'</b></span><span>Stock: <b>'+esc(p.stock_quantity??'—')+'</b></span><span>Seller: <b>'+esc(seller.full_name||seller.email||'—')+'</b></span></div>'+
  '<button class="secondary-btn zune-admin-product-open" type="button" data-product-view="'+esc(p.id)+'">Tazama Maelezo</button></div></article>';
}
function render(){
 const grid=$('productsCardsGrid');if(!grid)return;
 const status=$('productStatusFilter')?.value||'';
 const q=($('productsSearch')?.value||'').trim().toLowerCase();
 const rows=products.filter(p=>(!status||productStatus(p)===status)&&(!q||[
  p.title,p.description,p.category,p.vendor_id,sellerOf(p).full_name,sellerOf(p).email,storeOf(p).store_name
 ].some(v=>String(v||'').toLowerCase().includes(q))));
 grid.innerHTML=rows.length?rows.map(renderCard).join(''):'<p class="empty-state">Hakuna bidhaa zinazolingana na utafutaji huu.</p>';
 c().setText('totalProducts',products.length.toLocaleString());\n c().setText('productPendingCount',products.filter(p=>productStatus(p)==='pending').length.toLocaleString());\n c().setText('productBlockedCount',products.filter(p=>productStatus(p)==='blocked').length.toLocaleString());\n c().setText('productRemovedCount',products.filter(p=>productStatus(p)==='removed').length.toLocaleString());
}
async function load(){
 try{
  const raw=await c().rows('products',500);
  products=raw;
  const ids=[...new Set(raw.map(p=>p.vendor_id).filter(Boolean))];
  profiles.clear();stores.clear();
  if(ids.length){
   const [pr,sr]=await Promise.all([
    c().db().from('profiles').select('id,full_name,email,phone_number,role').in('id',ids),
    c().db().from('stores').select('id,owner_id,store_name,description,category,phone,region,district,address,verification_status,is_active').in('owner_id',ids)
   ]);
   if(pr.error)throw pr.error;if(sr.error)throw sr.error;
   (pr.data||[]).forEach(x=>profiles.set(String(x.id),x));
   (sr.data||[]).forEach(x=>stores.set(String(x.owner_id),x));
  }
  render();
 }catch(e){const grid=$('productsCardsGrid');if(grid)grid.innerHTML='<p class="empty-state">Imeshindikana kupakia bidhaa: '+esc(e.message||e)+'</p>';console.warn('ZUNE products load error',e);}
}
function openDetails(id){
 const p=products.find(x=>String(x.id)===String(id));if(!p)return;
 const seller=sellerOf(p),store=storeOf(p),imgs=imagesOf(p),status=productStatus(p);
 const overlay=document.createElement('div');overlay.className='modal-backdrop show zune-product-modal';overlay.id='zuneProductModal';
 const gallery=imgs.length?'<div class="zune-product-gallery">'+imgs.map((u,i)=>'<img src="'+esc(u)+'" alt="Picha '+(i+1)+' ya '+esc(p.title||'bidhaa')+'" loading="lazy">').join('')+'</div>':'<div class="notice-box">Hakuna picha za bidhaa.</div>';
 const isRemoved=status==='removed';
 overlay.innerHTML='<div class="modal-card zune-product-detail" role="dialog" aria-modal="true" aria-labelledby="zuneProductTitle">'+
  '<div class="modal-heading"><h3 id="zuneProductTitle">Maelezo ya Bidhaa</h3><button class="icon-btn" type="button" data-product-close aria-label="Funga">×</button></div>'+
  '<div class="zune-product-detail-scroll">'+gallery+
  '<div class="zune-product-detail-heading"><div><h2>'+esc(p.title||'Bidhaa bila jina')+'</h2><span class="badge-pill '+statusClass(status)+'">'+esc(statusLabel(status))+'</span></div><strong>'+esc(ui().money(p.price))+'</strong></div>'+
  '<section><h4>Maelezo ya bidhaa</h4><p>'+esc(p.description||'Hakuna maelezo yaliyoingizwa.')+'</p></section>'+
  '<div class="zune-product-info-grid"><div><small>Category</small><b>'+esc(p.category||'—')+'</b></div><div><small>Stock</small><b>'+esc(p.stock_quantity??'—')+'</b></div><div><small>Punguzo</small><b>'+esc(p.discount_percent==null?'—':p.discount_percent+'%')+'</b></div><div><small>Imewekwa</small><b>'+esc(ui().date(p.created_at))+'</b></div><div><small>Seller</small><b>'+esc(seller.full_name||'—')+'</b></div><div><small>Email</small><b>'+esc(seller.email||'—')+'</b></div><div><small>Simu</small><b>'+esc(seller.phone_number||store.phone||'—')+'</b></div><div><small>Duka</small><b>'+esc(store.store_name||'—')+'</b></div><div><small>Aina ya duka</small><b>'+esc(store.category||'—')+'</b></div><div><small>Uthibitisho wa duka</small><b>'+esc(store.verification_status||'—')+'</b></div><div><small>Mkoa / Wilaya</small><b>'+esc([store.region,store.district].filter(Boolean).join(' / ')||'—')+'</b></div><div><small>Anwani</small><b>'+esc(store.address||'—')+'</b></div></div>'+
  (p.moderation_reason?'<section><h4>Sababu ya hali ya sasa</h4><p>'+esc(p.moderation_reason)+'</p></section>':'')+
  '</div><div class="zune-product-actions">'+
  '<button class="secondary-btn" type="button" data-product-action="message" data-id="'+esc(p.id)+'">Tuma ujumbe</button>'+
  (status!=='approved'&&!isRemoved?'<button class="primary-btn" type="button" data-product-action="approve" data-id="'+esc(p.id)+'">Idhinisha</button>':'')+
  (status!=='blocked'&&!isRemoved?'<button class="warning-btn" type="button" data-product-action="block" data-id="'+esc(p.id)+'">Zuia bidhaa</button>':'')+
  (!isRemoved?'<button class="danger-btn" type="button" data-product-action="remove" data-id="'+esc(p.id)+'">Ondoa sokoni</button>':'')+
  '</div></div>';
 document.body.appendChild(overlay);
 overlay.addEventListener('click',e=>{if(e.target===overlay||e.target.closest('[data-product-close]'))overlay.remove();});
 overlay.querySelectorAll('[data-product-action]').forEach(b=>b.addEventListener('click',()=>openAction(p,b.dataset.productAction)));
}
function openAction(p,action){
 const labels={approve:'Idhinisha bidhaa',block:'Zuia bidhaa',remove:'Ondoa bidhaa sokoni',message:'Tuma ujumbe kwa Seller'};
 const needsReason=['block','remove'].includes(action);
 const overlay=document.createElement('div');overlay.className='modal-backdrop show zune-product-modal';overlay.id='zuneProductActionModal';
 overlay.innerHTML='<form class="modal-card zune-product-action-form"><div class="modal-heading"><h3>'+labels[action]+'</h3><button class="icon-btn" type="button" data-product-close>×</button></div><p>Bidhaa: <b>'+esc(p.title||'Bidhaa')+'</b><br>Seller: '+esc(sellerOf(p).full_name||sellerOf(p).email||'Seller')+'</p>'+
 (needsReason?'<label class="field-label">Sababu ya '+(action==='block'?'kuzuia':'kuondoa')+' (inahitajika)</label><textarea name="reason" minlength="5" maxlength="1000" required placeholder="Eleza tatizo la bidhaa na nini kinapaswa kurekebishwa..."></textarea>':'')+
 (action==='message'||action==='approve'||action==='block'||action==='remove'?'<label class="field-label">Ujumbe kwa Seller '+(action==='message'?'(unahitajika)':'(hiari)')+'</label><textarea name="message" '+(action==='message'?'required minlength="5"':'')+' maxlength="2000" placeholder="Eleza hatua ambazo Seller anatakiwa kuchukua..."></textarea>':'')+
 '<div class="modal-actions"><button class="secondary-btn" type="button" data-product-close>Ghairi</button><button class="'+(action==='approve'?'primary-btn':action==='message'?'secondary-btn':'danger-btn')+'" type="submit">Thibitisha</button></div></form>';
 document.body.appendChild(overlay);
 overlay.addEventListener('click',e=>{if(e.target===overlay||e.target.closest('[data-product-close]'))overlay.remove();});
 overlay.querySelector('form').addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;
  const fd=new FormData(e.currentTarget),reason=String(fd.get('reason')||'').trim(),message=String(fd.get('message')||'').trim();
  if(needsReason&&reason.length<5){ui().toast('Sababu lazima iwe na angalau herufi 5.','warning');return;}
  if(action==='message'&&message.length<5){ui().toast('Ujumbe lazima uwe na angalau herufi 5.','warning');return;}
  busy=true;const btn=e.submitter;btn.disabled=true;btn.textContent='Inahifadhi...';
  try{
   await A().rpc('zune_admin_manage_product',{p_product_id:p.id,p_action:action,p_reason:reason||null,p_message:message||null});
   ui().toast(action==='message'?'Ujumbe umetumwa kwa Seller.':'Bidhaa imesasishwa na Seller ametumiwa taarifa.','success');
   overlay.remove();$('zuneProductModal')?.remove();await load();
  }catch(err){ui().toast(err.message||'Kitendo kimeshindwa.','error');}
  finally{busy=false;btn.disabled=false;}
 });
}
document.addEventListener('DOMContentLoaded',()=>{
 $('productsSearch')?.addEventListener('input',render);
 $('productStatusFilter')?.addEventListener('change',render);\n $('refreshProductsBtn')?.addEventListener('click',load);
 $('productsCardsGrid')?.addEventListener('click',e=>{const b=e.target.closest('[data-product-view]');if(b)openDetails(b.dataset.productView);});
 load();
});
document.addEventListener('zune:page-changed',e=>{if(e.detail.page==='products')load();});
document.addEventListener('zune:admin-refresh',load);
window.ZUNE_PRODUCTS={load,get products(){return products;}};
})();