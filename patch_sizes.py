import os

with open('index.html', 'r', encoding='utf-8') as f:
    code = f.read()

# Change rateio-container from flex-direction:column to grid
old_rateio = '<div id="rateio-container" style="display:flex; flex-direction:column; gap:10px; margin-bottom:15px; max-height: 250px; overflow-y: auto;">'
new_rateio = '<div id="rateio-container" style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:15px; max-height: 300px; overflow-y: auto;">'
code = code.replace(old_rateio, new_rateio)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(code)

with open('js/app.js', 'r', encoding='utf-8') as f:
    app_code = f.read()

# Change form-input-sm to just form-input in rateio modal
app_code = app_code.replace('<input type="number" id="rateio-input-${p}" class="form-input form-input-sm" style="width:70px;', '<input type="number" id="rateio-input-${p}" class="form-input" style="width:90px;')
# Make font bigger in modal
app_code = app_code.replace('<span>${nameLabel}</span>', '<span style="font-size: 1.1rem; font-weight: 500;">${nameLabel}</span>')

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(app_code)

with open('js/components/tables.js', 'r', encoding='utf-8') as f:
    tables_code = f.read()

# Remove form-input-sm from tables
tables_code = tables_code.replace('form-input-sm inline-edit', 'form-input inline-edit')
tables_code = tables_code.replace('form-select-sm', '')
# Ensure inputs inherit font sizes if needed, or explicitly give them a style
tables_code = tables_code.replace('style="width:110px;', 'style="width:130px; font-size:14px;')
tables_code = tables_code.replace('style="width:100%; min-width:120px;', 'style="width:100%; min-width:160px; font-size:14px;')
tables_code = tables_code.replace('style="width:70px;', 'style="width:100px; font-size:15px;')

with open('js/components/tables.js', 'w', encoding='utf-8') as f:
    f.write(tables_code)

print("Done all sizes")
