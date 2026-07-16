// Study Mode reading materials (D3).
//
// Subject: Biology — "Cell Membrane & Transport". Content is the teacher-
// provided material (2026-07-16), digitised into note-style bilingual pages
// plus reviewed multiple-choice papers.
//   - foundation = 材料一 (AB groups), junior-secondary depth, 4 sub-topics.
//   - advanced   = 材料二 (CD groups), senior-secondary depth, deeper, with an
//     extra synthesis section added for a bit more challenge.
// Each material's first page is an overview ("what this lesson covers"); the
// preset quiz has 10 reviewed MCQs (the teacher paper's 8, plus 2 written to
// the same standard to reach 10). All text is bilingual { hk, en }.
//
// Content is authored as structured BLOCKS (never raw HTML), rendered into DOM
// text nodes so the reader shows clean notes while staying injection-safe.
//
// Block shapes (all text is { hk, en }):
//   { type: 'lead',    text }
//   { type: 'heading', text }
//   { type: 'para',    text }
//   { type: 'list',    items: [text, ...] }
//   { type: 'term',    term, def }
//   { type: 'note',    text }
//
// Quiz shape (matches the game's validated question schema, bilingual):
//   { question, options: { hk:[4], en:[4] }, answer: 0-3, explanation }

export const STUDY_PAGE_LIMIT_MS = 3 * 60 * 1000; // teacher's cap: 3 min / page
export const STUDY_PAGE_MIN_MS = 15 * 1000;       // must read >= 15s / page

