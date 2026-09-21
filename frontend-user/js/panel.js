/* ========================================
   诊断口径面板
   - 口径切换（严格版 / 宽松版 × 缺失数据处理策略）
   - 判定规则说明（阈值、分级、断层、缺数据处理，全部从引擎配置渲染）
   - 历史结论归档（只读快照，切换口径不回写旧结论）
   ======================================== */

class DiagnosisPanel {
    constructor() {
        this.activeTab = 'settings';
        this.el = null;
    }

    init() {
        this.build();
        this.bindGlobal();
    }

    build() {
        const el = document.createElement('div');
        el.className = 'diag-modal';
        el.id = 'diagModal';
        el.innerHTML = `
            <div class="diag-modal-mask"></div>
            <div class="diag-modal-dialog glass-card">
                <div class="diag-modal-header">
                    <h3><span>🧭</span> 诊断口径与历史结论</h3>
                    <button class="diag-modal-close" aria-label="关闭">✕</button>
                </div>
                <div class="diag-tabs">
                    <button class="diag-tab is-active" data-tab="settings">口径设置</button>
                    <button class="diag-tab" data-tab="rules">判定规则</button>
                    <button class="diag-tab" data-tab="history">历史结论</button>
                </div>
                <div class="diag-modal-body">
                    <div class="diag-tabpane" data-pane="settings"></div>
                    <div class="diag-tabpane" data-pane="rules" hidden></div>
                    <div class="diag-tabpane" data-pane="history" hidden></div>
                </div>
            </div>
        `;
        document.body.appendChild(el);
        this.el = el;

        el.querySelector('.diag-modal-mask').addEventListener('click', () => this.close());
        el.querySelector('.diag-modal-close').addEventListener('click', () => this.close());
        el.querySelectorAll('.diag-tab').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
        });
    }

    bindGlobal() {
        const btn = document.getElementById('caliberBtn');
        if (btn) btn.addEventListener('click', () => this.open('settings'));
        const rulesBtn = document.getElementById('rulesBtn');
        if (rulesBtn) rulesBtn.addEventListener('click', () => this.open('rules'));
        const historyBtn = document.getElementById('historyBtn');
        if (historyBtn) historyBtn.addEventListener('click', () => this.open('history'));
    }

    open(tab) {
        this.switchTab(tab || 'settings');
        this.el.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.el.classList.remove('open');
        document.body.style.overflow = '';
    }

    switchTab(tab) {
        this.activeTab = tab;
        this.el.querySelectorAll('.diag-tab').forEach(b => {
            b.classList.toggle('is-active', b.dataset.tab === tab);
        });
        this.el.querySelectorAll('.diag-tabpane').forEach(p => {
            p.hidden = p.dataset.pane !== tab;
        });
        if (tab === 'settings') this.renderSettings();
        if (tab === 'rules') this.renderRules();
        if (tab === 'history') this.renderHistory();
    }

    /* ---------- 口径设置 ---------- */

    renderSettings() {
        const pane = this.el.querySelector('[data-pane="settings"]');
        const s = window.Diagnosis.settings;

        const criteriaCards = Object.values(window.Diagnosis.CRITERIA).map(c => `
            <label class="caliber-option ${s.criteriaId === c.id ? 'is-active' : ''}">
                <input type="radio" name="criteriaId" value="${c.id}" ${s.criteriaId === c.id ? 'checked' : ''}>
                <div class="caliber-option-main">
                    <div class="caliber-option-title">
                        ${c.name} <span class="caliber-version">${c.version}</span>
                        ${c.id === DEFAULT_SETTINGS.criteriaId ? '<span class="caliber-default-tag">默认</span>' : ''}
                    </div>
                    <div class="caliber-option-desc">${c.desc}</div>
                </div>
            </label>
        `).join('');

        const policyCards = Object.values(window.Diagnosis.MISSING_POLICIES).map(p => `
            <label class="caliber-option ${s.missingPolicy === p.id ? 'is-active' : ''}">
                <input type="radio" name="missingPolicy" value="${p.id}" ${s.missingPolicy === p.id ? 'checked' : ''}>
                <div class="caliber-option-main">
                    <div class="caliber-option-title">
                        缺数据${p.name === '从严处理' ? '从严' : '从宽'} · 归入「${window.Diagnosis.BANDS[p.band].label}」
                    </div>
                    <div class="caliber-option-desc">${p.desc}；矩阵/雷达/侧栏统一按此档展示</div>
                </div>
            </label>
        `).join('');

        pane.innerHTML = `
            <div class="caliber-group-label">判定口径版本（阈值集合）</div>
            <div class="caliber-options">${criteriaCards}</div>
            <div class="caliber-group-label" style="margin-top:20px;">判定范围内缺数据时的处理档</div>
            <div class="caliber-options">${policyCards}</div>
            <div class="caliber-note">
                ⚠️ 设置将保存在本地，刷新页面或再次进入时沿用最近一次选择；
                每次应用都会把<strong>应用前的当前结论</strong>归档到「历史结论」，旧快照不会因口径切换而被改写。
            </div>
            <div class="caliber-actions">
                <button class="btn btn-secondary" id="resetCaliberBtn">恢复默认口径</button>
                <button class="btn btn-primary" id="applyCaliberBtn">应用并归档</button>
            </div>
        `;

        pane.querySelectorAll('.caliber-option input').forEach(input => {
            input.addEventListener('change', () => {
                pane.querySelectorAll('.caliber-option').forEach(o => o.classList.remove('is-active'));
                input.closest('.caliber-option').classList.add('is-active');
            });
        });

        pane.querySelector('#applyCaliberBtn').addEventListener('click', () => {
            const criteriaId = pane.querySelector('input[name="criteriaId"]:checked').value;
            const missingPolicy = pane.querySelector('input[name="missingPolicy"]:checked').value;
            window.Diagnosis.applySettings({ criteriaId, missingPolicy });
            window.toast.success('口径已应用',
                `${window.Diagnosis.CRITERIA[criteriaId].version} · ${window.Diagnosis.MISSING_POLICIES[missingPolicy].name}，结论已重新计算并归档`,
                4000);
            this.close();
        });

        pane.querySelector('#resetCaliberBtn').addEventListener('click', () => {
            window.Diagnosis.resetToDefault();
            window.toast.info('已恢复默认口径', '2026 严格版 + 缺数据从严，结论已归档');
            this.close();
        });
    }

    /* ---------- 判定规则 ---------- */

    renderRules() {
        const pane = this.el.querySelector('[data-pane="rules"]');
        const s = window.Diagnosis.settings;
        const current = window.Diagnosis.CRITERIA[s.criteriaId];
        const result = window.Diagnosis.get();

        const threshRows = PHASES.map(p => {
            const t = current.gapThresholds[p.key];
            const name = p.name.replace(/^阶段\d+:\s*/, '');
            return `
                <tr>
                    <td><strong>阶段${p.index}</strong> ${name}</td>
                    <td class="band-cell is-met">差距 ≤ ${t.met}</td>
                    <td class="band-cell is-watch">${t.met + 1} ~ ${t.significant - 1}</td>
                    <td class="band-cell is-significant">${t.significant} ~ ${t.critical - 1}</td>
                    <td class="band-cell is-critical">≥ ${t.critical}</td>
                </tr>
            `;
        }).join('');

        const benchmarkRows = result.dims.map(d => `
            <tr>
                <td>${d.icon} ${d.name}</td>
                <td>${d.score}</td>
                <td>${d.cells.phase1.benchmark}</td>
                <td>${d.cells.phase2.benchmark}</td>
                <td>${d.cells.phase3.benchmark}</td>
            </tr>
        `).join('');

        const checkRows = result.consistency.checks.map(c => `
            <div class="check-item ${c.ok ? 'is-ok' : 'is-fail'}">
                <span class="check-icon">${c.ok ? '✓' : '✕'}</span>
                <div>
                    <div class="check-label">${c.label}</div>
                    <div class="check-detail">${c.detail}</div>
                </div>
            </div>
        `).join('');

        const otherCriteria = Object.values(window.Diagnosis.CRITERIA)
            .filter(c => c.id !== current.id);
        const otherTable = otherCriteria.map(c => {
            const t1 = c.gapThresholds.phase1, t2 = c.gapThresholds.phase2, t3 = c.gapThresholds.phase3;
            return `
                <div class="rules-other-version">
                    <strong>${c.name} ${c.version}</strong>（未启用）：
                    阶段1 断层线 ≥${t1.critical} / 阶段2 ≥${t2.critical} / 阶段3 ≥${t3.critical}；
                    入档线 L1≥${c.maturity.lines[0]} L2≥${c.maturity.lines[1]} L3≥${c.maturity.lines[2]}
                </div>`;
        }).join('');

        pane.innerHTML = `
            <div class="rules-block">
                <div class="rules-block-title">① 成熟度分级（当前口径：${current.name} ${current.version}）</div>
                <p class="rules-text">
                    以维度综合得分对照入档分数线：
                    <span class="lvl-badge lvl-0">L0 未入档 &lt;${current.maturity.lines[0]}</span>
                    <span class="lvl-badge lvl-1">L1 阶段1在建 ${current.maturity.lines[0]}~${current.maturity.lines[1] - 1}</span>
                    <span class="lvl-badge lvl-2">L2 阶段2达标 ${current.maturity.lines[1]}~${current.maturity.lines[2] - 1}</span>
                    <span class="lvl-badge lvl-3">L3 阶段3标杆 ≥${current.maturity.lines[2]}</span>
                </p>
            </div>

            <div class="rules-block">
                <div class="rules-block-title">② 现状 vs 标杆差距阈值（按阶段分别给出）</div>
                <p class="rules-text">差距 = 该阶段标杆分 − 现状得分；同一维度不同阶段使用对应阶段的分数线：</p>
                <table class="rules-table">
                    <thead><tr>
                        <th>阶段</th>
                        <th class="is-met">达标</th>
                        <th>关注</th>
                        <th>显著差距</th>
                        <th>关键断层</th>
                    </tr></thead>
                    <tbody>${threshRows}</tbody>
                </table>
            </div>

            <div class="rules-block">
                <div class="rules-block-title">③ 关键断层判定标准（满足任一）</div>
                <ul class="rules-list">
                    <li><strong>阈值触发：</strong>维度在<strong>目标阶段（阶段2）</strong>的差距达到该阶段关键断层线（当前口径 ≥ ${current.gapThresholds.phase2.critical} 分）；</li>
                    <li><strong>缺数据触发：</strong>判定范围内（阶段1~2）该阶段评估数据缺失，且缺失策略为「从严处理」时，按关键断层处理；「从宽处理」时按关注处理，<em>两种策略下均不允许判为达标</em>；</li>
                    <li><strong>部分数据不触发升级：</strong>仅个别指标缺失时，断层档不升级；若原计算档为达标，则降为关注档。</li>
                </ul>
                <p class="rules-text">范围外（阶段3）无数据 → 标记「未参评」，<strong>既不判断层也不判达标</strong>，画像内容（SOP/工具）继续保留可读。</p>
            </div>

            <div class="rules-block">
                <div class="rules-block-title">④ 各阶段标杆分与现状得分</div>
                <table class="rules-table">
                    <thead><tr><th>维度</th><th>现状得分</th><th>阶段1标杆</th><th>阶段2标杆</th><th>阶段3标杆</th></tr></thead>
                    <tbody>${benchmarkRows}</tbody>
                </table>
            </div>

            <div class="rules-block">
                <div class="rules-block-title">⑤ 一致性自检（同一批数据在各处必须得到同一结论）</div>
                ${checkRows}
            </div>

            <div class="rules-block">
                <div class="rules-block-title">⑥ 其他口径版本</div>
                ${otherTable}
            </div>
        `;
    }

    /* ---------- 历史结论（只读） ---------- */

    renderHistory() {
        const pane = this.el.querySelector('[data-pane="history"]');
        const list = window.Diagnosis.history();
        const current = window.Diagnosis.get();

        if (!list.length) {
            pane.innerHTML = '<div class="history-empty">暂无历史结论</div>';
            return;
        }

        pane.innerHTML = list.map((snap, idx) => {
            const d = snap.result;
            const isCurrent = d.generatedAt === current.generatedAt && d.settings.criteriaId === current.settings.criteriaId;
            const time = new Date(snap.createdAt);
            const timeStr = `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')} ${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;

            const dimRows = d.dims.map(dim => {
                const cell = dim.cells[TARGET_PHASE_KEY];
                const band = window.Diagnosis.BANDS[cell.band];
                return `
                    <div class="history-dim-row">
                        <span class="history-dim-name">${dim.icon} ${dim.name}</span>
                        <span class="lvl-badge lvl-${dim.level}">${dim.levelMeta.label}</span>
                        <span class="band-chip is-${cell.band}">${band.label}</span>
                        <span class="history-gap">差距 ${typeof cell.gap === 'number' ? cell.gap : '—'}</span>
                    </div>`;
            }).join('');

            return `
                <details class="history-snapshot ${snap.isBaseline ? 'is-baseline' : ''}" ${idx === 0 ? 'open' : ''}>
                    <summary>
                        <span class="history-snapshot-title">
                            ${snap.isBaseline ? '🏁 初始基线' : '📌 口径快照'}
                            <span class="history-snapshot-version">${d.settings.criteriaVersion} · 缺数据${d.settings.missingPolicy === 'conservative' ? '从严' : '从宽'}</span>
                        </span>
                        <span class="history-snapshot-meta">
                            ${timeStr} · 断层 ${d.overall.criticalCount} 个 · 均分 ${d.overall.avgScore}
                            ${isCurrent ? '<span class="history-current-tag">当前查看</span>' : ''}
                        </span>
                    </summary>
                    <div class="history-snapshot-body">
                        <div class="history-note">只读归档：该结论按归档时的口径冻结，后续切换口径不会改写本条内容。</div>
                        ${dimRows}
                    </div>
                </details>
            `;
        }).join('');
    }
}

window.DiagnosisPanel = new DiagnosisPanel();
