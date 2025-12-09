/**
 * Export Service
 * Service pour gérer les exports PDF
 */

import apiClient from './api';

export interface ExportPDFParams {
  year: number;
  month: number;
}

/**
 * Exporte le rapport mensuel en PDF
 * @param year L'année du rapport
 * @param month Le mois du rapport (1-12)
 * @returns Les données binaires du PDF
 */
export async function exportMonthlyReportPDF(year: number, month: number): Promise<Blob> {
  const response = await apiClient.post(
    '/exports/pdf',
    null,
    {
      params: { year, month },
      responseType: 'blob',
    }
  );
  return response.data;
}

/**
 * Télécharge le PDF en déclenchant le téléchargement dans le navigateur
 * @param blob Les données binaires du PDF
 * @param filename Le nom du fichier à télécharger
 */
export function downloadPDF(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Génère le nom de fichier pour le PDF
 * @param year L'année du rapport
 * @param month Le mois du rapport
 * @returns Le nom du fichier formaté
 */
export function generatePDFFilename(year: number, month: number): string {
  const monthStr = month.toString().padStart(2, '0');
  return `rapport_financier_${year}_${monthStr}.pdf`;
}
