/* ========================================
   UI 组件渲染
   ======================================== */

class ComponentRenderer {
    constructor() {
        this.typewriterText = '同一批数据、一套阶段阈值：矩阵、雷达、摘要与历史快照共用诊断引擎结论...';
        this.charIndex = 0;
    }

    escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    percent(value) {
        return `${Math.round(value * 100)}%`;
    }

    getEvaluation() {
        return window.diagnosticEngine.evaluation;
    }

    startTypewriter() {
        const el = document.getElementById('typewriter');
        if (!el) return;

        const type = () => {
            if (this.charIndex < this.typewriterText.length) {
                el.textContent = this.typewriterText.substring(0, this.charIndex + 1);
                this.charIndex++;
                setTimeout(type, 35);
            }
        };
        type();
    }

    renderRulesPanel() {
        const evalResult = this.getEvaluation();
        const container = document.getElementById('rulesPanel');
        const engine = window.diagnosticEngine;
        const settings = evalResult.settings;
        if (!container) return;

        const profileOptions = Object.keys(CALIBER_PROFILES).map(key => `
            <option value="${key}" ${settings.profile === key ? 'selected' : ''}>${CALIBER_PROFILES[key].label}</option>
        `).join('');

        const missingOptions = Object.keys(MISSING_POLICIES).map(key => `
            <option value="${key}" ${settings.missingPolicy === key ? 'selected' : ''}>${MISSING_POLICIES[key].label}</option>
        `).join('');

        container.innerHTML = `
            <div class="rules-header">
                <div>
                    <div class="rules-kicker">DIAGNOSTIC GOVERNANCE</div>
                    <h3>诊断口径与阈值规则</h3>
                    <p>当前数据批次：<strong>${this.escapeHtml(settings.dataBatchId)}</strong>，生效时间：${new Date(settings.appliedAt).toLocaleString('zh-CN')}</p>
                </div>
                <div class="rules-actions">
                    <button class="rule-btn secondary" id="resetRulesBtn" type="button">恢复表单</button>
                    <button class="rule-btn primary" id="applyRulesBtn" type="button">应用并发布口径</button>
                </div>
            </div>
            <div class="rule-controls-grid">
                <label class="rule-control">
                    <span>标杆/验收口径</span>
                    <select id="profileSelect">${profileOptions}</select>
                    <small id="profileDescription">${CALIBER_PROFILES[settings.profile].description}</small>
                </label>
                <label class="rule-control">
                    <span>缺数或口径切换后的处理档</span>
                    <select id="missingPolicySelect">${missingOptions}</select>
                    <small id="missingPolicyDescription">${MISSING_POLICIES[settings.missingPolicy].description}</small>
                </label>
                <label class="rule-control switch-control">
                    <span>阶段评测方式</span>
                    <select id="phaseModeSelect">
                        <option value="gated" ${!settings.independentPhases ? 'selected' : ''}>默认：过门制（前一阶段达标才解锁）</option>
                        <option value="independent" ${settings.independentPhases ? 'selected' : ''}>独立评测（仅诊断，不自动解锁）</option>
                    </select>
                    <small>过门制下，阶段2实测不会覆盖阶段1未达标的事实。</small>
                </label>
            </div>
            <div id="thresholdGrid" class="threshold-grid"></div>
            <div class="criteria-grid">
                <div class="criteria-card">
                    <h4>维度成熟度分级</h4>
                    <div class="criteria-list">
                        <div><b>L4 标杆领先</b><span>达成率 ≥ 100%，可复制到其他区域/渠道。</span></div>
                        <div><b>L3 阶段达标</b><span>达成率 ≥ 当前阶段“达标线”，具备进入下一阶段的前置资格。</span></div>
                        <div><b>L2 过渡验证</b><span>55%～达标线以下，有试点但稳定性不足，不按达标展示。</span></div>
                        <div><b>L1 萌芽建设</b><span>30%～55%，仅有关键动作雏形；规划缺数时也归入蓝图L1。</span></div>
                        <div><b>L0/N/A</b><span>低于30%为L0断层；无数据且中性处理为N/A，未参评。</span></div>
                    </div>
                </div>
                <div class="criteria-card">
                    <h4>关键断层判定</h4>
                    <div class="criteria-list">
                        <div><b>同一结论源</b><span>矩阵、雷达、摘要卡和历史快照均读取同一引擎结果。</span></div>
                        <div><b>关键断层</b><span>当前阶段达成率低于该阶段关键线，且为拉新战略优先维度。</span></div>
                        <div><b>锁定不达标</b><span>阶段1过门前，阶段2/3只显示“锁定/蓝图”，不能显示绿色达标。</span></div>
                        <div><b>缺数处理</b><span>严格档可判L0；中性档为N/A；规划档为L1蓝图，均不得直接判达标。</span></div>
                    </div>
                </div>
            </div>
            <div class="history-strip">
                <div class="history-title">已发布历史结论（只读，不会被本次刷新改写）</div>
                <div id="historyList" class="history-list"></div>
            </div>
        `;

        this.renderThresholdRows();
        this.renderHistory();
        this.bindRulesEvents();
    }

