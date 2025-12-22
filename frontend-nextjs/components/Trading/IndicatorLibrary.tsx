'use client';

import React, { useState, useEffect } from 'react';
import {
    Plus, X, Settings, TrendingUp, Activity, BarChart3, Volume2,
    ChevronDown, ChevronRight, Search
} from 'lucide-react';
import { api } from '@/lib/api';

// Indicator Registry with metadata
export interface IndicatorConfig {
    id: string;
    name: string;
    category: string;
    displayMode: 'overlay' | 'pane';
    params: Record<string, number>;
    color?: string;
}

interface IndicatorRegistryItem {
    name: string;
    category: string;
    displayMode: 'overlay' | 'pane';
    defaultParams: Record<string, number>;
}

const INDICATOR_REGISTRY: Record<string, IndicatorRegistryItem> = {
    sma: { name: 'Simple Moving Average', category: 'trend', displayMode: 'overlay', defaultParams: { period: 20 } },
    ema: { name: 'Exponential Moving Average', category: 'trend', displayMode: 'overlay', defaultParams: { period: 9 } },
    wma: { name: 'Weighted Moving Average', category: 'trend', displayMode: 'overlay', defaultParams: { period: 20 } },
    bollinger: { name: 'Bollinger Bands', category: 'volatility', displayMode: 'overlay', defaultParams: { period: 20, std_dev: 2.0 } },
    vwap: { name: 'VWAP', category: 'volume', displayMode: 'overlay', defaultParams: {} },
    rsi: { name: 'Relative Strength Index', category: 'momentum', displayMode: 'pane', defaultParams: { period: 14 } },
    macd: { name: 'MACD', category: 'momentum', displayMode: 'pane', defaultParams: { fast: 12, slow: 26, signal: 9 } },
    stochastic: { name: 'Stochastic Oscillator', category: 'momentum', displayMode: 'pane', defaultParams: { period: 14, k_smooth: 3, d_smooth: 3 } },
    adx: { name: 'Average Directional Index', category: 'trend', displayMode: 'pane', defaultParams: { period: 14 } },
    obv: { name: 'On-Balance Volume', category: 'volume', displayMode: 'pane', defaultParams: {} },
    mfi: { name: 'Money Flow Index', category: 'volume', displayMode: 'pane', defaultParams: { period: 14 } },
    atr: { name: 'Average True Range', category: 'volatility', displayMode: 'pane', defaultParams: { period: 14 } },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    trend: <TrendingUp size={14} />,
    momentum: <Activity size={14} />,
    volatility: <BarChart3 size={14} />,
    volume: <Volume2 size={14} />,
};

const CATEGORY_COLORS: Record<string, string> = {
    trend: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    momentum: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    volatility: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    volume: 'text-green-400 bg-green-500/10 border-green-500/20',
};

interface IndicatorLibraryProps {
    activeIndicators: IndicatorConfig[];
    onAddIndicator: (indicator: IndicatorConfig) => void;
    onRemoveIndicator: (indicatorId: string) => void;
    onUpdateIndicator: (indicatorId: string, params: Record<string, number>) => void;
    isDarkTheme?: boolean;
}

