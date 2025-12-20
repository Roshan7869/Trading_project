'use client';

import React, { useState, useEffect } from 'react';
import { BrokerSelector } from './BrokerSelector';

// Note: QuickOrderPanel, PositionTracker, BrokerStatus are assumed to be existing or will be created
// For now, I'll create placeholders if they don't exist to make this component functional

const BrokerStatus = ({ broker }: { broker: string }) => (
    <div className="p-4 bg-gray-800 rounded-lg mb-4 flex justify-between items-center">
        <span>Active Broker: <strong>{broker}</strong></span>
        <span className="text-green-500">● Connected</span>
    </div>
);

export const UnifiedTradingDashboard: React.FC = () => {
    const [connectedBrokers, setConnectedBrokers] = useState<{ name: string, connectedAt: string, status: string }[]>([]);
    const [activeBroker, setActiveBroker] = useState<string | null>(null);
    const [showBrokerSelector, setShowBrokerSelector] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadConnectedBrokers();
    }, []);

    const loadConnectedBrokers = async () => {
        setLoading(true);
        try {
            const userId = localStorage.getItem('userId') || 'guest_user';
            const response = await fetch(
                `/api/broker/connected?userId=${userId}`
            );
            const data = await response.json();
            setConnectedBrokers(data.connectedBrokers || []);

            if (data.connectedBrokers && data.connectedBrokers.length > 0) {
                setActiveBroker(data.connectedBrokers[0].name);
            } else {
                setShowBrokerSelector(true);
            }
        } catch (error) {
            console.error('Failed to load connected brokers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBrokerSwitch = async (brokerName: string) => {
        // In this simplified version, switching active broker is handled in-memory or session
        setActiveBroker(brokerName);
    };

    if (loading) return <div className="p-8 text-center">Loading trading dashboard...</div>;

    if (showBrokerSelector) {
        return (
            <div className="p-8">
                <BrokerSelector
                    onConnect={() => {
                        setShowBrokerSelector(false);
                        loadConnectedBrokers();
                    }}
                />
                {connectedBrokers.length > 0 && (
                    <button
                        className="mt-4 text-sm text-blue-400 hover:underline"
                        onClick={() => setShowBrokerSelector(false)}
                    >
                        Cancel and return to dashboard
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="unified-trading-dashboard p-6">
            <div className="broker-header mb-8">
                <div className="broker-tabs flex gap-2 items-center">
                    {connectedBrokers.map(broker => (
                        <button
                            key={broker.name}
                            className={`broker-tab px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeBroker === broker.name
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                            onClick={() => handleBrokerSwitch(broker.name)}
                        >
                            {broker.name.replace('_', ' ')}
                        </button>
                    ))}
                    <button
                        className="btn-add-broker ml-2 px-4 py-2 bg-gray-900 border border-dashed border-gray-700 rounded-full text-sm text-gray-500 hover:text-gray-300 hover:border-gray-500 transition-all"
                        onClick={() => setShowBrokerSelector(true)}
                    >
                        + Add Broker
                    </button>
                </div>
            </div>

            {activeBroker ? (
                <div className="dashboard-content grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <BrokerStatus broker={activeBroker} />
                        <div className="p-20 bg-gray-900 rounded-xl border border-gray-800 text-center text-gray-500">
                            {/* Order form and charts would go here */}
                            Select a script to start trading on {activeBroker.replace('_', ' ')}
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold mb-3">Recent Positions</h3>
                            <p className="text-sm text-gray-500">No active positions on this broker.</p>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold mb-3">Portfolio Summary</h3>
                            <p className="text-sm text-gray-500">Connect a real account to see holdings.</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-900 rounded-xl border border-gray-800">
                    <p className="text-gray-500">No active broker account selected.</p>
                    <button
                        className="mt-4 text-blue-500 hover:underline"
                        onClick={() => setShowBrokerSelector(true)}
                    >
                        Connect an account now
                    </button>
                </div>
            )}
        </div>
    );
};
