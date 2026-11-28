(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let busy = false;
  function ensureModal() {
    if ($('zuneCreateAccountModal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="account-modal" id="zuneCreateAccountModal" hidden>
        <div class="account-modal-card" role="dialog" aria-modal="true" aria-labelledby="accountModalTitle">
          <div class="account-modal-head"><div><p class="eyebrow">ZUNE ADMIN • ACCOUNT SETUP</p><h2 id="accountModalTitle">Ongeza akaunti</h2></div><button type="button" class="secondary-btn" id="closeCreateAccount">✕</button></div>
          <p class="account-modal-intro">Chagua aina ya akaunti. Taarifa zitahifadhiwa kwenye Supabase Auth na jedwali husika la Marketplace.</p>
          <form id="createZuneAccountForm">
            <div class="account-form-grid">
              <label>Aina ya akaunti<select name="role" id="createAccountRole" required><option value="buyer">User / Customer</option><option value="vendor">Seller</option><option value="driver">Driver</option></select></label>
              <label>Jina kamili<input name="full_name" required minlength="2" maxlength="100" autocomplete="name"></label>
              <label>Email ya kuingilia<input name="email" type="email" required autocomplete="email"></label>
              <label>Namba ya simu<input name="phone_number" type="tel" maxlength="30" autocomplete="tel"></label>
              <label>Jinsia<select name="gender"><option value="">Haijatajwa</option><option value="male">Mwanaume</option><option value="female">Mwanamke</option><option value="other">Nyingine</option><option value="prefer_not_to_say">Sitaki kutaja</option></select></label>
              <label>Tarehe ya kuzaliwa<input name="date_of_birth" type="date"></label>
              <label class="account-full">Anwani ya makazi<textarea name="residential_address" rows="2" maxlength="500"></textarea></label>
            </div>
            <div class="account-role-fields" data-account-role="vendor" hidden><h3>Taarifa za duka</h3><div class="account-form-grid">
              <label>Jina la duka<input name="store_name" maxlength="120"></label><label>Category ya duka<input name="store_category" maxlength="100"></label>
              <label>Simu ya duka<input name="store_phone" maxlength="30"></label><label>Mkoa<input name="store_region" maxlength="100"></label>
              <label>Wilaya<input name="store_district" maxlength="100"></label><label>Anwani ya duka<input name="store_address" maxlength="500"></label>
              <label class="account-full">Maelezo ya duka<textarea name="store_description" rows="2" maxlength="1000"></textarea></label>
            </div><p class="account-hint">Duka litaanzishwa bila Verified Badge; uthibitishaji utafanywa kupitia utaratibu wa kawaida.</p></div>
            <div class="account-role-fields" data-account-role="driver" hidden><h3>Taarifa za dereva na chombo</h3><div class="account-form-grid">
              <label>Aina ya chombo<select name="vehicle_type"><option value="">Chagua</option><option value="motorcycle">Pikipiki</option><option value="car">Gari</option><option value="bicycle">Baiskeli</option><option value="other">Nyingine</option></select></label>
              <label>Namba ya usajili wa chombo<input name="vehicle_registration" maxlength="60"></label><label>Namba ya leseni<input name="license_number" maxlength="100"></label>
              <label>Namba ya kitambulisho<input name="national_id" maxlength="100"></label><label>Umiliki wa chombo<select name="vehicle_ownership"><option value="">Haijatajwa</option><option value="owned">Changu</option><option value="borrowed">Nimeazima</option><option value="rented">Nimekodisha</option><option value="company">Cha kampuni</option></select></label>
              <label>Mkoa<input name="driver_region" maxlength="100"></label><label>Wilaya<input name="driver_district" maxlength="100"></label><label>Makazi<input name="driver_residential_area" maxlength="200"></label>
              <label>Simu ya dharura<input name="emergency_phone" maxlength="30"></label><label>Uhusiano wa mtu wa dharura<input name="emergency_relation" maxlength="60"></label>
            </div><p class="account-hint">Dereva atawekwa Pending mpaka nyaraka na taarifa zake zikaguliwe. Hii haimthibitishi moja kwa moja.</p></div>
            <label class="account-reason">Sababu ya Admin (audit)<textarea name="reason" rows="2" required minlength="5" maxlength="500" placeholder="Eleza kwa nini unaongeza akaunti hii"></textarea></label>
            <div class="account-invite-note">Supabase itatuma invitation email. Mtumiaji atathibitisha email na kuweka password yake kupitia kiungo cha mwaliko.</div>
            <div class="account-modal-actions"><button type="button" class="secondary-btn" id="cancelCreateAccount">Ghairi</button><button type="submit" class="primary-btn" id="submitCreateAccount">Tuma Invitation</button></div>
            <p class="account-form-error" id="createAccountError" role="alert" hidden></p>
          </form>
        </div>
      </div>`);
    $('closeCreateAccount')?.addEventListener('click', close);
    $('cancelCreateAccount')?.addEventListener('click', close);
    $('zuneCreateAccountModal')?.addEventListener('click', e => { if (e.target.id === 'zuneCreateAccountModal') close(); });
    $('createAccountRole')?.addEventListener('change', syncRoleFields);
    $('createZuneAccountForm')?.addEventListener('submit', submit);
    syncRoleFields();
  }
  function syncRoleFields() {
    const role = $('createAccountRole')?.value || 'buyer';
    document.querySelectorAll('[data-account-role]').forEach(node => {
      const active = node.dataset.accountRole === role;
      node.hidden = !active;
      node.querySelectorAll('input,select,textarea').forEach(input => {
        if (input.name === 'store_name' || input.name === 'vehicle_type') input.required = active;
        if (input.name === 'store_name' || input.name === 'vehicle_type') input.disabled = !active;
      });
    });
    const phone = $('createZuneAccountForm')?.elements.namedItem('phone_number');
    if (phone) phone.required = role === 'driver';
    const title = $('accountModalTitle');
    if (title) title.textContent = role === 'vendor' ? 'Ongeza Seller' : role === 'driver' ? 'Ongeza Driver' : 'Ongeza User';
  }
  function open(role='buyer') {
    ensureModal();
    $('createZuneAccountForm')?.reset();
    $('createAccountRole').value = ['buyer','vendor','driver'].includes(role) ? role : 'buyer';
    $('createAccountError').hidden = true;
    $('zuneCreateAccountModal').hidden = false;
    document.body.classList.add('account-modal-open');
    syncRoleFields();
    $('createZuneAccountForm')?.querySelector('[name="full_name"]')?.focus();
  }
  function close() {
    const modal = $('zuneCreateAccountModal');
    if (modal) modal.hidden = true;
    document.body.classList.remove('account-modal-open');
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = $('createZuneAccountForm'), errorNode = $('createAccountError'), button = $('submitCreateAccount');
    const role = $('createAccountRole').value, data = Object.fromEntries(new FormData(form).entries());
    if (role === 'driver' && !String(data.phone_number || '').trim()) {
      errorNode.textContent = 'Namba ya simu inahitajika kwa dereva.'; errorNode.hidden = false; return;
    }
    busy = true; button.disabled = true; button.textContent = 'Inatuma...'; errorNode.hidden = true;
    try {
      if (window.ZUNE_AUTH_READY) await window.ZUNE_AUTH_READY;
      const client = window.ZUNE_CORE?.db();
      if (!client) throw new Error('Supabase haijaunganishwa.');
      const { data: result, error } = await client.functions.invoke('admin-create-user', { body: data });
      if (error) throw error;
      if (!result?.success) throw new Error(result?.error || 'Akaunti haikuundwa.');
      close();
      window.ZUNE_LAYOUT?.toast(role === 'driver' ? 'Invitation imetumwa. Driver ameongezwa Pending.' : role === 'vendor' ? 'Invitation imetumwa. Seller na duka vimeanzishwa.' : 'Invitation ya User imetumwa.','success');
      document.dispatchEvent(new CustomEvent('zune:admin-refresh'));
      window.ZUNE_USERS?.load?.();
    } catch (error) {
      errorNode.textContent = error?.message || 'Imeshindikana kuongeza akaunti.'; errorNode.hidden = false;
    } finally {
      busy = false; button.disabled = false; button.textContent = 'Tuma Invitation';
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    $('addUserAccountBtn')?.addEventListener('click', () => open('buyer'));
    $('addDriverAccountBtn')?.addEventListener('click', () => open('driver'));
  });
  window.ZUNE_USER_ACCOUNTS = { open, close };
})();
