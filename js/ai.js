import {rpc} from './api.js';
import {escapeHtml} from './ui.js';

const money=v=>'TSh '+Number(v||0).toLocaleString('en-TZ',{maximumFractionDigits:2});
const num=v=>Number(v||0).toLocaleString('en-TZ');

export async function render(el){
  el.innerHTML='<div class="empty">ZUNE Intelligence inachambua taarifa za mfumo…</div>';
  try{
    const [ops,security]=await Promise.all([rpc('admin_intelligence_overview'),rpc('admin_security_posture_overview')]);
    const insights=[];
    if(Number(security.risk_score||0)>=50)insights.push({level:'high',title:'Operational risk imepanda',body:'Risk score ni '+security.risk_score+'/100. Pitia sababu zilizoainishwa kwenye Security Center kabla ya kufanya mabadiliko.'});
    if(Number(security.public_tables_rls_disabled||0)>0)insights.push({level:'critical',title:'Public tables zenye RLS OFF',body:Number(security.public_tables_rls_disabled)+' tables zinahitaji ukaguzi wa access policy.'});
    if(Number(security.public_security_definer_anon_count||0)>0)insights.push({level:'high',title:'Public RPC review',body:Number(security.public_security_definer_anon_count)+' SECURITY DEFINER RPC zinaweza kuitwa na anon. Kagua kila function dhidi ya matumizi ya marketplace.'});
    if(Number(ops.verifications_pending||0)>0)insights.push({level:'medium',title:'Verification queue',body:num(ops.verifications_pending)+' maombi yanasubiri ukaguzi wa Admin.'});
    if(Number(ops.seller_applications_pending||0)>0)insights.push({level:'medium',title:'Seller onboarding',body:num(ops.seller_applications_pending)+' maombi ya Seller yanasubiri hatua.'});
    if(Number(ops.disputes_open||0)>0)insights.push({level:'high',title:'Transaction disputes',body:num(ops.disputes_open)+' disputes bado ziko wazi; kagua ushahidi na muda wa majibu.'});
    if(Number(ops.deliveries_payout_on_hold||0)>0)insights.push({level:'medium',title:'Driver payout holds',body:num(ops.deliveries_payout_on_hold)+' malipo ya dereva yamesimamishwa kutokana na dispute.'});
    if(Number(ops.withdrawals_pending||0)>0)insights.push({level:'medium',title:'Withdrawals pending',body:num(ops.withdrawals_pending)+' withdrawal requests zinasubiri review.'});
    if(Number(ops.ai_errors_30d||0)>0)insights.push({level:'medium',title:'AI service errors',body:num(ops.ai_errors_30d)+' errors zimeonekana ndani ya siku 30.'});
    if(!ops.latest_health_check)insights.push({level:'medium',title:'System health evidence haipo',body:'Hakuna health check iliyorekodiwa bado. Fungua System Health baada ya kuingia kama Admin.'});
    if(!ops.latest_backup)insights.push({level:'high',title:'Backup evidence haipo',body:'Hakuna backup/recovery log iliyorekodiwa. Hakikisha backup na restore test zinafanyika kupitia Supabase Dashboard/CLI.'});
    if(!insights.length)insights.push({level:'low',title:'Hakuna tahadhari kutoka signals zilizopo',body:'Endelea kufuatilia taarifa mpya. Hii si uthibitisho wa kutokuwepo kwa hatari zote.'});
    const cards=[
      ['Operational risk',String(security.risk_score??'—')+'/100 · '+String(security.risk_level||'unknown').toUpperCase()],
      ['New users (period)',num(ops.users_new_period)],
      ['Orders (period)',num(ops.orders_period)],
      ['Completed order value',money(ops.gross_completed_orders_period_tzs)],
      ['Confirmed payments recorded',money(ops.payments_paid_period_tzs)],
      ['Driver payouts paid',money(ops.driver_payouts_paid_period_tzs)],
      ['AI requests (30d)',num(ops.ai_requests_30d)],
      ['AI errors (30d)',num(ops.ai_errors_30d)]
    ];
    el.innerHTML='<div class="page-head"><div><h2>ZUNE Operational Intelligence</h2><p>Uchambuzi wa kanuni kutoka Admin Intelligence na Security Posture RPC. Hakuna AI provider key inayotumika.</p></div><span class="pill">RULE-BASED ANALYTICS</span></div><div class="grid section-grid">'+cards.map(([k,v])=>'<div class="card"><div class="stat-label">'+escapeHtml(k)+'</div><div class="stat-value">'+escapeHtml(v)+'</div></div>').join('')+'</div><div class="card" style="margin-top:16px"><h3 class="card-title">Recommendations</h3><div id="zuneIntelRecommendations"></div></div><div class="notice warn" style="margin-top:16px">Mapendekezo ni ya kusaidia ukaguzi tu. Mfumo hautafanya refunds, payouts, account blocks, verification approvals au mabadiliko ya sera moja kwa moja.</div>';
    const host=el.querySelector('#zuneIntelRecommendations');
    insights.forEach(item=>{const row=document.createElement('div');row.className='list-row';const strong=document.createElement('strong');strong.textContent=item.level.toUpperCase()+' · '+item.title;const p=document.createElement('p');p.className='small muted';p.textContent=item.body;row.append(strong,p);host.appendChild(row);});
  }catch(e){
    el.innerHTML='<div class="notice error">Operational Intelligence haijapakia: '+escapeHtml(e.message||e)+'</div><p class="small muted">Hakuna demo data itakayoonyeshwa kama taarifa halisi.</p>';
  }
}
