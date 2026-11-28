(() => {
  'use strict';
  const C=()=>window.ZUNE_CORE;
  const state={loading:false,range:'30d'};
  const money=v=>'TSh '+Number(v||0).toLocaleString('en-TZ',{maximumFractionDigits:2});
  const number=v=>Number(v||0).toLocaleString('en-TZ');
  const $=id=>document.getElementById(id);

  function dateWindow(){
    const now=new Date();let from;
    if(state.range==='all')from=new Date('1970-01-01T00:00:00.000Z');
    else if(state.range==='month')from=new Date(now.getFullYear(),now.getMonth(),1);
    else if(state.range==='custom'){
      const a=$('adminIntelFrom')?.value,b=$('adminIntelTo')?.value;
      if(!a||!b)throw new Error('Chagua tarehe ya mwanzo na mwisho.');
      from=new Date(a+'T00:00:00');
      const end=new Date(b+'T00:00:00');end.setDate(end.getDate()+1);
      if(Number.isNaN(+from)||Number.isNaN(+end)||from>=end)throw new Error('Tarehe ulizochagua si sahihi.');
      return {from:from.toISOString(),to:end.toISOString()};
    }else{
      const days=state.range==='7d'?7:state.range==='90d'?90:30;
      from=new Date(now);from.setDate(from.getDate()-days);
    }
    return {from:from.toISOString(),to:now.toISOString()};
  }

  function ensurePanel(){
    const section=$('dashboardPage');if(!section||section.dataset.intelligenceReady)return;
    section.dataset.intelligenceReady='1';
    const metrics=section.querySelector('.metrics-grid');
    const filter=document.createElement('div');
    filter.className='admin-intel-filter';
    filter.innerHTML=`
      <div><strong>Admin Intelligence</strong><small id="adminIntelPeriod">Takwimu za siku 30 zilizopita</small></div>
      <div class="admin-intel-controls">
        <select id="adminIntelRange" aria-label="Kipindi cha takwimu">
          <option value="7d">Siku 7</option><option value="30d" selected>Siku 30</option>
          <option value="90d">Siku 90</option><option value="month">Mwezi huu</option>
          <option value="all">Tangu mwanzo</option><option value="custom">Tarehe maalum</option>
        </select>
        <input id="adminIntelFrom" type="date" aria-label="Tarehe ya mwanzo" hidden>
        <input id="adminIntelTo" type="date" aria-label="Tarehe ya mwisho" hidden>
        <button id="adminIntelApply" type="button">Tumia</button>
        <button id="adminIntelRefresh" type="button" title="Sasisha takwimu">↻</button>
      </div>`;
    metrics?.before(filter);
    const panel=document.createElement('div');
    panel.id='adminIntelligenceMetrics';
    panel.className='admin-intel-grid';
    panel.innerHTML=`
      <article><span>Malipo yaliyorekodiwa kuwa yamelipwa</span><strong id="intelPaidPayments">—</strong><small>Chanzo: payments table</small></article>
      <article><span>Verification fees zilizolipwa</span><strong id="intelVerificationRevenue">—</strong><small>Chanzo: payment transactions</small></article>
      <article><span>Wallet liabilities</span><strong id="intelWalletLiabilities">—</strong><small>Salio la wallets za watumiaji</small></article>
      <article><span>Withdrawals zinazosubiri</span><strong id="intelWithdrawals">—</strong><small id="intelWithdrawalsAmount">—</small></article>
      <article><span>Deliveries zinazosafirishwa</span><strong id="intelDeliveries">—</strong><small>Oda zilizo in_transit</small></article>
      <article><span>Delivery payouts zimesimamishwa</span><strong id="intelPayoutHolds">—</strong><small>Mgogoro wa oda</small></article>
      <article><span>Security alerts (siku 7)</span><strong id="intelSecurityAlerts">—</strong><small>Severity: high / critical</small></article>
      <article><span>AI errors (siku 30)</span><strong id="intelAiErrors">—</strong><small id="intelAiUsage">—</small></article>`;
    filter.after(panel);
    const note=document.createElement('p');note.className='admin-intel-footnote';
    note.id='adminIntelFootnote';
    note.textContent='Takwimu za fedha zimegawanywa: thamani ya oda zilizokamilika si sawa na malipo yaliyothibitishwa, na wallet liability si mapato ya ZUNE.';
    panel.after(note);
    const style=document.createElement('style');
    style.textContent=`
      .admin-intel-filter{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;margin:0 0 14px;padding:14px 16px;border:1px solid var(--line);border-radius:14px;background:#102c24}
      .admin-intel-filter>div:first-child{display:grid;gap:4px}.admin-intel-filter strong{font:800 14px Manrope;color:var(--gold-2)}.admin-intel-filter small{font-size:10px;color:var(--muted)}
      .admin-intel-controls{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.admin-intel-controls select,.admin-intel-controls input{min-height:35px;max-width:150px;border:1px solid var(--line);border-radius:8px;background:#081e18;color:var(--text);padding:7px 9px;font-size:10px}
      .admin-intel-controls button{min-height:35px;border:1px solid var(--line);border-radius:8px;background:#d9b66c18;color:var(--gold-2);padding:7px 12px;font-size:10px;font-weight:800}
      .admin-intel-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;margin:0 0 12px}
      .admin-intel-grid article{min-width:0;padding:14px 15px;border:1px solid var(--line);border-radius:13px;background:linear-gradient(145deg,#112e26,#0d261f)}
      .admin-intel-grid article span{display:block;color:var(--muted);font-size:10px;line-height:1.45;min-height:29px}
      .admin-intel-grid article strong{display:block;margin:8px 0 5px;font:800 19px Manrope;color:var(--text);overflow-wrap:anywhere}
      .admin-intel-grid article small{font-size:9px;color:var(--muted)}
      .admin-intel-footnote{margin:0 0 18px;padding:10px 12px;border-left:3px solid var(--gold);background:#d9b66c0b;color:var(--muted);font-size:10px;line-height:1.6}
      @media(max-width:900px){.admin-intel-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:560px){.admin-intel-filter{align-items:flex-start}.admin-intel-controls{width:100%}.admin-intel-controls select,.admin-intel-controls input{flex:1;min-width:120px;max-width:none}.admin-intel-grid article{padding:12px}.admin-intel-grid article strong{font-size:17px}}
    `;
    document.head.appendChild(style);
    $('adminIntelRange')?.addEventListener('change',e=>{
      state.range=e.target.value;
      const custom=state.range==='custom';
      $('adminIntelFrom').hidden=!custom;$('adminIntelTo').hidden=!custom;
    });
    $('adminIntelApply')?.addEventListener('click',load);
    $('adminIntelRefresh')?.addEventListener('click',load);
  }

  function set(id,value){C().setText(id,value??'—');}
  function label(selector,text){const el=document.querySelector(selector);if(el)el.textContent=text;}
  function render(data,from,to){
    set('totalUsers',number(data.users_total));set('totalSellers',number(data.sellers_total));
    set('totalOrders',number(data.orders_total));set('totalProducts',number(data.products_total));
    set('pendingApplications',number(Number(data.seller_applications_pending||0)+Number(data.verifications_pending||0)));
    set('pendingOrders',number(data.orders_pending));set('openDisputes',number(data.disputes_open));
    set('openComplaints',number(data.disputes_open));set('openTickets',number(data.support_open));
    set('totalRevenue',money(data.gross_completed_orders_period_tzs));
    set('totalCommission',money(data.commission_completed_orders_period_tzs));
    set('intelPaidPayments',money(data.payments_paid_period_tzs));
    set('intelVerificationRevenue',money(data.verification_payments_paid_period_tzs));
    set('intelWalletLiabilities',money(data.wallet_liabilities_tzs));
    set('intelWithdrawals',number(data.withdrawals_pending));
    set('intelWithdrawalsAmount',money(data.withdrawals_pending_tzs)+' zinazongoja hatua');
    set('intelDeliveries',number(data.deliveries_in_transit));
    set('intelPayoutHolds',number(data.deliveries_payout_on_hold));
    set('intelSecurityAlerts',number(data.security_events_critical_7d));
    set('intelAiErrors',number(data.ai_errors_30d));
    set('intelAiUsage',number(data.ai_requests_30d)+' requests · '+money(data.ai_estimated_cost_30d)+' estimated cost');
    const rangeName=state.range==='7d'?'Siku 7 zilizopita':state.range==='90d'?'Siku 90 zilizopita':state.range==='month'?'Mwezi huu':state.range==='all'?'Tangu mwanzo':state.range==='custom'?'Kipindi maalum':'Siku 30 zilizopita';
    set('adminIntelPeriod',rangeName+' · '+new Date(from).toLocaleDateString('sw-TZ')+' – '+new Date(to).toLocaleDateString('sw-TZ'));
    set('adminIntelFootnote','Thamani ya oda zilizokamilika: '+money(data.gross_completed_orders_period_tzs)+'. Commission iliyoandikwa kwenye oda zilizokamilika: '+money(data.commission_completed_orders_period_tzs)+'. Hizi si uthibitisho wa fedha zilizopokelewa kwenye Admin Wallet.');
    const revenueCard=$('totalRevenue')?.closest('.metric-card');
    if(revenueCard){const spans=revenueCard.querySelectorAll('.metric-top span,small');if(spans[0])spans[0].textContent='Thamani ya oda zilizokamilika';if(spans[1])spans[1].textContent='Kipindi kilichochaguliwa · si cash received';}
    const commissionCard=$('totalCommission')?.closest('.metric-card');
    if(commissionCard){const spans=commissionCard.querySelectorAll('.metric-top span,small');if(spans[0])spans[0].textContent='Commission kwenye oda zilizokamilika';if(spans[1])spans[1].textContent='Order commission record · 3% policy';}
    const generated=new Date(data.generated_at||Date.now());
    set('adminIntelRefresh', '↻');
    const status=data.latest_health_check;
    const health=document.querySelector('#dashboardPage .security-summary');
    if(health){
      const line=health.querySelector('.security-line b');
      if(line)line.textContent=status?.status?String(status.status).toUpperCase():'Hakuna health check';
      const rls=health.querySelectorAll('.security-line b')[1];
      if(rls)rls.textContent='Audit inafuatiliwa';
    }
  }

  async function load(){
    if(state.loading)return;
    state.loading=true;ensurePanel();
    const btn=$('adminIntelApply');if(btn){btn.disabled=true;btn.textContent='Inapakia…';}
    try{
      if(window.ZUNE_AUTH_READY)await window.ZUNE_AUTH_READY;
      const db=C().db();if(!db)throw new Error('Supabase haijaunganishwa.');
      const windowRange=dateWindow();
      const {data,error}=await db.rpc('admin_intelligence_overview',{p_from:windowRange.from,p_to:windowRange.to});
      if(error)throw error;
      if(!data||typeof data!=='object')throw new Error('Admin Intelligence RPC haikurudisha muhtasari sahihi.');
      render(data,windowRange.from,windowRange.to);
      try{const recent=await C().rows('orders',8);C().setRows('recentOrdersBody',recent,[{html:r=>'<strong>'+window.ZUNE_LAYOUT.esc(r.public_order_id||r.order_number||String(r.id||'').slice(0,8).toUpperCase())+'</strong>'},{key:'status',html:r=>window.ZUNE_LAYOUT.status(r.status)},{key:'created_at',html:r=>window.ZUNE_LAYOUT.date(r.created_at)}]);}catch(e){console.warn('Recent orders haijapakiwa:',e.message);}
      try{await window.ZUNE_ACTIVITY_LOGS?.load?.();}catch(e){console.warn('Admin activity feed haijapakiwa:',e.message);}
      C().notice('dashboard','Takwimu zimepakiwa kupitia admin_intelligence_overview; thamani ya oda zilizokamilika, malipo yaliyorekodiwa na wallet liabilities vinaonyeshwa tofauti.');
    }catch(e){
      ['totalUsers','totalSellers','totalOrders','totalProducts','totalRevenue','totalCommission','pendingApplications','pendingOrders','openDisputes','openTickets','intelPaidPayments','intelVerificationRevenue','intelWalletLiabilities','intelWithdrawals','intelDeliveries','intelPayoutHolds','intelSecurityAlerts','intelAiErrors'].forEach(id=>set(id,'—'));
      C().notice('dashboard','Admin Intelligence haikuweza kupakia takwimu: '+(e.message||e)+'. Hakuna makadirio ya fallback yatakayoonyeshwa.');
      console.error('Admin Intelligence load failed',e);
    }finally{
      state.loading=false;if(btn){btn.disabled=false;btn.textContent='Tumia';}
    }
  }

  document.addEventListener('DOMContentLoaded',()=>{ensurePanel();load();document.addEventListener('zune:admin-refresh',load);});
  document.addEventListener('zune:page-changed',e=>{if(e.detail?.page==='dashboard')load();});
  window.ZUNE_DASHBOARD={load};
})();