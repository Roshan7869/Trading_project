'use client'

import React from 'react'
import { AuthProvider } from '@/context/AuthContext'
import { MarketProvider } from '@/context/MarketContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthProvider>
            <MarketProvider>
                <ProtectedRoute>
                    <div className="min-h-screen bg-secondary">
                        <Header />
                        <main>{children}</main>
                    </div>
                </ProtectedRoute>
            </MarketProvider>
        </AuthProvider>
    )
}
