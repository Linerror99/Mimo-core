import { downloadBinaryFile } from "@/lib/api-client";

export const exportService = {
  async exportMonthlyPdf(year: number, month: number): Promise<void> {
    const blob = await downloadBinaryFile(
      `/exports/pdf?year=${year}&month=${month}`,
      "POST"
    );
    const monthStr = String(month).padStart(2, "0");
    const filename = `mimo_rapport_${year}_${monthStr}.pdf`;

    if (typeof window !== "undefined" && typeof URL.createObjectURL === "function") {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }
  },
};
