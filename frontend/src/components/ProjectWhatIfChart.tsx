import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { SimulationTimelinePoint } from '../types/project';

interface ProjectWhatIfChartProps {
  timeline: SimulationTimelinePoint[];
  projectName: string;
}

export const ProjectWhatIfChart: React.FC<ProjectWhatIfChartProps> = ({
  timeline,
  projectName,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');

  if (!timeline || timeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
        Aucune donnée de projection disponible pour ce projet.
      </div>
    );
  }

  // Extraire la liste des comptes depuis le premier point
  const accountsMap = timeline[0]?.accounts || {};
  const accountsList = Object.entries(accountsMap).map(([id, info]) => ({
    id,
    name: info.name,
  }));

  // Préparer les données pour Recharts selon le compte sélectionné
  const chartData = timeline.map((pt) => {
    let baselineVal = pt.baseline_balance;
    let whatifVal = pt.whatif_balance;

    if (selectedAccountId !== 'all' && pt.accounts[selectedAccountId]) {
      baselineVal = pt.accounts[selectedAccountId].baseline;
      whatifVal = pt.accounts[selectedAccountId].whatif;
    }

    // Formater la date en FR (ex: 15 mars)
    const [y, m, d] = pt.date.split('-');
    const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const formattedDate = dateObj.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });

    return {
      date: formattedDate,
      fullDate: pt.date,
      baseline: baselineVal,
      whatif: whatifVal,
      impact: whatifVal - baselineVal,
    };
  });

  const formatEuro = (value: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            Courbe prévisionnelle "What-If" (Simulation)
          </h4>
          <p className="text-xs text-muted-foreground">
            Compare le solde prévisionnel avec et sans les dépenses prévues du projet.
          </p>
        </div>

        {/* Sélecteur de compte */}
        {accountsList.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="account-filter" className="text-xs text-muted-foreground font-medium">
              Compte :
            </label>
            <select
              id="account-filter"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
            >
              <option value="all">Tous les comptes (Total)</option>
              {accountsList.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="w-full h-72 bg-card rounded-xl border p-4 pt-6 shadow-sm">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'currentColor', opacity: 0.2 }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={formatEuro}
              tickLine={false}
              axisLine={{ stroke: 'currentColor', opacity: 0.2 }}
              width={75}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const baselineVal = payload.find((p) => p.dataKey === 'baseline')?.value as number;
                  const whatifVal = payload.find((p) => p.dataKey === 'whatif')?.value as number;
                  const impact = (whatifVal || 0) - (baselineVal || 0);

                  return (
                    <div className="bg-popover border text-popover-foreground p-3 rounded-lg shadow-lg text-xs space-y-1.5 min-w-[190px]">
                      <p className="font-semibold text-foreground border-b pb-1">
                        Date : {label}
                      </p>
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Solde de base :</span>
                        <span className="font-medium text-foreground">{formatEuro(baselineVal || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center text-indigo-600 font-semibold">
                        <span>Avec "{projectName}" :</span>
                        <span className={whatifVal < 0 ? 'text-destructive font-bold' : ''}>
                          {formatEuro(whatifVal || 0)}
                        </span>
                      </div>
                      {impact !== 0 && (
                        <div className="flex justify-between items-center text-rose-500 pt-1 border-t text-[11px]">
                          <span>Impact projet :</span>
                          <span>{formatEuro(impact)}</span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
            />
            <ReferenceLine
              y={0}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{
                value: '0 € (Découvert)',
                fill: '#ef4444',
                fontSize: 10,
                position: 'insideBottomRight',
              }}
            />
            <Line
              type="monotone"
              dataKey="baseline"
              name="Solde de référence"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="whatif"
              name={`Simulation : ${projectName}`}
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#6366f1' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
