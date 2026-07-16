// Study Mode reading materials (D3).
//
// These are PRE-MADE, teacher-reviewable materials for the pilot experiment
// (Steven's request, 2026-07-16). Subject: Biology, topic "The Cell".
//   - foundation = junior-secondary (初中) depth
//   - advanced   = senior-secondary (高中) depth, same topic, deeper.
// Each material is a set of note-style pages plus a preset multiple-choice
// quiz. Page 1 always introduces the topic and what the reader will cover.
//
// Content is authored as structured BLOCKS (not raw HTML), so the reader can
// render clean, notes-like formatting (headings, bullet points, key-term
// definitions) while staying injection-safe — every block is turned into DOM
// text nodes, never innerHTML.
//
// Block shapes (all text is { hk, en }):
//   { type: 'lead',    text }                     -> intro line under the title
//   { type: 'heading', text }                     -> sub-heading inside a page
//   { type: 'para',    text }                     -> paragraph
//   { type: 'list',    items: [text, ...] }       -> bullet list
//   { type: 'term',    term, def }                -> key term + definition row
//   { type: 'note',    text }                     -> highlighted takeaway box
//
// Quiz shape (matches the game's validated question schema, bilingual):
//   { question, options: { hk:[4], en:[4] }, answer: 0-3, explanation }

export const STUDY_PAGE_LIMIT_MS = 3 * 60 * 1000; // teacher's cap: 3 min / page
export const STUDY_PAGE_MIN_MS = 60 * 1000;       // must read >= 1 min / page

