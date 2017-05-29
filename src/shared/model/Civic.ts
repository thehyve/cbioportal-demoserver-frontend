export interface ICivicGeneData {
    id: number;
    name: string;
    description: string;
    url: string;
    variants: {[variantName: string]: number};
};

export interface ICivicGeneVariant {
    id: number;
    name: string;
    geneId: number;
    description: string;
    url: string;
    evidence: {[evidenceType: string]: number};
};

export interface ICivicData {[name: string]: ICivicGeneData};

export interface ICivicVariant {[id: string]: {[name: string]: ICivicGeneVariant}};

export interface ICivicInstance {
    name: string,
    description: string,
    url: string,
    variants: {[name: string]: ICivicGeneVariant}
};