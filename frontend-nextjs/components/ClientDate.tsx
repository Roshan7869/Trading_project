'use client'

import { useState, useEffect } from 'react'

interface ClientDateProps {
    date: string | Date
    format?: 'short' | 'long' | 'relative'
}

/**
 * ClientDate component that only renders formatted dates on the client side
 * to prevent hydration mismatch errors caused by locale differences.
 */
export default function ClientDate({ date, format = 'short' }: ClientDateProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // During SSR, return a placeholder
    if (!mounted) {
        return <span className="inline-block min-w-20">--</span>
    }

    if (!date) return <span>--</span>;

    const dateObj = typeof date === 'string' ? new Date(date) : date

    if (isNaN(dateObj.getTime())) return <span>--</span>


    if (format === 'relative') {
        const now = new Date()
        const diffMs = now.getTime() - dateObj.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)

        if (diffMins < 1) return <span>Just now</span>
        if (diffMins < 60) return <span>{diffMins}m ago</span>
        if (diffHours < 24) return <span>{diffHours}h ago</span>
        if (diffDays < 7) return <span>{diffDays}d ago</span>
    }

    const formatted = dateObj.toLocaleString('en-IN', {
        dateStyle: format === 'long' ? 'medium' : 'short',
        timeStyle: 'short',
    })

    return <span>{formatted}</span>
}
