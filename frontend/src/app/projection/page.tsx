"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import {
  ProjectionView,
  type ProjectionHorizonMonths,
} from "@/components/features/projection/projection-view";
import { projectionService } from "@/services/projection-service";
import { accountService } from "@/services/account-service";
import type { PurchaseSimulationPayload } from "@/types/projection";

export default function ProjectionPage() {
  const [horizonMonths, setHorizonMonths] =
    useState<ProjectionHorizonMonths>(12);

  const now = new Date();
  const startYear = now.getFullYear();
  const startMonth = now.getMonth() + 1;
  const endDate = new Date(startYear, startMonth - 1 + horizonMonths - 1, 1);
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth() + 1;

  const { data: projections = [], isLoading } = useQuery({
    queryKey: ["projections", horizonMonths],
    queryFn: () =>
      projectionService.getRange(startYear, startMonth, endYear, endMonth),
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

  return (
    <AppShell activePath="/projection">
      <ProjectionView
        isLoading={isLoading}
        horizonMonths={horizonMonths}
        onChangeHorizon={setHorizonMonths}
        projections={projections}
        accounts={accounts}
        onSimulatePurchase={handleSimulatePurchase}
      />
    </AppShell>
  );
}
