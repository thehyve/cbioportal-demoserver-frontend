import * as React from 'react';
import styles from './tables.module.scss';
import classnames from 'classnames';
import { EllipsisTextTooltip } from 'cbioportal-frontend-commons';
import { FreqColumnTypeEnum } from '../TableUtils';
import { action, computed, makeObservable } from 'mobx';
import { observer } from 'mobx-react';
import { Else, If, Then } from 'react-if';
import _ from 'lodash';
import { StructVarGene1Gene2 } from 'pages/studyView/StudyViewUtils';

export type IStructVarCellProps = {
    tableType: FreqColumnTypeEnum;
    uniqueRowId: string;
    selectedStructVars: StructVarGene1Gene2[];
    label?: string;
    gene1HugoSymbol?: string;
    gene2HugoSymbol?: string;
    isCancerGene: boolean;
    oncokbAnnotated: boolean;
    isOncogene: boolean;
    isTumorSuppressorGene: boolean;
    hoveredStructVarRowIds: string[];
    onStructVarSelect?: (
        gene1HugoSymbol: string | undefined,
        gene2HugoSymbol: string | undefined
    ) => void;
    onGeneHovered?: (uniqueRowId: string, isHovered: boolean) => void;
};

@observer
export class StructVarCell extends React.Component<IStructVarCellProps, {}> {
    constructor(props: IStructVarCellProps) {
        super(props);
        makeObservable(this);
    }

    @action.bound
    onHover(isVisible: boolean) {
        if (this.props.onGeneHovered) {
            this.props.onGeneHovered(this.props.uniqueRowId, isVisible);
        }
    }

    @action.bound
    private onStructVarSelect() {
        if (this.props.onStructVarSelect) {
            this.props.onStructVarSelect!(
                this.props.gene1HugoSymbol,
                this.props.gene2HugoSymbol
            );
        }
    }

    @computed
    get showCheckbox() {
        return this.props.hoveredStructVarRowIds.includes(
            this.props.uniqueRowId
        );
    }

    @computed
    get isCheckBoxChecked() {
        const gene1Str = this.props.gene1HugoSymbol;
        const gene2Str = this.props.gene2HugoSymbol;
        return !!_.find(
            this.props.selectedStructVars,
            sv => sv.gene1 === gene1Str && sv.gene2 === gene2Str
        );
    }

    render() {
        return (
            <div
                data-test="structVarNameCell"
                className={classnames(styles.geneSymbol, styles.displayFlex)}
                onMouseEnter={() => this.onHover(true)}
                onMouseLeave={() => this.onHover(false)}
                onClick={this.onStructVarSelect}
            >
                <If condition={this.props.label}>
                    <EllipsisTextTooltip text={this.props.label} />
                </If>
                <If condition={this.showCheckbox || this.isCheckBoxChecked}>
                    <Then>
                        <span style={{ marginLeft: 5 }}>
                            <If condition={this.isCheckBoxChecked}>
                                <Then>
                                    <i className="fa fa-check-square-o"></i>
                                </Then>
                                <Else>
                                    <i className="fa fa-square-o"></i>
                                </Else>
                            </If>
                        </span>
                    </Then>
                    <Else>
                        {/*If there is no label defined, add some whitespace so that the*/}
                        {/*the user can trigger a hover event more.*/}
                        <If condition={!this.props.label}>
                            <span>&nbsp;</span>
                        </If>
                    </Else>
                </If>
            </div>
        );
    }
}
