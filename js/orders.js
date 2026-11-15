(() => {
'use strict';
const c=()=>window.ZUNE_CORE,ui=()=>window.ZUNE_LAYOUT;
let allOrders=[];
function render(){
 const q=(document.getElementById('ordersSearch')?.value||'').trim().toLowerCase();
 const status=(document.getElementById('orderStatusFilter')?.value||'').toLowerCase();
 const rows=allOrders.filter(x=>(!status||String(x.status||'').toLowerCase()===status)&&(!q||[x.id,x.buyer_id,x.seller_id,x.total_price,x.status,x.payment_status].some(v=>String(v??'').toLowerCase().includes(q))));
 c().setRows('ordersTableBody',rows,[{html:x=>ui().esc(x.id)},{html:x=>ui().esc(x.buyer_id||x.user_id||'—')},{html:x=>ui().esc(x.seller_id||'—')},{html:x=>ui().money(x.total_price??x.total_amount??0)},{html:x=>ui().status(x.status)},{html:x=>ui().date(x.created_at)},{html:x=>ui().status(x.payment_status||'pending')}],'Hakuna orders zinazolingana na vichujio.');
 c().setText('totalOrders',allOrders.length.toLocaleString());
}
async function load(){try{allOrders=await c().rows('orders',500);render();}catch(e){c().error('ordersTableBody',e);}}
document.addEventListener('DOMContentLoaded',()=>{document.getElementById('ordersSearch')?.addEventListener('input',render);document.getElementById('orderStatusFilter')?.addEventListener('change',render);document.getElementById('refreshOrdersBtn')?.addEventListener('click',load);load();});
document.addEventListener('zune:page-changed',e=>{if(e.detail.page==='orders')load();});
document.addEventListener('zune:admin-refresh',()=>{if(window.ZUNE_ROUTER?.current==='orders')load();});
window.ZUNE_ORDERS={load};
})();