'use client'

import { useEffect, useState } from 'react'
import { useMarket } from '@/context/MarketContext'
import { watchlistAPI } from '@/lib/api'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Plus } from 'lucide-react'

export default function WatchlistPage() {
    const { marketData, connected } = useMarket()
    const [symbols, setSymbols] = useState<string[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchWatchlist()
    }, [])

    const fetchWatchlist = async () => {
        try {
            const response = await watchlistAPI.get()
            setSymbols(response.data.symbols)
        } catch (error) {
            console.error('Failed to fetch watchlist:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading watchlist...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Watchlist</h1>
                    <p className="text-gray-600 mt-2">
                        {connected ? (
                            <span className="flex items-center">
                                <span className="h-2 w-2 bg-primary rounded-full animate-pulse mr-2"></span>
                                Live market data
                            </span>
                        ) : (
                            'Connecting to market data...'
                        )}
                    </p>
                </div>
            </div>

            {/* Stock Cards Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {symbols.map((symbol) => {
                    const stockData = marketData.get(symbol)
                    const price = stockData?.price || 0
                    const change = stockData?.change || 0

                    return (
                        <Link
                            key={symbol}
                            href={`/stocks/${symbol}`}
                            className="block bg-white rounded-2xl shadow-lg hover:shadow-xl transition p-6"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{symbol}</h3>
                                    <p className="text-sm text-gray-500">NSE</p>
                                </div>
                                {change >= 0 ? (
                                    <TrendingUp className="h-6 w-6 text-primary" />
                                ) : (
                                    <TrendingDown className="h-6 w-6 text-danger" />
                                )}
                            </div>

                            <div className="mb-2">
                                <p className="text-3xl font-bold text-gray-900">
                                    ₹{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                </p>
                            </div>

                            <div className="flex items-center space-x-2">
                                <span
                                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${change >= 0
                                            ? 'bg-primary/10 text-primary'
                                            : 'bg-danger/10 text-danger'
                                        }`}
                                >
                                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                                </span>
                                <span className="text-sm text-gray-500">
                                    {stockData?.timestamp
                                        ? new Date(stockData.timestamp).toLocaleTimeString('en-IN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })
                                        : ''}
                                </span>
                            </div>
                        </Link>
                    )
                })}
            </div>

            {symbols.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
                    <Plus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Your watchlist is empty</p>
                    <p className="text-sm text-gray-500 mt-2">
                        Add stocks to track their prices in real-time
                    </p>
                </div>
            )}
        </div>
    )
}