import { DefaultTooltip, setArrowLeft } from 'cbioportal-frontend-commons';
import SettingsMenu from './SettingsMenu';
import * as React from 'react';
import {
    IDriverSettingsProps,
    IExclusionSettings,
} from 'shared/driverAnnotation/DriverAnnotationSettings';
import { observer } from 'mobx-react';
import { computed, observable } from 'mobx';

export interface ISettingsMenu {
    store: IDriverSettingsProps &
        IExclusionSettings &
        ISettingsMenuButtonVisible;
    resultsView?: boolean;
}

export interface ISettingsMenuButtonVisible {
    settingsMenuVisible?: boolean;
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

    @observable visible = false;

    // determine whether visibility is controlled by a
    // store component or by local state
    @computed get visibilityState() {
        if (this.props.store.settingsMenuVisible !== undefined)
            return this.props.store.settingsMenuVisible;
        return this.visible;
    }

    private setVisibilityState(visible: boolean | undefined) {
        if (visible !== undefined) {
            if (this.props.store.settingsMenuVisible !== undefined)
                this.props.store.settingsMenuVisible = !!visible;
            else this.visible = !!visible;
        }
    }

    render() {
        return (
            <DefaultTooltip
                trigger={['click']}
                placement="bottomRight"
                overlay={
                    <SettingsMenu
                        store={this.props.store}
                        resultsView={this.props.resultsView}
                    />
                }
                visible={this.visibilityState}
                onVisibleChange={visible => {
                    this.setVisibilityState(visible);
                }}
                onPopupAlign={tooltipEl => setArrowLeft(tooltipEl, '22px')}
            >
                <button
                    data-test="GlobalSettingsButton"
                    style={{
                        height: 38,
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
