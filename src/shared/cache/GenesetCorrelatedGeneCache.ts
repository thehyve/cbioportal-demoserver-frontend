import {GenesetCorrelation} from "../api/generated/CBioPortalAPIInternal";
import client from "shared/api/cbioportalInternalClientInstance";
import _ from "lodash";
import {IDataQueryFilter} from "../lib/StoreUtils";

interface IQuery {
    genesetId: string;
    molecularProfileId: string;
}

export type SampleFilterByProfile = {
    [molecularProfileId: string]: IDataQueryFilter
};

export default class GenesetCorrelatedGeneCache  {
    
    private nextGeneIndex: 0;
    
    private async (
        query: IQuery,
        sampleFilterByProfile: SampleFilterByProfile
    ): Promise<GenesetCorrelation[]> {
        const genesetIdsByProfile = _.mapValues(
            _.groupBy(queries, q => q.molecularProfileId),
            profileQueries => profileQueries.map(q => q.genesetId)
        );
        const params = Object.keys(genesetIdsByProfile)
            .map(profileId => ({
                geneticProfileId: profileId,
                // the Swagger-generated type expected by the client method below
                // incorrectly requires both samples and a sample list;
                // use 'as' to tell TypeScript that this object really does fit.
                // tslint:disable-next-line: no-object-literal-type-assertion
                genesetDataFilterCriteria: {
                    genesetIds: genesetIdsByProfile[profileId],
                    ...sampleFilterByProfile[profileId]
                } as GenesetDataFilterCriteria
            })
        );
        const dataPromises = params.map(param => client.fetchCorrelatedGenesUsingPOST(param));
        const results: Gee[][] = await Promise.all(dataPromises);
        return augmentQueryResults(queries, results);
}
}
