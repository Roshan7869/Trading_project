import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/context/AuthContext'
import { MarketProvider } from '@/context/MarketContext'
import { Toaster } from 'sonner'

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
            <html lang="en">
                <body className={inter.className} suppressHydrationWarning>
                    <AuthProvider>
                        <MarketProvider>
                            {children}
                            <Toaster position="top-right" richColors />
                        </MarketProvider>
                    </AuthProvider>
                </body>
            </html>
        </ClerkProvider>
    )
}