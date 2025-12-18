'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMarket } from '@/context/MarketContext';
import { portfolioAPI, orderAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  const { marketData, connected } = useMarket();
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderMessage, setOrderMessage] = useState('');

  // TEST MODE: Set to true to bypass authentication for testing
  const TEST_MODE = true;

  // Stock list
  const STOCKS = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'ITC', 'SBIN', 'BHARTIARTL', 'HINDUNILVR', 'LT'];

  useEffect(() => {
    // Skip auth redirect in TEST_MODE
    if (!TEST_MODE && !authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // In TEST_MODE, always fetch portfolio
    if (TEST_MODE || user) {
      fetchPortfolio();
    }
  }, [user]);

  // Refresh portfolio periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (TEST_MODE || user) {
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

  const handleQuickTrade = async () => {
    if (!selectedStock || quantity <= 0) {
      setOrderMessage('Please select a stock and enter valid quantity');
      return;
    }

    setOrderLoading(true);
    setOrderMessage('');

    try {
      const response = await orderAPI.placeOrder({
        symbol: selectedStock,
        type: orderType,
        quantity: quantity
      });

      if (response.data.success) {
        setOrderMessage(`✅ ${response.data.message}`);
        fetchPortfolio(); // Refresh portfolio
        setQuantity(1);
      } else {
        setOrderMessage(`❌ ${response.data.message}`);
      }
    } catch (error: any) {
      setOrderMessage(`❌ ${error.response?.data?.message || 'Order failed'}`);
    } finally {
      setOrderLoading(false);
    }
  };

  // In TEST_MODE, skip auth check and show dashboard directly
  if (!TEST_MODE && (authLoading || !user)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Paper Trading</h1>
          <div className="flex items-center gap-4">
            <span className={`flex items-center gap-1 text-sm ${connected ? 'text-emerald-600' : 'text-red-500'}`}>
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              {connected ? 'Live' : 'Disconnected'}
            </span>
            <span className="text-gray-600">Welcome, {user?.name || 'Test User'}</span>
            <Link href="/orders" className="text-emerald-600 hover:text-emerald-700">Orders</Link>
            <Link href="/watchlist" className="text-emerald-600 hover:text-emerald-700">Watchlist</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Wallet Balance */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border">
            <p className="text-sm text-gray-500 mb-1">Available Balance</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '...' : formatCurrency(portfolio?.walletBalance || 0)}
            </p>
          </div>

          {/* Invested Value */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border">
            <p className="text-sm text-gray-500 mb-1">Invested Value</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '...' : formatCurrency(portfolio?.summary?.totalInvested || 0)}
            </p>
          </div>

          {/* Current Value */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border">
            <p className="text-sm text-gray-500 mb-1">Current Value</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '...' : formatCurrency(portfolio?.summary?.currentValue || 0)}
            </p>
          </div>

          {/* P&L */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border">
            <p className="text-sm text-gray-500 mb-1">Total P&L</p>
            <p className={`text-2xl font-bold ${(portfolio?.summary?.totalPnL || 0) >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {loading ? '...' : formatCurrency(portfolio?.summary?.totalPnL || 0)}
              <span className="text-sm ml-2">
                {loading ? '' : formatPercent(portfolio?.summary?.totalPnLPercent || 0)}
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Trade */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border">
            <h2 className="text-lg font-semibold mb-4">Quick Trade</h2>

            <div className="space-y-4">
              {/* Stock Selection */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Select Stock</label>
                <select
                  value={selectedStock}
                  onChange={(e) => setSelectedStock(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Choose a stock</option>
                  {STOCKS.map(stock => {
                    const data = marketData.get(stock);
                    return (
                      <option key={stock} value={stock}>
                        {stock} - {data ? `₹${data.price.toFixed(2)}` : 'Loading...'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Order Type Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setOrderType('BUY')}
                  className={`flex-1 py-2 rounded-lg font-medium transition ${orderType === 'BUY'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                    }`}
                >
                  BUY
                </button>
                <button
                  onClick={() => setOrderType('SELL')}
                  className={`flex-1 py-2 rounded-lg font-medium transition ${orderType === 'SELL'
                    ? 'bg-rose-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                    }`}
                >
                  SELL
                </button>
              </div>

              {/* Estimated Value */}
              {selectedStock && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Estimated Value</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency((marketData.get(selectedStock)?.price || 0) * quantity)}
                  </p>
                </div>
              )}

              {/* Place Order Button */}
              <button
                onClick={handleQuickTrade}
                disabled={orderLoading || !selectedStock}
                className={`w-full py-3 rounded-lg font-medium text-white transition ${orderType === 'BUY'
                  ? 'bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300'
                  : 'bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300'
                  }`}
              >
                {orderLoading ? 'Processing...' : `Place ${orderType} Order`}
              </button>

              {/* Order Message */}
              {orderMessage && (
                <p className={`text-sm text-center ${orderMessage.includes('✅') ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {orderMessage}
                </p>
              )}
            </div>
          </div>

          {/* Portfolio Holdings */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Your Holdings</h2>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : portfolio?.positions && portfolio.positions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b">
                      <th className="pb-3">Stock</th>
                      <th className="pb-3 text-right">Qty</th>
                      <th className="pb-3 text-right">Avg Price</th>
                      <th className="pb-3 text-right">LTP</th>
                      <th className="pb-3 text-right">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.positions.map((position) => (
                      <tr key={position._id} className="border-b last:border-b-0">
                        <td className="py-3 font-medium">{position.symbol}</td>
                        <td className="py-3 text-right">{position.quantity}</td>
                        <td className="py-3 text-right">{formatCurrency(position.avgBuyPrice)}</td>
                        <td className="py-3 text-right">{formatCurrency(position.currentPrice)}</td>
                        <td className={`py-3 text-right font-medium ${position.unrealizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {formatCurrency(position.unrealizedPnL)}
                          <span className="text-xs ml-1">
                            ({formatPercent(position.unrealizedPnLPercent)})
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No holdings yet</p>
                <p className="text-sm mt-1">Place your first trade to get started!</p>
              </div>
            )}
          </div>
        </div>

        {/* Market Overview */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm p-6 border">
          <h2 className="text-lg font-semibold mb-4">Market Overview</h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {STOCKS.map(stock => {
              const data = marketData.get(stock);
              return (
                <div
                  key={stock}
                  className="bg-gray-50 rounded-xl p-4 cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => setSelectedStock(stock)}
                >
                  <p className="font-medium text-gray-900">{stock}</p>
                  {data ? (
                    <>
                      <p className="text-lg font-bold">{formatCurrency(data.price)}</p>
                      <p className={`text-sm ${data.change >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {formatPercent(data.change)}
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-400">Loading...</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
