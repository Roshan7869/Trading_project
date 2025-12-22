'use client'

import { use, useEffect, useState } from 'react'
import { useMarket } from '@/context/MarketContext'
import { useAuth } from '@/context/AuthContext'
import { useTradePanel } from '@/context/TradePanelContext'
import { portfolioAPI } from '@/lib/api'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import CandlestickChart from '@/components/charts/CandlestickChart'

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Link
                href="/dashboard"
                className="inline-flex items-center space-x-2 text-gray-600 hover:text-primary mb-6"
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

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        <CandlestickChart symbol={symbol} height={350} />
                        <StockHoldings holdings={holdings} price={price} />
                    </div>
                </div>

                {/* Right Column: Trade Actions */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">Invest in {symbol}</h3>
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

                        <div className="mt-6 pt-6 border-t text-center">
                            <p className="text-xs text-gray-400">
                                Available Balance: ₹{user?.walletBalance?.toLocaleString('en-IN') || 0}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
