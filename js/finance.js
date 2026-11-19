import {rpc} from './api.js';
import {escapeHtml} from './ui.js';

const money=value=>'TSh '+Number(value||0).toLocaleString('en-TZ',{maximumFractionDigits:2});

export async function render(el){
  el.innerHTML='<div class="empty">Inasoma muhtasari wa fedha…</div>';
  const [settingsResult,walletResult]=await Promise.allSettled([
    rpc('zune_admin_payment_get_settings'),
    rpc('zune_admin_finance_dashboard')
  ]);
  const settings=settingsResult.status==='fulfilled'?settingsResult.value:null;
  const wallet=walletResult.status==='fulfilled'?walletResult.value:null;
  const errors=[];
  if(settingsResult.status==='rejected')errors.push('Payment settings: '+settingsResult.reason.message);
  if(walletResult.status==='rejected')errors.push('Admin wallet: '+walletResult.reason.message);
  const networks=Array.isArray(settings?.networks)?settings.networks:[];
  el.innerHTML=`
    <div class="page-head"><div><h2>Financial Control</h2><p>Muhtasari wa mapato ya ZUNE, commission, salio na hali ya mitandao ya malipo.</p></div></div>
    ${errors.length?`<div class="notice error">${escapeHtml(errors.join(' · '))}</div>`:''}
    <div class="metrics-grid compact-metrics">
      <article class="metric-card"><span>Admin Net Wallet Balance</span><strong>${money(wallet?.available_balance)}</strong></article>
      <article class="metric-card"><span>Jumla ya credits</span><strong>${money(wallet?.total_credits)}</strong></article>
      <article class="metric-card"><span>Jumla ya debits</span><strong>${money(wallet?.total_debits)}</strong></article>
    </div>
    <div class="card"><h3 class="card-title">Payment network readiness</h3>
      ${networks.length?`<div class="table-wrap"><table><thead><tr><th>Mtandao</th><th>Umewezeshwa</th><th>Namba ya biashara</th><th>Merchant/API</th></tr></thead><tbody>
      ${networks.map(n=>'<tr><td>'+escapeHtml(n.display_name||n.code)+'</td><td>'+((n.is_enabled===true)?'Enabled':'Disabled')+'</td><td>'+(n.pay_to_number?'Imewekwa':'Haijawekwa')+'</td><td>'+escapeHtml(n.merchant_status||'—')+'</td></tr>').join('')}
      </tbody></table></div>`:'<div class="notice warn">Hakuna payment provider iliyosanidiwa bado. Weka namba rasmi za biashara na merchant API credentials kabla ya kuwezesha malipo ya simu.</div>'}
    </div>
    <div class="notice warn">Dashboard hii inaonyesha salio kutoka financial ledger. Mfumo haupaswi kuweka malipo kuwa “Imelipwa” mpaka uthibitisho wa muamala au transaction reference uwepo. Usitumie service-role key kwenye browser.</div>
  `;
}
