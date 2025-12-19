'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    TimeScale,
    Tooltip,
    Legend,
} from 'chart.js';
import { CandlestickController, CandlestickElement, OhlcController, OhlcElement } from 'chartjs-chart-financial';
import 'chartjs-adapter-luxon';
import { Chart } from 'react-chartjs-2';
import { useMarket } from '@/context/MarketContext';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    TimeScale,
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function CandlestickChart({ symbol, height = 400 }: CandlestickChartProps) {
    const [candles, setCandles] = useState<ICandle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { marketData, connected } = useMarket();
    const chartRef = useRef<any>(null);

    // Fetch historical candles on mount
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await fetch(`${API_URL}/api/market/history/${symbol}?limit=100`);
                if (!res.ok) {
                    if (res.status === 404) {
                        // No data yet, will populate from live stream
                        setCandles([]);
                        setLoading(false);
                        return;
                    }
                    throw new Error('Failed to fetch historical data');
                }
                const data = await res.json();
                setCandles(data.candles || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [symbol]);

    // Update current candle from live market data
    useEffect(() => {
        const liveData = marketData.get(symbol);
        if (!liveData) return;

        const now = Date.now();
        const minuteStart = Math.floor(now / 60000) * 60000;

        setCandles((prev) => {
            if (prev.length === 0) {
                // Start first candle
                return [{
                    x: minuteStart,
                    o: liveData.price,
                    h: liveData.price,
                    l: liveData.price,
                    c: liveData.price,
                    v: liveData.volume || 0
                }];
            }

            const updated = [...prev];
            const lastCandle = updated[updated.length - 1];

            if (lastCandle.x === minuteStart) {
                // Update current candle
                lastCandle.h = Math.max(lastCandle.h, liveData.price);
                lastCandle.l = Math.min(lastCandle.l, liveData.price);
                lastCandle.c = liveData.price;
                lastCandle.v += liveData.volume || 0;
            } else {
                // New minute - close previous and start new
                updated.push({
                    x: minuteStart,
                    o: liveData.price,
                    h: liveData.price,
                    l: liveData.price,
                    c: liveData.price,
                    v: liveData.volume || 0
                });

                // Keep max 200 candles
                if (updated.length > 200) {
                    updated.shift();
                }
            }

            return updated;
        });
    }, [marketData, symbol]);

    // Calculate EMA
    const calculateEMA = useCallback((prices: number[], period: number): (number | null)[] => {
        const ema: (number | null)[] = Array(period - 1).fill(null);
        if (prices.length < period) return ema;

        const k = 2 / (period + 1);
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += prices[i];
        }
        let prevEma = sum / period;
        ema.push(prevEma);

        for (let i = period; i < prices.length; i++) {
            prevEma = prices[i] * k + prevEma * (1 - k);
            ema.push(prevEma);
        }

        return ema;
    }, []);

    // Prepare chart data
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
                borderColor: '#333',
                color: {
                    up: '#22c55e',
                    down: '#ef4444',
                    unchanged: '#6b7280',
                },
            },
            {
                label: 'EMA(10)',
                type: 'line' as const,
                data: calculateEMA(candles.map((c) => c.c), 10).map((val, idx) =>
                    val !== null ? { x: candles[idx]?.x, y: val } : null
                ).filter(Boolean),
                borderColor: '#3b82f6',
                borderWidth: 2,
                pointRadius: 0,
                fill: false,
                tension: 0.1,
            },
            {
                label: 'EMA(20)',
                type: 'line' as const,
                data: calculateEMA(candles.map((c) => c.c), 20).map((val, idx) =>
                    val !== null ? { x: candles[idx]?.x, y: val } : null
                ).filter(Boolean),
                borderColor: '#f59e0b',
                borderWidth: 2,
                pointRadius: 0,
                fill: false,
                tension: 0.1,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: 'time' as const,
                time: {
                    unit: 'minute' as const,
                    displayFormats: {
                        minute: 'HH:mm',
                    },
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                },
                ticks: {
                    color: '#9ca3af',
                },
            },
            y: {
                position: 'right' as const,
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                },
                ticks: {
                    color: '#9ca3af',
                },
            },
        },
        plugins: {
            legend: {
                display: true,
                position: 'top' as const,
                labels: {
                    color: '#e5e7eb',
                },
            },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
            },
        },
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center bg-gray-800 rounded-lg" style={{ height }}>
                <div className="text-gray-400">Loading chart data...</div>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">{symbol}</h2>
                <div className={`flex items-center gap-2 px-3 py-1 rounded text-sm ${connected ? 'bg-green-600' : 'bg-red-600'}`}>
                    <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-300' : 'bg-red-300'} animate-pulse`}></span>
                    {connected ? 'Live' : 'Disconnected'}
                </div>
            </div>

            {error && (
                <div className="text-red-400 mb-2 text-sm">{error}</div>
            )}

            {candles.length === 0 ? (
                <div className="flex items-center justify-center text-gray-500" style={{ height }}>
                    Waiting for market data...
                </div>
            ) : (
                <div style={{ height }}>
                    <Chart type="candlestick" ref={chartRef} data={chartData as any} options={options as any} />
                </div>
            )}

            {/* Current Price Display */}
            {candles.length > 0 && (
                <div className="mt-4 grid grid-cols-4 gap-4">
                    <div className="bg-gray-700 p-3 rounded">
                        <p className="text-xs text-gray-400">Open</p>
                        <p className="text-lg font-bold text-white">₹{candles[candles.length - 1]?.o.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                        <p className="text-xs text-gray-400">High</p>
                        <p className="text-lg font-bold text-green-400">₹{candles[candles.length - 1]?.h.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                        <p className="text-xs text-gray-400">Low</p>
                        <p className="text-lg font-bold text-red-400">₹{candles[candles.length - 1]?.l.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                        <p className="text-xs text-gray-400">Close</p>
                        <p className="text-lg font-bold text-white">₹{candles[candles.length - 1]?.c.toFixed(2)}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
