import { ObservableMap } from 'mobx';

export type DriverAnnotationSettings = {
    excludeVUS: boolean;
    cbioportalCount: boolean;
    cbioportalCountThreshold: number;
    cosmicCount: boolean;
    cosmicCountThreshold: number;
    customBinary: boolean;
    customTiersDefault: boolean;
    driverTiers: ObservableMap<boolean>;
    hotspots: boolean;
    oncoKb: boolean;
    driversAnnotated: boolean;
};
