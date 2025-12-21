'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMarket } from '@/context/MarketContext';
import { portfolioAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { getStockSymbols } from '@/lib/constants';

// Components
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { QuickTrade } from '@/components/dashboard/QuickTrade';
import { HoldingsTable } from '@/components/dashboard/HoldingsTable';
import { MarketOverview } from '@/components/dashboard/MarketOverview';

interface Position {
  _id: string;
  symbol: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  investedAmount: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  dayChange: number;
}

interface PortfolioData {
  positions: Position[];
  summary: {
    totalInvested: number;
    currentValue: number;
    totalPnL: number;
    totalPnLPercent: number;
  };
  walletBalance: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { marketData } = useMarket();
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);

  // Stock list
  const STOCKS = getStockSymbols();

  // Helper for scrolling to QuickTrade
  const scrollToQuickTrade = (symbol: string) => {
    // In a future update, we can make QuickTrade accept an initial symbol via prop and update it here
    // For now, we just pass the handler, but the current QuickTrade component manages its own selection state.
    // To fix this, we'd need to lift the 'selectedStock' state up. 
    // Given the complexity, we will skip auto-selecting for now or refactor QuickTrade to take props if needed
    // But for this refactor, we just keep it simple.
    console.log("Selected from overview:", symbol);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchPortfolio();
    }
  }, [user]);

  // Refresh portfolio periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (user) {
        fetchPortfolio();
      }
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [user]);

  const fetchPortfolio = async () => {
    try {
      const response = await portfolioAPI.get();
      setPortfolio(response.data);
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return null; // Handled by loading.tsx if using Suspense, otherwise this is fine
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* Summary Cards */}
        <SummaryCards loading={loading} portfolio={portfolio} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Trade */}
          <QuickTrade
            stocks={STOCKS}
            marketData={marketData}
            walletBalance={portfolio?.walletBalance || 0}
            onOrderComplete={fetchPortfolio}
          />

          {/* Holdings Table */}
          <HoldingsTable loading={loading} positions={portfolio?.positions || []} />
        </div>

        {/* Market Overview */}
        <MarketOverview
          stocks={STOCKS}
          marketData={marketData}
          onSelectStock={scrollToQuickTrade}
        />
      </main>
    </div>
  );
}
