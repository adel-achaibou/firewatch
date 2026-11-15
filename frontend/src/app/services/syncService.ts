import { axiosInstance } from "../library/axiosInstance";
import type { LastSync } from "../types/lastSync";
import type { SyncOverview } from "../types/syncOverview";

export async function fetchLastSync(signal?: AbortSignal): Promise<LastSync | null> {
    const response = await axiosInstance.get<LastSync>("/api/v1/cwfis/sync/last-success", { signal });
    return response.status === 204 ? null : response.data;
}

export async function fetchSyncOverview(signal?: AbortSignal): Promise<SyncOverview> {
    const response = await axiosInstance.get<SyncOverview>("/api/v1/cwfis/sync/status", { signal });
    return response.data;
}
