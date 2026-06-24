const state = {
    route: 'home',
    lang: 'hk',
    theme: 'dark',
    currentUser: null,
    authView: 'login',
    inputMode: 'idle',
    setupStep: 'mode',
    difficulty: null,
    cameraConsent: 'unknown',
    focusSource: 'simulation-fallback'
};

const listeners = new Set();

export function getState() {
    return state;
}

export function setState(patch) {
    const next = typeof patch === 'function' ? patch(state) : patch;
    Object.assign(state, next || {});
    listeners.forEach((listener) => listener(state));
    return state;
}

export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function resetFlowState() {
    setState({
        inputMode: 'idle',
        setupStep: 'mode',
        difficulty: null,
        authView: 'login',
        cameraConsent: 'unknown',
        focusSource: 'simulation-fallback'
    });
}
