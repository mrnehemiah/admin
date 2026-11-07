(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const db = () => window.zuneSupabase;
  const ui = () => window.ZUNE_LAYOUT;
  const KEY = 'marketplace.general';
  let rpcReady = false;
  let currentValue = {};

  function setStatus(ok, message) {
    const badge = $('settingsConnectionStatus');
    const text = $('settingsStatusMessage');
    if (badge) {
      badge.textContent = ok ? 'RPC imethibitishwa' : 'Mipangilio imefungwa';
      badge.className = `badge-pill ${ok ? 'success' : 'danger'}`;
    }
    if (text) text.textContent = message;
    if ($('settingsAuthState')) $('settingsAuthState').textContent = window.ZUNE_CURRENT_USER ? 'Imethibitishwa' : 'Haijathibitishwa';
    if ($('settingsRpcState')) $('settingsRpcState').textContent = ok ? 'Inafanya kazi' : 'Haijathibitishwa';
    if ($('saveMarketplaceSettings')) $('saveMarketplaceSettings').disabled = !ok;
    ['settingStoreName','settingSupportEmail','settingSupportPhone','settingCurrency','settingReason'].forEach(id => { if ($(id)) $(id).disabled = !ok; });
  }

  function fill(value = {}) {
    currentValue = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    if ($('settingStoreName')) $('settingStoreName').value = currentValue.store_name || 'ZUNE Marketplace';
    if ($('settingSupportEmail')) $('settingSupportEmail').value = currentValue.support_email || '';
    if ($('settingSupportPhone')) $('settingSupportPhone').value = currentValue.support_phone || '';
    if ($('settingCurrency')) $('settingCurrency').value = ['TZS','USD'].includes(currentValue.currency) ? currentValue.currency : 'TZS';
  }

  async function load() {
    rpcReady = false;
    setStatus(false, 'Inathibitisha session ya Admin Mkuu na ruhusa za settings RPC…');
    try {
      if (!db()) throw new Error('Supabase client haijaunganishwa.');
      if (window.ZUNE_AUTH_READY) await window.ZUNE_AUTH_READY;
      const { data, error } = await db().rpc('admin_get_settings');
      if (error) throw error;
      const row = (data || []).find(item => item.setting_key === KEY);
      fill(row?.setting_value || {});
      rpcReady = true;
      setStatus(true, 'Admin Mkuu amethibitishwa na admin_get_settings imejibu kwa mafanikio.');
    } catch (error) {
      rpcReady = false;
      setStatus(false, `Settings hazijawezeshwa: ${error.message || 'RPC verification failed'}`);
      console.warn('ZUNE settings RPC verification failed:', error);
    }
  }

  async function save(event) {
    event.preventDefault();
    if (!rpcReady) return ui().toast('Settings bado hazijathibitishwa na backend.','warning');
    const reason = $('settingReason')?.value.trim() || '';
    const storeName = $('settingStoreName')?.value.trim() || '';
    const email = $('settingSupportEmail')?.value.trim() || '';
    const phone = $('settingSupportPhone')?.value.trim() || '';
    const currency = $('settingCurrency')?.value || 'TZS';
    if (storeName.length < 2) return ui().toast('Jina la marketplace liwe na angalau herufi 2.','warning');
    if (reason.length < 5) return ui().toast('Andika sababu yenye angalau herufi 5.','warning');
    const value = { ...currentValue, store_name:storeName, support_email:email, support_phone:phone, currency };
    const button = $('saveMarketplaceSettings');
    if (button) { button.disabled = true; button.textContent = 'Inahifadhi…'; }
    try {
      const { data, error } = await db().rpc('admin_update_setting', {
        p_key: KEY,
        p_value: value,
        p_reason: reason
      });
      if (error) throw error;
      if (!data?.success) throw new Error('Backend haikuthibitisha uhifadhi wa settings.');
      currentValue = value;
      $('settingReason').value = '';
      ui().toast('Mipangilio imehifadhiwa na audit record imeandikwa.','success');
      await load();
    } catch (error) {
      ui().toast(error.message || 'Imeshindikana kuhifadhi settings.','error');
      console.error('ZUNE settings save failed:', error);
    } finally {
      if (button) { button.disabled = !rpcReady; button.textContent = 'Hifadhi mabadiliko'; }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('marketplaceSettingsForm')?.addEventListener('submit', save);
    $('refreshSettingsBtn')?.addEventListener('click', load);
    $('openDeliverySettings')?.addEventListener('click', () => window.ZUNE_ROUTER?.show('delivery-pricing'));
    load();
  });
  document.addEventListener('zune:page-changed', event => { if (event.detail?.page === 'settings') load(); });
  window.ZUNE_SETTINGS = { load };
})();
