export interface PolylineOptions {
    color?: string;
}

export interface GPX_OPTIONS {
    parseElements: Array<"track" | "route" | "waypoint">;
    joinTrackSegments: boolean;
    max_point_interval: number;
    polyline_options: PolylineOptions;
}

export interface InfoItem {
    min: number;
    max: number;
    total: number;
    avg: number;
    points: any[];
}

export interface Elevation extends InfoItem {
    gain: number;
    loss: number;
}

export interface Duration
    extends Omit<InfoItem, "min" | "max" | "avg" | "points"> {
    start: Date;
    end: Date;
    moving: number;
    total: number;
}
export interface GPX_Data {
    flags: {
        elevation: boolean;
        speed: boolean;
        hr: boolean;
        duration: boolean;
        atemp: boolean;
        cad: boolean;
    };
    name?: string;
    coords?: any[];
    desc?: string;
    author?: string;
    copyright?: string;
    waypoints?: any[];
    styles?: any[];
    length?: number;
    elevation?: Elevation;
    speed?: InfoItem;
    hr?: InfoItem;
    duration?: Duration;
    atemp?: InfoItem;
    cad?: InfoItem;
}

export interface Coordinate {
    lat: number;
    lng: number;
    meta: {
        time: Date;
        elevation: number;
        hr: number;
        cad: number;
        atemp: number;
        speed: number;
    };
}
