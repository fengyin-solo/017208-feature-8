/* ========================================
   诊断判定引擎（唯一事实源 Single Source of Truth）
   ========================================
   职责：
   1. 成熟度分级（L0-L3）与阶段入档判定
   2. 现状与标杆差距按阶段阈值分档：达标 / 关注 / 显著差距 / 关键断层
   3. 缺数据 / 部分数据 / 口径切换时的定档规则（显式标注按哪一档处理）
   4. 口径设置持久化（刷新、再次进入沿用最近一次设定）
   5. 历史结论快照归档（只读，切换口径不回写旧结论）

   矩阵、雷达图、统计卡片、诊断侧栏全部消费本引擎的同一份结果，
   保证同一批数据在各处得到一致结论。
   ======================================== */

const STORAGE_KEYS = {
    settings: 'kbat.diag.settings.v1',
    history: 'kbat.diag.history.v1'
};

const BANDS = {
    critical:    { key: 'critical',    label: '关键断层', color: '#ef4444' },
    significant: { key: 'significant', label: '显著差距', color: '#f97316' },
    watch:       { key: 'watch',       label: '关注',     color: '#eab308' },
    met:         { key: 'met',         label: '达标',     color: '#10b981' },
    unscored:    { key: 'unscored',    label: '未参评',   color: '#64748b' }
};

const MATURITY_LEVELS = [
    { level: 0, label: 'L0', name: '未入档',   color: '#ef4444' },
    { level: 1, label: 'L1', name: '阶段1在建', color: '#f97316' },
    { level: 2, label: 'L2', name: '阶段2达标', color: '#10b981' },
    { level: 3, label: 'L3', name: '阶段3标杆', color: '#06b6d4' }
];

const HISTORY_LIMIT = 20;

/* ---------------- 设置持久化 ---------------- */

function loadSettings() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.settings);
        if (!raw) return { ...DEFAULT_SETTINGS };
        const parsed = JSON.parse(raw);
        return {
            criteriaId: CRITERIA[parsed.criteriaId] ? parsed.criteriaId : DEFAULT_SETTINGS.criteriaId,
            missingPolicy: MISSING_POLICIES[parsed.missingPolicy] ? parsed.missingPolicy : DEFAULT_SETTINGS.missingPolicy
        };
    } catch (e) {
        console.warn('[Diagnosis] 设置读取失败，回退默认口径', e);
        return { ...DEFAULT_SETTINGS };
    }
}

function saveSettings(settings) {
    try {
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    } catch (e) {
        console.warn('[Diagnosis] 设置持久化失败', e);
    }
}

/* ---------------- 历史快照（只读归档） ---------------- */

function loadHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.history);
        if (!raw) return [];
        const list = JSON.parse(raw);
        return Array.isArray(list) ? list : [];
    } catch (e) {
        console.warn('[Diagnosis] 历史结论读取失败', e);
        return [];
    }
}

function persistHistory(list) {
    try {
        localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(list.slice(0, HISTORY_LIMIT)));
    } catch (e) {
        console.warn('[Diagnosis] 历史结论持久化失败', e);
    }
}

function archiveSnapshot(result, { isBaseline = false } = {}) {
    const list = loadHistory();
    const snapshot = {
        id: 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        createdAt: new Date().toISOString(),
        isBaseline,
        settings: JSON.parse(JSON.stringify(result.settings)),
        result: JSON.parse(JSON.stringify(result)) // 深拷贝冻结，后续重算不影响历史
    };
    list.unshift(snapshot);
    persistHistory(list);
    return snapshot;
}

/* ---------------- 分档计算 ---------------- */

function classifyGap(gap, thresholds) {
    if (gap >= thresholds.critical) return 'critical';
    if (gap >= thresholds.significant) return 'significant';
    if (gap > thresholds.met) return 'watch';
    return 'met';
}

function maturityLevel(score, lines) {
    if (score >= lines[2]) return 3;
    if (score >= lines[1]) return 2;
    if (score >= lines[0]) return 1;
    return 0;
}

