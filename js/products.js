(() => {
'use strict';
const c=()=>window.ZUNE_CORE,ui=()=>window.ZUNE_LAYOUT;
const esc=v=>ui().esc(v??'');
async function load(){
 try{
  const rows=await c().rows('products',300), grid=document.getElementById('productsCardsGrid');
  if(grid)grid.innerHTML=rows.length?rows.map(x=>{
   const images=Array.isArray(x.image_urls)?x.image_urls:[], src=images[0]||x.image_url||'';
   const img=src?'<img src="'+esc(src)+'" alt="'+esc(x.title||'Bidhaa')+'" loading="lazy" style="width:100%;height:170px;object-fit:cover;display:block">':'<div style="height:170px;display:grid;place-items:center;background:var(--surface,#f4f5f6);color:var(--muted,#777)">Hakuna picha</div>';
   const gallery=images.length>1?'<div style="display:flex;gap:6px;overflow:auto;padding:8px 0">'+images.slice(1,5).map(u=>'<img src="'+esc(u)+'" alt="Picha ya bidhaa" loading="lazy" style="width:48px;height:42px;object-fit:cover;border-radius:6px">').join('')+'</div>':'';
   return '<article class="zune-admin-product-card" style="border:1px solid var(--border,#ddd);border-radius:14px;overflow:hidden;background:var(--card,#fff);min-width:0">'+img+'<div style="padding:12px"><strong style="display:block;margin-bottom:6px">'+esc(x.title||'Bidhaa')+'</strong><div style="font-weight:700">'+ui().money(x.price)+'</div><small style="display:block;color:var(--muted,#777);margin-top:5px">Seller: '+esc(x.vendor_id||'—')+'</small><small style="display:block;color:var(--muted,#777)">Stock: '+esc(x.stock_quantity??'—')+' · '+esc(x.moderation_status||'—')+'</small>'+gallery+'</div></article>';
  }).join(''):'<p class="empty-state">Hakuna bidhaa.</p>';
  c().setText('totalProducts',rows.length.toLocaleString());
  const search=document.getElementById('productsSearch');if(search&&!search.dataset.cardFilterBound){search.dataset.cardFilterBound='1';search.addEventListener('input',()=>{const q=search.value.toLowerCase().trim();grid?.querySelectorAll('.zune-admin-product-card').forEach(card=>card.hidden=!card.textContent.toLowerCase().includes(q));});}
 }catch(e){const grid=document.getElementById('productsCardsGrid');if(grid)grid.textContent=e.message||'Imeshindikana kupakia bidhaa.';}
}
document.addEventListener('DOMContentLoaded',load);
document.addEventListener('zune:page-changed',e=>{if(e.detail.page==='products')load();});
document.addEventListener('zune:admin-refresh',load);
window.ZUNE_PRODUCTS={load};
})();