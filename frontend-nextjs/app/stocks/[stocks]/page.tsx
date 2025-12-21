'use client'

import { use, useEffect, useState } from 'react'
import { useMarket } from '@/context/MarketContext'
import { useAuth } from '@/context/AuthContext'
import { portfolioAPI } from '@/lib/api'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import CandlestickChart from '@/components/charts/CandlestickChart'

// New modular components
import StockHeader from '@/components/stocks/StockHeader'
import StockHoldings from '@/components/stocks/StockHoldings'
import OrderForm from '@/components/stocks/OrderForm'

export default function StockDetailPage({ params }: { params: Promise<{ stocks: string }> }) {
    const unwrappedParams = use(params)
    const symbol = unwrappedParams.stocks
    const { marketData } = useMarket()
    const { user, refreshUser } = useAuth()

    const [holdings, setHoldings] = useState(0)

    const stockData = marketData.get(symbol)
    const price = stockData?.price || 0
    const change = stockData?.change || 0
    const timestamp = stockData?.timestamp

    useEffect(() => {
        fetchHoldings()
    }, [])

    const fetchHoldings = async () => {
        try {
            const response = await portfolioAPI.get()
            const positions = response.data?.positions || []
            const holding = positions.find((h: any) => h.symbol === symbol)
            setHoldings(holding?.quantity || 0)
        } catch (error) {
            console.error('Failed to fetch holdings:', error)
            setHoldings(0)
        }
    }

    const handleOrderSuccess = async () => {
        await refreshUser()
        await fetchHoldings()
    }

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

                {/* Right Column: Order Form */}
                <div className="lg:col-span-1">
                    <OrderForm
                        symbol={symbol}
                        price={price}
                        change={change}
                        holdings={holdings}
                        walletBalance={user?.walletBalance || 0}
                        onOrderSuccess={handleOrderSuccess}
                    />
                </div>
            </div>
        </div>
    )
}
