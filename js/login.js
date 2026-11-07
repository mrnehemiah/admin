(() => {'use strict';document.getElementById('adminLoginForm')?.addEventListener('submit',async e=>{e.preventDefault();const msg=document.getElementById('loginMessage'),btn=document.getElementById('loginButton');msg.textContent='Inathibitisha...';btn.disabled=true;try{const {data,error}=await window.zuneSupabase.auth.signInWithPassword({email:document.getElementById('email').value.trim(),password:document.getElementById('password').value});if(error)throw error;const {data:profile,error:pe}=await window.zuneSupabase.from('profiles').select('role,account_status').eq('id',data.user.id).maybeSingle();if(pe)throw pe;if(!profile||profile.role!=='admin'||/blocked|suspend|disabled/i.test(profile.account_status||'')){await window.zuneSupabase.auth.signOut();throw new Error('Akaunti hii haina ruhusa ya Admin Mkuu.');}const requested=new URLSearchParams(location.search).get('redirect');
      let destination='index.html';
      if(requested){
        try {
          const parsed=new URL(requested,location.origin);
          if(parsed.origin===location.origin) destination=parsed.pathname+parsed.search+parsed.hash;
        } catch (_) { /* Invalid redirect falls back to the admin home page. */ }
      }
      location.replace(destination);}catch(err){msg.className='login-error';msg.textContent=err.message||'Imeshindikana kuingia.';}finally{btn.disabled=false;}});})();
