// Supabase browser client.
//
// SUPABASE_URL and SUPABASE_ANON_KEY are DESIGNED to be public and shipped to
// the browser. Real security comes from Row Level Security (RLS) policies on
// the database, not from hiding these two values — so it is safe to commit them.
//
// TODO(steven): fill in the two values from your Supabase project:
//   Supabase Dashboard -> Project Settings -> API
//     - Project URL     -> url
//     - anon public key -> anonKey
// Until you fill these in, getSupabase() returns null and any feature that
// depends on Supabase (auth, session history) will gracefully fall back.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_CONFIG = {
    url: 'https://YOUR-PROJECT-REF.supabase.co',   // TODO: replace with your Project URL
    anonKey: 'YOUR-SUPABASE-ANON-PUBLIC-KEY'        // TODO: replace with your anon public key
};

function isConfigured() {
    return (
        !SUPABASE_CONFIG.url.includes('YOUR-PROJECT-REF') &&
        !SUPABASE_CONFIG.anonKey.includes('YOUR-SUPABASE-ANON')
    );
}

export const supabaseReady = isConfigured();

export const supabase = supabaseReady
    ? createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
    : null;

export function getSupabase() {
    if (!supabase) {
        console.warn('[supabaseClient] Supabase is not configured yet. Fill in services/supabaseClient.js (url + anonKey).');
    }
    return supabase;
}
