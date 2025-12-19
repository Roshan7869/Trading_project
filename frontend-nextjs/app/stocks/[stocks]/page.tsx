'use client'

import { use, useEffect, useState } from 'react'
import { useMarket } from '@/context/MarketContext'
import { useAuth } from '@/context/AuthContext'
import { orderAPI, portfolioAPI } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import CandlestickChart from '@/components/charts/CandlestickChart'
import OrderConfirmationModal from '@/components/OrderConfirmationModal'
import { toast } from 'sonner'

export default function StockDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
    const unwrappedParams = use(params)
    const symbol = unwrappedParams.symbol
    const { marketData } = useMarket()
    const { user, refreshUser } = useAuth()
    const router = useRouter()

    const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY')
    const [quantity, setQuantity] = useState(1)
    const [confirmationOpen, setConfirmationOpen] = useState(false)
    const [holdings, setHoldings] = useState(0)

    const stockData = marketData.get(symbol)
    const price = stockData?.price || 0
    const change = stockData?.change || 0

    useEffect(() => {
        fetchHoldings()
    }, [])

    const fetchHoldings = async () => {
        try {
            const response = await portfolioAPI.get()
            const holding = response.data.holdings.find((h: any) => h.symbol === symbol)
            setHoldings(holding?.quantity || 0)
        } catch (error) {
            console.error('Failed to fetch holdings:', error)
        }
    }

    const handleInitialSubmit = () => {
        const totalAmount = price * quantity

        if (!price) {
            toast.error('Waiting for market price...')
            return
        }

        // Validate logic
        if (orderType === 'BUY' && user && user.walletBalance < totalAmount) {
            toast.error('Insufficient wallet balance')
            return
        }

        if (orderType === 'SELL' && holdings < quantity) {
            toast.error('Insufficient holdings to sell')
            return
        }

        setConfirmationOpen(true)
    }

    const executeOrder = async () => {
        try {
            await orderAPI.placeOrder({
                symbol,
                type: orderType,
                quantity,
                price,
            })

            toast.success(`${orderType} order placed successfully!`)
            await refreshUser()
            await fetchHoldings()

            // Reset quantity after success
            setQuantity(1)
        } catch (err: any) {
            const message = err.response?.data?.error || err.response?.data?.message || 'Order failed'
            toast.error(message)
            throw new Error(message) // Re-throw for modal to handle if needed
        }
    }

    const totalAmount = price * quantity

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Link
                href="/watchlist"
                className="inline-flex items-center space-x-2 text-gray-600 hover:text-primary mb-6"
            >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Watchlist</span>
            </Link>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Stock Info */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-4xl font-bold text-gray-900">{symbol}</h1>
                                <p className="text-gray-600">NSE</p>
                            </div>
                            {change >= 0 ? (
                                <TrendingUp className="h-12 w-12 text-primary" />
                            ) : (
                                <TrendingDown className="h-12 w-12 text-danger" />
                            )}
                        </div>

                        <div className="mb-6">
                            <p className="text-6xl font-bold text-gray-900 mb-2">
                                ₹{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </p>
                            <div className="flex items-center space-x-3">
                                <span
                                    className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-semibold ${change >= 0
                                        ? 'bg-primary/10 text-primary'
                                        : 'bg-danger/10 text-danger'
                                        }`}
                                >
                                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                                </span>
                                <span className="text-gray-500">
                                    {stockData?.timestamp
                                        ? new Date(stockData.timestamp).toLocaleString('en-IN')
                                        : ''}
                                </span>
                            </div>
                        </div>

                        {/* Real-Time Chart */}
                        <div className="mb-6">
                            <CandlestickChart symbol={symbol} height={350} />
                        </div>

                        {/* Holdings Info */}
                        {holdings > 0 && (
                            <div className="bg-secondary p-6 rounded-xl border border-gray-200">
                                <p className="text-gray-600 mb-2">Your Holdings</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {holdings} shares
                                    <span className="text-lg text-gray-600 ml-2">
                                        (₹{(holdings * price).toLocaleString('en-IN', { maximumFractionDigits: 2 })})
                                    </span>
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Order Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Place Order</h2>

                        {/* Order Type Toggle */}
                        <div className="flex space-x-2 mb-6">
                            <button
                                onClick={() => setOrderType('BUY')}
                                className={`flex-1 py-3 rounded-xl font-semibold transition ${orderType === 'BUY'
                                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                    : 'bg-secondary text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                BUY
                            </button>
                            <button
                                onClick={() => setOrderType('SELL')}
                                className={`flex-1 py-3 rounded-xl font-semibold transition ${orderType === 'SELL'
                                    ? 'bg-danger text-white shadow-lg shadow-danger/30'
                                    : 'bg-secondary text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                SELL
                            </button>
                        </div>

                        {/* Quantity Input */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Quantity
                            </label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                min="1"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                            />
                        </div>

                        {/* Price Display */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Price per share
                            </label>
                            <div className="px-4 py-3 bg-secondary rounded-xl">
                                <p className="text-xl font-bold text-gray-900">
                                    ₹{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>

                        {/* Total Amount */}
                        <div className="mb-6 p-4 bg-secondary rounded-xl border border-gray-200">
                            <p className="text-gray-600 mb-1">Total Amount</p>
                            <p className="text-2xl font-bold text-gray-900">
                                ₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </p>
                        </div>

                        {/* Place Order Button */}
                        <button
                            onClick={handleInitialSubmit}
                            disabled={!price}
                            className={`w-full py-4 rounded-full font-semibold text-white transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${orderType === 'BUY'
                                ? 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25'
                                : 'bg-danger hover:bg-danger/90 shadow-lg shadow-danger/25'
                                }`}
                        >
                            {orderType} {quantity} Share{quantity > 1 ? 's' : ''}
                        </button>

                        {/* Wallet Info */}
                        <div className="mt-4 text-center text-sm text-gray-500">
                            Available: ₹{(user?.walletBalance || 0).toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>
            </div>

            <OrderConfirmationModal
                isOpen={confirmationOpen}
                onClose={() => setConfirmationOpen(false)}
                onConfirm={executeOrder}
                symbol={symbol}
                side={orderType}
                quantity={quantity}
                price={price}
                totalAmount={totalAmount}
                holdings={holdings}
            />
        </div>
    )
}
