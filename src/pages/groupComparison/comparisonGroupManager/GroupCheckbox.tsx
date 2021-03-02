import * as React from 'react';
import { observer } from 'mobx-react';
import {
    caseCounts,
    getNumPatients,
    getNumSamples,
    MissingSamplesMessage,
    StudyViewComparisonGroup,
} from '../GroupComparisonUtils';
import { StudyViewPageStore } from '../../studyView/StudyViewPageStore';
import autobind from 'autobind-decorator';
import { action, computed, makeObservable, observable } from 'mobx';
import ErrorIcon from '../../../shared/components/ErrorIcon';
import styles from '../styles.module.scss';
import { CirclePicker } from 'react-color';
import { OverlayTrigger, Popover } from 'react-bootstrap';
import { COLORS } from '../../studyView/StudyViewUtils';
import {
    CLI_FEMALE_COLOR,
    CLI_NO_COLOR,
    CLI_YES_COLOR,
    DARK_GREY,
} from '../../../shared/lib/Colors';
import {
    DefaultTooltip,
    EllipsisTextTooltip,
} from 'cbioportal-frontend-commons';
import classnames from 'classnames';
import { ColorPickerIcon } from 'pages/groupComparison/comparisonGroupManager/ColorPickerIcon';

export interface IGroupCheckboxProps {
    group: StudyViewComparisonGroup;
    store: StudyViewPageStore;
    markedForDeletion: boolean;
    markedWithWarningSign: boolean;
    studyIds: string[];
    restore: (group: StudyViewComparisonGroup) => void;
    delete: (group: StudyViewComparisonGroup) => void;
    shareGroup: (group: StudyViewComparisonGroup) => void;
    onChangeGroupColor: (
        group: StudyViewComparisonGroup,
        color: string | undefined
    ) => void;
}

const COLOR_UNDEFINED = '#FFFFFF';

@observer
export default class GroupCheckbox extends React.Component<
    IGroupCheckboxProps,
    {}
