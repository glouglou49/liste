import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { BOMLine, ComponentRef, Manufacturer, Project } from '../types';
import { format } from 'date-fns';

type AggregatedBOMLine = BOMLine & {
  designation: string;
  manufacturer: string;
  weight: number;
};

export const ExportService = {
  exportToPDF: (
    project: Project,
    lines: AggregatedBOMLine[],
    viewName: string
  ) => {
    const doc = new jsPDF();

    // En-tête
    doc.setFontSize(18);
    doc.text(`Nomenclature - ${viewName}`, 14, 22);

    doc.setFontSize(11);
    doc.text(`Affaire : ${project.id}`, 14, 32);
    doc.text(`Technicien BE : ${project.techName}`, 14, 38);
    doc.text(`Date : ${format(new Date(), 'dd/MM/yyyy')}`, 14, 44);

    // Tableau
    const tableColumn = ["Référence", "Désignation", "Qté", "Fabricant", "Phase", "Localisation"];
    const tableRows = lines.map(line => [
      line.ref,
      line.designation,
      line.quantity.toString(),
      line.manufacturer,
      line.category,
      line.location || ''
    ]);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`BOM_${project.id}_${viewName.replace(/\s+/g, '_')}.pdf`);
  },

  exportToExcel: (
    project: Project,
    lines: AggregatedBOMLine[],
    viewName: string
  ) => {
    const data = lines.map(line => ({
      'Référence': line.ref,
      'Désignation': line.designation,
      'Quantité': line.quantity,
      'Fabricant': line.manufacturer,
      'Phase': line.category,
      'Localisation': line.location || '',
      'Poids U (kg)': line.weight || 0,
      'Poids Total (kg)': (line.weight || 0) * line.quantity
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Nomenclature");

    XLSX.writeFile(workbook, `BOM_${project.id}_${viewName.replace(/\s+/g, '_')}.xlsx`);
  }
};
