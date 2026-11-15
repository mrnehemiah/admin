(() => {
 'use strict';
 const db=()=>window.zuneSupabase, c=()=>window.ZUNE_CORE, ui=()=>window.ZUNE_LAYOUT, $=id=>document.getElementById(id);
 let rows=[],products=new Map(),buyers=new Map(),busy=false;
 const esc=v=>ui().esc(v??'');
 const date=v=>v?ui().date(v):'—';
 const status=s=>String(s||'pending').toLowerCase();
 function render(){
  const body=$('productReviewsBody');if(!body)return;
  const filter=$('reviewsStatus')?.value||'',q=($('reviewsSearch')?.value||'').trim().toLowerCase();
  const visible=rows.filter(r=>(!filter||status(r.moderation_status)===filter)&&(!q||[products.get(r.product_id)?.title,buyers.get(r.buyer_id)?.full_name,r.review_text,r.product_id].some(x=>String(x||'').toLowerCase().includes(q))));
  body.innerHTML=visible.length?visible.map(r=>{
   const p=products.get(r.product_id)||{},b=buyers.get(r.buyer_id)||{},st=status(r.moderation_status);
   return '<tr><td><strong>'+esc(p.title||'Bidhaa haijapatikana')+'</strong><small>'+esc(p.vendor_id||'')+'</small></td><td>'+esc(b.full_name||b.email||'Mteja')+'</td><td><b style="color:#e6b65d">'+('★'.repeat(Number(r.rating)||0))+'</b> '+Number(r.rating)+'/5</td><td style="white-space:normal;min-width:180px;max-width:320px">'+esc(r.review_text||'—')+'</td><td>'+esc(date(r.created_at))+'</td><td><span class="badge-pill '+(st==='approved'?'success':st==='rejected'?'danger':'warning')+'">'+esc(st)+'</span>'+(r.admin_note?'<small>'+esc(r.admin_note)+'</small>':'')+'</td><td>'+(st==='pending'?'<div class="action-row"><button class="primary-btn" type="button" data-review-action="approved" data-id="'+esc(r.id)+'">Approve</button><button class="warning-btn" type="button" data-review-action="rejected" data-id="'+esc(r.id)+'">Reject</button></div>':'—')+'</td></tr>';
  }).join(''):'<tr><td colspan="7" class="empty-state">Hakuna tathmini zinazolingana.</td></tr>';
  c().setText('reviewsTotal',String(rows.length));c().setText('reviewsPending',String(rows.filter(x=>status(x.moderation_status)==='pending').length));c().setText('reviewsApproved',String(rows.filter(x=>status(x.moderation_status)==='approved').length));c().setText('reviewsRejected',String(rows.filter(x=>status(x.moderation_status)==='rejected').length));
 }
 async function load(){
  if(busy)return;busy=true;
  try{
   if(window.ZUNE_AUTH_READY)await window.ZUNE_AUTH_READY;
   const {data,error}=await db().from('product_reviews').select('id,product_id,buyer_id,order_id,rating,review_text,moderation_status,is_visible,admin_note,created_at').order('created_at',{ascending:false}).limit(500);
   if(error)throw error;rows=data||[];
   const productIds=[...new Set(rows.map(x=>x.product_id).filter(Boolean))],buyerIds=[...new Set(rows.map(x=>x.buyer_id).filter(Boolean))];
   products.clear();buyers.clear();
   const [pr,br]=await Promise.all([
    productIds.length?db().from('products').select('id,title,vendor_id').in('id',productIds):Promise.resolve({data:[],error:null}),
    buyerIds.length?db().from('profiles').select('id,full_name,email').in('id',buyerIds):Promise.resolve({data:[],error:null})
   ]);
   if(pr.error)throw pr.error;if(br.error)throw br.error;
   (pr.data||[]).forEach(x=>products.set(x.id,x));(br.data||[]).forEach(x=>buyers.set(x.id,x));render();
  }catch(e){console.error('Product reviews load:',e);const b=$('productReviewsBody');if(b)b.innerHTML='<tr><td colspan="7" class="empty-state">Imeshindikana kupakia: '+esc(e.message||e)+'</td></tr>';}
  finally{busy=false;}
 }
 async function moderate(id,decision){
  const review=rows.find(x=>x.id===id);if(!review||busy)return;
  let note='';
  if(decision==='rejected'){note=window.prompt('Sababu ya kukataa tathmini (inahitajika):')||'';if(note.trim().length<5){ui().toast('Sababu lazima iwe na angalau herufi 5.','warning');return;}}
  else {note=window.prompt('Maelezo ya Admin (hiari):')||'';}
  if(!window.confirm(decision==='approved'?'Unathibitisha kuchapisha tathmini hii?':'Unathibitisha kukataa tathmini hii?'))return;
  busy=true;
  try{
   const {data,error}=await db().from('product_reviews').update({moderation_status:decision,is_visible:decision==='approved',admin_note:note.trim()||null,moderated_by:window.ZUNE_CURRENT_USER?.id||null,moderated_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id).eq('moderation_status','pending').select('id').maybeSingle();
   if(error)throw error;if(!data)throw new Error('Tathmini hii tayari imefanyiwa ukaguzi au haipo.');
   const titleSw=decision==='approved'?'Tathmini yako imeidhinishwa':'Tathmini yako haikuidhinishwa';
   const titleEn=decision==='approved'?'Your product review was approved':'Your product review was not approved';
   const bodySw=decision==='approved'?'Tathmini yako sasa inaonekana kwenye ukurasa wa bidhaa.':('Tathmini yako haijachapishwa. Sababu: '+(note||'Tafadhali wasiliana na Support.'));
   const bodyEn=decision==='approved'?'Your review is now visible on the product page.':('Your review was not published. Reason: '+(note||'Please contact Support.'));
   const notification=await db().from('notifications').insert({user_id:review.buyer_id,type:'product_review_'+decision,title_sw:titleSw,title_en:titleEn,body_sw:bodySw,body_en:bodyEn,action_url:'./orders.html',is_read:false});
   if(notification.error)console.warn('Review notification failed:',notification.error.message);
   const sellerId=products.get(review.product_id)?.vendor_id;
   if(sellerId){const sellerNote=await db().from('notifications').insert({user_id:sellerId,type:'store_product_review_'+decision,title_sw:decision==='approved'?'Mteja ameacha tathmini ya bidhaa':'Tathmini ya bidhaa imekataliwa',title_en:decision==='approved'?'A customer review was published':'A product review was rejected',body_sw:'Bidhaa: '+(products.get(review.product_id)?.title||'Bidhaa')+' · Nyota: '+review.rating+'/5',body_en:'Product: '+(products.get(review.product_id)?.title||'Product')+' · Rating: '+review.rating+'/5',action_url:'./seller-dashboard.html',is_read:false});if(sellerNote.error)console.warn('Seller review notification failed:',sellerNote.error.message);}
   await c().audit('product_review_'+decision,'product_review',id,note,{product_id:review.product_id,buyer_id:review.buyer_id,order_id:review.order_id,rating:review.rating});
   ui().toast(decision==='approved'?'Tathmini imeidhinishwa.':'Tathmini imekataliwa.','success');
   await load();
  }catch(e){console.error(e);ui().toast(e.message||'Imeshindikana kukagua tathmini.','error');}
  finally{busy=false;}
 }
 document.addEventListener('DOMContentLoaded',()=>{
  $('refreshReviewsBtn')?.addEventListener('click',load);
  $('reviewsSearch')?.addEventListener('input',render);
  $('reviewsStatus')?.addEventListener('change',render);
  $('productReviewsBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-review-action]');if(b)moderate(b.dataset.id,b.dataset.reviewAction);});
  if(window.ZUNE_ROUTER?.current==='reviews')load();
 });
 document.addEventListener('zune:page-changed',e=>{if(e.detail?.page==='reviews')load();});
 document.addEventListener('zune:admin-refresh',()=>{if(window.ZUNE_ROUTER?.current==='reviews')load();});
 window.ZUNE_PRODUCT_REVIEWS={load};
})();