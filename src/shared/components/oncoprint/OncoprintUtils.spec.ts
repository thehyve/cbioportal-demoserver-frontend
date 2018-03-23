import {
    makeGeneticTracksMobxPromise,
    percentAltered
} from "./OncoprintUtils";
import ResultsViewOncoprint from "./ResultsViewOncoprint";
import * as _ from 'lodash';
import {when} from 'mobx';
import {MobxPromise} from 'mobxpromise';
import {assert} from 'chai';
import sinon from 'sinon';

// This file uses type assertions to force functions that use overly specific
// types as parameters to accept mocked literals believed to be sufficient
// tslint:disable no-object-literal-type-assertion

const ONCOPRINT_STORE_WITH_3_PATIENTS = {
    samples: new MobxPromise(Promise.resolve()),
    patients: new MobxPromise(Promise.resolve([
        { "patientId": "TCGA-02-0001", "studyId": "gbm_tcga", "uniquePatientKey": "VENHQS0wMi0wMDAxOmdibV90Y2dh" },
        { "patientId": "TCGA-02-0003", "studyId": "gbm_tcga", "uniquePatientKey": "VENHQS0wMi0wMDAzOmdibV90Y2dh" },
        { "patientId": "TCGA-02-0006", "studyId": "gbm_tcga", "uniquePatientKey": "VENHQS0wMi0wMDA2OmdibV90Y2dh" }
    ])),
    genePanelInformation: new MobxPromise(Promise.resolve({
        patients: {
        }
    })),
    alteredSampleKeys: new MobxPromise(Promise.resolve()),
    sequencedSampleKeysByGene: new MobxPromise(Promise.resolve()),
    alteredPatientKeys: new MobxPromise(Promise.resolve()),
    sequencedPatientKeysByGene: new MobxPromise(Promise.resolve())
};

describe('OncoprintUtils', () => {
    describe('makeGeneticTracksMobxPromise', () => {
        it('resolves with a single track if queried for a single gene', (done) => {
            // given a three-patient oncoprint component queried for a single gene
            const oncoprintComponent = {props: {store: {
                ...ONCOPRINT_STORE_WITH_3_PATIENTS,
                putativeDriverFilteredCaseAggregatedDataByUnflattenedOQLLine: new MobxPromise(Promise.resolve([
                    {
                        cases: {},
                        oql: {}
                    }
                ]))
            }}} as any as ResultsViewOncoprint;
            // when the track promise is computed with this query
            const trackPromise = makeGeneticTracksMobxPromise(oncoprintComponent, false);
            // then it resolves with a single track
            when(
                () => !trackPromise.isPending,
                () => {
                    assert.lengthOf(trackPromise.result, 1);
                    done(trackPromise.error);
                }
            );
        });
    });

    describe('percentAltered', () => {
        it("returns the percentage with no decimal digits, for percentages >= 3", ()=>{
            assert.equal(percentAltered(3,100), "3%");
            assert.equal(percentAltered(20,100), "20%");
            assert.equal(percentAltered(3,3), "100%");
            assert.equal(percentAltered(50,99), "51%");
        })
        it("returns the percentage with one decimal digit, for percentages < 3, unless its exact", ()=>{
            assert.equal(percentAltered(22,1000), "2.2%");
            assert.equal(percentAltered(156,10000), "1.6%");
            assert.equal(percentAltered(0,3), "0%");
            assert.equal(percentAltered(2,100), "2%");
        })
    });
});