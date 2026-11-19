(() => {
  'use strict';
  const c=()=>window.ZUNE_CORE,ui=()=>window.ZUNE_LAYOUT;

  async function load(){
    const balanceEl=document.getElementById('walletTotalBalance');
    const countEl=document.getElementById('walletTransactionCount');
    const pendingEl=document.getElementById('pendingWithdrawals');
    const bodyEl=document.getElementById('walletTransactionsBody');
    try{
      const results=await Promise.allSettled([
        c().db().rpc('zune_admin_finance_dashboard'),
        c().rows(c().cfg.TABLES.walletTransactions,300)
      ]);
      const financeResult=results[0];
      const rowsResult=results[1];

      if(financeResult.status==='fulfilled' && !financeResult.value.error){
        const finance=financeResult.value.data||{};
        if(balanceEl) balanceEl.textContent=ui().money(finance.available_balance||0);
        const credits=Number(finance.total_credits||0);
        const debits=Number(finance.total_debits||0);
        c().notice('wallet',
          'Salio linaloonekana ni Net Admin Wallet Balance kutoka financial ledger. '+
          'Credits: '+ui().money(credits)+' · Debits: '+ui().money(debits)+
          '. Inajumuisha commission ya mauzo na delivery; haijumuishi wallet za sellers au madereva.'
        );
      }else{
        const err=financeResult.status==='rejected'?financeResult.reason:financeResult.value.error;
        if(balanceEl) balanceEl.textContent='Haipatikani';
        c().notice('wallet','Salio halikuweza kusomwa: '+(err?.message||'RPC access failed')+
          '. Hakikisha umeingia kama Admin Mkuu na RPC zune_admin_finance_dashboard inaruhusiwa.');
      }

      if(rowsResult.status==='fulfilled'){
        const rows=rowsResult.value||[];
        c().setRows('walletTransactionsBody',rows,[
          {key:'reference'},
          {key:'user_id'},
          {key:'transaction_type'},
          {key:'amount',html:x=>ui().money(x.amount)},
          {key:'status',html:x=>ui().status(x.status)},
          {key:'created_at',html:x=>ui().date(x.created_at)}
        ]);
        if(countEl) countEl.textContent=rows.length.toLocaleString();
        if(pendingEl) pendingEl.textContent=rows.filter(x=>/withdraw/i.test(x.transaction_type||'')&&/pending/i.test(x.status||'')).length.toLocaleString();
      }else{
        const err=rowsResult.reason;
        if(countEl) countEl.textContent='—';
        if(pendingEl) pendingEl.textContent='—';
        if(bodyEl) bodyEl.innerHTML='<tr><td colspan="6" class="empty-state">Salio linaweza kuonekana, lakini historia ya miamala haikupatikana: '+String(err?.message||'Ruhusa ya kusoma ledger imekataliwa').replace(/[<>&"]/g,'')+'</td></tr>';
      }
    }catch(e){
      if(balanceEl) balanceEl.textContent='Haipatikani';
      c().error('walletTransactionsBody',e);
      c().notice('wallet','Admin Wallet haijaweza kupakiwa. '+(e.message||'Kuna hitilafu ya mfumo.'));
    }
  }

  document.addEventListener('DOMContentLoaded',load);
  document.addEventListener('zune:page-changed',e=>{if(e.detail.page==='wallet')load();});
  window.ZUNE_WALLET={load};
})();