'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

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
  updatePositions: (positions: Position[]) => void;
  getPositionsWithLivePrices: () => Position[];
}

const MarketContext = createContext<MarketContextType>({} as MarketContextType);

// Use backend port 4000
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [marketData, setMarketData] = useState<Map<string, MarketData>>(new Map());
  const [positions, setPositions] = useState<Position[]>([]);
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const updatesBuffer = useRef<Map<string, MarketData>>(new Map());

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to market data stream');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from market data stream');
      setConnected(false);
    });

    // Handle initial market data from cache
    newSocket.on('initial_market_data', (data: MarketData[]) => {
      setMarketData((prev) => {
        const newMap = new Map(prev);
        data.forEach((item) => {
          newMap.set(item.symbol, item);
        });
        return newMap;
      });
    });

    // Handle real-time market updates - BUFFERED
    newSocket.on('market_update', (data: MarketData) => {
      // Store in buffer instead of updating state immediately
      updatesBuffer.current.set(data.symbol, data);
    });

    // Flush buffer every 500ms to reduce re-renders
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
    }, 500);

    return () => {
      newSocket.disconnect();
      clearInterval(flushInterval);
    };
  }, []);

  // Update positions from portfolio fetch
  const updatePositions = useCallback((newPositions: Position[]) => {
    setPositions(newPositions);
  }, []);

  // Get positions with live prices from market data
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
      updatePositions,
      getPositionsWithLivePrices
    }}>
      {children}
    </MarketContext.Provider>
  );
}

export const useMarket = () => useContext(MarketContext);