function bandReasonText(dim, cellEval) {
    const { band, gap, dataStatus, phaseIndex, policyAssigned, benchmark } = cellEval;
    const gapTxt = (typeof gap === 'number') ? `差距 ${gap} 分` : '';

    if (band === 'unscored') {
        return `阶段${phaseIndex}不在本期判定范围（目标为阶段2），不参与分档；下方SOP/工具内容保留可读`;
    }
    if (dataStatus === 'missing' && policyAssigned) {
        const pol = MISSING_POLICIES[cellEval.policyId];
        return `该阶段评估数据缺失，按「${pol.name}」口径归入「${BANDS[band].label}」，${gapTxt || `标杆 ${benchmark} 分`}`;
    }
    if (dataStatus === 'partial' && band === 'watch') {
        return `部分指标缺失，按口径不允许判达标，由「达标」降为「关注」档`;
    }
    if (band === 'critical') return `现状 ${dim.score} 分 vs 阶段${phaseIndex}标杆 ${benchmark} 分，${gapTxt}，达关键断层线`;
    if (band === 'significant') return `现状 ${dim.score} 分 vs 阶段${phaseIndex}标杆 ${benchmark} 分，${gapTxt}，达显著差距档`;
    if (band === 'watch') return `现状 ${dim.score} 分 vs 阶段${phaseIndex}标杆 ${benchmark} 分，${gapTxt}，需关注`;
    return `现状 ${dim.score} 分 vs 阶段${phaseIndex}标杆 ${benchmark} 分，${gapTxt || '差距为 0'}，处于达标区间`;
}

/* ---------------- 单维度评估 ---------------- */

function evaluateDimension(dimMeta, settings, criteria) {
    const dimKey = dimMeta.key;
    const score = DIM_SCORES[dimKey];
    const level = maturityLevel(score, criteria.maturity.lines);
    const effectivePhase = level; // L0 → 0（未入档），L1 → phase1，L2 → phase2，L3 → phase3

    const cells = {};
    PHASES.forEach(phase => {
        const rawCell = matrixData.cells[dimKey][phase.key];
        const benchmark = BENCHMARKS[dimKey][phase.key];
        const gap = benchmark - score;
        const base = {
            phaseKey: phase.key,
            phaseIndex: phase.index,
            score,
            benchmark,
            gap,
            dataStatus: rawCell.dataStatus || 'complete',
            dataNote: rawCell.dataNote || '',
            isTarget: phase.key === TARGET_PHASE_KEY,
            policyAssigned: false,
            policyId: null
        };

        // 超出目标阶段：未参评（内容保留可读）
        if (phase.index > 2) {
            cells[phase.key] = {
                ...base,
                band: 'unscored',
                crossed: false,
                note: bandReasonText({ score }, { ...base, band: 'unscored' })
            };
            return;
        }

        const thresholds = criteria.gapThresholds[phase.key];
        let band;

        if (base.dataStatus === 'missing') {
            const policy = MISSING_POLICIES[settings.missingPolicy];
            band = policy.band; // conservative → critical；optimistic → watch
            base.policyAssigned = true;
            base.policyId = policy.id;
        } else {
            const scoreBand = classifyGap(Math.max(gap, 0), thresholds);
            if (base.dataStatus === 'partial') {
                // 部分数据：不升级断层；仅当本来判达标时降为关注
                const bandRank = ['met', 'watch', 'significant', 'critical'];
                band = bandRank.indexOf(scoreBand) < bandRank.indexOf('watch') ? 'watch' : scoreBand;
            } else {
                band = scoreBand;
            }
        }

        // 是否已跨越该阶段（用于“已跨越/当前/目标”标记，与分档相互独立）
        const crossed = phase.index < Math.max(effectivePhase, 1);

        cells[phase.key] = {
            ...base,
            band,
            crossed,
            note: bandReasonText({ score }, { ...base, band })
        };
    });

    // 维度结论以目标阶段单元为准（全局唯一口径）
    const targetCell = cells[TARGET_PHASE_KEY];
    return {
        key: dimKey,
        name: dimMeta.name,
        icon: dimMeta.icon,
        score,
        level,
        levelMeta: MATURITY_LEVELS[level],
        effectivePhase,
        targetGap: targetCell.gap,
        targetBand: targetCell.band,
        isCritical: targetCell.band === 'critical',
        cells
    };
}

/* ---------------- 一致性自检 ---------------- */

