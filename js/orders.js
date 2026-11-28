(() => {
'use strict';
const c=()=>window.ZUNE_CORE,ui=()=>window.ZUNE_LAYOUT,db=()=>window.zuneSupabase;
let allOrders=[],busy=new Set();
const esc=v=>ui().esc(v??'—');
const statusLabel=s=>({pending:'Inasubiri',confirmed:'Imethibitishwa',completed:'Imekamilika',cancelled:'Imeghairiwa'})[String(s||'').toLowerCase()]||String(s||'—');
const paymentLabel=s=>({pending:'Inasubiri malipo',paid:'Imelipwa',completed:'Imelipwa',failed:'Malipo yameshindwa',refunded:'Imerejeshwa',cancelled:'Imeghairiwa'})[String(s||'').toLowerCase()]||String(s||'Haijathibitishwa');
const shortId=id=>String(id||'').replace(/-/g,'').slice(0,8).toUpperCase();
const orderRef=x=>String(x?.public_order_id||x?.order_number||shortId(x?.id));
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
  {html:x=>'<div class="action-row"><select class="field-input" disabled aria-label="Order status update disabled"><option>'+esc(statusLabel(x.status))+'</option></select><button class="secondary-btn" type="button" disabled title="Inahitaji audited server-side RPC">RPC inahitajika</button></div>'}
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
   db().from('order_items').select('order_id,product_name,quantity,seller_id,variant_label,variant_sku').in('order_id',allOrders.map(x=>x.id)),
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
   const productSummary=items.length?items.map(it=>(it.product_name||'Bidhaa')+(it.variant_label?' · '+it.variant_label:'')+' × '+(it.quantity||1)).join(', '):((product.title||'Bidhaa')+(o.variant_label?' · '+o.variant_label:'')+(o.quantity?' × '+o.quantity:''));
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
 const order=allOrders.find(x=>String(x.id)===String(id));
 if(!order)return;
 ui().toast('Kubadilisha hali ya oda kumesitishwa kwa muda. Backend inahitaji RPC salama inayothibitisha Admin, transition, kurejesha stock inapohitajika na kuandika audit log ndani ya transaction.','warning');
}
document.addEventListener('DOMContentLoaded',()=>{document.getElementById('ordersSearch')?.addEventListener('input',render);document.getElementById('orderStatusFilter')?.addEventListener('change',render);document.getElementById('refreshOrdersBtn')?.addEventListener('click',load);document.getElementById('ordersTableBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-order-save]');if(b)updateStatus(b.dataset.orderSave);});load();});
document.addEventListener('zune:page-changed',e=>{if(e.detail.page==='orders')load();});
document.addEventListener('zune:admin-refresh',()=>{if(window.ZUNE_ROUTER?.current==='orders')load();});
window.ZUNE_ORDERS={load,updateStatus};
})();