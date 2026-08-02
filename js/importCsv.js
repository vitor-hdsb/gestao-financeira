export function importCsv(file, options = {}) {
    const { type: forcedType, period, accountId } = options;
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                if (typeof Papa === 'undefined') {
                    throw new Error("PapaParse não foi carregado (verifique a conexão com a internet ou o CDN).");
                }
                const csvText = e.target.result;
                const config = {
                    header: false,
                    skipEmptyLines: 'greedy',
                    dynamicTyping: false,
                    complete: (results) => {
                        try {
                            const rows = results.data;
                            const transactions = [];

                            // Procurar a linha de cabeçalho real (útil para Itaú que tem meta-dados nas primeiras linhas)
                            let headerRowIndex = -1;
                            let headerMap = {};
                            
                            for (let i = 0; i < rows.length; i++) {
                                const rowStr = rows[i].map(c => String(c).toLowerCase().trim().replace(/^\uFEFF/, '')).join(' ');
                                const hasDate = rowStr.includes('data') || rowStr.includes('date');
                                const hasContent = rowStr.includes('valor') || rowStr.includes('lançamento') || rowStr.includes('histórico') || rowStr.includes('descrição') || rowStr.includes('amount') || rowStr.includes('title') || rowStr.includes('historico') || rowStr.includes('título');
                                
                                if (hasDate && hasContent) {
                                    headerRowIndex = i;
                                    rows[i].forEach((col, idx) => {
                                        headerMap[String(col).toLowerCase().trim().replace(/^\uFEFF/, '')] = idx;
                                    });
                                    break;
                                }
                            }

                            if (headerRowIndex === -1) {
                                return reject(new Error("Não foi possível identificar as colunas no CSV. Certifique-se de que o arquivo contém colunas de Data e Valor/Lançamento."));
                            }

                            for (let i = headerRowIndex + 1; i < rows.length; i++) {
                                const row = rows[i];
                                if (row.length === 0 || row.every(v => !v)) continue;

                                const get = (patterns) => {
                                    for (const p of patterns) {
                                        const matchedKey = Object.keys(headerMap).find(h => new RegExp('^' + p + '$', 'i').test(h) || new RegExp(p, 'i').test(h));
                                        if (matchedKey) return row[headerMap[matchedKey]];
                                    }
                                    return null;
                                };

                                // Date Parsing
                                const rawDate = get(['data', 'date', 'data lançamento', 'data da transação', 'lancamento', 'data de compra']);
                                let date = rawDate;
                                if (!date) continue; // Linhas sem data são ignoradas

                                const parts = String(date).trim().split(/[\/\-]/);
                                if (parts.length === 3) {
                                    if (parts[0].length === 4) {
                                        date = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].substring(0, 2).padStart(2, '0')}`;
                                    } else {
                                        const [d, m, y] = parts;
                                        const year = y.length === 2 ? `20${y}` : y;
                                        date = `${year.substring(0, 4)}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                                    }
                                } else if (parts.length === 2) {
                                    const [d, m] = parts;
                                    const currentYear = new Date().getFullYear();
                                    date = `${currentYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                                } else {
                                    continue; // Invalid date format
                                }

                                // Description Parsing
                                let rawDesc = get(['descri.*', 'description', 'titulo', 'título', 'histórico', 'historico', 'estabelecimento', 'lançamento', 'title']);
                                if (!rawDesc) rawDesc = "Transação";

                                // Value Parsing - Prioritize BRL over USD if both exist
                                let rawValor = get(['valor \\(r\\$\\)', 'valor \\(em r\\$\\)', 'valor', 'value', 'amount']);
                                let rawEntrada = get(['entrada.*', 'credito', 'crédito']);
                                let rawSaida = get(['saída.*', 'saida.*', 'debito', 'débito']);
                                
                                let amount = 0;

                                const parseValue = (valStr) => {
                                    if (!valStr) return 0;
                                    let cln = String(valStr).replace(/[R$\s]/g, '');
                                    if (cln.includes(',') && cln.includes('.')) {
                                        cln = cln.replace(/\./g, '').replace(',', '.');
                                    } else if (cln.includes(',')) {
                                        cln = cln.replace(',', '.');
                                    }
                                    return parseFloat(cln);
                                };

                                if (rawValor !== null && rawValor !== undefined && String(rawValor).trim() !== '') {
                                    amount = parseValue(rawValor);
                                } else if (rawSaida && String(rawSaida).trim() !== '') {
                                    amount = -Math.abs(parseValue(rawSaida));
                                } else if (rawEntrada && String(rawEntrada).trim() !== '') {
                                    amount = Math.abs(parseValue(rawEntrada));
                                } else {
                                    continue; // Sem valor identificado
                                }

                                if (isNaN(amount) || amount === 0) continue;

                                // Installment Parsing
                                let installment = 1;
                                const rawParc = get(['parcela', 'n[\.]?parcela', 'installment', 'parc']);
                                if (rawParc) {
                                    installment = parseInt(String(rawParc).replace(/[^0-9]/g, '')) || 1;
                                } else {
                                    const parcMatch = String(rawDesc).match(/\((\d+)\/\d+\)/);
                                    if (parcMatch) {
                                        installment = parseInt(parcMatch[1]);
                                    }
                                }

                                transactions.push({
                                    date,
                                    description: String(rawDesc).trim(),
                                    rawAmount: amount, // Exportamos bruto. O app.js define o sinal definitivo baseado em tipo de conta.
                                    accountId,
                                    category: get(['categoria', 'category']) || null,
                                    installment,
                                    natureza: null // App vai definir
                                });
                            }
                            resolve(transactions);
                        } catch (err) {
                            reject(err);
                        }
                    },
                    error: (err) => reject(err)
                };
                
                // Tratar erros sincronos do PapaParse
                try {
                    Papa.parse(csvText, config);
                } catch (parseErr) {
                    reject(parseErr);
                }
                
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (e) => reject(e);
        reader.readAsText(file, 'ISO-8859-1'); // Bancos brasileiros costumam usar latin1/ISO-8859-1
    });
}
