import _ from "lodash";
import * as React from "react";
import {observer, Observer} from "mobx-react";
import bind from "bind-decorator";
import {computed, observable} from "mobx";
import CBIOPORTAL_VICTORY_THEME, {baseLabelStyles} from "../../theme/cBioPoralTheme";
import Timer = NodeJS.Timer;
import {VictoryChart, VictoryAxis, VictoryBar, VictoryLegend, VictoryLabel} from "victory";
import jStat from "jStat";
import ScatterPlotTooltip from "./ScatterPlotTooltip";
import ifndef from "shared/lib/ifndef";
import {tickFormatNumeral} from "./TickUtils";
import {computeCorrelationPValue, makeScatterPlotSizeFunction as makePlotSizeFunction, separateScatterDataByAppearance, dataPointIsTruncated} from "./PlotUtils";
import {toConditionalPrecision} from "../../lib/NumberUtils";
import WaterfallPlotTooltip from "./WaterfallPlotTooltip";

export interface IBaseWaterfallPlotData {
    value:number;
    truncation?:string;
}

interface IInternalWaterfallPlotData extends IBaseWaterfallPlotData {
    order?:number|undefined;
}

export interface IWaterfallPlotProps<D extends IBaseWaterfallPlotData> {
    svgId?:string;
    title?:string;
    data: D[];
    chartWidth:number;
    chartHeight:number;
    highlight?:(d:D)=>boolean;
    fill?:string | ((d:D)=>string);
    stroke?:string | ((d:D)=>string);
    size?:number | ((d:D, active:boolean, isHighlighted?:boolean)=>number);
    fillOpacity?:number | ((d:D)=>number);
    strokeOpacity?:number | ((d:D)=>number);
    strokeWidth?:number | ((d:D)=>number);
    zIndexSortBy?:((d:D)=>any)[]; // second argument to _.sortBy
    tooltip?:(d:D)=>JSX.Element;
    horizontal:boolean;
    legendData?:{name:string|string[], symbol:any}[]; // see http://formidable.com/open-source/victory/docs/victory-legend/#data
    log?:boolean;
    useLogSpaceTicks?:boolean; // if log scale for an axis, then this prop determines whether the ticks are shown in post-log coordinate, or original data coordinate space
    axisLabel?:string;
    fontFamily?:string;
    sortOrder:'ASC'|'DESC';
    pivotThreshold?:number;
    plotOrientation:'HORZ'|'VERT';
}

const DEFAULT_FONT_FAMILY = "Verdana,Arial,sans-serif";
export const LEGEND_Y = 30
const RIGHT_PADDING = 120; // room for correlation info and legend
const NUM_AXIS_TICKS = 8;
const PLOT_DATA_PADDING_PIXELS = 50;
const MIN_LOG_ARGUMENT = 0.01;
const LEFT_PADDING = 25;


@observer
export default class WatefallPlot<D extends IBaseWaterfallPlotData> extends React.Component<IWaterfallPlotProps<D>, {}> {

    @observable.ref tooltipModel:any|null = null;
    @observable pointHovered:boolean = false;

    private mouseEvents:any = this.makeMouseEvents();

    @observable.ref private container:HTMLDivElement;

    @bind
    private containerRef(container:HTMLDivElement) {
        this.container = container;
    }

    private makeMouseEvents() {
        let disappearTimeout:Timer | null = null;
        const disappearDelayMs = 250;

        return [{
            target: "data",
            eventHandlers: {
                onMouseOver: () => {
                    return [
                        {
                            target: "data",
                            mutation: (props: any) => {
                                this.tooltipModel = props;
                                this.pointHovered = true;

                                if (disappearTimeout !== null) {
                                    clearTimeout(disappearTimeout);
                                    disappearTimeout = null;
                                }

                                return { active: true };
                            }
                        }
                    ];
                },
                onMouseOut: () => {
                    return [
                        {
                            target: "data",
                            mutation: () => {
                                if (disappearTimeout !== null) {
                                    clearTimeout(disappearTimeout);
                                }

                                disappearTimeout = setTimeout(()=>{
                                    this.pointHovered = false;
                                }, disappearDelayMs);

                                return { active: false };
                            }
                        }
                    ];
                }
            }
        }];
    }

