import React from 'react';
import { Observer, observer } from 'mobx-react';
import { action, computed } from 'mobx';
import autobind from 'autobind-decorator';
import { TimelineEvent, TimelineStore } from 'cbioportal-clinical-timeline';
import SampleMarker from './SampleMarker';
import { ISampleMetaDeta } from 'pages/patientView/timeline2/TimelineWrapper';
import { CoverageInformation } from '../../resultsView/ResultsViewPageStoreUtils';
import { Mutation, Sample } from 'cbioportal-ts-api-client';
import { computeRenderData, IPoint } from '../mutation/VAFLineChartUtils';
import PatientViewMutationsDataStore from '../mutation/PatientViewMutationsDataStore';
import _ from 'lodash';
import { Popover } from 'react-bootstrap';
import ComplexKeyMap from '../../../shared/lib/complexKeyDataStructures/ComplexKeyMap';
import classnames from 'classnames';
import { Portal } from 'react-portal';
import survivalStyles from '../../resultsView/survival/styles.module.scss';
import styles from '../mutation/styles.module.scss';
import {
    MutationStatus,
    mutationTooltip,
} from '../mutation/PatientViewMutationsTabUtils';
import SampleManager, { clinicalValueToSamplesMap } from '../SampleManager';
import { stringListToIndexSet } from 'cbioportal-frontend-commons';
import { makeUniqueColorGetter } from '../../../shared/components/plots/PlotUtils';
import { GROUP_BY_NONE } from './VAFChartControls';
import TimelineWrapperStore from './TimelineWrapperStore';
import { CustomTrackSpecification } from 'cbioportal-clinical-timeline/dist/CustomTrack';

interface IVAFChartProps {
    dataStore: PatientViewMutationsDataStore;
    store: TimelineStore;
    wrapperStore: TimelineWrapperStore;
    sampleMetaData: ISampleMetaDeta;
    samples: Sample[];
    mutationProfileId: string;
    coverageInformation: CoverageInformation;
    sampleManager: SampleManager;
}

const HIGHLIGHT_LINE_STROKE_WIDTH = 6;
const HIGHLIGHT_COLOR = '#318ec4';
const SCATTER_DATA_POINT_SIZE = 3;
const MIN_LOG_ARG = 0.001;

const VAFPoint: React.FunctionComponent<{
    x: number;
    y: number;
    color: string;
    tooltipDatum: {
        sampleId: string;
        vaf: number;
        mutationStatus: MutationStatus;
    } | null;
    mutation: Mutation;
    dataStore: PatientViewMutationsDataStore;
    wrapperStore: TimelineWrapperStore;
}> = function({
    x,
    y,
    color,
    tooltipDatum,
    mutation,
    dataStore,
    wrapperStore,
}) {
    const onMouseOverEvent = (mouseEvent: any) => {
        wrapperStore.setTooltipModel(tooltipDatum, mutation, mouseEvent, true);
        dataStore.setMouseOverMutation(mutation);
    };

    const onMouseOutEvent = (mouseEvent: any) => {
        wrapperStore.setTooltipModel(null, null, mouseEvent, true);
        dataStore.setMouseOverMutation(null);
    };

    const onMouseClickEvent = (mouseEvent: any) => {
        dataStore.toggleSelectedMutation(mutation);
    };

    const onMouseMoveEvent = (mouseEvent: any) => {
        mouseEvent.persist();
        wrapperStore.setTooltipModel(tooltipDatum, mutation, mouseEvent, true);
        dataStore.setMouseOverMutation(mutation);
    };

    return (
        <g>
            <path
                d={`M ${x}, ${y}
                            m -3, 0
                            a 3, 3 0 1,0 6,0
                            a 3, 3 0 1,0 -6,01`}
                role="presentation"
                shape-rendering="auto"
                style={{
                    stroke: `${color}`,
                    fill: 'white',
                    strokeWidth: 2,
                    opacity: 1,
                }}
                onMouseOver={onMouseOverEvent}
                onMouseOut={onMouseOutEvent}
                onClick={onMouseClickEvent}
                onMouseMove={onMouseMoveEvent}
            />
        </g>
    );
};

