/* ========================================
   UI 组件渲染（结论全部来自 Diagnosis 引擎）
   ======================================== */

class ComponentRenderer {
    constructor() {
        this.typewriterText = '按统一诊断口径评估会员体系成熟度，分阶段测算与标杆差距，识别关键断层并保留历次口径结论...';
        this.charIndex = 0;
    }

    // 打字机效果
    startTypewriter() {
        const el = document.getElementById('typewriter');
        if (!el) return;

        const type = () => {
            if (this.charIndex < this.typewriterText.length) {
                el.textContent = this.typewriterText.substring(0, this.charIndex + 1);
                this.charIndex++;
                setTimeout(type, 45);
            }
        };
        type();
    }

    // 渲染统计卡片（数值由引擎派生，不再硬编码）
    renderStats() {
        const container = document.getElementById('statsGrid');
        if (!container) return;
        const r = window.Diagnosis.get();

        const stats = [
            { icon: '🎯', value: '拉新', label: '2026 核心战略', trend: null },
            {
                icon: '⚠️',
                value: `阶段${r.overall.currentPhaseIndex}`,
                label: `当前成熟度定位 · ${r.overall.levelMeta.label} ${r.overall.levelMeta.name}`,
                trend: `均分 ${r.overall.avgScore}`
            },
            {
                icon: '🚀',
                value: '阶段2',
                label: `目标成熟度 · 标杆均分 ${r.overall.targetBenchScore}`,
                trend: `+${r.overall.spanLevels}级跨越`
            },
            {
                icon: '🔥',
                value: `${r.overall.criticalCount}个`,
                label: '关键断层待解决',
                trend: r.overall.criticalCount > 0 ? null : '当前口径下无关键断层',
                down: r.overall.criticalCount === 0
            }
        ];

        container.innerHTML = stats.map((stat, index) => `
            <div class="glass-card stat-card fade-in delay-${index + 1}" data-index="${index}">
                <span class="stat-icon">${stat.icon}</span>
                <div class="stat-value">${stat.value}</div>
                <div class="stat-label">${stat.label}</div>
                ${stat.trend ? `<div class="stat-trend ${stat.down ? 'down' : ''}">${stat.trend}</div>` : ''}
            </div>
        `).join('');

        container.querySelectorAll('.stat-card').forEach(card => {
            card.addEventListener('click', () => {
                const index = Number(card.dataset.index);
                if (index === 3) {
                    const names = r.lists.critical.map(x => x.name).join('、');
                    window.toast.info('关键断层', names || '当前口径下无关键断层');
                } else {
                    window.toast.info(stats[index].label, `当前值: ${stats[index].value}`);
                }
            });
        });
    }

