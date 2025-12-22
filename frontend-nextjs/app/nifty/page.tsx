'use client';

import { useEffect, useState } from 'react';
import { useMarket } from '@/context/MarketContext';
import { marketAPI } from '@/lib/api';
import Link from 'next/link';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function NiftyPage() {
    const { connected } = useMarket();
    const [stocks, setStocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [marketStatus, setMarketStatus] = useState<any>(null);

    useEffect(() => {
        fetchNiftyData();
        const interval = setInterval(fetchNiftyData, 10000); // Poll every 10s for full list update
        return () => clearInterval(interval);
    }, []);

    const fetchNiftyData = async () => {
        try {
            const response = await marketAPI.getNiftyStocks();
            if (response.data?.stocks) {
                setStocks(response.data.stocks);
                setMarketStatus({
                    isOpen: true, // simplified
                    index: response.data.index
                });
            }
        } catch (error) {
            console.error('Failed to fetch Nifty data:', error);
            if (loading) toast.error('Failed to load Nifty 50 data');
        } finally {
            setLoading(false);
        }
    };

    // Filter stocks
    const filteredStocks = stocks.filter(stock =>
        stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Calculate Nifty Index Value (Simple Average for display or specific logic if provided)
    // For now, we'll just show the count or a mock index value if not provided
    const niftyIndexValue = stocks.length > 0
        ? stocks.reduce((acc, stock) => acc + stock.price, 0) / stocks.length * 10 // Mock index calculation
        : 0;

    const gainers = stocks.filter(s => s.change >= 0).length;
    const losers = stocks.filter(s => s.change < 0).length;

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
                    <div className="h-4 w-48 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header Section */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-gray-900">NIFTY 50</h1>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                    {connected ? 'LIVE' : 'OFFLINE'}
                                </span>
                            </div>
                            <p className="text-gray-500 mt-1">
                                National Stock Exchange of India • Top 50 Companies
                            </p>
                        </div>

                        {/* Market Breadth */}
                        <div className="flex items-center gap-6 bg-gray-50 px-4 py-2 rounded-lg border">
                            <div className="text-center">
                                <p className="text-xs text-gray-500 uppercase tracking-wider">Gainers</p>
                                <p className="text-lg font-bold text-emerald-600">{gainers}</p>
                            </div>
                            <div className="h-8 w-px bg-gray-200"></div>
                            <div className="text-center">
                                <p className="text-xs text-gray-500 uppercase tracking-wider">Losers</p>
                                <p className="text-lg font-bold text-rose-600">{losers}</p>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="mt-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search Nifty 50 stocks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stocks Grid */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredStocks.map((stock) => (
                        <Link
                            key={stock.symbol}
                            href={`/stocks/${stock.symbol.toUpperCase()}`}
                            className="group bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition duration-200"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition">
                                        {stock.symbol.replace('.NS', '')}
                                    </h3>
                                    <p className="text-xs text-gray-500 truncate max-w-[120px]" title={stock.name}>
                                        {stock.name || 'NSE Equity'}
                                    </p>
                                </div>
                                <div className={`p-1.5 rounded-lg ${stock.change >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                    }`}>
                                    {stock.change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                </div>
                            </div>

                            <div className="mt-4 flex items-end justify-between">
                                <div>
                                    <p className="text-lg font-bold text-gray-900">
                                        ₹{stock.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className={`text-sm font-semibold ${stock.change >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                    }`}>
                                    {stock.change > 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                                </div>
                            </div>

                            {/* Mini Sparkline Bar (Visual only) */}
                            <div className="mt-3 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${stock.change >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                    style={{ width: `${Math.min(Math.abs(stock.changePercent) * 10, 100)}%` }}
                                ></div>
                            </div>
                        </Link>
                    ))}
                </div>

                {filteredStocks.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No stocks found matching "{searchQuery}"</p>
                    </div>
                )}
            </main>
        </div>
    );
}
