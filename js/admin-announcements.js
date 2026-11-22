(() => {
  'use strict';
  const db = () => window.ZUNE_CORE?.db?.();
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '—').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const audience = value => value === 'buyers' ? 'Wanunuzi pekee' : value === 'vendors' ? 'Wauzaji pekee' : value === 'drivers' ? 'Madereva pekee' : 'Wote (Wanunuzi, Wauzaji na Madereva)';
  const priority = value => ({low:'Chini',normal:'Kawaida',high:'Juu',urgent:'Dharura'}[value] || value || 'Kawaida');
  let busy = false;
  function mount() {
    const section = document.querySelector('[data-section="announcements"]');
    if (!section || section.dataset.announcementMounted === '1') return;
    section.dataset.announcementMounted = '1';
    section.innerHTML = `
      <div class="section-intro"><div><h2>Matangazo kwa Watumiaji</h2><p>Tuma taarifa rasmi kwa Wanunuzi, Wauzaji, Madereva au makundi yote. Hii ni tofauti na Sponsored Ads.</p></div><span class="badge-pill success">NOTIFICATION PEKEE</span></div>
      <div class="form-grid" style="align-items:start">
        <div class="panel"><h3>Tuma tangazo jipya</h3><p class="muted">Kila akaunti hai inayolengwa itapokea notification yake binafsi.</p>
          <form id="adminAnnouncementForm">
            <div class="form-field"><label for="annAudience">Walengwa</label><select id="annAudience" name="audience" required><option value="all">Wote — Wanunuzi, Wauzaji na Madereva</option><option value="buyers">Wanunuzi pekee</option><option value="vendors">Wauzaji pekee</option><option value="drivers">Madereva pekee</option></select></div>
            <div class="form-grid"><div class="form-field"><label for="annTitleSw">Kichwa (Kiswahili)</label><input id="annTitleSw" name="title_sw" maxlength="160" required></div><div class="form-field"><label for="annTitleEn">Title (English) — hiari</label><input id="annTitleEn" name="title_en" maxlength="160"></div></div>
            <div class="form-field"><label for="annBodySw">Ujumbe (Kiswahili)</label><textarea id="annBodySw" name="body_sw" rows="4" maxlength="3000" required></textarea></div>
            <div class="form-field"><label for="annBodyEn">Message (English) — hiari</label><textarea id="annBodyEn" name="body_en" rows="3" maxlength="3000"></textarea></div>
            <div class="form-grid"><div class="form-field"><label for="annPriority">Kipaumbele</label><select id="annPriority" name="priority"><option value="normal">Kawaida</option><option value="low">Chini</option><option value="high">Juu</option><option value="urgent">Dharura</option></select></div><div class="form-field"><label for="annExpiry">Muda wa kuisha — hiari</label><input id="annExpiry" name="expires_at" type="datetime-local"></div></div>
            <div class="form-field"><label for="annActionUrl">Kiungo cha kufungua — hiari</label><input id="annActionUrl" name="action_url" type="url" maxlength="1000" placeholder="https://..."></div>
            <div class="action-row" style="margin-top:14px"><button class="primary-btn" id="annSendBtn" type="submit">Tuma Notification</button><button class="secondary-btn" type="reset">Futa fomu</button></div><p class="muted" id="annFormMessage" role="status"></p>
          </form>
        </div>
        <div class="panel"><h3>Ufafanuzi wa walengwa</h3><p><b>Wanunuzi:</b> akaunti hai zenye role ya buyer.</p><p><b>Wauzaji:</b> akaunti hai zenye role ya vendor.</p><p><b>Madereva:</b> akaunti hai zenye role ya driver.</p><p><b>Wote:</b> wanunuzi, wauzaji na madereva wenye akaunti hai. Admin hawajumuishwi.</p><div class="notice-box">Supabase inathibitisha Admin Mkuu kabla ya kutuma. Mfumo huu hauundi wala kubadilisha Sponsored Ads, coupons, promotions au promotional slides.</div></div>
      </div>
      <div class="panel" style="margin-top:18px"><div class="section-intro"><div><h3>Historia ya matangazo</h3><p>Notification zilizochapishwa pekee.</p></div><button class="secondary-btn" id="annRefreshBtn" type="button">Refresh</button></div>
        <div class="table-wrap"><table><thead><tr><th>Kichwa / Ujumbe</th><th>Walengwa</th><th>Kipaumbele</th><th>Hali</th><th>Tarehe</th><th>Inaisha</th></tr></thead><tbody id="annHistoryBody"><tr><td colspan="6" class="empty-state">Inapakia...</td></tr></tbody></table></div></div>`;
    $('adminAnnouncementForm').addEventListener('submit', send);
    $('annRefreshBtn').addEventListener('click', loadHistory);
  }
  async function loadHistory() {
    const body = $('annHistoryBody'); if (!body) return;
    try {
      if (window.ZUNE_AUTH_READY) await window.ZUNE_AUTH_READY;
      const {data,error} = await db().from('admin_announcements').select('id,title,message,audience,display_type,priority,status,created_at,expires_at').eq('display_type','notification').order('created_at',{ascending:false}).limit(100);
      if (error) throw error;
      body.innerHTML = data?.length ? data.map(x => `<tr><td><b>${esc(x.title)}</b><div class="muted">${esc(x.message)}</div></td><td>${esc(audience(x.audience))}</td><td>${esc(priority(x.priority))}</td><td><span class="badge-pill">${esc(x.status)}</span></td><td>${esc(x.created_at ? new Date(x.created_at).toLocaleString() : '—')}</td><td>${esc(x.expires_at ? new Date(x.expires_at).toLocaleString() : 'Hakuna')}</td></tr>`).join('') : '<tr><td colspan="6" class="empty-state">Bado hakuna tangazo la notification.</td></tr>';
    } catch (e) { body.innerHTML = `<tr><td colspan="6" class="empty-state">Imeshindikana kupakia historia: ${esc(e.message || e)}</td></tr>`; }
  }
  async function send(event) {
    event.preventDefault(); if (busy) return;
    const form=event.currentTarget, btn=$('annSendBtn'), msg=$('annFormMessage'), fd=new FormData(form);
    if (!String(fd.get('title_sw')||'').trim() || !String(fd.get('body_sw')||'').trim()) { msg.textContent='Jaza kichwa na ujumbe kwa Kiswahili.'; return; }
    busy=true;btn.disabled=true;btn.textContent='Inatuma...';msg.textContent='';
    try {
      if (window.ZUNE_AUTH_READY) await window.ZUNE_AUTH_READY;
      const expiry=fd.get('expires_at');
      const {data,error}=await db().rpc('admin_publish_announcement',{
        p_title_sw:String(fd.get('title_sw')).trim(),p_body_sw:String(fd.get('body_sw')).trim(),p_audience:fd.get('audience'),
        p_title_en:String(fd.get('title_en')||'').trim()||null,p_body_en:String(fd.get('body_en')||'').trim()||null,
        p_priority:fd.get('priority')||'normal',p_expires_at:expiry?new Date(expiry).toISOString():null,p_action_url:String(fd.get('action_url')||'').trim()||null
      });
      if(error)throw error;if(!data?.success)throw new Error(data?.message||'Backend haikuthibitisha kutumwa.');
      msg.textContent=`Tangazo limetumwa kwa akaunti ${Number(data.recipients||0).toLocaleString()}.`;
      window.ZUNE_LAYOUT?.toast?.(msg.textContent,'success');form.reset();await loadHistory();
    } catch(e) { msg.textContent='Tangazo halikutumwa: '+(e.message||e);window.ZUNE_LAYOUT?.toast?.(msg.textContent,'error'); }
    finally { busy=false;btn.disabled=false;btn.textContent='Tuma Notification'; }
  }
  document.addEventListener('DOMContentLoaded',()=>{
    mount();
    document.addEventListener('zune:page-changed',e=>{if(e.detail?.page==='announcements')loadHistory();});
    document.addEventListener('zune:admin-refresh',()=>{if(window.ZUNE_ROUTER?.current==='announcements')loadHistory();});
    if(location.hash==='#announcements')loadHistory();
  });
})();