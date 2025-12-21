import React from 'react';

interface MarketData {
    price: number;
    change: number;
}

interface MarketOverviewProps {
    stocks: string[];
    marketData: Map<string, MarketData>;
    onSelectStock: (symbol: string) => void;
}

export function MarketOverview({ stocks, marketData, onSelectStock }: MarketOverviewProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(value);
    };

    const formatPercent = (value: number) => {
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}%`;
    };

    return (
        <div className="mt-6 bg-white rounded-2xl shadow-sm p-6 border">
            <h2 className="text-lg font-semibold mb-4">Market Overview</h2>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {stocks.map(stock => {
                    const data = marketData.get(stock);
                    return (
                        <div
                            key={stock}
                            className="bg-gray-50 rounded-xl p-4 cursor-pointer hover:bg-gray-100 transition"
                            onClick={() => onSelectStock(stock)}
                        >
                            <p className="font-medium text-gray-900">{stock}</p>
                            {data ? (
                                <>
                                    <p className="text-lg font-bold">{formatCurrency(data.price)}</p>
                                    <p className={`text-sm ${data.change >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                        {formatPercent(data.change)}
                                    </p>
                                </>
                            ) : (
                                <p className="text-gray-400">Loading...</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
