'use client'

import { useEffect, useState } from 'react'
import { useMarket } from '@/context/MarketContext'
import { watchlistAPI } from '@/lib/api'
import Link from 'next/link'
import { Trash2, Plus, Search, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { WatchlistSkeleton } from '@/components/Skeletons'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from '@/components/ui/dialog'

// List of available symbols (matching backend mock/real data)
const AVAILABLE_SYMBOLS = [
    'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK',
    'ITC', 'SBIN', 'BHARTIARTL', 'HINDUNILVR', 'LT',
    'TATAMOTORS', 'AXISBANK', 'ADANIENT', 'WIPRO', 'BAJFINANCE'
].sort()

export default function WatchlistPage() {
    const { marketData, connected } = useMarket()
    const [symbols, setSymbols] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [dialogOpen, setDialogOpen] = useState(false)
    const [processing, setProcessing] = useState(false)

    useEffect(() => {
        fetchWatchlist()
    }, [])

    const fetchWatchlist = async () => {
        try {
            const response = await watchlistAPI.get()
            setSymbols(response.data.symbols || [])
        } catch (error) {
            console.error('Failed to fetch watchlist:', error)
            toast.error('Failed to load watchlist')
        } finally {
            setLoading(false)
        }
    }

    const handleAddStock = async (symbol: string) => {
        if (symbols.includes(symbol)) {
            toast.info(`${symbol} is already in your watchlist`)
            return
        }

        try {
            setProcessing(true)
            await watchlistAPI.add(symbol)
            setSymbols((prev) => [...prev, symbol])
            toast.success(`${symbol} added to watchlist`)
            setDialogOpen(false)
            setSearchQuery('')
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to add stock')
        } finally {
            setProcessing(false)
        }
    }

    const handleRemoveStock = async (e: React.MouseEvent, symbol: string) => {
        e.preventDefault() // Prevent navigation to stock detail
        e.stopPropagation()

        if (!confirm(`Are you sure you want to remove ${symbol}?`)) return

        try {
            await watchlistAPI.remove(symbol)
            setSymbols((prev) => prev.filter((s) => s !== symbol))
            toast.success(`${symbol} removed`)
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to remove stock')
        }
    }

    // Filter available symbols not in watchlist
    const filteredSymbols = AVAILABLE_SYMBOLS.filter(
        (s) =>
            !symbols.includes(s) &&
            s.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Watchlist</h1>
                        <p className="text-gray-600 mt-2">Connecting to market...</p>
                    </div>
                </div>
                <WatchlistSkeleton />
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Watchlist</h1>
                    <p className="text-gray-600 mt-2 text-sm">
                        {connected ? (
                            <span className="flex items-center">
                                <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
                                Live market data
                            </span>
                        ) : (
                            <span className="flex items-center text-red-500">
                                <span className="h-2 w-2 bg-red-500 rounded-full mr-2"></span>
                                Connecting...
                            </span>
                        )}
                    </p>
                </div>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-semibold transition shadow-md">
                            <Plus className="w-5 h-5" />
                            <span className="hidden sm:inline">Add Symbol</span>
                        </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add to Watchlist</DialogTitle>
                        </DialogHeader>

                        <div className="relative mt-2">
                            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search symbol (e.g. RELIANCE)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                autoFocus
                            />
                        </div>

                        <div className="mt-4 max-h-[300px] overflow-y-auto space-y-2">
                            {filteredSymbols.length > 0 ? (
                                filteredSymbols.map((symbol) => (
                                    <button
                                        key={symbol}
                                        onClick={() => handleAddStock(symbol)}
                                        disabled={processing}
                                        className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg font-medium transition flex justify-between items-center"
                                    >
                                        <span>{symbol}</span>
                                        <Plus className="h-4 w-4 text-gray-400" />
                                    </button>
                                ))
                            ) : (
                                <p className="text-center text-gray-500 py-6 text-sm">
                                    {searchQuery ? 'No symbols found' : 'Type to search...'}
                                </p>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stock Cards Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {symbols.map((symbol) => {
                    const stockData = marketData.get(symbol)
                    const price = stockData?.price || 0
                    const change = stockData?.change || 0
                    const isPositive = change >= 0

                    return (
                        <Link
                            key={symbol}
                            href={`/stocks/${symbol}`}
                            className="block bg-white rounded-2xl shadow-sm hover:shadow-lg transition p-6 border border-gray-100 relative group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{symbol}</h3>
                                    <p className="text-sm text-gray-500">NSE</p>
                                </div>

                                <button
                                    onClick={(e) => handleRemoveStock(e, symbol)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition absolute top-4 right-4"
                                    title="Remove from watchlist"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>

                                <div className={`ml-auto ${isPositive ? 'text-primary' : 'text-danger'}`}>
                                    {isPositive ? (
                                        <TrendingUp className="h-6 w-6" />
                                    ) : (
                                        <TrendingDown className="h-6 w-6" />
                                    )}
                                </div>
                            </div>

                            <div className="mb-2">
                                <p className="text-3xl font-bold text-gray-900">
                                    ₹{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                </p>
                            </div>

                            <div className="flex items-center space-x-2">
                                <span
                                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${isPositive
                                        ? 'bg-primary/10 text-primary'
                                        : 'bg-danger/10 text-danger'
                                        }`}
                                >
                                    {isPositive ? '+' : ''}{change.toFixed(2)}%
                                </span>
                                <span className="text-sm text-gray-500">
                                    {stockData?.timestamp
                                        ? new Date(stockData.timestamp).toLocaleTimeString('en-IN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })
                                        : 'Waiting for data...'}
                                </span>
                            </div>
                        </Link>
                    )
                })}
            </div>

            {symbols.length === 0 && !loading && (
                <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100 cursor-pointer" onClick={() => setDialogOpen(true)}>
                    <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                        <Plus className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">Your watchlist is empty</h3>
                    <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                        Track your favorite stocks in real-time. Click to add your first symbol.
                    </p>
                    <button className="mt-6 text-primary font-semibold hover:underline">
                        Add Symbol &rarr;
                    </button>
                </div>
            )}
        </div>
    )
}