/* ========================================
   诊断口径引擎
   - 同一批数据只从 dimensionMetrics 进入矩阵、雷达、摘要、历史快照
   - 口径只改变阈值/缺数处理，不改写已经发布的历史结论
   ======================================== */

const CALIBER_PROFILES = {
    implementation: {
        label: '经营改进口径（默认）',
        description: '用于90天落地：阶段1重基础留存，阶段2重稳定运营，阶段3重预测与生态。',
        thresholds: {
            phase1: { pass: 0.60, critical: 0.40 },
            phase2: { pass: 0.70, critical: 0.50 },
            phase3: { pass: 0.80, critical: 0.60 }
        }
    },
    audit: {
        label: '严格审计口径',
        description: '用于验收/董事会复核：提高各阶段达标线，缺数默认不能推断达标。',
        thresholds: {
            phase1: { pass: 0.70, critical: 0.40 },
            phase2: { pass: 0.80, critical: 0.55 },
            phase3: { pass: 0.90, critical: 0.70 }
        }
    },
    planning: {
        label: '规划测算口径',
        description: '用于路径规划：保留更高容错，但缺数仍只进入规划档，不显示达标。',
        thresholds: {
            phase1: { pass: 0.50, critical: 0.35 },
            phase2: { pass: 0.60, critical: 0.45 },
            phase3: { pass: 0.70, critical: 0.55 }
        }
    }
};

const MISSING_POLICIES = {
    strict: {
        label: '严格缺数：按0分/关键断层',
        short: '缺数=0分',
        description: '缺少阶段必需数据或口径映射时，该阶段项按 L0 处理；若位于当前阶段且属战略优先维度，进入关键断层。'
    },
    neutral: {
        label: '中性缺数：未参评/N/A',
        short: '缺数=N/A',
        description: '缺少数据时既不判达标，也不判关键断层；该项标记为“未参评”，并从该阶段均分分母剔除。'
    },
    loose: {
        label: '规划缺数：模拟L1/蓝图',
        short: '缺数=规划L1',
        description: '缺少数据时仅按 L1 规划蓝图处理，用于资源测算；未补数前不得显示为达标。'
    }
};

const DEFAULT_SETTINGS = {
    dataBatchId: 'CB-20260205',
    profile: 'implementation',
    missingPolicy: 'neutral',
    independentPhases: false,
    appliedAt: '2026-02-05T09:00:00+08:00'
};

const STORAGE_KEYS = {
    settings: 'kabrita-diagnostic-settings-v1',
    draft: 'kabrita-diagnostic-draft-v1',
    snapshots: 'kabrita-diagnostic-snapshots-v1'
};

