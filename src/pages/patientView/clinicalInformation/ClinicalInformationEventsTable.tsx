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

    private getDisplayValue(data:{attribute:string, value:string}):string {
        let ret:string;
        switch (data.attribute) {
            case "Overall Survival (Months)":
                ret = parseInt(data.value, 10).toFixed(0);
                break;
            default:
                ret = data.value;
                break;
        }
        return ret;
    }
    
    private getColumnsAndData(dataItems: {columns: any[]}[]) {
        if (!dataItems || !dataItems[0])
            return [];
        let result = [];
        let i = 0;
        debugger;
        for (i = 0; i < 13; i++) {
                let item  = {   
                                  name: dataItems[0].columns[i].key,
                                  render:(data)=><span>{data.columns[i].value}</span>,
                                  download: (data) => data.columns[i].value,
                                  filter: -1
                              };
                result.push(item);
        }
        return result;
    }
    

    public render() {

        
        const tableData = this.prepareData(this.props.data);
        return (
            <PatientEventTable
                  data={tableData}
                  columns={
                      this.getColumnsAndData(tableData)}
                  showPagination={false}
                  showColumnVisibility={false}
                  className={styles.patientTable}
                  initialItemsPerPage={SHOW_ALL_PAGE_SIZE}
                  initialSortColumn={tableData[0].columns[1].key}
                  initialSortDirection="asc"
                  showFilter={(this.props.showFilter === false) ? false : true }
                  showCopyDownload={(this.props.showCopyDownload === false) ? false : true }
            />
        );
    }



    public prepareData(eventData: ClinicalEvent[]) {

        const tableData: any[] = [];

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


