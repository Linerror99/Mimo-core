import React, { useEffect, useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { projectionService } from '../services/projectionService';
import { accountService } from '../services/accountService';
import { MonthlyProjection, formatMonth, formatProjectionAmount } from '../types/projection';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ProjectionSkeleton } from '@/components/skeletons/ProjectionSkeleton';
import { RotateCcw, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import '../styles/Projection.css';

type Page =
  | 'dashboard'
  | 'timeline'
  | 'accounts'
  | 'categories'
  | 'goals'
  | 'settings-profile'
  | 'settings-household'
  | 'trash'

interface ProjectionPageProps {
  navigate: (page: Page) => void
  onLogout: () => void
}

interface YearGroup {
  year: number;
  months: MonthlyProjection[];
  totalIncome: number;
  totalExpense: number;
  netFlow: number;
  finalBalance: number;
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function ProjectionPage({ navigate, onLogout }: ProjectionPageProps) {
  const now = new Date();
  const [startYear, setStartYear] = useState<number>(now.getFullYear());
  const [startMonth, setStartMonth] = useState<number>(now.getMonth() + 1);

  // Par défaut 1 an (12 mois)
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 11, 1);
  const [endYear, setEndYear] = useState<number>(defaultEnd.getFullYear());
  const [endMonth, setEndMonth] = useState<number>(defaultEnd.getMonth() + 1);

  const [preset, setPreset] = useState<'6m' | '1y' | '2y' | '5y' | '10y' | 'custom'>('1y');

  const [projections, setProjections] = useState<MonthlyProjection[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Accordions state: expanded years & expanded months
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  // Années disponibles jusqu'en 2060
  const yearRange = useMemo(() => {
    const current = new Date().getFullYear();
    const years: number[] = [];
    for (let y = current - 5; y <= 2060; y++) {
      years.push(y);
    }
    return years;
  }, []);

  // Groupement par année
  const yearGroups = useMemo<YearGroup[]>(() => {
    const groupsMap = new Map<number, MonthlyProjection[]>();
    for (const p of projections) {
      if (!groupsMap.has(p.year)) {
        groupsMap.set(p.year, []);
      }
      groupsMap.get(p.year)!.push(p);
    }

    const result: YearGroup[] = [];
    for (const [year, months] of groupsMap.entries()) {
      const totalIncome = months.reduce((sum, m) => sum + m.income, 0);
      const totalExpense = months.reduce((sum, m) => sum + m.expense, 0);
      const netFlow = totalIncome - totalExpense;
      const finalBalance = months[months.length - 1].balance;
      result.push({
        year,
        months,
        totalIncome,
        totalExpense,
        netFlow,
        finalBalance,
      });
    }
    return result.sort((a, b) => a.year - b.year);
  }, [projections]);

  // Expand first year by default, or all if only 1 year
  useEffect(() => {
    if (yearGroups.length > 0) {
      if (yearGroups.length <= 1) {
        setExpandedYears(new Set(yearGroups.map(g => g.year)));
      } else {
        setExpandedYears(prev => {
          if (prev.size === 0 && yearGroups.length > 0) {
            return new Set([yearGroups[0].year]);
          }
          return prev;
        });
      }
    }
  }, [yearGroups]);

  useEffect(() => {
    loadData();
  }, [startYear, startMonth, endYear, endMonth]);

  const applyPreset = (presetKey: '6m' | '1y' | '2y' | '5y' | '10y') => {
    const monthsCount = {
      '6m': 6,
      '1y': 12,
      '2y': 24,
      '5y': 60,
      '10y': 120,
    }[presetKey];

    const sDate = new Date();
    const sYear = sDate.getFullYear();
    const sMonth = sDate.getMonth() + 1;

    const eDate = new Date(sYear, sMonth - 1 + monthsCount - 1, 1);
    const eYear = eDate.getFullYear();
    const eMonth = eDate.getMonth() + 1;

    setStartYear(sYear);
    setStartMonth(sMonth);
    setEndYear(eYear);
    setEndMonth(eMonth);
    setPreset(presetKey);
  };

  const loadData = async () => {
    try {
      setLoading(true);

      let validStartYear = startYear;
      let validStartMonth = startMonth;
      let validEndYear = endYear;
      let validEndMonth = endMonth;

      if (
        startYear > endYear ||
        (startYear === endYear && startMonth > endMonth)
      ) {
        validEndYear = startYear;
        validEndMonth = startMonth;
        setEndYear(startYear);
        setEndMonth(startMonth);
      }

      const [projectionsData, balanceData] = await Promise.all([
        projectionService.getRange(validStartYear, validStartMonth, validEndYear, validEndMonth),
        accountService.getTotalBalance()
      ]);

      setProjections(projectionsData);
      setTotalBalance(balanceData.total_balance);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des projections');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleYear = (year: number) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(monthKey)) {
        next.delete(monthKey);
      } else {
        next.add(monthKey);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedYears(new Set(yearGroups.map(g => g.year)));
  };

  const collapseAll = () => {
    setExpandedYears(new Set());
    setExpandedMonths(new Set());
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDuration = (monthsCount: number): string => {
    const years = Math.floor(monthsCount / 12);
    const remMonths = monthsCount % 12;
    if (years === 0) return `${monthsCount} mois`;
    if (remMonths === 0) return `${years} an${years > 1 ? 's' : ''} (${monthsCount} mois)`;
    return `${years} an${years > 1 ? 's' : ''} et ${remMonths} mois (${monthsCount} mois)`;
  };

  const getBalanceClass = (balance: number) => {
    if (balance > 0) return 'positive';
    if (balance < 0) return 'negative';
    return 'neutral';
  };

  const totalIncome = projections.reduce((sum, p) => sum + p.income, 0);
  const totalExpense = projections.reduce((sum, p) => sum + p.expense, 0);
  const netFlow = totalIncome - totalExpense;
  const finalProjectedBalance = projections.length > 0 ? projections[projections.length - 1].balance : totalBalance;
  const totalMonths = projections.length;

  if (loading && projections.length === 0) {
    return (
      <Layout currentPage="projection" navigate={navigate} onLogout={onLogout}>
        <ProjectionSkeleton />
      </Layout>
    );
  }

  return (
    <Layout currentPage="projection" navigate={navigate} onLogout={onLogout}>
      <div className="projection-page">
        <div className="header">
          <div>
            <h1>Projections Financières</h1>
            <p className="subtitle">Visualisez et anticipez l'évolution de vos finances</p>
          </div>
          <div className="header-actions">
            <div className="total-balance">
              <span className="label">Solde actuel:</span>
              <span className="value">{formatCurrency(totalBalance)}</span>
            </div>
            <button className="btn btn-secondary flex items-center gap-1.5" onClick={loadData}>
              <RotateCcw className="w-4 h-4" />
              <span>Actualiser</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button className="btn btn-primary btn-sm" onClick={loadData} style={{ marginLeft: '1rem' }}>
              Réessayer
            </button>
          </div>
        )}

        {/* Sélecteur d'horizon et de dates personnalisées */}
        <div className="projection-horizon-card">
          <div className="horizon-presets">
            <span className="horizon-label">Horizon :</span>
            <button
              type="button"
              className={`preset-btn ${preset === '6m' ? 'active' : ''}`}
              onClick={() => applyPreset('6m')}
            >
              6 mois
            </button>
            <button
              type="button"
              className={`preset-btn ${preset === '1y' ? 'active' : ''}`}
              onClick={() => applyPreset('1y')}
            >
              1 an (défaut)
            </button>
            <button
              type="button"
              className={`preset-btn ${preset === '2y' ? 'active' : ''}`}
              onClick={() => applyPreset('2y')}
            >
              2 ans
            </button>
            <button
              type="button"
              className={`preset-btn ${preset === '5y' ? 'active' : ''}`}
              onClick={() => applyPreset('5y')}
            >
              5 ans
            </button>
            <button
              type="button"
              className={`preset-btn ${preset === '10y' ? 'active' : ''}`}
              onClick={() => applyPreset('10y')}
            >
              10 ans
            </button>
          </div>

          <div className="horizon-custom">
            <div className="range-picker">
              <span className="range-label">Du :</span>
              <select
                className="select-control"
                value={startMonth}
                onChange={(e) => {
                  setStartMonth(parseInt(e.target.value, 10));
                  setPreset('custom');
                }}
              >
                {MONTHS_FR.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                className="select-control"
                value={startYear}
                onChange={(e) => {
                  setStartYear(parseInt(e.target.value, 10));
                  setPreset('custom');
                }}
              >
                {yearRange.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="range-picker">
              <span className="range-label">Au :</span>
              <select
                className="select-control"
                value={endMonth}
                onChange={(e) => {
                  setEndMonth(parseInt(e.target.value, 10));
                  setPreset('custom');
                }}
              >
                {MONTHS_FR.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                className="select-control"
                value={endYear}
                onChange={(e) => {
                  setEndYear(parseInt(e.target.value, 10));
                  setPreset('custom');
                }}
              >
                {yearRange.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {projections.length === 0 ? (
          <div className="empty-state">
            <p>Aucune récurrence ou transaction trouvée sur cette période</p>
            <p className="hint">Créez des récurrences pour voir vos projections financières</p>
          </div>
        ) : (
          <>
            {/* Graphiques */}
            <div className="charts-section">
              <div className="chart-container">
                <h2>Évolution du solde sur {totalMonths} mois ({yearGroups.length} an{yearGroups.length > 1 ? 's' : ''})</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={projections.map(p => ({
                    month: formatMonth(p.month, p.year),
                    solde: p.balance
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} interval={Math.ceil(totalMonths / 12) - 1} />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ color: '#333' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="solde" 
                      stroke="#6366f1" 
                      strokeWidth={2}
                      dot={{ r: totalMonths > 36 ? 0 : 3 }}
                      name="Solde projeté"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container">
                <h2>Revenus vs Dépenses ({totalMonths} mois)</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={projections.map(p => ({
                    month: formatMonth(p.month, p.year),
                    revenus: p.income,
                    dépenses: Math.abs(p.expense)
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} interval={Math.ceil(totalMonths / 12) - 1} />
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

            {/* Tableau de projection groupé par Année */}
            <div className="projection-table-section">
              <div className="table-section-header">
                <h2>Rapport détaillé par Année & Mois</h2>
                <div className="table-controls">
                  <button type="button" className="btn-toggle-all" onClick={expandAll}>
                    Tout déplier
                  </button>
                  <button type="button" className="btn-toggle-all" onClick={collapseAll}>
                    Tout replier
                  </button>
                </div>
              </div>

              <div className="projection-table">
                <div className="table-header">
                  <div className="col-month">Période</div>
                  <div className="col-amount">Revenus</div>
                  <div className="col-amount">Dépenses</div>
                  <div className="col-amount">Solde fin de période</div>
                </div>

                {yearGroups.map((group) => {
                  const isYearExpanded = expandedYears.has(group.year);

                  return (
                    <div key={group.year} className="year-block">
                      {/* Ligne Année (Synthèse de l'année) */}
                      <div
                        className={`table-row year-row clickable ${isYearExpanded ? 'expanded' : ''}`}
                        onClick={() => toggleYear(group.year)}
                      >
                        <div className="col-month year-title">
                          <span className="expand-icon">{isYearExpanded ? '▼' : '▶'}</span>
                          <strong>Année {group.year}</strong>
                          <span className="year-badge">{group.months.length} mois</span>
                        </div>
                        <div className="col-amount income year-amount">
                          {formatCurrency(group.totalIncome)}
                        </div>
                        <div className="col-amount expense year-amount">
                          {formatCurrency(group.totalExpense)}
                        </div>
                        <div className={`col-amount balance year-amount ${getBalanceClass(group.finalBalance)}`}>
                          {formatCurrency(group.finalBalance)}
                        </div>
                      </div>

                      {/* Mois de cette année (si l'année est dépliée) */}
                      {isYearExpanded && (
                        <div className="year-months-container">
                          {group.months.map((projection) => {
                            const monthKey = `${projection.year}-${projection.month}`;
                            const isMonthExpanded = expandedMonths.has(monthKey);

                            return (
                              <div key={monthKey} className="month-row-wrapper">
                                <div
                                  className={`table-row month-row clickable ${isMonthExpanded ? 'expanded' : ''}`}
                                  onClick={() => toggleMonth(monthKey)}
                                >
                                  <div className="col-month month-title">
                                    <span className="expand-icon month-icon">{isMonthExpanded ? '▼' : '▶'}</span>
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

                                {/* Détail des transactions du mois */}
                                {isMonthExpanded && projection.projections.length > 0 && (
                                  <div className="projection-details">
                                    <h3>Détail des transactions ({formatMonth(projection.month, projection.year)})</h3>
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

                                {isMonthExpanded && projection.projections.length === 0 && (
                                  <div className="projection-details">
                                    <p className="no-projections">Aucune transaction récurrente pour ce mois</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Résumé global */}
            <div className="summary">
              <h2>Résumé sur la période ({formatDuration(totalMonths)})</h2>
              <div className="summary-cards">
                <div className="summary-card income-card">
                  <div className="summary-label">Revenus totaux</div>
                  <div className="summary-value">
                    {formatCurrency(totalIncome)}
                  </div>
                </div>

                <div className="summary-card expense-card">
                  <div className="summary-label">Dépenses totales</div>
                  <div className="summary-value">
                    {formatCurrency(totalExpense)}
                  </div>
                </div>

                <div className="summary-card balance-card">
                  <div className="summary-label">Flux net cumulé</div>
                  <div className={`summary-value ${getBalanceClass(netFlow)}`}>
                    {netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow)}
                  </div>
                </div>

                <div className="summary-card final-balance-card">
                  <div className="summary-label">Solde final projeté</div>
                  <div className={`summary-value ${getBalanceClass(finalProjectedBalance)}`}>
                    {formatCurrency(finalProjectedBalance)}
                  </div>
                </div>
              </div>

              <div className="insights">
                <h3>Analyse de viabilité</h3>
                {(() => {
                  const negativeMonths = projections.filter(p => p.balance < 0);
                  
                  if (negativeMonths.length === 0) {
                    return (
                      <p className="insight positive flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span><strong>Excellente santé financière :</strong> Aucun découvert projeté sur la période de {formatDuration(totalMonths)} !</span>
                      </p>
                    );
                  } else if (negativeMonths.length <= 3) {
                    return (
                      <p className="insight warning flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <span><strong>Attention :</strong> {negativeMonths.length} mois avec solde négatif détecté(s) sur la période de {formatDuration(totalMonths)} : {negativeMonths.map(m => formatMonth(m.month, m.year)).join(', ')}.</span>
                      </p>
                    );
                  } else {
                    return (
                      <p className="insight negative flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        <span><strong>Alerte découvert prolongé :</strong> {negativeMonths.length} mois en négatif sur la période de {formatDuration(totalMonths)}. Vos dépenses dépassent durablement vos revenus.</span>
                      </p>
                    );
                  }
                })()}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

export default ProjectionPage;
