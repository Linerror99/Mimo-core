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
    endMonth: number,
    options?: {
      startDate?: string;
      endDate?: string;
      excludeFutureIncome?: boolean;
    }
  ): Promise<MonthlyProjection[]> {
    const params = new URLSearchParams({
      start_year: String(startYear),
      start_month: String(startMonth),
      end_year: String(endYear),
      end_month: String(endMonth),
    });
    if (options?.startDate) params.set("start_date", options.startDate);
    if (options?.endDate) params.set("end_date", options.endDate);
    if (options?.excludeFutureIncome) {
      params.set("exclude_future_income", "true");
    }
    return apiRequest<MonthlyProjection[]>(
      `/projections/range?${params.toString()}`
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
