import { supabase } from './supabase.js';
import { escapeHtml, toast, loading } from './ui.js';

export async function render(el){
  if(!supabase){el.innerHTML='<div class="notice error">Supabase haijaunganishwa.</div>';return;}
  el.innerHTML=loading();
  try{
    const {data,error}=await supabase.from('coupons').select('id,code,description,discount_type,discount_value,min_order_amount,max_discount_amount,usage_limit,usage_count,starts_at,expires_at,status,coupon_scope,seller_id,created_by').order('created_at',{ascending:false}).limit(250);
    if(error)throw error;
    const rows=data||[];
    el.innerHTML=`<div class="page-head"><div><h2>Coupons & Promotions</h2><p>Simamia coupon za ZUNE na za wauzaji · ${rows.length} records</p></div><button class="btn" id="coupon-refresh">↻ Refresh</button></div>
    <div class="panel"><div class="panel-head">Tengeneza coupon ya ZUNE</div><form id="platform-coupon-form" class="form-grid">
      <label class="field">Coupon code<input name="code" required maxlength="40" pattern="[A-Za-z0-9_-]+" placeholder="ZUNE10"></label>
      <label class="field">Aina<select name="discount_type"><option value="percentage">Asilimia (%)</option><option value="fixed">Kiasi (TSh)</option></select></label>
      <label class="field">Punguzo<input name="discount_value" type="number" min="1" step="0.01" required></label>
      <label class="field">Minimum order (TSh)<input name="min_order_amount" type="number" min="0" value="0"></label>
      <label class="field">Maximum discount (hiari)<input name="max_discount_amount" type="number" min="1"></label>
      <label class="field">Usage limit (hiari)<input name="usage_limit" type="number" min="1"></label>
      <label class="field">Starts at<input name="starts_at" type="datetime-local" required></label>
      <label class="field">Expires at<input name="expires_at" type="datetime-local"></label>
      <label class="field">Maelezo<input name="description" maxlength="160"></label>
      <div class="form-actions"><button class="btn primary" type="submit">Create ZUNE coupon</button></div>
    </form></div>
    <div class="toolbar"><input class="field" id="coupon-search" placeholder="Tafuta code, seller ID au status…"><span class="pill">Platform + Seller coupons</span></div>
    <div id="coupon-table" class="table-wrap"></div>`;
    const form=el.querySelector('#platform-coupon-form');const starts=form.elements.starts_at;const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());starts.value=d.toISOString().slice(0,16);
    function draw(list){el.querySelector('#coupon-table').innerHTML='<table><thead><tr><th>Code</th><th>Scope</th><th>Seller</th><th>Discount</th><th>Usage</th><th>Dates</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+list.map(c=>'<tr><td><b>'+escapeHtml(c.code)+'</b><small>'+escapeHtml(c.description||'')+'</small></td><td>'+escapeHtml(c.coupon_scope||'platform')+'</td><td>'+escapeHtml(c.seller_id||'—')+'</td><td>'+escapeHtml(c.discount_type==='percentage'?c.discount_value+'%':'TSh '+Number(c.discount_value).toLocaleString())+'</td><td>'+Number(c.usage_count||0)+' / '+(c.usage_limit||'∞')+'</td><td>'+new Date(c.starts_at).toLocaleDateString()+' – '+(c.expires_at?new Date(c.expires_at).toLocaleDateString():'∞')+'</td><td>'+escapeHtml(c.status)+'</td><td><button class="btn" data-toggle="'+c.id+'">'+(c.status==='active'?'Disable':'Enable')+'</button> <button class="btn danger" data-delete="'+c.id+'">Delete</button></td></tr>').join('')+'</tbody></table>';}
    draw(rows);el.querySelector('#coupon-refresh').onclick=()=>render(el);
    el.querySelector('#coupon-search').oninput=e=>{const q=e.target.value.toLowerCase();draw(rows.filter(c=>JSON.stringify(c).toLowerCase().includes(q)));};
    form.onsubmit=async e=>{e.preventDefault();const f=new FormData(form),code=String(f.get('code')||'').trim().toUpperCase(),type=f.get('discount_type'),value=Number(f.get('discount_value'));if(!/^[A-Z0-9_-]{3,40}$/.test(code)||!(value>0)||(type==='percentage'&&value>100)){toast('Coupon code au punguzo si sahihi.');return;}const expires=f.get('expires_at')||null;if(expires&&new Date(expires)<=new Date(f.get('starts_at'))){toast('Expiry lazima iwe baada ya start date.');return;}const {data:{user}}=await supabase.auth.getUser();if(!user){toast('Admin session haipo.');return;}const payload={code,description:f.get('description')||null,discount_type:type,discount_value:value,min_order_amount:Number(f.get('min_order_amount')||0),max_discount_amount:f.get('max_discount_amount')?Number(f.get('max_discount_amount')):null,usage_limit:f.get('usage_limit')?Number(f.get('usage_limit')):null,starts_at:new Date(f.get('starts_at')).toISOString(),expires_at:expires?new Date(expires).toISOString():null,status:'active',coupon_scope:'platform',seller_id:null,created_by:user.id};const b=form.querySelector('[type=submit]');b.disabled=true;try{const {error}=await supabase.from('coupons').insert(payload);if(error)throw error;toast('ZUNE coupon imeundwa.');render(el);}catch(err){toast('Imeshindikana: '+err.message);}finally{b.disabled=false;}};
    el.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=async()=>{const c=rows.find(x=>x.id===b.dataset.toggle);try{const {error}=await supabase.from('coupons').update({status:c.status==='active'?'disabled':'active',updated_at:new Date().toISOString()}).eq('id',c.id);if(error)throw error;toast('Hali ya coupon imebadilishwa.');render(el);}catch(err){toast(err.message);}});
    el.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Futa coupon hii?'))return;try{const {error}=await supabase.from('coupons').delete().eq('id',b.dataset.delete);if(error)throw error;toast('Coupon imefutwa.');render(el);}catch(err){toast(err.message);}});
  }catch(e){el.innerHTML='<div class="notice error">Imeshindwa kupakia coupons: '+escapeHtml(e.message)+'</div><button class="btn" id="coupon-retry">Jaribu tena</button>';el.querySelector('#coupon-retry').onclick=()=>render(el);}
}
