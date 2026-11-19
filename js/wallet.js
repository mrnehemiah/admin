(() => {
  'use strict';
  const c=()=>window.ZUNE_CORE,ui=()=>window.ZUNE_LAYOUT;

  async function load(){
    try{
      const [rows,finance]=await Promise.all([
        c().rows(c().cfg.TABLES.walletTransactions,300),
        c().db().rpc('zune_admin_finance_dashboard')
      ]);
      if(finance.error) throw finance.error;

      c().setRows('walletTransactionsBody',rows,[
        {key:'reference'},
        {key:'user_id'},
        {key:'transaction_type'},
        {key:'amount',html:x=>ui().money(x.amount)},
        {key:'status',html:x=>ui().status(x.status)},
        {key:'created_at',html:x=>ui().date(x.created_at)}
      ]);
      c().setText('walletTransactionCount',rows.length.toLocaleString());
      c().setText('walletTotalBalance',ui().money(finance.data?.available_balance||0));
      c().setText('pendingWithdrawals',rows.filter(x=>/withdraw/i.test(x.transaction_type||'')&&/pending/i.test(x.status||'')).length.toLocaleString());

      const credits=Number(finance.data?.total_credits||0);
      const debits=Number(finance.data?.total_debits||0);
      c().notice('wallet',
        'Admin Wallet Net Balance inasomwa kutoka ZUNE financial ledger. '+
        'Credits: '+ui().money(credits)+' · Debits: '+ui().money(debits)+
        '. Inajumuisha commission ya mauzo na delivery; si jumla ya wallets za watumiaji.'
      );
    }catch(e){
      c().error('walletTransactionsBody',e);
      c().notice('wallet',`Admin Wallet haijaweza kupakiwa. Hakikisha RPC zune_admin_finance_dashboard ipo na Admin Mkuu ana ruhusa. ${e.message}`);
    }
  }

  document.addEventListener('DOMContentLoaded',load);
  document.addEventListener('zune:page-changed',e=>{if(e.detail.page==='wallet')load();});
  window.ZUNE_WALLET={load};
})();
