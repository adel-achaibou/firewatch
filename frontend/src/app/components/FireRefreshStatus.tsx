import { useTranslation } from "react-i18next";

type Props = { lastUpdated: Date | null; refreshing: boolean; errorKey: string | null; onRetry: () => void };

export default function FireRefreshStatus({ refreshing, errorKey, onRetry }: Props) {
    const { i18n } = useTranslation();
    const fr = i18n.resolvedLanguage === "fr";
    if (!refreshing && !errorKey) return null;
    return (
        <div role="status" aria-live="polite" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-second-text">
            {refreshing && <span className="text-orange-400">{fr ? "Actualisation…" : "Refreshing…"}</span>}
            {errorKey && <span className="text-amber-400">{fr ? "Actualisation échouée" : "Refresh failed"} <button type="button" onClick={onRetry} className="underline underline-offset-2">{fr ? "Réessayer" : "Retry"}</button></span>}
        </div>
    );
}
