import autobind from "autobind-decorator";
import _ from "lodash";
import { action, computed, observable } from "mobx";
import { Observer, observer } from "mobx-react";
import * as React from "react";
import { FormControl } from "react-bootstrap";
import fileDownload from 'react-file-download';
import ReactSelect from "react-select";
import LoadingIndicator from "shared/components/loadingIndicator/LoadingIndicator";
import ScatterPlot from "shared/components/plots/ScatterPlot";
import WaterfallPlot from "shared/components/plots/WaterfallPlot";
import TablePlot from "shared/components/plots/TablePlot";
import { ClinicalAttribute } from "../../../shared/api/generated/CBioPortalAPI";
import { remoteData } from "../../../shared/api/remoteData";
import DownloadControls from "../../../shared/components/downloadControls/DownloadControls";
import OqlStatusBanner from "../../../shared/components/oqlStatusBanner/OqlStatusBanner";
import BoxScatterPlot, { IBoxScatterPlotData } from "../../../shared/components/plots/BoxScatterPlot";
import { scatterPlotSize } from "../../../shared/components/plots/PlotUtils";
import { getTablePlotDownloadData } from "../../../shared/components/plots/TablePlotUtils";
import ScrollBar from "../../../shared/components/Scrollbar/ScrollBar";
import { getMobxPromiseGroupStatus } from "../../../shared/lib/getMobxPromiseGroupStatus";
import onMobxPromise from "../../../shared/lib/onMobxPromise";
import { AlterationTypeConstants, ResultsViewPageStore } from "../ResultsViewPageStore";
import { boxPlotTooltip, CLIN_ATTR_DATA_TYPE, CNA_STROKE_WIDTH, dataTypeDisplayOrder, 
    dataTypeToDisplayType, GENESET_DATA_TYPE, TREATMENT_DATA_TYPE, getAxisLabel, 
    getBoxPlotDownloadData, getCnaQueries, getMutationQueries, getScatterPlotDownloadData, 
    IBoxScatterPlotPoint, INumberAxisData, IScatterPlotData, IScatterPlotSampleData, isNumberData, 
    isStringData, IStringAxisData, logScalePossible, makeAxisDataPromise, makeBoxScatterPlotData, 
    makeScatterPlotData, makeScatterPlotPointAppearance, MutationSummary, mutationSummaryToAppearance, 
    PLOT_SIDELENGTH, scatterPlotLegendData, scatterPlotTooltip, scatterPlotZIndexSortBy, 
    sortMolecularProfilesForDisplay, makeWaterfallPlotData, IWaterfallPlotData,
    waterfallPlotTooltip } from "./PlotsTabUtils";
import "./styles.scss";
import Timer = NodeJS.Timer;

enum EventKey {
    horz_logScale,
    vert_logScale,
    utilities_viewMutationType,
    utilities_viewCopyNumber,
    utilities_viewTruncatedValues
}


export enum ViewType {
    MutationType,
    MutationTypeAndCopyNumber,
    CopyNumber,
    MutationSummary,
    Truncated,
    TruncatedMutationSummary,
    TruncatedMutationType,
    TruncatedCopyNumber,
    TruncatedMutationTypeAndCopyNumber,
    None
}

export enum PotentialViewType {
    MutationTypeAndCopyNumber,
    MutationSummary,
    None,
    TruncatedMutationTypeAndCopyNumber,
    TruncatedMutationSummary,
    Truncated
}

export enum PlotType {
    ScatterPlot,
    WaterfallPlot,
    BoxPlot,
    Table
}

export enum MutationCountBy {
    MutationType = "MutationType",
    MutatedVsWildType = "MutatedVsWildType"
}

export type AxisMenuSelection = {
    entrezGeneId?:number;
    genesetId?:string;
    treatmentId?:string;
    selectedGeneOption?:{value:number, label:string}; // value is entrez id, label is hugo symbol
    selectedGenesetOption?:{value:string, label:string};
    selectedTreatmentOption?:{value:string, label:string};
    dataType?:string;
    dataSourceId?:string;
    mutationCountBy:MutationCountBy;
    logScale: boolean;
};

export interface IPlotsTabProps {
    store:ResultsViewPageStore;
};

const searchInputTimeoutMs = 600;

class PlotsTabScatterPlot extends ScatterPlot<IScatterPlotData> {}
class PlotsTabBoxPlot extends BoxScatterPlot<IBoxScatterPlotPoint> {}
class PlotsTabWaterfallPlot extends WaterfallPlot<IWaterfallPlotData> {}

const SVG_ID = "plots-tab-plot-svg";

export const NONE_SELECTED_OPTION_STRING_VALUE = "none";
export const NONE_SELECTED_OPTION_NUMERICAL_VALUE = -1;
export const NONE_SELECTED_OPTION_LABEL = "--";
export const SAME_SELECTED_OPTION_STRING_VALUE = "same";
export const SAME_SELECTED_OPTION_NUMERICAL_VALUE = -2;

const mutationCountByOptions = [
    { value: MutationCountBy.MutationType, label: "Mutation Type" },
    { value: MutationCountBy.MutatedVsWildType, label: "Mutated vs Wild-type" }
];

@observer
export default class PlotsTab extends React.Component<IPlotsTabProps,{}> {

    private horzSelection:AxisMenuSelection;
    private vertSelection:AxisMenuSelection;

    private scrollPane:HTMLDivElement;

    @observable searchCaseInput:string;
    @observable searchMutationInput:string;
    @observable viewMutationType:boolean = true;
    @observable viewCopyNumber:boolean = false;
    @observable viewTruncatedValues:boolean = true;

    @observable searchCase:string = "";
    @observable searchMutation:string = "";
    @observable plotExists = false;

    @autobind
    private getScrollPane(){
        return this.scrollPane;
    }

    // determine whether formatting for points in the scatter plot (based on
    // mutations type, CNA, ...) will actually be shown in the plot (depends
    // on user choice via check boxes).
    @computed get viewType():ViewType {
        let ret:ViewType = ViewType.None;
        switch (this.potentialViewType) {
            case PotentialViewType.MutationTypeAndCopyNumber:
                if (this.viewMutationType && this.viewCopyNumber) {
                    ret = ViewType.MutationTypeAndCopyNumber;
                } else if (this.viewMutationType) {
                    ret = ViewType.MutationType;
                } else if (this.viewCopyNumber) {
                    ret = ViewType.CopyNumber;
                } else {
                    ret = ViewType.None;
                }
                break;
            case PotentialViewType.MutationSummary:
                if (this.viewMutationType) {
                    ret = ViewType.MutationSummary;
                } else {
                    ret = ViewType.None;
                }
                break;
            case PotentialViewType.TruncatedMutationTypeAndCopyNumber:
                if (this.viewMutationType && this.viewCopyNumber && this.viewTruncatedValues) {
                    ret = ViewType.TruncatedMutationTypeAndCopyNumber;
                } else if (this.viewMutationType && this.viewCopyNumber) {
                    ret = ViewType.MutationTypeAndCopyNumber;
                } else if (this.viewMutationType && this.viewTruncatedValues) {
                    ret = ViewType.TruncatedMutationType;
                } else if (this.viewCopyNumber && this.viewTruncatedValues) {
                    ret = ViewType.TruncatedCopyNumber;
                } else if (this.viewMutationType) {
                    ret = ViewType.MutationType;
                } else if (this.viewCopyNumber) {
                    ret = ViewType.CopyNumber;
                } else if (this.viewTruncatedValues) {
                    ret = ViewType.Truncated;
                } else {
                    ret = ViewType.None;
                }
            break;
            case PotentialViewType.TruncatedMutationSummary:
            if (this.viewMutationType && this.viewTruncatedValues) {
                ret = ViewType.TruncatedMutationSummary;
            } else if (this.viewMutationType) {
                ret = ViewType.MutationSummary;
            } else if (this.viewTruncatedValues) {
                ret = ViewType.Truncated;
            } else {
                ret = ViewType.None;
            }
            break;
            case PotentialViewType.Truncated:
                if (this.viewTruncatedValues) {
                    ret = ViewType.Truncated;
                }
            break;
        }
        return ret;
    }

    // determine whether the selected DataTypes support formatting options
    // for points in the scatter plot (based on mutations type, CNA, ...)
    // NOTE1: the order of these statements is critical for correct resolution
    // NOTE2: truncted values are only supported for treatment outcome profiles
    @computed get potentialViewType():PotentialViewType {
        // cant show either in table
        if (this.plotType.result === PlotType.Table) {
            return PotentialViewType.None;
        }
        // both axes molecular profile, same gene
        if (this.sameGeneInBothAxes) {
            return PotentialViewType.MutationTypeAndCopyNumber;
        }
        // both axes molecular profile, different gene
        if (this.bothAxesMolecularProfile) {
            return PotentialViewType.MutationSummary;
        }
        // one axis molecular profile
        if (this.horzSelection.dataType !== CLIN_ATTR_DATA_TYPE ||
            this.vertSelection.dataType !== CLIN_ATTR_DATA_TYPE) {
            //  establish whether data may contain truncated values 
            // (for now only supported for treatment data) 
            if (this.truncatedValuesCanBeShown) {
                return PotentialViewType.TruncatedMutationTypeAndCopyNumber;
            }
            return PotentialViewType.MutationTypeAndCopyNumber;
        }
        
        
        //  establish whether data may contain truncated values
        // (for now only supported for treatment data) 
        if (this.truncatedValuesCanBeShown) {
            return PotentialViewType.Truncated;
        }
        
        // neither axis gene or treatment
        return PotentialViewType.None;
    }

