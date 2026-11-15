/* ZUNE Ads Management navigation tabs. Read-only until secure Ads APIs are available. */
(() => {
  'use strict';
  const tabs = document.querySelectorAll('[data-ads-tab]');
  function activate(name) {
    tabs.forEach(button => button.classList.toggle('active', button.dataset.adsTab === name));
    document.querySelectorAll('#adsPage .seller-tab-content').forEach(panel => {
      panel.classList.toggle('active', panel.id === 'ads' + name[0].toUpperCase() + name.slice(1) + 'Tab');
    });
  }
  tabs.forEach(button => button.addEventListener('click', () => activate(button.dataset.adsTab)));
  document.addEventListener('zune:page-changed', event => {
    if (event.detail?.page === 'ads') activate('campaigns');
  });
})();
