
import { useTranslation } from "react-i18next";
import { agencyCode } from "../../constants/agencyCode";

type ProvinceFiltersProps = {
    selectedProvinces: string[];
    onToggleProvince: (provinceCode: string) => void;
    onClearProvinces: () => void;
};

export default function ProvinceFilters({ selectedProvinces, onToggleProvince, onClearProvinces }: ProvinceFiltersProps) {
    const { t } = useTranslation();

    return (
        <section className="space-y-3 lg:space-y-4" aria-label={t("filter")}>
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-first-text">{t("filter")}</h2>
                {selectedProvinces.length > 0 && (
                    <button type="button" onClick={onClearProvinces} className="text-xs font-medium text-button transition-colors hover:text-hover-button">
                        {t("clear")}
                    </button>
                )}
            </div>
            <p className="hidden text-sm leading-6 text-second-text sm:block">{t("filterHelp")}</p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 lg:gap-2.5">
                <button
                    type="button"
                    onClick={onClearProvinces}
                    aria-pressed={selectedProvinces.length === 0}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors sm:px-3.5 sm:text-sm lg:rounded-xl lg:px-4 lg:py-2.5 ${
                        selectedProvinces.length === 0
                            ? "border-button bg-button text-white"
                            : "border-white/10 bg-card text-second-text hover:border-button/50 hover:text-first-text"
                    }`}
                >
                    {t("allCanada")}
                </button>
                {Object.entries(agencyCode).map(([code, name]) => {
                    const isSelected = selectedProvinces.includes(code);
                    return (
                        <button
                            key={code}
                            type="button"
                            title={t(`provinces.${code}`, { defaultValue: name })}
                            aria-label={t("filterRegion", { name: t(`provinces.${code}`, { defaultValue: name }) })}
                            aria-pressed={isSelected}
                            onClick={() => onToggleProvince(code)}
                            className={`min-w-9 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors sm:min-w-10 sm:px-3 sm:text-sm lg:min-w-12 lg:rounded-xl lg:px-3.5 lg:py-2.5 ${
                                isSelected
                                    ? "border-button bg-button/15 text-button"
                                    : "border-white/10 bg-card text-second-text hover:border-button/50 hover:text-first-text"
                            }`}
                        >
                            {code}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
