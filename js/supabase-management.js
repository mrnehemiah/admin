/* ZUNE Admin — Supabase Management navigation helpers.
 * This page is a secure dashboard hub; privileged operations remain server-side.
 */
(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const section = document.querySelector('[data-section="supabase-management"]');
    if (!section) return;
    section.querySelectorAll('a[target="_blank"]').forEach(link => {
      link.addEventListener('click', () => {
        // External dashboard navigation is intentional and opens in a new tab.
      });
    });
  });
})();
