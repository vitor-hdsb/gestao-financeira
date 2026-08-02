/**
 * NEXUS FINANCE | CHART.JS INTEGRATION (charts.js) - V3 PRO 360°
 * Renderização e atualização dos gráficos analíticos do painel executivo.
 * V3: Gráfico Comparativo de Previsibilidade Mês a Mês (Sem vs Com Nova Parcela).
 */

import { calcEngine } from '../calculations.js';

let chartBalancoInst = null;
let chartCategoriasInst = null;
let chartFaturasInst = null;
let chartInvestimentosInst = null;
let chartSimuladorInst = null;
let chartPrevisibilidadeInst = null;

Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = "'Plus Jakarta Sans', 'Inter', sans-serif";
Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';

export const chartRenderer = {
    /**
     * Gráfico 1: Balanço Mensal (Entradas Realizadas vs Gastos Totais)
     */
    renderBalanco(despesas, cartoes, receitas, mesAtual) {
        const ctx = document.getElementById('chartBalanco');
        if (!ctx) return;

        const mesesLista = calcEngine.getMesesLista(mesAtual);
        const labels = mesesLista.map(m => calcEngine.formatMesNome(m));

        const dataGanhos = mesesLista.map(mes => {
            const resRec = calcEngine.filtrarReceitas(receitas || [], mes, 'ALL');
            return parseFloat(resRec.totalReceitas.toFixed(2));
        });

        const dataGastos = mesesLista.map(mes => {
            const result = calcEngine.filtrarDespesas(despesas, mes, 'ALL', 'ALL');
            return parseFloat(result.totalGeral.toFixed(2));
        });

        if (chartBalancoInst) chartBalancoInst.destroy();

        chartBalancoInst = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Entradas & Salários (R$)',
                        data: dataGanhos,
                        backgroundColor: '#10b981',
                        borderRadius: 6,
                        barPercentage: 0.7
                    },
                    {
                        label: 'Saídas Gerais & Faturas (R$)',
                        data: dataGastos,
                        backgroundColor: '#f43f5e',
                        borderRadius: 6,
                        barPercentage: 0.7
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'top', align: 'end' },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: R$ ${ctx.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (val) => `R$ ${val / 1000}k`
                        }
                    }
                }
            }
        });
    },

    /**
     * Gráfico 2: Gastos por Categoria (Rosca / Doughnut)
     */
    renderCategorias(despesas, mesAtual) {
        const ctx = document.getElementById('chartCategorias');
        if (!ctx) return;

        const catData = calcEngine.calcGastosPorCategoria(despesas, mesAtual);

        const colors = [
            '#06b6d4', '#8b5cf6', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#64748b'
        ];

        if (chartCategoriasInst) chartCategoriasInst.destroy();

        chartCategoriasInst = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: catData.labels.length > 0 ? catData.labels : ['Sem Gastos'],
                datasets: [{
                    data: catData.data.length > 0 ? catData.data : [1],
                    backgroundColor: catData.labels.length > 0 ? colors : ['rgba(255,255,255,0.1)'],
                    borderWidth: 2,
                    borderColor: '#0f172a'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: { display: true, position: 'bottom', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                if (catData.labels.length === 0) return 'Sem dados';
                                const val = ctx.parsed;
                                const pct = ((val / catData.total) * 100).toFixed(1);
                                return `${ctx.label}: R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * Gráfico 3: Projeção de Faturas de Cartão e Contas (Próximos 12 Meses)
     */
    renderFaturas(despesas, cartoes, mesAtual) {
        const ctx = document.getElementById('chartFaturas');
        if (!ctx) return;

        const proj = calcEngine.calcProjecaoFaturas(despesas, cartoes, mesAtual);

        if (chartFaturasInst) chartFaturasInst.destroy();

        chartFaturasInst = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: proj.labels,
                datasets: proj.datasets.length > 0 ? proj.datasets : [{
                    label: 'Sem compras parceladas ou faturas',
                    data: proj.labels.map(() => 0),
                    backgroundColor: '#64748b'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: {
                            callback: (val) => `R$ ${val / 1000}k`
                        }
                    }
                },
                plugins: {
                    legend: { display: true, position: 'top', align: 'end' },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: R$ ${ctx.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        }
                    }
                }
            }
        });
    },

    /**
     * Gráfico 4: Evolução do Patrimônio e Simulador (Área de Crescimento em 5 Anos)
     */
    renderInvestimentos(investimentos, config) {
        const ctxDashboard = document.getElementById('chartInvestimentos');
        const ctxSimulador = document.getElementById('chartSimulador');

        const invCalc = calcEngine.calcInvestimentos(investimentos, config);
        const chartData = invCalc.chartData;

        const chartConfig = {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Patrimônio Projetado (R$)',
                    data: chartData.data,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.15)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#8b5cf6',
                    pointBorderColor: '#fff',
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `Patrimônio: R$ ${ctx.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: (val) => `R$ ${val / 1000}k`
                        }
                    }
                }
            }
        };

        if (ctxDashboard) {
            if (chartInvestimentosInst) chartInvestimentosInst.destroy();
            chartInvestimentosInst = new Chart(ctxDashboard, chartConfig);
        }

        if (ctxSimulador) {
            if (chartSimuladorInst) chartSimuladorInst.destroy();
            chartSimuladorInst = new Chart(ctxSimulador, JSON.parse(JSON.stringify(chartConfig)));
        }
    },

    /**
     * Gráfico 5 (NOVO V3): Previsibilidade Mês a Mês (Sem Simulação vs Com Simulação)
     */
    renderPrevisibilidade(projChartData) {
        const ctx = document.getElementById('chartPrevisibilidade');
        if (!ctx || !projChartData) return;

        if (chartPrevisibilidadeInst) chartPrevisibilidadeInst.destroy();

        chartPrevisibilidadeInst = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: projChartData.labels,
                datasets: [
                    {
                        label: 'Sobra Líquida Esperada (Sem o Novo Compromisso)',
                        data: projChartData.baseData,
                        backgroundColor: '#10b981',
                        borderRadius: 6,
                        barPercentage: 0.65
                    },
                    {
                        label: 'Sobra Líquida COM a Simulação',
                        data: projChartData.simData,
                        backgroundColor: '#8b5cf6',
                        borderRadius: 6,
                        barPercentage: 0.65
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'top', align: 'end' },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: R$ ${ctx.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (val) => `R$ ${val / 1000}k`
                        }
                    }
                }
            }
        });
    },

    updateAllCharts(stateData) {
        this.renderBalanco(stateData.despesas, stateData.cartoes, stateData.receitas, stateData.config.mesAtual);
        this.renderCategorias(stateData.despesas, stateData.config.mesAtual);
        this.renderFaturas(stateData.despesas, stateData.cartoes, stateData.config.mesAtual);
        this.renderInvestimentos(stateData.investimentos, stateData.config);
    }
};
