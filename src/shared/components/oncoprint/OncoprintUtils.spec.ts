import {
    alterationInfoForCaseAggregatedDataByOQLLine,
    makeGeneticTrackWith,
    percentAltered
} from "./OncoprintUtils";
import {observable} from "mobx";
import * as _ from 'lodash';
import {assert} from 'chai';

describe('OncoprintUtils', () => {
    describe('alterationInfoForCaseAggregatedDataByOQLLine', () => {
        it('counts two sequenced samples if the gene was sequenced in two out of three samples', () => {
            // given
            const dataByCase = {
                samples: {'SAMPLE1': [], 'SAMPLE2': [], 'SAMPLE3': []},
                patients: {}
            };
            const sequencedSampleKeysByGene = {'TTN': ['SAMPLE2', 'SAMPLE3']};
            // when
            const info = alterationInfoForCaseAggregatedDataByOQLLine(
                true,
                {cases: dataByCase, oql: {gene: 'TTN'}},
                sequencedSampleKeysByGene,
                {}
            );
            // then
            assert.equal(info.sequenced, 2);
        });

        it("counts no sequenced patients if the gene wasn't sequenced in either patient", () => {
            // given
            const dataByCase = {
                samples: {},
                patients: {'PATIENT1': [], 'PATIENT2': []}
            };
            const sequencedPatientKeysByGene = {'ADH1A': []};
            // when
            const info = alterationInfoForCaseAggregatedDataByOQLLine(
                false,
                {cases: dataByCase, oql: {gene: 'ADH1A'}},
                {},
                sequencedPatientKeysByGene
            );
            // then
            assert.equal(info.sequenced, 0);
        });

        it('counts three sequenced patients if at least one merged-track gene was sequenced in each', () => {
            // given
            const dataByCase = {
                samples: {},
                patients: {'PATIENT1': [], 'PATIENT2': [], 'PATIENT3': []}
            };
            const sequencedPatientKeysByGene = {
                'VEGFA': ['PATIENT1', 'PATIENT2'],
                'VEGFB': ['PATIENT1', 'PATIENT3'],
                'CXCL8': ['PATIENT1', 'PATIENT3']
            };
            // when
            const info = alterationInfoForCaseAggregatedDataByOQLLine(
                false,
                {
                    cases: dataByCase,
                    oql: ['CXCL8', 'VEGFA', 'VEGFB']
                },
                {},
                sequencedPatientKeysByGene
            );
            // then
            assert.equal(info.sequenced, 3);
        });

        it("counts one sequenced sample if the other one wasn't covered by either of the genes", () => {
            // given
            const dataByCase = {
                samples: {'SAMPLE1': [], 'SAMPLE2': []},
                patients: {}
            };
            const sequencedSampleKeysByGene = {
                'MYC': ['SAMPLE2'],
                'CDK8': []
            };
            // when
            const info = alterationInfoForCaseAggregatedDataByOQLLine(
                true,
                {
                    cases: dataByCase,
                    oql: ['MYC', 'CDK8']
                },
                sequencedSampleKeysByGene,
                {}
            );
            // then
            assert.equal(info.sequenced, 1);
        });
    });

    describe('makeGeneticTrackWith', () => {
        const makeMinimal3Patient3GeneStoreProperties = () => ({
            samples: [],
            patients: [
                { 'patientId': 'TCGA-02-0001', 'studyId': 'gbm_tcga', 'uniquePatientKey': 'VENHQS0wMi0wMDAxOmdibV90Y2dh' },
                { 'patientId': 'TCGA-02-0003', 'studyId': 'gbm_tcga', 'uniquePatientKey': 'VENHQS0wMi0wMDAzOmdibV90Y2dh' },
                { 'patientId': 'TCGA-02-0006', 'studyId': 'gbm_tcga', 'uniquePatientKey': 'VENHQS0wMi0wMDA2OmdibV90Y2dh' }
            ],
            genePanelInformation: {
                samples: {},
                patients: {
                    'VENHQS0wMi0wMDAxOmdibV90Y2dh': {sequencedGenes: {}, wholeExomeSequenced: false},
                    'VENHQS0wMi0wMDAzOmdibV90Y2dh': {sequencedGenes: {}, wholeExomeSequenced: false},
                    'VENHQS0wMi0wMDA2OmdibV90Y2dh': {sequencedGenes: {}, wholeExomeSequenced: false}
                }
            },
            sequencedSampleKeysByGene: {},
            sequencedPatientKeysByGene: {'BRCA1': [], 'PTEN': [], 'TP53': []},
            expansionIndexMap: observable.map<number[]>(),
            expansionTracksByParent: {}
        });
        const makeMinimal3Patient3GeneCaseData = () => ({
            samples: {},
            patients: {
                'VENHQS0wMi0wMDAxOmdibV90Y2dh': [],
                'VENHQS0wMi0wMDAzOmdibV90Y2dh': [],
                'VENHQS0wMi0wMDA2OmdibV90Y2dh': []
            }
        });
        const MINIMAL_TRACK_KEY = 'GENETICTRACK_0';

        it('if queried for a plain gene, labels the track based on that query', () => {
            // given store properties for three patients and query data for
            // a single gene
            const storeProperties = makeMinimal3Patient3GeneStoreProperties();
            const queryData = {
                cases: makeMinimal3Patient3GeneCaseData(),
                oql: {
                    gene: 'TP53',
                    oql_line: 'TP53;',
                    parsed_oql_line: {gene: 'TP53', alterations: []},
                    data: []
                }
            };
            // when the track formatting function is called with this query
            const trackFunction = makeGeneticTrackWith({
                sampleMode: false,
                ...storeProperties
            });
            const track = trackFunction(queryData, MINIMAL_TRACK_KEY);
            // then it returns a track with the same label and OQL
            assert.equal(track.label, 'TP53');
            assert.equal(track.oql, 'TP53;');
        });

        it('if queried for a merged track without a label, labels the track based on the genes inside', () => {
            // given store properties for three patients and query data
            // for a two-gene merged track
            const storeProperties = makeMinimal3Patient3GeneStoreProperties();
            const queryData = {
                cases: makeMinimal3Patient3GeneCaseData(),
                oql: {list: [
                    {gene: 'BRCA1', oql_line: 'BRCA1;', parsed_oql_line: {gene: 'BRCA1', alterations: []}, data: []},
                    {gene: 'PTEN', oql_line: 'PTEN;', parsed_oql_line: {gene: 'PTEN', alterations: []}, data: []}
                ]}
            };
            // when the track formatting function is called with this query
            const trackFunction = makeGeneticTrackWith({
                sampleMode: false,
                ...storeProperties
            });
            const track = trackFunction(queryData, MINIMAL_TRACK_KEY);
            // then it returns a track with the genes' OQL and labels
            assert.equal(track.label, 'BRCA1 / PTEN');
            assert.equal(track.oql, '[BRCA1; PTEN;]');
        });

        it('if queried for a merged track with a label, uses that to label the track', () => {
            // given store properties for three patients and query data
            // for a two-gene merged track with a label
            const storeProperties = makeMinimal3Patient3GeneStoreProperties();
            const queryData = {
                cases: makeMinimal3Patient3GeneCaseData(),
                oql: {
                    list: [
                        {gene: 'BRCA1', oql_line: 'BRCA1;', parsed_oql_line: {gene: 'BRCA1', alterations: []}, data: []},
                        {gene: 'PTEN', oql_line: 'PTEN;', parsed_oql_line: {gene: 'PTEN', alterations: []}, data: []}
                    ],
                    label: 'HELLO'
                }
            };
            // when the track formatting function is called with this query
            const trackFunction = makeGeneticTrackWith({
                sampleMode: false,
                ...storeProperties
            });
            const track = trackFunction(queryData, MINIMAL_TRACK_KEY);
            // then it returns a track with that label and the genes' OQL
            assert.equal(track.label, 'HELLO');
            assert.equal(track.oql, '[BRCA1; PTEN;]');
        });

        it('returns an expandable track if queried for a merged track', () => {
            // given
            const storeProperties = makeMinimal3Patient3GeneStoreProperties();
            const queryData = {
                cases: makeMinimal3Patient3GeneCaseData(),
                oql: {
                    list: [
                        {gene: 'TTN', oql_line: 'TTN;', parsed_oql_line: {gene: 'TTN', alterations: []}, data: []}
                    ]
                }
            };
            // when
            const trackFunction = makeGeneticTrackWith({
                sampleMode: false,
                ...storeProperties
            });
            const track = trackFunction(queryData, MINIMAL_TRACK_KEY);
            // then
            assert.isFunction(track.expansionCallback);
        });

        it("makes the expansion callback for merged tracks list the track's subquery indexes in the expansion observable", () => {
            // given
            const storeProperties = makeMinimal3Patient3GeneStoreProperties();
            const queryData = {
                cases: makeMinimal3Patient3GeneCaseData(),
                oql: {
                    list: [
                        {gene: 'FOLR1', oql_line: 'FOLR1;', parsed_oql_line: {gene: 'FOLR1', alterations: []}, data: []},
                        {gene: 'FOLR2', oql_line: 'FOLR2;', parsed_oql_line: {gene: 'FOLR2', alterations: []}, data: []},
                        {gene: 'IZUMO1R', oql_line: 'IZUMO1R;', parsed_oql_line: {gene: 'IZUMO1R', alterations: []}, data: []}
                    ]
                }
            };
            // when
            const trackFunction = makeGeneticTrackWith({
                sampleMode: false,
                ...storeProperties,
            });
            const track = trackFunction(queryData, MINIMAL_TRACK_KEY);
            track.expansionCallback!();
            // then
            assert.includeMembers(
                storeProperties.expansionIndexMap.get(track.key)!.slice(),
                [0, 1, 2]
            );
        });

        it('passes expansion tracks along with the track if any are listed for its key', () => {
            // given
            const queryData = {
                cases: makeMinimal3Patient3GeneCaseData(),
                oql: {
                    list: [
                        {gene: 'RB1', oql_line: 'RB1;', parsed_oql_line: {gene: 'RB1', alterations: []}, data: []},
                        {gene: 'CDK1', oql_line: 'CDK1;', parsed_oql_line: {gene: 'CDK1', alterations: []}, data: []}
                    ]
                }
            };
            const trackKey = MINIMAL_TRACK_KEY;
            const expansionTracks = [
                {key: 'EXPANSIONTRACK_1', label: 'RB1', oql: 'RB1;', info: '100%', data: []},
                {key: 'EXPANSIONTRACK_2', label: 'CDK1', oql: 'CDK1;', info: '0%', data: []}
            ];
            const postExpandStoreProperties = {
                ...makeMinimal3Patient3GeneStoreProperties(),
                expansionTracksByParent: {[trackKey]: expansionTracks}
            };
            // when
            const trackFunction = makeGeneticTrackWith({
                sampleMode: false,
                ...postExpandStoreProperties,
            });
            const track = trackFunction(queryData, trackKey);
            //then
            assert.deepEqual(track.expansionTrackList, expansionTracks);
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