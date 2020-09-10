import { ObservableMap } from 'mobx';

export interface DriverAnnotationSettings {
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
}

export interface IDriverAnnotationControlsState {
    distinguishDrivers: boolean;

    annotateDriversOncoKbDisabled: boolean;
    annotateDriversOncoKbError: boolean;
    annotateDriversOncoKb: boolean;

    annotateDriversHotspotsDisabled?: boolean;
    annotateDriversHotspotsError?: boolean;
    annotateDriversHotspots?: boolean;

    annotateDriversCBioPortal: boolean;
    annotateCBioPortalInputValue: string;

    annotateDriversCOSMIC?: boolean;
    annotateCOSMICInputValue?: string;

    customDriverAnnotationBinaryMenuLabel?: string;
    customDriverAnnotationTiersMenuLabel?: string;
    customDriverAnnotationTiers?: string[];
    selectedCustomDriverAnnotationTiers?: ObservableMap<boolean>;
    annotateCustomDriverBinary?: boolean;
}

export interface IDriverAnnotationControlsHandlers {
    onSelectDistinguishDrivers: (distinguish: boolean) => void;
    onSelectAnnotateOncoKb: (annotate: boolean) => void;
    onSelectAnnotateHotspots?: (annotate: boolean) => void;
    onSelectAnnotateCBioPortal: (annotate: boolean) => void;
    onSelectAnnotateCOSMIC?: (annotate: boolean) => void;
    onChangeAnnotateCBioPortalInputValue: (value: string) => void;
    onChangeAnnotateCOSMICInputValue?: (value: string) => void;
    onSelectCustomDriverAnnotationBinary?: (s: boolean) => void;
    onSelectCustomDriverAnnotationTier?: (value: string, s: boolean) => void;
}
