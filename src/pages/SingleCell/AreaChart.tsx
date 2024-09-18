import React from 'react';
import { GenericAssayData } from 'cbioportal-ts-api-client';
import _ from 'lodash';
import {
    VictoryArea,
    VictoryChart,
    VictoryAxis,
    VictoryTooltip,
    VictoryVoronoiContainer,
    VictoryGroup,
    VictoryClipContainer,
} from 'victory';

interface AreaChartProps {
    pieChartData: GenericAssayData[];
}

interface AreaDatum {
    sampleId: string;
    stableId: string;
    value: number;
}

const colors = [
    ['#00BCD4', '#B2EBF2'], // Cyan gradient
    ['#FF9800', '#FFCC80'], // Orange gradient
    ['#A52A2A', '#D7CCC8'], // Maroon gradient
    ['#795548', '#D7CCC8'], // Brown gradient
    ['#27AE60', '#A5D6A7'], // Green gradient
    ['#E53935', '#EF9A9A'], // Red gradient
    ['#9C27B0', '#E1BEE7'], // Violet gradient
    ['#2986E2', '#BBDEFB'], // Blue gradient
    ['#FF69B4', '#C71585'],
    ['#008080', '#B2DFDB'], // Teal gradient
    ['#7a8376', '#CFD8DC'], // Greyish Green gradient
];

