'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Menu, Wallet, LogOut, TrendingUp, LayoutDashboard, ListOrdered, User } from 'lucide-react'
import LiveIndicator from './LiveIndicator'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function Header() {
    const { user, logout } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const pathname = usePathname()

    const navigationLinks = [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Watchlist', href: '/watchlist', icon: TrendingUp },
        { label: 'Orders', href: '/orders', icon: ListOrdered },
    ]

    const handleNavClick = () => {
        setIsOpen(false)
    }

    const isActive = (path: string) => pathname === path

    return (
        <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo & Live Indicator */}
                    <div className="flex items-center space-x-4">
                        <Link href="/dashboard" className="flex items-center space-x-2">
                            <span className="text-2xl font-bold text-primary">PaperTrade</span>
                        </Link>
                        <div className="hidden md:block">
                            <LiveIndicator />
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex space-x-8">
                        {navigationLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "text-sm font-medium transition-colors hover:text-primary flex items-center gap-2",
                                    isActive(link.href) ? "text-primary" : "text-gray-600"
                                )}
                            >
                                <link.icon className="h-4 w-4" />
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Right Section: Wallet & Mobile Menu */}
                    <div className="flex items-center space-x-4">
                        {/* Wallet - Visible on both, compacted on mobile */}
                        {user && (
                            <div className="flex items-center space-x-2 bg-secondary/50 px-3 py-1.5 rounded-full border border-gray-200">
                                <Wallet className="h-4 w-4 text-primary" />
                                <span className="font-semibold text-gray-900 text-sm">
                                    ₹{user.walletBalance.toLocaleString('en-IN')}
                                </span>
                            </div>
                        )}

                        {/* Desktop Logout */}
                        <div className="hidden md:block">
                            <button
                                onClick={logout}
                                className="flex items-center space-x-2 text-gray-500 hover:text-danger transition p-2 hover:bg-red-50 rounded-full"
                                title="Logout"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Mobile Menu */}
                        <Sheet open={isOpen} onOpenChange={setIsOpen}>
                            <SheetTrigger asChild className="md:hidden">
                                <button className="p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                                    <Menu className="h-6 w-6" />
                                </button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                                <SheetHeader>
                                    <SheetTitle className="text-left text-primary font-bold text-xl flex items-center justify-between">
                                        PaperTrade
                                        <LiveIndicator />
                                    </SheetTitle>
                                </SheetHeader>
                                <div className="flex flex-col gap-6 mt-8">
                                    {/* Mobile Nav Links */}
                                    <nav className="flex flex-col gap-2">
                                        {navigationLinks.map((link) => (
                                            <Link
                                                key={link.href}
                                                href={link.href}
                                                onClick={handleNavClick}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                                    isActive(link.href)
                                                        ? "bg-primary/10 text-primary"
                                                        : "text-gray-700 hover:bg-gray-100"
                                                )}
                                            >
                                                <link.icon className="h-5 w-5" />
                                                {link.label}
                                            </Link>
                                        ))}
                                    </nav>

                                    <div className="h-px bg-gray-200" />

                                    {/* Mobile User Info */}
                                    <div className="px-4">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                                                <User className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">{user?.name || 'Trader'}</p>
                                                <p className="text-xs text-gray-500">{user?.email}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={logout}
                                            className="w-full flex items-center justify-center gap-2 bg-red-50 text-danger hover:bg-red-100 px-4 py-2.5 rounded-lg font-medium transition-colors"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
        </header>
    )
}
