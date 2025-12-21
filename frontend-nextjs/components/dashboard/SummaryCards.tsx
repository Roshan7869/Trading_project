import React from 'react';

interface SummaryCardsProps {
    loading: boolean;
    portfolio: {
        walletBalance: number;
        summary: {
            totalInvested: number;
            currentValue: number;
            totalPnL: number;
            totalPnLPercent: number;
        };
    } | null;
}

export function SummaryCards({ loading, portfolio }: SummaryCardsProps) {
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Wallet Balance */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border">
                <p className="text-sm text-gray-500 mb-1">Available Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                    {loading ? '...' : formatCurrency(portfolio?.walletBalance || 0)}
                </p>
            </div>

            {/* Invested Value */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border">
                <p className="text-sm text-gray-500 mb-1">Invested Value</p>
                <p className="text-2xl font-bold text-gray-900">
                    {loading ? '...' : formatCurrency(portfolio?.summary?.totalInvested || 0)}
                </p>
            </div>

            {/* Current Value */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border">
                <p className="text-sm text-gray-500 mb-1">Current Value</p>
                <p className="text-2xl font-bold text-gray-900">
                    {loading ? '...' : formatCurrency(portfolio?.summary?.currentValue || 0)}
                </p>
            </div>

            {/* P&L */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border">
                <p className="text-sm text-gray-500 mb-1">Total P&L</p>
                <p className={`text-2xl font-bold ${(portfolio?.summary?.totalPnL || 0) >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {loading ? '...' : formatCurrency(portfolio?.summary?.totalPnL || 0)}
                    <span className="text-sm ml-2">
                        {loading ? '' : formatPercent(portfolio?.summary?.totalPnLPercent || 0)}
                    </span>
                </p>
            </div>
        </div>
    );
}
