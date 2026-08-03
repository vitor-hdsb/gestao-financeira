import os

with open('index.html', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace va-carga
code = code.replace(
    '<div class="stat-box"><span class="stat-label">Carga</span><strong id="va-carga">R$ 0,00</strong></div>',
    '<div class="stat-box"><span class="stat-label">Carga</span><strong id="va-carga" style="cursor:pointer; text-decoration: underline dashed rgba(255,255,255,0.4);" onclick="app.promptChangeCarga(\'VA\')" title="Editar Carga do VA">R$ 0,00</strong></div>'
)

# Replace vr-carga
code = code.replace(
    '<div class="stat-box"><span class="stat-label">Carga</span><strong id="vr-carga">R$ 0,00</strong></div>',
    '<div class="stat-box"><span class="stat-label">Carga</span><strong id="vr-carga" style="cursor:pointer; text-decoration: underline dashed rgba(255,255,255,0.4);" onclick="app.promptChangeCarga(\'VR\')" title="Editar Carga do VR">R$ 0,00</strong></div>'
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(code)

with open('js/app.js', 'r', encoding='utf-8') as f:
    app_code = f.read()

new_method = """
    promptChangeCarga(tipo) {
        const currentCarga = tipo === 'VA' ? state.data.beneficios.vaCarga : state.data.beneficios.vrCarga;
        const newCargaStr = prompt(`Informe o novo valor de Carga mensal para o ${tipo}:`, currentCarga);
        if (newCargaStr !== null) {
            const newCarga = parseFloat(newCargaStr.replace(',', '.'));
            if (!isNaN(newCarga) && newCarga >= 0) {
                if (tipo === 'VA') state.data.beneficios.vaCarga = newCarga;
                if (tipo === 'VR') state.data.beneficios.vrCarga = newCarga;
                state.save();
                this.updateDashboard();
            }
        }
    }
"""

app_code = app_code.replace('    promptChangeTipo(id, currentTipo) {', new_method + '\n    promptChangeTipo(id, currentTipo) {')

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(app_code)

print("Done patching edit carga")