const BIOLOGY_FOUNDATION = {
    topic: { hk: '細胞膜與物質運輸（基礎）', en: 'Cell Membrane & Transport (Foundation)' },
    pages: [
        {
            title: { hk: '第 1 節 · 這一課學什麼', en: 'Section 1 · What This Lesson Covers' },
            blocks: [
                { type: 'lead', text: {
                    hk: '這份筆記講「細胞膜與物質運輸」——細胞怎樣控制物質進出。讀完你會明白差異透性、擴散、滲透與主動運輸四個概念。',
                    en: 'These notes cover the cell membrane and transport — how cells control what moves in and out. You will understand four ideas: differential permeability, diffusion, osmosis, and active transport.'
                } },
                { type: 'heading', text: { hk: '本課大綱', en: 'Lesson Outline' } },
                { type: 'list', items: [
                    { hk: '細胞膜的差異透性', en: 'Differential permeability of the membrane' },
                    { hk: '擴散', en: 'Diffusion' },
                    { hk: '滲透', en: 'Osmosis' },
                    { hk: '主動運輸', en: 'Active transport' }
                ] },
                { type: 'note', text: {
                    hk: '重點：細胞膜是「守門員」，控制哪些物質可以進出細胞。',
                    en: 'Key idea: the cell membrane is a “gatekeeper” controlling what may enter or leave the cell.'
                } }
            ]
        },
        {
            title: { hk: '第 2 節 · 細胞膜的差異透性', en: 'Section 2 · Differential Permeability' },
            blocks: [
                { type: 'para', text: {
                    hk: '所有活細胞外都有細胞膜，負責控制物質進出。細胞膜不會隨便讓所有物質穿過，只容許特定分子通過，這個特性稱為差異透性。',
                    en: 'Every living cell is surrounded by a membrane that controls what moves in and out. It does not let everything through — only certain molecules pass. This property is called differential (selective) permeability.'
                } },
                { type: 'para', text: {
                    hk: '細胞需要持續交換物質維持生命：氧氣、水分、養分進入細胞；二氧化碳、代謝廢物排出，全部依賴細胞膜運輸。',
                    en: 'Cells must keep exchanging materials to stay alive: oxygen, water and nutrients enter; carbon dioxide and waste leave — all across the membrane.'
                } },
                { type: 'note', text: {
                    hk: '一旦細胞膜失去控制，細胞會快速死亡。',
                    en: 'If the membrane loses this control, the cell dies quickly.'
                } }
            ]
        },
        {
            title: { hk: '第 3 節 · 擴散', en: 'Section 3 · Diffusion' },
            blocks: [
                { type: 'para', text: {
                    hk: '分子會自發由高濃度區域移動到低濃度區域，這個過程叫擴散，不需要消耗細胞能量。',
                    en: 'Molecules spontaneously move from an area of higher concentration to one of lower concentration. This is diffusion, and it needs no energy from the cell.'
                } },
                { type: 'term', term: { hk: '例子', en: 'Example' }, def: {
                    hk: '肺部吸入的氧氣透過擴散進入體細胞；細胞產生的二氧化碳同樣靠擴散離開細胞。',
                    en: 'Oxygen taken in by the lungs diffuses into body cells; the carbon dioxide the cells make diffuses out the same way.'
                } },
                { type: 'note', text: {
                    hk: '當細胞內外濃度相同時，分子的淨移動會停止。',
                    en: 'When the concentration is equal inside and outside, the net movement of molecules stops.'
                } }
            ]
        },
        {
            title: { hk: '第 4 節 · 滲透', en: 'Section 4 · Osmosis' },
            blocks: [
                { type: 'para', text: {
                    hk: '滲透是水分專用的擴散：水分透過選擇性通透膜，由水多（溶質少）的一邊移向水少（溶質多）的一邊。',
                    en: 'Osmosis is diffusion of water only: water moves across a selectively permeable membrane from where there is more water (less solute) to where there is less water (more solute).'
                } },
                { type: 'list', items: [
                    { hk: '植物細胞放入清水：水分流入，細胞膨脹，植物挺直。', en: 'Plant cell in pure water: water flows in, the cell swells, the plant stays firm and upright.' },
                    { hk: '植物細胞放入濃鹽水：水分流出，細胞軟縮，植物會凋萎。', en: 'Plant cell in strong salt water: water flows out, the cell shrinks, the plant wilts.' }
                ] },
                { type: 'note', text: {
                    hk: '滲透只描述「水分」的移動。',
                    en: 'Osmosis describes the movement of water only.'
                } }
            ]
        },
        {
            title: { hk: '第 5 節 · 主動運輸', en: 'Section 5 · Active Transport' },
            blocks: [
                { type: 'para', text: {
                    hk: '有時細胞需要把物質由低濃度運去高濃度，和自然擴散方向相反，這就是主動運輸。主動運輸必須消耗細胞儲存的能量。',
                    en: 'Sometimes a cell must move substances from low to high concentration — the opposite of natural diffusion. This is active transport, and it must use the cell’s stored energy.'
                } },
                { type: 'term', term: { hk: '例子', en: 'Example' }, def: {
                    hk: '小腸細胞吸收葡萄糖、植物根部吸收礦物離子。',
                    en: 'Small-intestine cells absorbing glucose; plant roots absorbing mineral ions.'
                } },
                { type: 'note', text: {
                    hk: '總結：差異透性負責守門；擴散和滲透不需能量；主動運輸逆濃度、需要能量。',
                    en: 'Summary: differential permeability guards the gate; diffusion and osmosis need no energy; active transport goes against the gradient and needs energy.'
                } }
            ]
        }
    ],
    quiz: [
        {
            question: { hk: '細胞膜只容許特定分子穿過、控制物質進出的特性稱為？', en: 'What is the property by which the membrane lets only certain molecules through, controlling movement in and out?' },
            options: { hk: ['完全通透', '差異透性', '不透性', '隨機通透'], en: ['Fully permeable', 'Differential permeability', 'Impermeable', 'Random permeability'] },
            answer: 1,
            explanation: { hk: '細胞膜只容許特定分子通過，這特性稱為差異透性。', en: 'The membrane admits only specific molecules — this is differential permeability.' }
        },
        {
            question: { hk: '下列哪項有關擴散的描述正確？', en: 'Which statement about diffusion is correct?' },
            options: {
                hk: ['需要消耗細胞能量', '分子由低濃度移向高濃度', '分子自發由高濃度移向低濃度', '只可以運送水分'],
                en: ['It uses cell energy', 'Molecules move low → high concentration', 'Molecules move spontaneously high → low concentration', 'It can only move water']
            },
            answer: 2,
            explanation: { hk: '擴散是分子自發由高濃度移向低濃度，不需能量。', en: 'Diffusion is the spontaneous movement of molecules from high to low concentration, using no energy.' }
        },
        {
            question: { hk: '氧氣由肺泡進入身體細胞依靠哪種運輸方式？', en: 'How does oxygen move from the alveoli into body cells?' },
            options: { hk: ['主動運輸', '滲透', '擴散', '質壁分離'], en: ['Active transport', 'Osmosis', 'Diffusion', 'Plasmolysis'] },
            answer: 2,
            explanation: { hk: '氧氣由高濃度（肺泡）擴散到低濃度（細胞）。', en: 'Oxygen diffuses from high concentration (alveoli) to low concentration (cells).' }
        },
        {
            question: { hk: '滲透專指哪種物質透過膜的移動？', en: 'Osmosis specifically refers to the movement of which substance across a membrane?' },
            options: { hk: ['葡萄糖', '礦物離子', '二氧化碳', '水分'], en: ['Glucose', 'Mineral ions', 'Carbon dioxide', 'Water'] },
            answer: 3,
            explanation: { hk: '滲透是水分專用的擴散。', en: 'Osmosis is the diffusion of water only.' }
        },
        {
            question: { hk: '將植物細胞放入濃鹽水會出現什麼情況？', en: 'What happens to a plant cell placed in strong salt water?' },
            options: {
                hk: ['水分流入，細胞膨脹', '水分流出，細胞軟縮', '水分進出平衡，無變化', '細胞直接破裂'],
                en: ['Water flows in, the cell swells', 'Water flows out, the cell shrinks', 'Water balances, no change', 'The cell simply bursts']
            },
            answer: 1,
            explanation: { hk: '濃鹽水外面水少，水分靠滲透流出，細胞軟縮。', en: 'The salt water has less water outside, so water leaves by osmosis and the cell shrinks.' }
        },
        {
            question: { hk: '下列哪個例子屬於主動運輸？', en: 'Which example is active transport?' },
            options: {
                hk: ['氧氣擴散入細胞', '二氧化碳離開細胞', '小腸細胞吸收葡萄糖', '清水滲入植物細胞'],
                en: ['Oxygen diffusing into a cell', 'Carbon dioxide leaving a cell', 'Small-intestine cells absorbing glucose', 'Pure water entering a plant cell']
            },
            answer: 2,
            explanation: { hk: '小腸吸收葡萄糖是逆濃度、需要能量，屬主動運輸。', en: 'Absorbing glucose goes against the gradient and needs energy — active transport.' }
        },
        {
            question: { hk: '主動運輸和擴散最大的分別是？', en: 'What is the biggest difference between active transport and diffusion?' },
            options: {
                hk: ['主動運輸需要消耗能量', '主動運輸只運送水分', '擴散只存在植物體內', '擴散需要膜蛋白協助'],
                en: ['Active transport uses energy', 'Active transport only moves water', 'Diffusion only happens in plants', 'Diffusion needs membrane proteins']
            },
            answer: 0,
            explanation: { hk: '主動運輸需消耗能量、逆濃度；擴散不需能量。', en: 'Active transport uses energy and goes against the gradient; diffusion does not.' }
        },
        {
            question: { hk: '如果細胞膜失去差異透性，會出現什麼結果？', en: 'What happens if the membrane loses its differential permeability?' },
            options: {
                hk: ['細胞代謝速度加快', '物質隨意進出，細胞快速死亡', '只影響水分運輸', '完全不影響細胞生命活動'],
                en: ['Metabolism speeds up', 'Substances move freely and the cell dies quickly', 'Only water transport is affected', 'No effect on the cell at all']
            },
            answer: 1,
            explanation: { hk: '失去控制後物質隨意進出，細胞會快速死亡。', en: 'Without control, substances move freely and the cell dies quickly.' }
        },
        {
            question: { hk: '細胞需要氧氣、養分進入，並排出二氧化碳，這些交換主要在哪裏進行？', en: 'Oxygen and nutrients enter while carbon dioxide leaves — where does this exchange mainly take place?' },
            options: { hk: ['細胞核', '細胞膜', '線粒體', '液泡'], en: ['The nucleus', 'The cell membrane', 'The mitochondria', 'The vacuole'] },
            answer: 1,
            explanation: { hk: '所有物質進出細胞都要經過細胞膜。', en: 'All substances entering or leaving the cell pass through the cell membrane.' }
        },
        {
            question: { hk: '植物細胞放入清水後變得挺直，最直接的原因是？', en: 'A plant cell becomes firm in pure water. The most direct reason is?' },
            options: {
                hk: ['水分靠滲透流入，細胞膨脹', '主動運輸吸入鹽分', '細胞開始呼吸', '二氧化碳擴散進入'],
                en: ['Water enters by osmosis and the cell swells', 'Salt is taken in by active transport', 'The cell starts respiring', 'Carbon dioxide diffuses in']
            },
            answer: 0,
            explanation: { hk: '清水外面水多，水分靠滲透流入，細胞膨脹變挺。', en: 'Pure water has more water outside, so water enters by osmosis and the cell swells and firms up.' }
        }
    ]
};

