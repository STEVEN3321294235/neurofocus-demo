// Shared motion and theme helpers for the glass pages (Home, Setup, results).
//
// Motion vocabulary taken from the reference site the team picked: text
// slides up out of a mask with a short stagger, blocks rise as they come into
// view, and a 0 -> 100 counter opens the first visit. Everything moves with
// transform / opacity only and is skipped when the device asks for less motion.

import { getState, setState } from '../app/state.js';
import { setTheme as persistTheme } from '../services/storageService.js';
import { applyStoredTheme } from './controlBar.js?v=2026-07-28-2';

export function prefersReducedMotion() {
    try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
        return false;
    }
}

export function backdropHTML() {
    return `
        <div class="nb-backdrop" aria-hidden="true">
            <span class="nb-glow nb-glow-1"></span>
            <span class="nb-glow nb-glow-2"></span>
            <span class="nb-glow nb-glow-3"></span>
        </div>`;
}

// Buttons whose label rolls up on hover: two stacked copies of the text.
export function rollLabel(text) {
    return `<span class="nb-roll"><span>${text}</span><span aria-hidden="true">${text}</span></span>`;
}

const CJK = /[㐀-鿿]/;
const NO_LINE_START = /^[，。、！？：；）」』》〉…·%]/;

// Split a heading into masked words. Latin text splits on spaces; Chinese
// text splits per character, keeping closing punctuation with the character
// before it so a line never starts with "，" or "？".
export function splitText(el, { delay = 0 } = {}) {
    if (!el || el.dataset.splitDone) return;
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    const pieces = [];
    if (CJK.test(text)) {
        // Latin runs inside Chinese text (numbers, "NeuroFocus") stay whole,
        // and spaces stay real spaces between the masks.
        for (const token of text.match(/[A-Za-z0-9.%]+|\s+|./gu) || []) {
            if (/^\s+$/.test(token)) pieces.push(' ');
            else if (pieces.length && pieces[pieces.length - 1] !== ' ' && NO_LINE_START.test(token)) pieces[pieces.length - 1] += token;
            else pieces.push(token);
        }
    } else {
        text.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) pieces.push(' ');
            else pieces.push(part);
        });
    }
    let index = 0;
    el.innerHTML = pieces.map((piece) => {
        if (piece === ' ') return ' ';
        const html = piece.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
        const out = `<span class="nb-split-mask" aria-hidden="true"><span class="nb-split-word" style="--i:${index};--d:${delay}ms">${html}</span></span>`;
        index += 1;
        return out;
    }).join('');
    el.dataset.splitDone = '1';
}

// Adds .is-in to [data-split] and [data-reveal] elements as they come into view.
// Returns a function that stops watching.
export function startReveals(root) {
    root.querySelectorAll('[data-split]').forEach((el) => splitText(el, { delay: Number(el.dataset.split) || 0 }));
    const targets = Array.from(root.querySelectorAll('[data-split], [data-reveal], [data-draw]'));
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
        targets.forEach((el) => el.classList.add('is-in'));
        return () => {};
    }
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-in');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
}

// First visit in this browser tab: a short 0 -> 100 counter, then the cover
// lifts. Later visits (and "reduce motion") skip it.
export function playIntro(label) {
    let seen = false;
    try { seen = sessionStorage.getItem('nf_intro_seen') === '1'; } catch (e) { seen = true; }
    if (seen || prefersReducedMotion()) return Promise.resolve();
    try { sessionStorage.setItem('nf_intro_seen', '1'); } catch (e) { /* best-effort */ }
    const cover = document.createElement('div');
    cover.className = 'nb-intro';
    cover.setAttribute('aria-hidden', 'true');
    cover.innerHTML = `<span class="nb-intro-label">${label}</span><span class="nb-intro-count">000</span><span class="nb-intro-bar"></span>`;
    document.body.appendChild(cover);
    const count = cover.querySelector('.nb-intro-count');
    const bar = cover.querySelector('.nb-intro-bar');
    const DURATION = 1100;
    const start = performance.now();
    return new Promise((resolve) => {
        const step = (now) => {
            const p = Math.min(1, (now - start) / DURATION);
            const eased = 1 - (1 - p) ** 3;
            count.textContent = String(Math.round(eased * 100)).padStart(3, '0');
            bar.style.transform = `scaleX(${eased})`;
            if (p < 1) {
                requestAnimationFrame(step);
                return;
            }
            cover.classList.add('is-done');
            setTimeout(() => cover.remove(), 950);
            // Let the page start revealing while the cover slides away.
            setTimeout(resolve, 250);
        };
        requestAnimationFrame(step);
    });
}

// Light / dark switch button. Same storage and body classes as the rest of
// the site, so the game scene and older pages follow the choice too.
export function themeToggleHTML(t) {
    const isLight = getState().theme === 'light';
    return `<button type="button" class="nb-icon-btn" data-theme-toggle aria-label="${t('theme_switch')}" title="${t(isLight ? 'theme_dark' : 'theme_light')}">${isLight ? '☾' : '☀'}</button>`;
}

export function bindThemeToggle(root, onChange) {
    root.querySelectorAll('[data-theme-toggle]').forEach((button) => {
        button.addEventListener('click', () => {
            const next = getState().theme === 'light' ? 'dark' : 'light';
            persistTheme(next);
            setState({ theme: next });
            applyStoredTheme(next);
            if (typeof onChange === 'function') onChange(next);
        });
    });
}
