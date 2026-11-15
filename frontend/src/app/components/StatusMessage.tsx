
import { useTranslation } from "react-i18next";
import wifiOffIcon from "../assets/icons/wifi-off.svg";

type Props = {
    messageKey: string;
    onRetry?: () => void;
};

export default function StatusMessage({ messageKey, onRetry }: Props) {
    const { t } = useTranslation();
    const isLoading = messageKey === "errors.loading";

    return (
        <div
            role={isLoading ? "status" : "alert"}
            aria-live={isLoading ? "polite" : "assertive"}
            className="flex w-full flex-col items-center gap-4 rounded-2xl border border-white/15 bg-card p-6 text-center text-sm text-first-text shadow-xl"
        >
            {isLoading ? (
                <div
                    className="flex h-14 items-center justify-center gap-2"
                    aria-hidden="true"
                >
                    {[0, 1, 2].map((index) => (
                        <span
                            key={index}
                            className="size-2.5 animate-bounce rounded-full bg-button"
                            style={{
                                animationDelay: `${index * 150}ms`
                            }}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex size-14 items-center justify-center rounded-2xl bg-button/10">
                    <img
                        src={wifiOffIcon}
                        alt=""
                        className="size-7"
                    />
                </div>
            )}

            <p className="max-w-xs leading-6 text-second-text">
                {t(messageKey)}
            </p>

            {!isLoading && onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="rounded-xl bg-button px-5 py-2.5 font-semibold text-white transition-opacity hover:opacity-85"
                >
                    {t("errors.retry")}
                </button>
            )}
        </div>
    );
}
