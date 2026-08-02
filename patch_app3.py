import os

with open('js/app.js', 'r', encoding='utf-8') as f:
    code = f.read()

new_methods = """
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
"""

code = code.replace("    updateDespesasTableOnly() {", new_methods + "\n    updateDespesasTableOnly() {")

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done app.js inline methods")
