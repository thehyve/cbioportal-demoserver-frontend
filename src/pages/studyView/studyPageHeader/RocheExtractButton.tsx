import { DefaultTooltip } from 'cbioportal-frontend-commons';
import * as React from 'react';
import { StudyViewPageStore } from 'pages/studyView/StudyViewPageStore';
import { getButtonNameWithDownPointer } from 'pages/studyView/StudyViewUtils';
import {
    ExtractRequest,
    PathResponse,
    SampleIdentifier,
} from 'pages/studyView/RocheExtractServiceAPI';
import { Sample } from 'cbioportal-ts-api-client';
import _ from 'lodash';
import { observer } from 'mobx-react';
import { action, computed, makeObservable, observable } from 'mobx';
import ComplexKeyMap from 'shared/lib/complexKeyDataStructures/ComplexKeyMap';
import { MakeMobxView } from 'shared/components/MobxView';
import Loader from 'shared/components/loadingIndicator/LoadingIndicator';
import { fromPromise } from 'mobx-utils';
import client from 'pages/studyView/RocheExtractServiceInstance';
import LoadingIndicator from 'shared/components/loadingIndicator/LoadingIndicator';

const successIconImg = require('../../../rootImages/success_icon.png');
const failureIconImg = require('../../../rootImages/failure_icon.png');

interface RocheExtractMenuProps {
    studyViewStore: StudyViewPageStore;
}

@observer
export class RocheExtractButton extends React.Component<
    RocheExtractMenuProps,
    {}
> {
    @observable.ref pathInformation: PathResponse | undefined = undefined;
    private lastSampleSelection: ComplexKeyMap<Sample> | undefined = undefined;
    private workspaceRootWindows =
        'file:///C:\\My DocumentsRocheWayfind-R workspace';
    @action extract = () => fromPromise(client.extract(this.buildRequest()));
    // For testing:
    // @action extract = () =>
    //     fromPromise(
    //         new Promise(resolve =>
    //             setTimeout(
    //                 () =>
    //                     resolve({
    //                         workspaceDir: '1st',
    //                         localDir:
    //                             'projectdir/0a8d4296-1edb-4c6c-96c3-c7cab5e6261b',
    //                         localFilePath:
    //                             'projectdir/0a8d4296-1edb-4c6c-96c3-c7cab5e6261b/clinical_data.tsv',
    //                     }),
    //                 1000
    //             )
    //         )
    //     );
    @observable.ref extractResponse: any = undefined;

    constructor(props: RocheExtractMenuProps) {
        super(props);
        makeObservable(this);
    }

    readonly extractMenu = MakeMobxView({
        await: () => [this.props.studyViewStore.selectedSampleSet],
        render: () => {
            return (
                <div style={{ width: 400, margin: 10 }}>
                    <div style={{ marginBottom: 10 }}>
                        Export the clinical attributes of the currently selected
                        samples to the project workspace for analysis with
                        bioinformatics tools.
                    </div>
                    <button
                        className={'btn btn-primary btn-sm'}
                        style={{ width: '100%' }}
                        onClick={this.onClickExtractButton}
                        disabled={!this.isUpdatedSampleSelection}
                    >
                        Export clinical data
                    </button>
                    {this.extractResponse &&
                        this.extractResponse.state === 'pending' && (
                            <LoadingIndicator isLoading={true} />
                        )}
                    {this.extractResponse &&
                        this.extractResponse.state === 'fulfilled' && (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    marginTop: 10,
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <img
                                        src={successIconImg}
                                        style={{ width: 18, marginRight: 5 }}
                                    />
                                    <span>
                                        The clinical data file can be found at:
                                    </span>
                                </div>
                                <div>
                                    {this.extractResponse.value.localFilePath}
                                </div>
                            </div>
                        )}
                    {this.extractResponse &&
                        this.extractResponse.state === 'rejected' && (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    marginTop: 10,
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <img
                                        src={failureIconImg}
                                        style={{ width: 18, marginRight: 5 }}
                                    />
                                    <span>Extraction failed</span>
                                </div>
                                <div>
                                    Contact a system administrator for
                                    assistance.
                                </div>
                            </div>
                        )}
                </div>
            );
        },
    });

    @action.bound
    private async onClickExtractButton() {
        const pathInformation = {
            workspaceDir: '1st',
            localDir: 'projectdir/0a8d4296-1edb-4c6c-96c3-c7cab5e6261b',
            localFilePath:
                'projectdir/0a8d4296-1edb-4c6c-96c3-c7cab5e6261b/clinical_data.tsv',
        } as PathResponse;
        this.extractResponse = this.extract();
        this.lastSampleSelection = this.props.studyViewStore.selectedSampleSet.result;
    }

    @computed get isUpdatedSampleSelection(): boolean {
        return (
            this.lastSampleSelection !==
            this.props.studyViewStore.selectedSampleSet.result
        );
    }

    private buildRequest(): ExtractRequest {
        const sampleIdentifiers: SampleIdentifier[] = _.map(
            this.props.studyViewStore.selectedSamples.result,
            (sample: Sample) => {
                return {
                    sampleId: sample.sampleId,
                    patientId: sample.patientId,
                    studyId: sample.studyId,
                };
            }
        );
        const extractDirectory = this.props.studyViewStore.studyIds.join('_');
        return { sampleIdentifiers, extractDirectory };
    }

    render() {
        return (
            <div>
                <DefaultTooltip
                    trigger={['click']}
                    destroyTooltipOnHide={true}
                    overlay={this.extractMenu.component}
                    placement="bottom"
                >
                    <div>
                        <button
                            className={'btn btn-primary btn-sm'}
                            data-test="custom-selection-button"
                            style={{
                                marginLeft: '10px',
                            }}
                        >
                            {getButtonNameWithDownPointer('Roche Workspace')}
                        </button>
                    </div>
                </DefaultTooltip>
            </div>
        );
    }
}
