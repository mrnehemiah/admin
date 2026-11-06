import {supabase} from './supabase.js';
export function watchTable(table,onChange){if(!supabase)throw new Error('Supabase not configured');const channel=supabase.channel('admin-'+table+'-'+Date.now()).on('postgres_changes',{event:'*',schema:'public',table},onChange).subscribe();return ()=>supabase.removeChannel(channel);}
