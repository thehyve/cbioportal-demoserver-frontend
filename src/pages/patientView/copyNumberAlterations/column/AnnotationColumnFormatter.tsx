import * as React from 'react';
import * as _ from "lodash";
import {DiscreteCopyNumberData} from "shared/api/generated/CBioPortalAPI";
import {
    IAnnotation, IAnnotationColumnProps, default as DefaultAnnotationColumnFormatter
} from "shared/components/mutationTable/column/AnnotationColumnFormatter";
import {IOncoKbData} from "shared/model/OncoKB";
import OncoKB from "shared/components/annotation/OncoKB";
import Civic from "shared/components/annotation/Civic";
import {generateQueryVariantId, generateQueryVariant} from "shared/lib/OncoKbUtils";
import {IndicatorQueryResp, Query} from "shared/api/generated/OncoKbAPI";
import {getAlterationString} from "shared/lib/CopyNumberUtils";
import {ICivicVariant, ICivicData, ICivicInstance, ICivicGeneVariant, ICivicGeneData} from "shared/model/Civic.ts";

/**
 * @author Selcuk Onur Sumer
 */
export default class AnnotationColumnFormatter
{
    public static getData(copyNumberData:DiscreteCopyNumberData[]|undefined,
                          oncoKbData?:IOncoKbData,
                          civicData?: ICivicData,
                          civicVariants?: ICivicVariant)
    {
        let value: IAnnotation;

        if (copyNumberData) {
            value = {
                oncoKbIndicator: oncoKbData ?
                    AnnotationColumnFormatter.getIndicatorData(copyNumberData, oncoKbData) : undefined,
                civicInstance: civicData && civicVariants ?
                    AnnotationColumnFormatter.getCivicInstance(copyNumberData, civicData, civicVariants) : undefined,
                isCivicDisabled: civicData && civicVariants ?
                    AnnotationColumnFormatter.isCivicDisabled(copyNumberData, civicData, civicVariants) : false,
                myCancerGenomeLinks: [],
                isHotspot: false,
                is3dHotspot: false
            };
        }
        else {
            value = {
                myCancerGenomeLinks: [],
                isHotspot: false,
                is3dHotspot: false,
                isCivicDisabled: false
            };
        }

        return value;
    }

   /**
     * Returns an ICivicInstance if the civicData and civicVariants have information about the gene and the mutation (variant) specified. Otherwise it returns 
     * an empty object.
     */
    public static getCivicInstance(copyNumberData:DiscreteCopyNumberData[], civicData:ICivicData, civicVariants:ICivicVariant): ICivicInstance | null
    {
        let geneSymbol: string = copyNumberData[0].gene.hugoGeneSymbol;
        let geneVariants: {[name: string]: ICivicGeneVariant} = civicVariants[geneSymbol];
        let geneEntry: ICivicGeneData = civicData[geneSymbol];
        let civicInstance = null;
        //Only return data for genes with variants or it has a description provided by the Civic API
        if (geneVariants ||
               (geneEntry && geneEntry.description != "")) {
            civicInstance = {name: geneEntry.name,
                             description: geneEntry.description,
                             url: geneEntry.url,
                             variants: geneVariants,
                            }
        }

        return civicInstance;
    }

    public static isCivicDisabled (copyNumberData:DiscreteCopyNumberData[], civicData:ICivicData, civicVariants:ICivicVariant): boolean
    {
        let geneSymbol: string = copyNumberData[0].gene.hugoGeneSymbol;
        let geneVariants: {[name: string]: ICivicGeneVariant} = civicVariants[geneSymbol];
        let geneEntry: ICivicGeneData = civicData[geneSymbol];
    
        if (geneEntry && !geneVariants) {
            return true;
            }
        
        return false;
    }
    
    public static getIndicatorData(copyNumberData:DiscreteCopyNumberData[], oncoKbData:IOncoKbData):IndicatorQueryResp
    {
        const id = generateQueryVariantId(copyNumberData[0].gene.entrezGeneId,
            oncoKbData.sampleToTumorMap[copyNumberData[0].sampleId],
            getAlterationString(copyNumberData[0].alteration));

        return oncoKbData.indicatorMap[id];
    }

    public static getEvidenceQuery(copyNumberData:DiscreteCopyNumberData[], oncoKbData:IOncoKbData): Query
    {
        return generateQueryVariant(copyNumberData[0].gene.entrezGeneId,
            oncoKbData.sampleToTumorMap[copyNumberData[0].sampleId],
            getAlterationString(copyNumberData[0].alteration));
    }

    public static sortValue(data:DiscreteCopyNumberData[],
                            oncoKbData?:IOncoKbData,
                            civicData?: ICivicData,
                            civicVariants?: ICivicVariant):number[] {
        const annotationData:IAnnotation = AnnotationColumnFormatter.getData(data, oncoKbData, civicData, civicVariants);
        
        return _.flatten([OncoKB.sortValue(annotationData.oncoKbIndicator),
                         Civic.sortValue(annotationData.civicInstance)]);
    }

    public static renderFunction(data:DiscreteCopyNumberData[], columnProps:IAnnotationColumnProps)
    {
        const annotation:IAnnotation = AnnotationColumnFormatter.getData(data, columnProps.oncoKbData, columnProps.civicData, columnProps.civicVariants);

        let evidenceQuery:Query|undefined;

        if (columnProps.oncoKbData) {
            evidenceQuery = this.getEvidenceQuery(data, columnProps.oncoKbData);
        }

        return DefaultAnnotationColumnFormatter.mainContent(annotation,
            columnProps,
            columnProps.oncoKbEvidenceCache,
            evidenceQuery,
            columnProps.pmidCache);
    }
}