    renderThresholdRows() {
        const grid = document.getElementById('thresholdGrid');
        const evalResult = this.getEvaluation();
        if (!grid) return;

        grid.innerHTML = matrixData.phases.map(phase => {
            const phaseResult = evalResult.phases[phase.key];
            const threshold = evalResult.profile.thresholds[phase.key];
            const statusClass = phaseResult.passed ? 'is-passed' : (phaseResult.hasCritical ? 'is-critical' : 'is-open');
            const statusText = phaseResult.passed ? '阶段达标' : (phaseResult.hasCritical ? '含关键断层' : '待补齐');
            return `
                <div class="threshold-card ${statusClass}">
                    <div class="threshold-card-head">
                        <div>
                            <strong>${phase.name}</strong>
                            <span>${phase.subtitle}</span>
                        </div>
                        <em>${statusText}</em>
                    </div>
                    <div class="threshold-score-line">
                        <span>当前均分</span>
                        <b>${phaseResult.evaluatedCount ? phaseResult.actual : '—'}/${phaseResult.benchmark}</b>
                    </div>
                    <div class="threshold-rule-line">
                        <span>达标线：${this.percent(threshold.pass)}（${phaseResult.requiredScore}分）</span>
                        <span>关键线：${this.percent(threshold.critical)}</span>
                    </div>
                    <div class="threshold-meter">
                        <i style="left:${threshold.critical * 100}%"></i>
                        <i style="left:${threshold.pass * 100}%"></i>
                        <b class="${statusClass}" style="width:${Math.min(phaseResult.ratio * 100, 100)}%"></b>
                    </div>
                    <small>已参评 ${phaseResult.evaluatedCount}/${phaseResult.totalCount} 项；N/A项剔除均分，不补成达标。</small>
                </div>
            `;
        }).join('');
    }

