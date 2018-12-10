import * as _ from 'lodash';
import {MolecularProfile} from "../../../shared/api/generated/CBioPortalAPI";
import {AlterationTypeConstants} from "../ResultsViewPageStore";
export const correlationInformation = "Pearson correlations are computed first. For genes with a correlation greater "+
                                        "than 0.3 or less than -0.3, the Spearman correlations are also computed. By "+
                                        "default, only gene pairs with values > 0.3 or < -0.3 in both measures are shown.";

export const tableSearchInformation = "Coexpression data can be filtered by gene, or by cytoband. To exclude all genes "+
                                        "from a cytoband, prefix with a dash -. For example, to exclude all genes on "+
                                        "1p, search '-1p'.";

export function getGeneProfiles(profiles:MolecularProfile[]) {
    const profs = profiles.filter(profile=>{
        // we want a profile which is mrna or protein, and among them we want any profile,
        // except zscore profiles that are not merged_median_zscores

        let good = false;
        if (profile.molecularAlterationType === AlterationTypeConstants.MRNA_EXPRESSION ||
            profile.molecularAlterationType === AlterationTypeConstants.PROTEIN_LEVEL) {

            const profileId = profile.molecularProfileId.toLowerCase();
            good = (profileId.indexOf("merged_median_zscores") > -1) ||
                (profileId.indexOf("zscores") === -1);
        }
        return good;
    });
    return profs;
}

export function getGenesetProfiles(profiles:MolecularProfile[]) {
    const profs = profiles.filter(profile=>{
        // we want a profile which is mrna or protein, and among them we want any profile,
        // except zscore profiles that are not merged_median_zscores

        let good = false;
        if (profile.molecularAlterationType === AlterationTypeConstants.GENESET_SCORE) {

            const profileId = profile.molecularProfileId.toLowerCase();
            good = profileId.indexOf("gsva_pvalues") === -1;
        }
        return good;
    });
    return profs;
}

export function sortProfiles(profs: MolecularProfile[]) {
    // sort rna seq to the top
    return _.sortBy(profs, profile=>(profile.molecularProfileId.toLowerCase().indexOf("rna_seq") > -1) ? 0 : 1);
}

export function filterAndSortProfilesY(profiles:MolecularProfile[]) {
    const allProfs = getGeneProfiles(profiles).concat(getGenesetProfiles(profiles));
    return sortProfiles(allProfs);
}

export function filterAndSortProfilesX(geneticEntity:"gene"|"geneset", profiles:MolecularProfile[]) {
    if (geneticEntity === "gene") {
        const profs = getGeneProfiles(profiles);
        return sortProfiles(profs);
    } else {
        return getGenesetProfiles(profiles);
    }
}

export function filterAndSortProfiles(profiles:MolecularProfile[]) {
    const profs = profiles.filter(profile=>{
        // we want a profile which is mrna or protein, and among them we want any profile,
        // except zscore profiles that are not merged_median_zscores

        let good = false;
        if (profile.molecularAlterationType === AlterationTypeConstants.MRNA_EXPRESSION ||
            profile.molecularAlterationType === AlterationTypeConstants.PROTEIN_LEVEL) {

            const profileId = profile.molecularProfileId.toLowerCase();
            good = (profileId.indexOf("merged_median_zscores") > -1) ||
                (profileId.indexOf("zscores") === -1);
        }
        return good;
    });

    // sort rna seq to the top
    return sortProfiles(profs);
}