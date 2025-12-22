import React, { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface MarketData {
    symbol: string;
    price: number;
    change: number;
}

interface MarketMoversProps {
    marketData: Map<string, MarketData>;
    onSelectStock: (symbol: string) => void;
    loading?: boolean;
}

export function MarketMovers({ marketData, onSelectStock, loading }: MarketMoversProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(value);
    };

    const formatPercent = (value: number) => {
        return `${Math.abs(value).toFixed(2)}%`;
    };

    const { gainers, losers } = useMemo(() => {
        const allStocks = Array.from(marketData.values());
        // Filter valid data
        const validParams = allStocks.filter(s => s && s.price > 0);

        const sorted = [...validParams].sort((a, b) => b.change - a.change);

        // Top 5 Gainers
        const g = sorted.filter(s => s.change > 0).slice(0, 5);
        // Top 5 Losers (reverse sorted, or filter < 0 and sort ascending)
        const l = sorted.filter(s => s.change < 0).reverse().slice(0, 5); // Simplest: filter negatives then reverse (biggest loss first)
        // Actually, sorted is Descending (10, 5, -2, -5). 
        // Negatives are at the end: ..., -2, -5.
        // We want Biggest Loss first (-5, -2).
        // So take slice -5 and reverse? Or just sort ascending.

        const losersSorted = [...validParams].filter(s => s.change < 0).sort((a, b) => a.change - b.change).slice(0, 5);

        return { gainers: g, losers: losersSorted };
    }, [marketData]);

    const renderList = (stocks: MarketData[]) => (
        <div className="space-y-3 mt-4">
            {loading ? (
                Array(5).fill(0).map((_, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                ))
            ) : stocks.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No data available</div>
            ) : (
                stocks.map(stock => (
                    <div
                        key={stock.symbol}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition"
                        onClick={() => onSelectStock(stock.symbol)}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${stock.change >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                {stock.change >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">{stock.symbol}</p>
                                <p className="text-xs text-gray-500">{formatCurrency(stock.price)}</p>
                            </div>
                        </div>
                        <div className={`text-right ${stock.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            <p className="font-bold">{formatPercent(stock.change)}</p>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    return (
        <div className="bg-white rounded-2xl shadow-sm p-6 border h-full">
            <h2 className="text-lg font-semibold mb-4">Daily Movers</h2>
            <Tabs defaultValue="gainers" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="gainers">Top Gainers</TabsTrigger>
                    <TabsTrigger value="losers">Top Losers</TabsTrigger>
                </TabsList>
                <TabsContent value="gainers">
                    {renderList(gainers)}
                </TabsContent>
                <TabsContent value="losers">
                    {renderList(losers)}
                </TabsContent>
            </Tabs>
        </div>
    );
}
