import * as React from "react";
import {
    Gene, MolecularProfile, Mutation, NumericGeneMolecularData,
    Sample
} from "../../../shared/api/generated/CBioPortalAPI";
import {action, autorun, computed, IReactionDisposer, observable, ObservableMap} from "mobx";
import {observer, Observer} from "mobx-react";
import {AlterationTypeConstants, ResultsViewPageStore} from "../ResultsViewPageStore";
import Select from "react-select";
import DefaultTooltip from "../../../shared/components/defaultTooltip/DefaultTooltip";
import {remoteData} from "../../../shared/api/remoteData";
import internalClient from "../../../shared/api/cbioportalInternalClientInstance";
import {MobxPromise} from "mobxpromise";
import {CoExpression, CoExpressionFilter, Geneset, MolecularProfileCorrelation} from "../../../shared/api/generated/CBioPortalAPIInternal";
import _ from "lodash";
import {IDataQueryFilter} from "../../../shared/lib/StoreUtils";
import {MSKTab, MSKTabs} from "../../../shared/components/MSKTabs/MSKTabs";
import CoExpressionViz from "./CoExpressionViz";
//import GenesetCoExpressionViz from "./GenesetCoExpressionViz";
import GeneMolecularDataCache from "../../../shared/cache/GeneMolecularDataCache";
import LoadingIndicator from "shared/components/loadingIndicator/LoadingIndicator";
import MutationDataCache from "../../../shared/cache/MutationDataCache";
import InfoIcon from "../../../shared/components/InfoIcon";
import {filterAndSortProfiles} from "./CoExpressionTabUtils";
import MobxPromiseCache from "../../../shared/lib/MobxPromiseCache";
import setWindowVariable from "../../../shared/lib/setWindowVariable";
import {ICoExpressionPlotProps} from "./CoExpressionPlot";
import {bind} from "bind-decorator";
import {CoverageInformation} from "../ResultsViewPageStoreUtils";
import OqlStatusBanner from "../../../shared/components/oqlStatusBanner/OqlStatusBanner";
import GenesetMolecularDataCache from "../../../shared/cache/GenesetMolecularDataCache";
import { Checkbox } from 'react-bootstrap';
import styles from "./styles.scss";

export interface ICoExpressionTabProps {
    store:ResultsViewPageStore;
    molecularProfiles:MolecularProfile[];
    genes:Gene[];
    genesets:Geneset[];
    studyToDataQueryFilter:{[studyId:string]:IDataQueryFilter};
    numericGeneMolecularDataCache:MobxPromiseCache<{entrezGeneId:number, molecularProfileId:string}, NumericGeneMolecularData[]>;
    genesetMolecularDataCache: MobxPromise<GenesetMolecularDataCache>;
    mutationCache:MobxPromiseCache<{entrezGeneId:number}, Mutation[]>;
    molecularProfileIdToProfiledSampleCount:MobxPromise<{[molecularProfileId:string]:number}>;
    coverageInformation:MobxPromise<CoverageInformation>;
    studyToMutationMolecularProfile:MobxPromise<{[studyId:string]:MolecularProfile}>;
}

export class CoExpressionCache extends MobxPromiseCache<{geneticEntityId: string, geneticEntityType: string, subjectProfileId: MolecularProfile,
queryProfileId: MolecularProfile, allData: boolean}, MolecularProfileCorrelation[]> {}

@observer
export default class CoExpressionTab extends React.Component<ICoExpressionTabProps, {}> {
    @observable selectedMolecularProfile:MolecularProfile|undefined; // only undefined initially, until molecular profiles downloaded, at which point its set automatically (see componentWillMount) and cant be made undefined again
    @observable selectedGeneticEntity:number | string | undefined; // only undefined initially, until genes downloaded, at which point its set automatically (see componentWillMount) and cant be made undefined again

    @observable private plotState = {
        plotLogScale: false,
        plotShowMutations: true
    };

    private plotHandlers: ICoExpressionPlotProps["handlers"];

    private setMolecularProfileReaction:IReactionDisposer;
    private setGeneticEntityReaction:IReactionDisposer;
    //private setGenesetReaction:IReactionDisposer;

    constructor(props:ICoExpressionTabProps) {
        super(props);

        setWindowVariable("resultsViewCoExpressionTab", this); // for testing

        this.plotHandlers = {
            onClickLogScale: action(()=>{
                this.plotState.plotLogScale = !this.plotState.plotLogScale;
            }),
            onClickShowMutations: action(()=>{
                this.plotState.plotShowMutations = !this.plotState.plotShowMutations;
            })
        };
    }

