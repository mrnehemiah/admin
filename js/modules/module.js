(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const text = (value) => value == null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  const escapeCsv = (value) => '"' + text(value).replace(/"/g, '""') + '"';

  function setMode(label, state) {
    const badge = byId('dataMode');
    if (!badge) return;
    badge.textContent = label;
    badge.dataset.state = state || 'neutral';
  }

  function showMessage(message, kind) {
    const body = byId('tableBody');
    const head = byId('tableHead');
    if (head) head.replaceChildren();
    if (!body) return;
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 12;
    cell.className = 'module-state module-state-' + (kind || 'info');
    cell.textContent = message;
    row.appendChild(cell);
    body.replaceChildren(row);
    const count = byId('recordCount');
    if (count) count.textContent = 'No records displayed';
  }

  function setMetric(id, value) {
    const node = byId(id);
    if (node) node.textContent = text(value);
  }

  function displayValue(value) {
    if (value == null || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.map(text).join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  function csvDownload(rows, fields, title) {
    const lines = [
      fields.map(escapeCsv).join(','),
      ...rows.map(row => fields.map(field => escapeCsv(row[field])).join(','))
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = (String(title || 'zune-records').toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'zune-records') + '.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function renderRows(rows, meta, query, status) {
    const fields = Array.isArray(meta.fields) ? meta.fields : [];
    const labels = Array.isArray(meta.labels) ? meta.labels : fields;
    const head = byId('tableHead');
    const body = byId('tableBody');
    if (!head || !body) return [];

    const filtered = rows.filter(row => {
      const matchesQuery = !query || fields.some(field => displayValue(row[field]).toLowerCase().includes(query));
      const rowStatus = String(row.status || row.state || '').toLowerCase();
      const matchesStatus = !status || rowStatus === status;
      return matchesQuery && matchesStatus;
    });

    head.replaceChildren();
    labels.forEach(label => {
      const th = document.createElement('th');
      th.textContent = label;
      head.appendChild(th);
    });

    body.replaceChildren();
    if (!filtered.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = Math.max(fields.length, 1);
      td.className = 'module-state';
      td.textContent = rows.length ? 'Hakuna rekodi zinazolingana na utafutaji wako.' : 'Hakuna rekodi zilizopatikana.';
      tr.appendChild(td);
      body.appendChild(tr);
    } else {
      filtered.forEach(record => {
        const tr = document.createElement('tr');
        fields.forEach(field => {
          const td = document.createElement('td');
          td.textContent = displayValue(record[field]);
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
    }

    setMetric('totalCount', rows.length);
    const active = rows.filter(row => ['active', 'approved', 'verified', 'delivered', 'resolved'].includes(String(row.status || row.state || '').toLowerCase()) || row.is_active === true).length;
    const pending = rows.filter(row => ['pending', 'under_review', 'processing', 'open'].includes(String(row.status || row.state || '').toLowerCase())).length;
    setMetric('activeCount', active);
    setMetric('pendingCount', pending);
    const newest = rows.map(row => row.updated_at || row.created_at).filter(Boolean).sort().pop();
    setMetric('updatedCount', newest ? new Date(newest).toLocaleString() : '—');
    const count = byId('recordCount');
    if (count) count.textContent = 'Showing ' + filtered.length + ' of ' + rows.length + ' records';
    const pager = document.querySelector('.pager span:last-child');
    if (pager) pager.textContent = 'Live dataset · maximum 250 records';
    return filtered;
  }

  async function init(meta) {
    const add = byId('addBtn');
    if (add) add.hidden = true;
    const title = meta && meta.title ? meta.title : 'ZUNE module';
    if (!meta || !meta.table || !Array.isArray(meta.fields) || !meta.fields.length) {
      setMode('CONFIGURATION ERROR', 'error');
      showMessage('Module configuration is incomplete. No data was loaded.', 'error');
      return;
    }

    const client = window.zuneSupabase;
    if (!window.zuneIsLive || !client) {
      setMode('OFFLINE', 'error');
      showMessage('Supabase connection is unavailable. Hakuna demo data itakayoonyeshwa.', 'error');
      return;
    }

    setMode('VERIFYING ACCESS', 'pending');
    showMessage('Inathibitisha ruhusa za Admin…', 'info');

    try {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData || !sessionData.session) {
        setMode('SIGN IN REQUIRED', 'error');
        showMessage('Ingia kwenye ZUNE Admin kwanza. Data haitapakiwa bila session.', 'error');
        return;
      }

      const { data: isAdmin, error: adminError } = await client.rpc('is_admin');
      if (adminError || isAdmin !== true) {
        setMode('ACCESS RESTRICTED', 'error');
        showMessage('Ruhusa ya Admin haijathibitishwa. Hakuna taarifa zilizofunguliwa.', 'error');
        return;
      }

      if (meta.slug === 'system-health') {
        await renderSystemHealth(client);
        return;
      }

      setMode('LIVE SUPABASE', 'success');
      const refresh = async () => {
        const body = byId('tableBody');
        if (body) {
          const row = document.createElement('tr');
          const cell = document.createElement('td');
          cell.colSpan = Math.max(meta.fields.length, 1);
          cell.textContent = 'Inapakia taarifa halisi…';
          row.appendChild(cell);
          body.replaceChildren(row);
        }
        const orderField = meta.fields.includes('updated_at') ? 'updated_at' : meta.fields.includes('created_at') ? 'created_at' : null;
        let request = client.from(meta.table).select(meta.fields.join(',')).limit(250);
        if (orderField) request = request.order(orderField, { ascending: false, nullsFirst: false });
        const { data, error } = await request;
        if (error) throw error;
        const rows = Array.isArray(data) ? data : [];
        const search = String(byId('searchBox')?.value || '').trim().toLowerCase();
        const status = String(byId('statusFilter')?.value || '').trim().toLowerCase();
        window.__zuneModuleRows = rows;
        const filtered = renderRows(rows, meta, search, status);
        if (byId('exportBtn')) {
          byId('exportBtn').onclick = () => csvDownload(filtered, meta.fields, meta.slug || title);
        }
        return rows;
      };

      const refreshButton = byId('refreshBtn');
      const firstLoad = await (async () => {
        const orderField = meta.fields.includes('updated_at') ? 'updated_at' : meta.fields.includes('created_at') ? 'created_at' : null;
        let request = client.from(meta.table).select(meta.fields.join(',')).limit(250);
        if (orderField) request = request.order(orderField, { ascending: false, nullsFirst: false });
        const { data, error } = await request;
        if (error) throw error;
        window.__zuneModuleRows = Array.isArray(data) ? data : [];
        return window.__zuneModuleRows;
      })();
      renderRows(firstLoad, meta, '', '');
      if (byId('exportBtn')) byId('exportBtn').onclick = () => csvDownload(firstLoad, meta.fields, meta.slug || title);
      const count = byId('recordCount');
      if (count) count.textContent = 'Showing ' + firstLoad.length + ' of ' + firstLoad.length + ' records';
      const pager = document.querySelector('.pager span:last-child');
      if (pager) pager.textContent = 'Live dataset · maximum 250 records';
      if (refreshButton) refreshButton.onclick = () => refresh().then(rows => { window.__zuneModuleRows = rows; }).catch(error => {
        setMode('DATA ERROR', 'error');
        showMessage('Imeshindikana kusoma ' + meta.table + ': ' + (error.message || 'Unknown error'), 'error');
      });
      const originalSearch = () => {
        const filtered = renderRows(window.__zuneModuleRows || [], meta, String(byId('searchBox')?.value || '').trim().toLowerCase(), String(byId('statusFilter')?.value || '').trim().toLowerCase());
        if (byId('exportBtn')) byId('exportBtn').onclick = () => csvDownload(filtered, meta.fields, meta.slug || title);
      };
      ['searchBox', 'statusFilter'].forEach(id => {
        const control = byId(id);
        if (control) control.oninput = originalSearch;
        if (control) control.onchange = originalSearch;
      });
    } catch (error) {
      setMode('DATA ERROR', 'error');
      showMessage('Imeshindikana kupakia ' + title + ': ' + (error && error.message ? error.message : 'Unknown error') + '. Hakuna demo data itakayoonyeshwa.', 'error');
    }
  }

  async function renderSystemHealth(client) {
    const checks = [];
    const run = async (label, callback) => {
      const started = performance.now();
      try {
        const detail = await callback();
        checks.push({ label, ok: true, detail, ms: Math.round(performance.now() - started) });
      } catch (error) {
        checks.push({ label, ok: false, detail: error.message || 'Check failed', ms: Math.round(performance.now() - started) });
      }
    };
    await run('Supabase Data API', async () => {
      const { error } = await client.from('profiles').select('id', { head: true, count: 'exact' });
      if (error) throw error;
      return 'Database query successful';
    });
    await run('Authentication session', async () => {
      const { data, error } = await client.auth.getUser();
      if (error) throw error;
      if (!data.user) throw new Error('No authenticated user');
      return 'Authenticated user session active';
    });
    await run('Admin authorization', async () => {
      const { data, error } = await client.rpc('is_admin');
      if (error) throw error;
      if (data !== true) throw new Error('Admin role not confirmed');
      return 'Admin RPC confirmed';
    });

    setMode(checks.every(item => item.ok) ? 'HEALTHY' : 'ATTENTION', checks.every(item => item.ok) ? 'success' : 'error');
    const head = byId('tableHead');
    const body = byId('tableBody');
    if (!head || !body) return;
    head.replaceChildren();
    ['Check', 'Status', 'Response', 'Details'].forEach(label => {
      const th = document.createElement('th');
      th.textContent = label;
      head.appendChild(th);
    });
    body.replaceChildren();
    checks.forEach(item => {
      const row = document.createElement('tr');
      [item.label, item.ok ? 'HEALTHY' : 'ISSUE', item.ms + ' ms', item.detail].forEach(value => {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
    setMetric('totalCount', checks.length);
    setMetric('activeCount', checks.filter(item => item.ok).length);
    setMetric('pendingCount', checks.filter(item => !item.ok).length);
    setMetric('updatedCount', new Date().toLocaleString());
    const count = byId('recordCount');
    if (count) count.textContent = checks.filter(item => !item.ok).length + ' checks need attention';
    const add = byId('addBtn');
    if (add) add.hidden = true;
    const exportButton = byId('exportBtn');
    if (exportButton) exportButton.hidden = true;
    const refreshButton = byId('refreshBtn');
    if (refreshButton) refreshButton.onclick = () => renderSystemHealth(client);
  }

  window.ZuneModule = Object.freeze({ init });
})();
