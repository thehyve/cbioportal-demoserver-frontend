import * as React from "react";
import {Gene, MolecularProfile} from "../../../shared/api/generated/CBioPortalAPI";
import {action, computed, observable} from "mobx";
import {observer, Observer} from "mobx-react";
import {AlterationTypeConstants, ResultsViewPageStore, GeneticEntity} from "../ResultsViewPageStore";
import Select from "react-select";
import DefaultTooltip from "../../../shared/components/defaultTooltip/DefaultTooltip";
import {remoteData} from "../../../shared/api/remoteData";
import internalClient from "../../../shared/api/cbioportalInternalClientInstance";
import {MobxPromise} from "mobxpromise";
import {CoExpression, CoExpressionFilter, MolecularProfileCorrelation} from "../../../shared/api/generated/CBioPortalAPIInternal";
import _ from "lodash";
import {MSKTab, MSKTabs} from "../../../shared/components/MSKTabs/MSKTabs";
import CoExpressionViz from "./CoExpressionViz";
import LoadingIndicator from "shared/components/loadingIndicator/LoadingIndicator";
import MutationDataCache from "../../../shared/cache/MutationDataCache";
import InfoIcon from "../../../shared/components/InfoIcon";
import MobxPromiseCache from "../../../shared/lib/MobxPromiseCache";
import {ICoExpressionPlotProps} from "./CoExpressionPlot";
import {bind} from "bind-decorator";
import OqlStatusBanner from "../../../shared/components/oqlStatusBanner/OqlStatusBanner";
import {getMobxPromiseGroupStatus} from "../../../shared/lib/getMobxPromiseGroupStatus";
import MolecularProfileSelector from "../../../shared/components/MolecularProfileSelector";

export interface ICoExpressionTabProps {
    store:ResultsViewPageStore;
}

export class CoExpressionCache extends MobxPromiseCache<{subjectProfile: MolecularProfile, 
    queryProfile: MolecularProfile, geneticEntityId: string,
    geneticEntityType: string, allData:boolean}, MolecularProfileCorrelation[]> {}

@observer
export default class CoExpressionTab extends React.Component<ICoExpressionTabProps, {}> {
    @observable _selectedSubjectProfileGene:MolecularProfile|undefined; // only undefined initially, until molecular profiles downloaded
    @observable _selectedSubjectProfileGeneset:MolecularProfile|undefined; // only undefined initially, until molecular profiles downloaded
    @observable _selectedQueryProfile:MolecularProfile|undefined; // only undefined initially, until molecular profiles downloaded
    @observable _selectedGeneticEntityId:string | undefined; // only undefined initially, until genes and gene sets downloaded
    @observable _geneticEntities:GeneticEntity[] | undefined; // only undefined initially, until genes and gene sets downloaded
    @observable _isSelectedGeneticEntityAGeneSet = false;

    @computed get selectedSubjectProfileGene():MolecularProfile|undefined {
        if (!this._selectedSubjectProfileGene && this.props.store.coexpressionTabMolecularSubjectProfilesGene.isComplete
                && this.props.store.coexpressionTabMolecularSubjectProfilesGene.result.length > 0) {
                    return this.props.store.coexpressionTabMolecularSubjectProfilesGene.result[0];
        } else {
            return this._selectedSubjectProfileGene;
        }
    }

    @computed get selectedSubjectProfileGeneset():MolecularProfile|undefined {
        if (!this._selectedSubjectProfileGeneset && this.props.store.coexpressionTabMolecularSubjectProfilesGeneset.isComplete
                && this.props.store.coexpressionTabMolecularSubjectProfilesGeneset.result.length > 0) {
                    return this.props.store.coexpressionTabMolecularSubjectProfilesGeneset.result[0];
        } else {
            return this._selectedSubjectProfileGeneset;
        }
    }

    @computed get selectedQueryProfile():MolecularProfile|undefined {
        if (!this._selectedQueryProfile && this.props.store.coexpressionTabMolecularQueryProfiles.isComplete
            && this.props.store.coexpressionTabMolecularQueryProfiles.result.length > 0) {
            return this.props.store.coexpressionTabMolecularQueryProfiles.result[0];
        } else {
            return this._selectedQueryProfile;
        }
    }

