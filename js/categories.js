import { escapeHtml } from './ui.js';
export function render(el){el.innerHTML=`<div class="page-head"><div><h2>Categories</h2><p>Usimamizi wa product categories.</p></div></div><div class="notice warn">Ukaguzi wa schema ya ZUNE haukuonyesha public categories table. Hakuna create/edit/delete action itakayobuniwa. Ongeza category schema na audited RPC baada ya kuamua category hierarchy.</div>`;}