    private searchCaseTimeout:Timer;
    private searchMutationTimeout:Timer;

    constructor(props:IPlotsTabProps) {
        super(props);

        this.horzSelection = this.initAxisMenuSelection(false);
        this.vertSelection = this.initAxisMenuSelection(true);

        this.searchCaseInput = "";
        this.searchMutationInput = "";

        (window as any).resultsViewPlotsTab = this;
    }

    @autobind
    private getSvg() {
        return document.getElementById(SVG_ID) as SVGElement | null;
    }

    private downloadFilename = "plot"; // todo: more specific?

    private initAxisMenuSelection(vertical:boolean):AxisMenuSelection {
        const self = this;

        return observable({
            get entrezGeneId() {
                if (this.dataType !== CLIN_ATTR_DATA_TYPE && this.selectedGeneOption) {
                    if (this.selectedGeneOption.value === SAME_SELECTED_OPTION_NUMERICAL_VALUE) {
                        return self.horzSelection.entrezGeneId;
                    } else {
                        return this.selectedGeneOption.value;
                    }
                } else {
                    return undefined;
                }
            },
            get selectedGeneOption() {
                const geneOptions = vertical ? self.vertGeneOptions : self.horzGeneOptions.result || [];
                if (this._selectedGeneOption === undefined && geneOptions.length) {
                    // select default if _selectedGeneOption is undefined and theres defaults to choose from
                    return geneOptions[0];
                } else if (vertical && this._selectedGeneOption && this._selectedGeneOption.value === SAME_SELECTED_OPTION_NUMERICAL_VALUE &&
                            self.horzSelection.dataType === CLIN_ATTR_DATA_TYPE) {
                    // if vertical gene option is "same as horizontal", and horizontal is clinical, then use the actual
                    //      gene option value instead of "Same gene" option value, because that would be slightly weird UX
                    return self.horzSelection.selectedGeneOption;
                } else {
                    // otherwise, return stored value for this variable
                    return this._selectedGeneOption;
                }
            },
            set selectedGeneOption(o:any) {
                this._selectedGeneOption = o;
            },
            get dataType() {
                if (!self.dataTypeOptions.isComplete) {
                    // if there are no options to select a default from, then return the stored value for this variable
                    return this._dataType;
                }
                // otherwise, pick the default based on available options
                const dataTypeOptions = self.dataTypeOptions.result!;
                if (this._dataType === undefined && dataTypeOptions.length) {
                    // return computed default if _dataType is undefined and if there are options to select a default value from
                    if (vertical && !!dataTypeOptions.find(o=>(o.value === AlterationTypeConstants.MRNA_EXPRESSION))) {
                        // default for the vertical axis is mrna, if one is available
                        return AlterationTypeConstants.MRNA_EXPRESSION;
                    } else if (!vertical && !!dataTypeOptions.find(o=>(o.value === AlterationTypeConstants.COPY_NUMBER_ALTERATION))) {
                        // default for the horizontal axis is CNA, if one is available
                        return AlterationTypeConstants.COPY_NUMBER_ALTERATION;
                    } else {
                        // otherwise, just return the first option
                        return dataTypeOptions[0].value;
                    }
                } else {
                    // otherwise, _dataType is defined, or there are no default options to choose from, so return _dataType
                    return this._dataType;
                }
            },
            set dataType(t:string|undefined) {
                if (this._dataType !== t) {
                    this._dataSourceId = undefined;
                }
                this._dataType = t;
            },
            get dataSourceId() {
                if (!self.dataTypeToDataSourceOptions.isComplete) {
                    // if there are no options to select a default from, then return the stored value for this variable
                    return this._dataSourceId;
                }
                // otherwise, pick the default based on the current selected data type, and available sources
                const dataSourceOptionsByType = self.dataTypeToDataSourceOptions.result!;
                if (this._dataSourceId === undefined &&
                    this.dataType &&
                    dataSourceOptionsByType[this.dataType] &&
                    dataSourceOptionsByType[this.dataType].length) {
                    // return computed default if _dataSourceId is undefined
                    return dataSourceOptionsByType[this.dataType][0].value;
                } else {
                    // otherwise, _dataSourceId is defined, or there are no default options to choose from, so return _dataType
                    return this._dataSourceId;
                }
            },
            set dataSourceId(id:string|undefined) {
                this._dataSourceId = id;
            },
            get mutationCountBy() {
                if (this._mutationCountBy === undefined) {
                    // default
                    return MutationCountBy.MutationType;
                } else {
                    return this._mutationCountBy;
                }
            },
            set mutationCountBy(m:MutationCountBy) {
                this._mutationCountBy = m;
            },
            get logScale() {
                return this._logScale && logScalePossible(this);
            },
            set logScale(v:boolean) {
                this._logScale = v;
            },
            get genesetId() {
                if (this.selectedGenesetOption) {
                    if (this.selectedGenesetOption.value === SAME_SELECTED_OPTION_STRING_VALUE) {
                        return self.horzSelection.genesetId;
                    } else {
                        return this.selectedGenesetOption.value;
                    }
                } else {
                    return undefined;
                }
            },
            get selectedGenesetOption() {
                const genesetOptions = (vertical ? self.vertGenesetOptions : self.horzGenesetOptions
                    .result) || [];
                if (this._selectedGenesetOption === undefined && genesetOptions.length) {
                    // select default if _selectedGenesetOption is undefined and theres defaults to choose from
                    return genesetOptions[0];
                } else if (vertical && this._selectedGenesetOption && this._selectedGenesetOption.value === SAME_SELECTED_OPTION_STRING_VALUE &&
                    self.horzSelection.dataType === CLIN_ATTR_DATA_TYPE) {
                        // if vertical gene set option is "same as horizontal", and horizontal is clinical, then use the actual
                        //      gene set option value instead of "Same gene" option value, because that would be slightly weird UX
                        return self.horzSelection.selectedGenesetOption;
                    } else {
                        // otherwise, return stored value for this variable
                        return this._selectedGenesetOption;
                    }
                },
                set selectedGenesetOption(o:any) {
                    this._selectedGenesetOption = o;
                },
            get treatmentId() {
                if (this.selectedTreatmentOption) {
                    if (this.selectedTreatmentOption.value === SAME_SELECTED_OPTION_STRING_VALUE) {
                        return self.horzSelection.treatmentId;
                    } else {
                        return this.selectedTreatmentOption.value;
                    }
                } else {
                    return undefined;
                }
            },
            get selectedTreatmentOption() {
                const treatmentOptions = (vertical ? self.vertTreatmentOptions : self.horzTreatmentOptions.result) || [];
                if (this._selectedTreatmentOption === undefined && treatmentOptions.length) {
                    // select default if _selectedTreatmentOption is undefined and theres defaults to choose from
                    return treatmentOptions[0];
                } else if (vertical && this._selectedTreatmentOption
                    && this._selectedTreatmentOption.value === SAME_SELECTED_OPTION_STRING_VALUE
                    && self.horzSelection.dataType === CLIN_ATTR_DATA_TYPE) {
                    // if vertical gene set option is "same as horizontal", and horizontal is clinical, then use the actual
                    //      gene set option value instead of "Same gene" option value, because that would be slightly weird UX
                    return self.horzSelection.selectedTreatmentOption;
                } else {
                    // otherwise, return stored value for this variable
                    return this._selectedTreatmentOption;
                }
            },
            set selectedTreatmentOption(o:any) {
                this._selectedTreatmentOption = o;
            },
            _selectedGeneOption: undefined,
            _selectedGenesetOption: undefined,
            _selectedTreatmentOption: undefined,
            _dataType: undefined,
            _dataSourceId: undefined,
            _mutationCountBy: undefined,
            _logScale: false
        });
    }

    @autobind
    @action
    private onInputClick(event:React.MouseEvent<HTMLInputElement>) {
        switch (parseInt((event.target as HTMLInputElement).value, 10)) {
            case EventKey.horz_logScale:
                this.horzSelection.logScale = !this.horzSelection.logScale;
                break;
            case EventKey.vert_logScale:
                this.vertSelection.logScale = !this.vertSelection.logScale;
                break;
            case EventKey.utilities_viewCopyNumber:
                this.viewCopyNumber = !this.viewCopyNumber;
                break;
            case EventKey.utilities_viewMutationType:
                this.viewMutationType = !this.viewMutationType;
                break;
            case EventKey.utilities_viewTruncatedValues:
                this.viewTruncatedValues = !this.viewTruncatedValues;
                break;
        }
    }

