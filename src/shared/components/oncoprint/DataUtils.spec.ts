import { assert } from 'chai';
import {
    fillClinicalTrackDatum, fillGeneticTrackDatum, fillHeatmapTrackDatum,
    getOncoprintMutationType, makeGeneticTrackData, selectDisplayValue
} from "./DataUtils";
import {
    GeneticTrackDatum,
    IGeneHeatmapTrackDatum,
    IGenesetHeatmapTrackDatum
} from "shared/components/oncoprint/Oncoprint";
import {AlterationTypeConstants, AnnotatedExtendedAlteration} from "../../../pages/resultsView/ResultsViewPageStore";
import {
   ClinicalAttribute, GeneMolecularData, GenePanelData, Mutation, Sample
} from "../../api/generated/CBioPortalAPI";
import {SpecialAttribute} from "../../cache/ClinicalDataCache";
import {OncoprintClinicalAttribute} from "./ResultsViewOncoprint";
import {MutationSpectrum} from "../../api/generated/CBioPortalAPIInternal";

/* Type assertions are used throughout this file to force functions to accept
/* mocked parameters known to be sufficient. */
/* tslint:disable no-object-literal-type-assertion */

describe("DataUtils", ()=>{
   describe("getOncoprintMutationType", ()=>{
       it("correctly gets `promoter` type based on mutation.proteinChange", ()=>{
           assert.equal(getOncoprintMutationType({ proteinChange:"Promoter", mutationType:"asdjfpoai" } as Mutation), "promoter");
           assert.equal(getOncoprintMutationType({ proteinChange:"PROMOTER", mutationType:"asdfjii"} as Mutation), "promoter");
           assert.equal(getOncoprintMutationType({ proteinChange:"promoter", mutationType:"Asdfasl" } as Mutation), "promoter");
           assert.equal(getOncoprintMutationType({ proteinChange:"Promoter" } as Mutation), "promoter");
       });
   });
   describe("selectDisplayValue", ()=>{
       it("returns undefined if no values", ()=>{
           assert.equal(selectDisplayValue({}, {}), undefined);
       });
       it("returns the lone value if one value", ()=>{
           assert.equal(selectDisplayValue({"a":0}, {"a":0}), "a");
       });
       it("returns the lowest priority value if two values", ()=>{
           assert.equal(selectDisplayValue({"a":0, "b":0}, {"a":0, "b":1}), "a");
           assert.equal(selectDisplayValue({"a":0, "b":0}, {"a":1, "b":0}), "b");
       });
       it("returns the lowest priority value if several values", ()=>{
           assert.equal(selectDisplayValue({"a":0, "b":0, "c":5}, {"a":0, "b":1, "c":2}), "a");
           assert.equal(selectDisplayValue({"a":20, "b":0, "c":10}, {"a":2, "b":1, "c":0}), "c");
       });
       it("returns the lowest priority, highest count value if two values w same priority", ()=>{
           assert.equal(selectDisplayValue({"a":1, "b":0}, {"a":0, "b":0}), "a");
           assert.equal(selectDisplayValue({"a":0, "b":1}, {"a":0, "b":0}), "b");
       });
       it("returns the lowest priority, highest count value if several values w same priority", ()=>{
           assert.equal(selectDisplayValue({"a":1, "b":0, "c":5}, {"a":0, "b":0, "c":2}), "a");
           assert.equal(selectDisplayValue({"a":20, "b":0, "c":10}, {"a":0, "b":1, "c":0}), "a");
       });
   });

   describe("makeGeneticTrackData", () => {
      const makeMinimalGenePanelData = (patientKey: string) => ({
         uniquePatientKey: patientKey,
         uniqueSampleKey: `${patientKey}-SAMPLE1`,
         genePanelId: "GENEPANEL1",
      } as GenePanelData);
      const makeMinimalDifferentGenePanelData = (patientKey: string) => ({
         uniquePatientKey: patientKey,
         uniqueSampleKey: `${patientKey}-SAMPLE1`,
         genePanelId: "GENEPANEL2",
      } as GenePanelData);
      const makeMinimalWholeExomePanelData = (patientKey: string) => ({
         uniquePatientKey: patientKey,
         uniqueSampleKey: `${patientKey}-SAMPLE1`,
         wholeExomeSequenced: true
      } as GenePanelData);

      it('returns one cell for each listed case', () => {
         // given three patients and a whole-exome gene panel
         const patientArray = [
            {uniquePatientKey: 'PATIENT1', patientId: 'TCGA-02-0001', studyId: 'gbm_tcga'},
            {uniquePatientKey: 'PATIENT2', patientId: 'TCGA-02-0003', studyId: 'gbm_tcga'},
            {uniquePatientKey: 'PATIENT3', patientId: 'TCGA-02-0006', studyId: 'gbm_tcga'}
         ];
         const makeMinimalPatientGenePanel = (patientKey: string) => ({
            wholeExomeSequenced: true,
            sequencedGenes: {'PTEN': [makeMinimalWholeExomePanelData(patientKey)]}
         });
         const genePanelByCase = {
            samples: {},
            patients: {
               'PATIENT1': makeMinimalPatientGenePanel('PATIENT1'),
               'PATIENT2': makeMinimalPatientGenePanel('PATIENT2'),
               'PATIENT3': makeMinimalPatientGenePanel('PATIENT3'),
            }
         };
         // when called to make data for a gene that has zero alterations in
         // these patients
         const trackData = makeGeneticTrackData(
            {'PATIENT1': [], 'PATIENT2': [], 'PATIENT3': []},
            'PTEN',
            patientArray,
            genePanelByCase
         );
         // then it returns three cells of data, corresponding to first, second
         // and third patient respectively
         assert.lengthOf(trackData, 3);
         assert.equal(trackData[0].patient, 'TCGA-02-0001');
         assert.equal(trackData[1].patient, 'TCGA-02-0003');
         assert.equal(trackData[2].patient, 'TCGA-02-0006');
      });

      it('sets na if a single-gene cell is not covered by the seq panel', () => {
         // given a patient and a gene panel that doesn't mark all genes as
         // sequenced in that patient
         const patientArray = [{uniquePatientKey: 'PATIENT1', patientId: 'TCGA-02-0001', studyId: 'gbm_tcga'}];
         const genePanelByCase = {
            samples: {},
            patients: {'PATIENT1': {
               wholeExomeSequenced: false,
               sequencedGenes: {'PTEN': [makeMinimalGenePanelData('PATIENT1')]}
            }}
         };
         // when called to make a cell of data for a zero-alteration gene that
         // isn't covered by the panel
         const [trackDatum] = makeGeneticTrackData(
            {'PATIENT1': []},
            'TP53',
            patientArray,
            genePanelByCase
         );
         // then it sets the na field of the cell to true
         assert.isTrue(trackDatum.na);
      });

      it('sets na if none of the genes in a multi-gene cell is covered by the seq panel', () => {
         // given a patient and a gene panel that doesn't mark all genes as
         // sequenced in that patient
         const patientArray = [{uniquePatientKey: 'PATIENT1', patientId: 'TCGA-02-0001', studyId: 'gbm_tcga'}];
         const genePanelByCase = {
            samples: {},
            patients: {'PATIENT1': {
               wholeExomeSequenced: false,
               sequencedGenes: {'PTEN': [makeMinimalGenePanelData('PATIENT1')]}
            }}
         };
         // when called to make a cell of data for two zero-alteration genes
         // that aren't covered by the panel
         const [trackDatum] = makeGeneticTrackData(
            {'PATIENT1': []},
            ['TP53', 'BRCA1'],
            patientArray,
            genePanelByCase
         );
         // then it sets the na field of the cell to true
         assert.isTrue(trackDatum.na);
      });

      it('does not set na if a single-gene cell is covered by the seq panel', () => {
         // given a patient and a gene panel that marks a gene as sequenced in
         // that patient
         const patientArray = [{uniquePatientKey: 'PATIENT1', patientId: 'TCGA-02-0001', studyId: 'gbm_tcga'}];
         const genePanelByCase = {
            samples: {},
            patients: {'PATIENT1': {
               wholeExomeSequenced: false,
               sequencedGenes: {'PTEN': [makeMinimalGenePanelData('PATIENT1')]}
            }}
         };
         // when called to make a cell of data for that (zero-alteration) gene
         const [trackDatum] = makeGeneticTrackData(
            {'PATIENT1': []},
            'PTEN',
            patientArray,
            genePanelByCase
         );
         // then it makes the na field of that track evaluate to a falsy value
         assert.isNotOk(trackDatum.na);
      });

      it('does not set na if one of the genes in a multi-gene cell is covered by the seq panel', () => {
         // given a patient and a gene panel that marks a gene as sequenced in
         // that patient
         const patientArray = [{uniquePatientKey: 'PATIENT1', patientId: 'TCGA-02-0001', studyId: 'gbm_tcga'}];
         const genePanelByCase = {
            samples: {},
            patients: {'PATIENT1': {
               wholeExomeSequenced: false,
               sequencedGenes: {'PTEN': [makeMinimalGenePanelData('PATIENT1')]}
            }}
         };
         // when called to make a cell of data for that (zero-alteration) gene
         // in addition to another one
         const [trackDatum] = makeGeneticTrackData(
            {'PATIENT1': []},
            ['BRCA2', 'PTEN'],
            patientArray,
            genePanelByCase
         );
         // then it makes the na field of that track evaluate to a falsy value
         assert.isNotOk(trackDatum.na);
      });

      it('does not set na if a single-gene cell is covered by whole-exome seq', () => {
         // given a patient and a whole-exome gene panel that marks a gene as
         // sequenced in that patient
         const patientArray = [{uniquePatientKey: 'PATIENT1', patientId: 'TCGA-02-0001', studyId: 'gbm_tcga'}];
         const genePanelByCase = {
            samples: {},
            patients: {'PATIENT1': {
               wholeExomeSequenced: true,
               sequencedGenes: {'PTEN': [makeMinimalWholeExomePanelData('PATIENT1')]}
            }}
         };
         // when called to make a cell of data for that (zero-alteration) gene
         const [trackDatum] = makeGeneticTrackData(
            {'PATIENT1': []},
            'PTEN',
            patientArray,
            genePanelByCase
         );
         // then it makes the na field of that track evaluate to a falsy value
         assert.isNotOk(trackDatum.na);
      });

      it('sets na per cell if two single-gene cells have different seq panel coverage', () => {
         // given two patients and a gene panel that marks a gene as sequenced
         // in only one of them
         const patientArray = [
            {uniquePatientKey: 'PATIENT1', patientId: 'TCGA-02-0001', studyId: 'gbm_tcga'},
            {uniquePatientKey: 'PATIENT2', patientId: 'TCGA-02-0003', studyId: 'gbm_tcga'}
         ];
         const genePanelByCase = {
            samples: {},
            patients: {
               'PATIENT1': {
                  wholeExomeSequenced: false,
                  sequencedGenes: {'PTEN': [makeMinimalGenePanelData('PATIENT1')]}
               },
               'PATIENT2': {wholeExomeSequenced: false, sequencedGenes: {}}
            }
         };
         // when called to make data for that (zero-alteration) gene
         const trackData = makeGeneticTrackData(
            {'PATIENT1': [], 'PATIENT2': []},
            'PTEN',
            patientArray,
            genePanelByCase
         );
         // then it sets na only on the cell for the patient that wasn't covered
         assert.isNotOk(trackData[0].na);
         assert.isTrue(trackData[1].na);
      });

      it('sets whole-exome if a single-gene cell is covered by whole-exome seq', () => {
         // given a patient and a whole-exome gene panel that marks a gene as
         // sequenced in that patient
         const patientArray = [{uniquePatientKey: 'PATIENT1', patientId: 'TCGA-02-0001', studyId: 'gbm_tcga'}];
         const genePanelByCase = {
            samples: {},
            patients: {'PATIENT1': {
               wholeExomeSequenced: true,
               sequencedGenes: {'PTEN': [makeMinimalWholeExomePanelData('PATIENT1')]}
            }}
         };
         // when called to make a cell of data for that (zero-alteration) gene
         const [trackDatum] = makeGeneticTrackData(
            {'PATIENT1': []},
            'PTEN',
            patientArray,
            genePanelByCase
         );
         // then it sets the wholeExomeSequenced field of that track
         assert.isTrue(trackDatum.wholeExomeSequenced);
      });

      it('does not set whole-exome if a single-gene cell is covered by a non-whole-exome seq panel', () => {
         // given a patient and a non-whole-exome gene panel that marks a gene
         // as sequenced in that patient
         const patientArray = [{uniquePatientKey: 'PATIENT1', patientId: 'TCGA-02-0001', studyId: 'gbm_tcga'}];
         const genePanelByCase = {
            samples: {},
            patients: {'PATIENT1': {
               wholeExomeSequenced: false,
               sequencedGenes: {'PTEN': [makeMinimalGenePanelData('PATIENT1')]}
            }}
         };
         // when called to make a cell of data for that (zero-alteration) gene
         const [trackDatum] = makeGeneticTrackData(
            {'PATIENT1': []},
            'PTEN',
            patientArray,
            genePanelByCase
         );
         // then it makes the wholeExomeSequenced field of that track evaluate
         // to a falsy value
         assert.isNotOk(trackDatum.wholeExomeSequenced);
      });

      it('does not set whole-exome if a single-gene cell is not covered by a seq panel', () => {
         // given a patient and a gene panel that doesn't mark all genes as
         // sequenced in that patient
         const patientArray = [{uniquePatientKey: 'PATIENT1', patientId: 'TCGA-02-0001', studyId: 'gbm_tcga'}];
         const genePanelByCase = {
            samples: {},
            patients: {'PATIENT1': {
               wholeExomeSequenced: false,
               sequencedGenes: {'PTEN': [makeMinimalGenePanelData('PATIENT1')]}
            }}
         };
         // when called to make a cell of data for a zero-alteration gene that
         // isn't covered by the panel
         const [trackDatum] = makeGeneticTrackData(
            {'PATIENT1': []},
            'TP53',
            patientArray,
            genePanelByCase
         );
         // then it makes the wholeExomeSequenced field of that track evaluate
         // to a falsy value
         assert.isNotOk(trackDatum.wholeExomeSequenced);
      });

      it('passes the gene panel data for a single-gene cell along in the coverage property', () => {
         // given a patient and a gene panel that marks a gene as sequenced in
         // that patient
         const patientArray = [{uniquePatientKey: 'PATIENT1', patientId: 'TCGA-02-0001', studyId: 'gbm_tcga'}];
         const genePanelByCase = {
            samples: {},
            patients: {'PATIENT1': {
               wholeExomeSequenced: false,
               // makeMinimalGenePanelData returns an object with
               // genePanelId: 'GENEPANEL1'
               sequencedGenes: {'PTEN': [makeMinimalGenePanelData('PATIENT1')]}
            }}
         };
         // when called to make a cell of data for that (zero-alteration) gene
         const [trackDatum] = makeGeneticTrackData(
            {'PATIENT1': []},
            'PTEN',
            patientArray,
            genePanelByCase
         );
         // then the coverage attribute for the cell lists the gene panel entry
         // that covers this gene in this patient
         assert.deepEqual(
            (trackDatum.coverage as GenePanelData[])[0],
            makeMinimalGenePanelData('PATIENT1')
         );
      });

      it('passes the gene panel data for genes displayed in the cell along in the coverage property', () => {
         // given a patient, a gene panel that marks two genes as sequenced in
         // that patient, and a different gene panel that marks one
         // of them as sequenced in that patient
         const patientArray = [{uniquePatientKey: 'PATIENT1', patientId: 'TCGA-02-0001', studyId: 'gbm_tcga'}];
         const genePanelByCase = {
            samples: {},
            patients: {'PATIENT1': {
               wholeExomeSequenced: false,
               sequencedGenes: {
                  'PTEN': [makeMinimalGenePanelData('PATIENT1')],
                  'BRCA2': [
                     makeMinimalGenePanelData('PATIENT1'),
                     makeMinimalDifferentGenePanelData('PATIENT1')
                  ]
               }
            }}
         };
         // when called to make a cell of data for the two (zero-alteration)
         // genes
         const [trackDatum] = makeGeneticTrackData(
            {'PATIENT1': []},
            ['BRCA2', 'PTEN'],
            patientArray,
            genePanelByCase
         );
         // then the coverage attribute for the cell lists all the gene panel
         // entries that cover these two genes in this patient
         assert.deepEqual(
            trackDatum.coverage as GenePanelData[],
            [
               makeMinimalGenePanelData('PATIENT1'),
               makeMinimalDifferentGenePanelData('PATIENT1'),
               makeMinimalGenePanelData('PATIENT1')
            ]
         );
      });

   });

   describe("fillGeneticTrackDatum", ()=>{
       it("fills a datum w no data correctly", ()=>{
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", []),
               {
                   gene:"gene",
                   data: [],
                   disp_cna: undefined,
                   disp_mrna: undefined,
                   disp_prot: undefined,
                   disp_mut: undefined
               } as any);
       });
       it("fills a datum w one mutation data correctly", ()=>{
           let data = [{
               mutationType: "missense",
               putativeDriver: true,
               molecularProfileAlterationType: AlterationTypeConstants.MUTATION_EXTENDED
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: undefined,
                   disp_mrna: undefined,
                   disp_prot: undefined,
                   disp_mut: "missense_rec"
               } as any, "missense driver");

           data = [{
               mutationType: "in_frame_del",
               putativeDriver: false,
               molecularProfileAlterationType: AlterationTypeConstants.MUTATION_EXTENDED
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: undefined,
                   disp_mrna: undefined,
                   disp_prot: undefined,
                   disp_mut: "inframe"
               } as any, "inframe non-driver");

           data = [{
               mutationType: "truncating",
               putativeDriver: false,
               molecularProfileAlterationType: AlterationTypeConstants.MUTATION_EXTENDED
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: undefined,
                   disp_mrna: undefined,
                   disp_prot: undefined,
                   disp_mut: "trunc"
               } as any, "truncating non-driver");

           data = [{
               mutationType: "fusion",
               putativeDriver: false,
               molecularProfileAlterationType: AlterationTypeConstants.MUTATION_EXTENDED
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: undefined,
                   disp_mrna: undefined,
                   disp_prot: undefined,
                   disp_mut: undefined,
                   disp_fusion: true
               } as any, "fusion non-driver");
       });
       it("fills a datum w one cna data correctly", ()=>{
           let data = [{
               value: "2",
               molecularProfileAlterationType: AlterationTypeConstants.COPY_NUMBER_ALTERATION
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: "amp",
                   disp_mrna: undefined,
                   disp_prot: undefined,
                   disp_mut: undefined
               } as any, "amplification");

           data = [{
               value: "1",
               molecularProfileAlterationType: AlterationTypeConstants.COPY_NUMBER_ALTERATION
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: "gain",
                   disp_mrna: undefined,
                   disp_prot: undefined,
                   disp_mut: undefined
               } as any, "gain");

           data = [{
               value: "-1",
               molecularProfileAlterationType: AlterationTypeConstants.COPY_NUMBER_ALTERATION
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: "hetloss",
                   disp_mrna: undefined,
                   disp_prot: undefined,
                   disp_mut: undefined
               } as any, "hetloss");

           data = [{
               value: "-2",
               molecularProfileAlterationType: AlterationTypeConstants.COPY_NUMBER_ALTERATION
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: "homdel",
                   disp_mrna: undefined,
                   disp_prot: undefined,
                   disp_mut: undefined
               } as any, "homdel");

           data = [{
               value: "0",
               molecularProfileAlterationType: AlterationTypeConstants.COPY_NUMBER_ALTERATION
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: undefined,
                   disp_mrna: undefined,
                   disp_prot: undefined,
                   disp_mut: undefined
               } as any, "diploid");
       });
       it("fills a datum w one mrna data correctly", ()=>{
           let data = [{
               alterationSubType:"up",
               molecularProfileAlterationType: AlterationTypeConstants.MRNA_EXPRESSION
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: undefined,
                   disp_mrna: "up",
                   disp_prot: undefined,
                   disp_mut: undefined
               } as any, "up");

           data = [{
               alterationSubType:"down",
               molecularProfileAlterationType: AlterationTypeConstants.MRNA_EXPRESSION
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: undefined,
                   disp_mrna: "down",
                   disp_prot: undefined,
                   disp_mut: undefined
               } as any, "down");
       });
       it("fills a datum w one protein data correctly", ()=>{
           let data = [{
               alterationSubType:"up",
               molecularProfileAlterationType: AlterationTypeConstants.PROTEIN_LEVEL
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: undefined,
                   disp_mrna: undefined,
                   disp_prot: "up",
                   disp_mut: undefined
               } as any, "up");

           data = [{
               alterationSubType:"down",
               molecularProfileAlterationType: AlterationTypeConstants.PROTEIN_LEVEL
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: undefined,
                   disp_mrna: undefined,
                   disp_prot: "down",
                   disp_mut: undefined
               } as any, "down");
       });
       it("fills a datum w two mutation data w correct priority", ()=>{
           let data = [{
               mutationType: "missense",
               putativeDriver: true,
               molecularProfileAlterationType: AlterationTypeConstants.MUTATION_EXTENDED
           } as AnnotatedExtendedAlteration,{
               mutationType: "truncating",
               putativeDriver: true,
               molecularProfileAlterationType: AlterationTypeConstants.MUTATION_EXTENDED
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: undefined,
                   disp_mrna: undefined,
                   disp_prot: undefined,
                   disp_mut: "trunc_rec"
               } as any, "truncating driver beats missense driver");

           data = [{
               mutationType: "missense",
               putativeDriver: true,
               molecularProfileAlterationType: AlterationTypeConstants.MUTATION_EXTENDED
           } as AnnotatedExtendedAlteration,{
               mutationType: "truncating",
               putativeDriver: false,
               molecularProfileAlterationType: AlterationTypeConstants.MUTATION_EXTENDED
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: undefined,
                   disp_mrna: undefined,
                   disp_prot: undefined,
                   disp_mut: "missense_rec"
               } as any, "missense driver beats truncating non-driver");

           data = [{
               mutationType: "missense",
               putativeDriver: false,
               molecularProfileAlterationType: AlterationTypeConstants.MUTATION_EXTENDED
           } as AnnotatedExtendedAlteration,{
               mutationType: "truncating",
               putativeDriver: false,
               molecularProfileAlterationType: AlterationTypeConstants.MUTATION_EXTENDED
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: undefined,
                   disp_mrna: undefined,
                   disp_prot: undefined,
                   disp_mut: "trunc"
               } as any, "truncating non-driver beats missense non-driver");
       });
       it("fills a datum w multiple cna data w correct priority", ()=>{
           let data = [{
               value: "2",
               molecularProfileAlterationType: AlterationTypeConstants.COPY_NUMBER_ALTERATION
           } as AnnotatedExtendedAlteration,{
               value: "1",
               molecularProfileAlterationType: AlterationTypeConstants.COPY_NUMBER_ALTERATION
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: "amp",
                   disp_mrna: undefined,
                   disp_prot: undefined,
                   disp_mut: undefined
               } as any, "amplification beats gain");

           data = [{
               value: "-2",
               molecularProfileAlterationType: AlterationTypeConstants.COPY_NUMBER_ALTERATION
           } as AnnotatedExtendedAlteration,{
               value: "0",
               molecularProfileAlterationType: AlterationTypeConstants.COPY_NUMBER_ALTERATION
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: "homdel",
                   disp_mrna: undefined,
                   disp_prot: undefined,
                   disp_mut: undefined
               } as any, "homdel beats diploid");

           data = [{
               value: "-2",
               molecularProfileAlterationType: AlterationTypeConstants.COPY_NUMBER_ALTERATION
           } as AnnotatedExtendedAlteration,{
               value: "-2",
               molecularProfileAlterationType: AlterationTypeConstants.COPY_NUMBER_ALTERATION
           } as AnnotatedExtendedAlteration, {
               value: "2",
               molecularProfileAlterationType: AlterationTypeConstants.COPY_NUMBER_ALTERATION
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: "homdel",
                   disp_mrna: undefined,
                   disp_prot: undefined,
                   disp_mut: undefined
               } as any, "two homdels beats one amp");

           data = [{
               value: "-2",
               molecularProfileAlterationType: AlterationTypeConstants.COPY_NUMBER_ALTERATION
           } as AnnotatedExtendedAlteration,{
               value: "2",
               molecularProfileAlterationType: AlterationTypeConstants.COPY_NUMBER_ALTERATION
           } as AnnotatedExtendedAlteration, {
               value: "2",
               molecularProfileAlterationType: AlterationTypeConstants.COPY_NUMBER_ALTERATION
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: "amp",
                   disp_mrna: undefined,
                   disp_prot: undefined,
                   disp_mut: undefined
               } as any, "two amps beats one homdel");
       });
       it("fills a datum w multiple mrna data w correct priority", ()=>{
           let data = [{
               alterationSubType:"up",
               molecularProfileAlterationType: AlterationTypeConstants.MRNA_EXPRESSION
           } as AnnotatedExtendedAlteration, {
               alterationSubType:"down",
               molecularProfileAlterationType: AlterationTypeConstants.MRNA_EXPRESSION
           } as AnnotatedExtendedAlteration, {
               alterationSubType:"down",
               molecularProfileAlterationType: AlterationTypeConstants.MRNA_EXPRESSION
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: undefined,
                   disp_mrna: "down",
                   disp_prot: undefined,
                   disp_mut: undefined
               } as any, "two downs beats one up");

           data = [{
               alterationSubType:"up",
               molecularProfileAlterationType: AlterationTypeConstants.MRNA_EXPRESSION
           } as AnnotatedExtendedAlteration, {
               alterationSubType:"up",
               molecularProfileAlterationType: AlterationTypeConstants.MRNA_EXPRESSION
           } as AnnotatedExtendedAlteration, {
               alterationSubType:"down",
               molecularProfileAlterationType: AlterationTypeConstants.MRNA_EXPRESSION
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: undefined,
                   disp_mrna: "up",
                   disp_prot: undefined,
                   disp_mut: undefined
               } as any, "two ups beats one down");
       });
       it("fills a datum w multiple protein data w correct priority", ()=>{
           let data = [{
               alterationSubType:"up",
               molecularProfileAlterationType: AlterationTypeConstants.PROTEIN_LEVEL
           } as AnnotatedExtendedAlteration, {
               alterationSubType:"down",
               molecularProfileAlterationType: AlterationTypeConstants.PROTEIN_LEVEL
           } as AnnotatedExtendedAlteration, {
               alterationSubType:"down",
               molecularProfileAlterationType: AlterationTypeConstants.PROTEIN_LEVEL
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: undefined,
                   disp_mrna: undefined,
                   disp_prot: "down",
                   disp_mut: undefined
               } as any, "two downs beats one up");

           data = [{
               alterationSubType:"up",
               molecularProfileAlterationType: AlterationTypeConstants.PROTEIN_LEVEL
           } as AnnotatedExtendedAlteration, {
               alterationSubType:"up",
               molecularProfileAlterationType: AlterationTypeConstants.PROTEIN_LEVEL
           } as AnnotatedExtendedAlteration, {
               alterationSubType:"down",
               molecularProfileAlterationType: AlterationTypeConstants.PROTEIN_LEVEL
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: undefined,
                   disp_mrna: undefined,
                   disp_prot: "up",
                   disp_mut: undefined
               } as any, "two ups beats one down");
       });
       it("fills a datum w several data of different types correctly", ()=>{
           let data = [{
               alterationSubType:"up",
               molecularProfileAlterationType: AlterationTypeConstants.PROTEIN_LEVEL
           } as AnnotatedExtendedAlteration, {
               alterationSubType:"down",
               molecularProfileAlterationType: AlterationTypeConstants.PROTEIN_LEVEL
           } as AnnotatedExtendedAlteration, {
               alterationSubType:"down",
               molecularProfileAlterationType: AlterationTypeConstants.PROTEIN_LEVEL
           } as AnnotatedExtendedAlteration, {
               alterationSubType:"up",
               molecularProfileAlterationType: AlterationTypeConstants.MRNA_EXPRESSION
           } as AnnotatedExtendedAlteration, {
               alterationSubType:"up",
               molecularProfileAlterationType: AlterationTypeConstants.MRNA_EXPRESSION
           } as AnnotatedExtendedAlteration, {
               alterationSubType:"down",
               molecularProfileAlterationType: AlterationTypeConstants.MRNA_EXPRESSION
           } as AnnotatedExtendedAlteration, {
               value: "-2",
               molecularProfileAlterationType: AlterationTypeConstants.COPY_NUMBER_ALTERATION
           } as AnnotatedExtendedAlteration,{
               value: "-2",
               molecularProfileAlterationType: AlterationTypeConstants.COPY_NUMBER_ALTERATION
           } as AnnotatedExtendedAlteration, {
               value: "2",
               molecularProfileAlterationType: AlterationTypeConstants.COPY_NUMBER_ALTERATION
           } as AnnotatedExtendedAlteration,{
               mutationType: "missense",
               putativeDriver: true,
               molecularProfileAlterationType: AlterationTypeConstants.MUTATION_EXTENDED
           } as AnnotatedExtendedAlteration,{
               mutationType: "truncating",
               putativeDriver: true,
               molecularProfileAlterationType: AlterationTypeConstants.MUTATION_EXTENDED
           } as AnnotatedExtendedAlteration];
           assert.deepEqual(
               fillGeneticTrackDatum({}, "gene", data),
               {
                   gene:"gene",
                   data: data,
                   disp_cna: "homdel",
                   disp_mrna: "up",
                   disp_prot: "down",
                   disp_mut: "trunc_rec"
               } as any);
       });
   });

   describe("fillHeatmapTrackDatum", ()=>{
       it("sets na true if no data", ()=>{
           assert.isTrue(
               fillHeatmapTrackDatum<IGeneHeatmapTrackDatum, "hugo_gene_symbol">(
                   {}, "hugo_gene_symbol", "", {} as Sample
               ).na
           );
       });
       it("sets data for sample", ()=>{
           const data:any[] = [
               {value:3}
           ];
           assert.deepEqual(
               fillHeatmapTrackDatum<IGeneHeatmapTrackDatum, "hugo_gene_symbol">(
                   {},
                   "hugo_gene_symbol",
                   "gene",
                   {sampleId:"sample", studyId:"study"} as Sample,
                   data
               ),
               {hugo_gene_symbol:"gene", study:"study", profile_data:3}
           );
       });
       it("throws exception if more than one data given for sample",()=>{
           const data:any[] = [
               {value:3},
               {value:2}
           ];
           try {
               fillHeatmapTrackDatum<IGeneHeatmapTrackDatum, "hugo_gene_symbol">(
                   {},
                   "hugo_gene_symbol",
                   "gene",
                   {sampleId:"sample", studyId:"study"} as Sample,
                   data
               );
               assert(false);
           } catch(e) {
               // Succeed if an exception occurred before asserting false
           }
       });
       it("sets data for patient, if multiple then maximum in abs value", ()=>{
           let data:any[] = [
               {value:3},
               {value:2}
           ];
           assert.deepEqual(
               fillHeatmapTrackDatum<IGeneHeatmapTrackDatum, "hugo_gene_symbol">(
                   {},
                   "hugo_gene_symbol",
                   "gene",
                   {patientId:"patient", studyId:"study"} as Sample,
                   data
               ),
               {hugo_gene_symbol:"gene", study:"study", profile_data:3}
           );

           data = [
               {value:2}
           ];
           assert.deepEqual(
               fillHeatmapTrackDatum<IGeneHeatmapTrackDatum, "hugo_gene_symbol">(
                   {},
                   "hugo_gene_symbol",
                   "gene",
                   {patientId:"patient", studyId:"study"} as Sample,
                   data
               ),
               {hugo_gene_symbol:"gene", study:"study", profile_data:2}
           );

           data = [
               {value:2},
               {value:3},
               {value:4}
           ];
           assert.deepEqual(
               fillHeatmapTrackDatum<IGeneHeatmapTrackDatum, "hugo_gene_symbol">(
                   {},
                   "hugo_gene_symbol",
                   "gene",
                   {patientId:"patient", studyId:"study"} as Sample,
                   data
               ),
               {hugo_gene_symbol:"gene", study:"study", profile_data:4}
           );

           data = [
               {value:-10},
               {value:3},
               {value:4}
           ];
           assert.deepEqual(
               fillHeatmapTrackDatum<IGeneHeatmapTrackDatum, "hugo_gene_symbol">(
                   {},
                   "hugo_gene_symbol",
                   "gene",
                   {patientId:"patient", studyId:"study"} as Sample,
                   data
               ),
               {hugo_gene_symbol:"gene", study:"study", profile_data:-10}
           );
       });
       it("fills data for a gene set if that's requested", ()=>{
           const partialTrackDatum = {};
           fillHeatmapTrackDatum<IGenesetHeatmapTrackDatum, "geneset_id">(
               partialTrackDatum,
               "geneset_id",
               "MY_FAVORITE_GENE_SET-3",
               {sampleId:"sample", studyId:"study"} as Sample,
               [{value: "7"}]
           );
           assert.deepEqual(
               partialTrackDatum,
               {geneset_id:"MY_FAVORITE_GENE_SET-3", study:"study", profile_data:7}
           );
       });
   });

   describe("fillClinicalTrackDatum", ()=>{
        it("creates datum correctly when no data given", ()=>{
            assert.deepEqual(
                fillClinicalTrackDatum(
                    {},
                    {clinicalAttributeId:"clinicalAttribute"} as ClinicalAttribute,
                    {sampleId:"sample", studyId:"study"} as Sample
                ),
                {
                    attr_id: "clinicalAttribute",
                    study_id:"study",
                    attr_val_counts: {},
                    na: true
                }, "NA in general"
            );

            assert.deepEqual(
                fillClinicalTrackDatum(
                    {},
                    {clinicalAttributeId:SpecialAttribute.MutationCount} as any,
                    {sampleId:"sample", studyId:"study"} as Sample
                ),
                {
                    attr_id: SpecialAttribute.MutationCount,
                    study_id:"study",
                    attr_val_counts: {},
                    attr_val: 0
                }, "0 for Mutation Count"
            );
        });
        it("creates data correctly for number data",()=>{
            assert.deepEqual(
                fillClinicalTrackDatum(
                    {},
                    {clinicalAttributeId:"clinicalAttribute", datatype:"number"} as any,
                    {sampleId:"sample", studyId:"study"} as Sample,
                    [{value:3}] as any[]
                ),
                {
                    attr_id: "clinicalAttribute",
                    study_id: "study",
                    attr_val_counts:{3:1},
                    attr_val: 3
                }
            );

            assert.deepEqual(
                fillClinicalTrackDatum(
                    {},
                    {clinicalAttributeId:"clinicalAttribute", datatype:"number"} as any,
                    {sampleId:"sample", studyId:"study"} as Sample,
                    [{value:"abc"}] as any[]
                ),
                {
                    attr_id: "clinicalAttribute",
                    study_id: "study",
                    attr_val_counts:{},
                    na: true
                }
            );

            assert.deepEqual(
                fillClinicalTrackDatum(
                    {},
                    {clinicalAttributeId:"clinicalAttribute", datatype:"number"} as any,
                    {sampleId:"sample", studyId:"study"} as Sample,
                    [{value:3}, {value:2}] as any[]
                ),
                {
                    attr_id: "clinicalAttribute",
                    study_id: "study",
                    attr_val_counts:{2.5:1},
                    attr_val: 2.5
                }
            );

            assert.deepEqual(
                fillClinicalTrackDatum(
                    {},
                    {clinicalAttributeId:"clinicalAttribute", datatype:"number"} as any,
                    {sampleId:"sample", studyId:"study"} as Sample,
                    [{mutationCount:3}] as any[]
                ),
                {
                    attr_id: "clinicalAttribute",
                    study_id: "study",
                    attr_val_counts:{3:1},
                    attr_val: 3
                }
            );

            assert.deepEqual(
                fillClinicalTrackDatum(
                    {},
                    {clinicalAttributeId:"clinicalAttribute", datatype:"number"} as any,
                    {sampleId:"sample", studyId:"study"} as Sample,
                    [{mutationCount:3}, {mutationCount:2}] as any[]
                ),
                {
                    attr_id: "clinicalAttribute",
                    study_id: "study",
                    attr_val_counts:{2.5:1},
                    attr_val: 2.5
                }
            );
        });
        it("creates data correctly for string data",()=>{
            assert.deepEqual(
                fillClinicalTrackDatum(
                    {},
                    {clinicalAttributeId:"clinicalAttribute", datatype:"string"} as any,
                    {sampleId:"sample", studyId:"study"} as Sample,
                    [{value:"a"}, {value:"a"}] as any[]
                ),
                {
                    attr_id: "clinicalAttribute",
                    study_id: "study",
                    attr_val_counts:{"a":2},
                    attr_val: "a"
                }
            );

            assert.deepEqual(
                fillClinicalTrackDatum(
                    {},
                    {clinicalAttributeId:"clinicalAttribute", datatype:"string"} as any,
                    {sampleId:"sample", studyId:"study"} as Sample,
                    [{value:"a"}, {value:"b"}] as any[]
                ),
                {
                    attr_id: "clinicalAttribute",
                    study_id: "study",
                    attr_val_counts:{"a":1, "b":1},
                    attr_val: "Mixed"
                }
            );

            assert.deepEqual(
                fillClinicalTrackDatum(
                    {},
                    {clinicalAttributeId:"clinicalAttribute", datatype:"string"} as any,
                    {sampleId:"sample", studyId:"study"} as Sample,
                    [{value:"a"}, {value:"b"}, {value:"b"}] as any[]
                ),
                {
                    attr_id: "clinicalAttribute",
                    study_id: "study",
                    attr_val_counts:{"a":1, "b":2},
                    attr_val: "Mixed"
                }
            );
        });
        it("creates data correctly for mutation spectrum data",()=>{
            assert.deepEqual(
                fillClinicalTrackDatum(
                    {},
                    {clinicalAttributeId:SpecialAttribute.MutationSpectrum} as any,
                    {sampleId:"sample", studyId:"study"} as Sample,
                    [] as MutationSpectrum[]
                ),
                {
                    attr_id: SpecialAttribute.MutationSpectrum,
                    study_id: "study",
                    attr_val_counts:{},
                    na:true
                },
                "NA if no data given"
            );
            assert.deepEqual(
                fillClinicalTrackDatum(
                    {},
                    {clinicalAttributeId:SpecialAttribute.MutationSpectrum, datatype:""} as any,
                    {sampleId:"sample", studyId:"study"} as Sample,
                    [{CtoA:0, CtoG:0, CtoT:0, TtoA:0, TtoC:0, TtoG:0}] as MutationSpectrum[]
                ),
                {
                    attr_id: SpecialAttribute.MutationSpectrum,
                    study_id: "study",
                    attr_val_counts:{"C>A":0, "C>G":0, "C>T":0, "T>A":0, "T>C":0,"T>G":0},
                    attr_val: {"C>A":0, "C>G":0, "C>T":0, "T>A":0, "T>C":0,"T>G":0},
                    na:true
                }, "NA if no mutations"
            );
            assert.deepEqual(
                fillClinicalTrackDatum(
                    {},
                    {clinicalAttributeId:SpecialAttribute.MutationSpectrum, datatype:""} as any,
                    {sampleId:"sample", studyId:"study"} as Sample,
                    [{CtoA:1, CtoG:0, CtoT:0, TtoA:0, TtoC:0, TtoG:0},
                        {CtoA:0, CtoG:2, CtoT:0, TtoA:0, TtoC:0, TtoG:0},
                        {CtoA:0, CtoG:0, CtoT:3, TtoA:0, TtoC:0, TtoG:0},
                        {CtoA:0, CtoG:0, CtoT:0, TtoA:0, TtoC:6, TtoG:4}] as MutationSpectrum[]
                ),
                {
                    attr_id: SpecialAttribute.MutationSpectrum,
                    study_id: "study",
                    attr_val_counts:{"C>A":1,"C>G":2,"C>T":3,"T>A":0,"T>C":6,"T>G":4},
                    attr_val: {"C>A":1,"C>G":2,"C>T":3,"T>A":0,"T>C":6,"T>G":4}
                }, "sum"
            );
        });
   });
});