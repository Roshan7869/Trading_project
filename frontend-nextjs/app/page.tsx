'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Menu, X, Zap, Shield, BarChart3, ArrowRight, Check, ChevronRight } from 'lucide-react'
import { BrokerSetupModal } from '@/components/Trading/BrokerSetupModal'

const SUPPORTED_BROKERS = [
    {
        name: 'Kotak Neo',
        logo: '🏦',
        color: 'from-red-500 to-orange-500',
        features: ['Zero Brokerage', 'Ultra-Low Latency']
    },
    {
        name: 'Angel One',
        logo: '👼',
        color: 'from-blue-500 to-cyan-500',
        features: ['Fast Execution', 'Crypto Trading']
    },
    {
        name: 'Zerodha Kite',
        logo: '🪁',
        color: 'from-green-500 to-emerald-500',
        features: ['Largest Broker', 'WebSocket']
    }
]

export default function LandingPage() {
    const router = useRouter()
    const [mounted, setMounted] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [showBrokerModal, setShowBrokerModal] = useState(false)

    useEffect(() => {
        setMounted(true)

        // Check if user is already logged in (only on client)
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token')
            if (token) {
                router.push('/dashboard')
            }
        }
    }, [router])

    const handleBrokerSuccess = (brokerName: string) => {
        console.log('Connected to:', brokerName)
        router.push('/dashboard')
    }

    // Show a loading skeleton that matches the page structure during SSR
    // This prevents hydration mismatch while maintaining SEO
    if (!mounted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <nav className="bg-transparent relative z-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                            <div className="flex items-center">
                                <span className="text-2xl font-bold text-white">PaperTrade</span>
                            </div>
                        </div>
                    </div>
                </nav>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                    <div className="text-center">
                        <div className="animate-pulse">
                            <div className="h-12 bg-gray-700 rounded w-3/4 mx-auto mb-6"></div>
                            <div className="h-6 bg-gray-700 rounded w-1/2 mx-auto mb-8"></div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Navigation */}
            <nav className="bg-transparent relative z-50 backdrop-blur-sm border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                                <BarChart3 className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                PaperTrade
                            </span>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-4">
                            <Link
                                href="/login"
                                className="px-6 py-2 text-gray-300 font-medium hover:text-white transition"
                            >
                                Login
                            </Link>
                            <Link
                                href="/register"
                                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-full hover:from-blue-600 hover:to-purple-700 transition shadow-lg shadow-purple-500/25"
                            >
                                Get Started
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden p-2 text-gray-300 hover:text-white transition"
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
                    <div className="md:hidden absolute top-16 left-0 w-full bg-slate-900/95 backdrop-blur-lg border-b border-white/10">
                        <div className="flex flex-col p-4 gap-3">
                            <Link
                                href="/login"
                                className="px-4 py-3 text-center font-medium text-gray-300 hover:bg-white/10 rounded-lg transition"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Login
                            </Link>
                            <Link
                                href="/register"
                                className="px-4 py-3 text-center font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:from-blue-600 hover:to-purple-700 transition"
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
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-8">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm text-gray-300">Real-time market simulation powered by live data</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
                        Trade Stocks with
                        <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Real Market Data
                        </span>
                    </h1>
                    <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
                        Connect your broker API and practice trading with real-time market data.
                        Zero risk, unlimited learning potential.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button
                            onClick={() => setShowBrokerModal(true)}
                            className="group px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg font-semibold rounded-full hover:from-blue-600 hover:to-purple-700 transition shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
                        >
                            <Zap className="w-5 h-5" />
                            Connect Your Broker
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <Link
                            href="/register"
                            className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white text-lg font-semibold rounded-full hover:bg-white/20 transition border border-white/20"
                        >
                            Start with Demo Mode
                        </Link>
                    </div>
                </div>

                {/* Broker Cards Section */}
                <div className="mt-24">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-white mb-4">Supported Brokers</h2>
                        <p className="text-gray-400 max-w-xl mx-auto">
                            Connect your existing broker account and trade with real market data in a risk-free environment.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {SUPPORTED_BROKERS.map((broker) => (
                            <div
                                key={broker.name}
                                className="group relative p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-white/30 transition-all duration-300 hover:transform hover:-translate-y-1"
                            >
                                <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${broker.color} text-4xl mb-4`}>
                                    {broker.logo}
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{broker.name}</h3>
                                <ul className="space-y-2 mb-4">
                                    {broker.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-2 text-gray-400">
                                            <Check className="w-4 h-4 text-green-400" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={() => setShowBrokerModal(true)}
                                    className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
                                >
                                    Connect
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Features Section */}
                <div className="mt-24 grid md:grid-cols-3 gap-8">
                    <div className="p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-blue-500/50 transition-all duration-300">
                        <div className="inline-flex p-3 bg-blue-500/20 rounded-xl mb-4">
                            <BarChart3 className="w-8 h-8 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Real-Time Market Data</h3>
                        <p className="text-gray-400">
                            Live prices from NSE, BSE, and F&O markets. Practice with actual market movements.
                        </p>
                    </div>
                    <div className="p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-green-500/50 transition-all duration-300">
                        <div className="inline-flex p-3 bg-green-500/20 rounded-xl mb-4">
                            <Shield className="w-8 h-8 text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Secure API Integration</h3>
                        <p className="text-gray-400">
                            AES-256 encrypted credentials. Your broker API keys are stored securely and never shared.
                        </p>
                    </div>
                    <div className="p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all duration-300">
                        <div className="inline-flex p-3 bg-purple-500/20 rounded-xl mb-4">
                            <Zap className="w-8 h-8 text-purple-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Instant Execution</h3>
                        <p className="text-gray-400">
                            Simulate trades instantly. Track P&L, positions, and portfolio performance in real-time.
                        </p>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="mt-24 text-center p-12 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl border border-white/10">
                    <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Trading?</h2>
                    <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                        Connect your broker API and start practicing with real market data today. No credit card required.
                    </p>
                    <button
                        onClick={() => setShowBrokerModal(true)}
                        className="px-10 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg font-semibold rounded-full hover:from-blue-600 hover:to-purple-700 transition shadow-lg shadow-purple-500/25"
                    >
                        Connect Your Broker Now
                    </button>
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t border-white/10 mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-purple-400" />
                            <span className="font-semibold text-white">PaperTrade</span>
                        </div>
                        <p className="text-gray-500 text-sm">
                            © 2024 PaperTrade. Practice trading with real market data.
                        </p>
                    </div>
                </div>
            </footer>

            {/* Broker Setup Modal */}
            <BrokerSetupModal
                isOpen={showBrokerModal}
                onClose={() => setShowBrokerModal(false)}
                onSuccess={handleBrokerSuccess}
            />
        </div>
    )
}