    @autobind
    private downloadData() {
        onMobxPromise<any>(
            [this.props.store.entrezGeneIdToGene,
            this.props.store.sampleKeyToSample,
            this.horzLabel,
            this.vertLabel],
            (entrezGeneIdToGene, sampleKeyToSample, horzLabel, vertLabel)=>{
                const filename = `${this.downloadFilename}.txt`;
                switch (this.plotType.result) {
                    case PlotType.ScatterPlot:
                        fileDownload(
                            getScatterPlotDownloadData(
                                this.scatterPlotData.result!,
                                horzLabel,
                                vertLabel,
                                entrezGeneIdToGene
                            ),
                            filename
                        );
                        break;
                    case PlotType.BoxPlot:
                        const categoryLabel = this.boxPlotData.result!.horizontal ? vertLabel : horzLabel;
                        const valueLabel = this.boxPlotData.result!.horizontal ? horzLabel : vertLabel;
                        fileDownload(
                            getBoxPlotDownloadData(
                                this.boxPlotData.result!.data,
                                categoryLabel,
                                valueLabel,
                                entrezGeneIdToGene
                            ),
                            filename
                        );
                        break;
                    case PlotType.Table:
                        fileDownload(
                            getTablePlotDownloadData(
                                (this.horzAxisDataPromise.result! as IStringAxisData).data,
                                (this.vertAxisDataPromise.result! as IStringAxisData).data,
                                sampleKeyToSample,
                                horzLabel,
                                vertLabel
                            ),
                            filename
                        );
                        break;
                }
            }
        )
    }

    @autobind
    @action
    private setSearchCaseInput(e:any) {
        this.searchCaseInput = e.target.value;
        clearTimeout(this.searchCaseTimeout);
        this.searchCaseTimeout = setTimeout(()=>this.executeSearchCase(this.searchCaseInput), searchInputTimeoutMs);
    }

    @autobind
    @action
    private setSearchMutationInput(e:any) {
        this.searchMutationInput = e.target.value;
        clearTimeout(this.searchMutationTimeout);
        this.searchMutationTimeout = setTimeout(()=>this.executeSearchMutation(this.searchMutationInput), searchInputTimeoutMs);
    }

    @autobind
    @action
    public executeSearchCase(caseId:string) {
        this.searchCase = caseId;
    }

    @autobind
    @action
    public executeSearchMutation(proteinChange:string) {
        this.searchMutation = proteinChange;
    }

    private isAxisMenuLoading(axisSelection:AxisMenuSelection) {
        return ;
    }



    @autobind
    private getHorizontalAxisMenu() {
        if (!this.dataTypeOptions.isComplete ||
            !this.dataTypeToDataSourceOptions.isComplete) {
            return <span></span>;
        } else {
            return this.getAxisMenu(
                false,
                this.dataTypeOptions.result,
                this.dataTypeToDataSourceOptions.result
            );
        }
    }

    @autobind
    private getVerticalAxisMenu() {
        if (!this.dataTypeOptions.isComplete ||
            !this.dataTypeToDataSourceOptions.isComplete) {
            return <span></span>;
        } else {
            return this.getAxisMenu(
                true,
                this.dataTypeOptions.result,
                this.dataTypeToDataSourceOptions.result
            );
        }
    }

    @autobind
    private onVerticalAxisGeneSelect(option:any) {
        this.vertSelection.selectedGeneOption = option;
        this.viewTruncatedValues = true;
    }

    @autobind
    private onHorizontalAxisGeneSelect(option:any) {
        this.horzSelection.selectedGeneOption = option;
        this.viewTruncatedValues = true;
    }

    @autobind
    private onVerticalAxisGenesetSelect(option:any) {
        this.vertSelection.selectedGenesetOption = option;
        this.viewTruncatedValues = true;
    }

    @autobind
    private onHorizontalAxisGenesetSelect(option:any) {
        this.horzSelection.selectedGenesetOption = option;
        this.viewTruncatedValues = true;
    }

    @autobind
    private onVerticalAxisTreatmentSelect(option:any) {
        this.vertSelection.selectedTreatmentOption = option;
        this.viewTruncatedValues = true;
    }

    @autobind
    private onHorizontalAxisTreatmentSelect(option:any) {
        this.horzSelection.selectedTreatmentOption = option;
        this.viewTruncatedValues = true;
    }

    public test__selectGeneOption(vertical:boolean, optionValue:any) {
        // for end to end testing
        // optionValue is either entrez id or the code for same gene
        let options:any[];
        if (vertical) {
            options = this.vertGeneOptions || [];
        } else {
            options = this.horzGeneOptions.result || [];
        }
        const option = options.find(x=>(x.value === optionValue));
        if (!option) {
            throw "Option not found";
        }
        if (vertical) {
            this.onVerticalAxisGeneSelect(option);
        } else {
            this.onHorizontalAxisGeneSelect(option);
        }
    }

    @computed get horzDatatypeOptions() {
        let noneDatatypeOption = undefined;
        // listen to updates of `dataTypeOptions` and on the selected data type for the vertical axis
        if (this.dataTypeOptions && this.vertSelection.dataType === TREATMENT_DATA_TYPE) {
            noneDatatypeOption = [{ value: NONE_SELECTED_OPTION_STRING_VALUE, label: NONE_SELECTED_OPTION_LABEL}];
        }
        return (noneDatatypeOption || []).concat((this.dataTypeOptions.result || []) as any[]);
    }

    @computed get vertDatatypeOptions() {
        let noneDatatypeOption = undefined;
        // listen to updates of `dataTypeOptions` and on the selected data type for the horzontal axis
        if (this.dataTypeOptions && this.horzSelection.dataType === TREATMENT_DATA_TYPE) {
            noneDatatypeOption = [{ value: NONE_SELECTED_OPTION_STRING_VALUE, label: NONE_SELECTED_OPTION_LABEL}];
        }
        return (noneDatatypeOption || []).concat((this.dataTypeOptions.result || []) as any[]);
    }

    @observable readonly horzGeneOptions = remoteData({
        await:()=>[this.props.store.genes],
        invoke:()=>{
            return Promise.resolve(
                this.props.store.genes.result!.map(gene=>({ value: gene.entrezGeneId, label: gene.hugoGeneSymbol }))
            );
        }
    });

    @computed get vertGeneOptions() {
        let sameGeneOption = undefined;
        // listen to updates of `horzGeneOptions` or the selected data type for the horzontal axis
        if (this.horzGeneOptions || this.horzSelection.dataType) {
            // when the data type on the horizontal axis is a gene  profile
            // add an option to select the same gene 
            if (this.horzSelection.dataType && this.showGeneSelectBox(this.horzSelection.dataType)
                && this.horzSelection.selectedGeneOption && this.horzSelection.selectedGeneOption.value !== NONE_SELECTED_OPTION_NUMERICAL_VALUE) {
                sameGeneOption = [{ value: SAME_SELECTED_OPTION_NUMERICAL_VALUE, label: `Same gene (${this.horzSelection.selectedGeneOption.label})`}];
            }
        }
        return (sameGeneOption || []).concat((this.horzGeneOptions.result || []) as any[]);
    }

    @observable readonly horzGenesetOptions = remoteData({
        await:()=>[this.props.store.genesets],
        invoke:()=>{
            return Promise.resolve(
                this.props.store.genesets.result!.map(geneset=>({ value: geneset.genesetId, label: geneset.name }))
            );
        }
    });

    @computed get vertGenesetOptions() {
        let sameGenesetOption = undefined;
        // listen to updates of `horzGenesetOptions` or the selected data type for the horzontal axis
        if (this.horzGenesetOptions || this.horzSelection.dataType) {
            // when the data type on the horizontal axis is a gene  profile
            // add an option to select the same gene 
            if (this.horzSelection.dataType && this.showGenesetSelectBox(this.horzSelection.dataType)
                && this.horzSelection.selectedGenesetOption && this.horzSelection.selectedGenesetOption.value !== NONE_SELECTED_OPTION_STRING_VALUE) {
                sameGenesetOption = [{ value: SAME_SELECTED_OPTION_STRING_VALUE, label: `Same gene set (${this.horzSelection.selectedGenesetOption.label})`}];
            }
        }
        return (sameGenesetOption || []).concat((this.horzGenesetOptions.result || []) as any[]);
    }

    @observable readonly horzTreatmentOptions = remoteData({
        await:()=>[this.props.store.treatments],
        invoke:()=>{
            return Promise.resolve(
                this.props.store.treatments.result!.map(treatment=>({ value: treatment.treatmentId, label: treatment.name }))
            );
        }
    });

    @computed get vertTreatmentOptions() {
        let sameTreatmentOption = undefined;
        // listen to updates of `horzTreatmentOptions` or the selected data type for the horzontal axis
        if (this.horzTreatmentOptions || this.horzSelection.dataType) {
            if (this.horzSelection.dataType === AlterationTypeConstants.TREATMENT_RESPONSE) {
                // when the data type on the horizontal axis is a treatment profile
                // add an option to select the same treatment
                if (this.horzSelection.dataType && this.showTreatmentSelectBox(this.horzSelection.dataType)
                    && this.horzSelection.selectedTreatmentOption && this.horzSelection.selectedTreatmentOption.value !== NONE_SELECTED_OPTION_STRING_VALUE) {
                    sameTreatmentOption = [{ value: SAME_SELECTED_OPTION_STRING_VALUE, label: `Same treatment (${this.horzSelection.selectedTreatmentOption.label})`}];
                }
            }
        }
        return (sameTreatmentOption || []).concat((this.horzTreatmentOptions.result || []) as {value:string, label:string}[]);
    }

    private showGeneSelectBox(dataType:string):boolean {
        return dataType !== NONE_SELECTED_OPTION_STRING_VALUE
                && dataType !== GENESET_DATA_TYPE
                && dataType !== CLIN_ATTR_DATA_TYPE
                && dataType !== AlterationTypeConstants.TREATMENT_RESPONSE;
    }

