import { useTranslation } from "react-i18next";
import fireIcon from "../../assets/icons/fire.svg";
import LastCwfisSync from "../LastCwfisSync";

export default function DashboardHeader() {
    const { i18n } = useTranslation();
    const language = i18n.resolvedLanguage === "fr" ? "fr" : "en";

    return (
        <header className="space-y-3">
            <div className="flex items-center justify-between gap-2 lg:gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#35251E]">
                        <img
                            src={fireIcon}
                            alt=""
                            className="size-7"
                        />
                    </div>

                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold leading-none tracking-tight text-white">
                            FireWatch
                        </h1>

                        <p className="mt-1 text-[10px] font-medium tracking-wide text-second-text">
                            CANADA WILDFIRE MONITOR
                        </p>
                    </div>
                </div>

                <div
                    className="flex shrink-0 rounded-lg border border-[#343840] bg-footer p-1"
                    aria-label="Language / Langue"
                >
                    {(["fr", "en"] as const).map((code) => (
                        <button
                            key={code}
                            type="button"
                            aria-pressed={language === code}
                            onClick={() => {
                                localStorage.setItem("firewatch-language", code);
                                void i18n.changeLanguage(code);
                            }}
                            className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                language === code
                                    ? "bg-button text-white"
                                    : "text-second-text hover:text-first-text"
                            }`}
                        >
                            {code.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <p className="text-sm leading-6 text-[#B6BCC8]">
                {language === "fr"
                    ? "Explorez les feux de forêt actifs au Canada. Suivez leur évolution et consultez les dernières informations disponibles."
                    : "Explore active wildfires across Canada. Monitor fire activity and discover the latest reported conditions."}
            </p>

            <div className="flex items-center">
                <LastCwfisSync />
            </div>
        </header>
    );
}
