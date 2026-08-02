import { importCsv } from './js/importCsv.js';
import * as fs from 'fs';
import Papa from 'papaparse';
global.Papa = Papa;

global.File = class File {
    constructor(chunks, name) {
        this.name = name;
        this.content = chunks[0];
    }
};

global.FileReader = class FileReader {
    readAsText(file) {
        setTimeout(() => {
            if (this.onload) {
                this.onload({ target: { result: file.content } });
            }
        }, 10);
    }
};

const csvContent = `Data;Lançamento;Valor
15/06/2026;Compra Amazon;-150.00`;

const fakeFile = new File([csvContent], 'extrato.csv');

importCsv(fakeFile).then(res => {
    console.log('RESULTADO DA IMPORTAÇÃO:');
    console.log(JSON.stringify(res, null, 2));
}).catch(err => {
    console.error('ERRO:', err);
});
