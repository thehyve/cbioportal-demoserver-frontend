import {MolecularProfile, Mutation, NumericGeneMolecularData} from "../../../shared/api/generated/CBioPortalAPI";
import {GenesetMolecularData} from "../../../shared/api/generated/CBioPortalAPIInternal";
import {CoverageInformation} from "../ResultsViewPageStoreUtils";
import {isSampleProfiled} from "../../../shared/lib/isSampleProfiled";


const nonBreakingSpace = '\xa0';
export function requestAllDataMessage(hugoGeneSymbol:string) {
    return `There are no genes with a Pearson or Spearman correlation with ${hugoGeneSymbol} of${nonBreakingSpace}>${nonBreakingSpace}0.3${nonBreakingSpace}or${nonBreakingSpace}<${nonBreakingSpace}-0.3.`;
}

function dispMut(mutations:Mutation[]) {
    return mutations.map(mutation=>mutation.proteinChange).filter(p=>!!p).join(", ");
}

function isProfiled(
    uniqueSampleKey:string,
    studyId:string,
    hugoGeneSymbol:string,
    coverageInformation:CoverageInformation,
    studyToMutationMolecularProfile:{[studyId:string]:MolecularProfile}
) {
    const molecularProfile = studyToMutationMolecularProfile[studyId];
    if (!molecularProfile) {
        return false;
    } else {
        return isSampleProfiled(
            uniqueSampleKey,
            molecularProfile.molecularProfileId,
            hugoGeneSymbol,
            coverageInformation
        );
    }
}

export function computePlotData(
    molecularData: NumericGeneMolecularData[]|GenesetMolecularData[],
    mutationData: Mutation[],
    xGeneticEntityId:number|string,
    xGeneticEntityName:string,
    yGeneticEntityName:string,
    coverageInformation:CoverageInformation,
    studyToMutationMolecularProfile:{[studyId:string]:MolecularProfile}
) {
    const xData:{[uniqueSampleKey:string]:NumericGeneMolecularData|GenesetMolecularData} = {};
    const yData:{[uniqueSampleKey:string]:NumericGeneMolecularData|GenesetMolecularData} = {};
    const xMutations:{[uniqueSampleKey:string]:Mutation[]} = {};
    const yMutations:{[uniqueSampleKey:string]:Mutation[]} = {};
    const sampleInfo:{[uniqueSampleKey:string]:{sampleId:string, studyId:string}} = {};

    const addSampleInfo = (datum:{sampleId:string, studyId:string, uniqueSampleKey:string})=>{
        if (!sampleInfo[datum.uniqueSampleKey]) {
            sampleInfo[datum.uniqueSampleKey] = datum;
        }
    };
    for (const datum of mutationData) {
        if (datum.proteinChange) {
            const targetData = (datum.entrezGeneId === xGeneticEntityId ? xMutations : yMutations);
            targetData[datum.uniqueSampleKey] = targetData[datum.uniqueSampleKey] || [];
            targetData[datum.uniqueSampleKey].push(datum);
            addSampleInfo(datum);
        }
    }

    for (const datum of molecularData) {
        if ((datum as NumericGeneMolecularData).entrezGeneId !== undefined) {
            const targetData = ((datum as NumericGeneMolecularData).entrezGeneId === xGeneticEntityId ? xData : yData);
            targetData[datum.uniqueSampleKey] = datum;
            addSampleInfo(datum);
        } else {
            const targetData = ((datum as GenesetMolecularData).genesetId === xGeneticEntityId.toString() ? xData : yData);
            targetData[datum.uniqueSampleKey] = datum;
            addSampleInfo(datum);
        }
    }

    const ret = [];
    for (const uniqueSampleKey of Object.keys(xData)) {
        const studyId = sampleInfo[uniqueSampleKey].studyId;
        const xDatum = xData[uniqueSampleKey];
        const yDatum = yData[uniqueSampleKey];
        if (xDatum && yDatum) {
            // only add data if data for both axes
            const xVal = Number(xDatum.value);
            const yVal = Number(yDatum.value);
            if (!isNaN(xVal) && !isNaN(yVal)) {
                ret.push({
                    x: xVal,
                    y: yVal,
                    mutationsX: dispMut(xMutations[uniqueSampleKey] || []),
                    mutationsY: dispMut(yMutations[uniqueSampleKey] || []),
                    profiledX: isProfiled(uniqueSampleKey, studyId, xGeneticEntityName, coverageInformation, studyToMutationMolecularProfile),
                    profiledY: isProfiled(uniqueSampleKey, studyId, yGeneticEntityName, coverageInformation, studyToMutationMolecularProfile),
                    studyId,
                    sampleId: sampleInfo[uniqueSampleKey].sampleId
                });
            }
        }
    }
    return ret;
}