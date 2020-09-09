import { DriverAnnotationSettings } from '../ResultsViewPageStore';
import { action, observable } from 'mobx';
import AppConfig from 'appConfig';
import { IDriverAnnotationControlsState } from './DriverAnnotationControls';

export function buildDriverAnnotationControlsState(
    driverAnnotationSettings: DriverAnnotationSettings,
    didOncoKbFailInOncoprint: () => boolean,
    didHotspotFailInOncoprint: () => boolean,
    customDriverAnnotationReport: () =>
        | { hasBinary: boolean; tiers: string[] }
        | undefined
): IDriverAnnotationControlsState {
    return observable({
        get distinguishDrivers() {
            return driverAnnotationSettings.driversAnnotated;
        },
        get annotateDriversOncoKb() {
            return driverAnnotationSettings.oncoKb;
        },
        get annotateDriversOncoKbDisabled() {
            return !AppConfig.serverConfig.show_oncokb;
        },
        get annotateDriversOncoKbError() {
            return didOncoKbFailInOncoprint();
        },
        get annotateDriversHotspots() {
            return driverAnnotationSettings.hotspots;
        },
        get annotateDriversHotspotsDisabled() {
            return !AppConfig.serverConfig.show_hotspot;
        },
        get annotateDriversHotspotsError() {
            return didHotspotFailInOncoprint();
        },
        get annotateDriversCBioPortal() {
            return driverAnnotationSettings.cbioportalCount;
        },
        get annotateDriversCOSMIC() {
            return driverAnnotationSettings.cosmicCount;
        },
        get hidePutativePassengers() {
            return driverAnnotationSettings.excludeVUS;
        },
        get annotateCBioPortalInputValue() {
            return driverAnnotationSettings.cbioportalCountThreshold + '';
        },
        get annotateCOSMICInputValue() {
            return driverAnnotationSettings.cosmicCountThreshold + '';
        },
        get customDriverAnnotationBinaryMenuLabel() {
            const label =
                AppConfig.serverConfig
                    .oncoprint_custom_driver_annotation_binary_menu_label;
            const customDriverReport = customDriverAnnotationReport();
            if (label && customDriverReport && customDriverReport.hasBinary) {
                return label;
            } else {
                return undefined;
            }
        },
        get customDriverAnnotationTiersMenuLabel() {
            const label =
                AppConfig.serverConfig
                    .oncoprint_custom_driver_annotation_tiers_menu_label;
            const customDriverReport = customDriverAnnotationReport();
            if (
                label &&
                customDriverReport &&
                customDriverReport.tiers.length
            ) {
                return label;
            } else {
                return undefined;
            }
        },
        get customDriverAnnotationTiers() {
            const customDriverReport = customDriverAnnotationReport();
            if (customDriverReport && customDriverReport.tiers.length) {
                return customDriverReport.tiers;
            } else {
                return undefined;
            }
        },
        get annotateCustomDriverBinary() {
            return driverAnnotationSettings.customBinary;
        },
        get selectedCustomDriverAnnotationTiers() {
            return driverAnnotationSettings.driverTiers;
        },
    });
}

export function buildDriverAnnotationControlsHandlers(
    driverAnnotationSettings: DriverAnnotationSettings,
    state: IDriverAnnotationControlsState
) {
    const handlers = {
        onSelectDistinguishDrivers: action((s: boolean) => {
            if (!s) {
                driverAnnotationSettings.oncoKb = false;
                driverAnnotationSettings.hotspots = false;
                driverAnnotationSettings.cbioportalCount = false;
                driverAnnotationSettings.cosmicCount = false;
                driverAnnotationSettings.customBinary = false;
                driverAnnotationSettings.driverTiers.forEach((value, key) => {
                    driverAnnotationSettings.driverTiers.set(key, false);
                });
                driverAnnotationSettings.excludeVUS = false;
            } else {
                if (
                    !state.annotateDriversOncoKbDisabled &&
                    !state.annotateDriversOncoKbError
                )
                    driverAnnotationSettings.oncoKb = true;

                if (
                    !state.annotateDriversHotspotsDisabled &&
                    !state.annotateDriversHotspotsError
                )
                    driverAnnotationSettings.hotspots = true;

                driverAnnotationSettings.cbioportalCount = true;
                driverAnnotationSettings.cosmicCount = true;
                driverAnnotationSettings.customBinary = true;
                driverAnnotationSettings.driverTiers.forEach((value, key) => {
                    driverAnnotationSettings.driverTiers.set(key, true);
                });
            }
        }),
        onSelectAnnotateOncoKb: action((s: boolean) => {
            driverAnnotationSettings.oncoKb = s;
        }),
        onSelectAnnotateHotspots: action((s: boolean) => {
            driverAnnotationSettings.hotspots = s;
        }),
        onSelectAnnotateCBioPortal: action((s: boolean) => {
            driverAnnotationSettings.cbioportalCount = s;
        }),
        onSelectAnnotateCOSMIC: action((s: boolean) => {
            driverAnnotationSettings.cosmicCount = s;
        }),
        onChangeAnnotateCBioPortalInputValue: action((s: string) => {
            driverAnnotationSettings.cbioportalCountThreshold = parseInt(s, 10);
            handlers.onSelectAnnotateCBioPortal &&
                handlers.onSelectAnnotateCBioPortal(true);
        }),
        onChangeAnnotateCOSMICInputValue: action((s: string) => {
            driverAnnotationSettings.cosmicCountThreshold = parseInt(s, 10);
            handlers.onSelectAnnotateCOSMIC &&
                handlers.onSelectAnnotateCOSMIC(true);
        }),
        onSelectCustomDriverAnnotationBinary: action((s: boolean) => {
            driverAnnotationSettings.customBinary = s;
        }),
        onSelectCustomDriverAnnotationTier: action(
            (value: string, checked: boolean) => {
                driverAnnotationSettings.driverTiers.set(value, checked);
            }
        ),
        onSelectHidePutativePassengers: (s: boolean) => {
            driverAnnotationSettings.excludeVUS = s;
        },
    };
    return handlers;
}
