(() => {
'use strict';
const c=()=>window.ZUNE_CORE,ui=()=>window.ZUNE_LAYOUT,db=()=>window.zuneSupabase;
let allOrders=[],busy=new Set();
const esc=v=>ui().esc(v??'—');
const statusLabel=s=>({pending:'Inasubiri',confirmed:'Imethibitishwa',completed:'Imekamilika',cancelled:'Imeghairiwa'})[String(s||'').toLowerCase()]||String(s||'—');
const paymentLabel=s=>({pending:'Inasubiri malipo',paid:'Imelipwa',completed:'Imelipwa',failed:'Malipo yameshindwa',refunded:'Imerejeshwa',cancelled:'Imeghairiwa'})[String(s||'').toLowerCase()]||String(s||'Haijathibitishwa');
const shortId=id=>String(id||'').replace(/-/g,'').slice(0,8).toUpperCase();
const orderRef=x=>String(x?.order_number||shortId(x?.id));
const money=v=>'TZS '+Number(v||0).toLocaleString('en-TZ');
function render(){
 const q=(document.getElementById('ordersSearch')?.value||'').trim().toLowerCase();
 const status=(document.getElementById('orderStatusFilter')?.value||'').toLowerCase();
 const rows=allOrders.filter(x=>(!status||String(x.status||'').toLowerCase()===status)&&(!q||[
  orderRef(x),x.id,x.buyer_name,x.buyer_phone,x.buyer_email,x.store_name,x.product_summary,x.recipient_name,x.recipient_phone,x.total_price,x.discount_total,x.status,x.payment_status,x.payment_method,x.delivery_address,x.delivery_region,x.delivery_district
 ].some(v=>String(v??'').toLowerCase().includes(q))));
 c().setRows('ordersTableBody',rows,[
  {html:x=>'<strong>#'+esc(orderRef(x))+'</strong><small>'+esc(x.product_summary||'Bidhaa haijaorodheshwa')+'</small><small>Oda kamili: '+esc(x.id)+'</small>'},
  {html:x=>'<strong>'+esc(x.recipient_name||x.buyer_name||'Mteja hajatajwa')+'</strong><small>'+esc(x.recipient_phone||x.buyer_phone||'Simu haipo')+'</small><small>'+esc(x.buyer_email||'')+'</small>'},
  {html:x=>'<strong>'+esc(x.store_name||'Duka halijatambuliwa')+'</strong><small>'+esc(x.seller_name||'')+'</small>'},
  {html:x=>'<strong>'+money(x.store_order_total??x.total_price??0)+'</strong><small>Bidhaa: '+money(x.total_price||0)+'</small><small>Sehemu ya delivery: '+money(x.order_delivery_share||0)+'</small>'},
  {html:x=>Number(x.discount_total)>0?'<strong>-'+money(x.discount_total)+'</strong>':'—'},
  {html:x=>'<span class="badge-pill">'+esc(statusLabel(x.status))+'</span>'},
  {html:x=>'<strong>'+esc(paymentLabel(x.payment_status))+'</strong><small>'+esc(x.payment_method||'Njia haijaainishwa')+'</small>'+(x.payment_reference?'<small>Ref: '+esc(x.payment_reference)+'</small>':'')},
  {html:x=>'<strong>'+esc(x.delivery_method||'Delivery')+'</strong><small>'+esc(x.delivery_time||'')+'</small><small>'+esc([x.delivery_address,x.delivery_ward,x.delivery_district,x.delivery_region,x.delivery_country].filter(Boolean).join(', ')||'Anwani haipo')+'</small>'},
  {html:x=>ui().date(x.created_at)},
  {html:x=>x.delivery_latitude!=null&&x.delivery_longitude!=null?'<a class="secondary-btn" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat='+encodeURIComponent(x.delivery_latitude)+'&mlon='+encodeURIComponent(x.delivery_longitude)+'#map=17/'+encodeURIComponent(x.delivery_latitude)+'/'+encodeURIComponent(x.delivery_longitude)+'">Ramani ↗</a>':'—'},
  {html:x=>'<div class="action-row"><select class="field-input" data-order-next="'+esc(x.id)+'" '+(['completed','cancelled'].includes(String(x.status||''))?'disabled':'')+'>'+ (x.status==='pending'?['pending','confirmed','cancelled']:x.status==='confirmed'?['confirmed','cancelled']:[x.status]).map(s=>'<option value="'+s+'" '+(x.status===s?'selected':'')+'>'+esc(statusLabel(s))+'</option>').join('') +'</select><button class="secondary-btn" type="button" data-order-save="'+esc(x.id)+'" '+(busy.has(x.id)?'disabled':'')+'>Hifadhi</button></div>'}
 ],'Hakuna oda zinazolingana na vichujio.');
 c().setText('totalOrders',allOrders.length.toLocaleString());
}
async function load(){
 try{
  allOrders=await c().rows('orders',500);
  if(!allOrders.length){render();return;}
  const buyerIds=[...new Set(allOrders.map(x=>x.buyer_id).filter(Boolean))];
  const productIds=[...new Set(allOrders.map(x=>x.product_id).filter(Boolean))];
  const checkoutIds=[...new Set(allOrders.map(x=>x.checkout_id).filter(Boolean))];
  const [profilesRes,productsRes,itemsRes,checkoutRes,deliveriesRes]=await Promise.all([
   buyerIds.length?db().from('profiles').select('id,full_name,phone_number,email').in('id',buyerIds):Promise.resolve({data:[],error:null}),
   productIds.length?db().from('products').select('id,title,vendor_id').in('id',productIds):Promise.resolve({data:[],error:null}),
   db().from('order_items').select('order_id,product_name,quantity,seller_id').in('order_id',allOrders.map(x=>x.id)),
   checkoutIds.length?db().from('order_checkouts').select('id,subtotal,delivery_total,grand_total,discount_total,payment_method,recipient_name,recipient_phone,recipient_email,country,region,district,ward,delivery_address,latitude,longitude').in('id',checkoutIds):Promise.resolve({data:[],error:null}),
   checkoutIds.length?db().from('order_deliveries').select('checkout_id,vendor_id,delivery_fee').in('checkout_id',checkoutIds):Promise.resolve({data:[],error:null})
  ]);
  for(const r of [profilesRes,productsRes,itemsRes,checkoutRes,deliveriesRes])if(r.error)console.warn('Order enrichment:',r.error.message);
  const profiles=new Map((profilesRes.data||[]).map(x=>[x.id,x]));
  const products=new Map((productsRes.data||[]).map(x=>[x.id,x]));
  const checkouts=new Map((checkoutRes.data||[]).map(x=>[x.id,x]));
  const deliveryFees=new Map((deliveriesRes.data||[]).map(x=>[x.checkout_id+'|'+x.vendor_id,Number(x.delivery_fee||0)]));
  const sellerIds=[...new Set([...(productsRes.data||[]).map(x=>x.vendor_id),...(itemsRes.data||[]).map(x=>x.seller_id)].filter(Boolean))];
  const [sellerProfiles,storesRes]=await Promise.all([
   sellerIds.length?db().from('profiles').select('id,full_name').in('id',sellerIds):Promise.resolve({data:[],error:null}),
   sellerIds.length?db().from('stores').select('owner_id,store_name').in('owner_id',sellerIds):Promise.resolve({data:[],error:null})
  ]);
  if(sellerProfiles.error)console.warn('Seller names:',sellerProfiles.error.message);
  if(storesRes.error)console.warn('Store names:',storesRes.error.message);
  const sellerNames=new Map((sellerProfiles.data||[]).map(x=>[x.id,x.full_name]));
  const storeNames=new Map((storesRes.data||[]).map(x=>[x.owner_id,x.store_name]));
  const itemsByOrder=new Map(),sellerSubtotals=new Map();
  (itemsRes.data||[]).forEach(it=>{const list=itemsByOrder.get(it.order_id)||[];list.push(it);itemsByOrder.set(it.order_id,list);const k=it.order_id;});
  allOrders.forEach(o=>{const its=itemsByOrder.get(o.id)||[];const sid=its[0]?.seller_id||products.get(o.product_id)?.vendor_id;if(sid){const key=o.checkout_id+'|'+sid;sellerSubtotals.set(key,(sellerSubtotals.get(key)||0)+Number(o.total_price||0));}});
  allOrders=allOrders.map(o=>{
   const buyer=profiles.get(o.buyer_id)||{},checkout=checkouts.get(o.checkout_id)||{},items=itemsByOrder.get(o.id)||[];
   const product=products.get(o.product_id)||{},sellerId=items[0]?.seller_id||product.vendor_id;
   const sellerKey=o.checkout_id+'|'+sellerId,sellerSubtotal=sellerSubtotals.get(sellerKey)||Number(o.total_price||0),sellerDelivery=deliveryFees.get(sellerKey)||0;
   const orderValue=Number(o.total_price||0),checkoutSubtotal=Number(checkout.subtotal||0),discountShare=checkoutSubtotal>0?Number(checkout.discount_total||0)*(orderValue/checkoutSubtotal):0,deliveryShare=sellerSubtotal>0?sellerDelivery*(orderValue/sellerSubtotal):0;
   const productSummary=items.length?items.map(it=>(it.product_name||'Bidhaa')+' × '+(it.quantity||1)).join(', '):((product.title||'Bidhaa')+(o.quantity?' × '+o.quantity:''));
   return {...o,buyer_name:buyer.full_name,buyer_phone:buyer.phone_number,buyer_email:buyer.email,
    recipient_name:o.recipient_name||checkout.recipient_name,recipient_phone:o.recipient_phone||checkout.recipient_phone,
    buyer_email:buyer.email||checkout.recipient_email,store_name:storeNames.get(sellerId),seller_name:sellerNames.get(sellerId),
    product_summary:productSummary,checkout_total:checkout.grand_total??o.total_price,
    order_delivery_share:deliveryShare,store_order_total:Math.max(0,orderValue+deliveryShare-discountShare),
    discount_total:discountShare,payment_method:o.payment_method||checkout.payment_method,
    delivery_address:o.delivery_address||checkout.delivery_address,delivery_ward:o.delivery_ward||checkout.ward,
    delivery_district:o.delivery_district||checkout.district,delivery_region:o.delivery_region||checkout.region,
    delivery_country:o.delivery_country||checkout.country,delivery_latitude:o.delivery_latitude??checkout.latitude,
    delivery_longitude:o.delivery_longitude??checkout.longitude};
  });
  render();
 }catch(e){c().error('ordersTableBody',e);}
}
async function updateStatus(id){
 const order=allOrders.find(x=>String(x.id)===String(id));if(!order||busy.has(id))return;
 if(['completed','cancelled'].includes(String(order.status||''))){ui().toast('Oda iliyokamilika au kughairiwa haiwezi kubadilishwa tena.','warning');return;}
 const select=document.querySelector('[data-order-next="'+CSS.escape(String(id))+'"]'),next=select?.value;
 if(!['confirmed','cancelled'].includes(next)||next===order.status)return;
 const reason=window.prompt('Andika sababu ya kubadilisha hali ya oda (angalau herufi 5):')||'';
 if(reason.trim().length<5){ui().toast('Sababu lazima iwe na angalau herufi 5.','warning');return;}
 if(!window.confirm('Unathibitisha kubadilisha oda #'+shortId(id)+' kuwa '+statusLabel(next)+'?'))return;
 busy.add(id);render();
 try{
  const {data,error}=await db().from('orders').update({status:next}).eq('id',id).select('id,order_number,buyer_id,product_id,checkout_id').maybeSingle();
  if(error)throw error;if(!data)throw new Error('Oda haikupatikana au haikubadilishwa.');
  let vendorId=null;if(data.product_id){const p=await db().from('products').select('vendor_id').eq('id',data.product_id).maybeSingle();if(p.error)throw p.error;vendorId=p.data?.vendor_id||null;}
  await c().audit('order_status_'+next,'order',id,reason,{previous_status:order.status,new_status:next,checkout_id:data.checkout_id});
  const sw=next==='cancelled'?'Oda yako imeghairiwa':'Oda yako imethibitishwa',en=next==='cancelled'?'Your order was cancelled':'Your order was confirmed';
  const note=await db().from('notifications').insert({user_id:data.buyer_id,type:'order_status_'+next,title_sw:sw,title_en:en,body_sw:'Oda #'+orderRef(order)+' · '+statusLabel(next),body_en:'Order #'+orderRef(order)+' · '+statusLabel(next),action_url:'./orders.html',is_read:false});
  if(note.error)console.warn('Order notification:',note.error.message);
  if(vendorId){const sellerNote=await db().from('notifications').insert({user_id:vendorId,type:'seller_order_status_'+next,title_sw:'Hali ya oda ya duka imesasishwa',title_en:'Your store order status was updated',body_sw:'Oda #'+shortId(id)+' · '+statusLabel(next),body_en:'Order #'+shortId(id)+' · '+statusLabel(next),action_url:'./seller-dashboard.html',is_read:false});if(sellerNote.error)console.warn('Seller notification:',sellerNote.error.message);}
  ui().toast('Hali ya oda imebadilishwa.','success');await load();
 }catch(e){console.error('Order status update:',e);ui().toast(e.message||'Imeshindikana kubadilisha oda.','error');}
 finally{busy.delete(id);render();}
}
document.addEventListener('DOMContentLoaded',()=>{document.getElementById('ordersSearch')?.addEventListener('input',render);document.getElementById('orderStatusFilter')?.addEventListener('change',render);document.getElementById('refreshOrdersBtn')?.addEventListener('click',load);document.getElementById('ordersTableBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-order-save]');if(b)updateStatus(b.dataset.orderSave);});load();});
document.addEventListener('zune:page-changed',e=>{if(e.detail.page==='orders')load();});
document.addEventListener('zune:admin-refresh',()=>{if(window.ZUNE_ROUTER?.current==='orders')load();});
window.ZUNE_ORDERS={load,updateStatus};
})();