import { useTranslation } from "react-i18next";
import type { Fire } from "../types/fire";
import DashboardHeader from "./dashboard/DashboardHeader";
import FireStatistics from "./dashboard/FireStatistics";
import ProvinceFilters from "./dashboard/ProvinceFilters";
import TrackedFires from "./dashboard/TrackedFires";
import FireRefreshStatus from "./FireRefreshStatus";

type DashboardProps = {
    fires: Fire[];
    hasLoaded: boolean;
    trackedOnly: boolean;
    onTrackedOnlyChange: (value: boolean) => void;
    selectedProvinces: string[];
    selectedFires: Fire[];
    onToggleProvince: (provinceCode: string) => void;
    onClearProvinces: () => void;
    onRemoveFire: (fireId: string) => void;
    lastUpdated: Date | null;
    refreshing: boolean;
    refreshError: string | null;
    onRefresh: () => void;
};

export default function Dashboard({ fires, hasLoaded, trackedOnly, onTrackedOnlyChange, selectedProvinces, selectedFires, onToggleProvince, onClearProvinces, onRemoveFire, lastUpdated, refreshing, refreshError, onRefresh }: DashboardProps) {
    const { t, i18n } = useTranslation();
    return (
        <aside className="flex min-h-full flex-col gap-8 bg-body px-6 py-8 text-first-text sm:px-8 lg:px-9 lg:py-10">
            <div className="space-y-3"><DashboardHeader /><FireRefreshStatus lastUpdated={lastUpdated} refreshing={refreshing} errorKey={refreshError} onRetry={onRefresh} /></div>
            <FireStatistics fires={fires} hasLoaded={hasLoaded} />
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-card p-3 text-sm text-first-text">
                <span>{i18n.resolvedLanguage === "fr" ? "Afficher uniquement les feux suivis" : "Show tracked fires only"}</span>
                <input type="checkbox" checked={trackedOnly} onChange={(event) => onTrackedOnlyChange(event.target.checked)} className="size-4 accent-orange-500" />
            </label>
            <ProvinceFilters selectedProvinces={selectedProvinces} onToggleProvince={onToggleProvince} onClearProvinces={onClearProvinces} />
            <div className="h-px bg-white/10" />
            <TrackedFires selectedFires={selectedFires} onRemoveFire={onRemoveFire} />
            <p className="pt-4 text-xs leading-5 text-second-text">{t("footer")}</p>
        </aside>
    );
}
