import { DefaultTooltip, setArrowLeft } from 'cbioportal-frontend-commons';
import ResultsPageSettings from 'pages/resultsView/settings/ResultsPageSettings';
import * as React from 'react';
import {
    IDriverSettingsProps,
    IExclusionSettings,
} from 'shared/driverAnnotation/DriverAnnotationSettings';
import { observer } from 'mobx-react';
import styles from './styles.module.scss';
import { computed } from 'mobx';

export interface ISettingsMenu {
    store: IDriverSettingsProps &
        IExclusionSettings &
        ISettingsMenuButtonVisible;
    resultsView?: boolean;
}

export interface ISettingsMenuButtonVisible {
    settingsMenuVisible: boolean;
}

@observer
export default class SettingsMenuButton extends React.Component<
    ISettingsMenu,
    {}
> {
    @computed get marginLeft() {
        if (this.props.resultsView) return 5;
        return 0;
    }

    @computed get marginRight() {
        if (!this.props.resultsView) return 5;
        return 0;
    }

    render() {
        return (
            <DefaultTooltip
                trigger={['click']}
                placement="bottomRight"
                overlay={
                    <ResultsPageSettings
                        store={this.props.store}
                        resultsView={this.props.resultsView}
                    />
                }
                visible={this.props.store.settingsMenuVisible}
                onVisibleChange={visible => {
                    this.props.store.settingsMenuVisible = !!visible;
                }}
                onPopupAlign={tooltipEl => setArrowLeft(tooltipEl, '22px')}
            >
                <button
                    data-test="GlobalSettingsButton"
                    style={{
                        marginRight: this.marginRight,
                        marginLeft: this.marginLeft,
                    }}
                    className="btn btn-primary"
                >
                    <i className="fa fa-sliders fa-lg" />
                </button>
            </DefaultTooltip>
        );
    }
}
