/**
 * Hook useExportPDF
 * Hook pour gérer l'export PDF des rapports mensuels
 */

import { useState } from 'react';
import { exportMonthlyReportPDF, downloadPDF, generatePDFFilename } from '../services/exportService';

interface UseExportPDFResult {
  exportPDF: (year: number, month: number) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook pour exporter un rapport mensuel en PDF
 * @returns Les fonctions et l'état pour gérer l'export
 */
export function useExportPDF(): UseExportPDFResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportPDF = async (year: number, month: number): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Validation des paramètres
      if (month < 1 || month > 12) {
        throw new Error('Le mois doit être entre 1 et 12');
      }
      if (year < 2020 || year > 2100) {
        throw new Error('L\'année doit être entre 2020 et 2100');
      }

      // Exporter le PDF
      const blob = await exportMonthlyReportPDF(year, month);
      
      // Télécharger le fichier
      const filename = generatePDFFilename(year, month);
      downloadPDF(blob, filename);
    } catch (err: any) {
      console.error('Erreur lors de l\'export PDF:', err);
      setError(err.response?.data?.detail || err.message || 'Erreur lors de l\'export du rapport');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    exportPDF,
    isLoading,
    error,
  };
}
