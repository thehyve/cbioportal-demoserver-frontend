import * as React from 'react';
import { observer } from 'mobx-react';
import {
    DriverAnnotationSettings,
    IDriverAnnotationControlsHandlers,
    IDriverAnnotationControlsState,
    buildDriverAnnotationControlsHandlers,
    buildDriverAnnotationControlsState,
} from '../../shared/driverAnnotation/DriverAnnotationSettings';
import DriverAnnotationControls from '../../shared/components/driverAnnotations/DriverAnnotationControls';
import classNames from 'classnames';

export interface IStudyResultsSettingsProps {
    driverAnnotationSettings: DriverAnnotationSettings;
    customDriverAnnotationReport: () =>
        | { hasBinary: boolean; tiers: string[] }
        | undefined;
}

@observer
export default class StudyResultSettings extends React.Component<
    IStudyResultsSettingsProps,
    {}
> {
    private driverSettingsState: IDriverAnnotationControlsState;
    private driverSettingsHandlers: IDriverAnnotationControlsHandlers;

    constructor(props: IStudyResultsSettingsProps) {
        super(props);
        //TODO Find a good way to hide some checkboxes
        this.driverSettingsState = buildDriverAnnotationControlsState(
            props.driverAnnotationSettings,
            () => false,
            () => false,
            props.customDriverAnnotationReport
        );
        this.driverSettingsHandlers = buildDriverAnnotationControlsHandlers(
            props.driverAnnotationSettings,
            this.driverSettingsState
        );
    }

    render() {
        return (
            <div
                data-test="GlobalSettingsDropdown"
                className={classNames(
                    'cbioportal-frontend',
                    'globalSettingsDropdown'
                )}
                style={{ padding: 5 }}
            >
                <h5 style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                    Annotate Data
                </h5>
                <div style={{ marginLeft: 10 }}>
                    <DriverAnnotationControls
                        state={this.driverSettingsState}
                        handlers={this.driverSettingsHandlers}
                    />
                </div>
            </div>
        );
    }
}
