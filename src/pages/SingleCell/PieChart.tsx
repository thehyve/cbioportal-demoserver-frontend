import React, { useState, useEffect } from 'react';
import { VictoryPie, VictoryTooltip } from 'victory';
import './styles.css';

// Define the DataBin interface
interface DataBin {
    id: string;
    count: number;
    end?: number;
    start?: number;
    specialValue?: string;
}

// Define props interface for the Chart component
interface ChartProps {
    dataBins: DataBin[];
    pieChartData: any[];
    tooltipEnabled: boolean;
}

// Define the type for the pie chart data
interface PieChartData {
    typeOfCell: string;
    percentage: number;
    color?: string; // Optional color property if not using colorScale
}

// Define the type for the VictoryPie event props
interface VictoryEventProps {
    index: number;
}

const Chart: React.FC<ChartProps> = ({
    dataBins,
    pieChartData,
    tooltipEnabled,
}) => {
    const [isHovered, setIsHovered] = useState<boolean>(false);
    const [hoveredSliceIndex, setHoveredSliceIndex] = useState<number | null>(
        null
    );
    const [tooltipVisible, setTooltipVisible] = useState<boolean>(false);
    const [tooltipHovered, setTooltipHovered] = useState<boolean>(false);

    // Set tooltip visibility with a delay when hover state changes, only if tooltipEnabled is false
    useEffect(() => {
        if (tooltipEnabled) {
            setTooltipVisible(true);
        } else {
            if (isHovered || tooltipHovered) {
                setTooltipVisible(true);
            } else {
                const timeoutId = setTimeout(
                    () => setTooltipVisible(false),
                    300
                ); // 300ms delay before hiding tooltip
                return () => clearTimeout(timeoutId);
            }
        }
    }, [isHovered, tooltipHovered, tooltipEnabled]);

    // Define color scale (replace with your desired colors)
    const colors = [
        '#2986E2',
        '#DC3912',
        '#f88508',
        '#109618',
        '#990099',
        '#0099c6',
        '#dd4477',
        '#66aa00',
        '#b82e2e',
        '#4e2da2',
        '#38761d',
        '#c90076',
    ];

    // Filter out data bins with specialValue "NA"
    const uniqueIds: string[] = [
        ...new Set(pieChartData.map((item: any) => item.genericAssayStableId)),
    ];
    const sumValues: { [key: string]: number } = {};

    // Calculate the total sum of sumValues
    let totalSum = 0;
    uniqueIds.forEach((id: string) => {
        sumValues[id] = pieChartData.reduce((acc: number, item: any) => {
            if (item.genericAssayStableId === id) {
                const value = parseFloat(item.value);
                totalSum += value;
                return acc + value;
            }
            return acc;
        }, 0);
    });

    const pieData = Object.keys(sumValues).map((key, index) => {
        const color =
            pieChartData.find(item => item.genericAssayStableId === key)
                ?.color || colors[index % colors.length];
        return {
            typeOfCell: key,
            percentage: sumValues[key],
            color: color,
        };
    });

    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start', // Align items at the top
                    width: '100%',
                    marginTop: '15px',
                    position: 'relative',
                }}
            >
                <div style={{ flex: '0 0 60%', textAlign: 'center' }}>
                    {' '}
                    {/* Adjust flex basis as needed */}
                    <h2>
                        {dataBins.length > 0
                            ? dataBins[0].id.replace(/_/g, ' ')
                            : 'No Data'}
                    </h2>
                    <VictoryPie
                        data={pieData}
                        x="typeOfCell"
                        y="percentage"
                        colorScale={colors} // Use the defined color scale
                        innerRadius={100}
                        labelRadius={100}
                        labelComponent={<VictoryTooltip />}
                        labels={(data: any) =>
                            `Cell type: ${data.typeOfCell}\nPercentage: ${(
                                (data.percentage / totalSum) *
                                100
                            ).toFixed(2)}%`
                        }
                        height={900} // Adjust height as necessary
                        width={900} // Adjust width as necessary
                        events={[
                            {
                                target: 'data',
                                eventHandlers: {
                                    onMouseOver: (
                                        evt: React.MouseEvent<any>,
                                        props: VictoryEventProps
                                    ) => {
                                        if (!tooltipEnabled) {
                                            setIsHovered(true);
                                            setHoveredSliceIndex(props.index);
                                        }
                                        return [];
                                    },
                                    onMouseOut: () => {
                                        if (!tooltipEnabled) {
                                            setIsHovered(false);
                                        }
                                        return [];
                                    },
                                },
                            },
                        ]}
                    />
                </div>

                <div style={{ flex: '0 0 40%', position: 'relative' }}>
                    {' '}
                    {/* Adjust flex basis as needed */}
                    {(tooltipVisible || tooltipEnabled) && (
                        <div
                            style={{
                                position: 'absolute',
                                top: '150px', // Move tooltip downwards
                                left: '80px', // Position tooltip to the right of the pie chart container
                                pointerEvents: 'auto', // Enable pointer events to capture hover on tooltip
                                opacity: tooltipEnabled
                                    ? tooltipVisible
                                        ? 1
                                        : 0
                                    : isHovered || tooltipHovered
                                    ? 1
                                    : 0,
                                margin: 'auto',
                                transition: 'opacity 0.5s ease-in-out', // Smooth fade-in and fade-out transition
                                transitionDelay: '0s', // Delay for fade-out when tooltip vanishes
                                backgroundColor: 'white',
                                width: '350px',
                                boxShadow: '0 0 10px rgba(0,0,0,0.2)',
                                zIndex: 220,
                            }}
                            onMouseEnter={() => setTooltipHovered(true)}
                            onMouseLeave={() => setTooltipHovered(false)}
                        >
                            <div
                                className="custom-scrollbar"
                                style={{
                                    maxHeight: '150px', // Adjust as necessary
                                    overflowY: 'auto',
                                    backgroundColor: 'white',
                                    pointerEvents: 'auto', // Re-enable pointer events for the scrollable container
                                }}
                            >
                                <table
                                    style={{
                                        borderCollapse: 'collapse',
                                        width: '100%',
                                        textAlign: 'center',
                                    }}
                                >
                                    <thead>
                                        <tr>
                                            <th
                                                style={{
                                                    border: '1px solid black',
                                                    padding: '8px',
                                                }}
                                            >
                                                Color
                                            </th>
                                            <th
                                                style={{
                                                    border: '1px solid black',
                                                    padding: '8px',
                                                }}
                                            >
                                                Type of Cell
                                            </th>
                                            <th
                                                style={{
                                                    border: '1px solid black',
                                                    padding: '8px',
                                                }}
                                            >
                                                Frequency
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pieData.map((slice, index) => (
                                            <tr
                                                key={slice.typeOfCell}
                                                style={{
                                                    backgroundColor:
                                                        hoveredSliceIndex ===
                                                        index
                                                            ? '#f0f0f0'
                                                            : 'transparent',
                                                }}
                                            >
                                                <td
                                                    style={{
                                                        backgroundColor:
                                                            slice.color,
                                                        width: '20px',
                                                        height: '20px',
                                                    }}
                                                />{' '}
                                                {/* Colored rectangle */}
                                                <td
                                                    style={{
                                                        border:
                                                            '1px solid black',
                                                        padding: '8px',
                                                        maxWidth: '150px',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow:
                                                            'ellipsis',
                                                    }}
                                                >
                                                    {slice.typeOfCell}
                                                </td>
                                                <td
                                                    style={{
                                                        border:
                                                            '1px solid black',
                                                        padding: '8px',
                                                    }}
                                                >
                                                    {(
                                                        (slice.percentage /
                                                            totalSum) *
                                                        100
                                                    ).toFixed(2)}
                                                    %
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Chart;
