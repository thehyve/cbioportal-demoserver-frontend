import $ from 'jquery';
import {ICivicData, ICivicGeneData, ICivicVariant, ICivicGeneVariant} from "shared/model/Civic.ts";
import {Mutation} from "shared/api/generated/CBioPortalAPI";

type CivicAPIGene = {
    id: number;
    name: string;
    description: string;
    variants: Array<CivicAPIGeneVariant>;
    [propName: string]: any;
};

type CivicAPIGeneVariant = {
    name: string;
    id: number;
    [propName: string]: any; 
};

type CivicAPIVariant = {
    description: string;
    evidence_items: Array<Evidence>;
    [propName: string]: any;
};

type Evidence = {
    evidence_type: string;
    [propName: string]: any;
};

/**
 * Returns a map with the different types of evidence and the number of times that each evidence happens.
 */
function countEvidenceTypes(evidenceItems: Array<Evidence>): {[evidenceType: string]: number} {
    let evidence: {[evidenceType: string]: number} = {};
    evidenceItems.forEach(function (evidenceItem: Evidence) {
        let evidenceType = evidenceItem.evidence_type;
        if (evidence.hasOwnProperty(evidenceType)) {
            evidence[evidenceType] += 1;
        }
        else {
            evidence[evidenceType] = 1;
        }
    });
    return evidence;
};

/**
 * Returns a map with the different variant names and their variant id.
 */
function createVariantMap(variantArray: Array<CivicAPIGeneVariant>): {[variantName: string]: number} {
    let variantMap: {[variantName: string]: number} = {};
    if (variantArray && variantArray.length > 0) {
        variantArray.forEach(function(variant) {
            variantMap[variant.name] = variant.id;
        });
    }
    return variantMap;
};

/**
 * CIViC
 */
