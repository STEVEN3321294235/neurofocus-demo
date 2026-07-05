// Vercel serverless function: DeepSeek question proxy.
//
// Purpose: keep the DeepSeek API key server-side (process.env.DEEPSEEK_API_KEY)
// so it is NEVER shipped to the browser. The browser calls POST /api/questions
// with { count, difficulty, lang }; this function builds the prompt, calls
// DeepSeek server-side, and returns { ok: true, questions: [...] } on success
// or { ok: false, reason } on failure.
//
// This file is deliberately self-contained (it duplicates the difficulty table
// and prompt template from pages/game/runtime.js) because this is a
// no-build-step project and a browser ES module cannot be required by a Node
// serverless function.

const DIFFICULTY_PROFILES = {
    easy: {
        ageBand: { hk: '7-10 歲', en: 'Ages 7-10' },
        promptAge: 'primary students aged 7-10',
        skillPool: ['pattern', 'classification', 'everyday math']
    },
    medium: {
        ageBand: { hk: '11-13 歲', en: 'Ages 11-13' },
        promptAge: 'middle school students aged 11-13',
        skillPool: ['sequence', 'logic deduction', 'multi-step math']
    },
    hard: {
        ageBand: { hk: '14-16 歲', en: 'Ages 14-16' },
        promptAge: 'secondary students aged 14-16',
        skillPool: ['stroop conflict', 'reverse instruction', 'hidden rule detection']
    }
};

// Server can afford the longer timeout budget used for background fetches.
const UPSTREAM_TIMEOUT_MS = 15000;

function ageBandLabel(profile, lang) {
    return profile.ageBand[lang] || profile.ageBand.hk;
}

function buildPrompt(count, difficulty, lang) {
    const profile = DIFFICULTY_PROFILES[difficulty] || DIFFICULTY_PROFILES.easy;
    const langStr = lang === 'hk'
        ? 'Traditional Chinese (Cantonese context if applicable)'
        : 'English';

    let diffStr = difficulty;
    if (diffStr === 'easy') diffStr = 'Medium-Easy';
    if (diffStr === 'medium') diffStr = 'Hard';
    if (diffStr === 'hard') diffStr = 'Advanced Focus Training';

    const hardModeRules = difficulty === 'hard'
        ? `6. HARD mode must focus on attention-control puzzle types: Stroop-style conflict, reverse instruction, hidden instruction, elimination, misleading reading comprehension, or rule switching.
7. HARD mode must NOT require chemistry, biology, physics, or specialist school-subject knowledge to answer correctly.
8. At least 70% of the questions must use the hard-mode attention-control patterns above.
9. Prefer traps that reward slow reading and careful rule following instead of fact recall.`
        : `6. Use school-friendly everyday logic and reasoning without requiring niche subject memorization.
7. Avoid repetitive algebra-only, equation-only, or pure number-sequence-only questions unless embedded in a realistic scenario.
8. Ensure high variety in question patterns to avoid repeating similar structures.`;

    const band = ageBandLabel(profile, lang);

    return `Generate ${count} highly engaging real-world multiple-choice reasoning questions.
Difficulty Level: ${diffStr}. Language: ${langStr}. Target Audience: ${profile.promptAge}.
Training goal: strictly challenge and extend focus span, emphasizing ${profile.skillPool.join(', ')}.
REQUIREMENTS:
1. Puzzles MUST require multi-step thinking or careful deduction. Avoid trivial or immediate answers.
2. Every puzzle MUST have exactly ONE objectively correct answer.
3. Keep each question concise: <= 42 Chinese characters or <= 100 English characters.
4. Keep each option concise: <= 16 Chinese characters or <= 34 English characters.
5. Keep explanation useful: <= 60 Chinese characters or <= 140 English characters.
${hardModeRules}
10. Return a STRICT JSON object with a "questions" array only.

Fields:
{
  "questions": [
    {
      "question": string,
      "options": string[4],
      "answer": integer 0-3,
      "explanation": "explain why the correct option is unique and why the others fail",
      "skill": "one short label such as Biology Logic, Chemistry Reasoning, Deduction",
      "ageBand": "${band}",
      "validation": "one short rule proving the answer"
    }
  ]
}

Example:
{"questions":[{"question":"Do not solve 48+27. How many digits appear in that expression?","options":["2","3","4","5"],"answer":2,"explanation":"The digits are 4, 8, 2, and 7, so there are four digits.","skill":"Hidden Instruction","ageBand":"${band}","validation":"count digits, do not calculate"}]}`;
}

