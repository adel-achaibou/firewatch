import { useState, lazy, Suspense } from "react";
import StatusMessage from "../components/StatusMessage";
import Dashboard from "../components/Dashboard";
import MobileDashboard from "../components/MobileDashboard";
import { useFires } from "../hooks/useFires";
import { useFireSelection } from "../hooks/useFireSelection";
import type { Fire } from "../types/fire";

const WildfireMap = lazy(() => import("../components/WildfireMap"));

export default function Home() {
    const { fires, loading, refreshing, errorKey, lastUpdated, hasLoaded, reload } = useFires();
    const [mapError, setMapError] = useState(false);
    const [mapRetryCount, setMapRetryCount] = useState(0);
    const [activeFire, setActiveFire] = useState<Fire | null>(null);
    const [fireSelectionCount, setFireSelectionCount] = useState(0);
    const [trackedOnly, setTrackedOnly] = useState(false);
    // Initial overview is 225px high; MobileDashboard reports its actual height.
    const [mobilePanelHeight, setMobilePanelHeight] = useState(225);
    const { selectedProvinces, selectedFires, toggleProvince, selectFire, removeFire, clearProvinces } = useFireSelection(fires);

    const filteredFires = fires.filter((fire) => selectedProvinces.length === 0 || selectedProvinces.includes(fire.agencyCode));
    const mapFires = trackedOnly
        ? filteredFires.filter((fire) => selectedFires.some((tracked) => tracked.nationalFireId === fire.nationalFireId))
        : filteredFires;
    const messageKey = mapError ? "errors.map" : loading ? "errors.loading" : !hasLoaded ? errorKey : null;

    const handleRetry = () => {
        if (mapError) {
            setMapError(false);
            setMapRetryCount((count) => count + 1);
        } else if (errorKey) {
            void reload();
        }
    };

    const handleMarkerClick = (fire: Fire) => {
        if (window.innerWidth < 1024) {
            setActiveFire(fire);
            setFireSelectionCount((count) => count + 1);
        } else selectFire(fire);
    };

    return (
        <div className="flex h-dvh w-full bg-body lg:flex-row lg:overflow-hidden">
            <div className="hidden lg:block lg:h-full lg:w-[42%] lg:overflow-y-auto xl:w-[38%]">
                <Dashboard
                    lastUpdated={lastUpdated}
                    refreshing={refreshing}
                    refreshError={hasLoaded ? errorKey : null}
                    onRefresh={() => { void reload(); }}
                    fires={filteredFires}
                    hasLoaded={hasLoaded}
                    trackedOnly={trackedOnly}
                    onTrackedOnlyChange={setTrackedOnly}
                    selectedProvinces={selectedProvinces}
                    selectedFires={selectedFires}
                    onToggleProvince={toggleProvince}
                    onClearProvinces={clearProvinces}
                    onRemoveFire={removeFire}
                />
            </div>
            <div className="relative h-full min-h-0 w-full lg:w-[58%] xl:w-[62%]" style={{ "--fw-sheet-height": `${mobilePanelHeight}px` } as React.CSSProperties}>
                <Suspense fallback={null}>
                    <WildfireMap
                        fires={mapFires}
                        onSelectFire={handleMarkerClick}
                        selectedFires={selectedFires}
                        activeFire={activeFire}
                        mobilePanelHeight={mobilePanelHeight}
                        onMapErrorChange={setMapError}
                        retryCount={mapRetryCount}
                    />
                </Suspense>
                <div className="pointer-events-none absolute inset-0 z-10 lg:hidden">
                    <MobileDashboard
                        lastUpdated={lastUpdated}
                        refreshing={refreshing}
                        refreshError={hasLoaded ? errorKey : null}
                        onRefresh={() => { void reload(); }}
                        fires={filteredFires}
                        hasLoaded={hasLoaded}
                        trackedOnly={trackedOnly}
                        onTrackedOnlyChange={setTrackedOnly}
                        onPanelHeightChange={setMobilePanelHeight}
                        activeFire={activeFire}
                        fireSelectionCount={fireSelectionCount}
                        selectedFires={selectedFires}
                        selectedProvinces={selectedProvinces}
                        onToggleProvince={toggleProvince}
                        onClearProvinces={clearProvinces}
                        onTrackFire={selectFire}
                        onRemoveFire={removeFire}
                        onCloseFire={() => setActiveFire(null)}
                    />
                </div>
                {messageKey && (
                    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-3 sm:p-4">
                        <div className="pointer-events-auto w-full max-w-sm">
                            <StatusMessage messageKey={messageKey} onRetry={loading ? undefined : handleRetry} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
