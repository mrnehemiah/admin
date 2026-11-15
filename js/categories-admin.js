(() => {
  'use strict';
  const c=()=>window.ZUNE_CORE, ui=()=>window.ZUNE_LAYOUT, $=id=>document.getElementById(id);
  let categories=[], products=[], loading=false;
  const esc=v=>ui().esc(v==null?'':String(v));
  const nameOf=x=>x.name||x.title||x.category_name||x.label||x.name_sw||x.name_en||'Category bila jina';
  const slugOf=x=>x.slug||x.category_slug||x.code||'—';
  const activeOf=x=>x.is_active??x.active??(x.status==null?true:!['disabled','inactive','archived','deleted'].includes(String(x.status).toLowerCase()));
  function productCount(cat){
    const id=String(cat.id??'');
    const name=String(nameOf(cat)).toLowerCase();
    const slug=String(slugOf(cat)).toLowerCase();
    return products.filter(p=>String(p.category_id??'')===id || String(p.category??'').toLowerCase()===name || String(p.category_slug??'').toLowerCase()===slug).length;
  }
  function render(){
    const q=($('categoriesSearch')?.value||'').trim().toLowerCase();
    const rows=categories.filter(x=>[nameOf(x),slugOf(x),x.status,x.description].some(v=>String(v||'').toLowerCase().includes(q)));
    const body=$('categoriesTableBody'); if(!body)return;
    body.innerHTML=rows.length?rows.map(x=>{
      const active=activeOf(x),count=productCount(x);
      return '<tr><td><strong>'+esc(nameOf(x))+'</strong><small style="display:block;color:var(--muted)">'+esc(x.description||'')+'</small></td><td>'+esc(slugOf(x))+'</td><td>'+count.toLocaleString()+'</td><td><span class="badge-pill '+(active?'success':'warning')+'">'+(active?'Active':'Inactive')+'</span></td><td><button class="secondary-btn" type="button" data-category-view="'+esc(x.id??'')+'">Maelezo</button></td></tr>';
    }).join(''):'<tr><td colspan="5" class="empty-state">Hakuna categories zinazolingana.</td></tr>';
    c().setText('categoryTotalCount',categories.length.toLocaleString());
    c().setText('categoryActiveCount',categories.filter(activeOf).length.toLocaleString());
    c().setText('categoryProductCount',products.length.toLocaleString());
  }
  function showDetails(cat){
    const lines=Object.entries(cat).filter(([k,v])=>v!==null&&v!==undefined&&typeof v!=='object'&& !/created_by|updated_by/i.test(k));
    const modal=document.createElement('div');modal.className='modal-backdrop show';
    modal.innerHTML='<div class="modal-card" role="dialog" aria-modal="true"><div class="modal-heading"><h3>'+esc(nameOf(cat))+'</h3><button class="icon-btn" type="button" data-close>×</button></div><div class="detail-grid">'+lines.map(([k,v])=>'<div><small>'+esc(k.replace(/_/g,' '))+'</small><strong>'+esc(v)+'</strong></div>').join('')+'</div><p class="muted">Hii ni taarifa iliyopo kwenye database. Uhariri wa category utawezeshwa baada ya kuthibitisha RPC salama ya Admin.</p></div>';
    document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('[data-close]'))modal.remove();});
  }
  async function load(){
    if(loading)return;loading=true;
    const body=$('categoriesTableBody');if(body)body.innerHTML='<tr><td colspan="5" class="empty-state">Inapakia categories...</td></tr>';
    try{
      const [catRows,productRows]=await Promise.all([c().rows('product_categories',500,null),c().rows('products',1000,null)]);
      categories=catRows;products=productRows;render();
    }catch(e){if(body)body.innerHTML='<tr><td colspan="5" class="empty-state">Imeshindikana kupakia categories: '+esc(e.message||e)+'</td></tr>';console.warn('ZUNE categories load error',e);}
    finally{loading=false;}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    $('categoriesSearch')?.addEventListener('input',render);
    $('refreshCategoriesBtn')?.addEventListener('click',load);
    $('categoriesTableBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-category-view]');if(!b)return;const row=categories.find(x=>String(x.id??'')===b.dataset.categoryView);if(row)showDetails(row);});
    $('addCategoryBtn')?.setAttribute('disabled','disabled');
    $('addCategoryBtn')?.setAttribute('title','Create/edit itafunguliwa baada ya kuthibitisha schema na Admin RPC salama.');
    load();
  });
  document.addEventListener('zune:page-changed',e=>{if(e.detail.page==='categories')load();});
  document.addEventListener('zune:admin-refresh',()=>{if(window.ZUNE_ROUTER?.current==='categories')load();});
  window.ZUNE_CATEGORIES={load};
})();