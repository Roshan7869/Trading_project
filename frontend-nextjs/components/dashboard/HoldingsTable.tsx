import React from 'react';

interface Position {
    _id: string;
    symbol: string;
    quantity: number;
    avgBuyPrice: number;
    currentPrice: number;
    investedAmount: number;
    currentValue: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
    dayChange: number;
}

interface HoldingsTableProps {
    loading: boolean;
    positions: Position[];
}

export function HoldingsTable({ loading, positions }: HoldingsTableProps) {
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
        <div className="bg-white rounded-2xl shadow-sm p-6 border lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Your Holdings</h2>

            {loading ? (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
            ) : positions && positions.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-sm text-gray-500 border-b">
                                <th className="pb-3">Stock</th>
                                <th className="pb-3 text-right">Qty</th>
                                <th className="pb-3 text-right">Avg Price</th>
                                <th className="pb-3 text-right">LTP</th>
                                <th className="pb-3 text-right">P&L</th>
                            </tr>
                        </thead>
                        <tbody>
                            {positions.map((position) => (
                                <tr key={position._id} className="border-b last:border-b-0">
                                    <td className="py-3 font-medium">{position.symbol}</td>
                                    <td className="py-3 text-right">{position.quantity}</td>
                                    <td className="py-3 text-right">{formatCurrency(position.avgBuyPrice)}</td>
                                    <td className="py-3 text-right">{formatCurrency(position.currentPrice)}</td>
                                    <td className={`py-3 text-right font-medium ${position.unrealizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                        {formatCurrency(position.unrealizedPnL)}
                                        <span className="text-xs ml-1">
                                            ({formatPercent(position.unrealizedPnLPercent)})
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-8 text-gray-500">
                    <p>No holdings yet</p>
                    <p className="text-sm mt-1">Place your first trade to get started!</p>
                </div>
            )}
        </div>
    );
}
