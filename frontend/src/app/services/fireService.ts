import { axiosInstance } from "../library/axiosInstance";
import type { Fire } from "../types/fire";

export async function fetchFires(signal?: AbortSignal): Promise<Fire[]> {
    const response = await axiosInstance.get<Fire[]>("/api/v1/fires", { signal });
    return response.data;
}

export async function fetchFireById(nationalFireId: string): Promise<Fire> {
    const response = await axiosInstance.get<Fire>(`/api/v1/fires/${encodeURIComponent(nationalFireId)}`);
    return response.data;
}
