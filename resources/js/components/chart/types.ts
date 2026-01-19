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

export type RadarChartProps = BaseChartProps;

export interface ChartAttributes {
    title?: string;
    height?: string;
    width?: string;
}