export default function IndicatorLibrary({
    activeIndicators,
    onAddIndicator,
    onRemoveIndicator,
    onUpdateIndicator,
    isDarkTheme = true
}: IndicatorLibraryProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<string[]>(['trend', 'momentum']);
    const [editingIndicator, setEditingIndicator] = useState<string | null>(null);
    const [tempParams, setTempParams] = useState<Record<string, number>>({});

    // Theme classes
    const theme = isDarkTheme ? {
        bg: 'bg-slate-900', bgCard: 'bg-slate-800', border: 'border-slate-700',
        text: 'text-white', textMuted: 'text-slate-400', inputBg: 'bg-slate-950'
    } : {
        bg: 'bg-white', bgCard: 'bg-gray-50', border: 'border-gray-200',
        text: 'text-gray-900', textMuted: 'text-gray-500', inputBg: 'bg-gray-100'
    };

    // Get unique categories
    const categories = [...new Set(Object.values(INDICATOR_REGISTRY).map(i => i.category))];

    // Filter indicators by search
    const filteredIndicators = Object.entries(INDICATOR_REGISTRY).filter(([id, ind]) =>
        ind.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Check if indicator is already active
    const isActive = (id: string) => activeIndicators.some(a => a.id === id);

    // Add indicator handler
    const handleAddIndicator = (id: string) => {
        const registry = INDICATOR_REGISTRY[id];
        if (!registry || isActive(id)) return;

        const newIndicator: IndicatorConfig = {
            id,
            name: registry.name,
            category: registry.category,
            displayMode: registry.displayMode,
            params: { ...registry.defaultParams }
        };
        onAddIndicator(newIndicator);
    };

    // Toggle category expansion
    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    // Start editing indicator
    const startEditing = (ind: IndicatorConfig) => {
        setEditingIndicator(ind.id);
        setTempParams({ ...ind.params });
    };

    // Save edited params
    const saveParams = () => {
        if (editingIndicator) {
            onUpdateIndicator(editingIndicator, tempParams);
            setEditingIndicator(null);
            setTempParams({});
        }
    };

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${isOpen
                        ? 'bg-blue-600 text-white border-blue-500'
                        : `${theme.bgCard} ${theme.textMuted} ${theme.border} hover:text-white`
                    }`}
            >
                <BarChart3 size={16} />
                Indicators
                {activeIndicators.length > 0 && (
                    <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        {activeIndicators.length}
                    </span>
                )}
            </button>

            {/* Library Panel */}
            {isOpen && (
                <div className={`absolute top-full left-0 mt-2 w-[400px] max-h-[500px] overflow-hidden rounded-2xl border shadow-2xl z-50 ${theme.bg} ${theme.border}`}>
                    {/* Search */}
                    <div className={`p-3 border-b ${theme.border}`}>
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${theme.inputBg}`}>
                            <Search size={14} className={theme.textMuted} />
                            <input
                                type="text"
                                placeholder="Search indicators..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className={`flex-1 bg-transparent text-sm outline-none ${theme.text}`}
                            />
                        </div>
                    </div>

                    {/* Active Indicators */}
                    {activeIndicators.length > 0 && (
                        <div className={`p-3 border-b ${theme.border}`}>
                            <h4 className={`text-xs font-bold uppercase mb-2 ${theme.textMuted}`}>Active Indicators</h4>
                            <div className="flex flex-wrap gap-2">
                                {activeIndicators.map(ind => (
                                    <div
                                        key={ind.id}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border ${CATEGORY_COLORS[ind.category]}`}
                                    >
                                        {CATEGORY_ICONS[ind.category]}
                                        <span>{ind.name}</span>
                                        <button
                                            onClick={() => startEditing(ind)}
                                            className="hover:opacity-70"
                                        >
                                            <Settings size={12} />
                                        </button>
                                        <button
                                            onClick={() => onRemoveIndicator(ind.id)}
                                            className="hover:opacity-70"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Settings Modal for Active Indicator */}
                    {editingIndicator && (
                        <div className={`p-4 border-b ${theme.border} ${theme.bgCard}`}>
                            <h4 className={`text-sm font-bold mb-3 ${theme.text}`}>
                                Edit: {activeIndicators.find(a => a.id === editingIndicator)?.name}
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(tempParams).map(([key, value]) => (
                                    <div key={key}>
                                        <label className={`text-xs font-medium block mb-1 capitalize ${theme.textMuted}`}>
                                            {key.replace('_', ' ')}
                                        </label>
                                        <input
                                            type="number"
                                            value={value}
                                            step={key.includes('std') || key.includes('mult') ? 0.1 : 1}
                                            onChange={e => setTempParams({ ...tempParams, [key]: parseFloat(e.target.value) })}
                                            className={`w-full px-3 py-2 rounded-lg text-sm border ${theme.inputBg} ${theme.border} ${theme.text}`}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={saveParams}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-sm"
                                >
                                    Apply
                                </button>
                                <button
                                    onClick={() => setEditingIndicator(null)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium ${theme.bgCard} ${theme.textMuted}`}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Indicator Categories */}
                    <div className="max-h-[280px] overflow-y-auto">
                        {categories.map(cat => {
                            const catIndicators = filteredIndicators.filter(([_, i]) => i.category === cat);
                            if (catIndicators.length === 0) return null;

                            return (
                                <div key={cat} className={`border-b ${theme.border}`}>
                                    <button
                                        onClick={() => toggleCategory(cat)}
                                        className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold capitalize ${theme.text} hover:${theme.bgCard}`}
                                    >
                                        <span className="flex items-center gap-2">
                                            {CATEGORY_ICONS[cat]}
                                            {cat}
                                            <span className={`text-xs font-normal ${theme.textMuted}`}>
                                                ({catIndicators.length})
                                            </span>
                                        </span>
                                        {expandedCategories.includes(cat) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>

                                    {expandedCategories.includes(cat) && (
                                        <div className={`px-4 pb-3 space-y-1`}>
                                            {catIndicators.map(([id, ind]) => (
                                                <div
                                                    key={id}
                                                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${isActive(id)
                                                            ? `${theme.bgCard} opacity-50 cursor-not-allowed`
                                                            : `hover:${theme.bgCard} cursor-pointer`
                                                        }`}
                                                >
                                                    <div>
                                                        <span className={theme.text}>{ind.name}</span>
                                                        <span className={`ml-2 text-xs ${theme.textMuted}`}>
                                                            ({ind.displayMode === 'overlay' ? 'Main Chart' : 'Separate Pane'})
                                                        </span>
                                                    </div>
                                                    {!isActive(id) && (
                                                        <button
                                                            onClick={() => handleAddIndicator(id)}
                                                            className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
