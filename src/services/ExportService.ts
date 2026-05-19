import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { BOMLine, ComponentRef, Manufacturer, Project } from '../types';
import { format } from 'date-fns';

type AggregatedBOMLine = BOMLine & {
  designation: string;
  manufacturer: string;
  weight: number;
  fabCode: string;
  orderedQty?: number;
};

export const ExportService = {
  exportToPDF: async (
    project: Project,
    lines: AggregatedBOMLine[],
    viewName: string,
    projectPath?: string | null
  ) => {
    const doc = new jsPDF();

    // Reduced margins by 1/3 (14mm -> 9.33mm)
    const margin = 9.33;
    const usableWidth = 210 - (margin * 2); // 191.34mm

    // Yellow Title box with black border
    doc.setDrawColor(0, 0, 0);
    doc.setFillColor(253, 224, 71); // Tailwind yellow-300
    doc.rect(margin, 15, usableWidth, 14, 'FD');

    // Title text inside box
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(viewName, 105, 24, { align: "center" });

    const clientPart = project.client ? ` (${project.client})` : '';
    const affOrigine = project.affaireOrigine || '';
    const ligOrigine = project.ligneOrigine || '';
    const affExec = project.affaireExecutant || '';
    const ligExec = project.ligneExecutant || '';
    const nomTab = project.nomTableau || '';
    const nomAff = project.nomAffaire || '';

    // Subtitle Line 1: Affaire d'origine : n°affaire d'origine n°ligne d'origine
    const subtitleLine1 = `Affaire d'origine : ${affOrigine} ${ligOrigine}`.replace(/\s+/g, ' ').trim();
    
    // Subtitle Line 2: n°executant n°ligneExecutant NomTableau - NomAffaire (Client)
    const subtitleLine2 = `${affExec} ${ligExec} ${nomTab} - ${nomAff}${clientPart}`.replace(/\s+/g, ' ').trim();

    // Footer Text: n°executant n°ligneExecutant NomListe NomTableau - NomAffaire (Client)
    const footerText = `${affExec} ${ligExec} ${viewName} ${nomTab} - ${nomAff}${clientPart}`.replace(/\s+/g, ' ').trim();

    // Subtitle texts centered
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(subtitleLine1, 105, 38, { align: "center" });

    doc.setFontSize(12);
    doc.text(subtitleLine2, 105, 45, { align: "center" });

    const normalizeStr = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const isEtatPrepa = normalizeStr(viewName).includes('preparatoire') || normalizeStr(viewName).includes('prepa');

    const sortedLines = [...lines].sort((a, b) => {
      const fabComp = (a.fabCode || '').localeCompare(b.fabCode || '', undefined, { numeric: true, sensitivity: 'base' });
      if (fabComp !== 0) return fabComp;
      return (a.ref || '').localeCompare(b.ref || '', undefined, { numeric: true, sensitivity: 'base' });
    });

    // Table Column and Row mapping (ignoring weight)
    const tableRows = sortedLines.map(line => {
      const row = [
        line.fabCode || '',
        line.manufacturer || '',
        line.ref || '',
        line.designation || ''
      ];
      if (isEtatPrepa) {
        const total = line.quantity;
        const ord = line.orderedQty || 0;
        let statusText = '';
        if (ord === total) {
          statusText = "Commandé";
        } else if (ord === 0) {
          statusText = "À commander";
        } else {
          statusText = `${Math.round(ord)} Commandé`;
        }
        row.push(statusText);
      }
      row.push(Math.round(line.quantity).toString());
      return row;
    });

    const totalPagesExp = "{total_pages_count_string}";

    autoTable(doc, {
      head: isEtatPrepa 
        ? [["Code", "Fabricant", "Référence Produit", "Désignation", "Statut", "Quantité"]]
        : [["Code", "Fabricant", "Référence Produit", "Désignation", "Quantité"]],
      body: tableRows,
      startY: 52,
      margin: { left: margin, right: margin, bottom: 15 },
      styles: { 
        fontSize: 9, 
        cellPadding: 1.5,
        lineColor: [0, 0, 0], // Black table borders!
        lineWidth: 0.1,
        textColor: [0, 0, 0] // Black body text!
      },
      headStyles: { 
        fillColor: [253, 224, 71], // Yellow background
        textColor: [0, 0, 0], // Black text
        fontStyle: 'bold',
        halign: 'center',
        lineColor: [0, 0, 0] // Black headers border!
      },
      columnStyles: isEtatPrepa ? {
        0: { cellWidth: 15, halign: 'center' }, // Code (Centered)
        1: { cellWidth: 30 }, // Fabricant
        2: { cellWidth: 29, halign: 'center', fontSize: 8 }, // Référence Produit (Optimized & Centered)
        3: { cellWidth: 'auto' }, // Désignation (takes remaining width)
        4: { cellWidth: 27, halign: 'center', fontSize: 8 }, // Statut (Centered)
        5: { cellWidth: 20, halign: 'center' } // Quantité (Centered)
      } : {
        0: { cellWidth: 15, halign: 'center' }, // Code (Centered)
        1: { cellWidth: 35 }, // Fabricant
        2: { cellWidth: 29, halign: 'center', fontSize: 8 }, // Référence Produit (Optimized & Centered)
        3: { cellWidth: 'auto' }, // Désignation (takes remaining width)
        4: { cellWidth: 20, halign: 'center' } // Quantité (Centered)
      },
      theme: 'grid',
      didParseCell: (data) => {
        if (isEtatPrepa && data.section === 'body') {
          const rowIndex = data.row.index;
          const line = sortedLines[rowIndex];
          if (line && line.orderedQty === line.quantity) {
            data.cell.styles.fillColor = [240, 240, 240];
          }
        }
      },
      didDrawPage: (data) => {
        // Footer drawn on each page
        const str = `${doc.getNumberOfPages()}/` + totalPagesExp;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        
        // Subtitle on the left, page number (X/Y) on the right (manually aligned for 100% precision)
        // We use a realistic estimation (e.g. '2/9') to compute width instead of the long placeholder
        const pageNumWidth = doc.getTextWidth(`${doc.getNumberOfPages()}/9`);
        doc.text(footerText, margin, 287);
        doc.text(str, 210 - margin - pageNumWidth, 287);
      }
    });

    // Replace the total pages placeholder
    if (typeof doc.putTotalPages === 'function') {
      doc.putTotalPages(totalPagesExp);
    }

    // Filename format: n°origine n°ligneOrigine NomListe NomTableau - NomAffaire (Client)
    const baseFileName = `${affOrigine} ${ligOrigine} ${viewName} ${nomTab} - ${nomAff}${clientPart}`;
    const cleanFileName = baseFileName.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim() + '.pdf';
    
    if (window.electronAPI && projectPath) {
      const dataUri = doc.output('datauristring');
      const base64Data = dataUri.split(',')[1];
      const res = await window.electronAPI.exportPdfAuto(projectPath, cleanFileName, base64Data);
      if (!res.success && !res.cancelled) {
        alert(`Erreur lors de l'export PDF automatique :\n${res.error}`);
      }
    } else {
      doc.save(cleanFileName);
    }
  },

  exportToExcel: async (
    project: Project,
    lines: AggregatedBOMLine[],
    viewName: string,
    projectPath?: string | null
  ) => {
    const sortedLines = [...lines].sort((a, b) => {
      const fabComp = (a.fabCode || '').localeCompare(b.fabCode || '', undefined, { numeric: true, sensitivity: 'base' });
      if (fabComp !== 0) return fabComp;
      return (a.ref || '').localeCompare(b.ref || '', undefined, { numeric: true, sensitivity: 'base' });
    });

    const data = sortedLines.map(line => ({
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

    const clientPart = project.client ? ` (${project.client})` : '';
    const affOrigine = project.affaireOrigine || '';
    const ligOrigine = project.ligneOrigine || '';
    const nomTab = project.nomTableau || '';
    const nomAff = project.nomAffaire || '';
    
    // Format: n°origine n°ligneOrigine NomListe NomTableau - NomAffaire (Client)
    const baseName = `${affOrigine} ${ligOrigine} ${viewName} ${nomTab} - ${nomAff}${clientPart}`;
    const cleanFileName = baseName.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim() + '.xls';

    if (window.electronAPI && projectPath) {
      const wbout = XLSX.write(workbook, { bookType: 'biff8', type: 'base64' });
      const res = await window.electronAPI.exportExcelAuto(projectPath, cleanFileName, wbout);
      if (!res.success && !res.cancelled) {
        alert(`Erreur lors de l'export automatique :\n${res.error}`);
      }
    } else {
      XLSX.writeFile(workbook, cleanFileName, { bookType: 'biff8' });
    }
  }
};