const BIOLOGY_FOUNDATION = {
    topic: { hk: '細胞：生命的基本單位', en: 'The Cell: Life’s Basic Unit' },
    pages: [
        {
            title: { hk: '第 1 節 · 這一課學什麼', en: 'Section 1 · What This Lesson Covers' },
            blocks: [
                { type: 'lead', text: {
                    hk: '這份筆記介紹「細胞」——所有生物體的基本組成單位。讀完你會知道細胞是什麼、動物細胞與植物細胞有何分別，以及細胞裡各部分負責什麼工作。',
                    en: 'These notes introduce the cell — the basic building block of every living thing. By the end you will know what a cell is, how animal and plant cells differ, and what each part inside a cell does.'
                } },
                { type: 'heading', text: { hk: '本課大綱', en: 'Lesson Outline' } },
                { type: 'list', items: [
                    { hk: '細胞是什麼、為什麼重要（細胞學說）', en: 'What a cell is and why it matters (cell theory)' },
                    { hk: '動物細胞 vs 植物細胞的結構', en: 'Structure of animal vs plant cells' },
                    { hk: '主要胞器（細胞內的小器官）的功能', en: 'The jobs of the main organelles' },
                    { hk: '物質如何進出細胞（擴散入門）', en: 'How substances move in and out (intro to diffusion)' }
                ] },
                { type: 'note', text: {
                    hk: '重點：無論是一隻貓、一棵樹，還是你自己，身體都是由數以萬億計的細胞組成。',
                    en: 'Key idea: whether a cat, a tree, or you, the body is built from trillions of cells.'
                } }
            ]
        },
        {
            title: { hk: '第 2 節 · 細胞是什麼', en: 'Section 2 · What Is a Cell' },
            blocks: [
                { type: 'para', text: {
                    hk: '細胞是能夠維持生命的最小單位。有些生物（如細菌）只有一個細胞；像人類這樣的生物則由許多細胞組成。',
                    en: 'A cell is the smallest unit that can carry out life. Some organisms (like bacteria) are a single cell; organisms like humans are made of many cells.'
                } },
                { type: 'heading', text: { hk: '細胞學說（三個要點）', en: 'Cell Theory (Three Points)' } },
                { type: 'list', items: [
                    { hk: '所有生物都由細胞組成。', en: 'All living things are made of cells.' },
                    { hk: '細胞是生物結構與功能的基本單位。', en: 'The cell is the basic unit of structure and function.' },
                    { hk: '新的細胞由已存在的細胞分裂而來。', en: 'New cells come from existing cells dividing.' }
                ] },
                { type: 'term', term: { hk: '顯微鏡', en: 'Microscope' }, def: {
                    hk: '細胞太細小，肉眼看不見，要用顯微鏡放大才能觀察。',
                    en: 'Cells are too small to see with the naked eye; a microscope magnifies them so we can observe them.'
                } }
            ]
        },
        {
            title: { hk: '第 3 節 · 動物細胞 vs 植物細胞', en: 'Section 3 · Animal vs Plant Cells' },
            blocks: [
                { type: 'para', text: {
                    hk: '動物細胞與植物細胞有許多共通部分，但植物細胞多了三樣東西，讓植物能站立並自行製造食物。',
                    en: 'Animal and plant cells share many parts, but plant cells have three extra features that let plants stand up and make their own food.'
                } },
                { type: 'heading', text: { hk: '兩者都有', en: 'Both Have' } },
                { type: 'list', items: [
                    { hk: '細胞膜——包住細胞、控制物質進出', en: 'Cell membrane — surrounds the cell, controls what enters and leaves' },
                    { hk: '細胞質——進行化學反應的膠狀物質', en: 'Cytoplasm — jelly-like fluid where reactions happen' },
                    { hk: '細胞核——控制中心，內含遺傳資訊', en: 'Nucleus — control centre holding genetic information' }
                ] },
                { type: 'heading', text: { hk: '只有植物細胞有', en: 'Only Plant Cells Have' } },
                { type: 'list', items: [
                    { hk: '細胞壁——堅硬外層，提供支撐與形狀', en: 'Cell wall — rigid outer layer giving support and shape' },
                    { hk: '葉綠體——進行光合作用、製造食物', en: 'Chloroplast — carries out photosynthesis to make food' },
                    { hk: '大液泡——儲存水分與養分、維持細胞飽滿', en: 'Large vacuole — stores water and nutrients, keeps the cell firm' }
                ] },
                { type: 'note', text: {
                    hk: '記法：植物細胞「多壁、多綠、多水泡」。',
                    en: 'Memory hook: plant cells add a wall, chloroplasts, and a big vacuole.'
                } }
            ]
        },
        {
            title: { hk: '第 4 節 · 胞器的功能', en: 'Section 4 · What the Organelles Do' },
            blocks: [
                { type: 'para', text: {
                    hk: '「胞器」是細胞裡各有專職的小構造，就像工廠裡不同的部門。',
                    en: 'Organelles are small structures inside the cell, each with its own job — like departments in a factory.'
                } },
                { type: 'term', term: { hk: '細胞核', en: 'Nucleus' }, def: {
                    hk: '控制中心，儲存 DNA，指揮細胞的活動。',
                    en: 'The control centre; stores DNA and directs the cell’s activities.'
                } },
                { type: 'term', term: { hk: '線粒體', en: 'Mitochondria' }, def: {
                    hk: '進行呼吸作用、釋放能量的「發電廠」。',
                    en: 'The “power stations” that release energy through respiration.'
                } },
                { type: 'term', term: { hk: '葉綠體', en: 'Chloroplast' }, def: {
                    hk: '植物細胞內含葉綠素，吸收陽光製造食物。',
                    en: 'Contains chlorophyll in plant cells; absorbs sunlight to make food.'
                } },
                { type: 'term', term: { hk: '細胞膜', en: 'Cell Membrane' }, def: {
                    hk: '半透性的「守門員」，選擇性地讓物質進出。',
                    en: 'A partially permeable “gatekeeper” that selectively lets substances pass.'
                } },
                { type: 'term', term: { hk: '液泡', en: 'Vacuole' }, def: {
                    hk: '儲存空間；植物細胞的大液泡幫助維持細胞的堅挺。',
                    en: 'A storage space; the plant cell’s large vacuole helps keep it firm.'
                } }
            ]
        },
        {
            title: { hk: '第 5 節 · 物質如何進出細胞', en: 'Section 5 · Moving In and Out of Cells' },
            blocks: [
                { type: 'para', text: {
                    hk: '細胞要吸收養分、排出廢物。最基本的方式叫「擴散」。',
                    en: 'Cells must take in nutrients and remove waste. The most basic way is called diffusion.'
                } },
                { type: 'term', term: { hk: '擴散', en: 'Diffusion' }, def: {
                    hk: '粒子由高濃度處移向低濃度處，直至平均分佈，過程不需消耗能量。',
                    en: 'Particles move from where they are more crowded to where they are less crowded, until evenly spread — with no energy needed.'
                } },
                { type: 'para', text: {
                    hk: '例如氧氣由血液擴散進入細胞，二氧化碳則由細胞擴散出來。',
                    en: 'For example, oxygen diffuses from the blood into cells, and carbon dioxide diffuses out of cells.'
                } },
                { type: 'note', text: {
                    hk: '總結：細胞是生命的基本單位；植物細胞多了壁、葉綠體與大液泡；胞器各司其職；擴散讓物質自然進出細胞。',
                    en: 'Summary: the cell is life’s basic unit; plant cells add a wall, chloroplasts and a big vacuole; organelles each have a role; diffusion moves substances in and out naturally.'
                } }
            ]
        }
    ],
    quiz: [
        {
            question: { hk: '以下哪一項最能描述「細胞」？', en: 'Which best describes a cell?' },
            options: {
                hk: ['能維持生命的最小單位', '一種細菌', '身體裡最大的器官', '一種礦物質'],
                en: ['The smallest unit that can carry out life', 'A type of bacteria', 'The largest organ in the body', 'A kind of mineral']
            },
            answer: 0,
            explanation: {
                hk: '細胞是能夠維持生命的最小單位，所有生物都由細胞組成。',
                en: 'A cell is the smallest unit that can carry out life; all living things are made of cells.'
            }
        },
        {
            question: { hk: '下列哪一項只在植物細胞出現，動物細胞沒有？', en: 'Which is found only in plant cells, not animal cells?' },
            options: {
                hk: ['細胞核', '細胞膜', '細胞壁', '細胞質'],
                en: ['Nucleus', 'Cell membrane', 'Cell wall', 'Cytoplasm']
            },
            answer: 2,
            explanation: {
                hk: '細胞壁是植物細胞獨有的堅硬外層，提供支撐；動物細胞沒有。',
                en: 'The cell wall is a rigid outer layer unique to plant cells for support; animal cells lack it.'
            }
        },
        {
            question: { hk: '線粒體在細胞中主要負責什麼？', en: 'What is the main job of the mitochondria?' },
            options: {
                hk: ['釋放能量', '儲存 DNA', '製造細胞壁', '吸收陽光'],
                en: ['Release energy', 'Store DNA', 'Build the cell wall', 'Absorb sunlight']
            },
            answer: 0,
            explanation: {
                hk: '線粒體是「發電廠」，透過呼吸作用釋放能量。',
                en: 'Mitochondria are the “power stations” that release energy through respiration.'
            }
        },
        {
            question: { hk: '控制細胞活動、儲存遺傳資訊的是哪個部分？', en: 'Which part controls the cell and stores genetic information?' },
            options: {
                hk: ['細胞核', '液泡', '葉綠體', '細胞膜'],
                en: ['Nucleus', 'Vacuole', 'Chloroplast', 'Cell membrane']
            },
            answer: 0,
            explanation: {
                hk: '細胞核是控制中心，內含 DNA，指揮細胞的活動。',
                en: 'The nucleus is the control centre, holding DNA and directing the cell’s activities.'
            }
        },
        {
            question: { hk: '關於「擴散」，以下哪一項正確？', en: 'Which statement about diffusion is correct?' },
            options: {
                hk: ['粒子由高濃度移向低濃度，不需能量', '粒子由低濃度移向高濃度，需要能量', '只在植物細胞發生', '需要細胞壁才能進行'],
                en: ['Particles move high → low concentration, no energy needed', 'Particles move low → high concentration, energy needed', 'It only happens in plant cells', 'It needs a cell wall to occur']
            },
            answer: 0,
            explanation: {
                hk: '擴散是粒子由高濃度移向低濃度，達至平均分佈，過程不需消耗能量。',
                en: 'Diffusion moves particles from high to low concentration until evenly spread, without using energy.'
            }
        }
    ]
};

