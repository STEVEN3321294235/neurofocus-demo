import { setState } from './state.js';
import { importVersionedModule } from '../services/runtimeLoader.js?v=2026-07-25-2';

const pageModulePaths = {
    home: '/pages/home/index.js',
    auth: '/pages/auth/index.js',
    setup: '/pages/setup/index.js',
    game: '/pages/game/index.js',
    results: '/pages/results/index.js'
};

const pageCache = new Map();


let rootNode = null;
let currentPage = null;
let isRendering = false;
let pendingRefresh = false;

function normalizeRoute(hash) {
    const cleaned = String(hash || '#home').replace(/^#/, '') || 'home';
    return pageModulePaths[cleaned] ? cleaned : 'home';
}

async function loadPage(route) {
    if (pageCache.has(route)) return pageCache.get(route);
    const module = await importVersionedModule(pageModulePaths[route] || pageModulePaths.home);
    const page = module.default || module;
    pageCache.set(route, page);
    return page;
}

async function renderRoute() {
    if (!rootNode) return;
    if (isRendering) {
        pendingRefresh = true;
        return;
    }
    isRendering = true;
    try {
        const route = normalizeRoute(window.location.hash);
        setState({ route });

        if (currentPage?.unmount) {
            await currentPage.unmount();
        }

        const page = await loadPage(route);
        rootNode.innerHTML = page.render();
        currentPage = page;

        if (page.mount) {
            await page.mount({ root: rootNode, router: routerApi });
        }
    } finally {
        isRendering = false;
    }

    if (pendingRefresh) {
        pendingRefresh = false;
        return renderRoute();
    }
}

export const routerApi = {
    navigate(route) {
        const nextHash = `#${route}`;
        if (window.location.hash === nextHash) {
            return renderRoute();
        }
        window.location.hash = nextHash;
        return Promise.resolve();
    },
    refresh() {
        return renderRoute();
    }
};

export function initRouter(root) {
    rootNode = root;
    window.addEventListener('hashchange', renderRoute);
    if (!window.location.hash) {
        window.location.hash = '#home';
    }
    return renderRoute();
}
