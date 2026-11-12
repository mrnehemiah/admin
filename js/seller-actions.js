(() => {
  'use strict';
  const A=()=>window.ZUNE_ACTIONS, ui=()=>window.ZUNE_LAYOUT, S=()=>window.ZUNE_SELLERS;
  const find=id=>S()?.cache.find(x=>String(x.id)===String(id));
  const name=s=>s.store_name||s.full_name||s.email||s.id;
  const refreshDetail=id=>{const s=find(id),el=document.getElementById('sellerDetailsStatus');if(s&&el)el.textContent=s.account_status||'active';};
  const afterChange=async id=>{await S().load();refreshDetail(id);};
  function setStatus(s,status){
    const verb=status==='active'?'Restore':'Suspend';
    A().confirm({title:`${verb} seller`,message:`${verb}: ${name(s)}. Andika sababu.`,confirmText:verb,
      fn:async reason=>{await A().rpc('admin_set_user_status',{target_user_id:s.id,new_status:status,action_reason:reason});ui().toast('Hali ya seller imebadilishwa.','success');await afterChange(s.id);}});
  }
  function demote(s){
    A().confirm({title:'Remove Seller Role',message:`${name(s)} atarudishwa kuwa Buyer; akaunti haitafutwa. Andika sababu.`,confirmText:'Remove Role',
      fn:async reason=>{await A().rpc('admin_change_user_role',{p_user_id:s.id,p_new_role:'buyer',p_reason:reason});ui().toast('Seller role imeondolewa.','success');await S().load();if(window.ZUNE_ROUTER.current==='seller-details')window.ZUNE_ROUTER.show('sellers');}});
  }
  function grantBadge(s){
    if(s.is_verified){ui().toast('Seller tayari ana Verified Badge.','info');return;}
    A().confirm({title:'Toa Verified Badge',message:`Toa badge kwa: ${name(s)}. Andika sababu.`,confirmText:'Verify Seller',
      fn:async reason=>{await A().rpc('admin_set_badge',{p_user_id:s.id,p_grant:true,p_reason:reason});ui().toast('Verified Badge imetolewa.','success');await afterChange(s.id);window.ZUNE_BADGES?.loadVerified();}});
  }
  document.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('sellersTableBody')?.addEventListener('click',e=>{
      const b=e.target.closest('[data-seller-act]');if(!b)return;const s=find(b.dataset.id);if(!s)return;
      ({suspend:()=>setStatus(s,'suspended'),restore:()=>setStatus(s,'active'),demote:()=>demote(s)})[b.dataset.sellerAct]?.();
    });
    const cur=()=>find(window.ZUNE_SELECTED_SELLER_ID);
    document.getElementById('suspendSellerBtn')?.addEventListener('click',()=>{const s=cur();if(s)setStatus(s,'suspended');});
    document.getElementById('verifySellerBtn')?.addEventListener('click',()=>{const s=cur();if(s)grantBadge(s);});
  });
})();
