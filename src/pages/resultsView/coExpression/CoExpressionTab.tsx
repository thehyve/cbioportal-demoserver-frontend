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
import {CoExpression, CoExpressionFilter, Geneset} from "../../../shared/api/generated/CBioPortalAPIInternal";
import _ from "lodash";
import {IDataQueryFilter} from "../../../shared/lib/StoreUtils";
import {MSKTab, MSKTabs} from "../../../shared/components/MSKTabs/MSKTabs";
import CoExpressionViz from "./CoExpressionViz";
import GenesetCoExpressionViz from "./GenesetCoExpressionViz";
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
    genesetMolecularDataCache: GenesetMolecularDataCache;
    mutationCache:MobxPromiseCache<{entrezGeneId:number}, Mutation[]>;
    molecularProfileIdToProfiledSampleCount:MobxPromise<{[molecularProfileId:string]:number}>;
    coverageInformation:MobxPromise<CoverageInformation>;
    studyToMutationMolecularProfile:MobxPromise<{[studyId:string]:MolecularProfile}>;
}

export class CoExpressionCache extends MobxPromiseCache<{entrezGeneId:number, molecularProfile:MolecularProfile, allData:boolean}, CoExpression[]> {};

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
        const geneticEntities: [string, Gene|Geneset][] = [];
        for (const gene of this.props.genes) {
            geneticEntities.push(["gene", gene]);
        }
        for (const geneset of this.props.genesets) {
            geneticEntities.push(["geneset", geneset]);
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
                const dataQueryFilter = this.props.studyToDataQueryFilter[q.molecularProfile.studyId];
                if (dataQueryFilter) {
                    return internalClient.fetchCoExpressionsUsingPOST({
                        molecularProfileId: q.molecularProfile.molecularProfileId,
                        coExpressionFilter: dataQueryFilter as CoExpressionFilter,
                        entrezGeneId: q.entrezGeneId,
                        threshold
                    });
                } else {
                    return Promise.resolve([]);
                }
            }
        }),
        q=>`${q.entrezGeneId},${q.molecularProfile.molecularProfileId}`
    );

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
                <div>
                    <div className="form-inline">
                        <div className="checkbox"><label>
                            <input
                                type="checkbox"
                                checked={true}
                            />
                            Genes
                        </label></div>
                        <div className="checkbox"><label>
                            <input
                                type="checkbox"
                                checked={true}
                            />
                            Gene sets
                        </label></div>

                <div className="form-group">

                    <label for="test">Gene Expression Data Set:</label>
                    <div id="test" style={{display:"inline-block", width:376, marginLeft:4, marginRight:4, zIndex:10 /* so that on top when opened*/}}>
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
                    if (geneticEntity[0] == "gene") {
                        coExpressionVizElements.push(
                            <CoExpressionViz
                                key={`${(geneticEntity[1] as Gene).entrezGeneId},${profile.molecularProfileId}`}
                                coExpressionCache={this.coExpressionCache}
                                gene={(geneticEntity[1] as Gene)}
                                molecularProfile={profile}
                                numericGeneMolecularDataCache={this.props.numericGeneMolecularDataCache}
                                mutationCache={this.hasMutationData ? this.props.mutationCache : undefined}
                                hidden={
                                    (profile.molecularProfileId !== this.selectedMolecularProfile!.molecularProfileId) ||
                                    ((geneticEntity[1] as Gene).entrezGeneId !== this.selectedGeneticEntity!)
                                }
                                plotState={this.plotState}
                                plotHandlers={this.plotHandlers}
                                coverageInformation={this.props.coverageInformation}
                                studyToMutationMolecularProfile={this.props.studyToMutationMolecularProfile}
                            />
                        );
                    //} else {
                        //coExpressionVizElements.push([]
                            // <CoExpressionViz
                            //     key={`${geneset.name},${profile.molecularProfileId}`}
                            //     coExpressionCache={this.coExpressionCache}
                            //     geneticEntity={geneset}
                            //     molecularProfile={profile}
                            //     numericGeneMolecularDataCache={this.props.numericGeneMolecularDataCache}
                            //     mutationCache={this.hasMutationData ? this.props.mutationCache : undefined}
                            //     hidden={
                            //         (profile.molecularProfileId !== this.selectedMolecularProfile!.molecularProfileId) ||
                            //         (geneset.genesetId !== this.selectedGenesetId!)
                            //     }
                            //     plotState={this.plotState}
                            //     plotHandlers={this.plotHandlers}
                            //     coverageInformation={this.props.coverageInformation}
                            //     studyToMutationMolecularProfile={this.props.studyToMutationMolecularProfile}
                            // />
                        //);
                    }
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
                        {this.geneticEntities.map((geneEntity:[string, Gene|Geneset], i:number)=>{
                            return (
                                <MSKTab
                                    key={i}
                                    id={geneEntity[0] == "gene" ? (geneEntity[1] as Gene).entrezGeneId+"" : (geneEntity[1] as Geneset).genesetId}
                                    linkText={geneEntity[0] == "gene" ? (geneEntity[1] as Gene).hugoGeneSymbol+"" : (geneEntity[1] as Geneset).name}
                                >
                                </MSKTab>
                            );
                        })}
                    </MSKTabs>
                    </div>
                    <div>
                        {this.dataSetSelector}
                    </div>
                    <div>
                    {coExpressionVizElements}
                    </div>
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
                this.selectedGeneticEntity = this.geneticEntities[0][0];
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