const VAFPointConnector: React.FunctionComponent<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    tooltipDatum: {
        sampleId: string;
        vaf: number;
        mutationStatus: MutationStatus;
    } | null;
    mutation: Mutation;
    dataStore: PatientViewMutationsDataStore;
    wrapperStore: TimelineWrapperStore;
}> = function({
    x1,
    y1,
    x2,
    y2,
    color,
    tooltipDatum,
    mutation,
    dataStore,
    wrapperStore,
}) {
    const onMouseOverEvent = (mouseEvent: any) => {
        wrapperStore.setTooltipModel(tooltipDatum, mutation, mouseEvent, false);
        dataStore.setMouseOverMutation(mutation);
    };

    const onMouseOutEvent = (mouseEvent: any) => {
        wrapperStore.setTooltipModel(null, null, mouseEvent, false);
        dataStore.setMouseOverMutation(null);
    };

    const onMouseClickEvent = (mouseEvent: any) => {
        dataStore.toggleSelectedMutation(mutation);
    };

    const onMouseMoveEvent = (mouseEvent: any) => {
        mouseEvent.persist();
        wrapperStore.setTooltipModel(tooltipDatum, mutation, mouseEvent, false);
        dataStore.setMouseOverMutation(mutation);
    };

    return (
        <g>
            <path
                d={`M${x1},${y1}L${x2},${y2}`}
                role="presentation"
                shape-rendering="auto"
                style={{
                    fill: `white`,
                    stroke: `${color}`,
                    strokeOpacity: 0.5,
                    opacity: 1,
                    strokeWidth: 2,
                }}
                onMouseOver={onMouseOverEvent}
                onMouseOut={onMouseOutEvent}
                onClick={onMouseClickEvent}
                onMouseMove={onMouseMoveEvent}
            ></path>
        </g>
    );
};

@observer
export default class VAFChart extends React.Component<IVAFChartProps, {}> {
    @computed get sampleEvents() {
        return this.props.store.allItems.filter(
            event => event.event!.eventType === 'SPECIMEN'
        );
    }

    @computed get headerHeight() {
        return 20;
    }

    @computed get dataHeight() {
        return 200;
    }

    @action
    recalculateTotalHeight() {
        let footerHeight: number = 0;
        let yPosition = this.sampleIdToYPosition;
        for (let index in yPosition) {
            if (yPosition[index] > footerHeight)
                footerHeight = yPosition[index];
        }
        footerHeight = footerHeight + 20;

        this.props.wrapperStore.setVafChartHeight(
            _.sum([this.dataHeight, footerHeight])
        );

        return _.sum([this.dataHeight, footerHeight]);
    }

    @computed get mutations() {
        if (this.props.wrapperStore.onlyShowSelectedInVAFChart) {
            return this.props.dataStore.allData.filter(m =>
                this.props.dataStore.isMutationSelected(m[0])
            );
        } else {
            return this.props.dataStore.allData;
        }
    }

    @computed get renderData() {
        return computeRenderData(
            this.props.samples,
            this.mutations,
            this.props.sampleManager.sampleIdToIndexMap,
            this.props.mutationProfileId,
            this.props.coverageInformation,
            this.props.wrapperStore.groupByOption!,
            this.sampleIdToClinicalValue
        );
    }

    @computed get lineData() {
        let scaledData: IPoint[][] = [];
        this.renderData.lineData.map((dataPoints: IPoint[], index: number) => {
            scaledData[index] = [];
            dataPoints.map((dataPoint: IPoint, i: number) => {
                scaledData[index].push({
                    x: this.xPosition[dataPoint.sampleId],
                    y: this.yPosition[dataPoint.y],
                    sampleId: dataPoint.sampleId,
                    mutation: dataPoint.mutation,
                    mutationStatus: dataPoint.mutationStatus,
                });
            });
        });
        return scaledData;
    }

    @computed get mutationToDataPoints() {
        const map = new ComplexKeyMap<IPoint[]>();
        for (const lineData of this.lineData) {
            map.set(
                {
                    hugoGeneSymbol: lineData[0].mutation.gene.hugoGeneSymbol,
                    proteinChange: lineData[0].mutation.proteinChange,
                },
                lineData
            );
        }
        return map;
    }

    @computed get xPosition() {
        let positionList: { [sampleId: string]: number } = {};
        this.sampleEvents.forEach((sample, i) => {
            sample.event.attributes.forEach((attribute: any, i: number) => {
                if (attribute.key === 'SAMPLE_ID') {
                    positionList[
                        attribute.value
                    ] = this.props.store.getPosition(sample)!.pixelLeft;
                }
            });
        });
        return positionList;
    }

