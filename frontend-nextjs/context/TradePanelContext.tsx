'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Side = 'BUY' | 'SELL';

interface TradePanelContextType {
    isOpen: boolean;
    symbol: string | null;
    side: Side;
    openTradePanel: (symbol: string, side?: Side) => void;
    closeTradePanel: () => void;
}

const TradePanelContext = createContext<TradePanelContextType | undefined>(undefined);

export function TradePanelProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [symbol, setSymbol] = useState<string | null>(null);
    const [side, setSide] = useState<Side>('BUY');

    const openTradePanel = (newSymbol: string, newSide: Side = 'BUY') => {
        setSymbol(newSymbol);
        setSide(newSide);
        setIsOpen(true);
    };

    const closeTradePanel = () => {
        setIsOpen(false);
        // Don't clear symbol immediately to avoid UI flicker during transition
        setTimeout(() => setSymbol(null), 300);
    };

    return (
        <TradePanelContext.Provider value={{ isOpen, symbol, side, openTradePanel, closeTradePanel }}>
            {children}
        </TradePanelContext.Provider>
    );
}

export function useTradePanel() {
    const context = useContext(TradePanelContext);
    if (!context) {
        throw new Error('useTradePanel must be used within a TradePanelProvider');
    }
    return context;
}
