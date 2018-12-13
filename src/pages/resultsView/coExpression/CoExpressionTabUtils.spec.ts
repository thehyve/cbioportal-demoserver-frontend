import {assert} from "chai";
import {getGeneProfiles, getGenesetProfiles, sortProfiles, 
        filterAndSortProfilesX, filterAndSortProfilesY,
        filterAndSortProfiles} from "./CoExpressionTabUtils";

const profiles = [
    {
        molecularAlterationType: "MUTATION_EXTENDED"
    },
    {
        molecularAlterationType: "MRNA_EXPRESSION",
        molecularProfileId: "merged_median_zscores_rna_seq"
    },
    {
        molecularAlterationType: "PROTEIN_LEVEL",
        molecularProfileId: "aposidjpao"
    },
    {
        molecularAlterationType: "MRNA_EXPRESSION",
        molecularProfileId: "blah2_zscores"
    },
    {
        molecularAlterationType: "PROTEIN_LEVEL",
        molecularProfileId:"blah_zscores"
    },
    {
        molecularAlterationType: "GENESET_SCORE",
        molecularProfileId:"someid"
    },
    {
        molecularAlterationType: "GENESET_SCORE",
        molecularProfileId:"someid_gsva_pvalues"
    }
] as any;

describe("CoExpressionTabUtils", ()=>{
    describe("filterAndSortProfiles", ()=>{
        it("returns empty if no profiles given", ()=>{
            assert.equal(filterAndSortProfiles([]).length, 0);
        });
        it("returns empty if no valid profiles", ()=>{
            assert.equal(filterAndSortProfiles([profiles[0]]).length, 0);
            assert.equal(filterAndSortProfiles([profiles[3]]).length, 0);
            assert.equal(filterAndSortProfiles([profiles[0], profiles[3], profiles[4]]).length, 0);
        });
        it("returns valid profiles, with rna seq sorted to the top", ()=>{
            assert.deepEqual(
                filterAndSortProfiles(profiles),
                [profiles[1], profiles[2]]
            );
        });
    });
    describe("getGeneProfiles", ()=>{
        it("returns empty if no profiles given", ()=>{
            assert.equal(getGeneProfiles([]).length, 0);
        });
        it("returns empty if no valid profiles", ()=>{
            assert.equal(getGeneProfiles([profiles[0]]).length, 0);
            assert.equal(getGeneProfiles([profiles[3]]).length, 0);
            assert.equal(getGeneProfiles([profiles[0], profiles[5], profiles[6]]).length, 0);
        });
        it("returns valid profiles, with rna seq sorted to the top", ()=>{
            assert.deepEqual(
                getGeneProfiles(profiles),
                [profiles[1], profiles[2]]
            );
        });
    });
    describe("getGenesetProfiles", ()=>{
        it("returns empty if no profiles given", ()=>{
            assert.equal(getGenesetProfiles([]).length, 0);
        });
        it("returns empty if no valid profiles", ()=>{
            assert.equal(getGenesetProfiles([profiles[0]]).length, 0);
            assert.equal(getGenesetProfiles([profiles[1]]).length, 0);
            assert.equal(getGenesetProfiles([profiles[1], profiles[2], profiles[4]]).length, 0);
        });
        it("returns valid profiles", ()=>{
            assert.deepEqual(
                getGenesetProfiles(profiles),
                [profiles[5]]
            );
        });
    });
    describe("sortProfiles", ()=>{
        it("sorts profiles, with rna seq to the top", ()=>{
            assert.deepEqual(
                sortProfiles([profiles[2], profiles[1]]), 
                [profiles[1], profiles[2]]);
        });
    });
    describe("filterAndSortProfilesX", ()=>{
        it("returns empty if no profiles given", ()=>{
            assert.equal(filterAndSortProfilesX("gene", []).length, 0);
            assert.equal(filterAndSortProfilesX("geneset", []).length, 0);
        });
        it("returns empty if no valid profiles", ()=>{
            assert.equal(filterAndSortProfilesX("gene", [profiles[0]]).length, 0);
            assert.equal(filterAndSortProfilesX("gene", [profiles[3]]).length, 0);
            assert.equal(filterAndSortProfilesX("gene", [profiles[0], profiles[5], profiles[6]]).length, 0);
            assert.equal(filterAndSortProfilesX("geneset", [profiles[0]]).length, 0);
            assert.equal(filterAndSortProfilesX("geneset", [profiles[3]]).length, 0);
            assert.equal(filterAndSortProfilesX("geneset", [profiles[0], profiles[3], profiles[6]]).length, 0);
        });
        it("returns valid profiles, with rna seq sorted to the top (if applicable)", ()=>{
            assert.deepEqual(
                filterAndSortProfilesX("gene", profiles),
                [profiles[1], profiles[2]]
            );
            assert.deepEqual(
                filterAndSortProfilesX("geneset", profiles),
                [profiles[5]]
            );
        });
    });
    describe("filterAndSortProfilesY", ()=>{
        it("returns empty if no profiles given", ()=>{
            assert.equal(filterAndSortProfilesY([]).length, 0);
        });
        it("returns empty if no valid profiles", ()=>{
            assert.equal(filterAndSortProfilesY([profiles[0]]).length, 0);
            assert.equal(filterAndSortProfilesY([profiles[3]]).length, 0);
            assert.equal(filterAndSortProfilesY([profiles[0], profiles[3], profiles[6]]).length, 0);
        });
        it("returns valid profiles, with rna seq sorted to the top (if applicable)", ()=>{
            assert.deepEqual(
                filterAndSortProfilesY(profiles),
                [profiles[1], profiles[2], profiles[5]]
            );
        });
    });
});