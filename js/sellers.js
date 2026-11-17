(() => {
 'use strict';
 const c=()=>window.ZUNE_CORE,ui=()=>window.ZUNE_LAYOUT;
 let cache=[];
 async function load(){
  const body=document.getElementById('sellersTableBody');
  if(body)body.innerHTML='<tr><td colspan="6" class="empty-state">Inapakia wauzaji kutoka Supabase...</td></tr>';
  try{
   if(window.ZUNE_AUTH_READY) await window.ZUNE_AUTH_READY;
   const db=c().db();
   if(!db) throw new Error('Supabase client haipo. Hakiki config.js na login ya Admin.');
   const [profileResult,storeResult]=await Promise.all([
    db.from('profiles').select('*').limit(1000),
    db.from('stores').select('*').limit(1000)
   ]);
   if(profileResult.error) throw new Error('profiles: '+profileResult.error.message);
   if(storeResult.error) throw new Error('stores: '+storeResult.error.message);
   const profiles=profileResult.data||[];
   const stores=storeResult.data||[];
   const storeByOwner=new Map();
   stores.forEach(store=>{
    const owner=String(store.owner_id||'');
    if(owner&&!storeByOwner.has(owner))storeByOwner.set(owner,store);
   });
   cache=profiles
    .filter(p=>String(p.role||'').toLowerCase()==='vendor')
    .map(p=>{
     const store=storeByOwner.get(String(p.id))||{};
     return {...p,avatar_path:p.avatar_path||'',store_name:store.store_name||p.store_name||p.business_name||'',store_id:store.id||null,store_logo_url:store.logo_url||'',store_cover_image_url:store.cover_image_url||'',store_description:store.description||'',store_category:store.category||'',store_phone:store.phone||'',store_email:store.email||'',store_region:store.region||'',store_district:store.district||'',store_address:store.address||'',store_status:store.store_status|| (store.is_active===false?'inactive':'active')};
    });
   const st=document.getElementById('sellerStatusFilter')?.value||'';
   const vf=document.getElementById('sellerVerificationFilter')?.value||'';
   const data=cache.filter(x=>(!st||String(x.account_status||'active').toLowerCase()===st)&&(!vf||(vf==='verified'?x.is_verified===true:x.is_verified!==true)));
   c().setRows('sellersTableBody',data,[
    {key:'store_name',html:r=>ui().esc(r.store_name||r.full_name||r.name||r.email||r.id)},
    {key:'email',html:r=>`${ui().esc(r.email||'—')}<br><small>${ui().esc(r.phone_number||'')}</small>`},
    {key:'is_verified',html:r=>r.is_verified?'<span class="badge-pill success">✓ Verified</span>':'<span class="badge-pill warning">Not verified</span>'},
    {key:'sales',html:()=> '—'},
    {key:'account_status',html:r=>ui().status(r.account_status||'active')},
    {key:'id',html:r=>{const id=ui().esc(r.id),act=String(r.account_status||'active').toLowerCase()==='active'?'<button class="warning-btn" data-seller-act="suspend" data-id="'+id+'">Suspend</button>':'<button class="secondary-btn" data-seller-act="restore" data-id="'+id+'">Restore</button>';return '<div class="action-row"><button class="secondary-btn" data-seller-view="'+id+'">Angalia Maelezo</button>'+act+'<button class="danger-btn" data-seller-act="demote" data-id="'+id+'">Remove Role</button></div>'}}
   ]);
   c().setText('totalSellers',cache.length.toLocaleString());
   c().bindFilter('sellersSearch','sellersTableBody');
  }catch(e){c().error('sellersTableBody',e);}
 }
 async function details(id){
  const s=cache.find(x=>String(x.id)===String(id));if(!s)return;
  window.ZUNE_SELECTED_SELLER_ID=s.id;window.ZUNE_ROUTER.show('seller-details');
  const name=s.store_name||s.full_name||s.name||'Seller';
  c().setText('sellerDetailsName',name);c().setText('sellerDetailsStore',s.store_name||'Jina la duka halijawekwa');
  const avatar=document.getElementById('sellerDetailsAvatar');
  if(avatar){
   avatar.textContent=(s.full_name||'S').trim().charAt(0).toUpperCase();
   avatar.style.backgroundImage='none';
   avatar.style.backgroundSize='cover';avatar.style.backgroundPosition='center';
   if(s.avatar_path){
    try{
     const {data,error}=await c().db().storage.from('zune-avatars').createSignedUrl(s.avatar_path,3600);
     if(error)throw error;
     if(data?.signedUrl){avatar.textContent='';avatar.style.backgroundImage='url("'+ui().esc(data.signedUrl)+'")';}
     else console.warn('Seller avatar signed URL haikupatikana');
    }catch(err){console.warn('Seller avatar haikuweza kupakiwa:',err.message||err);}
   }
  }
  const storeBox=document.getElementById('sellerStoreContent');
  if(storeBox){
   const safeUrl=v=>{const x=String(v||'');return (x.startsWith('https://')||x.startsWith('http://'))?ui().esc(x):'';};
   const cover=safeUrl(s.store_cover_image_url),logo=safeUrl(s.store_logo_url);
   storeBox.innerHTML='<div class="admin-store-media">'+(cover?'<img class="admin-store-cover" src="'+cover+'" alt="Picha ya juu ya duka" loading="lazy">':'<div class="admin-store-cover admin-store-placeholder">Picha ya juu haijawekwa</div>')+'<div class="admin-store-logo-wrap">'+(logo?'<img class="admin-store-logo" src="'+logo+'" alt="Nembo ya duka" loading="lazy">':'<div class="admin-store-logo admin-store-placeholder">Hakuna nembo</div>')+'</div></div><div class="detail-grid"><div><small>Jina la duka</small><strong>'+ui().esc(s.store_name||'—')+'</strong></div><div><small>Category</small><strong>'+ui().esc(s.store_category||'—')+'</strong></div><div><small>Maelezo</small><strong>'+ui().esc(s.store_description||'—')+'</strong></div><div><small>Simu ya duka</small><strong>'+ui().esc(s.store_phone||'—')+'</strong></div><div><small>Email ya duka</small><strong>'+ui().esc(s.store_email||'—')+'</strong></div><div><small>Mkoa / Wilaya</small><strong>'+ui().esc([s.store_region,s.store_district].filter(Boolean).join(' / ')||'—')+'</strong></div><div><small>Anuani</small><strong>'+ui().esc(s.store_address||'—')+'</strong></div></div>';
  }
  c().setText('detailFullName',s.full_name||s.name||'—');c().setText('detailBusinessName',s.store_name||'—');
  c().setText('detailEmail',s.email||'—');c().setText('detailPhone',s.phone_number||'—');
  c().setText('detailRole',s.role||'vendor');c().setText('detailRegion',s.region||'—');
  c().setText('detailDistrict',s.district||s.city||'—');c().setText('detailTin',s.tin_number||'—');
  c().setText('detailJoined',ui().date(s.created_at));c().setText('detailVerifyStatus',s.is_verified?'Verified':'Not verified');
  c().setText('sellerDetailsStatus',s.account_status||'active');c().setText('sellerDetailsVerification',s.is_verified?'Verified':'Not verified');
 }
 function initSellers(){
  if(window.__ZUNE_SELLERS_INIT__)return;
  window.__ZUNE_SELLERS_INIT__=true;
  load();
  ['sellerStatusFilter','sellerVerificationFilter'].forEach(id=>document.getElementById(id)?.addEventListener('change',load));
  document.getElementById('sellersTableBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-seller-view]');if(b)details(b.dataset.sellerView);});
  document.getElementById('refreshSellersBtn')?.addEventListener('click',load);
  document.getElementById('backToSellersBtn')?.addEventListener('click',()=>window.ZUNE_ROUTER.show('sellers'));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initSellers,{once:true});else initSellers();
 document.addEventListener('zune:page-changed',e=>{if(e.detail.page==='sellers')load();});
 document.addEventListener('zune:admin-refresh-sellers',load);
 window.ZUNE_SELLERS={load,details,get cache(){return cache;}};

})();