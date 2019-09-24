import { assert } from 'chai';
import { COLOR_GENEPANEL_ICON, genePanelIdToIconData, WHOLEGENOME_LABEL, sampleIdToIconData, COLOR_WHOLEGENOME_ICON } from './GenomicOverviewUtils';
import { CompleteProfileTypeSignature } from 'shared/lib/StoreUtils';

describe('GenomicOverviewUtils', () => {
    
    describe('genePanelIdToIconData()', () => {
        
        const expectedData = {
            A: {label: "P1", color: COLOR_GENEPANEL_ICON, genePanelId: 'A'},
            B: {label: "P2", color: COLOR_GENEPANEL_ICON, genePanelId: 'B'},
            C: {label: "P3", color: COLOR_GENEPANEL_ICON, genePanelId: 'C'},
        };

        it('generates icon data', () => {
            const genePanelIds = ["A", "B", "C"];
            assert.deepEqual(genePanelIdToIconData(genePanelIds), expectedData);
        });
        
        it('generates icon data independent of input order', () => {
            const genePanelIds = ["C", "B", "A"];
            assert.deepEqual(genePanelIdToIconData(genePanelIds), expectedData);
        });
        
        it('removes undefined entries', () => {
            const genePanelIds = ["A", "B", "C", undefined];
            assert.deepEqual(genePanelIdToIconData(genePanelIds), expectedData);
        });

        it('adds whole-genome icon data', () => {
            const genePanelIds = [CompleteProfileTypeSignature.WHOLE_EXOME_SEQ, CompleteProfileTypeSignature.WHOLE_GENOME_SEQ];
            
            const expectedData:any = {};
            expectedData[CompleteProfileTypeSignature.WHOLE_EXOME_SEQ] = {label: WHOLEGENOME_LABEL, color: COLOR_WHOLEGENOME_ICON, genePanelId: CompleteProfileTypeSignature.WHOLE_EXOME_SEQ};
            expectedData[CompleteProfileTypeSignature.WHOLE_GENOME_SEQ] = {label: WHOLEGENOME_LABEL, color: COLOR_WHOLEGENOME_ICON, genePanelId: CompleteProfileTypeSignature.WHOLE_GENOME_SEQ};
            
            assert.deepEqual(genePanelIdToIconData(genePanelIds), expectedData);
        });
        
    });
    
    describe('sampleIdToIconData()', () => {

        const iconLookUp = {
            panel1: {label: "P1", color: COLOR_GENEPANEL_ICON, genePanelId: 'pane1'},
            panel2: {label: "P2", color: COLOR_GENEPANEL_ICON, genePanelId: 'pane2'},
        };
        
        it('links icon data', () => {
            
            const sampleToGenePanelId = {
                sampleA: 'panel1',
                sampleB: 'panel2',
            } as {[sampleId:string]:string};

            const expectedData = {
                sampleA: {label: "P1", color: COLOR_GENEPANEL_ICON, genePanelId: "panel1"},
                sampleB: {label: "P2", color: COLOR_GENEPANEL_ICON, genePanelId: "panel2"},
            };

            assert.deepEqual(sampleIdToIconData(sampleToGenePanelId, iconLookUp), expectedData);
        });
        
        it('returns empty object when sampleToGenePanel data is undefined', () => {
            assert.deepEqual(sampleIdToIconData(undefined, iconLookUp), {});
        });
        
        it('links undefined genePanelId to whole-genome analysis icon', () => {
            const sampleToGenePanelId = {
                sampleA: undefined
            } as {[sampleId:string]:string|undefined};
            
            const expectedData = {
                sampleA: {label: WHOLEGENOME_LABEL, color: COLOR_WHOLEGENOME_ICON, genePanelId: undefined},
            };

            assert.deepEqual(sampleIdToIconData(sampleToGenePanelId, iconLookUp), expectedData);
        });

        it('links whole-genome genePanelIds to whole-genome analysis icon', () => {
            const sampleToGenePanelId = {
                sampleA: CompleteProfileTypeSignature.WHOLE_EXOME_SEQ,
                sampleB: CompleteProfileTypeSignature.WHOLE_GENOME_SEQ,
            } as {[sampleId:string]:string|undefined};
            
            const expectedData = {
                sampleA: {label: WHOLEGENOME_LABEL, color: COLOR_WHOLEGENOME_ICON, genePanelId: CompleteProfileTypeSignature.WHOLE_EXOME_SEQ},
                sampleB: {label: WHOLEGENOME_LABEL, color: COLOR_WHOLEGENOME_ICON, genePanelId: CompleteProfileTypeSignature.WHOLE_GENOME_SEQ},
            };

            assert.deepEqual(sampleIdToIconData(sampleToGenePanelId, iconLookUp), expectedData);
        });

    });
    
});