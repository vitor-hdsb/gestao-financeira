import re

# 1. Update index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

lines = html.split('\n')
for i, line in enumerate(lines):
    if '<div id="modal-cartao"' in line:
        # inject id
        for j in range(i, i+10):
            if '<div class="form-grid">' in lines[j] and 'modal-cartao-id' not in ''.join(lines[i:j+5]):
                lines.insert(j+1, '                <input type="hidden" id="modal-cartao-id">')
                break
    if '<div id="modal-conta"' in line:
        for j in range(i, i+10):
            if '<div class="form-grid">' in lines[j] and 'modal-conta-id' not in ''.join(lines[i:j+5]):
                lines.insert(j+1, '                <input type="hidden" id="modal-conta-id">')
                break

with open('index.html', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))


# 2. Update tables.js
with open('js/components/tables.js', 'r', encoding='utf-8') as f:
    tables = f.read()

contas_btn = r'''                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-icon btn-sm" style="background: rgba(0,0,0,0.3); border: none; color: white;" onclick="app.editConta('${c.id}')" title="Editar Conta">
                                <i data-lucide="edit-2"></i>
                            </button>
                            <button class="btn btn-icon btn-sm" style="background: rgba(0,0,0,0.3); border: none; color: white;" onclick="app.deleteConta('${c.id}')" title="Excluir Conta">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>'''

tables = re.sub(
    r'</div>\s*<button class="btn btn-icon btn-sm"[^>]+onclick="app\.deleteConta\(\'\$\{c\.id\}\'\)"[^>]+>\s*<i data-lucide="trash-2"></i>\s*</button>',
    contas_btn,
    tables
)

cartoes_btn = r'''                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-icon btn-sm" style="background: rgba(0,0,0,0.3); border: none; color: white;" onclick="app.editCartao('${c.id}')" title="Editar Cartão">
                                <i data-lucide="edit-2"></i>
                            </button>
                            <button class="btn btn-icon btn-sm" style="background: rgba(0,0,0,0.3); border: none; color: white;" onclick="app.deleteCartao('${c.id}')" title="Excluir Cartão">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>'''

tables = re.sub(
    r'</div>\s*<button class="btn btn-icon btn-sm"[^>]+onclick="app\.deleteCartao\(\'\$\{c\.id\}\'\)"[^>]+>\s*<i data-lucide="trash-2"></i>\s*</button>',
    cartoes_btn,
    tables
)

with open('js/components/tables.js', 'w', encoding='utf-8') as f:
    f.write(tables)

# 3. Update app.js
with open('js/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

if 'editConta(' not in app_js:
    methods_to_add = r'''
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
        document.getElementById('modal-cartao-bandeira').value = cartao.bandeira;
        document.getElementById('modal-cartao-limite').value = cartao.limite;
        document.getElementById('modal-cartao-vencimento').value = cartao.diaVencimento;
        document.getElementById('modal-cartao-cor').value = cartao.cor;
        this.openModal('modal-cartao');
    }
'''
    app_js = re.sub(r'deleteConta\(id\)\s*\{', methods_to_add + '\n    deleteConta(id) {', app_js)

# Update saveContaFromModal
save_conta_new = r'''saveContaFromModal() {
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
    }'''

app_js = re.sub(r'saveContaFromModal\(\)\s*\{[\s\S]*?this\.closeModal\(\'modal-conta\'\);\s*\}', save_conta_new, app_js)

# Update saveCartaoFromModal
save_cartao_new = r'''saveCartaoFromModal() {
        const idInput = document.getElementById('modal-cartao-id').value;
        const nome = document.getElementById('modal-cartao-nome').value.trim();
        const bandeira = document.getElementById('modal-cartao-bandeira').value.trim();
        const limite = parseFloat(document.getElementById('modal-cartao-limite').value) || 0;
        const vencimento = parseInt(document.getElementById('modal-cartao-vencimento').value) || 10;
        const cor = document.getElementById('modal-cartao-cor').value;

        if (!nome || !bandeira) {
            alert('Preencha Nome e Bandeira.');
            return;
        }

        if (idInput) {
            state.updateCartao(idInput, { nome, bandeira, limite, diaVencimento: vencimento, cor });
        } else {
            state.addCartao({
                id: 'card_' + Date.now(),
                nome,
                bandeira,
                limite,
                diaVencimento: vencimento,
                cor
            });
        }
        this.closeModal('modal-cartao');
    }'''

app_js = re.sub(r'saveCartaoFromModal\(\)\s*\{[\s\S]*?this\.closeModal\(\'modal-cartao\'\);\s*\}', save_cartao_new, app_js)

# Clear hidden inputs when closing modal
app_js = re.sub(
    r'(closeModal\(modalId\)\s*\{)',
    r"\1\n        if (modalId === 'modal-conta') { document.getElementById('modal-conta-id').value = ''; document.getElementById('modal-conta-nome').value = ''; document.getElementById('modal-conta-banco').value = ''; document.getElementById('modal-conta-saldo').value = ''; }\n        if (modalId === 'modal-cartao') { document.getElementById('modal-cartao-id').value = ''; document.getElementById('modal-cartao-nome').value = ''; document.getElementById('modal-cartao-bandeira').value = ''; document.getElementById('modal-cartao-limite').value = ''; document.getElementById('modal-cartao-vencimento').value = ''; }",
    app_js
)


with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

# 4. Update state.js
with open('js/state.js', 'r', encoding='utf-8') as f:
    state_js = f.read()

if 'updateConta(' not in state_js:
    state_methods_to_add = r'''
    updateConta(id, updates) {
        const idx = this.data.contas.findIndex(c => c.id === id);
        if (idx !== -1) {
            this.data.contas[idx] = { ...this.data.contas[idx], ...updates };
            this.save();
        }
    }

    updateCartao(id, updates) {
        const idx = this.data.cartoes.findIndex(c => c.id === id);
        if (idx !== -1) {
            this.data.cartoes[idx] = { ...this.data.cartoes[idx], ...updates };
            this.save();
        }
    }
'''
    state_js = re.sub(r'deleteConta\(id\)\s*\{', state_methods_to_add + '\n    deleteConta(id) {', state_js)

with open('js/state.js', 'w', encoding='utf-8') as f:
    f.write(state_js)

print("Patch applied")
