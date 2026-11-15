// Wording check: no sentence may mix the two languages, and nothing may be
// left untranslated.
//
//   node scripts/check_i18n.mjs
//
// What it reads:
//   1. app/i18n.js             both dictionaries (same keys, right language)
//   2. pages/game/runtime.js   its own dictionary and every langText(中, EN) pair
//   3. page files + index.html no Chinese written straight into the markup, and
//                              no English words outside the dictionaries
//
// Allowed in a Chinese line: the name "NeuroFocus", {placeholders}, numbers,
// and unit symbols (m, km, km/h, s, ms, %). Everything else in Latin letters
// is reported. Course notes (pages/game/studyMaterials.js) are teaching
// content, not interface wording, and are not checked here.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import os from 'node:os';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const problems = [];
const report = (where, what, text) => problems.push(`${where}: ${what}\n      ${text}`);

const CJK = /[㐀-鿿]/;
const stripAllowed = (text) => text
    .replace(/\$\{[^}]*\}/g, ' ')                 // template expressions
    .replace(/\{[a-z]\}/g, ' ')                    // {n} {s} {a} ... placeholders
    .replace(/NeuroFocus/g, ' ')
    .replace(/\b(?:km\/h|km|ms|m|s)\b/g, ' ')      // unit symbols
    .replace(/&[a-z]+;/g, ' ');
const hasLatinWord = (text) => /[A-Za-z]{2,}/.test(stripAllowed(text));

function checkPair(where, hk, en) {
    if (hasLatinWord(hk)) report(where, 'Chinese line contains English', hk);
    if (CJK.test(en)) report(where, 'English line contains Chinese', en);
    if (!String(hk).trim() !== !String(en).trim()) report(where, 'one language is empty', `${hk} | ${en}`);
}

// ---- 1. app/i18n.js -------------------------------------------------------
{
    const source = read('app/i18n.js')
        .replace("import { getState } from './state.js';", 'const getState = () => ({ lang: "hk" });')
        + '\nexport { copy };';
    const tmp = path.join(os.tmpdir(), `nf-i18n-${process.pid}.mjs`);
    fs.writeFileSync(tmp, source);
    const { copy } = await import(pathToFileURL(tmp).href);
    fs.unlinkSync(tmp);
    const enKeys = Object.keys(copy.en);
    const hkKeys = Object.keys(copy.hk);
    enKeys.filter((k) => !(k in copy.hk)).forEach((k) => report('app/i18n.js', 'missing in Chinese', k));
    hkKeys.filter((k) => !(k in copy.en)).forEach((k) => report('app/i18n.js', 'missing in English', k));
    enKeys.filter((k) => k in copy.hk).forEach((k) => checkPair(`app/i18n.js [${k}]`, copy.hk[k], copy.en[k]));
    console.log(`app/i18n.js: ${enKeys.length} keys in English, ${hkKeys.length} in Chinese`);
}

// ---- 2. pages/game/runtime.js --------------------------------------------
function readLiteral(src, i) {
    const quote = src[i];
    if (!"'\"`".includes(quote)) return null;
    let j = i + 1;
    for (;;) {
        const c = src[j];
        if (c === undefined) return null;
        if (c === '\\') { j += 2; continue; }
        if (quote === '`' && c === '$' && src[j + 1] === '{') {
            let depth = 1;
            j += 2;
            while (depth && j < src.length) {
                if (src[j] === '{') depth += 1;
                else if (src[j] === '}') depth -= 1;
                j += 1;
            }
            continue;
        }
        if (c === quote) break;
        j += 1;
    }
    return { text: src.slice(i + 1, j), end: j + 1 };
}

