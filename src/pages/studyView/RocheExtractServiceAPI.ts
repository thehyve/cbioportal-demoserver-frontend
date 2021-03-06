import { Sample } from 'cbioportal-ts-api-client';
import { buildCBioPortalAPIUrl } from 'shared/api/urls';
import * as request from 'superagent';

export type ExtractRequest = {
    sampleIdentifiers: SampleIdentifier[];
    extractDirectory: string;
};

export type PathResponse = {
    workspaceDir: string;
    localDir: string;
    localFilePath: string;
};

export type SampleIdentifier = Pick<
    Sample,
    'sampleId' | 'patientId' | 'studyId'
>;

export default class RocheExtractServiceAPI {
    getExtractServiceUrl() {
        return buildCBioPortalAPIUrl('api/extract');
    }

    extract(extractRequest: ExtractRequest) {
        return request
            .post(this.getExtractServiceUrl())
            .send(extractRequest)
            .then((res: any) => {
                const result: PathResponse = res.body;
                return result;
            });
    }
}