    @computed get sampleGroups() {
        let sampleGroups: { [groupIndex: number]: string[] } = {};
        this.sampleEvents.forEach((sample, i) => {
            sample.event.attributes.forEach((attribute: any, i: number) => {
                if (attribute.key === 'SAMPLE_ID') {
                    // check the group value of this sample id
                    console.info(
                        'Sample id ' +
                            attribute.value +
                            ' is in group ' +
                            this.sampleIdToClinicalValue[attribute.value]
                    );
                    if (
                        sampleGroups[
                            this.clinicalValuesForGrouping.indexOf(
                                this.sampleIdToClinicalValue[attribute.value]
                            )
                        ] == undefined
                    )
                        sampleGroups[
                            this.clinicalValuesForGrouping.indexOf(
                                this.sampleIdToClinicalValue[attribute.value]
                            )
                        ] = [];
                    sampleGroups[
                        this.clinicalValuesForGrouping.indexOf(
                            this.sampleIdToClinicalValue[attribute.value]
                        )
                    ].push(attribute.value);
                }
            });
        });
        return sampleGroups;
    }

    @computed get yPosition() {
        let scaledY: { [originalY: number]: number } = {};
        let minY = this.dataHeight,
            maxY = 0;
        this.renderData.lineData.forEach((data: IPoint[], index: number) => {
            data.forEach((d: IPoint, i: number) => {
                if (this.props.wrapperStore.vafChartLogScale)
                    scaledY[d.y] =
                        this.dataHeight -
                        (Math.log10(Math.max(MIN_LOG_ARG, d.y)) / 2 + 1) *
                            this.dataHeight;
                else scaledY[d.y] = this.dataHeight - d.y * this.dataHeight;
                if (scaledY[d.y] < minY) minY = scaledY[d.y];
                if (scaledY[d.y] > maxY) maxY = scaledY[d.y];
            });
        });

        if (
            this.props.wrapperStore.vafChartYAxisToDataRange &&
            (minY > 0 || maxY < this.dataHeight)
        ) {
            // recalculate scaledY for this range only
            this.renderData.lineData.forEach(
                (data: IPoint[], index: number) => {
                    data.forEach((d: IPoint, i: number) => {
                        scaledY[d.y] =
                            ((this.dataHeight - 1) * (scaledY[d.y] - minY)) /
                                (maxY - minY) +
                            1;
                    });
                }
            );
        }
        return scaledY;
    }

    @computed get sampleIdOrder() {
        return stringListToIndexSet(
            this.props.sampleManager.getSampleIdsInOrder()
        );
    }

    @computed get clinicalValueToColor() {
        let clinicalValueToColor: { [clinicalValue: string]: string } = {};
        const uniqueColorGetter = makeUniqueColorGetter();
        const map = clinicalValueToSamplesMap(
            this.props.sampleManager.samples,
            this.props.wrapperStore.groupByOption!
        );
        map.forEach((sampleList: string[], clinicalValue: any) => {
            clinicalValueToColor[clinicalValue] = uniqueColorGetter();
        });
        return clinicalValueToColor;
    }

    @computed get clinicalValuesForGrouping() {
        let clinicalValuesForGrouping: string[] = [];
        const uniqueColorGetter = makeUniqueColorGetter();
        const map = clinicalValueToSamplesMap(
            this.props.sampleManager.samples,
            this.props.wrapperStore.groupByOption!
        );
        map.forEach((sampleList: string[], clinicalValue: any) => {
            clinicalValuesForGrouping.push(clinicalValue);
        });
        return clinicalValuesForGrouping;
    }

    @computed get sampleIdToClinicalValue() {
        let sampleIdToClinicalValue: { [sampleId: string]: string } = {};
        if (this.groupingByIsSelected) {
            this.props.sampleManager.samples.forEach((sample, i) => {
                sampleIdToClinicalValue[
                    sample.id
                ] = SampleManager!.getClinicalAttributeInSample(
                    sample,
                    this.props.wrapperStore.groupByOption!
                )!.value;
            });
        }
        return sampleIdToClinicalValue;
    }

    @computed get groupingByIsSelected() {
        return !(
            this.props.wrapperStore.groupByOption == null ||
            this.props.wrapperStore.groupByOption === GROUP_BY_NONE
        );
    }

    @computed get sampleIdToYPosition() {
        // compute sample y position on the x-axis footer
        let yStart = -5.5;
        let yPositions: { [sampleId: string]: number } = {};
        let xCount: number[] = [];
        this.sampleEvents.map((event: TimelineEvent, i: number) => {
            const sampleId = event.event!.attributes.find(
                (att: any) => att.key === 'SAMPLE_ID'
            );
            const x = this.xPosition[sampleId.value];
            xCount[x] = xCount[x] ? xCount[x] + 1 : 1;
            yPositions[sampleId.value] = yStart + xCount[x] * 15;
        });
        return yPositions;
    }

