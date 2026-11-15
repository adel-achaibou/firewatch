import axios from "axios";
import type { Fire } from "../types/fire";

export function getFireErrorKey(error: unknown): string {
    if (axios.isAxiosError(error)) {
        if (error.code === "ERR_CANCELED") {
            return "errors.generic";
        }

        if (error.response?.status === 404) {
            return "errors.notFound";
        }

        if (error.response?.status && error.response.status >= 500) {
            return "errors.server";
        }

        if (
            error.code === "ECONNABORTED" ||
            error.code === "ETIMEDOUT"
        ) {
            return "errors.timeout";
        }

        if (!error.response) {
            return "errors.network";
        }
    }

    return "errors.generic";
}


export function validateFires(data: unknown): Fire[] {
    if (!Array.isArray(data)) {
        throw new Error("Invalid fires response: expected an array");
    }

    for (const fire of data) {
        if (
            !fire ||
            typeof fire !== "object" ||
            typeof fire.nationalFireId !== "string" ||
            !fire.nationalFireId.trim() ||
            typeof fire.agencyCode !== "string" ||
            typeof fire.stageOfControlStatus !== "string" ||
            typeof fire.latitude !== "number" ||
            !Number.isFinite(fire.latitude) ||
            fire.latitude < -90 ||
            fire.latitude > 90 ||
            typeof fire.longitude !== "number" ||
            !Number.isFinite(fire.longitude) ||
            fire.longitude < -180 ||
            fire.longitude > 180 ||
            (
                fire.fireSize != null &&
                (
                    typeof fire.fireSize !== "number" ||
                    !Number.isFinite(fire.fireSize) ||
                    fire.fireSize < 0
                )
            ) ||
            (
                fire.percentContained != null &&
                (
                    typeof fire.percentContained !== "number" ||
                    !Number.isFinite(fire.percentContained) ||
                    fire.percentContained < 0 ||
                    fire.percentContained > 100
                )
            ) ||
            (
                fire.statusDate != null &&
                (
                    typeof fire.statusDate !== "string" ||
                    !fire.statusDate.trim() ||
                    !Number.isFinite(Date.parse(fire.statusDate))
                )
            ) ||
            (
                fire.nationalFireCause != null &&
                typeof fire.nationalFireCause !== "string"
            )
        ) {
            throw new Error("Invalid fires response: malformed fire");
        }
    }

    return data as Fire[];
}

