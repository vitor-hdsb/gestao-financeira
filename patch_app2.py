import os

with open('js/app.js', 'r', encoding='utf-8') as f:
    code = f.read()

open_old = """    openRateioModal(idx = null) {
        this.rateioTargetIdx = idx;
        let rateioObj = { 'meu': 100 };
        
        if (idx === null) {
            rateioObj = window.__currentRateio || { 'meu': 100 };
        } else {
            rateioObj = window.__tempEnrichedCsv[idx].rateio || { 'meu': 100 };
        }"""
open_new = """    openRateioModal(idxOrId = null) {
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
        }"""
code = code.replace(open_old, open_new)

save_old = """        if (this.rateioTargetIdx === null) {
            window.__currentRateio = newRateio;
            this.updateRateioBadge('modal-compra-rateio-badge', newRateio);
        } else {
            window.__tempEnrichedCsv[this.rateioTargetIdx].rateio = newRateio;
            this.updateRateioBadge(`csv-rateio-badge-${this.rateioTargetIdx}`, newRateio);
        }
        
        this.closeModal('modal-rateio');"""
save_new = """        if (this.rateioTargetIdx === null) {
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
        
        this.closeModal('modal-rateio');"""
code = code.replace(save_old, save_new)

add_listeners_old = """        document.getElementById('btn-save-rateio')?.addEventListener('click', () => {
            this.saveRateioFromModal();
        });"""
add_listeners_new = """        document.getElementById('btn-save-rateio')?.addEventListener('click', () => {
            this.saveRateioFromModal();
        });

        document.getElementById('btn-add-pessoa-rateio')?.addEventListener('click', () => {
            const input = document.getElementById('new-pessoa-rateio-input');
            const nome = input?.value.trim();
            if (nome) {
                state.addPessoa(state.data.config.mesAtual, nome);
                input.value = '';
                
                // Salvar inputs atuais para não perder o preenchimento
                const tempRateio = {};
                const pessoas = ['meu', ...state.getPessoas(state.data.config.mesAtual)];
                pessoas.forEach(p => {
                    const el = document.getElementById(`rateio-input-${p}`);
                    if (el) tempRateio[p] = parseFloat(el.value) || 0;
                });
                
                window.__tempRateioInputs = tempRateio;
                window.__tempRateioTargetIdx = this.rateioTargetIdx;
                this.openRateioModal('TEMP_REFRESH');
            }
        });"""
code = code.replace(add_listeners_old, add_listeners_new)

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(code)
print("Done app.js")