const BIOLOGY_ADVANCED = {
    topic: { hk: '細胞膜與物質運輸', en: 'The Cell Membrane and Transport' },
    pages: [
        {
            title: { hk: '第 1 節 · 這一課學什麼', en: 'Section 1 · What This Lesson Covers' },
            blocks: [
                { type: 'lead', text: {
                    hk: '這份筆記深入探討「細胞膜」的結構，以及物質如何跨越細胞膜運輸。這是初中「擴散」概念的延伸與加深。',
                    en: 'These notes go deeper into the structure of the cell membrane and how substances are transported across it — extending the junior-level idea of diffusion.'
                } },
                { type: 'heading', text: { hk: '本課大綱', en: 'Lesson Outline' } },
                { type: 'list', items: [
                    { hk: '細胞膜的「流體鑲嵌模型」', en: 'The fluid-mosaic model of the membrane' },
                    { hk: '被動運輸：擴散、易化擴散、滲透與水勢', en: 'Passive transport: diffusion, facilitated diffusion, osmosis and water potential' },
                    { hk: '主動運輸、胞吞與胞吐', en: 'Active transport, endocytosis and exocytosis' },
                    { hk: '表面積與體積比為何影響運輸效率', en: 'Why surface-area-to-volume ratio affects transport' }
                ] },
                { type: 'note', text: {
                    hk: '重點：細胞膜是「半透性」的——它主動選擇讓什麼通過，而不只是被動的屏障。',
                    en: 'Key idea: the membrane is partially permeable — it actively selects what passes, not just a passive barrier.'
                } }
            ]
        },
        {
            title: { hk: '第 2 節 · 細胞膜的結構', en: 'Section 2 · Structure of the Membrane' },
            blocks: [
                { type: 'para', text: {
                    hk: '細胞膜由「磷脂雙層」構成，中間鑲嵌著各種蛋白質，整體會流動，因此稱為「流體鑲嵌模型」。',
                    en: 'The membrane is a phospholipid bilayer with proteins embedded throughout; the whole structure flows, hence the “fluid-mosaic model”.'
                } },
                { type: 'term', term: { hk: '磷脂雙層', en: 'Phospholipid bilayer' }, def: {
                    hk: '磷脂有親水的「頭」與疏水的「尾」；頭朝外向水，尾朝內相對，形成雙層。',
                    en: 'Phospholipids have a water-loving head and water-fearing tails; heads face the water outside, tails face inward, forming two layers.'
                } },
                { type: 'term', term: { hk: '膜蛋白', en: 'Membrane proteins' }, def: {
                    hk: '包括通道蛋白與載體蛋白，協助特定物質跨膜運輸。',
                    en: 'Include channel and carrier proteins that help specific substances cross the membrane.'
                } },
                { type: 'note', text: {
                    hk: '脂溶性小分子可直接穿過雙層；帶電或大分子則需要蛋白質協助。',
                    en: 'Small lipid-soluble molecules cross the bilayer directly; charged or large molecules need protein help.'
                } }
            ]
        },
        {
            title: { hk: '第 3 節 · 被動運輸', en: 'Section 3 · Passive Transport' },
            blocks: [
                { type: 'para', text: {
                    hk: '被動運輸沿濃度梯度進行，不需細胞消耗能量（ATP）。',
                    en: 'Passive transport follows the concentration gradient and needs no energy (ATP) from the cell.'
                } },
                { type: 'term', term: { hk: '易化擴散', en: 'Facilitated diffusion' }, def: {
                    hk: '物質順濃度梯度、經由膜蛋白通道跨膜，仍屬被動。',
                    en: 'Substances move down the gradient through membrane proteins — still passive.'
                } },
                { type: 'term', term: { hk: '滲透', en: 'Osmosis' }, def: {
                    hk: '水分子經半透膜由水勢高處移向水勢低處。',
                    en: 'Water moves across a partially permeable membrane from higher to lower water potential.'
                } },
                { type: 'term', term: { hk: '水勢', en: 'Water potential' }, def: {
                    hk: '衡量水分子自由移動趨勢；純水最高，溶質越多水勢越低。',
                    en: 'A measure of water’s tendency to move; pure water is highest, more solute means lower potential.'
                } },
                { type: 'note', text: {
                    hk: '應用：把植物細胞放入清水會吸水而變得飽滿（膨壓）；放入濃鹽水則失水而萎縮。',
                    en: 'Application: a plant cell in pure water takes in water and becomes turgid; in strong salt water it loses water and shrinks.'
                } }
            ]
        },
        {
            title: { hk: '第 4 節 · 主動運輸與胞吞胞吐', en: 'Section 4 · Active Transport & Bulk Transport' },
            blocks: [
                { type: 'term', term: { hk: '主動運輸', en: 'Active transport' }, def: {
                    hk: '物質「逆」濃度梯度、由低濃度移向高濃度，需消耗 ATP 及載體蛋白。',
                    en: 'Moves substances against the gradient, low → high concentration, using ATP and carrier proteins.'
                } },
                { type: 'para', text: {
                    hk: '例子：植物根部由稀薄的土壤溶液主動吸收礦物離子。',
                    en: 'Example: plant roots actively absorb mineral ions from a dilute soil solution.'
                } },
                { type: 'term', term: { hk: '胞吞作用', en: 'Endocytosis' }, def: {
                    hk: '細胞膜內陷、包裹大分子或顆粒進入細胞。',
                    en: 'The membrane folds inward to bring large molecules or particles into the cell.'
                } },
                { type: 'term', term: { hk: '胞吐作用', en: 'Exocytosis' }, def: {
                    hk: '囊泡與細胞膜融合，把物質（如分泌物）排出細胞外。',
                    en: 'A vesicle fuses with the membrane to release substances (e.g. secretions) out of the cell.'
                } },
                { type: 'note', text: {
                    hk: '分辨關鍵：需不需要能量？逆梯度且耗 ATP 的就是主動運輸。',
                    en: 'Key test: is energy needed? Against-gradient and ATP-using means active transport.'
                } }
            ]
        },
        {
            title: { hk: '第 5 節 · 表面積與體積比', en: 'Section 5 · Surface-Area-to-Volume Ratio' },
            blocks: [
                { type: 'para', text: {
                    hk: '物質靠細胞表面進出，卻要供應整個體積。細胞越大，表面積相對體積就越小，運輸越跟不上需求。',
                    en: 'Substances enter across the surface but must supply the whole volume. The larger the cell, the smaller its surface area is relative to volume, so transport cannot keep up.'
                } },
                { type: 'term', term: { hk: '表面積 : 體積比', en: 'SA : V ratio' }, def: {
                    hk: '細胞越細，此比值越大，物質交換越有效率——這是細胞為何普遍細小的原因。',
                    en: 'The smaller the cell, the larger this ratio and the more efficient the exchange — which is why cells stay small.'
                } },
                { type: 'note', text: {
                    hk: '總結：細胞膜是流體鑲嵌結構；被動運輸沿梯度、不耗能，主動運輸逆梯度、耗 ATP；表面積體積比限制了細胞大小。',
                    en: 'Summary: the membrane is a fluid mosaic; passive transport goes down the gradient without energy, active transport goes against it using ATP; the SA:V ratio limits cell size.'
                } }
            ]
        }
    ],
    quiz: [
        {
            question: { hk: '「流體鑲嵌模型」中，構成細胞膜主體的是什麼？', en: 'In the fluid-mosaic model, what forms the main body of the membrane?' },
            options: {
                hk: ['磷脂雙層', '纖維素', '單層蛋白質', '澱粉'],
                en: ['A phospholipid bilayer', 'Cellulose', 'A single layer of protein', 'Starch']
            },
            answer: 0,
            explanation: {
                hk: '細胞膜以磷脂雙層為主體，蛋白質鑲嵌其中並可流動。',
                en: 'The membrane is mainly a phospholipid bilayer with proteins embedded and free to move.'
            }
        },
        {
            question: { hk: '下列哪一項屬於「被動」運輸，不需消耗 ATP？', en: 'Which is a passive process that needs no ATP?' },
            options: {
                hk: ['滲透', '主動運輸', '胞吞作用', '胞吐作用'],
                en: ['Osmosis', 'Active transport', 'Endocytosis', 'Exocytosis']
            },
            answer: 0,
            explanation: {
                hk: '滲透是水分子順水勢梯度移動，屬被動運輸，不需能量。',
                en: 'Osmosis moves water down its water-potential gradient — passive, needing no energy.'
            }
        },
        {
            question: { hk: '主動運輸與擴散最主要的分別是什麼？', en: 'What is the key difference between active transport and diffusion?' },
            options: {
                hk: ['主動運輸逆濃度梯度並需消耗能量', '主動運輸只在死細胞發生', '擴散一定需要載體蛋白', '兩者完全相同'],
                en: ['Active transport goes against the gradient and uses energy', 'Active transport only happens in dead cells', 'Diffusion always needs carrier proteins', 'They are identical']
            },
            answer: 0,
            explanation: {
                hk: '主動運輸逆濃度梯度（低→高）並消耗 ATP；擴散則順梯度且不需能量。',
                en: 'Active transport moves against the gradient (low → high) using ATP; diffusion goes down the gradient with no energy.'
            }
        },
        {
            question: { hk: '把植物細胞放入純水中，會發生什麼？', en: 'What happens to a plant cell placed in pure water?' },
            options: {
                hk: ['吸水並變得飽滿（膨壓）', '失水並萎縮', '沒有任何變化', '細胞壁溶解'],
                en: ['It takes in water and becomes turgid', 'It loses water and shrinks', 'Nothing changes', 'The cell wall dissolves']
            },
            answer: 0,
            explanation: {
                hk: '純水的水勢較高，水分子經滲透進入細胞，令細胞飽滿產生膨壓。',
                en: 'Pure water has higher water potential, so water enters by osmosis, making the cell turgid.'
            }
        },
        {
            question: { hk: '為什麼細胞通常都很細小？', en: 'Why are cells usually very small?' },
            options: {
                hk: ['細胞越小，表面積對體積比越大，交換越有效率', '細小才能容納細胞核', '大細胞不能分裂', '細小的細胞不需要能量'],
                en: ['Smaller cells have a larger surface-area-to-volume ratio for efficient exchange', 'Only small cells can hold a nucleus', 'Large cells cannot divide', 'Small cells need no energy']
            },
            answer: 0,
            explanation: {
                hk: '細胞越小，表面積相對體積越大，物質交換越能滿足整個細胞的需要。',
                en: 'The smaller the cell, the larger its surface area relative to volume, so exchange can meet the whole cell’s needs.'
            }
        }
    ]
};

const STUDY_MATERIALS = {
    biology: {
        foundation: BIOLOGY_FOUNDATION,
        advanced: BIOLOGY_ADVANCED
    }
};

export function getStudyMaterial(subject = 'biology', depth = 'foundation') {
    const bySubject = STUDY_MATERIALS[subject] || STUDY_MATERIALS.biology;
    return bySubject[depth] || bySubject.foundation;
}
