import _ from "lodash";
import * as React from "react";
import {observer, Observer} from "mobx-react";
import bind from "bind-decorator";
import {computed, observable} from "mobx";
import CBIOPORTAL_VICTORY_THEME from "../../theme/cBioPoralTheme";
import Timer = NodeJS.Timer;
import {VictoryChart, VictoryAxis, VictoryBar, VictoryScatter, VictoryLegend, VictoryLabel} from "victory";
import { makeScatterPlotSizeFunction as makePlotSizeFunction, dataPointIsTruncated } from "./PlotUtils";
import { SortOrder } from "../../api/generated/CBioPortalAPIInternal";
import WaterfallPlotTooltip from "./WaterfallPlotTooltip";
import { tickFormatNumeral } from "./TickUtils";
import { IWaterfallPlotData, IAxisLogScaleParams } from "pages/resultsView/plots/PlotsTabUtils";
import LetterIcon from "../cohort/LetterIcon";

// TODO make distinction between public and internal interface for waterfall plot data
export interface IBaseWaterfallPlotData {
    value:number; // public
    truncation?:string; // public
    order?:number|undefined;
    offset?:number;
    fill?:string;
    fillOpacity?:number;
    stroke?:string;
    strokeOpacity?:number;
    strokeWidth?:number;
    symbol?:string;
    labelx?:number;
    labely?:number;
    labelVisibility?:boolean;
    searchindicatorx?:number;
    searchindicatory?:number;
}

export interface IWaterfallPlotProps<D extends IBaseWaterfallPlotData> {
    svgId?:string;
    title?:string;
    data: D[];
    chartWidth:number;
    chartHeight:number;
    highlight?:(d:D)=>boolean;
    size?:number | ((d:D, active:boolean, isHighlighted?:boolean)=>number);
    fill?:string|((d:D)=>string);
    stroke?:string|((d:D)=>string);
    fillOpacity?:number|((d:D)=>number);
    strokeOpacity?:number|((d:D)=>number);
    strokeWidth?:number|((d:D)=>number);
    symbol?:string|((d:D)=>string);
    labelVisibility?:boolean|((d:D)=>boolean);
    zIndexSortBy?:((d:D)=>any)[]; // second argument to _.sortBy
    tooltip?:(d:D)=>JSX.Element;
    horizontal:boolean;
    legendData?:{name:string|string[], symbol:any}[]; // see http://formidable.com/open-source/victory/docs/victory-legend/#data
    log?:IAxisLogScaleParams;
    useLogSpaceTicks?:boolean; // if log scale for an axis, then this prop determines whether the ticks are shown in post-log coordinate, or original data coordinate space
    axisLabel?:string;
    fontFamily?:string;
    sortOrder:SortOrder;
    pivotThreshold?:number;
}

const DEFAULT_FONT_FAMILY = "Verdana,Arial,sans-serif";
export const LEGEND_Y = 30
const RIGHT_PADDING = 120; // room for correlation info and legend
const NUM_AXIS_TICKS = 8;
const PLOT_DATA_PADDING_PIXELS = 50;
const MIN_LOG_ARGUMENT = 0.01;
const LEFT_PADDING = 25;
const LABEL_OFFSET_FRACTION = .02;
const LABEL_SIZE_MULTIPLIER = 1.5;
const labelStyle = {
    fill: "#ffffff",
    stroke: "#000000",
    strokeWidth: 1,
    strokeOpacity: 1,
    size: 3
}


@observer
export default class WaterfallPlot<D extends IBaseWaterfallPlotData> extends React.Component<IWaterfallPlotProps<D>, {}> {

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

                                // swap x and y label pos when in horizontal mode
                                if (this.props.horizontal) {
                                    const x = props.x;
                                    props.x = props.y;
                                    props.y = x;
                                }

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
        let max = _(this.internalData).map('value').max() || 0;
        let min = _(this.internalData).map('value').min() || 0;

