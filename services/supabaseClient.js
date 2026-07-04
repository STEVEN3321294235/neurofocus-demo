import { createClient } from '@supabase/supabase-js';

const SUPABASE_CONFIG = {
    // TODO: Replace these values if you switch to a different Supabase project.
    url: 'https://taqrixrltodrwxaxdobc.supabase.co',
    anonKey: 'sb_publishable_Mw_yfhcIWZhJoiWP1LFTMQ_T3Cnnahw'
};

let supabaseClient = null;

export function getSupabaseClient() {
    if (supabaseClient) {
        return supabaseClient;
    }

    const url = String(SUPABASE_CONFIG.url || '').trim();
    const anonKey = String(SUPABASE_CONFIG.anonKey || '').trim();

    if (!url || !anonKey || url.includes('YOUR_SUPABASE_URL') || anonKey.includes('YOUR_SUPABASE_ANON_KEY')) {
        throw new Error('Supabase config is missing. Update `services/supabaseClient.js` before using auth or session history.');
    }

    supabaseClient = createClient(url, anonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true
        }
    });

    return supabaseClient;
}

export { SUPABASE_CONFIG };