// Basic server-side sanity check. The browser still runs its own authoritative
// validation (finalizeQuestionBatch) as defense in depth, so this only filters
// obviously broken items and never forwards raw upstream errors.
function sanitizeQuestions(parsed) {
    let arr = [];
    if (parsed && Array.isArray(parsed.questions)) arr = parsed.questions;
    else if (Array.isArray(parsed)) arr = parsed;
    else if (parsed && parsed.question) arr = [parsed];

    return arr.filter((item) =>
        item &&
        typeof item.question === 'string' && item.question.trim().length >= 6 &&
        Array.isArray(item.options) && item.options.length === 4 &&
        item.options.every((o) => typeof o === 'string' && o.trim().length > 0) &&
        Number.isInteger(item.answer) && item.answer >= 0 && item.answer <= 3
    );
}

module.exports = async (req, res) => {
    // Health check: GET /api/questions tells you whether the key is attached to
    // THIS deployment's environment WITHOUT ever revealing the key value.
    // Open the URL in a browser after deploying — expect { hasKey: true }.
    if (req.method === 'GET') {
        const key = process.env.DEEPSEEK_API_KEY || '';
        res.status(200).json({
            ok: true,
            health: 'questions-proxy',
            hasKey: key.length > 0,
            keyLength: key.length, // length only, never the value
            vercelEnv: process.env.VERCEL_ENV || 'unknown'
        });
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ ok: false, reason: 'method-not-allowed' });
        return;
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        // Misconfiguration: env var not set in Vercel. The client will fall back
        // to its local question bank, so the game stays playable.
        res.status(500).json({ ok: false, reason: 'server-missing-key' });
        return;
    }

    // Body may arrive already parsed (Vercel) or as a raw string.
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    body = body || {};

    const count = Number(body.count);
    const difficulty = String(body.difficulty || '');
    const lang = String(body.lang || '');

    if (!Number.isInteger(count) || count < 1 || count > 20) {
        res.status(400).json({ ok: false, reason: 'invalid-count' });
        return;
    }
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        res.status(400).json({ ok: false, reason: 'invalid-difficulty' });
        return;
    }
    if (!['hk', 'en'].includes(lang)) {
        res.status(400).json({ ok: false, reason: 'invalid-lang' });
        return;
    }

    const prompt = buildPrompt(count, difficulty, lang);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    try {
        const upstream = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: 'You are a focus-training game designer. Return strictly valid JSON object with a questions array only.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.9,
                max_tokens: 1500,
                response_format: { type: 'json_object' }
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!upstream.ok) {
            // Never forward the raw upstream body (could leak internals/keys).
            res.status(502).json({ ok: false, reason: `upstream-${upstream.status}` });
            return;
        }

        const data = await upstream.json();
        let content = data && data.choices && data.choices[0] && data.choices[0].message
            ? data.choices[0].message.content
            : null;

        if (typeof content !== 'string' || !content.trim()) {
            res.status(502).json({ ok: false, reason: 'empty-content' });
            return;
        }
        content = content.replace(/```json/g, '').replace(/```/g, '');

        let parsed;
        try {
            parsed = JSON.parse(content);
        } catch (e) {
            res.status(502).json({ ok: false, reason: 'invalid-json' });
            return;
        }

        const questions = sanitizeQuestions(parsed);
        if (questions.length === 0) {
            res.status(502).json({ ok: false, reason: 'empty-question-list' });
            return;
        }

        res.status(200).json({ ok: true, questions });
    } catch (err) {
        clearTimeout(timeoutId);
        const reason = err && err.name === 'AbortError' ? 'timeout' : 'proxy-error';
        res.status(504).json({ ok: false, reason });
    }
};