function runConsistencyChecks(dims, overall, criteria, settings, criticalGapKeys) {
    const checks = [];
    const assert = (id, label, ok, detail) => checks.push({ id, label, ok: !!ok, detail });

    dims.forEach(d => {
        const t = d.cells[TARGET_PHASE_KEY];
        assert(
            'band_match_' + d.key,
            `「${d.name}」目标档与断层标记一致`,
            (t.band === 'critical') === d.isCritical,
            `目标档=${BANDS[t.band].label}，维度关键断层=${d.isCritical ? '是' : '否'}`
        );
    });

    const radarSum = DIMENSIONS.reduce((s, d) => s + DIM_SCORES[d.key], 0);
    assert('radar_scores', '雷达图分值与评分源一致',
        dims.every(d => d.score === DIM_SCORES[d.key]),
        `雷达总分 ${radarSum}，维度评分由 DIM_SCORES 统一提供`);

    const critDims = dims.filter(d => d.isCritical);
    assert('critical_count', '统计卡片断层数与判定结果一致',
        overall.criticalCount === critDims.length,
        `引擎判定关键断层 ${critDims.length} 个：${critDims.map(d => d.name).join('、') || '无'}`
    );

    // 各阶段标杆分与差距算术必须同源，视图不允许各自改写
    dims.forEach(d => {
        PHASES.forEach(p => {
            assert('benchmark_' + d.key + '_' + p.key,
                `「${d.name}·${p.name.split(':')[0]}」标杆分单一来源`,
                d.cells[p.key].benchmark === BENCHMARKS[d.key][p.key],
                `标杆 ${d.cells[p.key].benchmark} 分（BENCHMARKS 表）`);
        });
        assert('gap_arith_' + d.key,
            `「${d.name}」差距=标杆−现状（算术一致）`,
            d.targetGap === d.cells[TARGET_PHASE_KEY].benchmark - d.score,
            `${d.cells[TARGET_PHASE_KEY].benchmark} - ${d.score} = ${d.targetGap}`);
    });

    dims.forEach(d => {
        const t = d.cells[TARGET_PHASE_KEY];
        assert('no_conflict_' + d.key,
            `「${d.name}」不存在“一边断层、一边达标”冲突`,
            !(t.band === 'critical' && t.band === 'met'),
            '同一单元不可能同时为关键断层与达标');

        PHASES.forEach(p => {
            const c = d.cells[p.key];
            if (c.band === 'unscored') {
                assert('unscored_outside_' + d.key + '_' + p.key,
                    `「${d.name}·${p.name.split(':')[0]}」未参评仅出现在范围外`,
                    p.index > 2,
                    '范围内缺数据必须按缺失策略定档，不允许标记为未参评');
            }
        });
    });

    // 侧栏叙事断层必须与引擎判定严格一致：展示集合 == 关键断层维度集合
    const outputKeys = criticalGapKeys.slice().sort();
    const engineKeys = dims.filter(d => d.isCritical).map(d => d.key).sort();
    assert('narrative_output',
        '侧栏关键断层叙事与引擎判定集合一致（不错不漏）',
        outputKeys.length === engineKeys.length && outputKeys.every((k, i) => k === engineKeys[i]),
        `侧栏展示：${outputKeys.join('、') || '无'}；引擎判定：${engineKeys.join('、') || '无'}`);

    return { checks, allPassed: checks.every(c => c.ok) };
}

/* ---------------- 全量计算（对外主入口） ---------------- */

