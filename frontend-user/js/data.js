/* ========================================
   数据配置层（只放原始事实，不放判定结论）
   所有成熟度 / 差距档 / 断层结论均由 diagnosis.js 统一计算，
   矩阵、雷达、统计卡片、诊断侧栏共用同一份计算结果，避免各处口径不一致。
   ======================================== */

/* ---------- 阶段与维度 ---------- */

const PHASES = [
    { name: '阶段1: 沉睡通讯录', subtitle: '资产留存', key: 'phase1', index: 1 },
    { name: '阶段2: 社交连接体', subtitle: '活跃与复购', key: 'phase2', index: 2 },
    { name: '阶段3: 智能价值网', subtitle: '预测与生态', key: 'phase3', index: 3 }
];

// 本期目标阶段（矩阵 [改进目标] 标记以此为准）
const TARGET_PHASE_KEY = 'phase2';

const DIMENSIONS = [
    { icon: '🎯', name: '全域获客', key: 'acquisition' },
    { icon: '👑', name: '权益体系', key: 'rights' },
    { icon: '💬', name: '私域触点', key: 'touchpoints' },
    { icon: '📊', name: '数据画像', key: 'cdp' },
    { icon: '🤖', name: '自动化营销', key: 'ma' },
    { icon: '🔧', name: '工具基建', key: 'martech' }
];

/* ---------- 判定口径（可切换、可持久化、可追溯） ----------
 * 两套口径只改“分数线”，判定规则完全一致：
 *  - maturity.lines：L1/L2/L3 成熟度入档分数线（低于 L1 线 = L0 未入档）
 *  - gapThresholds：现状与“该阶段标杆分”的差距区间阈值，按阶段分别给出
 *      met         差距 ≤ met 上限        → 达标
 *      watch       met < 差距 < significant → 关注
 *      significant significant ≤ 差距 < critical → 显著差距
 *      critical    差距 ≥ critical        → 关键断层
 * 标杆分 benchmarks 是行业事实数据，不随口径变化。
 */

const CRITERIA = {
    strict: {
        id: 'strict',
        version: 'v2026.09',
        name: '2026 严格版',
        desc: '差距阈值更紧，缺数据从严判定，为当前默认口径',
        maturity: { lines: [40, 60, 80] },
        gapThresholds: {
            phase1: { met: 11, significant: 30, critical: 45 },
            phase2: { met: 8,  significant: 26, critical: 40 },
            phase3: { met: 7,  significant: 22, critical: 35 }
        }
    },
    loose: {
        id: 'loose',
        version: 'v2025.02',
        name: '2025 宽松版',
        desc: '历史口径，阈值较宽，仅用于与往期结论对比复盘',
        maturity: { lines: [35, 55, 75] },
        gapThresholds: {
            phase1: { met: 14, significant: 35, critical: 55 },
            phase2: { met: 11, significant: 30, critical: 50 },
            phase3: { met: 9,  significant: 26, critical: 45 }
        }
    }
};

const DEFAULT_SETTINGS = { criteriaId: 'strict', missingPolicy: 'conservative' };

// 判定范围内（≤目标阶段）缺数据时的处理档
const MISSING_POLICIES = {
    conservative: {
        id: 'conservative',
        name: '从严处理',
        band: 'critical',
        desc: '判定范围内该阶段无评估数据 → 按「关键断层」处理'
    },
    optimistic: {
        id: 'optimistic',
        name: '从宽处理',
        band: 'watch',
        desc: '判定范围内该阶段无评估数据 → 按「关注」处理（不允许直接判达标）'
    }
};

/* ---------- 原始评分（唯一得分源，雷达/矩阵/侧栏共用） ---------- */

const DIM_SCORES = {
    acquisition: 25,
    rights: 20,
    touchpoints: 15,
    cdp: 20,
    ma: 10,
    martech: 30
};

/* ---------- 各阶段标杆分（行业基准，按阶段分别给出） ---------- */

const BENCHMARKS = {
    acquisition: { phase1: 45, phase2: 65, phase3: 85 },
    rights:      { phase1: 42, phase2: 58, phase3: 80 },
    touchpoints: { phase1: 40, phase2: 72, phase3: 90 },
    cdp:         { phase1: 40, phase2: 58, phase3: 85 },
    ma:          { phase1: 40, phase2: 60, phase3: 80 },
    martech:     { phase1: 45, phase2: 60, phase3: 85 }
};

/* ---------- 矩阵内容（SOP / 工具为阶段规划与现状描述，
   即使该阶段缺评估数据也保持可读；dataStatus 只影响判定档，不删除内容） ----------
 * dataStatus:
 *   complete 有该阶段判定所需指标数据
 *   partial  部分指标缺失（不升级断层；若原档为达标则降为关注）
 *   missing  无评估数据（范围外→未参评；范围内→按缺失策略定档）
 */

