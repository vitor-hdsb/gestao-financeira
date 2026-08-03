import re

with open('js/state.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update loadFromStorage
load_old = '''    loadFromStorage() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return { ...defaultState, ...parsed };
            }'''
load_new = '''    loadFromStorage() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.despesas) {
                    parsed.despesas.forEach(d => {
                        if (d.natureza === undefined) d.natureza = d.fixo ? 'fixo_absoluto' : 'variavel';
                        if (d.valoresMensais === undefined) d.valoresMensais = {};
                    });
                }
                return { ...defaultState, ...parsed };
            }'''
if 'parsed.despesas.forEach' not in code:
    code = code.replace(load_old, load_new)

# 2. Update addCompra
add_old = '''        this.data.despesas.push({
            id: newId,
            desc: compra.desc,
            data: compra.data,
            cartaoId: compra.cartaoId, // Pode ser ID de um cartão ou ID de uma conta corrente/carteira
            cat: compra.cat || 'Outros',
            fixo: compra.fixo || false,
            tipo: compra.tipo,
            rateio: compra.rateio || { 'meu': 100 },
            parcelas,
            valorTotal,
            valorParcela,
            quitada: false
        });'''
add_new = '''        this.data.despesas.push({
            id: newId,
            desc: compra.desc,
            data: compra.data,
            cartaoId: compra.cartaoId, // Pode ser ID de um cartão ou ID de uma conta corrente/carteira
            cat: compra.cat || 'Outros',
            natureza: compra.natureza || 'variavel',
            tipo: compra.tipo,
            rateio: compra.rateio || { 'meu': 100 },
            parcelas,
            valorTotal,
            valorParcela,
            quitada: false,
            valoresMensais: {}
        });'''
if 'natureza: compra.natureza' not in code:
    code = code.replace(add_old, add_new)

# 3. Add updateCompraValorMensal
update_mensal = '''
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
'''
if 'updateCompraValorMensal(' not in code:
    code = code.replace('    updateCompra(id, updatedFields) {', update_mensal + '\n    updateCompra(id, updatedFields) {')

with open('js/state.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("state patched")
