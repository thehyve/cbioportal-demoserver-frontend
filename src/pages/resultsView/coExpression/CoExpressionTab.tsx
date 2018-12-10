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

export class CoExpressionCache extends MobxPromiseCache<{profileX: MolecularProfile, 
    profileY: MolecularProfile, geneticEntityId: string,
    geneticEntityType: string, allData:boolean}, MolecularProfileCorrelation[]> {}

@observer
export default class CoExpressionTab extends React.Component<ICoExpressionTabProps, {}> {
    @observable _selectedProfileXGene:MolecularProfile|undefined; // only undefined initially, until molecular profiles downloaded
    @observable _selectedProfileXGeneset:MolecularProfile|undefined; // only undefined initially, until molecular profiles downloaded
    @observable _selectedProfileY:MolecularProfile|undefined; // only undefined initially, until molecular profiles downloaded
    @observable _selectedGeneticEntityId:string | undefined; // only undefined initially, until genes and gene sets downloaded
    @observable _geneticEntities:GeneticEntity[] | undefined; // only undefined initially, until genes and gene sets downloaded
    @observable _selectedGeneticEntityName:string| undefined; // only undefined initially, until genes and gene sets downloaded
    @observable _isSelectedGeneticEntityAGeneSet = false;

    @computed get selectedProfileXGene():MolecularProfile|undefined {
        if (!this._selectedProfileXGene && this.props.store.coexpressionTabMolecularProfilesXGene.isComplete
                && this.props.store.coexpressionTabMolecularProfilesXGene.result.length > 0) {
                    return this.props.store.coexpressionTabMolecularProfilesXGene.result[0];
        } else {
            return this._selectedProfileXGene;
        }
    }

    @computed get selectedProfileXGeneset():MolecularProfile|undefined {
        if (!this._selectedProfileXGeneset && this.props.store.coexpressionTabMolecularProfilesXGeneset.isComplete
                && this.props.store.coexpressionTabMolecularProfilesXGeneset.result.length > 0) {
                    return this.props.store.coexpressionTabMolecularProfilesXGeneset.result[0];
        } else {
            return this._selectedProfileXGeneset;
        }
    }

    @computed get selectedProfileY():MolecularProfile|undefined {
        if (!this._selectedProfileY && this.props.store.coexpressionTabMolecularProfilesY.isComplete
            && this.props.store.coexpressionTabMolecularProfilesY.result.length > 0) {
            return this.props.store.coexpressionTabMolecularProfilesY.result[0];
        } else {
            return this._selectedProfileY;
        }
    }

    @computed get selectedGeneticEntityId():string | undefined {
        if (!this._selectedGeneticEntityId && this.props.store.geneticEntities !== undefined) {
            return this.props.store.geneticEntities[0].geneticEntityId.toString();
        } else {
            return this._selectedGeneticEntityId;
        }
    }

    @computed get isSelectedGeneticEntityAGeneSet(): boolean {
        if (this._selectedGeneticEntityId !== undefined) {
            for (const geneticEntity of this.props.store.geneticEntities!) {
                if (geneticEntity.geneticEntityType === "geneset" && geneticEntity.geneticEntityId.toString() === this._selectedGeneticEntityId) {
                    return true;
                }
            }
            return false;
        } else {
            return this._isSelectedGeneticEntityAGeneSet;
        }
    }