    @computed get fontFamily() {
        return this.props.fontFamily || DEFAULT_FONT_FAMILY;
    }

    private get title() {
        if (this.props.title) {
            return (
                <VictoryLabel
                    style={{
                        fontWeight:"bold",
                        fontFamily: this.fontFamily,
                        textAnchor: "middle"
                    }}
                    x={this.svgWidth/2}
                    y="1.2em"
                    text={this.props.title}
                />
            );
        } else {
            return null;
        }
    }

    @computed get legendX() {
        return this.props.chartWidth - 20;
    }

    private get legend() {
        const x = this.legendX;
        const topPadding = 30;
        const approximateCorrelationInfoHeight = 30;
        if (this.props.legendData && this.props.legendData.length) {
            return (
                <VictoryLegend
                    orientation="vertical"
                    data={this.props.legendData}
                    x={x}
                    y={LEGEND_Y}
                    width={RIGHT_PADDING}
                />
            );
        } else {
            return null;
        }
    }

    @computed get plotDomain():{value:number[], order:number[]} {
        // data extremes
        let max = _(this.props.data).map('value').max() || 0;
        let min = _(this.props.data).map('value').min() || 0;

        if (this.props.log) {
            min = this.logScale(min);
            max = this.logScale(max);
        }
        return {
            value: [min, max],
            order: [1, this.props.data.length]  // return range defined by the number of samples for the x-axis
        };
    }

    @computed get rightPadding() {
        return RIGHT_PADDING;
    }

    @computed get svgWidth() {
        return LEFT_PADDING + this.props.chartWidth + this.rightPadding;
    }

    @computed get svgHeight() {
        return this.props.chartHeight;
    }

    private logScale(x:number) {
        return Math.log2(Math.max(x, MIN_LOG_ARGUMENT));
    }

    // private invLogScale(x:number) {
    //     return Math.pow(2, x);
    // }

    @bind
    private datumAccessorY(d:IInternalWaterfallPlotData) {
            if (this.props.log) {
                return this.logScale(d.value);
            } else {
                return d.value;
            }
    }

    @bind
    private datumAccessorX(d:IInternalWaterfallPlotData) {
            return d.order;
    }

    @computed get plotDomainX() {
        if (this.props.horizontal) {
           return this.plotDomain.order;
        }
        return this.plotDomain.value;
    }

    @computed get plotDomainY() {
        if (this.props.horizontal) {
            return this.plotDomain.value;
        }
        return this.plotDomain.order;
    }

    @computed get labelX() {
        if (this.props.horizontal) {
            return "";
        }
        return this.props.axisLabel;
    }

    @computed get labelY() {
        if (this.props.horizontal) {
            return this.props.axisLabel;
        }
        return "";
    }

    @computed get size() {
        const highlight = this.props.highlight;
        const size = this.props.size;
        // need to regenerate this function whenever highlight changes in order to trigger immediate Victory rerender
        return makePlotSizeFunction(highlight, size);
    }

    // private tickFormat(t:number, ticks:number[], logScale:boolean) {
    //     if (logScale && !this.props.useLogSpaceTicks) {
    //         t = this.invLogScale(t);
    //         ticks = ticks.map(x=>this.invLogScale(x));
    //     }
    //     return tickFormatNumeral(t, ticks);
    // }

    // @bind
    // private tickFormatX(t:number, i:number, ticks:number[]) {
    //     return this.tickFormat(t, ticks, !!this.props.logX);
    // }

    // @bind
    // private tickFormatY(t:number, i:number, ticks:number[]) {
    //     return this.tickFormat(t, ticks, !!this.props.logY);
    // }