function computeResult(settings) {
    const criteria = CRITERIA[settings.criteriaId];
    const policy = MISSING_POLICIES[settings.missingPolicy];

    const dims = DIMENSIONS.map(d => evaluateDimension(d, settings, criteria));

    const avg = Math.round(dims.reduce((s, d) => s + d.score, 0) / dims.length);
    const overallLevel = maturityLevel(avg, criteria.maturity.lines);

    const criticalDims = dims.filter(d => d.isCritical);
    const significantDims = dims.filter(d => d.targetBand === 'significant');
    const watchDims = dims.filter(d => d.targetBand === 'watch');
    const metDims = dims.filter(d => d.targetBand === 'met');

    // 目标阶段标杆均分 / 阶段3行业标杆均分（雷达图使用）
    const targetBenchAvg = Math.round(
        dims.reduce((s, d) => s + BENCHMARKS[d.key][TARGET_PHASE_KEY], 0) / dims.length
    );
    const phase3BenchAvg = Math.round(
        dims.reduce((s, d) => s + BENCHMARKS[d.key].phase3, 0) / dims.length
    );

    const overall = {
        avgScore: avg,
        level: overallLevel,
        levelMeta: MATURITY_LEVELS[overallLevel],
        currentPhaseIndex: 1,
        targetPhaseIndex: 2,
        targetBenchScore: targetBenchAvg,
        phase3BenchScore: phase3BenchAvg,
        // 当前定位阶段1（含未入档 L0），目标阶段2，跨度恒为 1 级
        spanLevels: 2 - 1,
        criticalCount: criticalDims.length
    };

    // 叙事断层：只保留经引擎判定为关键断层的维度
    const criticalGapKeys = criticalDims.map(d => d.key);
    const criticalGaps = criticalDims.map(d => {
        const n = keyGapNarratives.find(x => x.dimKey === d.key);
        return {
            dimKey: d.key,
            icon: n ? n.icon : '⚠️',
            title: n ? n.title : `${d.name}目标断层`,
            metric: n ? n.metric : `差距 ${d.targetGap} 分`,
            metricLabel: n ? n.metricLabel : `现状 vs 阶段2标杆`,
            description: n ? n.description : d.cells[TARGET_PHASE_KEY].note
        };
    });

    const result = {
        generatedAt: new Date().toISOString(),
        settings: {
            criteriaId: criteria.id,
            criteriaVersion: criteria.version,
            criteriaName: criteria.name,
            missingPolicy: policy.id,
            missingPolicyName: policy.name
        },
        dims,
        overall,
        lists: {
            critical: criticalDims.map(d => ({ key: d.key, name: d.name, gap: d.targetGap })),
            significant: significantDims.map(d => ({ key: d.key, name: d.name, gap: d.targetGap })),
            watch: watchDims.map(d => ({ key: d.key, name: d.name, gap: d.targetGap })),
            met: metDims.map(d => ({ key: d.key, name: d.name, gap: d.targetGap }))
        },
        criticalGaps
    };

    result.consistency = runConsistencyChecks(dims, overall, criteria, settings, criticalGapKeys);
    return result;
}

/* ---------------- 引擎门面 ---------------- */

const Diagnosis = {
    settings: null,
    result: null,
    baselineSnapshotId: null,

    init() {
        this.settings = loadSettings();
        this.result = computeResult(this.settings);

        const history = loadHistory();
        if (history.length === 0) {
            const snap = archiveSnapshot(this.result, { isBaseline: true });
            this.baselineSnapshotId = snap.id;
        } else {
            const baseline = [...history].reverse().find(s => s.isBaseline);
            this.baselineSnapshotId = baseline ? baseline.id : history[history.length - 1].id;
        }

        if (!this.result.consistency.allPassed) {
            console.warn('[Diagnosis] 一致性自检发现问题：',
                this.result.consistency.checks.filter(c => !c.ok));
        }
        return this.result;
    },

    get() {
        return this.result;
    },

    getCriteria() {
        return CRITERIA[this.settings.criteriaId];
    },

    applySettings(next, { silent = false } = {}) {
        const valid = {
            criteriaId: CRITERIA[next.criteriaId] ? next.criteriaId : this.settings.criteriaId,
            missingPolicy: MISSING_POLICIES[next.missingPolicy] ? next.missingPolicy : this.settings.missingPolicy
        };
        this.settings = valid;
        saveSettings(valid);
        this.result = computeResult(valid);
        // 每次口径调整都归档一次，旧结论保留只读，不被改写
        archiveSnapshot(this.result, { isBaseline: false });

        if (!silent) {
            window.dispatchEvent(new CustomEvent('diagnosis:changed', {
                detail: { settings: valid, result: this.result }
            }));
        }
        return this.result;
    },

    resetToDefault({ silent = false } = {}) {
        return this.applySettings({ ...DEFAULT_SETTINGS }, { silent });
    },

    history() {
        return loadHistory();
    },

    baseline() {
        const list = loadHistory();
        return list.find(s => s.id === this.baselineSnapshotId)
            || [...list].reverse().find(s => s.isBaseline)
            || list[list.length - 1]
            || null;
    },

    // 与指定历史快照对比，返回各维度档位迁移
    diff(snapshot) {
        if (!snapshot || !snapshot.result) return [];
        const oldMap = {};
        snapshot.result.dims.forEach(d => { oldMap[d.key] = d; });
        return this.result.dims.map(d => {
            const o = oldMap[d.key];
            return {
                key: d.key,
                name: d.name,
                fromBand: o ? o.targetBand : null,
                toBand: d.targetBand,
                changed: o ? o.targetBand !== d.targetBand : true
            };
        });
    },

    BANDS,
    MATURITY_LEVELS,
    CRITERIA,
    MISSING_POLICIES
};

window.Diagnosis = Diagnosis;
