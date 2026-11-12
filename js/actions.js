(() => {
  'use strict';
  const ui=()=>window.ZUNE_LAYOUT, db=()=>window.ZUNE_CORE.db();
  let busy=false;
  async function rpc(name,args={}){if(window.ZUNE_AUTH_READY)await window.ZUNE_AUTH_READY;const {data,error}=await db().rpc(name,args);if(error)throw error;return data;}
  // Shared confirmation: uses the existing modal (reason required, min 5 chars, blocks double submit).
  function confirm({title,message,confirmText,fn,reason=''}){
    ui().openModal({title,message,confirmText,onConfirm:async r=>{
      if(r.length<5)throw new Error('Sababu lazima iwe na angalau herufi 5.');
      if(busy)return;busy=true;try{await fn(r);}finally{busy=false;}
    }});
    const el=document.getElementById('adminActionReason');if(el&&reason)el.value=reason;
  }
  function csvCell(v){let s=v==null?'':String(v);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
  function downloadCsv(name,rows){
    const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${name}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  window.ZUNE_ACTIONS={rpc,confirm,csvCell,downloadCsv};
})();
