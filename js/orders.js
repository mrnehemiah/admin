(() => {
'use strict';
const c=()=>window.ZUNE_CORE,ui=()=>window.ZUNE_LAYOUT,db=()=>window.zuneSupabase;
let allOrders=[],busy=new Set();
const esc=v=>ui().esc(v??'—');
const statusLabel=s=>({pending:'Pending',confirmed:'Confirmed',completed:'Completed',cancelled:'Cancelled'})[String(s||'').toLowerCase()]||String(s||'—');
function render(){
 const q=(document.getElementById('ordersSearch')?.value||'').trim().toLowerCase();
 const status=(document.getElementById('orderStatusFilter')?.value||'').toLowerCase();
 const rows=allOrders.filter(x=>(!status||String(x.status||'').toLowerCase()===status)&&(!q||[x.id,x.buyer_id,x.seller_id,x.total_price,x.status,x.payment_status].some(v=>String(v??'').toLowerCase().includes(q))));
 c().setRows('ordersTableBody',rows,[
  {html:x=>'<strong>'+esc(x.id)+'</strong><small>Checkout: '+esc(x.checkout_id||'—')+'</small>'},
  {html:x=>esc(x.buyer_id||'—')},{html:x=>esc(x.seller_id||'—')},
  {html:x=>ui().money(x.total_price??x.total_amount??0)},
  {html:x=>'<span class="badge-pill">'+esc(statusLabel(x.status))+'</span>'},
  {html:x=>ui().date(x.created_at)},{html:x=>ui().status(x.payment_status||'pending')},
  {html:x=>'<div class="action-row"><select class="field-input" data-order-next="'+esc(x.id)+'"><option value="pending" '+(x.status==='pending'?'selected':'')+'>Pending</option><option value="confirmed" '+(x.status==='confirmed'?'selected':'')+'>Confirmed</option><option value="completed" '+(x.status==='completed'?'selected':'')+'>Completed</option><option value="cancelled" '+(x.status==='cancelled'?'selected':'')+'>Cancelled</option></select><button class="secondary-btn" type="button" data-order-save="'+esc(x.id)+'" '+(busy.has(x.id)?'disabled':'')+'>Save</button></div>'}
 ],'Hakuna orders zinazolingana na vichujio.');
 c().setText('totalOrders',allOrders.length.toLocaleString());
}
async function load(){try{
 allOrders=await c().rows('orders',500);
 const ids=[...new Set(allOrders.map(x=>x.product_id).filter(Boolean))];
 if(ids.length){const {data,error}=await db().from('products').select('id,vendor_id').in('id',ids);if(error)throw error;const owners=new Map((data||[]).map(x=>[x.id,x.vendor_id]));allOrders=allOrders.map(x=>({...x,seller_id:owners.get(x.product_id)||null}));}
 render();
 }catch(e){c().error('ordersTableBody',e);}}
async function updateStatus(id){
 const order=allOrders.find(x=>String(x.id)===String(id));if(!order||busy.has(id))return;
 const select=document.querySelector('[data-order-next="'+CSS.escape(String(id))+'"]');const next=select?.value;
 if(!['pending','confirmed','completed','cancelled'].includes(next)||next===order.status)return;
 let reason=window.prompt('Andika sababu ya kubadilisha hali ya oda (angalau herufi 5):')||'';
 if(reason.trim().length<5){ui().toast('Sababu lazima iwe na angalau herufi 5.','warning');return;}
 if(!window.confirm('Unathibitisha kubadilisha hali ya oda hii kuwa '+statusLabel(next)+'?'))return;
 busy.add(id);render();
 try{
  const {data,error}=await db().from('orders').update({status:next}).eq('id',id).select('id,buyer_id,product_id,checkout_id').maybeSingle();
  if(error)throw error;if(!data)throw new Error('Oda haikupatikana au haikubadilishwa.');
  let vendorId=null;
  if(data.product_id){const p=await db().from('products').select('vendor_id').eq('id',data.product_id).maybeSingle();if(p.error)throw p.error;vendorId=p.data?.vendor_id||null;}
  const deliveryStatus=next==='completed'?'delivered':next==='cancelled'?'cancelled':next==='confirmed'?'confirmed':'pending';
  if(data.checkout_id&&vendorId){const delivery=await db().from('order_deliveries').update({status:deliveryStatus}).eq('checkout_id',data.checkout_id).eq('vendor_id',vendorId);if(delivery.error)console.warn('Delivery status update:',delivery.error.message);}
  await c().audit('order_status_'+next,'order',id,reason,{previous_status:order.status,new_status:next,checkout_id:data.checkout_id});
  const sw=next==='completed'?'Oda yako imekamilika':next==='cancelled'?'Oda yako imeghairiwa':next==='confirmed'?'Oda yako imethibitishwa':'Hali ya oda yako imesasishwa';
  const en=next==='completed'?'Your order is complete':next==='cancelled'?'Your order was cancelled':next==='confirmed'?'Your order was confirmed':'Your order status was updated';
  const note=await db().from('notifications').insert({user_id:data.buyer_id,type:'order_status_'+next,title_sw:sw,title_en:en,body_sw:'Oda #'+String(id).slice(0,8)+' · '+statusLabel(next),body_en:'Order #'+String(id).slice(0,8)+' · '+statusLabel(next),action_url:'./orders.html',is_read:false});
  if(note.error)console.warn('Order notification:',note.error.message);
  ui().toast('Hali ya oda imebadilishwa.','success');await load();
 }catch(e){console.error('Order status update:',e);ui().toast(e.message||'Imeshindikana kubadilisha oda.','error');}
 finally{busy.delete(id);render();}
}
document.addEventListener('DOMContentLoaded',()=>{
 document.getElementById('ordersSearch')?.addEventListener('input',render);
 document.getElementById('orderStatusFilter')?.addEventListener('change',render);
 document.getElementById('refreshOrdersBtn')?.addEventListener('click',load);
 document.getElementById('ordersTableBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-order-save]');if(b)updateStatus(b.dataset.orderSave);});
 load();
});
document.addEventListener('zune:page-changed',e=>{if(e.detail.page==='orders')load();});
document.addEventListener('zune:admin-refresh',()=>{if(window.ZUNE_ROUTER?.current==='orders')load();});
window.ZUNE_ORDERS={load,updateStatus};
})();