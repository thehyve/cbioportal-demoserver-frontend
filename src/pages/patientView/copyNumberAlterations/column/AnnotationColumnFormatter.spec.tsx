import AnnotationColumnFormatter from './AnnotationColumnFormatter';
import React from 'react';
import { assert } from 'chai';
import { shallow, mount } from 'enzyme';
import sinon from 'sinon';
import {getCivicGenes, getCnaCivicVariants, getCnaData, getExpectedCnaCivicEntry} from "test/CivicMockUtils";
import {ICivicEntry} from "shared/model/Civic";

describe('AnnotationColumnFormatter', () => {

    before(()=>{

    });

    after(()=>{

    });

    it('properly creates a civic entry', () => {

        let civicGenes = getCivicGenes();

        let civicVariants = getCnaCivicVariants();
        
        let cna = getCnaData();

        let expectedCivicEntry = getExpectedCnaCivicEntry();

        assert.deepEqual(
            AnnotationColumnFormatter.getCivicEntry(cna, civicGenes, civicVariants), expectedCivicEntry,
            'Equal Civic Entry');

    });
    
    it('properly does not disable civic', () => {
        
        let civicGenes = getCivicGenes();

        let civicVariants = getCnaCivicVariants();
        
        let cna = getCnaData();
        
        assert.deepEqual(
            AnnotationColumnFormatter.isCivicDisabled(cna, civicGenes, civicVariants), false,
            'Civic is not disabled');
    });


});
