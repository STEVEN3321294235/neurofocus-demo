// Local storage for the experiment mode.
//
// Everything stays in this browser (localStorage). Nothing here is sent to a
// server: the cloud history table belongs to training / challenge and is not
// touched. Records are tagged with the signed-in user name, and every reader
// below filters by it, so one person never sees another person's tests.

import { buildOrderBlock } from './labAnalysis.js?v=2026-07-28-2';

const SESSIONS_KEY = 'nf_lab_sessions_v1';
const ORDER_KEY = 'nf_lab_order_queue_v1';
const LAST_KEY = 'nf_lab_last_session_v1';
// Second-by-second and answer-by-answer logs are kept for the newest tests
// only; older ones keep their summary so "your earlier tests" still works.
const FULL_DETAIL_LIMIT = 24;
const TOTAL_LIMIT = 200;

function read(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
        return fallback;
    }
}

function write(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        return false;
    }
}

function randomInt(n) {
    try {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        return buf[0] % n;
    } catch (e) {
        return Math.floor(Math.random() * n);
    }
}

export function newSessionId() {
    return `lab_${Date.now().toString(36)}_${randomInt(1e6).toString(36)}`;
}

// --- order of the two conditions -------------------------------------------
// One queue per input source, so rehearsals in demo or camera mode never use
// up (and unbalance) the order meant for real headband tests.
export function peekOrder(source) {
    const queues = read(ORDER_KEY, {});
    if (!Array.isArray(queues[source]) || queues[source].length === 0) {
        queues[source] = buildOrderBlock(randomInt);
        write(ORDER_KEY, queues);
    }
    return queues[source][0];
}

// Called only when a test is finished and saved. An abandoned test leaves its
// order at the front of the queue for the next person.
export function commitOrder(source, order) {
    const queues = read(ORDER_KEY, {});
    if (Array.isArray(queues[source]) && queues[source][0] === order) {
        queues[source].shift();
        write(ORDER_KEY, queues);
    }
}

// --- test records -----------------------------------------------------------
export function saveSession(record) {
    let all = read(SESSIONS_KEY, []);
    if (!Array.isArray(all)) all = [];
    all.push(record);
    if (all.length > TOTAL_LIMIT) all = all.slice(all.length - TOTAL_LIMIT);
    const slim = (list) => list.map((item, i) => (
        i < list.length - FULL_DETAIL_LIMIT ? { ...item, seconds: undefined, trials: undefined } : item
    ));
    if (!write(SESSIONS_KEY, slim(all))) {
        // Storage full: keep summaries plus this test's full logs.
        write(SESSIONS_KEY, all.map((item) => (
            item.id === record.id ? item : { ...item, seconds: undefined, trials: undefined }
        )));
    }
    try { localStorage.setItem(LAST_KEY, record.id); } catch (e) { /* best-effort */ }
    return record.id;
}

export function listSessions(user) {
    const all = read(SESSIONS_KEY, []);
    if (!Array.isArray(all) || !user) return [];
    return all.filter((item) => item && item.user === user);
}

export function getSession(id, user) {
    return listSessions(user).find((item) => item.id === id) || null;
}

export function getLastSession(user) {
    const sessions = listSessions(user);
    if (!sessions.length) return null;
    let lastId = null;
    try { lastId = localStorage.getItem(LAST_KEY); } catch (e) { lastId = null; }
    return sessions.find((item) => item.id === lastId) || sessions[sessions.length - 1];
}

// "Reset all data" / "delete account" on the Setup page also clear this
// user's experiment records.
export function clearLabData(user) {
    const all = read(SESSIONS_KEY, []);
    if (Array.isArray(all)) write(SESSIONS_KEY, all.filter((item) => item && item.user !== user));
    try { localStorage.removeItem(LAST_KEY); } catch (e) { /* best-effort */ }
}
