(()=>{'use strict';
const $=id=>document.getElementById(id),db=()=>window.ZUNE_CORE?.db?.();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'TSh '+Number(v||0).toLocaleString('en-TZ',{maximumFractionDigits:0});
const date=v=>v?new Date(v).toLocaleString('sw-TZ'):'—';
const methods={mpesa:'M-Pesa',airtel_money:'Airtel Money',mixx_by_yas:'Mixx by Yas',halopesa:'HaloPesa',bank:'Benki',cash:'Cash',manual:'Manual'};
const statuses={pending:'Inasubiri',processing:'Inachakatwa',paid:'Imelipwa',rejected:'Imekataliwa'};
let deliveries=[],drivers=[],payments=[],active=null,busy=false;
function toast(m,t='success'){window.ZUNE_LAYOUT?.toast?window.ZUNE_LAYOUT.toast(m,t):window.alert(m)}
function pill(s){return '<span class="badge-pill '+(s==='paid'?'success':s==='rejected'?'danger':'warning')+'">'+esc(statuses[s]||s||'—')+'</span>'}
function render(){
 const held=deliveries.filter(d=>d.payout_status==='on_hold_dispute').reduce((a,d)=>a+Math.max(0,Number(d.driver_payout_amount||0)-Number(payments.find(x=>x.delivery_id===d.id)?.deduction||0)),0);
 const earned=deliveries.reduce((a,d)=>a+Number(d.driver_payout_amount||0),0),commission=deliveries.reduce((a,d)=>a+Number(payments.find(x=>x.delivery_id===d.id)?.deduction||0),0),paid=payments.filter(p=>p.status==='paid');
 $('zdpEarned').textContent=money(earned);$('zdpCommission').textContent=money(commission);$('zdpPaid').textContent=money(paid.reduce((a,p)=>a+Number(p.net_amount||0),0));
 $('zdpPending').textContent=money(Math.max(earned-commission-paid.reduce((a,p)=>a+Number(p.net_amount||0),0)-held,0));$('zdpHeld').textContent=money(held);
 $('zdpDrivers').textContent=new Set(deliveries.map(d=>d.assigned_driver_id)).size;
 const body=$('zdpDeliveryRows');
 body.innerHTML=deliveries.length?deliveries.map(d=>{
  const dr=drivers.find(x=>x.user_id===d.assigned_driver_id)||{},p=payments.find(x=>x.delivery_id===d.id),held=d.payout_status==='on_hold_dispute';
  const state=held?'<span class="badge-pill danger">Mgogoro · imesimamishwa</span>':(p?pill(p.status):'<span class="badge-pill warning">Haijawekwa</span>');
  const action=held?'<button class="secondary-btn" type="button" disabled>Imesimamishwa</button>':'<button class="secondary-btn" data-driver-payout="'+esc(d.id)+'">'+(p?'Hariri':'Weka malipo')+'</button>';
  return '<tr><td><b>'+esc(d.id.slice(0,8).toUpperCase())+'</b><small>'+esc(date(d.created_at))+'</small></td><td>'+esc(dr.full_name||'Dereva')+'<small>'+esc(dr.phone_number||'')+'</small></td><td>'+money(d.delivery_fee)+'</td><td>'+money(d.driver_payout_amount)+'</td><td>'+money(p?.deduction??0)+'</td><td>'+esc(p?money(p.net_amount):'Haijawekwa')+'</td><td>'+esc(p?(methods[p.payment_method]||p.payment_method):'—')+'</td><td>'+state+'</td><td>'+esc(p?.transaction_reference||'—')+'</td><td>'+action+'</td></tr>';
 }).join(''):'<tr><td colspan="10" class="empty-state">Hakuna delivery iliyokamilika na kuthibitishwa.</td></tr>';
 const hist=$('zdpHistoryRows');
 hist.innerHTML=payments.length?payments.map(p=>{const dr=drivers.find(x=>x.user_id===p.driver_id)||{};return '<tr><td>'+esc(p.delivery_id.slice(0,8).toUpperCase())+'</td><td>'+esc(dr.full_name||p.driver_id.slice(0,8))+'</td><td>'+money(p.amount)+'</td><td>'+money(p.deduction)+'</td><td><b>'+money(p.net_amount)+'</b></td><td>'+esc(methods[p.payment_method]||p.payment_method)+'</td><td>'+pill(p.status)+'</td><td>'+esc(p.transaction_reference||'—')+'</td><td>'+esc(date(p.paid_at||p.created_at))+'</td></tr>'}).join(''):'<tr><td colspan="9" class="empty-state">Hakuna malipo yaliyorekodiwa.</td></tr>';
 $('zdpUpdated').textContent='Imesasishwa '+date(new Date().toISOString());
}
async function load(){
 if(busy)return;busy=true;const btn=$('refreshDriverPayments');if(btn){btn.disabled=true;btn.textContent='Inapakia...'}
 try{
  if(window.ZUNE_AUTH_READY)await window.ZUNE_AUTH_READY;
  const client=db();if(!client)throw new Error('Supabase haijaunganishwa.');
  const [a,b,c]=await Promise.all([
   client.from('order_deliveries').select('id,assigned_driver_id,status,delivery_fee,driver_payout_amount,payout_status,buyer_confirmed_at,created_at').eq('status','completed').not('assigned_driver_id','is',null).not('buyer_confirmed_at','is',null).order('created_at',{ascending:false}).limit(250),
   client.from('zune_driver_payment_records').select('id,driver_id,delivery_id,amount,deduction,net_amount,payment_method,payment_phone,transaction_reference,status,admin_note,created_at,paid_at').order('created_at',{ascending:false}).limit(250),
   client.from('delivery_driver_profiles').select('user_id,full_name,phone_number,status').limit(500)
  ]);
  if(a.error)throw a.error;if(b.error)throw b.error;if(c.error)throw c.error;
  deliveries=a.data||[];payments=b.data||[];drivers=c.data||[];render();$('zdpNotice').hidden=true;
 }catch(e){console.error(e);$('zdpNotice').hidden=false;$('zdpNotice').textContent='Imeshindikana kupakia taarifa: '+(e.message||e);$('zdpDeliveryRows').innerHTML='<tr><td colspan="10">'+esc(e.message||e)+'</td></tr>'}
 finally{busy=false;if(btn){btn.disabled=false;btn.textContent='↻ Refresh'}}
}
function openModal(id){
 const d=deliveries.find(x=>x.id===id);if(!d)return;if(d.payout_status==='on_hold_dispute'){toast('Malipo yamesimamishwa kwa mgogoro wa oda mpaka Admin autatue.','warning');return;}const p=payments.find(x=>x.delivery_id===id),dr=drivers.find(x=>x.user_id===d.assigned_driver_id)||{};active=d;
 $('zdpModalTitle').textContent=(p?'Hariri malipo':'Weka malipo')+' · '+(dr.full_name||'Dereva');
 $('zdpModalDelivery').textContent='Delivery '+id+' · Ada ya delivery: '+money(d.delivery_fee);
 $('zdpAmount').value=p?.amount??d.driver_payout_amount??'';$('zdpDeduction').value=(p?.deduction??Math.round(Number($('zdpAmount').value||0)*0.03*100)/100);$('zdpDeduction').readOnly=true;
 $('zdpMethod').value=p?.payment_method||'manual';$('zdpPhone').value=p?.payment_phone||dr.phone_number||'';
 $('zdpReference').value=p?.transaction_reference||'';$('zdpStatus').value=p?.status||'pending';
 $('zdpReason').value='';$('zdpPaidConfirm').checked=false;$('zdpPaidConfirmWrap').hidden=$('zdpStatus').value!=='paid';
 $('zdpModal').hidden=false;
}
function closeModal(){if($('zdpModal'))$('zdpModal').hidden=true;active=null}
async function save(e){
 e.preventDefault();if(!active)return;const amount=Number($('zdpAmount').value),deduction=Math.round(Number($('zdpAmount').value||0)*0.03*100)/100,status=$('zdpStatus').value,reason=$('zdpReason').value.trim();
 if(!Number.isFinite(amount)||amount<=0){toast('Kiasi cha dereva si sahihi.','error');return}$('zdpDeduction').value=deduction.toFixed(2);
 if(reason.length<5){toast('Sababu ya Admin iwe na angalau herufi 5.','warning');return}
 if(status==='paid'&&!$('zdpPaidConfirm').checked){toast('Thibitisha kuwa fedha zimetumwa kabla ya kuweka Imelipwa.','warning');return}
 if(!window.confirm(status==='paid'?'Unathibitisha kuwa fedha zimetumwa kwa dereva tayari?':'Unathibitisha kuhifadhi rekodi hii ya malipo?'))return;
 const button=$('zdpSave');button.disabled=true;button.textContent='Inahifadhi...';
 try{
  const {data,error}=await db().rpc('zune_admin_record_driver_payment',{p_delivery_id:active.id,p_amount:amount,p_deduction:deduction,p_payment_method:$('zdpMethod').value,p_payment_phone:$('zdpPhone').value.trim()||null,p_transaction_reference:$('zdpReference').value.trim()||null,p_status:status,p_admin_reason:reason});
  if(error)throw error;if(!data?.ok)throw new Error('Backend haikuthibitisha malipo.');
  closeModal();toast('Rekodi ya malipo imehifadhiwa.');await load();
 }catch(err){toast(err.message||'Imeshindikana kuhifadhi.','error')}
 finally{button.disabled=false;button.textContent='Hifadhi malipo'}
}
document.addEventListener('DOMContentLoaded',()=>{
 $('refreshDriverPayments')?.addEventListener('click',load);
 $('zdpDeliveryRows')?.addEventListener('click',e=>{const b=e.target.closest('[data-driver-payout]');if(b)openModal(b.dataset.driverPayout)});
 $('zdpClose')?.addEventListener('click',closeModal);$('zdpCancel')?.addEventListener('click',closeModal);
 $('zdpForm')?.addEventListener('submit',save);
 $('zdpAmount')?.addEventListener('input',()=>{$('zdpDeduction').value=(Math.round(Number($('zdpAmount').value||0)*0.03*100)/100).toFixed(2)});
 $('zdpStatus')?.addEventListener('change',()=>{$('zdpPaidConfirmWrap').hidden=$('zdpStatus').value!=='paid'});
 $('zdpModal')?.addEventListener('click',e=>{if(e.target===$('zdpModal'))closeModal()});
});
document.addEventListener('zune:page-changed',e=>{if(e.detail?.page==='payments')load()});
window.ZUNE_DRIVER_PAYMENTS_ADMIN={load};
})();