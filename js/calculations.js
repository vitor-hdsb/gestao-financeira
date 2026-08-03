/**
 * NEXUS FINANCE | FINANCIAL CALCULATIONS ENGINE (calculations.js) - V3 PRO 360°
 * Motor de cálculos para projeção de faturas futuras, quitação de parcelas,
 * juros compostos, saldo de contas correntes, análise Fixo vs Variável
 * e Motor de Previsibilidade Futura & Simulação Orçamentária (1 a 12 Meses).
 */

export const calcEngine = {
    getMesesLista(mesReferencia) {
        const [y, m] = mesReferencia.split('-').map(Number);
        const lista = [];
        for (let i = -3; i <= 12; i++) {
            const date = new Date(y, m - 1 + i, 1);
            lista.push(date.toISOString().slice(0, 7));
        }
        return lista;
    },

    formatMesNome(mesStr) {
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const [ano, mes] = mesStr.split('-');
        return `${meses[parseInt(mes, 10) - 1]}/${ano}`;
    },

    getOffsetMonth(baseMonthStr, offset) {
        const [y, m] = baseMonthStr.split('-').map(Number);
        const date = new Date(y, m - 1 + offset, 1);
        return date.toISOString().slice(0, 7);
    },

    getIncidenciaDespesaNoMes(despesa, mesReferencia) {
        const mesCompra = despesa.data.slice(0, 7);
        const [anoC, mesC] = mesCompra.split('-').map(Number);
        const [anoR, mesR] = mesReferencia.split('-').map(Number);

        const diffMeses = (anoR - anoC) * 12 + (mesR - mesC);

        if (diffMeses < 0) return null;

        if (despesa.tipo === 'A vista' || despesa.parcelas <= 1) {
            if (diffMeses === 0) {
                return {
                    ativa: true,
                    numeroParcela: 1,
                    totalParcelas: 1,
                    valor: despesa.valorTotal,
                    quitadaNoMes: false
                };
            }
            return null;
        }

        if (diffMeses >= 0 && diffMeses < despesa.parcelas) {
            const numeroParcela = diffMeses + 1;

            let eliminadaPorQuitacao = false;
            if (despesa.quitada && despesa.mesQuitacao) {
                const [anoQ, mesQ] = despesa.mesQuitacao.split('-').map(Number);
                const diffQuitacao = (anoR - anoQ) * 12 + (mesR - mesQ);
                if (diffQuitacao > 0) {
                    eliminadaPorQuitacao = true;
                }
            }

            if (eliminadaPorQuitacao) return null;

            return {
                ativa: true,
                numeroParcela: numeroParcela,
                totalParcelas: despesa.parcelas,
                valor: despesa.valorParcela,
                quitadaNoMes: despesa.quitada && despesa.mesQuitacao === mesReferencia
            };
        }

        return null;
    },

    filtrarDespesas(despesas, mesReferencia, cartaoId = 'ALL', categoria = 'ALL', natureza = 'ALL') {
        const itensFiltrados = [];
        let totalGeral = 0;
        let totalParcelado = 0;
        let totalFixo = 0;
        let totalVariavel = 0;
        const totalPorDono = { 'meu': 0 };

        despesas.forEach(d => {
            if (cartaoId !== 'ALL' && d.cartaoId !== cartaoId) return;
            if (categoria !== 'ALL' && d.cat !== categoria) return;
            if (natureza !== 'ALL' && (d.natureza || 'Variável') !== natureza) return;

            const inc = this.getIncidenciaDespesaNoMes(d, mesReferencia);
            if (inc && inc.ativa) {
                itensFiltrados.push({
                    ...d,
                    incidencia: inc
                });
                totalGeral += inc.valor;
                if (d.tipo === 'Parcelado' && d.parcelas > 1) {
                    totalParcelado += inc.valor;
                }
                if ((d.natureza || 'Variável') === 'Fixo') {
                    totalFixo += inc.valor;
                } else {
                    totalVariavel += inc.valor;
                }
                const rateio = d.rateio || (d.dono ? { [d.dono]: 100 } : { 'meu': 100 });
                for (const rDono in rateio) {
                    const pct = rateio[rDono];
                    const valorRateado = inc.valor * (pct / 100);
                    if (!totalPorDono[rDono]) totalPorDono[rDono] = 0;
                    totalPorDono[rDono] += valorRateado;
                }
            }
        });

        return {
            itens: itensFiltrados,
            totalGeral,
            totalParcelado,
            totalFixo,
            totalVariavel,
            totalPorDono
        };
    },

    filtrarReceitas(receitas, mesReferencia, contaId = 'ALL') {
        const itens = [];
        let totalReceitas = 0;
        let totalFixo = 0;
        let totalVariavel = 0;

        receitas.forEach(r => {
            if (r.data.slice(0, 7) !== mesReferencia) return;
            if (contaId !== 'ALL' && r.contaId !== contaId) return;

            itens.push(r);
            totalReceitas += r.valor;
            if (r.fixo) totalFixo += r.valor;
            else totalVariavel += r.valor;
        });

        return { itens, totalReceitas, totalFixo, totalVariavel };
    },

    calcContasSaldos(contas, receitas, despesas, mesAtual) {
        let saldoTotalAcumulado = 0;
        const contasDetalhes = [];

        contas.forEach(conta => {
            let somaEntradas = 0;
            let entradasMes = 0;
            receitas.forEach(r => {
                if (r.contaId === conta.id) {
                    if (r.data.slice(0, 7) <= mesAtual) somaEntradas += r.valor;
                    if (r.data.slice(0, 7) === mesAtual) entradasMes += r.valor;
                }
            });

            let somaSaidas = 0;
            let saidasMes = 0;
            despesas.forEach(d => {
                if (d.cartaoId === conta.id) {
                    const inc = this.getIncidenciaDespesaNoMes(d, mesAtual);
                    if (inc && inc.ativa) saidasMes += inc.valor;

                    const mesCompra = d.data.slice(0, 7);
                    if (mesCompra <= mesAtual) {
                        if (d.tipo === 'A vista') somaSaidas += d.valorTotal;
                        else {
                            const [anoC, mesC] = mesCompra.split('-').map(Number);
                            const [anoA, mesA] = mesAtual.split('-').map(Number);
                            const diff = (anoA - anoC) * 12 + (mesA - mesC) + 1;
                            const parcPagas = Math.min(d.parcelas, Math.max(0, diff));
                            somaSaidas += parcPagas * d.valorParcela;
                        }
                    }
                }
            });

            const saldoAtual = (conta.saldoInicial || 0) + somaEntradas - somaSaidas;
            saldoTotalAcumulado += saldoAtual;

            contasDetalhes.push({
                ...conta,
                somaEntradas,
                somaSaidas,
                entradasMes,
                saidasMes,
                saldoAtual
            });
        });

        return {
            saldoTotalAcumulado,
            contasDetalhes
        };
    },

    calcFixoVsVariavel(despesas, mesReferencia) {
        const res = this.filtrarDespesas(despesas, mesReferencia, 'ALL', 'ALL', 'ALL');
        const total = res.totalGeral || 0;
        const fixo = res.totalFixo || 0;
        const variavel = res.totalVariavel || 0;

        const pctFixo = total > 0 ? (fixo / total) * 100 : 0;
        const pctVariavel = total > 0 ? (variavel / total) * 100 : 0;

        return {
            total,
            fixo,
            variavel,
            pctFixo,
            pctVariavel,
            itensFixos: res.itens.filter(i => (i.natureza || 'Variável') === 'Fixo'),
            itensVariaveis: res.itens.filter(i => (i.natureza || 'Variável') !== 'Fixo')
        };
    },

    calcProjecaoFaturas(despesas, cartoes, mesAtual) {
        const meses = [];
        const [anoA, mesA] = mesAtual.split('-').map(Number);

        for (let i = 0; i < 12; i++) {
            const d = new Date(anoA, mesA - 1 + i, 1);
            meses.push(d.toISOString().slice(0, 7));
        }

        const labels = meses.map(m => this.formatMesNome(m));
        const datasets = [];

        cartoes.forEach(card => {
            const dataValores = meses.map(mes => {
                const result = this.filtrarDespesas(despesas, mes, card.id, 'ALL');
                return parseFloat(result.totalGeral.toFixed(2));
            });

            const somaTotal = dataValores.reduce((a, b) => a + b, 0);
            if (somaTotal > 0) {
                const colorMap = {
                    purple: '#8b5cf6',
                    blue: '#3b82f6',
                    orange: '#f97316',
                    red: '#ef4444',
                    emerald: '#10b981',
                    black: '#64748b'
                };
                datasets.push({
                    label: card.nome,
                    data: dataValores,
                    backgroundColor: colorMap[card.cor] || '#3b82f6',
                    borderRadius: 6
                });
            }
        });

        return { labels, datasets, meses };
    },

    calcGastosPorCategoria(despesas, mesReferencia) {
        const catMap = {};
        despesas.forEach(d => {
            const inc = this.getIncidenciaDespesaNoMes(d, mesReferencia);
            if (inc && inc.ativa) {
                catMap[d.cat] = (catMap[d.cat] || 0) + inc.valor;
            }
        });

        const labels = Object.keys(catMap);
        const data = Object.values(catMap).map(v => parseFloat(v.toFixed(2)));
        const total = data.reduce((a, b) => a + b, 0);

        return { labels, data, total, catMap };
    },

    calcInvestimentos(investimentos, config) {
        let totalInvestido = 0;
        let rendimentoMensalTotal = 0;

        investimentos.forEach(inv => {
            totalInvestido += inv.valor;
            const taxaMensal = (inv.taxa || config.simTaxa) / 100;
            rendimentoMensalTotal += inv.valor * taxaMensal;
        });

        const taxaMediaPonderada = totalInvestido > 0 ? (rendimentoMensalTotal / totalInvestido) * 100 : config.simTaxa;

        const aporteMensal = parseFloat(config.simAporte) || 0;
        const r = taxaMediaPonderada / 100;
        
        const projecaoAnos = [1, 2, 3, 4, 5];
        const projecaoValores = [];
        const projecaoLabels = projecaoAnos.map(a => `${a} Ano${a > 1 ? 's' : ''}`);

        projecaoAnos.forEach(ano => {
            const meses = ano * 12;
            let montante = totalInvestido * Math.pow(1 + r, meses);
            if (r > 0 && aporteMensal > 0) {
                montante += aporteMensal * ((Math.pow(1 + r, meses) - 1) / r);
            } else if (aporteMensal > 0) {
                montante += aporteMensal * meses;
            }
            projecaoValores.push(parseFloat(montante.toFixed(2)));
        });

        return {
            totalInvestido,
            rendimentoMensalTotal,
            taxaMediaPonderada,
            projecao12m: projecaoValores[0] || totalInvestido,
            chartData: {
                labels: ['Hoje', ...projecaoLabels],
                data: [totalInvestido, ...projecaoValores]
            }
        };
    },

    calcVaVr(beneficios, vavrGastos, mesReferencia) {
        let gastoVA = 0;
        let gastoVR = 0;

        vavrGastos.forEach(g => {
            if (g.data.slice(0, 7) === mesReferencia) {
                if (g.beneficio === 'VA') gastoVA += g.valor;
                else if (g.beneficio === 'VR') gastoVR += g.valor;
            }
        });

        const saldoVA = Math.max(0, beneficios.vaCarga - gastoVA);
        const saldoVR = Math.max(0, beneficios.vrCarga - gastoVR);

        const pctVA = Math.min(100, (gastoVA / beneficios.vaCarga) * 100) || 0;
        const pctVR = Math.min(100, (gastoVR / beneficios.vrCarga) * 100) || 0;

        const diasUteis = parseInt(beneficios.diasUteis) || 22;
        const diasPassados = parseInt(beneficios.diasPassados) || 10;
        const diasRestantes = Math.max(1, diasUteis - diasPassados);

        const recDiarioVA = saldoVA / diasRestantes;
        const recDiarioVR = saldoVR / diasRestantes;

        return {
            gastoVA,
            gastoVR,
            saldoVA,
            saldoVR,
            pctVA,
            pctVR,
            diasRestantes,
            recDiarioVA,
            recDiarioVR,
            totalGasto: gastoVA + gastoVR,
            vavrGastos: vavrGastos.filter(g => g.data.slice(0, 7) === mesReferencia)
        };
    },

    /**
     * ==========================================================================
     * MÓDULO EXECUTIVO DE PREVISIBILIDADE FUTURA & SIMULAÇÃO (V3 PRO)
     * Projeta o saldo líquido esperado para o Mês Seguinte e próximos 12 meses,
     * permitindo simular o impacto de novas compras ou parcelamentos.
     * ==========================================================================
     */
    calcPrevisibilidade(stateData, simParams) {
        const curMonth = stateData.config.mesAtual;
        const nextMonth = this.getOffsetMonth(curMonth, 1); // ex: 2026-08

        // 1. Receitas Previsíveis Esperadas para o Mês Seguinte
        // (Soma de receitas fixas/recorrentes + rendimento de investimentos estimado)
        let receitasBase = 0;
        stateData.receitas.forEach(r => {
            // Se for receita fixa (Salário, Aluguel...) consideramos recorrente
            if (r.fixo) receitasBase += r.valor;
        });
        const invRes = this.calcInvestimentos(stateData.investimentos, stateData.config);
        const rendimentoEst = invRes.rendimentoMensalTotal || 0;
        const totalReceitaEsperada = receitasBase + rendimentoEst;

        // 2. Gastos Já Contratados / Comprometidos para o Mês Seguinte
        // a) Gastos Fixos Recorrentes (Aluguel, plano de saúde, internet, seguros...)
        let gastosFixosEsperados = 0;
        // b) Parcelas Futuras de Cartão de Crédito que já estão ativas e cairão em nextMonth
        let parcelasAtivasEsperadas = 0;
        const donosResumo = { 'meu': 0 };

        stateData.despesas.forEach(d => {
            const rateio = d.rateio || (d.dono ? { [d.dono]: 100 } : { 'meu': 100 });

            const incNext = this.getIncidenciaDespesaNoMes(d, nextMonth);
            if (incNext && incNext.ativa) {
                if ((d.natureza || 'Variável') === 'Fixo') {
                    gastosFixosEsperados += incNext.valor;
                    for (const rDono in rateio) {
                        if (!donosResumo[rDono]) donosResumo[rDono] = 0;
                        donosResumo[rDono] += incNext.valor * (rateio[rDono] / 100);
                    }
                } else if (d.tipo === 'Parcelado' && d.parcelas > 1) {
                    parcelasAtivasEsperadas += incNext.valor;
                    for (const rDono in rateio) {
                        if (!donosResumo[rDono]) donosResumo[rDono] = 0;
                        donosResumo[rDono] += incNext.valor * (rateio[rDono] / 100);
                    }
                }
            } else if ((d.natureza || 'Variável') === 'Fixo') {
                // Se é um gasto fixo cadastrado (ex: Aluguel ou Internet a vista), projetamos ele como recorrente para o próximo mês
                const val = (d.valorParcela || d.valorTotal);
                gastosFixosEsperados += val;
                for (const rDono in rateio) {
                    if (!donosResumo[rDono]) donosResumo[rDono] = 0;
                    donosResumo[rDono] += val * (rateio[rDono] / 100);
                }
            }
        });

        // c) Estimativa de Gastos Variáveis / Estilo de Vida
        // Assumimos que o variável estimado é 100% "meu" por padrão
        const varEstimado = simParams.estVariavel !== undefined ? parseFloat(simParams.estVariavel) : 2500.00;
        donosResumo['meu'] += varEstimado;

        const totalGastosBase = gastosFixosEsperados + parcelasAtivasEsperadas + varEstimado;
        const saldoLivreBase = totalReceitaEsperada - totalGastosBase;
        const pctComprometidoBase = totalReceitaEsperada > 0 ? (totalGastosBase / totalReceitaEsperada) * 100 : 0;

        // 3. Simulação Interativa (Ex: Nova parcela de R$ 200 por 6 meses)
        const simValor = parseFloat(simParams.valor) || 0;
        const simMeses = parseInt(simParams.meses) || 1;
        const simTipo = simParams.tipo || 'despesa'; // 'despesa' ou 'receita'

        let totalGastosSimulado = totalGastosBase;
        let totalReceitaSimulada = totalReceitaEsperada;

        if (simTipo === 'despesa') {
            totalGastosSimulado += simValor;
        } else {
            totalReceitaSimulada += simValor;
        }

        const saldoLivreSimulado = totalReceitaSimulada - totalGastosSimulado;
        const diferencaSaldo = saldoLivreSimulado - saldoLivreBase;
        const pctComprometidoSimulado = totalReceitaSimulada > 0 ? (totalGastosSimulado / totalReceitaSimulada) * 100 : 0;

        // 4. Semáforo de Alerta de Saúde Financeira (Status Executivo)
        let semaforo = { status: 'SUCCESS', titulo: '🟢 Confortável & Seguro', desc: 'Sua capacidade financeira absorve perfeitamente esse novo compromisso sem comprometer sua reserva ou estilo de vida.' };
        if (saldoLivreSimulado < 0) {
            semaforo = { status: 'DANGER', titulo: '🔴 Alerta Vermelho: Déficit Projetado!', desc: `Atenção crítica: Com esse novo compromisso, faltarão R$ ${Math.abs(saldoLivreSimulado).toFixed(2)} na sua conta no mês que vem!` };
        } else if ((saldoLivreSimulado / totalReceitaSimulada) < 0.15) {
            semaforo = { status: 'WARNING', titulo: '🟡 Margem Aperada / Atenção', desc: `Seu saldo livre cairá para apenas ${(saldoLivreSimulado / totalReceitaSimulada * 100).toFixed(1)}% da sua renda. Evite novos gastos imprevistos!` };
        }

        // 5. Projeção Comparativa Mês a Mês (Próximos 12 Meses)
        const projMeses = [];
        const projBaseData = [];
        const projSimData = [];

        for (let i = 1; i <= 12; i++) {
            const mesTarget = this.getOffsetMonth(curMonth, i);
            projMeses.push(this.formatMesNome(mesTarget));

            // Calcula gastos já contratados naquele mês target
            let gastosMesTarget = gastosFixosEsperados + varEstimado;
            stateData.despesas.forEach(d => {
                const inc = this.getIncidenciaDespesaNoMes(d, mesTarget);
                if (inc && inc.ativa && d.tipo === 'Parcelado' && (d.natureza || 'Variável') !== 'Fixo') {
                    gastosMesTarget += inc.valor;
                }
            });

            const sobraMesBase = totalReceitaEsperada - gastosMesTarget;
            projBaseData.push(parseFloat(sobraMesBase.toFixed(2)));

            // Se a simulação estiver ativa naquele mês target
            let sobraMesSim = sobraMesBase;
            if (i <= simMeses) {
                if (simTipo === 'despesa') sobraMesSim -= simValor;
                else sobraMesSim += simValor;
            }
            projSimData.push(parseFloat(sobraMesSim.toFixed(2)));
        }

        return {
            nextMonthNome: this.formatMesNome(nextMonth),
            receitaEsperada: totalReceitaEsperada,
            gastosFixos: gastosFixosEsperados,
            parcelasAtivas: parcelasAtivasEsperadas,
            variavelEstimado: varEstimado,
            totalGastosBase,
            saldoLivreBase,
            pctComprometidoBase,

            totalGastosSimulado,
            totalReceitaSimulada,
            saldoLivreSimulado,
            diferencaSaldo,
            pctComprometidoSimulado,

            semaforo,
            donosResumo,
            projecaoChart: {
                labels: projMeses,
                baseData: projBaseData,
                simData: projSimData
            }
        };
    }
};
