'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { portfolioAPI, userAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  timestamp: string;
  volume?: number;
  source?: string;
}

interface Position {
  symbol: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

interface MarketContextType {
  marketData: Map<string, MarketData>;
  connected: boolean;
  positions: Position[];
  walletBalance: number;
  updatePositions: (positions: Position[]) => void;
  getPositionsWithLivePrices: () => Position[];
  refreshPortfolio: () => Promise<void>;
  socket: Socket | null;
}

const MarketContext = createContext<MarketContextType>({} as MarketContextType);

// Use backend port 4000
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [marketData, setMarketData] = useState<Map<string, MarketData>>(new Map());
  const [positions, setPositions] = useState<Position[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user } = useAuth();

  const updatesBuffer = useRef<Map<string, MarketData>>(new Map());

  const refreshPortfolio = useCallback(async () => {
    try {
      const [portfolioRes, walletRes] = await Promise.all([
        portfolioAPI.get(),
        userAPI.getWallet()
      ]);

      if (portfolioRes.data?.holdings) {
        setPositions(portfolioRes.data.holdings);
      }
      if (walletRes.data?.balance !== undefined) {
        setWalletBalance(walletRes.data.balance);
      }
    } catch (error) {
      console.error('Failed to refresh portfolio', error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      refreshPortfolio();
    }
  }, [refreshPortfolio, user]);

  useEffect(() => {
    // Fetch initial prices from backend API (no separate ticker service needed)
    const fetchInitialPrices = async () => {
      try {
        // Use backend API to get initial Nifty stocks data
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const response = await fetch(`${apiUrl}/api/stocks/watchlist/indian`, {
          signal: AbortSignal.timeout(5000)
        });
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
        const data = await response.json();
        if (data.stocks && data.stocks.length > 0) {
          setMarketData((prev) => {
            const newMap = new Map(prev);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.stocks.forEach((item: any) => {
              newMap.set(item.symbol, {
                symbol: item.symbol,
                price: item.price,
                change: item.changePercent ?? item.change ?? 0,
                timestamp: item.timestamp,
                volume: item.volume,
                source: item.source || 'api'
              });
            });
            return newMap;
          });
          console.log(`Loaded ${data.stocks.length} prices from backend API`);
        }
      } catch (error) {
        // API unavailable - will get data from socket instead
        console.info('Initial prices API unavailable, will use socket for market data');
      }
    };

    // Defer socket initialization significantly to prioritize initial render
    let newSocket: Socket | null = null;

    // First, try to get initial prices quickly (non-blocking)
    fetchInitialPrices();

    // Then defer socket connection to after page is interactive
    const initTimeoutId = setTimeout(() => {
      newSocket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Connected to market data stream');
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from market data stream');
        setConnected(false);
      });

      newSocket.on('initial_market_data', (data: MarketData[]) => {
        setMarketData((prev) => {
          const newMap = new Map(prev);
          data.forEach((item) => {
            newMap.set(item.symbol, item);
          });
          return newMap;
        });
      });

      newSocket.on('market_update', (data: MarketData) => {
        updatesBuffer.current.set(data.symbol, data);
      });
    }, 1000); // Increased to 1 second to let page fully render first

    // Flush buffer every 300ms to reduce re-renders (was 200ms)
    const flushInterval = setInterval(() => {
      if (updatesBuffer.current.size > 0) {
        setMarketData((prev) => {
          const newMap = new Map(prev);
          updatesBuffer.current.forEach((value, key) => {
            newMap.set(key, value);
          });
          updatesBuffer.current.clear();
          return newMap;
        });
      }
    }, 300);

    return () => {
      clearTimeout(initTimeoutId);
      if (newSocket) {
        newSocket.disconnect();
      }
      clearInterval(flushInterval);
    };
  }, []);

  const updatePositions = useCallback((newPositions: Position[]) => {
    setPositions(newPositions);
  }, []);

  const getPositionsWithLivePrices = useCallback((): Position[] => {
    return positions.map(pos => {
      const liveData = marketData.get(pos.symbol);
      if (liveData) {
        const currentPrice = liveData.price;
        const investedAmount = pos.quantity * pos.avgBuyPrice;
        const currentValue = pos.quantity * currentPrice;
        const unrealizedPnL = currentValue - investedAmount;
        const unrealizedPnLPercent = investedAmount > 0
          ? (unrealizedPnL / investedAmount) * 100
          : 0;

        return {
          ...pos,
          currentPrice,
          unrealizedPnL,
          unrealizedPnLPercent
        };
      }
      return pos;
    });
  }, [positions, marketData]);

  return (
    <MarketContext.Provider value={{
      marketData,
      connected,
      positions,
      walletBalance,
      updatePositions,
      getPositionsWithLivePrices,
      refreshPortfolio,
      socket
    }}>
      {children}
    </MarketContext.Provider>
  );
}

export const useMarket = () => useContext(MarketContext);
