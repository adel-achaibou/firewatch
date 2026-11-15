import { Map, Marker, NavigationControl, setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Fire } from "../types/fire";
import { logger } from "../utils/logger";
import { createFireMarker } from "./map/createFireMarker";

setWorkerUrl(workerUrl);

type WildfireMapProps = {
    fires: Fire[];
    selectedFires: Fire[];
    activeFire?: Fire | null;
    onSelectFire: (fire: Fire) => void;
    onMapErrorChange?: (hasError: boolean) => void;
    retryCount?: number;
    mobilePanelHeight: number;
};

// Geographic area to display at startup, independent of screen size.
const CANADA_BOUNDS: [[number, number], [number, number]] = [[-141, 42], [-52, 75]];
const MOBILE_BREAKPOINT = 1024;

export default function WildfireMap({ fires, selectedFires, activeFire, onSelectFire, onMapErrorChange, retryCount = 0, mobilePanelHeight }: WildfireMapProps) {
    const [mapReady, setMapReady] = useState(false);
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<Map | null>(null);
    const onSelectFireRef = useRef(onSelectFire);
    const onMapErrorChangeRef = useRef(onMapErrorChange);
    const sheetHeightRef = useRef(mobilePanelHeight);

    // Refs prevent panel movement or callback changes from recreating the map.
    useEffect(() => {
        onSelectFireRef.current = onSelectFire;
        onMapErrorChangeRef.current = onMapErrorChange;
        sheetHeightRef.current = mobilePanelHeight;
    }, [onSelectFire, onMapErrorChange, mobilePanelHeight]);

    useEffect(() => {
        if (!mapContainer.current) return;

        const isMobile = mapContainer.current.clientWidth < MOBILE_BREAKPOINT;
        let map: Map;
        setMapReady(false);

        try {
            map = new Map({
                container: mapContainer.current,
                style: "https://tiles.openfreemap.org/styles/dark",
                center: [-106, 55],
                zoom: 3,
                attributionControl: { compact: isMobile },
                minZoom: 1.5,
                maxBounds: [[-170, 15], [-40, 85]]
            });

            if (!isMobile) map.addControl(new NavigationControl());
        } catch (error) {
            logger.error("Failed to initialize map:", error);
            queueMicrotask(() => onMapErrorChangeRef.current?.(true));
            return;
        }

        let disposed = false;

        const handleMapLoad = () => {
            if (disposed) return;

            if (isMobile) {
                const { clientWidth: width, clientHeight: height } = map.getContainer();
                const sheetHeight = Math.max(0, Math.min(sheetHeightRef.current, height - 1));
                const availableHeight = Math.max(1, height - sheetHeight);
                const verticalMargin = Math.min(24, availableHeight * 0.06);
                const horizontalMargin = Math.min(20, width * 0.05);

                // Fit Canada into the visible part of the map, above the sheet.
                // Run once on load; dragging the sheet never repositions the map.
                map.fitBounds(CANADA_BOUNDS, {
                    padding: {
                        top: verticalMargin,
                        right: horizontalMargin,
                        bottom: sheetHeight + verticalMargin,
                        left: horizontalMargin
                    },
                    duration: 0
                });
            }

            setMapReady(true);
            onMapErrorChangeRef.current?.(false);
        };

        const handleMapError = (event: { error: { message: string } }) => {
            if (disposed) return;
            if (!map.isStyleLoaded()) {
                logger.error("Failed to load map:", event.error);
                onMapErrorChangeRef.current?.(true);
            }
        };

        map.on("load", handleMapLoad);
        map.on("error", handleMapError);
        mapRef.current = map;

        return () => {
            disposed = true;
            mapRef.current = null;
            map.off("load", handleMapLoad);
            map.off("error", handleMapError);
            map.remove();
        };
    }, [retryCount]);

    // A selected fire may be behind the sheet. Reveal it without tracking sheet drag.
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapReady || !activeFire || map.getContainer().clientWidth >= MOBILE_BREAKPOINT) return;

        const point = map.project([activeFire.longitude, activeFire.latitude]);
        const visibleBottom = map.getContainer().clientHeight - sheetHeightRef.current;
        if (point.y > visibleBottom - 24) {
            map.panBy([0, -(point.y - visibleBottom + 48)], { duration: 350 });
        }
    }, [activeFire, mapReady]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapReady) return;

        const markers: Marker[] = [];
        const isCompact = map.getContainer().clientWidth < MOBILE_BREAKPOINT;

        fires.forEach((fire) => {
            const selectedIndex = selectedFires.findIndex(
                (selectedFire) => selectedFire.nationalFireId === fire.nationalFireId
            );
            const isSelected = selectedIndex !== -1;
            const markerElement = createFireMarker(isSelected, selectedIndex + 1, isCompact, fire.nationalFireId);

            if (activeFire?.nationalFireId === fire.nationalFireId && isCompact) {
                markerElement.style.outline = "3px solid white";
                markerElement.style.outlineOffset = "3px";
            }

            markerElement.addEventListener("click", () => onSelectFireRef.current(fire));
            const marker = new Marker({ element: markerElement, anchor: "center" });
            marker.setLngLat([fire.longitude, fire.latitude]);
            marker.addTo(map);
            markers.push(marker);
        });

        return () => markers.forEach((marker) => marker.remove());
    }, [fires, selectedFires, activeFire, mapReady, retryCount]);

    return (
        <>
            <style>{`
                @media (max-width: 1023px) {
                    .firewatch-map .maplibregl-ctrl-bottom-right {
                        bottom: calc(var(--fw-sheet-height, 170px) + 8px) !important;
                        right: 6px;
                        z-index: 1;
                    }
                    .firewatch-map .maplibregl-ctrl-attrib {
                        max-width: calc(100vw - 12px);
                        font-size: 10px;
                        line-height: 1.3;
                        padding: 3px 6px;
                        background: rgba(255, 255, 255, 0.96);
                        border-radius: 6px;
                    }
                    .firewatch-map .maplibregl-ctrl-attrib a { color: #1d4ed8; }
                    .firewatch-map .maplibregl-ctrl-attrib.maplibregl-compact { max-width: 36px; }
                    .firewatch-map .maplibregl-ctrl-attrib.maplibregl-compact-show { max-width: calc(100vw - 12px); }
                    .firewatch-map .maplibregl-ctrl-attrib-button { cursor: pointer; }
                }
            `}</style>
            <div ref={mapContainer} className="firewatch-map h-full w-full" />
        </>
    );
}