    renderHistory() {
        const list = document.getElementById('historyList');
        if (!list) return;

        const snapshots = window.diagnosticEngine.snapshots.slice().reverse();
        list.innerHTML = snapshots.map(snapshot => {
            const profileLabel = CALIBER_PROFILES[snapshot.settings.profile]
                ? CALIBER_PROFILES[snapshot.settings.profile].label
                : snapshot.settings.profile;
            const missingLabel = MISSING_POLICIES[snapshot.settings.missingPolicy]
                ? MISSING_POLICIES[snapshot.settings.missingPolicy].short
                : snapshot.settings.missingPolicy;
            return `
                <div class="history-item ${snapshot.isBaseline ? 'is-baseline' : ''}">
                    <div class="history-item-head">
                        <strong>${snapshot.version}</strong>
                        <span>${new Date(snapshot.publishedAt).toLocaleString('zh-CN')}</span>
                    </div>
                    <div class="history-item-note">${this.escapeHtml(snapshot.note)}</div>
                    <div class="history-item-meta">
                        <span>${this.escapeHtml(profileLabel)}</span>
                        <span>${missingLabel}</span>
                        <span>总分 ${snapshot.summary.overall.score}</span>
                        <span>关键断层 ${snapshot.summary.keyGaps.length} 项</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    bindRulesEvents() {
        const profileSelect = document.getElementById('profileSelect');
        const missingSelect = document.getElementById('missingPolicySelect');
        const modeSelect = document.getElementById('phaseModeSelect');
        const applyButton = document.getElementById('applyRulesBtn');
        const resetButton = document.getElementById('resetRulesBtn');

        const collectDraft = () => {
            const current = window.diagnosticEngine.settings;
            return {
                ...current,
                profile: profileSelect.value,
                missingPolicy: missingSelect.value,
                independentPhases: modeSelect.value === 'independent'
            };
        };

        [profileSelect, missingSelect, modeSelect].forEach(select => {
            select.addEventListener('change', () => {
                const draft = collectDraft();
                window.diagnosticEngine.saveDraft(draft);
                if (select === profileSelect) {
                    document.getElementById('profileDescription').textContent = CALIBER_PROFILES[draft.profile].description;
                }
                if (select === missingSelect) {
                    document.getElementById('missingPolicyDescription').textContent = MISSING_POLICIES[draft.missingPolicy].description;
                }
                window.toast.info('口径草稿已暂存', '点击“应用并发布口径”后才会生成新结论。', 2600);
            });
        });

        resetButton.addEventListener('click', () => {
            this.fillRuleForm(window.diagnosticEngine.settings);
            localStorage.removeItem('kabrita-diagnostic-draft-v1');
            window.toast.info('已恢复表单', '仍显示最近一次已发布口径。');
        });

        applyButton.addEventListener('click', () => {
            const draft = collectDraft();
            const profileLabel = CALIBER_PROFILES[draft.profile].label;
            const missingLabel = MISSING_POLICIES[draft.missingPolicy].short;
            const note = `口径发布：${profileLabel} / ${missingLabel} / ${draft.independentPhases ? '独立评测' : '过门制'}`;
            window.diagnosticEngine.applySettings(draft, note);
            this.renderAll();
            window.chartManager.updateCharts();
            window.toast.success('口径已发布', '最新设定已保留；历史快照保持只读。', 3600);
        });
    }

    fillRuleForm(settings) {
        const profileSelect = document.getElementById('profileSelect');
        const missingSelect = document.getElementById('missingPolicySelect');
        const modeSelect = document.getElementById('phaseModeSelect');
        if (!profileSelect || !missingSelect || !modeSelect) return;
        profileSelect.value = settings.profile;
        missingSelect.value = settings.missingPolicy;
        modeSelect.value = settings.independentPhases ? 'independent' : 'gated';
        document.getElementById('profileDescription').textContent = CALIBER_PROFILES[settings.profile].description;
        document.getElementById('missingPolicyDescription').textContent = MISSING_POLICIES[settings.missingPolicy].description;
    }

    renderStats() {
        const container = document.getElementById('statsGrid');
        const evalResult = this.getEvaluation();
        if (!container) return;

        const stats = [
            { icon: '🎯', value: '拉新', label: '2026 核心战略', trend: null },
            { icon: '⚠️', value: `${evalResult.summary.overall.score}分`, label: '当前阶段1均分', trend: evalResult.summary.overall.grade },
            { icon: '🚀', value: '阶段2', label: '改进目标', trend: evalResult.phases.phase2.targetPassed ? '已过门' : '待阶段1过门' },
            { icon: '🔥', value: `${evalResult.summary.keyGaps.length}项`, label: '同一口径关键断层', trend: null }
        ];

        container.innerHTML = stats.map((stat, index) => `
            <div class="glass-card stat-card fade-in delay-${index + 1}" data-index="${index}">
                <span class="stat-icon">${stat.icon}</span>
                <div class="stat-value">${this.escapeHtml(stat.value)}</div>
                <div class="stat-label">${this.escapeHtml(stat.label)}</div>
                ${stat.trend ? `<div class="stat-trend">${this.escapeHtml(stat.trend)}</div>` : ''}
            </div>
        `).join('');
    }

    cellStatus(result, isTarget) {
        if (result.state === 'missingL0') {
            return { className: 'cell-na', tag: 'L0 缺数断层', tagClass: 'tag-na' };
        }
        if (result.state === 'criticalGap') {
            return { className: 'cell-critical', tag: '🔴 关键断层', tagClass: 'tag-critical' };
        }
        if (result.locked) {
            return { className: 'cell-locked', tag: '🔒 前置未过门', tagClass: 'tag-locked' };
        }
        if (result.state === 'planning') {
            return { className: 'cell-planning', tag: '🧭 规划蓝图L1', tagClass: 'tag-planning' };
        }
        if (result.state === 'notEntered') {
            return { className: 'cell-na', tag: 'N/A 未参评', tagClass: 'tag-na' };
        }
        if (result.passed) {
            return { className: 'cell-passed', tag: '✅ 阶段达标', tagClass: 'tag-passed' };
        }
        if (isTarget) {
            return { className: 'cell-target-pending', tag: '🎯 目标·未达标', tagClass: 'tag-target-pending' };
        }
        return { className: 'cell-warning', tag: '🟠 未稳定达标', tagClass: 'tag-warning' };
    }

    renderMatrix() {
        const table = document.getElementById('matrixTable');
        const evalResult = this.getEvaluation();
        if (!table) return;

        let html = '<thead><tr><th>运营维度</th>';

        matrixData.phases.forEach(phase => {
            const phaseResult = evalResult.phases[phase.key];
            html += `
                <th>
                    <div class="matrix-phase-head">
                        <div class="matrix-phase-name">${phase.name}</div>
                        <div class="matrix-phase-subtitle">焦点：${phase.subtitle}</div>
                        <div class="matrix-phase-score ${phaseResult.passed ? 'is-passed' : (phaseResult.hasCritical ? 'is-critical' : 'is-open')}">
                            ${phaseResult.actual}/${phaseResult.benchmark} · 线${phaseResult.requiredScore}
                        </div>
                    </div>
                </th>
            `;
        });
        html += '</tr></thead><tbody>';

        matrixData.dimensions.forEach((dim, dimIndex) => {
            html += `<tr class="fade-in delay-${Math.min(dimIndex + 1, 5)}">`;
            html += `
                <td class="dimension-cell">
                    <span class="dimension-icon">${dim.icon}</span>
                    <div class="dimension-name">${dim.name}</div>
                    ${dimensionMetrics[dim.key].strategicPriority ? '<span class="priority-pill">拉新优先</span>' : ''}
                </td>
            `;

            matrixData.phases.forEach(phase => {
                const cell = matrixData.cells[dim.key][phase.key];
                const result = evalResult.dimensions[dim.key].phases[phase.key];
                const isTarget = phase.key === 'phase2';
                const status = this.cellStatus(result, isTarget);

                html += `<td class="diagnostic-cell ${status.className}"><div class="cell-content">
                    <div class="cell-tag-row">
                        <span class="status-tag ${status.tagClass}">${status.tag}</span>
                        <span class="level-chip">${result.level} · ${result.levelLabel}</span>
                    </div>
                    <div class="score-row">
                        <strong>${result.missing ? 'N/A' : `${result.actual}/${result.benchmark}`}</strong>
                        <span>达成 ${result.missing ? '未参评' : this.percent(result.ratio)}</span>
                    </div>
                    <div class="threshold-text">达标 ${this.percent(evalResult.profile.thresholds[phase.key].pass)} · 关键 ${this.percent(evalResult.profile.thresholds[phase.key].critical)}</div>
                    <div class="sop-list">`;
                cell.sop.forEach(item => {
                    html += `<div class="sop-item">${this.escapeHtml(item)}</div>`;
                });
                html += '</div>';

                if (cell.profileNote) {
                    html += `<div class="profile-note">📁 ${this.escapeHtml(cell.profileNote)}</div>`;
                }
                if (result.note) {
                    html += `<div class="rule-note">${this.escapeHtml(result.note)}</div>`;
                }
                if (result.evidence) {
                    html += `<div class="evidence-note">证据：${this.escapeHtml(result.evidence)}</div>`;
                }

                if (cell.tools && (cell.tools.international.length || cell.tools.domestic.length)) {
                    html += '<div class="tools-section"><div class="tools-label">🔧 推荐工具</div>';
                    cell.tools.international.forEach(tool => {
                        html += `<span class="tool-tag international" data-tool="${this.escapeHtml(tool)}">${this.escapeHtml(tool)}</span>`;
                    });
                    cell.tools.domestic.forEach(tool => {
                        html += `<span class="tool-tag domestic" data-tool="${this.escapeHtml(tool)}">${this.escapeHtml(tool)}</span>`;
                    });
                    html += '</div>';
                }
                html += '</div></td>';
            });
            html += '</tr>';
        });

        html += '</tbody>';
        table.innerHTML = html;

        table.querySelectorAll('.tool-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const toolName = tag.dataset.tool;
                const isInternational = tag.classList.contains('international');
                window.toast.info('工具推荐', `${toolName} - ${isInternational ? '国际工具' : '国内工具'}`, 3000);
            });
        });
    }

    renderQuickWins() {
        const grid = document.getElementById('quickwinsGrid');
        if (!grid) return;

        grid.innerHTML = quickWins.map((qw, i) => `
            <div class="glass-card quickwin-card fade-in delay-${i + 1}" data-index="${i}">
                <div class="quickwin-number">${i + 1}</div>
                <div class="quickwin-header">
                    <div class="quickwin-icon">${qw.icon}</div>
                    <div>
                        <div class="quickwin-title">${this.escapeHtml(qw.title)}</div>
                        <div class="quickwin-timeline">⏱️ ${this.escapeHtml(qw.timeline)}</div>
                    </div>
                </div>
                <div class="quickwin-desc">${this.escapeHtml(qw.desc)}</div>
                <div class="quickwin-kpi">
                    ${qw.kpis.map(k => `
                        <div class="kpi-item">
                            <div class="kpi-value">${this.escapeHtml(k.value)}</div>
                            <div class="kpi-label">${this.escapeHtml(k.label)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    createParticles() {
        const container = document.querySelector('.particles');
        if (!container) return;

        const colors = ['#a855f7', '#ec4899', '#06b6d4', '#10b981'];

        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.animationDelay = `${Math.random() * 15}s`;
            particle.style.animationDuration = `${15 + Math.random() * 10}s`;
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            particle.style.width = `${2 + Math.random() * 4}px`;
            particle.style.height = particle.style.width;
            container.appendChild(particle);
        }
    }

    initSidebar() {
        const sidebar = document.getElementById('diagnosticSidebar');
        const toggle = document.getElementById('sidebarToggle');
        const close = document.getElementById('sidebarClose');
        const body = document.getElementById('sidebarBody');
        if (!sidebar || !toggle || !close || !body) return;

        toggle.addEventListener('click', () => this.openSidebar(sidebar, toggle));
        close.addEventListener('click', () => this.closeSidebar(sidebar, toggle));

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebar.classList.contains('open')) {
                this.closeSidebar(sidebar, toggle);
            }
        });
    }

    openSidebar(sidebar, toggle) {
        sidebar.classList.add('open');
        toggle.style.opacity = '0';
        toggle.style.pointerEvents = 'none';
    }

    closeSidebar(sidebar, toggle) {
        sidebar.classList.remove('open');
        toggle.style.opacity = '1';
        toggle.style.pointerEvents = 'auto';
    }

    renderSidebarContent() {
        const body = document.getElementById('sidebarBody');
        const d = this.getEvaluation().summary;
        if (!body) return;
        let html = '';

        html += '<div class="sidebar-section">';
        html += '<div class="sidebar-section-title">📍 当前位置</div>';
        html += `
            <div class="sidebar-position-card is-current">
                <div class="sidebar-position-header">
                    <div class="sidebar-position-label" style="color: ${d.currentPosition.color}">${d.currentPosition.label}</div>
                    <div class="sidebar-position-subtitle">${d.currentPosition.subtitle}</div>
                </div>
                <div class="sidebar-score-bar">
                    <div class="sidebar-score-fill is-red" style="width: ${Math.min(d.currentPosition.score, 100)}%"></div>
                </div>
                <div class="sidebar-position-desc">${d.currentPosition.description}</div>
            </div>
        `;
        html += '</div>';

        html += '<div class="sidebar-section">';
        html += '<div class="sidebar-section-title">🎯 改进目标</div>';
        html += `
            <div class="sidebar-position-card ${d.overall.targetReached ? 'is-target' : 'is-target-locked'}">
                <div class="sidebar-position-header">
                    <div class="sidebar-position-label" style="color: ${d.targetPosition.color}">${d.targetPosition.label}</div>
                    <div class="sidebar-position-subtitle">${d.targetPosition.subtitle}</div>
                </div>
                <div class="sidebar-score-bar">
                    <div class="sidebar-score-fill ${d.overall.targetReached ? 'is-green' : 'is-amber'}" style="width: ${Math.min(d.targetPosition.score, 100)}%"></div>
                </div>
                <div class="sidebar-gap-badge">⚠️ ${d.targetPosition.gap}</div>
            </div>
        `;
        html += '</div>';

        html += '<div class="sidebar-section">';
        html += '<div class="sidebar-section-title">🔴 关键断层（同一引擎输出）</div>';
        if (!d.keyGaps.length) {
            html += '<div class="sidebar-empty">当前口径下暂无关键断层；缺数项仍会按N/A或蓝图展示，不自动达标。</div>';
        }
        d.keyGaps.forEach(gap => {
            html += `
                <div class="sidebar-gap-card is-critical" data-gap-id="${gap.id}">
                    <div class="sidebar-gap-header">
                        <span class="sidebar-gap-icon">${gap.icon}</span>
                        <span class="sidebar-gap-title">${gap.title}</span>
                        <span class="sidebar-gap-severity is-critical">严重</span>
                    </div>
                    <div class="sidebar-gap-metric">
                        <span class="sidebar-gap-metric-value">${gap.metric}</span>
                        <span class="sidebar-gap-metric-label">${gap.metricLabel}</span>
                    </div>
                    <div class="sidebar-gap-desc">${gap.description}</div>
                </div>
            `;
        });
        html += '</div>';

        body.innerHTML = html;
        this.bindSidebarGapCards(body);
    }

    bindSidebarGapCards(body) {
        const sidebar = document.getElementById('diagnosticSidebar');
        const toggle = document.getElementById('sidebarToggle');
        body.querySelectorAll('.sidebar-gap-card').forEach(card => {
            card.addEventListener('click', () => {
                this.closeSidebar(sidebar, toggle);
                const target = document.querySelector('.matrix-section');
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    target.style.boxShadow = '0 0 40px rgba(239, 68, 68, 0.45)';
                    setTimeout(() => { target.style.boxShadow = ''; }, 2000);
                }
            });
        });
    }

    renderAll() {
        this.renderStats();
        this.renderRulesPanel();
        this.renderMatrix();
        this.renderQuickWins();
        this.renderSidebarContent();
    }

    init() {
        this.createParticles();
        this.startTypewriter();
        this.renderAll();
        this.initSidebar();

        setTimeout(() => {
            window.toast.success(
                '欢迎使用诊断驾驶舱',
                '最近一次口径已自动载入，历史结论不会被刷新改写',
                5000
            );
        }, 800);
    }
}

window.componentRenderer = new ComponentRenderer();
