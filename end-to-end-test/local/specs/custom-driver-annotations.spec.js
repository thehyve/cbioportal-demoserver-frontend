var assert = require('assert');
var goToUrlAndSetLocalStorage = require('../../shared/specUtils')
    .goToUrlAndSetLocalStorage;
var waitForOncoprint = require('../../shared/specUtils').waitForOncoprint;
var reactSelectOption = require('../../shared/specUtils').reactSelectOption;
var getReactSelectOptions = require('../../shared/specUtils')
    .getReactSelectOptions;
var selectReactSelectOption = require('../../shared/specUtils')
    .selectReactSelectOption;
var useExternalFrontend = require('../../shared/specUtils').useExternalFrontend;
var setSettingsMenuOpen = require('../../shared/specUtils').setSettingsMenuOpen;

const CBIOPORTAL_URL = process.env.CBIOPORTAL_URL.replace(/\/$/, '');
const oncoprintTabUrl =
    CBIOPORTAL_URL +
    '/results/oncoprint?Action=Submit&RPPA_SCORE_THRESHOLD=2.0&Z_SCORE_THRESHOLD=2.0&cancer_study_list=study_es_0&case_set_id=study_es_0_all&data_priority=0&gene_list=ABLIM1%250ATMEM247&geneset_list=%20&genetic_profile_ids_PROFILE_COPY_NUMBER_ALTERATION=study_es_0_gistic&genetic_profile_ids_PROFILE_MUTATION_EXTENDED=study_es_0_mutations&profileFilter=0&tab_index=tab_visualize';

const oncoprintTabUrlCna =
    CBIOPORTAL_URL +
    '/results/oncoprint?Action=Submit&RPPA_SCORE_THRESHOLD=2.0&Z_SCORE_THRESHOLD=2.0&cancer_study_list=study_es_0&case_set_id=study_es_0_cnaseq&data_priority=0&gene_list=ACAP3%2520AGRN&geneset_list=%20&genetic_profile_ids_PROFILE_COPY_NUMBER_ALTERATION=study_es_0_gistic&genetic_profile_ids_PROFILE_MUTATION_EXTENDED=study_es_0_mutations&profileFilter=0&tab_index=tab_visualize&show_samples=true';

const studyViewUrlEs_0 = CBIOPORTAL_URL + '/study/summary?id=study_es_0';

const studyViewUrlGenPanels =
    CBIOPORTAL_URL + '/study/summary?id=teststudy_genepanels';

