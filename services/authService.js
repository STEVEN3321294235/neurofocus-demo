import { clearCurrentUser, getCurrentUser, setCurrentUser } from './storageService.js';
import { getSupabase } from './supabaseClient.js';

// Real accounts live in Supabase Auth. The rest of the app keeps reading the
// "current user" display name from storageService, so nothing outside the auth
// page needed to change.
//
// Offline resilience: if Supabase is unreachable (booth demo with no Wi-Fi),
// login falls back to a LOCAL session (marked offline:true) instead of locking
// the demo out. Wrong-password errors are real errors and never fall back.

function authError(code) {
    const err = new Error(code);
    err.code = code;
    return err;
}

function isNetworkFailure(error) {
    const msg = String(error?.message || error || '').toLowerCase();
    return msg.includes('fetch') || msg.includes('network') || msg.includes('timeout');
}

function displayNameFrom(user, fallbackEmail = '') {
    return (
        user?.user_metadata?.username ||
        String(user?.email || fallbackEmail || '').split('@')[0] ||
        'user'
    );
}

export async function login({ email, password }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPassword = String(password || '');

    if (!normalizedEmail || !normalizedPassword) throw authError('missing_fields');

    const supabase = await getSupabase();
    if (!supabase) {
        // SDK unreachable (offline booth demo): local fallback session.
        const username = normalizedEmail.split('@')[0];
        setCurrentUser(username);
        rememberUserEmail(normalizedEmail);
        return { username, offline: true };
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: normalizedPassword
        });
        if (error) {
            if (isNetworkFailure(error)) throw authError('network');
            throw authError('invalid_credentials');
        }
        const username = displayNameFrom(data.user, normalizedEmail);
        setCurrentUser(username);
        rememberUserEmail(normalizedEmail);
        return { username, offline: false };
    } catch (error) {
        if (error.code) throw error;
        if (isNetworkFailure(error)) {
            // No network at all (offline booth demo): local fallback session.
            const username = normalizedEmail.split('@')[0];
            setCurrentUser(username);
            rememberUserEmail(normalizedEmail);
            return { username, offline: true };
        }
        throw authError('invalid_credentials');
    }
}

export async function register({ username, email, password }) {
    const normalizedUsername = String(username || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPassword = String(password || '');

    if (!normalizedUsername || !normalizedEmail || !normalizedPassword) throw authError('missing_fields');

    const supabase = await getSupabase();
    if (!supabase) {
        // SDK unreachable (offline): register locally so the demo continues.
        setCurrentUser(normalizedUsername);
        rememberUserEmail(normalizedEmail);
        return { username: normalizedUsername, offline: true };
    }
    if (normalizedPassword.length < 6) throw authError('weak_password');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw authError('invalid_email');

    try {
        const { data, error } = await supabase.auth.signUp({
            email: normalizedEmail,
            password: normalizedPassword,
            options: { data: { username: normalizedUsername } }
        });
        if (error) {
            const msg = String(error.message || '').toLowerCase();
            if (isNetworkFailure(error)) throw authError('network');
            if (msg.includes('already registered') || msg.includes('already exists')) throw authError('user_exists');
            if (msg.includes('password')) throw authError('weak_password');
            if (msg.includes('email')) throw authError('invalid_email');
            throw authError('network');
        }
        if (!data.session) {
            // Email confirmation is enabled on the Supabase project: the account
            // exists but the user must confirm via email before logging in.
            return { username: normalizedUsername, needsEmailConfirm: true };
        }
        setCurrentUser(normalizedUsername);
        return { username: normalizedUsername, offline: false };
    } catch (error) {
        if (error.code) throw error;
        if (isNetworkFailure(error)) throw authError('network');
        throw authError('network');
    }
}

// Remember the login email locally so exports (study PDF/CSV) can label who the
// session belongs to. Best-effort; never blocks auth.
const USER_EMAIL_KEY = 'nf_user_email';
export function rememberUserEmail(email) {
    try { localStorage.setItem(USER_EMAIL_KEY, String(email || '')); } catch (e) { /* best-effort */ }
}
export function getUserEmail() {
    try { return localStorage.getItem(USER_EMAIL_KEY) || ''; } catch (e) { return ''; }
}

// Backfill the remembered email from the live Supabase session — covers users
// who signed in before the email was being stored. Best-effort, returns the
// email either way.
export async function syncUserEmail() {
    try {
        const supabase = await getSupabase();
        const { data } = (await supabase?.auth.getSession()) || {};
        const email = data?.session?.user?.email;
        if (email) rememberUserEmail(email);
    } catch (e) { /* offline / no session: keep whatever we have */ }
    return getUserEmail();
}

export function logout() {
    getSupabase().then((supabase) => supabase?.auth.signOut()).catch(() => {});
    clearCurrentUser();
    try { localStorage.removeItem(USER_EMAIL_KEY); } catch (e) { /* best-effort */ }
}

export function getSessionUser() {
    const username = getCurrentUser();
    return username ? { username, email: getUserEmail() } : null;
}

// Supabase user id (uuid) for the currently signed-in cloud session, or null
// when running as a local/offline session. Used by session-history storage.
export async function getCloudUserId() {
    try {
        const supabase = await getSupabase();
        if (!supabase) return null;
        const { data } = await supabase.auth.getSession();
        return data?.session?.user?.id || null;
    } catch (e) {
        return null;
    }
}
