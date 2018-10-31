import {assert} from "chai";
import {getGeneProfiles, getGenesetProfiles, sortProfiles, 
        filterAndSortSubjectProfiles, filterAndSortQueryProfiles,
        filterAndSortProfiles} from "./CoExpressionTabUtils";
import {MolecularProfile} from "../../../shared/api/generated/CBioPortalAPI";

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
    describe("filterAndSortSubjectProfiles", ()=>{
        it("returns empty if no profiles given", ()=>{
            assert.equal(filterAndSortSubjectProfiles("gene", []).length, 0);
            assert.equal(filterAndSortSubjectProfiles("geneset", []).length, 0);
        });
        it("returns empty if no valid profiles", ()=>{
            assert.equal(filterAndSortSubjectProfiles("gene", [profiles[0]]).length, 0);
            assert.equal(filterAndSortSubjectProfiles("gene", [profiles[3]]).length, 0);
            assert.equal(filterAndSortSubjectProfiles("gene", [profiles[0], profiles[5], profiles[6]]).length, 0);
            assert.equal(filterAndSortSubjectProfiles("geneset", [profiles[0]]).length, 0);
            assert.equal(filterAndSortSubjectProfiles("geneset", [profiles[3]]).length, 0);
            assert.equal(filterAndSortSubjectProfiles("geneset", [profiles[0], profiles[3], profiles[6]]).length, 0);
        });
        it("returns valid profiles, with rna seq sorted to the top (if applicable)", ()=>{
            assert.deepEqual(
                filterAndSortSubjectProfiles("gene", profiles),
                [profiles[1], profiles[2]]
            );
            assert.deepEqual(
                filterAndSortSubjectProfiles("geneset", profiles),
                [profiles[5]]
            );
        });
    });
    describe("filterAndSortQueryProfiles", ()=>{
        it("returns empty if no profiles given", ()=>{
            assert.equal(filterAndSortQueryProfiles([]).length, 0);
        });
        it("returns empty if no valid profiles", ()=>{
            assert.equal(filterAndSortQueryProfiles([profiles[0]]).length, 0);
            assert.equal(filterAndSortQueryProfiles([profiles[3]]).length, 0);
            assert.equal(filterAndSortQueryProfiles([profiles[0], profiles[3], profiles[6]]).length, 0);
        });
        it("returns valid profiles, with rna seq sorted to the top (if applicable)", ()=>{
            assert.deepEqual(
                filterAndSortQueryProfiles(profiles),
                [profiles[1], profiles[2], profiles[5]]
            );
        });
    });
});