'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

interface MarketData {
    symbol: string;
    price: number;
    change: number;
    timestamp: string;
}

interface MarketContextType {
    marketData: Map<string, MarketData>;
    connected: boolean;
}

const MarketContext = createContext<MarketContextType>({} as MarketContextType);

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export function MarketProvider({ children }: { children: React.ReactNode }) {
    const [marketData, setMarketData] = useState<Map<string, MarketData>>(new Map());
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const socket = io(SOCKET_URL);

        socket.on('connect', () => {
            console.log('Connected to market data stream');
            setConnected(true);
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from market data stream');
            setConnected(false);
        });

        socket.on('marketParams', (data: MarketData[]) => {
            setMarketData((prev) => {
                const newMap = new Map(prev);
                data.forEach((item) => {
                    newMap.set(item.symbol, item);
                });
                return newMap;
            });
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    return (
        <MarketContext.Provider value={{ marketData, connected }}>
            {children}
        </MarketContext.Provider>
    );
}

export const useMarket = () => useContext(MarketContext);