    // 渲染矩阵表格
    renderMatrix() {
        const table = document.getElementById('matrixTable');
        if (!table) return;
        const r = window.Diagnosis.get();
        const B = window.Diagnosis.BANDS;

        let html = '<thead><tr><th>运营维度</th>';

        matrixData.phases.forEach(p => {
            html += `
                <th>
                    <div style="font-weight: 700;">${p.name}</div>
                    <div style="font-size: 12px; color: var(--neon-cyan); margin-top: 6px; opacity: 0.9;">
                        焦点: ${p.subtitle}
                    </div>
                </th>
            `;
        });
        html += '</tr></thead><tbody>';

        r.dims.forEach((dim, dimIndex) => {
            html += `<tr class="fade-in delay-${Math.min(dimIndex + 1, 5)}">`;
            html += `
                <td class="dimension-cell">
                    <span class="dimension-icon">${dim.icon}</span>
                    ${dim.name}
                    <div class="dim-maturity">
                        <span class="lvl-badge lvl-${dim.level}">${dim.levelMeta.label} ${dim.levelMeta.name}</span>
                        <span class="dim-score">${dim.score} 分</span>
                    </div>
                </td>
            `;

            matrixData.phases.forEach(phase => {
                const cellEval = dim.cells[phase.key];
                const cellContent = matrixData.cells[dim.key][phase.key];
                const band = B[cellEval.band];

                // 状态类名：目标格允许同时呈现绿色目标框架与红色断层结论
                const classes = ['band-cell-wrap'];
                if (cellEval.isTarget) classes.push('cell-target');
                if (cellEval.band === 'critical') classes.push('is-critical');
                else if (cellEval.band === 'significant') classes.push('is-significant');
                else if (cellEval.band === 'watch') classes.push('is-watch');
                else if (cellEval.band === 'met') classes.push('is-met');
                else classes.push('is-unscored');
                if (cellEval.dataStatus === 'missing' || cellEval.dataStatus === 'partial') classes.push('has-data-note');

                // 顶部标签
                let tag = '';
                if (cellEval.crossed) {
                    tag = '<span class="status-tag tag-crossed">✅ 已跨越</span>';
                } else if (cellEval.band === 'unscored') {
                    tag = '<span class="status-tag tag-unscored">⚪ 未参评（超出本期目标）</span>';
                } else {
                    const positionChips = [];
                    // L0=身处阶段1但未入档，当前位置标在阶段1；L1+ 标在实际入档阶段
                    const isCurrentCell = (dim.level === 0 && phase.index === 1)
                        || dim.effectivePhase === phase.index;
                    if (isCurrentCell) {
                        positionChips.push(dim.level === 0
                            ? '<span class="status-tag tag-current">📍 当前位置（未入档）</span>'
                            : '<span class="status-tag tag-current">📍 当前位置</span>');
                    }
                    if (cellEval.isTarget) {
                        positionChips.push('<span class="status-tag tag-target">🎯 改进目标</span>');
                    }
                    tag = positionChips.join('');
                }

                // 分档 chip（达标/关注/显著差距/关键断层/未参评）
                let bandChip = '';
                if (cellEval.band !== 'unscored') {
                    bandChip = `
                        <span class="band-chip is-${cellEval.band}">${band.label} · 差距 ${cellEval.gap}</span>
                    `;
                } else {
                    bandChip = `<span class="band-chip is-unscored">未参评 · 标杆 ${cellEval.benchmark}</span>`;
                }

                // 数据状态说明（显式写明按哪一档处理）
                let dataNoteHtml = '';
                if (cellEval.dataStatus === 'missing' && cellEval.band !== 'unscored') {
                    dataNoteHtml = `
                        <div class="cell-data-note is-missing">
                            ⛔ 数据缺失，按「${r.settings.missingPolicy === 'conservative' ? '从严' : '从宽'}」口径归入「${band.label}」档
                            <div class="cell-data-note-sub">${cellContent.dataNote || ''}</div>
                        </div>`;
                } else if (cellEval.dataStatus === 'partial') {
                    dataNoteHtml = `
                        <div class="cell-data-note is-partial">
                            🟡 数据不完整，${cellEval.band === 'watch' ? '由「达标」降为「关注」档' : '断层档不升级'}
                            <div class="cell-data-note-sub">${cellContent.dataNote || ''}</div>
                        </div>`;
                } else if (cellEval.band === 'unscored') {
                    dataNoteHtml = `
                        <div class="cell-data-note is-unscored-note">
                            ⚪ 暂无评估数据，本期不参与判定；以下规划内容保留可读
                            <div class="cell-data-note-sub">${cellContent.dataNote || ''}</div>
                        </div>`;
                }

                html += `<td><div class="${classes.join(' ')}" title="${cellEval.note.replace(/"/g, '&quot;')}">
                    <div class="cell-content">
                        <div class="cell-tag-row">${tag}</div>
                        ${bandChip}
                        ${dataNoteHtml}
                        <div class="sop-list">`;

                cellContent.sop.forEach(s => {
                    html += `<div class="sop-item ${cellEval.band === 'unscored' ? 'is-muted' : ''}">${s}</div>`;
                });
                html += '</div>';

                if (cellContent.tools && (cellContent.tools.international.length || cellContent.tools.domestic.length)) {
                    html += '<div class="tools-section"><div class="tools-label">🔧 推荐工具</div>';
                    cellContent.tools.international.forEach(t => {
                        html += `<span class="tool-tag international ${cellEval.band === 'unscored' ? 'is-muted' : ''}" data-tool="${t}">${t}</span>`;
                    });
                    cellContent.tools.domestic.forEach(t => {
                        html += `<span class="tool-tag domestic ${cellEval.band === 'unscored' ? 'is-muted' : ''}" data-tool="${t}">${t}</span>`;
                    });
                    html += '</div>';
                }
                html += '</div></div></td>';
            });
            html += '</tr>';
        });

        html += '</tbody>';
        table.innerHTML = html;

        table.querySelectorAll('.tool-tag').forEach(tagEl => {
            tagEl.addEventListener('click', () => {
                const toolName = tagEl.dataset.tool;
                const isInternational = tagEl.classList.contains('international');
                window.toast.info(
                    '工具推荐',
                    `${toolName} - ${isInternational ? '国际工具' : '国内工具'}`,
                    3000
                );
            });
        });
    }

