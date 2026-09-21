/* ========================================
   图表组件（数据全部来自 Diagnosis 引擎结果）
   ======================================== */

class ChartManager {
    constructor() {
        this.charts = {};
    }

    // 初始化漏斗图
    initFunnelChart(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const chart = echarts.init(container);
        this.charts.funnel = chart;

        const option = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                formatter: '{b}: {c}%',
                backgroundColor: 'rgba(20, 20, 35, 0.95)',
                borderColor: 'rgba(168, 85, 247, 0.3)',
                borderWidth: 1,
                textStyle: { color: '#f8fafc' },
                extraCssText: 'backdrop-filter: blur(10px); border-radius: 8px;'
            },
            series: [{
                type: 'funnel',
                left: '10%',
                right: '10%',
                top: '8%',
                bottom: '8%',
                width: '80%',
                min: 0,
                max: 100,
                minSize: '0%',
                maxSize: '100%',
                sort: 'descending',
                gap: 3,
                label: {
                    show: true,
                    position: 'inside',
                    formatter: '{b}\n{c}%',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                },
                labelLine: { show: false },
                itemStyle: {
                    borderColor: 'rgba(168, 85, 247, 0.5)',
                    borderWidth: 2,
                    shadowBlur: 20,
                    shadowColor: 'rgba(168, 85, 247, 0.3)'
                },
                emphasis: {
                    label: { fontSize: 15 },
                    itemStyle: {
                        shadowBlur: 30,
                        shadowColor: 'rgba(168, 85, 247, 0.5)'
                    }
                },
                data: funnelData.map(item => ({
                    value: item.value,
                    name: item.name,
                    itemStyle: { color: item.color }
                }))
            }]
        };

        chart.setOption(option);

        chart.on('click', (params) => {
            window.toast.info('漏斗分析', `${params.name}: 转化率 ${params.value}%`);
        });

        return chart;
    }

    // 初始化雷达图：现状（引擎）/ 阶段2目标标杆 / 阶段3行业标杆，三者同源
    initRadarChart(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const chart = echarts.init(container);
        this.charts.radar = chart;

        const result = window.Diagnosis.get();
        const dims = result.dims;

        const indicators = dims.map(d => ({ name: d.name, max: 100 }));

        const seriesData = [
            {
                value: dims.map(d => d.score),
                name: '佳贝艾特现状',
                symbol: 'circle',
                symbolSize: 8,
                lineStyle: { color: '#ef4444', width: 2, shadowBlur: 10, shadowColor: '#ef4444' },
                areaStyle: { color: 'rgba(239, 68, 68, 0.25)' },
                itemStyle: { color: '#ef4444', borderColor: '#fff', borderWidth: 2 }
            },
            {
                value: dims.map(d => d.cells.phase2.benchmark),
                name: '阶段2 目标标杆',
                symbol: 'diamond',
                symbolSize: 7,
                lineStyle: { color: '#eab308', width: 2, type: 'dashed' },
                areaStyle: { color: 'rgba(234, 179, 8, 0.06)' },
                itemStyle: { color: '#eab308' }
            },
            {
                value: dims.map(d => d.cells.phase3.benchmark),
                name: '阶段3 行业标杆',
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: { color: '#10b981', width: 2, shadowBlur: 10, shadowColor: '#10b981' },
                areaStyle: { color: 'rgba(16, 185, 129, 0.15)' },
                itemStyle: { color: '#10b981', borderColor: '#fff', borderWidth: 2 }
            }
        ];

        const option = {
            backgroundColor: 'transparent',
            legend: {
                data: seriesData.map(s => s.name),
                bottom: 0,
                textStyle: { color: '#94a3b8', fontSize: 12 },
                itemWidth: 16,
                itemHeight: 10,
                itemGap: 16
            },
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(20, 20, 35, 0.95)',
                borderColor: 'rgba(168, 85, 247, 0.3)',
                borderWidth: 1,
                textStyle: { color: '#f8fafc' },
                extraCssText: 'backdrop-filter: blur(10px); border-radius: 8px; max-width: 320px;'
            },
            radar: {
                indicator: indicators,
                shape: 'polygon',
                splitNumber: 4,
                center: ['50%', '48%'],
                radius: '62%',
                axisName: {
                    color: '#94a3b8',
                    fontSize: 12,
                    fontWeight: 500
                },
                splitLine: {
                    lineStyle: {
                        color: 'rgba(168, 85, 247, 0.15)',
                        width: 1
                    }
                },
                splitArea: {
                    areaStyle: {
                        color: ['rgba(168, 85, 247, 0.02)', 'rgba(168, 85, 247, 0.06)']
                    }
                },
                axisLine: {
                    lineStyle: {
                        color: 'rgba(168, 85, 247, 0.2)'
                    }
                }
            },
            series: [{ type: 'radar', data: seriesData }]
        };

        chart.setOption(option);

        // 点击维度名称时展示与矩阵/侧栏完全一致的判定档
        chart.on('click', (params) => {
            const name = params.name;
            const dim = dims.find(d => d.name === name);
            if (dim) {
                const cell = dim.cells[TARGET_PHASE_KEY];
                const band = window.Diagnosis.BANDS[cell.band];
                window.toast.info(
                    `${dim.icon} ${dim.name} · ${band.label}`,
                    `现状 ${dim.score} 分 vs 阶段2标杆 ${cell.benchmark} 分（差距 ${cell.gap} 分）`,
                    3500
                );
            }
        });

        return chart;
    }

    // 按引擎最新结果重绘图表
    refresh() {
        Object.values(this.charts).forEach(chart => chart && chart.dispose && chart.dispose());
        this.charts = {};
        this.initFunnelChart('funnelChart');
        this.initRadarChart('radarChart');
    }

    // 响应式调整
    resize() {
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.resize) {
                chart.resize();
            }
        });
    }

    // 销毁图表
    dispose() {
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.dispose) {
                chart.dispose();
            }
        });
        this.charts = {};
    }
}

// 创建全局实例
window.chartManager = new ChartManager();
