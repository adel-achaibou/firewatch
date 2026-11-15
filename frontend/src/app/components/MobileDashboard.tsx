import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import fireIcon from "../assets/icons/fire.svg";
import { agencyCode } from "../constants/agencyCode";
import { stageOfControlStatus } from "../constants/stageOfControlStatus";
import type { Fire } from "../types/fire";
import { formatArea, statusColor } from "../utils/fireFormatters";
import ProvinceFilters from "./dashboard/ProvinceFilters";
import TrackedFires from "./dashboard/TrackedFires";
import FireRefreshStatus from "./FireRefreshStatus";

type Props = {
    fires: Fire[];
    hasLoaded: boolean;
    activeFire: Fire | null;
    fireSelectionCount: number;
    selectedFires: Fire[];
    selectedProvinces: string[];
    onToggleProvince: (code: string) => void;
    onClearProvinces: () => void;
    onTrackFire: (fire: Fire) => void;
    onRemoveFire: (id: string) => void;
    onCloseFire: () => void;
    trackedOnly: boolean;
    onTrackedOnlyChange: (value: boolean) => void;
    onPanelHeightChange: (height: number) => void;
    lastUpdated: Date | null;
    refreshing: boolean;
    refreshError: string | null;
    onRefresh: () => void;
};

export default function MobileDashboard({ fires, hasLoaded, activeFire, fireSelectionCount, selectedFires, selectedProvinces, onToggleProvince, onClearProvinces, onTrackFire, onRemoveFire, onCloseFire, trackedOnly, onTrackedOnlyChange, onPanelHeightChange, lastUpdated, refreshing, refreshError, onRefresh }: Props) {
    const { t, i18n } = useTranslation();
    // Three positions: handle only, overview, full dashboard.
    const [panel, setPanel] = useState<"minimal" | "overview" | "expanded">("overview");
    const [displayFire, setDisplayFire] = useState<Fire | null>(activeFire);
    const [fireVisible, setFireVisible] = useState(Boolean(activeFire));
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [dragHeight, setDragHeight] = useState<number | null>(null);
    const gesture = useRef<{ startY: number; startHeight: number; pointerId: number } | null>(null);
    const [screenHeight, setScreenHeight] = useState(() => window.innerHeight);

    useEffect(() => {
        const update = () => setScreenHeight(window.innerHeight);
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    const minimalHeight = 48;
    const expandedHeight = Math.min(screenHeight * 0.78, 680);
    const overviewHeight = Math.min(screenHeight * 0.60, displayFire ? 405 : 225);
    const snapPoints = [minimalHeight, overviewHeight, expandedHeight];
    const panelHeight = dragHeight ?? (panel === "minimal" ? minimalHeight : panel === "overview" ? overviewHeight : expandedHeight);
    useEffect(() => { onPanelHeightChange(panelHeight); }, [panelHeight, onPanelHeightChange]);
    // Reveal content as the panel is dragged, not only after pointer release.
    const showOverview = panelHeight > minimalHeight + 28;
    const revealExpanded = panelHeight > overviewHeight + 35;
    const expandedProgress = Math.max(0, Math.min(1, (panelHeight - overviewHeight - 35) / 95));

    // Every marker tap reopens the preview, including taps on the same fire.
    useEffect(() => {
        if (fireSelectionCount <= 0) return;

        const frame = requestAnimationFrame(() => {
            setDragHeight(null);
            gesture.current = null;
            setPanel("overview");
        });

        return () => cancelAnimationFrame(frame);
    }, [fireSelectionCount]);

    useEffect(() => {
        if (closeTimer.current) {
            clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }

        if (activeFire) {
            const frame = requestAnimationFrame(() => {
                setDisplayFire(activeFire);
                setFireVisible(true);
            });

            return () => {
                cancelAnimationFrame(frame);
            };
        }

        const frame = requestAnimationFrame(() => {
            setFireVisible(false);
        });

        closeTimer.current = setTimeout(() => {
            setDisplayFire(null);
            closeTimer.current = null;
        }, 250);

        return () => {
            cancelAnimationFrame(frame);

            if (closeTimer.current) {
                clearTimeout(closeTimer.current);
                closeTimer.current = null;
            }
        };
    }, [activeFire]);

    const startDrag = (event: React.PointerEvent<HTMLElement>) => {
        if ((event.target as HTMLElement).closest("button, input, label")) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        gesture.current = { startY: event.clientY, startHeight: panelHeight, pointerId: event.pointerId };
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const moveDrag = (event: React.PointerEvent<HTMLElement>) => {
        if (!gesture.current || gesture.current.pointerId !== event.pointerId) return;
        const next = gesture.current.startHeight + gesture.current.startY - event.clientY;
        setDragHeight(Math.max(minimalHeight, Math.min(expandedHeight, next)));
    };
    const finishDrag = (event: React.PointerEvent<HTMLElement>) => {
        if (!gesture.current || gesture.current.pointerId !== event.pointerId) return;
        const next = Math.max(minimalHeight, Math.min(expandedHeight, gesture.current.startHeight + gesture.current.startY - event.clientY));
        const nearest = snapPoints.reduce((best, candidate) => Math.abs(candidate - next) < Math.abs(best - next) ? candidate : best);
        setPanel(nearest === minimalHeight ? "minimal" : nearest === overviewHeight ? "overview" : "expanded");
        gesture.current = null;
        setDragHeight(null);
    };
    const onWheel = (event: React.WheelEvent) => {
        if (panel === "expanded" && (contentRef.current?.scrollTop ?? 0) > 0) return;
        if (event.deltaY > 15 && panel !== "expanded") setPanel(panel === "minimal" ? "overview" : "expanded");
        if (event.deltaY < -15 && panel !== "minimal") setPanel(panel === "expanded" ? "overview" : "minimal");
    };
    const tracked = activeFire ? selectedFires.some((fire) => fire.nationalFireId === activeFire.nationalFireId) : false;
    const outOfControl = fires.filter((fire) => fire.stageOfControlStatus === "OC").length;
    const fr = i18n.resolvedLanguage === "fr";

    return (
        <>
            <section aria-label={t("overview")} onWheel={onWheel} style={{ height: panelHeight }} className={`pointer-events-auto absolute bottom-0 left-0 right-0 z-10 flex flex-col overflow-hidden rounded-t-2xl border-t border-white/15 bg-body shadow-[0_-12px_40px_rgba(0,0,0,0.4)] ${dragHeight === null ? "transition-[height] duration-300 ease-out" : ""}`}>
                <div aria-hidden="true" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} className="flex shrink-0 select-none flex-col items-center gap-2 px-4 pb-2 pt-3 text-first-text touch-none cursor-grab active:cursor-grabbing">
                    <span className="h-1 w-10 rounded-full bg-second-text" />

                </div>
                {showOverview && <div className="flex shrink-0 items-center justify-between gap-2 px-3 pb-3 pt-1 sm:px-4">
                    <div className="flex min-w-0 items-center gap-2">
                        <img src={fireIcon} alt="" className="size-6" />
                        <span className="truncate text-base font-bold text-first-text">FireWatch</span>
                    </div>
                    <div className="flex shrink-0 rounded-lg border border-white/10 bg-card p-1" aria-label="Language / Langue">
                        {(["fr", "en"] as const).map((code) => (
                            <button key={code} type="button" aria-pressed={(i18n.resolvedLanguage === "fr" ? "fr" : "en") === code}
                                onClick={() => { localStorage.setItem("firewatch-language", code); void i18n.changeLanguage(code); }}
                                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${(i18n.resolvedLanguage === "fr" ? "fr" : "en") === code ? "bg-button text-white" : "text-second-text hover:text-first-text"}`}>
                                {code.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>}
                {showOverview && <div ref={contentRef} onPointerDown={!revealExpanded ? startDrag : undefined} onPointerMove={!revealExpanded ? moveDrag : undefined} onPointerUp={!revealExpanded ? finishDrag : undefined} onPointerCancel={!revealExpanded ? finishDrag : undefined} className="min-h-0 overflow-y-auto overscroll-contain touch-pan-y px-3 sm:px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <div className="mb-2"><FireRefreshStatus lastUpdated={lastUpdated} refreshing={refreshing} errorKey={refreshError} onRetry={onRefresh} /></div>
                    {displayFire && (
                        <div className={`grid transition-[grid-template-rows,opacity,transform] duration-250 ease-out ${fireVisible ? "grid-rows-[1fr] opacity-100 translate-y-0" : "grid-rows-[0fr] opacity-0 translate-y-3"}`}>
                        <div className="min-h-0 overflow-hidden">
                        <article className="mb-3 rounded-xl border border-button/40 bg-card p-3 text-first-text">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="break-all text-sm font-semibold">{displayFire.nationalFireId}</p>
                                    <p className="mt-1 text-xs text-second-text">{t(`provinces.${displayFire.agencyCode}`, { defaultValue: agencyCode[displayFire.agencyCode] ?? t("unknownRegion") })}</p>
                                </div>
                                <button type="button" onClick={onCloseFire} aria-label={fr ? "Fermer la fiche" : "Close fire details"} className="shrink-0 rounded-lg px-2 py-1 text-lg text-second-text">×</button>
                            </div>
                            <div className="mt-2">
                                <span className={`inline-flex max-w-full rounded-full px-2 py-1 text-xs font-medium ${statusColor(displayFire.stageOfControlStatus)}`}>
                                    {t(`status.${displayFire.stageOfControlStatus}`, { defaultValue: stageOfControlStatus[displayFire.stageOfControlStatus] ?? t("unknownStatus") })}
                                </span>
                            </div>
                            <dl className="mt-2 grid grid-cols-2 gap-2">
                                <div className="min-w-0 rounded-lg bg-body/80 p-2.5">
                                    <dt className="text-[11px] leading-4 text-second-text">{t("fireSize")}</dt>
                                    <dd className="mt-1 wrap-break-words text-sm font-semibold text-first-text">{formatArea(displayFire.fireSize, t("unknown"), fr ? "fr" : "en")}</dd>
                                </div>
                                <div className="min-w-0 rounded-lg bg-body/80 p-2.5">
                                    <dt className="text-[11px] leading-4 text-second-text">{t("contained")}</dt>
                                    <dd className="mt-1 wrap-break-words text-sm font-semibold text-first-text">{displayFire.percentContained == null ? t("unknown") : `${displayFire.percentContained}%`}</dd>
                                </div>
                            </dl>
                            <button type="button" onClick={() => { if (!tracked) { onTrackFire(displayFire); onCloseFire(); } }} disabled={tracked} className="mt-3 w-full rounded-lg bg-button px-3 py-2 text-xs font-semibold text-white disabled:cursor-default disabled:opacity-60">
                                {tracked ? (fr ? "Déjà dans les feux suivis" : "Already tracked") : (fr ? "+ Suivre ce feu" : "+ Track this fire")}
                            </button>
                        </article>
                        </div>
                        </div>
                    )}
                    <label className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-card px-3 py-2 text-xs text-first-text">
                        <span>{fr ? "Feux suivis uniquement" : "Tracked fires only"}</span>
                        <input type="checkbox" checked={trackedOnly} onChange={(event) => onTrackedOnlyChange(event.target.checked)} className="size-4 accent-orange-500" />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-white/10 bg-card p-3">
                            <p className="text-xs text-second-text">{t("reported")}</p>
                            <p className="mt-1 text-xl font-bold tabular-nums text-first-text">{hasLoaded ? fires.length : "—"}</p>
                        </div>
                        <div className="rounded-xl border border-red-500/20 bg-card p-3">
                            <p className="text-xs text-second-text">{t("outOfControl")}</p>
                            <p className="mt-1 text-xl font-bold tabular-nums text-red-400">{hasLoaded ? outOfControl : "—"}</p>
                        </div>
                    </div>
                    <div
                        aria-hidden={!revealExpanded}
                        className={`grid transition-[grid-template-rows,opacity,transform] duration-300 ease-out ${revealExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                        style={{ opacity: expandedProgress, transform: `translateY(${(1 - expandedProgress) * 12}px)` }}
                    >
                        <div className="min-h-0 overflow-hidden"><div className="mt-5 space-y-5">
                            <ProvinceFilters selectedProvinces={selectedProvinces} onToggleProvince={onToggleProvince} onClearProvinces={onClearProvinces} />
                            <div className="h-px bg-white/10" />
                            <TrackedFires selectedFires={selectedFires} onRemoveFire={onRemoveFire} />

                        </div></div>
                    </div>
                </div>}
            </section>
        </>
    );
}