// 每一行均记录：标杆分、当前实测值、数据是否可用、战略优先级与证据。
// 后续矩阵/雷达/侧栏只能引用该引擎结果，不能各自再硬编码达标状态。
const dimensionMetrics = {
    acquisition: {
        name: '全域获客',
        icon: '🎯',
        strategicPriority: true,
        evidence: '渠道主要依赖门店；线上线下无区隔导致门店抵触，入会流程和罐内码体验差，包裹卡无追踪。',
        gapTitle: '获客→入会断层',
        phases: {
            phase1: { benchmark: 60, actual: 12, available: true, metric: '入会20% / 首购8%', evidence: '扫码入会20%、首购8%，且门店导流激励不足。' },
            phase2: { benchmark: 70, actual: 15, available: true, metric: '企微渠道追踪15%', evidence: '尚无稳定企微活码、分渠道归因与门店利益分成闭环。' },
            phase3: { benchmark: 85, actual: null, available: false, metric: 'LTV/全域归因缺数', evidence: '缺少全域归因与LTV回测样本。' }
        }
    },
    rights: {
        name: '权益体系',
        icon: '👑',
        strategicPriority: false,
        evidence: '仅有基础积分/兑换和储值卡推销，无等级、付费会员或差异化权益。',
        gapTitle: '权益成长断层',
        phases: {
            phase1: { benchmark: 50, actual: 20, available: true, metric: '积分基础项20分', evidence: '积分可累计兑换，但权益单一、未形成成长机制。' },
            phase2: { benchmark: 65, actual: 12, available: true, metric: '等级/Plus 12分', evidence: '未落地等级成长值、付费会员和专属权益。' },
            phase3: { benchmark: 80, actual: null, available: false, metric: '动态权益缺数', evidence: '缺少LTV驱动权益分配与生态权益数据。' }
        }
    },
    touchpoints: {
        name: '私域触点',
        icon: '💬',
        strategicPriority: true,
        evidence: '短信打开率低于1%，无企微私域、社群SOP、视频号/直播联动。',
        gapTitle: '触达→私域断层',
        gapMetric: '<1%',
        phases: {
            phase1: { benchmark: 55, actual: 8, available: true, metric: '短信打开率<1%', evidence: '主要依赖短信/公众号单向触达，没有企微和社群承接。' },
            phase2: { benchmark: 70, actual: 8, available: true, metric: '企微/社群覆盖8%', evidence: '1v1 SOP、社群分层和内容矩阵尚未体系化。' },
            phase3: { benchmark: 90, actual: null, available: false, metric: '全渠道消息中心缺数', evidence: '缺少智能客服、全渠道编排和个性化推荐数据。' }
        }
    },
    cdp: {
        name: '数据画像',
        icon: '📊',
        strategicPriority: false,
        evidence: '会员ID主要是手机号，仅交易/积分数据，无行为追踪，画像模糊。',
        gapTitle: '画像→标签断层',
        phases: {
            phase1: { benchmark: 50, actual: 18, available: true, metric: '手机号/交易记录18分', evidence: '阶段1既有手机号、交易和积分记录仍保留可读，但不足以代表行为画像。' },
            phase2: { benchmark: 70, actual: 10, available: true, metric: 'OneID/标签10%', evidence: 'OneID、静态标签和RFM仍在目标态，当前未形成统一标签体系。' },
            phase3: { benchmark: 85, actual: null, available: false, metric: '预测标签缺数', evidence: '缺少实时事件、预测标签回测和跨平台身份映射。' }
        }
    },
    ma: {
        name: '自动化营销',
        icon: '🤖',
        strategicPriority: true,
        evidence: '无自动化旅程、无生命周期管理、无MOT触发，主要靠人工群发。',
        gapTitle: 'MOT→自动化断层',
        phases: {
            phase1: { benchmark: 55, actual: 8, available: true, metric: '自动旅程覆盖率8%', evidence: '新客培育、满月复购、流失预警均未自动化。' },
            phase2: { benchmark: 70, actual: 5, available: true, metric: 'MOT自动化5%', evidence: '缺少生日、满月复购、流失预警等自动触发旅程。' },
            phase3: { benchmark: 80, actual: null, available: false, metric: 'AI编排缺数', evidence: '缺少智能时机、内容生成和全渠道Journey Orchestration数据。' }
        }
    },
    martech: {
        name: '工具基建',
        icon: '🔧',
        strategicPriority: false,
        evidence: '小程序入会流程复杂，罐内码扫码繁琐，系统割裂，无数据中台。',
        gapTitle: '工具→承接断层',
        phases: {
            phase1: { benchmark: 60, actual: 25, available: true, metric: '小程序/扫码25分', evidence: '已有小程序和扫码触点，但体验割裂，仅完成局部工具存在性。' },
            phase2: { benchmark: 65, actual: 20, available: true, metric: 'SCRM/BI打通20%', evidence: '企微+SCRM、BI看板、数据中台尚未一体化。' },
            phase3: { benchmark: 85, actual: null, available: false, metric: '数据湖/AI中台缺数', evidence: '缺少全域数据湖、AI中台和开放API生态。' }
        }
    }
};

