import * as React from 'react';
import { observer } from 'mobx-react';
import { ResultsViewPageStore } from '../../../pages/resultsView/ResultsViewPageStore';
import { computed } from 'mobx';
import { MakeMobxView } from '../MobxView';
import classnames from 'classnames';

export interface IAlterationFilterWarningProps {
    store: ResultsViewPageStore;
    isUnaffected?: boolean;
    mutationsTabModeSettings?: {
        // if set, then we show in "mutations tab mode" - different text, different source of exclude state, and toggleable exclude state
        excludeVUS: boolean;
        excludeGermline: boolean;
        excludeLoh: boolean;
        toggleExcludeVUS: () => void;
        toggleExcludeGermline: () => void;
        toggleExcludeLoh: () => void;
        hugoGeneSymbol: string;
    };
}

@observer
export default class AlterationFilterWarning extends React.Component<IAlterationFilterWarningProps,
    {}> {
    @computed get excludeVUS() {
        if (this.props.mutationsTabModeSettings) {
            return this.props.mutationsTabModeSettings.excludeVUS;
        } else {
            return this.props.store.driverAnnotationSettings.excludeVUS;
        }
    }

    @computed get excludeGermline() {
        if (this.props.mutationsTabModeSettings) {
            return this.props.mutationsTabModeSettings.excludeGermline;
        } else {
            return this.props.store.excludeGermlineMutations;
        }
    }

    @computed get excludeLoh() {
        if (this.props.mutationsTabModeSettings) {
            return this.props.mutationsTabModeSettings.excludeLoh;
        } else {
            return this.props.store.excludeLohMutations;
        }
    }

    @computed get vusToggleable() {
        return (
            this.props.mutationsTabModeSettings &&
            this.props.store.driverAnnotationSettings.excludeVUS
        );
    }

    @computed get germlineToggleable() {
        return (
            this.props.mutationsTabModeSettings &&
            this.props.store.excludeGermlineMutations
        );
    }

    @computed get lohToggleable() {
        return (
            this.props.mutationsTabModeSettings &&
            this.props.store.excludeLohMutations
        );
    }

    readonly vusWarning = MakeMobxView({
        await: () => {
            if (this.props.mutationsTabModeSettings) {
                return [this.props.store.mutationsReportByGene];
            } else {
                return [
                    this.props.store.oqlFilteredMutationsReport,
                    this.props.store.oqlFilteredMolecularDataReport,
                ];
            }
        },
        render: () => {
            let count = 0;
            const vusTypes = {
                mutation: false,
                cna: false,
            };
            if (this.props.mutationsTabModeSettings) {
                const report = this.props.store.mutationsReportByGene.result![
                    this.props.mutationsTabModeSettings.hugoGeneSymbol
                    ];
                count = report.vus.length +
                    report.vusAndGermline.length +
                    report.vusAndLoh.length;
                if (count > 0) {
                    vusTypes.mutation = true;
                }
            } else {
                const mutationReport = this.props.store
                    .oqlFilteredMutationsReport.result!;
                const mutationVusCount =
                    mutationReport.vus.length +
                    mutationReport.vusAndGermline.length +
                    mutationReport.vusAndLoh.length;
                const cnaVusCount = this.props.store
                    .oqlFilteredMolecularDataReport.result!.vus.length;
                count = mutationVusCount + cnaVusCount;
                if (mutationVusCount > 0) {
                    vusTypes.mutation = true;
                }
                if (cnaVusCount > 0) {
                    vusTypes.cna = true;
                }
            }

            const toggle = this.props.mutationsTabModeSettings ? this.props.mutationsTabModeSettings.toggleExcludeVUS : undefined;
            return this.renderWarningMessage(
                this.getVusDescription(vusTypes, count > 1),
                count,
                this.excludeVUS,
                toggle
            )
        }
    });
    
    private getVusDescription(
        types: { mutation: boolean; cna: boolean },
        plural: boolean
    ):string {
        const descriptions = [];
        if (types.mutation) {
            descriptions.push(`mutation${plural ? 's' : ''}`);
        }
        if (types.cna) {
            descriptions.push(`copy number alteration${plural ? 's' : ''}`);
        }
        return `${descriptions.join(' and ')} of unknown significance`;
    };

    readonly germlineWarning = MakeMobxView({
        await: () => {
            if (this.props.mutationsTabModeSettings) {
                return [this.props.store.mutationsReportByGene];
            } else {
                return [this.props.store.oqlFilteredMutationsReport];
            }
        },
        render: () => {
            let report;
            if (this.props.mutationsTabModeSettings) {
                report = this.props.store.mutationsReportByGene.result![
                    this.props.mutationsTabModeSettings.hugoGeneSymbol
                    ];
            } else {
                report = this.props.store.oqlFilteredMutationsReport.result!;
            }
            const count = report.germline.length + report.vusAndGermline.length;
            const toggle = this.props.mutationsTabModeSettings? this.props.mutationsTabModeSettings.toggleExcludeGermline : undefined;
            return this.renderWarningMessage(
                'germline mutations',
                count,
                this.excludeGermline,
                toggle,
            )
        }
    });
    
    readonly lohWarning = MakeMobxView({
        await: () => {
            if (this.props.mutationsTabModeSettings) {
                return [this.props.store.mutationsReportByGene];
            } else {
                return [this.props.store.oqlFilteredMutationsReport];
            }
        },
        render: () => {
            let report;
            if (this.props.mutationsTabModeSettings) {
                report = this.props.store.mutationsReportByGene.result![
                    this.props.mutationsTabModeSettings.hugoGeneSymbol
                    ];
            } else {
                report = this.props.store.oqlFilteredMutationsReport.result!;
            }
            const count = report.loh.length + report.vusAndLoh.length;
            const toggle = this.props.mutationsTabModeSettings? this.props.mutationsTabModeSettings.toggleExcludeLoh : undefined;
            return this.renderWarningMessage(
                'loss of heterozygosity events',
                count,
                this.excludeLoh,
                toggle)
        }
    });

    private renderWarningMessage(type: string, count: number, exclude: boolean, onClickHandler: (() => void) | undefined) {
        if (count > 0) {
            const is = count === 1 ? 'is' : 'are';
            const does = count === 1 ? 'does' : 'do';
            const anAlteration = count === 1 ? 'an alteration' : 'alterations';
            if (this.props.isUnaffected && exclude) {
                return (
                    <div className="alert alert-unaffected">
                        <i
                            className="fa fa-md fa-info-circle"
                            style={{
                                verticalAlign: 'middle !important',
                                marginRight: 6,
                                marginBottom: 1,
                            }}
                        />
                        {`${count} ${type} ${is} included in analysis.`}
                    </div>
                );
            } else if (exclude || onClickHandler) {
                return (
                    <div className="alert alert-info">
                        <img
                            src={require('../../../rootImages/funnel.svg')}
                            style={{
                                marginRight: 6,
                                width: 15,
                                marginTop: -2,
                            }}
                        />
                        {exclude
                            ? `${count} ${type} ${
                                this.props.mutationsTabModeSettings
                                    ? `${is} hidden below.`
                                    : `${does} not count as ${anAlteration} for this analysis.`
                            }`
                            : `${count} ${type} ${is} ${
                                this.props.mutationsTabModeSettings
                                    ? 'shown below.'
                                    : 'included in analysis.'
                            }`}
                        {onClickHandler && (
                            <button
                                onClick={onClickHandler}
                                className="btn btn-default btn-xs"
                                style={{marginLeft: 5}}
                            >
                                {exclude
                                    ? this.props.mutationsTabModeSettings
                                        ? 'Show'
                                        : 'Include'
                                    : this.props.mutationsTabModeSettings
                                        ? 'Hide'
                                        : 'Exclude'}
                            </button>
                        )}
                    </div>
                );
            }
        } else {
            return null;
        }
    };
 
    render() {
        return (
            <>
                {this.vusWarning.component}
                {this.germlineWarning.component}
                {this.lohWarning.component}
            </>
        );
    }
}