    @bind
    public onSelectDataSet(option:any) {
        this.selectedMolecularProfile = this.molecularProfileIdToMolecularProfile[option.value];
    }

    @bind
    private onSelectGeneticEntity(geneticEntityId:string) {
        this.selectedGeneticEntity = geneticEntityId;
    }

    // @bind
    // private onSelectGeneset(genesetId:string) {
    //     this.selectedGenesetId = genesetId;
    // }

    @computed get profiles() {
        return filterAndSortProfiles(this.props.molecularProfiles);
    }

    @computed get hasMutationData() {
        return !!_.find(
            this.props.molecularProfiles,
            profile=>profile.molecularAlterationType === AlterationTypeConstants.MUTATION_EXTENDED
        );
    }

    @computed get molecularProfileIdToMolecularProfile() {
        return _.keyBy(this.profiles, profile=>profile.molecularProfileId);
    }

    @computed get geneticEntities() {
        const geneticEntities: {geneticEntityId: string, geneticEntityName:string, geneticEntityType:"gene"|"geneset", cytoband: string}[] = [];
        for (const gene of this.props.genes) {
            geneticEntities.push({geneticEntityId: String(gene.entrezGeneId),
            geneticEntityName: gene.hugoGeneSymbol, geneticEntityType: "gene",
            cytoband: gene.cytoband});
        }
        for (const geneset of this.props.genesets) {
            geneticEntities.push({geneticEntityId: geneset.genesetId,
            geneticEntityName: geneset.name, geneticEntityType: "geneset",
            cytoband: "-"});
        }
        return geneticEntities;
    }

    private coExpressionCache:CoExpressionCache = new CoExpressionCache(
        q=>({
            invoke: ()=>{
                let threshold = 0.3;
                if (q.allData) {
                    threshold = 0;
                }
                const dataQueryFilter = this.props.studyToDataQueryFilter[q.subjectProfileId.studyId];
                if (dataQueryFilter) {
                    return internalClient.fetchCoExpressionsUsingPOST_1({
                        geneticEntityId: q.geneticEntityId,
                        geneticEntityType: q.geneticEntityType,
                        subjectProfileId: q.subjectProfileId.molecularProfileId,
                        queryProfileId: q.queryProfileId.molecularProfileId,
                        coExpressionFilter: dataQueryFilter as CoExpressionFilter,
                        threshold
                    });
                } else {
                    return Promise.resolve([]);
                }
            }
        }),
        q=>`${q.geneticEntityId},${q.queryProfileId}`
    );

    private getSubjectMolecularProfile(geneticEntity: {geneticEntityId: string, geneticEntityName:string, geneticEntityType:"gene"|"geneset", cytoband: string}) {
        let ret = this.selectedMolecularProfile as MolecularProfile;
        let genesetProfile;
        for (const profile of this.profiles) {
            const profileId = profile.molecularProfileId.toLowerCase();
            if (profileId.indexOf("gsva_pvalues") === -1) {
                genesetProfile = profile;
            }
        }
        if (geneticEntity.geneticEntityType === "geneset") {
            if (genesetProfile) {
                ret = genesetProfile;
            }
        } else {
            if (this.selectedMolecularProfile === genesetProfile) {
                //Find expression profile for geneset profile: TODO that, create endpoint to retrieve molecular profile using the
                // genetic_profile_link table from the database.
                // Assign molecular profile
            }
        }
        return ret;
    }

    private get dataSetSelector() {
        if (this.selectedMolecularProfile && this.props.molecularProfileIdToProfiledSampleCount.isComplete) {
            let options = this.profiles.map(profile=>{
                const profiledSampleCount = this.props.molecularProfileIdToProfiledSampleCount.result![profile.molecularProfileId];
                return {
                    label: `${profile.name} (${profiledSampleCount} sample${profiledSampleCount !== 1 ? "s" : ""})`,
                    value: profile.molecularProfileId
                };
            });
            return (
                <div
                   style = {{
                       display: "flex",
                       alignItems: "center"
                   }}
               >
                   <span>Data Set:</span>
                   <div style={{display:"inline-block", width:376, marginLeft:4, marginRight:4, zIndex:10 /* so that on top when opened*/}}>
                        <Select
                            name="data-set-select"
                            value={this.selectedMolecularProfile.molecularProfileId}
                            onChange={this.onSelectDataSet}
                            options={options}
                            searchable={false}
                            clearable={false}
                            className="coexpression-select-profile"
                        />
                    </div>
                </div>
            );
        } else {
            return <LoadingIndicator isLoading={true}/>;
        }
    }

