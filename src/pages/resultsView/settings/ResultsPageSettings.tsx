import * as React from 'react';
import { observer } from 'mobx-react';
import { DriverAnnotationSettings } from '../../../shared/driverAnnotation/DriverAnnotationSettings';
import autobind from 'autobind-decorator';
import DriverAnnotationControls, {
    IDriverAnnotationControlsHandlers,
    IDriverAnnotationControlsState,
} from './DriverAnnotationControls';
import {
    buildDriverAnnotationControlsHandlers,
    buildDriverAnnotationControlsState,
} from './ResultsPageSettingsUtils';
import InfoIcon from '../../../shared/components/InfoIcon';
import styles from './styles.module.scss';
import classNames from 'classnames';

export interface IResultsPageSettingsProps {
    driverAnnotationSettings: DriverAnnotationSettings;
    didOncoKbFailInOncoprint: () => boolean;
    didHotspotFailInOncoprint: () => boolean;
    customDriverAnnotationReport: () =>
        | { hasBinary: boolean; tiers: string[] }
        | undefined;
    exclusionSetting: {
        hideUnprofiledSamples: boolean;
        excludeGermlineMutations: boolean;
    };
}

enum EVENT_KEY {
    hidePutativePassengers = '0',
    showGermlineMutations = '1',
    hideUnprofiledSamples = '1.1',
}

function boldedTabList(tabs: string[]) {
    return (
        <span>
            {tabs.map((tab, index) => (
                <span>
                    <strong>{tab}</strong>
                    {index < tabs.length - 1 ? ', ' : ''}
                </span>
            ))}
        </span>
    );
}

@observer
export default class ResultsPageSettings extends React.Component<
    IResultsPageSettingsProps,
    {}
> {
    private driverSettingsState: IDriverAnnotationControlsState;
    private driverSettingsHandlers: IDriverAnnotationControlsHandlers;

    constructor(props: IResultsPageSettingsProps) {
        super(props);
        this.driverSettingsState = buildDriverAnnotationControlsState(
            props.driverAnnotationSettings,
            props.didOncoKbFailInOncoprint,
            props.didHotspotFailInOncoprint,
            props.customDriverAnnotationReport
        );
        this.driverSettingsHandlers = buildDriverAnnotationControlsHandlers(
            props.driverAnnotationSettings,
            this.driverSettingsState
        );
    }

    @autobind private onInputClick(event: React.MouseEvent<HTMLInputElement>) {
        switch ((event.target as HTMLInputElement).value) {
            case EVENT_KEY.hidePutativePassengers:
                this.props.driverAnnotationSettings.excludeVUS = !this.props
                    .driverAnnotationSettings.excludeVUS;
                break;
            case EVENT_KEY.hideUnprofiledSamples:
                this.props.exclusionSetting.hideUnprofiledSamples = !this.props
                    .exclusionSetting.hideUnprofiledSamples;
                break;
            case EVENT_KEY.showGermlineMutations:
                this.props.exclusionSetting.excludeGermlineMutations = !this
                    .props.exclusionSetting.excludeGermlineMutations;
                break;
        }
    }

    render() {
        return (
            <div
                data-test="GlobalSettingsDropdown"
                className={classNames(
                    'cbioportal-frontend',
                    styles.globalSettingsDropdown
                )}
                style={{ padding: 5 }}
            >
                <h5 style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                    Annotate Data
                </h5>
                <InfoIcon
                    divStyle={{ display: 'inline-block', marginLeft: 6 }}
                    style={{ color: 'rgb(54, 134, 194)' }}
                    tooltip={
                        <span>
                            Putative driver vs VUS setings apply to every tab
                            except{' '}
                            {boldedTabList(['Co-expression', 'CN Segments'])}
                        </span>
                    }
                />
                <div style={{ marginLeft: 10 }}>
                    <DriverAnnotationControls
                        state={this.driverSettingsState}
                        handlers={this.driverSettingsHandlers}
                    />
                </div>

                <hr />

                <h5 style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                    Filter Data
                </h5>
                <div style={{ marginLeft: 10 }}>
                    <div className="checkbox">
                        <label>
                            <input
                                data-test="HideVUS"
                                type="checkbox"
                                value={EVENT_KEY.hidePutativePassengers}
                                checked={
                                    this.props.driverAnnotationSettings
                                        .excludeVUS
                                }
                                onClick={this.onInputClick}
                                disabled={
                                    !this.driverSettingsState.distinguishDrivers
                                }
                            />{' '}
                            Exclude mutations and copy number alterations of
                            unknown significance
                        </label>
                    </div>
                    <div className="checkbox">
                        <label>
                            <input
                                data-test="HideGermline"
                                type="checkbox"
                                value={EVENT_KEY.showGermlineMutations}
                                checked={
                                    this.props.exclusionSetting
                                        .excludeGermlineMutations
                                }
                                onClick={this.onInputClick}
                            />{' '}
                            Exclude germline mutations
                        </label>
                    </div>
                    <div className="checkbox">
                        <label>
                            <input
                                data-test="HideUnprofiled"
                                type="checkbox"
                                value={EVENT_KEY.hideUnprofiledSamples}
                                checked={
                                    this.props.exclusionSetting
                                        .hideUnprofiledSamples
                                }
                                onClick={this.onInputClick}
                            />{' '}
                            Exclude samples that are not profiled for all
                            queried genes in all queried profiles
                        </label>
                    </div>
                </div>
            </div>
        );
    }
}
