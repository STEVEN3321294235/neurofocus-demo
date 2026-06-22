import { setState } from './state.js';
import homePage from '../pages/home/index.js';
import authPage from '../pages/auth/index.js';
import setupPage from '../pages/setup/index.js';
import gamePage from '../pages/game/index.js';
import resultsPage from '../pages/results/index.js';

const pages = {
    home: homePage,
    auth: authPage,
    setup: setupPage,
    game: gamePage,
    results: resultsPage
};

// #region debug-point B:router-report
const DEBUG_SERVER_URL = window.__TRAE_DEBUG_SERVER_URL__ || null;
const reportRouterDebug = (hypothesisId, msg, data = {}) => {
    if (!DEBUG_SERVER_URL) return Promise.resolve();
    return fetch(DEBUG_SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'stitch-layout-game-render', runId: 'post-fix', hypothesisId, location: 'app/router.js', msg: `[DEBUG] ${msg}`, data, ts: Date.now() })
    }).catch(() => {});
};
// #endregion

let rootNode = null;
let currentPage = null;
let isRendering = false;
let pendingRefresh = false;

function normalizeRoute(hash) {
    const cleaned = String(hash || '#home').replace(/^#/, '') || 'home';
    return pages[cleaned] ? cleaned : 'home';
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
        // #region debug-point B:route-render
        reportRouterDebug('B', 'router render route', {
            hash: window.location.hash,
            route,
            hasCurrentPage: Boolean(currentPage),
            rootChildCount: rootNode?.childElementCount || 0
        });
        // #endregion

        if (currentPage?.unmount) {
            await currentPage.unmount();
        }

        const page = pages[route] || pages.home;
        rootNode.innerHTML = page.render();
        currentPage = page;
        // #region debug-point B:route-html-applied
        reportRouterDebug('B', 'router applied page html', {
            route,
            pageName: page === pages.home ? 'home' : route,
            hasHomeShell: Boolean(rootNode.querySelector('.home-shell')),
            hasCanvasContainer: Boolean(rootNode.querySelector('#canvas-container'))
        });
        // #endregion

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
