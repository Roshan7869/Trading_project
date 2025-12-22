'use client'

import { useEffect, useState } from 'react'
import { useMarket } from '@/context/MarketContext'
import { watchlistAPI } from '@/lib/api'
import Link from 'next/link'
import { Trash2, Plus, Search, TrendingUp, TrendingDown, MoreVertical, X, FolderPlus } from 'lucide-react'
import { WatchlistSkeleton } from '@/components/Skeletons'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'

// List of available symbols (matching backend mock/real data)
const AVAILABLE_SYMBOLS = [
    'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK',
    'ITC', 'SBIN', 'BHARTIARTL', 'HINDUNILVR', 'LT',
    'TATAMOTORS', 'AXISBANK', 'ADANIENT', 'WIPRO', 'BAJFINANCE',
    'ASIANPAINT', 'MARUTI', 'TITAN', 'ULTRACEMCO', 'SUNPHARMA'
].sort()

interface Watchlist {
    _id: string;
    name: string;
    isDefault: boolean;
    symbols: string[];
}

export default function WatchlistPage() {
    const { marketData, connected } = useMarket()

    // State
    const [watchlists, setWatchlists] = useState<Watchlist[]>([])
    const [activeTabId, setActiveTabId] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    // Dialog States
    const [addSymbolOpen, setAddSymbolOpen] = useState(false)
    const [createListOpen, setCreateListOpen] = useState(false)
    const [newListName, setNewListName] = useState('')
    const [processing, setProcessing] = useState(false)

    useEffect(() => {
        fetchWatchlists()
    }, [])

    const fetchWatchlists = async () => {
        try {
            const response = await watchlistAPI.getAll()
            const lists = response.data
            setWatchlists(lists)

            // Set active tab if not set
            if (lists.length > 0 && !activeTabId) {
                const def = lists.find((w: any) => w.isDefault)
                setActiveTabId(def?._id || lists[0]._id)
            }
        } catch (error) {
            console.error('Failed to fetch watchlists:', error)
            toast.error('Failed to load watchlists')
        } finally {
            setLoading(false)
        }
    }

    const activeWatchlist = watchlists.find(w => w._id === activeTabId) || watchlists[0]

    // --- ACTIONS ---

    const handleCreateWatchlist = async () => {
        if (!newListName.trim()) {
            toast.error('Watchlist name is required')
            return
        }

        try {
            setProcessing(true)
            const response = await watchlistAPI.create(newListName)
            setWatchlists([...watchlists, response.data])
            setActiveTabId(response.data._id) // Switch to new list
            toast.success(`Created "${newListName}"`)
            setCreateListOpen(false)
            setNewListName('')
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create watchlist')
        } finally {
            setProcessing(false)
        }
    }

    const handleDeleteWatchlist = async () => {
        if (!activeWatchlist || activeWatchlist.isDefault) {
            toast.error('Cannot delete default watchlist')
            return
        }

        if (!confirm(`Delete list "${activeWatchlist.name}"?`)) return

        try {
            setProcessing(true)
            await watchlistAPI.delete(activeWatchlist._id)

            const remaining = watchlists.filter(w => w._id !== activeWatchlist._id)
            setWatchlists(remaining)
            // Switch to default or first
            const def = remaining.find(w => w.isDefault)
            setActiveTabId(def?._id || remaining[0]._id)

            toast.success('Watchlist deleted')
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete watchlist')
        } finally {
            setProcessing(false)
        }
    }

    const handleAddStock = async (symbol: string) => {
        if (!activeWatchlist) return

        if (activeWatchlist.symbols.includes(symbol)) {
            toast.info(`${symbol} is already in the list`)
            return
        }

        try {
            setProcessing(true)
            const response = await watchlistAPI.add(symbol, activeWatchlist._id)

            // Update local state deeply
            setWatchlists(prev => prev.map(w =>
                w._id === activeWatchlist._id
                    ? { ...w, symbols: response.data.symbols }
                    : w
            ))

            toast.success(`${symbol} added`)
            setAddSymbolOpen(false)
            setSearchQuery('')
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to add stock')
        } finally {
            setProcessing(false)
        }
    }

    const handleRemoveStock = async (e: React.MouseEvent, symbol: string) => {
        e.preventDefault()
        e.stopPropagation()
        if (!activeWatchlist) return

        if (!confirm(`Remove ${symbol} from ${activeWatchlist.name}?`)) return

        try {
            const response = await watchlistAPI.remove(symbol, activeWatchlist._id)
            // Update local state deeply
            setWatchlists(prev => prev.map(w =>
                w._id === activeWatchlist._id
                    ? { ...w, symbols: response.data.symbols }
                    : w
            ))
            toast.success(`${symbol} removed`)
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to remove stock')
        }
    }

    // Filter available symbols not in CURRENT watchlist
    const filteredSymbols = AVAILABLE_SYMBOLS.filter(
        (s) =>
            activeWatchlist &&
            !activeWatchlist.symbols.includes(s) &&
            s.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) return <WatchlistSkeleton />

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">

            {/* Header & Tabs */}
            <div className="mb-8 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Watchlists</h1>
                        <p className="text-gray-600 mt-1 text-sm flex items-center gap-2">
                            {connected ? (
                                <span className="flex items-center text-emerald-600 font-medium">
                                    <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse mr-2"></span>
                                    Live
                                </span>
                            ) : (
                                <span className="flex items-center text-rose-500 font-medium">
                                    <span className="h-2 w-2 bg-rose-500 rounded-full mr-2"></span>
                                    Reconnecting...
                                </span>
                            )}
                        </p>
                    </div>

                    {/* Create New List Button (Dialog) */}
                    <Dialog open={createListOpen} onOpenChange={setCreateListOpen}>
                        <DialogTrigger asChild>
                            <button className="flex items-center gap-2 text-primary hover:bg-primary/5 px-4 py-2 rounded-lg font-semibold transition">
                                <FolderPlus className="w-5 h-5" />
                                <span className="hidden sm:inline">New List</span>
                            </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-sm">
                            <DialogHeader>
                                <DialogTitle>Create New Watchlist</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-2">
                                <input
                                    type="text"
                                    placeholder="List Name (e.g. Banks)"
                                    value={newListName}
                                    onChange={(e) => setNewListName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                    autoFocus
                                />
                                <button
                                    onClick={handleCreateWatchlist}
                                    disabled={processing || !newListName.trim()}
                                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
                                >
                                    {processing ? 'Creating...' : 'Create Watchlist'}
                                </button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide border-b px-1">
                    {watchlists.map(list => (
                        <button
                            key={list._id}
                            onClick={() => setActiveTabId(list._id)}
                            className={`px-5 py-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 ${activeTabId === list._id
                                    ? 'bg-gray-900 text-white shadow-md'
                                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            {list.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Active List Actions */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                    {activeWatchlist?.name}
                    <span className="text-gray-400 text-sm font-normal ml-2">({activeWatchlist?.symbols.length || 0} items)</span>
                </h2>

                <div className="flex gap-2">
                    {!activeWatchlist?.isDefault && (
                        <button
                            onClick={handleDeleteWatchlist}
                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete this watchlist"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}

                    <Dialog open={addSymbolOpen} onOpenChange={setAddSymbolOpen}>
                        <DialogTrigger asChild>
                            <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-semibold transition shadow-md">
                                <Plus className="w-5 h-5" />
                                <span className="hidden sm:inline">Add Stock</span>
                            </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Add to {activeWatchlist?.name}</DialogTitle>
                            </DialogHeader>

                            <div className="relative mt-2">
                                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search symbol..."
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
                                        {searchQuery ? 'No matching symbols found' : 'Type to search...'}
                                    </p>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Stock Cards Grid */}
            {activeWatchlist && activeWatchlist.symbols.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeWatchlist.symbols.map((symbol) => {
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
                                        <X className="h-5 w-5" />
                                    </button>

                                    <div className={`ml-auto ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
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
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'bg-rose-50 text-rose-700'
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
                                            : ' Waiting...'}
                                    </span>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            ) : (
                // Empty State
                <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100 border-dashed" onClick={() => setAddSymbolOpen(true)}>
                    <div className="h-16 w-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4 cursor-pointer hover:bg-gray-100 transition">
                        <Plus className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">List is empty</h3>
                    <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                        Add stocks to track them here.
                    </p>
                    <button className="mt-6 text-primary font-semibold hover:underline">
                        Add Symbol &rarr;
                    </button>
                </div>
            )}
        </div>
    )
}