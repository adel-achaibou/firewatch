// Use interface to define object structure
// export interface Fire {
//    nationalFireId: string;
//    latitude: number;
//    longitude: number;
// }

// Use type also for object structure, but use it when there's a limited number of possibilities

// export type MapMode = "GPS" | "THEMATIC";
// export type LoadingStatus =
//    "idle" | "loading" | "success" | "error";

export interface Fire {
    nationalFireId: string
    agencyCode: string
    latitude: number
    longitude: number
    stageOfControlStatus: string
    fireSize: number | null
    nationalFireCause: string | null
    percentContained: number | null
    statusDate: string | null
}