import { useState } from "react";
import { useTranslation } from "react-i18next";
import closeIcon from "../../assets/icons/close.svg";
import { agencyCode } from "../../constants/agencyCode";
import { nationalFireCauses } from "../../constants/nationalFireCauses";
import { stageOfControlStatus } from "../../constants/stageOfControlStatus";
import type { Fire } from "../../types/fire";
import { statusColor, formatArea, formatDate } from "../../utils/fireFormatters";

type FireCardProps = {
    fire: Fire;
    index: number;
    onRemoveFire: (fireId: string) => void;
};

export default function FireCard({ fire, index, onRemoveFire }: FireCardProps) {
    const { t, i18n } = useTranslation();
    const [removing, setRemoving] = useState(false);
    const handleRemove = () => {
        if (removing) return;
        setRemoving(true);
        window.setTimeout(() => onRemoveFire(fire.nationalFireId), 240);
    };
    const language = i18n.resolvedLanguage === "fr" ? "fr" : "en";

    return (
                    <article
                        key={fire.nationalFireId}
                        className={`overflow-hidden rounded-2xl border border-button/35 bg-card shadow-[0_12px_36px_rgba(0,0,0,0.14)] transition-all duration-200 ease-in-out ${removing ? "opacity-0 scale-[0.96] -translate-x-4 max-h-0 border-0" : "opacity-100 scale-100 max-h-225"}`}
                    >

                        <div className="border-b border-white/10 px-5 py-5 sm:px-6">

                            <div className="flex items-start justify-between gap-4">

                                <div className="min-w-0">

                                    <span className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                                        {index + 1}
                                    </span>

                                    <h3 className="mt-2 break-all text-lg font-semibold text-first-text">
                                        {fire.nationalFireId}
                                    </h3>

                                    <p className="mt-2 text-sm text-second-text">
                                        {t(`provinces.${fire.agencyCode}`, { defaultValue: agencyCode[fire.agencyCode] ?? t("unknownRegion") })}
                                    </p>

                                </div>

                                <button
                                    type="button"
                                    aria-label={`${t("remove")} ${fire.nationalFireId}`}
                                    title={t("removeTitle")}
                                    onClick={handleRemove}
                                    className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/10 text-second-text transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
                                >
                                    <img
                                        src={closeIcon}
                                        alt=""
                                        className="size-4"
                                    />
                                </button>

                            </div>

                            <span
                                className={`mt-4 inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${statusColor(fire.stageOfControlStatus)}`}
                            >
                                {language === "fr" ? t(`status.${fire.stageOfControlStatus}`, { defaultValue: stageOfControlStatus[fire.stageOfControlStatus] ?? t("unknownStatus") }) : stageOfControlStatus[fire.stageOfControlStatus] ?? t("unknownStatus")}
                            </span>

                        </div>


                        <dl className="grid grid-cols-2 gap-x-5 gap-y-6 px-5 py-6 sm:px-6">

                            <div>
                                <dt className="text-xs text-second-text">
                                    {t("fireSize")}
                                </dt>

                                <dd className="mt-2 text-base font-semibold text-first-text">
                                    {formatArea(fire.fireSize, t("unknown"), language)}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-xs text-second-text">
                                    {t("cause")}
                                </dt>

                                <dd className="mt-2 text-base font-semibold text-first-text">
                                    {language === "fr" ? t(`causes.${fire.nationalFireCause}`, { defaultValue: nationalFireCauses[fire.nationalFireCause ?? ""] ?? t("unknown") }) : nationalFireCauses[fire.nationalFireCause ?? ""] ?? t("unknown")}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-xs text-second-text">
                                    {t("latitude")}
                                </dt>

                                <dd className="mt-2 text-sm font-medium tabular-nums text-first-text">
                                    {fire.latitude.toFixed(3)}°
                                </dd>
                            </div>

                            <div>
                                <dt className="text-xs text-second-text">
                                    {t("longitude")}
                                </dt>

                                <dd className="mt-2 text-sm font-medium tabular-nums text-first-text">
                                    {fire.longitude.toFixed(3)}°
                                </dd>
                            </div>

                            {fire.percentContained != null && (

                                <div>
                                    <dt className="text-xs text-second-text">
                                        {t("contained")}
                                    </dt>

                                    <dd className="mt-2 text-base font-semibold text-first-text">
                                        {fire.percentContained}%
                                    </dd>
                                </div>

                            )}

                            <div>
                                <dt className="text-xs text-second-text">
                                    {t("statusDate")}
                                </dt>

                                <dd className="mt-2 text-sm font-medium text-first-text">
                                    {formatDate(fire.statusDate, t("unknown"), language)}
                                </dd>
                            </div>

                        </dl>

                    </article>    );
}
