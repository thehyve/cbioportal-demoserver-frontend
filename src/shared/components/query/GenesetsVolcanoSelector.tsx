import * as _ from 'lodash';
import * as React from 'react';
import LabeledCheckbox from "../labeledCheckbox/LabeledCheckbox";
import * as styles_any from './styles/styles.module.scss';
import {action, ObservableMap, expr, toJS, computed, observable} from "mobx";
import {observer, Observer} from "mobx-react";
import EnhancedReactTable from "../enhancedReactTable/EnhancedReactTable";
import {Geneset} from "../../api/generated/CBioPortalAPIInternal";
import {IColumnFormatterData} from "../enhancedReactTable/IColumnFormatter";
import {IColumnDefMap} from "../enhancedReactTable/IEnhancedReactTableProps";
import {Td} from 'reactable';
import {toPrecision} from "../../lib/FormatUtils";
import { getHierarchyData } from "shared/lib/StoreUtils";
import ReactSelect from "react-select";
import LoadingIndicator from "shared/components/loadingIndicator/LoadingIndicator";

const styles = styles_any as {
    GenesetsVolcanoSelectorWindow: string,
	selectButton: string,
	selectionColumnHeader: string,
	selectionColumnCell: string,
};

class GenesetsVolcanoTable extends EnhancedReactTable<Geneset> {}

export interface GenesetsVolcanoSelectorProps
{
    initialSelection: string[];
    gsvaProfile: string;
    sampleListId: string|undefined;
    onSelect: (map_geneSets_selected:ObservableMap<boolean>) => void;
}

@observer
export default class GenesetsVolcanoSelector extends React.Component<GenesetsVolcanoSelectorProps, {}>
{
    @observable allGenesets: Geneset[];
    @observable selectedPercentile: {label: string, value: string};
    @observable isLoading = true;
    @observable percentileHasChanged = false;
    readonly percentileOptions = [{label: '50%', value: '50'}, {label: '75%', value: '75'}, {label: '100%', value: '100'}];
    private readonly map_geneSets_selected = new ObservableMap<boolean>();
    constructor(props:GenesetsVolcanoSelectorProps)
    {
        super(props);
        this.allGenesets = [];
        this.selectedPercentile = {label: '75%', value: '75'};
        this.percentileChange = this.percentileChange.bind(this);
        this.map_geneSets_selected.replace(props.initialSelection.map(geneSet => [geneSet, true]));
    }
    
    percentileChange(val: {label: string, value: string} | null)
    {
        this.selectedPercentile = val || {label: '75%', value: '75'};
        this.percentileHasChanged = true;
    }
    
    componentDidMount()
    {
        this.getData();
    }
    
    componentDidUpdate()
    {
        if (this.percentileHasChanged) {
            this.isLoading = true;
            this.getData();
            this.percentileHasChanged = false;
        }
    }
    
    @computed get selectedGenesets()
    {
        return this.allGenesets.filter(geneSet => this.map_geneSets_selected.get(geneSet.name));
    }
    
    @action selectAll(selected:boolean)
    {
        for (let geneSet of this.allGenesets)
            this.map_geneSets_selected.set(geneSet.name, selected);
    }
    
    private columns:IColumnDefMap = {
            'geneSets': {
                priority: 1,
                dataField: 'name',
                name: "Gene Sets",
                sortable: true,
                filterable: true,
            },
            'gsvaScore': {
                priority: 2,
                dataField: 'representativeScore',
                name: "GSVA Score",
                sortable: true,
                filterable: true,
                formatter: ({name, columnData: value}: IColumnFormatterData<Geneset>) => (
                        <Td key={name} column={name} value={value}>
                        {value.toFixed(2)}
                        </Td>
                    ),
            },
            'pValue': {
                priority: 3,
                dataField: 'representativePvalue',
                name: "P Value",
                sortable: true,
                filterable: true,
                formatter: ({name, columnData: value}: IColumnFormatterData<Geneset>) => (
                    <Td key={name} column={name} value={value}>
                    {toPrecision(value, 2, 0.1)}
                    </Td>
                ),
            },
            'selected': {
                name: "Selected",
                priority: 4,
                sortable: false,
                filterable: false,
                header: (
                    <div className={styles.selectionColumnHeader}>
                   <span>All</span>
                   <Observer>
                    {() => (
                        <LabeledCheckbox
                        checked={this.selectedGenesets.length > 0}
                        indeterminate={this.selectedGenesets.length > 0 && this.selectedGenesets.length < this.allGenesets.length}
                        onChange={event => this.selectAll(event.target.checked)}
                        />
                    )}
                    </Observer>
                    </div>
                ),
                formatter: ({name, rowData: geneSet}:IColumnFormatterData<Geneset>) => (
                    <Td key={name} column={name}>
                    {!!(geneSet) && (
                            <div className={styles.selectionColumnCell}>
                            <Observer>
                            {() => (
                                <LabeledCheckbox
                                checked={!!this.map_geneSets_selected.get(geneSet.name)}
                                onChange={event => this.map_geneSets_selected.set(geneSet.name, event.target.checked)}
                            />
                            )}
                    </Observer>
                    </div>
                    )}
                    </Td>
                ),
    },
    };
    
    async getData() {
        const flatData: Geneset[] = [];
    const hierarchyData = await getHierarchyData(
            this.props.gsvaProfile, Number(this.selectedPercentile.value),0, 1, this.props.sampleListId);
    for (const node of hierarchyData) {
        if (_.has(node, 'genesets')) {
            for (const geneSet of node.genesets) {
                flatData.push({
                    genesetId: geneSet.genesetId,
                    name: geneSet.genesetId,
                    description : geneSet.description,
                    representativeScore : geneSet.representativeScore,
                    representativePvalue : geneSet.representativePvalue,
                    refLink : geneSet.refLink,
                });
            }
        }
    }
    this.allGenesets = flatData;
    this.isLoading = false;
    }
    
    render()
    {
        return (
                <div className={styles.GenesetsVolcanoSelectorWindow} style={ {height:"400px"} }>
                <div style={{float: "left"}} className="form-inline">
                <label htmlFor="PercentileScoreCalculation">Percentile for score calculation:</label>
                <span style={{display: "inline-block", verticalAlign: "middle", marginLeft: "1em"}}>
                <ReactSelect addLabelText="Percentile for score calculation" style={ {width:"160px"} }
                    name="PercentileScoreCalculation"
                    value={this.selectedPercentile}
                    options={this.percentileOptions}
                    onChange={this.percentileChange}
                />
                </span>
                </div>
                <div style={{float: "right", maxHeight: "356.5px", overflowY: "scroll", width: "650px"}}>
                <LoadingIndicator isLoading={this.isLoading} />
                {  (!this.isLoading) && (
                <GenesetsVolcanoTable
                    itemsName="geneSets"
                    initItemsPerPage={10}
                    columns={this.columns}
                    rawData={this.allGenesets}
                    headerControlsProps={{
                        showCopyAndDownload: false,
                        showHideShowColumnButton: false,
                        showPagination: true,
                        }}
                    reactTableProps={{
                        className: "table table-striped table-border-top",
                        hideFilterInput:true,
                        defaultSort: this.columns.pValue.name,
                        }}
                /> )
                }
                </div>
                <div style={{clear: "both"}}>
                <button style={{marginTop:15}} 
                className="btn btn-primary btn-sm pull-right"
                disabled={this.isLoading}
                onClick={() => this.props.onSelect(this.map_geneSets_selected)}
                >
                Select
                </button>
                </div>
                </div>
        );
    }
}
