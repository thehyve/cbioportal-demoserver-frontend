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
import { IServerConfig } from 'config/IAppConfig';
import AppConfig from 'appConfig';

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

        const serverConfig = AppConfig.serverConfig;
        const config = Object.assign({}, serverConfig, {
            show_oncokb: false,
            show_hotspot: false,
        });
        console.log(config);
        this.driverSettingsState = buildDriverAnnotationControlsState(
            props.driverAnnotationSettings,
            undefined,
            undefined,
            props.customDriverAnnotationReport,

            config
        );
        this.driverSettingsHandlers = buildDriverAnnotationControlsHandlers(
            props.driverAnnotationSettings,
            this.driverSettingsState
        );
        //FIXME improve the way to hide the cbio and cosmic checkboxes
        this.driverSettingsHandlers.onChangeAnnotateCBioPortalInputValue = undefined;
        this.driverSettingsHandlers.onChangeAnnotateCOSMICInputValue = undefined;
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
