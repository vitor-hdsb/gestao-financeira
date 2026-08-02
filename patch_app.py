import os

with open('js/app.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update populateModalSelects - remove selCompraDono
code = code.replace("""        const selCompraDono = document.getElementById('modal-compra-dono');
        if (selCompraDono) {
            const curValDono = selCompraDono.value;
            const pessoas = state.getPessoas(state.data.config.mesAtual);
            let optsDono = `<option value="meu">Meu (Padrão)</option>`;
            pessoas.forEach(p => {
                optsDono += `<option value="${p}">${p}</option>`;
            });
            selCompraDono.innerHTML = optsDono;
            if (curValDono) selCompraDono.value = curValDono;
        }""", "")

# 2. Add openRateioModal to the class
add_rateio_methods = """
    openRateioModal(idx = null) {
        this.rateioTargetIdx = idx;
        let rateioObj = { 'meu': 100 };
        
        if (idx === null) {
            rateioObj = window.__currentRateio || { 'meu': 100 };
        } else {
            rateioObj = window.__tempEnrichedCsv[idx].rateio || { 'meu': 100 };
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
                    <span>${nameLabel}</span>
                    <div style="display:flex; align-items:center; gap:5px;">
                        <input type="number" id="rateio-input-${p}" class="form-input form-input-sm" style="width:70px; text-align:right;" min="0" max="100" value="${pct}">
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
"""

code = code.replace("    updateDashboard(data) {", add_rateio_methods + "\n    updateDashboard(data) {")

# 3. Handle btn-save-rateio inside setupEventListeners()
rateio_listeners = """
        document.getElementById('btn-save-rateio')?.addEventListener('click', () => {
            this.saveRateioFromModal();
        });
        document.querySelector('[onclick="app.openModal(\\'modal-compra\\')"]')?.addEventListener('click', () => {
            window.__currentRateio = { 'meu': 100 };
            this.updateRateioBadge('modal-compra-rateio-badge', window.__currentRateio);
        });
"""
code = code.replace("        document.getElementById('btn-add-pessoa')", rateio_listeners + "\n        document.getElementById('btn-add-pessoa')")

# 4. update saveCompraFromModal to use window.__currentRateio
save_compra_repl = """
        const tipo = document.getElementById('modal-compra-tipo').value;
        const dono = document.getElementById('modal-compra-dono')?.value || 'meu';
        const parcelas = parseInt(document.getElementById('modal-compra-parcelas').value) || 1;
        const valorTotal = parseFloat(document.getElementById('modal-compra-valor').value) || 0;

        if (!desc || !data || valorTotal <= 0) {
            alert('Preencha os campos obrigatórios.');
            return;
        }

        state.addCompra({ desc, data, cartaoId, cat, natureza, tipo, dono, parcelas, valorTotal });
"""
save_compra_new = """
        const tipo = document.getElementById('modal-compra-tipo').value;
        const rateio = window.__currentRateio || { 'meu': 100 };
        const parcelas = parseInt(document.getElementById('modal-compra-parcelas').value) || 1;
        const valorTotal = parseFloat(document.getElementById('modal-compra-valor').value) || 0;

        if (!desc || !data || valorTotal <= 0) {
            alert('Preencha os campos obrigatórios.');
            return;
        }

        state.addCompra({ desc, data, cartaoId, cat, natureza, tipo, rateio, parcelas, valorTotal });
"""
code = code.replace(save_compra_repl, save_compra_new)

# 5. Update renderImportReviewTable
render_review_old = """
        const pessoas = state.getPessoas(state.data.config.mesAtual);
        let optsBase = `<option value="meu">Meu (Padrão)</option>`;
        pessoas.forEach(p => optsBase += `<option value="${p}">${p}</option>`);

        tbody.innerHTML = items.map(item => {
            // Se for crédito (ganho) a gente pode ignorar dono, mas mantemos o select desabilitado ou fixo
            const disabled = item.type === 'credito' ? 'disabled' : '';
            return `
                <tr>
                    <td>${item.date}</td>
                    <td>${item.description}</td>
                    <td class="${item.type === 'credito' ? 'text-success' : 'rose-text'}">
                        ${item.type === 'credito' ? '+' : '-'} R$ ${item.amount.toFixed(2).replace('.', ',')}
                    </td>
                    <td>
                        <select id="review-dono-${item.idx}" class="form-select-sm" ${disabled}>
                            ${optsBase}
                        </select>
                    </td>
                </tr>
            `;
        }).join('');
"""
render_review_new = """
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
"""
code = code.replace(render_review_old, render_review_new)

# 6. Replace btn-confirm-review listener
btn_confirm_old = """
        document.getElementById('btn-confirm-review')?.addEventListener('click', () => {
            const enriched = window.__tempEnrichedCsv || [];
            
            // Read selected owners
            enriched.forEach(item => {
                const sel = document.getElementById(`review-dono-${item.idx}`);
                if (sel) {
                    item.dono = sel.value;
                }
            });

            state.addTransactionsFromImport(enriched);
"""
btn_confirm_new = """
        document.getElementById('btn-confirm-review')?.addEventListener('click', () => {
            const enriched = window.__tempEnrichedCsv || [];
            
            state.addTransactionsFromImport(enriched);
"""
code = code.replace(btn_confirm_old, btn_confirm_new)

# 7. Add initialization of currentRateio in init
init_old = """
        this.populateMonthSelector();
        this.populateModalSelects();
"""
init_new = """
        this.populateMonthSelector();
        this.populateModalSelects();
        window.__currentRateio = { 'meu': 100 };
"""
code = code.replace(init_old, init_new)

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done")
