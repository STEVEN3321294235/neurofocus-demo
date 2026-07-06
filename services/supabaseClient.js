// Supabase browser client (lazy-loaded).
//
// SUPABASE_URL and the publishable key are DESIGNED to be public and shipped
// to the browser. Real security comes from Row Level Security (RLS) policies
// on the database, not from hiding these two values.
//
// IMPORTANT: the SDK is imported DYNAMICALLY on first use, never statically.
// This keeps the app fully bootable when there is no internet (offline booth
// demo via server.js) — cloud features simply fall back instead of crashing
// the whole module graph at load time.

const SUPABASE_CONFIG = {
    url: 'https://taqrixrltodrwxaxdobc.supabase.co',
    anonKey: 'sb_publishable_Mw_yfhcIWZhJoiWP1LFTMQ_T3Cnnahw'
};

let clientPromise = null;

// Resolves to the Supabase client, or null when the SDK cannot be loaded
// (offline) — callers must handle null and fall back gracefully.
export function getSupabase() {
    if (!clientPromise) {
        clientPromise = import('@supabase/supabase-js')
            .then(({ createClient }) => createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey))
            .catch((error) => {
                console.warn('[supabaseClient] Supabase SDK unavailable (offline?). Cloud features disabled for this session.', error);
                clientPromise = null; // allow retry on a later call
                return null;
            });
    }
    return clientPromise;
}