const matrixData = {
    dimensions: DIMENSIONS,
    phases: PHASES,
    cells: {
        acquisition: {
            phase1: {
                dataStatus: 'complete',
                sop: ['门店扫码入会（流程复杂）', '罐内码扫码（体验差）', '包裹卡引流（无追踪）'],
                tools: { international: ['Google Analytics'], domestic: ['有赞', '微盟'] }
            },
            phase2: {
                dataStatus: 'complete',
                sop: ['企微活码分渠道追踪', '裂变拉新（老带新奖励）', '公域转私域SOP（抖音/天猫）', '门店利益分成机制'],
                tools: { international: ['HubSpot'], domestic: ['企业微信', '句子互动', '尘锋SCRM'] }
            },
            phase3: {
                dataStatus: 'missing',
                dataNote: '阶段3智能投放能力尚未启动，暂无评估数据',
                sop: ['AI智能投放优化', 'LTV预测筛选高价值潜客', '全域归因分析', '智能渠道预算分配'],
                tools: { international: ['Salesforce Marketing Cloud', 'Adobe Experience Cloud'], domestic: ['神策数据', '易观方舟'] }
            }
        },
        rights: {
            phase1: {
                dataStatus: 'complete',
                sop: ['基础积分累计', '积分兑换礼品', '无等级体系', '储值卡推销'],
                tools: { international: [], domestic: ['有赞', '微盟'] }
            },
            phase2: {
                dataStatus: 'complete',
                sop: ['会员等级体系（银/金/钻）', '付费会员Plus设计', '成长值任务体系', '专属权益差异化'],
                tools: { international: ['Salesforce Loyalty'], domestic: ['驿氪', '有赞'] }
            },
            phase3: {
                dataStatus: 'missing',
                dataNote: '动态权益/LTV分配未上线，暂无评估数据',
                sop: ['动态权益个性化', 'LTV驱动权益分配', '积分通证化', '生态权益互通'],
                tools: { international: ['Adobe Real-Time CDP'], domestic: ['神策数据', '易观'] }
            }
        },
        touchpoints: {
            phase1: {
                dataStatus: 'complete',
                sop: ['短信群发（打开率<1%）', '公众号推文', '无企微私域', '无社群运营'],
                tools: { international: [], domestic: ['公众号', '短信平台'] }
            },
            phase2: {
                // 范围内缺数据：企微/社群未上线，阶段2指标无埋点；按缺失策略定档
                dataStatus: 'missing',
                dataNote: '企微/社群尚未上线，阶段2触点指标无埋点数据',
                sop: ['企微1v1私聊SOP', '社群分层运营', '视频号内容矩阵', '直播带货联动', '朋友圈剧本'],
                tools: { international: ['Intercom'], domestic: ['企业微信', '句子互动', '微伴助手', '腾讯企点'] }
            },
            phase3: {
                dataStatus: 'missing',
                dataNote: 'AI客服/全渠道消息中心未建设，暂无评估数据',
                sop: ['AI智能客服', '个性化内容推荐', '全渠道消息中心', '智能外呼'],
                tools: { international: ['Salesforce Service Cloud', 'Zendesk'], domestic: ['智齿科技', '网易七鱼'] }
            }
        },
        cdp: {
            phase1: {
                dataStatus: 'complete',
                sop: ['手机号=会员ID', '仅交易数据', '无行为追踪', '画像模糊'],
                tools: { international: [], domestic: ['Excel', 'ERP系统'] }
            },
            phase2: {
                dataStatus: 'complete',
                sop: ['OneID统一身份', '静态标签体系', '行为事件追踪', 'RFM分层模型'],
                tools: { international: ['Segment', 'mParticle'], domestic: ['神策数据', '易观方舟', 'GrowingIO'] }
            },
            phase3: {
                dataStatus: 'missing',
                dataNote: '实时CDP/预测标签未建设，暂无评估数据',
                sop: ['实时CDP', '预测性标签', 'AI画像生成', '跨平台数据打通'],
                tools: { international: ['Adobe Real-Time CDP', 'Salesforce CDP'], domestic: ['神策数据', '创略科技'] }
            }
        },
        ma: {
            phase1: {
                dataStatus: 'complete',
                sop: ['无自动化', '人工群发', '无生命周期管理', '无MOT触发'],
                tools: { international: [], domestic: ['人工操作'] }
            },
            phase2: {
                dataStatus: 'complete',
                sop: ['关键MOT自动触达', '生日/满月复购提醒', '流失预警自动挽回', '新客培育旅程'],
                tools: { international: ['HubSpot', 'Marketo'], domestic: ['句子互动', 'Convertlab', '致趣百川'] }
            },
            phase3: {
                dataStatus: 'missing',
                dataNote: 'AI营销决策/全渠道编排未上线，暂无评估数据',
                sop: ['AI驱动营销决策', '智能时机优化', '个性化内容生成', '全渠道编排'],
                tools: { international: ['Salesforce Marketing Cloud', 'Adobe Journey Optimizer'], domestic: ['神策智能运营', 'Convertlab'] }
            }
        },
        martech: {
            phase1: {
                // 部分数据缺失：仅门店侧反馈，罐内码完成率无埋点
                dataStatus: 'partial',
                dataNote: '罐内码完成率缺埋点，仅有门店侧定性反馈',
                sop: ['小程序（体验差）', '罐内码（流程繁琐）', '系统割裂', '无数据中台'],
                tools: { international: [], domestic: ['微信小程序', '第三方扫码'] }
            },
            phase2: {
                dataStatus: 'complete',
                sop: ['企微+SCRM一体化', '小程序体验优化', '数据中台搭建', 'BI看板'],
                tools: { international: ['Salesforce'], domestic: ['企业微信', '有赞', '微盟', '神策数据'] }
            },
            phase3: {
                dataStatus: 'missing',
                dataNote: '数据湖/AI中台未规划落地，暂无评估数据',
                sop: ['全域数据湖', 'AI中台', '智能决策引擎', 'API生态'],
                tools: { international: ['Snowflake', 'Databricks'], domestic: ['阿里云数据中台', '腾讯云CDP'] }
            }
        }
    }
};