> {
    constructor(props: IGroupCheckboxProps) {
        super(props);
        makeObservable(this);
    }

    @autobind
    private onCheckboxClick() {
        this.props.store.toggleComparisonGroupSelected(this.props.group.uid);
        this.props.store.flagDuplicateColorsForSelectedGroups(
            this.props.group.uid,
            this.props.group.color!
        );
    }

    @autobind
    private onRestoreClick() {
        this.props.restore(this.props.group);
    }

    @autobind
    private onDeleteClick() {
        this.props.delete(this.props.group);
    }

    @autobind
    private shareGroup() {
        this.props.shareGroup(this.props.group);
    }

    @autobind
    private onOverlayEnter() {
        this.props.store.isColorChooserModalVisible = true;
    }

    @autobind
    private onOverlayExit() {
        this.props.store.isColorChooserModalVisible = false;
    }

    @computed get label() {
        return (
            <span style={{ display: 'flex', alignItems: 'center' }}>
                <EllipsisTextTooltip text={this.props.group.name} />
                &nbsp;(
                {caseCounts(
                    getNumSamples(this.props.group),
                    getNumPatients(this.props.group)
                )}
                )
            </span>
        );
    }

    @computed get colorList() {
        let colors: string[] = COLORS.slice(0, 20);
        colors.push(CLI_YES_COLOR);
        colors.push(CLI_NO_COLOR);
        colors.push(CLI_FEMALE_COLOR);
        colors.push(DARK_GREY);
        return colors;
    }

    @action.bound
    handleChangeComplete = (color: any, event: any) => {
        // if same color is select, unselect it (go back to no color)
        if (color.hex === this.props.group.color) {
            this.props.onChangeGroupColor(this.props.group, undefined);
            this.props.store.flagDuplicateColorsForSelectedGroups(
                this.props.group.uid,
                undefined
            );
        } else {
            this.props.onChangeGroupColor(this.props.group, color.hex);
            this.props.store.flagDuplicateColorsForSelectedGroups(
                this.props.group.uid,
                color.hex
            );
        }
        this.props.store.isColorChooserModalVisible = false;
    };

    buildColorChooserWidget = () => (
        <Popover
            id="popover-basic"
            onClick={e => {
                e.stopPropagation();
                e.preventDefault();
            }}
        >
            <div>
                <CirclePicker
                    colors={this.colorList}
                    circleSize={20}
                    circleSpacing={3}
                    onChangeComplete={this.handleChangeComplete}
                    color={this.props.group.color}
                    width="140px"
                />
            </div>
        </Popover>
    );

    render() {
        const group = this.props.group;
        let checkboxAndLabel;
        if (this.props.markedForDeletion) {
            checkboxAndLabel = (
                <span className={styles.markedForDeletion}>{this.label}</span>
            );
        } else {
            checkboxAndLabel = (
                <div
                    className={styles.groupItem}
                    style={{ display: 'flex', alignItems: 'center' }}
                >
                    <input
                        type="checkbox"
                        value={group.uid}
                        checked={this.props.store.isComparisonGroupSelected(
                            group.uid
                        )}
                        onClick={this.onCheckboxClick}
                    />
                    {this.label}
                </div>
            );
        }

        return (
            <div
                key={group.uid}
                className={classnames(styles.groupRow, {
                    [styles.sharedGroup]: this.props.group.isSharedGroup,
                })}
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: 4,
                    paddingTop: 4,
                    minHeight: '35px',
                }}
            >
                {checkboxAndLabel}

                <div className={styles.groupLineItemActionButtons}>
                    {!this.props.markedForDeletion && (
                        <>
                            <DefaultTooltip
                                overlay={
                                    'You have selected identical colors for compared groups.'
                                }
                            >
                                <span>
                                    {this.props.markedWithWarningSign && (
                                        <i
                                            className="fa fa-warning"
                                            style={{
                                                cursor: 'pointer',
                                                color: '#fad201',
                                                position: 'relative',
                                                top: '1px',
                                                right: '2px',
                                            }}
                                        />
                                    )}
                                </span>
                            </DefaultTooltip>
                            <OverlayTrigger
                                containerPadding={40}
                                trigger="click"
                                placement="bottom"
                                overlay={this.buildColorChooserWidget()}
                                onEnter={this.onOverlayEnter}
                                onExit={this.onOverlayExit}
                            >
                                <DefaultTooltip
                                    overlay={
                                        'Select color for group used in group comparison'
                                    }
                                >
                                    <span
                                        style={{ marginTop: 2, marginRight: 2 }}
                                    >
                                        <ColorPickerIcon
                                            color={
                                                this.props.group.color ||
                                                COLOR_UNDEFINED
                                            }
                                        />
                                    </span>
                                </DefaultTooltip>
                            </OverlayTrigger>

                            <DefaultTooltip overlay={'Delete Group'}>
                                <span onClick={this.onDeleteClick}>
                                    <i
                                        className="fa fa-md fa-trash"
                                        style={{
                                            cursor: 'pointer',
                                        }}
                                    />
                                </span>
                            </DefaultTooltip>
                            <span onClick={this.shareGroup}>
                                <i
                                    className="fa fa-share-alt"
                                    style={{
                                        cursor: 'pointer',
                                    }}
                                />
                            </span>
                        </>
                    )}
                    {this.props.group.nonExistentSamples.length > 0 && (
                        <ErrorIcon
                            tooltip={
                                <MissingSamplesMessage
                                    samples={
                                        this.props.group.nonExistentSamples
                                    }
                                />
                            }
                        />
                    )}
                    {this.props.markedForDeletion && (
                        <button
                            style={{ marginLeft: 10 }}
                            className="btn btn-xs btn-default"
                            onClick={this.onRestoreClick}
                        >
                            Restore
                        </button>
                    )}
                </div>
            </div>
        );
    }
}
