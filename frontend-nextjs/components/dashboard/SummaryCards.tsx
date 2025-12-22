import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";

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
                <div className="text-2xl font-bold text-gray-900">
                    {loading ? <Skeleton className="h-8 w-24" /> : formatCurrency(portfolio?.walletBalance || 0)}
                </div>
            </div>

            {/* Invested Value */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border">
                <p className="text-sm text-gray-500 mb-1">Invested Value</p>
                <div className="text-2xl font-bold text-gray-900">
                    {loading ? <Skeleton className="h-8 w-24" /> : formatCurrency(portfolio?.summary?.totalInvested || 0)}
                </div>
            </div>

            {/* Current Value */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border">
                <p className="text-sm text-gray-500 mb-1">Current Value</p>
                <div className="text-2xl font-bold text-gray-900">
                    {loading ? <Skeleton className="h-8 w-24" /> : formatCurrency(portfolio?.summary?.currentValue || 0)}
                </div>
            </div>

            {/* P&L */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border">
                <p className="text-sm text-gray-500 mb-1">Total P&L</p>
                <div className="flex items-baseline gap-2">
                    {loading ? (
                        <Skeleton className="h-8 w-32" />
                    ) : (
                        <>
                            <div className={`text-2xl font-bold ${(portfolio?.summary?.totalPnL || 0) >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {formatCurrency(portfolio?.summary?.totalPnL || 0)}
                            </div>
                            <span className={`text-sm font-medium ${(portfolio?.summary?.totalPnL || 0) >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {formatPercent(portfolio?.summary?.totalPnLPercent || 0)}
                            </span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
