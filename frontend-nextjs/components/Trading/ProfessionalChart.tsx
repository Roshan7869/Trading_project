'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    TimeScale,
    PointElement,
    LineElement,
    BarElement,
    LineController,
    BarController,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { CandlestickController, CandlestickElement, OhlcController, OhlcElement } from 'chartjs-chart-financial';
import 'chartjs-adapter-luxon';
import { Chart } from 'react-chartjs-2';
import { api } from '@/lib/api';
import { useMarket } from '@/context/MarketContext';
import {
    TrendingUp, TrendingDown, Sun, Moon,
    CandlestickChart as CandleIcon, LineChart, BarChart2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import IndicatorLibrary, { IndicatorConfig } from './IndicatorLibrary';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Register Chart.js components
ChartJS.register(
    CategoryScale, LinearScale, TimeScale, PointElement, LineElement, BarElement,
    LineController, BarController, CandlestickController, CandlestickElement,
    OhlcController, OhlcElement, Tooltip, Legend, Filler
);

interface ProfessionalChartProps {
    symbol: string;
}

const TIMEFRAMES = [
    { label: '1D', period: '1d', interval: '5m' },
    { label: '1W', period: '5d', interval: '15m' },
    { label: '1M', period: '1mo', interval: '1d' },
    { label: '1Y', period: '1y', interval: '1d' },
];

type ChartType = 'candlestick' | 'bar' | 'line';

// Indicator colors for overlay indicators
const INDICATOR_COLORS: Record<string, string> = {
    sma: '#3b82f6', ema: '#fbbf24', wma: '#a855f7',
    bb_upper: 'rgba(168,85,247,0.4)', bb_lower: 'rgba(168,85,247,0.4)', bb_middle: 'rgba(168,85,247,0.6)',
    vwap: '#f59e0b'
};

export default function ProfessionalChart({ symbol }: ProfessionalChartProps) {
    // OHLCV Data
    const [ohlcv, setOhlcv] = useState<any[]>([]);
    const [indicators, setIndicators] = useState<{ overlays: Record<string, any[]>; panes: Record<string, any[]> }>({ overlays: {}, panes: {} });

    // UI State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTimeframe, setActiveTimeframe] = useState(TIMEFRAMES[2]);
    const [chartType, setChartType] = useState<ChartType>('candlestick');
    const [isDarkTheme, setIsDarkTheme] = useState(true);

    // User-Selected Indicators (starts EMPTY - no auto-loading)
    const [activeIndicators, setActiveIndicators] = useState<IndicatorConfig[]>([]);

    const { connected } = useMarket();

    // Generate simulated data when API fails
    const generateSimulatedData = useCallback(() => {
        const basePrice = 1500 + Math.random() * 1000;
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const data = [];

        for (let i = 30; i >= 0; i--) {
            const volatility = 0.02;
            const change = (Math.random() - 0.5) * 2 * volatility;
            const open = basePrice * (1 + (Math.random() - 0.5) * 0.02);
            const close = open * (1 + change);
            const high = Math.max(open, close) * (1 + Math.random() * 0.01);
            const low = Math.min(open, close) * (1 - Math.random() * 0.01);

            data.push({
                date: new Date(now - i * dayMs).toISOString(),
                timestamp: now - i * dayMs,
                open: Math.round(open * 100) / 100,
                high: Math.round(high * 100) / 100,
                low: Math.round(low * 100) / 100,
                close: Math.round(close * 100) / 100,
                volume: Math.floor(Math.random() * 1000000) + 500000
            });
        }
        return data;
    }, []);

    // Fetch data with selected indicators
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Build selectedIndicators payload for API
            const selectedIndicators = activeIndicators.map(ind => ({
                id: ind.id,
                params: ind.params
            }));

            // Use POST to send selected indicators
            const res = await api.post(
                `/api/stocks/${symbol}/history?period=${activeTimeframe.period}&interval=${activeTimeframe.interval}`,
                { selectedIndicators }
            );

            if (res.data) {
                const dataArray = res.data.ohlcv || res.data.data || [];
                if (dataArray.length > 0) {
                    const mappedOhlcv = dataArray.map((d: any) => ({
                        ...d,
                        timestamp: new Date(d.date).getTime()
                    }));
                    setOhlcv(mappedOhlcv);
                    if (res.data.indicators) {
                        setIndicators(res.data.indicators);
                    }
                    return;
                }
            }
            // If no data returned, use simulated
            setOhlcv(generateSimulatedData());
            setIndicators({ overlays: {}, panes: {} });
        } catch (err: any) {
            console.warn("API failed, using simulated data", err?.message);
            // Use simulated data as fallback
            setOhlcv(generateSimulatedData());
            setIndicators({ overlays: {}, panes: {} });
        } finally {
            setLoading(false);
        }
    }, [symbol, activeTimeframe, activeIndicators, generateSimulatedData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Indicator management handlers
    const handleAddIndicator = (indicator: IndicatorConfig) => {
        setActiveIndicators(prev => [...prev, indicator]);
    };

    const handleRemoveIndicator = (indicatorId: string) => {
        setActiveIndicators(prev => prev.filter(i => i.id !== indicatorId));
    };

    const handleUpdateIndicator = (indicatorId: string, params: Record<string, number>) => {
        setActiveIndicators(prev => prev.map(i =>
            i.id === indicatorId ? { ...i, params } : i
        ));
    };

    // Theme colors
    const theme = useMemo(() => isDarkTheme ? {
        bg: 'bg-slate-950', bgCard: 'bg-slate-900/40', border: 'border-slate-900',
        text: 'text-white', textMuted: 'text-slate-400',
        gridColor: 'rgba(255,255,255,0.03)', tickColor: '#64748b',
        tooltipBg: 'rgba(15,23,42,0.95)', tooltipBorder: '#1e293b'
    } : {
        bg: 'bg-white', bgCard: 'bg-gray-100', border: 'border-gray-200',
        text: 'text-gray-900', textMuted: 'text-gray-600',
        gridColor: 'rgba(0,0,0,0.05)', tickColor: '#6b7280',
        tooltipBg: 'rgba(255,255,255,0.95)', tooltipBorder: '#e5e7eb'
    }, [isDarkTheme]);

    // Common chart options
    const commonOptions = useMemo(() => ({
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index' as const, intersect: false },
        animation: { duration: 300 },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: theme.tooltipBg, borderColor: theme.tooltipBorder, borderWidth: 1,
                titleColor: '#38bdf8', bodyColor: isDarkTheme ? '#e2e8f0' : '#1f2937',
                padding: 12, displayColors: true
            }
        },
        scales: {
            x: {
                type: 'time' as const,
                time: { unit: (activeTimeframe.label === '1D' ? 'hour' : 'day') as 'hour' | 'day', displayFormats: { hour: 'HH:mm', day: 'MMM dd' } },
                grid: { color: theme.gridColor, drawBorder: false },
                ticks: { color: theme.tickColor, font: { size: 10 } }
            },
            y: {
                position: 'right' as const, grid: { color: theme.gridColor, drawBorder: false },
                ticks: { color: theme.tickColor, font: { size: 10 } }
            }
        }
    }), [activeTimeframe, theme, isDarkTheme]);

    // Main Chart Data (Price + Overlay Indicators)
    const mainChartData = useMemo(() => {
        const datasets: any[] = [];

        // Price data based on chart type
        if (chartType === 'candlestick') {
            datasets.push({
                label: 'Price', type: 'candlestick',
                data: ohlcv.map(d => ({ x: d.timestamp, o: d.open, h: d.high, l: d.low, c: d.close })),
                color: { up: '#10b981', down: '#ef4444', unchanged: '#94a3b8' },
                borderColor: { up: '#10b981', down: '#ef4444', unchanged: '#94a3b8' },
            });
        } else if (chartType === 'bar') {
            datasets.push({
                label: 'Price', type: 'ohlc',
                data: ohlcv.map(d => ({ x: d.timestamp, o: d.open, h: d.high, l: d.low, c: d.close })),
                color: { up: '#10b981', down: '#ef4444', unchanged: '#94a3b8' },
            });
        } else {
            datasets.push({
                label: 'Close Price', type: 'line',
                data: ohlcv.map(d => ({ x: d.timestamp, y: d.close })),
                borderColor: '#3b82f6', borderWidth: 2, pointRadius: 0, tension: 0.3,
                fill: true, backgroundColor: isDarkTheme ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.2)',
            });
        }

        // Add overlay indicators (only if user selected them)
        Object.entries(indicators.overlays || {}).forEach(([key, values]) => {
            if (!values || values.length === 0) return;

            datasets.push({
                label: key.toUpperCase(),
                type: 'line',
                data: ohlcv.map((d, i) => ({ x: d.timestamp, y: values[i] })),
                borderColor: INDICATOR_COLORS[key] || '#a855f7',
                borderWidth: key.includes('bb') ? 1 : 1.5,
                pointRadius: 0,
                tension: 0.3,
                borderDash: key.includes('bb') ? [5, 5] : undefined
            });
        });

        return { datasets };
    }, [ohlcv, chartType, indicators.overlays, isDarkTheme]);

    // Get latest price info
    const latestPrice = ohlcv[ohlcv.length - 1];
    const priceChange = latestPrice ? ((latestPrice.close - latestPrice.open) / latestPrice.open * 100) : 0;

    // Separate pane indicators
    const paneIndicators = Object.entries(indicators.panes || {});

    if (loading) return <div className={cn("h-[600px] flex items-center justify-center rounded-2xl animate-pulse", theme.bg, theme.textMuted)}>Loading Chart...</div>;
    if (error) return <div className="h-[600px] flex items-center justify-center bg-red-900/10 text-red-500 rounded-2xl">{error}</div>;

    return (
        <div className={cn("flex flex-col gap-4 p-6 rounded-3xl border shadow-2xl transition-colors", theme.bg, theme.border)}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className={cn("text-2xl font-bold flex items-center gap-2", theme.text)}>
                            {symbol} <span className={cn("text-sm font-normal", theme.textMuted)}>/ NSE</span>
                        </h2>
                        {latestPrice && (
                            <div className="flex items-center gap-3">
                                <span className="text-3xl font-bold text-blue-400">₹{latestPrice.close?.toFixed(2)}</span>
                                <span className={cn("flex items-center text-sm font-semibold", priceChange >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                    {priceChange >= 0 ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                                    {Math.abs(priceChange).toFixed(2)}%
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Controls Row */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Indicator Library */}
                    <IndicatorLibrary
                        activeIndicators={activeIndicators}
                        onAddIndicator={handleAddIndicator}
                        onRemoveIndicator={handleRemoveIndicator}
                        onUpdateIndicator={handleUpdateIndicator}
                        isDarkTheme={isDarkTheme}
                    />

                    {/* Chart Type Selector */}
                    <div className={cn("flex gap-1 p-1 rounded-xl border", isDarkTheme ? "bg-slate-900/50 border-slate-800" : "bg-gray-100 border-gray-200")}>
                        <button onClick={() => setChartType('candlestick')} className={cn("p-2 rounded-lg transition-all", chartType === 'candlestick' ? "bg-blue-600 text-white" : theme.textMuted)}><CandleIcon size={16} /></button>
                        <button onClick={() => setChartType('bar')} className={cn("p-2 rounded-lg transition-all", chartType === 'bar' ? "bg-blue-600 text-white" : theme.textMuted)}><BarChart2 size={16} /></button>
                        <button onClick={() => setChartType('line')} className={cn("p-2 rounded-lg transition-all", chartType === 'line' ? "bg-blue-600 text-white" : theme.textMuted)}><LineChart size={16} /></button>
                    </div>

                    {/* Theme Toggle */}
                    <button onClick={() => setIsDarkTheme(!isDarkTheme)} className={cn("p-2 rounded-xl border transition-all", isDarkTheme ? "bg-slate-900/50 border-slate-800 text-yellow-400" : "bg-gray-100 border-gray-200 text-slate-700")}>
                        {isDarkTheme ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    {/* Timeframe Selector */}
                    <div className={cn("flex gap-1 p-1.5 rounded-xl border", isDarkTheme ? "bg-slate-900/50 border-slate-800" : "bg-gray-100 border-gray-200")}>
                        {TIMEFRAMES.map(tf => (
                            <button key={tf.label} onClick={() => setActiveTimeframe(tf)} className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", activeTimeframe.label === tf.label ? "bg-blue-600 text-white shadow-lg" : theme.textMuted)}>
                                {tf.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Chart */}
            <div className={cn("h-[450px] rounded-2xl border overflow-hidden", isDarkTheme ? "bg-slate-900/30 border-slate-900" : "bg-white border-gray-200")}>
                <Chart
                    type={chartType === 'line' ? 'line' : chartType === 'bar' ? 'ohlc' as any : 'candlestick'}
                    data={mainChartData as any}
                    options={commonOptions as any}
                />
            </div>

            {/* Separate Pane Indicators (RSI, MACD, etc.) */}
            {paneIndicators.length > 0 && (
                <div className="flex flex-col gap-3">
                    {paneIndicators.map(([key, values]) => {
                        if (!values || (Array.isArray(values) && values.length === 0)) return null;

                        // Handle compound indicators like MACD
                        const isCompound = key === 'macd' || key === 'stoch_k' || key === 'adx';

                        return (
                            <div key={key} className={cn("h-[120px] rounded-2xl border overflow-hidden", isDarkTheme ? "bg-slate-900/20 border-slate-900/50" : "bg-gray-50 border-gray-200")}>
                                <div className={cn("text-xs font-bold px-3 py-1 uppercase", theme.textMuted)}>{key.replace('_', ' ')}</div>
                                <Chart
                                    type="line"
                                    data={{
                                        datasets: [{
                                            label: key.toUpperCase(),
                                            data: ohlcv.map((d, i) => ({ x: d.timestamp, y: Array.isArray(values) ? values[i] : null })),
                                            borderColor: key.includes('rsi') ? '#f97316' : key.includes('macd') ? '#3b82f6' : '#a855f7',
                                            borderWidth: 1.5,
                                            pointRadius: 0,
                                            tension: 0.3,
                                            fill: key.includes('rsi'),
                                            backgroundColor: key.includes('rsi') ? 'rgba(249,115,22,0.1)' : undefined
                                        }]
                                    }}
                                    options={{
                                        ...commonOptions,
                                        scales: {
                                            ...commonOptions.scales,
                                            y: {
                                                ...commonOptions.scales.y,
                                                min: key.includes('rsi') ? 0 : undefined,
                                                max: key.includes('rsi') ? 100 : undefined
                                            }
                                        }
                                    } as any}
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Empty State Message */}
            {activeIndicators.length === 0 && (
                <div className={cn("text-center py-6 rounded-xl border border-dashed text-sm", isDarkTheme ? "text-slate-500 border-slate-800" : "text-gray-400 border-gray-300")}>
                    Click <strong>"Indicators"</strong> to add technical analysis tools to your chart
                </div>
            )}
        </div>
    );
}
