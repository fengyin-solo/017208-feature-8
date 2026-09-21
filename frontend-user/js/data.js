/* ========================================
   静态矩阵与行动配置
   ======================================== */

const matrixData = {
    dimensions: [
        { icon: '🎯', name: '全域获客', key: 'acquisition' },
        { icon: '👑', name: '权益体系', key: 'rights' },
        { icon: '💬', name: '私域触点', key: 'touchpoints' },
        { icon: '📊', name: '数据画像', key: 'cdp' },
        { icon: '🤖', name: '自动化营销', key: 'ma' },
        { icon: '🔧', name: '工具基建', key: 'martech' }
    ],
    phases: [
        { name: '阶段1：沉睡通讯录', subtitle: '资产留存', key: 'phase1' },
        { name: '阶段2：社交连接体', subtitle: '活跃与复购', key: 'phase2' },
        { name: '阶段3：智能价值网', subtitle: '预测与生态', key: 'phase3' }
    ],
    cells: {
        acquisition: {
            phase1: {
                sop: ['门店扫码入会（流程复杂）', '罐内码扫码（体验差）', '包裹卡引流（无追踪）'],
                tools: { international: ['Google Analytics'], domestic: ['有赞', '微盟'] }
            },
            phase2: {
                sop: ['企微活码分渠道追踪', '裂变拉新（老带新奖励）', '公域转私域SOP（抖音/天猫）', '门店利益分成机制'],
                tools: { international: ['HubSpot'], domestic: ['企业微信', '句子互动', '尘锋SCRM'] }
            },
            phase3: {
                sop: ['AI智能投放优化', 'LTV预测筛选高价值潜客', '全域归因分析', '智能渠道预算分配'],
                tools: { international: ['Salesforce Marketing Cloud', 'Adobe Experience Cloud'], domestic: ['神策数据', '易观方舟'] }
            }
        },
        rights: {
            phase1: {
                sop: ['基础积分累计', '积分兑换礼品', '无等级体系', '储值卡推销'],
                tools: { international: [], domestic: ['有赞', '微盟'] }
            },
            phase2: {
                sop: ['会员等级体系（银/金/钻）', '付费会员Plus设计', '成长值任务体系', '专属权益差异化'],
                tools: { international: ['Salesforce Loyalty'], domestic: ['驿氪', '有赞'] }
            },
            phase3: {
                sop: ['动态权益个性化', 'LTV驱动权益分配', '积分通证化', '生态权益互通'],
                tools: { international: ['Adobe Real-Time CDP'], domestic: ['神策数据', '易观'] }
            }
        },
        touchpoints: {
            phase1: {
                sop: ['短信群发（打开率<1%）', '公众号推文', '无企微私域', '无社群运营'],
                tools: { international: [], domestic: ['公众号', '短信平台'] }
            },
            phase2: {
                sop: ['企微1v1私聊SOP', '社群分层运营', '视频号内容矩阵', '直播带货联动', '朋友圈剧本'],
                tools: { international: ['Intercom'], domestic: ['企业微信', '句子互动', '微伴助手', '腾讯企点'] }
            },
            phase3: {
                sop: ['AI智能客服', '个性化内容推荐', '全渠道消息中心', '智能外呼'],
                tools: { international: ['Salesforce Service Cloud', 'Zendesk'], domestic: ['智齿科技', '网易七鱼'] }
            }
        },
        cdp: {
            phase1: {
                sop: ['手机号=会员ID', '仅交易数据', '无行为追踪', '画像模糊'],
                tools: { international: [], domestic: ['Excel', 'ERP系统'] },
                profileNote: '既有画像仍可读取：手机号、交易/积分记录是阶段1资产；缺少行为事件，不能当作阶段2标签能力。'
            },
            phase2: {
                sop: ['OneID统一身份', '静态标签体系', '行为事件追踪', 'RFM分层模型'],
                tools: { international: ['Segment', 'mParticle'], domestic: ['神策数据', '易观方舟', 'GrowingIO'] },
                profileNote: '阶段2规划内容保留可读：OneID、静态标签、RFM仅代表目标能力；当前未落地，不据此判达标。'
            },
            phase3: {
                sop: ['实时CDP', '预测性标签', 'AI画像生成', '跨平台数据打通'],
                tools: { international: ['Adobe Real-Time CDP', 'Salesforce CDP'], domestic: ['神策数据', '创略科技'] },
                profileNote: '高阶画像内容保留可读：实时/预测标签属于能力蓝图；缺少回测样本或新口径未映射时，只作为蓝图不作为达标证据。'
            }
        },
        ma: {
            phase1: {
                sop: ['无自动化', '人工群发', '无生命周期管理', '无MOT触发'],
                tools: { international: [], domestic: ['人工操作'] }
            },
            phase2: {
                sop: ['关键MOT自动触达', '生日/满月复购提醒', '流失预警自动挽回', '新客培育旅程'],
                tools: { international: ['HubSpot', 'Marketo'], domestic: ['句子互动', 'Convertlab', '致趣百川'] }
            },
            phase3: {
                sop: ['AI驱动营销决策', '智能时机优化', '个性化内容生成', '全渠道编排'],
                tools: { international: ['Salesforce Marketing Cloud', 'Adobe Journey Optimizer'], domestic: ['神策智能运营', 'Convertlab'] }
            }
        },
        martech: {
            phase1: {
                sop: ['小程序（体验差）', '罐内码（流程繁琐）', '系统割裂', '无数据中台'],
                tools: { international: [], domestic: ['微信小程序', '第三方扫码'] }
            },
            phase2: {
                sop: ['企微+SCRM一体化', '小程序体验优化', '数据中台搭建', 'BI看板'],
                tools: { international: ['Salesforce'], domestic: ['企业微信', '有赞', '微盟', '神策数据'] }
            },
            phase3: {
                sop: ['全域数据湖', 'AI中台', '智能决策引擎', 'API生态'],
                tools: { international: ['Snowflake', 'Databricks'], domestic: ['阿里云数据中台', '腾讯云CDP'] }
            }
        }
    }
};

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

const funnelData = [
    { value: 100, name: '曝光触达', color: 'rgba(168, 85, 247, 0.9)' },
    { value: 45, name: '门店进店', color: 'rgba(168, 85, 247, 0.75)' },
    { value: 20, name: '扫码入会', color: 'rgba(236, 72, 153, 0.8)' },
    { value: 8, name: '首次购买', color: 'rgba(239, 68, 68, 0.85)' },
    { value: 3, name: '复购留存', color: 'rgba(239, 68, 68, 0.95)' }
];
