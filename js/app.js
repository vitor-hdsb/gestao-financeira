/**
 * NEXUS FINANCE | MAIN APPLICATION ORCHESTRATOR (app.js) - V3 PRO 360°
 * Controlador central que interliga Estado, Cálculos, Interface, Eventos, Modais
 * e o novo Módulo Executivo de Previsibilidade Futura & Simulação Orçamentária.
 */

import { state } from './state.js';
import { calcEngine } from './calculations.js';
import { tableRenderer } from './components/tables.js';
import { chartRenderer } from './components/charts.js';
import { importCsv } from './importCsv.js';

class NexusApp {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.populateMonthSelector();
        this.populateModalSelects();
        window.__currentRateio = { 'meu': 100 };
        
        this.updateDashboard(state.data);

        state.subscribe((data) => {
            this.updateDashboard(data);
            this.populateModalSelects();
        });

        if (window.lucide) window.lucide.createIcons();
    }

    setupEventListeners() {
        // Navegação de Abas
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.getAttribute('data-tab');
                this.switchTab(targetTab);
            });
        });

        // Seletor Global de Mês
        const monthSelect = document.getElementById('global-month-select');
        if (monthSelect) {
            monthSelect.addEventListener('change', (e) => {
                state.updateConfig('mesAtual', e.target.value);
            });
        }

        // Botão Demonstração
        const btnDemo = document.getElementById('btn-demo-data');
        if (btnDemo) {
            btnDemo.addEventListener('click', () => {
                if (confirm('Deseja carregar o cenário financeiro completo de demonstração? Isso substituirá os dados atuais.')) {
                    state.loadDemoData();
                    this.switchTab('dashboard');
                }
            });
        }

        // Backup e Relatórios
        document.getElementById('export-json')?.addEventListener('click', (e) => { e.preventDefault(); state.exportJSON(); });
        document.getElementById('export-csv')?.addEventListener('click', (e) => { e.preventDefault(); state.exportCSV(); });
        document.getElementById('reset-data')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Atenção: Tem certeza que deseja limpar TODOS os dados do sistema?')) {
                state.resetAllData();
            }
        });

        // Importação JSON
        const fileInput = document.getElementById('file-import-input');
        document.getElementById('import-json')?.addEventListener('click', (e) => { e.preventDefault(); fileInput?.click(); });
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (state.importJSON(event.target.result)) alert('Backup importado com sucesso!');
                    else alert('Erro ao importar arquivo. Verifique o formato JSON.');
                };
                reader.readAsText(file);
            });
        }

        // CSV Import UI Event Listeners
        const csvFileInput = document.getElementById('file-import-csv');
        // Modal Import CSV
        document.getElementById('import-csv')?.addEventListener('click', (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('file-import-csv');
            if (fileInput) fileInput.value = ''; // Reset to allow same file selection
            const previewDiv = document.getElementById('csv-preview');
            if (previewDiv) previewDiv.textContent = 'Carregue um arquivo para visualizar...';
            this.openModal('modal-import-csv');
        });
        if (csvFileInput) {
            csvFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                const previewDiv = document.getElementById('csv-preview');
                if (!file) {
                    previewDiv.textContent = 'Nenhum arquivo selecionado.';
                    return;
                }
                
                let logs = "Iniciando leitura de: " + file.name + "\\n";
                previewDiv.textContent = logs;
                
                try {
                    logs += "Chamando importCsv()\\n";
                    previewDiv.textContent = logs;
                    
                    const transactions = await importCsv(file, {});
                    
                    logs += "importCsv() retornou " + transactions.length + " transações.\\n";
                    previewDiv.textContent = logs;
                    
                    const previewRows = transactions.slice(0,5).map(t => `${t.date} | ${t.description} | R$ ${t.rawAmount}`).join('\\n');
                    previewDiv.textContent = logs + "\\n--- PRÉVIA ---\\n" + (previewRows || 'Nenhuma transação extraída.');
                    window.__parsedCsvTransactions = transactions;
                } catch (error) {
                    console.error("Erro na importação:", error);
                    previewDiv.textContent = logs + "\\nERRO FATAL: " + (error.message || error);
                }
            });
        }
        // Confirm CSV import
        document.getElementById('csv-confirm-btn')?.addEventListener('click', async () => {
            const typeSelect = document.getElementById('csv-type-select');
            const periodInput = document.getElementById('csv-period-input');
            const contaSelect = document.getElementById('csv-conta-select');
            const accountOrigin = typeSelect?.value || 'corrente';
            const period = periodInput?.value;
            const accountId = contaSelect?.value;
            const transactions = window.__parsedCsvTransactions || [];
            
            const enriched = transactions.map((t, idx) => {
                let type = 'debito'; // despesa
                
                if (accountOrigin === 'cartao') {
                    // Para Cartão de Crédito, valores positivos no CSV = Gastos (debito), negativos = Estornos (credito)
                    type = t.rawAmount >= 0 ? 'debito' : 'credito';
                } else {
                    // Para Conta Corrente, valores negativos = Gastos (debito), positivos = Ganhos (credito)
                    type = t.rawAmount < 0 ? 'debito' : 'credito';
                }

                return {
                    ...t,
                    idx,
                    amount: Math.abs(t.rawAmount),
                    type,
                    period,
                    accountId,
                    natureza: type === 'debito' ? 'Variável' : null,
                    dono: 'meu'
                };
            });
            
            window.__tempEnrichedCsv = enriched;
            this.closeModal('modal-import-csv');
            this.openModal('modal-import-review');
            this.renderImportReviewTable();
        });


        document.getElementById('btn-save-rateio')?.addEventListener('click', () => {
            this.saveRateioFromModal();
        });

        document.getElementById('btn-add-pessoa-rateio')?.addEventListener('click', () => {
            const input = document.getElementById('new-pessoa-rateio-input');
            const nome = input?.value.trim();
            if (nome) {
                // Salvar inputs atuais ANTES de acionar a recarga do estado
                const tempRateio = {};
                const pessoas = ['meu', ...state.getPessoas(state.data.config.mesAtual)];
                pessoas.forEach(p => {
                    const el = document.getElementById(`rateio-input-${p}`);
                    if (el) tempRateio[p] = parseFloat(el.value) || 0;
                });
                
                state.addPessoa(state.data.config.mesAtual, nome);
                input.value = '';
                
                window.__tempRateioInputs = tempRateio;
                window.__tempRateioTargetIdx = this.rateioTargetIdx;
                
                // Forçar o re-render do modal logo após o state notify
                setTimeout(() => {
                    this.openRateioModal('TEMP_REFRESH');
                }, 10);
            }
        });
        document.querySelector('[onclick="app.openModal(\'modal-compra\')"]')?.addEventListener('click', () => {
            window.__currentRateio = { 'meu': 100 };
            this.updateRateioBadge('modal-compra-rateio-badge', window.__currentRateio);
        });

        document.getElementById('btn-add-pessoa')?.addEventListener('click', () => {
            const input = document.getElementById('new-pessoa-input');
            const nome = input?.value.trim();
            if (nome) {
                state.addPessoa(state.data.config.mesAtual, nome);
                input.value = '';
                this.renderImportReviewTable();
                this.populateModalSelects();
            }
        });

        document.getElementById('btn-confirm-review')?.addEventListener('click', () => {
            const enriched = window.__tempEnrichedCsv || [];
            
            state.addTransactionsFromImport(enriched);
            this.closeModal('modal-import-review');
            this.updateDespesasTableOnly();
            this.updateReceitasTableOnly();
            if (window.chartRenderer) window.chartRenderer.updateAllCharts(state.data);
        });

        // Filtros da Aba de Despesas
        document.getElementById('filter-search')?.addEventListener('input', () => this.updateDespesasTableOnly());
        document.getElementById('filter-cartao')?.addEventListener('change', () => this.updateDespesasTableOnly());
        document.getElementById('filter-categoria')?.addEventListener('change', () => this.updateDespesasTableOnly());
        document.getElementById('filter-natureza')?.addEventListener('change', () => this.updateDespesasTableOnly());

        // Filtro da Aba de Receitas
        document.getElementById('filter-receita-conta')?.addEventListener('change', () => this.updateReceitasTableOnly());

        // Simulador de Investimentos
        const simTaxa = document.getElementById('sim-taxa');
        const simTaxaTipo = document.getElementById('sim-taxa-tipo');
        const simAporte = document.getElementById('sim-aporte');

        const handleSimChange = () => {
            let taxa = parseFloat(simTaxa.value) || 0;
            if (simTaxaTipo.value === 'aa') taxa = (Math.pow(1 + (taxa / 100), 1 / 12) - 1) * 100;
            state.updateConfig('simTaxa', taxa);
            state.updateConfig('simTaxaTipo', simTaxaTipo.value);
            state.updateConfig('simAporte', parseFloat(simAporte.value) || 0);
        };

        simTaxa?.addEventListener('input', handleSimChange);
        simTaxaTipo?.addEventListener('change', handleSimChange);
        simAporte?.addEventListener('input', handleSimChange);

        // Parâmetros de Dias Úteis VA/VR
        document.getElementById('config-dias-uteis')?.addEventListener('change', (e) => state.updateBeneficiosConfig({ diasUteis: parseInt(e.target.value) || 22 }));
        document.getElementById('config-dias-passados')?.addEventListener('change', (e) => state.updateBeneficiosConfig({ diasPassados: parseInt(e.target.value) || 0 }));

        // ======================================================================
        // EVENTOS DO SIMULADOR DE PREVISIBILIDADE FUTURA (V3 PRO)
        // ======================================================================
        const prevInputs = ['sim-prev-desc', 'sim-prev-valor', 'sim-prev-meses', 'sim-prev-tipo', 'sim-prev-var'];
        prevInputs.forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.updatePrevisibilidade());
            document.getElementById(id)?.addEventListener('change', () => this.updatePrevisibilidade());
        });


        // Botão de Efetivar Simulação em Nova Compra Real
        document.getElementById('btn-efetivar-sim')?.addEventListener('click', () => {
            const desc = document.getElementById('sim-prev-desc')?.value || 'Nova Compra Simulada';
            const valor = parseFloat(document.getElementById('sim-prev-valor')?.value) || 0;
            const meses = parseInt(document.getElementById('sim-prev-meses')?.value) || 1;
            const tipo = document.getElementById('sim-prev-tipo')?.value || 'despesa';

            if (tipo === 'receita') {
                this.openModal('modal-receita');
                setTimeout(() => {
                    document.getElementById('modal-rec-desc').value = desc;
                    document.getElementById('modal-rec-valor').value = (valor * meses).toFixed(2);
                }, 100);
            } else {
                this.openModal('modal-compra');
                setTimeout(() => {
                    document.getElementById('modal-compra-desc').value = desc;
                    document.getElementById('modal-compra-valor').value = (valor * meses).toFixed(2);
                    if (meses > 1) {
                        document.getElementById('modal-compra-tipo').value = 'Parcelado';
                        document.getElementById('modal-compra-parcelas').value = meses;
                        this.toggleParcelasModal();
                    } else {
                        document.getElementById('modal-compra-tipo').value = 'A vista';
                        this.toggleParcelasModal();
                    }
                }, 100);
            }
        });
    }

    renderImportReviewTable() {
        const tbody = document.getElementById('tbody-import-review');
        if (!tbody) return;
        const items = window.__tempEnrichedCsv || [];
        
        tbody.innerHTML = items.map(item => {
            if (!item.rateio) item.rateio = { 'meu': 100 };
            const disabled = item.type === 'credito' ? 'disabled' : '';
            
            const parts = [];
            for (const d in item.rateio) {
                const name = d === 'meu' ? 'Meu' : d;
                parts.push(`${item.rateio[d]}% ${name}`);
            }
            const rateioStr = parts.join(' | ');

            return `
                <tr>
                    <td>${item.date}</td>
                    <td>${item.description}</td>
                    <td class="${item.type === 'credito' ? 'text-success' : 'rose-text'}">
                        ${item.type === 'credito' ? '+' : '-'} R$ ${item.amount.toFixed(2).replace('.', ',')}
                    </td>
                    <td>
                        <div style="display:flex; flex-direction:column; gap:5px;">
                            <button type="button" class="btn btn-outline btn-sm" onclick="app.openRateioModal(${item.idx})" ${disabled}><i data-lucide="percent"></i> Configurar</button>
                            <span id="csv-rateio-badge-${item.idx}" class="badge badge-info" style="font-size: 11px;">${rateioStr}</span>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.getAttribute('data-tab') === tabId) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        document.querySelectorAll('.tab-pane').forEach(pane => {
            if (pane.id === `tab-${tabId}`) pane.classList.add('active');
            else pane.classList.remove('active');
        });

        setTimeout(() => {
            chartRenderer.updateAllCharts(state.data);
            if (tabId === 'previsibilidade') this.updatePrevisibilidade();
        }, 50);
    }

    populateMonthSelector() {
        const monthSelect = document.getElementById('global-month-select');
        if (!monthSelect) return;
        const curMonth = state.data.config.mesAtual;
        const lista = calcEngine.getMesesLista(curMonth);
        monthSelect.innerHTML = lista.map(m => {
            const nome = calcEngine.formatMesNome(m);
            const sel = m === curMonth ? 'selected' : '';
            return `<option value="${m}" ${sel}>${nome}</option>`;
        }).join('');
    }

    populateModalSelects() {
        const selCompra = document.getElementById('modal-compra-cartao');
        const selFilter = document.getElementById('filter-cartao');
        let optsCompra = '<optgroup label="Contas Correntes & Carteiras">';
        state.data.contas.forEach(c => optsCompra += `<option value="${c.id}">🏛️ ${c.banco} - ${c.nome}</option>`);
        optsCompra += '</optgroup><optgroup label="Cartões de Crédito">';
        state.data.cartoes.forEach(c => optsCompra += `<option value="${c.id}">💳 ${c.nome}</option>`);
        optsCompra += '</optgroup>';

        if (selCompra) selCompra.innerHTML = optsCompra;
        if (selFilter) {
            const curVal = selFilter.value;
            selFilter.innerHTML = `<option value="ALL">Todos os Cartões/Contas</option>` + optsCompra;
            if (curVal) selFilter.value = curVal;
        }

        const selCsvConta = document.getElementById('csv-conta-select');
        if (selCsvConta) selCsvConta.innerHTML = optsCompra;


        const selRecModal = document.getElementById('modal-rec-conta');
        const selRecFilter = document.getElementById('filter-receita-conta');
        const optsContasOnly = state.data.contas.map(c => `<option value="${c.id}">🏛️ ${c.banco} - ${c.nome}</option>`).join('');

        if (selRecModal) selRecModal.innerHTML = optsContasOnly;
        if (selRecFilter) {
            const curValRec = selRecFilter.value;
            selRecFilter.innerHTML = `<option value="ALL">Todas as Contas / Destinos</option>` + optsContasOnly;
            if (curValRec) selRecFilter.value = curValRec;
        }


    }


    openRateioModal(idxOrId = null) {
        this.rateioTargetIdx = idxOrId;
        let rateioObj = { 'meu': 100 };
        
        if (idxOrId === null) {
            rateioObj = window.__currentRateio || { 'meu': 100 };
        } else if (typeof idxOrId === 'string' && idxOrId.startsWith('desp_')) {
            const desp = state.data.despesas.find(d => d.id === idxOrId);
            if (desp) rateioObj = desp.rateio || (desp.dono ? { [desp.dono]: 100 } : { 'meu': 100 });
        } else if (idxOrId === 'TEMP_REFRESH') {
            rateioObj = window.__tempRateioInputs || { 'meu': 100 };
            this.rateioTargetIdx = window.__tempRateioTargetIdx;
        } else {
            rateioObj = window.__tempEnrichedCsv[idxOrId].rateio || { 'meu': 100 };
        }

        const container = document.getElementById('rateio-container');
        const pessoas = ['meu', ...state.getPessoas(state.data.config.mesAtual)];
        
        // Assegura que todas as pessoas do mês estão no formulário, mesmo com 0%
        let html = '';
        pessoas.forEach(p => {
            const pct = rateioObj[p] || 0;
            const nameLabel = p === 'meu' ? 'Meu (Padrão)' : p;
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size: 1.1rem; font-weight: 500;">${nameLabel}</span>
                    <div style="display:flex; align-items:center; gap:5px;">
                        <input type="number" id="rateio-input-${p}" class="form-input" style="width:90px; text-align:right;" min="0" max="100" value="${pct}">
                        <span>%</span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        this.openModal('modal-rateio');
    }

    saveRateioFromModal() {
        const pessoas = ['meu', ...state.getPessoas(state.data.config.mesAtual)];
        const newRateio = {};
        let total = 0;

        pessoas.forEach(p => {
            const el = document.getElementById(`rateio-input-${p}`);
            if (el) {
                const val = parseFloat(el.value) || 0;
                if (val > 0) {
                    newRateio[p] = val;
                    total += val;
                }
            }
        });

        if (Math.abs(total - 100) > 0.01) {
            alert('A soma das porcentagens deve ser exatamente 100%!');
            return;
        }

        if (this.rateioTargetIdx === null) {
            window.__currentRateio = newRateio;
            this.updateRateioBadge('modal-compra-rateio-badge', newRateio);
        } else if (typeof this.rateioTargetIdx === 'string' && this.rateioTargetIdx.startsWith('desp_')) {
            state.updateCompra(this.rateioTargetIdx, { rateio: newRateio });
            this.updateDespesasTableOnly();
            chartRenderer.updateAllCharts(state.data);
            this.updatePrevisibilidade();
        } else {
            window.__tempEnrichedCsv[this.rateioTargetIdx].rateio = newRateio;
            this.updateRateioBadge(`csv-rateio-badge-${this.rateioTargetIdx}`, newRateio);
        }
        
        this.closeModal('modal-rateio');
    }

    updateRateioBadge(badgeId, rateioObj) {
        const badge = document.getElementById(badgeId);
        if (!badge) return;
        
        const parts = [];
        for (const d in rateioObj) {
            const name = d === 'meu' ? 'Meu' : d;
            parts.push(`${rateioObj[d]}% ${name}`);
        }
        badge.textContent = parts.join(' | ');
    }

    updateDashboard(data) {
        const mesAtual = data.config.mesAtual;
        const monthSelect = document.getElementById('global-month-select');
        if (monthSelect && monthSelect.value !== mesAtual) monthSelect.value = mesAtual;

        const despRes = calcEngine.filtrarDespesas(data.despesas, mesAtual, 'ALL', 'ALL', 'ALL');
        const recRes = calcEngine.filtrarReceitas(data.receitas, mesAtual, 'ALL');
        const contasRes = calcEngine.calcContasSaldos(data.contas, data.receitas, data.despesas, mesAtual);
        const invRes = calcEngine.calcInvestimentos(data.investimentos, data.config);
        const vavrRes = calcEngine.calcVaVr(data.beneficios, data.vavrGastos, mesAtual);
        const fixoVarRes = calcEngine.calcFixoVsVariavel(data.despesas, mesAtual);

        document.getElementById('kpi-ganhos').textContent = tableRenderer.formatCurrency(recRes.totalReceitas);
        document.getElementById('kpi-ganhos-sub').textContent = `${recRes.itens.length} entrada${recRes.itens.length !== 1 ? 's' : ''} no mês`;

        document.getElementById('kpi-gastos').textContent = tableRenderer.formatCurrency(despRes.totalGeral);
        document.getElementById('kpi-gastos-sub').textContent = `Faturas + saídas a vista`;

        const totalSaldosIniciais = data.contas.reduce((sum, c) => sum + (c.saldoInicial || 0), 0);
        const kpiSaldoDisponivel = recRes.totalReceitas - despRes.totalGeral + totalSaldosIniciais;

        document.getElementById('kpi-contas-saldo').textContent = tableRenderer.formatCurrency(kpiSaldoDisponivel);
        document.getElementById('total-contas-saldo-top').textContent = `Saldo líquido em carteira: ${tableRenderer.formatCurrency(contasRes.saldoTotalAcumulado)}`;

        let aReceber = 0;
        let rateiosHtml = '';
        for (const dono in despRes.totalPorDono) {
            if (dono !== 'meu') {
                const val = despRes.totalPorDono[dono];
                aReceber += val;
                if (val > 0) {
                    rateiosHtml += `<div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 5px 12px; border-radius: 8px; font-size: 13px;">
                        <span class="text-secondary">${dono}:</span> <strong class="text-primary">${tableRenderer.formatCurrency(val)}</strong>
                    </div>`;
                }
            }
        }
        const elRateios = document.getElementById('kpi-rateios-terceiros');
        if (elRateios) elRateios.textContent = tableRenderer.formatCurrency(aReceber);
        
        const elRateiosDet = document.getElementById('kpi-rateios-detalhes');
        if (elRateiosDet) elRateiosDet.innerHTML = rateiosHtml;

        document.getElementById('kpi-patrimonio').textContent = tableRenderer.formatCurrency(invRes.totalInvestido);
        document.getElementById('kpi-rendimento-est').textContent = `+ ${tableRenderer.formatCurrency(invRes.rendimentoMensalTotal)} / mês est.`;

        document.getElementById('val-fixo-txt').textContent = tableRenderer.formatCurrency(fixoVarRes.fixo);
        document.getElementById('val-var-txt').textContent = tableRenderer.formatCurrency(fixoVarRes.variavel);
        document.getElementById('pct-fixo-txt').textContent = `${fixoVarRes.pctFixo.toFixed(1)}%`;
        document.getElementById('pct-var-txt').textContent = `${fixoVarRes.pctVariavel.toFixed(1)}%`;

        const barFixo = document.getElementById('bar-fixo');
        const barVar = document.getElementById('bar-variavel');
        if (barFixo && barVar) {
            barFixo.style.width = `${fixoVarRes.pctFixo}%`;
            barVar.style.width = `${fixoVarRes.pctVariavel}%`;
        }

        tableRenderer.renderContasGrid(contasRes.contasDetalhes, 'contas-container');
        this.updateReceitasTableOnly();

        const faturasPorCartao = {};
        data.cartoes.forEach(card => {
            faturasPorCartao[card.id] = calcEngine.filtrarDespesas(data.despesas, mesAtual, card.id, 'ALL', 'ALL');
        });
        tableRenderer.renderCreditCards(data.cartoes, 'cards-container', null, faturasPorCartao);
        
        this.updateDespesasTableOnly();
        tableRenderer.renderInvestimentosTable(data.investimentos, 'tbody-investimentos', 'tfoot-total-investido', 'tfoot-total-rendimento', 'count-investimentos', data.config.simTaxa);
        tableRenderer.renderVaVrTable(vavrRes.vavrGastos, 'tbody-vavr', 'tfoot-total-vavr', 'count-vavr');

        const elSimPatrimonio = document.getElementById('sim-patrimonio-atual');
        if (elSimPatrimonio) elSimPatrimonio.textContent = tableRenderer.formatCurrency(invRes.totalInvestido);
        
        const elSimRend = document.getElementById('sim-rendimento-gerado');
        if (elSimRend) elSimRend.textContent = `${tableRenderer.formatCurrency(invRes.rendimentoMensalTotal)} / mês (${invRes.taxaMediaPonderada.toFixed(2)}% a.m.)`;
        
        const elSimProj = document.getElementById('sim-projecao-12m');
        if (elSimProj) elSimProj.textContent = tableRenderer.formatCurrency(invRes.projecao12m);

        document.getElementById('va-carga').textContent = tableRenderer.formatCurrency(data.beneficios.vaCarga);
        document.getElementById('va-gasto').textContent = tableRenderer.formatCurrency(vavrRes.gastoVA);
        document.getElementById('va-saldo').textContent = tableRenderer.formatCurrency(vavrRes.saldoVA);
        document.getElementById('va-pct').textContent = `${vavrRes.pctVA.toFixed(0)}% utilizado`;
        document.getElementById('va-rec-diario').textContent = `Sugerido: ${tableRenderer.formatCurrency(vavrRes.recDiarioVA)} / dia`;
        document.getElementById('va-progress').style.width = `${vavrRes.pctVA}%`;

        document.getElementById('vr-carga').textContent = tableRenderer.formatCurrency(data.beneficios.vrCarga);
        document.getElementById('vr-gasto').textContent = tableRenderer.formatCurrency(vavrRes.gastoVR);
        document.getElementById('vr-saldo').textContent = tableRenderer.formatCurrency(vavrRes.saldoVR);
        document.getElementById('vr-pct').textContent = `${vavrRes.pctVR.toFixed(0)}% utilizado`;
        document.getElementById('vr-rec-diario').textContent = `Sugerido: ${tableRenderer.formatCurrency(vavrRes.recDiarioVR)} / dia útil`;
        document.getElementById('vr-progress').style.width = `${vavrRes.pctVR}%`;

        chartRenderer.updateAllCharts(data);
        this.updatePrevisibilidade();
    }

    /**
     * MÓDULO EXECUTIVO DE PREVISIBILIDADE & SIMULAÇÃO FUTURA (V3)
     */
    updatePrevisibilidade() {
        const simParams = {
            desc: document.getElementById('sim-prev-desc')?.value || 'Nova Compra',
            valor: parseFloat(document.getElementById('sim-prev-valor')?.value) || 200,
            meses: parseInt(document.getElementById('sim-prev-meses')?.value) || 6,
            tipo: document.getElementById('sim-prev-tipo')?.value || 'despesa',
            estVariavel: parseFloat(document.getElementById('sim-prev-var')?.value) || 2500
        };

        const prev = calcEngine.calcPrevisibilidade(state.data, simParams);

        // Atualizar Banner Semáforo
        const banner = document.getElementById('prev-status-banner');
        if (banner) {
            banner.className = `status-banner banner-${prev.semaforo.status.toLowerCase()}`;
            const icon = document.getElementById('prev-banner-icon');
            const title = document.getElementById('prev-banner-title');
            const desc = document.getElementById('prev-banner-desc');
            const badge = document.getElementById('prev-banner-badge');

            if (icon) icon.textContent = prev.semaforo.status === 'SUCCESS' ? '🟢' : (prev.semaforo.status === 'WARNING' ? '🟡' : '🔴');
            if (title) title.textContent = prev.semaforo.titulo;
            if (desc) desc.textContent = prev.semaforo.desc;
            if (badge) badge.textContent = `STATUS: ${prev.semaforo.status === 'SUCCESS' ? 'SAUDÁVEL' : (prev.semaforo.status === 'WARNING' ? 'ATENÇÃO' : 'CRÍTICO')}`;
        }

        // Atualizar Textos de Comparação do Mês Seguinte
        document.getElementById('prev-mes-nome')?.setAttribute('title', `Mês Seguinte: ${prev.nextMonthNome}`);
        const mesNomeEl = document.getElementById('prev-mes-nome');
        if (mesNomeEl) mesNomeEl.textContent = `MÊS QUE VEM (${prev.nextMonthNome})`;

        const recEl = document.getElementById('prev-rec-val');
        if (recEl) recEl.textContent = tableRenderer.formatCurrency(prev.receitaEsperada);

        const gastosEl = document.getElementById('prev-gastos-val');
        if (gastosEl) {
            let res = `${tableRenderer.formatCurrency(prev.totalGastosBase)} (Fixos: ${tableRenderer.formatCurrency(prev.gastosFixos)} + Parcelas: ${tableRenderer.formatCurrency(prev.parcelasAtivas)} + Var: ${tableRenderer.formatCurrency(prev.variavelEstimado)})`;
            
            // Adiciona quebra por dono
            const donosStr = Object.keys(prev.donosResumo || {})
                .filter(d => prev.donosResumo[d] > 0)
                .map(d => `${d === 'meu' ? 'Meu' : d}: ${tableRenderer.formatCurrency(prev.donosResumo[d])}`)
                .join(' | ');
            
            if (donosStr) {
                res += `<div style="font-size:12px; margin-top:5px; padding: 4px 8px; background: rgba(0,0,0,0.2); border-radius:4px; display:inline-block;">Rateio: ${donosStr}</div>`;
            }
            gastosEl.innerHTML = res;
        }

        const sobraBaseEl = document.getElementById('prev-sobra-base');
        if (sobraBaseEl) {
            sobraBaseEl.textContent = tableRenderer.formatCurrency(prev.saldoLivreBase);
            sobraBaseEl.className = prev.saldoLivreBase >= 0 ? 'emerald-text text-xl' : 'rose-text text-xl';
        }

        const sobraSimEl = document.getElementById('prev-sobra-sim');
        if (sobraSimEl) {
            sobraSimEl.textContent = tableRenderer.formatCurrency(prev.saldoLivreSimulado);
            sobraSimEl.className = prev.saldoLivreSimulado >= 0 ? 'violet-text text-2xl font-extrabold' : 'rose-text text-2xl font-extrabold';
        }

        const diffBadge = document.getElementById('prev-diff-badge');
        if (diffBadge) {
            const isPos = prev.diferencaSaldo >= 0;
            diffBadge.textContent = `${isPos ? '+' : '-'} ${tableRenderer.formatCurrency(Math.abs(prev.diferencaSaldo))}`;
            diffBadge.className = `compare-diff ${isPos ? 'diff-pos' : 'diff-neg'}`;
        }

        const descTxt = document.getElementById('prev-desc-txt');
        if (descTxt) {
            const prefix = simParams.tipo === 'despesa' ? 'Com nova parcela/saída de' : 'Com novo ganho de';
            descTxt.textContent = `${prefix} ${tableRenderer.formatCurrency(simParams.valor)} por ${simParams.meses} mes${simParams.meses > 1 ? 'es' : ''}`;
        }

        const pctBaseEl = document.getElementById('prev-pct-base');
        if (pctBaseEl) pctBaseEl.textContent = `${prev.pctComprometidoBase.toFixed(1)}%`;

        const pctSimEl = document.getElementById('prev-pct-sim');
        if (pctSimEl) pctSimEl.textContent = `${prev.pctComprometidoSimulado.toFixed(1)}%`;

        // Renderizar Gráfico Comparativo Mês a Mês
        chartRenderer.renderPrevisibilidade(prev.projecaoChart);
    }

    resetSimuladorPrev() {
        document.getElementById('sim-prev-desc').value = 'Nova Parcela (ex: TV OLED ou Celular)';
        document.getElementById('sim-prev-valor').value = '200.00';
        document.getElementById('sim-prev-meses').value = '6';
        document.getElementById('sim-prev-tipo').value = 'despesa';
        document.getElementById('sim-prev-var').value = '2500.00';
        this.updatePrevisibilidade();
    }


    updateCompraValorMensal(id, mes, value) {
        value = parseFloat(value);
        if (isNaN(value) || value <= 0) return;
        state.updateCompraValorMensal(id, mes, value);
        this.updateDespesasTableOnly();
        chartRenderer.updateAllCharts(state.data);
        this.updatePrevisibilidade();
    }

    updateExpenseField(id, field, value) {
        if (field === 'valorTotal') {
            value = parseFloat(value);
            if (isNaN(value) || value <= 0) return; // Ignore invalid
        }
        state.updateCompra(id, { [field]: value });
        this.updateDespesasTableOnly();
        chartRenderer.updateAllCharts(state.data);
        this.updatePrevisibilidade();
    }

    toggleNatureza(id) {
        const desp = state.data.despesas.find(d => d.id === id);
        if (!desp) return;
        const newNatureza = (desp.natureza === 'Fixo') ? 'Variável' : 'Fixo';
        state.updateCompra(id, { natureza: newNatureza });
        this.updateDespesasTableOnly();
        chartRenderer.updateAllCharts(state.data);
        this.updatePrevisibilidade();
    }


    promptChangeCarga(tipo) {
        const currentCarga = tipo === 'VA' ? state.data.beneficios.vaCarga : state.data.beneficios.vrCarga;
        const newCargaStr = prompt(`Informe o novo valor de Carga mensal para o ${tipo}:`, currentCarga);
        if (newCargaStr !== null) {
            const newCarga = parseFloat(newCargaStr.replace(',', '.'));
            if (!isNaN(newCarga) && newCarga >= 0) {
                if (tipo === 'VA') state.data.beneficios.vaCarga = newCarga;
                if (tipo === 'VR') state.data.beneficios.vrCarga = newCarga;
                state.save();
                this.updateDashboard();
            }
        }
    }

    promptChangeTipo(id, currentTipo) {
        if (currentTipo === 'A vista') {
            const num = prompt("Mudar para Parcelado. Em quantas parcelas?", "2");
            const parcelas = parseInt(num);
            if (parcelas > 1) {
                state.updateCompra(id, { tipo: 'Parcelado', parcelas: parcelas });
                this.updateDespesasTableOnly();
                chartRenderer.updateAllCharts(state.data);
                this.updatePrevisibilidade();
            }
        } else {
            if (confirm("Mudar de Parcelado para A vista? (Isso concentrará o valor total neste único mês)")) {
                state.updateCompra(id, { tipo: 'A vista', parcelas: 1 });
                this.updateDespesasTableOnly();
                chartRenderer.updateAllCharts(state.data);
                this.updatePrevisibilidade();
            }
        }
    }

    updateDespesasTableOnly() {
        const search = document.getElementById('filter-search')?.value.toLowerCase() || '';
        const cartaoId = document.getElementById('filter-cartao')?.value || 'ALL';
        const categoria = document.getElementById('filter-categoria')?.value || 'ALL';
        const natureza = document.getElementById('filter-natureza')?.value || 'ALL';

        let res = calcEngine.filtrarDespesas(state.data.despesas, state.data.config.mesAtual, cartaoId, categoria, natureza);
        
        if (search) {
            res.itens = res.itens.filter(i => i.desc.toLowerCase().includes(search));
            res.totalGeral = res.itens.reduce((sum, i) => sum + i.incidencia.valor, 0);
            res.totalParcelado = res.itens.reduce((sum, i) => sum + (i.tipo === 'Parcelado' && i.parcelas > 1 ? i.incidencia.valor : 0), 0);
        }

        tableRenderer.renderDespesasTable(res, state.data.cartoes, state.data.contas, 'tbody-despesas', 'tfoot-total-compras', 'tfoot-total-parcelas', 'count-despesas', state.data.config.mesAtual);
    }

    updateReceitasTableOnly() {
        const contaId = document.getElementById('filter-receita-conta')?.value || 'ALL';
        const res = calcEngine.filtrarReceitas(state.data.receitas, state.data.config.mesAtual, contaId);
        tableRenderer.renderReceitasTable(res.itens, state.data.contas, 'tbody-receitas', 'tfoot-total-receitas', 'count-receitas');
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            const curDate = new Date().toISOString().slice(0, 10);
            const inputData = modal.querySelector('input[type="date"]');
            if (inputData && !inputData.value) inputData.value = curDate;
        }
    }

    closeModal(modalId) {
        if (modalId === 'modal-conta') { document.getElementById('modal-conta-id').value = ''; document.getElementById('modal-conta-nome').value = ''; document.getElementById('modal-conta-banco').value = ''; document.getElementById('modal-conta-saldo').value = ''; }
        if (modalId === 'modal-cartao') { document.getElementById('modal-cartao-id').value = ''; document.getElementById('modal-cartao-nome').value = ''; document.getElementById('modal-cartao-fechamento').value = ''; document.getElementById('modal-cartao-limite').value = ''; document.getElementById('modal-cartao-vencimento').value = ''; }
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            const form = modal.querySelector('form');
            if (form) form.reset();
        }
    }

    toggleParcelasModal() {
        const tipo = document.getElementById('modal-compra-tipo')?.value;
        const groupParc = document.getElementById('group-parcelas');
        const boxPreview = document.getElementById('preview-parcela-box');
        if (tipo === 'Parcelado') {
            if (groupParc) groupParc.style.display = 'flex';
            if (boxPreview) boxPreview.style.display = 'block';
            this.calcPreviewParcela();
        } else {
            if (groupParc) groupParc.style.display = 'none';
            if (boxPreview) boxPreview.style.display = 'none';
        }
    }

    calcPreviewParcela() {
        const parcelas = parseInt(document.getElementById('modal-compra-parcelas')?.value) || 1;
        const valorTotal = parseFloat(document.getElementById('modal-compra-valor')?.value) || 0;
        const valParc = valorTotal / parcelas;
        const el = document.getElementById('preview-parcela-val');
        if (el) el.textContent = tableRenderer.formatCurrency(valParc);
    }

    saveCompraFromModal() {
        const desc = document.getElementById('modal-compra-desc').value.trim();
        const data = document.getElementById('modal-compra-data').value;
        const cartaoId = document.getElementById('modal-compra-cartao').value;
        const cat = document.getElementById('modal-compra-cat').value;
        const natureza = document.getElementById('modal-compra-natureza').value;
        
        let tipo = 'A vista';
        if (natureza === 'fixo_absoluto' || natureza === 'fixo_variavel') {
            tipo = 'Fixo';
        } else {
            tipo = document.getElementById('modal-compra-tipo').value === 'Parcelado' ? 'Parcelado' : 'A vista';
        }
        
        const rateio = window.__currentRateio || { 'meu': 100 };
        const parcelas = parseInt(document.getElementById('modal-compra-parcelas').value) || 1;
        const valorTotal = parseFloat(document.getElementById('modal-compra-valor').value) || 0;

        if (!desc || !data || valorTotal <= 0) {
            alert('Preencha os campos obrigatórios.');
            return;
        }

        state.addCompra({ desc, data, cartaoId, cat, natureza, tipo, rateio, parcelas, valorTotal });
        this.closeModal('modal-compra');
    }

    saveCartaoFromModal() {
        const idInput = document.getElementById('modal-cartao-id').value;
        const nome = document.getElementById('modal-cartao-nome').value.trim();
        const limite = parseFloat(document.getElementById('modal-cartao-limite').value) || 0;
        const fechamento = parseInt(document.getElementById('modal-cartao-fechamento').value) || 5;
        const vencimento = parseInt(document.getElementById('modal-cartao-vencimento').value) || 10;
        const cor = document.getElementById('modal-cartao-cor').value;

        if (!nome) {
            alert('Preencha Nome do Cartão.');
            return;
        }

        if (idInput) {
            state.updateCartao(idInput, { nome, limite, diaFechamento: fechamento, diaVencimento: vencimento, cor });
        } else {
            state.addCartao({
                id: 'card_' + Date.now(),
                nome,
                limite,
                diaFechamento: fechamento,
                diaVencimento: vencimento,
                cor
            });
        }
        this.closeModal('modal-cartao');
    }

    saveContaFromModal() {
        const idInput = document.getElementById('modal-conta-id').value;
        const nome = document.getElementById('modal-conta-nome').value.trim();
        const banco = document.getElementById('modal-conta-banco').value.trim();
        const saldo = parseFloat(document.getElementById('modal-conta-saldo').value) || 0;
        const cor = document.getElementById('modal-conta-cor').value;

        if (!nome || !banco) {
            alert('Preencha Nome e Banco.');
            return;
        }
        
        if (idInput) {
            state.updateConta(idInput, { nome, banco, saldoInicial: saldo, cor });
        } else {
            state.addConta({
                id: 'conta_' + Date.now(),
                nome,
                banco,
                saldoInicial: saldo,
                cor
            });
        }
        this.closeModal('modal-conta');
    }

    saveReceitaFromModal() {
        const desc = document.getElementById('modal-rec-desc').value.trim();
        const data = document.getElementById('modal-rec-data').value;
        const contaId = document.getElementById('modal-rec-conta').value;
        const cat = document.getElementById('modal-rec-cat').value;
        const fixo = document.getElementById('modal-rec-fixo').value === 'true';
        const valor = parseFloat(document.getElementById('modal-rec-valor').value) || 0;

        if (!desc || !data || valor <= 0) {
            alert('Preencha a descrição, data e um valor positivo.');
            return;
        }

        state.addReceita({ desc, data, contaId, cat, fixo, valor });
        this.closeModal('modal-receita');
    }

    saveInvestimentoFromModal() {
        const nome = document.getElementById('modal-inv-nome').value.trim();
        const tipo = document.getElementById('modal-inv-tipo').value;
        const data = document.getElementById('modal-inv-data').value;
        const valor = parseFloat(document.getElementById('modal-inv-valor').value) || 0;
        const taxa = parseFloat(document.getElementById('modal-inv-taxa').value) || 0.85;

        if (!nome || !data || valor <= 0) {
            alert('Preencha o nome do ativo e o valor investido.');
            return;
        }

        state.addInvestimento({ nome, tipo, data, valor, taxa });
        this.closeModal('modal-investimento');
    }

    saveVaVrFromModal() {
        const desc = document.getElementById('modal-vavr-desc').value.trim();
        const beneficio = document.getElementById('modal-vavr-beneficio').value;
        const data = document.getElementById('modal-vavr-data').value;
        const valor = parseFloat(document.getElementById('modal-vavr-valor').value) || 0;
        const cat = document.getElementById('modal-vavr-cat').value;

        if (!desc || !data || valor <= 0) {
            alert('Preencha o estabelecimento e um valor positivo.');
            return;
        }

        state.addVaVrGasto({ desc, beneficio, data, valor, cat });
        this.closeModal('modal-vavr');
    }

    addRowInline(type) {
        if (type === 'despesas') tableRenderer.renderDespesasInlineAddRow('tbody-despesas', state.data.cartoes, state.data.contas, (item) => state.addCompra(item));
        else if (type === 'receitas') tableRenderer.renderReceitasInlineAddRow('tbody-receitas', state.data.contas, (item) => state.addReceita(item));
        else if (type === 'investimentos') tableRenderer.renderInvestimentosInlineAddRow('tbody-investimentos', (item) => state.addInvestimento(item));
        else if (type === 'vavr') tableRenderer.renderVaVrInlineAddRow('tbody-vavr', (item) => state.addVaVrGasto(item));
    }

    deleteCompra(id) { if (confirm('Tem certeza que deseja remover esta despesa?')) state.deleteCompra(id); }
    deleteCartao(id) { if (confirm('Atenção: Tem certeza que deseja remover este cartão?')) state.deleteCartao(id); }
    
    editConta(id) {
        const conta = state.data.contas.find(c => c.id === id);
        if (!conta) return;
        document.getElementById('modal-conta-id').value = conta.id;
        document.getElementById('modal-conta-nome').value = conta.nome;
        document.getElementById('modal-conta-banco').value = conta.banco;
        document.getElementById('modal-conta-saldo').value = conta.saldoInicial;
        document.getElementById('modal-conta-cor').value = conta.cor;
        this.openModal('modal-conta');
    }

    editCartao(id) {
        const cartao = state.data.cartoes.find(c => c.id === id);
        if (!cartao) return;
        document.getElementById('modal-cartao-id').value = cartao.id;
        document.getElementById('modal-cartao-nome').value = cartao.nome;
        document.getElementById('modal-cartao-limite').value = cartao.limite;
        document.getElementById('modal-cartao-fechamento').value = cartao.diaFechamento || 5;
        document.getElementById('modal-cartao-vencimento').value = cartao.diaVencimento;
        document.getElementById('modal-cartao-cor').value = cartao.cor;
        this.openModal('modal-cartao');
    }

    deleteConta(id) { if (confirm('Atenção: Tem certeza que deseja remover esta conta bancária ou carteira?')) state.deleteConta(id); }
    deleteReceita(id) { if (confirm('Deseja remover este registro de receita ou entrada?')) state.deleteReceita(id); }
    deleteInvestimento(id) { if (confirm('Deseja remover este ativo da carteira?')) state.deleteInvestimento(id); }
    deleteVaVr(id) { if (confirm('Deseja remover este gasto com benefício?')) state.deleteVaVrGasto(id); }

    quitarCompra(id, mesAtual) {
        if (confirm('Deseja quitar todas as parcelas restantes desta compra? As parcelas futuras deixarão de aparecer nos meses seguintes.')) {
            state.quitarCompraParcelada(id, mesAtual);
        }
    }
    desquitarCompra(id) {
        if (confirm('Deseja desfazer a quitação antecipada desta compra?')) {
            state.desquitarCompraParcelada(id);
        }
    }

    editBenefitConfig(type) {
        const curVal = type === 'VA' ? state.data.beneficios.vaCarga : state.data.beneficios.vrCarga;
        const newVal = prompt(`Informe a nova carga mensal para o Vale ${type === 'VA' ? 'Alimentação' : 'Refeição'} (R$):`, curVal);
        if (newVal !== null && !isNaN(parseFloat(newVal))) {
            const val = parseFloat(newVal);
            if (type === 'VA') state.updateBeneficiosConfig({ vaCarga: val });
            else state.updateBeneficiosConfig({ vrCarga: val });
        }
    }
}

export const app = new NexusApp();
window.app = app;
