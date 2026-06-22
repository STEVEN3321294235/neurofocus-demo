const STORAGE_KEYS = {
    lang: 'game_lang',
    theme: 'theme',
    user: 'current_user'
};

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
