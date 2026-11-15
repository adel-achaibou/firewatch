export type SyncState = "RUNNING" | "SUCCESS" | "FAILED" | "INTERRUPTED";

export type SyncOverview = {
    latestStatus: SyncState | null;
    latestStartedAt: string | null;
    lastSuccessfulAt: string | null;
};
