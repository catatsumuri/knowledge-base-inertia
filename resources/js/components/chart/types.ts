export type ChartType = 'radar' | 'bar' | 'pie' | 'line';

export interface ChartDataPoint {
    name: string;
    value: number;
}

export interface BaseChartProps {
    data: ChartDataPoint[];
    title?: string;
    height?: string;
    width?: string;
}

export interface RadarChartProps extends BaseChartProps {}

export interface ChartAttributes {
    title?: string;
    height?: string;
    width?: string;
}
