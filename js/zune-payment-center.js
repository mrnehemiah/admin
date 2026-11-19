(()=>{'use strict';
const $=id=>document.getElementById(id);
const money=v=>'TZS '+Number(v||0).toLocaleString('en-TZ',{maximumFractionDigits:2});
const safe=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>v?new Date(v).toLocaleString('sw-TZ'):'—';
const cell=(v)=>'<td>'+safe(v)+'</td>';
const empty=(id,n,msg)=>{if($(id))$(id).innerHTML='<tr><td colspan="'+n+'" class="empty-state">'+safe(msg)+'</td></tr>';};
async function read(table,cols='*',limit=100,orderBy='created_at'){const {data,error}=await window.zuneSupabase.from(table).select(cols).order(orderBy,{ascending:false}).limit(limit);if(error)throw error;return data||[];}
async function load(){
 if(!window.zuneSupabase){['zpmTransactions','zpmAllocations','zpmEvents'].forEach((id,i)=>empty(id,[7,8,6][i],'Unganisha Supabase ili kuona taarifa halisi.'));return;}
 const btn=$('refreshZunePayments');if(btn){btn.disabled=true;btn.textContent='Inapakia...';}
 try{
  const [payments,allocations,events]=await Promise.all([
   read('zune_order_payment_transactions','id,checkout_id,buyer_id,provider_code,provider_reference,amount,currency,network_code,status,created_at,paid_at',150),
   read('zune_seller_earnings_ledger','id,order_id,seller_id,gross_amount,commission_rate,commission_amount,net_amount,status,created_at',150),
   read('zune_payment_provider_events','id,provider_code,provider_event_id,payment_reference,processing_status,received_at,error_message',100,'received_at')
  ]);
  const succeeded=payments.filter(x=>x.status==='succeeded');
  const sum=(rows,key)=>rows.reduce((a,x)=>a+Number(x[key]||0),0);
  $('zpmPaid').textContent=money(sum(succeeded,'amount'));
  $('zpmPending').textContent=payments.filter(x=>['created','pending'].includes(x.status)).length;
  $('zpmFailed').textContent=payments.filter(x=>['failed','cancelled'].includes(x.status)).length;
  $('zpmSellerNet').textContent=money(sum(allocations,'net_amount'));
  $('zpmCommission').textContent=money(sum(allocations,'commission_amount'));
  $('zpmTransactions').innerHTML=payments.length?payments.map(x=>'<tr>'+cell(x.provider_reference||x.id)+cell(String(x.buyer_id||'').slice(0,8)+'…')+cell(money(x.amount)) +cell(x.provider_code)+cell(x.network_code)+cell(x.status)+cell(date(x.paid_at||x.created_at))+'</tr>').join(''):'<tr><td colspan="7" class="empty-state">Hakuna order payments bado.</td></tr>';
  $('zpmAllocations').innerHTML=allocations.length?allocations.map(x=>'<tr>'+cell(String(x.order_id||'').slice(0,8)+'…')+cell(String(x.seller_id||'').slice(0,8)+'…')+cell(money(x.gross_amount))+cell((Number(x.commission_rate||0)*100).toFixed(2)+'%')+cell(money(x.commission_amount))+cell(money(x.net_amount))+cell(x.status)+'</tr>').join(''):'<tr><td colspan="8" class="empty-state">Hakuna payment allocations bado.</td></tr>';
  $('zpmEvents').innerHTML=events.length?events.map(x=>'<tr>'+cell(x.provider_code)+cell(x.provider_event_id)+cell(x.payment_reference)+cell(x.processing_status)+cell(date(x.received_at||x.created_at))+cell(x.error_message||'—')+'</tr>').join(''):'<tr><td colspan="6" class="empty-state">Hakuna gateway events bado.</td></tr>';
 }catch(e){console.error('ZUNE payment center',e);['zpmTransactions','zpmAllocations','zpmEvents'].forEach((id,i)=>empty(id,[7,8,6][i],'Imeshindikana kusoma taarifa: '+(e.message||'Unknown error')));}
 finally{if(btn){btn.disabled=false;btn.textContent='↻ Refresh';}}
}
document.addEventListener('DOMContentLoaded',()=>{if($('refreshZunePayments'))$('refreshZunePayments').addEventListener('click',load);if(location.hash==='#payments')load();});
document.addEventListener('zune:page-changed',e=>{if(e.detail&&e.detail.page==='payments')load();});
window.ZUNE_PAYMENT_CENTER={load};
})();