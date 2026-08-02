import os

with open('index.html', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update max-width of modal-rateio
code = code.replace('<div id="modal-rateio" class="modal-overlay" style="z-index: 1050;">\n        <div class="modal-card glass" style="max-width:500px;">', '<div id="modal-rateio" class="modal-overlay" style="z-index: 1050;">\n        <div class="modal-card glass" style="max-width:600px;">')

# 2. Add Rateio (R$) column header
old_headers = """                                    <th>Descrição</th>
                                    <th>Dono</th>
                                    <th>Origem</th>"""
new_headers = """                                    <th>Descrição</th>
                                    <th>Dono (%)</th>
                                    <th style="text-align:right">Rateio (R$)</th>
                                    <th>Origem</th>"""
code = code.replace(old_headers, new_headers)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done index.html")
