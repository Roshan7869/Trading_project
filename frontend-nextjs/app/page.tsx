'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    TrendingUp,
    Shield,
    Zap,
    Users,
    ArrowRight,
    BarChart2,
    Lock,
    Globe,
    CheckCircle,
    Activity,
    LogOut
} from 'lucide-react'
import BrokerSetupModal from '@/components/Trading/BrokerSetupModal'

import { useUser, useClerk } from '@clerk/nextjs'

export default function LandingPage() {
    const router = useRouter()
    const { isSignedIn, user } = useUser()
    const { signOut } = useClerk()
    const [showBrokerModal, setShowBrokerModal] = useState(false)
    const [initialBroker, setInitialBroker] = useState<string | null>(null)

    // Removed legacy localStorage check
    const isLoggedIn = !!isSignedIn

    const handleStartTrading = () => {
        if (isLoggedIn) {
            router.push('/dashboard')
        } else {
            router.push('/login')
        }
    }

    const handleConnectBroker = (brokerName?: string) => {
        if (isLoggedIn) {
            setInitialBroker(brokerName || null)
            setShowBrokerModal(true)
        } else {
            router.push('/login')
        }
    }

    const handleLogout = async () => {
        await signOut()
        router.refresh()
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <div className="bg-emerald-600 p-2 rounded-lg">
                                <TrendingUp className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xl font-bold text-gray-900">PaperTrade</span>
                        </div>

                        <nav className="hidden md:flex items-center gap-8">
                            <a href="#features" className="text-gray-600 hover:text-emerald-600 transition">Features</a>
                            <a href="#brokers" className="text-gray-600 hover:text-emerald-600 transition">Brokers</a>
                            <a href="#about" className="text-gray-600 hover:text-emerald-600 transition">About</a>
                        </nav>

                        <div className="flex items-center gap-4">
                            {isLoggedIn ? (
                                <>
                                    <button
                                        onClick={() => router.push('/dashboard')}
                                        className="text-gray-600 hover:text-emerald-600 font-medium"
                                    >
                                        Dashboard
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="p-2 text-gray-500 hover:text-red-500 transition"
                                    >
                                        <LogOut className="h-5 w-5" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        className="text-gray-600 hover:text-emerald-600 font-medium"
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium"
                                    >
                                        Get Started
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full font-medium text-sm mb-6">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Live Market Data & Multi-Broker Support
                        </div>
                        <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
                            Master the Markets without <br />
                            <span className="text-emerald-600">Risking Capital</span>
                        </h1>
                        <p className="text-xl text-gray-600 mb-10 leading-relaxed">
                            Experience real trading with virtual money. Connect your favorite brokers,
                            test strategies in real-time, and build confidence before you invest.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={handleStartTrading}
                                className="w-full sm:w-auto px-8 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                            >
                                Start Trading Now
                                <ArrowRight className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => handleConnectBroker()}
                                className="w-full sm:w-auto px-8 py-4 bg-white text-emerald-700 border-2 border-emerald-100 rounded-xl hover:border-emerald-200 hover:bg-emerald-50 transition font-bold text-lg flex items-center justify-center gap-2"
                            >
                                <Zap className="h-5 w-5" />
                                Connect Broker
                            </button>
                        </div>
                    </div>

                    {/* Dashboard Preview */}
                    <div className="mt-16 mx-auto max-w-5xl">
                        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-100 bg-white">
                            <div className="absolute top-0 w-full h-11 bg-gray-50 border-b border-gray-100 flex items-center px-4 gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                <div className="w-3 h-3 rounded-full bg-green-400" />
                            </div>
                            <div className="pt-12 pb-8 px-4 bg-gray-50/50">
                                {/* Abstract graphical representation of a trading interface */}
                                <div className="grid grid-cols-12 gap-4 h-96">
                                    <div className="col-span-3 bg-white rounded-lg shadow-sm p-4 animate-pulse">
                                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                                        <div className="space-y-3">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <div key={i} className="flex justify-between">
                                                    <div className="h-3 bg-gray-100 rounded w-1/3"></div>
                                                    <div className="h-3 bg-green-100 rounded w-1/4"></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="col-span-6 bg-white rounded-lg shadow-sm p-4 flex items-center justify-center">
                                        <div className="text-center">
                                            <Activity className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                                            <p className="text-gray-400 font-medium">Real-Time Charting Engine</p>
                                        </div>
                                    </div>
                                    <div className="col-span-3 bg-white rounded-lg shadow-sm p-4 animate-pulse">
                                        <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                                        <div className="h-8 bg-emerald-50 rounded mb-2"></div>
                                        <div className="h-8 bg-red-50 rounded"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Broker Integration Section */}
            <section id="brokers" className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-emerald-600 font-semibold tracking-wider uppercase text-sm">Integrations</span>
                        <h2 className="text-3xl font-bold text-gray-900 mt-2">Trusted by Top Brokers</h2>
                        <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
                            Seamlessly connect your existing brokerage accounts to access real-time market data
                            and execute simulated trades with professional-grade precision.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                name: 'Angel One',
                                image: '/brokers/angel-one.jpg', // Updated path
                                desc: 'Experience lightning-fast execution and robust API availability.',
                                features: ['Smart API', 'Historical Data', 'Real-time Feeds'],
                                code: 'ANGEL_ONE'
                            },
                            {
                                name: 'Zerodha',
                                image: '/brokers/zerodha.png', // Updated path
                                desc: 'India\'s largest stock broker with a powerful technology stack.',
                                features: ['Kite Connect', 'WebSocket', 'Market Depth'],
                                code: 'ZERODHA_KITE'
                            },
                            {
                                name: 'Kotak Neo',
                                image: '/brokers/kotak-neo.png', // Updated path
                                desc: 'Zero brokerage on intraday trades with high-speed reliability.',
                                features: ['Neo API', 'Oauth 2.0', 'Option Chain'],
                                code: 'KOTAK_NEO'
                            }
                        ].map((broker) => (
                            <div key={broker.name} className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group">
                                <div className="h-24 flex items-center justify-center mb-6">
                                    {/* Using standard img tag for simplicity with the new local files */}
                                    <img
                                        src={broker.image}
                                        alt={broker.name}
                                        className="h-16 object-contain group-hover:scale-110 transition-transform duration-300"
                                    />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 text-center mb-3">{broker.name}</h3>
                                <p className="text-gray-600 text-center text-sm mb-6">
                                    {broker.desc}
                                </p>
                                <div className="space-y-2">
                                    {broker.features.map(feat => (
                                        <div key={feat} className="flex items-center gap-2 text-sm text-gray-500">
                                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                                            {feat}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => handleConnectBroker(broker.code)}
                                    className="w-full mt-8 py-3 rounded-lg border border-emerald-200 text-emerald-700 font-medium hover:bg-emerald-50 transition"
                                >
                                    Connect {broker.name}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-emerald-600 font-semibold tracking-wider uppercase text-sm">Features</span>
                        <h2 className="text-3xl font-bold text-gray-900 mt-2">Everything you need to succeed</h2>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            {
                                icon: <Globe className="h-6 w-6 text-emerald-600" />,
                                title: 'Real-Time Data',
                                desc: 'Stream live market ticks straight from the exchange via your broker.'
                            },
                            {
                                icon: <Shield className="h-6 w-6 text-emerald-600" />,
                                title: 'Bank-Grade Security',
                                desc: 'Your API credentials are encrypted with AES-256 and never shared.'
                            },
                            {
                                icon: <BarChart2 className="h-6 w-6 text-emerald-600" />,
                                title: 'Advanced Charts',
                                desc: 'Technical analysis with professional candlestick charts and indicators.'
                            },
                            {
                                icon: <Users className="h-6 w-6 text-emerald-600" />,
                                title: 'Community',
                                desc: 'Share strategies and learn from a community of top traders.'
                            }
                        ].map((feature, i) => (
                            <div key={i} className="p-6 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-lg transition border border-transparent hover:border-gray-100">
                                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                                <p className="text-gray-600 text-sm">
                                    {feature.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="flex items-center gap-2 mb-4 md:mb-0">
                            <TrendingUp className="h-6 w-6 text-emerald-400" />
                            <span className="text-xl font-bold">PaperTrade</span>
                        </div>
                        <div className="text-gray-400 text-sm">
                            © 2024 PaperTrade Platform. All rights reserved.
                        </div>
                    </div>
                </div>
            </footer>

            {/* Broker Setup Modal */}
            <BrokerSetupModal
                isOpen={showBrokerModal}
                onClose={() => setShowBrokerModal(false)}
                initialBroker={initialBroker}
                onSuccess={() => {
                    setShowBrokerModal(false)
                    router.push('/dashboard')
                }}
            />
        </div>
    )
}