    @computed get selectedGeneticEntityId():string | undefined {
        if (!this._selectedGeneticEntityId && this.props.store.geneticEntities !== undefined) {
            return String(this.props.store.geneticEntities[0].geneticEntityId);
        } else {
            return this._selectedGeneticEntityId;
        }
    }

    @computed get isSelectedGeneticEntityAGeneSet(): boolean {
        if (this._selectedGeneticEntityId !== undefined) {
            for (const geneticEntity of this.props.store.geneticEntities!) {
                if (geneticEntity.geneticEntityType === "geneset" && String(geneticEntity.geneticEntityId) === this._selectedGeneticEntityId) {
                    return true;
                }
            }
            return false;
        } else {
            return this._isSelectedGeneticEntityAGeneSet;
        }
    }

    @observable private plotState = {
        plotLogScale: false,
        plotShowMutations: true
    };

    private plotHandlers: ICoExpressionPlotProps["handlers"];

    constructor(props:ICoExpressionTabProps) {
        super(props);

        (window as any).resultsViewCoExpressionTab = this; // for testing

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
    public onSelectSubjectProfileGene(option:any) {
        if (this.props.store.molecularProfileIdToMolecularProfile.isComplete) {
            this._selectedSubjectProfileGene = this.props.store.molecularProfileIdToMolecularProfile.result[option.value];
        }
    }

    @bind
    public onSelectSubjectProfileGeneset(option:any) {
        if (this.props.store.molecularProfileIdToMolecularProfile.isComplete) {
            this._selectedSubjectProfileGeneset = this.props.store.molecularProfileIdToMolecularProfile.result[option.value];
        }
    }

    @bind
    public onSelectQueryProfile(option:any) {
        if (this.props.store.molecularProfileIdToMolecularProfile.isComplete) {
            this._selectedQueryProfile = this.props.store.molecularProfileIdToMolecularProfile.result[option.value];
        }
    }

    @bind
    private onSelectGeneticEntity(geneticEntityId:string) {
        this._selectedGeneticEntityId = geneticEntityId;
    }

    @computed get hasMutationData() {
        return !!_.find(
            this.props.store.molecularProfilesWithData.result,
            profile=>profile.molecularAlterationType === AlterationTypeConstants.MUTATION_EXTENDED
        );
    }

    @bind
    private isSelectedGeneticEntityAGeneset(geneticEntity:GeneticEntity) {
        this._isSelectedGeneticEntityAGeneSet = this.isSelectedGeneticEntityAGeneSet;
    }

    private coExpressionCache:CoExpressionCache = new CoExpressionCache(
        q=>({
            invoke: ()=>{
                let threshold = 0.3;
                if (q.allData) {
                    threshold = 0;
                }
                const dataQueryFilter = this.props.store.studyToDataQueryFilter.result![q.subjectProfile.studyId];
                if (dataQueryFilter) {
                    // TODO: this sorts by p value asc first, so we can fake
                    // multi column sort when sorting by q value afterwards. We
                    // can remove this after implementing multi-sort
                    return internalClient.fetchCoExpressionsUsingPOST_1({
                        subjectProfileId: q.subjectProfile.molecularProfileId,
                        queryProfileId: q.queryProfile.molecularProfileId,
                        coExpressionFilter: dataQueryFilter as CoExpressionFilter,
                        geneticEntityId: q.geneticEntityId,
                        geneticEntityType: q.geneticEntityType,
                        threshold
                    })
                } else {
                    return Promise.resolve([]);
                }
            }
        }),
        q=>`${q.geneticEntityId},${q.subjectProfile.molecularProfileId},${q.queryProfile.molecularProfileId}`
    );

    private get profilesSelector() {
        if (this.selectedSubjectProfileGene &&
            this.selectedSubjectProfileGeneset &&
            this.selectedQueryProfile &&
            this.selectedGeneticEntityId &&
            this.props.store.molecularProfileIdToProfiledSampleCount.isComplete &&
            this.props.store.coexpressionTabMolecularSubjectProfilesGene.isComplete &&
            this.props.store.coexpressionTabMolecularSubjectProfilesGeneset.isComplete &&
            this.props.store.coexpressionTabMolecularQueryProfiles.isComplete &&
            this.props.store.coexpressionTabMolecularQueryProfiles.isComplete) {
            const subjectOptionsGene = this.props.store.coexpressionTabMolecularSubjectProfilesGene.result.map(profile=>{
                const profiledSampleCount = this.props.store.molecularProfileIdToProfiledSampleCount.result![profile.molecularProfileId];
                return {
                    label: `${profile.name} (${profiledSampleCount} sample${profiledSampleCount !== 1 ? "s" : ""})`,
                    value: profile.molecularProfileId
                };
            });
            const subjectOptionsGeneset = this.props.store.coexpressionTabMolecularSubjectProfilesGeneset.result.map(profile=>{
                const profiledSampleCount = this.props.store.molecularProfileIdToProfiledSampleCount.result![profile.molecularProfileId];
                return {
                    label: `${profile.name} (${profiledSampleCount} sample${profiledSampleCount !== 1 ? "s" : ""})`,
                    value: profile.molecularProfileId
                };
            });
            const queryOptions = this.props.store.coexpressionTabMolecularQueryProfiles.result.map(profile=>{
                    const profiledSampleCount = this.props.store.molecularProfileIdToProfiledSampleCount.result![profile.molecularProfileId];
                    return {
                        label: `${profile.name} (${profiledSampleCount} sample${profiledSampleCount !== 1 ? "s" : ""})`,
                        value: profile.molecularProfileId
                    };
                });
            return (
                <div>
                    <div
                        style = {{
                            display: "flex",
                            alignItems: "center",
                            padding: "5px"
                        }}
                    >
                        <span>Subject Profile:</span>
                        <div style={{display:"inline-block", width:376, marginLeft:4, marginRight:4, zIndex:15 /* so that on top when opened*/}}>
                            <Select
                                name="subject-profile-select"
                                value={this.isSelectedGeneticEntityAGeneSet ? this.selectedSubjectProfileGeneset.molecularProfileId : this.selectedSubjectProfileGene.molecularProfileId}
                                onChange={this.isSelectedGeneticEntityAGeneSet ? this.onSelectSubjectProfileGeneset : this.onSelectSubjectProfileGene}
                                options={this.isSelectedGeneticEntityAGeneSet ? subjectOptionsGeneset : subjectOptionsGene}
                                searchable={false}
                                clearable={false}
                                disabled={this.isSelectedGeneticEntityAGeneSet ? true : false}
                                className="coexpression-select-subject-profile"
                            />
                        </div>
                    </div>
                    <div
                    style = {{
                        display: "flex",
                        alignItems: "center",
                        padding: "5px"
                    }}
                    >
                        <span>Query Profile:</span>
                        <div style={{display:"inline-block", width:376, marginLeft:4, marginRight:4, zIndex:10 /* so that on top when opened*/}}>
                            <Select
                                name="query-profile-select"
                                value={this.selectedQueryProfile.molecularProfileId}
                                onChange={this.onSelectQueryProfile}
                                options={queryOptions}
                                searchable={false}
                                clearable={false}
                                className="coexpression-select-query-profile"
                            />
                        </div>
                    </div>
                </div>
            );
        } else {
            return <LoadingIndicator isLoading={true} center={true}/>;
        }
    }

    @bind
    private header() {
        return (
            <div style={{marginBottom:20}}>
                {this.profilesSelector}
            </div>
        );
    }

    @bind
    private geneTabs() {
        if (this.selectedSubjectProfileGene && this.selectedSubjectProfileGeneset &&
            this.selectedQueryProfile && this.selectedGeneticEntityId !== undefined &&
            this.props.store.geneticEntities && 
            this.props.store.coexpressionTabMolecularSubjectProfilesGene.isComplete &&
            this.props.store.coexpressionTabMolecularSubjectProfilesGeneset.isComplete &&
            this.props.store.coexpressionTabMolecularQueryProfiles.isComplete) {
            const coExpressionVizElements = [];
            for (const geneticEntity of this.props.store.geneticEntities) {
                for (const subjectProfile of (geneticEntity.geneticEntityType === "gene" ? this.props.store.coexpressionTabMolecularSubjectProfilesGene.result :
                this.props.store.coexpressionTabMolecularSubjectProfilesGeneset.result)) {
                    for (const queryProfile of this.props.store.coexpressionTabMolecularQueryProfiles.result) {
                        coExpressionVizElements.push(
                            <CoExpressionViz
                                key={`${geneticEntity.geneticEntityId},${subjectProfile.molecularProfileId},${queryProfile.molecularProfileId}`}
                                coExpressionCache={this.coExpressionCache}
                                geneticEntity={geneticEntity}
                                subjectProfile={subjectProfile}
                                queryProfile={queryProfile}
                                numericGeneMolecularDataCache={this.props.store.numericGeneMolecularDataCache}
                                numericGenesetMolecularDataCache={this.props.store.numericGenesetMolecularDataCache}
                                mutationCache={this.hasMutationData ? this.props.store.mutationCache : undefined}
                                hidden={
                                    (subjectProfile.molecularProfileId !== (geneticEntity.geneticEntityType === "gene" ?this.selectedSubjectProfileGene!.molecularProfileId : 
                                        this.selectedSubjectProfileGeneset!.molecularProfileId)) ||
                                    (queryProfile.molecularProfileId !== this.selectedQueryProfile!.molecularProfileId) ||
                                    (String(geneticEntity.geneticEntityId) !== this.selectedGeneticEntityId!)
                                }
                                plotState={this.plotState}
                                plotHandlers={this.plotHandlers}
                                coverageInformation={this.props.store.coverageInformation}
                                studyToMutationMolecularProfile={this.props.store.studyToMutationMolecularProfile}
                            />
                        );
                    }
                }
                
            }

            return (
                <div>
                    <MSKTabs
                        id="coexpressionTabGeneTabs"
                        activeTabId={this.selectedGeneticEntityId}
                        onTabClick={this.onSelectGeneticEntity}
                        className="coexpressionTabGeneTabs pillTabs"
                        unmountOnHide={true}
                        tabButtonStyle="pills"
                        enablePagination={false}
                        arrowStyle={{'line-height':0.8}}
                    >
                        {this.props.store.geneticEntities!.map((geneticEntity:GeneticEntity, i:number)=>{
                            return (
                                <MSKTab
                                    key={i}
                                    id={String(geneticEntity.geneticEntityId)}
                                    linkText={geneticEntity.geneticEntityName}
                                >
                                </MSKTab>
                            );
                        })}
                    </MSKTabs>
                    <Observer>
                        {this.header}
                    </Observer>
                    {coExpressionVizElements}
                </div>
            );
        } else {
            return (
                <LoadingIndicator isLoading={true} center={true}/>
            );
        }
    }


    render() {
        let divContents = null;
        if (this.props.store.coexpressionTabMolecularSubjectProfilesGene.isComplete &&
            this.props.store.coexpressionTabMolecularSubjectProfilesGene.result.length > 0 &&
            this.props.store.coexpressionTabMolecularSubjectProfilesGeneset.isComplete &&
            this.props.store.coexpressionTabMolecularSubjectProfilesGeneset.result.length > 0 &&
            this.props.store.coexpressionTabMolecularQueryProfiles.isComplete &&
            this.props.store.coexpressionTabMolecularQueryProfiles.result.length > 0) {
            divContents = (
                <div>
                    <Observer>
                        {this.geneTabs}
                    </Observer>
                </div>
            );
        } else {
            divContents = (
                <div className={'alert alert-info'}>
                    There are no available profiles in the queried studies.
                </div>
            );
        }

        const status = getMobxPromiseGroupStatus(
          this.props.store.genes,
          this.props.store.molecularProfileIdToProfiledSampleCount,
          this.props.store.coexpressionTabMolecularSubjectProfilesGene,
          this.props.store.coexpressionTabMolecularSubjectProfilesGeneset,
          this.props.store.coexpressionTabMolecularQueryProfiles
        );

        return (
            <div data-test="coExpressionTabDiv">
                <div className={"tabMessageContainer"}>
                    <OqlStatusBanner className="coexp-oql-status-banner" store={this.props.store} tabReflectsOql={false}/>
                </div>

                { (status==="complete") && divContents }

                <LoadingIndicator center={true} size={"big"} isLoading={status==="pending"}/>

            </div>
        );
    }
}