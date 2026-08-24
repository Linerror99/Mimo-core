import React, { useEffect, useState } from 'react';
import { projectionService } from '../services/projectionService';
import '../styles/SafeToSpend.css';

interface SafeToSpendData {
  current_balance: number;
  committed_expenses: number;
  safe_to_spend: number;
  next_income_date: string;
  next_income_amount: number;
  days_until_next_income: number;
  status: 'healthy' | 'caution' | 'danger';
  horizon_date: string;
}

interface SafeToSpendCardProps {
  onOpenSimulator?: () => void;
}

export const SafeToSpendCard: React.FC<SafeToSpendCardProps> = ({ onOpenSimulator }) => {
  const [data, setData] = useState<SafeToSpendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSafeToSpend();
  }, []);

  const loadSafeToSpend = async () => {
    try {
      setLoading(true);
      const res = await projectionService.getSafeToSpend();
      setData(res);
    } catch (err) {
      console.error('Failed to load safe-to-spend:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(val);
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '';
    const [y, m, d] = isoStr.split('-');
    return `${d}/${m}`;
  };

  if (loading || !data) {
    return (
      <div className="safe-to-spend-card loading">
        <div className="safe-shimmer"></div>
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (data.status) {
      case 'healthy':
        return { label: '🟢 Trésorerie sereine', class: 'status-healthy' };
      case 'caution':
        return { label: '🟠 Vigilance recommandée', class: 'status-caution' };
      case 'danger':
      default:
        return { label: '🔴 Tension de trésorerie', class: 'status-danger' };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className={`safe-to-spend-card ${badge.class}`}>
      <div className="safe-header">
        <div className="safe-title-row">
          <span className="safe-icon">🛡️</span>
          <div>
            <h3 className="safe-title">Reste à Vivre Réel</h3>
            <span className="safe-subtitle">Surplus disponible sans risque de découvert</span>
          </div>
        </div>
        <span className={`safe-badge ${badge.class}`}>{badge.label}</span>
      </div>

      <div className="safe-body">
        <div className="safe-amount-display">
          <span className="safe-amount">{formatCurrency(data.safe_to_spend)}</span>
          <span className="safe-unit">disponibles immédiatement</span>
        </div>

        <div className="safe-metrics-row">
          <div className="safe-metric">
            <span className="metric-label">🏦 Solde réel actuel</span>
            <span className="metric-value">{formatCurrency(data.current_balance)}</span>
          </div>
          <div className="safe-metric-divider">-</div>
          <div className="safe-metric">
            <span className="metric-label">⏳ Charges dues avant salaire ({formatDate(data.next_income_date)})</span>
            <span className="metric-value expense">{formatCurrency(data.committed_expenses)}</span>
          </div>
          <div className="safe-metric-divider">➔</div>
          <div className="safe-metric">
            <span className="metric-label">
              {data.days_until_next_income > 0
                ? `🗓️ Prochain revenu (${data.days_until_next_income}j)`
                : '🗓️ Fin de mois'}
            </span>
            <span className="metric-value highlight">{formatDate(data.next_income_date)}</span>
          </div>
        </div>
      </div>

      {onOpenSimulator && (
        <div className="safe-footer">
          <button type="button" className="btn-simulator-shortcut" onClick={onOpenSimulator}>
            <span>⚡ Simuler un achat / projet d'épargne</span>
            <span className="shortcut-arrow">→</span>
          </button>
        </div>
      )}
    </div>
  );
};
