import LazyMobXCache from "../lib/LazyMobXCache";
import {Geneset} from "../api/generated/CBioPortalAPIInternal";
import client from "../api/cbioportalInternalClientInstance";

type Query = {
    genesetId:string;
};

function key(o:{genesetId:string}) {
    return o.genesetId;
}

async function fetch(queries:Query[]) {
    return client.fetchGenesetsUsingPOST({
        genesetIds: queries.map(q=>q.genesetId)
    })
}

export default class GenesetCache extends LazyMobXCache<Geneset, Query> {

    constructor() {
        super(key, key, fetch);
    }
}