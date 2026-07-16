// Generate a printable bilingual MD from studyMaterials.js so the paper
// matches the platform EXACTLY (same notes, same MCQs, same answers).
import { getStudyMaterial } from '../pages/game/studyMaterials.js';

const A = (s) => (s == null ? '' : String(s));

function blockToMd(b) {
    const lines = [];
    const zh = (n) => A(n?.hk);
    const en = (n) => A(n?.en);
    if (b.type === 'heading') {
        lines.push(`#### ${zh(b.text)}　/　${en(b.text)}`);
    } else if (b.type === 'lead') {
        lines.push(`*${zh(b.text)}*`);
        lines.push('');
        lines.push(`*${en(b.text)}*`);
    } else if (b.type === 'note') {
        lines.push(`> **【重點 / Key】** ${zh(b.text)}`);
        lines.push('>');
        lines.push(`> ${en(b.text)}`);
    } else if (b.type === 'list') {
        (b.items || []).forEach((it) => {
            lines.push(`- ${zh(it)}`);
            lines.push(`  - ${en(it)}`);
        });
    } else if (b.type === 'term') {
        lines.push(`- **${zh(b.term)} / ${en(b.term)}**：${zh(b.def)}`);
        lines.push(`  - ${en(b.def)}`);
    } else { // para
        lines.push(zh(b.text));
        lines.push('');
        lines.push(en(b.text));
    }
    return lines.join('\n');
}

function materialToMd(depthLabel, m) {
    const out = [];
    out.push(`## 材料：${A(m.topic?.hk)}　/　${A(m.topic?.en)}　（${depthLabel}）`);
    out.push('');
    m.pages.forEach((p) => {
        out.push(`### ${A(p.title?.hk)}　/　${A(p.title?.en)}`);
        out.push('');
        (p.blocks || []).forEach((b) => {
            out.push(blockToMd(b));
            out.push('');
        });
    });
    // Quiz
    out.push(`### 測驗卷 / Quiz（共 ${m.quiz.length} 題）`);
    out.push('');
    m.quiz.forEach((q, i) => {
        const letters = ['A', 'B', 'C', 'D'];
        out.push(`**${i + 1}.** ${A(q.question?.hk)}`);
        out.push('');
        out.push(`　　${A(q.question?.en)}`);
        out.push('');
        (q.options?.hk || []).forEach((opt, oi) => {
            const en = (q.options?.en || [])[oi];
            out.push(`- **${letters[oi]}.** ${A(opt)}　/　${A(en)}`);
        });
        out.push('');
        out.push(`> **答案 / Answer：${letters[q.answer]}** — ${A(q.explanation?.hk)}　/　${A(q.explanation?.en)}`);
        out.push('');
    });
    // Answer key summary
    out.push('#### 答案速查 / Answer Key');
    out.push('');
    out.push('| 題 Q | ' + m.quiz.map((_, i) => i + 1).join(' | ') + ' |');
    out.push('|' + '---|'.repeat(m.quiz.length + 1));
    out.push('| **答案** | ' + m.quiz.map((q) => ['A', 'B', 'C', 'D'][q.answer]).join(' | ') + ' |');
    out.push('');
    return out.join('\n');
}

const foundation = getStudyMaterial('biology', 'foundation');
const advanced = getStudyMaterial('biology', 'advanced');

const doc = [];
doc.push('# 學習模式教材（紙本版）— 生物：細胞膜與物質運輸');
doc.push('# Study Mode Materials (Paper Version) — Biology: Cell Membrane & Transport');
doc.push('');
doc.push('> **用途**：呢份係「學習模式」對照實驗嘅**紙本組**用料。內容（筆記＋測驗 MC＋答案）由 `pages/game/studyMaterials.js` **程式自動生成**，同平台版**逐字一致**，可直接打印做紙本卷。');
doc.push('>');
doc.push('> **This file is auto-generated from `pages/game/studyMaterials.js`** — the notes, MCQs and answers are byte-for-byte identical to what the platform shows, so the paper group and the platform group read the exact same material.');
doc.push('>');
doc.push('> 重新生成方法 / To regenerate: `node scripts/gen_materials_md.mjs > docs/STUDY_MATERIALS_PRINT.md`');
doc.push('>');
doc.push('> 生成日期 / Generated：2026-07-17');
doc.push('');
doc.push('- **基礎組（初中程度）= 材料一（AB 組）**');
doc.push('- **進階組（高中程度）= 材料二（CD 組）**');
doc.push('');
doc.push('> 印卷提示：每份材料嘅「測驗卷」印俾學生時，記得**遮住／刪走**每題下面嘅「答案 / Answer」行同「答案速查」表——嗰啲係俾老師改卷用。');
doc.push('');
doc.push('---');
doc.push('');
doc.push(materialToMd('基礎 Foundation · 初中', foundation));
doc.push('---');
doc.push('');
doc.push(materialToMd('進階 Advanced · 高中', advanced));

console.log(doc.join('\n'));
