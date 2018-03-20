import * as React from 'react';
import $ from 'jquery';
import {observer} from "mobx-react";
import {MSKTabs, MSKTab} from "../../../shared/components/MSKTabs/MSKTabs";
import {Gene, Sample} from "../../../shared/api/generated/CBioPortalAPI";
import AppConfig from "appConfig";
import {ResultsViewPageStore} from "../ResultsViewPageStore";
import {observable} from "mobx";
import IFrameLoader from "shared/components/iframeLoader/IFrameLoader";

@observer
export default class ExternalTab extends React.Component<{ store: ResultsViewPageStore}, {}> {
    
    render(){
        if (typeof AppConfig.externalTabURL === 'string') {
            return (
                    <MSKTab key={8} id="externalTab" linkText="External Tab app">
                        <div>
                            <object height="100%" width="100%" type="text/html" data={AppConfig.externalTabURL}></object>
                        </div>
                    </MSKTab> 
                )
        } else {
            return null;
        }
    }
    
}

