import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { CoverageInformation } from '../../resultsView/ResultsViewPageStoreUtils';
import { ClinicalEvent, Sample } from 'cbioportal-ts-api-client';
import PatientViewMutationsDataStore from '../mutation/PatientViewMutationsDataStore';
import TimelineWrapperStore from 'pages/patientView/timeline2/TimelineWrapperStore';

import 'cbioportal-clinical-timeline/dist/styles.css';

import {
    configureTracks,
    Timeline,
    TimelineStore,
    TimelineTrackSpecification,
} from 'cbioportal-clinical-timeline';
import SampleManager from 'pages/patientView/SampleManager';
import { downloadZippedTracks } from 'pages/patientView/timeline/timelineTSV';
import {
    buildBaseConfig,
    configureGenieTimeline,
    sortTracks,
} from 'pages/patientView/timeline2/helpers';

export interface ISampleMetaDeta {
    color: { [sampleId: string]: string };
    index: { [sampleId: string]: number };
    label: { [sampleId: string]: string };
}

export interface ITimeline2Props {
    dataStore: PatientViewMutationsDataStore;
    data: ClinicalEvent[];
    caseMetaData: ISampleMetaDeta;
    sampleManager: SampleManager;
    width: number;
    samples: Sample[];
    mutationProfileId: string;
    coverageInformation: CoverageInformation;
}

const TimelineWrapper: React.FunctionComponent<ITimeline2Props> = observer(
    function({
        dataStore,
        data,
        caseMetaData,
        sampleManager,
        width,
        samples,
        mutationProfileId,
        coverageInformation,
    }: ITimeline2Props) {
        const [events, setEvents] = useState<
            TimelineTrackSpecification[] | null
        >(null);

        const [stores, setStores] = useState<TimelineStore[] | null>(null);
        const [
            wrapperStore,
            setWrapperStore,
        ] = useState<TimelineWrapperStore | null>(null);

        useEffect(() => {
            var isGenieBpcStudy = window.location.href.includes('genie_bpc');

            const baseConfig: any = buildBaseConfig(
                sampleManager,
                caseMetaData
            );

            if (isGenieBpcStudy) {
                configureGenieTimeline(baseConfig);
            }

            const trackSpecifications = sortTracks(baseConfig, data);

            configureTracks(
                trackSpecifications,
                baseConfig.trackEventRenderers
            );

            // we can consider perhaps moving store into Timeline component
            // not sure if/why it needs to be out here
            const store1 = new TimelineStore(trackSpecifications);

            const store2 = new TimelineStore(trackSpecifications);

            setStores([store1, store2]);

            const wrapperStore = new TimelineWrapperStore();

            setWrapperStore(wrapperStore);

            (window as any).store = store1;
        }, []);

        if (stores && wrapperStore) {
            return (
                <>
                    <div>
                        <div>
                            <Timeline
                                store={stores[0]}
                                width={width}
                                onClickDownload={() =>
                                    downloadZippedTracks(data)
                                }
                            />
                        </div>
                    </div>
                </>
            );
        } else {
            return <div />;
        }
    }
);

export default TimelineWrapper;