    @computed get groupIndexToTrackHeight() {
        return _.mapValues(this.sampleGroups, (sampleIds: string[]) => {
            const yPositions = _(sampleIds)
                .map((i: string) => this.sampleIdToYPosition[i])
                .uniq()
                .value();
            return yPositions.length * 20; // FIXME do lookup height in TimelineLib
        });
    }

    @autobind
    private getHighlights() {
        const highlightedMutations = [];
        if (!this.props.wrapperStore.onlyShowSelectedInVAFChart) {
            // dont bold highlighted mutations if we're only showing highlighted mutations
            highlightedMutations.push(
                ...this.props.dataStore.selectedMutations
            );
        }
        // Using old functionality to get mouseOverMUtation from PatientsViewMutationDataStore
        // so highlighting a mutation in the VAF chart will highlight it also in the mutation table.
        // Also if multiple VAF charts are present in the page all will share the highlighting.
        // If this is not desired, comment the following line and uncomment the next.
        const mouseOverMutation = this.props.dataStore.getMouseOverMutation();
        /*const mouseOverMutation = this.props.wrapperStore.tooltipModel
            ? this.props.wrapperStore.tooltipModel.mutation
            : null;*/

        if (mouseOverMutation) {
            highlightedMutations.push(mouseOverMutation);
        }
        if (highlightedMutations.length > 0) {
            return highlightedMutations.map(highlightedMutation => {
                const points = this.mutationToDataPoints.get({
                    proteinChange: highlightedMutation.proteinChange,
                    hugoGeneSymbol: highlightedMutation.gene.hugoGeneSymbol,
                });

                if (!points) {
                    return <g />;
                }
                let linePath = null;
                if (points.length > 1) {
                    // more than one point -> we should render a path
                    let d = `M ${points[0].x} ${points[0].y}`;
                    for (let i = 1; i < points.length; i++) {
                        d = `${d} L ${points[i].x} ${points[i].y}`;
                    }
                    linePath = (
                        <path
                            style={{
                                stroke: HIGHLIGHT_COLOR,
                                strokeOpacity: 1,
                                strokeWidth: HIGHLIGHT_LINE_STROKE_WIDTH,
                                fillOpacity: 0,
                                pointerEvents: 'none',
                            }}
                            d={d}
                        />
                    );
                }
                const pointPaths = points.map(point => (
                    <path
                        d={`M ${point.x} ${point.y}
                            m -${SCATTER_DATA_POINT_SIZE}, 0
                            a ${SCATTER_DATA_POINT_SIZE}, ${SCATTER_DATA_POINT_SIZE} 0 1,0 ${2 *
                            SCATTER_DATA_POINT_SIZE},0
                            a ${SCATTER_DATA_POINT_SIZE}, ${SCATTER_DATA_POINT_SIZE} 0 1,0 ${-2 *
                            SCATTER_DATA_POINT_SIZE},0
                            `}
                        style={{
                            stroke: HIGHLIGHT_COLOR,
                            fill: 'white',
                            strokeWidth: 2,
                            opacity: 1,
                            pointerEvents: 'none',
                        }}
                    />
                ));

                return (
                    <g>
                        {linePath}
                        {pointPaths}
                    </g>
                );
            });
        } else {
            return <g />;
        }
    }

    private tooltipFunction(tooltipData: any) {
        return mutationTooltip(
            tooltipData.mutation,
            tooltipData.tooltipOnPoint
                ? {
                      mutationStatus: tooltipData.datum.mutationStatus,
                      sampleId: tooltipData.datum.sampleId,
                      vaf: tooltipData.datum.vaf,
                  }
                : undefined
        );
    }

    @autobind
    private getTooltipComponent() {
        let mutationTooltip = this.props.wrapperStore.tooltipModel;
        if (
            !mutationTooltip ||
            mutationTooltip.mouseEvent == null ||
            mutationTooltip.mutation == null ||
            mutationTooltip.datum == null
        ) {
            return <span />;
        } else {
            let tooltipPlacement =
                mutationTooltip.mouseEvent.clientY < 250 ? 'bottom' : 'top';
            return (
                <Portal isOpened={true} node={document.body}>
                    <Popover
                        className={classnames(
                            'cbioportal-frontend',
                            'cbioTooltip',
                            survivalStyles.Tooltip,
                            styles.Tooltip
                        )}
                        positionLeft={mutationTooltip.mouseEvent.pageX}
                        positionTop={
                            mutationTooltip.mouseEvent.pageY +
                            (tooltipPlacement === 'top' ? -7 : 7)
                        }
                        style={{
                            transform:
                                tooltipPlacement === 'top'
                                    ? 'translate(-50%,-100%)'
                                    : 'translate(-50%,0%)',
                            maxWidth: 400,
                        }}
                        placement={tooltipPlacement}
                    >
                        {this.tooltipFunction(mutationTooltip)}
                    </Popover>
                </Portal>
            );
        }
    }