    private showGenesetSelectBox(dataType:string):boolean {
        return dataType !== NONE_SELECTED_OPTION_STRING_VALUE
                && dataType === GENESET_DATA_TYPE;
    }

    private showTreatmentSelectBox(dataType:string):boolean {
        return dataType !== NONE_SELECTED_OPTION_STRING_VALUE
                && dataType === AlterationTypeConstants.TREATMENT_RESPONSE;
    }
    
    private showDatasourceBox(dataType:string):boolean {
        return dataType !== NONE_SELECTED_OPTION_STRING_VALUE;
    }

    readonly clinicalAttributeIdToClinicalAttribute = remoteData<{[clinicalAttributeId:string]:ClinicalAttribute}>({
        await:()=>[
            this.props.store.clinicalAttributes,
            this.props.store.studyIds
        ],
        invoke:()=>{
            let _map: {[clinicalAttributeId: string]: ClinicalAttribute} = _.keyBy(this.props.store.clinicalAttributes.result, c=>c.clinicalAttributeId);
            return Promise.resolve(_map);
        }
    });

    readonly clinicalAttributeOptions = remoteData({
        await:()=>[this.props.store.clinicalAttributes],
        invoke:()=>{

            let _clinicalAttributes = _.sortBy<ClinicalAttribute>(this.props.store.clinicalAttributes.result!,
                [(o: any)=>-o.priority, (o: any)=>o.label]).map(attribute=>(
                {
                    value: attribute.clinicalAttributeId,
                    label: attribute.displayName,
                    priority: attribute.priority
                }
            ));

            // to load more quickly, only filter and annotate with data availability once its ready
            // TODO: temporarily disabled because cant figure out a way right now to make this work nicely
            /*if (this.props.store.clinicalAttributeIdToAvailableSampleCount.isComplete) {
                const sampleCounts = this.props.store.clinicalAttributeIdToAvailableSampleCount.result!;
                _clinicalAttributes = _clinicalAttributes.filter(option=>{
                    const count = sampleCounts[option.value];
                    if (!count) {
                        return false;
                    } else {
                        option.label = `${option.label} (${count} samples)`;
                        return true;
                    }
                });
            }*/

            return Promise.resolve(_clinicalAttributes);
        }
    });

    readonly dataTypeOptions = remoteData<{value:string, label:string}[]>({
        await:()=>[
            this.props.store.molecularProfilesWithData,
            this.clinicalAttributeOptions,
            this.props.store.molecularProfilesInStudies
        ],
        invoke:()=>{
            const profiles = this.props.store.molecularProfilesWithData.result!;

            // show only data types we have profiles for
            const dataTypeIds:string[] = _.uniq(
                profiles.map(profile=>profile.molecularAlterationType)
            ).filter(type=>!!dataTypeToDisplayType[type]); // only show profiles of the type we want to show

            if (this.clinicalAttributeOptions.result!.length) {
                // add "clinical attribute" to list if we have any clinical attribute options
                dataTypeIds.push(CLIN_ATTR_DATA_TYPE);
            }

            if (this.props.store.molecularProfilesInStudies.result!.length && this.horzGenesetOptions.result && this.horzGenesetOptions.result!.length > 0) {
              // add geneset profile to list if the study contains it and the query contains gene sets
              this.props.store.molecularProfilesInStudies.result.filter(p=>{
                if (p.molecularAlterationType === AlterationTypeConstants[GENESET_DATA_TYPE]) {
                  if (dataTypeIds.indexOf(GENESET_DATA_TYPE) === -1) {
                    dataTypeIds.push(GENESET_DATA_TYPE);
                  }
                }
              });
            }

            return Promise.resolve(
                _.sortBy(dataTypeIds, // sort them into display order
                    type=>dataTypeDisplayOrder.indexOf(type)
                ).map(type=>({
                    value: type,
                    label: dataTypeToDisplayType[type]
                })) // output options
            );
        }
    });

    readonly dataTypeToDataSourceOptions = remoteData<{[dataType:string]:{value:string, label:string}[]}>({
        await:()=>[
            this.props.store.molecularProfilesWithData,
            this.clinicalAttributeOptions
        ],
        invoke:()=>{
            const profiles = this.props.store.molecularProfilesWithData.result!;
            const map = _.mapValues(
                _.groupBy(profiles, profile=>profile.molecularAlterationType), // create a map from profile type to list of profiles of that type
                profilesOfType=>(
                    sortMolecularProfilesForDisplay(profilesOfType).map(p=>({value:p.molecularProfileId, label:p.name}))// create options out of those profiles
                )
            );
            if (this.clinicalAttributeOptions.result!.length) {
                // add clinical attributes
                map[CLIN_ATTR_DATA_TYPE] = this.clinicalAttributeOptions.result!;
            }
            return Promise.resolve(map);
        }
    });

    @autobind
    @action
    private onVerticalAxisDataTypeSelect(option:any) {
        this.vertSelection.dataType = option.value;
        this.viewTruncatedValues = true;
    }
    
    @autobind
    @action
    public onHorizontalAxisDataTypeSelect(option:any) {
        this.horzSelection.dataType = option.value;
        this.viewTruncatedValues = true;
    }
    
    @autobind
    @action
    public onVerticalAxisDataSourceSelect(option:any) {
        this.vertSelection.dataSourceId = option.value;
        this.viewTruncatedValues = true;
    }
    
    @autobind
    @action
    public onHorizontalAxisDataSourceSelect(option:any) {
        this.horzSelection.dataSourceId = option.value;
        this.viewTruncatedValues = true;
    }
    
    @autobind
    @action
    public onVerticalAxisMutationCountBySelect(option:any) {
        this.vertSelection.mutationCountBy = option.value;
        this.viewTruncatedValues = true;
    }
    
    @autobind
    @action
    public onHorizontalAxisMutationCountBySelect(option:any) {
        this.horzSelection.mutationCountBy = option.value;
        this.viewTruncatedValues = true;
    }
    
    @autobind
    @action
    private swapHorzVertSelections() {
        const keys:(keyof AxisMenuSelection)[] = ["dataType", "dataSourceId", "logScale", "mutationCountBy"];
        // have to store all values for swap because values depend on each other in derived data way so the copy can mess up if you do it one by one
        const horz = keys.map(k=>this.horzSelection[k]);
        const vert = keys.map(k=>this.vertSelection[k]);
        for (let i=0; i<keys.length; i++) {
            this.horzSelection[keys[i]] = vert[i];
            this.vertSelection[keys[i]] = horz[i];
        }

        // only swap genes if vertSelection is not set to "Same gene"
        if (!this.vertSelection.selectedGeneOption || (this.vertSelection.selectedGeneOption.value !== SAME_SELECTED_OPTION_NUMERICAL_VALUE)) {
            const horzOption = this.horzSelection.selectedGeneOption;
            const vertOption = this.vertSelection.selectedGeneOption;
            this.horzSelection.selectedGeneOption = vertOption;
            this.vertSelection.selectedGeneOption = horzOption;
        }

        // only swap gene sets if vertSelection is not set to "Same gene set"
        if (!this.vertSelection.selectedGenesetOption || (this.vertSelection.selectedGenesetOption.value !== SAME_SELECTED_OPTION_STRING_VALUE)) {
            const horzOption = this.horzSelection.selectedGenesetOption;
            const vertOption = this.vertSelection.selectedGenesetOption;
            this.horzSelection.selectedGenesetOption = vertOption;
            this.vertSelection.selectedGenesetOption = horzOption;
        }

        // only swap treatments if vertSelection is not set to "Same treatment"
        if (!this.vertSelection.selectedTreatmentOption || (this.vertSelection.selectedTreatmentOption.value !== SAME_SELECTED_OPTION_STRING_VALUE)) {
            const horzOption = this.horzSelection.selectedTreatmentOption;
            const vertOption = this.vertSelection.selectedTreatmentOption;
            this.horzSelection.selectedTreatmentOption = vertOption;
            this.vertSelection.selectedTreatmentOption = horzOption;
        }
    }

    // WIP comment: I do not consider treatment profiles to be classified as a 'molecular profile'
    @computed get bothAxesMolecularProfile() {
        return (this.horzSelection.dataType !== CLIN_ATTR_DATA_TYPE && this.horzSelection.dataType !== TREATMENT_DATA_TYPE) &&
             (this.vertSelection.dataType !== CLIN_ATTR_DATA_TYPE && this.vertSelection.dataType !== TREATMENT_DATA_TYPE);
    }

    @computed get sameGeneInBothAxes() {
        return  this.bothAxesMolecularProfile &&
            (this.horzSelection.entrezGeneId === this.vertSelection.entrezGeneId);
    }

    @computed get cnaDataCanBeShown() {
        return !!(this.cnaDataExists.result && this.potentialViewType === PotentialViewType.MutationTypeAndCopyNumber);
    }

    @computed get truncatedValuesCanBeShown():boolean {

        if (this.horzAxisDataPromise.result && this.vertAxisDataPromise.result) {

            // only values from treatment profiles are checked for truncation
            let data: any[] = [];
            if (this.horzSelection.dataType === TREATMENT_DATA_TYPE) {
                data = data.concat(this.horzAxisDataPromise.result.data);
            }
            if (this.vertSelection.dataType === TREATMENT_DATA_TYPE) {
                data = data.concat(this.vertAxisDataPromise.result.data);
            }
            
            // check for presence of truncation symbol
            return _.some(data, d => { return d.truncation !== undefined && d.truncation !== "" });

        }
        return false;
    }

