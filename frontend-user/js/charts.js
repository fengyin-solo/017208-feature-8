/* ========================================
   图表组件
   ======================================== */

class ChartManager {
    constructor() {
        this.charts = {};
    }

    initFunnelChart(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const chart = echarts.init(container);
        this.charts.funnel = chart;
        this.setFunnelOption(chart);

        chart.on('click', (params) => {
            window.toast.info('漏斗分析', `${params.name}: ${params.value}%`);
        });

        return chart;
    }

    setFunnelOption(chart) {
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

        chart.setOption(option, true);
    }

    initRadarChart(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const chart = echarts.init(container);
        this.charts.radar = chart;
        this.setRadarOption(chart);

        chart.on('click', (params) => {
            if (params.name) {
                window.toast.info('能力对比', `${params.seriesName}: ${params.name}`);
            }
        });

        return chart;
    }

    getRadarSeries() {
        const evaluation = window.diagnosticEngine.evaluation;
        const keys = matrixData.dimensions.map(dim => dim.key);
        const current = keys.map(key => evaluation.dimensions[key].phases.phase1.actual);
        const phase1Line = keys.map(key => evaluation.dimensions[key].phases.phase1.benchmark);
        const phase2Target = keys.map(key => evaluation.dimensions[key].phases.phase2.benchmark);

        return [
            {
                name: '佳贝艾特阶段1现状',
                value: current,
                color: '#ef4444',
                areaColor: 'rgba(239, 68, 68, 0.28)'
            },
            {
                name: '阶段1达标标杆',
                value: phase1Line,
                color: '#f59e0b',
                areaColor: 'rgba(245, 158, 11, 0.08)'
            },
            {
                name: '阶段2目标标杆',
                value: phase2Target,
                color: '#10b981',
                areaColor: 'rgba(16, 185, 129, 0.12)'
            }
        ];
    }

    setRadarOption(chart) {
        const indicators = matrixData.dimensions.map(dim => ({ name: dim.name, max: 100 }));
        const series = this.getRadarSeries();

        const option = {
            backgroundColor: 'transparent',
            legend: {
                data: series.map(s => s.name),
                bottom: 0,
                textStyle: { color: '#94a3b8', fontSize: 11 },
                itemWidth: 14,
                itemHeight: 9,
                itemGap: 12
            },
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(20, 20, 35, 0.95)',
                borderColor: 'rgba(168, 85, 247, 0.3)',
                borderWidth: 1,
                textStyle: { color: '#f8fafc' },
                extraCssText: 'backdrop-filter: blur(10px); border-radius: 8px;'
            },
            radar: {
                indicator: indicators,
                shape: 'polygon',
                splitNumber: 4,
                center: ['50%', '47%'],
                radius: '62%',
                axisName: {
                    color: '#cbd5e1',
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
            series: [{
                type: 'radar',
                data: series.map(s => ({
                    value: s.value,
                    name: s.name,
                    symbol: 'circle',
                    symbolSize: 7,
                    lineStyle: {
                        color: s.color,
                        width: 2,
                        shadowBlur: 10,
                        shadowColor: s.color
                    },
                    areaStyle: { color: s.areaColor },
                    itemStyle: {
                        color: s.color,
                        borderColor: '#fff',
                        borderWidth: 2
                    }
                }))
            }]
        };

        chart.setOption(option, true);
    }

    updateCharts() {
        if (this.charts.funnel) this.setFunnelOption(this.charts.funnel);
        if (this.charts.radar) this.setRadarOption(this.charts.radar);
        this.resize();
    }

    resize() {
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.resize) {
                chart.resize();
            }
        });
    }

    dispose() {
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.dispose) {
                chart.dispose();
            }
        });
        this.charts = {};
    }
}

window.chartManager = new ChartManager();
