import * as React from "react";
import {ClinicalEvent} from "../../../shared/api/generated/CBioPortalAPI";
import LazyMobXTable from "shared/components/lazyMobXTable/LazyMobXTable";

import styles from './style/patientTable.module.scss';
import {SHOW_ALL_PAGE_SIZE} from "../../../shared/components/paginationControls/PaginationControls";

export interface IClinicalEventTableProps {
    data: ClinicalEvent[];
    showTitleBar?: boolean;
    cssClass?:string;
    showFilter?:boolean;
    showCopyDownload?:boolean;
}

class PatientEventTable extends LazyMobXTable<IPatientEventRow> {}

interface IPatientEventRow {
    columns: any[];
};

export default class ClinicalInformationEventsTable extends React.Component<IClinicalEventTableProps, {}> {

    private getDisplayValue(data:IPatientEventRow, key: string):number|string {
        for (let i = 0; i < data.columns.length; i++) {
            if (data.columns[i].key == key) {
                if (isNaN(Number(data.columns[i].value))) {
                    return data.columns[i].value;
                }
                return Number(data.columns[i].value);
            }
        }
        return "";
        
    }
    
    private getColumnsAndData(dataItems: IPatientEventRow[]): any {
        if (!dataItems || !dataItems[0])
            return [];
        return dataItems[0].columns.map(({key, value}: {key: string, value: string}) =>
            ({name: key,
                      render: (data:IPatientEventRow) => <span>{this.getDisplayValue(data, key)}</span>,
                      download: (data:IPatientEventRow) => this.getDisplayValue(data, key),
                      sortBy: (data:IPatientEventRow)=> this.getDisplayValue(data, key)
                }));
    }
    

    public render() {

        
        const tableData = this.prepareData(this.props.data);
        return (
            <PatientEventTable
                  data={tableData}
                  columns={this.getColumnsAndData(tableData)}
                  showPagination={false}
                  showColumnVisibility={false}
                  className={styles.patientTable}
                  initialItemsPerPage={SHOW_ALL_PAGE_SIZE}
                  initialSortColumn={tableData[0].columns[1].key}
                  initialSortDirection={"desc"}
                  showFilter={(this.props.showFilter === false) ? false : true }
                  showCopyDownload={(this.props.showCopyDownload === false) ? false : true }
            />
        );
    }



    public prepareData(eventData: ClinicalEvent[]) {

        const tableData: IPatientEventRow[] = [];

        let i = 0;
        let j = 0;
        for (i = 0; i < eventData.length; i++) {
            let row = eventData[i];
            if (row.eventType == "LAB_TEST") {

                tableData.push({"columns" : row.attributes});
            }
        }

        return tableData;
    }
}