    @computed get cnaDataShown() {
        return !!(this.cnaDataExists.result && (this.viewType === ViewType.CopyNumber || this.viewType === ViewType.MutationTypeAndCopyNumber));
    }

    readonly cnaPromise = remoteData({
        await:()=>{
            const queries = getCnaQueries(this.horzSelection, this.vertSelection, this.cnaDataShown);
            if (queries.length > 0) {
                return this.props.store.annotatedCnaCache.getAll(queries);
            } else {
                return [];
            }
        },
        invoke:()=>{
            const queries = getCnaQueries(this.horzSelection, this.vertSelection, this.cnaDataShown);
            if (queries.length > 0) {
                return Promise.resolve(_.flatten(this.props.store.annotatedCnaCache.getAll(queries).map(p=>p.result!)));
            } else {
                return Promise.resolve([]);
            }
        }
    });

    @computed get mutationDataCanBeShown() {
        return !!(this.mutationDataExists.result && this.potentialViewType !== PotentialViewType.None);
    }

    @computed get mutationDataShown() {
        return !!(this.mutationDataExists.result &&
            (this.viewType === ViewType.MutationType || this.viewType === ViewType.MutationSummary ||
                this.viewType === ViewType.MutationTypeAndCopyNumber));
    }

    readonly mutationPromise = remoteData({
        await:()=>this.props.store.putativeDriverAnnotatedMutationCache.getAll(
            getMutationQueries(this.horzSelection, this.vertSelection)
        ),
        invoke: ()=>{
            return Promise.resolve(_.flatten(this.props.store.putativeDriverAnnotatedMutationCache.getAll(
                getMutationQueries(this.horzSelection, this.vertSelection)
            ).map(p=>p.result!)).filter(x=>!!x));
        }
    });

    @computed get horzAxisDataPromise() {
        return makeAxisDataPromise(
            this.horzSelection,
            this.clinicalAttributeIdToClinicalAttribute,
            this.props.store.molecularProfileIdToMolecularProfile,
            this.props.store.patientKeyToSamples,
            this.props.store.entrezGeneIdToGene,
            this.props.store.clinicalDataCache,
            this.props.store.mutationCache,
            this.props.store.numericGeneMolecularDataCache,
            this.props.store.studyToMutationMolecularProfile,
            this.props.store.coverageInformation,
            this.props.store.samples,
            this.props.store.genesetMolecularDataCache,
            this.props.store.treatmentMolecularDataCache
        );
    }

    @computed get vertAxisDataPromise() {
        return makeAxisDataPromise(
            this.vertSelection,
            this.clinicalAttributeIdToClinicalAttribute,
            this.props.store.molecularProfileIdToMolecularProfile,
            this.props.store.patientKeyToSamples,
            this.props.store.entrezGeneIdToGene,
            this.props.store.clinicalDataCache,
            this.props.store.mutationCache,
            this.props.store.numericGeneMolecularDataCache,
            this.props.store.studyToMutationMolecularProfile,
            this.props.store.coverageInformation,
            this.props.store.samples,
            this.props.store.genesetMolecularDataCache,
            this.props.store.treatmentMolecularDataCache
        );
    }

    readonly mutationDataExists = remoteData({
        await: ()=>[this.props.store.studyToMutationMolecularProfile],
        invoke: ()=>{
            return Promise.resolve(!!_.values(this.props.store.studyToMutationMolecularProfile).length);
        }
    });

    readonly cnaDataExists = remoteData({
        await: ()=>[this.props.store.studyToMolecularProfileDiscrete],
        invoke: ()=>{
            return Promise.resolve(!!_.values(this.props.store.studyToMolecularProfileDiscrete).length);
        }
    });


    readonly horzLabel = remoteData({
        await:()=>[
            this.props.store.molecularProfileIdToMolecularProfile,
            this.props.store.entrezGeneIdToGene,
            this.clinicalAttributeIdToClinicalAttribute
        ],
        invoke:()=>{
            return Promise.resolve(getAxisLabel(
                this.horzSelection,
                this.props.store.molecularProfileIdToMolecularProfile.result!,
                this.props.store.entrezGeneIdToGene.result!,
                this.clinicalAttributeIdToClinicalAttribute.result!
            ));
        }
    });

    @computed get horzLabelLogSuffix() {
        if (this.horzSelection.logScale) {
            return " (log2)";
        } else {
            return "";
        }
    }

    readonly vertLabel = remoteData({
        await:()=>[
            this.props.store.molecularProfileIdToMolecularProfile,
            this.props.store.entrezGeneIdToGene,
            this.clinicalAttributeIdToClinicalAttribute
        ],
        invoke:()=>{
            return Promise.resolve(getAxisLabel(
                this.vertSelection,
                this.props.store.molecularProfileIdToMolecularProfile.result!,
                this.props.store.entrezGeneIdToGene.result!,
                this.clinicalAttributeIdToClinicalAttribute.result!
            ));
        }
    });

    @computed get vertLabelLogSuffix() {
        if (this.vertSelection.logScale) {
            return " (log2)";
        } else {
            return "";
        }
    }

    readonly waterfallLabel = remoteData({
        await:()=>[
            this.props.store.molecularProfileIdToMolecularProfile,
            this.props.store.entrezGeneIdToGene,
            this.clinicalAttributeIdToClinicalAttribute
        ],
        invoke:()=>{
            const selection = this.waterfallPlotOrientation === 'HORZ'? this.vertSelection : this.horzSelection;

            return Promise.resolve(getAxisLabel(
                selection,
                this.props.store.molecularProfileIdToMolecularProfile.result!,
                this.props.store.entrezGeneIdToGene.result!,
                this.clinicalAttributeIdToClinicalAttribute.result!
            ));
        }
    });
    

    @computed get waterfallLabelLogSuffix() {
        const useLogScale = this.waterfallPlotOrientation === 'HORZ'? this.vertSelection.logScale : this.horzSelection.logScale;
        if (useLogScale) {
            return " (log2)";
        } else {
            return "";
        }
    }

    @computed get scatterPlotAppearance() {
        return makeScatterPlotPointAppearance(this.viewType, this.mutationDataExists, this.cnaDataExists, this.props.store.mutationAnnotationSettings.driversAnnotated);
    }

    @computed get scatterPlotFill() {
        switch (this.viewType) {
            case ViewType.CopyNumber:
                return "#000000";
            case ViewType.MutationTypeAndCopyNumber:
            case ViewType.MutationType:
            case ViewType.MutationSummary:
            case ViewType.Truncated:
            case ViewType.TruncatedMutationType:
            case ViewType.TruncatedMutationSummary:
            case ViewType.TruncatedMutationTypeAndCopyNumber:
                return (d:IScatterPlotSampleData)=>this.scatterPlotAppearance(d).fill!;
            case ViewType.None:
                return mutationSummaryToAppearance[MutationSummary.Neither].fill;
        }
    }

    @computed get scatterPlotFillOpacity() {
        if (this.viewType === ViewType.CopyNumber) {
            return 0;
        } else {
            return 1;
        }
    }

    @computed get scatterPlotStrokeWidth() {
        if (this.viewType === ViewType.CopyNumber || this.viewType === ViewType.MutationTypeAndCopyNumber) {
            return CNA_STROKE_WIDTH;
        } else {
            return 1;
        }
    }

    @autobind
    private scatterPlotStrokeOpacity(d:IScatterPlotSampleData) {
        return this.scatterPlotAppearance(d).strokeOpacity;
    }

    @autobind
    private scatterPlotSymbol(d:IScatterPlotSampleData) {
        return this.scatterPlotAppearance(d).symbol || "circle";
    }

    @autobind
    private scatterPlotTooltip(d:IScatterPlotData) {
        return scatterPlotTooltip(d);
    }

    @autobind
    private waterfallPlotTooltip(d:IWaterfallPlotData) {
        return waterfallPlotTooltip(d);
    }

    @computed get boxPlotTooltip() {
        return (d:IBoxScatterPlotPoint)=>{
            let content;
            if (this.boxPlotData.isComplete) {
                content = boxPlotTooltip(d, this.boxPlotData.result.horizontal);
            } else {
                content = <span>Loading... (this shouldnt appear because the box plot shouldnt be visible)</span>;
            }
            return content;
        }
    }

    @autobind
    private scatterPlotStroke(d:IScatterPlotSampleData) {
        return this.scatterPlotAppearance(d).stroke;
    }

    @computed get scatterPlotHighlight() {
        const searchCaseWords = this.searchCase.trim().split(/\s+/g);
        const searchMutationWords = this.searchMutation.trim().split(/\s+/g);

        // need to regenerate the function whenever these change in order to trigger immediate Victory rerender
        return (d:IScatterPlotSampleData)=>{
            let caseMatch = false;
            for (const word of searchCaseWords) {
                caseMatch = caseMatch || (!!word.length && (d.sampleId.indexOf(word) > -1));
                if (caseMatch) {
                    break;
                }
            }
            let mutationMatch = false;
            for (const word of searchMutationWords) {
                mutationMatch = mutationMatch || (!!word.length && (!!d.mutations.find(m=>!!(m.proteinChange && (m.proteinChange.indexOf(word) > -1)))));
                if (mutationMatch) {
                    break;
                }
            }
            return caseMatch || mutationMatch;
        };
    }

