"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import {
  ProjectionView,
  type ProjectionHorizonMonths,
} from "@/components/features/projection/projection-view";
import { projectionService } from "@/services/projection-service";
import { accountService } from "@/services/account-service";
import { getTodayIso } from "@/lib/utils";
import type { PurchaseSimulationPayload } from "@/types/projection";

function getDefaultCustomEndIso(): string {
  const now = new Date();
  // Par défaut : +6 mois au 25 du mois (juste avant un salaire typique du 28)
  const target = new Date(now.getFullYear(), now.getMonth() + 6, 25);
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, "0");
  const d = String(target.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function ProjectionPage() {
  const queryClient = useQueryClient();
  const [horizonMonths, setHorizonMonths] =
    useState<ProjectionHorizonMonths>(12);
  const [customStartDate, setCustomStartDate] = useState<string>(getTodayIso);
  const [customEndDate, setCustomEndDate] = useState<string>(
    getDefaultCustomEndIso
  );
  const [excludeFutureIncome, setExcludeFutureIncome] = useState(false);

  const now = new Date();
  let startYear = now.getFullYear();
  let startMonth = now.getMonth() + 1;
  let endYear = startYear;
  let endMonth = startMonth;

  if (horizonMonths === "custom" && customStartDate && customEndDate) {
    const [sy, sm] = customStartDate.split("-").map(Number);
    const [ey, em] = customEndDate.split("-").map(Number);
    if (sy && sm && ey && em) {
      startYear = sy;
      startMonth = sm;
      endYear = ey;
      endMonth = em;
    }
  } else {
    const monthsCount = typeof horizonMonths === "number" ? horizonMonths : 12;
    const endDate = new Date(startYear, startMonth - 1 + monthsCount - 1, 1);
    endYear = endDate.getFullYear();
    endMonth = endDate.getMonth() + 1;
  }

  const { data: projections = [], isLoading } = useQuery({
    queryKey: [
      "projections",
      horizonMonths,
      horizonMonths === "custom" ? customStartDate : null,
      horizonMonths === "custom" ? customEndDate : null,
      excludeFutureIncome,
    ],
    queryFn: () =>
      projectionService.getRange(startYear, startMonth, endYear, endMonth, {
        startDate: horizonMonths === "custom" ? customStartDate : undefined,
        endDate: horizonMonths === "custom" ? customEndDate : undefined,
        excludeFutureIncome,
      }),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountService.list(),
  });

  const handleSimulatePurchase = async (payload: PurchaseSimulationPayload) => {
    try {
      return await projectionService.simulatePurchase(payload);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Simulation impossible");
      throw err;
    }
  };

  const handleCommitSimulation = async (payload: PurchaseSimulationPayload) => {
    try {
      await projectionService.commitSimulation(payload);
      toast.success("Simulation validée et planifiée dans votre timeline");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projections"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["goals"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Impossible de planifier la simulation"
      );
      throw err;
    }
  };

  return (
    <AppShell activePath="/projection">
      <ProjectionView
        isLoading={isLoading}
        horizonMonths={horizonMonths}
        onChangeHorizon={setHorizonMonths}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onChangeCustomRange={(start, end) => {
          setCustomStartDate(start);
          setCustomEndDate(end);
        }}
        excludeFutureIncome={excludeFutureIncome}
        onToggleExcludeFutureIncome={setExcludeFutureIncome}
        projections={projections}
        accounts={accounts}
        onSimulatePurchase={handleSimulatePurchase}
        onCommitSimulation={handleCommitSimulation}
      />
    </AppShell>
  );
}
