'use client'

import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useMarket } from '@/context/MarketContext'
import { TrendingUp, Wallet, User, LogOut } from 'lucide-react'

export default function Header() {
    const { user, logout } = useAuth()
    const { connected } = useMarket()

    return (
        <header className="bg-white shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href="/dashboard" className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-primary">PaperTrade</span>
                        {connected && (
                            <span className="flex items-center">
                                <span className="h-2 w-2 bg-primary rounded-full animate-pulse"></span>
                                <span className="ml-2 text-xs text-gray-500">Live</span>
                            </span>
                        )}
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden md:flex space-x-8">
                        <Link
                            href="/dashboard"
                            className="text-gray-700 hover:text-primary font-medium transition"
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/watchlist"
                            className="text-gray-700 hover:text-primary font-medium transition"
                        >
                            Watchlist
                        </Link>
                        <Link
                            href="/orders"
                            className="text-gray-700 hover:text-primary font-medium transition"
                        >
                            Orders
                        </Link>
                    </nav>

                    {/* User Info */}
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 bg-secondary px-4 py-2 rounded-full">
                            <Wallet className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-gray-900">
                                ₹{user?.walletBalance.toLocaleString('en-IN')}
                            </span>
                        </div>
                        <button
                            onClick={logout}
                            className="flex items-center space-x-2 text-gray-700 hover:text-danger transition"
                            title="Logout"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    )
}
