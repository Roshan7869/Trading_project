'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import ClientDate from '@/components/ClientDate';

interface StockHeaderProps {
    symbol: string;
    price: number;
    change: number;
    timestamp?: string;
}

export default function StockHeader({ symbol, price, change, timestamp }: StockHeaderProps) {
    return (
        <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800 p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-5xl font-extrabold text-white tracking-tight">{symbol}</h1>
                    <p className="text-slate-500 font-medium">National Stock Exchange</p>
                </div>
                <div className={`p-4 rounded-3xl ${change >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {change >= 0 ? (
                        <TrendingUp className="h-10 w-10" />
                    ) : (
                        <TrendingDown className="h-10 w-10" />
                    )}
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <p className="text-7xl font-black text-white mb-2 tracking-tighter">
                        ₹{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                    <div className="flex items-center space-x-4">
                        <span
                            className={`inline-flex items-center px-5 py-2 rounded-2xl text-xl font-bold shadow-lg ${change >= 0
                                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                                : 'bg-rose-500 text-white shadow-rose-500/20'
                                }`}
                        >
                            {change >= 0 ? '+' : ''}{change.toFixed(2)}% Today
                        </span>
                        <span className="text-slate-500 font-medium">
                            {timestamp && <ClientDate date={timestamp} />}
                        </span>
                    </div>
                </div>

                <div className="hidden md:flex flex-col items-end text-right">
                    <span className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">Status</span>
                    <span className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-400/5 px-4 py-2 rounded-xl border border-emerald-400/20 text-sm">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        LIVE MARKET
                    </span>
                </div>
            </div>
        </div>
    );
}
