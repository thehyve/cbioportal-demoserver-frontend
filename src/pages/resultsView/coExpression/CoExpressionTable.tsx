import * as React from "react";
import {MolecularProfileCorrelation} from "../../../shared/api/generated/CBioPortalAPIInternal";
import {correlationColor, correlationSortBy} from "./CoExpressionTableUtils";
import LazyMobXTable from "../../../shared/components/lazyMobXTable/LazyMobXTable";
import {ILazyMobXTableApplicationDataStore} from "../../../shared/lib/ILazyMobXTableApplicationDataStore";
import {CoExpressionDataStore, TableMode} from "./CoExpressionViz";
import Select from "react-select";
import {observer} from "mobx-react";
import {observable} from "mobx"
import {tableSearchInformation} from "./CoExpressionTabUtils";
import DefaultTooltip from "../../../shared/components/defaultTooltip/DefaultTooltip";
import InfoIcon from "../../../shared/components/InfoIcon";
import {bind} from "bind-decorator";
import { cytobandFilter } from "pages/resultsView/ResultsViewTableUtils";
import {PotentialViewType} from "../plots/PlotsTab";
import {PLOT_SIDELENGTH} from "../plots/PlotsTabUtils";

export interface ICoExpressionTableProps {
    referenceGeneticEntity:{geneticEntityName:string, cytoband:string};
    dataStore:CoExpressionDataStore;
    tableMode:TableMode;
    onSelectTableMode:(t:TableMode)=>void;
}

const SPEARMANS_CORRELATION_COLUMN_NAME = "Spearman's Correlation";
const P_VALUE_COLUMN_NAME = "P-value";

const COLUMNS = [
    {
        name: "Correlated Gene",
        render: (d:MolecularProfileCorrelation)=>(<span style={{fontWeight:"bold"}}>{d.geneticEntityName}</span>),
        filter:(d:MolecularProfileCorrelation, f:string, filterStringUpper:string)=>(d.geneticEntityName.indexOf(filterStringUpper) > -1),
        download:(d:MolecularProfileCorrelation)=>d.geneticEntityName,
        sortBy:(d:MolecularProfileCorrelation)=>d.geneticEntityName,
        width:"30%"
    },
    {
        name:"Cytoband",
        render:(d:MolecularProfileCorrelation)=>(<span>{d.cytoband}</span>),
        filter:cytobandFilter,
        download:(d:MolecularProfileCorrelation)=>d.cytoband,
        sortBy:(d:MolecularProfileCorrelation)=>d.cytoband,
        width:"30%"
    },
    makeNumberColumn(SPEARMANS_CORRELATION_COLUMN_NAME, "spearmansCorrelation"),
    makeNumberColumn(P_VALUE_COLUMN_NAME, "pValue"),
    makeNumberColumn("Q-value", "qValue"),
];

function makeNumberColumn(name:string, key:keyof MolecularProfileCorrelation) {
    return {
        name:name,
        render:(d:MolecularProfileCorrelation)=>{
            return (
                <span
                    style={{
                        color:correlationColor(d[key] as number),
                        textAlign:"right",
                        float:"right"
                    }}
                >{(d[key] as number).toFixed(2)}</span>
            );
        },
        download:(d:MolecularProfileCorrelation)=>(d[key] as number).toString()+"",
        sortBy:(d:MolecularProfileCorrelation)=>correlationSortBy(d[key] as number),
        align: "right" as "right"
    };
}

@observer
export default class CoExpressionTable extends React.Component<ICoExpressionTableProps, {}> {
    @bind
    private onRowClick(d:MolecularProfileCorrelation) {
        this.props.dataStore.setHighlighted(d);
    }

    @bind
    private onSelectTableMode(d:any) {
        this.props.onSelectTableMode(d.value);
    }

    private tableModeOptions = [
        {
            label: "Show Any Correlation",
            value: TableMode.SHOW_ALL
        },
        {
            label: "Show Only Positively Correlated",
            value: TableMode.SHOW_POSITIVE
        },
        {
            label: "Show Only Negatively Correlated",
            value: TableMode.SHOW_NEGATIVE
        }
    ];

    private paginationProps = {
        itemsPerPageOptions: [25]
    };

    render() {
        return (
            <div>
                <div
                    style={{float:"left", display:"flex", flexDirection:"row"}}
                >
                    <div style={{width:180}}>
                        <Select
                            value={this.props.tableMode}
                            onChange={this.onSelectTableMode}
                            options={this.tableModeOptions}
                            searchable={false}
                            clearable={false}
                            className="coexpression-select-table-mode"
                        />
                    </div>
                    <InfoIcon
                        style={{marginLeft:21, marginTop:"0.7em"}}
                        tooltip={<div style={{maxWidth:200}}>{tableSearchInformation}</div>}
                        tooltipPlacement="left"
                    />
                </div>
                <LazyMobXTable
                    initialSortColumn={P_VALUE_COLUMN_NAME}
                    initialSortDirection="asc"
                    columns={COLUMNS}
                    showColumnVisibility={false}
                    dataStore={this.props.dataStore}
                    onRowClick={this.onRowClick}
                    filterPlaceholder="Enter gene or cytoband.."
                    paginationProps={this.paginationProps}
                    initialItemsPerPage={25}
                    copyDownloadProps={{
                        showCopy: false
                    }}
                />
            </div>
        );
    }
}
