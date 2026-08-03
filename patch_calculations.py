import re

with open('js/calculations.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace getIncidenciaDespesaNoMes completely
get_inc_old_match = re.search(r'    getIncidenciaDespesaNoMes.*?return null;\s*\}\s*,', code, re.DOTALL)
if get_inc_old_match:
    get_inc_old = get_inc_old_match.group(0)

    get_inc_new = '''    _getValorHistorico(despesa, targetMes) {
        if (despesa.valoresMensais && despesa.valoresMensais[targetMes] !== undefined) {
            return despesa.valoresMensais[targetMes];
        }
        if (despesa.natureza === 'fixo_absoluto') return despesa.valorTotal;
        
        // fixo_variavel
        const mesCompra = despesa.data.slice(0, 7);
        const [anoC, mesC] = mesCompra.split('-').map(Number);
        const [anoR, mesR] = targetMes.split('-').map(Number);
        const diffMeses = (anoR - anoC) * 12 + (mesR - mesC);
        
        if (diffMeses <= 0) return despesa.valorTotal;
        
        let sum = 0;
        let count = 0;
        for (let i = 1; i <= 3; i++) {
            if (diffMeses - i >= 0) {
                const pastMes = this.getOffsetMonth(targetMes, -i);
                sum += this._getValorHistorico(despesa, pastMes);
                count++;
            }
        }
        return count > 0 ? sum / count : despesa.valorTotal;
    },

    getIncidenciaDespesaNoMes(despesa, mesReferencia) {
        const mesCompra = despesa.data.slice(0, 7);
        const [anoC, mesC] = mesCompra.split('-').map(Number);
        const [anoR, mesR] = mesReferencia.split('-').map(Number);

        const diffMeses = (anoR - anoC) * 12 + (mesR - mesC);

        if (diffMeses < 0) return null;
        
        const isRecorrente = despesa.natureza === 'fixo_absoluto' || despesa.natureza === 'fixo_variavel';

        if (isRecorrente) {
            return {
                ativa: true,
                numeroParcela: diffMeses + 1,
                totalParcelas: 999,
                valor: this._getValorHistorico(despesa, mesReferencia),
                quitadaNoMes: false
            };
        }

        if (despesa.tipo === 'A vista' || despesa.parcelas <= 1) {
            if (diffMeses === 0) {
                return {
                    ativa: true,
                    numeroParcela: 1,
                    totalParcelas: 1,
                    valor: despesa.valorTotal,
                    quitadaNoMes: false
                };
            }
            return null;
        }

        if (diffMeses >= 0 && diffMeses < despesa.parcelas) {
            const numeroParcela = diffMeses + 1;
            let eliminadaPorQuitacao = false;
            if (despesa.quitada && despesa.mesQuitacao) {
                const [anoQ, mesQ] = despesa.mesQuitacao.split('-').map(Number);
                const diffQuitacao = (anoR - anoQ) * 12 + (mesR - mesQ);
                if (diffQuitacao > 0) eliminadaPorQuitacao = true;
            }
            if (eliminadaPorQuitacao) return null;
            return {
                ativa: true,
                numeroParcela: numeroParcela,
                totalParcelas: despesa.parcelas,
                valor: despesa.valorParcela,
                quitadaNoMes: despesa.quitada && despesa.mesQuitacao === mesReferencia
            };
        }

        return null;
    },'''
    if '_getValorHistorico' not in code:
        code = code.replace(get_inc_old, get_inc_new)

# Replace filtrarDespesas
filt_old_match = re.search(r'    filtrarDespesas\(.*?\)\s*\{.*?return \{\s*itens:.*?totalGeral.*?\}\s*\}', code, re.DOTALL)
if filt_old_match:
    filt_old = filt_old_match.group(0)

    filt_new = '''    filtrarDespesas(despesas, mesReferencia, cartaoId = 'ALL', categoria = 'ALL', natureza = 'ALL') {
        const itensFiltrados = [];
        let totalGeral = 0;
        let totalParcelado = 0;
        let totalFixo = 0;
        let totalVariavel = 0;
        const totalPorDono = { 'meu': 0 };

        despesas.forEach(d => {
            if (cartaoId !== 'ALL' && d.cartaoId !== cartaoId) return;
            if (categoria !== 'ALL' && d.cat !== categoria) return;
            if (natureza !== 'ALL' && (d.natureza || 'variavel') !== natureza) return;

            const inc = this.getIncidenciaDespesaNoMes(d, mesReferencia);
            if (inc && inc.ativa) {
                itensFiltrados.push({
                    ...d,
                    incidencia: inc
                });
                
                const rateio = d.rateio || (d.dono ? { [d.dono]: 100 } : { 'meu': 100 });
                for (const rDono in rateio) {
                    if (!totalPorDono[rDono]) totalPorDono[rDono] = 0;
                    totalPorDono[rDono] += inc.valor * (rateio[rDono] / 100);
                }
                
                const valorMeu = inc.valor * ((rateio['meu'] || 0) / 100);

                totalGeral += valorMeu;
                if (d.tipo === 'Parcelado' && d.parcelas > 1) {
                    totalParcelado += valorMeu;
                }
                if (d.natureza === 'fixo_absoluto' || d.natureza === 'fixo_variavel') {
                    totalFixo += valorMeu;
                } else {
                    totalVariavel += valorMeu;
                }
            }
        });

        return {
            itens: itensFiltrados,
            totalGeral,
            totalParcelado,
            totalFixo,
            totalVariavel,
            totalPorDono
        };
    }'''

    if 'const valorMeu = inc.valor * ((rateio[\'meu\'] || 0) / 100);' not in code:
        code = code.replace(filt_old, filt_new)

with open('js/calculations.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("calculations patched")
