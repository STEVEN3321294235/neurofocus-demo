import { clearCurrentUser, getCurrentUser, setCurrentUser } from './storageService.js';

export function login({ username }) {
    const normalized = String(username || '').trim();
    if (!normalized) {
        throw new Error('Please enter a username.');
    }
    setCurrentUser(normalized);
    return { username: normalized };
}

export function register({ username }) {
    const normalized = String(username || '').trim();
    if (!normalized) {
        throw new Error('Please enter a username.');
    }
    setCurrentUser(normalized);
    return { username: normalized };
}

export function logout() {
    clearCurrentUser();
}

export function getSessionUser() {
    const username = getCurrentUser();
    return username ? { username } : null;
}
