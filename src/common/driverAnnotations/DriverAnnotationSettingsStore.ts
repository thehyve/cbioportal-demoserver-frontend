import { observable, ObservableMap, reaction } from 'mobx';
import AppConfig from 'appConfig';
import ResultsViewURLWrapper from 'pages/resultsView/ResultsViewURLWrapper';

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

export class DriverAnnotationSettingsStore {
    public driverAnnotationsReactionDisposer: any;
    driverAnnotationSettings: DriverAnnotationSettings;

    // FIXME refactor into generic wrapper base class
    urlWrapper: ResultsViewURLWrapper;

    constructor(urlWrapper: ResultsViewURLWrapper) {
        this.urlWrapper = urlWrapper;

        const store = this;

        this.driverAnnotationSettings = observable({
            cbioportalCount: false,
            cbioportalCountThreshold: 0,
            cosmicCount: false,
            cosmicCountThreshold: 0,
            driverTiers: observable.map<boolean>(),

            _hotspots: false,
            _oncoKb: false,
            _excludeVUS: false,
            _customBinary: undefined,

            set hotspots(val: boolean) {
                this._hotspots = val;
            },
            get hotspots() {
                return !!AppConfig.serverConfig.show_hotspot && this._hotspots;
            },
            set oncoKb(val: boolean) {
                this._oncoKb = val;
            },
            get oncoKb() {
                return AppConfig.serverConfig.show_oncokb && this._oncoKb;
            },
            set excludeVUS(val: boolean) {
                this._excludeVUS = val;
            },
            get excludeVUS() {
                return this._excludeVUS && this.driversAnnotated;
            },
            get driversAnnotated() {
                const anySelected =
                    this.oncoKb ||
                    this.hotspots ||
                    this.cbioportalCount ||
                    this.cosmicCount ||
                    this.customBinary ||
                    this.driverTiers
                        .entries()
                        .reduce(
                            (
                                oneSelected: boolean,
                                nextEntry: [string, boolean]
                            ) => {
                                return oneSelected || nextEntry[1];
                            },
                            false
                        );

                return anySelected;
            },

            set customBinary(val: boolean) {
                this._customBinary = val;
            },
            get customBinary() {
                return this._customBinary === undefined
                    ? AppConfig.serverConfig
                          .oncoprint_custom_driver_annotation_binary_default
                    : this._customBinary;
            },
            get customTiersDefault() {
                return AppConfig.serverConfig
                    .oncoprint_custom_driver_annotation_tiers_default;
            },
        });

        // TODO make generic mechanism for reaction to
        this.driverAnnotationsReactionDisposer = reaction(
            () => this.urlWrapper.query.cancer_study_list,
            () => {
                this.initDriverAnnotationSettings();
            },
            { fireImmediately: true }
        );
    }

    destroy() {
        this.driverAnnotationsReactionDisposer();
    }

    public initDriverAnnotationSettings() {
        this.driverAnnotationSettings.cbioportalCount = false;
        this.driverAnnotationSettings.cbioportalCountThreshold = 10;
        this.driverAnnotationSettings.cosmicCount = false;
        this.driverAnnotationSettings.cosmicCountThreshold = 10;
        this.driverAnnotationSettings.driverTiers = observable.map<boolean>();
        (this.driverAnnotationSettings as any)._oncoKb = !!AppConfig
            .serverConfig.oncoprint_oncokb_default;
        this.driverAnnotationSettings.hotspots = !!AppConfig.serverConfig
            .oncoprint_hotspots_default;
        (this.driverAnnotationSettings as any)._excludeVUS = !!AppConfig
            .serverConfig.oncoprint_hide_vus_default;
    }
}
