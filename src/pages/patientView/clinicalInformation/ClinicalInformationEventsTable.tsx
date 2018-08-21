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
    columns: any;
}

export default class ClinicalInformationEventsTable extends React.Component<IClinicalEventTableProps, {}> {

  public prepareData(eventData: ClinicalEvent[]) {

      const tableData: IPatientEventRow[] = [];

      let i = 0;
      const j = 0;
      for (i = 0; i < eventData.length; i++) {
          const row = eventData[i];
          if (row.eventType === "LAB_TEST") {

              tableData.push({"columns" : row.attributes});
          }
      }

      return tableData;
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

  private getDisplayValue(data:IPatientEventRow, key: string):string {
        for (const column of data.columns) {
            if (column.key === key) {
                return column.value;
            }
        }
        return "";

    }

  private getSortingValue(data:IPatientEventRow, key: string):number|string {
      for (const column of data.columns) {
          if (column.key === key) {
              if (isNaN(Number(column.value))) {
                  return Number.NEGATIVE_INFINITY;
              }
              return Number(column.value);
          }
      }
      return Number.NEGATIVE_INFINITY;

  }

  private getColumnsAndData(dataItems: IPatientEventRow[]): any {
      if (!dataItems || !dataItems[0])
          return [];

      const columnsAndData: any = [];

      for (const column in dataItems[0].columns) {
          if (dataItems[0].columns[column].key === "SUBTYPE") {
              columnsAndData.push({name: dataItems[0].columns[column].key,
                          render: (data:IPatientEventRow) => <span>{this.getDisplayValue(data, dataItems[0].columns[column].key)}</span>,
                          download: (data:IPatientEventRow) => this.getDisplayValue(data, dataItems[0].columns[column].key),
                          sortBy: (data:IPatientEventRow)=> this.getDisplayValue(data, dataItems[0].columns[column].key)
                    });
          } else {
              columnsAndData.push({name: dataItems[0].columns[column].key,
                      render: (data:IPatientEventRow) => <span>{this.getDisplayValue(data, dataItems[0].columns[column].key)}</span>,
                      download: (data:IPatientEventRow) => this.getDisplayValue(data, dataItems[0].columns[column].key),
                      sortBy: (data:IPatientEventRow)=> this.getSortingValue(data, dataItems[0].columns[column].key)
                });
          }
      }

      return columnsAndData;
  }
}
