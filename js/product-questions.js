(() => {
 'use strict';
 const db=()=>window.zuneSupabase, c=()=>window.ZUNE_CORE, ui=()=>window.ZUNE_LAYOUT, $=id=>document.getElementById(id);
 let rows=[],products=new Map(),buyers=new Map(),answers=new Map(),busy=false;
 const esc=v=>ui().esc(v??'');
 const date=v=>v?ui().date(v):'—';
 const status=s=>String(s||'pending').toLowerCase();
 function render(){
  const body=$('productQuestionsBody');if(!body)return;
  const filter=$('productQuestionsStatus')?.value||'',q=($('productQuestionsSearch')?.value||'').trim().toLowerCase();
  const visible=rows.filter(r=>{
   const p=products.get(r.product_id)||{},b=buyers.get(r.asker_id)||{},a=answers.get(r.id)||{};
   return (!filter||status(r.moderation_status)===filter)&&(!q||[p.title,p.vendor_id,b.full_name,b.email,r.question,a.answer].some(x=>String(x||'').toLowerCase().includes(q)));
  });
  body.innerHTML=visible.length?visible.map(r=>{
   const p=products.get(r.product_id)||{},b=buyers.get(r.asker_id)||{},a=answers.get(r.id)||{},st=status(r.moderation_status);
   const actions=st==='pending'
    ?'<div class="action-row"><button class="primary-btn" type="button" data-question-action="approved" data-id="'+esc(r.id)+'">Approve</button><button class="warning-btn" type="button" data-question-action="rejected" data-id="'+esc(r.id)+'">Reject</button></div>'
    :st==='approved'?'<button class="warning-btn" type="button" data-question-action="hidden" data-id="'+esc(r.id)+'">Hide</button>':'—';
   return '<tr><td><strong>'+esc(p.title||'Bidhaa haijapatikana')+'</strong><small>'+esc(p.vendor_id||'')+'</small></td><td>'+esc(b.full_name||b.email||'Mteja')+'</td><td style="white-space:normal;min-width:200px;max-width:340px">'+esc(r.question)+'</td><td style="white-space:normal;min-width:180px;max-width:300px">'+(a.answer?esc(a.answer):'—')+'</td><td>'+esc(date(r.created_at))+'</td><td><span class="badge-pill '+(st==='approved'?'success':st==='rejected'||st==='hidden'?'danger':'warning')+'">'+esc(st)+'</span>'+(r.admin_note?'<small>'+esc(r.admin_note)+'</small>':'')+'</td><td>'+actions+'</td></tr>';
  }).join(''):'<tr><td colspan="7" class="empty-state">Hakuna maswali yanayolingana.</td></tr>';
  c().setText('productQuestionsTotal',String(rows.length));
  c().setText('productQuestionsPending',String(rows.filter(x=>status(x.moderation_status)==='pending').length));
  c().setText('productQuestionsApproved',String(rows.filter(x=>status(x.moderation_status)==='approved').length));
  c().setText('productQuestionsRejected',String(rows.filter(x=>['rejected','hidden'].includes(status(x.moderation_status))).length));
 }
 async function load(){
  if(busy)return;busy=true;
  try{
   if(window.ZUNE_AUTH_READY)await window.ZUNE_AUTH_READY;
   const {data,error}=await db().from('product_questions').select('id,product_id,asker_id,question,moderation_status,admin_note,created_at').order('created_at',{ascending:false}).limit(500);
   if(error)throw error;rows=data||[];
   const pids=[...new Set(rows.map(x=>x.product_id).filter(Boolean))],uids=[...new Set(rows.map(x=>x.asker_id).filter(Boolean))],qids=rows.map(x=>x.id);
   products.clear();buyers.clear();answers.clear();
   const [pr,br,ar]=await Promise.all([
    pids.length?db().from('products').select('id,title,vendor_id').in('id',pids):Promise.resolve({data:[],error:null}),
    uids.length?db().from('profiles').select('id,full_name,email').in('id',uids):Promise.resolve({data:[],error:null}),
    qids.length?db().from('product_question_answers').select('id,question_id,answer,seller_id,created_at').in('question_id',qids):Promise.resolve({data:[],error:null})
   ]);
   if(pr.error)throw pr.error;if(br.error)throw br.error;if(ar.error)throw ar.error;
   (pr.data||[]).forEach(x=>products.set(x.id,x));(br.data||[]).forEach(x=>buyers.set(x.id,x));(ar.data||[]).forEach(x=>answers.set(x.question_id,x));
   render();
  }catch(e){console.error('Product questions load:',e);const b=$('productQuestionsBody');if(b)b.innerHTML='<tr><td colspan="7" class="empty-state">Imeshindikana kupakia: '+esc(e.message||e)+'</td></tr>';}
  finally{busy=false;}
 }
 async function moderate(id,decision){
  const question=rows.find(x=>x.id===id);if(!question||busy)return;
  let note='';
  if(decision==='rejected'){note=window.prompt('Sababu ya kukataa swali (inahitajika):')||'';if(note.trim().length<5){ui().toast('Sababu lazima iwe na angalau herufi 5.','warning');return;}}
  if(!window.confirm(decision==='approved'?'Unathibitisha kuchapisha swali hili?':decision==='hidden'?'Unathibitisha kuficha swali hili?':'Unathibitisha kukataa swali hili?'))return;
  busy=true;
  try{
   const {data,error}=await db().from('product_questions').update({moderation_status:decision,admin_note:note.trim()||null,updated_at:new Date().toISOString()}).eq('id',id).eq('moderation_status',question.moderation_status).select('id').maybeSingle();
   if(error)throw error;if(!data)throw new Error('Swali limebadilika au tayari limefanyiwa ukaguzi.');
   if(decision==='approved'||decision==='rejected'){
    const approved=decision==='approved';
    const n=await db().from('notifications').insert({user_id:question.asker_id,type:'product_question_'+decision,title_sw:approved?'Swali lako limeidhinishwa':'Swali lako halikuidhinishwa',title_en:approved?'Your product question was approved':'Your product question was not approved',body_sw:approved?'Swali lako sasa linaonekana kwenye ukurasa wa bidhaa.':'Swali lako halijachapishwa. '+(note||''),body_en:approved?'Your question is now visible on the product page.':'Your question was not published. '+(note||''),action_url:'./index.html',is_read:false});
    if(n.error)console.warn('Question notification failed:',n.error.message);
   }
   await c().audit('product_question_'+decision,'product_question',id,note,{product_id:question.product_id,asker_id:question.asker_id});
   ui().toast(decision==='approved'?'Swali limeidhinishwa.':decision==='hidden'?'Swali limefichwa.':'Swali limekataliwa.','success');
   await load();
  }catch(e){console.error(e);ui().toast(e.message||'Imeshindikana kukagua swali.','error');}
  finally{busy=false;}
 }
 document.addEventListener('DOMContentLoaded',()=>{
  $('refreshProductQuestionsBtn')?.addEventListener('click',load);
  $('productQuestionsSearch')?.addEventListener('input',render);
  $('productQuestionsStatus')?.addEventListener('change',render);
  $('productQuestionsBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-question-action]');if(b)moderate(b.dataset.id,b.dataset.questionAction);});
  if(window.ZUNE_ROUTER?.current==='product-questions')load();
 });
 document.addEventListener('zune:page-changed',e=>{if(e.detail?.page==='product-questions')load();});
 document.addEventListener('zune:admin-refresh',()=>{if(window.ZUNE_ROUTER?.current==='product-questions')load();});
 window.ZUNE_PRODUCT_QUESTIONS={load};
})();