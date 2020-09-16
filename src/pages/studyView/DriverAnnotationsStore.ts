import {
    buildDriverAnnotationSettings,
    DriverAnnotationSettings,
    IAlterationExclusionSettings,
    IDriverSettingsProps,
} from 'shared/driverAnnotation/DriverAnnotationSettings';
import { observable } from 'mobx';

export interface IDriverAnnotationReport {
    hasBinary: boolean;
    tiers: string[];
}

export class DriverAnnotationsStore implements IDriverSettingsProps {
    @observable driverAnnotationSettings: DriverAnnotationSettings;
    @observable customDriverAnnotationReport: () => IDriverAnnotationReport;
    @observable exclusionSetting: IAlterationExclusionSettings;

    constructor() {
        this.driverAnnotationSettings = buildDriverAnnotationSettings(
            () => false
        );
        //TODO Fill in real data
        this.customDriverAnnotationReport = () => {
            return {
                hasBinary: true,
                tiers: ['A', 'B'],
            };
        };
        this.exclusionSetting = {
            excludeGermlineMutations: false,
            hideUnprofiledSamples: false,
        };
    }
}