    // 渲染速赢行动清单
    renderQuickWins() {
        const grid = document.getElementById('quickwinsGrid');
        if (!grid) return;

        grid.innerHTML = quickWins.map((qw, i) => `
            <div class="glass-card quickwin-card fade-in delay-${i + 1}" data-index="${i}">
                <div class="quickwin-number">${i + 1}</div>
                <div class="quickwin-header">
                    <div class="quickwin-icon">${qw.icon}</div>
                    <div>
                        <div class="quickwin-title">${qw.title}</div>
                        <div class="quickwin-timeline">⏱️ ${qw.timeline}</div>
                    </div>
                </div>
                <div class="quickwin-desc">${qw.desc}</div>
                <div class="quickwin-kpi">
                    ${qw.kpis.map(k => `
                        <div class="kpi-item">
                            <div class="kpi-value">${k.value}</div>
                            <div class="kpi-label">${k.label}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        grid.querySelectorAll('.quickwin-card').forEach(card => {
            card.addEventListener('click', () => {
                const index = card.dataset.index;
                const qw = quickWins[index];
                window.toast.success(
                    qw.title,
                    `执行周期: ${qw.timeline}`,
                    4000
                );
            });
        });
    }

    // 创建粒子效果
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

        toggle.addEventListener('click', () => {
            sidebar.classList.add('open');
            toggle.style.opacity = '0';
            toggle.style.pointerEvents = 'none';
        });

        close.addEventListener('click', () => {
            sidebar.classList.remove('open');
            toggle.style.opacity = '1';
            toggle.style.pointerEvents = 'auto';
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                toggle.style.opacity = '1';
                toggle.style.pointerEvents = 'auto';
            }
        });

        this.renderSidebarContent(body);

