import { useTranslation } from "react-i18next";
import type { Fire } from "../../types/fire";
import FireCard from "./FireCard";

type TrackedFiresProps = {
    selectedFires: Fire[];
    onRemoveFire: (fireId: string) => void;
};

export default function TrackedFires({ selectedFires, onRemoveFire }: TrackedFiresProps) {
    const { t } = useTranslation();

    return (
            <section className="space-y-5" aria-label={t("tracked")}>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold text-first-text">{t("tracked")}</h2>
                        <p className="mt-1 text-sm text-second-text">{t("clickMarker")}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-card px-3 py-1 text-sm font-semibold tabular-nums text-first-text">
                        {selectedFires.length}
                    </span>
                </div>

                {selectedFires.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-card/50 px-6 py-12 text-center">
                        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-button/10 text-2xl text-button">⌖</div>
                        <h3 className="mt-5 text-base font-semibold text-first-text">{t("none")}</h3>
                        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-second-text">
                            {t("noneHelp")}
                        </p>
                    </div>
                )}

                
                {selectedFires.map((fire, index) => (
                    <FireCard
                        key={fire.nationalFireId}
                        fire={fire}
                        index={index}
                        onRemoveFire={onRemoveFire}
                    />
                ))}
            </section>
    );
}