    @computed get data() {

        // sort datapoints according to value
        // default sort order for sortBy is ascending (a.k.a 'ASC') order
        let dataPoints = _.sortBy(this.props.data, (d:IBaseWaterfallPlotData) => d.value);
        if (this.props.sortOrder === 'DESC') {
            dataPoints = _.reverse(dataPoints);
        }
        // assign a x value (equivalent to position in array)
        _.each(dataPoints, (d:IInternalWaterfallPlotData, index:number) => d.order = index + 1 );

        // subtract the pivotThreshold from each value
        const delta = this.props.pivotThreshold || 0;
        _.each(dataPoints, (d:IInternalWaterfallPlotData) => d.value = d.value - delta );

        // TODO create generalized verson of the separateScatterDataByAppearance 
        // function remove the need for "dummy" for symbol argument
        let o = separateScatterDataByAppearance(
            dataPoints,
            ifndef(this.props.fill, "0x000000"),
            ifndef(this.props.stroke, "0x000000"),
            ifndef(this.props.strokeWidth, 0),
            ifndef(this.props.strokeOpacity, 1),
            ifndef(this.props.fillOpacity, 1),
            "dummy symbol parameter",
            this.props.zIndexSortBy
        );

        return o;
    }


    @bind
    private getChart() {
        return (
            <div
                ref={this.containerRef}
                style={{width: this.svgWidth, height: this.svgHeight}}
            >
                <svg
                    id={this.props.svgId || ""}
                    style={{
                        width: this.svgWidth,
                        height: this.svgHeight,
                        pointerEvents: "all"
                    }}
                    height={this.svgHeight}
                    width={this.svgWidth}
                    role="img"
                    viewBox={`0 0 ${this.svgWidth} ${this.svgHeight}`}
                >
                    <g
                        transform={`translate(${LEFT_PADDING},0)`}
                    >
                        <VictoryChart
                            theme={CBIOPORTAL_VICTORY_THEME}
                            width={this.props.chartWidth}
                            height={this.props.chartHeight}
                            standalone={false}
                            domainPadding={PLOT_DATA_PADDING_PIXELS}
                            singleQuadrantDomainPadding={false}
                        >
                            {this.title}
                            {this.legend}
                            <VictoryAxis
                                domain={this.plotDomainX}
                                orientation="bottom"
                                offsetY={50}
                                crossAxis={false}
                                tickCount={NUM_AXIS_TICKS}
                                // tickFormat={this.tickFormatX}
                                axisLabelComponent={<VictoryLabel dy={25}/>}
                                label={this.labelX}
                            />
                            <VictoryAxis
                                domain={this.plotDomainY}
                                offsetX={50}
                                orientation="left"
                                crossAxis={false}
                                tickCount={NUM_AXIS_TICKS}
                                // tickFormat={this.tickFormatY}
                                dependentAxis={true}
                                axisLabelComponent={<VictoryLabel dy={-35}/>}
                                label={this.labelY}
                            />
                            { this.data.map(dataWithAppearance=>(
                                <VictoryBar
                                    key={`${dataWithAppearance.fill},${dataWithAppearance.stroke},${dataWithAppearance.strokeWidth},${dataWithAppearance.strokeOpacity},${dataWithAppearance.fillOpacity}`}
                                    barRatio='0.9'
                                    style={{
                                        data: {
                                            fill: dataWithAppearance.fill,
                                            stroke: dataWithAppearance.stroke,
                                            strokeWidth: dataWithAppearance.strokeWidth,
                                            strokeOpacity: dataWithAppearance.strokeOpacity,
                                            fillOpacity: dataWithAppearance.fillOpacity
                                        }
                                    }}
                                    size={this.size}
                                    horizontal={this.props.horizontal}
                                    data={dataWithAppearance.data}
                                    events={this.mouseEvents}
                                    x={this.datumAccessorX} // for x-axis reference accessor function
                                    y={this.datumAccessorY} // for y-axis reference accessor function
                                />
                            ))}
                        </VictoryChart>
                    </g>
                </svg>
            </div>
        );
    }

    render() {
        if (!this.props.data.length) {
            return <div className={'alert alert-info'}>No data to plot.</div>;
        }
        return (
            <div>
                <Observer>
                    {this.getChart}
                </Observer>
                {this.container && this.tooltipModel && this.props.tooltip && (
                    <WaterfallPlotTooltip
                        container={this.container}
                        targetHovered={this.pointHovered}
                        targetCoords={{x: this.tooltipModel.x + LEFT_PADDING, y: this.tooltipModel.y}}
                        overlay={this.props.tooltip(this.tooltipModel.datum)}
                    />
                )}
            </div>
        );
    }
}