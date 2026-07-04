const INITIAL_AI_TIMEOUT_MS = 8000;
const BACKGROUND_AI_TIMEOUT_MS = 15000;
const INITIAL_PLAYABLE_QUESTIONS = 4;

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

function sendJson(res, statusCode, payload) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
    if (req.body && typeof req.body === 'object') {
        return req.body;
    }

    if (typeof req.body === 'string' && req.body.trim()) {
        return JSON.parse(req.body);
    }

    const chunks = [];
    for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const rawBody = Buffer.concat(chunks).toString('utf8').trim();
    return rawBody ? JSON.parse(rawBody) : {};
}

function questionSignature(item = {}) {
    const question = String(item.question || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const options = Array.isArray(item.options)
        ? item.options.map((option) => String(option || '').toLowerCase().replace(/\s+/g, ' ').trim()).join('|')
        : '';
    return `${question}::${options}`;
}

function compactText(value, maxLength) {
    const normalized = String(value || '')
        .replace(/\s+/g, ' ')
        .trim();

    if (!Number.isFinite(maxLength) || maxLength <= 0) {
        return normalized;
    }

    return normalized.slice(0, maxLength);
}

function getDifficultyProfile(difficulty = 'easy') {
    return DIFFICULTY_PROFILES[difficulty] || DIFFICULTY_PROFILES.easy;
}

function getAgeBandLabel(profile, lang = 'hk') {
    return profile.ageBand[lang] || profile.ageBand.hk;
}

function normalizeQuestionItem(item = {}, lang = 'hk', difficulty = 'easy') {
    const isHk = lang === 'hk';
    const explanationLimit = isHk ? 60 : 140;
    const profile = getDifficultyProfile(difficulty);

    return {
        question: compactText(item.question),
        options: Array.isArray(item.options)
            ? item.options.slice(0, 4).map((option) => compactText(option))
            : [],
        answer: Number.isInteger(item.answer) ? item.answer : 0,
        explanation: compactText(item.explanation || '', explanationLimit),
        skill: compactText(item.skill || (isHk ? '邏輯推理' : 'Logic'), isHk ? 10 : 24),
        ageBand: compactText(item.ageBand || getAgeBandLabel(profile, lang), isHk ? 10 : 24),
        validation: compactText(item.validation || item.explanation || '', explanationLimit),
        source: 'ai'
    };
}

function validateQuestionItem(item, lang = 'hk', seenSignatures = new Set()) {
    const reasons = [];
    const normalizedOptions = Array.isArray(item.options)
        ? item.options.map((option) => String(option || '').trim()).filter(Boolean)
        : [];

    if (!item.question || item.question.length < 6) reasons.push('question-too-short');
    if (normalizedOptions.length !== 4) reasons.push('option-count');
    if (new Set(normalizedOptions.map((option) => option.toLowerCase())).size !== 4) reasons.push('duplicate-options');
    if (!Number.isInteger(item.answer) || item.answer < 0 || item.answer > 3) reasons.push('answer-range');
    if (!item.explanation || item.explanation.length < (lang === 'hk' ? 8 : 18)) reasons.push('explanation-too-short');

    const bannedPatterns = /(all of the above|none of the above|以上皆是|以上皆非)/i;
    if (normalizedOptions.some((option) => bannedPatterns.test(option))) reasons.push('ambiguous-option');

    const signature = questionSignature(item);
    if (!signature || seenSignatures.has(signature)) reasons.push('duplicate-question');

    return {
        ok: reasons.length === 0,
        reasons,
        signature
    };
}

function finalizeQuestionBatch(items = [], count = 10, lang = 'hk', difficulty = 'easy') {
    const seenSignatures = new Set();
    const accepted = [];

    items.forEach((item) => {
        if (accepted.length >= count) return;
        const normalized = normalizeQuestionItem(item, lang, difficulty);
        const verdict = validateQuestionItem(normalized, lang, seenSignatures);
        if (!verdict.ok) return;
        seenSignatures.add(verdict.signature);
        accepted.push(normalized);
    });

    return accepted.slice(0, count);
}

function buildPrompt({ count, difficulty, lang }) {
    const difficultyProfile = getDifficultyProfile(difficulty);
    const langStr = lang === 'hk' ? 'Traditional Chinese (Cantonese context if applicable)' : 'English';
    const ageBandLabel = getAgeBandLabel(difficultyProfile, lang);

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

    return `Generate ${count} highly engaging real-world multiple-choice reasoning questions.
        Difficulty Level: ${diffStr}. Language: ${langStr}. Target Audience: ${difficultyProfile.promptAge}.
        Training goal: strictly challenge and extend focus span, emphasizing ${difficultyProfile.skillPool.join(', ')}.
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
              "ageBand": "${ageBandLabel}",
              "validation": "one short rule proving the answer"
            }
          ]
        }
        
        Example:
        {"questions":[{"question":"Do not solve 48+27. How many digits appear in that expression?","options":["2","3","4","5"],"answer":2,"explanation":"The digits are 4, 8, 2, and 7, so there are four digits.","skill":"Hidden Instruction","ageBand":"${ageBandLabel}","validation":"count digits, do not calculate"}]}`;
}

async function callDeepSeek({ count, difficulty, lang }) {
    const apiKey = String(process.env.DEEPSEEK_API_KEY || '').trim();
    if (!apiKey) {
        throw new Error('Missing DEEPSEEK_API_KEY');
    }

    const controller = new AbortController();
    const timeoutMs = count <= INITIAL_PLAYABLE_QUESTIONS ? INITIAL_AI_TIMEOUT_MS : BACKGROUND_AI_TIMEOUT_MS;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: 'You are a focus-training game designer. Return strictly valid JSON object with a questions array only.' },
                    { role: 'user', content: buildPrompt({ count, difficulty, lang }) }
                ],
                temperature: 0.9,
                max_tokens: 1500,
                response_format: { type: 'json_object' }
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API Error ${response.status}: ${errText}`);
        }

        const data = await response.json();
        let content = data?.choices?.[0]?.message?.content;

        if (typeof content !== 'string' || !content.trim()) {
            throw new Error('AI response missing content');
        }

        content = content.replace(/```json/g, '').replace(/```/g, '');

        let parsed;
        try {
            parsed = JSON.parse(content);
        } catch (error) {
            throw new Error('Invalid JSON from AI');
        }

        let rawQuestions = [];
        if (Array.isArray(parsed?.questions)) {
            rawQuestions = parsed.questions;
        } else if (Array.isArray(parsed)) {
            rawQuestions = parsed;
        } else if (parsed?.question) {
            rawQuestions = [parsed];
        }

        const questions = finalizeQuestionBatch(rawQuestions, count, lang, difficulty);
        if (questions.length === 0) {
            throw new Error('AI returned empty question list');
        }

        return questions;
    } finally {
        clearTimeout(timeoutId);
    }
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return sendJson(res, 405, { ok: false, reason: 'Method not allowed' });
    }

    let payload;
    try {
        payload = await readJsonBody(req);
    } catch (error) {
        return sendJson(res, 400, { ok: false, reason: 'Invalid JSON body' });
    }

    const count = Number(payload?.count);
    const difficulty = String(payload?.difficulty || '').trim();
    const lang = String(payload?.lang || '').trim();

    if (!Number.isInteger(count) || count < 1 || count > 20) {
        return sendJson(res, 400, { ok: false, reason: 'Invalid count. Expected integer 1-20.' });
    }

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        return sendJson(res, 400, { ok: false, reason: 'Invalid difficulty. Expected easy, medium, or hard.' });
    }

    if (!['hk', 'en'].includes(lang)) {
        return sendJson(res, 400, { ok: false, reason: 'Invalid lang. Expected hk or en.' });
    }

    try {
        const questions = await callDeepSeek({ count, difficulty, lang });
        return sendJson(res, 200, { ok: true, questions });
    } catch (error) {
        const reason = String(error?.message || error || 'Unknown error');
        const isTimeout = error?.name === 'AbortError' || /abort|timed out/i.test(reason);
        const statusCode = isTimeout ? 504 : /missing deepseek_api_key/i.test(reason) ? 500 : 502;
        return sendJson(res, statusCode, { ok: false, reason });
    }
};
