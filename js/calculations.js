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

    _getValorHistorico(despesa, targetMes) {
        if (despesa.valoresMensais && despesa.valoresMensais[targetMes] !== undefined) {
            return despesa.valoresMensais[targetMes];
        }
        if (despesa.natureza === 'fixo_absoluto') return despesa.valorTotal;
        
        // fixo_variavel
        const mesCompra = despesa.data.slice(0, 7);
        const [anoC, mesC] = mesCompra.split('-').map(Number);
        const [anoR, mesR] = targetMes.split('-').map(Number);
        const diffMeses = (anoR - anoC) * 12 + (mesR - mesC);
        
        if (diffMeses <= 0) return despesa.valorTotal;
        
        let sum = 0;
        let count = 0;
        for (let i = 1; i <= 3; i++) {
            if (diffMeses - i >= 0) {
                const pastMes = this.getOffsetMonth(targetMes, -i);
                sum += this._getValorHistorico(despesa, pastMes);
                count++;
            }
        }
        return count > 0 ? sum / count : despesa.valorTotal;
    },

    getIncidenciaDespesaNoMes(despesa, mesReferencia) {
        const mesCompra = despesa.data.slice(0, 7);
        const [anoC, mesC] = mesCompra.split('-').map(Number);
        const [anoR, mesR] = mesReferencia.split('-').map(Number);

        const diffMeses = (anoR - anoC) * 12 + (mesR - mesC);

        if (diffMeses < 0) return null;
        
        const isParcelado = despesa.tipo === 'Parcelado' && despesa.parcelas > 1;
        const isRecorrente = !isParcelado && (despesa.natureza === 'fixo_absoluto' || despesa.natureza === 'fixo_variavel' || despesa.natureza === 'Fixo');

        if (isRecorrente) {
            return {
                ativa: true,
                numeroParcela: diffMeses + 1,
                totalParcelas: 999,
                valor: this._getValorHistorico(despesa, mesReferencia),
                quitadaNoMes: false
            };
        }

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

            let valParcela = despesa.valorParcela;
            if (despesa.valoresMensais && despesa.valoresMensais[mesReferencia] !== undefined) {
                valParcela = despesa.valoresMensais[mesReferencia];
            }

            return {
                ativa: true,
                numeroParcela: numeroParcela,
                totalParcelas: despesa.parcelas,
                valor: valParcela,
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
            const normalizedNatureza = d.natureza === 'Fixo' ? 'fixo_absoluto' : 
                                     d.natureza === 'Variável' ? 'variavel' : 
                                     (d.natureza || 'variavel');

            if (cartaoId !== 'ALL' && d.cartaoId !== cartaoId) return;
            if (categoria !== 'ALL' && d.cat !== categoria) return;
            if (natureza !== 'ALL' && normalizedNatureza !== natureza) return;

            const inc = this.getIncidenciaDespesaNoMes(d, mesReferencia);
            if (inc && inc.ativa) {
                itensFiltrados.push({
                    ...d,
                    natureza: normalizedNatureza,
                    incidencia: inc
                });
                
                const rateio = d.rateio || (d.dono ? { [d.dono]: 100 } : { 'meu': 100 });
                for (const rDono in rateio) {
                    if (!totalPorDono[rDono]) totalPorDono[rDono] = 0;
                    totalPorDono[rDono] += inc.valor * (rateio[rDono] / 100);
                }
                
                const valorMeu = inc.valor * ((rateio['meu'] || 0) / 100);

                totalGeral += valorMeu;
                if (d.tipo === 'Parcelado' && d.parcelas > 1) {
                    totalParcelado += valorMeu;
                }
                if (normalizedNatureza === 'fixo_absoluto' || normalizedNatureza === 'fixo_variavel') {
                    totalFixo += valorMeu;
                } else {
                    totalVariavel += valorMeu;
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
                    const mesCompra = d.data.slice(0, 7);
                    if (mesCompra <= mesAtual) {
                        const [anoC, mesC] = mesCompra.split('-').map(Number);
                        const [anoA, mesA] = mesAtual.split('-').map(Number);
                        const diffMeses = (anoA - anoC) * 12 + (mesA - mesC);
                        
                        const rateio = d.rateio || (d.dono ? { [d.dono]: 100 } : { 'meu': 100 });
                        const pctMeu = (rateio['meu'] || 0) / 100;
                        
                        for (let i = 0; i <= diffMeses; i++) {
                            const loopMes = this.getOffsetMonth(mesCompra, i);
                            const inc = this.getIncidenciaDespesaNoMes(d, loopMes);
                            if (inc && inc.ativa) {
                                const valorMeu = inc.valor * pctMeu;
                                somaSaidas += valorMeu;
                                if (i === diffMeses) saidasMes += valorMeu;
                            }
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

        let faturasAcumuladas = 0;
        despesas.forEach(d => {
            const isConta = contas.some(c => c.id === d.cartaoId);
            if (!isConta) {
                const mesCompra = d.data.slice(0, 7);
                if (mesCompra <= mesAtual) {
                    const [anoC, mesC] = mesCompra.split('-').map(Number);
                    const [anoA, mesA] = mesAtual.split('-').map(Number);
                    const diffMeses = (anoA - anoC) * 12 + (mesA - mesC);
                    
                    const rateio = d.rateio || (d.dono ? { [d.dono]: 100 } : { 'meu': 100 });
                    const pctMeu = (rateio['meu'] || 0) / 100;
                    
                    for (let i = 0; i <= diffMeses; i++) {
                        const loopMes = this.getOffsetMonth(mesCompra, i);
                        const inc = this.getIncidenciaDespesaNoMes(d, loopMes);
                        if (inc && inc.ativa) {
                            faturasAcumuladas += (inc.valor * pctMeu);
                        }
                    }
                }
            }
        });

        saldoTotalAcumulado -= faturasAcumuladas;

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
        const simValor = parseFloat(simParams.valor) || 0;
        const simMeses = parseInt(simParams.meses) || 1;
        const simTipo = simParams.tipo || 'despesa'; // 'despesa' ou 'receita'
        const varEstimado = simParams.estVariavel !== undefined ? parseFloat(simParams.estVariavel) : 2500.00;

        let totalReceitaAcumulada = 0;
        let totalFixosAcumulados = 0;
        let totalParcelasAcumuladas = 0;
        
        for (let i = 1; i <= simMeses; i++) {
            const loopMonth = this.getOffsetMonth(curMonth, i);
            
            let recMes = 0;
            stateData.receitas.forEach(r => {
                const nomeLower = (r.desc || '').toLowerCase();
                if (nomeLower.includes('va') || nomeLower.includes('vale alimentação') ||
                    nomeLower.includes('vr') || nomeLower.includes('vale refeição')) {
                    return;
                }
                if (r.fixo) recMes += r.valor;
            });
            
            let fixosMes = 0;
            let parcelasMes = 0;
            
            stateData.despesas.forEach(d => {
                const rateio = d.rateio || (d.dono ? { [d.dono]: 100 } : { 'meu': 100 });
                const pctMeu = (rateio['meu'] || 0) / 100;
                if (pctMeu === 0) return;

                const inc = this.getIncidenciaDespesaNoMes(d, loopMonth);
                const isParcelado = d.tipo === 'Parcelado' && d.parcelas > 1;
                const isFixo = !isParcelado && (d.natureza === 'fixo_absoluto' || d.natureza === 'fixo_variavel' || d.natureza === 'Fixo');
                
                if (inc && inc.ativa) {
                    const valorMeu = inc.valor * pctMeu;
                    if (isFixo) {
                        fixosMes += valorMeu;
                    } else if (d.tipo === 'Parcelado' && d.parcelas > 1) {
                        parcelasMes += valorMeu;
                    }
                } else if (!inc && isFixo) {
                    const valMeu = (d.valorParcela || d.valorTotal) * pctMeu;
                    fixosMes += valMeu;
                }
            });
            
            totalReceitaAcumulada += recMes;
            totalFixosAcumulados += fixosMes;
            totalParcelasAcumuladas += parcelasMes;
        }

        const invRes = this.calcInvestimentos(stateData.investimentos, stateData.config);
        const rendimentoEst = invRes.rendimentoMensalTotal || 0;
        
        const totalReceitaEsperada = (totalReceitaAcumulada / simMeses) + rendimentoEst;
        const gastosFixosEsperados = (totalFixosAcumulados / simMeses);
        const parcelasAtivasEsperadas = (totalParcelasAcumuladas / simMeses);

        const totalGastosBase = gastosFixosEsperados + parcelasAtivasEsperadas + varEstimado;
        const saldoLivreBase = totalReceitaEsperada - totalGastosBase;
        const pctComprometidoBase = totalReceitaEsperada > 0 ? (totalGastosBase / totalReceitaEsperada) * 100 : 0;

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

        let semaforo = { status: 'SUCCESS', titulo: '🟢 Confortável & Seguro', desc: `Na média dos próximos ${simMeses} meses, sua capacidade absorve esse compromisso sem afetar o estilo de vida.` };
        if (saldoLivreSimulado < 0) {
            semaforo = { status: 'DANGER', titulo: '🔴 Alerta Vermelho: Déficit Projetado!', desc: `Atenção crítica: Na média, faltarão R$ ${Math.abs(saldoLivreSimulado).toFixed(2)} na sua conta por mês durante esse período!` };
        } else if ((saldoLivreSimulado / totalReceitaSimulada) < 0.15) {
            semaforo = { status: 'WARNING', titulo: '🟡 Margem Apertada / Atenção', desc: `Seu saldo livre cairá para apenas ${(saldoLivreSimulado / totalReceitaSimulada * 100).toFixed(1)}% da sua renda média.` };
        }

        const projMeses = [];
        const projBaseData = [];
        const projSimData = [];

        for (let i = 1; i <= 12; i++) {
            const mesTarget = this.getOffsetMonth(curMonth, i);
            projMeses.push(this.formatMesNome(mesTarget));

            let recMesTarget = rendimentoEst;
            stateData.receitas.forEach(r => {
                const nomeLower = (r.desc || '').toLowerCase();
                if (nomeLower.includes('va') || nomeLower.includes('vr') || nomeLower.includes('vale')) return;
                if (r.fixo) recMesTarget += r.valor;
            });

            let gastosMesTarget = varEstimado;
            stateData.despesas.forEach(d => {
                const rateio = d.rateio || (d.dono ? { [d.dono]: 100 } : { 'meu': 100 });
                const pctMeu = (rateio['meu'] || 0) / 100;
                if (pctMeu === 0) return;

                const isParcelado = d.tipo === 'Parcelado' && d.parcelas > 1;
                const isFixo = !isParcelado && (d.natureza === 'fixo_absoluto' || d.natureza === 'fixo_variavel' || d.natureza === 'Fixo');
                const inc = this.getIncidenciaDespesaNoMes(d, mesTarget);
                
                if (inc && inc.ativa) {
                    if (isFixo || (d.tipo === 'Parcelado' && d.parcelas > 1)) {
                        gastosMesTarget += inc.valor * pctMeu;
                    }
                } else if (!inc && isFixo) {
                    gastosMesTarget += (d.valorParcela || d.valorTotal) * pctMeu;
                }
            });

            const sobraMesBase = recMesTarget - gastosMesTarget;
            projBaseData.push(parseFloat(sobraMesBase.toFixed(2)));

            let sobraMesSim = sobraMesBase;
            if (i <= simMeses) {
                if (simTipo === 'despesa') sobraMesSim -= simValor;
                else sobraMesSim += simValor;
            }
            projSimData.push(parseFloat(sobraMesSim.toFixed(2)));
        }

        return {
            nextMonthNome: `MÉDIA DOS PRÓXIMOS ${simMeses} MESES`,
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
            donosResumo: { 'meu': totalGastosBase },
            projecaoChart: {
                labels: projMeses,
                baseData: projBaseData,
                simData: projSimData
            }
        };
    }
};
