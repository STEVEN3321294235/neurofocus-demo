import { getSupabase } from './supabaseClient.js';

const STORAGE_KEYS = {
    lang: 'game_lang',
    theme: 'theme',
    user: 'current_user',
    history: 'session_history',
    voyage: 'voyage_log'
};

const HISTORY_LIMIT = 10;

export function getLang() {
    return localStorage.getItem(STORAGE_KEYS.lang) || 'hk';
}

export function setLang(lang) {
    localStorage.setItem(STORAGE_KEYS.lang, lang);
}

export function getTheme() {
    return localStorage.getItem(STORAGE_KEYS.theme) || 'dark';
}

export function setTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
}

export function getCurrentUser() {
    return localStorage.getItem(STORAGE_KEYS.user);
}

export function setCurrentUser(username) {
    localStorage.setItem(STORAGE_KEYS.user, username);
}

export function clearCurrentUser() {
    localStorage.removeItem(STORAGE_KEYS.user);
}

// --- Cross-session history (Supabase when signed in, localStorage fallback) ---
//
// Summary shape (camelCase in JS, snake_case in the DB):
// { ts, testMode, difficulty, focusedRatio, avgRecoveryMs, accuracy, distance,
//   durationMs, firstHalfFocus, secondHalfFocus, breathingCount,
//   adaptiveThresholdUsed }

async function getCloudSession() {
    try {
        const supabase = await getSupabase();
        if (!supabase) return { supabase: null, userId: null };
        const { data } = await supabase.auth.getSession();
        return { supabase, userId: data?.session?.user?.id || null };
    } catch (e) {
        return { supabase: null, userId: null };
    }
}

function readLocalHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.history);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function writeLocalHistory(entries) {
    try {
        localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(entries.slice(-HISTORY_LIMIT)));
    } catch (e) {
        /* storage full/blocked: history is best-effort */
    }
}

function rowToSummary(row) {
    return {
        ts: row.ts,
        testMode: row.test_mode,
        difficulty: row.difficulty,
        focusedRatio: Number(row.focused_ratio ?? 0),
        avgRecoveryMs: Number(row.avg_recovery_ms ?? 0),
        accuracy: Number(row.accuracy ?? 0),
        distance: Number(row.distance ?? 0),
        durationMs: Number(row.duration_ms ?? 0),
        firstHalfFocus: Number(row.first_half_focus ?? 0),
        secondHalfFocus: Number(row.second_half_focus ?? 0),
        breathingCount: Number(row.breathing_count ?? 0),
        adaptiveThresholdUsed: row.adaptive_threshold_used == null ? null : Number(row.adaptive_threshold_used)
    };
}

// Returns the most recent sessions, oldest first (ready for trend charts).
export async function getSessionHistory(limit = HISTORY_LIMIT) {
    const { supabase, userId } = await getCloudSession();
    if (supabase && userId) {
        try {
            const { data, error } = await supabase
                .from('session_history')
                .select('*')
                .order('ts', { ascending: false })
                .limit(limit);
            if (!error && Array.isArray(data)) {
                return data.map(rowToSummary).reverse();
            }
        } catch (e) {
            /* fall through to local */
        }
    }
    return readLocalHistory().slice(-limit);
}

// --- Voyage log (cumulative journey totals) ---
// The local history above is capped at HISTORY_LIMIT entries, so cumulative
// totals live in a dedicated counter that only ever increments. Signed-in
// users can additionally sum their cloud rows (getCumulativeCloudDistance).

export function getLocalVoyageLog() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.voyage);
        const parsed = raw ? JSON.parse(raw) : null;
        return {
            distanceM: Math.max(0, Number(parsed?.distanceM) || 0),
            stars: Math.max(0, Number(parsed?.stars) || 0),
            sessions: Math.max(0, Number(parsed?.sessions) || 0)
        };
    } catch (e) {
        return { distanceM: 0, stars: 0, sessions: 0 };
    }
}

export function appendVoyageLog({ distanceM = 0, stars = 0 } = {}) {
    const log = getLocalVoyageLog();
    log.distanceM += Math.max(0, Number(distanceM) || 0);
    log.stars += Math.max(0, Number(stars) || 0);
    log.sessions += 1;
    try {
        localStorage.setItem(STORAGE_KEYS.voyage, JSON.stringify(log));
    } catch (e) {
        /* best-effort */
    }
    return log;
}

// Sum of per-session distances across the signed-in user's cloud history.
// Returns null when signed out / offline so callers fall back to the local log.
export async function getCumulativeCloudDistance() {
    const { supabase, userId } = await getCloudSession();
    if (!supabase || !userId) return null;
    try {
        const { data, error } = await supabase.from('session_history').select('distance');
        if (error || !Array.isArray(data)) return null;
        return data.reduce((sum, row) => sum + Math.max(0, Number(row.distance) || 0), 0);
    } catch (e) {
        return null;
    }
}

export async function appendSessionSummary(summary) {
    const entry = { ...summary, ts: summary.ts || new Date().toISOString() };

    // Always mirror locally so the trend still shows offline / logged-out.
    const local = readLocalHistory();
    local.push(entry);
    writeLocalHistory(local);

    const { supabase, userId } = await getCloudSession();
    if (!supabase || !userId) return { stored: 'local' };

    try {
        const { error } = await supabase.from('session_history').insert({
            user_id: userId,
            ts: entry.ts,
            test_mode: entry.testMode,
            difficulty: entry.difficulty ?? null,
            focused_ratio: entry.focusedRatio ?? null,
            avg_recovery_ms: entry.avgRecoveryMs ?? null,
            accuracy: entry.accuracy ?? null,
            distance: entry.distance ?? null,
            duration_ms: entry.durationMs ?? null,
            first_half_focus: entry.firstHalfFocus ?? null,
            second_half_focus: entry.secondHalfFocus ?? null,
            breathing_count: entry.breathingCount ?? null,
            adaptive_threshold_used: entry.adaptiveThresholdUsed ?? null
        });
        return { stored: error ? 'local' : 'cloud' };
    } catch (e) {
        return { stored: 'local' };
    }
}