    @action
    // Update store with groupBy sample tracks
    setGroupByTracks() {
        const tracks: CustomTrackSpecification[] = [];
        _.forIn(this.sampleGroups, (sampleIds: string[], key: string) => {
            const index = parseInt(key);
            tracks.push({
                renderHeader: () => this.groupByTrackLabel(index),
                renderTrack: () => this.sampeIconsGroupByTrack(sampleIds),
                height: () => this.groupIndexToTrackHeight[index],
                labelForExport: this.clinicalValuesForGrouping[index],
            });
        });
        this.props.wrapperStore.groupByTracks = tracks;
    }

    render() {
        // FIXME move out of render method
        if (this.groupingByIsSelected) this.setGroupByTracks();

        return (
            <svg
                width={this.props.store.pixelWidth}
                height={this.recalculateTotalHeight()}
            >
                {this.renderData.lineData.map(
                    (data: IPoint[], index: number) => {
                        return data.map((d: IPoint, i: number) => {
                            let x1 = this.xPosition[d.sampleId],
                                x2;
                            let y1 = this.yPosition[d.y],
                                y2;

                            const nextPoint: IPoint = data[i + 1];
                            if (nextPoint) {
                                x2 = this.xPosition[nextPoint.sampleId];
                                y2 = this.yPosition[nextPoint.y];
                            }

                            let tooltipDatum: {
                                mutationStatus: MutationStatus;
                                sampleId: string;
                                vaf: number;
                            } = {
                                mutationStatus: d.mutationStatus,
                                sampleId: d.sampleId,
                                vaf: d.y,
                            };

                            const color = this.groupingByIsSelected
                                ? this.groupColorBySampleId(d.sampleId)
                                : 'rgb(0,0,0)';

                            return (
                                <g>
                                    {x2 && y2 && (
                                        <VAFPointConnector
                                            x1={x1}
                                            y1={y1}
                                            x2={x2}
                                            y2={y2}
                                            color={color}
                                            tooltipDatum={tooltipDatum}
                                            mutation={d.mutation}
                                            dataStore={this.props.dataStore}
                                            wrapperStore={
                                                this.props.wrapperStore
                                            }
                                        />
                                    )}
                                    <VAFPoint
                                        x={x1}
                                        y={y1}
                                        color={color}
                                        tooltipDatum={tooltipDatum}
                                        mutation={d.mutation}
                                        dataStore={this.props.dataStore}
                                        wrapperStore={this.props.wrapperStore}
                                    />
                                </g>
                            );
                        });
                    }
                )}

                {!this.groupingByIsSelected && this.sampleIcons()}
                <Observer>{this.getHighlights}</Observer>
                <Observer>{this.getTooltipComponent}</Observer>
            </svg>
        );
    }

    @autobind
    sampleIcons() {
        const svg = (
            <g transform={`translate(0,${this.dataHeight})`}>
                {this.sampleEvents.map((event: TimelineEvent, i: number) => {
                    const sampleId = event.event!.attributes.find(
                        (att: any) => att.key === 'SAMPLE_ID'
                    );
                    return this.sampleIcon(sampleId.value);
                })}
            </g>
        );
        return svg;
    }

    @autobind
    sampeIconsGroupByTrack(sampleIds: string[]) {
        return <g>{sampleIds.map(sampleId => this.sampleIcon(sampleId))}</g>;
    }

    @autobind
    groupByTrackLabel(groupIndex: number) {
        return (
            <text style={{ color: this.groupColorByGroupIndex(groupIndex) }}>
                {this.clinicalValuesForGrouping[groupIndex]}
            </text>
        );
    }

    @autobind
    groupColorByGroupIndex(groupIndex: number) {
        return this.clinicalValueToColor[
            this.clinicalValuesForGrouping[groupIndex]
        ];
    }

    @autobind
    groupColorBySampleId(sampleId: string) {
        return this.clinicalValueToColor[
            this.sampleIdToClinicalValue[sampleId]
        ];
    }

    @autobind
    sampleIcon(sampleId: string) {
        const x = this.xPosition[sampleId];
        const y = this.sampleIdToYPosition[sampleId];
        const color = this.props.sampleMetaData.color[sampleId] || '#333333';
        const label = this.props.sampleMetaData.label[sampleId] || '-';
        return (
            <g transform={`translate(${x})`}>
                <SampleMarker color={color} label={label} y={y} />
            </g>
        );
    }
}
