(() => {
  'use strict';
  const c=()=>window.ZUNE_CORE;

  async function load(){
    const core=c();
    try{
      const [orders,products,sellers]=await Promise.all([
        core.count('orders'),
        core.count('products'),
        core.count('profiles',[['role','eq','vendor']])
      ]);

      core.setText('reportOrders',orders.toLocaleString());
      core.setText('reportSales','Inahitaji finance RPC');
      core.setText('reportCommission','Inahitaji finance RPC');
      core.setText('totalCommission','Inahitaji finance RPC');
      core.setText('totalRevenue','Inahitaji finance RPC');
      core.setText('statSales','Inahitaji finance RPC');

      const el=document.getElementById('reportsContent');
      if(el){
        el.textContent='';
        const summary=document.createElement('div');
        summary.textContent='Orders: '+orders.toLocaleString()+' · Products: '+products.toLocaleString()+' · Sellers: '+sellers.toLocaleString();
        const warning=document.createElement('p');
        warning.className='notice-box';
        warning.textContent='Mauzo na commission vimefichwa kwa muda hadi kuwe na reporting RPC inayotumia payment-confirmed transactions na ledger kamili. Jumla ya oda 1,000 za hivi karibuni si chanzo sahihi cha mapato ya mfumo mzima.';
        el.append(summary,warning);
      }
      core.notice('reports','Takwimu za mauzo na commission hazijaonyeshwa kwa sababu hakuna reporting RPC iliyothibitishwa kwa hesabu kamili. Tumia ledger/payment backend kama chanzo rasmi; usikadirie kutoka kwenye idadi ndogo ya orders.');
      core.notice('dashboard','Mapato na commission zinasubiri reporting RPC inayotumia financial ledger. Takwimu za mauzo hazikadiriwi kutoka kwenye orders za hivi karibuni.');
    }catch(e){
      core.notice('reports','Ripoti hazijapakiwa: '+(e.message||'Hitilafu ya mfumo.'));
    }
  }

  document.addEventListener('DOMContentLoaded',load);
  document.addEventListener('zune:page-changed',e=>{if(e.detail.page==='reports')load();});
  window.ZUNE_REPORTS={load};
})();