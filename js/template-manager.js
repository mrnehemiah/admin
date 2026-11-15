(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const db = () => window.zuneSupabase;
  const state = { rows: [], editing: null, busy: false };
  const allowedAudiences = ['customer','seller'];
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const toast = (message, type='info') => window.ZUNE_LAYOUT?.toast?.(message,type);
  const setStatus = (message, ok=false) => {
    const el=$('templateManagerStatus');
    if(el){el.textContent=message;el.className='badge-pill '+(ok?'success':'warning');}
  };
  const audienceLabel = value => value==='seller'?'Seller Storefront':'Customer Marketplace';
  const metaOf = row => ({
    audience: row.config?.audience || row.layout?.audience || 'customer',
    key: row.config?.template_key || row.layout?.template_key || '',
    release: row.config?.release_notes || row.layout?.release_notes || ''
  });
  async function ensureAdmin(){
    if(window.ZUNE_AUTH_READY) await window.ZUNE_AUTH_READY;
    if(!window.ZUNE_CURRENT_USER?.id) throw new Error('Session ya Admin Mkuu haijathibitishwa.');
    const {data,error}=await db().from('profiles').select('role,account_status').eq('id',window.ZUNE_CURRENT_USER.id).maybeSingle();
    if(error) throw error;
    if(data?.role!=='admin'||(data.account_status&&data.account_status!=='active')) throw new Error('Admin Mkuu pekee ndiye anayeruhusiwa kusimamia templates.');
    return window.ZUNE_CURRENT_USER.id;
  }
  async function load(){
    if(state.busy)return;
    state.busy=true;setStatus('Inapakia official template registry…');
    try{
      await ensureAdmin();
      const {data,error}=await db().from('zune_theme_assets')
        .select('id,title,description,preview_url,config,layout,component_code,version,is_featured,status,published_at,updated_at,created_at')
        .eq('asset_kind','theme').eq('scope','official').order('updated_at',{ascending:false});
      if(error)throw error;
      state.rows=data||[];
      render();
      setStatus('Admin Mkuu amethibitishwa · registry imeunganishwa',true);
    }catch(error){
      setStatus('Ufikiaji umefungwa: '+(error.message||'Imeshindikana'));
      $('officialTemplateGrid').innerHTML='<div class="panel template-empty">Imeshindikana kusoma official templates. Hakiki session na RLS ya zune_theme_assets.</div>';
      toast(error.message||'Imeshindikana kupakia templates.','error');
    }finally{state.busy=false;}
  }
  function render(){
    const rows=state.rows;
    const visible=rows.filter(row=>row.status==='published').length;
    $('templateTotalCount').textContent=rows.length;
    $('templatePublishedCount').textContent=visible;
    $('templateHiddenCount').textContent=rows.length-visible;
    const audience=$('templateAudienceFilter').value,status=$('templateStatusFilter').value;
    const filtered=rows.filter(row=>{
      const meta=metaOf(row);
      return (audience==='all'||meta.audience===audience)&&(status==='all'||row.status===status);
    });
    $('officialTemplateGrid').innerHTML=filtered.length?filtered.map(row=>{
      const meta=metaOf(row);
      const statusClass=row.status==='published'?'success':row.status==='hidden'?'danger':'warning';
      const preview=row.preview_url?'<img src="'+escapeHTML(row.preview_url)+'" alt="Preview '+escapeHTML(row.title)+'" loading="lazy">':'<span>ZUNE</span>';
      return '<article class="official-template-card"><div class="official-template-preview">'+preview+'</div><div class="official-template-body"><div class="official-template-head"><div><h3>'+escapeHTML(row.title)+'</h3><span class="official-template-key">'+escapeHTML(meta.key||'template-key-haijawekwa')+'</span></div><span class="badge-pill '+statusClass+'">'+escapeHTML(row.status)+'</span></div><p>'+escapeHTML(row.description||'Hakuna maelezo yaliyowekwa.')+'</p><div class="official-template-meta"><span class="template-tag">'+escapeHTML(audienceLabel(meta.audience))+'</span><span class="template-tag">Version '+Number(row.version||1)+'</span>'+(row.is_featured?'<span class="template-tag">★ Featured</span>':'')+'</div><div class="official-template-actions"><button class="secondary-btn" type="button" data-template-edit="'+row.id+'">Hariri / Update</button><button class="warning-btn" type="button" data-template-toggle="'+row.id+'">'+(row.status==='published'?'Ficha template':'Chapisha template')+'</button></div></div></article>';
    }).join(''):'<div class="panel template-empty">Hakuna template kwenye kichujio hiki. Bonyeza “Ongeza template” kuunda official template.</div>';
  }
  function openEditor(row=null){
    state.editing=row;
    $('officialTemplateForm').reset();
    $('officialTemplateId').value=row?.id||'';
    $('officialTemplateModalTitle').textContent=row?'Hariri official template':'Ongeza official template';
    const meta=row?metaOf(row):{};
    $('officialTemplateAudience').value=meta.audience||'customer';
    $('officialTemplateKey').value=meta.key||'';
    $('officialTemplateTitle').value=row?.title||'';
    $('officialTemplatePreview').value=row?.preview_url||'';
    $('officialTemplateVersion').value=row?.version||1;
    $('officialTemplateStatus').value=row?.status||'published';
    $('officialTemplateDescription').value=row?.description||'';
    $('officialTemplateReleaseNotes').value=meta.release||'';
    $('officialTemplateFeatured').checked=!!row?.is_featured;
    $('officialTemplateReason').value='';
    $('officialTemplateModal').classList.add('show');
    $('officialTemplateModal').setAttribute('aria-hidden','false');
  }
  function closeEditor(){
    $('officialTemplateModal').classList.remove('show');
    $('officialTemplateModal').setAttribute('aria-hidden','true');
  }
  async function writeAudit(actorId,action,rowId,reason,details){
    const {error}=await db().from('admin_activity_logs').insert({
      actor_id:actorId,action,target_type:'official_template',target_id:String(rowId),
      reason,details,result:'success'
    });
    if(error)throw new Error('Template imehifadhiwa lakini audit log imeshindwa: '+error.message);
  }
  async function save(event){
    event.preventDefault();
    const button=$('saveOfficialTemplateBtn');
    if(button.disabled)return;
    button.disabled=true;button.textContent='Inahifadhi…';
    try{
      const actorId=await ensureAdmin();
      const audience=$('officialTemplateAudience').value;
      const key=$('officialTemplateKey').value.trim().toLowerCase();
      const title=$('officialTemplateTitle').value.trim();
      const reason=$('officialTemplateReason').value.trim();
      if(!allowedAudiences.includes(audience))throw new Error('Audience si sahihi.');
      if(!/^[a-z0-9-]{2,40}$/.test(key))throw new Error('Template key itumie herufi ndogo, namba na hyphen pekee.');
      if(title.length<2)throw new Error('Jina la template halijakamilika.');
      if(reason.length<5)throw new Error('Sababu ya mabadiliko lazima iwe na angalau herufi 5.');
      const old=state.editing;
      const version=Math.max(1,Number($('officialTemplateVersion').value)||1);
      const status=$('officialTemplateStatus').value;
      const config={...(old?.config||{}),audience,template_key:key,release_notes:$('officialTemplateReleaseNotes').value.trim(),notify_version:version};
      const payload={
        asset_kind:'theme',scope:'official',owner_id:null,status,title,
        description:$('officialTemplateDescription').value.trim(),
        preview_url:$('officialTemplatePreview').value.trim()||null,
        config,layout:{...(old?.layout||{}),audience,template_key:key},
        component_code:old?.component_code||{},version,is_featured:$('officialTemplateFeatured').checked,
        moderation_note:null,reviewed_by:actorId,reviewed_at:new Date().toISOString(),
        published_at:status==='published'?(old?.published_at||new Date().toISOString()):old?.published_at||null,
        updated_at:new Date().toISOString()
      };
      let saved;
      if(old){
        const {data,error}=await db().from('zune_theme_assets').update(payload).eq('id',old.id).eq('scope','official').select('id,title,status,version').single();
        if(error)throw error;saved=data;
      }else{
        const {data,error}=await db().from('zune_theme_assets').insert(payload).select('id,title,status,version').single();
        if(error)throw error;saved=data;
      }
      await writeAudit(actorId,old?'official_template_updated':'official_template_created',saved.id,reason,{title:saved.title,status:saved.status,version:saved.version,audience,template_key:key,release_notes:config.release_notes});
      toast('Official template imehifadhiwa na audit record imeandikwa.','success');
      closeEditor();await load();
    }catch(error){console.error('Template manager save:',error);toast(error.message||'Imeshindikana kuhifadhi template.','error');}
    finally{button.disabled=false;button.textContent='Hifadhi template';}
  }
  async function toggleStatus(id){
    try{
      const actorId=await ensureAdmin();
      const row=state.rows.find(item=>item.id===id);if(!row)return;
      const next=row.status==='published'?'hidden':'published';
      const reason=window.prompt('Andika sababu ya '+(next==='hidden'?'kuficha':'kuchapisha')+' template hii (angalau herufi 5):');
      if(reason===null)return;
      if(reason.trim().length<5)throw new Error('Sababu lazima iwe na angalau herufi 5.');
      const {error}=await db().from('zune_theme_assets').update({
        status:next,reviewed_by:actorId,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()
      }).eq('id',id).eq('scope','official');
      if(error)throw error;
      await writeAudit(actorId,next==='published'?'official_template_published':'official_template_hidden',id,reason.trim(),{previous_status:row.status,new_status:next,title:row.title});
      toast(next==='published'?'Template imechapishwa.':'Template imefichwa.','success');await load();
    }catch(error){toast(error.message||'Imeshindikana kubadilisha hali ya template.','error');}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    $('newOfficialTemplateBtn')?.addEventListener('click',()=>openEditor());
    $('closeOfficialTemplateModal')?.addEventListener('click',closeEditor);
    $('cancelOfficialTemplateBtn')?.addEventListener('click',closeEditor);
    $('officialTemplateForm')?.addEventListener('submit',save);
    $('refreshOfficialTemplatesBtn')?.addEventListener('click',load);
    $('templateAudienceFilter')?.addEventListener('change',render);
    $('templateStatusFilter')?.addEventListener('change',render);
    $('officialTemplateGrid')?.addEventListener('click',event=>{
      const edit=event.target.closest('[data-template-edit]');
      const toggle=event.target.closest('[data-template-toggle]');
      if(edit)openEditor(state.rows.find(row=>row.id===edit.dataset.templateEdit)||null);
      if(toggle)toggleStatus(toggle.dataset.templateToggle);
    });
    $('officialTemplateModal')?.addEventListener('click',event=>{if(event.target===$('officialTemplateModal'))closeEditor();});
    load();
  });
  document.addEventListener('zune:page-changed',event=>{if(event.detail?.page==='template-manager')load();});
  window.ZUNE_TEMPLATE_MANAGER={refresh:load};
})();