function langTextPairs(file) {
    const src = read(file);
    const pairs = [];
    const re = /langText\(/g;
    let m;
    while ((m = re.exec(src))) {
        let i = m.index + m[0].length;
        while (/\s/.test(src[i])) i += 1;
        const a = readLiteral(src, i);
        if (!a) continue;
        i = a.end;
        while (/[\s,]/.test(src[i])) i += 1;
        const b = readLiteral(src, i);
        if (!b) continue;
        pairs.push({ line: src.slice(0, m.index).split('\n').length, hk: a.text, en: b.text });
    }
    return pairs;
}

{
    const file = 'pages/game/runtime.js';
    const src = read(file);
    const block = src.slice(src.indexOf('const I18N = {'), src.indexOf('\n};', src.indexOf('const I18N = {')));
    const part = (from, to) => block.slice(block.indexOf(from), to ? block.indexOf(to) : undefined);
    const entries = (text) => Object.fromEntries(
        [...text.matchAll(/^\s{8}([a-zA-Z0-9_]+):\s*"((?:[^"\\]|\\.)*)"/gm)].map((m) => [m[1], m[2]])
    );
    const hk = entries(part('hk: {', 'en: {'));
    const en = entries(part('en: {'));
    // Entries added after the dictionary: I18N.hk.key = "..."
    for (const m of src.matchAll(/^\s*I18N\.(hk|en)\.([a-zA-Z0-9_]+)\s*=\s*"((?:[^"\\]|\\.)*)"/gm)) {
        (m[1] === 'hk' ? hk : en)[m[2]] = m[3];
    }
    Object.keys(en).filter((k) => !(k in hk)).forEach((k) => report(file, 'missing in Chinese', k));
    Object.keys(hk).filter((k) => !(k in en)).forEach((k) => report(file, 'missing in English', k));
    Object.keys(en).filter((k) => k in hk).forEach((k) => checkPair(`${file} I18N[${k}]`, hk[k], en[k]));
    const pairs = langTextPairs(file);
    pairs.forEach((p) => checkPair(`${file}:${p.line}`, p.hk, p.en));
    console.log(`${file}: ${Object.keys(en).length} dictionary keys, ${pairs.length} langText pairs`);
}

// ---- 3. page files: nothing written straight into the markup ---------------
const PAGE_FILES = [
    'pages/home/index.js', 'pages/auth/index.js', 'pages/setup/index.js', 'pages/game/index.js',
    'pages/results/index.js', 'pages/lab/results.js', 'pages/lab/labController.js'
];
const ALLOWED_MARKUP_WORDS = new Set(['NeuroFocus']);

function stripComments(src) {
    return src
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

for (const file of PAGE_FILES) {
    const src = stripComments(read(file));
    src.split('\n').forEach((line, i) => {
        if (CJK.test(line.replace(/[：，、。？！（）「」·—…]/g, ''))) {
            report(`${file}:${i + 1}`, 'Chinese written outside the dictionary', line.trim().slice(0, 120));
        }
    });
    // English words sitting directly between tags: >Some words</tag>
    for (const m of src.matchAll(/>([^<>$`{}]*[A-Za-z]{2,}[^<>$`{}]*)<\//g)) {
        const text = stripAllowed(m[1]).trim();
        const words = text.split(/[^A-Za-z]+/).filter((w) => w.length > 1 && !ALLOWED_MARKUP_WORDS.has(w));
        if (words.length) report(file, 'English written outside the dictionary', text.slice(0, 120));
    }
}
{
    // index.html: static text must come in language pairs (.lang-en / .lang-hk).
    const body = stripComments(read('index.html')).split('<body>')[1] || '';
    const withoutScripts = body.replace(/<script[\s\S]*?<\/script>/g, ' ');
    const withoutPairs = withoutScripts
        .replace(/<span class="lang-en">[^<]*<\/span>/g, ' ')
        .replace(/<span class="lang-hk">[^<]*<\/span>/g, ' ');
    for (const m of withoutPairs.matchAll(/>([^<>]+)</g)) {
        const text = m[1].trim();
        if (!text) continue;
        if (CJK.test(text)) report('index.html', 'Chinese outside a language pair', text);
        else if (hasLatinWord(text)) report('index.html', 'English outside a language pair', text);
    }
    for (const m of withoutScripts.matchAll(/<span class="lang-en">([^<]*)<\/span><span class="lang-hk">([^<]*)<\/span>/g)) {
        checkPair('index.html', m[2], m[1]);
    }
}

if (problems.length) {
    console.log(`\n${problems.length} problem(s):\n`);
    problems.forEach((p) => console.log(`  - ${p}`));
    process.exit(1);
}
console.log('\nOK: no mixed-language lines, no missing translations.');
