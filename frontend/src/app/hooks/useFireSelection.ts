import { logger } from "../utils/logger";

import { useEffect, useState } from "react";
import type { Fire } from "../types/fire";

const STORAGE_KEY = "firewatch-tracked-fires";

export function useFireSelection(fires: Fire[]) {
    const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);

    // Load tracked fire IDs from localStorage on initialization.
    const [trackedFireIds, setTrackedFireIds] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return [];

            const parsed: unknown = JSON.parse(stored);

            if (!Array.isArray(parsed)) return [];

            return [...new Set(
                parsed.filter((id): id is string => typeof id === "string")
            )];
        } catch {
            return [];
        }
    });

    // Save tracked fire IDs whenever the selection changes.
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(trackedFireIds));
        } catch (error) {
            logger.error("Failed to save tracked fires:", error);
        }
    }, [trackedFireIds]);

    // Match saved IDs with the latest fire data from the API.
    const trackedIds = new Set(trackedFireIds);

    const selectedFires = fires.filter((fire) =>
        trackedIds.has(fire.nationalFireId)
    );

    function toggleProvince(provinceCode: string) {
        setSelectedProvinces((previousProvinces) => {
            if (previousProvinces.includes(provinceCode)) {
                return previousProvinces.filter(
                    (province) => province !== provinceCode
                );
            }

            return [...previousProvinces, provinceCode];
        });
    }

    // Add or remove a tracked fire.
    function selectFire(fire: Fire) {
        setTrackedFireIds((previousIds) => {
            if (previousIds.includes(fire.nationalFireId)) {
                return previousIds.filter(
                    (id) => id !== fire.nationalFireId
                );
            }

            return [...previousIds, fire.nationalFireId];
        });
    }

    function removeFire(fireId: string) {
        setTrackedFireIds((previousIds) =>
            previousIds.filter((id) => id !== fireId)
        );
    }

    return {
        selectedProvinces,
        selectedFires,
        toggleProvince,
        selectFire,
        removeFire,
        clearProvinces: () => setSelectedProvinces([])
    };
}