export function CivicAPI() {
      
      // All results are stored here
      let civicData: ICivicData = {};
      let civicVariants: ICivicVariant = {};
  
      /**
       * Retrieves the gene entries for the ids given, if they are in the Civic API.
       */
      function getCivicGenesBatch(ids: string): JQueryPromise<Array<ICivicGeneData>> {
        return $.ajax({
            type: 'GET',
            url: 'https://civic.genome.wustl.edu/api/genes/' + ids,
            dataType: 'json',
            data: {
                identifier_type: 'entrez_symbol'
            }
        }).then(function (response: CivicAPIGene | Array<CivicAPIGene>) {
            let result: Array<CivicAPIGene>;
            if (response instanceof Array) {
              result = response;
            } else {
              result = [response];
            }
            return result.map((record: CivicAPIGene) => ({
                id: record.id,
                name: record.name,
                description: record.description,
                url: 'https://civic.genome.wustl.edu/#/events/genes/'
                + record.id + '/summary',
                variants: createVariantMap(record.variants)
            }));
        }, function () {
            return [];
        });
    }
    
    /**
     * Asynchronously adds to civicData the gene entries corresponding to the ids given.
     */
    function setCivicGenesBatch(ids: string): JQueryPromise<void> {
        return getCivicGenesBatch(ids).then(function (arrayCivicGenes: Array<ICivicGeneData>) {
            arrayCivicGenes.forEach((civicGene) => {
                civicData[civicGene.name] = civicGene;
            });
        })
    }
    
    /**
     * Returns a promise that resolves with the variants for parameters given.
     */
    function getVariant(variantId: number, name: string, geneId: number): JQueryPromise<ICivicGeneVariant> {
        return $.ajax({
            type: 'GET',
            url: 'https://civic.genome.wustl.edu/api/variants/' + variantId,
            dataType: 'json'
            })
            .then(function (result: CivicAPIVariant) {
                // Aggregate evidence items per type
                return {
                    id: variantId,
                    name: name,
                    geneId: geneId,
                    description: result.description,
                    url: 'https://civic.genome.wustl.edu/#/events/genes/' + geneId +
                         '/summary/variants/' + variantId + '/summary#variant',
                    evidence: countEvidenceTypes(result.evidence_items)
                };
            });
    }
    
    /**
     * Asynchronously adds the given variant from a gene to the variant map specified.
     */
    function addCivicVariant(variantMap: ICivicVariant, variantId: number, variantName: string, geneSymbol: string, geneId: number): JQueryPromise<void> {
        return getVariant(variantId, variantName, geneId)
        .then(function(result: ICivicGeneVariant) {
            if (result) {
                if (!variantMap[geneSymbol]) {
                    variantMap[geneSymbol] = {};
                }
                variantMap[geneSymbol][variantName] = result;
            }
        })
    }
    
    let service = {
        
        /**
         * Asynchronously return a map with Civic information from the genes given.
         */
        getCivicGenes: function(geneSymbols: Array<string>): JQueryPromise<ICivicData> {

            // Assemble a list of promises, each of which will retrieve a batch of genes
            let promises: Array<JQueryPromise<void>> = [];
            let ids = '';
            geneSymbols.forEach(function(geneSymbol: string) {
                // Check if we already have it in the cache
                if (civicData.hasOwnProperty(geneSymbol)) {
                    return;
                }

                // Add the symbol to the list
                if (ids.length > 0) {
                    ids += ',';
                }
                ids += geneSymbol;

                // To prevent the request from growing too large, we send it off
                // when it reaches this limit and start a new one
                if (ids.length >= 1900) {
                    promises.push(setCivicGenesBatch(ids));
                    ids = '';
                }
            });
            if (ids.length > 0) {
                promises.push(setCivicGenesBatch(ids));
            }

            // We're explicitly waiting for all promises to finish (done or fail).
            // We are wrapping them in another promise separately, to make sure we also 
            // wait in case one of the promises fails and the other is still busy.
            let wrappedPromises = $.map(promises, function(promise: JQueryPromise<void>) {
                let wrappingDeferred = $.Deferred();
                promise.always(function (result) {
                    wrappingDeferred.resolve();
                });
                return wrappingDeferred.promise();
            });
            
            let mainPromise = $.when.apply($, wrappedPromises);

            return mainPromise.then(function() {
                return civicData;
            });
        },
        
        /**
         * Asynchronously retrieve a map with Civic information from the mutationSpecs given for all genes in civicData.
         * If no mutationSpecs are given, then return the Civic information of all the CNA variants of the genes in civicData.
         */
        getCivicVariants: function(civicData: ICivicData, mutationSpecs?: Array<{gene:{hugoGeneSymbol: string}, proteinChange: string}>): JQueryPromise<ICivicVariant> {

            let promises: Array<JQueryPromise<void>> = [];
            
            if (mutationSpecs){
                for (let mutation of mutationSpecs) {
                    let geneSymbol = mutation.gene.hugoGeneSymbol;
                    let geneEntry = civicData[geneSymbol];
                    let proteinChanges = [mutation.proteinChange];
                    // Match any other variants after splitting the name on + or /
                    let split = mutation.proteinChange.split(/[+\/]/);
                    proteinChanges.push(split[0]);
                    for (let proteinChange of proteinChanges) {
                        if (geneEntry && geneEntry.variants[proteinChange]) {
                            promises.push(addCivicVariant(civicVariants,
                                                          geneEntry.variants[proteinChange],
                                                          proteinChange,
                                                          geneSymbol,
                                                          geneEntry.id));
                        }
                    }
                }
            } else {
                for (let geneName in civicData) {
                    let geneEntry = civicData[geneName];
                    let geneVariants = geneEntry.variants;
                    if (geneVariants != {}) {
                        for (let variantName in geneVariants) {
                            // Only retrieve CNA variants
                            if (variantName == 'AMPLIFICATION' || variantName == 'DELETION') {
                                promises.push(addCivicVariant(civicVariants,
                                                              geneVariants[variantName],
                                                              variantName,
                                                              geneName,
                                                              geneEntry.id));
                            }
                        }
                    }
                }
            }

            // We're explicitly waiting for all promises to finish (done or fail).
            // We are wrapping them in another promise separately, to make sure we also 
            // wait in case one of the promises fails and the other is still busy.
            let wrappedPromises = $.map(promises, function(promise: JQueryPromise<void>) {
                let wrappingDeferred = $.Deferred();
                promise.always(function (result) {
                    wrappingDeferred.resolve();
                });
                return wrappingDeferred.promise();
            });
            
            let mainPromise = $.when.apply($, wrappedPromises);

            return mainPromise.then(function() {
                return civicVariants;
            });
        }
    }
    return service;

}