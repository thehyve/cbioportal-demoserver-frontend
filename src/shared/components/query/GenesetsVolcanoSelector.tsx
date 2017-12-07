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
import { VictoryChart, VictoryScatter, VictoryTheme, VictorySelectionContainer,
    VictoryAxis, VictoryLabel, VictoryLine }from 'victory';

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
    onSelect: (map_genesets_selected:ObservableMap<boolean>) => void;
}

@observer
export default class GenesetsVolcanoSelector extends React.Component<GenesetsVolcanoSelectorProps, {}>
{
    @observable tableData: Geneset[] = [];
    allTableData: Geneset[] = [];
    plotData: {x: number, y: number}[];
    maxY: number = 1;
    mapData: {tableData: Geneset, plotData:{x:number, y:number}}[] = [];
    @observable selectedPercentile: {label: string, value: string} = {label: '75%', value: '75'};
    @observable isLoading = true;
    @observable percentileHasChanged = false;
    readonly percentileOptions = [{label: '50%', value: '50'}, {label: '75%', value: '75'}, {label: '100%', value: '100'}];
    @observable private map_genesets_selected = new ObservableMap<boolean>();
    @observable private final_map_genesets_selected = new ObservableMap<boolean>();
    constructor(props:GenesetsVolcanoSelectorProps)
    {
        super(props);
        this.percentileChange = this.percentileChange.bind(this);
        this.final_map_genesets_selected.replace(props.initialSelection.map(geneSet => [geneSet, true]));
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
        return this.tableData.filter(geneSet => this.map_genesets_selected.get(geneSet.name));
    }
    
    @action selectAll(selected:boolean)
    {
        for (let geneSet of this.tableData)
            this.map_genesets_selected.set(geneSet.name, selected);
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
                        indeterminate={this.selectedGenesets.length > 0 && this.selectedGenesets.length < this.tableData.length}
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
                                checked={!!this.map_genesets_selected.get(geneSet.name)}
                                onChange={event => this.map_genesets_selected.set(geneSet.name, event.target.checked)}
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
        let plotData: {x: number, y: number}[] = [];
        let mapData: {tableData: Geneset, plotData:{x:number, y:number}}[] = [];
        for (let tableDatum of flatData) {
            let xValue = tableDatum.representativeScore;
            let yValue = -(Math.log(tableDatum.representativePvalue)/Math.log(10));
            if (yValue > this.maxY) {
                this.maxY = yValue;
            }
            mapData.push({tableData: tableDatum, plotData: {x: xValue, y: yValue}})
            plotData.push({x: xValue, y: yValue})
        }
        this.tableData = flatData;
        this.allTableData = flatData;
        this.plotData = plotData;
        this.mapData = mapData;
        this.isLoading = false;
    }
    
    getSelectedPoints(points: any, bounds: any) {
        let selectedPoints = [];
        let newTableData: Geneset[] = [];
        this.map_genesets_selected = new ObservableMap<boolean>();
        if (points && points[0].data) {
            for (let point of points[0].data) {
                selectedPoints.push({x: point.x, y: point.y})
            }
        }
        
        for (let mapDatum of this.mapData) {
            for (let selectedPoint of selectedPoints) {
                if (selectedPoint.x === mapDatum.plotData.x && selectedPoint.y === mapDatum.plotData.y) {
                    this.map_genesets_selected.set(mapDatum.tableData.name, true);
                }
            }
            for (let selectedGeneSet of this.map_genesets_selected.keys()) {
                if (mapDatum.tableData.name === selectedGeneSet) {
                    newTableData.push(mapDatum.tableData);
                }
            }
        }
        
        this.tableData = newTableData;
    }
    
    updateSelection() {
        for (let geneset of this.map_genesets_selected.keys()) {
            this.final_map_genesets_selected.set(geneset, true);
        }
        this.props.onSelect(this.final_map_genesets_selected);
    }
    
    render()
    {
        return (
                <div className={styles.GenesetsVolcanoSelectorWindow} style={ {height:"400px"} }>
                <div style={{float: "left"}} className="form-inline">
                <label htmlFor="PercentileScoreCalculation">Percentile for score calculation:</label>
                <span style={{display: "inline-block", verticalAlign: "middle", marginLeft: "1em"}}>
                <ReactSelect
                    addLabelText="Percentile for score calculation"
                    style={{width:160, borderRadius: "2px"}}
                    clearable={false}
                    name="PercentileScoreCalculation"
                    value={this.selectedPercentile}
                    options={this.percentileOptions}
                    onChange={this.percentileChange}
                />
                </span>
                    <LoadingIndicator isLoading={this.isLoading} />
                {  (!this.isLoading) && (
                <VictoryChart
                    theme={VictoryTheme.material}
                    width={510}
                    containerComponent={
                        <VictorySelectionContainer
                            onSelection={(points: any, bounds: any) => this.getSelectedPoints(points, bounds)}/>
                        }
                >
                <VictoryAxis crossAxis
                    domain={[-1, 1.25]}
                    tickValues={[-1, -0.5, 0, 0.5, 1]}
                    style={{axisLabel: {padding: 35}}}
                    label={"GSVA score"}
                    theme={VictoryTheme.material}
                    offsetY={50}
                    standalone={false}
                />
                <VictoryAxis dependentAxis crossAxis
                    domain={[0, this.maxY]}
                    style={{axisLabel: {padding: 35}, stroke: "none"}}
                    label={"-log10 p-value"}
                    theme={VictoryTheme.material}
                    offsetX={50}
                    standalone={false}
                />
                <VictoryLabel
                    text="significance ↑"
                    datum={{ x:1, y: 1.3}}
                    textAnchor="start"
                />
                <VictoryLine
                    style={{
                      data: { stroke: "black", strokeDasharray:5 },
                      parent: { border: "dotted 1px #f00"}
                    }}
                    data={[
                      { x: -1.2, y: 1.3 },
                      { x: 1, y: 1.3 }
                    ]}
                />
                <VictoryLine
                    style={{
                      data: { stroke: "rgb(144, 164, 174)" },
                      parent: { border: "1px dashed solid"}
                    }}
                    data={[
                      { x: 0, y: 0 },
                      { x: 0, y: this.maxY }
                    ]}
                />
                  <VictoryScatter
                      style={{ data: { fill: (d:any, active:undefined|true) => active ? "tomato" : "#3786C2" } }}
                      size={3}
                      data={this.plotData}
                  />
                </VictoryChart>
                      )
                  }
                </div>
                <div style={{float: "right", maxHeight: "356.5px", overflowY: "scroll", width: "650px"}}>
                <LoadingIndicator isLoading={this.isLoading} />
                {  (!this.isLoading) && (
                <GenesetsVolcanoTable
                    itemsName="geneSets"
                    initItemsPerPage={10}
                    columns={this.columns}
                    rawData={this.tableData}
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
                <button style={{marginTop:-20}} 
                className="btn btn-primary btn-sm pull-right"
                disabled={this.isLoading}
                onClick={() => this.updateSelection()}
                >
                    Add selection to the query
                </button>
                    <button style={{marginTop:-20, marginRight:15}} 
                    className="btn btn-primary btn-sm pull-right"
                    disabled={this.isLoading}
                    onClick={() => (this.map_genesets_selected = new ObservableMap<boolean>(),
                                this.tableData = this.allTableData)}
                    >
                        Clear selection
                    </button>
                </div>
                </div>
        );
    }
}