const BIOLOGY_ADVANCED = {
    topic: { hk: '細胞膜與物質運輸（進階）', en: 'Cell Membrane & Transport (Advanced)' },
    pages: [
        {
            title: { hk: '第 1 節 · 這一課學什麼', en: 'Section 1 · What This Lesson Covers' },
            blocks: [
                { type: 'lead', text: {
                    hk: '這份筆記深入細胞膜的結構與物質運輸的機制，並解釋滲透與擴散在動植物體內的實際應用。',
                    en: 'These notes go deeper into the membrane’s structure and transport mechanisms, and explain how osmosis and diffusion actually work in animals and plants.'
                } },
                { type: 'heading', text: { hk: '本課大綱', en: 'Lesson Outline' } },
                { type: 'list', items: [
                    { hk: '細胞膜流動鑲嵌模型', en: 'The fluid-mosaic model of the membrane' },
                    { hk: '滲透對動、植物細胞造成的差異變化', en: 'How osmosis affects animal vs plant cells differently' },
                    { hk: '氣體交換中的擴散應用', en: 'Diffusion in gas exchange' },
                    { hk: '植物如何透過滲透支撐軀幹', en: 'How plants use osmosis for support' },
                    { hk: '（延伸）運輸方式的能量與比較', en: '(Extension) energy use and a comparison of transport types' }
                ] },
                { type: 'note', text: {
                    hk: '重點：細胞膜的「流動鑲嵌」結構，正是差異透性的根本原因。',
                    en: 'Key idea: the membrane’s fluid-mosaic structure is the very reason it is differentially permeable.'
                } }
            ]
        },
        {
            title: { hk: '第 2 節 · 細胞膜流動鑲嵌模型', en: 'Section 2 · The Fluid-Mosaic Model' },
            blocks: [
                { type: 'para', text: {
                    hk: '細胞膜的骨架是磷脂雙層：磷脂頭親水，分別朝向細胞內外的水溶液；磷脂尾疏水，藏在雙層中央，阻隔水溶性大分子直接穿膜。',
                    en: 'The membrane’s framework is a phospholipid bilayer: the water-loving heads face the watery solutions inside and outside, while the water-fearing tails hide in the centre, blocking water-soluble large molecules from crossing directly.'
                } },
                { type: 'para', text: {
                    hk: '膜內鑲嵌多種蛋白：通道蛋白、載體蛋白、糖蛋白。磷脂層可流動、蛋白能在膜內橫向移動，因此稱為「流動鑲嵌模型」，解釋了細胞膜差異透性的根本原因。',
                    en: 'Embedded in the membrane are various proteins: channel proteins, carrier proteins and glycoproteins. The phospholipids flow and the proteins drift sideways within the membrane — hence the “fluid-mosaic model”, which explains the root cause of differential permeability.'
                } },
                { type: 'term', term: { hk: '通道／載體蛋白', en: 'Channel / carrier proteins' }, def: {
                    hk: '協助特定分子（如帶電或大分子）跨膜運輸的通道或搬運工。',
                    en: 'Passages or shuttles that help specific molecules (e.g. charged or large ones) cross the membrane.'
                } }
            ]
        },
        {
            title: { hk: '第 3 節 · 滲透對動、植物細胞的差異', en: 'Section 3 · Osmosis: Animal vs Plant Cells' },
            blocks: [
                { type: 'para', text: {
                    hk: '在同樣濃度的溶液下，動物與植物細胞的表現完全不同。',
                    en: 'In the same solution, animal and plant cells behave very differently.'
                } },
                { type: 'term', term: { hk: '動物細胞', en: 'Animal cells' }, def: {
                    hk: '沒有細胞壁：低濃溶液吸水會膨脹甚至破裂，高濃溶液失水軟縮。因此人體注射要用等濃生理鹽水。',
                    en: 'No cell wall: in a dilute solution they swell and may burst; in a concentrated one they shrink. That is why injections use isotonic (equal-concentration) saline.'
                } },
                { type: 'term', term: { hk: '植物細胞', en: 'Plant cells' }, def: {
                    hk: '外有細胞壁支撐：吸水只會變硬挺、不會破裂；長期置於高濃溶液會失水，產生「質壁分離」現象。',
                    en: 'A cell wall supports them: taking in water makes them firm without bursting; left in a concentrated solution they lose water, causing plasmolysis (the membrane pulling away from the wall).'
                } },
                { type: 'note', text: {
                    hk: '質壁分離只會在有細胞壁的植物細胞出現。',
                    en: 'Plasmolysis only occurs in plant cells, which have a cell wall.'
                } }
            ]
        },
        {
            title: { hk: '第 4 節 · 氣體交換中的擴散應用', en: 'Section 4 · Diffusion in Gas Exchange' },
            blocks: [
                { type: 'para', text: {
                    hk: '人體肺部、植物葉片氣孔都依靠擴散交換氣體。肺泡壁細胞很薄，空氣中氧氣濃度高，自動擴散入血液；細胞產生的二氧化碳濃度高，反向擴散排出體外。',
                    en: 'Both the lungs and the stomata of plant leaves rely on diffusion to exchange gases. Alveolar walls are very thin; oxygen is more concentrated in the air, so it diffuses into the blood, while carbon dioxide (more concentrated in cells) diffuses out.'
                } },
                { type: 'para', text: {
                    hk: '葉片進行光合作用時，二氧化碳經氣孔擴散進葉肉細胞，產生的氧氣再擴散離開。',
                    en: 'During photosynthesis, carbon dioxide diffuses through the stomata into the leaf cells, and the oxygen produced diffuses back out.'
                } },
                { type: 'note', text: {
                    hk: '薄的交換表面 + 濃度差 = 高效擴散。',
                    en: 'A thin exchange surface plus a concentration difference means efficient diffusion.'
                } }
            ]
        },
        {
            title: { hk: '第 5 節 · 植物如何透過滲透支撐軀幹', en: 'Section 5 · Osmosis and Plant Support' },
            blocks: [
                { type: 'para', text: {
                    hk: '草本植物沒有木質硬莖，依靠細胞吸水產生的膨脹來支撐枝葉。',
                    en: 'Herbaceous (non-woody) plants have no hard woody stem; they rely on the swelling of water-filled cells to hold up their stems and leaves.'
                } },
                { type: 'para', text: {
                    hk: '當根吸收水分，水分透過滲透進入莖、葉細胞；細胞膨脹後對細胞壁產生壓力（膨脹壓），令植物挺直。長期缺水時細胞失水、膨脹消失，花草就會凋謝枯萎。',
                    en: 'When roots absorb water, it passes by osmosis into stem and leaf cells. The swollen cells press on their walls (turgor pressure), keeping the plant upright. In a long drought the cells lose water, the turgor is lost, and the plant wilts.'
                } },
                { type: 'term', term: { hk: '膨脹壓（膨壓）', en: 'Turgor pressure' }, def: {
                    hk: '細胞吸水膨脹後對細胞壁施加的壓力，是草本植物挺直的來源。',
                    en: 'The pressure a swollen cell exerts on its wall — the source of firmness in soft-stemmed plants.'
                } }
            ]
        },
        {
            title: { hk: '第 6 節 · 延伸：運輸方式的能量與比較', en: 'Section 6 · Extension: Energy & a Transport Comparison' },
            blocks: [
                { type: 'lead', text: {
                    hk: '（進階延伸）把四種運輸方式放在一起比較，關鍵問題只有一個：需不需要能量？',
                    en: '(Advanced extension) Comparing the transport types side by side, the key question is just one: is energy needed?'
                } },
                { type: 'term', term: { hk: '被動運輸', en: 'Passive transport' }, def: {
                    hk: '擴散與滲透都沿濃度梯度進行、不需消耗細胞能量（ATP）。',
                    en: 'Diffusion and osmosis both follow the concentration gradient and use no cell energy (ATP).'
                } },
                { type: 'term', term: { hk: '主動運輸', en: 'Active transport' }, def: {
                    hk: '逆濃度梯度、需要載體蛋白並消耗 ATP，例如根部由稀薄土壤吸收礦物離子。',
                    en: 'Goes against the gradient, needs carrier proteins and uses ATP — e.g. roots absorbing mineral ions from dilute soil.'
                } },
                { type: 'para', text: {
                    hk: '為什麼細胞普遍細小？因為物質靠表面進出、卻要供應整個體積；細胞越小，表面積對體積的比例越大，交換越有效率。',
                    en: 'Why are cells generally small? Substances enter across the surface but must supply the whole volume; the smaller the cell, the larger its surface-area-to-volume ratio and the more efficient the exchange.'
                } },
                { type: 'note', text: {
                    hk: '一句記法：被動運輸「順流免費」，主動運輸「逆流收費（ATP）」。',
                    en: 'One-line memory: passive transport is “downhill and free”, active transport is “uphill and paid for (ATP)”.'
                } }
            ]
        }
    ],
    quiz: [
        {
            question: { hk: '流動鑲嵌模型中，細胞膜的基礎骨架是？', en: 'In the fluid-mosaic model, what is the membrane’s basic framework?' },
            options: { hk: ['蛋白質雙層', '磷脂雙層', '碳水化合物', '纖維素'], en: ['A protein bilayer', 'A phospholipid bilayer', 'Carbohydrate', 'Cellulose'] },
            answer: 1,
            explanation: { hk: '細胞膜骨架是磷脂雙層，蛋白質鑲嵌其中。', en: 'The framework is a phospholipid bilayer with proteins embedded in it.' }
        },
        {
            question: { hk: '磷脂分子尾部的特性為？', en: 'What is the property of a phospholipid’s tails?' },
            options: {
                hk: ['親水（喜愛水分）', '疏水（排斥水分）', '可溶解於鹽水', '可運送礦物離子'],
                en: ['Hydrophilic (water-loving)', 'Hydrophobic (water-fearing)', 'Dissolves in salt water', 'Carries mineral ions']
            },
            answer: 1,
            explanation: { hk: '磷脂尾疏水，藏在雙層中央，阻隔水溶性大分子。', en: 'The tails are hydrophobic and hide in the centre, blocking water-soluble molecules.' }
        },
        {
            question: { hk: '下列哪一種膜蛋白不會出現在流動鑲嵌模型？', en: 'Which of these proteins is NOT part of the fluid-mosaic model?' },
            options: { hk: ['通道蛋白', '載體蛋白', '糖蛋白', '纖維蛋白'], en: ['Channel protein', 'Carrier protein', 'Glycoprotein', 'Fibre protein'] },
            answer: 3,
            explanation: { hk: '膜蛋白包括通道、載體、糖蛋白；纖維蛋白不屬於細胞膜。', en: 'Membrane proteins are channel, carrier and glycoproteins; fibre protein is not part of the membrane.' }
        },
        {
            question: { hk: '動物細胞長期浸泡在清水會破裂，原因是？', en: 'An animal cell left in pure water bursts because?' },
            options: {
                hk: ['細胞沒有細胞壁阻擋膨脹', '清水有毒，破壞細胞膜', '清水令細胞停止呼吸', '水分無法進入細胞'],
                en: ['It has no cell wall to resist swelling', 'Pure water is toxic to the membrane', 'Pure water stops respiration', 'Water cannot enter the cell']
            },
            answer: 0,
            explanation: { hk: '動物細胞無細胞壁，吸水過度會膨脹破裂。', en: 'Without a cell wall, the animal cell swells and bursts as water floods in.' }
        },
        {
            question: { hk: '為什麼人體靜脈注射必須使用等濃生理鹽水？', en: 'Why must intravenous injections use isotonic saline?' },
            options: {
                hk: ['增加血液濃度', '避免血細胞過度吸水或失水變形', '為細胞提供額外能量', '促進主動運輸'],
                en: ['To thicken the blood', 'So blood cells neither over-absorb nor lose water and deform', 'To give cells extra energy', 'To boost active transport']
            },
            answer: 1,
            explanation: { hk: '等濃鹽水令水分進出平衡，血細胞不會膨脹破裂或軟縮。', en: 'Isotonic saline balances water movement so blood cells neither burst nor shrink.' }
        },
        {
            question: { hk: '質壁分離現象只會在哪類細胞出現？', en: 'Plasmolysis occurs only in which kind of cell?' },
            options: { hk: ['動物細胞', '植物細胞', '血液紅細胞', '肺泡細胞'], en: ['Animal cells', 'Plant cells', 'Red blood cells', 'Alveolar cells'] },
            answer: 1,
            explanation: { hk: '質壁分離是細胞膜脫離細胞壁，只在有細胞壁的植物細胞發生。', en: 'Plasmolysis is the membrane pulling from the wall — only in plant cells, which have a wall.' }
        },
        {
            question: { hk: '植物葉片吸收二氧化碳進行光合作用依靠什麼機制？', en: 'How do leaves take in carbon dioxide for photosynthesis?' },
            options: { hk: ['主動運輸', '滲透', '擴散', '膨脹'], en: ['Active transport', 'Osmosis', 'Diffusion', 'Swelling'] },
            answer: 2,
            explanation: { hk: '二氧化碳經氣孔擴散進葉肉細胞。', en: 'Carbon dioxide diffuses through the stomata into the leaf cells.' }
        },
        {
            question: { hk: '草本植物枝葉可以挺直，依靠細胞產生的？', en: 'Soft-stemmed plants stay upright because their cells generate?' },
            options: { hk: ['膨脹壓', '滲透壓', '濃度差', '化學能量'], en: ['Turgor pressure', 'Osmotic pressure', 'A concentration difference', 'Chemical energy'] },
            answer: 0,
            explanation: { hk: '細胞吸水膨脹，對細胞壁產生膨脹壓，支撐植物挺直。', en: 'Water-filled cells press on their walls (turgor pressure), holding the plant up.' }
        },
        {
            question: { hk: '下列哪一組全部都不需要消耗細胞能量（ATP）？', en: 'Which pair are BOTH processes that use no cell energy (ATP)?' },
            options: {
                hk: ['擴散與滲透', '主動運輸與滲透', '主動運輸與擴散', '主動運輸與質壁分離'],
                en: ['Diffusion and osmosis', 'Active transport and osmosis', 'Active transport and diffusion', 'Active transport and plasmolysis']
            },
            answer: 0,
            explanation: { hk: '擴散與滲透都是被動運輸，沿濃度梯度、不需 ATP。', en: 'Diffusion and osmosis are both passive — down the gradient, no ATP needed.' }
        },
        {
            question: { hk: '為什麼細胞通常都很細小？', en: 'Why are cells usually very small?' },
            options: {
                hk: ['細胞越小，表面積對體積比越大，物質交換越有效率', '細小才能容納細胞核', '大細胞不能分裂', '細小的細胞不需要能量'],
                en: ['Smaller cells have a larger surface-area-to-volume ratio for efficient exchange', 'Only small cells can hold a nucleus', 'Large cells cannot divide', 'Small cells need no energy']
            },
            answer: 0,
            explanation: { hk: '物質靠表面進出卻要供應整個體積，細胞越小交換越有效率。', en: 'Substances enter across the surface but supply the whole volume, so smaller cells exchange more efficiently.' }
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