describe('custom driver annotations feature', function() {
    if (useExternalFrontend) {
        describe('oncoprint tab - mutations', () => {
            beforeEach(() => {
                goToUrlAndSetLocalStorage(oncoprintTabUrl);
                waitForOncoprint(100000);
                setSettingsMenuOpen(true);
            });

            it('shows custom driver annotation elements in config menu', () => {
                var topCheckBox = $('input[data-test=annotateCustomBinary]');
                assert(topCheckBox.isSelected());

                var tiersCheckboxes = $(
                    'span[data-test=annotateCustomTiers]'
                ).$$('input');
                assert(tiersCheckboxes[0].isSelected());
                assert(tiersCheckboxes[1].isSelected());
            });

            it('allows deselection of Tiers checkboxes', () => {
                var class1Checkbox = $('label*=Class 1').$('input');
                class1Checkbox.click();
                waitForOncoprint();
                assert(!class1Checkbox.isSelected());

                var class2Checkbox = $('label*=Class 2').$('input');
                class2Checkbox.click();
                waitForOncoprint();
                assert(!class2Checkbox.isSelected());
            });

            it('updates selected samples when VUS alterations are excluded', () => {
                // deselected all checkboxes except Custom driver annotation
                $('input[data-test=annotateHotspots]').click();
                $('label*=Class 1')
                    .$('input')
                    .click();
                $('label*=Class 2')
                    .$('input')
                    .click();

                $('input[data-test=HideVUS]').click();
                waitForOncoprint();
                assert($('div.alert-info*=1 mutation').isExisting());

                $('label*=Class 1')
                    .$('input')
                    .click();
                waitForOncoprint();
                assert($('div.alert-info*=1 mutation').isExisting());

                $('label*=Class 2')
                    .$('input')
                    .click();
                waitForOncoprint();
                assert(!$('div.alert-info').isExisting());
            });

            it('(de-)selects custom driver checkboxes with main annotation select option', () => {
                var topCheckBox = $('input[data-test=annotateCustomBinary]');
                var tiersCheckboxes = $(
                    'span[data-test=annotateCustomTiers]'
                ).$$('input');

                $('input[data-test=ColorByDriver]').click();
                assert(!topCheckBox.isSelected());
                assert(!tiersCheckboxes[0].isSelected());
                assert(!tiersCheckboxes[1].isSelected());

                $('input[data-test=ColorByDriver]').click();
                assert(topCheckBox.isSelected());
                assert(tiersCheckboxes[0].isSelected());
                assert(tiersCheckboxes[1].isSelected());
            });
        });

        describe('oncoprint tab - discete CNA', () => {
            beforeEach(() => {
                goToUrlAndSetLocalStorage(oncoprintTabUrlCna);
                waitForOncoprint();
                setSettingsMenuOpen(true);
            });

            it('shows custom driver annotation elements in config menu', () => {
                var topCheckBox = $('input[data-test=annotateCustomBinary]');
                assert(topCheckBox.isSelected());

                var tiersCheckboxes = $(
                    'span[data-test=annotateCustomTiers]'
                ).$$('input');
                assert(tiersCheckboxes[0].isSelected());
                assert(tiersCheckboxes[1].isSelected());
            });

            it('allows deselection of Tiers checkboxes', () => {
                var class1Checkbox = $('label*=Class 1').$('input');
                class1Checkbox.click();
                waitForOncoprint();
                assert(!class1Checkbox.isSelected());

                var class2Checkbox = $('label*=Class 2').$('input');
                class2Checkbox.click();
                waitForOncoprint();
                assert(!class2Checkbox.isSelected());
            });

            it('updates selected samples when VUS alterations are excluded', () => {
                // deselected all checkboxes except Custom driver annotation
                $('input[data-test=annotateHotspots]').click();
                $('label*=Class 1')
                    .$('input')
                    .click();
                $('label*=Class 2')
                    .$('input')
                    .click();

                $('input[data-test=HideVUS]').click();
                waitForOncoprint();
                assert($('div.alert-info*=17 mutations').isExisting());

                $('label*=Class 1')
                    .$('input')
                    .click();
                waitForOncoprint();
                assert($('div.alert-info*=17 mutations').isExisting());

                $('label*=Class 2')
                    .$('input')
                    .click();
                waitForOncoprint();
                assert($('div.alert-info*=16 mutations').isExisting());
            });

            it('(de-)selects custom driver checkboxes with main annotation select option', () => {
                var topCheckBox = $('input[data-test=annotateCustomBinary]');
                var tiersCheckboxes = $(
                    'span[data-test=annotateCustomTiers]'
                ).$$('input');

                $('input[data-test=ColorByDriver]').click();
                assert(!topCheckBox.isSelected());
                assert(!tiersCheckboxes[0].isSelected());
                assert(!tiersCheckboxes[1].isSelected());

                $('input[data-test=ColorByDriver]').click();
                assert(topCheckBox.isSelected());
                assert(tiersCheckboxes[0].isSelected());
                assert(tiersCheckboxes[1].isSelected());
            });
        });

        describe('study view', () => {
            beforeEach(() => {
                goToUrlAndSetLocalStorage(studyViewUrlEs_0);
                $('[data-test=study-view-header]').waitForVisible();
                assert($('[data-test=GlobalSettingsButton]').isVisible());
                browser.moveToObject('[data-test=GlobalSettingsButton]');
                setSettingsMenuOpen(true);
            });

            describe('study without custom driver annotations', () => {
                it('shows hint with instructions when hovering menu', () => {
                    goToUrlAndSetLocalStorage(studyViewUrlGenPanels);
                    $('[data-test=study-view-header]').waitForVisible();
                    assert($('[data-test=GlobalSettingsButton]').isVisible());
                    browser.moveToObject('[data-test=GlobalSettingsButton]');
                    assert(
                        $('[data-test=GlobalSettingsButtonHint]').isVisible()
                    );
                });
            });

            describe('study with custom driver annotations', () => {
                it('shows settings menu', () => {
                    // shows custom driver options
                    var topCheckBox = $(
                        'input[data-test=annotateCustomBinary]'
                    );
                    assert(topCheckBox.isSelected());

                    var tiersCheckboxes = $(
                        'span[data-test=annotateCustomTiers]'
                    ).$$('input');
                    assert(tiersCheckboxes.length > 0);

                    // does not show remote options (oncokb, ...)
                    assert(!$('[data-test=annotateOncoKb]').isExisting());

                    // does show VUS and germline filtering options
                    assert($('[data-test=HideVUS]').isVisible());
                    assert($('[data-test=HideGermline]').isVisible());

                    // does not show exlude samples option
                    assert(!$('[data-test=HideUnprofiled]').isExisting());
                });

                it('updates mutated genes counts when VUS alterations are excluded', () => {
                    $('input[data-test=HideVUS]').click();
                    $('[data-test=mutations-table]').waitForVisible();

                    // FIXME add test
                    assert(false);
                });

                it('updates CNA genes counts when VUS alterations are excluded', () => {
                    var values = $$(
                        '[data-test="copy number alterations-table"] [data-test=numberOfAlteredCasesText]'
                    );
                    assert(values[0].getText() === '7');
                    assert(values[1].getText() === '2');

                    $('input[data-test=HideVUS]').click();
                    $(
                        '[data-test="copy number alterations-table"]'
                    ).waitForVisible();

                    values = $$(
                        '[data-test="copy number alterations-table"] [data-test=numberOfAlteredCasesText]'
                    );
                    assert(values[0].getText() === '1');
                    assert(values[1].getText() === '1');
                });

                it('updates fusion genes counts when VUS alterations are excluded', () => {
                    $('input[data-test=HideVUS]').click();
                    $('[data-test=fusions-table]').waitForVisible();

                    // FIXME add test
                    assert(false);
                });

                it('updates fusion genes counts when VUS alterations are excluded', () => {
                    $('input[data-test=HideVUS]').click();
                    $('[data-test=fusions-table]').waitForVisible();

                    // FIXME add test
                    assert(false);
                });
            });
        });
    }
});
