
import { useTranslation } from "react-i18next";
import type { Fire } from "../../types/fire";

type FireStatisticsProps = {
    fires: Fire[];
    hasLoaded: boolean;
};

export default function FireStatistics({
    fires,
    hasLoaded
}: FireStatisticsProps) {
    const { t } = useTranslation();

    const numberOutOfControl = fires.filter(
        (fire) => fire.stageOfControlStatus === "OC"
    ).length;

    return (
        <section aria-label={t("overview")} className="space-y-3 lg:space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-first-text">
                    {t("overview")}
                </h2>
                <span className="hidden text-xs text-second-text lg:inline">
                    {t("currentFilters")}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
                <div className="min-w-0 rounded-xl border border-white/10 bg-card px-3 py-3 sm:px-4 sm:py-4 lg:rounded-2xl lg:px-5 lg:py-5">
                    <p className="text-xs font-medium text-second-text">
                        {t("reported")}
                    </p>
                    <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-first-text sm:text-3xl lg:mt-3 lg:text-4xl">
                        {hasLoaded ? fires.length : "—"}
                    </p>
                    <p className="mt-3 hidden text-xs text-second-text lg:block">
                        {t("selectedRegions")}
                    </p>
                </div>

                <div className="min-w-0 rounded-xl border border-red-500/20 bg-card px-3 py-3 sm:px-4 sm:py-4 lg:rounded-2xl lg:px-5 lg:py-5">
                    <p className="text-xs font-medium text-second-text">
                        {t("outOfControl")}
                    </p>
                    <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-red-400 sm:text-3xl lg:mt-3 lg:text-4xl">
                        {hasLoaded ? numberOutOfControl : "—"}
                    </p>
                    <p className="mt-3 hidden text-xs text-second-text lg:block">
                        {t("attention")}
                    </p>
                </div>
            </div>
        </section>
    );
}