        body.querySelectorAll('.sidebar-gap-card').forEach((card) => {
            card.addEventListener('click', () => {
                sidebar.classList.remove('open');
                toggle.style.opacity = '1';
                toggle.style.pointerEvents = 'auto';
                const target = document.querySelector('.matrix-section');
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    target.style.transition = 'box-shadow 0.5s ease';
                    target.style.boxShadow = '0 0 40px rgba(239, 68, 68, 0.5)';
                    setTimeout(() => { target.style.boxShadow = ''; }, 2000);
                }
            });
        });
    }

    renderSidebarContent(container) {
        const r = window.Diagnosis.get();
        const B = window.Diagnosis.BANDS;
        let html = '';

        html += '<div class="sidebar-section">';
        html += '<div class="sidebar-section-title">📍 当前位置</div>';
        html += `
            <div class="sidebar-position-card is-current">
                <div class="sidebar-position-header">
                    <div class="sidebar-position-label" style="color: #ef4444">
                        阶段${r.overall.currentPhaseIndex}：沉睡通讯录
                    </div>
                    <div class="sidebar-position-subtitle">
                        ${r.overall.levelMeta.label} · ${r.overall.levelMeta.name}
                    </div>
                </div>
                <div class="sidebar-score-bar">
                    <div class="sidebar-score-fill is-red" style="width: ${r.overall.avgScore}%"></div>
                </div>
                <div class="sidebar-position-desc">
                    六大维度均分 ${r.overall.avgScore} 分，均未越过阶段1入档线（${window.Diagnosis.getCriteria().maturity.lines[0]} 分），整体处于沉睡通讯录阶段。
                </div>
            </div>
        `;
        html += '</div>';

        html += '<div class="sidebar-section">';
        html += '<div class="sidebar-section-title">🎯 改进目标</div>';
        html += `
            <div class="sidebar-position-card is-target">
                <div class="sidebar-position-header">
                    <div class="sidebar-position-label" style="color: #10b981">
                        阶段2：社交连接体
                    </div>
                    <div class="sidebar-position-subtitle">活跃与复购</div>
                </div>
                <div class="sidebar-score-bar">
                    <div class="sidebar-score-fill is-green" style="width: ${r.overall.targetBenchScore}%"></div>
                </div>
                <div class="sidebar-position-desc">
                    阶段2标杆均分 ${r.overall.targetBenchScore} 分（雷达图另列阶段3行业标杆 ${r.overall.phase3BenchScore} 分）。
                </div>
                <div class="sidebar-gap-badge">⚠️ +${r.overall.spanLevels}级跨越</div>
            </div>
        `;
        html += '</div>';

        html += '<div class="sidebar-section">';
        html += '<div class="sidebar-section-title">🔴 关键断层（引擎判定）</div>';
        if (r.criticalGaps.length === 0) {
            html += `
                <div class="sidebar-empty">
                    当前口径（${r.settings.criteriaVersion} · 缺数据${r.settings.missingPolicy === 'conservative' ? '从严' : '从宽'}）下无关键断层。
                    历史口径结论见顶部「历史结论」，不因口径切换而改写。
                </div>`;
        } else {
            r.criticalGaps.forEach(gap => {
                html += `
                    <div class="sidebar-gap-card is-critical" data-gap-id="${gap.dimKey}">
                        <div class="sidebar-gap-header">
                            <span class="sidebar-gap-icon">${gap.icon}</span>
                            <span class="sidebar-gap-title">${gap.title}</span>
                            <span class="sidebar-gap-severity is-critical">关键断层</span>
                        </div>
                        <div class="sidebar-gap-metric">
                            <span class="sidebar-gap-metric-value">${gap.metric}</span>
                            <span class="sidebar-gap-metric-label">${gap.metricLabel}</span>
                        </div>
                        <div class="sidebar-gap-desc">${gap.description}</div>
                    </div>
                `;
            });
        }
        html += '</div>';

        // 显著差距 / 关注 / 达标 全量列出，与矩阵、雷达保持同源
        html += '<div class="sidebar-section">';
        html += '<div class="sidebar-section-title">📊 目标阶段分档总览</div>';
        r.dims.forEach(d => {
            const cell = d.cells[TARGET_PHASE_KEY];
            html += `
                <div class="sidebar-band-row" title="${cell.note.replace(/"/g, '&quot;')}">
                    <span class="sidebar-band-name">${d.icon} ${d.name}</span>
                    <span class="band-chip is-${cell.band}">${B[cell.band].label}</span>
                    <span class="sidebar-band-gap">${cell.gap}</span>
                </div>`;
        });
        html += '</div>';

        html += `
            <div class="sidebar-section">
                <div class="sidebar-caliber-hint">
                    判定口径：${r.settings.criteriaVersion} ${r.settings.criteriaName} · 缺数据${r.settings.missingPolicy === 'conservative' ? '从严' : '从宽'}
                </div>
            </div>
        `;

        container.innerHTML = html;

        requestAnimationFrame(() => {
            container.querySelectorAll('.sidebar-score-fill').forEach(el => {
                const w = el.style.width;
                el.style.width = '0%';
                requestAnimationFrame(() => { el.style.width = w; });
            });
        });
    }

    // 顶部口径状态条
    renderCaliberBar() {
        const el = document.getElementById('caliberStatus');
        if (!el) return;
        const r = window.Diagnosis.get();
        el.innerHTML = `
            <span class="caliber-dot"></span>
            当前口径：<strong>${r.settings.criteriaVersion} ${r.settings.criteriaName}</strong>
            · 缺数据${r.settings.missingPolicy === 'conservative' ? '从严' : '从宽'}
            · 关键断层 <strong>${r.overall.criticalCount}</strong> 个
        `;
    }

    // 页脚结论时间与口径
    renderFooter() {
        const el = document.getElementById('footerMeta');
        if (!el) return;
        const r = window.Diagnosis.get();
        const t = new Date(r.generatedAt);
        const pad = n => String(n).padStart(2, '0');
        const str = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}`;
        el.textContent = `结论生成: ${str} | 口径: ${r.settings.criteriaVersion} · 缺数据${r.settings.missingPolicy === 'conservative' ? '从严' : '从宽'}`;
    }

    // 漏斗图证据说明（与断层判定同源）
    renderFunnelEvidence() {
        const el = document.getElementById('funnelEvidence');
        if (!el) return;
        const r = window.Diagnosis.get();
        const acquisition = r.dims.find(d => d.key === 'acquisition');
        if (acquisition && acquisition.isCritical) {
            const cell = acquisition.cells[TARGET_PHASE_KEY];
            el.className = 'chart-evidence is-critical';
            el.innerHTML = `🔴 引擎佐证：全域获客差距 <strong>${cell.gap} 分</strong>（${cell.score} vs 标杆 ${cell.benchmark}），判为关键断层，对应漏斗曝光→入会→首购 100%→20%→8%`;
        } else {
            el.className = 'chart-evidence';
            el.innerHTML = `ℹ️ 漏斗为原始观测数据；断层以阶段标杆差距阈值为准（当前口径下全域获客为「${window.Diagnosis.BANDS[acquisition.targetBand].label}」）`;
        }
    }

    // 口径切换后的差异提示条（与初始基线对比）
    renderDeltaBanner() {
        const el = document.getElementById('deltaBanner');
        if (!el) return;
        const baseline = window.Diagnosis.baseline();
        if (!baseline) { el.hidden = true; return; }

        const sameSettings = baseline.result.settings.criteriaId === window.Diagnosis.settings.criteriaId
            && baseline.result.settings.missingPolicy === window.Diagnosis.settings.missingPolicy;
        if (sameSettings) { el.hidden = true; return; }

        const diff = window.Diagnosis.diff(baseline.result);
        const changed = diff.filter(d => d.changed);
        const B = window.Diagnosis.BANDS;
        el.hidden = false;
        el.innerHTML = `
            <span class="delta-banner-label">↕️ 口径已调整（相对初始基线）：</span>
            ${changed.length ? changed.map(d =>
                `${d.name} <span class="is-${d.fromBand}">${B[d.fromBand].label}</span> → <span class="is-${d.toBand}">${B[d.toBand].label}</span>`
            ).join('；') : '各维度档位无变化'}
            <button class="delta-banner-close" aria-label="关闭">✕</button>
        `;
        const closeBtn = el.querySelector('.delta-banner-close');
        if (closeBtn) closeBtn.addEventListener('click', () => { el.hidden = true; });
    }

    // 按引擎结果整体重绘
    renderAll() {
        const result = window.Diagnosis.get();
        this.renderStats();
        this.renderMatrix();
        this.renderQuickWins();
        const sb = document.getElementById('sidebarBody');
        if (sb) this.renderSidebarContent(sb);
        this.renderCaliberBar();
        this.renderFooter();
        this.renderFunnelEvidence();
        this.renderDeltaBanner();
        if (!result.consistency.allPassed) {
            console.warn('[Renderer] 一致性自检未通过', result.consistency.checks.filter(c => !c.ok));
        }
    }

    // 初始化所有组件
    init() {
        this.createParticles();
        this.startTypewriter();
        this.renderAll();
        this.initSidebar();

        window.DiagnosisPanel.init();

        setTimeout(() => {
            window.toast.success(
                '欢迎使用诊断驾驶舱',
                '所有结论由统一判定引擎计算，点击顶部「判定口径」可切换阈值规则',
                5000
            );
        }, 1000);
    }
}

// 创建全局实例
window.componentRenderer = new ComponentRenderer();
