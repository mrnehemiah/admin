import {supabase} from './supabase.js';
import {rpc} from './api.js';
import {escapeHtml} from './ui.js';

async function check(component,fn){
  const start=performance.now();let status='healthy',details={};
  try{await fn();}catch(e){status='degraded';details={message:String(e?.message||e).slice(0,240)};}
  const latency=Math.max(0,Math.round(performance.now()-start));
  try{await rpc('admin_record_system_health_check',{p_component:component,p_status:status,p_latency_ms:latency,p_details:details});}
  catch(e){console.warn('Health log haijahifadhiwa:',component,e.message);}
  return {component,status,latency,details};
}
export async function render(el){
  el.innerHTML='<div class="empty">Inapima system health…</div>';
  const checks=await Promise.all([
    check('database',async()=>{const r=await supabase.from('profiles').select('id',{head:true,count:'exact'});if(r.error)throw r.error;}),
    check('authentication',async()=>{const r=await supabase.auth.getSession();if(r.error)throw r.error;if(!r.data?.session?.user)throw new Error('Hakuna active Admin session.');}),
    check('admin_authorization',async()=>{const d=await rpc('admin_security_posture_overview');if(!d?.single_admin_ok)throw new Error('Single Admin Mkuu invariant inahitaji ukaguzi.');}),
    check('marketplace_data_api',async()=>{const [o,p]=await Promise.all([supabase.from('orders').select('id',{head:true,count:'exact'}),supabase.from('products').select('id',{head:true,count:'exact'})]);if(o.error)throw o.error;if(p.error)throw p.error;})
  ]);
  const labels={database:'Database / Data API',authentication:'Supabase Auth',admin_authorization:'Admin authorization',marketplace_data_api:'Marketplace Data API'};
  el.innerHTML='<div class="page-head"><div><h2>System Health</h2><p>Vipimo vya Data API, Auth, Admin authorization na Marketplace Data API.</p></div><button class="btn" id="health-refresh">↻ Refresh</button></div><div class="grid section-grid">'+checks.map(r=>'<div class="card"><span class="badge '+(r.status==='healthy'?'green':'red')+'">'+escapeHtml(r.status.toUpperCase())+'</span><h3>'+escapeHtml(labels[r.component])+'</h3><p class="small muted">'+escapeHtml(r.latency+' ms'+(r.details.message?' · '+r.details.message:''))+'</p></div>').join('')+'</div><div class="notice warn" style="margin-top:16px">Matokeo yamehifadhiwa kwenye system_health_logs kupitia Admin-only RPC. Haya si kipimo cha cloud uptime, Storage, Edge Functions au uthibitisho wa backup restore.</div>';
  el.querySelector('#health-refresh').onclick=()=>render(el);
}