    @bind
    private header() {
        return (
            <div>
                {this.dataSetSelector}
            </div>
        );
    }

    @bind
    private geneTabs() {
        if (this.selectedMolecularProfile && (this.selectedGeneticEntity !== undefined)) {
            const coExpressionVizElements = [];
            for (const geneticEntity of this.geneticEntities) {
                for (const profile of this.profiles) {
                    coExpressionVizElements.push(
                        <CoExpressionViz
                            key={`${geneticEntity.geneticEntityName},${profile.molecularProfileId}`}
                            coExpressionCache={this.coExpressionCache}
                            geneticEntity={geneticEntity}
                            subjectMolecularProfile={this.getSubjectMolecularProfile(geneticEntity)}
                            queryMolecularProfile={profile}
                            numericGeneMolecularDataCache={this.props.numericGeneMolecularDataCache}
                            genesetMolecularDataCache={this.props.genesetMolecularDataCache}
                            mutationCache={this.hasMutationData ? this.props.mutationCache : undefined}
                            hidden={
                                (profile.molecularProfileId !== this.selectedMolecularProfile!.molecularProfileId) ||
                                (geneticEntity.geneticEntityId !== this.selectedGeneticEntity)
                            }
                            plotState={this.plotState}
                            plotHandlers={this.plotHandlers}
                            coverageInformation={this.props.coverageInformation}
                            studyToMutationMolecularProfile={this.props.studyToMutationMolecularProfile}
                        />
                    );
                }
            }

            return (
                <div>
                    <div>
                    <MSKTabs
                        id="coexpressionTabGeneTabs"
                        activeTabId={this.selectedGeneticEntity + ""}
                        onTabClick={this.onSelectGeneticEntity}
                        className="coexpressionTabGeneTabs pillTabs"
                        unmountOnHide={true}
                        tabButtonStyle="pills"
                        enablePagination={true}
                        arrowStyle={{'line-height':0.8}}
                    >
                        {this.geneticEntities.map((geneticEntity:{geneticEntityId: string, geneticEntityName:string, geneticEntityType:"gene"|"geneset", cytoband: string}, i:number)=>{
                            return (
                                <MSKTab
                                    key={i}
                                    id={geneticEntity.geneticEntityId}
                                    linkText={geneticEntity.geneticEntityName}
                                    hide={geneticEntity.geneticEntityType === "gene" ? false : true} //TODO: change "true" for the condition where molecular profile fits.
                                >
                                </MSKTab>
                            );
                        })}
                    </MSKTabs>
                    </div>
                    {coExpressionVizElements}
                </div>
            );
        } else {
            return (
                <div style={{position:"relative"}}>
                    <LoadingIndicator isLoading={true} style={{position:"absolute", left:"50%", top:100, transform:"translate(-50%,0)"}}/>
                </div>
            );
        }
    }

    componentWillMount() {
        this.setMolecularProfileReaction = autorun(()=>{
            // set sourceMolecularProfile to default if its not already set
            // will only happen once, the first time profiles is nonempty array. it cant become undefined again
            if(!this.selectedMolecularProfile && this.profiles.length) {
                this.selectedMolecularProfile = this.profiles[0];
            }
        });

        this.setGeneticEntityReaction = autorun(()=>{
            // set gene to default if its not already set
            // will only happen once, the first time props.genes is set to nonempty array. it cant become undefined again
            if (!this.selectedGeneticEntity && this.geneticEntities.length) {
                this.selectedGeneticEntity = this.geneticEntities[0].geneticEntityId;
            }
        });

        // this.setGenesetReaction = autorun(()=>{
        //     // set gene set to default if its not already set
        //     // will only happen once, the first time props.genesets is set to nonempty array. it cant become undefined again
        //     if (!this.selectedGenesetId && this.props.genesets.length) {
        //         this.selectedGenesetId = this.props.genesets[0].name;
        //     }
        // });
    }

    componentWillUnmount() {
        this.setMolecularProfileReaction();
        this.setGeneticEntityReaction();
        //this.setGenesetReaction();
    }

    render() {
        let divContents = null;
        if (this.profiles.length) {
            divContents = (
                <div>
                    <Observer>
                        {this.header}
                    </Observer>
                    <Observer>
                        {this.geneTabs}
                    </Observer>
                </div>
            );
        } else {
            divContents = (
                <div>
                    <span>There are no available profiles in the queried studies.</span>
                </div>
            );
        }
        return (
            <div>
                <OqlStatusBanner className="coexp-oql-status-banner" store={this.props.store} tabReflectsOql={false} style={{marginBottom:15}}/>
                {divContents}
            </div>
        );
    }
}