class DiagnosticEngine {
    constructor() {
        this.settings = this.loadSettings();
        this.snapshots = this.loadSnapshots();
        this.evaluation = this.evaluate(this.settings);

        if (!this.snapshots.length) {
            this.publishSnapshot('V1 基线口径：经营改进 / 缺数N/A', true);
        }
    }

    loadSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || 'null');
            return this.normalizeSettings(saved || DEFAULT_SETTINGS);
        } catch (error) {
            return { ...DEFAULT_SETTINGS };
        }
    }

    loadSnapshots() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.snapshots) || '[]');
            return Array.isArray(saved) ? saved : [];
        } catch (error) {
            return [];
        }
    }

    normalizeSettings(input) {
        const candidate = input || {};
        return {
            dataBatchId: candidate.dataBatchId || DEFAULT_SETTINGS.dataBatchId,
            profile: CALIBER_PROFILES[candidate.profile] ? candidate.profile : DEFAULT_SETTINGS.profile,
            missingPolicy: MISSING_POLICIES[candidate.missingPolicy] ? candidate.missingPolicy : DEFAULT_SETTINGS.missingPolicy,
            independentPhases: Boolean(candidate.independentPhases),
            appliedAt: candidate.appliedAt || DEFAULT_SETTINGS.appliedAt
        };
    }

    saveDraft(settings) {
        localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(this.normalizeSettings(settings)));
    }

    getDraft() {
        try {
            return this.normalizeSettings(JSON.parse(localStorage.getItem(STORAGE_KEYS.draft) || 'null'));
        } catch (error) {
            return { ...this.settings };
        }
    }

    applySettings(nextSettings, note) {
        const settings = this.normalizeSettings(nextSettings);
        settings.appliedAt = new Date().toISOString();
        const previous = this.settings;
        const signatureChanged = this.settingSignature(settings) !== this.settingSignature(previous);

        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
        localStorage.removeItem(STORAGE_KEYS.draft);
        this.settings = settings;
        this.evaluation = this.evaluate(settings);

        if (signatureChanged || !this.snapshots.length) {
            this.publishSnapshot(note || '口径调整后发布');
        }

        return this.evaluation;
    }

    settingSignature(settings) {
        return [
            settings.dataBatchId,
            settings.profile,
            settings.missingPolicy,
            settings.independentPhases ? '1' : '0'
        ].join('|');
    }

    publishSnapshot(note, isBaseline) {
        const evaluated = this.evaluation || this.evaluate(this.settings);
        const version = `V${this.snapshots.length + 1}`;
        const snapshot = {
            id: `snapshot-${Date.now()}`,
            version,
            note: note || '诊断结论发布',
            isBaseline: Boolean(isBaseline),
            publishedAt: new Date().toISOString(),
            dataBatchId: this.settings.dataBatchId,
            settingSignature: this.settingSignature(this.settings),
            settings: JSON.parse(JSON.stringify(this.settings)),
            summary: JSON.parse(JSON.stringify(evaluated.summary)),
            dimensions: JSON.parse(JSON.stringify(evaluated.dimensions)),
            phases: JSON.parse(JSON.stringify(evaluated.phases))
        };

        this.snapshots.push(snapshot);
        localStorage.setItem(STORAGE_KEYS.snapshots, JSON.stringify(this.snapshots));
        return snapshot;
    }

    getLatestSnapshot() {
        return this.snapshots[this.snapshots.length - 1] || null;
    }

    evaluate(settings) {
        const normalized = this.normalizeSettings(settings);
        const profile = CALIBER_PROFILES[normalized.profile];
        const phaseKeys = matrixData.phases.map(phase => phase.key);
        const dimensions = {};
        const phaseBuckets = phaseKeys.map(() => []);

        matrixData.dimensions.forEach(dim => {
            const metricConfig = dimensionMetrics[dim.key];
            dimensions[dim.key] = {
                key: dim.key,
                name: dim.name,
                icon: dim.icon,
                strategicPriority: metricConfig.strategicPriority,
                phases: {}
            };

            let previousPassed = true;

            phaseKeys.forEach((phaseKey, phaseIndex) => {
                const record = metricConfig.phases[phaseKey];
                const threshold = profile.thresholds[phaseKey];
                const locked = !normalized.independentPhases && !previousPassed;
                const result = this.evaluateCell({
                    dim,
                    phaseKey,
                    phaseIndex,
                    record,
                    threshold,
                    locked,
                    settings: normalized,
                    metricConfig
                });

                dimensions[dim.key].phases[phaseKey] = result;
                if (result.includedInAverage) {
                    phaseBuckets[phaseIndex].push(result);
                }
                previousPassed = result.passed;
            });
        });

        const phases = {};
        phaseKeys.forEach((phaseKey, phaseIndex) => {
            const rows = phaseBuckets[phaseIndex];
            const benchmarkRows = matrixData.dimensions.map(dim => dimensions[dim.key].phases[phaseKey]);
            const benchmark = Math.round(benchmarkRows.reduce((sum, row) => sum + row.benchmark, 0) / benchmarkRows.length);
            const actual = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.actual, 0) / rows.length) : 0;
            const threshold = profile.thresholds[phaseKey];
            const ratio = rows.length ? actual / benchmark : 0;
            const requiredScore = Math.round(benchmark * threshold.pass);
            const passed = rows.length > 0 && ratio >= threshold.pass;
            const hasCritical = rows.some(row => row.isCriticalGap);
            const targetPassed = phaseIndex > 0 && phaseKeys.slice(0, phaseIndex).every(previousKey => phases[previousKey].passed);

            phases[phaseKey] = {
                key: phaseKey,
                benchmark,
                actual,
                ratio,
                requiredScore,
                passRatio: threshold.pass,
                criticalRatio: threshold.critical,
                passed,
                hasCritical,
                targetPassed,
                evaluatedCount: rows.length,
                totalCount: matrixData.dimensions.length,
                status: passed ? 'passed' : (hasCritical ? 'critical' : 'open')
            };
        });

        const currentPhase = phases.phase1;
        const targetPhase = phases.phase2;
        const dimensionOrder = matrixData.dimensions.map(dim => dim.key);
        const keyGaps = dimensionOrder
            .map(key => dimensions[key].phases.phase1)
            .filter(row => row.isCriticalGap)
            .map(row => ({
                id: row.dimensionKey,
                icon: row.icon,
                title: row.gapTitle,
                severity: 'critical',
                metric: row.gapMetric || `${row.actual}/${row.benchmark}`,
                metricLabel: row.metricName,
                description: row.evidence
            }));

        const overall = {
            score: currentPhase.actual,
            grade: this.gradeLabel(phases.phase1.ratio),
            currentPhaseIndex: 0,
            targetPhaseIndex: 1,
            targetReached: targetPhase.passed && targetPhase.targetPassed
        };

        const summary = {
            currentPosition: {
                label: '阶段1：沉睡通讯录',
                subtitle: '资产留存（基础项尚未稳定达标）',
                score: currentPhase.actual,
                color: '#ef4444',
                description: `同一批数据在阶段1标杆下均分${currentPhase.actual}/${currentPhase.benchmark}，达标线${currentPhase.requiredScore}分；定位仍为阶段1，不能按阶段2能力达标展示。`
            },
            targetPosition: {
                label: '阶段2：社交连接体',
                subtitle: '活跃与复购（目标态，未解锁）',
                score: targetPhase.actual,
                color: '#f59e0b',
                gap: targetPhase.targetPassed ? '阶段2已满足前置门槛' : '前置阶段1未过门，阶段2按锁定项管理'
            },
            keyGaps,
            phaseStatus: phases,
            overall
        };

        return {
            settings: normalized,
            profile,
            dimensions,
            phases,
            summary
        };
    }

    evaluateCell({ dim, phaseKey, phaseIndex, record, threshold, locked, settings, metricConfig }) {
        const base = {
            dimensionKey: dim.key,
            phaseKey,
            phaseIndex,
            icon: dim.icon,
            name: dim.name,
            benchmark: record.benchmark,
            actual: 0,
            ratio: 0,
            level: 'N/A',
            levelLabel: '未参评',
            passed: false,
            includedInAverage: false,
            isCriticalGap: false,
            state: 'notEntered',
            metricName: record.metric,
            evidence: record.evidence,
            gapTitle: metricConfig.gapTitle || `${metricConfig.name}阶段断层`,
            gapMetric: metricConfig.gapMetric,
            missing: !record.available,
            locked,
            note: ''
        };

        if (!record.available) {
            if (settings.missingPolicy === 'strict') {
                base.actual = 0;
                base.ratio = 0;
                base.level = 'L0';
                base.levelLabel = '断层';
                base.state = 'missingL0';
                base.includedInAverage = true;
                base.note = '缺少数据/新口径未映射：严格档按L0/0分处理；非当前阶段不额外命名为关键断层。';
            } else if (settings.missingPolicy === 'loose') {
                base.actual = Math.round(record.benchmark * 0.30);
                base.ratio = 0.30;
                base.level = 'L1';
                base.levelLabel = '规划蓝图';
                base.state = 'planning';
                base.includedInAverage = true;
                base.note = '缺少数据/新口径未映射：规划档按L1蓝图处理，补数前不得判达标。';
            } else {
                base.state = 'notEntered';
                base.note = '缺少数据/新口径未映射：按未参评N/A处理，不判关键断层，也不判达标。';
            }
            base.isCriticalGap = base.state === 'criticalGap' && phaseIndex === 0 && metricConfig.strategicPriority;
            return base;
        }

        base.actual = record.actual;
        base.ratio = record.actual / record.benchmark;
        base.includedInAverage = true;
        base.passed = base.ratio >= threshold.pass;

        if (base.ratio >= 1) {
            base.level = 'L4';
            base.levelLabel = '标杆领先';
            base.state = 'passed';
        } else if (base.ratio >= threshold.pass) {
            base.level = 'L3';
            base.levelLabel = '阶段达标';
            base.state = 'passed';
        } else if (base.ratio >= 0.55) {
            base.level = 'L2';
            base.levelLabel = '过渡验证';
            base.state = 'warning';
        } else if (base.ratio >= 0.30) {
            base.level = 'L1';
            base.levelLabel = '萌芽建设';
            base.state = 'emerging';
        } else {
            base.level = 'L0';
            base.levelLabel = '关键断层';
            base.state = 'criticalGap';
        }

        base.isCriticalGap = base.ratio < threshold.critical && phaseIndex === 0 && metricConfig.strategicPriority;
        if (base.isCriticalGap) {
            base.state = 'criticalGap';
            base.level = 'L0';
            base.levelLabel = '关键断层';
        }

        if (locked && !settings.independentPhases) {
            base.state = 'locked';
            base.passed = false;
            base.note = '前置阶段未达到过门线：本阶段实测仅作证据保留，不计入阶段解锁，也不显示达标。';
        } else if (!base.passed && phaseIndex > 0) {
            base.note = '本阶段未达标；仅当前置阶段全部过门后，才可作为下一档成熟度确认。';
        } else if (!base.passed) {
            base.note = `低于阶段达标线（${Math.round(record.benchmark * threshold.pass)}分）。`;
        }

        return base;
    }

    gradeLabel(ratio) {
        if (ratio >= 1) return 'L4 标杆领先';
        if (ratio >= 0.8) return 'L3 阶段达标';
        if (ratio >= 0.55) return 'L2 过渡验证';
        if (ratio >= 0.30) return 'L1 萌芽建设';
        return 'L0 关键断层';
    }
}

window.diagnosticEngine = new DiagnosticEngine();
window.CALIBER_PROFILES = CALIBER_PROFILES;
window.MISSING_POLICIES = MISSING_POLICIES;
