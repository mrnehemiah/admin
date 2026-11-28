(() => {
  'use strict';
  const c=()=>window.ZUNE_CORE, ui=()=>window.ZUNE_LAYOUT, db=()=>window.zuneSupabase, $=id=>document.getElementById(id);
  let categories=[],products=[],loading=false,formBusy=false;
  const esc=v=>ui().esc(v==null?'':String(v));
  const nameOf=x=>x.name||x.title||x.category_name||x.label||x.name_sw||x.name_en||'Category bila jina';
  const slugOf=x=>x.slug||x.category_slug||x.code||'—';
  const activeOf=x=>x.is_active??x.active??(x.status==null?true:!['disabled','inactive','archived','deleted'].includes(String(x.status).toLowerCase()));
  function productCount(cat){
    const id=String(cat.id??''),name=String(nameOf(cat)).toLowerCase(),slug=String(slugOf(cat)).toLowerCase();
    return products.filter(p=>String(p.category_id??'')===id||String(p.category??'').toLowerCase()===name||String(p.category_slug??'').toLowerCase()===slug).length;
  }
  function render(){
    const q=($('categoriesSearch')?.value||'').trim().toLowerCase();
    const rows=categories.filter(x=>[nameOf(x),slugOf(x),x.status,x.description].some(v=>String(v||'').toLowerCase().includes(q)));
    const body=$('categoriesTableBody');if(!body)return;
    body.innerHTML=rows.length?rows.map(x=>{
      const active=activeOf(x),count=productCount(x),parent=categories.find(p=>String(p.id)===String(x.parent_id));
      return '<tr><td><strong>'+esc(nameOf(x))+'</strong><small style="display:block;color:var(--muted)">'+(parent?'↳ Subcategory ya '+esc(nameOf(parent)):'Main category')+'</small></td><td>'+esc(slugOf(x))+'</td><td>'+count.toLocaleString()+'</td><td><span class="badge-pill '+(active?'success':'warning')+'">'+(active?'Active':'Inactive')+'</span></td><td><div class="action-row"><button class="secondary-btn" type="button" data-category-edit="'+esc(x.id)+'">Edit</button><button class="secondary-btn" type="button" data-category-view="'+esc(x.id)+'">Details</button></div></td></tr>';
    }).join(''):'<tr><td colspan="5" class="empty-state">Hakuna categories zinazolingana.</td></tr>';
    c().setText('categoryTotalCount',categories.length.toLocaleString());
    c().setText('categoryActiveCount',categories.filter(activeOf).length.toLocaleString());
    c().setText('categoryProductCount',products.length.toLocaleString());
  }
  function closeEditor(){document.getElementById('categoryEditorModal')?.remove();}
  function showDetails(cat){
    const lines=Object.entries(cat).filter(([k,v])=>v!==null&&v!==undefined&&typeof v!=='object'&&!/created_by|updated_by/i.test(k));
    const modal=document.createElement('div');modal.className='modal-backdrop show';
    modal.innerHTML='<div class="modal-card" role="dialog" aria-modal="true"><div class="modal-heading"><h3>'+esc(nameOf(cat))+'</h3><button class="icon-btn" type="button" data-close>×</button></div><div class="detail-grid">'+lines.map(([k,v])=>'<div><small>'+esc(k.replace(/_/g,' '))+'</small><strong>'+esc(v)+'</strong></div>').join('')+'</div></div>';
    document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('[data-close]'))modal.remove();});
  }
  function openEditor(cat=null){
    closeEditor();
    const modal=document.createElement('div');modal.id='categoryEditorModal';modal.className='modal-backdrop show';
    const parents=categories.filter(x=>!x.parent_id&&String(x.id)!==String(cat?.id||''));
    modal.innerHTML='<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="categoryEditorTitle"><div class="modal-heading"><h3 id="categoryEditorTitle">'+(cat?'Edit Category':'Add Category / Subcategory')+'</h3><button class="icon-btn" type="button" data-close>×</button></div><form id="categoryEditorForm" class="form-grid">'+
      '<label>Category name<input id="categoryNameInput" maxlength="80" minlength="2" required value="'+esc(nameOf(cat||{}))+'"></label>'+
      '<label>Slug<input id="categorySlugInput" maxlength="100" pattern="[a-z0-9]+(-[a-z0-9]+)*" required value="'+esc(cat?.slug||'')+'"></label>'+
      '<label>Parent category<select id="categoryParentInput"><option value="">Main category</option>'+parents.map(p=>'<option value="'+esc(p.id)+'" '+(String(cat?.parent_id||'')===String(p.id)?'selected':'')+'>'+esc(nameOf(p))+'</option>').join('')+'</select></label>'+
      '<label>Image URL (optional)<input id="categoryImageInput" type="url" maxlength="2048" value="'+esc(cat?.image_url||'')+'" placeholder="https://..."></label>'+
      '<label>Sort order<input id="categorySortInput" type="number" min="0" max="100000" step="1" value="'+Number(cat?.sort_order||0)+'"></label>'+
      '<label class="checkbox-label"><input id="categoryActiveInput" type="checkbox" '+(cat?activeOf(cat)?'checked':'': 'checked')+'> Active</label>'+
      '<div class="action-row form-actions"><button class="secondary-btn" type="button" data-close>Cancel</button><button class="primary-btn" type="submit">'+(cat?'Save changes':'Create category')+'</button></div>'+
      '<p id="categoryEditorError" class="form-error" role="alert"></p></form></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('[data-close]'))closeEditor();});
    const name=$('categoryNameInput'),slug=$('categorySlugInput');let slugTouched=!!cat?.slug;
    slug?.addEventListener('input',()=>{slugTouched=true;});
    name?.addEventListener('input',()=>{if(!slugTouched)slug.value=name.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');});
    $('categoryEditorForm')?.addEventListener('submit',async e=>{
      e.preventDefault();if(formBusy)return;
      const p_name=name.value.trim(),p_slug=slug.value.trim(),p_parent_id=$('categoryParentInput').value||null,p_image_url=$('categoryImageInput').value.trim()||null,p_sort_order=Number($('categorySortInput').value||0),p_is_active=$('categoryActiveInput').checked;
      const error=$('categoryEditorError'),button=$('categoryEditorForm').querySelector('[type="submit"]');
      if(!p_name||!p_slug){error.textContent='Jaza jina na slug sahihi.';return;}
      formBusy=true;button.disabled=true;button.textContent='Saving...';error.textContent='';
      try{
        const rpc=cat?'admin_update_category':'admin_create_category';
        const args={p_name,p_slug,p_parent_id,p_image_url,p_sort_order,p_is_active};
        if(cat)args.p_id=cat.id;
        const {data,error:rpcError}=await db().rpc(rpc,args);
        if(rpcError)throw rpcError;
        if(!data?.success)throw new Error(data?.message||'Category save failed.');
        closeEditor();ui().toast(cat?'Category updated.':'Category created.','success');await load();
      }catch(err){console.error('Category save:',err);error.textContent=err.message||'Imeshindikana kuhifadhi category.';ui().toast(error.textContent,'error');}
      finally{formBusy=false;if(button){button.disabled=false;button.textContent=cat?'Save changes':'Create category';}}
    });
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
    $('addCategoryBtn')?.addEventListener('click',()=>openEditor());
    $('categoriesTableBody')?.addEventListener('click',e=>{
      const edit=e.target.closest('[data-category-edit]');if(edit){const row=categories.find(x=>String(x.id)===edit.dataset.categoryEdit);if(row)openEditor(row);return;}
      const view=e.target.closest('[data-category-view]');if(view){const row=categories.find(x=>String(x.id)===view.dataset.categoryView);if(row)showDetails(row);}
    });
    load();
  });
  document.addEventListener('zune:page-changed',e=>{if(e.detail.page==='categories')load();});
  document.addEventListener('zune:admin-refresh',()=>{if(window.ZUNE_ROUTER?.current==='categories')load();});
  window.ZUNE_CATEGORIES={load};
})();