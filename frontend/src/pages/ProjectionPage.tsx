import React, { useEffect, useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { projectionService } from '../services/projectionService';
import { accountService } from '../services/accountService';
import { MonthlyProjection, formatMonth, formatProjectionAmount } from '../types/projection';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ProjectionSkeleton } from '@/components/skeletons/ProjectionSkeleton';
import { RotateCcw, AlertTriangle, CheckCircle2, XCircle, Maximize2, Minimize2, X } from 'lucide-react';
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
  totalTransfers: number;
  netFlow: number;
  finalBalance: number;
  finalTreasuryBalance: number;
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
  const [viewMode, setViewMode] = useState<'both' | 'patrimoine' | 'tresorerie'>('both');
  const [fullscreenChart, setFullscreenChart] = useState<'line' | 'bar' | null>(null);

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
      const totalTransfers = months.reduce((sum, m) => sum + (m.transfers || 0), 0);
      const netFlow = totalIncome - totalExpense;
      const finalBalance = months[months.length - 1].balance;
      const finalTreasuryBalance = months[months.length - 1].treasury_balance ?? finalBalance;
      result.push({
        year,
        months,
        totalIncome,
        totalExpense,
        totalTransfers,
        netFlow,
        finalBalance,
        finalTreasuryBalance,
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
    if (remMonths === 0) return `${years} an${years > 1 ? 's' : ''}`;
    return `${years} an${years > 1 ? 's' : ''} et ${remMonths} mois`;
  };

  const getBalanceClass = (balance: number) => {
    if (balance > 0) return 'positive';
    if (balance < 0) return 'negative';
    return 'neutral';
  };

  // Fermer le mode plein écran avec la touche Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFullscreenChart(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const totalIncome = projections.reduce((sum, p) => sum + p.income, 0);
  const totalExpense = projections.reduce((sum, p) => sum + p.expense, 0);
  const totalTransfers = projections.reduce((sum, p) => sum + (p.transfers || 0), 0);
  const netFlow = totalIncome - totalExpense;
  const finalProjectedBalance = projections.length > 0 ? projections[projections.length - 1].balance : totalBalance;
  const finalTreasuryBalance = projections.length > 0 ? (projections[projections.length - 1].treasury_balance ?? finalProjectedBalance) : totalBalance;
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

        {/* Sélecteur d'horizon et sélecteur de vue */}
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

          <div className="view-mode-toggle">
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'both' ? 'active' : ''}`}
              onClick={() => setViewMode('both')}
            >
              <span>Vue Combinée</span>
            </button>
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'patrimoine' ? 'active' : ''}`}
              onClick={() => setViewMode('patrimoine')}
            >
              <span>Patrimoine Global</span>
            </button>
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'tresorerie' ? 'active' : ''}`}
              onClick={() => setViewMode('tresorerie')}
            >
              <span>Trésorerie (Après Épargne)</span>
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
              <div className="chart-container modern-dark-chart">
                <div className="chart-container-header">
                  <div>
                    <h2>Évolution du solde sur {formatDuration(totalMonths)}</h2>
                    <p className="chart-subtitle">Projection continue du patrimoine et de la trésorerie</p>
                  </div>
                  <button
                    type="button"
                    className="btn-chart-expand"
                    onClick={() => setFullscreenChart('line')}
                    title="Agrandir le graphique"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart
                    data={projections.map(p => ({
                      month: formatMonth(p.month, p.year),
                      patrimoine: p.balance,
                      tresorerie: p.treasury_balance ?? p.balance
                    }))}
                    margin={{ top: 20, right: 20, left: 0, bottom: 25 }}
                  >
                    <defs>
                      <linearGradient id="colorPatrimoine" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity={0.45} />
                        <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorTresorerie" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
                        <stop offset="50%" stopColor="#0ea5e9" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#0284c7" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                    <XAxis
                      dataKey="month"
                      angle={-35}
                      textAnchor="end"
                      height={50}
                      interval={Math.ceil(totalMonths / 12) - 1}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}k€`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="modern-chart-tooltip">
                              <p className="tooltip-label">{label}</p>
                              {payload.map((item: any, idx: number) => (
                                <div key={idx} className="tooltip-item">
                                  <span className="tooltip-dot" style={{ backgroundColor: item.color }} />
                                  <span className="tooltip-name">{item.name}:</span>
                                  <span className="tooltip-value">{formatCurrency(item.value)}</span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    {(viewMode === 'both' || viewMode === 'patrimoine') && (
                      <Area
                        type="monotone"
                        dataKey="patrimoine"
                        stroke="#a855f7"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorPatrimoine)"
                        activeDot={{ r: 6, fill: '#c084fc', stroke: '#fff', strokeWidth: 2 }}
                        name={viewMode === 'both' ? "Patrimoine Global" : "Patrimoine"}
                      />
                    )}
                    {(viewMode === 'both' || viewMode === 'tresorerie') && (
                      <Area
                        type="monotone"
                        dataKey="tresorerie"
                        stroke="#38bdf8"
                        strokeWidth={2.5}
                        strokeDasharray={viewMode === 'both' ? "5 5" : undefined}
                        fillOpacity={1}
                        fill="url(#colorTresorerie)"
                        activeDot={{ r: 6, fill: '#38bdf8', stroke: '#fff', strokeWidth: 2 }}
                        name={viewMode === 'both' ? "Trésorerie Courante" : "Trésorerie"}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container modern-dark-chart">
                <div className="chart-container-header">
                  <div>
                    <h2>
                      {viewMode === 'patrimoine'
                        ? `Flux Financiers (${formatDuration(totalMonths)})`
                        : `Revenus vs Dépenses vs Épargne (${formatDuration(totalMonths)})`}
                    </h2>
                    <p className="chart-subtitle">Comparatif mensuel des entrées et sorties</p>
                  </div>
                  <button
                    type="button"
                    className="btn-chart-expand"
                    onClick={() => setFullscreenChart('bar')}
                    title="Agrandir le graphique"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={projections.map(p => ({
                      month: formatMonth(p.month, p.year),
                      revenus: p.income,
                      dépenses: Math.abs(p.expense),
                      épargne: p.transfers || 0
                    }))}
                    margin={{ top: 20, right: 20, left: 0, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                    <XAxis
                      dataKey="month"
                      angle={-35}
                      textAnchor="end"
                      height={50}
                      interval={Math.ceil(totalMonths / 12) - 1}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}k€`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="modern-chart-tooltip">
                              <p className="tooltip-label">{label}</p>
                              {payload.map((item: any, idx: number) => (
                                <div key={idx} className="tooltip-item">
                                  <span className="tooltip-dot" style={{ backgroundColor: item.color }} />
                                  <span className="tooltip-name">{item.name}:</span>
                                  <span className="tooltip-value">{formatCurrency(item.value)}</span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Bar dataKey="revenus" fill="#10b981" name="Revenus" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="dépenses" fill="#f43f5e" name="Dépenses" radius={[5, 5, 0, 0]} />
                    {viewMode !== 'patrimoine' && (
                      <Bar dataKey="épargne" fill="#06b6d4" name="Épargne & Projets" radius={[5, 5, 0, 0]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Modal Graphique Agrandie (Plein Écran) */}
            {fullscreenChart && (
              <div className="chart-fullscreen-overlay" onClick={() => setFullscreenChart(null)}>
                <div className="chart-fullscreen-modal modern-dark-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="chart-fullscreen-header">
                    <div>
                      <h2>
                        {fullscreenChart === 'line'
                          ? `Évolution du solde sur ${formatDuration(totalMonths)}`
                          : (viewMode === 'patrimoine' 
                              ? `Revenus vs Dépenses (${formatDuration(totalMonths)})`
                              : `Revenus vs Dépenses vs Épargne (${formatDuration(totalMonths)})`)}
                      </h2>
                      <p className="text-sm text-slate-400 mt-1">
                        {fullscreenChart === 'line' 
                          ? (viewMode === 'both' ? 'Vue combinée Patrimoine & Trésorerie' : (viewMode === 'patrimoine' ? 'Vue Patrimoine Global' : 'Vue Trésorerie Courante'))
                          : 'Comparatif mensuel des flux'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-chart-close"
                      onClick={() => setFullscreenChart(null)}
                    >
                      <Minimize2 className="w-4 h-4" />
                      <span>Réduire (Échap)</span>
                    </button>
                  </div>

                  <div style={{ width: '100%', height: 480 }}>
                    {fullscreenChart === 'line' ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={projections.map(p => ({
                            month: formatMonth(p.month, p.year),
                            patrimoine: p.balance,
                            tresorerie: p.treasury_balance ?? p.balance
                          }))}
                          margin={{ top: 20, right: 30, left: 10, bottom: 30 }}
                        >
                          <defs>
                            <linearGradient id="colorPatrimoineModal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#a855f7" stopOpacity={0.45} />
                              <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.18} />
                              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="colorTresorerieModal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
                              <stop offset="50%" stopColor="#0ea5e9" stopOpacity={0.12} />
                              <stop offset="100%" stopColor="#0284c7" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="4 4" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                          <XAxis dataKey="month" angle={-35} textAnchor="end" height={60} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k€`} />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="modern-chart-tooltip">
                                    <p className="tooltip-label">{label}</p>
                                    {payload.map((item: any, idx: number) => (
                                      <div key={idx} className="tooltip-item">
                                        <span className="tooltip-dot" style={{ backgroundColor: item.color }} />
                                        <span className="tooltip-name">{item.name}:</span>
                                        <span className="tooltip-value">{formatCurrency(item.value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend verticalAlign="top" height={40} />
                          {(viewMode === 'both' || viewMode === 'patrimoine') && (
                            <Area 
                              type="monotone" 
                              dataKey="patrimoine" 
                              stroke="#a855f7" 
                              strokeWidth={3.5}
                              fillOpacity={1}
                              fill="url(#colorPatrimoineModal)"
                              activeDot={{ r: 7, fill: '#c084fc', stroke: '#fff', strokeWidth: 2 }}
                              name={viewMode === 'both' ? "Patrimoine Global" : "Patrimoine"}
                            />
                          )}
                          {(viewMode === 'both' || viewMode === 'tresorerie') && (
                            <Area 
                              type="monotone" 
                              dataKey="tresorerie" 
                              stroke="#38bdf8" 
                              strokeWidth={2.5}
                              strokeDasharray={viewMode === 'both' ? "5 5" : undefined}
                              fillOpacity={1}
                              fill="url(#colorTresorerieModal)"
                              activeDot={{ r: 7, fill: '#38bdf8', stroke: '#fff', strokeWidth: 2 }}
                              name={viewMode === 'both' ? "Trésorerie Courante" : "Trésorerie"}
                            />
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={projections.map(p => ({
                            month: formatMonth(p.month, p.year),
                            revenus: p.income,
                            dépenses: Math.abs(p.expense),
                            épargne: p.transfers || 0
                          }))}
                          margin={{ top: 20, right: 30, left: 10, bottom: 30 }}
                        >
                          <CartesianGrid strokeDasharray="4 4" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                          <XAxis dataKey="month" angle={-35} textAnchor="end" height={60} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k€`} />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="modern-chart-tooltip">
                                    <p className="tooltip-label">{label}</p>
                                    {payload.map((item: any, idx: number) => (
                                      <div key={idx} className="tooltip-item">
                                        <span className="tooltip-dot" style={{ backgroundColor: item.color }} />
                                        <span className="tooltip-name">{item.name}:</span>
                                        <span className="tooltip-value">{formatCurrency(item.value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend verticalAlign="top" height={40} />
                          <Bar dataKey="revenus" fill="#10b981" name="Revenus" radius={[5, 5, 0, 0]} />
                          <Bar dataKey="dépenses" fill="#f43f5e" name="Dépenses" radius={[5, 5, 0, 0]} />
                          {viewMode !== 'patrimoine' && (
                            <Bar dataKey="épargne" fill="#06b6d4" name="Épargne & Projets" radius={[5, 5, 0, 0]} />
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            )}

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

              <div className={`projection-table mode-${viewMode}`}>
                <div className="table-header">
                  <div className="col-month">Période</div>
                  <div className="col-amount">Revenus</div>
                  <div className="col-amount">Dépenses</div>
                  {viewMode !== 'patrimoine' && <div className="col-amount">Épargne</div>}
                  {viewMode !== 'patrimoine' && <div className="col-amount">Trésorerie</div>}
                  {viewMode !== 'tresorerie' && <div className="col-amount">Patrimoine</div>}
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
                        {viewMode !== 'patrimoine' && (
                          <div className="col-amount transfers year-amount">
                            {formatCurrency(group.totalTransfers)}
                          </div>
                        )}
                        {viewMode !== 'patrimoine' && (
                          <div className={`col-amount treasury year-amount ${getBalanceClass(group.finalTreasuryBalance)}`}>
                            {formatCurrency(group.finalTreasuryBalance)}
                          </div>
                        )}
                        {viewMode !== 'tresorerie' && (
                          <div className={`col-amount balance year-amount ${getBalanceClass(group.finalBalance)}`}>
                            {formatCurrency(group.finalBalance)}
                          </div>
                        )}
                      </div>

                      {/* Mois de cette année (si l'année est dépliée) */}
                      {isYearExpanded && (
                        <div className="year-months-container">
                          {group.months.map((projection) => {
                            const monthKey = `${projection.year}-${projection.month}`;
                            const isMonthExpanded = expandedMonths.has(monthKey);
                            const treasuryVal = projection.treasury_balance ?? projection.balance;

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
                                  {viewMode !== 'patrimoine' && (
                                    <div className="col-amount transfers">
                                      {formatCurrency(projection.transfers || 0)}
                                    </div>
                                  )}
                                  {viewMode !== 'patrimoine' && (
                                    <div className={`col-amount treasury ${getBalanceClass(treasuryVal)}`}>
                                      {formatCurrency(treasuryVal)}
                                    </div>
                                  )}
                                  {viewMode !== 'tresorerie' && (
                                    <div className={`col-amount balance ${getBalanceClass(projection.balance)}`}>
                                      {formatCurrency(projection.balance)}
                                    </div>
                                  )}
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
                  <div className="summary-label">Épargne totale projetée</div>
                  <div className="summary-value">
                    {formatCurrency(totalTransfers)}
                  </div>
                </div>

                <div className="summary-card final-balance-card">
                  <div className="summary-label">
                    {viewMode === 'patrimoine' ? 'Solde final Patrimoine' : 'Solde final Trésorerie'}
                  </div>
                  <div className={`summary-value ${getBalanceClass(viewMode === 'patrimoine' ? finalProjectedBalance : finalTreasuryBalance)}`}>
                    {formatCurrency(viewMode === 'patrimoine' ? finalProjectedBalance : finalTreasuryBalance)}
                  </div>
                </div>
              </div>

              <div className="insights">
                <h3>Analyse de viabilité & Trésorerie</h3>
                {(() => {
                  const negativePatrimoine = projections.filter(p => p.balance < 0);
                  const negativeTreasury = projections.filter(p => (p.treasury_balance ?? p.balance) < 0);
                  const strainedMonths = projections.filter(p => p.income - p.expense < (p.transfers || 0));

                  return (
                    <div className="space-y-3">
                      {/* Patrimoine Global */}
                      {negativePatrimoine.length === 0 ? (
                        <p className="insight positive flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <span><strong>Patrimoine sain :</strong> Vos revenus couvrent l'ensemble de vos dépenses sur {formatDuration(totalMonths)}.</span>
                        </p>
                      ) : (
                        <p className="insight negative flex items-center gap-2">
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                          <span><strong>Alerte déficit global :</strong> Vos dépenses dépassent vos revenus sur {negativePatrimoine.length} mois.</span>
                        </p>
                      )}

                      {/* Trésorerie & Risque lié à l'épargne */}
                      {negativeTreasury.length > 0 ? (
                        <p className="insight warning flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                          <span>
                            <strong>Risque de découvert sur compte courant :</strong> Vos virements d'épargne prévus rendent votre trésorerie négative sur {negativeTreasury.length} mois ({negativeTreasury.map(m => formatMonth(m.month, m.year)).join(', ')}). Ajustez vos montants d'épargne pour laisser une marge de sécurité.
                          </span>
                        </p>
                      ) : strainedMonths.length > 0 ? (
                        <p className="insight warning flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                          <span>
                            <strong>Trésorerie sous tension :</strong> Sur {strainedMonths.length} mois, votre reste à vivre (Revenus - Dépenses) est inférieur au montant d'épargne programmé ({strainedMonths.map(m => formatMonth(m.month, m.year)).join(', ')}).
                          </span>
                        </p>
                      ) : (
                        <p className="insight positive flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <span><strong>Trésorerie fluide :</strong> Vos virements d'épargne sont 100% compatibles avec vos charges sans aucun risque de découvert !</span>
                        </p>
                      )}
                    </div>
                  );
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
