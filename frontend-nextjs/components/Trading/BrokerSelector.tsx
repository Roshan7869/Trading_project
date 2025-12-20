'use client';

import React, { useState, useEffect } from 'react';
import './BrokerSelector.css';

interface Broker {
    name: string;
    displayName: string;
    logo: string;
    features: string[];
    requiredFields: string[];
}

interface BrokerSelectorProps {
    onBrokerSelect?: (broker: Broker) => void;
    onConnect: (brokerName: string) => void;
}

export const BrokerSelector: React.FC<BrokerSelectorProps> = ({ onBrokerSelect, onConnect }) => {
    const [availableBrokers, setAvailableBrokers] = useState<Broker[]>([]);
    const [selectedBroker, setSelectedBroker] = useState<Broker | null>(null);
    const [credentials, setCredentials] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Fetch available brokers
        fetch('/api/broker/available')
            .then(r => r.json())
            .then(data => setAvailableBrokers(data.brokers))
            .catch(err => console.error('Failed to load brokers:', err));
    }, []);

    const handleBrokerSelect = (broker: Broker) => {
        setSelectedBroker(broker);
        setCredentials({});
        setError(null);
    };

    const handleCredentialChange = (field: string, value: string) => {
        setCredentials(prev => ({ ...prev, [field]: value }));
    };

    const handleConnect = async () => {
        setLoading(true);
        setError(null);
        try {
            // In a real app, userId should come from auth context
            const userId = localStorage.getItem('userId') || 'guest_user';

            const response = await fetch('/api/broker/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    brokerName: selectedBroker?.name,
                    credentials
                })
            });

            const data = await response.json();
            if (data.success) {
                onConnect(selectedBroker!.name);
                if (onBrokerSelect) onBrokerSelect(selectedBroker!);
            } else {
                setError(data.message || 'Connection failed');
            }
        } catch (err: any) {
            console.error('Connection failed:', err);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="broker-selector">
            <h2>Select Your Broker</h2>

            {!selectedBroker ? (
                <div className="broker-list">
                    {availableBrokers.map(broker => (
                        <div
                            key={broker.name}
                            className="broker-card"
                            onClick={() => handleBrokerSelect(broker)}
                        >
                            <img src={broker.logo} alt={broker.displayName} />
                            <h3>{broker.displayName}</h3>
                            <ul className="features">
                                {broker.features.map(f => (
                                    <li key={f}>✓ {f}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="credentials-form">
                    <h3>Connect {selectedBroker.displayName}</h3>

                    {error && <div style={{ color: '#ff4d4d', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

                    {selectedBroker.requiredFields.map(field => (
                        <div key={field} className="form-group">
                            <label>{field.replace(/([A-Z])/g, ' $1').trim()}</label>
                            <input
                                type={field.toLowerCase().includes('password') || field.toLowerCase().includes('secret') || field.toLowerCase().includes('pin') ? 'password' : 'text'}
                                placeholder={field}
                                value={credentials[field] || ''}
                                onChange={(e) => handleCredentialChange(field, e.target.value)}
                            />
                        </div>
                    ))}

                    <div className="button-group">
                        <button
                            className="btn btn-secondary"
                            onClick={() => setSelectedBroker(null)}
                            disabled={loading}
                        >
                            Back
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleConnect}
                            disabled={loading}
                        >
                            {loading ? 'Connecting...' : 'Connect'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
