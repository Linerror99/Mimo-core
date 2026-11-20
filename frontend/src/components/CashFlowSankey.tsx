import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { ArrowRight, Sparkles, TrendingUp, PiggyBank, Layers } from 'lucide-react'
import type { Transaction, Category } from '@/types'

interface CashFlowSankeyProps {
  transactions: any[]
  categories: Category[]
}

interface FlowNode {
  id: string
  name: string
  amount: number
  color: string
  type: 'inflow' | 'hub' | 'outflow' | 'savings'
  icon?: string
}

interface FlowLink {
  sourceId: string
  targetId: string
  amount: number
  color: string
}

const INFLOW_COLORS = ['#10b981', '#059669', '#34d399', '#6ee7b7']
const OUTFLOW_COLORS = [
  '#f43f5e', '#ec4899', '#8b5cf6', '#6366f1',
  '#3b82f6', '#0ea5e9', '#f59e0b', '#14b8a6'
]

export function CashFlowSankey({ transactions, categories }: CashFlowSankeyProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [hoveredLink, setHoveredLink] = useState<string | null>(null)

  const { leftNodes, hubNode, rightNodes, links, totalFlow } = useMemo(() => {
    // 1. Inflows
    const incomeTx = transactions.filter((t: any) => t.type === 'INCOME')
    const incomeByCat: Record<string, { name: string; amount: number }> = {}

    incomeTx.forEach((t: any) => {
      const cat = categories.find(c => c.id === (t.category_id || t.categoryId))
      const name = cat?.name || t.name || 'Revenu'
      if (!incomeByCat[name]) {
        incomeByCat[name] = { name, amount: 0 }
      }
      incomeByCat[name].amount += Math.abs(t.amount)
    })

    let inNodes: FlowNode[] = Object.values(incomeByCat)
      .filter(i => i.amount > 0)
      .map((item, idx) => ({
        id: `in-${idx}`,
        name: item.name,
        amount: item.amount,
        color: INFLOW_COLORS[idx % INFLOW_COLORS.length],
        type: 'inflow'
      }))

    // Fallback if no income recorded
    if (inNodes.length === 0) {
      inNodes = [
        { id: 'in-default', name: 'Revenus du mois', amount: 0, color: '#10b981', type: 'inflow' }
      ]
    }

    const totalIncome = inNodes.reduce((sum, n) => sum + n.amount, 0)

    // 2. Outflows (Expenses)
    const expenseTx = transactions.filter((t: any) => t.type === 'EXPENSE')
    const expenseByCat: Record<string, { name: string; amount: number }> = {}

    expenseTx.forEach((t: any) => {
      const cat = categories.find(c => c.id === (t.category_id || t.categoryId))
      const name = cat?.name || 'Autres dépenses'
      if (!expenseByCat[name]) {
        expenseByCat[name] = { name, amount: 0 }
      }
      expenseByCat[name].amount += Math.abs(t.amount)
    })

    const outNodes: FlowNode[] = Object.values(expenseByCat)
      .filter(e => e.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .map((item, idx) => ({
        id: `out-${idx}`,
        name: item.name,
        amount: item.amount,
        color: OUTFLOW_COLORS[idx % OUTFLOW_COLORS.length],
        type: 'outflow'
      }))

    const totalExpenses = outNodes.reduce((sum, n) => sum + n.amount, 0)

    // 3. Savings / Balance Remaining
    const savingsAmount = Math.max(0, totalIncome - totalExpenses)
    if (savingsAmount > 0) {
      outNodes.push({
        id: 'out-savings',
        name: 'Épargne / Reste',
        amount: savingsAmount,
        color: '#06b6d4',
        type: 'savings'
      })
    }

    // 4. Central Hub
    const hubAmount = Math.max(totalIncome, totalExpenses)
    const centralHub: FlowNode = {
      id: 'hub-main',
      name: 'Budget Total',
      amount: hubAmount,
      color: '#6366f1',
      type: 'hub'
    }

    // 5. Links
    const generatedLinks: FlowLink[] = []

    // Inflows -> Hub
    inNodes.forEach(src => {
      if (src.amount > 0) {
        generatedLinks.push({
          sourceId: src.id,
          targetId: 'hub-main',
          amount: src.amount,
          color: src.color
        })
      }
    })

    // Hub -> Outflows
    outNodes.forEach(dst => {
      if (dst.amount > 0) {
        generatedLinks.push({
          sourceId: 'hub-main',
          targetId: dst.id,
          amount: dst.amount,
          color: dst.color
        })
      }
    })

    return {
      leftNodes: inNodes,
      hubNode: centralHub,
      rightNodes: outNodes,
      links: generatedLinks,
      totalFlow: hubAmount
    }
  }, [transactions, categories])

  const formatAmount = (val: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(val)
  }

  // SVG Dimensioning
  const svgWidth = 850
  const svgHeight = Math.max(340, Math.max(leftNodes.length, rightNodes.length) * 55 + 60)
  const nodeWidth = 14
  const colXLeft = 140
  const colXMid = svgWidth / 2 - nodeWidth / 2
  const colXRight = svgWidth - 170

  // Calculate vertical positions and heights
  const computeLayout = () => {
    const minNodeHeight = 22
    const usableHeight = svgHeight - 80

    // Left positions
    let currentYLeft = 40
    const leftLayout: Record<string, { y: number; height: number }> = {}
    const totalLeft = leftNodes.reduce((s, n) => s + n.amount, 0) || 1
    leftNodes.forEach(node => {
      const h = Math.max(minNodeHeight, (node.amount / totalLeft) * usableHeight * 0.85)
      leftLayout[node.id] = { y: currentYLeft, height: h }
      currentYLeft += h + 18
    })

    // Hub position
    const hubHeight = Math.min(usableHeight * 0.9, Math.max(80, (hubNode.amount / (totalFlow || 1)) * usableHeight))
    const hubY = (svgHeight - hubHeight) / 2

    // Right positions
    let currentYRight = 35
    const rightLayout: Record<string, { y: number; height: number }> = {}
    const totalRight = rightNodes.reduce((s, n) => s + n.amount, 0) || 1
    rightNodes.forEach(node => {
      const h = Math.max(minNodeHeight, (node.amount / totalRight) * usableHeight * 0.85)
      rightLayout[node.id] = { y: currentYRight, height: h }
      currentYRight += h + 14
    })

    return { leftLayout, hubY, hubHeight, rightLayout }
  }

  const { leftLayout, hubY, hubHeight, rightLayout } = computeLayout()

  // Curved Path Generator
  const generatePath = (
    x0: number, y0: number, h0: number,
    x1: number, y1: number, h1: number
  ) => {
    const midX = (x0 + x1) / 2
    return `
      M ${x0} ${y0}
      C ${midX} ${y0}, ${midX} ${y1}, ${x1} ${y1}
      L ${x1} ${y1 + h1}
      C ${midX} ${y1 + h1}, ${midX} ${y0 + h0}, ${x0} ${y0 + h0}
      Z
    `
  }

  return (
    <Card className="p-6 overflow-hidden border border-border/70 bg-card/80 backdrop-blur-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-foreground">Flux de Trésorerie (Sankey)</h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              Visualisation
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Visualisez instantanément comment chaque euro gagné chemine vers vos dépenses et votre épargne.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Entrées</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span className="text-muted-foreground">Hub Central</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-muted-foreground">Dépenses</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            <span className="text-muted-foreground">Épargne</span>
          </div>
        </div>
      </div>

      {totalFlow === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <PiggyBank className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm font-semibold">Aucune transaction disponible pour ce mois</p>
          <p className="text-xs mt-1">Ajoutez des revenus et des dépenses pour voir vos flux de trésorerie s'animer.</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full min-w-[700px] h-auto select-none font-sans"
            style={{ maxHeight: '450px' }}
          >
            <defs>
              {links.map((link, idx) => (
                <linearGradient
                  key={`grad-${idx}`}
                  id={`linkGrad-${idx}`}
                  gradientUnits="userSpaceOnUse"
                  x1={link.targetId === 'hub-main' ? colXLeft + nodeWidth : colXMid + nodeWidth}
                  y1="0"
                  x2={link.targetId === 'hub-main' ? colXMid : colXRight}
                  y2="0"
                >
                  <stop offset="0%" stopColor={link.color} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={link.color} stopOpacity={0.15} />
                </linearGradient>
              ))}
            </defs>

            {/* Links / Ribbons */}
            <g className="links">
              {links.map((link, idx) => {
                let x0 = 0
                let y0 = 0
                let h0 = 0
                let x1 = 0
                let y1 = 0
                let h1 = 0

                if (link.targetId === 'hub-main') {
                  const sLayout = leftLayout[link.sourceId]
                  if (!sLayout) return null
                  x0 = colXLeft + nodeWidth
                  y0 = sLayout.y
                  h0 = sLayout.height
                  x1 = colXMid
                  // Proportional position inside hub
                  const sourceNode = leftNodes.find(n => n.id === link.sourceId)
                  const ratio = sourceNode ? sourceNode.amount / (hubNode.amount || 1) : 0.5
                  h1 = hubHeight * ratio
                  y1 = hubY + (idx * 15) % Math.max(1, hubHeight - h1)
                } else {
                  const dLayout = rightLayout[link.targetId]
                  if (!dLayout) return null
                  x0 = colXMid + nodeWidth
                  y0 = hubY + (idx * 20) % Math.max(1, hubHeight - 20)
                  h0 = Math.min(hubHeight * 0.3, dLayout.height)
                  x1 = colXRight
                  y1 = dLayout.y
                  h1 = dLayout.height
                }

                const isHovered =
                  hoveredLink === `link-${idx}` ||
                  hoveredNode === link.sourceId ||
                  hoveredNode === link.targetId ||
                  hoveredNode === 'hub-main'

                return (
                  <path
                    key={`flow-${idx}`}
                    d={generatePath(x0, y0, h0, x1, y1, h1)}
                    fill={`url(#linkGrad-${idx})`}
                    stroke={link.color}
                    strokeWidth={isHovered ? 1.5 : 0.5}
                    strokeOpacity={isHovered ? 0.8 : 0.3}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredLink(`link-${idx}`)}
                    onMouseLeave={() => setHoveredLink(null)}
                  />
                )
              })}
            </g>

            {/* Left Column: Inflows */}
            <g className="inflows">
              {leftNodes.map(node => {
                const layout = leftLayout[node.id]
                if (!layout) return null
                const isHovered = hoveredNode === node.id

                return (
                  <g
                    key={node.id}
                    className="cursor-pointer transition-transform duration-200"
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    {/* Node Bar */}
                    <rect
                      x={colXLeft}
                      y={layout.y}
                      width={nodeWidth}
                      height={layout.height}
                      rx={5}
                      fill={node.color}
                      className="transition-opacity duration-200"
                      opacity={hoveredNode && !isHovered ? 0.5 : 1}
                    />
                    {/* Label (Left of bar) */}
                    <text
                      x={colXLeft - 12}
                      y={layout.y + layout.height / 2 - 2}
                      textAnchor="end"
                      className="fill-foreground font-medium text-[12px]"
                      alignmentBaseline="middle"
                    >
                      {node.name}
                    </text>
                    <text
                      x={colXLeft - 12}
                      y={layout.y + layout.height / 2 + 14}
                      textAnchor="end"
                      className="fill-muted-foreground font-mono text-[11px] font-semibold"
                      data-privacy="amount"
                    >
                      {formatAmount(node.amount)}
                    </text>
                  </g>
                )
              })}
            </g>

            {/* Central Column: Hub */}
            <g
              className="hub cursor-pointer"
              onMouseEnter={() => setHoveredNode(hubNode.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <rect
                x={colXMid}
                y={hubY}
                width={nodeWidth}
                height={hubHeight}
                rx={6}
                fill={hubNode.color}
                className="transition-all duration-200"
                opacity={hoveredNode && hoveredNode !== hubNode.id ? 0.6 : 1}
              />
              <text
                x={colXMid + nodeWidth / 2}
                y={hubY - 14}
                textAnchor="middle"
                className="fill-indigo-600 dark:fill-indigo-400 font-bold text-[12px] uppercase tracking-wider"
              >
                {hubNode.name}
              </text>
              <text
                x={colXMid + nodeWidth / 2}
                y={hubY + hubHeight / 2}
                textAnchor="middle"
                className="fill-white font-mono font-bold text-[11px] pointer-events-none drop-shadow-xs"
                transform={`rotate(-90, ${colXMid + nodeWidth / 2}, ${hubY + hubHeight / 2})`}
                data-privacy="amount"
              >
                {formatAmount(hubNode.amount)}
              </text>
            </g>

            {/* Right Column: Outflows & Savings */}
            <g className="outflows">
              {rightNodes.map(node => {
                const layout = rightLayout[node.id]
                if (!layout) return null
                const isHovered = hoveredNode === node.id

                return (
                  <g
                    key={node.id}
                    className="cursor-pointer transition-transform duration-200"
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    {/* Node Bar */}
                    <rect
                      x={colXRight}
                      y={layout.y}
                      width={nodeWidth}
                      height={layout.height}
                      rx={5}
                      fill={node.color}
                      className="transition-opacity duration-200"
                      opacity={hoveredNode && !isHovered ? 0.5 : 1}
                    />
                    {/* Label (Right of bar) */}
                    <text
                      x={colXRight + nodeWidth + 12}
                      y={layout.y + layout.height / 2 - 2}
                      textAnchor="start"
                      className={`font-medium text-[12px] ${
                        node.type === 'savings' ? 'fill-cyan-600 dark:fill-cyan-400 font-bold' : 'fill-foreground'
                      }`}
                      alignmentBaseline="middle"
                    >
                      {node.name}
                    </text>
                    <text
                      x={colXRight + nodeWidth + 12}
                      y={layout.y + layout.height / 2 + 14}
                      textAnchor="start"
                      className="fill-muted-foreground font-mono text-[11px] font-semibold"
                      data-privacy="amount"
                    >
                      {formatAmount(node.amount)}{' '}
                      <tspan className="text-[10px] fill-muted-foreground/70 font-sans">
                        ({totalFlow > 0 ? Math.round((node.amount / totalFlow) * 100) : 0}%)
                      </tspan>
                    </text>
                  </g>
                )
              })}
            </g>
          </svg>
        </div>
      )}
    </Card>
  )
}
