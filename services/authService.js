import { clearCurrentUser, getCurrentUser, setCurrentUser } from './storageService.js';
import { supabase } from './supabaseClient.js';

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

    if (!supabase) {
        // Supabase not configured: keep the old local-session behaviour.
        if (!normalizedEmail) throw authError('missing_fields');
        const username = normalizedEmail.split('@')[0];
        setCurrentUser(username);
        return { username, offline: true };
    }

    if (!normalizedEmail || !normalizedPassword) throw authError('missing_fields');

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
        return { username, offline: false };
    } catch (error) {
        if (error.code) throw error;
        if (isNetworkFailure(error)) {
            // No network at all (offline booth demo): local fallback session.
            const username = normalizedEmail.split('@')[0];
            setCurrentUser(username);
            return { username, offline: true };
        }
        throw authError('invalid_credentials');
    }
}

export async function register({ username, email, password }) {
    const normalizedUsername = String(username || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPassword = String(password || '');

    if (!supabase) {
        if (!normalizedUsername) throw authError('missing_fields');
        setCurrentUser(normalizedUsername);
        return { username: normalizedUsername, offline: true };
    }

    if (!normalizedUsername || !normalizedEmail || !normalizedPassword) throw authError('missing_fields');
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

export function logout() {
    if (supabase) {
        supabase.auth.signOut().catch(() => {});
    }
    clearCurrentUser();
}

export function getSessionUser() {
    const username = getCurrentUser();
    return username ? { username } : null;
}

// Supabase user id (uuid) for the currently signed-in cloud session, or null
// when running as a local/offline session. Used by session-history storage.
export async function getCloudUserId() {
    if (!supabase) return null;
    try {
        const { data } = await supabase.auth.getSession();
        return data?.session?.user?.id || null;
    } catch (e) {
        return null;
    }
}
