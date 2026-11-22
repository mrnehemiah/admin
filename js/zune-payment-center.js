(()=>{'use strict';
const $=id=>document.getElementById(id);
const money=v=>'TZS '+Number(v||0).toLocaleString('en-TZ',{maximumFractionDigits:2});
const safe=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>v?new Date(v).toLocaleString('sw-TZ'):'—';
const cell=v=>'<td>'+safe(v)+'</td>';
const empty=(id,n,msg)=>{if($(id))$(id).innerHTML='<tr><td colspan="'+n+'" class="empty-state">'+safe(msg)+'</td></tr>';};
async function read(table,cols,limit=200,orderBy='created_at'){
 const {data,error}=await window.zuneSupabase.from(table).select(cols).order(orderBy,{ascending:false}).limit(limit);
 if(error)throw error;return data||[];
}
const stateOf=value=>{
 const s=String(value||'pending').toLowerCase();
 if(['paid','succeeded','success','completed','confirmed'].includes(s))return 'paid';
 if(['failed','rejected','cancelled','canceled','expired'].includes(s))return 'failed';
 return 'pending';
};
const statusLabel=(status,method)=>{
 if(status==='paid')return 'Imelipwa';
 if(status==='failed')return 'Imeshindwa / Imeghairiwa';
 if(String(method||'').toLowerCase()==='cash_on_delivery')return 'COD · Inasubiri kupokelewa';
 return 'Inasubiri malipo';
};
async function load(){
 if(!window.zuneSupabase){['zpmTransactions','zpmAllocations','zpmEvents'].forEach((id,i)=>empty(id,[7,7,6][i],'Unganisha Supabase ili kuona taarifa halisi.'));return;}
 const btn=$('refreshZunePayments');if(btn){btn.disabled=true;btn.textContent='Inapakia...';}
 try{
  const [orders,paymentRows,gatewayPayments,allocations,events]=await Promise.all([
   read('orders','id,checkout_id,buyer_id,total_price,payment_method,payment_status,payment_reference,created_at'),
   read('payments','id,order_id,buyer_id,amount,payment_method,transaction_reference,payment_status,created_at,updated_at'),
   read('zune_order_payment_transactions','id,checkout_id,buyer_id,provider_code,provider_reference,amount,currency,network_code,status,created_at,paid_at'),
   read('zune_seller_earnings_ledger','id,order_id,seller_id,gross_amount,commission_rate,commission_amount,net_amount,status,created_at'),
   read('zune_payment_provider_events','id,provider_code,provider_event_id,payment_reference,processing_status,received_at,error_message',100,'received_at')
  ]);
  const paymentByOrder=new Map(paymentRows.map(p=>[p.order_id,p]));
  const gatewayByCheckout=new Map();
  gatewayPayments.forEach(p=>{if(p.checkout_id&&!gatewayByCheckout.has(p.checkout_id))gatewayByCheckout.set(p.checkout_id,p);});
  const rows=orders.map(o=>{
   const p=paymentByOrder.get(o.id),g=gatewayByCheckout.get(o.checkout_id);
   const status=stateOf(g?.status||p?.payment_status||o.payment_status);
   const method=g?.provider_code||p?.payment_method||o.payment_method||'—';
   return {orderId:o.id,buyerId:o.buyer_id,amount:g?.amount??p?.amount??o.total_price,provider:method,network:g?.network_code||'—',status,reference:g?.provider_reference||p?.transaction_reference||o.payment_reference||g?.id||p?.id||o.id,date:g?.paid_at||p?.updated_at||p?.created_at||o.created_at};
  }).sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
  const sum=(list,key)=>list.reduce((total,item)=>total+Number(item[key]||0),0);
  const paid=rows.filter(x=>x.status==='paid'),pending=rows.filter(x=>x.status==='pending'),failed=rows.filter(x=>x.status==='failed');
  $('zpmPaid').textContent=money(sum(paid,'amount'))+' · '+paid.length;
  $('zpmPending').textContent=String(pending.length);
  $('zpmFailed').textContent=String(failed.length);
  $('zpmSellerNet').textContent=money(sum(allocations,'net_amount'));
  $('zpmCommission').textContent=money(sum(allocations,'commission_amount'));
  $('zpmTransactions').innerHTML=rows.length?rows.map(x=>'<tr>'+cell(String(x.orderId).slice(0,8)+'… / '+String(x.reference).slice(0,16))+cell(String(x.buyerId||'').slice(0,8)+'…')+cell(money(x.amount))+cell(x.provider)+cell(x.network)+cell(statusLabel(x.status,x.provider))+cell(date(x.date))+'</tr>').join(''):'<tr><td colspan="7" class="empty-state">Bado hakuna oda zilizorekodiwa.</td></tr>';
  $('zpmAllocations').innerHTML=allocations.length?allocations.map(x=>'<tr>'+cell(String(x.order_id||'').slice(0,8)+'…')+cell(String(x.seller_id||'').slice(0,8)+'…')+cell(money(x.gross_amount))+cell((Number(x.commission_rate||0)*100).toFixed(2)+'%')+cell(money(x.commission_amount))+cell(money(x.net_amount))+cell(x.status)+'</tr>').join(''):'<tr><td colspan="7" class="empty-state">Bado hakuna seller earnings.</td></tr>';
  $('zpmEvents').innerHTML=events.length?events.map(x=>'<tr>'+cell(x.provider_code)+cell(x.provider_event_id)+cell(x.payment_reference)+cell(x.processing_status)+cell(date(x.received_at||x.created_at))+cell(x.error_message||'—')+'</tr>').join(''):'<tr><td colspan="6" class="empty-state">Bado hakuna gateway events.</td></tr>';
 }catch(e){console.error('ZUNE payment center',e);['zpmTransactions','zpmAllocations','zpmEvents'].forEach((id,i)=>empty(id,[7,7,6][i],'Imeshindikana kusoma taarifa: '+(e.message||'Unknown error')));}
 finally{if(btn){btn.disabled=false;btn.textContent='↻ Refresh';}}
}
document.addEventListener('DOMContentLoaded',()=>{if($('refreshZunePayments'))$('refreshZunePayments').addEventListener('click',load);if(location.hash==='#payments')load();});
document.addEventListener('zune:page-changed',e=>{if(e.detail&&e.detail.page==='payments')load();});
window.ZUNE_PAYMENT_CENTER={load};
})();