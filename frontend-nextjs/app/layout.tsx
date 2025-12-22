import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/context/AuthContext'
import { MarketProvider } from '@/context/MarketContext'
import { Toaster } from 'sonner'
import { TradePanelProvider } from '@/context/TradePanelContext'
import TradePanel from '@/components/Trading/TradePanel'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Paper Trading Platform',
    description: 'Trade stocks with virtual money - Groww style interface',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <ClerkProvider>
            <html lang="en" suppressHydrationWarning>
                <body className={inter.className} suppressHydrationWarning>
                    <AuthProvider>
                        <MarketProvider>
                            <TradePanelProvider>
                                {children}
                                <TradePanel />
                                <Toaster position="top-right" richColors />
                            </TradePanelProvider>
                        </MarketProvider>
                    </AuthProvider>
                </body>
            </html>
        </ClerkProvider>
    )
}