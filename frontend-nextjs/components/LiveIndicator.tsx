'use client'

import { useMarket } from '@/context/MarketContext'
import { useState, useEffect } from 'react'

export default function LiveIndicator() {
    const { connected } = useMarket()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // During SSR and initial render, show nothing to prevent hydration mismatch
    if (!mounted) {
        return <span className="flex items-center h-4" />
    }

    if (!connected) {
        return (
            <span className="flex items-center">
                <span className="h-2 w-2 bg-gray-400 rounded-full"></span>
                <span className="ml-2 text-xs text-gray-400 font-medium">Offline</span>
            </span>
        )
    }

    return (
        <span className="flex items-center">
            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="ml-2 text-xs text-gray-400 font-medium">Live</span>
        </span>
    )
}
