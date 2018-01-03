import LazyMobXCache, {AugmentedData} from "../lib/LazyMobXCache";
import {GenesetMolecularData, GenesetDataFilterCriteria} from "../api/generated/CBioPortalAPIInternal";
import client from "shared/api/cbioportalInternalClientInstance";
import _ from "lodash";
import {IDataQueryFilter} from "../lib/StoreUtils";

type Query = {
    genesetId: string;
    molecularProfileId: string;
};

type SampleFilterByProfile = {
    [molecularProfileId: string]: IDataQueryFilter
};

function queryToKey(q: Query) {
    return `${q.molecularProfileId}~${q.genesetId}`;
}

function dataToKey(d:GenesetMolecularData[], q:Query) {
    return `${q.molecularProfileId}~${q.genesetId}`;
}

async function fetch(
    queries:Query[],
    sampleFilterByProfile: SampleFilterByProfile
) {
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
    const results: GenesetMolecularData[][] = await Promise.all(
        params.map(param => client.fetchGeneticDataItemsUsingPOST(param))
    );
    const ret: {[key: string]: AugmentedData<GenesetMolecularData[], Query>} = {};
    for (const query of queries) {
        ret[queryToKey(query)] = {
            data:[[]],
            meta:query
        };
    }
    for (const queryResult of results) {
        for (const datum of queryResult) {
            ret[queryToKey(datum)].data[0].push(datum);
        }
    }
    return _.values(ret);
}

export default class GenesetMolecularDataCache extends LazyMobXCache<GenesetMolecularData[], Query, Query>{
    constructor(molecularProfileIdToSampleFilter: SampleFilterByProfile) {
        super(queryToKey, dataToKey, fetch, molecularProfileIdToSampleFilter);
    }
}
