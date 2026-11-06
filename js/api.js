import { supabase } from './supabase.js';
import { PAGE_SIZE } from './config.js';
export function requireClient(){if(!supabase)throw new Error('Weka Supabase publishable key kwenye js/config.js kwanza.');return supabase;}
export async function rpc(name,args={}){const db=requireClient();const {data,error}=await db.rpc(name,args);if(error)throw error;return data;}
export async function selectRows(table,{columns='*',limit=PAGE_SIZE,order='created_at',ascending=false,filters=[]}={}){const db=requireClient();let q=db.from(table).select(columns).limit(limit);if(order)q=q.order(order,{ascending});for(const f of filters)q=q[f.op||'eq'](f.key,f.value);const {data,error}=await q;if(error)throw error;return data||[];}
export async function countRows(table,filters=[]){const db=requireClient();let q=db.from(table).select('*',{count:'exact',head:true});for(const f of filters)q=q[f.op||'eq'](f.key,f.value);const {count,error}=await q;if(error)throw error;return count||0;}
export async function updateRow(table,id,patch){const db=requireClient();const {data,error}=await db.from(table).update(patch).eq('id',id).select().single();if(error)throw error;return data;}
export async function insertRow(table,payload){const db=requireClient();const {data,error}=await db.from(table).insert(payload).select().single();if(error)throw error;return data;}
export async function deleteRow(table,id){const db=requireClient();const {error}=await db.from(table).delete().eq('id',id);if(error)throw error;return true;}
export async function logActivity(action,targetType,targetId,reason,details={}){try{return await rpc('admin_log_activity',{p_action:action,p_target_type:targetType,p_target_id:String(targetId??''),p_reason:reason,p_details:details});}catch(e){console.warn('Audit RPC not available; action endpoint should log server-side.',e.message);}}