/* ---------- 断层叙事（业务语言），挂载到对应维度；
   只有该维度经引擎判定为关键断层时才在侧栏展示 ---------- */

const keyGapNarratives = [
    {
        dimKey: 'acquisition',
        icon: '🔻',
        title: '获客→入会断层',
        metric: '100% → 20% → 8%',
        metricLabel: '曝光→入会→首购',
        description: '入会转化极低，门店导购无利益驱动机制，扫码流程复杂体验差'
    },
    {
        dimKey: 'touchpoints',
        icon: '🔄',
        title: '首购→复购断层',
        metric: '8% → 3%',
        metricLabel: '首购→复购留存',
        description: '无企微私域承接，缺 1v1/社群 SOP 与 MOT 触达，复购没有运营抓手'
    },
    {
        dimKey: 'ma',
        icon: '📡',
        title: '触达→自动化断层',
        metric: '<1%',
        metricLabel: '短信打开率',
        description: '私域触点近乎空白，全靠人工群发，零自动化营销能力'
    }
];

/* ---------- 速赢行动清单（静态业务内容） ---------- */

const quickWins = [
    {
        icon: '🔗',
        title: '企微私域基建',
        timeline: '第1-4周',
        desc: '部署企业微信+SCRM系统，设计门店导购利益分成机制，解决渠道抵触问题。建立活码体系，实现渠道来源追踪。',
        kpis: [
            { value: '100%', label: '门店覆盖率' },
            { value: '50%', label: '导购激活率' }
        ]
    },
    {
        icon: '📱',
        title: '小程序体验重构',
        timeline: '第3-8周',
        desc: '简化入会流程至3步以内，优化罐内码扫码体验，增加即时奖励机制。将小程序从"积分工具"升级为"潜客蓄水池"。',
        kpis: [
            { value: '↓60%', label: '入会流失率' },
            { value: '↑3x', label: '扫码完成率' }
        ]
    },
    {
        icon: '🎬',
        title: '内容能力建设',
        timeline: '第5-12周',
        desc: '组建内部短视频团队，建立内容素材库，设计种草内容矩阵。从"枯燥医务知识"转向"场景化育儿内容"，驱动新客转化。',
        kpis: [
            { value: '30+', label: '月产内容数' },
            { value: '10%', label: '内容转化率' }
        ]
    }
];

/* ---------- AARRR 漏斗（原始观测数据） ---------- */

const funnelData = [
    { value: 100, name: '曝光触达', color: 'rgba(168, 85, 247, 0.9)' },
    { value: 45, name: '门店进店', color: 'rgba(168, 85, 247, 0.75)' },
    { value: 20, name: '扫码入会', color: 'rgba(236, 72, 153, 0.8)' },
    { value: 8, name: '首次购买', color: 'rgba(239, 68, 68, 0.85)' },
    { value: 3, name: '复购留存', color: 'rgba(239, 68, 68, 0.95)' }
];
