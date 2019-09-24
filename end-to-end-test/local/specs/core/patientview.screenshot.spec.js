var goToUrlAndSetLocalStorage = require('../../../shared/specUtils').goToUrlAndSetLocalStorage;
var waitForPatientView = require('../../../shared/specUtils').waitForPatientView;

var _ = require('lodash');

const CBIOPORTAL_URL = process.env.CBIOPORTAL_URL.replace(/\/$/, "");
const patienViewUrl = CBIOPORTAL_URL+'/patient?studyId=teststudy_genepanels&caseId=patientA';

describe('patient view page', function() {

    describe('gene panel icons', () => {

        const iconIndexGenePanelSample = 2;
        const iconIndexWholeGenomeSample = 3;
        
        beforeEach(()=>{
            goToUrlAndSetLocalStorage(patienViewUrl);
            waitForPatientView();
        });

        it('shows gene panel icons behind mutation and CNA genomic tracks',() => {
            var res = browser.checkElement('div.genomicOverviewTracksContainer');
            assertScreenShotMatch(res);
        });

        it('shows mouse-over tooltip with gene panel id', () => {
            browser.moveTo($$('[data-test=gene-panel-icon-text]')[iconIndexGenePanelSample]);
            var res = browser.checkElement('div.genomicOverviewTracksContainer');
            assertScreenShotMatch(res);
        });

        it('shows mouse-over tooltip with N/A for whole-genome analyzed sample', () => {
            browser.moveTo($$('[data-test=gene-panel-icon-text]')[iconIndexWholeGenomeSample]);
            var res = browser.checkElement('div.genomicOverviewTracksContainer');
            assertScreenShotMatch(res);
        });

    });

});
