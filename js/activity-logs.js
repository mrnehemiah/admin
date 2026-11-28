(() => {
  'use strict';
  const core=()=>window.ZUNE_CORE, ui=()=>window.ZUNE_LAYOUT;
  const state={rows:[],loading:false};
  const $=id=>document.getElementById(id);
  const value=(v)=>String(v??'').trim();
  const categoryOf=row=>{
    const s=(value(row.target_type)+' '+value(row.action)).toLowerCase();
    if(/seller|vendor|application/.test(s))return 'seller';
    if(/badge|verif/.test(s))return 'badge';
    if(/wallet|payment|payout|refund|commission|finance|withdraw/.test(s))return 'finance';
    if(/security|login|role|permission|block|suspend|access/.test(s))return 'security';
    if(/setting|system|config|category|announcement|template/.test(s))return 'system';
    return 'user';
  };
  async function attachActors(rows){
    const ids=[...new Set(rows.map(r=>r.actor_id).filter(Boolean))];
    if(!ids.length)return rows;
    try{
      const {data,error}=await core().db().from('profiles').select('id,full_name,email').in('id',ids);
      if(error)throw error;
      const names=new Map((data||[]).map(p=>[p.id,p.full_name||p.email||p.id]));
      return rows.map(r=>({...r,actor_name:names.get(r.actor_id)||r.actor_id||'System'}));
    }catch(e){return rows.map(r=>({...r,actor_name:r.actor_id||'System'}));}
  }
  const detailsOf=row=>{
    const d=row.details&&typeof row.details==='object'?row.details:{};
    const before=d.before??d.previous??d.old_value??d.previous_status;
    const after=d.after??d.new_value??d.new_status;
    if(before!==undefined||after!==undefined)return 'Kabla: '+JSON.stringify(before??'—')+' | Baada: '+JSON.stringify(after??'—');
    return Object.keys(d).length?JSON.stringify(d):'—';
  };
  function filtered(){
    const q=value($('auditSearch')?.value).toLowerCase();
    const cat=value($('auditFilter')?.value);
    const result=value($('auditResultFilter')?.value).toLowerCase();
    const target=value($('auditTargetFilter')?.value).toLowerCase();
    return state.rows.filter(r=>{
      if(cat&&categoryOf(r)!==cat)return false;
      if(result&&value(r.result||'recorded').toLowerCase()!==result)return false;
      if(target&&value(r.target_type).toLowerCase()!==target)return false;
      if(!q)return true;
      return [r.action,r.actor_name,r.actor_id,r.target_type,r.target_id,r.reason,JSON.stringify(r.details||{}),r.result]
        .join(' ').toLowerCase().includes(q);
    });
  }
  function render(){
    const rows=filtered();
    core().setRows('adminAuditLogsBody',rows.map(r=>({...r,_details:detailsOf(r)})),[
      {key:'action',html:r=>'<strong>'+ui().esc(r.action||'—')+'</strong>'},
      {key:'actor_name'},
      {key:'target_type',html:r=>ui().esc((r.target_type||'—')+(r.target_id?' · '+r.target_id:''))},
      {key:'reason',html:r=>ui().esc(r.reason||'—')},
      {key:'_details',html:r=>'<span class="audit-detail" title="'+ui().esc(r._details)+'">'+ui().esc(r._details)+'</span>'},
      {key:'created_at',html:r=>ui().date(r.created_at)},
      {key:'result',html:r=>ui().status(r.result||'recorded')}
    ],'Hakuna audit records zinazolingana na utafutaji wako.');
    core().setText('auditVisibleCount',rows.length+' / '+state.rows.length+' rekodi');
    core().setText('auditTotalCount',state.rows.length.toLocaleString());
    core().setText('auditSuccessCount',state.rows.filter(r=>/success|recorded|completed|approved/i.test(r.result||'recorded')).length.toLocaleString());
    core().setText('auditFailedCount',state.rows.filter(r=>/fail|error|denied/i.test(r.result||'')).length.toLocaleString());
    core().setText('auditLatestAt',state.rows[0]?.created_at?ui().date(state.rows[0].created_at):'—');
    renderRecent();
  }
  function renderRecent(){
    const rows=state.rows.slice(0,10);
    core().setRows('recentAdminActivityBody',rows,[
      {key:'action',html:r=>'<strong>'+ui().esc(r.action||'—')+'</strong>'},
      {key:'actor_name',html:r=>ui().esc(r.actor_name||r.actor_id||'System')},
      {key:'created_at',html:r=>ui().date(r.created_at)},
      {key:'target_type',html:r=>ui().esc((r.target_type||'—')+(r.target_id?' · '+r.target_id:''))}
    ],'Hakuna matukio ya Admin yaliyorekodiwa bado.');
  }
  async function load(){
    if(state.loading)return;
    state.loading=true;
    try{
      const rows=await core().rows(core().cfg.TABLES.activityLogs||'admin_activity_logs',500);
      state.rows=await attachActors(rows);
      render();
      const target=$('auditTargetFilter');
      if(target){
        const selected=target.value;
        const types=[...new Set(state.rows.map(r=>value(r.target_type)).filter(Boolean))].sort();
        target.innerHTML='<option value="">Aina zote za target</option>'+types.map(t=>'<option value="'+ui().esc(t)+'">'+ui().esc(t)+'</option>').join('');
        target.value=types.includes(selected)?selected:'';
      }
      core().setText('auditLoadState','Imeunganishwa · rekodi 500 za karibuni zaidi');
    }catch(e){
      core().error('adminAuditLogsBody',e);
      core().setText('auditLoadState','Imeshindikana kuunganisha audit logs');
      ui().toast('Audit logs hazijapakiwa: '+(e.message||e),'error');
    }finally{state.loading=false;}
  }
  function bind(){
    ['auditSearch','auditFilter','auditResultFilter','auditTargetFilter'].forEach(id=>{
      const el=$(id);if(el&&!el.dataset.auditBound){el.dataset.auditBound='1';el.addEventListener('input',render);el.addEventListener('change',render);}
    });
    $('refreshAuditBtn')?.addEventListener('click',load);
    $('exportAuditBtn')?.addEventListener('click',()=>{
      const rows=filtered();
      const cols=['action','actor_name','actor_id','target_type','target_id','reason','details','result','created_at'];
      const csv=[cols.join(','),...rows.map(r=>cols.map(k=>{
        const v=k==='details'?JSON.stringify(r.details||{}):r[k]??'';
        return '"'+String(v).replace(/"/g,'""')+'"';
      }).join(','))].join('\r\n');
      const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='zune-admin-activity-'+new Date().toISOString().slice(0,10)+'.csv';a.click();URL.revokeObjectURL(url);
    });
  }
  document.addEventListener('DOMContentLoaded',()=>{bind();load();});
  document.addEventListener('zune:page-changed',e=>{if(e.detail?.page==='audit-logs')load();});
  document.addEventListener('zune:admin-refresh',load);
  window.ZUNE_ACTIVITY_LOGS={load,loadRecent:load,refresh:load};
})();