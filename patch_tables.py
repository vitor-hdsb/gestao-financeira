import os

with open('js/components/tables.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the body of renderDespesasTable
# Let's find where the map starts: tbody.innerHTML = itens.map(item => {
# and replace the whole map.
start_idx = code.find('tbody.innerHTML = itens.map(item => {')
end_idx = code.find('}).join(\'\');', start_idx) + 12

new_map = """        tbody.innerHTML = itens.map(item => {
            const inc = item.incidencia;
            const card = cartoes.find(c => c.id === item.cartaoId);
            const conta = contas ? contas.find(c => c.id === item.cartaoId) : null;
            
            // Origem Select
            let origemSelect = `<select class="inline-edit form-select-sm" style="background:transparent; color:white; border:none; border-bottom:1px solid rgba(255,255,255,0.2);" onchange="app.updateExpenseField('${item.id}', 'cartaoId', this.value)">`;
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
            let catSelect = `<select class="inline-edit form-select-sm" style="background:transparent; color:white; border:none; border-bottom:1px solid rgba(255,255,255,0.2);" onchange="app.updateExpenseField('${item.id}', 'cat', this.value)">`;
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
                
                // Calcula e formata R$
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
                    <td><input type="date" value="${item.data}" class="form-input form-input-sm inline-edit" style="width:110px; background:transparent; border-bottom:1px solid rgba(255,255,255,0.2); padding:2px;" onchange="app.updateExpenseField('${item.id}', 'data', this.value)"></td>
                    <td><input type="text" value="${item.desc.replace(/"/g, '&quot;')}" class="form-input form-input-sm inline-edit" style="width:100%; min-width:120px; background:transparent; border-bottom:1px solid rgba(255,255,255,0.2); padding:2px;" onchange="app.updateExpenseField('${item.id}', 'desc', this.value)"></td>
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
                            <input type="number" step="0.01" value="${item.valorTotal.toFixed(2)}" class="form-input form-input-sm inline-edit" style="width:70px; text-align:right; background:transparent; border-bottom:1px solid rgba(255,255,255,0.2); padding:2px;" onchange="app.updateExpenseField('${item.id}', 'valorTotal', this.value)">
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
        }).join('');"""

code = code[:start_idx] + new_map + code[end_idx:]

# We need to change the column span of the empty message row from 11 to 12
code = code.replace('<td colspan="11" class="text-center p-8 text-secondary">Nenhuma despesa ou compra', '<td colspan="12" class="text-center p-8 text-secondary">Nenhuma despesa ou compra')

with open('js/components/tables.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done tables.js")
