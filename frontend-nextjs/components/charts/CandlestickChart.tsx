'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    TimeScale,
    PointElement,
    LineElement,
    LineController,
    Tooltip,
    Legend,
} from 'chart.js';
import { CandlestickController, CandlestickElement, OhlcController, OhlcElement } from 'chartjs-chart-financial';
import 'chartjs-adapter-luxon';
import { Chart } from 'react-chartjs-2';
import { useMarket } from '@/context/MarketContext';
import { api } from '@/lib/api';
// Note: api from lib/api adds auth headers, but here we might just use fetch or api.get
// Ideally use api.get to be safe, but stocks routes are public or authenticated?
// stocks.routes.ts routes are public (no authenticateToken middleware in the file), assuming global or none.
// Actually stocks.routes.ts uses router.get(...) without middleware.

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    TimeScale,
    PointElement,
    LineElement,
    LineController,
    CandlestickController,
    CandlestickElement,
    OhlcController,
    OhlcElement,
    Tooltip,
    Legend
);

interface ICandle {
    x: number;
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
}

interface CandlestickChartProps {
    symbol: string;
    height?: number;
}

const TIMEFRAMES = [
    { label: '1D', period: '1d', interval: '5m' },
    { label: '1W', period: '5d', interval: '15m' },
    { label: '1M', period: '1mo', interval: '1d' },
    { label: '1Y', period: '1y', interval: '1d' },
    { label: '5Y', period: '5y', interval: '1wk' },
];

export default function CandlestickChart({ symbol, height = 400 }: CandlestickChartProps) {
    const [candles, setCandles] = useState<ICandle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTimeframe, setActiveTimeframe] = useState(TIMEFRAMES[0]);

    const { marketData, connected } = useMarket();
    const chartRef = useRef<any>(null);

    // Fetch historical candles
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setLoading(true);
                setError(null);

                // Use the stocks proxy route
                const res = await api.get(`/api/stocks/${symbol}/history`, {
                    params: {
                        period: activeTimeframe.period,
                        interval: activeTimeframe.interval
                    }
                });

                const rawData = res.data.data; // { date, open, high... }

                if (Array.isArray(rawData)) {
                    const mapped = rawData.map((c: any) => ({
                        x: new Date(c.date).getTime(),
                        o: c.open,
                        h: c.high,
                        l: c.low,
                        c: c.close,
                        v: c.volume
                    }));
                    setCandles(mapped);
                } else {
                    setCandles([]);
                }

            } catch (err: any) {
                console.error("Chart fetch error:", err);
                if (err.response?.status === 404) {
                    setCandles([]);
                } else {
                    setError('Failed to load chart data');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [symbol, activeTimeframe]);

    // Live updates (Only for Intraday '1D' or '1W' views where valid)
    const isIntraday = activeTimeframe.label === '1D' || activeTimeframe.label === '1W';

    useEffect(() => {
        if (!isIntraday || !connected) return;

        const liveData = marketData.get(symbol);
        if (!liveData) return;

        const now = Date.now();
        // Determine candle interval in ms based on timeframe
        // 5m = 300000, 15m = 900000. 
        // Simply parsing interval format:
        const intervalMap: Record<string, number> = {
            '1m': 60000,
            '5m': 300000,
            '15m': 900000,
            '1h': 3600000
        };
        const intervalMs = intervalMap[activeTimeframe.interval] || 60000;

        const candleStart = Math.floor(now / intervalMs) * intervalMs;

        setCandles((prev) => {
            if (prev.length === 0) return prev;

            const updated = [...prev];
            const lastCandle = updated[updated.length - 1];

            // If last candle timestamp matches current interval window
            if (lastCandle.x === candleStart) {
                // Update
                lastCandle.h = Math.max(lastCandle.h, liveData.price);
                lastCandle.l = Math.min(lastCandle.l, liveData.price);
                lastCandle.c = liveData.price;
                lastCandle.v += liveData.volume || 0;
            } else if (lastCandle.x < candleStart) {
                // New Candle
                updated.push({
                    x: candleStart,
                    o: liveData.price,
                    h: liveData.price,
                    l: liveData.price,
                    c: liveData.price,
                    v: 0
                });
                // Keep limit?
                if (updated.length > 500) updated.shift();
            }

            return updated;
        });
    }, [marketData, symbol, isIntraday, connected, activeTimeframe]);

    // Calculate EMA
    const calculateEMA = useCallback((prices: number[], period: number): (number | null)[] => {
        const ema: (number | null)[] = Array(period - 1).fill(null);
        if (prices.length < period) return ema;

        const k = 2 / (period + 1);
        let sum = 0;
        for (let i = 0; i < period; i++) sum += prices[i];

        let prevEma = sum / period;
        ema.push(prevEma);

        for (let i = period; i < prices.length; i++) {
            prevEma = prices[i] * k + prevEma * (1 - k);
            ema.push(prevEma);
        }
        return ema;
    }, []);

    const chartData = {
        datasets: [
            {
                label: symbol,
                data: candles.map((c) => ({
                    x: c.x,
                    o: c.o,
                    h: c.h,
                    l: c.l,
                    c: c.c,
                })),
                borderColor: '#6b7280',
                color: {
                    up: '#10b981', // green-500
                    down: '#ef4444', // red-500
                    unchanged: '#6b7280',
                },
                barThickness: 'flex',
                barPercentage: 0.9,
            },
            {
                label: 'EMA(20)',
                type: 'line' as const,
                data: calculateEMA(candles.map((c) => c.c), 20).map((val, idx) =>
                    val !== null ? { x: candles[idx]?.x, y: val } : null
                ).filter(Boolean),
                borderColor: '#fbbf24', // amber-400
                borderWidth: 1.5,
                pointRadius: 0,
                tension: 0.2,
            }
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        scales: {
            x: {
                type: 'time' as const,
                time: {
                    unit: activeTimeframe.label === '1D' ? 'hour' : 'day',
                    displayFormats: {
                        hour: 'HH:mm',
                        day: 'MMM dd',
                    },
                },
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#9ca3af' },
            },
            y: {
                position: 'right' as const,
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#9ca3af' },
            },
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
                callbacks: {
                    label: (context: any) => {
                        const p = context.raw;
                        if (p.o) return `O: ${p.o} H: ${p.h} L: ${p.l} C: ${p.c}`;
                        return `${context.dataset.label}: ${p.y.toFixed(2)}`;
                    }
                }
            },
        },
    };

    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <div className="flex flex-col">
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-xl font-bold text-gray-900">{symbol}</h2>
                        {candles.length > 0 && (
                            <span className="text-2xl font-bold text-gray-900">
                                ₹{candles[candles.length - 1].c.toFixed(2)}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500">
                        {isIntraday && connected ? '• Live Market' : `• ${activeTimeframe.label} View`}
                    </p>
                </div>

                {/* Timeframe Selector */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                    {TIMEFRAMES.map((tf) => (
                        <button
                            key={tf.label}
                            onClick={() => setActiveTimeframe(tf)}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${activeTimeframe.label === tf.label
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ERROR / LOADING */}
            {error && <div className="text-red-500 text-sm mb-4">{error}</div>}

            <div style={{ height }}>
                {loading ? (
                    <div className="h-full flex items-center justify-center text-gray-400 animate-pulse">
                        Loading chart data...
                    </div>
                ) : candles.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-400">
                        No data available
                    </div>
                ) : (
                    <Chart type="candlestick" ref={chartRef} data={chartData as any} options={options as any} />
                )}
            </div>
        </div>
    );
}
