export function statusColor(status: string): string {
    if (status === "OC") return "bg-red-500/15 text-red-300 ring-red-500/25";
    if (status === "BH") return "bg-amber-500/15 text-amber-300 ring-amber-500/25";
    if (status === "UC") return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25";
    return "bg-slate-500/15 text-slate-300 ring-slate-500/25";
}

export function formatArea(area: number | null, unknown: string, language: string): string {
    return area == null ? unknown : `${area.toLocaleString(language === "fr" ? "fr-CA" : "en-CA")} ha`;
}

export function formatDate(date: string | null, unknown: string, language: string): string {
    if (!date) return unknown;
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? unknown : parsed.toLocaleDateString(language === "fr" ? "fr-CA" : "en-CA", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" });
}