    private getAxisMenu(
        vertical:boolean,
        dataTypeOptions:{value:string, label:string}[],
        dataSourceOptionsByType:{[type:string]:{value:string, label:string}[]}
    ) {
        const axisSelection = vertical ? this.vertSelection : this.horzSelection;
        const dataTestWhichAxis = vertical ? "Vertical" : "Horizontal";

        let dataSourceLabel = "Profile";
        let dataSourceValue = axisSelection.dataSourceId;
        let dataSourceOptions = (axisSelection.dataType ? dataSourceOptionsByType[axisSelection.dataType] : []) || [];
        let onDataSourceChange = vertical ? this.onVerticalAxisDataSourceSelect : this.onHorizontalAxisDataSourceSelect;

        switch (axisSelection.dataType) {
            case CLIN_ATTR_DATA_TYPE:
                dataSourceLabel = "Clinical Attribute";
                break;
            case AlterationTypeConstants.MUTATION_EXTENDED:
                dataSourceLabel = "Group Mutations by";
                dataSourceValue = axisSelection.mutationCountBy;
                dataSourceOptions = mutationCountByOptions;
                onDataSourceChange = vertical ? this.onVerticalAxisMutationCountBySelect : this.onHorizontalAxisMutationCountBySelect;
                break;
            case undefined:
                break;
            default:
                dataSourceLabel = `${dataTypeToDisplayType[axisSelection.dataType!]} Profile`;
                break;
        }

        return (
            <form>
                <h4>{vertical ? "Vertical" : "Horizontal"} Axis</h4>
                <div>
                    <div className="form-group">
                        <label>Data Type</label>
                        <ReactSelect
                            name={`${vertical ? "v" : "h"}-profile-type-selector`}
                            value={axisSelection.dataType}
                            isLoading={this.dataTypeOptions.isPending}
                            onChange={vertical ? this.onVerticalAxisDataTypeSelect : this.onHorizontalAxisDataTypeSelect}
                            options={this.horzDatatypeOptions && this.vertDatatypeOptions? (vertical ? this.vertDatatypeOptions : this.horzDatatypeOptions): []}
                            clearable={false}
                            searchable={false}
                        />
                    </div>
                    {(axisSelection.dataType && this.showDatasourceBox(axisSelection.dataType)) && (
                        <div className="form-group">
                            <label>{dataSourceLabel}</label>
                            <div style={{display:"flex", flexDirection:"row"}}>
                                <ReactSelect
                                    className="data-source-id"
                                    name={`${vertical ? "v" : "h"}-profile-name-selector`}
                                    value={dataSourceValue}
                                    onChange={onDataSourceChange}
                                    options={dataSourceOptions}
                                    clearable={false}
                                    searchable={true}
                                />
                            </div>
                        </div>
                    )}
                    { logScalePossible(axisSelection) && (
                        <div className="checkbox"><label>
                            <input
                                data-test={`${dataTestWhichAxis}LogCheckbox`}
                                type="checkbox"
                                name={vertical ? "vert_logScale" : "vert_logScale"}
                                value={vertical ? EventKey.vert_logScale : EventKey.horz_logScale}
                                checked={axisSelection.logScale}
                                onClick={this.onInputClick}
                            /> Apply Log Scale
                        </label></div>
                    )}
                    {(axisSelection.dataType && this.showGeneSelectBox(axisSelection.dataType))
                        && (<div className="form-group" style={{opacity:(axisSelection.dataType === CLIN_ATTR_DATA_TYPE ? 0 : 1)}}>
                        <label>Gene</label>
                        <div style={{display:"flex", flexDirection:"row"}}>
                            <ReactSelect
                                name={`${vertical ? "v" : "h"}-gene-selector`}
                                value={axisSelection.selectedGeneOption ? axisSelection.selectedGeneOption.value : undefined}
                                onChange={vertical ? this.onVerticalAxisGeneSelect : this.onHorizontalAxisGeneSelect}
                                isLoading={this.horzGeneOptions.isPending}
                                options={this.vertGeneOptions && this.horzGeneOptions? (vertical ? this.vertGeneOptions : this.horzGeneOptions.result): []}
                                clearable={false}
                                searchable={false}
                                disabled={axisSelection.dataType === CLIN_ATTR_DATA_TYPE || axisSelection.dataType === GENESET_DATA_TYPE}
                            />
                        </div>
                    </div>)}
                    {(axisSelection.dataType && this.showGenesetSelectBox(axisSelection.dataType))
                        && (<div className="form-group" style={{opacity:1}}>
                        <label>Gene Set</label>
                        <div style={{display:"flex", flexDirection:"row"}}>
                            <ReactSelect
                                name={`${vertical ? "v" : "h"}-geneset-selector`}
                                value={axisSelection.selectedGenesetOption ? axisSelection.selectedGenesetOption.value : undefined}
                                onChange={vertical ? this.onVerticalAxisGenesetSelect : this.onHorizontalAxisGenesetSelect}
                                isLoading={this.horzGenesetOptions.isPending}
                                options={this.vertGenesetOptions && this.horzGenesetOptions? (vertical ? this.vertGenesetOptions : this.horzGenesetOptions.result): []}
                                clearable={false}
                                searchable={false}
                                disabled={axisSelection.dataType !== GENESET_DATA_TYPE}
                            />
                        </div>
                    </div>)}
                    {(axisSelection.dataType && this.showTreatmentSelectBox(axisSelection.dataType))
                        && (<div className="form-group" style={{opacity:1}}>
                        <label>Treatment</label>
                        <div style={{display:"flex", flexDirection:"row"}}>
                            <ReactSelect
                                name={`${vertical ? "v" : "h"}-treatment-selector`}
                                value={axisSelection.selectedTreatmentOption ? axisSelection.selectedTreatmentOption.value : undefined}
                                onChange={vertical ? this.onVerticalAxisTreatmentSelect : this.onHorizontalAxisTreatmentSelect}
                                isLoading={this.horzTreatmentOptions.isPending}
                                options={this.vertTreatmentOptions && this.horzTreatmentOptions? (vertical ? this.vertTreatmentOptions : this.horzTreatmentOptions.result): []}
                                clearable={false}
                                searchable={false}
                                disabled={axisSelection.dataType === CLIN_ATTR_DATA_TYPE || axisSelection.dataType !== AlterationTypeConstants.TREATMENT_RESPONSE}
                            />
                        </div>
                    </div>)}
                </div>
            </form>
        );
    }

