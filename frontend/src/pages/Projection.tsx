import { useState, useMemo } from 'react'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { Transaction } from '@/types'

type Page =
  | 'dashboard'
  | 'timeline'
  | 'projection'
  | 'accounts'
  | 'categories'
  | 'goals'
  | 'settings-profile'
  | 'settings-household'
  | 'trash'

interface ProjectionProps {
  navigate: (page: Page) => void
  onLogout: () => void
}

export function Projection({ navigate, onLogout }: ProjectionProps) {
  const [transactions] = useState<Transaction[]>([])

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const projectionData = useMemo(() => {
    const months: Array<{
      month: string
      balance: number
      income: number
      expense: number
      isNegative: boolean
    }> = []
    const today = new Date()
    let currentBalance = 2700

    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() + i, 1)
      const monthName = monthDate.toLocaleDateString('fr-FR', { month: 'short' })

      const income = 2500 + Math.random() * 300
      const expense = 2200 + Math.random() * 600
      currentBalance += income - expense

      months.push({
        month: monthName,
        balance: Math.round(currentBalance),
        income: Math.round(income),
        expense: Math.round(expense),
        isNegative: currentBalance < 0,
      })
    }

    return months
  }, [])

  return (
    <Layout currentPage="projection" navigate={navigate} onLogout={onLogout}>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-semibold">Projection</h1>
            <p className="text-muted-foreground">Anticipez votre situation financière sur 12 mois</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-success" />
              <p className="text-sm text-muted-foreground">Revenus moyens/mois</p>
            </div>
            <p className="text-2xl font-bold font-mono-amounts text-success">{formatAmount(2600)}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-destructive" />
              <p className="text-sm text-muted-foreground">Dépenses moyennes/mois</p>
            </div>
            <p className="text-2xl font-bold font-mono-amounts text-destructive">{formatAmount(2400)}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <p className="text-sm text-muted-foreground">Solde projeté (dans 12 mois)</p>
            </div>
            <p className="text-2xl font-bold font-mono-amounts">
              {formatAmount(projectionData[projectionData.length - 1].balance)}
            </p>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Évolution du solde sur 12 mois</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0 0)" />
                <XAxis dataKey="month" stroke="oklch(0.50 0 0)" />
                <YAxis stroke="oklch(0.50 0 0)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'oklch(1 0 0)',
                    border: '1px solid oklch(0.90 0 0)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => formatAmount(value)}
                />
                <ReferenceLine y={0} stroke="oklch(0.63 0.22 25)" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="oklch(0.59 0.19 278)"
                  strokeWidth={3}
                  dot={{ fill: 'oklch(0.59 0.19 278)', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Détails mensuels</h2>
          <div className="space-y-2">
            {projectionData.map((data, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  data.isNegative ? 'bg-destructive/5 border-destructive/20' : 'bg-secondary/30'
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-16">
                    <p className="font-semibold capitalize">{data.month}</p>
                  </div>
                  <div className="flex gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground">Revenus</p>
                      <p className="font-mono-amounts text-sm text-success font-semibold">
                        +{formatAmount(data.income)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Dépenses</p>
                      <p className="font-mono-amounts text-sm text-destructive font-semibold">
                        -{formatAmount(data.expense)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {data.isNegative && (
                    <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Déficit
                    </Badge>
                  )}
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Solde</p>
                    <p
                      className={`font-mono-amounts text-lg font-bold ${
                        data.isNegative ? 'text-destructive' : 'text-foreground'
                      }`}
                    >
                      {formatAmount(data.balance)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  )
}
