import * as React from 'react';
import $ from 'jquery';
import * as _ from "lodash";
import {observer} from "mobx-react";
import {MSKTabs, MSKTab} from "../../../shared/components/MSKTabs/MSKTabs";
import {Gene, Sample} from "../../../shared/api/generated/CBioPortalAPI";
import AppConfig from "appConfig";
import {ResultsViewPageStore} from "../ResultsViewPageStore";
import {observable, computed} from "mobx";
import IFrameLoader from "shared/components/iframeLoader/IFrameLoader";
var stringify = require('json-stringify-safe');

@observer
export default class ExternalTab extends React.Component<{ store: ResultsViewPageStore}, {}> {

    public render(){
         (parent as any).cbioStore = this.props.store;
        if (typeof AppConfig.externalTabURL === 'string') {
            return (
                    <MSKTab key={8} id="externalTab" linkText="External Tab app">
                        <div>
                            <object height="700" width="100%" type="text/html" data={AppConfig.externalTabURL}></object>
                        </div>
                    </MSKTab> 
                )
        } else {
            return null;
        }
    }
    
}