    @computed get selectedGeneticEntityName(): string | undefined {
        if (this.props.store.geneticEntities !== undefined) {
            if (this._selectedGeneticEntityId !== undefined) {
                for (const geneticEntity of this.props.store.geneticEntities) {
                    if (this._selectedGeneticEntityId === geneticEntity.geneticEntityId.toString()) {
                        return geneticEntity.geneticEntityName;
                    }
                }
                return this._selectedGeneticEntityName; //Expected not to reach this code, if so, it will return undefined
            } else {
                return this.props.store.geneticEntities[0].geneticEntityName;
            }
        } else {
            return this._selectedGeneticEntityName; //Expected not to reach this code, if so, it will return undefined
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
    public onSelectProfileXGene(option:any) {
        if (this.props.store.molecularProfileIdToMolecularProfile.isComplete) {
            this._selectedProfileXGene = this.props.store.molecularProfileIdToMolecularProfile.result[option.value];
        }
    }

    @bind
    public onSelectProfileXGeneset(option:any) {
        if (this.props.store.molecularProfileIdToMolecularProfile.isComplete) {
            this._selectedProfileXGeneset = this.props.store.molecularProfileIdToMolecularProfile.result[option.value];
        }
    }

    @bind
    public onSelectProfileY(option:any) {
        if (this.props.store.molecularProfileIdToMolecularProfile.isComplete) {
            this._selectedProfileY = this.props.store.molecularProfileIdToMolecularProfile.result[option.value];
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

    private coExpressionCache:CoExpressionCache = new CoExpressionCache(
        q=>({
            invoke: ()=>{
                let threshold = 0.3;
                if (q.allData) {
                    threshold = 0;
                }
                const dataQueryFilter = this.props.store.studyToDataQueryFilter.result![q.profileX.studyId];
                if (dataQueryFilter) {
                    // TODO: this sorts by p value asc first, so we can fake
                    // multi column sort when sorting by q value afterwards. We
                    // can remove this after implementing multi-sort
                    return internalClient.fetchCoExpressionsUsingPOST_1({
                        molecularProfileIdA: q.profileX.molecularProfileId,
                        molecularProfileIdB: q.profileY.molecularProfileId,
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
        q=>`${q.geneticEntityId},${q.profileX.molecularProfileId},${q.profileY.molecularProfileId}`
    );

    private get profilesSelector() {
        if (this.selectedProfileXGene &&
            this.selectedProfileXGeneset &&
            this.selectedProfileY &&
            this.selectedGeneticEntityId &&
            this.props.store.molecularProfileIdToProfiledSampleCount.isComplete &&
            this.props.store.coexpressionTabMolecularProfilesXGene.isComplete &&
            this.props.store.coexpressionTabMolecularProfilesXGeneset.isComplete &&
            this.props.store.coexpressionTabMolecularProfilesY.isComplete &&
            this.props.store.coexpressionTabMolecularProfilesY.isComplete) {
            const subjectOptionsGene = this.props.store.coexpressionTabMolecularProfilesXGene.result.map(profile=>{
                const profiledSampleCount = this.props.store.molecularProfileIdToProfiledSampleCount.result![profile.molecularProfileId];
                return {
                    label: `${profile.name} (${profiledSampleCount} sample${profiledSampleCount !== 1 ? "s" : ""})`,
                    value: profile.molecularProfileId
                };
            });
            const subjectOptionsGeneset = this.props.store.coexpressionTabMolecularProfilesXGeneset.result.map(profile=>{
                const profiledSampleCount = this.props.store.molecularProfileIdToProfiledSampleCount.result![profile.molecularProfileId];
                return {
                    label: `${profile.name} (${profiledSampleCount} sample${profiledSampleCount !== 1 ? "s" : ""})`,
                    value: profile.molecularProfileId
                };
            });
            const queryOptions = this.props.store.coexpressionTabMolecularProfilesY.result.map(profile=>{
                    const profiledSampleCount = this.props.store.molecularProfileIdToProfiledSampleCount.result![profile.molecularProfileId];
                    return {
                        label: `${profile.name} (${profiledSampleCount} sample${profiledSampleCount !== 1 ? "s" : ""})`,
                        value: profile.molecularProfileId
                    };
                });
            return (
                <div>
                <div style={{width: '39.5vw'}}>
                <div 
                    style= {{
                             float: "left",
                             width: "100%"
                            }}
                        >
                    <div
                        style = {{
                            display: "flex",
                            alignItems: "center",
                            padding: "5px",
                            float: "right"
                        }}
                    >
                        { <span> {this.selectedGeneticEntityName!.length > 28 ? this.selectedGeneticEntityName!.substring(0, 28 - 3) + "..." : 
                            this.selectedGeneticEntityName} Profile:</span>}
                        <div style={{display:"inline-block", width:376, marginLeft:4, marginRight:4, zIndex:15 /* so that on top when opened*/}}>
                            <Select
                                name="subject-profile-select"
                                value={this.isSelectedGeneticEntityAGeneSet ? this.selectedProfileXGeneset.molecularProfileId : this.selectedProfileXGene.molecularProfileId}
                                onChange={this.isSelectedGeneticEntityAGeneSet ? this.onSelectProfileXGeneset : this.onSelectProfileXGene}
                                options={this.isSelectedGeneticEntityAGeneSet ? subjectOptionsGeneset : subjectOptionsGene}
                                searchable={false}
                                clearable={false}
                                disabled={this.isSelectedGeneticEntityAGeneSet}
                                className="coexpression-select-subject-profile"
                            />
                        </div>
                    </div>
                    <br />
                    <br />
                    <br />
                    <div
                        style = {{
                            display: "flex",
                            alignItems: "center",
                            padding: "5px",
                            float: "right"
                        }}
                    >
                        <span>Query Profile:</span>
                        <div style={{display:"inline-block", width:376, marginLeft:4, marginRight:4, zIndex:10 /* so that on top when opened*/}}>
                            <Select
                                name="query-profile-select"
                                value={this.selectedProfileY.molecularProfileId}
                                onChange={this.onSelectProfileY}
                                options={queryOptions}
                                searchable={false}
                                clearable={false}
                                className="coexpression-select-query-profile"
                            />
                        </div>
                    </div>
                </div>
                </div>
                <div style={{width: '70vw', overflow: 'auto'}}></div>
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
        if (this.selectedProfileXGene && this.selectedProfileXGeneset &&
            this.selectedProfileY && this.selectedGeneticEntityId !== undefined &&
            this.props.store.geneticEntities && 
            this.props.store.coexpressionTabMolecularProfilesXGene.isComplete &&
            this.props.store.coexpressionTabMolecularProfilesXGeneset.isComplete &&
            this.props.store.coexpressionTabMolecularProfilesY.isComplete) {
            const coExpressionVizElements = [];
            for (const geneticEntity of this.props.store.geneticEntities) {
                for (const profileX of (geneticEntity.geneticEntityType === "gene" ? this.props.store.coexpressionTabMolecularProfilesXGene.result :
                this.props.store.coexpressionTabMolecularProfilesXGeneset.result)) {
                    for (const profileY of this.props.store.coexpressionTabMolecularProfilesY.result) {
                        coExpressionVizElements.push(
                            <CoExpressionViz
                                key={`${geneticEntity.geneticEntityId},${profileX.molecularProfileId},${profileY.molecularProfileId}`}
                                coExpressionCache={this.coExpressionCache}
                                geneticEntity={geneticEntity}
                                profileX={profileX}
                                profileY={profileY}
                                numericGeneMolecularDataCache={this.props.store.numericGeneMolecularDataCache}
                                numericGenesetMolecularDataCache={this.props.store.numericGenesetMolecularDataCache}
                                mutationCache={this.hasMutationData ? this.props.store.mutationCache : undefined}
                                hidden={
                                    (profileX.molecularProfileId !== (geneticEntity.geneticEntityType === "gene" ?this.selectedProfileXGene!.molecularProfileId : 
                                        this.selectedProfileXGeneset!.molecularProfileId)) ||
                                    (profileY.molecularProfileId !== this.selectedProfileY!.molecularProfileId) ||
                                    (geneticEntity.geneticEntityId.toString() !== this.selectedGeneticEntityId!)
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
                                    id={geneticEntity.geneticEntityId.toString()}
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
        if (this.props.store.coexpressionTabMolecularProfilesXGene.isComplete &&
            this.props.store.coexpressionTabMolecularProfilesXGene.result.length > 0 &&
            this.props.store.coexpressionTabMolecularProfilesXGeneset.isComplete &&
            this.props.store.coexpressionTabMolecularProfilesXGeneset.result.length > 0 &&
            this.props.store.coexpressionTabMolecularProfilesY.isComplete &&
            this.props.store.coexpressionTabMolecularProfilesY.result.length > 0) {
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
          this.props.store.coexpressionTabMolecularProfilesXGene,
          this.props.store.coexpressionTabMolecularProfilesXGeneset,
          this.props.store.coexpressionTabMolecularProfilesY
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