        return {
            value: [min!, max!],
            order: [1, this.internalData.length]  // return range defined by the number of samples for the x-axis
        };
    }

    @computed get plotDomainX() {
        if (this.props.horizontal) {
            return this.plotDomain.value;
        }
        return this.plotDomain.order;
    }

    @computed get plotDomainY() {
        if (this.props.horizontal) {
            return this.plotDomain.order;
        }
        return this.plotDomain.value;
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

    @bind
    private datumAccessorY(d:IBaseWaterfallPlotData) {
        return d.value;
    }

    @bind
    private datumAccessorBaseLine(d:IBaseWaterfallPlotData) {
        return d.offset;
    }

    @bind
    private datumAccessorX(d:IBaseWaterfallPlotData) {
        return d.order;
    }

    @bind
    private datumAccessorLabelY(d:IBaseWaterfallPlotData) {
        return d.labely;
    }

    @bind
    private datumAccessorLabelX(d:IBaseWaterfallPlotData) {
        return d.labelx;
    }

    @bind
    private datumAccessorSearchIndicatorY(d:IBaseWaterfallPlotData) {
        return d.searchindicatory;
    }

    @bind
    private datumAccessorSearchIndicatorX(d:IBaseWaterfallPlotData) {
        return d.searchindicatorx;
    }

    @computed get size() {
        const highlight = this.props.highlight;
        const size = this.props.size;
        // need to regenerate this function whenever highlight changes in order to trigger immediate Victory rerender
        return makePlotSizeFunction(highlight, size);
    }

    private tickFormat(t:number, ticks:number[], logScaleFunc:IAxisLogScaleParams|undefined) {
        if (logScaleFunc && !this.props.useLogSpaceTicks) {
            t = logScaleFunc.fInvLogScale(t);
            ticks = ticks.map(x=>logScaleFunc.fInvLogScale(x));
        }
        return tickFormatNumeral(t, ticks);
    }

    @bind
    private tickFormatX(t:number, i:number, ticks:number[]) {
        if (this.props.horizontal) {
            return this.tickFormat(t, ticks, this.props.log);
        }
        return undefined;
    }

    @bind
    private tickFormatY(t:number, i:number, ticks:number[]) {
        if (this.props.horizontal) {
            return undefined;
        }
        return this.tickFormat(t, ticks, this.props.log);
    }

    @computed get internalData() {

        const logTransFormFunc = this.props.log;

        let dataPoints = _.cloneDeep(this.props.data);

        // sort datapoints according to value
        // default sort order for sortBy is ascending (a.k.a 'ASC') order
        dataPoints = _.sortBy(dataPoints, (d:D) => d.value);
        if (this.props.sortOrder === SortOrder.DESC) {
            dataPoints = _.reverse(dataPoints);
        }
        // assign a x value (equivalent to position in array)
        _.each(dataPoints, (d:IBaseWaterfallPlotData, index:number) => d.order = index + 1 );
        let offset = this.props.pivotThreshold || 0;
        
        // for log transformation one should handle negative numbers
        // this is done by transposing all data so that negative numbers no
        // longer occur. Als include the pivotThreshold.
        const values =  _.map(dataPoints, 'value').concat([offset]);
        const minValue = _.min(values) || 0;
        const logOffset = minValue < 0? Math.abs(minValue)+0.0001 : 0;

        // add offset to data points and log-transform when applicable
        _.each(dataPoints, (d:IBaseWaterfallPlotData) => {
            d.offset = logTransFormFunc? logTransFormFunc.fLogScale(offset, logOffset):offset;
            d.value = logTransFormFunc?  logTransFormFunc.fLogScale(d.value, logOffset):d.value;
        });

        // add style information to each point
        _.each(dataPoints, (d:IBaseWaterfallPlotData) => {
            d.fill = this.resolveStyleOptionType<string>(d, this.props.fill);
            d.fillOpacity = this.resolveStyleOptionType<number>(d, this.props.fillOpacity);
            d.stroke = this.resolveStyleOptionType<string>(d, this.props.stroke);
            d.strokeOpacity = this.resolveStyleOptionType<number>(d, this.props.strokeOpacity);
            d.strokeWidth = this.resolveStyleOptionType<number>(d, this.props.strokeWidth);
            d.symbol = this.resolveStyleOptionType<string>(d, this.props.symbol);
            d.labelVisibility = this.resolveStyleOptionType<boolean>(d, this.props.labelVisibility);
        });

        return dataPoints;
    }

    resolveStyleOptionType<T>(datum:IBaseWaterfallPlotData, styleOption:any):T {
        if (typeof styleOption === 'function') {
            return styleOption(datum);
        }
        return styleOption;
    }

    @computed get truncationLabels() {

        // filter out data points that are truncted
        // these will get a symbol above the resp. bar
        const labelData = _.filter(this.internalData, (d) => d.labelVisibility);

        const range = this.props.horizontal ? this.plotDomainX : this.plotDomainY;
        const min_value = range[0];
        const max_value = range[1];
        let offset:number = (max_value - min_value) * LABEL_OFFSET_FRACTION;// determine magnitude of offset for symbols

        // add offset information for possible labels above the bars
        _.each(labelData, (d:IBaseWaterfallPlotData) => {

            const offsetLocal = d.value! >= 0 ? offset : offset*-1; // determine direction of offset for symbols (above or below)
            const labelPos = d.value! + offsetLocal;

            if (this.props.horizontal) {
                d.labelx = labelPos;
                d.labely = d.order;
            } else { // ! this.props.horizontal
                d.labelx = d.order;
                d.labely = labelPos;
            }
        });

        return labelData;
    }

    @computed get searchLabels() {

        if (! this.props.highlight) {
            return [];
        }

        const searchLabels = _.filter(this.internalData, (d:any) => this.props.highlight!(d) );

        const range = this.props.horizontal ? this.plotDomainX : this.plotDomainY;
        const min_value = range[0];
        const max_value = range[1];

        // determine magnitude of offset for symbols
        let offset:number = (max_value - min_value) * LABEL_OFFSET_FRACTION;

        // add offset information for search labels to datapoints
        _.each(searchLabels, (d:IBaseWaterfallPlotData) => {

            // determine direction of offset for symbols (above or below line y=0)
            offset = d.value! <= d.offset! ? offset : -offset;
            const labelPos = d.offset + offset;

            d.symbol = "plus";

            if (this.props.horizontal) {
                d.searchindicatorx = labelPos;
                d.searchindicatory = d.order;
            } else { // ! this.props.horizontal
                d.searchindicatorx = d.order;
                d.searchindicatory = labelPos;
            }

        });

        return searchLabels;
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
                            {this.props.horizontal && <VictoryAxis
                                domain={this.plotDomainX}
                                orientation="bottom"
                                offsetY={50}
                                crossAxis={false}
                                tickCount={NUM_AXIS_TICKS}
                                tickFormat={this.tickFormatX}
                                axisLabelComponent={<VictoryLabel dy={25}/>}
                                label={this.props.axisLabel}
                            />}
                           {!this.props.horizontal && <VictoryAxis
                                domain={this.plotDomainY}
                                offsetX={50}
                                orientation="left"
                                crossAxis={false}
                                tickCount={NUM_AXIS_TICKS}
                                tickFormat={this.tickFormatY}
                                dependentAxis={true}
                                axisLabelComponent={<VictoryLabel dy={-35}/>}
                                label={this.props.axisLabel}
                            />}
                            <VictoryBar
                                // barRatio={1} // removes spaces between bars
                                style={{
                                    data: {
                                        fill: (d:D) => d.fill,
                                        stroke: (d:D) => d.stroke,
                                        strokeWidth: (d:D) => d.strokeWidth,
                                        strokeOpacity: (d:D) => d.strokeOpacity,
                                        fillOpacity: (d:D) => d.fillOpacity
                                    }
                                }}
                                horizontal={this.props.horizontal}
                                data={this.internalData}
                                size={this.size}
                                events={this.mouseEvents}
                                x={this.datumAccessorX} // for x-axis reference accessor function
                                y={this.datumAccessorY} // for y-axis reference accessor function
                                y0={this.datumAccessorBaseLine} // for baseline reference accessor function
                            />
                            <VictoryScatter
                                style={{
                                    data: {
                                        fill: labelStyle.fill,
                                        stroke: labelStyle.stroke,
                                        strokeWidth: labelStyle.strokeWidth,
                                        strokeOpacity: labelStyle.strokeOpacity,
                                        symbol: (d:D) => d.symbol
                                    }
                                }}
                                size={labelStyle.size}
                                data={this.truncationLabels}
                                x={this.datumAccessorLabelX}
                                y={this.datumAccessorLabelY}
                                />
                            <VictoryScatter
                                style={{
                                    data: {
                                        fill: "white",
                                        stroke: "red",
                                        strokeWidth: 1*LABEL_SIZE_MULTIPLIER,
                                        strokeOpacity: 1,
                                        symbol: (d:D) => d.symbol
                                    }
                                }}
                                size={labelStyle.size * LABEL_SIZE_MULTIPLIER}
                                data={this.searchLabels}
                                events={this.mouseEvents}
                                x={this.datumAccessorSearchIndicatorX}
                                y={this.datumAccessorSearchIndicatorY}
                            />
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