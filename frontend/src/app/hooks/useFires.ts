import { useCallback, useEffect, useRef, useState } from "react";
import { fetchFires } from "../services/fireService";
import type { Fire } from "../types/fire";
import { getFireErrorKey, validateFires } from "../utils/fireErrors";
import { logger } from "../utils/logger";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export function useFires() {
    const [fires, setFires] = useState<Fire[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorKey, setErrorKey] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [hasLoaded, setHasLoaded] = useState(false);

    const activeRequest = useRef<AbortController | null>(null);
    const mounted = useRef(false);
    const initialLoad = useRef(true);

    const loadFires = useCallback(async () => {
        if (!mounted.current || activeRequest.current) return;

        const controller = new AbortController();
        activeRequest.current = controller;

        try {
            setRefreshing(true);

            const data = validateFires(
                await fetchFires(controller.signal)
            );

            if (
                controller.signal.aborted ||
                !mounted.current ||
                activeRequest.current !== controller
            ) {
                return;
            }

            setFires(data);
            setLastUpdated(new Date());
            setErrorKey(null);
            setHasLoaded(true);
        } catch (error) {
            if (
                controller.signal.aborted ||
                !mounted.current ||
                activeRequest.current !== controller
            ) {
                return;
            }

            logger.error("Failed to fetch fires:", error);

            setErrorKey(
                error instanceof Error &&
                error.message.startsWith("Invalid fires response")
                    ? "errors.invalidData"
                    : getFireErrorKey(error)
            );
        } finally {
            if (activeRequest.current === controller) {
                activeRequest.current = null;

                if (mounted.current && !controller.signal.aborted) {
                    setLoading(false);
                    setRefreshing(false);
                }
            }
        }
    }, []);

    useEffect(() => {
        mounted.current = true;

        const controller = new AbortController();
        activeRequest.current = controller;

        const loadInitialFires = async () => {
            try {
                const data = validateFires(
                    await fetchFires(controller.signal)
                );

                if (
                    controller.signal.aborted ||
                    !mounted.current ||
                    activeRequest.current !== controller
                ) {
                    return;
                }

                setFires(data);
                setLastUpdated(new Date());
                setErrorKey(null);
                setHasLoaded(true);
            } catch (error) {
                if (
                    controller.signal.aborted ||
                    !mounted.current ||
                    activeRequest.current !== controller
                ) {
                    return;
                }

                logger.error("Failed to fetch fires:", error);

                setErrorKey(
                    error instanceof Error &&
                    error.message.startsWith("Invalid fires response")
                        ? "errors.invalidData"
                        : getFireErrorKey(error)
                );
            } finally {
                if (activeRequest.current === controller) {
                    activeRequest.current = null;

                    if (mounted.current && !controller.signal.aborted) {
                        initialLoad.current = false;
                        setLoading(false);
                    }
                }
            }
        };

        void loadInitialFires();

        const interval = window.setInterval(() => {
            if (document.visibilityState === "visible") {
                void loadFires();
            }
        }, REFRESH_INTERVAL_MS);

        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                void loadFires();
            }
        };

        document.addEventListener(
            "visibilitychange",
            onVisibilityChange
        );

        return () => {
            mounted.current = false;

            window.clearInterval(interval);

            document.removeEventListener(
                "visibilitychange",
                onVisibilityChange
            );

            activeRequest.current?.abort();
            activeRequest.current = null;
        };
    }, [loadFires]);

    return {
        fires,
        loading,
        refreshing,
        errorKey,
        lastUpdated,
        hasLoaded,
        reload: loadFires
    };
}
