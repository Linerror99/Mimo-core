import React, { useEffect, useState } from 'react';
import { projectionService } from '../services/projectionService';
import { accountService } from '../services/accountService';
import { MonthlyProjection, Projection, formatMonth, formatProjectionAmount } from '../types/projection';
import { TransactionType } from '../types/recurringTemplate';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/Projection.css';

const ProjectionPage: React.FC = () => {
  const [projections, setProjections] = useState<MonthlyProjection[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectionsData, balanceData] = await Promise.all([
        projectionService.getNext12Months(),
        accountService.getTotalBalance()
      ]);
      setProjections(projectionsData);
      setTotalBalance(balanceData.total_balance);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (monthKey: string) => {
    setExpandedMonth(expandedMonth === monthKey ? null : monthKey);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getBalanceClass = (balance: number) => {
    if (balance > 0) return 'positive';
    if (balance < 0) return 'negative';
    return 'neutral';
  };

  if (loading) {
    return <div className="loading">Chargement des projections...</div>;
  }

  if (error) {
    return (
      <div className="projection-page">
        <div className="error-message">{error}</div>
        <button className="btn btn-primary" onClick={loadData}>
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="projection-page">
      <div className="header">
        <h1>Projection 12 mois</h1>
        <div className="header-actions">
          <div className="total-balance">
            <span className="label">Solde actuel:</span>
            <span className="value">{formatCurrency(totalBalance)}</span>
          </div>
          <button className="btn btn-secondary" onClick={loadData}>
            🔄 Actualiser
          </button>
        </div>
      </div>

      {projections.length === 0 ? (
        <div className="empty-state">
          <p>Aucune récurrence configurée</p>
          <p className="hint">Créez des récurrences pour voir vos projections financières</p>
        </div>
      ) : (
        <>
          {/* Graphiques */}
          <div className="charts-section">
            <div className="chart-container">
              <h2>Évolution du solde sur 12 mois</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={projections.map(p => ({
                  month: formatMonth(p.month, p.year),
                  solde: p.balance
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: '#333' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="solde" 
                    stroke="#667eea" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Solde"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-container">
              <h2>Revenus vs Dépenses par mois</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={projections.map(p => ({
                  month: formatMonth(p.month, p.year),
                  revenus: p.income,
                  dépenses: Math.abs(p.expense)
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: '#333' }}
                  />
                  <Legend />
                  <Bar dataKey="revenus" fill="#10b981" name="Revenus" />
                  <Bar dataKey="dépenses" fill="#ef4444" name="Dépenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="projection-table">
            <div className="table-header">
              <div className="col-month">Mois</div>
              <div className="col-amount">Revenus</div>
              <div className="col-amount">Dépenses</div>
              <div className="col-amount">Solde</div>
            </div>

            {projections.map((projection) => {
              const monthKey = `${projection.year}-${projection.month}`;
              const isExpanded = expandedMonth === monthKey;

              return (
                <div key={monthKey} className="table-row-wrapper">
                  <div 
                    className="table-row clickable"
                    onClick={() => toggleExpand(monthKey)}
                  >
                    <div className="col-month">
                      <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                      {formatMonth(projection.month, projection.year)}
                    </div>
                    <div className="col-amount income">
                      {formatCurrency(projection.income)}
                    </div>
                    <div className="col-amount expense">
                      {formatCurrency(projection.expense)}
                    </div>
                    <div className={`col-amount balance ${getBalanceClass(projection.balance)}`}>
                      {formatCurrency(projection.balance)}
                    </div>
                  </div>

                  {isExpanded && projection.projections.length > 0 && (
                    <div className="projection-details">
                      <h3>Détail des projections</h3>
                      <div className="details-list">
                        {projection.projections.map((proj, index) => (
                          <div key={index} className="detail-item">
                            <div className="detail-info">
                              <span className="detail-name">{proj.template_name}</span>
                              <span className="detail-date">
                                {new Date(proj.date).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short'
                                })}
                              </span>
                            </div>
                            <span className={`detail-amount ${proj.type.toLowerCase()}`}>
                              {formatProjectionAmount(proj.amount, proj.type)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isExpanded && projection.projections.length === 0 && (
                    <div className="projection-details">
                      <p className="no-projections">Aucune projection pour ce mois</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="summary">
            <h2>Résumé sur 12 mois</h2>
            <div className="summary-cards">
              <div className="summary-card income-card">
                <div className="summary-label">Revenus totaux</div>
                <div className="summary-value">
                  {formatCurrency(projections.reduce((sum, p) => sum + p.income, 0))}
                </div>
              </div>

              <div className="summary-card expense-card">
                <div className="summary-label">Dépenses totales</div>
                <div className="summary-value">
                  {formatCurrency(projections.reduce((sum, p) => sum + p.expense, 0))}
                </div>
              </div>

              <div className="summary-card balance-card">
                <div className="summary-label">Solde net</div>
                <div className={`summary-value ${getBalanceClass(
                  projections.reduce((sum, p) => sum + p.balance, 0)
                )}`}>
                  {formatCurrency(projections.reduce((sum, p) => sum + p.balance, 0))}
                </div>
              </div>
            </div>

            <div className="insights">
              <h3>💡 Analyse</h3>
              {(() => {
                const negativeMonths = projections.filter(p => p.balance < 0);
                const avgBalance = projections.reduce((sum, p) => sum + p.balance, 0) / 12;
                
                if (negativeMonths.length === 0) {
                  return (
                    <p className="insight positive">
                      ✅ Tous vos mois sont en positif ! Votre budget récurrent est équilibré.
                    </p>
                  );
                } else if (negativeMonths.length <= 3) {
                  return (
                    <p className="insight warning">
                      ⚠️ {negativeMonths.length} mois en négatif : {negativeMonths.map(m => formatMonth(m.month, m.year)).join(', ')}
                    </p>
                  );
                } else {
                  return (
                    <p className="insight negative">
                      ❌ {negativeMonths.length} mois en négatif. Votre budget récurrent n'est pas équilibré.
                    </p>
                  );
                }
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectionPage;
