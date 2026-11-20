"use client";

import React, { useMemo, useState } from "react";
import { Layers, PiggyBank } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePrivacyStore } from "@/stores/privacy-store";
import { cn, formatCurrencyEur } from "@/lib/utils";
import type { Category } from "@/types/category";
import type { Transaction } from "@/types/transaction";

interface CashFlowSankeyProps {
  transactions: Transaction[];
  categories: Category[];
}

interface FlowNode {
  id: string;
  name: string;
  amount: number;
  color: string;
  type: "inflow" | "hub" | "outflow" | "savings";
}

interface FlowLink {
  sourceId: string;
  targetId: string;
  amount: number;
  color: string;
}

const INFLOW_COLORS = ["#10b981", "#059669", "#34d399", "#6ee7b7"];
const OUTFLOW_COLORS = [
  "#7c3aed",
  "#e11d48",
  "#6366f1",
  "#3b82f6",
  "#f59e0b",
  "#14b8a6",
  "#ec4899",
  "#0ea5e9",
];

export function CashFlowSankey({
  transactions,
  categories,
}: CashFlowSankeyProps) {
  const privacyMode = usePrivacyStore((s) => s.isPrivate);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  const { leftNodes, hubNode, rightNodes, links, totalFlow } = useMemo(() => {
    const activeTxs = transactions.filter((t) => !t.deleted_at);

    // 1. Inflows
    const incomeByCat: Record<string, { name: string; amount: number }> = {};
    for (const t of activeTxs) {
      if (t.type !== "INCOME") continue;
      const cat = categories.find((c) => c.id === t.category_id);
      const name = cat?.name || t.category_name || "Revenus";
      if (!incomeByCat[name]) incomeByCat[name] = { name, amount: 0 };
      incomeByCat[name].amount += Math.abs(Number(t.amount));
    }

    let inNodes: FlowNode[] = Object.values(incomeByCat)
      .filter((i) => i.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6)
      .map((item, idx) => ({
        id: `in-${idx}`,
        name: item.name,
        amount: item.amount,
        color: INFLOW_COLORS[idx % INFLOW_COLORS.length],
        type: "inflow",
      }));

    if (inNodes.length === 0) {
      inNodes = [
        {
          id: "in-default",
          name: "Revenus du mois",
          amount: 0,
          color: "#10b981",
          type: "inflow",
        },
      ];
    }

    const totalIncome = inNodes.reduce((sum, n) => sum + n.amount, 0);

    // 2. Outflows
    const expenseByCat: Record<string, { name: string; amount: number }> = {};
    for (const t of activeTxs) {
      if (t.type !== "EXPENSE") continue;
      const cat = categories.find((c) => c.id === t.category_id);
      const name = cat?.name || t.category_name || "Autres dépenses";
      if (!expenseByCat[name]) expenseByCat[name] = { name, amount: 0 };
      expenseByCat[name].amount += Math.abs(Number(t.amount));
    }

    const outNodes: FlowNode[] = Object.values(expenseByCat)
      .filter((e) => e.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 7)
      .map((item, idx) => ({
        id: `out-${idx}`,
        name: item.name,
        amount: item.amount,
        color: OUTFLOW_COLORS[idx % OUTFLOW_COLORS.length],
        type: "outflow",
      }));

    const totalExpenses = outNodes.reduce((sum, n) => sum + n.amount, 0);

    // 3. Savings / Remaining
    const savingsAmount = Math.max(0, totalIncome - totalExpenses);
    if (savingsAmount > 0) {
      outNodes.push({
        id: "out-savings",
        name: "Épargne / Reste",
        amount: savingsAmount,
        color: "#06b6d4",
        type: "savings",
      });
    }

    const hubAmount = Math.max(totalIncome, totalExpenses);
    const centralHub: FlowNode = {
      id: "hub-main",
      name: "Budget Total",
      amount: hubAmount,
      color: "#7c3aed",
      type: "hub",
    };

    const generatedLinks: FlowLink[] = [];
    for (const src of inNodes) {
      if (src.amount > 0) {
        generatedLinks.push({
          sourceId: src.id,
          targetId: "hub-main",
          amount: src.amount,
          color: src.color,
        });
      }
    }
    for (const dst of outNodes) {
      if (dst.amount > 0) {
        generatedLinks.push({
          sourceId: "hub-main",
          targetId: dst.id,
          amount: dst.amount,
          color: dst.color,
        });
      }
    }

    return {
      leftNodes: inNodes,
      hubNode: centralHub,
      rightNodes: outNodes,
      links: generatedLinks,
      totalFlow: hubAmount,
    };
  }, [transactions, categories]);

  const svgWidth = 850;
  const svgHeight = Math.max(
    300,
    Math.max(leftNodes.length, rightNodes.length) * 50 + 50
  );
  const nodeWidth = 14;
  const colXLeft = 155;
  const colXMid = svgWidth / 2 - nodeWidth / 2;
  const colXRight = svgWidth - 185;

  const usableHeight = svgHeight - 70;
  const minNodeHeight = 20;

  let currentYLeft = 35;
  const leftLayout: Record<string, { y: number; height: number }> = {};
  const totalLeft = leftNodes.reduce((s, n) => s + n.amount, 0) || 1;
  for (const node of leftNodes) {
    const h = Math.max(
      minNodeHeight,
      (node.amount / totalLeft) * usableHeight * 0.8
    );
    leftLayout[node.id] = { y: currentYLeft, height: h };
    currentYLeft += h + 16;
  }

  const hubHeight = Math.min(
    usableHeight * 0.88,
    Math.max(76, (hubNode.amount / (totalFlow || 1)) * usableHeight)
  );
  const hubY = (svgHeight - hubHeight) / 2;

  let currentYRight = 30;
  const rightLayout: Record<string, { y: number; height: number }> = {};
  const totalRight = rightNodes.reduce((s, n) => s + n.amount, 0) || 1;
  for (const node of rightNodes) {
    const h = Math.max(
      minNodeHeight,
      (node.amount / totalRight) * usableHeight * 0.8
    );
    rightLayout[node.id] = { y: currentYRight, height: h };
    currentYRight += h + 12;
  }

  const generatePath = (
    x0: number,
    y0: number,
    h0: number,
    x1: number,
    y1: number,
    h1: number
  ) => {
    const midX = (x0 + x1) / 2;
    return `M ${x0} ${y0} C ${midX} ${y0}, ${midX} ${y1}, ${x1} ${y1} L ${x1} ${y1 + h1} C ${midX} ${y1 + h1}, ${midX} ${y0 + h0}, ${x0} ${y0 + h0} Z`;
  };

  let hubInOffset = hubY;
  let hubOutOffset = hubY;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          <div>
            <CardTitle>Flux de trésorerie (Sankey)</CardTitle>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Cheminement de vos revenus vers vos catégories de dépenses et
              votre épargne.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Entrées
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-violet-600" />
            Budget
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Dépenses
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-cyan-500" />
            Épargne
          </span>
          <Badge variant="info">Mois courant</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {totalFlow === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500 dark:text-zinc-400">
            <PiggyBank className="mb-2 h-8 w-8 opacity-40" />
            <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">
              Aucun flux disponible pour ce mois
            </p>
            <p className="mt-0.5 text-xs">
              Ajoutez des revenus et des dépenses pour visualiser vos flux.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="h-auto w-full min-w-[640px] select-none font-sans"
              style={{ maxHeight: "380px" }}
            >
              <defs>
                {links.map((link, idx) => (
                  <linearGradient
                    key={`grad-${idx}`}
                    id={`sankeyGrad-${idx}`}
                    gradientUnits="userSpaceOnUse"
                    x1={
                      link.targetId === "hub-main"
                        ? colXLeft + nodeWidth
                        : colXMid + nodeWidth
                    }
                    y1="0"
                    x2={link.targetId === "hub-main" ? colXMid : colXRight}
                    y2="0"
                  >
                    <stop
                      offset="0%"
                      stopColor={link.color}
                      stopOpacity={0.42}
                    />
                    <stop
                      offset="100%"
                      stopColor={link.color}
                      stopOpacity={0.14}
                    />
                  </linearGradient>
                ))}
              </defs>

              <g>
                {links.map((link, idx) => {
                  const linkKey = `${link.sourceId}-${link.targetId}`;
                  const isHighlighted =
                    hoveredLink === linkKey ||
                    hoveredNode === link.sourceId ||
                    hoveredNode === link.targetId;
                  const dimmed =
                    (hoveredLink && hoveredLink !== linkKey) ||
                    (hoveredNode && !isHighlighted);

                  let pathD = "";
                  if (link.targetId === "hub-main") {
                    const sLayout = leftLayout[link.sourceId];
                    if (!sLayout) return null;
                    const h1 = Math.max(
                      6,
                      (link.amount / (hubNode.amount || 1)) * hubHeight
                    );
                    const y1 = Math.min(hubInOffset, hubY + hubHeight - h1);
                    hubInOffset += h1;
                    pathD = generatePath(
                      colXLeft + nodeWidth,
                      sLayout.y,
                      sLayout.height,
                      colXMid,
                      y1,
                      h1
                    );
                  } else {
                    const dLayout = rightLayout[link.targetId];
                    if (!dLayout) return null;
                    const h0 = Math.max(
                      6,
                      (link.amount / (hubNode.amount || 1)) * hubHeight
                    );
                    const y0 = Math.min(hubOutOffset, hubY + hubHeight - h0);
                    hubOutOffset += h0;
                    pathD = generatePath(
                      colXMid + nodeWidth,
                      y0,
                      h0,
                      colXRight,
                      dLayout.y,
                      dLayout.height
                    );
                  }

                  return (
                    <path
                      key={linkKey}
                      d={pathD}
                      fill={`url(#sankeyGrad-${idx})`}
                      className="cursor-pointer transition-opacity duration-200"
                      opacity={dimmed ? 0.15 : isHighlighted ? 0.9 : 0.65}
                      onMouseEnter={() => setHoveredLink(linkKey)}
                      onMouseLeave={() => setHoveredLink(null)}
                    />
                  );
                })}
              </g>

              {/* Left Nodes */}
              <g>
                {leftNodes.map((node) => {
                  const layout = leftLayout[node.id];
                  if (!layout) return null;
                  return (
                    <g
                      key={node.id}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      <rect
                        x={colXLeft}
                        y={layout.y}
                        width={nodeWidth}
                        height={layout.height}
                        rx={5}
                        fill={node.color}
                        opacity={hoveredNode && hoveredNode !== node.id ? 0.45 : 1}
                      />
                      <text
                        x={colXLeft - 10}
                        y={layout.y + layout.height / 2 - 4}
                        textAnchor="end"
                        className="fill-slate-800 text-[12px] font-medium dark:fill-zinc-100"
                        alignmentBaseline="middle"
                      >
                        {node.name}
                      </text>
                      <text
                        x={colXLeft - 10}
                        y={layout.y + layout.height / 2 + 11}
                        textAnchor="end"
                        className={cn(
                          "fill-slate-500 font-mono text-[11px] font-semibold dark:fill-zinc-400",
                          privacyMode && "blur-[6px]"
                        )}
                      >
                        {formatCurrencyEur(node.amount)}
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* Central Hub */}
              <g
                className="cursor-pointer"
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
                  opacity={hoveredNode && hoveredNode !== hubNode.id ? 0.55 : 1}
                />
                <text
                  x={colXMid + nodeWidth / 2}
                  y={hubY - 12}
                  textAnchor="middle"
                  className="fill-violet-600 text-[11px] font-bold uppercase tracking-wider dark:fill-violet-400"
                >
                  {hubNode.name}
                </text>
                <text
                  x={colXMid + nodeWidth / 2}
                  y={hubY + hubHeight + 16}
                  textAnchor="middle"
                  className={cn(
                    "fill-slate-700 font-mono text-[11px] font-semibold dark:fill-zinc-200",
                    privacyMode && "blur-[6px]"
                  )}
                >
                  {formatCurrencyEur(hubNode.amount)}
                </text>
              </g>

              {/* Right Nodes */}
              <g>
                {rightNodes.map((node) => {
                  const layout = rightLayout[node.id];
                  if (!layout) return null;
                  const pct =
                    totalFlow > 0
                      ? Math.round((node.amount / totalFlow) * 100)
                      : 0;
                  return (
                    <g
                      key={node.id}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      <rect
                        x={colXRight}
                        y={layout.y}
                        width={nodeWidth}
                        height={layout.height}
                        rx={5}
                        fill={node.color}
                        opacity={hoveredNode && hoveredNode !== node.id ? 0.45 : 1}
                      />
                      <text
                        x={colXRight + nodeWidth + 10}
                        y={layout.y + layout.height / 2 - 4}
                        textAnchor="start"
                        className={cn(
                          "text-[12px] font-medium",
                          node.type === "savings"
                            ? "fill-cyan-600 font-semibold dark:fill-cyan-400"
                            : "fill-slate-800 dark:fill-zinc-100"
                        )}
                        alignmentBaseline="middle"
                      >
                        {node.name}
                      </text>
                      <text
                        x={colXRight + nodeWidth + 10}
                        y={layout.y + layout.height / 2 + 11}
                        textAnchor="start"
                        className={cn(
                          "fill-slate-500 font-mono text-[11px] font-semibold dark:fill-zinc-400",
                          privacyMode && "blur-[6px]"
                        )}
                      >
                        {formatCurrencyEur(node.amount)} ({pct}%)
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
