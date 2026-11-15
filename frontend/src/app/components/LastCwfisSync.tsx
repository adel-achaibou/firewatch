import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchSyncOverview } from "../services/syncService";
import type { SyncOverview } from "../types/syncOverview";

const STALE_AFTER_MS = 60 * 60 * 1000;

export default function LastCwfisSync() {
  const [sync, setSync] = useState<SyncOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<number | null>(null);
  const { i18n } = useTranslation();
  const fr = i18n.resolvedLanguage === "fr";

  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;

    const load = async () => {
      if (inFlight || controller.signal.aborted) return;
      inFlight = true;
      try {
        const result = await fetchSyncOverview(controller.signal);
        if (!controller.signal.aborted) setSync(result);
      } catch {
        // Keep previously retrieved information
      } finally {
        inFlight = false;
        if (!controller.signal.aborted) {
          setLoading(false);
          setNow(Date.now());
        }
      }
    };

    void load();

    const interval = window.setInterval(() => {
      setNow(Date.now());
      if (document.visibilityState === "visible") void load();
    }, 60_000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setNow(Date.now());
        void load();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const lastSuccessfulAt = sync?.lastSuccessfulAt;
  const timestamp = lastSuccessfulAt ? new Date(lastSuccessfulAt).getTime() : NaN;

  if (!Number.isFinite(timestamp)) {
    if (loading) return null;
    return <span className="text-xs text-[#FCD34D]" role="status">{fr ? "Fraîcheur des données inconnue" : "Data freshness unknown"}</span>;
  }

  if (now === null) return null;

  const age = Math.max(0, now - timestamp);
  const isStale = age > STALE_AFTER_MS;
  const minutes = Math.floor(age / 60_000);
  const hours = Math.floor(age / 3_600_000);

  let label: string;
  if (minutes < 1) label = fr ? "À l'instant" : "Just updated";
  else if (minutes < 60) label = fr ? `Mis à jour il y a ${minutes} min` : `Updated ${minutes} min ago`;
  else if (hours < 24) label = fr ? `Mis à jour il y a ${hours} h` : `Updated ${hours} h ago`;
  else label = fr ? `Mis à jour le ${new Date(timestamp).toLocaleDateString("fr-CA")}` : `Updated on ${new Date(timestamp).toLocaleDateString("en-CA")}`;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs" role="status" aria-label={fr ? "Fraîcheur des données incendies" : "Wildfire data freshness"}>
      <span className={`size-1.5 rounded-full ${isStale ? "bg-[#FCD34D]" : "bg-[#86EFAC]"}`} aria-hidden="true" />
      <span className={isStale ? "text-[#FCD34D]" : "text-second-text"}>
        {isStale ? fr ? `Données potentiellement obsolètes · ${label}` : `Data may be outdated · ${label}` : label}
      </span>
    </div>
  );
}
