/**
 * NEXUS FINANCE | STATE MANAGEMENT & STORAGE (state.js)
 * Gerenciamento de estado global com persistência automática e dados demonstrativos.
 * V2: Suporte a Contas Correntes, Receitas/Entradas e classificação Fixo vs Variável.
 */

import { db, doc, setDoc, getDoc, auth } from './firebase.js';

const STORAGE_KEY = 'NEXUS_FINANCE_DATA_V1';

// Estado inicial padrão (vazio)
const defaultState = {
    config: {
        mesAtual: new Date().toISOString().slice(0, 7),
        simTaxa: 0.85,
        simTaxaTipo: 'am',
        simAporte: 1500
    },
    contas: [],
    receitas: [],
    cartoes: [],
    despesas: [],
    investimentos: [],
    beneficios: {
        vaCarga: 800.00,
        vrCarga: 1000.00,
        diasUteis: 22,
        diasPassados: 10
    },
    vavrGastos: [],
    pessoasPorMes: {}
};

class StateManager {
    constructor() {
        this.data = JSON.parse(JSON.stringify(defaultState));
        this.listeners = [];
        this.userId = null;
    }

    async init(userId) {
        this.userId = userId;
        await this.loadFromCloud();
    }

    async loadFromCloud() {
        if (!this.userId || !db) return;
        try {
            const docRef = doc(db, 'users', this.userId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const parsed = docSnap.data();
                if (parsed.despesas) {
                    parsed.despesas.forEach(d => {
                        if (d.natureza === undefined) d.natureza = d.fixo ? 'fixo_absoluto' : 'variavel';
                        if (d.valoresMensais === undefined) d.valoresMensais = {};
                        if (d.cat) {
                            try { d.cat = decodeURIComponent(escape(d.cat)); } catch(e) {}
                        }
                        if (d.parcelas > 1 && d.tipo === 'Fixo') d.tipo = 'Parcelado';
                    });
                }
                this.data = { ...defaultState, ...parsed };
            } else {
                // Se não existir, tenta carregar o localStorage antigo pra migrar
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    this.data = { ...defaultState, ...parsed };
                    this.save(); // Já salva na nuvem
                }
            }
        } catch (e) {
            console.error('Erro ao ler do Firestore:', e);
        }
        this.notifyListeners();
    }

    save() {
        try {
            // Backup local
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
            // Nuvem
            if (this.userId && db) {
                setDoc(doc(db, 'users', this.userId), this.data).catch(e => console.error('Erro Firestore:', e));
            }
            this.notifyListeners();
        } catch (e) {
            console.error('Erro ao salvar:', e);
        }
    }

    subscribe(callback) {
        this.listeners.push(callback);
    }

    notifyListeners() {
        this.listeners.forEach(cb => cb(this.data));
    }

    /**
     * Métodos de Manipulação de Pessoas (Divisão de Custos)
     */
    addPessoa(mes, nome) {
        if (!this.data.pessoasPorMes) this.data.pessoasPorMes = {};
        if (!this.data.pessoasPorMes[mes]) this.data.pessoasPorMes[mes] = [];
        if (!this.data.pessoasPorMes[mes].includes(nome)) {
            this.data.pessoasPorMes[mes].push(nome);
            this.save();
        }
    }

    removePessoa(mes, nome) {
        if (!this.data.pessoasPorMes || !this.data.pessoasPorMes[mes]) return;
        this.data.pessoasPorMes[mes] = this.data.pessoasPorMes[mes].filter(n => n !== nome);
        this.save();
    }

    getPessoas(mes) {
        if (!this.data.pessoasPorMes) return [];
        return this.data.pessoasPorMes[mes] || [];
    }

    /**
     * Métodos de Manipulação de Contas Correntes / Carteiras
     */
    addConta(conta) {
        const newId = 'conta_' + Date.now() + Math.random().toString(36).substr(2, 4);
        this.data.contas.push({
            id: newId,
            nome: conta.nome,
            banco: conta.banco || 'Geral',
            saldoInicial: parseFloat(conta.saldoInicial) || 0,
            cor: conta.cor || 'blue'
        });
        this.save();
        return newId;
    }

    updateConta(id, updatedFields) {
        const idx = this.data.contas.findIndex(c => c.id === id);
        if (idx !== -1) {
            this.data.contas[idx] = { ...this.data.contas[idx], ...updatedFields };
            this.save();
        }
    }

    deleteConta(id) {
        this.data.contas = this.data.contas.filter(c => c.id !== id);
        this.save();
    }

    /**
     * Métodos de Manipulação de Receitas / Entradas
     */
    addReceita(receita) {
        const newId = 'rec_' + Date.now() + Math.random().toString(36).substr(2, 4);
        this.data.receitas.push({
            id: newId,
            desc: receita.desc,
            data: receita.data,
            contaId: receita.contaId,
            cat: receita.cat || 'Salário',
            valor: parseFloat(receita.valor) || 0,
            fixo: receita.fixo === true || receita.fixo === 'true'
        });
        this.save();
        return newId;
    }

    updateReceita(id, updatedFields) {
        const idx = this.data.receitas.findIndex(r => r.id === id);
        if (idx !== -1) {
            this.data.receitas[idx] = { ...this.data.receitas[idx], ...updatedFields };
            this.save();
        }
    }

    deleteReceita(id) {
        this.data.receitas = this.data.receitas.filter(r => r.id !== id);
        this.save();
    }

    /**
     * Métodos de Manipulação de Cartões
     */
    addCartao(cartao) {
        const newId = 'card_' + Date.now() + Math.random().toString(36).substr(2, 4);
        this.data.cartoes.push({ id: newId, ...cartao });
        this.save();
        return newId;
    }

    updateCartao(id, updatedFields) {
        const idx = this.data.cartoes.findIndex(c => c.id === id);
        if (idx !== -1) {
            this.data.cartoes[idx] = { ...this.data.cartoes[idx], ...updatedFields };
            this.save();
        }
    }

    deleteCartao(id) {
        this.data.cartoes = this.data.cartoes.filter(c => c.id !== id);
        this.save();
    }

    /**
     * Métodos de Manipulação de Compras e Despesas
     */
    addCompra(compra) {
        const newId = 'desp_' + Date.now() + Math.random().toString(36).substr(2, 4);
        const valorTotal = parseFloat(compra.valorTotal) || 0;
        const parcelas = parseInt(compra.parcelas) || 1;
        const valorParcela = compra.tipo === 'Parcelado' ? (valorTotal / parcelas) : valorTotal;

        this.data.despesas.push({
            id: newId,
            desc: compra.desc,
            data: compra.data,
            cartaoId: compra.cartaoId, // Pode ser ID de um cartão ou ID de uma conta corrente/carteira
            cat: compra.cat || 'Outros',
            tipo: compra.tipo || 'A vista',
            natureza: compra.natureza || 'Variável', // Fixo vs Variável
            rateio: compra.rateio || { 'meu': 100 }, // Divisão de custos em %
            parcelas: parcelas,
            valorTotal: valorTotal,
            valorParcela: valorParcela,
            quitada: false,
            mesQuitacao: null
        });
        this.save();
        return newId;
    }


    updateCompraValorMensal(id, mes, novoValor) {
        const idx = this.data.despesas.findIndex(d => d.id === id);
        if (idx !== -1) {
            if (!this.data.despesas[idx].valoresMensais) {
                this.data.despesas[idx].valoresMensais = {};
            }
            this.data.despesas[idx].valoresMensais[mes] = novoValor;
            this.save();
        }
    }

    updateCompra(id, updatedFields) {
        const idx = this.data.despesas.findIndex(d => d.id === id);
        if (idx !== -1) {
            const d = { ...this.data.despesas[idx], ...updatedFields };
            if (updatedFields.valorTotal !== undefined || updatedFields.parcelas !== undefined) {
                const total = parseFloat(d.valorTotal) || 0;
                const parc = parseInt(d.parcelas) || 1;
                d.valorParcela = d.tipo === 'Parcelado' ? (total / parc) : total;
            }
            this.data.despesas[idx] = d;
            this.save();
        }
    }

    deleteCompra(id) {
        this.data.despesas = this.data.despesas.filter(d => d.id !== id);
        this.save();
    }

    quitarCompraParcelada(id, mesAtual) {
        const idx = this.data.despesas.findIndex(d => d.id === id);
        if (idx !== -1) {
            this.data.despesas[idx].quitada = true;
            this.data.despesas[idx].mesQuitacao = mesAtual;
            this.save();
        }
    }

    desquitarCompraParcelada(id) {
        const idx = this.data.despesas.findIndex(d => d.id === id);
        if (idx !== -1) {
            this.data.despesas[idx].quitada = false;
            this.data.despesas[idx].mesQuitacao = null;
            this.save();
        }
    }

    /**
     * Métodos de Manipulação de Investimentos
     */
    addInvestimento(inv) {
        const newId = 'inv_' + Date.now() + Math.random().toString(36).substr(2, 4);
        this.data.investimentos.push({
            id: newId,
            nome: inv.nome,
            tipo: inv.tipo || 'Renda Fixa',
            data: inv.data,
            valor: parseFloat(inv.valor) || 0,
            taxa: parseFloat(inv.taxa) || 0.85
        });
        this.save();
        return newId;
    }

    updateInvestimento(id, updatedFields) {
        const idx = this.data.investimentos.findIndex(i => i.id === id);
        if (idx !== -1) {
            this.data.investimentos[idx] = { ...this.data.investimentos[idx], ...updatedFields };
            this.save();
        }
    }

    deleteInvestimento(id) {
        this.data.investimentos = this.data.investimentos.filter(i => i.id !== id);
        this.save();
    }

    /**
     * Métodos de Manipulação de VA/VR
     */
    updateBeneficiosConfig(newConfig) {
        this.data.beneficios = { ...this.data.beneficios, ...newConfig };
        this.save();
    }

    addVaVrGasto(gasto) {
        const newId = 'vavr_' + Date.now() + Math.random().toString(36).substr(2, 4);
        this.data.vavrGastos.push({
            id: newId,
            desc: gasto.desc,
            beneficio: gasto.beneficio || 'VR',
            data: gasto.data,
            valor: parseFloat(gasto.valor) || 0,
            cat: gasto.cat || 'Alimentação'
        });
        this.save();
        return newId;
    }

    deleteVaVrGasto(id) {
        this.data.vavrGastos = this.data.vavrGastos.filter(v => v.id !== id);
        this.save();
    }

    updateConfig(key, value) {
        this.data.config[key] = value;
        this.save();
    }

    exportJSON() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.data, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `backup_nexus_finance_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }

    importJSON(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            if (parsed && (parsed.cartoes || parsed.despesas || parsed.contas)) {
                this.data = { ...defaultState, ...parsed };
                this.save();
                return true;
            }
        } catch (e) {
            console.error('Erro ao importar JSON:', e);
        }
        return false;
    }

    exportCSV() {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "ID;Data;Descrição;Cartão/Conta;Categoria;Tipo;Natureza;Parcelas;Valor Total;Valor Parcela;Status Quitação\n";
        
        this.data.despesas.forEach(d => {
            const cartaoNome = this.data.cartoes.find(c => c.id === d.cartaoId)?.nome || this.data.contas.find(c => c.id === d.cartaoId)?.nome || 'Conta Geral';
            const status = d.quitada ? `Quitada em ${d.mesQuitacao}` : 'Normal';
            csvContent += `${d.id};${d.data};"${d.desc}";"${cartaoNome}";"${d.cat}";${d.tipo};"${d.natureza || 'Variável'}";${d.parcelas};${d.valorTotal.toFixed(2)};${d.valorParcela.toFixed(2)};"${status}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `relatorio_despesas_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    resetAllData() {
        this.data = JSON.parse(JSON.stringify(defaultState));
        this.save();
    }

    /**
     * Carregar Dados de Demonstração Completo (V2 com Contas, Receitas e Fixo/Variável)
     */
    loadDemoData() {
        const curMonth = new Date().toISOString().slice(0, 7); // ex: 2026-07
        const prevMonth = this.getOffsetMonth(curMonth, -1);
        const nextMonth = this.getOffsetMonth(curMonth, 1);

        const idItau = 'conta_itau';
        const idNubankConta = 'conta_nubank';
        const idXPConta = 'conta_xp';
        
        const idNubankCard = 'card_nubank_black';
        const idXPCard = 'card_xp_infinite';
        const idItauCard = 'card_itau_personnalite';

        this.data = {
            config: {
                mesAtual: curMonth,
                simTaxa: 0.88,
                simTaxaTipo: 'am',
                simAporte: 2500.00
            },
            contas: [
                { id: idItau, nome: 'Itaú Personnalité Corrente', banco: 'Itaú Personnalité', saldoInicial: 14500.00, cor: 'blue' },
                { id: idNubankConta, nome: 'Nubank Conta / Pix', banco: 'Nubank', saldoInicial: 6200.00, cor: 'purple' },
                { id: idXPConta, nome: 'XP Conta Digital / Investimentos', banco: 'XP Investimentos', saldoInicial: 18000.00, cor: 'black' },
                { id: 'conta_carteira', nome: 'Carteira Física / Dinheiro em Espécie', banco: 'Dinheiro', saldoInicial: 450.00, cor: 'emerald' }
            ],
            receitas: [
                { id: 'rec_1', desc: 'Salário Líquido Mensal (Empresa Principal)', data: `${curMonth}-01`, contaId: idItau, cat: 'Salário', valor: 18500.00, fixo: true },
                { id: 'rec_2', desc: 'Consultoria de TI & Freelance Exterior', data: `${curMonth}-05`, contaId: idNubankConta, cat: 'Serviços/Freelance', valor: 4500.00, fixo: false },
                { id: 'rec_3', desc: 'Rendimentos e Dividendos de FIIs (MXRF11/HGLG11)', data: `${curMonth}-14`, contaId: idXPConta, cat: 'Dividendos/Rendimentos', valor: 680.00, fixo: false },
                { id: 'rec_4', desc: 'Reembolso de Despesas de Viagem e KM', data: `${curMonth}-08`, contaId: idItau, cat: 'Reembolso/Outros', valor: 1250.00, fixo: false },
                { id: 'rec_5', desc: 'Salário Líquido Mensal (Mês Anterior)', data: `${prevMonth}-01`, contaId: idItau, cat: 'Salário', valor: 18500.00, fixo: true }
            ],
            cartoes: [
                { id: idNubankCard, nome: 'Nubank Black Infinite', limite: 18000.00, cor: 'purple', fechamento: 5, vencimento: 12 },
                { id: idXPCard, nome: 'XP Visa Infinite', limite: 25000.00, cor: 'black', fechamento: 15, vencimento: 22 },
                { id: idItauCard, nome: 'Itaú Personnalité Mastercard', limite: 15000.00, cor: 'blue', fechamento: 25, vencimento: 2 }
            ],
            despesas: [
                // GASTOS FIXOS (Internet, Aluguel, Plano de Saúde, Seguro, Assinaturas)
                { id: 'desp_1', desc: 'Aluguel e Condomínio do Apartamento', data: `${curMonth}-05`, cartaoId: idItau, cat: 'Moradia', tipo: 'A vista', natureza: 'Fixo', parcelas: 1, valorTotal: 4200.00, valorParcela: 4200.00, quitada: false },
                { id: 'desp_2', desc: 'Plano de Saúde SulAmérica Familiar', data: `${curMonth}-01`, cartaoId: idItau, cat: 'Saúde', tipo: 'A vista', natureza: 'Fixo', parcelas: 1, valorTotal: 1450.00, valorParcela: 1450.00, quitada: false },
                { id: 'desp_3', desc: 'Internet Fibra Ótica 500 Mbps (Claro)', data: `${curMonth}-10`, cartaoId: idNubankConta, cat: 'Moradia', tipo: 'A vista', natureza: 'Fixo', parcelas: 1, valorTotal: 169.90, valorParcela: 169.90, quitada: false },
                { id: 'desp_4', desc: 'Seguro do Carro (Porto Seguro)', data: `${curMonth}-05`, cartaoId: idNubankCard, cat: 'Transporte', tipo: 'Parcelado', natureza: 'Fixo', parcelas: 12, valorTotal: 3600.00, valorParcela: 300.00, quitada: false },
                { id: 'desp_5', desc: 'Assinaturas Streaming (Netflix, Spotify, Prime)', data: `${curMonth}-02`, cartaoId: idNubankCard, cat: 'Lazer', tipo: 'A vista', natureza: 'Fixo', parcelas: 1, valorTotal: 145.00, valorParcela: 145.00, quitada: false },
                { id: 'desp_6', desc: 'Curso de Inglês Business / MBA', data: `${curMonth}-08`, cartaoId: idItauCard, cat: 'Educação', tipo: 'Parcelado', natureza: 'Fixo', parcelas: 10, valorTotal: 6500.00, valorParcela: 650.00, quitada: false },

                // GASTOS VARIÁVEIS (Supermercado, Lazer, Eletrônicos, Viagem)
                { id: 'desp_7', desc: 'Supermercado Pão de Açúcar (Compras Mês)', data: `${curMonth}-03`, cartaoId: idNubankCard, cat: 'Alimentação', tipo: 'A vista', natureza: 'Variável', parcelas: 1, valorTotal: 850.00, valorParcela: 850.00, quitada: false },
                { id: 'desp_8', desc: 'MacBook Pro M3 Max (Apple Store)', data: `${prevMonth}-15`, cartaoId: idXPCard, cat: 'Educação', tipo: 'Parcelado', natureza: 'Variável', parcelas: 10, valorTotal: 16500.00, valorParcela: 1650.00, quitada: false },
                { id: 'desp_9', desc: 'Viagem de Férias (Passagens e Hotel)', data: `${prevMonth}-20`, cartaoId: idItauCard, cat: 'Lazer', tipo: 'Parcelado', natureza: 'Variável', parcelas: 6, valorTotal: 4800.00, valorParcela: 800.00, quitada: false },
                { id: 'desp_10', desc: 'Jantar com Amigos no Outback', data: `${curMonth}-07`, cartaoId: idNubankCard, cat: 'Lazer', tipo: 'A vista', natureza: 'Variável', parcelas: 1, valorTotal: 320.00, valorParcela: 320.00, quitada: false },
                { id: 'desp_11', desc: 'Smart TV OLED 65" (Quitada na 3ª Parcela)', data: `${this.getOffsetMonth(curMonth, -2)}-10`, cartaoId: idNubankCard, cat: 'Lazer', tipo: 'Parcelado', natureza: 'Variável', parcelas: 10, valorTotal: 7500.00, valorParcela: 750.00, quitada: true, mesQuitacao: curMonth }
            ],
            investimentos: [
                { id: 'inv_1', nome: 'Tesouro Selic 2029 (Reserva)', tipo: 'Reserva de Emergência', data: `${prevMonth}-01`, valor: 35000.00, taxa: 0.88 },
                { id: 'inv_2', nome: 'CDB Banco Master 125% CDI', tipo: 'Renda Fixa (CDB/Tesouro/LCI)', data: `${prevMonth}-15`, valor: 45000.00, taxa: 1.05 },
                { id: 'inv_3', nome: 'Fundo Imobiliário MXRF11 & HGLG11', tipo: 'Fundo Imobiliário (FII)', data: `${curMonth}-05`, valor: 28500.00, taxa: 0.82 },
                { id: 'inv_4', nome: 'Carteira de Ações (WEGE3, VALE3, ITUB4)', tipo: 'Ações / Renda Variável', data: `${curMonth}-10`, valor: 32000.00, taxa: 1.10 }
            ],
            beneficios: {
                vaCarga: 950.00,
                vrCarga: 1250.00,
                diasUteis: 22,
                diasPassados: 12
            },
            vavrGastos: [
                { id: 'vavr_1', desc: 'Supermercado Carrefour', beneficio: 'VA', data: `${curMonth}-02`, valor: 345.80, cat: 'Alimentação / Supermercado' },
                { id: 'vavr_2', desc: 'Açougue e Hortifruti', beneficio: 'VA', data: `${curMonth}-08`, valor: 180.50, cat: 'Açougue / Hortifruti' },
                { id: 'vavr_3', desc: 'Almoço Outback Steakhouse', beneficio: 'VR', data: `${curMonth}-03`, valor: 88.90, cat: 'Restaurante / Almoço' },
                { id: 'vavr_4', desc: 'Restaurante Porção a Quilo', beneficio: 'VR', data: `${curMonth}-05`, valor: 46.50, cat: 'Restaurante / Almoço' },
                { id: 'vavr_5', desc: 'Padaria & Café da Tarde', beneficio: 'VR', data: `${curMonth}-09`, valor: 32.00, cat: 'Lanche / Café' },
                { id: 'vavr_6', desc: 'Restaurante Italiano (Almoço de Negócios)', beneficio: 'VR', data: `${curMonth}-11`, valor: 115.00, cat: 'Restaurante / Almoço' }
            ]
        };
        this.save();
    }

    getOffsetMonth(baseMonthStr, offset) {
        const [y, m] = baseMonthStr.split('-').map(Number);
        const date = new Date(y, m - 1 + offset, 1);
        return date.toISOString().slice(0, 7);
    }
    // Bulk import transactions from CSV
    addTransactionsFromImport(transactions) {
        transactions.forEach(tx => {
            if (tx.action === 'ignore') return;

            const isReceita = tx.type === 'credito';
            
            if (tx.action === 'replace' && tx.conflictId) {
                if (isReceita) this.deleteReceita(tx.conflictId);
                else this.deleteCompra(tx.conflictId);
            }
            
            if (isReceita) {
                this.addReceita({
                    desc: tx.description,
                    data: tx.date,
                    contaId: tx.accountId,
                    cat: tx.category || 'Outros',
                    fixo: false, // Default to variable income
                    valor: tx.amount
                });
            } else {
                const parcelas = tx.installment || 1;
                const tipo = parcelas > 1 ? 'Parcelado' : 'A vista';
                this.addCompra({
                    desc: tx.description,
                    data: tx.date,
                    cartaoId: tx.accountId,
                    cat: tx.category || 'Outros',
                    natureza: tx.natureza || 'Variável',
                    tipo: tipo,
                    parcelas: parcelas,
                    valorTotal: Math.abs(tx.amount) // Store positive amount for despesas
                });
            }
        });
    }
}

export const state = new StateManager();
