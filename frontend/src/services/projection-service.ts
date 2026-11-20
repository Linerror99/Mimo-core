import { apiRequest } from "@/lib/api-client";
import type {
  MonthlyProjection,
  PurchaseSimulationPayload,
  PurchaseSimulationResult,
  SafeToSpendData,
} from "@/types/projection";

export const projectionService = {
  async getMonthly(month: number, year: number): Promise<MonthlyProjection> {
    return apiRequest<MonthlyProjection>(
      `/projections/monthly/${year}/${month}`
    );
  },

  async getRange(
    startYear: number,
    startMonth: number,
    endYear: number,
    endMonth: number
  ): Promise<MonthlyProjection[]> {
    return apiRequest<MonthlyProjection[]>(
      `/projections/range?start_year=${startYear}&start_month=${startMonth}&end_year=${endYear}&end_month=${endMonth}`
    );
  },

  async getSafeToSpend(): Promise<SafeToSpendData> {
    return apiRequest<SafeToSpendData>("/projections/safe-to-spend");
  },

  async simulatePurchase(
    payload: PurchaseSimulationPayload
  ): Promise<PurchaseSimulationResult> {
    return apiRequest<PurchaseSimulationResult>("/projections/simulate", {
      method: "POST",
      body: payload,
    });
  },

  async commitSimulation(
    payload: PurchaseSimulationPayload
  ): Promise<PurchaseSimulationResult> {
    return apiRequest<PurchaseSimulationResult>(
      "/projections/commit-simulation",
      {
        method: "POST",
        body: payload,
      }
    );
  },
};
