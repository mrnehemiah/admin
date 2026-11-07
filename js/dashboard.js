(() => {
  'use strict';const C=()=>window.ZUNE_CORE;
  async function load(){const c=C();try{
    const [users,sellers,products,orders]=await Promise.all([
      c.count('profiles'),c.count('profiles',[['role','eq','vendor']]),c.count('products'),c.count('orders')
    ]);
    c.setText('totalUsers',users.toLocaleString());c.setText('totalSellers',sellers.toLocaleString());c.setText('totalProducts',products.toLocaleString());c.setText('totalOrders',orders.toLocaleString());
    c.setText('reportOrders',orders.toLocaleString());c.setText('reportCommission','TZS —');c.setText('totalCommission','TZS —');
    c.setText('totalRevenue','TZS —');c.setText('statSales','TZS —');
    try{const recent=await c.rows('orders',8);c.setRows('recentOrdersBody',recent,[{key:'id'},{key:'status',html:r=>window.ZUNE_LAYOUT.status(r.status)},{key:'created_at',html:r=>window.ZUNE_LAYOUT.date(r.created_at)}]);}catch(e){/* optional dashboard block */}
  }catch(e){c.notice('dashboard',`Takwimu hazijapakiwa: ${e.message}. Hakikisha profiles, products na orders zinaruhusu Admin SELECT.`);}}
  document.addEventListener('DOMContentLoaded',()=>{load();document.addEventListener('zune:admin-refresh',load);});
  document.addEventListener('zune:page-changed',e=>{if(e.detail.page==='dashboard')load();});
  window.ZUNE_DASHBOARD={load};
})();
(() => {
  'use strict';
  const C = () => window.ZUNE_CORE;
  const GO = { totalUsers: 'users', totalSellers: 'sellers', pendingApplications: 'seller-applications', totalProducts: 'products', totalOrders: 'orders', pendingOrders: 'orders', openDisputes: 'disputes', openComplaints: 'disputes', openTickets: 'support-tickets', totalRevenue: 'payments', totalCommission: 'settings' };
  async function extra() {
    const c = C();
    const jobs = [['pendingOrders', 'orders', [['status', 'eq', 'pending']]], ['pendingApplications', 'seller_applications', [['status', 'eq', 'pending']]], ['openDisputes', 'transaction_disputes', [['status', 'eq', 'open']]]];
    await Promise.all(jobs.map(async ([id, table, f]) => { try { c.setText(id, (await c.count(table, f)).toLocaleString()); } catch (e) { c.setText(id, '—'); console.warn('ZUNE stat', id, e.message || e); } }));
  }
  function clickable() {
    Object.entries(GO).forEach(([id, page]) => {
      const el = document.getElementById(id), card = el && (el.closest('article, .stat-card, .metric-card, .card') || el.parentElement);
      if (!card || card.dataset.go) return;
      card.dataset.go = page; card.tabIndex = 0; card.setAttribute('role', 'link'); card.style.cursor = 'pointer';
      const open = () => window.ZUNE_ROUTER.show(page);
      card.addEventListener('click', open);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
  }
  document.addEventListener('DOMContentLoaded', () => { clickable(); extra(); });
  document.addEventListener('zune:admin-refresh', extra);
  document.addEventListener('zune:page-changed', e => { if (e.detail.page === 'dashboard') extra(); });
})();
