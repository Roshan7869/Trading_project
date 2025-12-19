'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export default function LandingPage() {
    const router = useRouter()
    const [mounted, setMounted] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    useEffect(() => {
        setMounted(true)

        // Check if user is already logged in
        const token = localStorage.getItem('token')
        if (token) {
            router.push('/dashboard')
        }
    }, [router])

    if (!mounted) return null

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary">
            {/* Navigation */}
            <nav className="bg-white shadow-sm relative z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <span className="text-2xl font-bold text-primary">PaperTrade</span>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex space-x-4">
                            <Link
                                href="/login"
                                className="px-6 py-2 text-primary font-medium hover:bg-secondary rounded-full transition"
                            >
                                Login
                            </Link>
                            <Link
                                href="/register"
                                className="px-6 py-2 bg-primary text-white font-medium rounded-full hover:bg-primary/90 transition"
                            >
                                Get Started
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden p-2 text-gray-600 hover:text-primary transition"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? (
                                <X className="w-6 h-6" />
                            ) : (
                                <Menu className="w-6 h-6" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {mobileMenuOpen && (
                    <div className="md:hidden absolute top-16 left-0 w-full bg-white shadow-lg border-t animate-in slide-in-from-top-2 duration-200">
                        <div className="flex flex-col p-4 gap-3">
                            <Link
                                href="/login"
                                className="px-4 py-3 text-center font-medium text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-100 transition"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Login
                            </Link>
                            <Link
                                href="/register"
                                className="px-4 py-3 text-center font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition shadow-md"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Get Started
                            </Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="text-center">
                    <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                        Trade Stocks with
                        <span className="text-primary"> Virtual Money</span>
                    </h1>
                    <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                        Practice trading Indian stocks in real-time without risking real money.
                        Perfect for learning and testing strategies.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link
                            href="/register"
                            className="px-8 py-4 bg-primary text-white text-lg font-semibold rounded-full hover:bg-primary/90 transition shadow-lg text-center"
                        >
                            Start Trading Free
                        </Link>
                        <Link
                            href="/login"
                            className="px-8 py-4 bg-white text-primary text-lg font-semibold rounded-full hover:bg-secondary transition shadow-lg text-center"
                        >
                            Login
                        </Link>
                    </div>
                </div>

                {/* Features */}
                <div className="mt-20 grid md:grid-cols-3 gap-8">
                    <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition duration-300">
                        <div className="text-4xl mb-4 bg-blue-50 w-16 h-16 flex items-center justify-center rounded-2xl">📈</div>
                        <h3 className="text-xl font-bold mb-2">Real-Time Prices</h3>
                        <p className="text-gray-600">
                            Live market data simulation for popular Indian stocks including RELIANCE, TCS, INFY and more.
                        </p>
                    </div>
                    <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition duration-300">
                        <div className="text-4xl mb-4 bg-green-50 w-16 h-16 flex items-center justify-center rounded-2xl">💼</div>
                        <h3 className="text-xl font-bold mb-2">Virtual Portfolio</h3>
                        <p className="text-gray-600">
                            Start with ₹1,00,000 virtual cash. Track your investments and see real-time P&L.
                        </p>
                    </div>
                    <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition duration-300">
                        <div className="text-4xl mb-4 bg-purple-50 w-16 h-16 flex items-center justify-center rounded-2xl">⚡</div>
                        <h3 className="text-xl font-bold mb-2">Instant Execution</h3>
                        <p className="text-gray-600">
                            Place buy and sell orders instantly. Practice trading strategies risk-free.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}