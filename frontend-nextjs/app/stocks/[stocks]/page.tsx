'use client'

import { use, useEffect, useState } from 'react'
import { useMarket } from '@/context/MarketContext'
import { useAuth } from '@/context/AuthContext'
import { useTradePanel } from '@/context/TradePanelContext'
import { portfolioAPI } from '@/lib/api'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ProfessionalChart from '@/components/Trading/ProfessionalChart'

// New modular components
import StockHeader from '@/components/stocks/StockHeader'
import StockHoldings from '@/components/stocks/StockHoldings'

export default function StockDetailPage({ params }: { params: Promise<{ stocks: string }> }) {
    const unwrappedParams = use(params)
    const symbol = unwrappedParams.stocks
    const { marketData, positions } = useMarket()
    const { user } = useAuth()
    const { openTradePanel } = useTradePanel()

    const stockData = marketData.get(symbol)
    const price = stockData?.price || 0
    const change = stockData?.change || 0
    const timestamp = stockData?.timestamp

    const holdings = positions.find(p => p.symbol === symbol)?.quantity || 0

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center space-x-2 text-slate-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Dashboard</span>
                </Link>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Column: Info & Chart */}
                    <div className="lg:col-span-2 space-y-8">
                        <StockHeader
                            symbol={symbol}
                            price={price}
                            change={change}
                            timestamp={timestamp}
                        />

                        <div className="space-y-4">
                            <ProfessionalChart symbol={symbol} />
                            <div className="bg-slate-900/50 rounded-2xl border border-slate-900 p-6 shadow-xl">
                                <StockHoldings holdings={holdings} price={price} />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Trade Actions */}
                    <div className="lg:col-span-1">
                        <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-800 p-8 sticky top-24">
                            <div className="mb-8">
                                <h3 className="text-xl font-bold text-white mb-2">Trade {symbol}</h3>
                                <p className="text-sm text-gray-500">
                                    {holdings > 0 ? `You own ${holdings} shares` : 'Start trading now'}
                                </p>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => openTradePanel(symbol, 'BUY')}
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-emerald-500/20 active:scale-95"
                                >
                                    BUY
                                </button>
                                <button
                                    onClick={() => openTradePanel(symbol, 'SELL')}
                                    className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-rose-500/20 active:scale-95"
                                >
                                    SELL
                                </button>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                                <p className="text-sm text-slate-400">
                                    Available Balance: <span className="text-white font-bold">₹{user?.walletBalance?.toLocaleString('en-IN') || 0}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
