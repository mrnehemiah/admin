(() => {
  'use strict';
  const C = () => window.ZUNE_CORE, U = () => window.ZUNE_LAYOUT, A = () => window.ZUNE_ACTIONS, $ = id => document.getElementById(id);
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const S = { page: 1, size: 25, total: 0, rows: [], transitions: null, bound: false };

  async function transitions() {
    if (S.transitions) return S.transitions;
    const { data, error } = await C().db().from('zune_order_transitions').select('from_status,to_status');
    if (error) throw error;
    S.transitions = data.reduce((m, r) => ((m[r.from_status] = m[r.from_status] || []).push(r.to_status), m), {});
    return S.transitions;
  }
  function fail(e) {
    const denied = e.code === '42501' || /permission denied|row-level security/i.test(e.message || '');
    $('ordersTableBody').innerHTML = `<tr><td colspan="7" class="empty-state">${U().esc(denied ? 'Huna ruhusa ya kusoma orders (RLS).' : 'Imeshindikana kupakia orders: ' + (e.message || e))} <button type="button" class="zd-btn" id="ordersRetry">Jaribu tena</button></td></tr>`;
  }
  function render(term) {
    const u = U();
    const rows = !term || UUID.test(term) ? S.rows : S.rows.filter(r => JSON.stringify(r).toLowerCase().includes(term.toLowerCase()));
    $('ordersTableBody').innerHTML = rows.length ? rows.map(x => `<tr><td>${u.esc(x.id)}</td><td>${u.esc(x.buyer_id ?? '—')}</td><td>${u.esc(x.seller_id ?? x.vendor_id ?? '—')}</td><td>${u.money(x.total_price)}</td><td>${u.status(x.status)}</td><td>${u.date(x.created_at)}</td><td><button type="button" class="zd-btn" data-order-status="${u.esc(x.id)}">Badilisha status</button></td></tr>`).join('')
      : '<tr><td colspan="7" class="empty-state">Hakuna orders zinazolingana na vichujio.</td></tr>';
    const pages = Math.max(1, Math.ceil(S.total / S.size));
    $('ordersPageInfo').textContent = `Ukurasa ${S.page}/${pages} • Orders ${S.total.toLocaleString()}`;
    $('ordersPrev').disabled = S.page <= 1; $('ordersNext').disabled = S.page >= pages;
    C().setText('totalOrders', S.total.toLocaleString());
  }
  async function load() {
    if (!$('ordersTableBody')) return;
    $('ordersTableBody').innerHTML = '<tr><td colspan="7" class="empty-state">Inapakia orders…</td></tr>';
    try {
      if (window.ZUNE_AUTH_READY) await window.ZUNE_AUTH_READY;
      const [col, dir] = ($('orderSort').value || 'created_at.desc').split('.'), from = (S.page - 1) * S.size;
      let q = C().db().from('orders').select('*', { count: 'exact' }).order(col, { ascending: dir === 'asc' }).range(from, from + S.size - 1);
      if ($('orderStatusFilter').value) q = q.eq('status', $('orderStatusFilter').value);
      const term = $('ordersSearch').value.trim();
      if (UUID.test(term)) q = q.eq('id', term);
      const { data, error, count } = await q;
      if (error) throw error;
      S.rows = data || []; S.total = count ?? S.rows.length; render(term);
    } catch (e) { fail(e); }
  }
  async function changeStatus(id) {
    const row = S.rows.find(r => String(r.id) === id);
    try {
      const allowed = (await transitions())[row?.status] || [];
      if (!allowed.length) return U().toast(`Hakuna mabadiliko yanayoruhusiwa kutoka "${row?.status}".`, 'warning');
      const r = await A().confirmAction({ title: 'Badilisha status ya order', summary: `Order ${id} sasa ni "${row.status}". Chagua status mpya inayoruhusiwa.`, choices: allowed, choiceLabel: 'Status mpya' });
      if (!r) return;
      await A().rpc('zune_admin_update_order_status', { p_order: id, p_new: r.choice, p_reason: r.reason });
      U().toast(`Order imebadilishwa kuwa "${r.choice}".`, 'success'); load();
    } catch (e) { U().toast(e.message || 'Imeshindikana.', 'error'); }
  }
  function bind() {
    if (S.bound || !$('ordersTableBody')) return; S.bound = true;
    let t; $('ordersSearch').addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { S.page = 1; load(); }, 300); });
    ['orderStatusFilter', 'orderSort'].forEach(id => $(id).addEventListener('change', () => { S.page = 1; load(); }));
    $('ordersPrev').addEventListener('click', () => { S.page--; load(); }); $('ordersNext').addEventListener('click', () => { S.page++; load(); });
    $('ordersTableBody').addEventListener('click', e => {
      const b = e.target.closest('[data-order-status]'); if (b) changeStatus(b.dataset.orderStatus);
      if (e.target.id === 'ordersRetry') load();
    });
  }
  document.addEventListener('DOMContentLoaded', () => { bind(); load(); });
  document.addEventListener('zune:page-changed', e => { if (e.detail.page === 'orders') load(); });
  document.addEventListener('zune:admin-refresh', load);
  window.ZUNE_ORDERS = { load };
})();
