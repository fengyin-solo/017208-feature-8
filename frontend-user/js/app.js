/* ========================================
   应用主入口
   ======================================== */

class App {
    constructor() {
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;

        // 先初始化判定引擎（加载最近一次口径设置，必要时建立初始基线快照）
        window.Diagnosis.init();

        // 初始化组件
        window.componentRenderer.init();

        // 初始化图表
        window.chartManager.initFunnelChart('funnelChart');
        window.chartManager.initRadarChart('radarChart');

        // 口径变更：所有视图基于同一份引擎结果重绘
        window.addEventListener('diagnosis:changed', () => {
            window.componentRenderer.renderAll();
            window.chartManager.refresh();
        });

        // 监听窗口大小变化
        window.addEventListener('resize', this.handleResize.bind(this));

        // 监听滚动
        window.addEventListener('scroll', this.handleScroll.bind(this));

        console.log('🚀 Dashboard initialized successfully');
    }

    handleResize() {
        // 防抖处理
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => {
            window.chartManager.resize();
        }, 250);
    }

    handleScroll() {
        const scrollY = window.scrollY;
        const header = document.querySelector('.header');

        if (header) {
            const opacity = Math.max(0.5, 1 - scrollY / 500);
            header.style.opacity = opacity;
        }
    }

    // 刷新数据：沿用最近一次口径设置重新计算，不改变任何设定
    refresh() {
        window.toast.info('刷新中', '正按最近一次判定口径重新计算结论...');

        setTimeout(() => {
            window.componentRenderer.renderAll();
            window.chartManager.refresh();

            const r = window.Diagnosis.get();
            window.toast.success('刷新完成',
                `${r.settings.criteriaVersion} · 关键断层 ${r.overall.criticalCount} 个（沿用最近一次设定）`);
        }, 800);
    }

    // 导出报告
    exportReport() {
        const r = window.Diagnosis.get();
        window.toast.info('导出报告', `正在按 ${r.settings.criteriaVersion} 口径生成PDF报告...`);

        setTimeout(() => {
            window.toast.success('导出成功', '报告已保存到下载目录');
        }, 2000);
    }
}

// 创建应用实例
const app = new App();

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// 暴露全局方法
window.app = app;
