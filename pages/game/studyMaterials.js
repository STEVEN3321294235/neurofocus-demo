// Study Mode reading materials (D3).
//
// PLACEHOLDER STAGE (2026-07-16, Steven's call): the real Biology passages are
// not written yet, so every page body is intentionally BLANK — the reader UI,
// per-page timer, and paging flow are built and tested against this structure
// first. When the teacher-provided material arrives, fill in `content` (and
// adjust page counts) here; nothing else needs to change.
//
// Shape: getStudyMaterial(subject, depth) -> { pages: [{ title: {hk, en}, content: {hk, en} }] }

const BLANK = { hk: '', en: '' };

function placeholderPages(count) {
    const pages = [];
    for (let i = 1; i <= count; i += 1) {
        pages.push({
            title: { hk: `第 ${i} 節`, en: `Section ${i}` },
            content: BLANK
        });
    }
    return pages;
}

const STUDY_MATERIALS = {
    biology: {
        foundation: { pages: placeholderPages(5) },
        advanced: { pages: placeholderPages(5) }
    }
};

export const STUDY_PAGE_LIMIT_MS = 3 * 60 * 1000; // teacher's cap: 3 minutes per page

export function getStudyMaterial(subject = 'biology', depth = 'foundation') {
    const bySubject = STUDY_MATERIALS[subject] || STUDY_MATERIALS.biology;
    return bySubject[depth] || bySubject.foundation;
}
