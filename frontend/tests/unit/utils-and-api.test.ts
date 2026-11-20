import { describe, expect, it } from "vitest";
import {
  formatCurrencyEur,
  getInitials,
  getMonthDateRange,
} from "@/lib/utils";
import { getApiBaseUrl } from "@/lib/api-client";

describe("Utilitaires financiers & API Client", () => {
  it("formate correctement les montants en euros avec signe optionnel", () => {
    expect(formatCurrencyEur(1250.5)).toMatch(/1[\s\u202f]?250,50\s*€/);
    expect(formatCurrencyEur(42, { signed: true })).toMatch(/^\+42,00\s*€$/);
    expect(formatCurrencyEur(-99.9, { signed: true })).toMatch(
      /^-99,90\s*€$/
    );
  });

  it("calcule la plage exacte d'un mois (année bissextile incluse)", () => {
    expect(getMonthDateRange(2024, 2)).toEqual({
      startDate: "2024-02-01",
      endDate: "2024-02-29",
    });
    expect(getMonthDateRange(2026, 11)).toEqual({
      startDate: "2026-11-01",
      endDate: "2026-11-30",
    });
  });

  it("génère les initiales utilisateur et résout la base API /api/v1", () => {
    expect(getInitials("Laurent", "Djossou")).toBe("LD");
    expect(getInitials("", "")).toBe("MF");
    expect(getApiBaseUrl()).toContain("/api/v1");
  });
});
