var goToUrlAndSetLocalStorage = require('../../shared/specUtils')
    .goToUrlAndSetLocalStorage;
var assertScreenShotMatch = require('../../shared/lib/testUtils')
    .assertScreenShotMatch;
var waitForOncoprint = require('../../shared/specUtils').waitForOncoprint;
    .selectReactSelectOption;
var setResultsPageSettingsMenuOpen = require('../../../shared/specUtils')
    .setResultsPageSettingsMenuOpen;
var setOncoprintMutationsMenuOpen = require('../../../shared/specUtils')
    .setOncoprintMutationsMenuOpen;

const CBIOPORTAL_URL = process.env.CBIOPORTAL_URL.replace(/\/$/, '');
const oncoprintTabUrlPerSample =
    CBIOPORTAL_URL +
    '/results/oncoprint?Action=Submit&RPPA_SCORE_THRESHOLD=2.0&Z_SCORE_THRESHOLD=2.0&cancer_study_list=study_es_0&case_set_id=study_es_0_sequenced&data_priority=0&gene_list=BRCA1&geneset_list=%20&genetic_profile_ids_PROFILE_COPY_NUMBER_ALTERATION=study_es_0_gistic&genetic_profile_ids_PROFILE_MUTATION_EXTENDED=study_es_0_mutations&profileFilter=0&show_samples=true&tab_index=tab_visualize';
const oncoprintTabUrlPerPatient =
    CBIOPORTAL_URL +
    '/results/oncoprint?Action=Submit&RPPA_SCORE_THRESHOLD=2.0&Z_SCORE_THRESHOLD=2.0&cancer_study_list=study_es_0&case_set_id=study_es_0_sequenced&data_priority=0&gene_list=BRCA1&geneset_list=%20&genetic_profile_ids_PROFILE_COPY_NUMBER_ALTERATION=study_es_0_gistic&genetic_profile_ids_PROFILE_MUTATION_EXTENDED=study_es_0_mutations&profileFilter=0&show_samples=false&tab_index=tab_visualize';

describe('LOH and zygosity feature', () => {
    
    describe('per sample', () => {
        beforeEach(() => {
            goToUrlAndSetLocalStorage(oncoprintTabUrlPerSample);
            waitForOncoprint(20000);
        });

        it('shows correct initial oncoprint view', () => {
            var res = browser.checkElement('[id=oncoprintDiv]');
            assertScreenShotMatch(res);
        });

        it('excludes LOH events from config menu', () => {
            setResultsPageSettingsMenuOpen(true);
            $('input[data-test=HideLoh]').click();
            var res = browser.checkElement('[id=oncoprintDiv]');
            setResultsPageSettingsMenuOpen(false);
            assertScreenShotMatch(res);
        });

        it('turns off coloring by LOH', () => {
            setOncoprintMutationsMenuOpen(true);
            $('input[data-test=ColorByLoh]').click();
            var res = browser.checkElement('[id=oncoprintDiv]');
            setOncoprintMutationsMenuOpen(false);
            assertScreenShotMatch(res);
        });

        it('turns off coloring by zygosity', () => {
            setOncoprintMutationsMenuOpen(true);
            $('input[data-test=ColorByZygosity]').click();
            var res = browser.checkElement('[id=oncoprintDiv]');
            setOncoprintMutationsMenuOpen(false);
            assertScreenShotMatch(res);
        });

        // TODO Pim: add sorting tests
    });
    
    describe('per patient', () => {
        beforeEach(() => {
            goToUrlAndSetLocalStorage(oncoprintTabUrlPerPatient);
            waitForOncoprint(20000);
        });

        // TODO Pim: add tests per patient
    });
});
