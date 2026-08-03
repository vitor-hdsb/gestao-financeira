/**
 * NEXUS FINANCE | DYNAMIC TABLES & UI COMPONENTS (tables.js) - V2
 * Renderização interativa de Contas Correntes, Receitas, Cartões,
 * Despesas (com classificação Fixo/Variável), Investimentos e VA/VR.
 */

export const tableRenderer = {
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    },

    /**
     * MÓDULO 1: CONTAS CORRENTES & CARTEIRAS (NOVO V2)
     */
    renderContasGrid(contasDetalhes, containerId, onDelete) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!contasDetalhes || contasDetalhes.length === 0) {
            container.innerHTML = `<div class="col-span-2 text-center p-8 text-secondary">Nenhuma conta bancária ou carteira cadastrada. Clique em "+ Nova Conta / Carteira" para começar.</div>`;
            return;
        }

        const colorMap = {
            blue: 'card-theme-blue',
            purple: 'card-theme-purple',
            emerald: 'card-theme-emerald',
            black: 'card-theme-black',
            orange: 'card-theme-orange',
            red: 'card-theme-red'
        };

        container.innerHTML = contasDetalhes.map(c => {
            const saldoClass = c.saldoAtual >= 0 ? 'emerald-text' : 'rose-text';
            const saldoIcon = c.saldoAtual >= 0 ? 'trending-up' : 'trending-down';

            return `
                <div class="conta-item ${colorMap[c.cor] || 'card-theme-blue'}">
                    <div class="cc-header">
                        <div>
                            <span class="text-xs uppercase opacity-75 font-semibold tracking-wider">${c.banco}</span>
                            <h4 class="cc-name text-lg">${c.nome}</h4>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-icon btn-sm" style="background: rgba(0,0,0,0.3); border: none; color: white;" onclick="app.editConta('${c.id}')" title="Editar Conta">
                                <i data-lucide="edit-2"></i>
                            </button>
                            <button class="btn btn-icon btn-sm" style="background: rgba(0,0,0,0.3); border: none; color: white;" onclick="app.deleteConta('${c.id}')" title="Excluir Conta">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </div>
                    <div class="my-4 bg-black bg-opacity-30 p-3 rounded-xl border border-white border-opacity-10">
                        <div class="flex justify-between text-xs opacity-80 mb-1">
                            <span>Saldo Inicial: ${this.formatCurrency(c.saldoInicial)}</span>
                            <span>Entradas Mês: +${this.formatCurrency(c.entradasMes)}</span>
                        </div>
                        <div class="flex justify-between text-xs opacity-80">
                            <span>Saídas Mês: -${this.formatCurrency(c.saidasMes)}</span>
                            <span>Histórico Saídas: -${this.formatCurrency(c.somaSaidas)}</span>
                        </div>
                    </div>
                    <div class="flex justify-between items-end">
                        <div>
                            <span class="text-xs opacity-80 block">Saldo Líquido Atual</span>
                            <strong class="text-2xl font-extrabold ${saldoClass} flex items-center gap-1" style="text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                                ${this.formatCurrency(c.saldoAtual)} <i data-lucide="${saldoIcon}" class="w-5 h-5 inline"></i>
                            </strong>
                        </div>
                        <span class="badge badge-success text-xs" style="background: rgba(255,255,255,0.15); border: none; color: white;">Ativa</span>
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();
    },

    /**
     * MÓDULO 2: TABELA DE RECEITAS & ENTRADAS (NOVO V2)
     */
    renderReceitasTable(receitas, contas, tbodyId, tfootId, countId, onDelete, onInlineAdd) {
        const tbody = document.getElementById(tbodyId);
        const tfoot = document.getElementById(tfootId);
        const countBadge = document.getElementById(countId);
        if (!tbody) return;

        let total = 0;
        if (!receitas || receitas.length === 0) {
            tbody.innerHTML = `
                <tr id="row-empty-receitas">
                    <td colspan="7" class="text-center p-8 text-secondary">Nenhuma receita ou crédito registrado no mês selecionado.</td>
                </tr>
            `;
            if (tfoot) tfoot.textContent = 'R$ 0,00';
            if (countBadge) countBadge.textContent = '0 entradas';
            return;
        }

        tbody.innerHTML = receitas.map(r => {
            total += r.valor;
            const conta = contas.find(c => c.id === r.contaId);
            const contaNome = conta ? `${conta.banco} - ${conta.nome}` : 'Conta Geral';
            const badgeTipo = r.fixo 
                ? `<span class="badge badge-fixo"><i data-lucide="lock"></i> Receita Fixa</span>`
                : `<span class="badge badge-variavel"><i data-lucide="zap"></i> Extra / Variável</span>`;

            return `
                <tr id="row-rec-${r.id}">
                    <td>${this.formatDate(r.data)}</td>
                    <td class="font-semibold text-primary">${r.desc}</td>
                    <td><span class="badge badge-info"><i data-lucide="landmark"></i> ${contaNome}</span></td>
                    <td>${r.cat}</td>
                    <td>${badgeTipo}</td>
                    <td class="text-right font-bold emerald-text text-base">+ ${this.formatCurrency(r.valor)}</td>
                    <td class="text-center">
                        <button class="btn btn-icon btn-sm text-danger" onclick="app.deleteReceita('${r.id}')" title="Excluir Entrada">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        if (tfoot) tfoot.textContent = `+ ${this.formatCurrency(total)}`;
        if (countBadge) countBadge.textContent = `${receitas.length} entrada${receitas.length !== 1 ? 's' : ''}`;
        if (window.lucide) window.lucide.createIcons();
    },

    renderReceitasInlineAddRow(tbodyId, contas, onSave) {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        const emptyRow = document.getElementById('row-empty-receitas');
        if (emptyRow) emptyRow.remove();

        const curDate = new Date().toISOString().slice(0, 10);
        const contasOpts = contas.map(c => `<option value="${c.id}">${c.banco} - ${c.nome}</option>`).join('');

        const tr = document.createElement('tr');
        tr.className = 'inline-add-row bg-surface';
        tr.innerHTML = `
            <td><input type="date" id="inline-rec-data" value="${curDate}"></td>
            <td><input type="text" id="inline-rec-desc" placeholder="Descrição (ex: Salário, Bônus...)" autofocus></td>
            <td><select id="inline-rec-conta">${contasOpts}</select></td>
            <td>
                <select id="inline-rec-cat">
                    <option value="Salário">Salário</option>
                    <option value="Serviços/Freelance">Serviços/Freelance</option>
                    <option value="Dividendos/Rendimentos">Dividendos/Rendimentos</option>
                    <option value="Aluguel Recebido">Aluguel Recebido</option>
                    <option value="Reembolso/Outros">Reembolso/Outros</option>
                </select>
            </td>
            <td>
                <select id="inline-rec-fixo">
                    <option value="true">Receita Fixa</option>
                    <option value="false">Extra / Variável</option>
                </select>
            </td>
            <td><input type="number" id="inline-rec-valor" step="0.01" placeholder="R$ 0,00" class="text-right font-bold emerald-text"></td>
            <td class="text-center">
                <button class="btn btn-success btn-sm" id="btn-save-inline-rec"><i data-lucide="check"></i></button>
            </td>
        `;
        tbody.prepend(tr);
        if (window.lucide) window.lucide.createIcons();

        document.getElementById('btn-save-inline-rec').addEventListener('click', () => {
            const desc = document.getElementById('inline-rec-desc').value.trim();
            const valor = parseFloat(document.getElementById('inline-rec-valor').value);
            if (!desc || isNaN(valor) || valor <= 0) {
                alert('Por favor, informe a descrição e um valor válido.');
                return;
            }
            onSave({
                desc,
                data: document.getElementById('inline-rec-data').value,
                contaId: document.getElementById('inline-rec-conta').value,
                cat: document.getElementById('inline-rec-cat').value,
                fixo: document.getElementById('inline-rec-fixo').value === 'true',
                valor
            });
        });
    },

    /**
     * MÓDULO 3: CARTÕES DE CRÉDITO
     */
    renderCreditCards(cartoes, containerId, onDelete, faturasPorCartao = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!cartoes || cartoes.length === 0) {
            container.innerHTML = `<div class="col-span-2 text-center p-8 text-secondary">Nenhum cartão cadastrado. Clique em "+ Novo Cartão" para começar.</div>`;
            return;
        }

        const colorMap = {
            purple: 'card-theme-purple',
            blue: 'card-theme-blue',
            orange: 'card-theme-orange',
            red: 'card-theme-red',
            emerald: 'card-theme-emerald',
            black: 'card-theme-black'
        };

        container.innerHTML = cartoes.map(card => {
            const fatura = faturasPorCartao[card.id] || { totalGeral: 0, totalPorDono: { 'meu': 0 } };
            const donosList = Object.keys(fatura.totalPorDono).filter(k => fatura.totalPorDono[k] > 0);
            
            let donosHtml = donosList.map(dono => {
                const isMeu = dono === 'meu';
                const label = isMeu ? 'Meu' : dono;
                return `<div style="display:flex; justify-content:space-between; font-size:12px; margin-top:4px;">
                            <span>${label}:</span>
                            <strong>${this.formatCurrency(fatura.totalPorDono[dono])}</strong>
                        </div>`;
            }).join('');
            
            // Se estiver vazio, pelo menos mostre que o total é 0
            if (donosList.length === 0) donosHtml = `<div style="display:flex; justify-content:space-between; font-size:12px; margin-top:4px;"><span>Fatura zerada</span></div>`;

            return `
                <div class="credit-card-item ${colorMap[card.cor] || 'card-theme-purple'}">
                    <div class="cc-header">
                        <span class="cc-name">${card.nome}</span>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-icon btn-sm" style="background: rgba(0,0,0,0.3); border: none; color: white;" onclick="app.editCartao('${card.id}')" title="Editar Cartão">
                                <i data-lucide="edit-2"></i>
                            </button>
                            <button class="btn btn-icon btn-sm" style="background: rgba(0,0,0,0.3); border: none; color: white;" onclick="app.deleteCartao('${card.id}')" title="Excluir Cartão">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </div>
                    <div class="cc-body" style="flex-direction:column; align-items:flex-start;">
                        <div style="font-size: 11px; opacity: 0.8; margin-bottom: 2px;">Fatura Atual</div>
                        <div style="font-size: 20px; font-weight: 700; margin-bottom: 10px;">${this.formatCurrency(fatura.totalGeral)}</div>
                        <div style="width: 100%; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 6px;">
                            ${donosHtml}
                        </div>
                    </div>
                    <div class="cc-footer">
                        <div class="cc-limite">
                            <span>Limite Disponível</span>
                            <strong>${this.formatCurrency(card.limite)}</strong>
                        </div>
                        <div class="cc-datas">
                            <div>Fechamento: dia ${card.fechamento || 5}</div>
                            <div>Vencimento: dia ${card.vencimento || 12}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();
    },

    /**
     * MÓDULO 4: COMPRAS & DESPESAS (ATUALIZADO V2 COM FIXO/VARIÁVEIS)
     */
    renderDespesasTable(despesasFiltradas, cartoes, contas, tbodyId, tfootComprasId, tfootParcelasId, countId, mesReferencia) {
        const tbody = document.getElementById(tbodyId);
        const tfootCompras = document.getElementById(tfootComprasId);
        const tfootParcelas = document.getElementById(tfootParcelasId);
        const countBadge = document.getElementById(countId);
        if (!tbody) return;

        const itens = despesasFiltradas.itens || [];
        if (itens.length === 0) {
            tbody.innerHTML = `
                <tr id="row-empty-despesas">
                    <td colspan="12" class="text-center p-8 text-secondary">Nenhuma despesa ou compra encontrada no período. Clique em "+ Adicionar Compra" para registrar.</td>
                </tr>
            `;
            if (tfootCompras) tfootCompras.textContent = 'R$ 0,00';
            if (tfootParcelas) tfootParcelas.textContent = 'R$ 0,00';
            if (countBadge) countBadge.textContent = '0 registros';
            return;
        }

                        const groups = {};
        itens.forEach(item => {
            const card = cartoes.find(c => c.id === item.cartaoId);
            const conta = contas ? contas.find(c => c.id === item.cartaoId) : null;
            
            let groupName = 'Conta Geral';
            if (card) groupName = `💳 ${card.nome} - Crédito`;
            else if (conta) groupName = `🏛️ ${conta.banco} - ${conta.nome} - Débito`;
            
            if (!groups[groupName]) {
                groups[groupName] = { name: groupName, items: [], total: 0 };
            }
            groups[groupName].items.push(item);
            groups[groupName].total += item.incidencia.valor;
        });

        const sortedGroupNames = Object.keys(groups).sort();

        let finalHtml = '';
        
        sortedGroupNames.forEach(gName => {
            const g = groups[gName];
            
            // Render Group Header
            finalHtml += `
                <tr class="group-header" style="background: rgba(255,255,255,0.05); border-top: 2px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <td colspan="12" style="font-weight: 700; font-size: 1.1rem; padding: 12px 16px; color: var(--text-primary);">
                        ${g.name}
                        <span style="float:right; color: var(--text-secondary); font-size: 1rem; font-weight: 500;">Subtotal: ${this.formatCurrency(g.total)}</span>
                    </td>
                </tr>
            `;

            // Render Items in Group
            finalHtml += g.items.map(item => {
                const inc = item.incidencia;
                const card = cartoes.find(c => c.id === item.cartaoId);
                const conta = contas ? contas.find(c => c.id === item.cartaoId) : null;
                
                // Origem Select
                let origemSelect = `<select class="inline-edit form-input" style="background:transparent; color:white; border:none; border-bottom:1px solid rgba(255,255,255,0.2); width:130px; font-size:14px;" onchange="app.updateExpenseField('${item.id}', 'cartaoId', this.value)">`;
                origemSelect += `<optgroup label="Contas">`;
                contas.forEach(c => {
                    const sel = c.id === item.cartaoId ? 'selected' : '';
                    origemSelect += `<option value="${c.id}" ${sel} style="color:black;">🏛️ ${c.banco} - ${c.nome}</option>`;
                });
                origemSelect += `</optgroup><optgroup label="Cartões">`;
                cartoes.forEach(c => {
                    const sel = c.id === item.cartaoId ? 'selected' : '';
                    origemSelect += `<option value="${c.id}" ${sel} style="color:black;">💳 ${c.nome}</option>`;
                });
                origemSelect += `</optgroup></select>`;

                // Cat Select
                const categorias = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Compras', 'Dívidas', 'Investimentos', 'Outros'];
                let catSelect = `<select class="inline-edit form-input" style="background:transparent; color:white; border:none; border-bottom:1px solid rgba(255,255,255,0.2); width:120px; font-size:14px;" onchange="app.updateExpenseField('${item.id}', 'cat', this.value)">`;
                categorias.forEach(c => {
                    const sel = c === item.cat ? 'selected' : '';
                    catSelect += `<option value="${c}" ${sel} style="color:black;">${c}</option>`;
                });
                catSelect += `</select>`;

                const badgeTipo = item.tipo === 'Parcelado' 
                    ? `<span class="badge badge-warning" style="cursor:pointer;" onclick="app.promptChangeTipo('${item.id}', '${item.tipo}')" title="Clique para alterar"><i data-lucide="layers"></i> ${inc.numeroParcela}/${inc.totalParcelas}x</span>` 
                    : `<span class="badge badge-info" style="cursor:pointer;" onclick="app.promptChangeTipo('${item.id}', '${item.tipo}')" title="Clique para alterar">A vista</span>`;
                
                const badgeNatureza = (item.natureza || 'Variável') === 'Fixo'
                    ? `<span class="badge badge-fixo" style="cursor:pointer;" onclick="app.toggleNatureza('${item.id}')" title="Clique para alternar Fixo/Variável"><i data-lucide="lock"></i> Fixo</span>`
                    : `<span class="badge badge-variavel" style="cursor:pointer;" onclick="app.toggleNatureza('${item.id}')" title="Clique para alternar Fixo/Variável"><i data-lucide="zap"></i> Variável</span>`;

                const rateioObj = item.rateio || (item.dono ? { [item.dono]: 100 } : { 'meu': 100 });
                let badgeDono = `<div style="display:flex; flex-direction:column; gap:2px; cursor:pointer;" onclick="app.openRateioModal('${item.id}')" title="Clique para alterar o rateio">`;
                
                let rateioRsHtml = `<div style="display:flex; flex-direction:column; gap:2px; font-size:11px; text-align:right;">`;
                
                for (const rDono in rateioObj) {
                    const pct = rateioObj[rDono];
                    if (rDono === 'meu') {
                        badgeDono += `<span class="badge" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); font-size:10px;">👤 Meu ${pct}%</span>`;
                    } else {
                        badgeDono += `<span class="badge" style="background: var(--primary-color); color: white; font-size:10px;">👥 ${rDono} ${pct}%</span>`;
                    }
                    
                    const valorCalculado = inc.valor * (pct / 100);
                    const nomeLabel = rDono === 'meu' ? 'Meu' : rDono;
                    rateioRsHtml += `<span>${nomeLabel}: ${this.formatCurrency(valorCalculado)}</span>`;
                }
                badgeDono += `</div>`;
                rateioRsHtml += `</div>`;

                let actionQuitacao = '';
                let statusBadge = '';

                if (item.tipo === 'Parcelado' && item.parcelas > 1) {
                    if (item.quitada && item.mesQuitacao) {
                        statusBadge = `<span class="badge badge-success" title="Parcelas futuras eliminadas!"><i data-lucide="check-circle-2"></i> Quitada em ${item.mesQuitacao}</span>`;
                        actionQuitacao = `<button class="btn btn-outline btn-sm text-xs" onclick="app.desquitarCompra('${item.id}')" title="Desfazer Quitação">Desquitar</button>`;
                    } else {
                        statusBadge = `<span class="badge badge-warning"><i data-lucide="clock"></i> Em aberto</span>`;
                        actionQuitacao = `<button class="btn btn-success btn-sm text-xs" onclick="app.quitarCompra('${item.id}', '${mesReferencia}')" title="Quitar todas as parcelas restantes a partir deste mês!">⚡ Quitar Parcelas</button>`;
                    }
                } else {
                    statusBadge = `<span class="badge" style="background: rgba(255,255,255,0.1);"><i data-lucide="check"></i> Lançado</span>`;
                }

                return `
                    <tr>
                        <td><input type="date" value="${item.data}" class="form-input inline-edit" style="width:130px; font-size:14px; background:transparent; border-bottom:1px solid rgba(255,255,255,0.2); padding:2px;" onchange="app.updateExpenseField('${item.id}', 'data', this.value)"></td>
                        <td><input type="text" value="${item.desc.replace(/"/g, '&quot;')}" class="form-input inline-edit" style="width:100%; min-width:160px; font-size:14px; background:transparent; border-bottom:1px solid rgba(255,255,255,0.2); padding:2px;" onchange="app.updateExpenseField('${item.id}', 'desc', this.value)"></td>
                        <td>${badgeDono}</td>
                        <td>${rateioRsHtml}</td>
                        <td>${origemSelect}</td>
                        <td>${catSelect}</td>
                        <td>${badgeNatureza}</td>
                        <td>${badgeTipo}</td>
                        <td class="text-center">${item.parcelas}</td>
                        <td class="text-right">
                            <div style="display:flex; justify-content:flex-end; align-items:center;">
                                <span>R$</span>
                                <input type="number" step="0.01" value="${item.valorTotal.toFixed(2)}" class="form-input inline-edit" style="width:100px; font-size:15px; text-align:right; background:transparent; border-bottom:1px solid rgba(255,255,255,0.2); padding:2px;" onchange="app.updateExpenseField('${item.id}', 'valorTotal', this.value)">
                            </div>
                        </td>
                        <td class="text-right">${this.formatCurrency(inc.valor)}</td>
                        <td class="text-center">${statusBadge}</td>
                        <td>
                            <div style="display:flex; gap:5px;">
                                ${actionQuitacao}
                                <button class="btn btn-icon btn-sm text-rose-500" onclick="app.deleteCompra('${item.id}')" title="Excluir"><i data-lucide="trash-2"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        });

        tbody.innerHTML = finalHtml;

        if (tfootCompras) tfootCompras.textContent = this.formatCurrency(despesasFiltradas.totalGeral);
        if (tfootParcelas) tfootParcelas.textContent = this.formatCurrency(despesasFiltradas.totalParcelado);
        if (countBadge) countBadge.textContent = `${itens.length} registro${itens.length !== 1 ? 's' : ''}`;
        if (window.lucide) window.lucide.createIcons();
    },

    renderDespesasInlineAddRow(tbodyId, cartoes, contas, onSave) {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        const emptyRow = document.getElementById('row-empty-despesas');
        if (emptyRow) emptyRow.remove();

        const curDate = new Date().toISOString().slice(0, 10);
        let origensOpts = '<optgroup label="Contas & Carteiras">';
        if (contas) contas.forEach(c => origensOpts += `<option value="${c.id}">🏛️ ${c.banco} - ${c.nome}</option>`);
        origensOpts += '</optgroup><optgroup label="Cartões de Crédito">';
        cartoes.forEach(c => origensOpts += `<option value="${c.id}">💳 ${c.nome}</option>`);
        origensOpts += '</optgroup>';

        const tr = document.createElement('tr');
        tr.className = 'inline-add-row bg-surface';
        tr.innerHTML = `
            <td><input type="date" id="inline-data" value="${curDate}"></td>
            <td><input type="text" id="inline-desc" placeholder="Descrição (ex: Jantar, Internet...)" autofocus></td>
            <td><select id="inline-cartao">${origensOpts}</select></td>
            <td>
                <select id="inline-cat">
                    <option value="Alimentação">Alimentação</option>
                    <option value="Moradia">Moradia</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Lazer">Lazer</option>
                    <option value="Saúde">Saúde</option>
                    <option value="Educação">Educação</option>
                    <option value="Outros">Outros</option>
                </select>
            </td>
            <td>
                <select id="inline-natureza">
                    <option value="Variável">Variável</option>
                    <option value="Fixo">Fixo</option>
                </select>
            </td>
            <td>
                <select id="inline-tipo">
                    <option value="A vista">A vista</option>
                    <option value="Parcelado">Parcelado</option>
                </select>
            </td>
            <td><input type="number" id="inline-parcelas" min="1" max="72" value="1" class="text-center" style="width: 60px;"></td>
            <td class="text-right"><input type="number" id="inline-valor" step="0.01" placeholder="0.00" class="text-right font-bold rose-text"></td>
            <td class="text-right text-muted">-</td>
            <td class="text-center text-xs text-secondary">Novo</td>
            <td class="text-center">
                <button class="btn btn-success btn-sm" id="btn-save-inline"><i data-lucide="check"></i></button>
            </td>
        `;
        tbody.prepend(tr);
        if (window.lucide) window.lucide.createIcons();

        document.getElementById('btn-save-inline').addEventListener('click', () => {
            const desc = document.getElementById('inline-desc').value.trim();
            const valor = parseFloat(document.getElementById('inline-valor').value);
            if (!desc || isNaN(valor) || valor <= 0) {
                alert('Por favor, informe a descrição e o valor da compra.');
                return;
            }
            onSave({
                desc,
                data: document.getElementById('inline-data').value,
                cartaoId: document.getElementById('inline-cartao').value,
                cat: document.getElementById('inline-cat').value,
                natureza: document.getElementById('inline-natureza').value,
                tipo: document.getElementById('inline-tipo').value,
                parcelas: parseInt(document.getElementById('inline-parcelas').value) || 1,
                valorTotal: valor
            });
        });
    },

    /**
     * MÓDULO 5: INVESTIMENTOS
     */
    renderInvestimentosTable(investimentos, tbodyId, tfootInvId, tfootRendId, countId, simTaxa) {
        const tbody = document.getElementById(tbodyId);
        const tfootInv = document.getElementById(tfootInvId);
        const tfootRend = document.getElementById(tfootRendId);
        const countBadge = document.getElementById(countId);
        if (!tbody) return;

        let totalInv = 0;
        let totalRend = 0;

        if (!investimentos || investimentos.length === 0) {
            tbody.innerHTML = `
                <tr id="row-empty-investimentos">
                    <td colspan="7" class="text-center p-8 text-secondary">Nenhum ativo ou investimento cadastrado na carteira.</td>
                </tr>
            `;
            if (tfootInv) tfootInv.textContent = 'R$ 0,00';
            if (tfootRend) tfootRend.textContent = 'R$ 0,00/mês';
            if (countBadge) countBadge.textContent = '0 ativos';
            return;
        }

        tbody.innerHTML = investimentos.map(inv => {
            totalInv += inv.valor;
            const taxa = (inv.taxa !== undefined ? inv.taxa : simTaxa);
            const rendMensal = inv.valor * (taxa / 100);
            totalRend += rendMensal;

            return `
                <tr id="row-inv-${inv.id}">
                    <td>${this.formatDate(inv.data)}</td>
                    <td class="font-semibold text-primary">${inv.nome}</td>
                    <td><span class="badge badge-violet"><i data-lucide="shield-check"></i> ${inv.tipo}</span></td>
                    <td class="text-right">${taxa.toFixed(2)}% a.m.</td>
                    <td class="text-right font-bold violet-text">${this.formatCurrency(inv.valor)}</td>
                    <td class="text-right font-bold emerald-text">+ ${this.formatCurrency(rendMensal)} / mês</td>
                    <td class="text-center">
                        <button class="btn btn-icon btn-sm text-danger" onclick="app.deleteInvestimento('${inv.id}')" title="Excluir Ativo">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        if (tfootInv) tfootInv.textContent = this.formatCurrency(totalInv);
        if (tfootRend) tfootRend.textContent = `+ ${this.formatCurrency(totalRend)} / mês`;
        if (countBadge) countBadge.textContent = `${investimentos.length} ativo${investimentos.length !== 1 ? 's' : ''}`;
        if (window.lucide) window.lucide.createIcons();
    },

    renderInvestimentosInlineAddRow(tbodyId, onSave) {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        const emptyRow = document.getElementById('row-empty-investimentos');
        if (emptyRow) emptyRow.remove();

        const curDate = new Date().toISOString().slice(0, 10);
        const tr = document.createElement('tr');
        tr.className = 'inline-add-row bg-surface';
        tr.innerHTML = `
            <td><input type="date" id="inline-inv-data" value="${curDate}"></td>
            <td><input type="text" id="inline-inv-nome" placeholder="Ativo (ex: CDB, Tesouro, FII...)" autofocus></td>
            <td>
                <select id="inline-inv-tipo">
                    <option value="Renda Fixa (CDB/Tesouro/LCI)">Renda Fixa</option>
                    <option value="Fundo Imobiliário (FII)">Fundo Imobiliário</option>
                    <option value="Ações / Renda Variável">Ações / Renda Variável</option>
                    <option value="Criptomoedas">Criptomoedas</option>
                    <option value="Reserva de Emergência">Reserva</option>
                </select>
            </td>
            <td class="text-right"><input type="number" id="inline-inv-taxa" step="0.01" value="0.85" class="text-right" style="width: 80px;"></td>
            <td class="text-right"><input type="number" id="inline-inv-valor" step="0.01" placeholder="0.00" class="text-right font-bold violet-text"></td>
            <td class="text-right text-muted">-</td>
            <td class="text-center">
                <button class="btn btn-success btn-sm" id="btn-save-inline-inv"><i data-lucide="check"></i></button>
            </td>
        `;
        tbody.prepend(tr);
        if (window.lucide) window.lucide.createIcons();

        document.getElementById('btn-save-inline-inv').addEventListener('click', () => {
            const nome = document.getElementById('inline-inv-nome').value.trim();
            const valor = parseFloat(document.getElementById('inline-inv-valor').value);
            if (!nome || isNaN(valor) || valor <= 0) {
                alert('Por favor, informe o nome do ativo e o valor investido.');
                return;
            }
            onSave({
                nome,
                data: document.getElementById('inline-inv-data').value,
                tipo: document.getElementById('inline-inv-tipo').value,
                taxa: parseFloat(document.getElementById('inline-inv-taxa').value) || 0.85,
                valor
            });
        });
    },

    /**
     * MÓDULO 6: BENEFÍCIOS VA / VR
     */
    renderVaVrTable(gastos, tbodyId, tfootId, countId) {
        const tbody = document.getElementById(tbodyId);
        const tfoot = document.getElementById(tfootId);
        const countBadge = document.getElementById(countId);
        if (!tbody) return;

        let total = 0;
        if (!gastos || gastos.length === 0) {
            tbody.innerHTML = `
                <tr id="row-empty-vavr">
                    <td colspan="6" class="text-center p-8 text-secondary">Nenhum gasto com benefício registrado neste mês.</td>
                </tr>
            `;
            if (tfoot) tfoot.textContent = 'R$ 0,00';
            if (countBadge) countBadge.textContent = '0 gastos';
            return;
        }

        tbody.innerHTML = gastos.map(g => {
            total += g.valor;
            const badgeBeneficio = g.beneficio === 'VA' 
                ? `<span class="badge badge-cyan"><i data-lucide="shopping-cart"></i> Vale Alimentação (VA)</span>`
                : `<span class="badge badge-warning"><i data-lucide="utensils"></i> Vale Refeição (VR)</span>`;

            return `
                <tr id="row-vavr-${g.id}">
                    <td>${this.formatDate(g.data)}</td>
                    <td class="font-semibold text-primary">${g.desc}</td>
                    <td>${badgeBeneficio}</td>
                    <td>${g.cat || 'Alimentação'}</td>
                    <td class="text-right font-bold cyan-text text-base">${this.formatCurrency(g.valor)}</td>
                    <td class="text-center">
                        <button class="btn btn-icon btn-sm text-danger" onclick="app.deleteVaVr('${g.id}')" title="Excluir Gasto">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        if (tfoot) tfoot.textContent = this.formatCurrency(total);
        if (countBadge) countBadge.textContent = `${gastos.length} gasto${gastos.length !== 1 ? 's' : ''}`;
        if (window.lucide) window.lucide.createIcons();
    },

    renderVaVrInlineAddRow(tbodyId, onSave) {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        const emptyRow = document.getElementById('row-empty-vavr');
        if (emptyRow) emptyRow.remove();

        const curDate = new Date().toISOString().slice(0, 10);
        const tr = document.createElement('tr');
        tr.className = 'inline-add-row bg-surface';
        tr.innerHTML = `
            <td><input type="date" id="inline-vavr-data" value="${curDate}"></td>
            <td><input type="text" id="inline-vavr-desc" placeholder="Estabelecimento (ex: Carrefour, Outback...)" autofocus></td>
            <td>
                <select id="inline-vavr-beneficio">
                    <option value="VA">Vale Alimentação (VA)</option>
                    <option value="VR">Vale Refeição (VR)</option>
                </select>
            </td>
            <td>
                <select id="inline-vavr-cat">
                    <option value="Alimentação / Supermercado">Alimentação / Supermercado</option>
                    <option value="Restaurante / Almoço">Restaurante / Almoço</option>
                    <option value="Lanche / Café">Lanche / Café</option>
                    <option value="Açougue / Hortifruti">Açougue / Hortifruti</option>
                </select>
            </td>
            <td class="text-right"><input type="number" id="inline-vavr-valor" step="0.01" placeholder="0.00" class="text-right font-bold cyan-text"></td>
            <td class="text-center">
                <button class="btn btn-success btn-sm" id="btn-save-inline-vavr"><i data-lucide="check"></i></button>
            </td>
        `;
        tbody.prepend(tr);
        if (window.lucide) window.lucide.createIcons();

        document.getElementById('btn-save-inline-vavr').addEventListener('click', () => {
            const desc = document.getElementById('inline-vavr-desc').value.trim();
            const valor = parseFloat(document.getElementById('inline-vavr-valor').value);
            if (!desc || isNaN(valor) || valor <= 0) {
                alert('Por favor, informe o estabelecimento e o valor gasto.');
                return;
            }
            onSave({
                desc,
                data: document.getElementById('inline-vavr-data').value,
                beneficio: document.getElementById('inline-vavr-beneficio').value,
                cat: document.getElementById('inline-vavr-cat').value,
                valor
            });
        });
    }
};
