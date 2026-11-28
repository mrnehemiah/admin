(() => {
  'use strict';
  const core=()=>window.ZUNE_CORE;
  const money=v=>'TSh '+Number(v||0).toLocaleString('en-TZ',{maximumFractionDigits:2});
  const number=v=>Number(v||0).toLocaleString('en-TZ');
  let lastSnapshot=null;

  function range(){
    const now=new Date();
    const fromEl=document.getElementById('reportFrom'),toEl=document.getElementById('reportTo');
    let from=fromEl?.value?new Date(fromEl.value+'T00:00:00'):new Date(now);
    if(!fromEl?.value)from.setDate(from.getDate()-30);
    let to=now;
    if(toEl?.value){to=new Date(toEl.value+'T00:00:00');to.setDate(to.getDate()+1);if(to>now)to=now;}
    if(Number.isNaN(+from)||Number.isNaN(+to)||from>=to)throw new Error('Tarehe za ripoti si sahihi.');
    return {from:from.toISOString(),to:to.toISOString()};
  }
  const metricsFor=d=>[
    ['Watumiaji wapya',d.users_new_period,'count'],
    ['Seller wapya',d.sellers_new_period,'count'],
    ['Bidhaa mpya',d.products_new_period,'count'],
    ['Oda zote za kipindi',d.orders_period,'count'],
    ['Oda zilizokamilika',d.orders_completed_period,'count'],
    ['Oda zilizofutwa',d.orders_cancelled_period,'count'],
    ['Thamani ya oda zilizokamilika',d.gross_completed_orders_period_tzs,'money'],
    ['Commission iliyoandikwa kwenye oda zilizokamilika',d.commission_completed_orders_period_tzs,'money'],
    ['Malipo yaliyorekodiwa paid',d.payments_paid_period_tzs,'money'],
    ['Ada za verification zilizolipwa',d.verification_payments_paid_period_tzs,'money'],
    ['Wallet liabilities',d.wallet_liabilities_tzs,'money'],
    ['Withdrawals zinazosubiri',d.withdrawals_pending,'count'],
    ['Kiasi cha withdrawals kinachosubiri',d.withdrawals_pending_tzs,'money'],
    ['Malipo ya dereva yaliyothibitishwa',d.driver_payouts_paid_period_tzs,'money'],
    ['Disputes zilizo wazi',d.disputes_open,'count'],
    ['Delivery payouts zilizo hold',d.deliveries_payout_on_hold,'count'],
    ['AI errors (siku 30)',d.ai_errors_30d,'count']
  ];
  function render(data,windowRange){
    lastSnapshot={data,windowRange};
    core().setText('reportOrders',number(data.orders_period));
    core().setText('reportSales',money(data.gross_completed_orders_period_tzs));
    core().setText('reportCommission',money(data.commission_completed_orders_period_tzs));
    core().setText('totalCommission',money(data.commission_completed_orders_period_tzs));
    core().setText('totalRevenue',money(data.gross_completed_orders_period_tzs));
    core().setText('statSales',money(data.payments_paid_period_tzs));

    const el=document.getElementById('reportsContent');if(!el)return;
    el.replaceChildren();
    const controls=document.createElement('div');controls.className='table-toolbar';
    controls.innerHTML='<label>Kuanzia <input id="reportFrom" type="date"></label><label>Mpaka <input id="reportTo" type="date"></label><button class="secondary-btn" id="refreshReportsBtn" type="button">Sasisha ripoti</button>';
    const grid=document.createElement('div');grid.className='reports-grid';
    metricsFor(data).forEach(([label,value,type])=>{
      const card=document.createElement('article');card.className='panel';
      const title=document.createElement('p');title.className='muted';title.textContent=label;
      const strong=document.createElement('strong');strong.textContent=type==='money'?money(value):number(value);
      card.append(title,strong);grid.appendChild(card);
    });
    const note=document.createElement('p');note.className='notice-box';
    note.textContent='Muhimu: thamani ya oda zilizokamilika na commission iliyoandikwa kwenye oda si uthibitisho wa fedha zilizopokelewa. Malipo paid, ada za verification, wallet liabilities na driver payouts zinaonyeshwa kama vipimo tofauti kutoka vyanzo vyake.';
    const exportBtn=document.createElement('button');exportBtn.className='secondary-btn';exportBtn.type='button';exportBtn.textContent='Pakua snapshot ya ripoti (CSV)';exportBtn.onclick=exportSnapshot;
    el.append(controls,grid,note,exportBtn);
    const from=document.getElementById('reportFrom'),to=document.getElementById('reportTo');
    from.value=windowRange.from.slice(0,10);const now=new Date();const localToday=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);to.value=localToday;
    document.getElementById('refreshReportsBtn').onclick=load;
  }
  function exportSnapshot(){
    if(!lastSnapshot)return;
    const rows=metricsFor(lastSnapshot.data);
    const csv=[['Metric','Value'],...rows.map(([k,v])=>[k,v??''])].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='zune-admin-intelligence-report.csv';a.click();URL.revokeObjectURL(url);
  }
  async function load(){
    const c=core();if(!c)return;
    try{
      if(window.ZUNE_AUTH_READY)await window.ZUNE_AUTH_READY;
      const w=range();
      const {data,error}=await c.db().rpc('admin_intelligence_overview',{p_from:w.from,p_to:w.to});
      if(error)throw error;
      if(!data||typeof data!=='object')throw new Error('Reporting RPC haikurudisha data sahihi.');
      render(data,w);
      c.notice('reports','Ripoti zimetolewa kupitia admin_intelligence_overview. Kila aina ya fedha inaonyeshwa kando kulingana na chanzo chake.');
    }catch(e){
      c.notice('reports','Ripoti hazijapakiwa: '+(e.message||'Hitilafu ya mfumo.'));
      console.error('ZUNE reports load failed',e);
    }
  }
  document.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('exportReportsBtn')?.addEventListener('click',exportSnapshot);
    load();
  });
  document.addEventListener('zune:page-changed',e=>{if(e.detail?.page==='reports')load();});
  window.ZUNE_REPORTS={load,exportSnapshot};
})();