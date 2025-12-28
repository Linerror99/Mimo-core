/**
 * ExportButton Component
 * Bouton pour exporter le rapport mensuel en PDF
 */

import React from 'react';
import { useExportPDF } from '../hooks/useExportPDF';

interface ExportButtonProps {
  year: number;
  month: number;
  className?: string;
}

/**
 * Bouton d'export PDF pour un mois donné
 * @param year L'année du rapport
 * @param month Le mois du rapport (1-12)
 * @param className Classes CSS optionnelles
 */
export function ExportButton({ year, month, className = '' }: ExportButtonProps) {
  const { exportPDF, isLoading, error } = useExportPDF();

  const handleExport = async () => {
    await exportPDF(year, month);
  };

  return (
    <div className="export-button-container">
      <button
        className={`btn btn-secondary ${className}`}
        onClick={handleExport}
        disabled={isLoading}
        title="Exporter le rapport mensuel en PDF"
      >
        {isLoading ? '⏳ Export...' : '📄 Exporter PDF'}
      </button>
      {error && <div className="error-message" style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>{error}</div>}
    </div>
  );
}
