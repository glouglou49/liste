import * as XLSX from 'xlsx';
import * as fs from 'fs';

const buf = fs.readFileSync('db_ref.xlsm');
const workbook = XLSX.read(buf);

const fabSheet = workbook.Sheets['Fabricant'];
const fabData = XLSX.utils.sheet_to_json(fabSheet, { header: 1 }) as any[][];

const manufacturers = fabData
  .slice(1) // Skip header (Row 0)
  .filter(row => row[0] && row[0] !== '-' && row[1] && row[1] !== '-')
  .map(row => ({
    code: String(row[0]).padStart(4, '0'), // sometimes it's integer
    name: String(row[1])
  }));

const refSheet = workbook.Sheets['Référence'];
const refData = XLSX.utils.sheet_to_json(refSheet, { header: 1 }) as any[][];

const references = refData
  .slice(1) // skip header
  .filter(row => row[1] && row[2]) // ensure it has a ref and designation
  .map(row => ({
    ref: String(row[1]),
    designation: String(row[2]),
    fabCode: String(row[3] || '').padStart(4, '0'),
    weight: parseFloat(row[4]) || 0
  }));

const jsonContent = `
import { Manufacturer, ComponentRef, Project } from './types';

export const mockManufacturers: Manufacturer[] = ${JSON.stringify(manufacturers, null, 2)};

export const mockReferences: ComponentRef[] = ${JSON.stringify(references, null, 2)};

export const mockProjects: Project[] = [
  { id: '407722-01', techName: 'Yann Chouteau', createdAt: new Date().toISOString() },
  { id: '407722-02', techName: 'D.RICOU', createdAt: new Date().toISOString() },
];
`;

fs.writeFileSync('src/mockData.ts', jsonContent);
console.log('mockData.ts generated with', manufacturers.length, 'manufacturers and', references.length, 'references.');