const AreaChart: React.FC<AreaChartProps> = ({ pieChartData }) => {
    function calculatePercentageForPieChartData(data: any) {
        const groupedData = data.reduce((acc: any, item: any) => {
            if (!acc[item.sampleId]) {
                acc[item.sampleId] = [];
            }
            acc[item.sampleId].push(item);
            return acc;
        }, {});

        Object.keys(groupedData).forEach(sampleId => {
            const sampleData = groupedData[sampleId];
            const total = sampleData.reduce(
                (sum: any, item: any) => sum + parseFloat(item.value),
                0
            );

            sampleData.forEach((item: any) => {
                const percentage = (parseFloat(item.value) / total).toFixed(5);
                item.value = percentage + '%';
            });
        });

        return _.flatMap(groupedData);
    }
    const updatedPiechartData = calculatePercentageForPieChartData(
        pieChartData
    );
    let differentSampleIds: string[] = [];
    let differentStableIds: string[] = [];

    pieChartData.forEach(item => {
        if (!differentSampleIds.includes(item.sampleId)) {
            differentSampleIds.push(item.sampleId);
        }
        if (!differentStableIds.includes(item.stableId)) {
            differentStableIds.push(item.stableId);
        }
    });

    let stableIdData: { [key: string]: AreaDatum[] } = {};

    for (let i = 0; i < differentStableIds.length; i++) {
        let stableId = differentStableIds[i];
        stableIdData[stableId] = [];

        for (let j = 0; j < pieChartData.length; j++) {
            if (pieChartData[j].stableId === stableId) {
                stableIdData[stableId].push({
                    sampleId: pieChartData[j].sampleId,
                    stableId: pieChartData[j].stableId,
                    value: parseFloat(pieChartData[j].value),
                });
            }
        }
    }

    const stableIdColorMap: { [key: string]: string[] } = {};
    let colorIndex = 0;

    let formattedData = Object.keys(stableIdData).map(stableId => {
        if (!stableIdColorMap[stableId]) {
            stableIdColorMap[stableId] = colors[colorIndex % colors.length];
            colorIndex++;
        }
        return stableIdData[stableId].map(item => ({
            x: item.sampleId,
            y: item.value,
            stableId: item.stableId,
            color: stableIdColorMap[stableId],
        }));
    });

    // Create a mapping of sampleId to its respective stableIds and values
    const sampleIdTooltipMap: {
        [key: string]: { stableId: string; value: number }[];
    } = {};
    pieChartData.forEach(item => {
        if (!sampleIdTooltipMap[item.sampleId]) {
            sampleIdTooltipMap[item.sampleId] = [];
        }
        sampleIdTooltipMap[item.sampleId].push({
            stableId: item.stableId,
            value: parseFloat(item.value),
        });
    });
    console.log(sampleIdTooltipMap, 'sampleIdTooltipMap');
    return (
        <div
            style={{
                width: 'max-content',
            }}
        >
            <VictoryChart
                width={2400}
                height={700}
                padding={{
                    top: 80,
                    bottom: 160,
                    left: 60,
                    right: 120,
                }}
                containerComponent={
                    <VictoryVoronoiContainer
                        labels={(datum: any) => {
                            const data = sampleIdTooltipMap[datum.x];
                            console.log(datum, 'here is sample');

                            // Prepare the heading using datum.x
                            const heading = `Sample ID: ${datum.x}\n`;
                            const result = data.find(
                                item => item.stableId === datum.stableId
                            )?.value;

                            // Generate the tooltip content
                            const content = `${
                                datum.stableId
                            }: ${result?.toFixed(2)}\n`;
                            // Combine the heading and the content
                            return `${heading}${content}`;
                        }}
                        labelComponent={
                            <VictoryTooltip
                                style={{
                                    fontSize: 12, // Slightly larger font size for better readability
                                    fontFamily: 'Arial, sans-serif', // Optional: change the font
                                    fill: (datum: any) => datum.color[0],
                                }}
                                flyoutStyle={{
                                    fill: 'white', // Background color
                                    stroke: '#666', // Border color (light black)
                                    strokeWidth: 1,
                                    borderRadius: 5, // Rounded corners
                                    padding: 10, // Add padding for better spacing
                                    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)', // Subtle shadow for a 3D effect
                                }}
                                flyoutPadding={5} // Adjusts padding around the arrow to make it smaller
                                cornerRadius={3} // Adjusts the roundness of the tooltip's corners, making the arrow smaller
                                pointerLength={8} // Makes the arrow smaller and shorter
                                pointerWidth={8} // Adjusts the width of the arrow, making it smaller
                                pointerOrientation="left"
                            />
                        }
                    />
                }
            >
                <VictoryAxis
                    style={{
                        tickLabels: {
                            fontSize: 12,
                            angle: 45,
                            textAnchor: 'start',
                        },
                    }}
                />
                <VictoryAxis
                    dependentAxis
                    style={{
                        tickLabels: {
                            fontSize: 12,
                        },
                    }}
                />
                <VictoryGroup>
                    {differentStableIds.map((stableId, index) => {
                        const [startColor, endColor] = stableIdColorMap[
                            stableId
                        ];
                        return (
                            <VictoryArea
                                key={stableId}
                                data={formattedData[index]}
                                interpolation="catmullRom" // Adds a smooth curve
                                style={{
                                    data: {
                                        fill: `url(#gradient-${index})`,
                                        stroke: startColor,
                                        strokeWidth: 2,
                                    },
                                }}
                                groupComponent={
                                    <VictoryClipContainer
                                        clipId={`clip-${index}`}
                                    />
                                }
                            />
                        );
                    })}
                </VictoryGroup>
                {differentStableIds.map((stableId, index) => {
                    const [startColor, endColor] = stableIdColorMap[stableId];
                    return (
                        <defs key={`gradient-${index}`}>
                            <linearGradient
                                id={`gradient-${index}`}
                                x1="0%"
                                y1="0%"
                                x2="0%"
                                y2="100%"
                            >
                                <stop
                                    offset="0%"
                                    style={{
                                        stopColor: startColor,
                                        stopOpacity: 0.3,
                                    }}
                                />{' '}
                                {/* Adjusted stopOpacity */}
                                <stop
                                    offset="100%"
                                    style={{
                                        stopColor: endColor,
                                        stopOpacity: 0.3,
                                    }}
                                />{' '}
                                {/* Adjusted stopOpacity */}
                            </linearGradient>
                        </defs>
                    );
                })}
            </VictoryChart>
        </div>
    );
};

export default AreaChart;
