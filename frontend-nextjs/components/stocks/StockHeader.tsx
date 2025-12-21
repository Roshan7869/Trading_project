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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900">{symbol}</h1>
                    <p className="text-gray-600">NSE</p>
                </div>
                {change >= 0 ? (
                    <TrendingUp className="h-12 w-12 text-primary" />
                ) : (
                    <TrendingDown className="h-12 w-12 text-danger" />
                )}
            </div>

            <div className="">
                <p className="text-6xl font-bold text-gray-900 mb-2">
                    ₹{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
                <div className="flex items-center space-x-3">
                    <span
                        className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-semibold ${change >= 0
                            ? 'bg-primary/10 text-primary'
                            : 'bg-danger/10 text-danger'
                            }`}
                    >
                        {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                    </span>
                    <span className="text-gray-500">
                        {timestamp && <ClientDate date={timestamp} />}
                    </span>
                </div>
            </div>
        </div>
    );
}
