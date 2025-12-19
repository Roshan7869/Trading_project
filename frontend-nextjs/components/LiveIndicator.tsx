'use client'

import { useMarket } from '@/context/MarketContext'

export default function LiveIndicator() {
    const { connected } = useMarket()

    if (!connected) return null

    return (
        <span className="flex items-center">
            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="ml-2 text-xs text-gray-400 font-medium">Live</span>
        </span>
    )
}