    @autobind
    private getUtilitiesMenu() {
        const showTopPart = this.plotType.isComplete && this.plotType.result !== PlotType.Table;
        const showBottomPart = this.potentialViewType !== PotentialViewType.None;
        if (!showTopPart && !showBottomPart) {
            return <span></span>;
        }
        return (
            <div>
                <hr/>
                <h4>Utilities</h4>
                <div>
                    {showTopPart && (<div>
                        <div className="form-group">
                            <label>Search Case(s)</label>
                            <FormControl
                                type="text"
                                value={this.searchCaseInput}
                                onChange={this.setSearchCaseInput}
                                placeholder="Case ID.."
                            />
                        </div>
                        {this.mutationDataCanBeShown && (
                            <div className="form-group">
                                <label>Search Mutation(s)</label>
                                <FormControl
                                    type="text"
                                    value={this.searchMutationInput}
                                    onChange={this.setSearchMutationInput}
                                    placeholder="Protein Change.."
                                />
                            </div>
                        )}
                    </div>)}
                    {showBottomPart && (
                        <div>
                            <label>Color Samples By</label>
                            {this.mutationDataCanBeShown && (
                                <div className="checkbox"><label>
                                    <input
                                        data-test="ViewMutationType"
                                        type="checkbox"
                                        name="utilities_viewMutationType"
                                        value={EventKey.utilities_viewMutationType}
                                        checked={this.viewMutationType}
                                        onClick={this.onInputClick}
                                        disabled={!this.mutationDataExists.isComplete || !this.mutationDataExists.result}
                                    /> Mutation Type *
                                </label></div>
                            )}
                            {this.cnaDataCanBeShown && (
                                <div className="checkbox"><label>
                                    <input
                                        data-test="ViewCopyNumber"
                                        type="checkbox"
                                        name="utilities_viewCopyNumber"
                                        value={EventKey.utilities_viewCopyNumber}
                                        checked={this.viewCopyNumber}
                                        onClick={this.onInputClick}
                                        disabled={!this.cnaDataExists.isComplete || !this.cnaDataExists.result}
                                    /> Copy Number Alteration
                                </label></div>
                            )}
                            {this.truncatedValuesCanBeShown && (
                                <div className="checkbox"><label>
                                    <input
                                        data-test="ViewTruncatedValues"
                                        type="checkbox"
                                        name="utilities_viewTruncatedValues"
                                        value={EventKey.utilities_viewTruncatedValues}
                                        checked={this.viewTruncatedValues}
                                        onClick={this.onInputClick}
                                        disabled={!this.truncatedValuesCanBeShown}
                                    /> Truncated Value
                                </label></div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    @autobind
    private assignScrollPaneRef(el:HTMLDivElement){
        this.scrollPane=el;
    }

    @autobind
    private controls() {
        return (
            <div style={{display:"flex", flexDirection:"column"}}>
                <div className="axisBlock">
                    <Observer>
                        {this.getHorizontalAxisMenu}
                    </Observer>
                </div>
                <div style={{ textAlign:'center'}}>
                    <button className="btn btn-default" data-test="swapHorzVertButton" onClick={this.swapHorzVertSelections}><i className="fa fa-arrow-up"></i> Swap Axes <i className="fa fa-arrow-down"></i></button>
                </div>
                <div className="axisBlock">
                    <Observer>
                        {this.getVerticalAxisMenu}
                    </Observer>
                </div>
                <div>
                    <Observer>
                        {this.getUtilitiesMenu}
                    </Observer>
                </div>
            </div>
        );
    }

    readonly plotType = remoteData({
        await: ()=>[
            this.horzAxisDataPromise,
            this.vertAxisDataPromise
        ],
        invoke: ()=>{
            const horzAxisData = this.horzAxisDataPromise.result;
            const vertAxisData = this.vertAxisDataPromise.result;
            const horzAxisNoneSelected = this.horzSelection.dataType === NONE_SELECTED_OPTION_STRING_VALUE;
            const vertAxisNoneSelected = this.vertSelection.dataType === NONE_SELECTED_OPTION_STRING_VALUE;

            if (!horzAxisData || !vertAxisData) {
                return new Promise<PlotType>(()=>0); // dont resolve
            }

            if ((vertAxisNoneSelected && horzAxisData)
                || (horzAxisNoneSelected && vertAxisData)) {
                return Promise.resolve(PlotType.WaterfallPlot);
            }

            if (isStringData(horzAxisData) && isStringData(vertAxisData)) {
                return Promise.resolve(PlotType.Table);
            } else if (isNumberData(horzAxisData) && isNumberData(vertAxisData)) {
                return Promise.resolve(PlotType.ScatterPlot);
            } else {
                return Promise.resolve(PlotType.BoxPlot);
            }
        }
    });

    /*readonly mutationProfileDuplicateSamplesReport = remoteData({
        await:()=>[
            this.horzAxisDataPromise,
            this.vertAxisDataPromise
        ],
        invoke:()=>{
            return Promise.resolve(getMutationProfileDuplicateSamplesReport(
                this.horzAxisDataPromise.result!,
                this.vertAxisDataPromise.result!,
                this.horzSelection,
                this.vertSelection
            ));
        }
    });*/

    readonly scatterPlotData = remoteData<IScatterPlotData[]>({
        await: ()=>[
            this.horzAxisDataPromise,
            this.vertAxisDataPromise,
            this.props.store.sampleKeyToSample,
            this.props.store.coverageInformation,
            this.mutationPromise,
            this.props.store.studyToMutationMolecularProfile,
            this.cnaPromise,
            this.props.store.studyToMolecularProfileDiscrete
        ],
        invoke: ()=>{
            const horzAxisData = this.horzAxisDataPromise.result;
            const vertAxisData = this.vertAxisDataPromise.result;
            if (!horzAxisData || !vertAxisData) {
                return new Promise<IScatterPlotData[]>(()=>0); // dont resolve
            } else {
                if (isNumberData(horzAxisData) && isNumberData(vertAxisData)) {
                    return Promise.resolve(makeScatterPlotData(
                        horzAxisData,
                        vertAxisData,
                        this.props.store.sampleKeyToSample.result!,
                        this.props.store.coverageInformation.result!.samples,
                        this.mutationDataExists.result ? {
                            molecularProfileIds: _.values(this.props.store.studyToMutationMolecularProfile.result!).map(p=>p.molecularProfileId),
                            data: this.mutationPromise.result!
                        } : undefined,
                        this.cnaDataShown ? {
                            molecularProfileIds: _.values(this.props.store.studyToMolecularProfileDiscrete.result!).map(p=>p.molecularProfileId),
                            data: this.cnaPromise.result!
                        }: undefined
                    ));
                } else {
                    return Promise.resolve([]);
                }
            }
        }
    });

    readonly waterfallPlotData = remoteData<{horizontal:boolean, data:IWaterfallPlotData[]}>({
        await: ()=>[
            this.horzAxisDataPromise,
            this.vertAxisDataPromise,
            this.props.store.sampleKeyToSample,
            this.props.store.coverageInformation,
            this.mutationPromise,
            this.props.store.studyToMutationMolecularProfile,
            this.cnaPromise,
            this.props.store.studyToMolecularProfileDiscrete
        ],
        invoke: ()=>{
            const horzAxisData = this.horzAxisDataPromise.result;
            const vertAxisData = this.vertAxisDataPromise.result;

            if (!horzAxisData && !vertAxisData) {
                return new Promise<{horizontal:boolean, data:IWaterfallPlotData[]}>(()=>0); // dont resolve
            } else {
                const horizontal:boolean = this.horzSelection.dataType !== NONE_SELECTED_OPTION_STRING_VALUE;
                const axisData = horizontal? vertAxisData : horzAxisData;
                if (isNumberData(axisData!)) {
                    return Promise.resolve({
                        horizontal: horizontal,
                        data: makeWaterfallPlotData(
                                axisData as INumberAxisData,
                                this.props.store.sampleKeyToSample.result!,
                                this.props.store.coverageInformation.result!.samples,
                                this.mutationDataExists.result ? {
                                    molecularProfileIds: _.values(this.props.store.studyToMutationMolecularProfile.result!).map(p=>p.molecularProfileId),
                                    data: this.mutationPromise.result!
                                } : undefined,
                                this.cnaDataShown ? {
                                    molecularProfileIds: _.values(this.props.store.studyToMolecularProfileDiscrete.result!).map(p=>p.molecularProfileId),
                                    data: this.cnaPromise.result!
                                }: undefined
                            )
                    });
                } else {
                    return Promise.resolve({horizontal: true, data: []});
                }
            }
        }
    });

    @computed get waterfallPlotOrientation():'HORZ'|'VERT' {
        if (this.vertSelection.dataType === NONE_SELECTED_OPTION_STRING_VALUE) {
            return 'VERT';
        }
        if (this.horzSelection.dataType === NONE_SELECTED_OPTION_STRING_VALUE) {
            return 'HORZ';
        }
        return 'HORZ';
    }

    @computed get waterfallPlotPivotThreshold():number {
        const i = this.waterfallPlotData.result!.data[0].pivotThreshold;
        return i;
    }

    @computed get waterfallPlotSortOrder():'ASC'|'DESC' {
        const i = this.waterfallPlotData.result!.data[0].sortOrder;
        return i;
    }

    readonly boxPlotData = remoteData<{horizontal:boolean, data:IBoxScatterPlotData<IBoxScatterPlotPoint>[]}>({
        await: ()=>[
            this.horzAxisDataPromise,
            this.vertAxisDataPromise,
            this.props.store.sampleKeyToSample,
            this.props.store.coverageInformation,
            this.mutationPromise,
            this.props.store.studyToMutationMolecularProfile,
            this.cnaPromise,
            this.props.store.studyToMolecularProfileDiscrete
        ],
        invoke: ()=>{
            const horzAxisData = this.horzAxisDataPromise.result;
            const vertAxisData = this.vertAxisDataPromise.result;
            if (!horzAxisData || !vertAxisData) {
                return new Promise<any>(()=>0); // dont resolve
            } else {
                let categoryData:IStringAxisData;
                let numberData:INumberAxisData;
                let horizontal:boolean;
                if (isNumberData(horzAxisData) && isStringData(vertAxisData)) {
                    categoryData = vertAxisData;
                    numberData = horzAxisData;
                    horizontal = true;
                } else if (isStringData(horzAxisData) && isNumberData(vertAxisData)) {
                    categoryData = horzAxisData;
                    numberData = vertAxisData;
                    horizontal = false;
                } else {
                    return Promise.resolve({horizontal:false, data:[]});
                }
                return Promise.resolve({
                    horizontal,
                    data: makeBoxScatterPlotData(
                        categoryData, numberData,
                        this.props.store.sampleKeyToSample.result!,
                        this.props.store.coverageInformation.result!.samples,
                        this.mutationDataExists.result ? {
                            molecularProfileIds: _.values(this.props.store.studyToMutationMolecularProfile.result!).map(p=>p.molecularProfileId),
                            data: this.mutationPromise.result!
                        } : undefined,
                        this.cnaDataShown ? {
                            molecularProfileIds: _.values(this.props.store.studyToMolecularProfileDiscrete.result!).map(p=>p.molecularProfileId),
                            data: this.cnaPromise.result!
                        }: undefined
                    )
                });
            }
        },
    });

    @computed get zIndexSortBy() {
        return scatterPlotZIndexSortBy<IScatterPlotSampleData>(
            this.viewType,
            this.scatterPlotHighlight
        );
    }

    @computed get boxPlotBoxWidth() {
        const SMALL_BOX_WIDTH = 30;
        const LARGE_BOX_WIDTH = 60;

        if (this.boxPlotData.isComplete) {
            return this.boxPlotData.result.data.length > 7 ? SMALL_BOX_WIDTH : LARGE_BOX_WIDTH;
        } else {
            // irrelevant - nothing should be plotted anyway
            return SMALL_BOX_WIDTH;
        }
    }

    @computed get plot() {
        const promises = [this.plotType, this.horzAxisDataPromise, this.vertAxisDataPromise, this.horzLabel, this.vertLabel];
        const groupStatus = getMobxPromiseGroupStatus(...promises);
        switch (groupStatus) {
            case "pending":
                return <LoadingIndicator isLoading={true} center={true} size={"big"}/>;
            case "error":
                return <span>Error loading plot data.</span>;
            default:
                const plotType = this.plotType.result!;
                let plotElt:any = null;
                switch (plotType) {
                    case PlotType.Table:
                        plotElt = (
                            <TablePlot
                                svgId={SVG_ID}
                                horzData={(this.horzAxisDataPromise.result! as IStringAxisData).data}
                                vertData={(this.vertAxisDataPromise.result! as IStringAxisData).data}
                                horzCategoryOrder={(this.horzAxisDataPromise.result! as IStringAxisData).categoryOrder}
                                vertCategoryOrder={(this.vertAxisDataPromise.result! as IStringAxisData).categoryOrder}
                                minCellWidth={35}
                                minCellHeight={35}
                                minChartWidth={PLOT_SIDELENGTH}
                                minChartHeight={PLOT_SIDELENGTH}
                                axisLabelX={this.horzLabel.result!}
                                axisLabelY={this.vertLabel.result!}
                            />
                        );
                        break;
                    case PlotType.ScatterPlot:
                        if (this.scatterPlotData.isComplete) {
                            plotElt = (
                                <PlotsTabScatterPlot
                                    svgId={SVG_ID}
                                    axisLabelX={this.horzLabel.result! + this.horzLabelLogSuffix}
                                    axisLabelY={this.vertLabel.result! + this.vertLabelLogSuffix}
                                    data={this.scatterPlotData.result}
                                    size={scatterPlotSize}
                                    chartWidth={PLOT_SIDELENGTH}
                                    chartHeight={PLOT_SIDELENGTH}
                                    tooltip={this.scatterPlotTooltip}
                                    highlight={this.scatterPlotHighlight}
                                    logX={this.horzSelection.logScale}
                                    logY={this.vertSelection.logScale}
                                    fill={this.scatterPlotFill}
                                    stroke={this.scatterPlotStroke}
                                    strokeOpacity={this.scatterPlotStrokeOpacity}
                                    zIndexSortBy={this.zIndexSortBy}
                                    symbol={this.scatterPlotSymbol}
                                    fillOpacity={this.scatterPlotFillOpacity}
                                    strokeWidth={this.scatterPlotStrokeWidth}
                                    useLogSpaceTicks={true}
                                    excludeTruncatedValuesFromCalculation={this.truncatedValuesCanBeShown && this.viewTruncatedValues}
                                    legendData={scatterPlotLegendData(
                                        this.scatterPlotData.result, this.viewType, this.mutationDataExists, this.cnaDataExists, this.props.store.mutationAnnotationSettings.driversAnnotated
                                    )}
                                />
                            );
                            break;
                        } else if (this.scatterPlotData.isError) {
                            return <span>Error loading plot data.</span>;
                        } else {
                            return <LoadingIndicator isLoading={true} center={true} size={"big"}/>;
                        }
                    case PlotType.WaterfallPlot:
                        if (this.waterfallPlotData.isComplete) {
                            const horizontal = this.waterfallPlotData.result.horizontal;
                            plotElt = (
                                <PlotsTabWaterfallPlot
                                    svgId={SVG_ID}
                                    axisLabel={this.waterfallLabel.result + this.waterfallLabelLogSuffix }
                                    data={this.waterfallPlotData.result.data}
                                    size={scatterPlotSize}
                                    chartWidth={PLOT_SIDELENGTH}
                                    chartHeight={PLOT_SIDELENGTH}
                                    tooltip={this.waterfallPlotTooltip}
                                    highlight={this.scatterPlotHighlight}
                                    log={this.horzSelection.logScale}
                                    fill={this.scatterPlotFill}
                                    stroke={this.scatterPlotStroke}
                                    horizontal={horizontal}
                                    strokeOpacity={this.scatterPlotStrokeOpacity}
                                    zIndexSortBy={this.zIndexSortBy}
                                    fillOpacity={this.scatterPlotFillOpacity}
                                    strokeWidth={this.scatterPlotStrokeWidth}
                                    useLogSpaceTicks={true}
                                    sortOrder={this.waterfallPlotSortOrder}
                                    pivotThreshold={this.waterfallPlotPivotThreshold}
                                    plotOrientation={this.waterfallPlotOrientation}
                                    legendData={scatterPlotLegendData(
                                        this.waterfallPlotData.result.data, this.viewType, this.mutationDataExists, this.cnaDataExists, this.props.store.mutationAnnotationSettings.driversAnnotated
                                    )}
                                />
                            );
                            break;
                        } else if (this.scatterPlotData.isError) {
                            return <span>Error loading plot data.</span>;
                        } else {
                            return <LoadingIndicator isLoading={true} center={true} size={"big"}/>;
                        }
                    case PlotType.BoxPlot:
                        if (this.boxPlotData.isComplete) {
                            const horizontal = this.boxPlotData.result.horizontal;
                            plotElt = (
                                <PlotsTabBoxPlot
                                    svgId={SVG_ID}
                                    domainPadding={75}
                                    boxWidth={this.boxPlotBoxWidth}
                                    axisLabelX={this.horzLabel.result! + (horizontal ? this.horzLabelLogSuffix : "")}
                                    axisLabelY={this.vertLabel.result! + (!horizontal ? this.vertLabelLogSuffix : "")}
                                    data={this.boxPlotData.result.data}
                                    chartBase={550}
                                    tooltip={this.boxPlotTooltip}
                                    highlight={this.scatterPlotHighlight}
                                    horizontal={horizontal}
                                    logScale={horizontal ? this.horzSelection.logScale : this.vertSelection.logScale}
                                    size={scatterPlotSize}
                                    fill={this.scatterPlotFill}
                                    stroke={this.scatterPlotStroke}
                                    strokeOpacity={this.scatterPlotStrokeOpacity}
                                    zIndexSortBy={this.zIndexSortBy}
                                    symbol={this.scatterPlotSymbol}
                                    fillOpacity={this.scatterPlotFillOpacity}
                                    strokeWidth={this.scatterPlotStrokeWidth}
                                    useLogSpaceTicks={true}
                                    legendData={scatterPlotLegendData(
                                        _.flatten(this.boxPlotData.result.data.map(d=>d.data)), this.viewType, this.mutationDataExists, this.cnaDataExists, this.props.store.mutationAnnotationSettings.driversAnnotated
                                    )}
                                     legendLocationWidthThreshold={550}
                                />
                            );
                            break;
                        } else if (this.boxPlotData.isError) {
                            return <span>Error loading plot data.</span>;
                        } else {
                            return <LoadingIndicator isLoading={true} center={true} size={"big"}/>;
                        }
                    default:
                        return <span>Not implemented yet</span>
                }
                return (
                    <div>
                        <div data-test="PlotsTabPlotDiv" className="borderedChart posRelative">
                            <ScrollBar style={{position:'relative', top:-5}} getScrollEl={this.getScrollPane} />
                            {this.plotExists && (
                                <DownloadControls
                                    getSvg={this.getSvg}
                                    filename={this.downloadFilename}
                                    additionalRightButtons={[{
                                        key:"Data",
                                        content:<span>Data <i className="fa fa-cloud-download" aria-hidden="true"/></span>,
                                        onClick:this.downloadData,
                                        disabled: !this.props.store.entrezGeneIdToGene.isComplete
                                    }]}
                                    dontFade={true}
                                    style={{position:'absolute', right:10, top:10 }}
                                    collapse={true}
                                />
                            )}
                                <div ref={this.assignScrollPaneRef} style={{position:"relative", display:"inline-block"}}>
                                {plotElt}
                                </div>
                        </div>
                        {this.mutationDataCanBeShown && (
                            <div style={{marginTop:5}}>* Driver annotation settings are located in the Mutation Color menu of the Oncoprint.</div>
                        )}
                        {/*this.mutationProfileDuplicateSamplesReport.isComplete && this.mutationProfileDuplicateSamplesReport.result.showMessage && (
                            <div className="alert alert-info" style={{marginTop:5, padding: 7}}>
                                Notice: With Mutation profiles, there is one data point per mutation type, per sample. In
                                this plot, there are {this.mutationProfileDuplicateSamplesReport.result.numSamples} samples with more than
                                one type of mutation, leading to {this.mutationProfileDuplicateSamplesReport.result.numSurplusPoints} extra
                                data points.
                            </div>
                        )*/}
                    </div>
                );
        }
    }

    componentDidUpdate() {
        this.plotExists = !!this.getSvg();
    }

    public render() {
        return (
            <div data-test="PlotsTabEntireDiv">
                <div className={'tabMessageContainer'}>
                    <OqlStatusBanner className="plots-oql-status-banner" store={this.props.store} tabReflectsOql={false} />
                </div>
                <div className={"plotsTab"} style={{display:"flex", flexDirection:"row"}}>
                    <div className="leftColumn">
                        { (this.dataTypeOptions.isComplete &&
                        this.dataTypeToDataSourceOptions.isComplete) ? (
                            <Observer>
                                {this.controls}
                            </Observer>
                        ) : <LoadingIndicator isLoading={true} center={true} size={"big"}/> }
                    </div>
                    <div className="inlineBlock">
                        {this.plot}
                    </div>
                </div>
            </div>
        );
    }
}
