import AnnotationColumnFormatter from './AnnotationColumnFormatter';
import React from 'react';
import { assert } from 'chai';
import { shallow, mount } from 'enzyme';
import sinon from 'sinon';
import {getCivicGenes, getMutationCivicVariants, getMutationData} from "test/CivicMockUtils";
import {ICivicEntry} from "shared/model/Civic";

describe('AnnotationColumnFormatter', () => {

    before(()=>{

    });

    after(()=>{

    });

    it('properly creates a civic entry', () => {

        let civicGenes = getCivicGenes();

        let civicVariants = getMutationCivicVariants();
        
        let mutation = getMutationData();

        let expectedCivicEntry: ICivicEntry = {name: "PIK3CA",
                                               description: "PIK3CA is the most recurrently mutated gene in breast cancer, and has been found to important in a number of cancer types. An integral part of the PI3K pathway, PIK3CA has long been described as an oncogene, with two main hotspots for activating mutations, the 542/545 region of the helical domain, and the 1047 region of the kinase domain. PIK3CA, and its interaction with the AKT and mTOR pathways, is the subject of an immense amount of research and development, and PI3K inhibition has seen some limited success in recent clinical trials. While monotherapies seem to be limited in their potential, there is a recent interest in pursuing PI3K inhibition as part of a combination therapy regiment with inhibition partners including TKI's, MEK inhibitors, PARP inhibitors, and in breast cancer, aromatase inhibitors.",
                                               url: "https://civic.genome.wustl.edu/#/events/genes/37/summary",
                                               variants: { "E545K": {
                                                                     id: 104,
                                                                     name: "E545K",
                                                                     geneId: 37,
                                                                     description: "PIK3CA E545K/E542K are the second most recurrent PIK3CA mutations in breast cancer, and are highly recurrent mutations in many other cancer types. E545K, and possibly the other mutations in the E545 region, may present patients with a poorer prognosis than patients with either patients with other PIK3CA variant or wild-type PIK3CA. There is also data to suggest that E545/542 mutations may confer resistance to EGFR inhibitors like cetuximab. While very prevalent, targeted therapies for variants in PIK3CA are still in early clinical trial phases.",
                                                                     url: "https://civic.genome.wustl.edu/#/events/genes/37/summary/variants/104/summary#variant",
                                                                     evidence: {"Prognostic": 1, "Predictive": 14}
                                                                     }
                                                        }};

        assert.deepEqual(
            AnnotationColumnFormatter.getCivicEntry(mutation, civicGenes, civicVariants), expectedCivicEntry,
            'Equal Civic Entry');

    });


});
